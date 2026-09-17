"""
Render all HTML diagrams to PNG via Playwright.
"""
import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

DIAGRAMS = [
    ('architecture.html', 'architecture.png', 1400, 900),
    ('er_diagram.html', 'er_diagram.png', 1400, 1000),
    ('scraping_flow.html', 'scraping_flow.png', 1400, 800),
    ('verification_flow.html', 'verification_flow.png', 1400, 900),
    ('billing_lifecycle.html', 'billing_lifecycle.png', 1400, 900),
    ('risk_matrix.html', 'risk_matrix.png', 1100, 900),
]

async def render_one(playwright, html_name, png_name, w, h):
    src = f'/home/z/my-project/scripts/diagrams/{html_name}'
    dst = f'/home/z/my-project/scripts/assets/{png_name}'
    browser = await playwright.chromium.launch()
    ctx = await browser.new_context(viewport={'width': w, 'height': h},
                                     device_scale_factor=2)
    page = await ctx.new_page()
    await page.goto(f'file://{src}', wait_until='networkidle')
    await page.wait_for_timeout(500)
    await page.screenshot(path=dst, full_page=False,
                          clip={'x': 0, 'y': 0, 'width': w, 'height': h})
    await browser.close()
    print(f'  {png_name}: {os.path.getsize(dst) // 1024} KB')

async def main():
    async with async_playwright() as p:
        for html_name, png_name, w, h in DIAGRAMS:
            await render_one(p, html_name, png_name, w, h)
            await asyncio.sleep(0.2)

asyncio.run(main())
print('All diagrams rendered.')
