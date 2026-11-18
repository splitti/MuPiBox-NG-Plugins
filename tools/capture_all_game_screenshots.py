#!/usr/bin/env python3
"""Take two real 800x480 Chromium captures for MuPiBox game documentation.
Run from any worktree: python3 tools/capture_all_game_screenshots.py
Optional arguments: game directory names. Captures are stored within each app.
"""
import asyncio, base64, hashlib, json, shutil, subprocess, sys, tempfile, urllib.request
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageChops
import websockets

ROOT = Path(__file__).resolve().parents[1]
PORT = 9497
# Existing screenshots already cover dice, tic-tac-toe and water battle.
GAMES = ['chess', 'crumbworm', 'four-in-a-row', 'klang-memory',
         'mupi-dame', 'mupi-hnefatafl', 'mupi-muehle', 'mupi-reversi',
         'mupi-rhythm', 'mupi-soundquiz', 'mupi-beatbox']
ACTIONS = {
'chess': """let m=document.getElementById('mode');if(m){m.value='two';m.dispatchEvent(new Event('change',{bubbles:true}));}for(let i of [100,68,20,52,118,85])document.querySelector('#board button[data-i="'+i+'"]')?.click();""",
'crumbworm': """document.querySelector('#theme-toggle')?.click();document.querySelector('[data-direction="right"]')?.click();""",
'four-in-a-row': """let m=document.getElementById('mode');if(m){m.value='two';m.dispatchEvent(new Event('change',{bubbles:true}));}for(let col of [3,2,3,2,3])document.querySelectorAll('#board button')[col]?.click();""",
'klang-memory': """document.getElementById('new')?.click();document.querySelector('[data-pad="0"]')?.click();""",
'mupi-dame': """let m=document.getElementById('mode');if(m){m.value='human';m.dispatchEvent(new Event('change',{bubbles:true}));}let b=document.querySelectorAll('#board .cell');b[40]?.click();b[33]?.click();b[23]?.click();b[30]?.click();""",
'mupi-hnefatafl': """document.querySelector('#board .piece')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));""",
'mupi-muehle': """let m=document.getElementById('mode');if(m){m.value='human';m.dispatchEvent(new Event('change',{bubbles:true}));}let b=document.querySelectorAll('#board circle[aria-label]');for(let i of [0,9,1,10,2])b[i]?.dispatchEvent(new MouseEvent('click',{bubbles:true}));""",
'mupi-reversi': """let m=document.getElementById('mode');if(m){m.value='human';m.dispatchEvent(new Event('change',{bubbles:true}));}let b=document.querySelectorAll('#board .cell');for(let i of [19,18,26,20])b[i]?.click();""",
'mupi-rhythm': """document.getElementById('play')?.click();""",
'mupi-soundquiz': """document.querySelector('#options button')?.click();""",
'mupi-beatbox': """document.getElementById('preset')?.click();document.getElementById('play')?.click();"""
}
def entry(app):
    for name in ('index.html','web/index.html'):
        if (ROOT/'examples'/app/name).exists(): return ROOT/'examples'/app/name
    raise FileNotFoundError(app)
async def main():
    chosen = sys.argv[1:] or GAMES
    for x in chosen: entry(x)
    chrome=shutil.which('chromium') or shutil.which('chromium-browser')
    if not chrome: raise RuntimeError('Chromium fehlt')
    with tempfile.TemporaryDirectory(prefix='mupibox-games-cdp-') as profile:
        proc=subprocess.Popen([chrome,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
            '--allow-file-access-from-files','--disable-features=Translate','--hide-scrollbars','--remote-allow-origins=*',
            f'--remote-debugging-port={PORT}',f'--user-data-dir={profile}','--window-size=800,480',
            'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            tab=None
            for _ in range(100):
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json',timeout=1) as r:
                        tabs=json.load(r)
                    tab=next((t for t in tabs if t.get('type')=='page'),None)
                    if tab:break
                except Exception: await asyncio.sleep(.08)
            if not tab: raise RuntimeError('CDP unreachable')
            async with websockets.connect(tab['webSocketDebuggerUrl'],max_size=18_000_000) as ws:
                req_id=0
                async def call(method,params=None):
                    nonlocal req_id
                    req_id+=1; identity=req_id
                    await ws.send(json.dumps({'id':identity,'method':method,'params':params or {}}))
                    while True:
                        event=json.loads(await asyncio.wait_for(ws.recv(),timeout=12))
                        if event.get('id')==identity:
                            if 'error' in event:raise RuntimeError(str(event['error']))
                            return event.get('result',{})
                async def js(expr):
                    d=await call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':True})
                    if 'exceptionDetails' in d: print('JS-ERROR',d['exceptionDetails'].get('text'))
                    return d.get('result',{}).get('value')
                async def shot(dst):
                    resp=await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
                    im=Image.open(BytesIO(base64.b64decode(resp['data']))).convert('RGB')
                    if im.size != (800,480): raise RuntimeError(f'Wrong viewport: {im.size}')
                    im.save(dst,'WEBP',quality=88,method=5)
                    return im
                await call('Page.enable')
                await call('Runtime.enable')
                await call('Emulation.setDeviceMetricsOverride',{'width':800,'height':480,'deviceScaleFactor':1,'mobile':False})
                await call('Page.addScriptToEvaluateOnNewDocument',{'source':"Object.defineProperty(navigator,'language',{configurable:true,get:()=> 'de-DE'});"})
                failed=[]
                for app in chosen:
                    try:
                        url=entry(app).resolve().as_uri()
                        await call('Page.navigate',{'url':url})
                        await asyncio.sleep(2.4 if app=='chess' else 1.5)
                        if app=='chess':
                            await js("document.getElementById('mode').value='two';document.getElementById('new-game').click();")
                            await asyncio.sleep(.15)
                        state=await js("JSON.stringify({ready:document.readyState, title:document.title,buttons:document.querySelectorAll('button').length,body:document.body.innerText.slice(0,110)})")
                        out=ROOT/'examples'/app
                        a=await shot(out/'screenshot-1-start.webp')
                        await js(ACTIONS.get(app,''))
                        await asyncio.sleep(3.7 if app=='mupi-rhythm' else .7)
                        b=await shot(out/'screenshot-2-game.webp')
                        differ=ImageChops.difference(a,b).getbbox() is not None
                        print(f'{app}: {a.size}, real browser captures, changed={differ}, {json.loads(state) if state else state}',flush=True)
                        if not differ: failed.append(app+' (identical frames)')
                    except Exception as e:
                        print(f'ERROR {app}: {e}',flush=True); failed.append(app+' ('+str(e)+')')
                print('CAPTURE SUMMARY:',len(chosen)-len(failed),'/',len(chosen),'with changes; check:',', '.join(failed) or 'none')
        finally:
            proc.terminate()
            try:proc.wait(timeout=3)
            except subprocess.TimeoutExpired: proc.kill()

if __name__=='__main__':
    asyncio.run(main())
