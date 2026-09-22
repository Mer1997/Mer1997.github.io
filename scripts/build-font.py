"""Build self-hosted CJK web subsets: python build-font.py ORIGINAL.ttf.

Requires fonttools and brotli only when regenerating font assets.
Latin stays in the site's existing proportional/monospace font stacks.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
out = root / 'static/fonts/lxgw-wenkai'
out.mkdir(parents=True, exist_ok=True)
font = TTFont(source)
supported = {n for n in font.getBestCmap() if n >= 0x2E80}
font.close()
used = set()
for folder in ('content', 'layouts'):
    for file in (root / folder).rglob('*'):
        if file.is_file():
            used.update(map(ord, file.read_text(encoding='utf-8')))
used.update(map(ord, (root / 'hugo.yaml').read_text()))
common = sorted(supported & used)
remaining = sorted(supported - set(common))
groups = [common] + [remaining[i:i+2048] for i in range(0, len(remaining), 2048)]
css = []
for i, chars in enumerate(groups):
    options = subset.Options()
    options.flavor = 'woff2'
    font = subset.load_font(str(source), options)
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=chars)
    worker.subset(font)
    name = f'gb-screen-1.522-{i:02}.woff2'
    subset.save_font(font, str(out / name), options)
    font.close()
    ranges = ','.join(f'U+{n:X}' for n in chars)
    css.append('@font-face {font-family:"LXGW WenKai GB Screen Web";font-style:normal;'
               'font-weight:400;font-display:swap;src:url("/fonts/lxgw-wenkai/'
               + name + '") format("woff2");unicode-range:' + ranges + ';}')
(out / 'font.css').write_text('\n'.join(css) + '\n')
print(f'{len(groups)} subsets, {len(common)} common characters, {len(supported)} CJK glyphs')
