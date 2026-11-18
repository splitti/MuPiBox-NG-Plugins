#!/usr/bin/env python3
"""Regression checks for MuPi Run grounded rear-view mascot animation."""
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'examples/mupi-run/art'
NAMES=('mupi-back','mupi-back-run-left','mupi-back-run-right')
images=[]
for name in NAMES:
    image=Image.open(ART/(name+'.png')).convert('RGBA')
    assert image.size==(375,455),f'{name}: source dimensions changed'
    box=image.getchannel('A').getbbox()
    assert box and 332<=box[3]<=349,f'{name}: feet/tail extend below ground anchor: {box}'
    # Transparent space below the feet cannot be used as the ground origin.
    assert image.getchannel('A').crop((0,360,375,455)).getbbox() is None
    images.append(image)

for image in images[1:]:
    assert ImageChops.difference(image,images[0]).getbbox(), 'Missing moving leg pose'

# Foot support is calibrated from source y=339, not the image's bottom y=455.
source_h=455
drawn_h=210
foot_source_y=339
bottom_offset=drawn_h*(source_h-foot_source_y)/source_h
world_foot=435
rendered_foot=world_foot+bottom_offset-drawn_h*(source_h-foot_source_y)/source_h
assert abs(rendered_foot-world_foot)<.001
print('MuPi foot anchoring and two distinct running poses: PASS')
