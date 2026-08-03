"""§8 Account and security — C01 … C07.

Two screens. The first is the settings hierarchy plus the three forms that hang
off it; the second is the account lifecycle, where the product has to explain
that deleting an account cannot delete money other people are owed.
"""

from lib import (statusbar, homebar, nav, largetitle, tabbar, frame, phone,
                 write, avatar, IC, tick)
from comp import (seclabel, card, listcard, nav_row, kv_row, person_row,
                  expense_row, banner, empty, footer, GLYPH)
from s4_expense import CANCEL


def toggle(label, on, sub=None):
    """A settings row whose value is a switch. Written out rather than assembled
    from nav_row, because a switch is not a value — it is the control itself."""
    s = (f'<span class="t-cap c-sec" style="display:block;margin-top:1px">{sub}</span>'
         if sub else "")
    return (f'<div class="row"><span class="grow lbl t-body">{label}{s}</span>'
            f'<span class="val"><span class="sw{" on" if on else ""}"></span></span></div>')


def build():
    # ------------------------------------------------- C01 / C02 / C03 / C04 --
    root = (statusbar() + largetitle("Account")
            + '<div class="scroll">'
            + card('<div class="row">' + avatar("AR", 6, cls="lg")
                   + '<span class="grow"><span class="t-headline" style="display:block">'
                   'Alina Rehman</span>'
                   '<span class="t-cap c-sec">alina.rehman@example.com</span></span>'
                   + IC["chev"] + '</div>')
            + seclabel("Preferences", first=True)
            + listcard([
                nav_row("Default currency", "USD"),
                nav_row("Timezone", "Asia/Karachi"),
                nav_row("Report mode", "Your share"),
            ])
            + seclabel("Security")
            + listcard([
                nav_row("Change password"),
                nav_row("Devices and sessions", "3 active"),
                nav_row("Notifications", "On"),
            ])
            + seclabel("Your data")
            + listcard([
                nav_row("Export your data"),
                nav_row("Delete account"),
            ])
            + '<div style="padding:16px"><div class="btn sec">Sign out</div></div>'
            + '<p class="t-cap c-sec" style="margin:-4px 20px 0;text-align:center">'
            'hissab 1.0 · Signing out on this device does not end sessions elsewhere.</p>'
            + '</div>' + tabbar("account") + homebar())

    profile = (statusbar() + nav(title="Profile", lead=CANCEL,
                                 trail='<span class="act semi">Save</span>')
               + '<div class="scroll">'
               + card('<div class="field"><span class="flbl t-cap">Display name</span>'
                      '<div class="fval"><span class="t-body">Alina Rehman</span>'
                      '<span class="caret"></span></div>'
                      '<span class="fhint t-cap">Everyone you share a ledger with sees this '
                      'name.</span></div>'
                      + '<div class="field"><span class="flbl t-cap">Email</span>'
                      '<div class="fval"><span class="t-body c-sec">alina.rehman@example.com'
                      '</span></div>'
                      '<span class="fhint t-cap">Changing your email is not supported in this '
                      'version.</span></div>')
               + seclabel("Defaults")
               + listcard([
                   nav_row("Default currency", "US Dollar · USD"),
                   nav_row("Timezone", "Asia/Karachi"),
                   nav_row("Report mode", "Your share"),
               ])
               + '<p class="t-cap c-sec" style="margin:12px 20px">The default currency only '
               'pre-selects a value on new expenses. It never converts anything, and it does not '
               'change existing records.</p>'
               + '<p class="t-cap c-sec" style="margin:12px 20px">Profile photos are not '
               'supported. Initials and colour are generated from your name.</p>'
               + '</div>' + homebar())

    password = (statusbar() + nav(title="Change password", lead=CANCEL,
                                  trail='<span class="act off semi">Save</span>')
                + '<div class="scroll">'
                + banner("You will be signed out everywhere",
                         "Changing your password ends every session, including this one. Sign "
                         "in again with your new password.", kind="w")
                + card('<div class="field"><span class="flbl t-cap">Current password</span>'
                       '<div class="fval"><span class="t-body">••••••••••</span></div></div>'
                       '<div class="field"><span class="flbl t-cap">New password</span>'
                       '<div class="fval"><span class="t-body">••••••••••••</span>'
                       '<span class="caret"></span></div>'
                       '<span class="fhint t-cap">At least 12 characters. Longer beats '
                       'complicated.</span></div>'
                       '<div class="field err"><span class="flbl t-cap">Confirm new password'
                       '</span><div class="fval"><span class="t-body">•••••••••</span></div>'
                       '<span class="ferr t-cap">The two new passwords do not match.</span>'
                       '</div>')
                + '</div>'
                + footer('<div class="btn off">Change password</div>',
                         "The two new passwords do not match.")
                + homebar())

    sessions = (statusbar() + nav(title="Devices and sessions", back="Account")
                + '<div class="scroll">'
                + seclabel("This device", first=True)
                + listcard([
                    person_row(None, "iPhone · Safari",
                               "Signed in Aug 1, 2026 · last used just now",
                               trail='<span class="badge b-pos">Current</span>', tone=7),
                ])
                + seclabel("Other sessions", right="2")
                + listcard([
                    person_row(None, "MacBook · Chrome",
                               "Signed in Jul 22, 2026 · last used yesterday",
                               trail='<span class="btn sm out">Revoke</span>', tone=7),
                    person_row(None, "Pixel · Chrome",
                               "Signed in Jun 2, 2026 · expires Sep 1, 2026",
                               trail='<span class="btn sm out">Revoke</span>', tone=7),
                ])
                + '<div style="padding:16px"><div class="btn dstr-out">Revoke all other '
                'sessions</div></div>'
                + '<p class="t-cap c-sec" style="margin:-4px 20px 0">If you do not recognise a '
                'session, revoke it and change your password.</p>'
                + '</div>' + homebar())

    notifs = (statusbar() + nav(title="Notifications", back="Account")
              + '<div class="scroll">'
              + banner("System notifications are off",
                       "hissab can still show everything in Activity, but nothing will reach "
                       "your lock screen until you allow notifications.",
                       action="Allow", kind="w")
              + seclabel("Push notifications", first=True)
              + listcard([toggle("Allow push notifications", False,
                                 sub="Turned off in system settings")])
              + seclabel("What to notify about")
              + listcard([
                  toggle("Expense added or edited", True),
                  toggle("Payment recorded", True),
                  toggle("Reminders sent to me", True),
                  toggle("Group membership changes", False),
                  toggle("Connection requests", True),
              ])
              + '<p class="t-cap c-sec" style="margin:12px 20px">These preferences apply while push '
              'is off too — they will take effect the moment you allow notifications.</p>'
              + '</div>' + homebar())

    write("34-account.html", "34", "Account, profile, security and notifications",
          "C01 · C02 · C03 · C04",
          "The settings hierarchy and the three forms under it. Each screen states the blast radius of "
          "its own setting: a default currency converts nothing, a password change ends all sessions, "
          "and notification preferences survive the system permission being off.",
          [
              frame("Account", " Preferences, security and data as three groups, with Sign out set "
                               "apart and scoped to this device only.", phone(root)),
              frame("Profile", " Says what is not supported — email changes, photos — so their "
                               "absence reads as a decision.", phone(profile)),
              frame("Change password", " The session consequence is a banner at the top, not a "
                                       "footnote, and the mismatch error is stated twice: on the "
                                       "field and beside the action.", phone(password)),
              frame("Devices", " Every session carries when it started, when it was last used and "
                               "when it expires. Location is omitted because it is not authoritative.",
                    phone(sessions)),
              frame("Notifications", " <em>Permission denied with alternative.</em> The preferences "
                                     "stay usable and the screen says they will apply later.",
                    phone(notifs)),
          ])

    # ------------------------------------------------------ C05 / C06 / C07 --
    def export(body, foot=None):
        return (statusbar() + nav(title="Export your data", back="Account")
                + f'<div class="scroll">{body}</div>' + (foot or "") + homebar())

    export_idle = export(
        seclabel("What you get", first=True)
        + listcard([
            kv_row("Your expenses and payments", "All ledgers"),
            kv_row("Your personal transactions", "All currencies"),
            kv_row("Groups you belong to", "Names and members"),
            kv_row("Receipts and attachments", "Original files"),
        ])
        + '<p class="t-cap c-sec" style="margin:12px 20px">The export contains expenses other '
        'people created in ledgers you share, because they are part of your balances. It does not '
        'contain anyone else\'s personal transactions.</p>'
        + seclabel("Format")
        + card(kv_row("Files", "CSV and JSON, plus original attachments", cls="stack")
               + kv_row("Delivery", "A download link, valid for 7 days", cls="stack")),
        footer('<div class="btn">Request export</div>'))

    export_wait = export(
        banner("Preparing your export",
               "This usually takes a few minutes. You can leave this screen — "
               "we will notify you when the file is ready.")
        + seclabel("Status", first=True)
        + card('<div class="row" style="display:block">'
               '<div class="top" style="display:flex;justify-content:space-between">'
               '<span class="t-body">Gathering records</span>'
               '<span class="t-cap c-sec">Started 9:20 AM</span></div>'
               '<div class="prog" style="margin-top:10px"><i style="width:45%"></i></div>'
               '</div>')
        + '<p class="t-cap c-sec" style="margin:12px 20px">Only one export can be in progress at '
        'a time.</p>',
        footer('<div class="btn off">Request export</div>',
               "An export is already being prepared.", kind="warn"))

    export_ready = export(
        seclabel("Ready", first=True)
        + card(kv_row("File", "hissab-export-2026-08-03.zip", cls="stack")
               + kv_row("Size", "8.4 MB")
               + kv_row("Link expires", "Aug 10, 2026"))
        + '<div style="padding:16px"><div class="btn">Download</div></div>'
        + '<p class="t-cap c-sec" style="margin:-4px 20px 0">After Aug 10 the file is deleted from '
        'our side and you would need to request a new one.</p>')

    eligibility_blocked = (
        statusbar() + nav(title="Delete account", back="Account")
        + '<div class="scroll">'
        + banner("You cannot delete your account yet",
                 "Three things are unresolved. Deleting now would leave other people holding "
                 "balances against an account that no longer exists.", kind="e")
        + seclabel("Resolve these first", first=True)
        + listcard([
            expense_row("You owe John Doe", "Settle up or ask them to write it off",
                        "87.50", iso="USD", cls="wrap"),
            expense_row("Priya Nair owes you", "Settle up or write it off",
                        "64.00", iso="USD", cls="wrap"),
            expense_row("You are the only owner of Winter Trip",
                        "Make someone else an owner, or delete the group",
                        "5 members", mono=False, cls="wrap"),
        ])
        + '<p class="t-cap c-sec" style="margin:12px 20px">Balances in any currency count. A '
        'balance you are owed blocks deletion just as much as one you owe, because writing it off '
        'is the other person\'s decision to make, not ours.</p>'
        + '</div>'
        + footer('<div class="btn off">Delete account</div>',
                 "3 balances and memberships must be resolved first.")
        + homebar())

    eligibility_ok = (
        statusbar() + nav(title="Delete account", back="Account")
        + '<div class="scroll">'
        + seclabel("Ready to delete", first=True)
        + card('<div class="facts" style="padding:12px 16px">'
               '<div class="f"><span class="k t-body">Outstanding balances</span>'
               '<span class="t-body semi c-pos">None</span></div>'
               '<div class="f"><span class="k t-body">Groups you own alone</span>'
               '<span class="t-body semi c-pos">None</span></div>'
               '<div class="f"><span class="k t-body">Pending requests</span>'
               '<span class="t-body semi c-pos">None</span></div></div>')
        + seclabel("What happens")
        + listcard([
            kv_row("Your personal transactions", "Deleted permanently", cls="stack"),
            kv_row("Your receipts and attachments", "Deleted permanently", cls="stack"),
            kv_row("Your name on shared expenses", "Replaced with “Former member”", cls="stack"),
            kv_row("Shared expenses themselves",
                   "Kept, because they are other people's records too", cls="stack"),
            kv_row("Your email and password", "Deleted permanently", cls="stack"),
        ])
        + '<p class="t-cap c-sec" style="margin:12px 20px">Expenses you created in a shared ledger '
        'stay, anonymised. They are part of other people\'s history and their balances still '
        'depend on them. This is the one thing deletion cannot undo.</p>'
        + '</div>'
        + footer('<div class="btn dstr">Delete account</div>')
        + homebar())

    confirm = (statusbar() + nav(title="Delete account", back="Account")
               + '<div class="scroll">'
               + seclabel("Ready to delete", first=True)
               + card('<div class="facts" style="padding:12px 16px">'
                      '<div class="f"><span class="k t-body">Outstanding balances</span>'
                      '<span class="t-body semi c-pos">None</span></div></div>')
               + '</div>'
               + '<div class="overlay"></div>'
               + '<div class="dialog stackacts"><div class="dbody">'
               '<h4>Delete your account?</h4>'
               '<p>Type nothing, tap nothing twice — just be certain. This cannot be undone and '
               'there is no recovery period.</p>'
               '<div class="facts">'
               '<div class="f"><span class="k t-cap">Personal data</span>'
               '<span class="t-cap semi">Deleted now</span></div>'
               '<div class="f"><span class="k t-cap">Shared expenses</span>'
               '<span class="t-cap semi">Kept, anonymised</span></div>'
               '<div class="f"><span class="k t-cap">Sign in again</span>'
               '<span class="t-cap semi">Not possible</span></div>'
               '</div></div>'
               '<div class="dacts"><span class="d">Delete my account permanently</span>'
               '<span>Cancel</span></div></div>' + homebar())

    write("35-account-lifecycle.html", "35", "Data export and account deletion",
          "C05 · C06 · C07",
          "The end of the relationship. Deletion is blocked while anyone holds a balance in either "
          "direction, and when it does proceed the product is honest that shared expenses survive: "
          "they are other people's records too, and their balances depend on them.",
          [
              frame("Export scope", " Names what is included and, more usefully, what is not — other "
                                    "people's personal transactions.", phone(export_idle)),
              frame("Export processing", " Leaves the screen and comes back; only one export at a "
                                         "time, and the action says so.", phone(export_wait)),
              frame("Export ready", " Expiry stated with the download, not discovered afterwards.",
                    phone(export_ready)),
              frame("Deletion blocked", " <em>Blocked with explanation.</em> Each blocker is a route "
                                        "to resolving it, and money owed <em>to</em> the user blocks "
                                        "deletion just as much as money owed by them.",
                    phone(eligibility_blocked)),
              frame("Deletion eligible", " Line by line, what is destroyed and what survives "
                                         "anonymised — including the reason.", phone(eligibility_ok)),
              frame("Final confirmation", " Three facts, a destructive action named after what it "
                                          "does, and no recovery period pretended.", phone(confirm)),
          ],
          prov="data export contract is not settled")
