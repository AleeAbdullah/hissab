"""§7 Personal finance — P01 … P09.

Personal entries are private. Shared expenses are not. Confusing the two is the
worst thing this product could do, so the ContextMarker on every personal
surface says "Only you can see this" in words — position in the tab bar is not
allowed to carry that meaning on its own.
"""

from lib import (statusbar, homebar, nav, largetitle, tabbar, frame, phone,
                 write, avatar, IC, tick)
from comp import (seclabel, card, listcard, nav_row, kv_row, person_row,
                  search, banner, empty, skeleton_rows, stale_strip, footer,
                  amount_editor, ctx_marker, expense_row, GLYPH)
from s4_expense import sheet, CANCEL
from s6_activity import FILTER
from s2_friends import PLUS


def summary(iso, income, spending, net, net_kind="pos"):
    """Income / Spending / Net for one currency. Net is a labelled word plus an
    amount, never a signed number — the same rule the shared ledgers follow."""
    col = "c-pos" if net_kind == "pos" else "c-neg"
    word = "Left over" if net_kind == "pos" else "Overspent by"
    return card(
        f'<div class="rrow" style="display:flex;justify-content:space-between;'
        f'padding:12px 16px 6px"><span class="t-body c-sec">Income</span>'
        f'<span class="t-body mono">{iso} {income}</span></div>'
        f'<div class="rrow" style="display:flex;justify-content:space-between;'
        f'padding:6px 16px"><span class="t-body c-sec">Spending</span>'
        f'<span class="t-body mono">{iso} {spending}</span></div>'
        f'<div style="border-top:1px solid var(--borderDivider);margin:6px 16px"></div>'
        f'<div style="display:flex;justify-content:space-between;align-items:baseline;'
        f'padding:8px 16px 14px"><span class="t-body semi">{word}</span>'
        f'<span class="mt mono {col}"><span class="iso">{iso}</span>'
        f'<span class="v t-headline semi">{net}</span></span></div>')


TXNS_AUG = [
    expense_row("Salary", "Aug 1 · Income · Employer", "4,200.00", "USD"),
    expense_row("Rent", "Aug 1 · Rent and bills", "1,450.00", "USD"),
    expense_row("Groceries", "Aug 2 · Groceries · Corner store", "86.40", "USD"),
    expense_row("Coffee", "Aug 3 · Eating out", "4.75", "USD"),
]

TXNS_JUL = [
    expense_row("Salary", "Jul 1 · Income · Employer", "4,200.00", "USD"),
    expense_row("Rent", "Jul 1 · Rent and bills", "1,450.00", "USD"),
    expense_row("Ski hire", "Jul 28 · Activities", "180.00", "USD"),
]


def build():
    # ------------------------------------------------------------------ P01 --
    def dash(body, tail=""):
        return (statusbar() + largetitle("Personal", trail=PLUS) + tail
                + f'<div class="scroll">{body}</div>' + tabbar("personal") + homebar())

    MODE = card(
        '<div class="row"><span class="grow"><span class="t-body">Report mode</span>'
        '<span class="t-cap c-sec" style="display:block">Your share — shared expenses count '
        'only what you owe</span></span>' + IC["chev"] + '</div>')

    populated = dash(
        ctx_marker("personal")
        + '<div style="padding:0 16px 12px"><div class="seg">'
        '<span class="sg on">US Dollar</span><span class="sg">Pakistani Rupee</span>'
        '</div></div>'
        + seclabel("August 2026", right="US Dollar", first=True)
        + summary("USD", "4,200.00", "1,541.15", "2,658.85")
        + MODE
        + seclabel("Recent entries", right="View all")
        + listcard(TXNS_AUG)
        + '<div style="padding:4px 16px 0"><div class="btn sec">Add a transaction</div></div>')

    overspent = dash(
        ctx_marker("personal")
        + '<div style="padding:0 16px 12px"><div class="seg">'
        '<span class="sg">US Dollar</span><span class="sg on">Pakistani Rupee</span>'
        '</div></div>'
        + seclabel("August 2026", right="Pakistani Rupee", first=True)
        + summary("PKR", "0", "18,400", "18,400", net_kind="neg")
        + '<p class="t-cap c-sec" style="margin:-4px 20px 0">No income has been recorded in PKR '
        'this month, so everything spent is counted as overspending. Currencies are never '
        'combined, not even to compute a net.</p>'
        + MODE
        + seclabel("Recent entries", right="View all")
        + listcard([
            expense_row("Lahore trip taxi", "Aug 2 · Transport", "3,400", "PKR"),
            expense_row("Dinner", "Aug 1 · Eating out", "15,000", "PKR"),
        ]))

    first_use = dash(ctx_marker("personal") + empty(
        GLYPH["wallet"], "Nothing recorded yet",
        "Personal entries are private — salary, rent, anything you want to "
        "track that is not shared with anyone. Nobody else can see them.",
        "Add a transaction"))

    loading = dash(ctx_marker("personal")
                   + seclabel("August 2026", first=True) + listcard(skeleton_rows(4)))

    write("29-personal-dashboard.html", "29", "Personal dashboard", "P01",
          "Private money, and the screen says so in words at the top rather than relying on which tab "
          "the user is in. One currency at a time — the segmented control makes combining structurally "
          "impossible, and the net is a labelled phrase, never a signed number.",
          [
              frame("Populated", " Income, Spending and a net stated as <em>Left over</em>. Report "
                                 "mode is visible on the dashboard because it changes what every "
                                 "figure means.", phone(populated)),
              frame("Overspent, second currency", " Same layout, opposite net, different currency — "
                                                  "and it explains why a month with no income reads "
                                                  "the way it does.", phone(overspent)),
              frame("First use", " Defines what a personal entry is, and repeats the privacy "
                                 "guarantee where a new user will read it.", phone(first_use)),
              frame("Loading", " Skeleton keeps the currency control and the context marker, because "
                               "neither depends on the data.", phone(loading)),
          ])

    # ------------------------------------------------------------------ P02 --
    def txlist(body, q="", tail=""):
        return (statusbar() + nav(title="Transactions", back="Personal", trail=FILTER)
                + search(q, "Search descriptions and sources") + tail
                + f'<div class="scroll">{body}</div>' + homebar())

    months = txlist(
        seclabel("August 2026", right="USD · 4 entries", first=True) + listcard(TXNS_AUG)
        + seclabel("July 2026", right="USD · 3 entries") + listcard(TXNS_JUL)
        + '<p class="t-cap c-sec" style="margin:12px 20px">Months are grouped per currency. A month '
        'with entries in two currencies appears as two sections, never as one mixed list.</p>')

    filtered = txlist(
        '<div style="display:flex;gap:8px;padding:4px 16px 0;flex-wrap:wrap">'
        '<span class="badge b-brand">Expenses ✕</span>'
        '<span class="badge b-brand">Groceries ✕</span>'
        '<span class="badge">USD</span></div>'
        + seclabel("August 2026", right="1 of 4 entries", first=True)
        + listcard([TXNS_AUG[2]])
        + seclabel("July 2026", right="0 entries")
        + card('<div class="row"><span class="grow t-supp c-sec">No groceries recorded in '
               'July.</span></div>'))

    noresults = txlist(
        empty(GLYPH["search"], "No entries match “insurance”",
              "There are 7 entries in August. Searching looks at descriptions "
              "and sources, not amounts.", "Clear search"),
        q="insurance")

    write("30-personal-transactions.html", "30", "Personal transactions", "P02",
          "Grouped by month and by currency, in that order. A month holding two currencies becomes two "
          "sections rather than one mixed list, which is the same structural rule that keeps the "
          "Friends list honest.",
          [
              frame("By month", " Counts on the section labels, so a short section is obviously "
                                "short rather than possibly truncated.", phone(months)),
              frame("Filtered", " Empty months stay visible with a sentence, because silently "
                                "dropping them would make the filter look broken.", phone(filtered)),
              frame("No results", " Says how many entries exist and what the search actually "
                                  "covers.", phone(noresults)),
          ])

    # ------------------------------------------------------------ P03 / P04 --
    def addtx(body, foot, ttl="Add transaction"):
        return (statusbar()
                + nav(title=ttl, lead=CANCEL,
                      trail='<span class="act off semi">Save</span>')
                + f'<div class="scroll">{body}</div>' + foot + homebar())

    def txform(kind_on="expense", amount="", empty_amt=True, desc="What was this for?",
               ph=True, cat="Choose", extra=""):
        return (ctx_marker("personal")
                + '<div style="padding:0 16px 12px"><div class="seg">'
                f'<span class="sg {"on" if kind_on == "expense" else ""}">Expense</span>'
                f'<span class="sg {"on" if kind_on == "income" else ""}">Income</span>'
                '</div></div>'
                + card(amount_editor("USD", amount, empty=empty_amt))
                + card(kv_row("Description", desc, chev=False,
                              vcls="t-body c-sec" if ph else "t-body")
                       + nav_row("Currency", "USD")
                       + nav_row("Category", cat)
                       + nav_row("Date", "Aug 3, 2026"))
                + seclabel("Optional")
                + card(nav_row("Source")
                       + nav_row("Notes")
                       + nav_row("Attachment"))
                + extra)

    blank = addtx(txform(),
                  footer('<div class="btn off">Save transaction</div>',
                         "Enter an amount above 0.00 to save."))

    income = addtx(
        txform(kind_on="income", amount="4,200.00", empty_amt=False,
               desc="Salary", ph=False, cat="Income · Employment",
               extra='<p class="t-cap c-sec" style="margin:12px 20px">Income categories are only '
                     'available on personal entries. A shared expense cannot be income.</p>'),
        footer('<div class="btn">Save transaction</div>'))

    dup_sheet = sheet(
        "This might already be recorded",
        '<div style="padding:4px 16px 16px"><p class="t-supp c-sec" style="margin:0">'
        'You are in Winter Trip and there is a shared expense with a very similar amount and '
        'date. If you were part of that expense, your share is already counted in your reports '
        '— adding this too would count it twice.</p></div>'
        + seclabel("The shared expense", first=True)
        + card('<div class="facts" style="padding:12px 16px">'
               '<div class="f"><span class="k t-body">Brunch</span>'
               '<span class="t-body mono">USD 45.00</span></div>'
               '<div class="f"><span class="k t-body">Your share</span>'
               '<span class="t-body mono">USD 15.00</span></div>'
               '<div class="f"><span class="k t-body">Date</span>'
               '<span class="t-body">Aug 3, 2026</span></div>'
               '<div class="f"><span class="k t-body">Paid by</span>'
               '<span class="t-body">Sam Kessler</span></div></div>')
        + seclabel("What you are adding")
        + card('<div class="facts" style="padding:12px 16px">'
               '<div class="f"><span class="k t-body">Brunch</span>'
               '<span class="t-body mono">USD 15.00</span></div>'
               '<div class="f"><span class="k t-body">Date</span>'
               '<span class="t-body">Aug 3, 2026</span></div></div>')
        + '<p class="t-cap c-sec" style="margin:12px 20px">Nothing is merged or removed '
        'automatically. Only you can tell whether these are the same money.',
        '<div style="display:flex;flex-direction:column;gap:8px">'
        '<span class="btn out">Look at the shared expense</span>'
        '<span class="btn sec">Add it anyway</span>'
        '<span class="btn">Go back</span></div>', lead="", trail="")

    duplicate = (statusbar()
                 + nav(title="Add transaction", lead=CANCEL,
                       trail='<span class="act off semi">Save</span>')
                 + '<div class="scroll">'
                 + txform(amount="15.00", empty_amt=False, desc="Brunch", ph=False,
                          cat="Eating out")
                 + '</div><div class="overlay"></div>' + dup_sheet + homebar())

    write("31-add-personal.html", "31", "Add personal transaction", "P03 · P04",
          "The Personal context marker is the first thing on the screen, because the only difference "
          "between this form and the shared one is who can see the result. Duplicate detection "
          "suggests and explains; it never merges, because only the person who was there knows "
          "whether two similar numbers are the same money.",
          [
              frame("Default", " Expense/Income as a two-option control — the same shape as the split "
                               "selector, so the vocabulary stays small.", phone(blank)),
              frame("Income", " Income categories exist here and nowhere else, and the form says so "
                              "rather than leaving it to be discovered.", phone(income)),
              frame("Possible duplicate", " <em>No automatic dedupe.</em> Both records side by side, "
                                          "three exits, and a sentence explaining why the app will "
                                          "not decide.", phone(duplicate)),
          ])

    # ------------------------------------------------------ P05 / P06 / P07 --
    detail_body = (
        ctx_marker("personal")
        + '<div style="padding:4px 16px 16px">'
        '<div class="t-cap c-sec">Personal expense · Groceries</div>'
        '<div class="t-title" style="margin-top:2px">Groceries</div>'
        '<span class="mt big mono" style="margin-top:6px">'
        '<span class="iso">USD</span><span class="v">86.40</span></span>'
        '<div class="t-cap c-sec" style="margin-top:6px">Aug 2, 2026</div></div>'
        + seclabel("Details", first=True)
        + card(kv_row("Category", "Groceries")
               + kv_row("Source", "Corner store")
               + kv_row("Date", "Aug 2, 2026")
               + kv_row("Notes", "Weekly shop, includes cleaning supplies", cls="stack"))
        + seclabel("Attachment")
        + card('<div class="row"><span class="thumb sm"></span>'
               '<span class="grow"><span class="t-body">receipt-aug-2.jpg</span>'
               '<span class="t-cap c-sec" style="display:block">1.1 MB · only visible to you'
               '</span></span>' + IC["chev"] + '</div>')
        + seclabel("Counted in")
        + card(kv_row("August 2026 spending", "USD 1,541.15")
               + kv_row("Groceries category", "USD 312.80")))

    detail = (statusbar() + nav(back="Transactions",
                                trail='<span class="act semi">Edit</span>')
              + f'<div class="scroll">{detail_body}'
              + '<div style="padding:8px 16px 0"><div class="btn dstr-out">'
              'Delete transaction</div></div></div>' + homebar())

    edit = (statusbar() + nav(title="Edit transaction", lead=CANCEL,
                              trail='<span class="act semi">Save</span>')
            + '<div class="scroll">'
            + txform(amount="92.10", empty_amt=False, desc="Groceries", ph=False,
                     cat="Groceries")
            + seclabel("What changes", right="Version 1 → 2")
            + card('<div class="facts" style="padding:12px 16px">'
                   '<div class="f"><span class="k t-body">Amount</span>'
                   '<span class="t-body mono">86.40 → 92.10</span></div>'
                   '<div class="f"><span class="k t-body">August spending</span>'
                   '<span class="t-body mono">1,541.15 → 1,546.85</span></div>'
                   '</div>')
            + '</div>'
            + footer('<div class="btn">Save changes</div>') + homebar())

    delete = (statusbar() + nav(back="Transactions")
              + f'<div class="scroll">{detail_body}</div>'
              + '<div class="overlay"></div>'
              + '<div class="dialog stackacts"><div class="dbody">'
              '<h4>Delete “Groceries”?</h4>'
              '<p>This entry is only yours, so nobody else is affected. Your August figures '
              'will change.</p>'
              '<div class="facts">'
              '<div class="f"><span class="k t-cap">Entry</span>'
              '<span class="t-cap semi mono">USD 86.40</span></div>'
              '<div class="f"><span class="k t-cap">August spending</span>'
              '<span class="t-cap semi mono">1,541.15 → 1,454.75</span></div>'
              '<div class="f"><span class="k t-cap">Attachment</span>'
              '<span class="t-cap semi">Deleted with the entry</span></div>'
              '</div></div>'
              '<div class="dacts"><span class="d">Delete transaction</span>'
              '<span>Cancel</span></div></div>' + homebar())

    write("32-personal-detail.html", "32", "Personal transaction detail, edit and delete",
          "P05 · P06 · P07",
          "A private record, so the consequences are all reporting consequences — and the screens name "
          "them by figure. <em>Counted in</em> is the section that makes deletion legible: it shows "
          "exactly which totals will move before the user is asked to confirm.",
          [
              frame("Detail", " Ends with which totals this entry feeds, which is the only thing that "
                              "makes a private entry matter.", phone(detail)),
              frame("Edit", " Before → after for the entry and for the month it belongs to.",
                    phone(edit)),
              frame("Delete review", " Says plainly that nobody else is affected — the opposite of the "
                                     "shared-expense wording, on purpose.", phone(delete)),
          ],
          prov="personal-transaction concurrency contract is not settled")

    # ------------------------------------------------------------ P08 / P09 --
    def bar(month, inc, exp, on=False):
        return (f'<div class="b{" on" if on else ""}"><div class="stack">'
                f'<div class="in" style="height:{inc}%"></div>'
                f'<div class="ex" style="height:{exp}%"></div></div>'
                f'<div class="m">{month}</div></div>')

    def catrow(name, amount, pct, width):
        return (f'<div class="row catrow" style="display:block">'
                f'<div class="top"><span class="t-body">{name}</span>'
                f'<span class="t-body mono">USD {amount}</span></div>'
                f'<div class="catbar"><i style="width:{width}%"></i></div>'
                f'<div class="t-cap c-sec" style="margin-top:5px">{pct}% of spending</div></div>')

    reports = (statusbar() + nav(title="Reports", back="Personal")
               + '<div class="scroll">'
               + ctx_marker("personal")
               + '<div style="padding:0 16px 12px"><div class="seg">'
               '<span class="sg on">US Dollar</span><span class="sg">Pakistani Rupee</span>'
               '</div></div>'
               + card(nav_row("Period", "August 2026")
                      + nav_row("Report mode", "Your share"))
               + seclabel("August 2026", right="US Dollar", first=True)
               + summary("USD", "4,200.00", "1,541.15", "2,658.85")
               + seclabel("Where it went", right="Top 4 of 7")
               + listcard([
                   catrow("Rent and bills", "1,450.00", 94, 94),
                   catrow("Groceries", "312.80", 20, 20),
                   catrow("Eating out", "96.55", 6, 6),
                   catrow("Transport", "42.00", 3, 3),
               ])
               + seclabel("Last six months", right="Income and spending")
               + card('<div class="bars">'
                      + bar("Mar", 62, 38) + bar("Apr", 62, 44) + bar("May", 62, 30)
                      + bar("Jun", 62, 52) + bar("Jul", 62, 41) + bar("Aug", 62, 23, on=True)
                      + '</div>'
                      '<div class="legend"><span class="lg"><i style="background:var(--positive)">'
                      '</i><span class="t-cap">Income</span></span>'
                      '<span class="lg"><i style="background:var(--negative)"></i>'
                      '<span class="t-cap">Spending</span></span></div>'
                      '<div style="height:12px"></div>')
               + listcard([
                   kv_row("August 2026", "Left over USD 2,658.85", vcls="t-body mono"),
                   kv_row("July 2026", "Left over USD 1,987.20", vcls="t-body mono"),
                   kv_row("June 2026", "Overspent USD 214.60", vcls="t-body mono c-neg"),
               ])
               + '<p class="t-cap c-sec" style="margin:12px 20px">Every bar has its exact value in '
               'the list beneath it. The chart is a summary of the numbers, never the only place '
               'a number appears.</p>'
               + '</div>' + homebar())

    mode_sheet = sheet(
        "How shared expenses are counted",
        '<div style="padding:4px 16px 0"><p class="t-supp c-sec" style="margin:0">'
        'This changes every figure in your reports. It changes nothing about what anyone owes.'
        '</p></div>'
        + seclabel("Your share", first=True)
        + card('<div class="row"><span class="grow"><span class="t-body med">Your share</span>'
               '<span class="t-cap c-sec" style="display:block;margin-top:2px">Counts only the '
               'part of a shared expense that is yours. Answers &ldquo;what did this cost '
               'me?&rdquo;</span></span>' + tick(True) + '</div>'
               + '<div class="row" style="background:var(--surfaceSubtle)">'
               '<span class="grow t-cap c-sec">Sam pays 45.00 for brunch, split 3 ways</span>'
               '<span class="val t-cap semi mono">15.00</span></div>')
        + seclabel("Cash out of pocket")
        + card('<div class="row"><span class="grow"><span class="t-body med">Cash out of pocket'
               '</span><span class="t-cap c-sec" style="display:block;margin-top:2px">Counts what '
               'actually left your account, and payments you made to settle up. Answers '
               '&ldquo;where did my money go?&rdquo;</span></span>' + tick(False) + '</div>'
               + '<div class="row" style="background:var(--surfaceSubtle)">'
               '<span class="grow t-cap c-sec">Same brunch — Sam paid, you paid nothing yet'
               '</span><span class="val t-cap semi mono">0.00</span></div>')
        + '<p class="t-cap c-sec" style="margin:12px 20px">Neither is more correct. They answer '
        'different questions, and you can switch back at any time.</p>',
        '<div class="btn">Keep “Your share”</div>', lead="Cancel", trail="")

    mode = (statusbar() + nav(title="Reports", back="Personal")
            + '<div class="scroll">'
            + ctx_marker("personal")
            + card(nav_row("Period", "August 2026")
                   + nav_row("Report mode", "Your share"))
            + seclabel("August 2026", right="US Dollar", first=True)
            + summary("USD", "4,200.00", "1,541.15", "2,658.85")
            + '</div><div class="overlay"></div>' + mode_sheet + homebar())

    write("33-personal-reports.html", "33", "Personal reports and report mode",
          "P08 · P09",
          "One currency and one period, chosen explicitly. Every bar in the trend chart has its exact "
          "value written out in the list below it, so the chart is never the only place a number "
          "lives — that is what keeps the screen usable without colour vision or fine motor control.",
          [
              frame("Reports", " Summary, category breakdown with exact figures and percentages, then "
                               "a six-month trend backed by a textual list.", phone(reports)),
              frame("Report mode", " The one setting that changes what every number means, explained "
                                   "with the same worked example under both options.", phone(mode)),
          ],
          prov="chart vocabulary, trend window and category ranking are unsettled")
