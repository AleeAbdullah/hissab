"""§1 Authentication — A01, A02, A04, A05, A06.

Email verification and the post-registration profile wizard are not designed:
the register form collects default currency and timezone directly and lands on
the Friends tab.
"""

from lib import statusbar, homebar, nav, frame, phone, write, money, tick

FIELDS_BG = "background:var(--canvas)"


def auth_phone(body):
    return phone(body, "brand auth")


def auth_nav():
    return nav(title=lockup(), back="")


def lockup(hero=False):
    size = " hero" if hero else ""
    return (f'<div class="auth-lockup{size}"><span class="auth-wordmark">Hissab</span>'
            '<span class="auth-mark" aria-hidden="true"><i></i><i></i><i></i><b></b></span></div>')


def bullet(head, body):
    return (f'<div class="auth-principle">'
            f'<span class="auth-principle-mark"><i></i></span>'
            f'<span><span class="t-body semi" style="display:block">{head}</span>'
            f'<span class="t-supp c-sec">{body}</span></span></div>')


def build():
    # ---------------------------------------------------------------- A01 -----
    welcome = statusbar() + f'''
<div class="scroll pad auth-welcome" style="display:flex;flex-direction:column">
  <div style="height:46px"></div>
  {lockup(hero=True)}
  <div class="auth-rule"></div>
  <div class="auth-kicker">CALM LEDGER. CLEAR RELATIONSHIPS.</div>
  <div class="auth-welcome-title">Keep the record clear.</div>
  <div class="t-supp c-sec" style="margin:8px 0 32px">
    Shared expenses, and exactly who owes whom.
  </div>
  {bullet("Split what you actually paid", "One payer or several. Equal or exact amounts, down to the cent.")}
  {bullet("Balances stay per currency", "USD and PKR are never added together into one number.")}
  {bullet("Record settlements you made elsewhere", "Cash, bank transfer, anything. hissab keeps the record.")}
  <div style="margin-top:auto"></div>
  <div class="auth-actions"><div class="btn" style="margin-bottom:10px">Create account</div>
  <div class="btn sec">Sign in</div></div>
  <p class="auth-legal t-cap c-sec">
    hissab records money that has already moved. It never transfers funds, links a bank
    account, or touches a card.
  </p>
</div>''' + homebar()

    write("01-welcome.html", "01", "Welcome", "A01",
          "First run. Says what the product does and, just as importantly, what it does not do — "
          "the &ldquo;records money; does not transfer it&rdquo; disclosure sits with the actions rather than "
          "buried in a legal screen, because it is the single most common misunderstanding of this category.",
          [frame("Default", " Only state this screen has. No tab bar: the five-tab shell exists "
                            "only once signed in.", auth_phone(welcome))])

    # ---------------------------------------------------------------- A02 -----
    def register(name="", email="", pw="", err=None, saving=False):
        def f(label, value, placeholder, err_msg=None, hint=None, trail=""):
            cls = " err" if err_msg else ""
            shown = (f'<span class="t-body">{value}</span>' if value
                     else f'<span class="t-body ph">{placeholder}</span>')
            e = f'<div class="ferr t-cap">{err_msg}</div>' if err_msg else ""
            h = f'<span class="fhint t-cap">{hint}</span>' if hint else ""
            return (f'<div class="field{cls}"><span class="flbl t-cap">{label}</span>'
                    f'<div class="fval">{shown}{trail}</div>{e}{h}</div>')

        dim = 'style="opacity:.5"' if saving else ""
        btn = ('<div class="btn off spin">Creating account…</div>' if saving
               else '<div class="btn">Create account</div>')
        return statusbar() + auth_nav() + f'''
<div class="scroll" {dim}>
  <div class="auth-page-head">
    <div class="t-large">Create account</div>
    <div class="t-supp c-sec" style="margin-top:4px">Your default currency and timezone can be changed later in Account.</div>
  </div>
  <div class="card">
    {f("Display name", name, "How friends will see you")}
    {f("Email", email, "you@example.com", err_msg=(err if err == "That email is already registered. Sign in instead?" else None))}
    {f("Password", pw, "Create a password",
       err_msg=(err if err and "character" in err else None),
       hint=(None if err else "At least 12 characters. No other restrictions."))}
  </div>
  <div class="card">
    {f("Default currency", "US Dollar · USD" if name else "", "Choose a currency", trail='<span style="margin-left:auto"></span>')}
    {f("Timezone", "Asia/Karachi · GMT+5" if name else "", "Choose a timezone")}
  </div>
  <div class="auth-actions">{btn}</div>
  <p class="auth-legal t-cap c-sec">
    By creating an account you agree to the Terms and Privacy Policy.
  </p>
</div>''' + homebar()

    write("02-register.html", "02", "Register", "A02",
          "One form, no wizard. Default currency and timezone are collected here because every balance in "
          "the product is currency-scoped and every timestamp is shown in local time — neither can be "
          "deferred. Password rule is stated up front, not revealed by rejection.",
          [
              frame("Empty", " Requirements visible before the user types, so the rule is never a surprise.",
                    auth_phone(register())),
              frame("Invalid field", " Server-side rejection. The offending field tints, keeps its value, "
                                     "and states the fix; the rest of the form is untouched.",
                    auth_phone(register("Alina Rehman", "sam@example.com", "••••••••••",
                                   err="That email is already registered. Sign in instead?"))),
              frame("Saving", " Duplicate submission disabled: the action becomes non-interactive and "
                              "announces what it is doing rather than just spinning.",
                    auth_phone(register("Alina Rehman", "alina@example.com", "••••••••••", saving=True))),
          ])

    # ---------------------------------------------------------------- A04 -----
    def signin(err=None, offline=False):
        banner = ""
        if err:
            banner = (f'<div class="banner e"><span class="ic">!</span>'
                      f'<span class="bt t-supp">{err}</span></div>')
        if offline:
            banner = ('<div class="banner e"><span class="ic">!</span>'
                      '<span class="bt t-supp"><span class="h">No connection</span>'
                      'Signing in needs a connection. Nothing has been sent.</span>'
                      '<span class="ba t-supp">Retry</span></div>')
        btn = ('<div class="btn off">Sign in</div>' if offline
               else '<div class="btn">Sign in</div>')
        reason = ('<div class="reason" style="padding:0 2px 10px"><span class="gl"></span>'
                  '<span class="txt t-cap">Reconnect to sign in.</span></div>' if offline else "")
        return statusbar() + auth_nav() + f'''
<div class="scroll">
  <div class="auth-page-head"><div class="t-large">Sign in</div></div>
  {banner}
  <div class="card">
    <div class="field"><span class="flbl t-cap">Email</span>
      <div class="fval"><span class="t-body">alina@example.com</span></div></div>
    <div class="field"><span class="flbl t-cap">Password</span>
      <div class="fval"><span class="t-body">{"••••••••••" if not err else "••••••"}</span><span class="caret"></span></div></div>
  </div>
  <div class="auth-actions">{reason}{btn}</div>
  <div class="auth-text-action">
    <span class="t-body c-brand semi">Forgot password?</span>
  </div>
</div>''' + homebar()

    write("03-sign-in.html", "03", "Sign in", "A04",
          "Credential-first, two fields, recovery one tap away. The failure message is deliberately "
          "non-enumerating — it never reveals whether the email exists.",
          [
              frame("Filled", " Caret on the focused field. Forgot password is a peer of the action, "
                              "not hidden in a menu.", auth_phone(signin())),
              frame("Rejected", " One message for both wrong email and wrong password, so the screen "
                                "cannot be used to discover who has an account.",
                    auth_phone(signin(err="Email or password is incorrect."))),
              frame("Offline", " Connectivity is required. The action disables and the reason sits "
                               "adjacent to it — the same pattern the expense editor uses.",
                    auth_phone(signin(offline=True))),
          ])

    # ------------------------------------------------------------ A05/A06 -----
    request = statusbar() + auth_nav() + '''
<div class="scroll">
  <div class="auth-page-head">
    <div class="t-large">Reset password</div>
    <div class="t-supp c-sec" style="margin-top:6px">Enter the email on your account and we will send a link to set a new password.</div>
  </div>
  <div class="card">
    <div class="field"><span class="flbl t-cap">Email</span>
      <div class="fval"><span class="t-body">alina@example.com</span><span class="caret"></span></div></div>
  </div>
  <div class="auth-actions"><div class="btn">Send reset instructions</div></div>
</div>''' + homebar()

    sent = statusbar() + auth_nav() + '''
<div class="scroll">
  <div class="success">
    <div class="mark"><svg viewBox="0 0 24 24"><path d="M3 12.5 9 18.5 21 5.5"/></svg></div>
    <div class="t-headline">Instructions requested</div>
    <p class="t-supp c-sec" style="margin:8px 0 0">
      If an account exists for <span class="c-pri semi">alina@example.com</span>, a reset link is on
      its way. The link expires in 60 minutes.
    </p>
    <p class="t-cap c-sec" style="margin:16px 0 0">
      We do not confirm whether an email is registered.
    </p>
  </div>
  <div class="auth-actions stack"><div class="btn sec">Back to sign in</div></div>
</div>''' + homebar()

    def setnew(expired=False):
        if expired:
            return statusbar() + auth_nav() + '''
<div class="scroll">
  <div class="auth-page-head"><div class="t-large">Link expired</div></div>
  <div class="banner e"><span class="ic">!</span><span class="bt t-supp">
    <span class="h">This reset link is no longer valid</span>
    Reset links expire 60 minutes after they are requested, and can only be used once.
  </span></div>
  <div class="auth-actions stack">
    <div class="btn" style="margin-bottom:10px">Request a new link</div>
    <div class="btn sec">Back to sign in</div>
  </div>
</div>''' + homebar()
        return statusbar() + auth_nav() + '''
<div class="scroll">
  <div class="auth-page-head">
    <div class="t-large">Set new password</div>
    <div class="t-supp c-sec" style="margin-top:6px">Signing in again will be required on every device.</div>
  </div>
  <div class="card">
    <div class="field"><span class="flbl t-cap">New password</span>
      <div class="fval"><span class="t-body">••••••••••••</span></div>
      <span class="fhint t-cap">At least 12 characters.</span></div>
    <div class="field"><span class="flbl t-cap">Confirm new password</span>
      <div class="fval"><span class="t-body">••••••••••••</span><span class="caret"></span></div></div>
  </div>
  <div class="auth-actions"><div class="btn">Save new password</div></div>
</div>''' + homebar()

    write("04-password-recovery.html", "04", "Password recovery", "A05 · A06",
          "Four frames covering both surfaces of one flow. The confirmation is written to be true whether "
          "or not the account exists, which is why it says &ldquo;requested&rdquo; rather than &ldquo;sent&rdquo;.",
          [
              frame("Request reset", " A05. One field, one action.", auth_phone(request)),
              frame("Requested", " A05 confirmation. Neutral by design, and states the expiry so the "
                                 "user knows the window.", auth_phone(sent)),
              frame("Set new password", " A06. Warns that all sessions end before the user commits, "
                                        "not after.", auth_phone(setnew())),
              frame("Expired link", " A06 failure. Explains why rather than just refusing, and offers "
                                    "the recovery path.", auth_phone(setnew(expired=True))),
          ])
