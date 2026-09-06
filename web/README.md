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

- [x] Replace every legal placeholder with owner-approved Privacy and Terms copy.
- [ ] Have qualified legal counsel review the Privacy Policy and Terms before broad release.
- [x] Confirm the responsible entity, support and privacy contacts, jurisdiction, eligibility rules, effective dates, and change-notice language.
- [ ] Add the approved current-app screenshot set described in `docs/public-website-design.md`.
- [ ] Add App Store and Google Play listings, then replace pending controls with official store badges.
- [x] Approve the canonical public HTTPS URLs for `/privacy/`, `/terms/`, `/help/`, and `/delete-account/`.
- [x] Review the final copy against Hissab’s implemented data handling and account lifecycle.
- [x] Remove the Metadata API `noindex` directives and `X-Robots-Tag` header after owner approval.
- [x] Set the Vercel project root to `web`, deploy, and verify routes, headers, mobile layouts, keyboard focus, dark mode, and reduced motion.
- [x] Link approved Privacy and Terms URLs from the mobile registration and Account screens.
- [ ] Name the production application/database providers in the Privacy Policy after hosting is finalized.

`legal-site/` is no longer deployed. It may be removed once deletion is explicitly approved.
