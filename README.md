# RegMon

**Automated Regulatory Monitoring for Healthcare IT**

RegMon is an on-premise system that tracks regulatory changes across German healthcare IT sources — automatically, daily, and with a full audit trail. It replaces manual monitoring with a pipeline that detects changes, classifies them, generates AI-powered summaries, and documents everything for compliance teams.

**In production since Q1 2026**, developed in collaboration with [Basysdata GmbH](https://www.basysdata.com) (Switzerland), a HealthIT company focused on medical informatics.

---

## Problem

Healthcare IT providers in Germany face a fragmented regulatory landscape. Relevant publications are scattered across institutional websites, published in inconsistent formats, and carry varying degrees of urgency. Missing a critical update — a new TI connector specification, a changed KBV validation rule, a revised G-BA directive — means compliance risk, audit findings, or worse.

Most organizations handle this with manual checks, email newsletters, and spreadsheet tracking. That doesn't scale, it doesn't catch what falls through the cracks, and it produces no audit trail.

## What RegMon Does

- **Monitors** official sources daily: G-BA, KBV (12 web pages + IT-Update file tree), Gematik, BVITG, DGP Pathology, oBDS XML — extensible via plugin architecture
- **Detects changes** — new publications, modified documents, removed content — using per-source change detection with deduplication
- **Extracts and caches PDF content** for analysis, with SHA256-based content-addressed storage
- **Generates AI summaries and tags** via on-premise LLM (Ollama), with deterministic fallback when text extraction fails — no hallucinations, no cloud dependency
- **Classifies** by domain relevance and urgency using rule-based heuristics and configurable policy
- **Produces audit trails** — every detected change is timestamped, archived, and immutable. Compliance-ready documentation out of the box
- **Serves a dashboard** for at-a-glance regulatory status, filterable by source, severity, status, and date range
- **Runs entirely on-premise** — no data leaves the network. Designed for a Raspberry Pi 5 or equivalent embedded hardware

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Regulatory Sources                     │
│  G-BA · KBV (Web + Files) · Gematik · BVITG · DGP · …  │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Plugin Fetchers    │  One per source, configurable schedule
              │   (Change Detection) │  Delta files → State management
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   Aggregator         │  Deduplication, severity classification,
              │                      │  deterministic metadata enrichment
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
  │  Summary    │ │  Tagger     │ │  Deep Scan  │
  │  Generator  │ │  (Domain,   │ │  (PDF DL +  │
  │  (LLM)     │ │   Deadlines)│ │   Analysis) │
  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
              ┌──────────▼──────────┐
              │   Storage + Audit    │  JSON archive, audit log,
              │   Trail              │  immutable event history
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   FastAPI Dashboard  │  Status management, filtering,
              │   + Admin Panel      │  healthcheck, settings UI
              └─────────────────────┘
```

## Key Design Principles

- **Deterministic before LLM** — everything that can be solved with rules is solved with rules. The LLM enhances, it doesn't decide. RegMon functions without Ollama (graceful degradation).
- **On-premise, no data leaves** — no cloud APIs, no external dependencies at runtime. Runs on a Raspberry Pi 5 behind your firewall.
- **Immutable archive** — events are never deleted, only marked. Full compliance history from day one.
- **Night mode** — heavy processing (PDF downloads, LLM summaries, deep scans) runs during configurable night hours to keep daytime performance responsive.
- **One fetcher per source** — modular plugin architecture. Adding a new regulatory source is a single Python file.

## Deployment

RegMon runs as Docker containers (scheduler, dashboard API, settings API) with an optional Ollama instance for on-premise LLM capabilities. Designed for embedded hardware (Raspberry Pi 5, 8 GB RAM) but runs on any Linux system with Docker.

Timezone is configurable via `REGMON_TIMEZONE` — deployable globally without code changes.

## Status

Active development. Production deployment since March 2026.

Current version: **2.1.5** — see [CHANGELOG.md](CHANGELOG.md) for release notes.

This repository documents the architecture and public release notes. The source code is deployed privately.

## Certification Targets

RegMon is designed with the following certification standards in mind:

- **ISO 13485** — Quality Management for Medical Devices
- **IEC 62304** — Software Lifecycle for Medical Device Software
- **ISO 27001** — Information Security Management
- **GxP Compliance** — Audit trail, data integrity, traceability
- **GDPR / Privacy by Design** — On-premise architecture, no external data flows

## Context

RegMon is developed by [RH Advisory](https://rh-advisory.de) — strategy, cybersecurity, and compliance consulting for healthcare IT.

**Contact:** Riswan Hassen — [contact@rh-advisory.de](mailto:contact@rh-advisory.de) · [LinkedIn](https://linkedin.com/in/riswanhassen) · [Website](https://rh-advisory.de)
