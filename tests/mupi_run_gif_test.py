#!/usr/bin/env python3
"""Validation of the user's real 20-frame GIF and game sprite atlas."""
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'examples/mupi-run'
gif=Image.open(APP/'source/mupi-run-reference.gif')
assert gif.format=='GIF' and gif.size==(280,280)
assert gif.n_frames==20, f'Expected 20 frames, got {gif.n_frames}'
atlas=Image.open(APP/'art/mupi-running-atlas.webp').convert('RGBA')
assert atlas.size==(1100,880)
frames=[]
for i in range(20):
    gif.seek(i)
    original=gif.convert('RGBA')
    bbox=original.getchannel('A').getbbox()
    assert bbox is not None and 9<=bbox[0]<245 and 240<=bbox[3]<=275,(i,bbox)
    tile=atlas.crop(((i%5)*220,(i//5)*220,(i%5+1)*220,(i//5+1)*220))
    assert tile.getchannel('A').getbbox() is not None,i
    frames.append(tile)
assert len({im.tobytes() for im in frames})==20,'Duplicate frames in atlas'
assert not any(im.getpixel((0,0))[3] for im in frames),'Atlas lost transparent background'
print('20 unique original MuPi GIF frames, alpha and game atlas: PASS')
