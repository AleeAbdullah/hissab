# Hissab public website

Static Next.js marketing, Help, Privacy, and Terms site. It has no API or authenticated product surface.

```bash
pnpm install
pnpm dev
pnpm build
pnpm type-check
pnpm lint
```

## Publication checklist

- [ ] Replace every legal placeholder with counsel-approved Privacy and Terms copy.
- [ ] Confirm the responsible entity, support and privacy contacts, jurisdiction, eligibility rules, effective dates, and change-notice language.
- [ ] Add the approved current-app screenshot set described in `docs/public-website-design.md`.
- [ ] Add App Store and Google Play listings, then replace pending controls with official store badges.
- [ ] Approve the canonical public HTTPS URLs for `/privacy/`, `/terms/`, and `/help/`.
- [ ] Review the final copy against Hissab’s implemented data handling and account lifecycle.
- [ ] Remove both Metadata API `noindex` directives and the `X-Robots-Tag` header only after approval.
- [ ] Set the Vercel project root to `web`, preview-deploy, and verify routes, headers, mobile layouts, keyboard focus, dark mode, and reduced motion.
- [ ] Link approved Privacy and Terms URLs from the mobile registration screen.

Keep `legal-site/` until the preview deployment passes the cutover checks. It contains the currently deployed publication safeguards.
