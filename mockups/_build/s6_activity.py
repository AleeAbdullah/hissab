"""§6 Activity — Y01, Y02, Y03.

Activity is the audit trail, so every row answers actor / action / context /
when. A row that says "Expense updated" without saying who and where is not an
audit trail, it is a notification.
"""

from lib import statusbar, homebar, nav, largetitle, tabbar, frame, phone as frame_phone, write, avatar, IC
from comp import (seclabel, card, listcard, nav_row, search, banner, empty,
                  skeleton_rows, stale_strip, footer, GLYPH)


def act_row(initials, actor, action, context, when, amount=None, tone=1,
            unread=False, kind=None):
    """One audit line. The amount is optional because plenty of events — joining
    a group, accepting a request — have no money attached, and inventing a
    number for them would be worse than leaving the column empty.

    The time sits in the trailing column, not at the end of the context line.
    Measured, it was the tail that truncated: "Winter Trip · Ski passes · 9:03
    AM" lost 21% and the search results lost 34%, taking the time with it. An
    audit trail that has dropped its timestamps is just a list. The time is the
    one field here that is always present, so it — not the amount — is what the
    column is anchored on, and events with no money simply show a time."""
    dot = '<span class="dot" style="margin-right:6px"></span>' if unread else ""
    a = ""
    if amount:
        col = {"neg": "c-neg", "pos": "c-pos"}.get(kind, "")
        a = f'<span class="mn t-body mono {col}">{amount}</span>'
    return (f'<div class="row erow">{avatar(initials, tone)}'
            f'<span class="grow"><span class="ti t-body">{dot}<b class="med">{actor}</b> '
            f'{action}</span>'
            f'<span class="me t-cap">{context}</span></span>'
            f'<span class="val">{a}<span class="sb t-cap">{when}</span></span>'
            f'{IC["chev"]}</div>')


TODAY = [
    act_row("AR", "You", "edited an expense", "Winter Trip · Ski passes",
            "9:03 AM", "$900.00", tone=6, unread=True),
    act_row("AR", "You", "recorded a payment", "To John Doe", "9:14 AM",
            "$100.00", tone=6, kind="neg", unread=True),
    act_row("MK", "Maya Khan", "joined the group", "Winter Trip", "8:40 AM", tone=4),
    act_row("JD", "John Doe", "added an expense", "Brunch club · Brunch",
            "8:02 AM", "$45.00", tone=2),
]

# The day is the section heading, so the row carries only the time. Repeating
# "Aug 2," on every row of a section titled Yesterday widened the trailing column
# to 95px and pushed every title onto a second line — a date said twice, paid for
# in row height.
YESTERDAY = [
    act_row("PN", "Priya Nair", "added an expense", "Flat 3B · Groceries",
            "6:20 PM", "$128.00", tone=3),
    act_row("SK", "Sam Kessler", "recorded a payment", "To you", "1:05 PM",
            "$15.00", tone=1, kind="pos"),
    act_row("TA", "Tariq Ahmed", "left the group", "Winter Trip", "11:00 AM", tone=8),
]

EARLIER = [
    act_row("JD", "John Doe", "deleted an expense", "Winter Trip · Cabin deposit",
            "Aug 1", "$900.00", tone=2),
    act_row("AR", "You", "accepted a connection", "Maya Khan", "Aug 1", tone=6),
]

FILTER = ('<span class="act"><svg viewBox="0 0 22 22" width="21" height="21" style="display:block">'
          '<path d="M3 6h16M6 11h10M9 16h4" stroke="currentColor" stroke-width="2" '
          'stroke-linecap="round" fill="none"/></svg></span>')


def phone(body, cls=""):
    return frame_phone(body, f"brand activity {cls}".strip())


def build():
    # ------------------------------------------------------------- Y01 / Y03 --
    def feed(body, tail=""):
        return (statusbar() + largetitle("Activity", trail=FILTER) + tail
                + f'<div class="scroll">{body}</div>' + tabbar("activity") + homebar())

    populated = feed(
        seclabel("Today", first=True) + listcard(TODAY)
        + seclabel("Yesterday") + listcard(YESTERDAY)
        + seclabel("Earlier") + listcard(EARLIER))

    realtime = feed(
        seclabel("Today", first=True) + listcard(TODAY)
        + seclabel("Yesterday") + listcard(YESTERDAY),
        tail=banner("3 new events",
                    "Loaded a moment ago. Nothing has been inserted above what "
                    "you are reading.", action="Show", kind="").replace(
            'class="banner "', 'class="banner strip"'))

    first_use = feed(empty(
        GLYPH["clock"], "Nothing has happened yet",
        "Every change anyone makes to a shared expense, group or payment shows "
        "up here with who did it and when.", "Add an expense"))

    loading = feed(seclabel("Today", first=True) + listcard(skeleton_rows(4))
                   + seclabel("Yesterday") + listcard(skeleton_rows(3)))

    offline = feed(
        seclabel("Today", first=True) + listcard(TODAY)
        + seclabel("Yesterday") + listcard(YESTERDAY),
        tail=stale_strip("Offline · showing saved copy from 9:02 AM"))

    write("27-activity.html", "27", "Activity feed", "Y01 · Y03",
          "Every row is actor, action, context and time — an audit trail rather than a notification "
          "list. Events with no money attached leave the amount column empty instead of inventing a "
          "figure, and the realtime banner never reorders what is under the reader's thumb.",
          [
              frame("Populated", " Grouped by day, unread marked with a dot rather than a colour "
                                 "change, and deletions stay in the record.", phone(populated)),
              frame("New events", " <em>Nonblocking.</em> The count is offered as a strip; content "
                                  "only moves when Show is tapped.", phone(realtime)),
              frame("First use", " Explains what the feed is for, which is not obvious before "
                                 "anything has happened.", phone(first_use)),
              frame("Loading", " Skeleton matches the final geometry — avatar, two lines, right-hand "
                               "money.", phone(loading)),
              frame("Offline", " Cached with the saved-at time. The feed is read-only, so offline "
                               "costs nothing here.", phone(offline)),
          ])

    # ------------------------------------------------------------------ Y02 --
    chips = ('<div style="display:flex;gap:8px;padding:4px 16px 8px;flex-wrap:wrap">'
             '<span class="badge b-brand">Shared activity ✕</span>'
             '<span class="badge b-brand">Winter Trip ✕</span>'
             '<span class="badge">Social activity</span>'
             '</div>')

    filters = (statusbar() + nav(title="Filter activity", back="Activity")
               + chips
               + '<div class="scroll">'
               + seclabel("Filter by area", first=True)
               + listcard([
                   nav_row("Shared activity", "Included", chev=False,
                           lead='<span class="badge b-brand">On</span>'),
                   nav_row("Social activity", "", chev=False),
               ])
               + seclabel("Filter by ledger")
               + listcard([
                   nav_row("Winter Trip", "Included", chev=False,
                           lead='<span class="badge b-brand">On</span>'),
                   nav_row("Flat 3B", "", chev=False),
                   nav_row("John Doe", "", chev=False),
               ])
               + '</div>'
               + footer('<div style="display:flex;gap:8px">'
                        '<span class="btn out" style="flex:1">Clear all</span>'
                        '<span class="btn" style="flex:1">Show 12 results</span></div>')
               + homebar())

    results = (statusbar() + nav(title="Filter activity", back="Activity")
               + chips
               + '<div class="scroll">'
               + seclabel("12 results · newest first", first=True)
               + listcard([
                   act_row("AR", "You", "edited an expense",
                           "Winter Trip · Ski passes", "Today 9:03 AM", "$900.00", tone=6),
                   act_row("JD", "John Doe", "added an expense",
                           "Winter Trip · Ski passes", "Jul 28", "$720.00", tone=2),
                   act_row("AR", "You", "changed the split",
                           "Winter Trip · Ski passes", "Jul 28", tone=6),
               ])
               + '<p class="t-cap c-sec" style="margin:12px 20px">Results stay in date order. '
               'Sorting by relevance would hide when something happened, which is the one thing '
               'an audit trail must preserve.</p>'
               + '</div>' + homebar())

    noresults = (statusbar() + nav(title="Filter activity", back="Activity")
                 + chips
                 + '<div class="scroll">'
                 + empty(GLYPH["search"], "No activity with these filters",
                         "Winter Trip has no shared activity in the selected area. "
                         "Clearing the ledger filter will show activity elsewhere.",
                         "Clear ledger filter")
                 + '</div>' + homebar())

    write("28-activity-search.html", "28", "Activity filters", "Y02",
          "Area and ledger filters are visible as chips above the results rather than hidden behind an "
          "icon, so the reason a result set is small is always on screen. Results stay chronological.",
          [
              frame("Filters", " Area and ledger as two independent lists, with the resulting count "
                               "on the action before it is applied.", phone(filters)),
              frame("Results", " Chips stay pinned above the results, and the ordering rule is "
                               "stated.", phone(results)),
              frame("No results", " Says which filter is responsible and offers to remove exactly "
                                  "that one, rather than a generic 'try again'.", phone(noresults)),
          ])
