# RegMon

**Automated Regulatory Monitoring for Healthcare IT**

RegMon is an on-premise system that tracks regulatory changes across German healthcare IT sources — automatically, daily, and with a full audit trail. It replaces manual monitoring with a pipeline that detects changes, classifies them deterministically, adds clearly labelled AI summaries, and documents everything for compliance teams.

**In production since Q1 2026**, developed in collaboration with [Basysdata GmbH](https://www.basysdata.com) (Switzerland), a HealthIT company focused on medical informatics.

---

## Problem

Healthcare IT providers in Germany face a fragmented regulatory landscape. Relevant publications are scattered across institutional websites, published in inconsistent formats, and carry varying degrees of urgency. Missing a critical update — a new TI connector specification, a changed KBV validation rule, a revised G-BA directive — means compliance risk, audit findings, or worse.

Most organizations handle this with manual checks, email newsletters, and spreadsheet tracking. That doesn't scale, it doesn't catch what falls through the cracks, and it produces no audit trail.

## What RegMon Does

- **Monitors** official sources daily: G-BA, KBV (12 web pages + IT-Update file tree), Gematik, and customer-specific sources such as DGP Pathology and the oBDS XML schema registry — extensible via a plugin architecture; any RSS feed can be added from the admin panel
- **Detects changes** — new publications, modified documents, removed content — with per-source change detection and deduplication
- **Records before it remembers** — a change is written to a delta file before the fetcher marks it as seen; a partial fetch is reported as an error, never as an empty day; missed runs are caught up after a restart, and the daily self-test flags every source without a successful run in the last 26 hours
- **Extracts and caches PDF content** for analysis, with SHA256-based content-addressed storage
- **Generates AI summaries and tags** via an on-premise LLM (Ollama), with a deterministic fallback when text extraction fails — binary packages never reach the model; every AI-generated text is labelled as an AI draft
- **States the facts first** — an "Impact (facts)" line per event is derived purely from what RegMon knows (change type, document type, version change, deadline keywords, effective dates); generic AI advice is hidden
- **Classifies** severity with a configurable policy: deadline keywords, effective dates, and age escalation for items someone is working on
- **Produces audit trails** — every detected change and every operator action is timestamped and hash-chained across day boundaries; nothing is ever deleted, items older than 180 days move to an Archive tab
- **Leaves customer data alone** — an update never reads, writes, or deletes the ledger, audit trail, archive, or configuration; the installer backs up the runtime volume before every update
- **Serves a dashboard** for at-a-glance regulatory status, filterable by source, severity, status, and date range, plus an admin panel for sources, schedules, policy, users, and pipeline control
- **Runs entirely on-premise** — no data leaves the network. Designed for a Raspberry Pi 5 or equivalent embedded hardware

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Regulatory Sources                     │
│  G-BA · KBV (Web + Files) · Gematik · DGP · oBDS · RSS  │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Plugin Fetchers    │  One per source, own state,
              │   (Change Detection) │  delta file written before state
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   Aggregator         │  Deduplication, severity policy,
              │                      │  impact facts, audited auto-close
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
              │   Storage + Audit    │  JSON ledger, hash-chained audit
              │   Trail              │  log, run register, archive
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   FastAPI Dashboard  │  Status management, filtering,
              │   + Admin Panel      │  self-test, settings, users
              └─────────────────────┘
```

## Key Design Principles

- **Deterministic before LLM** — everything that can be solved with rules is solved with rules. The LLM enhances, it doesn't decide. RegMon functions without Ollama (graceful degradation), and AI output is always labelled.
- **On-premise, no data leaves** — no cloud APIs, no external dependencies at runtime. Runs on a Raspberry Pi 5 behind your firewall.
- **Immutable archive** — events are never deleted, only marked. Full compliance history from day one.
- **Delta before state** — a change counts as captured only once it is durably recorded. Errors are errors, not empty results.
- **Updates never touch your data** — the software is licensed; what it collects belongs to the customer. Volume backup before every update.
- **Night mode** — heavy processing (PDF downloads, LLM summaries, deep scans) runs during configurable night hours to keep daytime performance responsive.
- **One fetcher per source** — modular plugin architecture. Adding a new regulatory source is a single Python file.

## Deployment

RegMon runs as Docker containers (scheduler, dashboard API, settings API) with an optional Ollama instance for on-premise LLM capabilities. Designed for embedded hardware (Raspberry Pi 5, 8 GB RAM) but runs on any Linux system with Docker.

Two installation paths: an SSH-based onboarding installer for x86_64 servers, and a self-contained, checksum-verified offline bundle for environments without inbound access (console or USB). Both detect the target hardware and pick a fitting LLM profile.

Timezone is configurable via `REGMON_TIMEZONE` — deployable globally without code changes.

## Status

Active development. In production since Q1 2026.

Current version: **2.2.4** — see [CHANGELOG.md](CHANGELOG.md) for release notes.

This repository documents the architecture and public release notes. The source code is deployed privately.

## Standards and Validation

RegMon is not a medical device and is not itself certified. It is built so that a customer can validate it inside their own quality system:

- **ISO 13485 §4.1.6 / IEC/TR 80002-2 / GAMP 5** — validation of software used in the QMS: reproducible builds, a formal test plan with traceable test IDs, release notes at audit granularity
- **IEC 62304** — used as a process template for architecture, testing, and anomaly handling (not as a claim)
- **ISO 27001** — security by design: security headers, login rate limiting, role-based access, complete audit of administrative writes, no external data flows
- **GxP** — tamper-evident audit trail, data integrity, no silent mass changes to existing records
- **GDPR / Privacy by Design** — on-premise architecture, no telemetry, data minimisation
- **EU AI Act** — AI-generated text is labelled (Art. 50); severity and status are rule-based, the model never decides and never hides anything

## Context

RegMon is developed by [RH Advisory](https://rh-advisory.de) — strategy, cybersecurity, and compliance consulting for healthcare IT.

**Contact:** Riswan Hassen — [contact@rh-advisory.de](mailto:contact@rh-advisory.de) · [LinkedIn](https://linkedin.com/in/riswanhassen) · [Website](https://rh-advisory.de)
