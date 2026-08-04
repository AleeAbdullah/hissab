"""§4 Shared expense creation and maintenance — E01 … E16.

This is the section the whole product is judged on. Two rules constrain every
frame here:

  1. Paid and Owes never share an unlabelled column. Every money row in a payer
     or split sheet carries its own word.
  2. The reconciliation identity is Total = sum(Paid) = sum(Allocated), and when
     it does not hold the screen says the exact correction, not "invalid".

Variant A1 is why the reason text is duplicated into the footer: the
reconciliation panel scrolls, the action does not, so the action needs its own
copy of the reason.
"""

from lib import (statusbar, homebar, nav, frame, phone as frame_phone, write, money, avatar,
                 IC, tick)
from comp import (seclabel, card, listcard, nav_row, kv_row, person_row,
                  select_row, search, banner, expense_row, amount_editor,
                  ctx_marker, recon, footer, stale_strip, GLYPH, empty)

CANCEL = '<span class="act">Cancel</span>'


def phone(body, cls=""):
    return frame_phone(body, f"brand expenses {cls}".strip())


def sheet(title, body, foot, lead="Cancel", trail="", reason=None):
    """A form sheet over a dimmed parent. Payers, split, and the pickers are all
    sheets because they are sub-decisions of one expense, not places.

    `reason` is the A1 reason slot again. A sheet footer needs it for the same
    reason the screen footer does: the running total it refers to is inside the
    scrolling body and may not be on screen."""
    r = (f'<div class="reason"><span class="gl"></span>'
         f'<span class="txt t-cap semi">{reason}</span></div>' if reason else "")
    return (f'<div class="sheet"><div class="grab"></div>'
            f'<div class="shd"><span class="act">{lead}</span>'
            f'<span class="st" style="text-align:center">{title}</span>'
            f'<span class="act" style="text-align:right;min-width:52px">{trail}</span></div>'
            f'<div class="sbody">{body}</div>'
            f'<div class="sfoot">{r}{foot}</div></div>')


def over(sheet_html, dim=True):
    """The parent screen behind a sheet, dimmed. Showing the parent is the point:
    it is what tells the user the sheet is a detour, not a new screen."""
    return (statusbar()
            + nav(title="Add expense", lead=CANCEL,
                  trail='<span class="act off semi">Save</span>')
            + '<div class="scroll">'
            + ctx_marker("shared", "Winter Trip")
            + card(amount_editor("USD", "240.00", caret=False))
            + card(kv_row("Description", "Ski passes")
                   + kv_row("Date", "Jul 28, 2026")
                   + kv_row("Category", "Entertainment"))
            + '</div>'
            + ('<div class="overlay"></div>' if dim else "")
            + sheet_html)


# ---- money rows for the payer and split sheets ---------------------------
def alloc_row(initials, name, word, amount, tone=1, on=True, sub=None,
              muted=False, check=True):
    """One participant line inside a payer or split sheet.

    `word` is the label that stops Paid and Owes being confusable — it is
    printed on every row, never inferred from which sheet you are in. That is
    the one rule §4 of the overview states twice."""
    s = (f'<span class="t-cap c-sec" style="display:block">{sub}</span>'
         if sub else "")
    col = " c-sec" if muted else ""
    # No checkbox on read-only surfaces (expense detail): a tick there would
    # read as an editable control on a screen where nothing is editable.
    box = tick(on, box=True) if check else ""
    return (f'<div class="row">{box}{avatar(initials, tone)}'
            f'<span class="grow"><span class="t-body med{col}">{name}</span>{s}</span>'
            f'<span class="val"><span class="t-cap c-sec" style="display:block">{word}</span>'
            f'<span class="t-body mono{col}">{amount}</span></span></div>')


def running(label, value, kind=""):
    """The running difference at the bottom of a sheet. Always signed by words:
    "180.00 left to assign", never "-180.00"."""
    c = {"bad": "c-neg semi", "good": "c-sec", "warn": "c-warn semi"}[kind or "good"]
    return (f'<div class="row" style="background:var(--surfaceSubtle)">'
            f'<span class="grow t-supp c-sec">{label}</span>'
            f'<span class="val t-supp mono {c}">{value}</span></div>')


def build():
    # ---------------------------------------------------------------- E01 -----
    def addexp(body, foot, tail="", trail_on=False, ttl="Add expense"):
        trail = ('<span class="act semi">Save</span>' if trail_on
                 else '<span class="act off semi">Save</span>')
        return (statusbar() + nav(title=ttl, lead=CANCEL, trail=trail) + tail
                + f'<div class="scroll">{body}</div>' + foot + homebar())

    def form(amount, desc, payer, split, iso="USD", recon_html="", empty_amt=False,
             cat="Choose", date="Aug 3, 2026", ph=False):
        # A placeholder never repeats its own label. "Description / Description"
        # tells the user nothing; "Description / What was this for?" does.
        d = kv_row("Description", desc, chev=False,
                   vcls="t-body c-sec" if ph else "t-body")
        return (ctx_marker("shared", "Winter Trip")
                + card(amount_editor(iso, amount, empty=empty_amt))
                + card(d
                       + nav_row("Currency", iso)
                       + nav_row("Date", date)
                       + nav_row("Category", cat))
                + seclabel("Who paid and who owes")
                + card(nav_row("Paid by", payer) + nav_row("Split", split))
                + recon_html
                + seclabel("Receipt")
                + card(nav_row("Attach a receipt")))

    blank = addexp(
        form("", "What was this for?", "You", "Equally · 5 people",
             empty_amt=True, ph=True),
        footer('<div class="btn off">Save expense</div>',
               "Enter an amount above 0.00 to save."))

    good = addexp(
        form("240.00", "Ski passes", "John Doe", "Equally · 5 people",
             cat="Entertainment", date="Jul 28, 2026",
             recon_html=recon("240.00", "240.00", "240.00", "USD",
                              out=("good", "Balanced. John Doe paid 240.00; "
                                           "your share is 48.00."))),
        footer('<div class="btn">Save expense</div>'),
        trail_on=True)

    paid_bad = addexp(
        form("240.00", "Ski passes", "2 people", "Equally · 5 people",
             cat="Entertainment", date="Jul 28, 2026",
             recon_html=recon("240.00", "190.00", "240.00", "USD",
                              out=("bad", "Paid is 50.00 short of the total. "
                                          "Add 50.00 to a payer."))),
        footer('<div class="btn off">Save expense</div>',
               "Paid is 50.00 short of the total. Add 50.00 to a payer."))

    split_bad = addexp(
        form("240.00", "Ski passes", "John Doe", "Exact · 5 people",
             cat="Entertainment", date="Jul 28, 2026",
             recon_html=recon("240.00", "240.00", "252.00", "USD",
                              out=("bad", "Allocated is 12.00 over the total. "
                                          "Remove 12.00 from a share."))),
        footer('<div class="btn off">Save expense</div>',
               "Allocated is 12.00 over the total. Remove 12.00 from a share."))

    offline = addexp(
        form("240.00", "Ski passes", "John Doe", "Equally · 5 people",
             cat="Entertainment", date="Jul 28, 2026",
             recon_html=recon("240.00", "240.00", "240.00", "USD",
                              out=("good", "Balanced. Your share is 48.00."))),
        footer('<div class="btn off">Save expense</div>',
               "Connect to the internet to save a shared expense.", kind="warn"),
        tail=stale_strip("Offline · shared expenses can only be saved when connected"))

    saving = addexp(
        form("240.00", "Ski passes", "John Doe", "Equally · 5 people",
             cat="Entertainment", date="Jul 28, 2026",
             recon_html=recon("240.00", "240.00", "240.00", "USD",
                              out=("good", "Balanced. Your share is 48.00."))),
        footer('<div class="btn spin off">Saving…</div>'))

    timeout = addexp(
        banner("Still saving", "The request has not been answered yet. Do not "
                               "save again — checking whether it went through "
                               "avoids creating the expense twice.",
               action="Check", kind="w")
        + form("240.00", "Ski passes", "John Doe", "Equally · 5 people",
               cat="Entertainment", date="Jul 28, 2026",
               recon_html=recon("240.00", "240.00", "240.00", "USD",
                                out=("good", "Balanced. Your share is 48.00."))),
        footer('<div class="btn off">Save expense</div>',
               "Save is held until we know whether the first attempt "
               "succeeded.", kind="warn"))

    success = addexp(
        '<div class="success">'
        '<div class="mark"><svg viewBox="0 0 24 24"><path d="M3 12.5 9 18.5 21 5.5"/></svg></div>'
        '<div class="t-headline">Ski passes added</div>'
        '<p class="t-supp c-sec" style="margin:8px 0 0">USD 720.00 in Winter Trip. '
        'John Doe paid, so your balance with them changed.</p>'
        '</div>'
        + seclabel("Resulting balance", first=True)
        + card('<div class="row"><span class="grow"><span class="t-body med">John Doe</span>'
               '<span class="t-cap c-sec" style="display:block">Winter Trip</span></span>'
               '<span class="val"><span class="t-cap c-sec" style="display:block">You owe</span>'
               '<span class="t-body semi mono c-neg">USD 240.00</span></span></div>'),
        footer('<div style="display:flex;gap:8px">'
               '<span class="btn out" style="flex:1">View expense</span>'
               '<span class="btn" style="flex:1">Done</span></div>'),
        ttl="Expense added")

    scaled = addexp(
        ctx_marker("shared", "Winter Trip")
        + card(amount_editor("USD", "240.00"))
        + card(kv_row("Description", "Ski passes") + nav_row("Currency", "USD"))
        + recon("240.00", "190.00", "240.00", "USD",
                out=("bad", "Paid is 50.00 short of the total.")),
        footer('<div class="btn off">Save expense</div>',
               "Paid is 50.00 short of the total. Add 50.00 to a payer."))

    write("17-add-expense.html", "17", "Add shared expense", "E01",
          "The form archetype and the screen the whole product turns on. Total → Paid → Allocated is "
          "always visible as three labelled lines, and when the identity breaks the screen names the "
          "exact correction — the amount and which side to change it on. Variant A1 means the panel "
          "scrolls away, so the footer carries its own copy of the reason.",
          [
              frame("Default", " Shared context is stated, not implied by which button was tapped. "
                               "Save is disabled and says why before anything has been typed.",
                    phone(blank)),
              frame("Balanced", " The panel confirms rather than staying silent, and it states your own "
                                "share — the number the user actually came for.", phone(good)),
              frame("Paid short", " <em>Financial mismatch.</em> 50.00 short, and the correction names "
                                  "the side: add it to a payer, not to a share.", phone(paid_bad)),
              frame("Allocated over", " The mirror case. Same panel, same sentence shape, opposite "
                                      "side — so the two mismatches are never confused.",
                    phone(split_bad)),
              frame("Offline", " Reading offline is allowed; creating shared money is not. Save stays "
                               "disabled until there is a connection.",
                    phone(offline)),
              frame("Saving", " The action is replaced, not merely dimmed, so a second tap has nothing "
                              "to hit.", phone(saving)),
              frame("Ambiguous timeout", " The dangerous state. Retrying blindly is how duplicates get "
                                         "created, so the screen offers a check instead of a retry.",
                    phone(timeout)),
              frame("Success", " Ends on the consequence: which balance moved and by how much.",
                    phone(success)),
              frame("200% text", " <em>Scaling archetype 2 of 3 — forms.</em> The footer reason wraps to "
                                 "three lines and the action keeps its 50px height, because the reason "
                                 "is the part that must survive.", phone(scaled, cls="x2 tall")),
          ])

    # ---------------------------------------------------------------- E03 -----
    single = sheet(
        "Who paid",
        seclabel("Payer", first=True)
        + card(nav_row("One person paid", "", chev=False,
                       lead='<span class="tick on"><svg viewBox="0 0 22 22">'
                            '<circle cx="11" cy="11" r="10" class="r"/>'
                            '<path d="M6 11.4 9.6 15 16 7.8" class="k"/></svg></span>')
               + nav_row("Several people paid", "", chev=False,
                         lead=tick(False)))
        + seclabel("Who")
        + listcard([
            select_row("AR", "Alina Rehman (you)", "", False, tone=6, box=False),
            select_row("JD", "John Doe", "", True, tone=2, box=False),
            select_row("SK", "Sam Kessler", "", False, tone=1, box=False),
            select_row("PN", "Priya Nair", "", False, tone=3, box=False),
            select_row("MK", "Maya Khan", "", False, tone=4, box=False),
        ]),
        '<div class="btn">Done</div>', trail="")

    multi_ok = sheet(
        "Who paid",
        seclabel("Payer", first=True)
        + card(nav_row("One person paid", "", chev=False, lead=tick(False))
               + nav_row("Several people paid", "", chev=False, lead=tick(True)))
        + seclabel("Paid amounts", right="USD")
        + listcard([
            alloc_row("AR", "Alina Rehman (you)", "Paid", "90.00", tone=6),
            alloc_row("JD", "John Doe", "Paid", "150.00", tone=2),
            alloc_row("SK", "Sam Kessler", "Paid", "0.00", tone=1, on=False, muted=True),
            running("Paid of 240.00 total", "240.00 · balanced"),
        ]),
        '<div class="btn">Done</div>')

    multi_bad = sheet(
        "Who paid",
        seclabel("Payer", first=True)
        + card(nav_row("One person paid", "", chev=False, lead=tick(False))
               + nav_row("Several people paid", "", chev=False, lead=tick(True)))
        + seclabel("Paid amounts", right="USD")
        + listcard([
            alloc_row("AR", "Alina Rehman (you)", "Paid", "90.00", tone=6),
            alloc_row("JD", "John Doe", "Paid", "100.00", tone=2),
            alloc_row("SK", "Sam Kessler", "Paid", "0.00", tone=1, on=False, muted=True),
            running("Still to account for", "50.00", kind="bad"),
        ]),
        '<div class="btn off">Done</div>',
        reason="50.00 of the 240.00 total is unaccounted for.")

    write("18-configure-payers.html", "18", "Configure payers", "E03",
          "Every amount row is labelled <b>Paid</b>. The word is printed on the row rather than implied "
          "by which sheet you opened, because Paid and Owes are the two numbers in this product that "
          "must never be confusable. The running line compares against the total in words.",
          [
              frame("One payer", " The common case stays a single tap. Choosing a payer does not "
                                 "require entering an amount.", phone(single, cls="sm")),
              frame("Several payers, balanced", " Exact amounts per contributor, and the running line "
                                                "says <em>balanced</em> rather than showing 0.00.",
                    phone(multi_ok, cls="sm")),
              frame("Several payers, short", " Unaccounted-for money is named in words and Done is held. "
                                             "Nothing is auto-filled on the user's behalf.",
                    phone(multi_bad, cls="sm")),
          ])

    # ---------------------------------------------------- E04 / E05 / E06 -----
    SEG = ('<div style="padding:12px 16px 4px"><div class="seg">'
           '<span class="sg {a}">Equally</span><span class="sg {b}">Exact amounts</span>'
           '</div></div>')

    equal = sheet(
        "Split",
        SEG.format(a="on", b="")
        + seclabel("Who is included", right="USD")
        + listcard([
            alloc_row("AR", "Alina Rehman (you)", "Owes", "48.00", tone=6),
            alloc_row("JD", "John Doe", "Owes", "48.00", tone=2),
            alloc_row("SK", "Sam Kessler", "Owes", "48.00", tone=1),
            alloc_row("PN", "Priya Nair", "Owes", "48.00", tone=3),
            alloc_row("MK", "Maya Khan", "Owes", "48.00", tone=4),
            running("Allocated of 240.00 total", "240.00 · balanced"),
        ]),
        '<div class="btn">Done</div>')

    excluded = sheet(
        "Split",
        SEG.format(a="on", b="")
        + seclabel("Who is included", right="USD")
        + listcard([
            alloc_row("AR", "Alina Rehman (you)", "Owes", "60.00", tone=6),
            alloc_row("JD", "John Doe", "Owes", "60.00", tone=2),
            alloc_row("SK", "Sam Kessler", "Owes", "60.00", tone=1),
            alloc_row("PN", "Priya Nair", "Owes", "60.00", tone=3),
            alloc_row("MK", "Maya Khan", "Not included", "—", tone=4, on=False,
                      muted=True, sub="Still a member of Winter Trip"),
            running("Allocated of 240.00 total", "240.00 · balanced"),
        ]),
        '<div class="btn">Done</div>')

    remainder = sheet(
        "Split",
        SEG.format(a="on", b="")
        + banner("100.00 does not divide by 3",
                 "One person owes 33.34 and two owe 33.33 — Hissab assigns extra "
                 "minor units in ascending account-ID order, so the same split always "
                 "produces the same result.")
        + seclabel("Who is included", right="USD")
        + listcard([
            alloc_row("AR", "Alina Rehman (you)", "Owes", "33.34", tone=6,
                      sub="Includes 1 extra cent · first in the fixed order"),
            alloc_row("JD", "John Doe", "Owes", "33.33", tone=2),
            alloc_row("SK", "Sam Kessler", "Owes", "33.33", tone=1),
            running("Allocated of 100.00 total", "100.00 · balanced"),
        ]),
        '<div class="btn">Done</div>')

    exact_left = sheet(
        "Split",
        SEG.format(a="", b="on")
        + seclabel("Exact shares", right="USD")
        + listcard([
            alloc_row("AR", "Alina Rehman (you)", "Owes", "80.00", tone=6),
            alloc_row("JD", "John Doe", "Owes", "80.00", tone=2),
            alloc_row("SK", "Sam Kessler", "Owes", "40.00", tone=1),
            running("Left to assign", "40.00", kind="bad"),
        ]),
        '<div class="btn off">Done</div>',
        reason="40.00 of the 240.00 total is not assigned to anyone.")

    write("19-configure-split.html", "19", "Configure split", "E04 · E05 · E06",
          "Equal and Exact are the only two methods, so a segmented control is the whole vocabulary — "
          "no hidden third mode. Rows are labelled <b>Owes</b>. Exclusion is stated as words on the "
          "row, never as a blank amount, and the equal-split remainder names who receives each extra "
          "minor unit and why.",
          [
              frame("Equal", " Divides exactly, so there is nothing to explain. The running line still "
                             "shows the identity holding.", phone(equal, cls="sm")),
              frame("Someone excluded", " <em>Not included</em> in words, with a reminder that "
                                        "exclusion from one expense is not removal from the group.",
                    phone(excluded, cls="sm")),
              frame("Equal with remainder", " 100.00 over 3. The rule is stated and the recipients are "
                                            "named on their own rows, so the cent is never a mystery.",
                    phone(remainder, cls="sm")),
              frame("Exact, under-assigned", " Says how much is unassigned rather than silently "
                                             "distributing it. Done is held until the identity holds.",
                    phone(exact_left, cls="sm")),
          ])

    # ---------------------------------------------------- E02 / E07 / E16 -----
    ctx_pick = sheet(
        "Add expense to",
        search("", "Search friends and groups")
        + seclabel("Groups", first=True)
        + listcard([
            select_row("WT", "Winter Trip", "5 members · USD", True, tone=1, box=False),
            select_row("F3", "Flat 3B", "3 members · USD", False, tone=3, box=False),
            select_row("LT", "Lahore trip", "4 members · PKR and USD", False, tone=4, box=False),
        ])
        + seclabel("Friends")
        + listcard([
            select_row("JD", "John Doe", "Direct expense · no group", False, tone=2, box=False),
            select_row("PN", "Priya Nair", "Direct expense · no group", False, tone=3, box=False),
        ])
        + '<p class="t-cap c-sec" style="margin:12px 20px">A direct expense is between the two of you '
        'only. Nobody else can see it, even if you share a group.</p>',
        '<div class="btn">Continue with Winter Trip</div>', trail="")

    cur_pick = sheet(
        "Currency",
        search("", "Search supported currencies")
        + seclabel("Supported currencies", first=True)
        + listcard([
            select_row(None, "US Dollar", "USD", True, box=False),
            select_row(None, "Pakistani Rupee", "PKR", False, box=False),
            select_row(None, "Pound Sterling", "GBP", False, box=False),
            select_row(None, "Euro", "EUR", False, box=False),
            select_row(None, "UAE Dirham", "AED", False, box=False),
            select_row(None, "Saudi Riyal", "SAR", False, box=False),
        ])
        + '<p class="t-cap c-sec" style="margin:12px 20px">Changing the currency clears the payer and '
        'split amounts, because minor units differ between currencies.</p>',
        '<div class="btn">Use US Dollar</div>', trail="")

    def cat(name, on=False):
        return select_row(None, name, "", on, box=False)

    cat_pick = sheet(
        "Category",
        search("", "Search categories")
        + seclabel("Shared-expense categories", first=True)
        + listcard([cat("Food & Drink"), cat("Groceries"), cat("Transport"),
                    cat("Accommodation"), cat("Utilities"), cat("Entertainment", True),
                    cat("Shopping"), cat("Healthcare"), cat("Other")])
        + '<p class="t-cap c-sec" style="margin:12px 20px">Shared expenses use this fixed '
        'category list. Categories cannot be added or renamed.</p>',
        '<div class="btn">Done</div>', trail="")

    write("20-expense-pickers.html", "20", "Ledger, currency and category pickers",
          "E02 · E07 · E16",
          "Three selection sheets that share one shape: search, a shortlist of likely answers, then the "
          "full list. Each one states the consequence of the choice before it is made — a direct expense "
          "is private, a currency change clears amounts, income categories are not offered.",
          [
              frame("Choose ledger", " Groups and friends in one searchable sheet, with the direct-"
                                     "expense privacy rule spelled out rather than assumed.",
                    phone(over(ctx_pick))),
              frame("Currency", " Default and recent first, because the long list is almost never the "
                                "answer. The destructive side effect is stated in the sheet.",
                    phone(over(cur_pick))),
              frame("Category", " Expense-compatible categories only, and it says why the income ones "
                                "are missing.", phone(over(cat_pick))),
          ])

    # ---------------------------------------------------------- E08 / E09 -----
    src = (statusbar()
           + nav(title="Add expense", lead=CANCEL,
                 trail='<span class="act semi">Save</span>')
           + '<div class="scroll">'
           + ctx_marker("shared", "Winter Trip")
           + card(amount_editor("USD", "240.00", caret=False))
           + seclabel("Receipt") + card(nav_row("Attach a receipt"))
           + '</div>'
           + '<div class="overlay"></div>'
           + '<div class="actionsheet">'
           '<div class="grp"><div class="hd">A receipt is stored with the expense and '
           'everyone in Winter Trip can see it.</div>'
           '<div class="it">Take a photo</div><div class="it">Choose from library</div></div>'
           '<div class="grp"><div class="it cancel">Continue without a receipt</div></div>'
           '</div>' + homebar())

    denied = (statusbar() + nav(title="Receipt", back="")
              + '<div class="scroll">'
              + banner("Camera access is off",
                       "hissab asks for the camera only when you attach a receipt. "
                       "You can still choose an existing photo, or save the expense "
                       "without one.", action="Settings", kind="w")
              + '<div style="padding:0 16px"><div class="thumb">'
              '<span class="t-supp">No preview</span></div></div>'
              + '<div style="display:flex;gap:8px;padding:16px">'
              '<span class="btn out" style="flex:1">Choose from library</span></div>'
              + '<p class="t-cap c-sec" style="margin:0 20px">A receipt is optional. Nothing about the '
              'expense depends on it.</p>'
              + '</div>'
              + footer('<div class="btn sec">Continue without a receipt</div>')
              + homebar())

    def rcpt(state, prog=None, bnr="", foot=None):
        pr = (f'<div style="padding:12px 16px 0"><div class="prog"><i style="width:{prog}%"></i></div>'
              f'<div class="t-cap c-sec" style="margin-top:6px">{state}</div></div>'
              if prog is not None else
              f'<div style="padding:12px 16px 0"><div class="t-cap c-sec">{state}</div></div>')
        return (statusbar() + nav(title="Receipt", back="") + '<div class="scroll">' + bnr
                + '<div style="padding:0 16px"><div class="thumb">'
                '<span class="t-supp">receipt.jpg · 2.4 MB</span></div></div>' + pr
                + '</div>' + (foot or footer('<div class="btn">Done</div>')) + homebar())

    uploading = rcpt("Uploading · 62%", prog=62,
                     foot=footer('<div class="btn off">Done</div>',
                                 "The expense can be saved now; the receipt "
                                 "finishes uploading in the background.",
                                 kind="warn"))

    failed = rcpt("Upload failed", prog=0,
                  bnr=banner("Receipt did not upload",
                             "The expense itself is unaffected — it saved without "
                             "the receipt. Retry when you have a better connection.",
                             action="Retry", kind="e"),
                  foot=footer('<div style="display:flex;gap:8px">'
                              '<span class="btn out" style="flex:1">Remove</span>'
                              '<span class="btn" style="flex:1">Retry</span></div>'))

    done = rcpt("Attached · Jul 28, 2026",
                foot=footer('<div style="display:flex;gap:8px">'
                            '<span class="btn dstr-out" style="flex:1">Remove</span>'
                            '<span class="btn out" style="flex:1">Replace</span></div>'))

    write("21-receipt.html", "21", "Receipt source and upload", "E08 · E09",
          "The permission is requested at the moment it is needed and the sheet says who will be able "
          "to see the image. Every failure path here is careful to separate the receipt from the money: "
          "a failed upload never puts the expense itself in doubt.",
          [
              frame("Source", " Just-in-time rationale in the sheet header, and the third option is a "
                              "real answer rather than a bare Cancel.", phone(src)),
              frame("Permission denied", " Offers the alternative instead of a dead end, and states "
                                         "that the receipt is optional.", phone(denied)),
              frame("Uploading", " Saving is not blocked on the upload; the footer says so.",
                    phone(uploading)),
              frame("Failed", " Names what is <em>not</em> affected. Retry and Remove are both offered "
                              "so the user is never stuck.", phone(failed)),
              frame("Attached", " Replace and Remove, with Remove marked destructive.", phone(done)),
          ])

    # ---------------------------------------------------- E10 / E13 / E14 -----
    def detail_body(banner_html="", deleted=False):
        head = (f'<div style="padding:4px 16px 16px">'
                f'<div class="t-cap c-sec">Winter Trip · Entertainment</div>'
                f'<div class="t-title" style="margin-top:2px">Ski passes</div>'
                f'<span class="mt big mono" style="margin-top:6px">'
                f'<span class="iso">USD</span><span class="v">720.00</span></span>'
                f'<div class="t-cap c-sec" style="margin-top:6px">Jul 28, 2026 · '
                f'added by Alina Rehman</div></div>')
        if deleted:
            head = (f'<div style="padding:4px 16px 16px">'
                f'<div class="t-cap c-sec">Winter Trip · Entertainment</div>'
                    f'<div class="t-title c-sec" style="margin-top:2px;'
                    f'text-decoration:line-through">Ski passes</div>'
                    f'<span class="mt big mono c-sec" style="margin-top:6px">'
                    f'<span class="iso">USD</span><span class="v">720.00</span></span>'
                    f'<div style="margin-top:8px"><span class="badge b-neg">Deleted</span></div></div>')
        payers = listcard([
            alloc_row("JD", "John Doe", "Paid", "USD 720.00", tone=2, check=False),
        ])
        owes = listcard([
            alloc_row("AR", "Alina Rehman (you)", "Owes", "USD 144.00", tone=6, check=False),
            alloc_row("JD", "John Doe", "Owes", "USD 144.00", tone=2, check=False),
            alloc_row("SK", "Sam Kessler", "Owes", "USD 144.00", tone=1, check=False),
            alloc_row("PN", "Priya Nair", "Owes", "USD 144.00", tone=3, check=False),
            alloc_row("MK", "Maya Khan", "Owes", "USD 144.00", tone=4, check=False),
        ])
        eff = card('<div class="row"><span class="grow"><span class="t-body med">Your balance with '
                   'John Doe</span><span class="t-cap c-sec" style="display:block">Because of this '
                   'expense</span></span><span class="val">'
                   + ('<span class="t-cap c-sec" style="display:block">Reversed</span>'
                      '<span class="t-body semi mono c-sec">USD 144.00</span>' if deleted else
                      '<span class="t-cap c-sec" style="display:block">You owe</span>'
                      '<span class="t-body semi mono c-neg">USD 144.00</span>')
                   + '</span></div>')
        audit = listcard([
            nav_row("Version", "3", chev=False),
            nav_row("Created", "Jul 28, 2026 · Alina Rehman", chev=False),
            nav_row("Last edited", "Aug 1, 2026 · Alina Rehman", chev=False),
        ] + ([nav_row("Deleted", "Aug 3, 2026 · Alina Rehman", chev=False)] if deleted else []))
        return (banner_html + head
                + seclabel("Who paid", right="1 person", first=True) + payers
                + seclabel("Who owes", right="Equally · 5 people") + owes
                + seclabel("Effect on you") + eff
                + seclabel("Receipt")
                + card('<div class="row"><span class="thumb sm"></span>'
                       '<span class="grow"><span class="t-body">receipt.jpg</span>'
                       '<span class="t-cap c-sec" style="display:block">2.4 MB · attached by John Doe'
                       '</span></span>' + IC["chev"] + '</div>')
                + seclabel("History") + audit)

    detail = (statusbar() + nav(back="Winter Trip",
                                trail='<span class="act semi">Edit</span>')
              + f'<div class="scroll">{detail_body()}'
              + '<div style="padding:8px 16px 0"><div class="btn dstr-out">Delete expense</div></div>'
              + '</div>' + homebar())

    updated = (statusbar() + nav(back="Winter Trip",
                                 trail='<span class="act semi">Edit</span>')
               + '<div class="scroll">'
               + detail_body(banner_html=banner(
                   "Updated elsewhere",
                   "A newer version was saved from another one of your sessions. "
                   "You are looking at version 3; version 4 is available.",
                   action="Refresh"))
               + '</div>' + homebar())

    deleted_view = (statusbar() + nav(back="Winter Trip")
                    + '<div class="scroll">'
                    + detail_body(banner_html=banner(
                        "This expense was deleted",
                        "The balances it created were reversed on Aug 3, 2026. "
                        "The record is kept so the reversal can be audited, and "
                        "it cannot be restored — add a new expense instead.",
                        kind="w"), deleted=True)
                    + '</div>' + homebar())

    detail_scaled = (statusbar() + nav(back="Winter Trip",
                                       trail='<span class="act semi">Edit</span>')
                     + '<div class="scroll">'
                     + '<div style="padding:4px 16px 16px">'
                     '<div class="t-cap c-sec">Winter Trip · Entertainment</div>'
                     '<div class="t-title" style="margin-top:2px">Ski passes</div>'
                     '<span class="mt big mono" style="margin-top:6px">'
                     '<span class="iso">USD</span><span class="v">720.00</span></span></div>'
                     + seclabel("Who owes", right="Equally · 5 people", first=True)
                     + listcard([
                         alloc_row("AR", "Alina Rehman (you)", "Owes", "USD 144.00",
                                   tone=6, check=False),
                         alloc_row("JD", "John Doe", "Owes", "USD 144.00",
                                   tone=2, check=False),
                     ])
                     + '</div>' + homebar())

    write("22-expense-detail.html", "22", "Expense detail", "E10 · E13 · E14",
          "The detail archetype. Paid and Owes are separate labelled sections rather than one column "
          "with a sign, and the section labels carry the method — <em>Equally · 5 people</em> — so the "
          "split is legible without opening the editor. The deleted state is a tombstone with no "
          "Restore, because reversal is already a permanent part of the history.",
          [
              frame("Detail", " Paid, Owes, the effect on your own balance, receipt, then version "
                              "history. Delete sits below everything it would undo.", phone(detail)),
              frame("Updated elsewhere", " <em>Nonblocking.</em> Names the actor and both version "
                                         "numbers, and offers Refresh rather than reloading under the "
                                         "user's hands.", phone(updated)),
              frame("Deleted", " Tombstone. Reversal date, no Restore, and the alternative is named.",
                    phone(deleted_view)),
              frame("200% text", " <em>Scaling archetype 3 of 3 — detail.</em> The Paid/Owes word and "
                                 "its amount stay in one right-hand column and stack instead of "
                                 "clipping.", phone(detail_scaled, cls="x2 tall")),
          ])

    # ---------------------------------------------------- E11 / E12 / E15 -----
    edit = (statusbar()
            + nav(title="Edit expense", lead=CANCEL,
                  trail='<span class="act semi">Save</span>')
            + '<div class="scroll">'
            + ctx_marker("shared", "Winter Trip")
            + card(amount_editor("USD", "840.00", label="Amount", caret=False))
            + card(kv_row("Description", "Ski passes and lift hire")
                   + nav_row("Currency", "USD") + nav_row("Date", "Jul 28, 2026")
                   + nav_row("Category", "Entertainment"))
            + seclabel("Who paid and who owes")
            + card(nav_row("Paid by", "John Doe") + nav_row("Split", "Equally · 5 people"))
            + recon("840.00", "840.00", "840.00", "USD",
                    out=("good", "Balanced. Your share rises from 144.00 to 168.00."))
            + seclabel("What changes", right="Version 3 → 4")
            + card('<div class="facts" style="padding:12px 16px">'
                   '<div class="f"><span class="k t-body">Amount</span>'
                   '<span class="t-body mono">720.00 → 840.00</span></div>'
                   '<div class="f"><span class="k t-body">Description</span>'
                   '<span class="t-body" style="text-align:right">Ski passes → Ski passes '
                   'and lift hire</span></div>'
                   '<div class="f"><span class="k t-body">Your share</span>'
                   '<span class="t-body mono c-neg">144.00 → 168.00</span></div>'
                   '<div class="f"><span class="k t-body">Everyone else</span>'
                   '<span class="t-body">4 shares change</span></div>'
                   '</div>')
            + '<p class="t-cap c-sec" style="margin:-4px 20px 0">Everyone in Winter Trip sees this '
            'edit in Activity, with the previous version kept.</p>'
            + '</div>'
            + footer('<div class="btn">Save changes</div>') + homebar())

    del_review = (statusbar() + nav(back="Winter Trip")
                  + '<div class="scroll">' + detail_body() + '</div>'
                  + '<div class="overlay"></div>'
                  + '<div class="dialog stackacts"><div class="dbody">'
                  '<h4>Delete “Ski passes”?</h4>'
                  '<p>The balances this expense created are reversed. The record itself is kept '
                  'and cannot be restored.</p>'
                  '<div class="facts">'
                  '<div class="f"><span class="k t-cap">Expense</span>'
                  '<span class="t-cap semi mono">USD 720.00</span></div>'
                  '<div class="f"><span class="k t-cap">Your balance with John Doe</span>'
                  '<span class="t-cap semi mono">You owe 240.00 → 96.00</span></div>'
                  '<div class="f"><span class="k t-cap">Other members affected</span>'
                  '<span class="t-cap semi">4 people</span></div>'
                  '<div class="f"><span class="k t-cap">Receipt</span>'
                  '<span class="t-cap semi">Deleted with the expense</span></div>'
                  '</div></div>'
                  '<div class="dacts"><span class="d">Delete and reverse balances</span>'
                  '<span>Cancel</span></div></div>' + homebar())

    conflict = (statusbar() + nav(title="Version conflict", lead=CANCEL)
                + '<div class="scroll">'
                + banner("A newer version already exists",
                         "Version 4 was saved from another one of your sessions while you were editing "
                         "version 3. Your changes were not sent and are still "
                         "here.", kind="w")
                + seclabel("Current version, authoritative", right="Version 4", first=True)
                + card('<div class="facts" style="padding:12px 16px">'
                       '<div class="f"><span class="k t-body">Amount</span>'
                       '<span class="t-body mono">USD 900.00</span></div>'
                       '<div class="f"><span class="k t-body">Description</span>'
                       '<span class="t-body">Ski passes and insurance</span></div>'
                       '<div class="f"><span class="k t-body">Saved</span>'
                       '<span class="t-body">Aug 3, 2026 · 9:03 AM</span></div>'
                       '</div>')
                + seclabel("Your draft, kept on this device")
                + card('<div class="facts" style="padding:12px 16px">'
                       '<div class="f"><span class="k t-body">Amount</span>'
                       '<span class="t-body mono">USD 840.00</span></div>'
                       '<div class="f"><span class="k t-body">Description</span>'
                       '<span class="t-body">Ski passes and lift hire</span></div>'
                       '</div>')
                + '<p class="t-cap c-sec" style="margin:-4px 20px 0">hissab will not merge these '
                'automatically. Money is not safe to guess at, so reapplying your change is a '
                'deliberate act.</p>'
                + '</div>'
                + footer('<div style="display:flex;flex-direction:column;gap:8px">'
                         '<span class="btn">Review version 4</span>'
                         '<span class="btn out">Reapply my change to version 4</span>'
                         '<span class="btn sec">Discard my draft</span></div>')
                + homebar())

    write("23-edit-expense.html", "23", "Edit, delete and version conflict",
          "E11 · E12 · E15",
          "Editing shared money is a reviewed act, not a form submission. The editor shows a "
          "before → after list including the effect on the user's own share, deletion states the exact "
          "balance change it will cause, and a conflict is never merged automatically.",
          [
              frame("Edit with change review", " Before → after for every changed field, and the "
                                               "reconciliation panel restates the user's own share in "
                                               "both directions.", phone(edit)),
              frame("Delete review", " Four consequences as facts, including the resulting balance. The "
                                     "destructive action is named after what it does.",
                    phone(del_review)),
              frame("Version conflict", " Both versions side by side, three explicit exits, and a "
                                        "sentence saying why nothing was merged.", phone(conflict)),
          ])
