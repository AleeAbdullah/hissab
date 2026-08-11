"""Shared mockup component builders.

Add shared changes here before adding screen-specific variants.
"""

from lib import IC, avatar, display_symbol, money, tick

# Canonical sample data, kept identical across every screen so a reviewer can
# follow one person's balance from the Friends list to a settlement receipt.
#
#   John Doe   you owe 187.50   (Winter Trip 240.00 owed, Brunch club 40.00
#                                and Direct 12.50 owed to you)
#   Priya Nair owes you 64.00    (Flat 3B)
#   Sam Kessler     settled
#   Omar Farooq     you owe 12,500
#   Lena Toure      owes you 3,200


def seclabel(text, right="", first=False):
    f = " first" if first else ""
    r = f'<span class="rgt t-cap">{right}</span>' if right else ""
    return f'<div class="seclabel t-caps{f}">{text}{r}</div>'


def card(inner, cls=""):
    return f'<div class="card {cls}">{inner}</div>'


def listcard(rows, cls=""):
    return f'<div class="card list {cls}">{"".join(rows)}</div>'


def ledger_row(initials, name, ledgers, direction, amount, display, tone=1,
               settled=False, chev=True):
    """LedgerRow (§4.2c). `ledgers` is a list of (name, phrase) pairs, one line
    each, never wrapping. The ledger name truncates; the amount phrase does not.

    Money uses the viewer's display symbol. The symbol is presentation only;
    switching it in Account never converts the stored numeric value."""
    lines = "".join(
        f'<span class="ln t-cap"><span class="lg">{n} ·</span>'
        f'<span class="mo mono">{p}</span></span>'
        for n, p in ledgers)
    brk = f'<span class="brk">{lines}</span>' if ledgers else ""
    if settled:
        bal = '<span class="bal t-supp c-sec">Settled</span>'
    else:
        col = "c-neg" if direction == "You owe" else "c-pos"
        bal = (f'<span class="bal"><span class="dir t-cap">{direction}</span>'
               f'<span class="amt t-body semi mono {col}">{display_symbol(display)}{amount}</span></span>')
    return (f'<div class="row lrow">{avatar(initials, tone)}'
            f'<span class="grow"><span class="nm t-body med">{name}</span>{brk}</span>'
            f'{bal}{IC["chev"] if chev else ""}</div>')


def expense_row(title, meta, amount, iso=None, chev=True, cls="", mono=True,
                sub=None):
    """Title, a secondary line beneath it, and a trailing value. Usually a dated
    entry in a ledger — expense, payment, adjustment — but the same shape carries
    any list whose rows have a subtitle, such as the deletion blockers.

    The meta line ("Aug 3 · Sam paid · your share 15.00") belongs under the
    title, not under the amount — see the .erow note in _frame.css. Names in
    meta are first-name only; the full name is on the detail screen. Meta
    truncates, the amount never does.

    `mono=False` for a trailing value that is not money. Tabular figures exist to
    let amounts line up decimal-to-decimal; a count like "5 members" has nothing
    to line up with and setting it in mono only implies it is money.

    `sub` is a SHORT second line under the trailing value — "your share 240.00",
    "9:03 AM". It goes here rather than in the meta because the meta is the line
    that truncates, and measured, it was the tail that got cut: "Jul 28 · Winter
    Trip · your share 240.0…" lost 11% and "Winter Trip · Ski passes · 9:03 AM"
    lost 21%. A clipped share amount and a missing timestamp are the two things
    those rows exist to show. Length is the caller's responsibility: `sub` never
    truncates and never wraps, so anything longer than a short money phrase or a
    time will push the title column back into the same starvation this fixed."""
    mc = " mono" if mono else ""
    m = (f'<span class="mn t-body{mc}">{display_symbol(iso)}{amount}</span>' if iso
         else f'<span class="mn t-body{mc}">{amount}</span>')
    if sub:
        m += f'<span class="sb t-cap">{sub}</span>'
    return (f'<div class="row erow {cls}">'
            f'<span class="grow"><span class="ti t-body med">{title}</span>'
            f'<span class="me t-cap">{meta}</span></span>'
            f'<span class="val">{m}</span>{IC["chev"] if chev else ""}</div>')


def kv_row(label, value, sub=None, chev=False, lead="", cls="", vcls="t-body"):
    v = f'<span class="{vcls}">{value}</span>' if value is not None else ""
    if sub:
        v += f'<span class="v2 t-cap" style="display:block">{sub}</span>'
    return (f'<div class="row {cls}">{lead}<span class="grow lbl t-body">{label}</span>'
            f'<span class="val">{v}</span>{IC["chev"] if chev else ""}</div>')


def nav_row(label, value="", chev=True, sub=None, lead="", cls=""):
    v = f'<span class="t-body c-sec">{value}</span>' if value else ""
    if sub:
        v += f'<span class="v2 t-cap" style="display:block">{sub}</span>'
    return (f'<div class="row {cls}">{lead}<span class="grow lbl t-body">{label}</span>'
            f'<span class="val">{v}</span>{IC["chev"] if chev else ""}</div>')


def person_row(initials, name, secondary="", trail="", tone=1, chev=False, cls=""):
    """`initials=None` drops the avatar — sessions and devices are not people."""
    sec = f'<span class="t-cap c-sec" style="display:block;margin-top:1px">{secondary}</span>' if secondary else ""
    return (f'<div class="row {cls}">{avatar(initials, tone) if initials else ""}'
            f'<span class="grow"><span class="t-body med">{name}</span>{sec}</span>'
            f'{trail}{IC["chev"] if chev else ""}</div>')


def select_row(initials, name, secondary, on, tone=1, box=True):
    """`initials=None` means the row has no avatar — categories and display
    symbols are not people, and a coloured circle would imply they are."""
    sec = f'<span class="t-cap c-sec" style="display:block">{secondary}</span>' if secondary else ""
    return (f'<div class="row">{avatar(initials, tone) if initials else ""}'
            f'<span class="grow"><span class="t-body med">{name}</span>{sec}</span>'
            f'{tick(on, box=box)}</div>')


def search(query="", placeholder="Search"):
    q = (f'<span class="q t-body">{query}</span>' if query
         else f'<span class="t-body">{placeholder}</span>')
    return f'<div class="search">{IC["search"]}{q}</div>'


def amount_editor(display, value, label="Amount", caret=True, empty=False):
    v = value if not empty else "0.00"
    cls = " c-sec" if empty else ""
    return (f'<div class="amt-ed"><span class="lb t-cap">{label}</span>'
            f'<span class="mt big mono{cls}"><span class="iso">{display_symbol(display)}</span>'
            f'<span class="v">{v}</span></span>'
            f'{"<span class=" + chr(34) + "caret big" + chr(34) + "></span>" if caret else ""}</div>')


def ctx_marker(kind, ledger=None):
    """ContextMarker (§4.6). Shared vs Personal is always named, never implied."""
    if kind == "shared":
        who = f'<span class="who t-supp">Shared expense · <b>{ledger}</b></span>'
    else:
        who = '<span class="who t-supp">Personal · <b>Only you can see this</b></span>'
    return f'<div class="ctx">{who}<span class="chg t-supp">Change</span></div>'


def recon(total, paid, allocated, iso, out=None):
    """ReconciliationPanel. Total → Paid → Allocated is the signature interaction.
    `out` is (kind, sentence) where kind is 'good' | 'bad' | 'warn'."""
    body = (f'<div class="rrow hd"><span class="k t-body">Total</span>'
            f'{money(iso, total, size="", cls="t-body semi")}</div>'
            f'<div class="rrow"><span class="k t-body">Paid</span>'
            f'{money(iso, paid, cls="t-body")}</div>'
            f'<div class="rrow"><span class="k t-body">Allocated</span>'
            f'{money(iso, allocated, cls="t-body")}</div>')
    if out:
        kind, sentence = out
        if kind == "good":
            body += ('<div class="out good"><div class="l1">'
                     '<span class="reason ok" style="padding:0"><span class="gl"></span></span>'
                     f'<span class="t-supp c-pri" style="margin-left:8px">{sentence}</span>'
                     '</div></div>')
        else:
            body += (f'<div class="out bad"><div class="l1">'
                     f'<span class="reason" style="padding:0"><span class="gl"></span></span>'
                     f'<span class="t-supp c-neg semi" style="margin-left:8px">{sentence}</span>'
                     f'</div></div>')
    return f'<div class="card recon">{body}</div>'


def footer(action, reason=None, kind="", plain=False):
    """PrimaryAction with the A1 reason slot. When the reconciliation panel is
    scrolled away this reason is the only thing adjacent to the action."""
    r = ""
    if reason:
        r = (f'<div class="reason {kind}"><span class="gl"></span>'
             f'<span class="txt t-cap semi">{reason}</span></div>')
    p = " plain" if plain else ""
    return f'<div class="footer{p}">{r}{action}</div>'


def skeleton_rows(n=4):
    out = []
    for _ in range(n):
        out.append('<div class="row lrow top"><span class="sk av"></span>'
                   '<span class="grow"><span class="sk t1"></span>'
                   '<span class="sk t2" style="display:block"></span></span>'
                   '<span class="sk money"></span></div>')
    return out


def stale_strip(text="Showing saved copy from 9:02 AM"):
    return f'<div class="stale t-cap"><span class="d"></span><span>{text}</span></div>'


def banner(head, body, action=None, kind=""):
    a = f'<span class="ba t-supp">{action}</span>' if action else ""
    ic = "!" if kind else "i"
    return (f'<div class="banner {kind}"><span class="ic">{ic}</span>'
            f'<span class="bt t-supp"><span class="h">{head}</span>{body}</span>{a}</div>')


def empty(glyph, title, body, action):
    return (f'<div class="empty"><div class="gl"><svg viewBox="0 0 24 24">{glyph}</svg></div>'
            f'<h3>{title}</h3><p>{body}</p>'
            f'<div class="btn" style="margin:0 8px">{action}</div></div>')


GLYPH = {
    "people": '<circle cx="9" cy="8" r="3.4"/><path d="M3 19c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/>'
              '<circle cx="17.5" cy="9.5" r="2.4"/><path d="M16.4 14.4c2.9.2 4.3 2.1 4.3 5"/>',
    "group":  '<circle cx="12" cy="7.6" r="3.2"/><path d="M6 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/>'
              '<circle cx="4.4" cy="10.6" r="2"/><circle cx="19.6" cy="10.6" r="2"/>',
    "receipt":'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    "clock":  '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.5 2.2"/>',
    "wallet": '<rect x="3.2" y="6" width="17.6" height="12.6" rx="3.2"/><path d="M3.2 10.5h17.6"/>',
    "search": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    "block":  '<circle cx="12" cy="12" r="8.6"/><path d="M6 6l12 12"/>',
    "chart":  '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
}
