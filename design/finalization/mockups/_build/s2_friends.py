"""§2 Friends and connections — F01, F02, F03, F04, F05, F06, F07, F08."""

from lib import statusbar, homebar, nav, largetitle, tabbar, frame, phone, write, money, avatar, IC, tick
from comp import (seclabel, card, listcard, ledger_row, nav_row, person_row, select_row,
                  search, banner, empty, skeleton_rows, stale_strip, GLYPH, kv_row,
                  expense_row)

PLUS = ('<span class="act"><svg viewBox="0 0 22 22" width="22" height="22" style="display:block">'
        '<path d="M11 3.6v14.8M3.6 11h14.8" stroke="currentColor" stroke-width="2.1" '
        'stroke-linecap="round" fill="none"/></svg></span>')

GEAR = ('<span class="act"><svg viewBox="0 0 22 22" width="21" height="21" style="display:block">'
        '<circle cx="11" cy="11" r="3.1" stroke="currentColor" stroke-width="1.8" fill="none"/>'
        '<path d="M11 1.8v2.4M11 17.8v2.4M1.8 11h2.4M17.8 11h2.4M4.5 4.5l1.7 1.7M15.8 15.8l1.7 1.7'
        'M4.5 17.5l1.7-1.7M15.8 6.2l1.7-1.7" stroke="currentColor" stroke-width="1.8" '
        'stroke-linecap="round" fill="none"/></svg></span>')

USD_ROWS = [
    ledger_row("JD", "John Doe",
               [("Winter Trip", "you owe 240.00"),
                ("Brunch club", "owes you 40.00"),
                ("Direct", "owes you 12.50")],
               "You owe", "187.50", "USD", tone=2),
    ledger_row("PN", "Priya Nair", [("Flat 3B", "owes you 64.00")],
               "Owes you", "64.00", "USD", tone=3),
    ledger_row("SK", "Sam Kessler", [], "", "", "USD", tone=1, settled=True),
]

PKR_ROWS = [
    ledger_row("OF", "Omar Farooq", [("Lahore trip", "you owe 12,500")],
               "You owe", "12,500", "PKR", tone=4),
    ledger_row("LT", "Lena Toure", [("Direct", "owes you 3,200")],
               "Owes you", "3,200", "PKR", tone=6),
]

PENDING = listcard([nav_row(
    "Connection requests", "",
    lead='<span class="avatar a7" style="background:var(--brandSubtle);color:var(--brand)">2</span>',
    sub=None)])


def build():
    # ---------------------------------------------------------------- F01 -----
    def friends(body, tail=""):
        return (statusbar() + largetitle("Friends", trail=PLUS) + search() + tail
                + f'<div class="scroll">{body}</div>' + tabbar("friends") + homebar())

    populated = friends(
        PENDING
        + seclabel("US Dollar · USD", first=True) + listcard(USD_ROWS)
        + seclabel("Pakistani Rupee · PKR") + listcard(PKR_ROWS)
    )

    first_use = friends(empty(
        GLYPH["people"], "No connections yet",
        "Add someone you share expenses with. You can also add expenses inside a group "
        "without connecting first.",
        "Add a connection"))

    loading = friends(
        seclabel("US Dollar · USD", first=True) + listcard(skeleton_rows(3))
        + seclabel("Pakistani Rupee · PKR") + listcard(skeleton_rows(2)))

    offline = friends(
        PENDING
        + seclabel("US Dollar · USD", first=True) + listcard(USD_ROWS)
        + seclabel("Pakistani Rupee · PKR") + listcard(PKR_ROWS),
        tail=stale_strip("Offline · showing saved copy from 9:02 AM"))

    scaled = (statusbar() + largetitle("Friends", trail=PLUS) + search()
              + '<div class="scroll">'
              + seclabel("US Dollar · USD", first=True)
              + listcard(USD_ROWS[:2])
              + '</div>' + tabbar("friends") + homebar())

    write("05-friends.html", "05", "Friends", "F01",
          "The list archetype, and the surface that decided L1. Every balance is scoped to a currency "
          "card — USD and PKR structurally cannot share one, which is what enforces the never-combine rule. "
          "Breakdown lines carry no ISO code because the card already states it; that is what stopped "
          "&ldquo;Winter Trip&rdquo; truncating to &ldquo;Wi…&rdquo;.",
          [
              frame("Populated", " Two currencies, a three-ledger person, a settled person and a "
                                 "pending-request entry. John Doe nets to <em>you owe 187.50</em> across "
                                 "three ledgers that point in both directions.",
                    phone(populated)),
              frame("First use", " One action, and it names the alternative so the empty state is not a "
                                 "dead end.", phone(first_use)),
              frame("Loading", " Skeleton matches final row geometry — avatar, two text lines, money "
                               "right — so nothing jumps when data lands.", phone(loading)),
              frame("Offline", " Cached read with the saved-at time. Reading offline is allowed; "
                               "mutating is not.", phone(offline)),
              frame("200% text", " <em>Scaling archetype 1 of 3 — lists.</em> Type doubles, padding does "
                                 "not. Rows grow instead of clipping and the money still never truncates.",
                    phone(scaled, cls="x2 tall")),
          ])

    # ---------------------------------------------------------------- F02 -----
    def addconn(body, foot=""):
        return (statusbar()
                + nav(title="Add connection",
                      lead='<span class="act">Cancel</span>',
                      trail='<span class="act off semi">Send</span>' if not foot else foot)
                + body + homebar())

    hint = ('<div class="scroll">'
            + search("", "Email address")
            + '<p class="t-cap c-sec" style="margin:4px 20px">Search by the exact email address on '
            'their account. hissab does not list or suggest people you have no connection with.</p>'
            + empty(GLYPH["search"], "Search for someone",
                    "You need the email address they signed up with.", "Learn more")
            .replace('<div class="btn" style="margin:0 8px">Learn more</div>', '')
            + '</div>')

    results = ('<div class="scroll">' + search("priya.nair@example.com")
               + seclabel("Result", first=True)
               + listcard([select_row("PN", "Priya Nair", "Already connected · Flat 3B", False,
                                      tone=3, box=False)
                          .replace(tick(False, box=False),
                                   '<span class="badge b-pos">Connected</span>')])
               + '</div>')

    selected = ('<div class="scroll">' + search("omar.f@example.com")
                + seclabel("Result", first=True)
                + listcard([select_row("OF", "Omar Farooq", "Not connected", True, tone=4, box=False)])
                + '<p class="t-cap c-sec" style="margin:12px 20px">Omar will see your display name and '
                'be able to accept or decline. Nothing is shared until they accept.</p>'
                + '</div>')

    noresult = ('<div class="scroll">' + search("nobody@example.com")
                + empty(GLYPH["search"], "No account for that email",
                        "Check the spelling, or ask them to create an account first. "
                        "We cannot confirm whether an email is registered.",
                        "Try another email")
                + '</div>')

    sent = ('<div class="scroll"><div class="success">'
            '<div class="mark"><svg viewBox="0 0 24 24"><path d="M3 12.5 9 18.5 21 5.5"/></svg></div>'
            '<div class="t-headline">Request sent</div>'
            '<p class="t-supp c-sec" style="margin:8px 0 0">Omar Farooq will appear under '
            'Connection requests until they respond. You can cancel it from there.</p>'
            '</div><div style="padding:8px 16px"><div class="btn sec">Done</div></div></div>')

    write("06-add-connection.html", "06", "Find and add connection", "F02",
          "Exact-email lookup only. Raw user IDs are never shown and there is no directory or "
          "suggestion list, so the screen cannot be used to enumerate accounts.",
          [
              frame("Before search", " States the rule up front rather than after a failed query.",
                    phone(addconn(hint))),
              frame("Already connected", " The result is shown but not selectable, so the user learns "
                                         "why instead of sending a request that would fail.",
                    phone(addconn(results))),
              frame("Selectable result", " Says exactly what the other person will see before the "
                                         "request is sent.",
                    phone(addconn(selected, foot='<span class="act semi">Send</span>'))),
              frame("No result", " Non-enumerating: the wording never confirms whether the email "
                                 "exists.", phone(addconn(noresult))),
              frame("Sent", " Names where the pending request now lives and that it can be cancelled.",
                    phone(addconn(sent))),
          ],
          prov="search-by-identifier data contract is not settled")

    # ----------------------------------------------------------- F03 / F04 ----
    def req_row(initials, name, sub, actions, tone=1):
        return (f'<div class="row top">{avatar(initials, tone)}'
                f'<span class="grow"><span class="t-body med">{name}</span>'
                f'<span class="t-cap c-sec" style="display:block;margin-top:1px">{sub}</span>'
                f'<div style="display:flex;gap:8px;margin-top:10px">{actions}</div></span></div>')

    incoming = listcard([
        req_row("MK", "Maya Khan", "Sent 2 hours ago",
                '<span class="btn sm">Accept</span><span class="btn sm out">Decline</span>', tone=6),
        req_row("TA", "Tariq Ahmed", "Sent yesterday",
                '<span class="btn sm">Accept</span><span class="btn sm out">Decline</span>', tone=8),
    ])
    outgoing = listcard([
        person_row("OF", "Omar Farooq", "Sent 5 minutes ago",
                   trail='<span class="btn sm out">Cancel</span>', tone=4),
    ])

    def reqscreen(body):
        return (statusbar() + nav(title="Connection requests", back="Friends")
                + f'<div class="scroll">{body}</div>' + homebar())

    pending_view = reqscreen(
        seclabel("Incoming · 2", first=True) + incoming
        + seclabel("Outgoing · 1") + outgoing)

    resolved_view = reqscreen(
        seclabel("Incoming", first=True)
        + listcard([
            person_row("MK", "Maya Khan", "Accepted · you are now connected",
                       trail='<span class="badge b-pos">Accepted</span>', tone=6),
            person_row("TA", "Tariq Ahmed", "Declined yesterday · they were not told who declined",
                       trail='<span class="badge">Declined</span>', tone=8),
        ])
        + seclabel("Outgoing")
        + listcard([
            person_row("OF", "Omar Farooq", "You cancelled this request",
                       trail='<span class="badge">Cancelled</span>', tone=4),
        ])
        + '<p class="t-cap c-sec" style="margin:4px 20px">Resolved requests disappear after seven days.</p>')

    empty_view = reqscreen(empty(
        GLYPH["people"], "No requests",
        "Incoming and outgoing connection requests appear here.", "Add a connection"))

    write("07-connection-requests.html", "07", "Connection requests", "F03 · F04",
          "Incoming and outgoing in one screen, split by section rather than by tab — the counts are "
          "small and a segmented control would hide half the information behind a tap. Accept and "
          "Decline sit on the row they act on.",
          [
              frame("Pending", " Actions are on the row, full-width enough to clear 44 pt. Outgoing "
                               "gets Cancel only.", phone(pending_view)),
              frame("Resolved", " Terminal states stay visible briefly so the outcome is legible; the "
                                "declined row is careful not to imply the other person was notified.",
                    phone(resolved_view)),
              frame("Empty", " Reachable from the Friends row even when the count is zero.",
                    phone(empty_view)),
          ])

    # ---------------------------------------------------------------- F05 -----
    def ledger_screen(name, initials, tone, statement, iso, amount, direction,
                      ledgers, recent, settled=False):
        if settled:
            bal = ('<div class="t-headline c-sec" style="font-weight:500">Settled</div>'
                   '<div class="t-supp c-sec" style="margin-top:2px">Nothing outstanding in any currency.</div>')
        else:
            col = "c-neg" if direction == "You owe" else "c-pos"
            bal = (f'<div class="t-supp c-sec">{statement}</div>'
                   f'<span class="mt big mono {col}" style="margin-top:2px">'
                   f'<span class="iso">{iso}</span><span class="v">{amount}</span></span>')
        rows = "".join(
            f'<div class="row"><span class="grow t-body">{n}</span>'
            f'<span class="val t-body mono {"c-neg" if d.startswith("you owe") else "c-pos"}">'
            f'{d}</span></div>' for n, d in ledgers)
        breakdown = (seclabel(f"{'US Dollar · USD' if iso == 'USD' else 'Pakistani Rupee · PKR'}",
                              right="Across 3 ledgers" if len(ledgers) > 1 else "")
                     + listcard([rows]) if ledgers else "")
        return (statusbar() + nav(back="Friends", trail=GEAR)
                + '<div class="scroll">'
                + f'<div style="padding:8px 16px 20px;display:flex;gap:14px;align-items:center">'
                + avatar(initials, tone, cls="xl")
                + f'<span><span class="t-title" style="display:block">{name}</span>'
                + '<span class="t-cap c-sec">Connected since June 2026</span></span></div>'
                + f'<div class="card"><div style="padding:16px">{bal}</div></div>'
                + '<div style="display:flex;gap:8px;padding:0 16px 4px">'
                + '<span class="btn" style="flex:1">Add expense</span>'
                + (f'<span class="btn sec" style="flex:1">Settle up</span>' if not settled else "")
                + '</div>'
                + ('<div style="display:flex;gap:8px;padding:8px 16px 0">'
                   '<span class="btn out" style="flex:1">Remind</span></div>' if direction == "Owes you" else "")
                + breakdown
                + seclabel("Recent") + listcard(recent)
                + '</div>' + homebar())

    recent_jd = [
        expense_row("Brunch", "Aug 3 · Winter Trip", "45.00", "USD",
                    sub="your share 15.00"),
        expense_row("Payment to John Doe", "Aug 1 · recorded by you", "60.00", "USD"),
        expense_row("Ski passes", "Jul 28 · Winter Trip", "720.00", "USD",
                    sub="your share 240.00"),
    ]

    owe_view = ledger_screen(
        "John Doe", "JD", 2, "You owe John Doe", "USD", "187.50", "You owe",
        [("Winter Trip", "you owe 240.00"), ("Brunch club", "owes you 40.00"),
         ("Direct", "owes you 12.50")], recent_jd)

    owed_view = ledger_screen(
        "Priya Nair", "PN", 3, "Priya Nair owes you", "USD", "64.00", "Owes you",
        [("Flat 3B", "owes you 64.00")],
        [expense_row("Groceries", "Aug 2 · Flat 3B", "128.00", "USD",
                     sub="your share 64.00")])

    settled_view = ledger_screen(
        "Sam Kessler", "SK", 1, "", "USD", "", "", [],
        [expense_row("Payment from Sam Kessler", "Aug 2 · recorded by Sam", "15.00", "USD"),
         expense_row("Brunch", "Aug 3 · Winter Trip", "45.00", "USD",
                     sub="your share 15.00")],
        settled=True)

    write("08-friend-ledger.html", "08", "Friend ledger", "F05",
          "The three relationship outcomes. The balance is a sentence with the amount under it, never a "
          "signed number — and the per-ledger breakdown shows how a net &ldquo;you owe&rdquo; can contain "
          "ledgers pointing the other way.",
          [
              frame("You owe", " Net 187.50 owed, built from one ledger owed and two owed to you. "
                               "Settle up is offered; Remind is not, because you are the debtor.",
                    phone(owe_view)),
              frame("Owes you", " Same layout, opposite direction, and Remind appears. Nothing about "
                                "the geometry changes with the sign.", phone(owed_view)),
              frame("Settled", " Says the word rather than showing 0.00, and drops Settle up. History "
                               "stays reachable.", phone(settled_view)),
          ])

    # ------------------------------------------------------ F06 / F07 / F08 ---
    settings_body = (
        '<div class="scroll">'
        + '<div style="padding:8px 16px 16px;display:flex;gap:14px;align-items:center">'
        + avatar("JD", 2, cls="lg")
        + '<span><span class="t-headline" style="display:block">John Doe</span>'
        '<span class="t-cap c-sec">Connected since June 2026</span></span></div>'
        + seclabel("Relationship", first=True)
        + card(kv_row("Shared ledgers", "3")
               + kv_row("Direct balance", "You owe USD 12.50", vcls="t-body mono c-neg")
               + kv_row("Connected", "June 14, 2026"))
        + '<p class="t-cap c-sec" style="margin:-4px 20px 0">Nicknames and removing a connection are '
        'not supported. Blocking is the only way to end a relationship.</p>'
        + seclabel("Safety")
        + card(f'<div class="row"><span class="grow t-body c-neg semi">Block John Doe</span>'
               f'{IC["chev"]}</div>')
        + '</div>')

    settings_view = statusbar() + nav(title="Friend settings", back="") + settings_body + homebar()

    block_dialog = (statusbar() + nav(title="Friend settings", back="") + settings_body
                    + '<div class="overlay"></div>'
                    + '<div class="dialog stackacts"><div class="dbody">'
                    '<h4>Block John Doe?</h4>'
                    '<p>Blocking is not a way to settle up. Balances and history are kept.</p>'
                    '<div class="facts">'
                    '<div class="f"><span class="k t-cap">Pending requests</span>'
                    '<span class="t-cap semi">Cancelled both ways</span></div>'
                    '<div class="f"><span class="k t-cap">Direct ledger</span>'
                    '<span class="t-cap semi">Archived, read-only</span></div>'
                    '<div class="f"><span class="k t-cap">Outstanding balance</span>'
                    '<span class="t-cap semi mono c-neg">You owe USD 12.50</span></div>'
                    '<div class="f"><span class="k t-cap">Shared groups</span>'
                    '<span class="t-cap semi">Unchanged · 3 ledgers</span></div>'
                    '</div></div>'
                    '<div class="dacts"><span class="d">Block and archive ledger</span>'
                    '<span>Cancel</span></div></div>' + homebar())

    blocked_view = (statusbar() + nav(title="Blocked people", back="")
                    + '<div class="scroll">'
                    + seclabel("Blocked · 2", first=True)
                    + listcard([
                        person_row("RS", "Rania Saeed", "Blocked Jul 12, 2026",
                                   trail='<span class="btn sm out">Unblock</span>', tone=5),
                        person_row("HB", "Hasan Bhatti", "Blocked Mar 2, 2026 · USD 40.00 archived",
                                   trail='<span class="btn sm out">Unblock</span>', tone=7),
                    ])
                    + '<p class="t-cap c-sec" style="margin:4px 20px">Unblocking restores the archived '
                    'direct ledger with its balance intact. It does not re-send any connection request.</p>'
                    + '</div>' + homebar())

    write("09-friend-safety.html", "09", "Friend safety, block, blocked list", "F06 · F07 · F08",
          "Blocking is destructive to the relationship but never to the money. The confirmation states "
          "the outstanding balance precisely so nobody blocks their way out of a debt by accident.",
          [
              frame("Friend settings", " Says plainly what is not supported, so the absence of Remove "
                                       "reads as a decision rather than a missing feature.",
                    phone(settings_view)),
              frame("Block confirmation", " Four consequences as facts, including the exact "
                                          "outstanding amount. Destructive action is labelled with what "
                                          "it does, not &ldquo;OK&rdquo;.", phone(block_dialog)),
              frame("Blocked people", " Unblock restores the archived ledger with its balance; the "
                                      "screen says so rather than leaving it to be discovered.",
                    phone(blocked_view)),
          ])
