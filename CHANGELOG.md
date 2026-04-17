# Changelog

All notable changes to RegMon are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

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
