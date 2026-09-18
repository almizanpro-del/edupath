"""
Generate 12-week Phase 1 Gantt chart.
"""
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.font_manager as fm

# Font setup (anti-garbled)
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# Palette (cascade indigo-teal)
PAGE_BG = '#f4f5f5'
HEADER_FILL = '#486d7f'
ACCENT = '#3695c5'
ACCENT_2 = '#c15531'
COVER_BLOCK = '#495d66'
BORDER = '#a9bdc7'
TEXT_PRIMARY = '#1b1c1d'
TEXT_MUTED = '#81888b'
SEM_SUCCESS = '#3e9059'
SEM_WARNING = '#b08c45'

# Tasks: (track, name, start_week, duration_weeks)
# Tracks: Backend (A), Frontend (B), Content/Ops (C)
tasks = [
    # Backend
    ('A', 'Prisma schema + Supabase migrations + CI', 1, 1),
    ('A', 'Auth (email + Google OAuth), RLS policies', 2, 1),
    ('A', 'Universities CRUD + FTS search', 3, 1),
    ('A', 'Programs + scholarships APIs', 4, 1),
    ('A', 'Reviews API + moderation queue', 5, 1),
    ('A', 'Saved lists + share tokens', 6, 1),
    ('A', 'Alert subscription + cron email job', 7, 1),
    ('A', 'Compare API (server-side)', 8, 1),
    ('A', 'User verification flow (upload + admin)', 9, 1),
    ('A', 'Admin dashboard APIs', 10, 1),
    ('A', 'Performance pass (RSC, ISR, image opt)', 11, 1),
    ('A', 'Monitoring (Sentry + PostHog) + buffer', 12, 1),

    # Frontend
    ('B', 'Next.js 16 scaffold + Shadcn + next-intl + RTL', 1, 1),
    ('B', 'Layout, header, footer, home page', 2, 1),
    ('B', '/universities listing with filters', 3, 1),
    ('B', '/universities/[slug] detail page', 4, 1),
    ('B', 'Review form + review cards', 5, 1),
    ('B', '/saved-lists UI + alert signup', 6, 1),
    ('B', 'Cost calculator UI', 7, 1),
    ('B', '/universities/compare with Recharts', 8, 1),
    ('B', 'Account page, language toggle, RTL QA', 9, 1),
    ('B', 'Admin UI (Shadcn data tables)', 10, 1),
    ('B', 'Polish: empty states, skeletons, errors', 11, 1),
    ('B', 'Bug fixes, SEO audit, Lighthouse > 90', 12, 1),

    # Content / Ops
    ('C', 'Source 1K universities CSV, data schema', 1, 1),
    ('C', 'Start scraping pipeline (Playwright)', 2, 1),
    ('C', 'First 200 universities seeded', 3, 1),
    ('C', 'Reviews moderation workflow spec', 4, 1),
    ('C', 'Continue seeding (target: 500)', 5, 1),
    ('C', 'FX rate integration (exchangerate.host)', 6, 1),
    ('C', 'Beta tester recruitment (personas)', 7, 1),
    ('C', 'SEO: sitemap, structured data, OG images', 8, 1),
    ('C', 'Content: 50+ editorial guides on countries', 9, 1),
    ('C', 'Soft launch to 20 testers', 10, 1),
    ('C', 'Iterate based on tester feedback', 11, 1),
    ('C', 'Launch to 100 beta users', 12, 1),
]

# Track metadata
track_colors = {
    'A': ACCENT,         # Backend - indigo
    'B': SEM_SUCCESS,    # Frontend - green
    'C': SEM_WARNING,    # Content/Ops - amber
}
track_names = {
    'A': 'Backend / Data',
    'B': 'Frontend',
    'C': 'Content / Ops',
}

fig, ax = plt.subplots(figsize=(14, 9), constrained_layout=True)
fig.patch.set_facecolor('#ffffff')
ax.set_facecolor('#ffffff')

# Reverse for top-down display (latest task at bottom)
y_positions = list(range(len(tasks), 0, -1))

for (track, name, start, dur), y in zip(tasks, y_positions):
    color = track_colors[track]
    # Bar
    ax.barh(y, dur, left=start - 1, height=0.65, color=color, alpha=0.85,
            edgecolor='white', linewidth=1.2)
    # Label inside or to the right
    label_x = start - 1 + dur / 2
    if dur >= 1:
        ax.text(label_x, y, name, ha='center', va='center',
                fontsize=8, color='white', fontweight='bold',
                clip_on=True)

# Week markers
for w in range(0, 13):
    ax.axvline(w, color=BORDER, linewidth=0.5, alpha=0.5, zorder=0)

# Highlight critical-path weeks (2-3 scraping, 8 compare)
for w in [2, 3]:
    ax.axvspan(w - 1, w, color=ACCENT_2, alpha=0.08, zorder=0)
for w in [8]:
    ax.axvspan(w - 1, w, color=ACCENT_2, alpha=0.08, zorder=0)

# Y-axis: track labels at group midpoints
ax.set_yticks(y_positions)
ax.set_yticklabels([f'{track_names[t]}' if i == 0 or tasks[i-1][0] != t else ''
                    for i, (t, _, _, _) in enumerate(tasks)],
                   fontsize=9, color=TEXT_PRIMARY)

# X-axis: weeks
ax.set_xticks([w - 0.5 for w in range(1, 13)])
ax.set_xticklabels([f'W{w}' for w in range(1, 13)], fontsize=10, color=TEXT_PRIMARY)
ax.set_xlim(-0.05, 12.05)
ax.set_ylim(0, len(tasks) + 1)

# Spines cleanup
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['left'].set_color(BORDER)
ax.spines['bottom'].set_color(BORDER)
ax.tick_params(axis='both', length=0)

# Grid
ax.grid(axis='x', linestyle='--', alpha=0.2, linewidth=0.5)
ax.set_axisbelow(True)

# Title
ax.set_title('Phase 1 MVP - 12-Week Implementation Gantt',
             fontsize=15, fontweight='bold', color=TEXT_PRIMARY,
             loc='left', pad=15)

# Subtitle
fig.text(0.02, 0.94,
         'Three parallel tracks. Red-tinted weeks (W2, W3, W8) mark critical-path risks: scraping and compare tool.',
         fontsize=10, color=TEXT_MUTED, style='italic')

# Legend
legend_patches = [
    mpatches.Patch(color=track_colors['A'], alpha=0.85, label='Backend / Data'),
    mpatches.Patch(color=track_colors['B'], alpha=0.85, label='Frontend'),
    mpatches.Patch(color=track_colors['C'], alpha=0.85, label='Content / Ops'),
]
ax.legend(handles=legend_patches, loc='upper right',
          frameon=False, fontsize=10, ncol=3,
          bbox_to_anchor=(1.0, 1.08))

# Save
out = '/home/z/my-project/scripts/assets/gantt.png'
plt.savefig(out, dpi=180, facecolor='white')
plt.close()
print(f'Gantt chart saved: {out}')
