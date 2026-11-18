#!/usr/bin/env python3
"""Record REAL browser gameplay of MuPi Run as a 800x480 H.264 MP4.

Uses Chromium's Page.startScreencast CDP events and in-game preview controls.
Clips are recorded in the real gameplay canvas with real animations/collisions.
A scene jump switches between the three running terrains, so this is a montage,
not a claimed continuous run. No synthetic/concept frames are inserted.
"""
from __future__ import annotations

import asyncio
import base64
import bisect
import json
import shutil
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websockets
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'examples/mupi-run'
OUTPUT=APP/'mupi-run-screencast.mp4'
PORT=9483
FPS=15
DURATION=20.0

async def main():
    chrome=shutil.which('chromium') or shutil.which('chromium-browser')
    encoder=shutil.which('ffmpeg')
    if not chrome or not encoder:
        raise RuntimeError('Chromium and ffmpeg are required to record the screencast')
    with tempfile.TemporaryDirectory(prefix='mupirun-screencast-') as folder:
        temp=Path(folder)
        profile=temp/'profile'
        captured=temp/'captured'
        sequence=temp/'sequence'
        captured.mkdir();sequence.mkdir()
        proc=subprocess.Popen([
            chrome,'--headless','--no-sandbox','--disable-gpu',
            '--disable-dev-shm-usage','--hide-scrollbars','--remote-allow-origins=*',
            f'--remote-debugging-port={PORT}',f'--user-data-dir={profile}',
            '--window-size=800,480','--disable-features=Translate',
            f'file://{APP}/index.html'
        ],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            tabs=None
            for _ in range(80):
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json',timeout=1) as response:
                        tabs=json.load(response)
                    if tabs: break
                except Exception:
                    await asyncio.sleep(.12)
            if not tabs:
                raise RuntimeError('Chromium remote-debugging endpoint unavailable')
            tab=next(t for t in tabs if t.get('type')=='page')
            async with websockets.connect(tab['webSocketDebuggerUrl'],max_size=13_000_000,ping_timeout=None) as ws:
                pending={}
                frames=[]
                seq=0
                start=None
                asynchronous_tasks=[]

                async def call(method,params=None,wait=True):
                    nonlocal seq
                    seq+=1
                    ident=seq
                    task=asyncio.get_running_loop().create_future()
                    if wait: pending[ident]=task
                    await ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
                    if wait:
                        response=await asyncio.wait_for(task,timeout=15)
                        if 'error' in response:raise RuntimeError(f"{method}: {response['error']}")
                        return response.get('result',{})
                    return {}

                async def read_frames():
                    nonlocal seq
                    while True:
                        packet=json.loads(await ws.recv())
                        if 'id' in packet:
                            future=pending.pop(packet['id'],None)
                            if future and not future.done():
                                future.set_result(packet)
                        if packet.get('method')=='Page.screencastFrame':
                            data=packet['params']
                            # Use wallclock monotonic to align action cuts with captured frames.
                            timestamp=time.monotonic()
                            path=captured/(f"{len(frames):06d}.jpg")
                            path.write_bytes(base64.b64decode(data['data']))
                            frames.append((timestamp,path))
                            seq+=1
                            await ws.send(json.dumps({
                                'id':seq,'method':'Page.screencastFrameAck',
                                'params':{'sessionId':data['sessionId']}
                            }))

                reader=asyncio.create_task(read_frames())
                try:
                    await call('Page.enable')
                    await call('Runtime.enable')
                    await call('Emulation.setDeviceMetricsOverride',{
                        'width':800,'height':480,'deviceScaleFactor':1,'mobile':False
                    })
                    await call('Page.addScriptToEvaluateOnNewDocument',{
                        'source':"Object.defineProperty(navigator,'language',{configurable:true,get:()=> 'de-DE'});"
                    })
                    await call('Page.navigate',{'url':f'file://{APP}/index.html'})
                    await asyncio.sleep(1.0)
                    ready=await call('Runtime.evaluate',{
                        'expression':"Boolean(window.__MuPiRunPreview && document.querySelector('#world').width===800)",
                        'returnByValue':True
                    })
                    if not ready.get('result',{}).get('value'):
                        raise RuntimeError('MuPi Run preview API not available')
                    await call('Page.startScreencast',{
                        'format':'jpeg','quality':77,
                        'maxWidth':800,'maxHeight':480,'everyNthFrame':1
                    })
                    start=time.monotonic()
                    async def at(second,cmd,caption):
                        remaining=start+second-time.monotonic()
                        if remaining>0:await asyncio.sleep(remaining)
                        expr=cmd
                        result=await call('Runtime.evaluate',{'expression':expr,'returnByValue':True})
                        if result.get('exceptionDetails'):
                            raise RuntimeError(caption+': '+str(result['exceptionDetails']))
                        print(f"{second:4.1f}s: {caption}",flush=True)

                    def scene(distance,obstacles,lane=0,mode='running'):
                        return 'window.__MuPiRunPreview.setScene('+','.join(map(json.dumps,[
                            distance,obstacles,lane,mode
                        ]))+')'

                    tasks=[
                        (1.6,"document.getElementById('primary').click()", 'Spiel gestartet'),
                        (1.9,scene(45,[{'lane':-1,'item':'rock','kind':'jump','z':61}]),'Flussbett'),
                        (3.2,"document.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true}))",'Spurwechsel rechts'),
                        (4.7,scene(115,[{'lane':None,'item':'low-bridge','kind':'duck','z':26}]),'Duckbrücke'),
                        (5.75,"document.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowDown',bubbles:true}))",'Ducken unter der Brücke'),
                        (8.0,scene(252,[{'lane':0,'item':'stump','kind':'avoid','z':29}]),'Holzsteg'),
                        (9.05,"document.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true}))",'Baumstumpf ausweichen'),
                        (11.35,scene(404,[{'lane':0,'item':'stepping-stones','kind':'jump','z':34}]),'Waldboden'),
                        (12.52,"document.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',bubbles:true}))",'Sprung über Felsen'),
                        (15.3,scene(54,[{'lane':1,'item':'basket','kind':'avoid','z':52}]),'Flusslauf'),
                        (16.8,"document.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowLeft',bubbles:true}))",'Ausweichen links'),
                    ]
                    for second,expr,caption in tasks:
                        await at(second,expr,caption)
                    await asyncio.sleep(max(0.01,start+DURATION-time.monotonic()))
                    await call('Page.stopScreencast')
                    await asyncio.sleep(.25)
                    print('Captured browser frames:',len(frames),flush=True)
                    if len(frames)<55:
                        raise RuntimeError('Too few actual browser frames for a screencast')
                finally:
                    reader.cancel()
                    try:await reader
                    except asyncio.CancelledError:pass

            # Resample *recorded* game frames in real time to 15 fps.
            # Reusing a frame merely accommodates variable capture fps.
            times=[when-start for when,_ in frames]
            for i in range(round(DURATION*FPS)):
                t=(i+.5)/FPS
                idx=max(0,bisect.bisect_right(times,t)-1)
                src=frames[idx][1]
                (sequence/f"{i:05d}.jpg").symlink_to(src)

            subprocess.run([
                encoder,'-hide_banner','-loglevel','error','-y',
                '-framerate',str(FPS),'-i',str(sequence/'%05d.jpg'),
                '-vf','scale=800:480:flags=lanczos,format=yuv420p',
                '-c:v','libx264','-preset','veryfast','-crf','22',
                '-pix_fmt','yuv420p','-movflags','+faststart','-r',str(FPS),
                '-an',str(OUTPUT)
            ],check=True,timeout=60)
            result=subprocess.run([
                'ffprobe','-v','error','-show_entries',
                'format=duration,size:stream=codec_name,width,height,avg_frame_rate',
                '-of','json',str(OUTPUT)
            ],capture_output=True,text=True,check=True)
            print('Screencast:',OUTPUT,flush=True)
            print(result.stdout,flush=True)
            # Thumbnail from actual video frame, never simulated.
            subprocess.run([
                encoder,'-hide_banner','-loglevel','error','-y',
                '-ss','6.0','-i',str(OUTPUT),'-frames:v','1',
                str(APP/'screencast-poster.webp')
            ],check=True,timeout=30)
        finally:
            proc.terminate()
            try:proc.wait(timeout=3)
            except subprocess.TimeoutExpired:proc.kill()
    return OUTPUT

if __name__=='__main__':
    asyncio.run(main())
