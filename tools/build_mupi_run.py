#!/usr/bin/env python3
"""Package MuPi Run without screenshots or documentation."""
from __future__ import annotations
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'examples/mupi-run'
FILES=('manifest.json','index.html','app.js','logic.js','style.css','icon.png','cover.png')
OUTPUT=ROOT/'dist/mupi-run.mupiapp'
def main():
    with tempfile.TemporaryDirectory(prefix='mupi-run-pack-') as td:
        dest=Path(td)/'app'
        dest.mkdir()
        for name in FILES:
            shutil.copy2(SOURCE/name,dest/name)
        art=dest/'art'
        art.mkdir()
        for sprite in sorted((SOURCE/'art').glob('*.png')):
            shutil.copy2(sprite,art/sprite.name)
        shutil.copy2(ROOT/'sdk/mupibox-sdk.js',dest/'mupibox-sdk.js')
        OUTPUT.parent.mkdir(parents=True,exist_ok=True)
        subprocess.run([sys.executable,str(ROOT/'tools/mupiapp.py'),'pack',str(dest),str(OUTPUT)],check=True)
        subprocess.run([sys.executable,str(ROOT/'tools/mupiapp.py'),'validate',str(OUTPUT)],check=True)
    print(f'Ready: {OUTPUT} ({OUTPUT.stat().st_size} bytes)')
if __name__=='__main__':
    main()