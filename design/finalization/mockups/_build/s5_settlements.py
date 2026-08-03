"""§5 Settlements and reminders — S01 … S09.

hissab does not move money. Every screen in this section is recording something
that already happened somewhere else, and each one says so in those words. The
disclosure is not fine print at the bottom; it sits next to the amount.
"""

from lib import statusbar, homebar, nav, frame, phone, write, avatar, IC, tick
from comp import (seclabel, card, listcard, nav_row, kv_row, person_row,
                  select_row, search, banner, amount_editor, footer,
                  expense_row, empty, GLYPH)
from s4_expense import sheet, CANCEL, alloc_row


DISCLOSE = ('<p class="t-cap c-sec" style="margin:12px 20px">This records money that changed '
            'hands somewhere else — cash, a bank transfer, anything. hissab does not move '
            'money and never asks for payment details.</p>')


def build():
    # ------------------------------------------------- S01 / S02 / S03 / S04 --
    def settle(body, foot, ttl="Record a payment", tail=""):
        return (statusbar()
                + nav(title=ttl, lead=CANCEL,
                      trail='<span class="act off semi">Save</span>')
                + tail + f'<div class="scroll">{body}</div>' + foot + homebar())

    choose = (statusbar() + nav(title="Settle up", lead=CANCEL)
              + '<div class="scroll">'
              + search("", "Search people")
              + '<p class="t-cap c-sec" style="margin:0 20px 4px">Each balance is settled on its '
              'own. A payment is always in one currency, so USD and PKR are two separate '
              'records even with the same person.</p>'
              + seclabel("You owe", first=True)
              + listcard([
                  select_row("JD", "John Doe", "USD 187.50 · across 3 ledgers", True, tone=2, box=False),
                  select_row("OF", "Omar Farooq", "PKR 12,500 · Lahore trip", False, tone=4, box=False),
              ])
              + seclabel("Owes you", right="You can record these too")
              + listcard([
                  select_row("PN", "Priya Nair", "USD 64.00 · Flat 3B", False, tone=3, box=False),
                  select_row("LT", "Lena Toure", "PKR 3,200 · direct", False, tone=6, box=False),
              ])
              + '</div>'
              + footer('<div class="btn">Continue with John Doe</div>') + homebar())

    def payform(amount, out=None, empty_amt=False, direction="You paid John Doe"):
        return ('<div class="ctx"><span class="who t-supp">Payment · '
                '<b>Records money already paid</b></span></div>'
                + card('<div class="row"><span class="grow"><span class="t-body med">'
                       f'{direction}</span>'
                       '<span class="t-cap c-sec" style="display:block">Tap to reverse the '
                       'direction</span></span>'
                       '<span class="val"><span class="t-supp c-brand semi">Switch</span>'
                       '</span></div>')
                + card(amount_editor("USD", amount, label="Amount paid", empty=empty_amt))
                + card(nav_row("Currency", "USD") + nav_row("Date", "Aug 3, 2026"))
                + seclabel("Balance with John Doe", right="USD")
                + card('<div class="facts" style="padding:12px 16px">'
                       '<div class="f"><span class="k t-body">Before this payment</span>'
                       '<span class="t-body mono c-neg">You owe 187.50</span></div>'
                       + (out or "")
                       + '</div>')
                + DISCLOSE)

    blank_pay = settle(
        payform("", empty_amt=True),
        footer('<div class="btn off">Record payment</div>',
               "Enter an amount above 0.00 to record a payment."))

    partial = settle(
        payform("100.00",
                out='<div class="f"><span class="k t-body">After</span>'
                    '<span class="t-body semi mono c-neg">You owe 87.50</span></div>'),
        footer('<div class="btn">Record payment</div>'))

    exact = settle(
        payform("187.50",
                out='<div class="f"><span class="k t-body">After</span>'
                    '<span class="t-body semi mono c-sec">Settled</span></div>'),
        footer('<div class="btn">Record payment</div>'))

    over_sheet = sheet(
        "More than the balance",
        '<div style="padding:4px 16px 16px">'
        '<p class="t-supp c-sec" style="margin:0">You are recording 250.00 against a balance of '
        '187.50. hissab will not silently absorb the difference, and it will not stop you '
        'either — the extra becomes a credit that reverses the direction.</p></div>'
        + seclabel("What this will do", first=True)
        + card('<div class="facts" style="padding:12px 16px">'
               '<div class="f"><span class="k t-body">Balance now</span>'
               '<span class="t-body mono c-neg">You owe 187.50</span></div>'
               '<div class="f"><span class="k t-body">You are recording</span>'
               '<span class="t-body mono">USD 250.00</span></div>'
               '<div class="f"><span class="k t-body">Balance after</span>'
               '<span class="t-body semi mono c-pos">John Doe owes you 62.50</span></div>'
               '<div class="f"><span class="k t-body">Reason</span>'
               '<span class="t-body" style="text-align:right">Overpaid by 62.50</span></div>'
               '</div>')
        + '<p class="t-cap c-sec" style="margin:12px 20px">If this was a typo, go back and change '
        'the amount. Credits are real balances and someone will have to settle them.</p>',
        '<div style="display:flex;flex-direction:column;gap:8px">'
        '<span class="btn">Record 250.00 and create a credit</span>'
        '<span class="btn sec">Go back and edit the amount</span></div>',
        lead="", trail="")

    overpay = (statusbar()
               + nav(title="Record a payment", lead=CANCEL,
                     trail='<span class="act off semi">Save</span>')
               + '<div class="scroll">' + payform("250.00") + '</div>'
               + '<div class="overlay"></div>' + over_sheet + homebar())

    success = (statusbar() + nav(title="Payment recorded")
               + '<div class="scroll">'
               + '<div class="success">'
               '<div class="mark"><svg viewBox="0 0 24 24"><path d="M3 12.5 9 18.5 21 5.5"/></svg></div>'
               '<div class="t-headline">Payment recorded</div>'
               '<p class="t-supp c-sec" style="margin:8px 0 0">USD 100.00 to John Doe on '
               'Aug 3, 2026. John Doe can see this and can dispute it by editing or deleting '
               'the record.</p></div>'
               + seclabel("Balance with John Doe", first=True)
               + card('<div class="row"><span class="grow"><span class="t-body med">'
                      'John Doe</span><span class="t-cap c-sec" style="display:block">'
                      'US Dollar · was 187.50</span></span>'
                      '<span class="val"><span class="t-cap c-sec" style="display:block">'
                      'You owe</span><span class="t-body semi mono c-neg">USD 87.50</span>'
                      '</span></div>')
               + '</div>'
               + footer('<div style="display:flex;gap:8px">'
                        '<span class="btn out" style="flex:1">View payment</span>'
                        '<span class="btn" style="flex:1">Done</span></div>')
               + homebar())

    write("24-record-settlement.html", "24", "Settle up and record a payment",
          "S01 · S02 · S03 · S04",
          "hissab records payments, it does not make them — the disclosure sits beside the amount "
          "rather than in a footnote. One balance, one currency, one record: a USD and a PKR balance "
          "with the same person are settled separately. Overpayment is allowed but never silent.",
          [
              frame("Choose balance", " Both directions are offered, because recording a payment you "
                                      "<em>received</em> is as common as one you made. Each row names "
                                      "its currency.", phone(choose)),
              frame("Empty amount", " Direction is a labelled control with a Switch affordance, not "
                                    "something inferred from which row was tapped.", phone(blank_pay)),
              frame("Partial payment", " Before and after are both shown, so the user can see that "
                                       "87.50 will remain.", phone(partial)),
              frame("Exact payment", " After reads <em>Settled</em> rather than 0.00, matching the "
                                     "list rule.", phone(exact)),
              frame("Overpayment", " <em>Deliberate confirmation.</em> The resulting credit and the "
                                   "reversed direction are stated as facts, and the escape hatch is "
                                   "the second button.", phone(overpay)),
              frame("Success", " Ends on the resulting balance and says the other person can dispute "
                               "the record.", phone(success)),
          ])

    # ------------------------------------------------------- S07 / S08 / S09 --
    pay_detail_body = (
        '<div style="padding:4px 16px 16px">'
        '<div class="t-cap c-sec">Payment · US Dollar</div>'
        '<div class="t-title" style="margin-top:2px">You paid John Doe</div>'
        '<span class="mt big mono" style="margin-top:6px">'
        '<span class="iso">USD</span><span class="v">100.00</span></span>'
        '<div class="t-cap c-sec" style="margin-top:6px">Aug 3, 2026 · recorded by you</div></div>'
        + seclabel("Parties", first=True)
        + listcard([
            person_row("AR", "Alina Rehman (you)", "Paid",
                       trail='<span class="t-body mono">USD 100.00</span>', tone=6),
            person_row("JD", "John Doe", "Received",
                       trail='<span class="t-body mono">USD 100.00</span>', tone=2),
        ])
        + seclabel("Effect on the balance")
        + card('<div class="facts" style="padding:12px 16px">'
               '<div class="f"><span class="k t-body">Before</span>'
               '<span class="t-body mono">You owed 187.50</span></div>'
               '<div class="f"><span class="k t-body">After</span>'
               '<span class="t-body semi mono c-neg">You owe 87.50</span></div>'
               '</div>')
        + '<p class="t-cap c-sec" style="margin:-4px 20px 0">A payment is not tied to any single '
        'expense. It moves the whole balance with this person in this currency.</p>'
        + seclabel("History")
        + listcard([
            nav_row("Version", "1", chev=False),
            nav_row("Recorded", "Aug 3, 2026 · 9:14 AM · you", chev=False),
            nav_row("Visible to", "John Doe", chev=False),
        ]))

    pay_detail = (statusbar() + nav(back="John Doe",
                                    trail='<span class="act semi">Edit</span>')
                  + f'<div class="scroll">{pay_detail_body}'
                  + '<div style="padding:8px 16px 0"><div class="btn dstr-out">'
                  'Delete payment</div></div></div>' + homebar())

    pay_edit = (statusbar() + nav(title="Edit payment", lead=CANCEL,
                                  trail='<span class="act semi">Save</span>')
                + '<div class="scroll">'
                + card(amount_editor("USD", "120.00", label="Amount paid", caret=False))
                + card(nav_row("Date", "Aug 3, 2026")
                       + nav_row("Direction", "You paid John Doe"))
                + seclabel("What changes", right="Version 1 → 2")
                + card('<div class="facts" style="padding:12px 16px">'
                       '<div class="f"><span class="k t-body">Amount</span>'
                       '<span class="t-body mono">100.00 → 120.00</span></div>'
                       '<div class="f"><span class="k t-body">Balance with John Doe</span>'
                       '<span class="t-body mono c-neg">You owe 87.50 → 67.50</span></div>'
                       '</div>')
                + DISCLOSE
                + '</div>'
                + footer('<div class="btn">Save changes</div>') + homebar(),)

    pay_delete = (statusbar() + nav(back="John Doe")
                  + f'<div class="scroll">{pay_detail_body}</div>'
                  + '<div class="overlay"></div>'
                  + '<div class="dialog stackacts"><div class="dbody">'
                  '<h4>Delete this payment record?</h4>'
                  '<p>Deleting the record does not undo the payment itself. If the money really '
                  'changed hands, the balance will go back to showing a debt that is no longer '
                  'owed.</p>'
                  '<div class="facts">'
                  '<div class="f"><span class="k t-cap">Payment</span>'
                  '<span class="t-cap semi mono">USD 100.00</span></div>'
                  '<div class="f"><span class="k t-cap">Balance with John Doe</span>'
                  '<span class="t-cap semi mono">You owe 87.50 → 187.50</span></div>'
                  '<div class="f"><span class="k t-cap">John Doe</span>'
                  '<span class="t-cap semi">Sees the deletion in Activity</span></div>'
                  '</div></div>'
                  '<div class="dacts"><span class="d">Delete and restore the debt</span>'
                  '<span>Cancel</span></div></div>' + homebar())

    write("25-payment-detail.html", "25", "Payment detail, edit and delete",
          "S07 · S08 · S09",
          "A payment is a record, not a transaction, and the screens keep saying so. Deletion is the "
          "sharpest case: the confirmation refuses to describe it as undoing a payment, because the "
          "cash has already moved and only the bookkeeping is changing.",
          [
              frame("Detail", " Both parties with their role spelled out, and a note that a payment "
                              "settles the balance rather than a particular expense.",
                    phone(pay_detail)),
              frame("Edit", " Before → after including the resulting balance, and the disclosure is "
                            "repeated because the amount is editable here.", phone(pay_edit)),
              frame("Delete review", " States the uncomfortable truth — the debt comes back — instead "
                                     "of a generic 'this cannot be undone'.", phone(pay_delete)),
          ],
          prov="edit-payment concurrency contract is not settled")

    # ------------------------------------------------------------- S05 / S06 --
    remind_body = (
        '<div style="padding:4px 16px 16px;display:flex;gap:14px;align-items:center">'
        + avatar("PN", 3, cls="lg")
        + '<span><span class="t-headline" style="display:block">Priya Nair</span>'
        '<span class="t-cap c-sec">Flat 3B · US Dollar</span></span></div>'
        + seclabel("What they will see", first=True)
        + card('<div class="facts" style="padding:12px 16px">'
               '<div class="f"><span class="k t-body">Balance</span>'
               '<span class="t-body semi mono c-pos">Owes you 64.00</span></div>'
               '<div class="f"><span class="k t-body">Ledger</span>'
               '<span class="t-body">Flat 3B</span></div>'
               '<div class="f"><span class="k t-body">From</span>'
               '<span class="t-body">Alina Rehman</span></div>'
               '</div>')
        + '<p class="t-cap c-sec" style="margin:12px 20px">Reminders carry no message. There is no '
        'field to write one, so a reminder cannot become a place to argue — it only states the '
        'balance that is already visible to both of you.</p>'
        + seclabel("Limits")
        + card(kv_row("Last reminder", "None sent")
               + kv_row("Allowed", "One per balance per day")))

    remind = (statusbar() + nav(title="Send a reminder", lead=CANCEL)
              + f'<div class="scroll">{remind_body}</div>'
              + footer('<div class="btn">Send reminder</div>') + homebar())

    sent = (statusbar() + nav(title="Reminder sent")
            + '<div class="scroll"><div class="success">'
            '<div class="mark"><svg viewBox="0 0 24 24"><path d="M3 12.5 9 18.5 21 5.5"/></svg></div>'
            '<div class="t-headline">Reminder sent</div>'
            '<p class="t-supp c-sec" style="margin:8px 0 0">Priya Nair has been notified about the '
            'USD 64.00 balance in Flat 3B. You can send another tomorrow.</p></div></div>'
            + footer('<div class="btn sec">Done</div>') + homebar())

    limited = (statusbar() + nav(title="Send a reminder", lead=CANCEL)
               + '<div class="scroll">'
               + banner("Already reminded today",
                        "You sent a reminder about this balance at 8:12 AM. The next one can go "
                        "out tomorrow. The limit is per balance, so other people are unaffected.",
                        kind="w")
               + remind_body + '</div>'
               + footer('<div class="btn off">Send reminder</div>',
                        "Next reminder for this balance is available tomorrow.",
                        kind="warn")
               + homebar())

    unavailable = (statusbar() + nav(title="Send a reminder", lead=CANCEL)
                   + '<div class="scroll">'
                   + banner("Reminders are off for Priya Nair",
                            "They have turned off reminder notifications. The balance is still "
                            "visible to them in the app, and settling up is unaffected.",
                            kind="e")
                   + remind_body + '</div>'
                   + footer('<div class="btn off">Send reminder</div>',
                            "This person does not accept reminders.")
                   + homebar())

    write("26-reminders.html", "26", "Reminder review and result", "S05 · S06",
          "A reminder is a notification with no message field, on purpose: without one there is "
          "nothing to escalate. The screen shows exactly what the recipient will see, and the rate "
          "limit is stated before the tap rather than after it.",
          [
              frame("Review", " Everything the other person will see, and an explicit note that no "
                              "message can be attached.", phone(remind)),
              frame("Sent", " Says when the next one is possible, so nobody taps twice.", phone(sent)),
              frame("Rate limited", " <em>Blocked action with explanation.</em> Names the earlier send "
                                    "time and scopes the limit to this balance.", phone(limited)),
              frame("Unavailable", " The recipient's choice is respected and the alternative — they "
                                   "can still see and settle the balance — is stated.",
                    phone(unavailable)),
          ])
