# Changelog

All notable changes to RegMon are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Time-budgeted summary processing** – the summary generator now processes events newest-first and stops cleanly when less than 15 minutes remain before the night-mode window closes. Remaining events carry over to the next night. Prevents long-running jobs from blocking subsequent scheduler slots.
- **Tamper-evident audit trail** – each audit log entry contains `prev_hash = sha256(previous raw entry)`, forming a hash chain per daily log file. Tampering, deletion, and insertion are deterministically detectable. Includes `verify_audit_chain()` for on-demand integrity verification. Addresses GxP and BSI baseline protection requirements.
- **Developer tooling** – ruff (lint + format) and mypy (type checking) configured as pre-commit hooks. A policy test ensures lint compliance across the entire codebase on every test run.
- **Optimized night-mode scheduling** – full pipeline now runs within the night window in logical sequence: fetchers (23:00–00:00), aggregator (00:30), summary generator (01:00, 3h budget), deep scan (01:30, 2.5h worker time). A regression test prevents future cron changes from undermining the time budget.

### Changed
- Codebase formatted and modernized via ruff: consistent Python syntax, sorted imports, uniform whitespace. No semantic changes.

### Fixed
- Summary generator previously received only 10 minutes of night-mode budget and processed zero events. Cron schedule reorganized to provide 3 hours of processing time.
- PDF URLs in event metadata were incorrectly parsed as HTML by BeautifulSoup, causing encoding warnings and garbage text being sent to the LLM. Non-HTML content types are now filtered before parsing, and explicit encoding hints are passed to the parser.
- Undefined variable bug in summary pipeline that could cause failures during night-mode PDF processing — caught by ruff static analysis.

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
