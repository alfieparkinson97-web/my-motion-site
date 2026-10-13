# contact sheet of review stills: python3 tools/sheet.py out.png a.png b.png ...
import sys
from PIL import Image, ImageDraw
files = sys.argv[2:]
cols = 5; w, h = 270, 480
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 22)), '#222')
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im, (x, y + 22))
    d.text((x + 6, y + 5), f.split('/')[-1], fill='#fff')
sheet.save(sys.argv[1])
