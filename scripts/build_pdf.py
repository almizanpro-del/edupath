"""
EduPath Development Plan - PDF generation script.
Body PDF (cover is rendered separately via Playwright and merged via pypdf).
"""
import os
import sys
import hashlib
import platform
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image,
    Table, TableStyle, KeepTogether, CondPageBreak, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents

# ─────────────────────────────────────────────────────────────────
# Skill scripts path
# ─────────────────────────────────────────────────────────────────
PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
_scripts = os.path.join(PDF_SKILL_DIR, 'scripts')
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)
from pdf import install_font_fallback  # noqa: E402

# ─────────────────────────────────────────────────────────────────
# Cascade Palette - tech modern indigo (palette.cascade seed=100)
# ─────────────────────────────────────────────────────────────────
# XL tier: backgrounds (area > 50%, S ≤ 0.08)
PAGE_BG       = colors.HexColor('#f4f5f5')
SECTION_BG    = colors.HexColor('#eff0f1')

# L tier: surfaces (area 20-50%, S ≤ 0.15)
CARD_BG       = colors.HexColor('#e3e7e8')
TABLE_STRIPE  = colors.HexColor('#e9ebec')

# M tier: structural fills (area 5-20%, S ≤ 0.30)
HEADER_FILL   = colors.HexColor('#486d7f')
COVER_BLOCK   = colors.HexColor('#495d66')

# S tier: edges & icons (area 1-5%, S ≤ 0.50)
BORDER        = colors.HexColor('#a9bdc7')
ICON          = colors.HexColor('#44697c')

# XS tier: emphasis (area < 1%, S ≤ 0.75)
ACCENT        = colors.HexColor('#3695c5')
ACCENT_2      = colors.HexColor('#c15531')

# Typography
TEXT_PRIMARY  = colors.HexColor('#1b1c1d')
TEXT_MUTED    = colors.HexColor('#81888b')

# Semantic
SEM_SUCCESS   = colors.HexColor('#3e9059')
SEM_WARNING   = colors.HexColor('#b08c45')
SEM_ERROR     = colors.HexColor('#9c5650')
SEM_INFO      = colors.HexColor('#4a6681')

# Table colors
TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ─────────────────────────────────────────────────────────────────
# Font registration
# ─────────────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

install_font_fallback()

# ─────────────────────────────────────────────────────────────────
# Page geometry
# ─────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4  # 595.28 x 841.89 pt
MARGIN = 0.85 * inch  # ~61pt symmetric
AVAILABLE_WIDTH = PAGE_W - 2 * MARGIN  # ~473pt
AVAILABLE_HEIGHT = PAGE_H - 2 * MARGIN

# ─────────────────────────────────────────────────────────────────
# Styles
# ─────────────────────────────────────────────────────────────────
BODY_FONT = 'FreeSerif'
BODY_BOLD = 'FreeSerif-Bold'
BODY_ITALIC = 'FreeSerif-Italic'
MONO_FONT = 'DejaVuSans'

style_h1 = ParagraphStyle(
    name='H1', fontName=BODY_BOLD, fontSize=20, leading=26,
    textColor=HEADER_FILL, alignment=TA_LEFT,
    spaceBefore=18, spaceAfter=10, keepWithNext=1,
)
style_h2 = ParagraphStyle(
    name='H2', fontName=BODY_BOLD, fontSize=14, leading=20,
    textColor=HEADER_FILL, alignment=TA_LEFT,
    spaceBefore=14, spaceAfter=6, keepWithNext=1,
)
style_h3 = ParagraphStyle(
    name='H3', fontName=BODY_BOLD, fontSize=11.5, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=10, spaceAfter=4, keepWithNext=1,
)
style_body = ParagraphStyle(
    name='Body', fontName=BODY_FONT, fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY,
    spaceBefore=0, spaceAfter=8, firstLineIndent=0,
)
style_body_left = ParagraphStyle(
    name='BodyLeft', parent=style_body, alignment=TA_LEFT,
)
style_bullet = ParagraphStyle(
    name='Bullet', fontName=BODY_FONT, fontSize=10.5, leading=15,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=18, firstLineIndent=-12,
    spaceBefore=2, spaceAfter=2,
)
style_caption = ParagraphStyle(
    name='Caption', fontName=BODY_ITALIC, fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER,
    spaceBefore=4, spaceAfter=12,
)
style_code = ParagraphStyle(
    name='Code', fontName=MONO_FONT, fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=8, rightIndent=8,
    spaceBefore=4, spaceAfter=4,
)
style_table_header = ParagraphStyle(
    name='THead', fontName=BODY_BOLD, fontSize=10, leading=13,
    textColor=colors.white, alignment=TA_CENTER,
)
style_table_cell = ParagraphStyle(
    name='TCell', fontName=BODY_FONT, fontSize=9.5, leading=12.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
style_table_cell_center = ParagraphStyle(
    name='TCellC', parent=style_table_cell, alignment=TA_CENTER,
)
style_toc_title = ParagraphStyle(
    name='TOCTitle', fontName=BODY_BOLD, fontSize=22, leading=28,
    textColor=HEADER_FILL, alignment=TA_LEFT, spaceAfter=20,
)
style_quote = ParagraphStyle(
    name='Quote', fontName=BODY_ITALIC, fontSize=10.5, leading=16,
    textColor=TEXT_MUTED, alignment=TA_LEFT,
    leftIndent=20, rightIndent=20, spaceBefore=8, spaceAfter=8,
    borderColor=ACCENT, borderWidth=0, borderPadding=0,
)
style_callout_label = ParagraphStyle(
    name='CalloutLabel', fontName=BODY_BOLD, fontSize=9, leading=12,
    textColor=ACCENT, alignment=TA_LEFT, spaceAfter=2,
)
style_callout_body = ParagraphStyle(
    name='CalloutBody', fontName=BODY_FONT, fontSize=10, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
style_stat_big = ParagraphStyle(
    name='StatBig', fontName=BODY_BOLD, fontSize=22, leading=26,
    textColor=ACCENT, alignment=TA_CENTER,
)
style_stat_label = ParagraphStyle(
    name='StatLabel', fontName=BODY_FONT, fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER,
)

# ─────────────────────────────────────────────────────────────────
# TocDocTemplate
# ─────────────────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


def add_heading(text, style, level=0):
    key = 'h_' + hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


# Orphan prevention threshold
H1_ORPHAN_THRESHOLD = AVAILABLE_HEIGHT * 0.18


def add_major_section(text):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, style_h1, level=0),
    ]


def add_subsection(text):
    return [add_heading(text, style_h2, level=1)]


# ─────────────────────────────────────────────────────────────────
# Helper: image embedding with aspect ratio
# ─────────────────────────────────────────────────────────────────
from PIL import Image as PILImage


def embed_image(path, max_width=None, max_height=None):
    if max_width is None:
        max_width = AVAILABLE_WIDTH
    if max_height is None:
        max_height = AVAILABLE_HEIGHT * 0.55
    pil = PILImage.open(path)
    ow, oh = pil.size
    rw = max_width / ow if ow > max_width else 1.0
    rh = max_height / oh if oh > max_height else 1.0
    ratio = min(rw, rh)
    return Image(path, width=ow * ratio, height=oh * ratio)


# ─────────────────────────────────────────────────────────────────
# Helper: callout box
# ─────────────────────────────────────────────────────────────────
def callout(label, body_text, accent_color=ACCENT, bg=CARD_BG):
    label_p = Paragraph(label.upper(), style_callout_label)
    body_p = Paragraph(body_text, style_callout_body)
    t = Table([[label_p], [body_p]], colWidths=[AVAILABLE_WIDTH - 24])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('LINEBEFORE', (0, 0), (0, -1), 3, accent_color),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (0, 0), 10),
        ('BOTTOMPADDING', (0, 0), (0, 0), 2),
        ('TOPPADDING', (0, 1), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


# ─────────────────────────────────────────────────────────────────
# Helper: stat block (3-up metrics row)
# ─────────────────────────────────────────────────────────────────
def stat_row(stats):
    """stats = [(value, label), (value, label), ...] - up to 3"""
    cells = []
    for value, label in stats:
        cell = Table(
            [[Paragraph(f'<b>{value}</b>', style_stat_big)],
             [Paragraph(label, style_stat_label)]],
            colWidths=[(AVAILABLE_WIDTH - 24) / len(stats)],
        )
        cell.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
            ('BOX', (0, 0), (-1, -1), 0.8, BORDER),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 0),
            ('TOPPADDING', (0, 1), (-1, 1), 0),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        cells.append(cell)
    row = Table([cells], colWidths=[(AVAILABLE_WIDTH) / len(stats)] * len(stats))
    row.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return row


# ─────────────────────────────────────────────────────────────────
# Helper: standard data table
# ─────────────────────────────────────────────────────────────────
def make_table(headers, rows, col_ratios=None, header_align='center'):
    n_cols = len(headers)
    if col_ratios is None:
        col_ratios = [1.0 / n_cols] * n_cols
    assert abs(sum(col_ratios) - 1.0) < 0.01, f'col_ratios must sum to 1.0, got {sum(col_ratios)}'
    col_widths = [r * AVAILABLE_WIDTH for r in col_ratios]

    head_align_style = (style_table_header if header_align == 'center'
                        else ParagraphStyle(name='THeadL', parent=style_table_header,
                                            alignment=TA_LEFT))
    data = [[Paragraph(h, head_align_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) if not isinstance(c, Paragraph) else c
                     for c in row])

    t = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, 0), 1.2, HEADER_FILL),
        ('LINEABOVE', (0, -1), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, -1), (-1, -1), 0.8, HEADER_FILL),
        ('GRID', (0, 1), (-1, -1), 0.3, BORDER),
    ]
    # Alternating rows
    for i in range(1, len(data)):
        bg = TABLE_ROW_ODD if i % 2 == 1 else TABLE_ROW_EVEN
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t


# ─────────────────────────────────────────────────────────────────
# Helper: code block with light tint background
# ─────────────────────────────────────────────────────────────────
def code_block(code_text, language=None):
    # Escape HTML-sensitive chars
    escaped = (code_text
               .replace('&', '&')
               .replace('<', '<')
               .replace('>', '>'))
    lines = escaped.split('\n')
    # Build paragraphs (each line wrapped in <font> for mono)
    content_paragraphs = []
    if language:
        lang_label = Paragraph(
            f'<font color="#81888b" size="8">{language.upper()}</font>',
            ParagraphStyle(name='CodeLang', fontName=BODY_FONT, fontSize=8,
                           alignment=TA_RIGHT, textColor=TEXT_MUTED)
        )
        content_paragraphs.append(lang_label)
    for line in lines:
        if line.strip() == '':
            line = ' '
        p = Paragraph(f'<font name="DejaVuSans">{line}</font>',
                      ParagraphStyle(name='CodeLine', fontName=MONO_FONT,
                                     fontSize=8.2, leading=11.5,
                                     textColor=TEXT_PRIMARY,
                                     leftIndent=2, rightIndent=2,
                                     spaceBefore=0, spaceAfter=0))
        content_paragraphs.append(p)

    t = Table([[p] for p in content_paragraphs], colWidths=[AVAILABLE_WIDTH - 16])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('LINEBEFORE', (0, 0), (0, -1), 2, ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -2), 0),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


# ─────────────────────────────────────────────────────────────────
# Header / Footer
# ─────────────────────────────────────────────────────────────────
def header_footer(canvas, doc):
    canvas.saveState()
    # Header
    canvas.setFont(BODY_FONT, 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 36, 'EduPath Development Plan v1.1')
    canvas.setFillColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, PAGE_H - 44, PAGE_W - MARGIN, PAGE_H - 44)
    # Footer
    canvas.setFont(BODY_FONT, 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 28, 'Prepared for Hamad (Product Owner)  -  September 2026')
    page_num = canvas.getPageNumber()
    canvas.drawRightString(PAGE_W - MARGIN, 28, f'{page_num}')
    canvas.setFillColor(BORDER)
    canvas.line(MARGIN, 42, PAGE_W - MARGIN, 42)
    canvas.restoreState()


# Story is built in chapters/01_executive_summary.py through 14_appendix.py
# Imported and appended in build_pdf()


# ─────────────────────────────────────────────────────────────────
# Helpers dict to pass to chapter modules
# ─────────────────────────────────────────────────────────────────
HELPERS = {
    'add_major_section': add_major_section,
    'add_subsection': add_subsection,
    'make_table': make_table,
    'code_block': code_block,
    'callout': callout,
    'embed_image': embed_image,
    'stat_row': stat_row,
    'styles': {
        'style_body': style_body,
        'style_body_left': style_body_left,
        'style_h1': style_h1,
        'style_h2': style_h2,
        'style_h3': style_h3,
        'style_bullet': style_bullet,
        'style_caption': style_caption,
        'style_code': style_code,
    },
    'ACCENT': ACCENT,
    'ACCENT_2': ACCENT_2,
    'AVAILABLE_WIDTH': AVAILABLE_WIDTH,
    'AVAILABLE_HEIGHT': AVAILABLE_HEIGHT,
}


def build_pdf():
    output_path = '/home/z/my-project/scripts/assets/body.pdf'

    doc = TocDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title='EduPath Development Plan v1.1',
        author='Z.ai',
        creator='Z.ai',
        subject='Technical development plan for the EduPath MENA university admission platform (v1.1 - 6 critical fixes applied)',
    )

    story = []

    # Import chapter builders
    sys.path.insert(0, '/home/z/my-project/scripts')
    from chapters_1_3 import build_story as build_1_3
    from chapters_4_6 import append_chapters_4_6
    from chapters_7_9 import append_chapters_7_9
    from chapters_10_14 import append_chapters_10_14

    # Chapters 1-3 (TOC + Exec Summary + PRD Review + Architecture)
    story.extend(build_1_3())

    # Chapters 4-6 (Data Model + Scraping + Review Verification)
    append_chapters_4_6(story, HELPERS)

    # Chapters 7-9 (AI Essay + Monetization + Routes)
    append_chapters_7_9(story, HELPERS)

    # Chapters 10-14 (Implementation + Risks + Roadmap + Metrics + Appendix)
    append_chapters_10_14(story, HELPERS)

    # Build with multiBuild for TOC
    doc.multiBuild(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f'Body PDF generated: {output_path}')
    print(f'  Size: {os.path.getsize(output_path) // 1024} KB')


if __name__ == '__main__':
    build_pdf()
