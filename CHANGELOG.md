# Changelog

All notable changes to RegMon are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **RegMon mark.** The product now has its own logo – the hexagon of the RH Advisory brand family with a Δ for “change” – used as the favicon of the dashboard and the admin console, as a small inline mark in both page headers, and in this README. No behaviour changed, no new routes.

## [2.2.4] – 2026-09-17

### Changed
- **An update never changes the data of an existing installation on its own.** Customer requirement (2026-09-17): the event database must remain untouched when a new version is rolled out. The backlog sweep introduced in 2.2.3 (closing open items that had been removed at the source) now runs only on explicit request – via the new pipeline job **"Close removed items"** in the admin console (audited as `sweep_removed_run` with a count, every closure individually as `status_auto_close`) or via `REGMON_REMOVED_AUTO_CLOSE_BACKLOG=true` for the nightly aggregator run. New `removed` events on untouched items are still closed at ingest. Anything an update does change on its first run is documented in the customer runbook before rollout.
- **Iron Rule 11 – no update touches the customer's data.** RegMon provides the fetch infrastructure; what the customer collects with it is theirs. Installers and deploy scripts neither read, write, nor delete the ledger, audit trail, archive, or configuration; status values of existing items change only through an explicit, audited action. A regression test reads the scripts for destructive volume operations.

### Added
- **Installer backs up the runtime volume before every update.** When `install_local.sh` detects an existing installation, it writes `<install-dir>/backups/regmon_runtime_<ts>.tgz` with a checksum before doing anything else; if the backup fails, the update aborts (`--no-backup` opts out deliberately). The way back is printed in the output.
- **Bundle with provenance and customer binding.** `make_bundle.sh --customer <id>` takes customer-specific fetchers from `customers/<id>/` and ships the runbook and `CHANGELOG.md` inside the bundle so the admin can read what changes before updating. `bundle.meta` carries git commit, dirty status, build time, build host, and customer. A customer bundle is built only from a committed state and only with a consistent customer/feature map.

## [2.2.3] – 2026-09-16

### Changed
- **Documents removed at the source are closed automatically.** Removals used to stay open indefinitely – on the reference instance 1,093 of 2,103 items, almost all file rotation in the KBV IT-Update tree. A `removed` event on an untouched item (`open`) now sets `done` with `auto_closed_reason=removed_at_source` and `status_updated_by=system`, audited per item as `status_auto_close` (actor `system`); no relevance label is derived from it, because an automatic closure is not a relevance judgement. Items in progress keep their status and are flagged "removed at source"; done and irrelevant items receive the flag only. Manual status changes now carry `status_updated_by=operator`.
- **Age escalation applies only to items someone has touched.** "Open for more than 30 days" used to colour the entire untouched backlog red (2,031 of 2,103 items). Escalation now applies to the statuses listed in `escalation.apply_to` (default `["in_progress"]`; `["open", "in_progress"]` restores the old behaviour, validated in the policy editor). Untouched items show their base severity: red on deadline keyword or effective date, otherwise green. Items in progress escalate for the first time.

## [2.2.2] – 2026-09-15

### Fixed
- **The severity policy was not shipped.** `dashboard/policy/policy.json` (deadline keywords such as "Frist", "Inkrafttreten", "Übergangsfrist") was missing from the wheel's package data. On every installation without a volume-level policy, the hard-coded default without keywords silently applied: no keyword ever fired, and every red severity came from age escalation alone. The asset is now in the wheel, the fallback to the default is logged as an error, and the self-test reports the policy source (`policy_source`). Existing installations pick up the packaged asset automatically after the update unless a volume policy is set.

### Changed
- **Boilerplate filter sharpened** (roadmap #31, stage 1): more consultant phrases recognised, date ranges such as "by early 2028" count as concrete anchors. Measured on the reference instance: of 212 deep-scan texts, 13 remain visible. The annotator also understands the list format of `summaries.json`.
- **"Impact (facts)" appears only when there is a fact beyond the change type** (policy keyword, effective date, version change). "Changed" or "removed" alone would be the next monotony: 1,093 of the 2,103 items on the reference instance are removals from the KBV IT-Update tree.

## [2.2.1] – 2026-09-15

### Changed
- **Deep scan "action required": consultant prose is no longer shown** (roadmap #31, stage 1). The model does not know the reader and therefore produced interchangeable sentences ("adapt strategies", "review systems"; on the reference instance 212 texts, 68 of them literally the standard phrase and the rest identical in substance). A deterministic filter (`regmon.dashboard.impact.is_generic_action`) recognises texts without a concrete anchor (date, section sign, annex, version, deadline, quoted term, term from the event title) and marks them `action_generic`; the dashboard hides them, the record is kept. Existing data is annotated on read. Concrete recommendations stay visible and carry the label **"AI draft"** (EU AI Act Art. 50).
- **New "Impact (facts)" line per event**, built exclusively from facts RegMon knows: change type (new/changed/removed/backfill), document type, version change (oBDS), policy keywords, effective date. No model involved. It appears only when it has something worth saying; impact assessment against the customer's own documentation follows as #31 stage 2.

### Added
- **Customer/feature map** (`customers/feature_map.json`, `tools/customer_impact.py`): single source of truth for which installation uses which fetchers and features – version with evidence, installation channel, contacts, alert routing. `customer_impact.py <fetcher|feature>` answers who is affected by a finding; `--check` validates modules and names against the repository. The reference instance runs permanently with every customer feature; a test enforces it.

## [2.2.0] – 2026-09-15

Bundles everything since 2.1.5 – the maintenance releases 2.1.6–2.1.9 (previously listed under "Unreleased") – and **capture guarantee, stage 0**. The first run after the update backfills the KBV web pages once (`meta.baseline`).

### Capture guarantee, stage 0

#### Fixed
- **KBV web pages: events never reached the ledger (since 2026-03-25).** The fetcher for the twelve KBV web pages (press releases, announcements, federal framework agreement, resolutions, …) returned its events but wrote no delta file; the aggregator reads delta files only, and the state was advanced regardless. Result: read daily, marked as seen, discarded – while the audit trail attested `ok: true, events: N`. `run()` now writes the delta itself, **before** the state. **One-time backfill:** the first run after the update detects the old state and emits the entire current inventory once as events with `meta.baseline=true`; the history since March cannot be reconstructed, the inventory is complete.
- **Safety net in the scheduler:** if a plugin returns events without a delta file appearing, the scheduler writes it itself (`written_by: scheduler-fallback`) and records that in the audit entry (`delta_fallback`). No plugin – including future ones – can silently lose events any more.
- **Aggregator persists the ledger before archiving.** Delta files used to be moved to the archive inside the loop while the ledger was written after it; a failure in between made files vanish from `state/` whose events never arrived. The ledger is now saved after every delta, then the file is archived. **Invalid delta files** (not JSON, no `events` list, event without `id`) no longer block the run and are not lost: they move to `archive/quarantine/<day>/`, all valid files are processed, and the run ends with an aggregator error visible in the audit trail and the view.
- **Missed runs leave traces and are caught up.** The scheduler ran with APScheduler's one-second grace: a missed cron slot (process blocked, host suspended) failed silently. `REGMON_SCHEDULER_MISFIRE_GRACE_SECONDS` (default 6 h) now applies. The scheduler also keeps a **run register per fetcher** (last attempt, last success, status ok/partial/failed, error) and a plugin registry, and **catches up at start-up**: fetchers without a success in the last `REGMON_FETCHER_STALE_HOURS` (default 26) run once, sequentially, 90 seconds after start. A container restart overnight no longer costs a day of coverage.
- **Audit write failures on the capture path become visible.** Fetcher, aggregator, and summary runs remain fail-open by design; a failed audit entry is now persisted to `runtime_state/audit_write_failures.jsonl` and reported by the self-test.
- **Self-test checks the freshness of every fetcher.** New check `fetcher_freshness`: every registered plugin needs a successful run within `REGMON_FETCHER_STALE_HOURS`; stale and never-successful plugins are listed with last status and error, the self-test reports `degraded`. New check `audit_write_failures` reports failed audit entries of the last 24 h. Both visible via `GET /api/healthcheck`.
- **Audit chain across day boundaries.** Every daily file used to start with `GENESIS`; a deleted daily file was invisible. The first entry of a day now carries the hash of the last line of the previous day's file and names it in `prev_file`. Verification reports the link, a missing previous file, and a retroactively modified previous file as a break. Files from before the change count as unlinked, not broken.
- **New RSS fetchers created from the admin panel were named `MEIN_FETCHER` and monitored `example.com`.** The template substitution depended on column alignment that formatting had removed; it now works regardless of formatting, and the endpoint fails loudly if a placeholder is not found.

#### Changed
- **A fetch error is an error, not an empty result** (`PartialFetchError`). On failure of individual pages the KBV web fetcher keeps the successful pages, carries the old state of the failed ones forward, generates no `removed` events, and ends the run with a partial-fetch error – `ok: false` in the audit trail with the page list. A page with HTTP 200 and zero entries counts as failed once the state knows the category (selector drift, not "everything removed"). A corrupt state is an error, not a silent restart with an empty snapshot.
- **Delta before state in all fetchers** (G-BA, Gematik, KBV file tree, oBDS, DGP, RSS template): `collect()` computes, `run()` persists the delta first, then the state. A change never counts as seen before it is durably in the delta. State files are written atomically.
- **`changed` is detected:** Gematik now tracks title and date per URL (state schema 2, the old inventory is migrated without an event flood); oBDS keys by content instead of content plus version, so a version change appears as `changed` with `meta.previous_version`. G-BA: entries cut off by the per-run cap no longer count as seen.
- **Errors stay errors:** oBDS, DGP, and the RSS template raise on HTTP errors instead of returning `[]`; a missing version table, an empty landing page, or an empty feed with a known inventory are selector drift and abort without touching the state. The KBV file tree reports a directory time limit (`REGMON_KBV_DIR_DEADLINE_SECONDS`, default 30) as a partial failure instead of silently using a partial result.
- **The RSS template keeps entries that fall out of the feed window** in its state; their reappearance is not a new event.

#### Added
- **"Archive" tab in the events dashboard.** Done and irrelevant items older than 180 days used to be hidden from the view – present in the ledger, but with no way to reach them. They now have their own tab with status and "Reopen"; the 180-day filter does not apply there.

### Security
- **HTTP security headers on both APIs** – events dashboard (8050) and settings admin (8051) set `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive `Content-Security-Policy` on every response; `Strict-Transport-Security` when secure cookies are enabled. Centralised so the two apps cannot drift apart.
- **Login rate limiting / lockout** – after `REGMON_LOGIN_MAX_ATTEMPTS` (default 5) failed attempts per user and IP, login is locked for `REGMON_LOGIN_LOCKOUT_SECONDS` (default 900, HTTP 429). The check runs before password verification; lockouts are recorded in the audit trail. The attempt counter ages out stale entries and is hard-capped.
- **Complete audit of administrative writes** – every writing settings-admin endpoint (settings update/reset, scheduler switch, fetcher creation/change, maintenance mode, service restart, policy) writes an audit entry. The recorded actor comes from the session; a forgeable `user` field in the request body is ignored. Failed audit writes are logged instead of swallowed.
- **Stricter input validation** – the dashboard accent colour is validated as six-digit hex; the settings override loader warns visibly about unknown keys instead of ignoring them.
- **Events dashboard attribution (non-repudiation)** – writing actions in the events dashboard (status change, reset-all) now require a valid session; the recorded actor is the session user instead of a hard-coded `"operator"`. Read views stay open. Accounts with a pending forced password change cannot write.

### Added
- **Help button (documentation inside the tool)** – dashboard and admin panel get a "?" button that opens the matching operator reference cards as PDF in a new tab (quick start, cheat sheets, emergency manuals). The cards are bundled in the package and served locally – no external links.
- **Offline / console installation without an SSH pipe** – for customer environments without inbound SSH or VPN access (onboarding via a remote console or USB stick). `tools/make_bundle.sh` builds a self-contained, integrity-checked bundle on the development machine (RegMon image, optionally the Ollama image and pre-pulled models for the air-gap case, standard and customer-specific fetchers, compose files, `manifest.sha256`; `--slim` omits the public Ollama parts). `install_local.sh` runs on the target server and installs from the bundle (`--source` = HTTP URL on the local network or a directory): manifest verification before any action, local hardware scan → LLM profile, volume population, Docker log snapshot before recreation, health wait, dashboard check. Idempotent, with a deterministic model fallback when a model is neither bundled nor pullable.
- **Emergency recovery (tier 3)** – a vendor-signed, single-use, fully audited emergency access for total lockout (all accounts locked, consensus recovery impossible), as a controlled step above the crude "delete the user store" break-glass. The vendor issues a signed grant on request; RegMon verifies it (signature, closed payload schema, expiry, single-use nonce, binding to the installation ID) and the customer completes recovery with a claim code received over a second channel. The emergency session is capability-scoped (short-lived, reaches only the emergency endpoints), the claim code is brute-force-protected, and audit is fail-closed. A guided recovery screen on the admin login walks through the steps; the daily self-test reports an active grant loudly. Without a vendor public key on the installation the path is inactive.
- **Volume-backed shared session store** – sessions are persisted to the shared volume in addition to the process-local cache, so the events dashboard validates the same host-wide cookie as the settings admin. Best-effort with clean degradation.
- **Lightweight login in the events dashboard** – login/logout/me endpoints on port 8050 (same user store, same rate limiting as 8051) plus a login modal: a protected write without a session opens the dialog and repeats the action after login. The header shows the signed-in user.
- **Coverage gate** – branch coverage with a `fail_under` threshold (baseline 62 %, gate 58 %) as regression protection; reproducible via `pytest --cov=regmon`.
- **Two-tier LLM model strategy** – separate models for short summaries/tagging vs. deep full-text scans, selected via `REGMON_LLM_PROFILE` (`standard`/`low`); `REGMON_LLM_MODEL` and `REGMON_DEEP_SCAN_MODEL` override individual stages. Fixes a silent failure where the summary generator defaulted to a model that was not installed.
- **Hardware scan & model recommendation** – detects CPU/RAM/GPU/disk and recommends a fitting profile and deep-scan model. Endpoint `GET /api/system/hardware`. Standard library only, no external calls.
- **Optional GPU support** – `docker-compose.gpu.yml` grants the Ollama container GPU access on capable hosts (requires the NVIDIA container toolkit); CPU-only remains the default.
- **Installer hardware auto-detection** – `install.sh` probes the target host and auto-selects LLM profile and deep-scan model (`--llm-profile auto`, default), with `--llm-profile` and `--deep-model` overrides.
- **Admin panel pipeline & display controls** – manual triggers for aggregator, summary generator, and deep scan with last-run statistics (`GET /api/jobs/status`, `POST /api/jobs/{job}/run`); summary management with non-destructive single-item reset (`GET /api/summaries`, `POST /api/summaries/{id}/reset`); and display settings (dark mode, accent color, branding) persisted in `config/display.json` and applied live on the dashboard.
- **Admin panel: audit log viewer, manual fetcher trigger, severity policy editor** – audit trail with filters, statistics, and chain verification (`/api/audit`, `/api/audit/verify`); fetcher run history per plugin (`/api/fetchers/runs`); "fetch now" per source with live status (file-based trigger queue, audited with the triggering user); and an editor for severity thresholds and deadline keywords persisted on the volume (`GET/PUT /api/policy`, audited).
- **Role-based access & account recovery** – `admin` and `operator` roles, enforced first-login password change, admin-initiated password reset, and a four-eyes consensus recovery flow.
- **Settings override loader** – settings changed in the admin panel (`settings_override.json`) now take effect on a plain restart, without a full redeployment.
- **Customer onboarding installer** (`install.sh`) – automated deployment to x86_64 Ubuntu servers via SSH. Builds amd64 Docker image, transfers it, sets up the project structure, syncs fetchers and compose files, pulls Ollama with the configured model, starts containers, waits for healthy status, and verifies the dashboard endpoint. Fully idempotent and parameterized (`--host`, `--user`, `--timezone`, `--skip-ollama-pull`). Validated end-to-end against a staging VM with 609 events across all sources.
- **Night-run simulation tool** – development utility that runs the full pipeline (fetchers → aggregator → summary → deep scan) sequentially in minutes instead of hours. Supports `--skip-fetchers`, `--skip-llm`, `--max-events`, and configurable deep scan timeout. Eliminates the need to wait for nightly cron runs during development.
- **Daily self-test** – automated pre-flight check runs 10 minutes before the first nightly fetcher. Validates scheduler jobs, log file integrity, log routing (cross-pollution guard), volume writability, Ollama reachability (graceful degradation), recent fetcher errors, and audit log hash-chain integrity. Results available via `GET /api/healthcheck`.
- **Tamper-evident audit trail** – each audit log entry contains `prev_hash = sha256(previous raw entry)`, forming a hash chain per daily log file. Includes `verify_audit_chain()` for on-demand integrity verification. Addresses GxP and BSI baseline protection requirements.
- **Time-budgeted summary processing** – processes events newest-first and stops cleanly when less than 15 minutes remain before the night-mode window closes. Remaining events carry over to the next night.
- **Persistent logging for all containers** – scheduler, events, and settings containers now write rotating log files to the shared volume. Docker stdout is snapshot before each redeployment. No log data is lost on container recreation.
- **Deterministic summaries for binary files** – ZIP, EXE, ISO, MSI, TAR.GZ, and other non-extractable formats are never sent to the LLM. A filename-based summary is generated using a domain-specific abbreviation table (e.g., "KBV FHIR eRezept · Version 1.4.2 (Paket)").
- **Developer tooling** – ruff (lint + format) and mypy (type checking) configured as pre-commit hooks. Policy tests enforce lint compliance across the entire codebase.
- **Comprehensive documentation** – Developer Guide (12 sections, architecture through troubleshooting) for human developers, and AI Handover document (13 sections including known pitfalls with root causes and fixes) for AI coding tool continuity.

### Changed
- **Sessions survive a container restart** (until TTL) because they are persisted on the volume; a deployment discards the session store so a code change still forces a fresh login and invalidates old tokens.
- **Optimized night-mode scheduling** – full pipeline runs in logical sequence: fetchers (23:00–00:00), aggregator (00:30), summary generator (01:00, 3h budget), deep scan (01:30, 2.5h worker time). Regression test prevents future cron changes from undermining time budgets.
- **Healthcheck liveness mode** – new `--liveness` flag maps "degraded" to exit 0 (Docker-healthy). Fresh installations no longer report unhealthy before the first night run. Full three-level exit codes remain available for monitoring scripts.
- Codebase formatted and modernized via ruff. No semantic changes.

### Fixed
- **Scheduler audit-log horizon extended from six days to months.** APScheduler logs every job run twice at INFO, and the manual-trigger poll runs every 5 seconds; measured on the staging system, 95.2 % of all scheduler log lines (2.4 million of 2.5 million) came from that single source – about 6.8 MB per day that pushed everything else out of rotation. The `apscheduler.executors` logger is now dampened to WARNING (configurable via `REGMON_APSCHEDULER_LOG_LEVEL`); job exceptions and scheduler lifecycle messages are kept unchanged.
- **Dashboard display under the hardened security policy** (found during the first customer installation). The events dashboard fetched the maintenance status cross-port from the settings service; browsers treat different ports as separate origins, so the strict CSP/CORS blocked the call and the "updates in progress" overlay stayed up permanently. The status now comes same-origin from the dashboard's own backend; the strict headers remain. The poller no longer shows the overlay on a failed status check, and an empty summaries response is handled in the frontend.
- **Crash loop on console installation due to volume ownership.** The installer created and populated the runtime volume before the first container start, so Docker no longer copied the image's `/runtime` skeleton into the non-empty volume and the application user could not create its directories. The installer now sets the owner of the whole runtime tree.
- **Maintenance banner stuck after an admin-triggered restart.** The maintenance flag was set on restart but never cleared on start-up; the settings service now clears it when it starts.
- **Self-lockout on password change** – changing one's own password no longer revokes the active session; the user stays logged in after the change.
- **Logging isolation** – importing modules no longer installs file handlers as a side effect. Previously, the healthcheck's import validation rerouted all scheduler logs to the wrong file for an entire night run. Three regression tests prevent recurrence.
- **KBV encoding** – Apache directory listings with UTF-8 paths (e.g., "UV-GOÄ") were decoded as Latin-1, producing garbled characters.
- **KBV phantom updates** – Zulassungsverzeichnis PDFs appeared daily as "changed" due to ±1 KB rounding in Apache's size display. Configurable size tolerance filters noise while preserving real change detection.
- **PDF URL parsing** – PDF URLs in event metadata were incorrectly parsed as HTML, causing encoding warnings and garbage input to the LLM.
- **Deep scan formatting** – LLM output normalization removes duplicate headers, converts inconsistent list markers, and strips markdown bold artifacts.
- **Installer disk space** – Ollama image pull now runs only when the image is missing, preventing "no space left on device" on small customer VMs.
- Undefined variable bug in summary pipeline caught by ruff static analysis.
- Summary generator previously received only 10 minutes of night-mode budget — cron schedule reorganized to provide 3 hours.
- A time-bomb test with a hard-coded publication date is now relative to the current date.

### Removed
- Phantom IQTIG scheduler job (settings entry, admin UI entries, scheduler mapping) – no such fetcher ever existed. The cron entry returns when a real IQTIG plugin exists.

## [2.1.5] – 2026-04-17

### Added
- **PDF Text Extraction Pipeline** – content-addressed SHA256 cache, deterministic fallback for non-extractable documents, hallucination protection for LLM summaries.
- **Per-source scheduling** – each regulatory source now runs on its own configurable schedule. The admin panel reflects the actual scheduler state dynamically.
- **Automatic Deep Scan** – worker thread starts at boot, nightly queue processing with configurable limits.
- **Configurable timezone** via `REGMON_TIMEZONE` environment variable with automatic detection fallback. RegMon can now be deployed globally without code changes.
- **UTC discipline** – all persisted timestamps are UTC. Local time is used only for night-mode scheduling and display. Policy tests prevent regression.
- **Log rotation** – configurable rotating file handler for scheduler logs (default: 10 MB × 5 backups). Protects hardware longevity on embedded deployments.
- **Test infrastructure** – formal test plan (109 test points across 15 components), 147 automated tests, 44% line coverage.

### Changed
- **PDF extraction uses pdfplumber** instead of PyPDF2. Better handling of tables, multi-column layouts, and special characters in regulatory PDFs.
- **Night-mode timing** – summary and aggregator jobs now run within the configured night window, respecting both summer and winter time transitions.
- **Structured logging** – all `print()` statements replaced with module-level loggers across the entire codebase. Zero print statements remain.
- **Hardened deployment** – deploy mechanism now includes preflight checks with error trapping.
- **Standardized User-Agent** – all outbound HTTP requests use a central helper with the current package version.

### Fixed
- LLM summary hallucinations when PDF text extraction fails – deterministic fallback instead of sending empty context to the LLM.
- Admin panel scheduler settings had no effect on actual job execution – each source now has a real, independently configurable cron job.
- Three diverging sources of truth for cron schedules synchronized into one.
- Phantom scheduler job removed (no fetcher plugin existed).

## [0.3] – 2026-03

Initial production deployment. Automated monitoring for G-BA, KBV (12 web pages + IT-Update file tree), Gematik, BVITG, DGP Pathology, and oBDS XML. On-premise LLM summaries and tagging via Ollama. Dashboard with audit trail, status management, and healthcheck monitoring.
