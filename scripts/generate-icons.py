"""Generate EduPath PWA app icons (192x192 and 512x512 PNGs)."""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size: int, output_path: str):
    """Create an EduPath app icon with emerald gradient background + 'E' letter."""
    img = Image.new('RGB', (size, size), '#059669')
    draw = ImageDraw.Draw(img)

    # Draw a darker emerald circle in the center
    margin = int(size * 0.1)
    draw.ellipse([margin, margin, size - margin, size - margin], fill='#0d9488')

    # Draw 'E' letter in the center
    font_size = int(size * 0.5)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/freefont/FreeSansBold.ttf', font_size)
    except:
        font = ImageFont.load_default()

    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), 'E', font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1]

    draw.text((x, y), 'E', fill='white', font=font)

    img.save(output_path, 'PNG')
    print(f'  {output_path} ({size}x{size})')

output_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
create_icon(192, os.path.join(output_dir, 'icon-192.png'))
create_icon(512, os.path.join(output_dir, 'icon-512.png'))
print('Done!')
