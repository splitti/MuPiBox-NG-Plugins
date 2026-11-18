#!/usr/bin/env python3
"""Record REAL browser gameplay of MuPi Run as a 800x480 H.264 MP4.

Uses Chromium's Page.startScreencast CDP events and in-game preview controls.
The game starts normally. An automated keyboard player observes real gameplay
state to react to obstacle approach. No setScene calls, no resets, no distance
skips, no fake frames. The game remains a normal playable runner throughout.
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
FPS=30
DURATION=36.0

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
                observed=[]
                input_counts={name:0 for name in ('left','right','jump','duck')}

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
                    key_codes={'left':'ArrowLeft','right':'ArrowRight',
                        'jump':'ArrowUp','duck':'ArrowDown'}

                    def choose_action(s):
                        current=[o for o in s['obstacles']
                                 if not o['checked'] and 0<o['z']<56]
                        current.sort(key=lambda o:o['z'])
                        if not current: return None
                        item=current[0]
                        group=[o for o in current if abs(o['z']-item['z'])<3]
                        lane=s['lane']
                        visual=s['visualLane']
                        speed=s['speed']
                        safe=[l for l in (-1,0,1) if not any(o['lane']==l for o in group)]
                        if item['lane'] is None:
                            if item['z']<speed*.66+2 and s['duckAge']<0 and s['jumpAge']<0:
                                return 'duck'
                            return None
                        # First tutorial rock: deliberately run toward it,
                        # then JUMP, so the recording demonstrates real input.
                        if (s['distance']<65 and item['kind']=='jump' and
                            item['z']>32 and lane!=item['lane']):
                            return 'left' if item['lane']<lane else 'right'
                        occupant=next((o for o in group if o['lane'] is not None
                            and abs(o['lane']-visual)<.65),None)
                        if occupant is None:return None
                        if occupant['kind']=='jump':
                            if item['z']<speed*.67+2 and s['jumpAge']<0:
                                return 'jump'
                            return None
                        if occupant['kind']=='duck':
                            if item['z']<speed*.67+2 and s['duckAge']<0 and s['jumpAge']<0:
                                return 'duck'
                            return None
                        if safe:
                            dest=min(safe,key=lambda l:abs(l-lane))
                            if dest!=lane:return 'left' if dest<lane else 'right'
                        return None

                    # 1.2 seconds of start screen; then a fully continuous
                    # run with the same collision rules as on MuPiBox.
                    await asyncio.sleep(1.2)
                    await call('Runtime.evaluate', {
                        'expression':"document.getElementById('primary').click()"
                    })
                    print('Started actual continuous run at t=1.2 s',flush=True)
                    prev=0
                    while time.monotonic()-start<DURATION:
                        elapsed=time.monotonic()-start
                        reply=await call('Runtime.evaluate',{
                            'expression':"JSON.stringify(window.__MuPiRunPreview.snapshot())",
                            'returnByValue':True
                        })
                        snapshot=json.loads(reply['result']['value'])
                        if snapshot['phase']=='over':
                            raise RuntimeError('Player crashed during recording at '
                                +str(round(snapshot['distance'],2))+' m')
                        if observed and snapshot['distance']+1e-5<observed[-1][1]:
                            raise RuntimeError('Non-monotonic meter counter detected')
                        observed.append((elapsed,snapshot['distance'],snapshot['terrain']))
                        action=choose_action(snapshot)
                        if action:
                            code=key_codes[action]
                            await call('Runtime.evaluate',{
                                'expression':"document.dispatchEvent(new KeyboardEvent("
                                    "'keydown',{code:"+json.dumps(code)+",bubbles:true}))"
                            })
                            input_counts[action]+=1
                        # 14–18 reaction checks per second; the actual
                        # Chromium renderer continues freely in between.
                        await asyncio.sleep(.067)
                    await call('Page.stopScreencast')
                    await asyncio.sleep(.25)
                    print('Captured frames:',len(frames),'inputs',input_counts,flush=True)
                    print('Distance',round(observed[-1][1],1),'m; terrains',
                          sorted(set(x[2] for x in observed)),flush=True)
                    if len(frames)<DURATION*10:
                        raise RuntimeError('Too few actual rendered frames')
                    if observed[-1][1]<530:
                        raise RuntimeError('Did not reach all track segments')
                    if not all(input_counts[a]>0 for a in ('left','right','jump','duck')):
                        raise RuntimeError('Missing action from the actual recording')

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
                '-ss','16.0','-i',str(OUTPUT),'-frames:v','1',
                str(APP/'screencast-poster.webp')
            ],check=True,timeout=30)
        finally:
            proc.terminate()
            try:proc.wait(timeout=3)
            except subprocess.TimeoutExpired:proc.kill()
    return OUTPUT

if __name__=='__main__':
    asyncio.run(main())
