# RegMon

**Automated Regulatory Monitoring for German Healthcare IT**

RegMon tracks regulatory publications from G-BA, Gematik, and KBV — the three bodies whose decisions shape German healthcare IT compliance. It replaces the manual, error-prone process of monitoring regulatory changes with an automated pipeline that classifies, prioritizes, and documents everything.

---

## Problem

Healthcare IT providers in Germany face a fragmented regulatory landscape. Relevant publications are scattered across multiple institutional websites, published in inconsistent formats, and carry varying degrees of urgency. Missing a critical update — a new TI connector specification, a changed KBV validation rule, a revised G-BA directive — means compliance risk, audit findings, or worse.

Most organizations handle this with manual checks and spreadsheet tracking. That doesn't scale, and it doesn't catch what falls through the cracks.

## Approach

RegMon is a FastAPI-based monitoring platform that:

- **Scrapes** official publication pages from G-BA, Gematik, and KBV on a configurable schedule
- **Classifies** incoming publications by severity and domain relevance using rule-based heuristics
- **Prioritizes** items that require immediate attention vs. informational updates
- **Generates audit trails** — every detected change is timestamped and logged, producing compliance-ready documentation
- **Serves a dashboard** for at-a-glance regulatory status, filterable by source, severity, and date range

The system is designed for robustness: scraper health monitoring, graceful degradation on source changes, and structured error reporting.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   G-BA       │     │   Gematik    │     │    KBV       │
│   Scraper    │     │   Scraper    │     │   Scraper    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────┬───────┘────────────────────┘
                    │
            ┌───────▼────────┐
            │  Classification │
            │  & Severity     │
            │  Engine         │
            └───────┬────────┘
                    │
         ┌──────────▼──────────┐
         │   Storage + Audit   │
         │   Trail Generation  │
         └──────────┬──────────┘
                    │
            ┌───────▼────────┐
            │   FastAPI       │
            │   Dashboard     │
            └────────────────┘
```

## Status

Active development. This repository documents the architecture and design decisions. The production instance is deployed privately.

## Context

RegMon is part of a broader focus on compliance automation for regulated industries. Related work includes [JuraScraper](https://github.com/RiswanHassen/JuraScraper) for German legal text retrieval.

## Contact

Riswan Hassen — [riswanhassen@gmail.com](mailto:riswanhassen@gmail.com) · [LinkedIn](https://linkedin.com/in/riswanhassen)
