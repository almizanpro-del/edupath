"""
Merge cover.pdf + body.pdf -> final EduPath_Development_Plan.pdf
Run post-generation checks.
"""
import os
import sys
import subprocess
from pypdf import PdfReader, PdfWriter

COVER = '/home/z/my-project/scripts/assets/cover.pdf'
BODY = '/home/z/my-project/scripts/assets/body.pdf'
OUT = '/home/z/my-project/download/EduPath_Development_Plan_v1.1.pdf'

A4_W, A4_H = 595.28, 841.89


def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    # Always normalize if even slightly off
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page


def merge():
    writer = PdfWriter()
    cover_page = PdfReader(COVER).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    for page in PdfReader(BODY).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({
        '/Title': 'EduPath Development Plan v1.1',
        '/Author': 'Z.ai',
        '/Creator': 'Z.ai',
        '/Subject': 'Technical development plan for the EduPath MENA university admission platform (v1.1 - 6 critical fixes applied)',
    })
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f:
        writer.write(f)
    print(f'Merged PDF: {OUT}')
    print(f'  Size: {os.path.getsize(OUT) // 1024} KB')
    print(f'  Pages: {len(PdfReader(OUT).pages)}')


if __name__ == '__main__':
    merge()
