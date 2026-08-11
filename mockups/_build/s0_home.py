"""§0 Home — a neutral entry point for Personal and Shared money.

This is deliberately a content-and-hierarchy concept only. Navigation is being
finalized separately, so the screen has no tab bar or global create affordance.
"""

from lib import IC, frame, homebar, largetitle, phone as frame_phone, statusbar, write
from comp import card, seclabel


def phone(body, cls=""):
    return frame_phone(body, f"brand home {cls}".strip())


def summary_cards():
    return (
        '<div class="home-cards">'
        '<div class="home-card personal">'
        '<div class="home-card-top"><span><span class="t-headline" style="display:block">Personal</span>'
        '<span class="t-cap c-sec">This month · net cash flow</span></span>' + IC["chev"] + '</div>'
        '<span class="mt mono c-pos home-money"><span class="iso">$</span><span class="v">12,480</span></span>'
        '</div>'
        '<div class="home-card shared">'
        '<div class="home-card-top"><span><span class="t-title" style="display:block">Shared</span>'
        '<span class="t-supp">Across friends and groups</span></span>' + IC["chev"] + '</div>'
        '<div class="home-shared-balance"><span class="home-direction">You’re owed</span>'
        '<span class="mt mono home-money"><span class="iso">$</span><span class="v">3,200</span></span></div>'
        '<div class="home-card-pills"><span>2 unsettled ledgers</span><span>4 people</span></div>'
        '</div>'
        '</div>'
    )


def activity_row(tag, title, meta, amount, kind="", first=False):
    first_cls = " first" if first else ""
    return (
        f'<div class="home-activity{first_cls}">'
        f'<span class="home-tag {tag.lower()}">{tag}</span>'
        f'<span class="grow"><span class="t-body med">{title}</span>'
        f'<span class="t-cap c-sec" style="display:block;margin-top:1px">{meta}</span></span>'
        f'<span class="home-activity-value {kind}">{amount}</span>'
        '</div>'
    )


def build():
    content = (
        summary_cards()
        + seclabel("Recent activity")
        + card(
            activity_row("Personal", "Groceries", "Today · Food & Drink", "$2,250", "expense", True)
            + activity_row("Shared", "Sam added Dinner", "Today · Friends Trip", "$1,800", "neutral")
            + activity_row("Personal", "Salary", "Yesterday · Income", "$86,000", "income")
            + activity_row("Shared", "You settled with John", "Yesterday · Direct ledger", "$1,200", "neutral")
            + activity_row("Shared", "Priya added Groceries", "Aug 4 · Flat 3B", "$640", "neutral")
        )
        + '<p class="home-footnote t-cap c-sec">Personal entries are private. Shared activity is visible only to the people in that ledger.</p>'
    )

    primary = statusbar() + largetitle("Home", trail='<span class="home-wordmark">Hissab</span>') \
        + f'<div class="scroll home-scroll">{content}</div>' + homebar()

    write(
        "00-home.html", "00", "Home", "H01",
        "A neutral overview of Hissab’s two equal contexts. Personal and Shared use the same card grammar, "
        "but retain different financial meanings. Amounts use this viewer’s Account symbol without conversion. "
        "Navigation and creation controls are intentionally deferred.",
        [
            frame(
                "Primary concept",
                "The two cards are the home’s first decision: <em>Personal</em> shows monthly net cash flow; "
                "<em>Shared</em> shows one directional net balance. The five recent rows mix contexts but name "
                "them on every row.",
                phone(primary),
            )
        ],
        prov="Home is a design concept; its navigation and combined feed contract are not implemented",
    )
