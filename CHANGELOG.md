# Changelog

All notable changes to RegMon are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Customer onboarding installer** (`install.sh`) – automated deployment to x86_64 Ubuntu servers via SSH. Builds amd64 Docker image, transfers it, sets up the project structure, syncs fetchers and compose files, pulls Ollama with the configured model, starts containers, waits for healthy status, and verifies the dashboard endpoint. Fully idempotent and parameterized (`--host`, `--user`, `--timezone`, `--skip-ollama-pull`). Validated end-to-end against a staging VM with 609 events across all sources.
- **Night-run simulation tool** – development utility that runs the full pipeline (fetchers → aggregator → summary → deep scan) sequentially in minutes instead of hours. Supports `--skip-fetchers`, `--skip-llm`, `--max-events`, and configurable deep scan timeout. Eliminates the need to wait for nightly cron runs during development.
- **Daily self-test** – automated pre-flight check runs 10 minutes before the first nightly fetcher. Validates scheduler jobs, log file integrity, log routing (cross-pollution guard), volume writability, Ollama reachability (graceful degradation), recent fetcher errors, and audit log hash-chain integrity. Results available via `GET /api/healthcheck`.
- **Tamper-evident audit trail** – each audit log entry contains `prev_hash = sha256(previous raw entry)`, forming a hash chain per daily log file. Includes `verify_audit_chain()` for on-demand integrity verification. Addresses GxP and BSI baseline protection requirements.
- **Time-budgeted summary processing** – processes events newest-first and stops cleanly when less than 15 minutes remain before the night-mode window closes. Remaining events carry over to the next night.
- **Persistent logging for all containers** – scheduler, events, and settings containers now write rotating log files to the shared volume. Docker stdout is snapshot before each redeployment. No log data is lost on container recreation.
- **Deterministic summaries for binary files** – ZIP, EXE, ISO, MSI, TAR.GZ, and other non-extractable formats are never sent to the LLM. A filename-based summary is generated using a domain-specific abbreviation table (e.g., "KBV FHIR eRezept · Version 1.4.2 (Paket)").
- **Developer tooling** – ruff (lint + format) and mypy (type checking) configured as pre-commit hooks. Policy tests enforce lint compliance across the entire codebase.
- **Comprehensive documentation** – Developer Guide (12 sections, architecture through troubleshooting) for human developers, and AI Handover document (13 sections including 9 known pitfalls with root causes and fixes) for AI coding tool continuity.

### Changed
- **Optimized night-mode scheduling** – full pipeline runs in logical sequence: fetchers (23:00–00:00), aggregator (00:30), summary generator (01:00, 3h budget), deep scan (01:30, 2.5h worker time). Regression test prevents future cron changes from undermining time budgets.
- **Healthcheck liveness mode** – new `--liveness` flag maps "degraded" to exit 0 (Docker-healthy). Fresh installations no longer report unhealthy before the first night run. Full three-level exit codes remain available for monitoring scripts.
- Codebase formatted and modernized via ruff. No semantic changes.

### Fixed
- **Logging isolation** – importing modules no longer installs file handlers as a side effect. Previously, the healthcheck's import validation rerouted all scheduler logs to the wrong file for an entire night run. Three regression tests prevent recurrence.
- **KBV encoding** – Apache directory listings with UTF-8 paths (e.g., "UV-GOÄ") were decoded as Latin-1, producing garbled characters.
- **KBV phantom updates** – Zulassungsverzeichnis PDFs appeared daily as "changed" due to ±1 KB rounding in Apache's size display. Configurable size tolerance filters noise while preserving real change detection.
- **PDF URL parsing** – PDF URLs in event metadata were incorrectly parsed as HTML, causing encoding warnings and garbage input to the LLM.
- **Deep scan formatting** – LLM output normalization removes duplicate headers, converts inconsistent list markers, and strips markdown bold artifacts.
- **Installer disk space** – Ollama image pull now runs only when the image is missing, preventing "no space left on device" on small customer VMs.
- Undefined variable bug in summary pipeline caught by ruff static analysis.
- Summary generator previously received only 10 minutes of night-mode budget — cron schedule reorganized to provide 3 hours.

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
