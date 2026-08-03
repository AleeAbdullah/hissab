"""§3 Groups — G01, G02, G03, G04, G05, G06, G07, G08, G09."""

from lib import statusbar, homebar, nav, largetitle, tabbar, frame, phone as frame_phone, write, avatar, IC, tick
from comp import (seclabel, card, listcard, nav_row, person_row, select_row, search,
                  banner, empty, skeleton_rows, stale_strip, GLYPH, kv_row, ledger_row,
                  expense_row)
from s2_friends import PLUS, GEAR


def group_row(initials, name, members, balances, tone=1):
    """Groups list row. A group can hold several currencies, so this list is NOT
    sectioned by currency and every balance line therefore keeps its ISO code."""
    lines = "".join(
        f'<span class="ln t-cap"><span class="lg">{iso} ·</span>'
        f'<span class="mo mono {"c-neg" if d.startswith("you owe") else ("c-pos" if d.startswith("owes") else "c-sec")}">'
        f'{d}</span></span>' for iso, d in balances)
    return (f'<div class="row lrow">{avatar(initials, tone, cls="sq")}'
            f'<span class="grow"><span class="nm t-body med">{name}</span>'
            f'<span class="brk">{lines}</span></span>'
            f'<span class="bal t-cap c-sec">{members}</span>{IC["chev"]}</div>')


GROUPS_CARD = listcard([
    group_row("WT", "Winter Trip", "5 members",
              [("USD", "you owe 240.00")], tone=1),
    group_row("F3", "Flat 3B", "3 members",
              [("USD", "owes you 64.00")], tone=3),
    group_row("LT", "Lahore trip", "4 members",
              [("PKR", "you owe 12,500"), ("USD", "owes you 18.00")], tone=4),
    group_row("BC", "Brunch club", "6 members",
              [("USD", "owes you 40.00")], tone=2),
    group_row("OF", "Office lunches", "9 members",
              [("USD", "settled")], tone=7),
])

MEMBERS = [
    ("AR", "Alina Rehman (you)", "Owner", "active", 6),
    ("JD", "John Doe", "Admin", "active", 2),
    ("SK", "Sam Kessler", "Member", "active", 1),
    ("MK", "Maya Khan", "Member", "invited", 6),
    ("TA", "Tariq Ahmed", "Member", "left", 8),
]


def phone(body, cls=""):
    return frame_phone(body, f"brand groups {cls}".strip())


def build():
    # ---------------------------------------------------------------- G01 -----
    def groups(body, tail=""):
        return (statusbar() + largetitle("Groups", trail=PLUS) + search() + tail
                + f'<div class="scroll">{body}</div>' + tabbar("groups") + homebar())

    populated = groups(seclabel("Your groups · 5", first=True) + GROUPS_CARD)

    empty_view = groups(empty(
        GLYPH["group"], "No groups yet",
        "A group is a shared ledger — a trip, a flat, a recurring lunch. Everyone in it sees the "
        "same expenses.", "Create a group"))

    noresults = groups(
        empty(GLYPH["search"], "No groups match “ski”",
              "Search looks at group names only, not the expenses inside them.",
              "Clear search")).replace(
        '<div class="search">', '<div class="search"><!--q-->').replace(
        '<span class="t-body">Search</span>', '<span class="q t-body">ski</span>')

    write("10-groups.html", "10", "Groups", "G01",
          "Unlike Friends, this list is <em>not</em> sectioned by currency — a single group can hold "
          "several. So each row carries its own per-currency lines and every line keeps its ISO code. "
          "Lahore trip shows the two-currency case: two lines, never one total.",
          [
              frame("Populated", " Five groups including a two-currency group and a settled group. "
                                 "Member count is the trailing column, so it never competes with money.",
                    phone(populated)),
              frame("Empty", " Explains what a group <i>is</i>, because the concept is the thing a new "
                             "user has not got yet.", phone(empty_view)),
              frame("No results", " States what search covers, which prevents the assumption that it "
                                  "searches expenses.", phone(noresults)),
          ])

    # ------------------------------------------------------------ G02 / edit --
    def group_form(title, name, action, members_summary, saving=False):
        return (statusbar()
                + nav(title=title, lead='<span class="act">Cancel</span>',
                      trail=f'<span class="act semi">{action}</span>')
                + '<div class="scroll">'
                + '<div class="brand-profile-head" style="justify-content:center;padding-top:16px;padding-bottom:4px">'
                + '<div style="text-align:center">'
                + avatar("WT" if name else "+", 1, cls="xl sq")
                + '<div class="t-cap c-brand semi" style="margin-top:8px">'
                + ('Change image' if name else 'Add image (optional)') + '</div></div></div>'
                + card('<div class="field"><span class="flbl t-cap">Group name</span>'
                       f'<div class="fval">{("<span class=" + chr(34) + "t-body" + chr(34) + ">" + name + "</span>") if name else "<span class=" + chr(34) + "t-body ph" + chr(34) + ">Winter Trip, Flat 3B…</span>"}'
                       '<span class="caret"></span></div></div>'
                       + kv_row("Group type", "Trip", chev=True))
                + '<p class="t-cap c-sec" style="margin:-4px 20px 0">Group type only changes the '
                'suggested categories. It does not affect balances or splits.</p>'
                + seclabel("Members")
                + members_summary
                + '</div>' + homebar())

    create_empty = group_form(
        "New group", "", "Create",
        card(nav_row("Add members", "", chev=True))
        + '<p class="t-cap c-sec" style="margin:-4px 20px 0">You can create the group first and add '
        'members later. You are always a member of a group you create.</p>')

    create_filled = group_form(
        "New group", "Winter Trip", "Create",
        listcard([
            person_row("AR", "Alina Rehman (you)", "Owner", tone=6),
            person_row("JD", "John Doe", "Will be invited", tone=2),
            person_row("SK", "Sam Kessler", "Will be invited", tone=1),
        ]) + card(nav_row("Add more members", "", chev=True)))

    edit_view = (statusbar()
                 + nav(title="Edit group", lead='<span class="act">Cancel</span>',
                       trail='<span class="act semi">Save</span>')
                 + '<div class="scroll">'
                + '<div class="brand-profile-head" style="justify-content:center;padding-top:16px;padding-bottom:4px">'
                 + '<div style="text-align:center">' + avatar("WT", 1, cls="xl sq")
                 + '<div class="t-cap c-brand semi" style="margin-top:8px">Change image</div></div></div>'
                 + card('<div class="field"><span class="flbl t-cap">Group name</span>'
                        '<div class="fval"><span class="t-body">Winter Trip</span>'
                        '<span class="caret"></span></div></div>'
                        + kv_row("Group type", "Trip", chev=True))
                 + '<p class="t-cap c-sec" style="margin:-4px 20px 0">Renaming a group updates it '
                 'everywhere, including in past activity entries. Expenses and balances are untouched.</p>'
                 + '</div>' + homebar())

    write("11-create-group.html", "11", "Create and edit group", "G02",
          "Create and Edit are the same form with different verbs, so they share a file. Group type is "
          "annotated as cosmetic because a &ldquo;type&rdquo; field invites the assumption that it changes "
          "the money.",
          [
              frame("New, empty", " Members are optional at creation — the screen says so rather than "
                                  "blocking on an empty list.", phone(create_empty)),
              frame("New, with members", " Members not yet connected read &ldquo;Will be invited&rdquo;, "
                                         "so nobody thinks they are already in.", phone(create_filled)),
              frame("Edit", " Says what a rename touches and, more usefully, what it does not.",
                    phone(edit_view)),
          ],
          prov="group type taxonomy and invitation transport are unsettled")

    # ---------------------------------------------------------------- G03 -----
    def selmembers(body, count, action_on=True):
        act = (f'<span class="act semi">Add {count}</span>' if action_on
               else '<span class="act off semi">Add</span>')
        return (statusbar()
                + nav(title="Select members", lead='<span class="act">Cancel</span>', trail=act)
                + search("", "Search connections or type an email")
                + f'<div class="scroll">{body}</div>' + homebar())

    sel_body = (seclabel(f"Selected · 2", first=True)
                + listcard([
                    select_row("JD", "John Doe", "Connected", True, tone=2),
                    select_row("SK", "Sam Kessler", "Connected", True, tone=1),
                ])
                + seclabel("Your connections")
                + listcard([
                    select_row("PN", "Priya Nair", "Connected", False, tone=3),
                    select_row("OF", "Omar Farooq", "Connected", False, tone=4),
                    select_row("LT", "Lena Toure", "Connected", False, tone=6),
                ])
                + seclabel("Already in this group")
                + listcard([
                    person_row("AR", "Alina Rehman (you)", "Owner", tone=6,
                               trail='<span class="badge">Owner</span>'),
                    person_row("MK", "Maya Khan", "Invited Aug 1 · has not accepted", tone=6,
                               trail='<span class="badge b-warn">Invited</span>'),
                ]))

    email_body = (seclabel("Not in your connections", first=True)
                  + listcard([select_row("NA", "nadia@example.com", "No hissab account found",
                                         True, tone=7)])
                  + '<p class="t-cap c-sec" style="margin:12px 20px">They will be invited by email and '
                  'appear as <span class="c-pri semi">Invited</span> until they accept. You can add '
                  'expenses for an invited member straight away.</p>')

    write("12-select-members.html", "12", "Select and invite members", "G03",
          "Three states of membership are visible at once — selected, selectable, and already in — so "
          "the count in the action is never a surprise. Invited members are usable immediately, which "
          "is the detail that stops people waiting before adding expenses.",
          [
              frame("Selecting", " Selected members float to their own section so the action count is "
                                  "verifiable without scrolling.", phone(selmembers(sel_body, 2))),
              frame("Invite by email", " The fallback when someone is not a connection. States what "
                                       "happens next and that expenses need not wait.",
                    phone(selmembers(email_body, 1))),
          ],
          prov="invitation transport and the member search contract are unsettled")

    # ---------------------------------------------------------------- G04 -----
    RECENT = [
        expense_row("Brunch", "Aug 3 · Sam paid", "45.00", "USD",
                    sub="your share 15.00"),
        expense_row("Ski passes", "Jul 28 · John paid", "720.00", "USD",
                    sub="your share 240.00"),
        expense_row("Payment to John Doe", "Aug 1 · recorded by you", "60.00", "USD"),
        expense_row("Cabin deposit", "Jul 20 · you paid", "900.00", "USD",
                    sub="your share 180.00"),
    ]

    def ledger(body, banner_html="", tail=""):
        return (statusbar()
                + nav(back="Groups", trail=GEAR)
                + '<div class="scroll">'
                + '<div class="brand-profile-head" style="padding-top:4px">'
                + avatar("WT", 1, cls="xl sq")
                + '<span><span class="t-title" style="display:block">Winter Trip</span>'
                '<span class="t-cap c-sec">5 members · Trip</span></span></div>'
                + tail + banner_html + body + '</div>' + homebar())

    balances_card = (seclabel("Your balance · US Dollar · USD", first=True)
                     + card('<div style="padding:16px">'
                            '<div class="t-supp c-sec">You owe this group</div>'
                            '<span class="mt big mono c-neg" style="margin-top:2px">'
                            '<span class="iso">USD</span><span class="v">240.00</span></span>'
                            '</div>'
                            + nav_row("See who owes whom", "", chev=True)))

    actions = ('<div class="brand-actions split" style="padding-bottom:4px">'
               '<span class="btn" style="flex:1">Add expense</span>'
               '<span class="btn sec" style="flex:1">Settle up</span></div>')

    g04 = ledger(balances_card + actions
                 + seclabel("Recent activity", right="See all") + listcard(RECENT))

    g04_new = ledger(
        empty(GLYPH["receipt"], "No expenses yet",
              "Add the first shared expense and everyone in Winter Trip will see it.",
              "Add expense"))

    g04_updated = ledger(
        balances_card + actions
        + seclabel("Recent activity", right="See all") + listcard(RECENT),
        banner_html=banner("Updated elsewhere",
                           "Sam Kessler changed an expense in this group.",
                           action="Refresh"))

    write("13-group-ledger.html", "13", "Group ledger", "G04",
          "Your own balance first, per currency, then the route to who-owes-whom, then history. The "
          "group total is never shown as a single figure because a group holding two currencies has no "
          "such number.",
          [
              frame("Populated", " Your balance is a sentence with the amount under it. Recent activity "
                                 "names the payer and your share on every row.", phone(g04)),
              frame("New group", " Empty state names the group, so it is obvious which ledger the "
                                 "action will write to.", phone(g04_new)),
              frame("Updated elsewhere", " E14 in context: non-blocking, names who changed what, and "
                                         "offers Refresh rather than reloading under the user.",
                    phone(g04_updated)),
          ])

    # ----------------------------------------------------------- G05 / G06 ---
    def rel_row(text, amount, direction, settle=True):
        col = "c-neg" if direction == "owe" else "c-pos"
        trail = ('<span class="btn sm out">Settle</span>' if settle else "")
        return (f'<div class="row"><span class="grow"><span class="t-body">{text}</span></span>'
                f'<span class="val t-body semi mono {col}" style="margin-right:8px">{amount}</span>'
                f'{trail}</div>')

    bal_usd = listcard([
        rel_row("You owe <b>John Doe</b>", "240.00", "owe"),
        rel_row("<b>Maya Khan</b> owes you", "30.00", "owed"),
        rel_row("<b>Sam Kessler</b> owes you", "15.00", "owed"),
    ])
    bal_pkr = listcard([rel_row("You owe <b>Omar Farooq</b>", "12,500", "owe")])

    g05 = (statusbar() + nav(title="Balances", sub="Winter Trip", back="")
           + '<div class="scroll">'
           + seclabel("US Dollar · USD", first=True) + bal_usd
           + seclabel("Pakistani Rupee · PKR") + bal_pkr
           + '<p class="t-cap c-sec" style="margin:4px 20px">Balances are shown per currency and are '
           'never added together. Only rows involving you offer Settle.</p>'
           + card(nav_row("Simplify debts", "5 payments → 3", chev=True))
           + '</div>' + homebar())

    g06 = (statusbar() + nav(title="Simplified debts", sub="Winter Trip", back="Balances")
           + '<div class="scroll">'
           + banner("Suggestions only",
                    "Nothing here has been applied. Your expenses, history and balances are unchanged.",
                    kind="")
           + seclabel("US Dollar · USD", first=True)
           + listcard([
               '<div class="row"><span class="grow"><span class="t-body">'
               '<b>You</b> pay <b>John Doe</b></span></span>'
               '<span class="val t-body semi mono">210.00</span></div>',
               '<div class="row"><span class="grow"><span class="t-body">'
               '<b>Maya Khan</b> pays <b>John Doe</b></span></span>'
               '<span class="val t-body semi mono">15.00</span></div>',
           ])
           + seclabel("Pakistani Rupee · PKR")
           + listcard(['<div class="row"><span class="grow"><span class="t-body">'
                       '<b>You</b> pay <b>Omar Farooq</b></span></span>'
                       '<span class="val t-body semi mono">12,500</span></div>'])
           + '<p class="t-cap c-sec" style="margin:4px 20px">Read-only. To act on a suggestion, record '
           'a settlement for it — hissab will not create payments for you.</p>'
           + '</div>' + homebar())

    g05_settled = (statusbar() + nav(title="Balances", sub="Office lunches", back="")
                   + '<div class="scroll">'
                   + empty(GLYPH["group"], "Everyone is settled",
                           "No outstanding balances in any currency in this group.",
                           "Back to group")
                   + '</div>' + homebar())

    write("14-group-balances.html", "14", "Group balances and simplified debts", "G05 · G06",
          "Who-owes-whom, per currency, with Settle only on rows that involve you. Simplification is "
          "deliberately a separate read-only screen so it can never be mistaken for an action that "
          "rewrote the ledger.",
          [
              frame("Balances", " Relationship sentences, not a matrix. Two currencies sit in two cards "
                                "with no combined figure anywhere.", phone(g05)),
              frame("Simplified debts", " The non-mutation promise is the first thing on the screen, not "
                                        "a footnote, and there is no Apply button to misread.",
                    phone(g06)),
              frame("All settled", " Says the word rather than listing zeroes.", phone(g05_settled)),
          ])

    # ----------------------------------------------------------- G07 / G09 ---
    def member_rows():
        out = []
        badge = {"active": "", "invited": '<span class="badge b-warn">Invited</span>',
                 "left": '<span class="badge">Left</span>'}
        for ini, name, role, status, tone in MEMBERS:
            sub = role if status == "active" else (
                "Invited Aug 1 · has not accepted" if status == "invited"
                else "Left Jul 30 · balances preserved")
            trail = badge[status] or (f'<span class="t-cap c-sec">{role}</span>'
                                      if role != "Member" else "")
            out.append(person_row(ini, name, sub, trail=trail, tone=tone,
                                  chev=(status != "left")))
        return out

    g07 = (statusbar() + nav(title="Members", sub="Winter Trip", back="",
                             trail='<span class="act semi">Invite</span>')
           + '<div class="scroll">'
           + seclabel("5 members · you are the owner", first=True)
           + listcard(member_rows())
           + '<p class="t-cap c-sec" style="margin:4px 20px">A member who leaves keeps their history and '
           'balances in this group. Removing someone is not a way to erase what they owe.</p>'
           + '</div>' + homebar())

    role_dialog = (statusbar() + nav(title="Members", sub="Winter Trip", back="")
                   + '<div class="scroll">' + seclabel("5 members", first=True)
                   + listcard(member_rows()) + '</div>'
                   + '<div class="overlay"></div>'
                   + '<div class="sheet"><div class="grab"></div>'
                   '<div class="shd"><span class="st">Change role</span>'
                   '<span class="act semi">Save</span></div>'
                   '<div class="sbody">'
                   + '<div style="padding:0 16px 12px;display:flex;gap:12px;align-items:center">'
                   + avatar("SK", 1, cls="lg")
                   + '<span><span class="t-body med" style="display:block">Sam Kessler</span>'
                   '<span class="t-cap c-sec">Currently a Member</span></span></div>'
                   + listcard([
                       f'<div class="row"><span class="grow"><span class="t-body">Member</span>'
                       f'<span class="t-cap c-sec" style="display:block">Add and edit their own '
                       f'expenses</span></span>{tick(False)}</div>',
                       f'<div class="row"><span class="grow"><span class="t-body">Admin</span>'
                       f'<span class="t-cap c-sec" style="display:block">Also edit group settings, '
                       f'invite and remove members</span></span>{tick(True)}</div>',
                   ])
                   + '<p class="t-cap c-sec" style="margin:0 20px 16px">Sam will be able to remove '
                   'members and change group settings. Ownership does not transfer.</p>'
                   '</div></div>' + homebar())

    remove_dialog = (statusbar() + nav(title="Members", sub="Winter Trip", back="")
                     + '<div class="scroll">' + seclabel("5 members", first=True)
                     + listcard(member_rows()) + '</div>'
                     + '<div class="overlay"></div>'
                     + '<div class="dialog stackacts"><div class="dbody">'
                     '<h4>Remove Maya Khan?</h4>'
                     '<p>They lose access to Winter Trip. Their share of past expenses stays exactly '
                     'as it is.</p>'
                     '<div class="facts">'
                     '<div class="f"><span class="k t-cap">Their balance here</span>'
                     '<span class="t-cap semi mono c-pos">Owes you USD 30.00</span></div>'
                     '<div class="f"><span class="k t-cap">Past expenses</span>'
                     '<span class="t-cap semi">Unchanged</span></div>'
                     '<div class="f"><span class="k t-cap">Can be re-invited</span>'
                     '<span class="t-cap semi">Yes</span></div>'
                     '</div></div>'
                     '<div class="dacts"><span class="d">Remove from group</span>'
                     '<span>Cancel</span></div></div>' + homebar())

    remove_blocked = (statusbar() + nav(title="Members", sub="Winter Trip", back="")
                      + '<div class="scroll">' + seclabel("5 members", first=True)
                      + listcard(member_rows()) + '</div>'
                      + '<div class="overlay"></div>'
                      + '<div class="dialog stackacts"><div class="dbody">'
                      '<h4>John Doe cannot be removed yet</h4>'
                      '<p>They are the only other admin and they hold an unsettled balance in this '
                      'group.</p>'
                      '<div class="facts">'
                      '<div class="f"><span class="k t-cap">Outstanding</span>'
                      '<span class="t-cap semi mono c-neg">You owe USD 240.00</span></div>'
                      '<div class="f"><span class="k t-cap">Role</span>'
                      '<span class="t-cap semi">Admin · promote someone first</span></div>'
                      '</div></div>'
                      '<div class="dacts"><span>Settle up now</span>'
                      '<span>Change roles</span><span class="off">Remove</span></div></div>'
                      + homebar())

    write("15-group-members.html", "15", "Group members, roles, removal", "G07 · G09",
          "Membership status is never implied by absence: invited and left members stay visible and "
          "labelled. Every consequence sheet states the affected balance as an exact amount, because "
          "removal and role changes are where people expect debts to quietly vanish.",
          [
              frame("Members", " Owner, admin, member, invited and left in one list. The footnote kills "
                               "the &ldquo;remove to erase the debt&rdquo; assumption.", phone(g07)),
              frame("Change role", " Each role is described by what it lets the person do, not by its "
                                   "name. Says explicitly that ownership does not move.",
                    phone(role_dialog)),
              frame("Remove member", " Destructive action names itself, and the balance is stated "
                                     "before the tap, not after.", phone(remove_dialog)),
              frame("Removal blocked", " <em>Blocked action with explanation.</em> Two reasons, both "
                                       "with a route out. The disabled action stays visible so the "
                                       "user can see what they were trying to do.",
                    phone(remove_blocked)),
          ])

    # ----------------------------------------------------------- G08 / leave --
    settings_body = ('<div class="scroll">'
                     + '<div class="brand-profile-head" style="padding-top:8px">'
                     + avatar("WT", 1, cls="lg sq")
                     + '<span><span class="t-headline" style="display:block">Winter Trip</span>'
                     '<span class="t-cap c-sec">5 members · Trip · created June 2026</span></span></div>'
                     + card(nav_row("Group name", "Winter Trip", chev=True)
                            + nav_row("Group image", "Set", chev=True)
                            + nav_row("Group type", "Trip", chev=True))
                     + seclabel("Balances")
                     + card('<div class="row"><span class="grow"><span class="t-body">Simplify debts'
                            '</span><span class="t-cap c-sec" style="display:block">Suggest fewer '
                            'payments. Never changes balances.</span></span>'
                            '<span class="sw on"></span></div>'
                            + nav_row("Members", "5", chev=True))
                     + seclabel("Membership")
                     + card('<div class="row"><span class="grow t-body c-neg semi">Leave group</span>'
                            + IC["chev"] + '</div>')
                     + '</div>')

    g08 = statusbar() + nav(title="Group settings", back="") + settings_body + homebar()

    leave_ok = (statusbar() + nav(title="Group settings", back="") + settings_body
                + '<div class="overlay"></div>'
                + '<div class="dialog stackacts"><div class="dbody">'
                '<h4>Leave Office lunches?</h4>'
                '<p>You keep read access to your own history. You will not see new expenses.</p>'
                '<div class="facts">'
                '<div class="f"><span class="k t-cap">Your balances</span>'
                '<span class="t-cap semi">Settled in all currencies</span></div>'
                '<div class="f"><span class="k t-cap">Past expenses</span>'
                '<span class="t-cap semi">Preserved for everyone</span></div>'
                '<div class="f"><span class="k t-cap">Rejoining</span>'
                '<span class="t-cap semi">Needs a new invitation</span></div>'
                '</div></div>'
                '<div class="dacts"><span class="d">Leave group</span><span>Cancel</span></div></div>'
                + homebar())

    leave_blocked = (statusbar() + nav(title="Group settings", back="") + settings_body
                     + '<div class="overlay"></div>'
                     + '<div class="dialog stackacts"><div class="dbody">'
                     '<h4>Settle up before leaving</h4>'
                     '<p>Winter Trip has unsettled balances involving you. Leaving now would strand '
                     'them.</p>'
                     '<div class="facts">'
                     '<div class="f"><span class="k t-cap">You owe John Doe</span>'
                     '<span class="t-cap semi mono c-neg">USD 240.00</span></div>'
                     '<div class="f"><span class="k t-cap">Maya Khan owes you</span>'
                     '<span class="t-cap semi mono c-pos">USD 30.00</span></div>'
                     '<div class="f"><span class="k t-cap">You owe Omar Farooq</span>'
                     '<span class="t-cap semi mono c-neg">PKR 12,500</span></div>'
                     '</div></div>'
                     '<div class="dacts"><span>Go to balances</span>'
                     '<span class="off">Leave group</span></div></div>' + homebar())

    write("16-group-settings.html", "16", "Group settings and leaving", "G08",
          "The Simplify debts switch carries its own disclaimer on the row, because a switch that "
          "sounds like it rewrites balances needs to say that it does not. Leaving is gated on "
          "outstanding money, itemised per currency.",
          [
              frame("Settings", " Destructive action is last, red, and separated by its own section "
                                "label.", phone(g08)),
              frame("Leave, eligible", " Allowed because everything is settled — and it still states "
                                       "what is kept and what re-joining needs.", phone(leave_ok)),
              frame("Leave, blocked", " <em>Blocked action with explanation.</em> Every outstanding "
                                      "balance listed with its own currency; no combined figure. The "
                                      "route out is the primary action.", phone(leave_blocked)),
          ])
