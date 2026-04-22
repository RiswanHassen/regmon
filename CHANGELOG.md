# Changelog

All notable changes to RegMon are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Daily self-test** – automated preflight check runs 10 minutes before the first nightly fetcher. Validates scheduler jobs, log files and routing, volume writability, Ollama availability (graceful degradation), recent fetcher errors, and audit log hash-chain integrity. Results available via `GET /api/healthcheck`.
- **Tamper-evident audit trail** – each audit log entry contains `prev_hash = sha256(previous raw entry)`, forming a hash chain per daily log file. Tampering, deletion, and insertion are deterministically detectable. Includes `verify_audit_chain()` for on-demand integrity verification. Addresses GxP and BSI baseline protection requirements.
- **Per-container log persistence** – all three containers (scheduler, events, settings) now write to rotating log files on the persistent volume. Docker stdout is snapshot before each container recreate. No logs are ever lost during deployments.
- **Time-budgeted summary processing** – the summary generator processes events newest-first and stops cleanly when less than 15 minutes remain before the night-mode window closes. Remaining events carry over to the next night.
- **Developer tooling** – ruff (lint + format) and mypy (type checking) configured as pre-commit hooks. A policy test ensures lint compliance across the entire codebase on every test run.
- **Optimized night-mode scheduling** – full pipeline now runs within the night window in logical sequence: fetchers (23:00–00:00), aggregator (00:30), summary generator (01:00, 3h budget), deep scan (01:30, 2.5h worker time). A regression test prevents future cron changes from undermining the time budget.

### Changed
- Codebase formatted and modernized via ruff: consistent Python syntax, sorted imports, uniform whitespace. No semantic changes.

### Fixed
- **Binary files never reach the LLM** – ZIP, EXE, ISO, MSI, TAR.GZ and related binary formats are now short-circuited before any LLM call. A deterministic filename-based summary is generated instead (e.g. "KBV FHIR eRezept · Version 1.4.2 (Paket)"). Eliminates hallucinations where the LLM invented content from filenames.
- **Deep Scan format consistency** – LLM output is now normalized to remove markdown artifacts. Prompt tightened with explicit section structure requirements.
- **Logging isolation** – `configure_logging()` moved from module-level to `main()` in all entrypoints. Previously, the healthcheck's import check triggered logging reconfiguration, routing all scheduler logs to the wrong file for an entire night run.
- **KBV Apache directory encoding** – UTF-8 hint passed to BeautifulSoup parser, fixing garbled German umlauts in directory names.
- **KBV phantom updates eliminated** – Apache directory size rounding (±1 KB) no longer triggers false change detection. Configurable tolerance via environment variable.
- **PDF URL parsing** – non-HTML content types are now filtered before BeautifulSoup parsing, eliminating encoding warnings and garbage text being sent to the LLM.
- Undefined variable bug in summary pipeline caught by ruff static analysis.
- Summary generator cron schedule reorganized to provide 3 hours of processing time instead of 10 minutes.

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
