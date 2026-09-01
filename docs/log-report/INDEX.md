# Implementation Log — Index

> Chronological record of every task merged to main. Newest first.
> Auto-generated — do not hand-edit. Each report answers: what, why, what was done, verification.

| Date | Type | Task | Report |
|---|---|---|---|
| 2026-09-02 | Bugfix | fix: Sentry init + backup auth resilience | [3f07f6f5a](2026-09-02-3f07f6f5a-sentry-init-backup-auth-resilience.md) |
| 2026-09-02 | Bugfix | fix: backup script uses pooler URL (IPv4) on Render, not direct (IPv6) | [9dfdec01d](2026-09-02-9dfdec01d-backup-script-uses-pooler-url-ipv4-on-render-not.md) |
| 2026-09-02 | Bugfix | fix: add missing auth.createAccount translation key | [70fe0d10d](2026-09-02-70fe0d10d-add-missing-auth-createaccount-translation-key.md) |
| 2026-09-01 | Bugfix | fix: resolve test failures + WCAG accessibility fixes | [d413f7445](2026-09-01-d413f7445-resolve-test-failures-wcag-accessibility-fixes.md) |
| 2026-09-01 | Maintenance | Merge pull request #11 from sentflix01/dependabot/npm_and_yarn/backend/bullmq-6.1.2 | [d18de0c9c](2026-09-01-d18de0c9c-merge-pull-request-11-from-sentflix01-dependabot.md) |
| 2026-09-01 | Maintenance | Merge pull request #10 from sentflix01/dependabot/npm_and_yarn/backend/ioredis-6.0.0 | [e782e36c4](2026-09-01-e782e36c4-merge-pull-request-10-from-sentflix01-dependabot.md) |
| 2026-09-01 | Maintenance | Merge pull request #9 from sentflix01/dependabot/npm_and_yarn/backend/stripe-22.5.0 | [573ad6df1](2026-09-01-573ad6df1-merge-pull-request-9-from-sentflix01-dependabot-.md) |
| 2026-09-01 | Maintenance | Merge pull request #18 from sentflix01/dependabot/npm_and_yarn/frontend-next/minor-and-patch-6532b6660c | [9cb386801](2026-09-01-9cb386801-merge-pull-request-18-from-sentflix01-dependabot.md) |
| 2026-09-01 | Bugfix | fix(backup): correct Supabase pooler → direct URL conversion for pg_dump | [26cd5a069](2026-09-01-26cd5a069-correct-supabase-pooler-direct-url-conversion-fo.md) |
| 2026-09-01 | Bugfix | fix(db): force IPv4, detect Supabase pooler for pgbouncer and SSL — fixes Render IPv6 ENETUNREACH | [ecccc5e71](2026-09-01-ecccc5e71-force-ipv4-detect-supabase-pooler-for-pgbouncer-.md) |
| 2026-09-01 | Bugfix | fix: workflow loop, Supabase migration, gitignore cleanup | [1685c242e](2026-09-01-1685c242e-workflow-loop-supabase-migration-gitignore-clean.md) |
| 2026-09-01 | Maintenance | chore: gitignore qa-screenshots, temp files, archives, generated files — reduce repo size | [c0fa51313](2026-09-01-c0fa51313-gitignore-qa-screenshots-temp-files-archives-gen.md) |
| 2026-09-01 | Bugfix | fix(infra): broaden db ignore to backend/db/**, harden check-supabase exit codes, fix stale Neon/Railway labels in env examples | [ed7c782b1](2026-09-01-ed7c782b1-broaden-db-ignore-to-backend-db-harden-check-sup.md) |
| 2026-09-01 | Bugfix | fix(infra): rename check-neon to check-supabase, add backend/db migrate paths-ignore | [884e2a41b](2026-09-01-884e2a41b-rename-check-neon-to-check-supabase-add-backend-.md) |
| 2026-09-01 | Bugfix | fix(infra): replace Neon with Supabase, fix stale Railway comment in deploy | [fd0ea43ab](2026-09-01-fd0ea43ab-replace-neon-with-supabase-fix-stale-railway-com.md) |
| 2026-09-01 | Bugfix | fix(actions): add check-skip job, fix glob to **/*.md, guard all CI jobs | [30aa9caa4](2026-09-01-30aa9caa4-add-check-skip-job-fix-glob-to-md-guard-all-ci-j.md) |
| 2026-09-01 | Bugfix | fix: stop CI/docs-sync loop — glob depth, actor guards, docs-only path guard | [e60e70ce9](2026-09-01-e60e70ce9-stop-ci-docs-sync-loop-glob-depth-actor-guards-d.md) |
| 2026-09-01 | Feature | feat: optimize CI/CD minute spend — audit without npm ci, reduce healthcheck retries, remove dead docs-sync job | [562ff8e96](2026-09-01-562ff8e96-optimize-ci-cd-minute-spend-audit-without-npm-ci.md) |
| 2026-09-01 | CI/CD | ci: reduce GitHub Actions minute burn | [43c6ab53c](2026-09-01-43c6ab53c-reduce-github-actions-minute-burn.md) |
| 2026-09-01 | Bugfix | fix(a11y): add alt text to 18 images + labels to 3 inputs | [6d6188dda](2026-09-01-6d6188dda-add-alt-text-to-18-images-labels-to-3-inputs.md) |
| 2026-09-01 | Bugfix | fix(a11y): WCAG quick wins — skip link + aria-labels | [7b8de1357](2026-09-01-7b8de1357-wcag-quick-wins-skip-link-aria-labels.md) |
| 2026-08-31 | Feature | feat: DB-driven sitemap for SEO | [fd25773c8](2026-08-31-fd25773c8-db-driven-sitemap-for-seo.md) |
| 2026-08-31 | Feature | feat(auth): implement account lockout (5 fails → 15min) | [f704bc4fc](2026-08-31-f704bc4fc-implement-account-lockout-5-fails-15min.md) |
| 2026-08-31 | Testing | test: fix auth test for is_banned query change | [09d2627c0](2026-08-31-09d2627c0-fix-auth-test-for-is-banned-query-change.md) |
| 2026-08-31 | Bugfix | fix: Next.js 16.3 compatibility after Dependabot merges | [6eb2fbf85](2026-08-31-6eb2fbf85-next-js-16-3-compatibility-after-dependabot-merg.md) |
| 2026-08-31 | Maintenance | chore(deps): bump the minor-and-patch group across 1 directory with 46 updates | [bd6aab8d0](2026-08-31-bd6aab8d0-bump-the-minor-and-patch-group-across-1-director.md) |
| 2026-08-31 | Maintenance | chore(deps): bump bullmq from 5.79.2 to 6.3.1 in /backend | [3d2ea39c7](2026-08-31-3d2ea39c7-bump-bullmq-from-5-79-2-to-6-3-1-in-backend.md) |
| 2026-08-31 | Maintenance | merge: dependabot @types/node ^20→^26 (type definitions only) | [d62bbf7cf](2026-08-31-d62bbf7cf-dependabot-types-node-20-26-type-definitions-onl.md) |
| 2026-08-31 | Maintenance | Merge remote-tracking branch 'origin/dependabot/npm_and_yarn/backend/multi-6d7db9f379' | [537c2115c](2026-08-31-537c2115c-merge-remote-tracking-branch-origin-dependabot-n.md) |
| 2026-08-31 | Maintenance | merge: dependabot actions/setup-node v4→v7 | [2df7de7b0](2026-08-31-2df7de7b0-dependabot-actions-setup-node-v4-v7.md) |
| 2026-08-31 | Maintenance | Merge remote-tracking branch 'origin/dependabot/github_actions/actions/checkout-7' | [38b13819e](2026-08-31-38b13819e-merge-remote-tracking-branch-origin-dependabot-g.md) |
| 2026-08-31 | Maintenance | merge: dependabot frontend minor/patch (43 safe updates) | [babd5120d](2026-08-31-babd5120d-dependabot-frontend-minor-patch-43-safe-updates.md) |
| 2026-08-31 | Documentation | docs: fix 15 inaccuracies found in deep audit | [1f79441d2](2026-08-31-1f79441d2-fix-15-inaccuracies-found-in-deep-audit.md) |
| 2026-08-31 | Bugfix | fix: scorecard accuracy + remove SVG MIME residual | [e182ce618](2026-08-31-e182ce618-scorecard-accuracy-remove-svg-mime-residual.md) |
| 2026-08-31 | Bugfix | fix: deep security audit of login and signup auth flows | [2612b4319](2026-08-31-2612b4319-deep-security-audit-of-login-and-signup-auth-flo.md) |
| 2026-08-31 | Maintenance | chore(deps): bump bcryptjs and @types/bcryptjs in /backend | [97cc5bef1](2026-08-31-97cc5bef1-bump-bcryptjs-and-types-bcryptjs-in-backend.md) |
| 2026-08-31 | Maintenance | chore(deps): bump stripe from 14.21.0 to 22.6.0 in /backend | [b2e7adc33](2026-08-31-b2e7adc33-bump-stripe-from-14-21-0-to-22-6-0-in-backend.md) |
| 2026-08-31 | Maintenance | chore(deps): bump ioredis from 5.11.1 to 6.0.0 in /backend | [3a9cb2234](2026-08-31-3a9cb2234-bump-ioredis-from-5-11-1-to-6-0-0-in-backend.md) |
| 2026-08-31 | Maintenance | Merge pull request #7 from sentflix01/dependabot/npm_and_yarn/backend/minor-and-patch-b846c7223c | [5b88778e8](2026-08-31-5b88778e8-merge-pull-request-7-from-sentflix01-dependabot-.md) |
| 2026-08-31 | Maintenance | Merge pull request #15 from sentflix01/dependabot/npm_and_yarn/frontend-next/typescript-7.0.2 | [567ce4a0d](2026-08-31-567ce4a0d-merge-pull-request-15-from-sentflix01-dependabot.md) |
| 2026-08-31 | Maintenance | Merge pull request #16 from sentflix01/dependabot/npm_and_yarn/frontend-next/framer-motion-13.1.0 | [0cc96863c](2026-08-31-0cc96863c-merge-pull-request-16-from-sentflix01-dependabot.md) |
| 2026-08-31 | Maintenance | design: Redesign sign-up page to professional Google-style | [1d71c83d7](2026-08-31-1d71c83d7-redesign-sign-up-page-to-professional-google-sty.md) |
| 2026-08-31 | Bugfix | fix: Remove email pre-fill on sign-up page | [b95762f5e](2026-08-31-b95762f5e-remove-email-pre-fill-on-sign-up-page.md) |
| 2026-08-31 | Bugfix | fix: Allow Google OAuth popup - add CSP frame-src and COOP headers | [7b3d23a2f](2026-08-31-7b3d23a2f-allow-google-oauth-popup-add-csp-frame-src-and-c.md) |
| 2026-08-31 | Bugfix | fix: redeploy with updated Supabase DATABASE_URL | [a9502dd32](2026-08-31-a9502dd32-redeploy-with-updated-supabase-database-url.md) |
| 2026-08-31 | Bugfix | fix: update to correct Supabase DATABASE_URL | [6a7e31b40](2026-08-31-6a7e31b40-update-to-correct-supabase-database-url.md) |
| 2026-08-31 | Testing | test: trigger deploy with all secrets configured | [131eb6f4e](2026-08-31-131eb6f4e-trigger-deploy-with-all-secrets-configured.md) |
| 2026-08-30 | Documentation | docs: Add copy-paste guide for obtaining all 6 GitHub secrets | [6895e25d3](2026-08-30-6895e25d3-add-copy-paste-guide-for-obtaining-all-6-github-.md) |
| 2026-08-30 | Documentation | docs: Add focused GitHub repository secrets setup guide | [2c22bc5c9](2026-08-30-2c22bc5c9-add-focused-github-repository-secrets-setup-guid.md) |
| 2026-08-30 | Documentation | docs: Add complete deployment variables checklist for Render + Supabase + Vercel | [78445ff65](2026-08-30-78445ff65-add-complete-deployment-variables-checklist-for-.md) |
| 2026-08-30 | Maintenance | Refine Supabase pooler fix: use direct postgres endpoint with correct port | [8a4c2ac4c](2026-08-30-8a4c2ac4c-refine-supabase-pooler-fix-use-direct-postgres-e.md) |
| 2026-08-30 | Maintenance | Fix Supabase pooler connection for pg_dump and certificate handling | [434c059be](2026-08-30-434c059be-fix-supabase-pooler-connection-for-pg-dump-and-c.md) |
| 2026-08-30 | Maintenance | chore(deps): bump actions/checkout from 4 to 7 | [bfb6b50ff](2026-08-30-bfb6b50ff-bump-actions-checkout-from-4-to-7.md) |
| 2026-08-30 | Maintenance | Normalize deployment config to Render + Supabase | [564834973](2026-08-30-564834973-normalize-deployment-config-to-render-supabase.md) |
| 2026-08-30 | Maintenance | Fix TypeScript compiler config | [9d47360c5](2026-08-30-9d47360c5-fix-typescript-compiler-config.md) |
| 2026-08-30 | Maintenance | Fix Render Neon backup and TLS issues | [6a1f62896](2026-08-30-6a1f62896-fix-render-neon-backup-and-tls-issues.md) |
| 2026-08-30 | Bugfix | fix: require('../package.json') in health endpoint + Google OAuth guard | [c16ca0670](2026-08-30-c16ca0670-require-package-json-in-health-endpoint-google-o.md) |
| 2026-08-30 | Bugfix | fix: add production Vercel domain to CORS allowed origins | [db839dd9a](2026-08-30-db839dd9a-add-production-vercel-domain-to-cors-allowed-ori.md) |
| 2026-08-30 | Bugfix | fix: install postgresql-client in Docker for pg_dump backups | [0fb4aa8ab](2026-08-30-0fb4aa8ab-install-postgresql-client-in-docker-for-pg-dump-.md) |
| 2026-08-30 | Bugfix | fix: generate PWA icons from brand SVG | [a420c6943](2026-08-30-a420c6943-generate-pwa-icons-from-brand-svg.md) |
| 2026-08-30 | Bugfix | fix: health check no longer blocks deploy pipeline | [e6b17cffa](2026-08-30-e6b17cffa-health-check-no-longer-blocks-deploy-pipeline.md) |
| 2026-08-30 | Maintenance | chore(deps): bump actions/setup-node from 4 to 7 | [111382da7](2026-08-30-111382da7-bump-actions-setup-node-from-4-to-7.md) |
| 2026-08-30 | Bugfix | fix: deploy pipeline no longer blocked by Neon quota exhaustion | [d284d48bb](2026-08-30-d284d48bb-deploy-pipeline-no-longer-blocked-by-neon-quota-.md) |
| 2026-08-30 | Feature | feat: add nodbusiness-icon SVG to public/icons | [dfca85e45](2026-08-30-dfca85e45-add-nodbusiness-icon-svg-to-public-icons.md) |
| 2026-08-30 | Bugfix | fix: update favicon to nodbusiness-icon SVG | [15c154f3a](2026-08-30-15c154f3a-update-favicon-to-nodbusiness-icon-svg.md) |
| 2026-08-30 | Bugfix | fix: use /app/backups dir for backup script — fixes EACCES permission error on Render | [6ea237280](2026-08-30-6ea237280-use-app-backups-dir-for-backup-script-fixes-eacc.md) |
| 2026-08-30 | Bugfix | fix: copy scripts/ into dist/scripts in Dockerfile — fixes Cannot find module backup-database and showroom-digests | [44bf60506](2026-08-30-44bf60506-copy-scripts-into-dist-scripts-in-dockerfile-fix.md) |
| 2026-08-29 | Bugfix | fix: convert cleanupStories to TS so it compiles into dist — fixes Cannot find module crash on Render | [d0df8070e](2026-08-29-d0df8070e-convert-cleanupstories-to-ts-so-it-compiles-into.md) |
| 2026-08-29 | Bugfix | fix: migrate30 SQL syntax error - split combined index query and remove duplicate | [8b2524f08](2026-08-29-8b2524f08-migrate30-sql-syntax-error-split-combined-index-.md) |
| 2026-08-29 | Bugfix | fix: move ref assignment into useEffect in PurchaseModal | [8c8b466c1](2026-08-29-8c8b466c1-move-ref-assignment-into-useeffect-in-purchasemo.md) |
| 2026-08-29 | Bugfix | fix: resolve uploads directory permission error on Render | [12570cfc3](2026-08-29-12570cfc3-resolve-uploads-directory-permission-error-on-re.md) |
| 2026-08-29 | Bugfix | fix: update Dockerfile for TypeScript build on Render | [b0bed7051](2026-08-29-b0bed7051-update-dockerfile-for-typescript-build-on-render.md) |
| 2026-08-29 | Maintenance | chore(deps): bump the minor-and-patch group across 1 directory with 13 updates | [c26e62588](2026-08-29-c26e62588-bump-the-minor-and-patch-group-across-1-director.md) |
| 2026-08-29 | Maintenance | chore(deps): bump the minor-and-patch group across 1 directory with 43 updates | [59e4ef0d9](2026-08-29-59e4ef0d9-bump-the-minor-and-patch-group-across-1-director.md) |
| 2026-08-29 | Bugfix | fix: comprehensive bug audit — 40 suites, 396 tests all green | [6ce536995](2026-08-29-6ce536995-comprehensive-bug-audit-40-suites-396-tests-all-.md) |
| 2026-08-27 | Documentation | docs: TD-009 fully complete — SafeImage now uses next/image | [5076a2f79](2026-08-27-5076a2f79-td-009-fully-complete-safeimage-now-uses-next-im.md) |
| 2026-08-27 | Feature | feat: SafeImage → next/image for full optimization (TD-009 complete) | [348c6e04c](2026-08-27-348c6e04c-safeimage-next-image-for-full-optimization-td-00.md) |
| 2026-08-27 | Bugfix | fix: lint - unused imports + useEffect deps (no behavioral changes) | [39e93e987](2026-08-27-39e93e987-lint-unused-imports-useeffect-deps-no-behavioral.md) |
| 2026-08-26 | Feature | feat: image optimization config — webp/avif + 30-day cache + responsive sizes (TD-009) | [c17a7da0d](2026-08-26-c17a7da0d-image-optimization-config-webp-avif-30-day-cache.md) |
| 2026-08-26 | Feature | feat: wire Sentry init + close TD-003/TD-011 in TECHNICAL_DEBT | [684aa976b](2026-08-26-684aa976b-wire-sentry-init-close-td-003-td-011-in-technica.md) |
| 2026-08-26 | Documentation | docs: TD-012 marked done in TECHNICAL_DEBT register | [b7a20e61b](2026-08-26-b7a20e61b-td-012-marked-done-in-technical-debt-register.md) |
| 2026-08-26 | Feature | feat: financial audit logging — append-only audit_logs table (TD-012 closed) | [832df9b37](2026-08-26-832df9b37-financial-audit-logging-append-only-audit-logs-t.md) |
| 2026-08-26 | Feature | feat: remove all @ts-nocheck directives — full strict type safety (TD-006 closed) | [d556ad50f](2026-08-26-d556ad50f-remove-all-ts-nocheck-directives-full-strict-typ.md) |
| 2026-08-26 | Bugfix | fix: DISTINCT on trending/cache-warm queries + TD-007 closed + full E2E green | [8c5d5d45a](2026-08-26-8c5d5d45a-distinct-on-trending-cache-warm-queries-td-007-c.md) |
| 2026-08-25 | Testing | test(e2e): checkout COD API test passing; UI tests marked fixme (need full product data) | [1ade27204](2026-08-25-1ade27204-checkout-cod-api-test-passing-ui-tests-marked-fi.md) |
| 2026-08-24 | Bugfix | fix: systematic Array.isArray guards on all API-fed .map()/.reduce() calls | [395ab7bdb](2026-08-24-395ab7bdb-systematic-array-isarray-guards-on-all-api-fed-m.md) |
| 2026-08-24 | Bugfix | fix: deduplicate explore lists + type-safe Map dedup + verify error capture | [4c86b987a](2026-08-24-4c86b987a-deduplicate-explore-lists-type-safe-map-dedup-ve.md) |
| 2026-08-24 | Bugfix | fix(explore): deduplicate trending posts/products — eliminates React duplicate key warnings | [60d0722e7](2026-08-24-60d0722e7-deduplicate-trending-posts-products-eliminates-r.md) |
| 2026-08-24 | Bugfix | fix(devops): fix undefined variable reference in error reporter send() | [ee94d0468](2026-08-24-ee94d0468-fix-undefined-variable-reference-in-error-report.md) |
| 2026-08-24 | Bugfix | fix(devops): missing UNIQUE index on error_events.fingerprint — error capture was silently broken on ALL fresh deployments | [822df57b2](2026-08-24-822df57b2-missing-unique-index-on-error-events-fingerprint.md) |
| 2026-08-24 | Bugfix | fix(devops): module-scope error interceptors — catch hydration + console errors | [e1344955f](2026-08-24-e1344955f-module-scope-error-interceptors-catch-hydration-.md) |
| 2026-08-24 | Bugfix | fix(devops): fix remaining nested <button> hydration + capture console.error in Live Error Feed | [e2a8583ab](2026-08-24-e2a8583ab-fix-remaining-nested-button-hydration-capture-co.md) |
| 2026-08-24 | Feature | feat(admin): Scorecard page + Implementation Log tab — live readiness in the console | [1d2903731](2026-08-24-1d2903731-scorecard-page-implementation-log-tab-live-readi.md) |
| 2026-08-24 | Feature | feat(docs): implementation log — auto-generated task reports for every merge | [d73089605](2026-08-24-d73089605-implementation-log-auto-generated-task-reports-f.md) |
| 2026-08-24 | Feature | feat(production): SEO robots+sitemap, a11y labels, lazy images + readiness scorecard | [116212ac9](2026-08-24-116212ac9-seo-robots-sitemap-a11y-labels-lazy-images-readi.md) |
| 2026-08-24 | Testing | test(e2e): realtime chat suite — 2-browser Socket.IO delivery + persistence | [ace05ca36](2026-08-24-ace05ca36-realtime-chat-suite-2-browser-socket-io-delivery.md) |
| 2026-08-24 | Bugfix | fix(devops): restore 'use client' as first directive in DevOps.tsx | [7c24298d4](2026-08-24-7c24298d4-restore-use-client-as-first-directive-in-devops-.md) |
| 2026-08-24 | Maintenance | chore: remove leftover debug script | [c03dabdf4](2026-08-24-c03dabdf4-remove-leftover-debug-script.md) |
| 2026-08-24 | Bugfix | fix(infra): migration runner under tsx + transaction-safe DM fallback + chat E2E | [8a1f4318b](2026-08-24-8a1f4318b-migration-runner-under-tsx-transaction-safe-dm-f.md) |
| 2026-08-23 | Feature | feat(showrooms): weekly Showroom Doctor digests — owners get their score in their inbox | [08be3c441](2026-08-23-08be3c441-weekly-showroom-doctor-digests-owners-get-their-.md) |
| 2026-08-23 | Feature | feat(showrooms): Doctor Phase 3 — every finding is now actionable | [49dfaff21](2026-08-23-49dfaff21-doctor-phase-3-every-finding-is-now-actionable.md) |
| 2026-08-23 | Feature | feat(showrooms): Showroom Doctor Phase 2 — AI Advisor narrative + /doctor copilot command | [31d6253a9](2026-08-23-31d6253a9-showroom-doctor-phase-2-ai-advisor-narrative-doc.md) |
| 2026-08-23 | Feature | feat(showrooms): Showroom Doctor Phase 1 — sector-aware deterministic diagnosis | [d1e560bbe](2026-08-23-d1e560bbe-showroom-doctor-phase-1-sector-aware-determinist.md) |
| 2026-08-23 | Feature | feat(devops): AI Ops Copilot — chat-driven operations on the DevOps page | [edf12404b](2026-08-23-edf12404b-ai-ops-copilot-chat-driven-operations-on-the-dev.md) |
| 2026-08-23 | Feature | feat(devops): Ops Alerts & Telemetry console + SEV1 Telegram paging | [0c23c08d9](2026-08-23-0c23c08d9-ops-alerts-telemetry-console-sev1-telegram-pagin.md) |
| 2026-08-23 | Bugfix | fix: resolve all 6 tracked DevOps bugs + hydration error in Live Errors | [92ee0f459](2026-08-23-92ee0f459-resolve-all-6-tracked-devops-bugs-hydration-erro.md) |
| 2026-08-23 | Bugfix | fix: close all known bugs — verification schema drift (runtime 500s) + security batch TD-016/017/018 | [a2ee0e219](2026-08-23-a2ee0e219-close-all-known-bugs-verification-schema-drift-r.md) |
| 2026-08-23 | Feature | feat(devops): catch-everything telemetry + executable alerts (MONITORING.md made real) | [880520ac7](2026-08-23-880520ac7-catch-everything-telemetry-executable-alerts-mon.md) |
| 2026-08-23 | Feature | feat(ci): continuous documentation sync for docs/Production | [eca00290e](2026-08-23-eca00290e-continuous-documentation-sync-for-docs-productio.md) |
| 2026-08-23 | Documentation | docs(Production): restyle all 232 docs to the four-question standard | [ad8949548](2026-08-23-ad8949548-restyle-all-232-docs-to-the-four-question-standa.md) |
| 2026-08-23 | Documentation | docs(Production): Batch 5 complete - encyclopedia finished (234 docs) | [8919d9a7d](2026-08-23-8919d9a7d-batch-5-complete-encyclopedia-finished-234-docs.md) |
| 2026-08-23 | Documentation | docs(Production): Batch 4 - components/lib/store/api/hooks (98 docs) | [0eab23e71](2026-08-23-0eab23e71-batch-4-components-lib-store-api-hooks-98-docs.md) |
| 2026-08-23 | Documentation | docs(Production): Batch 3 - frontend architecture facts + all 47 view screens | [f93b74239](2026-08-23-f93b74239-batch-3-frontend-architecture-facts-all-47-view-.md) |
| 2026-08-23 | Documentation | docs(Production): Batch 2 - all 44 backend route modules | [59f5f8723](2026-08-23-59f5f8723-batch-2-all-44-backend-route-modules.md) |
| 2026-08-23 | Documentation | docs(Production): launch codebase encyclopedia - Batch 1 backend foundation | [084cf8995](2026-08-23-084cf8995-launch-codebase-encyclopedia-batch-1-backend-fou.md) |
| 2026-08-23 | Feature | feat(builder): live-preview field mapping editor (final Patent 4 embodiment) | [a9d7e7603](2026-08-23-a9d7e7603-live-preview-field-mapping-editor-final-patent-4.md) |
| 2026-08-23 | Feature | feat(proxy): implement Patent 4 claim embodiments — stale-cache fallback, circuit breaker, per-tenant key derivation | [debf1cf8e](2026-08-23-debf1cf8e-implement-patent-4-claim-embodiments-stale-cache.md) |
| 2026-08-23 | Documentation | docs(patent): add Patent 4 draft (flagship builder feature), real prior art, disclosure-risk section | [042aa76c2](2026-08-23-042aa76c2-add-patent-4-draft-flagship-builder-feature-real.md) |
| 2026-08-23 | Maintenance | chore(deps): bump framer-motion from 12.42.2 to 13.1.0 in /frontend-next | [93623a133](2026-08-23-93623a133-bump-framer-motion-from-12-42-2-to-13-1-0-in-fro.md) |
| 2026-08-23 | Maintenance | chore(deps-dev): bump typescript from 5.9.3 to 7.0.2 in /frontend-next | [9c0980a8d](2026-08-23-9c0980a8d-bump-typescript-from-5-9-3-to-7-0-2-in-frontend-.md) |
| 2026-08-23 | Maintenance | chore(deps-dev): bump @types/node in /frontend-next | [6ed441874](2026-08-23-6ed441874-bump-types-node-in-frontend-next.md) |
| 2026-08-23 | Testing | test(e2e): Playwright smoke suite (TD-003) + fix prototype pollution in bookmarks store (TD-021) | [ceb560eff](2026-08-23-ceb560eff-playwright-smoke-suite-td-003-fix-prototype-poll.md) |
| 2026-08-23 | Feature | feat(docs): auto-generated API reference — 255 endpoints, zero drift | [bbe623ed4](2026-08-23-bbe623ed4-auto-generated-api-reference-255-endpoints-zero-.md) |
| 2026-08-23 | Feature | feat(ops): automated database backups + restorability verification (TD-020) | [9bd299762](2026-08-23-9bd299762-automated-database-backups-restorability-verific.md) |
| 2026-08-23 | Feature | feat(ci): make CI blocking and gate production deploys on it (TD-019) | [4d0e1bc5d](2026-08-23-4d0e1bc5d-make-ci-blocking-and-gate-production-deploys-on-.md) |
| 2026-08-23 | Feature | feat(security): memory-only access token (TD-014) + Chapa status endpoint (TD-015) | [90bcd7c8c](2026-08-23-90bcd7c8c-memory-only-access-token-td-014-chapa-status-end.md) |
| 2026-08-23 | Documentation | docs: full audit + canonical sources — align 170+ docs with code reality | [e1788dc4b](2026-08-23-e1788dc4b-full-audit-canonical-sources-align-170-docs-with.md) |
| 2026-08-23 | Bugfix | fix(frontend): error reporting, boundaries, and flaky test hardening | [632e023f3](2026-08-23-632e023f3-error-reporting-boundaries-and-flaky-test-harden.md) |
| 2026-08-23 | Feature | feat(backend): complete TypeScript migration + security hardening pass | [69f73d006](2026-08-23-69f73d006-complete-typescript-migration-security-hardening.md) |

