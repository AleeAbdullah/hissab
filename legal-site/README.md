# Hissab legal site

Dependency-free static public-information frontend for a future Vercel project. Preview locally from this directory with `python3 -m http.server 4173`; no build step is required.

## Content and deployment checklist

- [ ] Replace every preview/placeholder block with counsel-approved Privacy, Terms, and Help copy.
- [ ] Confirm the responsible legal entity, support/privacy contacts, jurisdictions, eligibility rules, effective dates, and change-notice language.
- [ ] Approve canonical public HTTPS URLs for `/privacy/`, `/terms/`, and `/help/`.
- [ ] Review the final copy for consistency with Hissab’s implemented data handling and account lifecycle.
- [ ] Remove both HTML `noindex` directives and the Vercel `X-Robots-Tag` header only after approval.
- [ ] Set the Vercel project root to `legal-site`, preview-deploy, and check all routes, headers, mobile layouts, keyboard focus, dark mode, and reduced motion.
- [ ] Link the approved canonical Privacy and Terms URLs from the mobile registration screen.

No deploy is performed by this repository change.
