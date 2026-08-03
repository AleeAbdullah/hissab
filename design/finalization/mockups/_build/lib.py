"""Shared chrome for the hissab screen mockups.

The 35 screen files are generated so that the status bar, navigation bar, tab
bar and component markup cannot drift between them. Screen bodies are written
as literal HTML in the section modules; only the repeated chrome lives here.

Run ../_build/build.py to regenerate. Editing a generated .html directly is
fine for a one-off experiment but will be overwritten on the next build.
"""

import os

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))

TABS = [
    ("friends", "Friends"),
    ("groups", "Groups"),
    ("activity", "Activity"),
    ("personal", "Personal"),
    ("account", "Account"),
]

TAB_ICONS = {
    "friends": '<circle cx="9.2" cy="8" r="3.3" class="fillable"/>'
               '<path d="M3.4 19.2c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4"/>'
               '<circle cx="17.6" cy="9.4" r="2.3"/>'
               '<path d="M16.5 14.2c2.8.2 4.1 2.1 4.1 5"/>',
    "groups":  '<circle cx="12" cy="7.6" r="3.2" class="fillable"/>'
               '<path d="M6 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/>'
               '<circle cx="4.4" cy="10.6" r="2"/><circle cx="19.6" cy="10.6" r="2"/>',
    "activity":'<circle cx="12" cy="12" r="8.6" class="fillable"/>'
               '<path d="M12 7.2V12l3.5 2.2"/>',
    "personal":'<rect x="3.2" y="6" width="17.6" height="12.6" rx="3.2" class="fillable"/>'
               '<path d="M3.2 10.5h17.6"/><path d="M15.4 14.6h2.6"/>',
    "account": '<circle cx="12" cy="8.6" r="3.6" class="fillable"/>'
               '<path d="M4.9 19.8c0-3.6 3.2-5.9 7.1-5.9s7.1 2.3 7.1 5.9"/>',
}

IC = {
    "chev":   '<span class="chev"><svg viewBox="0 0 8 14"><path d="M1.5 1.5 6.5 7l-5 5.5"/></svg></span>',
    "back":   '<svg viewBox="0 0 10 18" width="10" height="18" style="display:block">'
              '<path d="M8 2 2.5 9 8 16" fill="none" stroke="currentColor" stroke-width="2" '
              'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "search": '<svg viewBox="0 0 16 16"><circle cx="6.8" cy="6.8" r="5"/><path d="M10.6 10.6 15 15"/></svg>',
    "check":  '<svg viewBox="0 0 24 24"><path d="M4 12.6 9.4 18 20 6.4"/></svg>',
}


def money(iso, val, cls="", size=""):
    """MoneyText (§4.4). Currency code and value are one unbreakable unit."""
    return (f'<span class="mt mono {size} {cls}"><span class="iso">{iso}</span>'
            f'<span class="v">{val}</span></span>')


def tick(on, box=False):
    k = "on" if on else "off"
    b = " box" if box else ""
    shape = ('<rect x="1" y="1" width="20" height="20" rx="5" class="r"/>'
             if box else '<circle cx="11" cy="11" r="10" class="r"/>')
    return (f'<span class="tick {k}{b}"><svg viewBox="0 0 22 22">{shape}'
            f'<path d="M6 11.4 9.6 15 16 7.8" class="k"/></svg></span>')


def avatar(initials, tone=1, cls=""):
    return f'<span class="avatar a{tone} {cls}">{initials}</span>'


def statusbar():
    return ('<div class="statusbar"><span>9:41</span>'
            '<span class="ind"><i></i><i class="b"></i></span></div>')


def homebar():
    return '<div class="homebar"></div>'


def nav(title=None, sub=None, back=None, lead="", trail="", border=False, cls=""):
    """Inline navigation bar. `back` is the label shown beside the chevron."""
    if back is not None:
        lead = (f'<span class="back">{IC["back"]}'
                + (f'<span>{back}</span>' if back else "") + "</span>") + lead
    mid = ""
    if title:
        mid = f'<div class="ttl">{title}</div>'
        if sub:
            mid += f'<div class="sub">{sub}</div>'
    b = " brd" if border else ""
    return (f'<div class="nav{b} {cls}"><div class="lead">{lead}</div>'
            f'<div class="mid">{mid}</div><div class="trail">{trail}</div></div>')


def largetitle(title, trail=""):
    return (f'<div class="lgttl"><div class="row1"><div class="t-large">{title}</div>'
            f'<div class="trail">{trail}</div></div></div>')


def tabbar(active):
    out = ['<div class="tabbar">']
    for key, label in TABS:
        on = " on" if key == active else ""
        out.append(f'<div class="tab{on}"><svg viewBox="0 0 24 24">{TAB_ICONS[key]}</svg>'
                   f'<span class="lbl">{label}</span></div>')
    out.append("</div>")
    return "".join(out)


def phone(body, cls=""):
    return f'<div class="phone {cls}">{body}</div>'


def frame(head, body, phone_html, cls=""):
    """One labelled phone frame. `head` is the branch name, `body` explains what
    the frame is proving. Wrap notable caveats in <em> to make them orange."""
    return (f'<figure class="fr {cls}"><figcaption><b>{head}</b>{body}</figcaption>'
            f'{phone_html}</figure>')


PAGE = """<!doctype html>
<html lang="en" class="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{num} · {title} — hissab</title>
<link rel="stylesheet" href="_tokens.css">
<link rel="stylesheet" href="_frame.css">
</head>
<body>
<header class="sheet-head">
  <div class="crumb"><a href="00-index.html">← All screens</a></div>
  <h1>{title}<span class="sid">{sid}</span></h1>
  <p class="note">{note}</p>{prov}
</header>
<main class="board">
{frames}
</main>
<button class="mode-btn" data-mode-toggle>Dark mode</button>
<script src="_app.js"></script>
</body>
</html>
"""

PROV = ('\n  <span class="prov">Provisional — {}</span>')

_written = []


def write(slug, num, title, sid, note, frames, prov=None):
    html = PAGE.format(
        num=num, title=title, sid=sid, note=note,
        prov=PROV.format(prov) if prov else "",
        frames="\n".join(frames),
    )
    path = os.path.join(OUT, slug)
    with open(path, "w") as fh:
        fh.write(html)
    _written.append((slug, num, title, sid, note))
    return slug


def written():
    return _written
