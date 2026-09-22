"""Losslessly merge adjacent unicode ranges; does not change font files."""
import re
from pathlib import Path

def compact(value):
    points = set()
    for entry in value.split(','):
        ends = entry.strip()[2:].split('-')
        points.update(range(int(ends[0],16), int(ends[-1],16)+1))
    runs = []
    for point in sorted(points):
        if runs and point == runs[-1][1] + 1:
            runs[-1][1] = point
        else:
            runs.append([point,point])
    return ','.join(f'U+{a:X}' if a==b else f'U+{a:X}-{b:X}' for a,b in runs)

if __name__ == '__main__':
    path = Path(__file__).resolve().parents[1] / 'static/fonts/lxgw-wenkai/font.css'
    original = path.read_text()
    updated = re.sub(r'unicode-range:([^;]+);',lambda m:'unicode-range:'+compact(m[1])+';',original)
    path.write_text(updated)
    print(f'Font CSS: {len(original.encode())} -> {len(updated.encode())} bytes')
