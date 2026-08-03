"""00-index.html — contact sheet for the screen set."""

import os

from lib import OUT

GROUPS = [
    ("Authentication", "01", "04"),
    ("Friends and connections", "05", "09"),
    ("Groups", "10", "16"),
    ("Shared expenses", "17", "23"),
    ("Settlements and reminders", "24", "26"),
    ("Activity", "27", "28"),
    ("Personal finance", "29", "33"),
    ("Account and security", "34", "35"),
]

PAGE = """<!doctype html>
<html lang="en" class="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>hissab — screen mockups</title>
<link rel="stylesheet" href="_tokens.css">
<link rel="stylesheet" href="_frame.css">
<style>
  body {{ background:#12151C; padding-bottom:80px; }}
  .wrap {{ max-width:960px; margin:0 auto; padding:48px 24px; color:#E7EAF2; }}
  .wrap h1 {{ font-size:32px; line-height:38px; margin:0 0 10px; font-weight:700; letter-spacing:-.4px; }}
  .wrap .lede {{ font-size:15px; line-height:23px; color:#A2ABBF; margin:0 0 8px; max-width:76ch; }}
  .wrap .lede a {{ color:#8FA6F0; }}
  .meta {{ display:flex; flex-wrap:wrap; gap:8px; margin:22px 0 40px; }}
  .meta span {{ font-size:12px; font-weight:600; letter-spacing:.3px; background:#1E2432;
    border:1px solid #2C3444; color:#B6C0D6; border-radius:6px; padding:6px 10px; }}
  h2 {{ font-size:13px; letter-spacing:1px; text-transform:uppercase; color:#7F8AA3;
    margin:36px 0 12px; font-weight:700; }}
  ol {{ list-style:none; margin:0; padding:0; display:grid; gap:8px; }}
  li a {{ display:flex; align-items:baseline; gap:14px; text-decoration:none; color:#E7EAF2;
    background:#181D28; border:1px solid #242B39; border-radius:11px; padding:13px 16px; }}
  li a:hover {{ background:#1E2533; border-color:#38425A; }}
  li .n {{ font:700 12px/1 var(--font); color:#6F7B94; width:20px; flex:0 0 auto; }}
  li .t {{ font-size:15px; font-weight:600; flex:1 1 auto; }}
  li .s {{ font-size:11px; font-weight:700; letter-spacing:.6px; color:#8FA6F0; }}
  footer {{ margin-top:48px; font-size:13px; line-height:21px; color:#7F8AA3; }}
  footer code {{ background:#1E2432; padding:1px 5px; border-radius:4px; color:#B6C0D6; }}
</style>
</head>
<body>
<div class="wrap">
<h1>hissab — screen mockups</h1>
<p class="lede">One HTML file per screen, each holding the frames for that screen&rsquo;s significant
branches. These files define visual intent and testable variants. Runtime behavior follows the
application code and the repository contract in <code>../AGENTS.md</code>.</p>
<div class="meta">
  <span>Direction A — Grouped Ledger</span>
  <span>Variant A1 — reconciliation scrolls in-form</span>
  <span>L1 — card per currency section</span>
  <span>393 × 852</span>
  <span>Light / dark toggle in every file</span>
</div>
{body}
<footer>
Frames are 393 × 852 at a fixed height, so anything below the fold is genuinely below the fold.
Regenerate the set with <code>cd _build &amp;&amp; python3 build.py</code>; editing a generated
<code>.html</code> directly works but is overwritten on the next build.
</footer>
</div>
</body>
</html>
"""


def build(written):
    by_num = {num: (slug, title, sid) for slug, num, title, sid, _ in written}
    body = []
    for label, lo, hi in GROUPS:
        items = []
        for n in range(int(lo), int(hi) + 1):
            key = f"{n:02d}"
            if key not in by_num:
                continue
            slug, title, sid = by_num[key]
            items.append(f'<li><a href="{slug}"><span class="n">{key}</span>'
                         f'<span class="t">{title}</span><span class="s">{sid}</span></a></li>')
        if items:
            body.append(f'<h2>{label}</h2>\n<ol>\n' + "\n".join(items) + "\n</ol>")
    with open(os.path.join(OUT, "00-index.html"), "w") as fh:
        fh.write(PAGE.format(body="\n".join(body)))
