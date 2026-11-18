#!/usr/bin/env python3
"""Build the player's uploaded 20-frame MuPi GIF into a browser-safe sprite atlas.

The source GIF is preserved bit-for-bit in source/, the original images are not
regenerated or approximated with geometrical shapes.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'examples/mupi-run'
SOURCE = APP / 'source/mupi-run-reference.gif'
OUTPUT = APP / 'art/mupi-running-atlas.webp'
META = APP / 'source/mupi-run-animation.json'

COLS = 5
ROWS = 4
FRAME = 220
EXPECTED = COLS * ROWS

def main():
    img = Image.open(SOURCE)
    if img.format != 'GIF' or getattr(img, 'n_frames', 0) != EXPECTED:
        raise RuntimeError(f'Expected a transparent 20-frame GIF, found {img.format} / {getattr(img, "n_frames", 1)} frames')
    atlas = Image.new('RGBA', (COLS * FRAME, ROWS * FRAME), (0, 0, 0, 0))
    foot_positions = []
    durations = []
    for index in range(EXPECTED):
        img.seek(index)
        frame = img.convert('RGBA')
        if frame.size != (280, 280):
            raise ValueError(f'Frame {index} has unexpected dimensions {frame.size}')
        frame = frame.resize((FRAME, FRAME), Image.Resampling.LANCZOS)
        # Preserve transparent borders and exact placement from the input GIF.
        atlas.alpha_composite(frame, ((index % COLS) * FRAME, (index // COLS) * FRAME))
        bbox = frame.getchannel('A').getbbox()
        foot_positions.append(bbox[3] if bbox else 0)
        durations.append(img.info.get('duration', 100))
    atlas.save(OUTPUT, format='WEBP', quality=86, method=4, exact=True)
    digest=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    META.write_text(json.dumps({
        'source':'mupi-run-reference.gif',
        'sourceSha256':digest,
        'frameCount':EXPECTED,'columns':COLS,'rows':ROWS,
        'frameSizePx':FRAME, 'frameDurationsMs':durations,
        'originalSourcePx':[280,280],
        'groundAnchorFraction':260/280,
        'sourceFrameFootBounds':foot_positions,
        'notes':'The actual uploaded GIF is used; the game selects atlas frames itself.'
    },indent=2)+'\n')
    print('GIF import:',EXPECTED,'frames, atlas',atlas.size,OUTPUT.stat().st_size,'bytes, source SHA256',digest)
if __name__=='__main__':
    main()
