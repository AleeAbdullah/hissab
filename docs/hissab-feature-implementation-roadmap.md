# Hissab feature implementation roadmap

Baseline: `feature/complete-hissab-features` at `52c75a7` on 2026-08-12. Claims below were rechecked against the shared checkout; paused-worktree diffs are references only.

## Consolidated status

| Feature | Scope | Dependency / decision | Status |
|---|---|---|---|
| Password-reset email | Deliver the existing reset token through a real email outbox handler | Explicitly paused; approved sender, transport, template, and public reset link/config are absent | **Paused** |
| Receipt attachments | Private receipt upload/read/delete for shared expenses and personal transactions | Product approved; production object-storage provider and private bucket/region remain unselected | **Planned; provider decision required** |
| Debt simplification | Deterministic read-only payment suggestions from authoritative member balances | Existing `GET /v1/ledgers/:ledgerId/balances` | **Integrated; verification pending** |
| Standalone expense pickers | Remove four unreferenced placeholder routes; keep the complete inline editor | None | **Integrated; verification pending** |
| Public legal site | Static Home, Privacy, Terms, and Help routes for Vercel | Approved legal/support copy, entity/contact facts, dates, and canonical URLs | **Shell integrated; content and deploy pending** |
| Mobile legal links | Accessible Privacy and Terms links in registration | Canonical public HTTPS URLs | **Blocked by URLs** |

## Integration order

1. Verify the picker deletion and debt simplification now integrated in this branch.
2. Verify the dependency-free legal site locally; keep it noindex and undeployed.
3. Choose the receipt object-storage provider, then implement backend routes before mobile attachment UI.
4. Resume password-reset delivery only on explicit direction and after email/link configuration is approved.
5. Add mobile legal links only after the legal copy is approved, deployed, and assigned canonical URLs.

## Receipt attachment implementation plan

No object-storage provider, bucket, or storage credentials exist in repository configuration. Nest’s installed Express platform provides multipart parsing, but it is not durable storage. Recommended shape: a **private object store with S3-compatible semantics**, accessed only by the backend; the production vendor must be explicitly selected.

### Backend and storage

1. Update `AGENTS.md` to reflect the product-owner approval before implementation. Preserve the rule that receipts never affect financial validity or immutable ledger postings.
2. Add storage configuration for provider endpoint/region, private bucket, and credentials. Keep object keys opaque and server-generated; never expose a public bucket URL.
3. Add an attachment module around the existing `attachments` table. Extend metadata only where required for original filename, checksum, lifecycle status/deleted time, and safe reconciliation.
4. Upload through an authenticated multipart endpoint after the parent expense or personal transaction exists. Stream to storage; do not buffer whole files or persist mobile file URIs.
5. Accept JPEG and PNG initially, enforce a 10 MiB per-file limit and five receipts per parent, verify magic bytes against declared MIME, compute SHA-256, and reject empty/mismatched content. Return a stable attachment DTO, never an object key or storage credential.
6. Insert metadata only after a successful object write. If the database write fails, delete the orphan best-effort and enqueue reconciliation/cleanup rather than compromising the parent financial record.
7. Download through an authenticated API that reuses the parent record’s read authorization, streams the private object, sets `Content-Disposition: attachment`, and uses `X-Content-Type-Options: nosniff`.
8. Upload/delete permissions follow the parent mutation boundary: the shared-expense creator may attach/remove its receipts; the personal-transaction owner may attach/remove theirs. Read permission exactly matches parent read permission.
9. Delete by tombstoning metadata first and scheduling idempotent object deletion. Missing objects are treated as already deleted; failed storage deletion is retried without restoring attachment visibility.

### API and client

1. Add list/upload/download/delete routes with authentication, idempotency on mutations, Swagger contracts, and generated client updates. Attachment operations remain separate from expense/transaction creation so a failed upload never puts the financial save in doubt.
2. Add the Expo-managed image picker only when implementation starts; no selection dependency is installed today. Upload after the parent save, show progress/retry/remove states, and keep failed uploads as local retry state rather than queued financial writes.
3. Replace the receipt Coming Later route only when upload, retry, download, and delete all work against real backend data. Integrate receipt summaries in shared-expense and personal-transaction detail/edit flows.
4. Include accessible filename/type/size/status text, permission explanations, and non-color failure states. Do not launch a simulator as part of command-line verification.

### Focused checks

- Backend: MIME/signature and size/count validation; parent authorization; creator/owner mutation rules; idempotent upload/delete; metadata/object cleanup on partial failure; authenticated streaming headers; missing-object behavior.
- Client: picker cancel, progress, retry, remove, parent-save independence, expired-session recovery, and query invalidation.
- Manual: camera/library permissions and upload/download/delete on available iOS and Android targets.

Exact remaining storage decision: select the production object-storage provider and approve its private bucket/region. No vendor has been chosen in code or this roadmap.

## Verified feature notes

### Password reset

The frontend already calls `POST /auth/password/forgot` with enumeration-safe copy. The backend creates a 60-minute token and enqueues `auth.password_reset_requested`, but no email handler, transport, sender identity, template, or public reset link configuration exists. Do not resume until explicitly requested.

### Debt simplification

The backend DTO exposes stable user IDs, display names, and signed `netMinor` values. The client calculation rejects a nonzero ledger sum, deterministically matches debtors to creditors, and never writes a settlement or changes ledger history. Run `pnpm check:simplify` plus the standard frontend checks, then manually verify settled, two-party, multi-party, archived, loading, and error states.

### Standalone pickers

Repository searches found no callers for `payers`, `split`, `ledger-picker`, or `category-picker`. Category, multiple payer amounts, participant selection, and Equal/Exact splits already work inline in `expense-editor.tsx`; deletion is the smallest honest fix.

### Legal site and links

`legal-site/` is a separate dependency-free static frontend targeting Vercel. Its oversized editorial sections and numbered rhythm are inspired by ScoopCodes, translated to Hissab’s Copper/Paper tokens. It includes responsive layouts, skip links, keyboard focus, dark mode, reduced motion, route-specific titles, and both HTML/header noindex protection. It intentionally contains no policy claims, entity/contact facts, dates, or canonical URLs. Do not deploy or link the mobile app until the checklist in `legal-site/README.md` is complete.

## Release gate

- [ ] Run `pnpm check:simplify`, `pnpm api:generate`, `pnpm type-check`, `pnpm lint`, and `pnpm check:refresh` from `code/fe`.
- [ ] Verify all four legal-site routes and noindex headers from a local static server.
- [ ] Re-run the user-facing placeholder search; only explicitly paused, pending-content, or backend-gated states should remain.
- [ ] Manually verify changed mobile flows on available iOS and Android targets.
- [ ] Keep password email delivery paused and mobile legal links gated by canonical URLs.
