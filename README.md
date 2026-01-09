# Sovereign Reliability Lab

[![Cold Audit](https://github.com/ZoaGrad/sovereign-reliability-lab/actions/workflows/cold-audit.yml/badge.svg)](https://github.com/ZoaGrad/sovereign-reliability-lab/actions/workflows/cold-audit.yml)
![Node.js](https://img.shields.io/badge/node-18%2B-blue)

### Deterministic Fleet Synchronization • Forensic Verification • Reproducible Evidence

> A research-grade experimental harness for proving deterministic workload coordination under stochastic network conditions.
> Produces auditable evidence artifacts instead of screenshots or dashboards.

---

## What This Is

Most reliability demos visually “look stable” but cannot be independently verified.
They smooth graphs, hide dropped events, and rely on trust in the UI.

**Sovereign Reliability Lab** is a deterministic synchronization simulator that generates **tamper-evident forensic artifacts** proving whether a coordination algorithm maintains temporal partitioning under noise.

It is designed to answer one question:

> **Can a distributed fleet preserve deterministic timing structure when subjected to realistic network jitter and packet loss?**

The system produces machine-verifiable evidence that can be audited without trusting the UI.

---

## What It Demonstrates

✔ Deterministic slot allocation using stable hashing
✔ Global barrier synchronization across a worker fleet
✔ Stochastic transport noise injection (Gaussian jitter + tail spikes)
✔ Structural integrity measurement (Spread-of-Arrivals Index)
✔ Persistence-gated resilience boundary detection
✔ Tamper-evident evidence export (canonical hashing)
✔ Independent CLI verification and report generation
✔ Full forensic replay from raw data

---

## What It Does *Not* Claim

✘ Not a production scheduler
✘ Not a cryptographic security system
✘ Not a real network emulator
✘ Not optimized for high-frequency trading or sub-millisecond accuracy
✘ Not a consensus or distributed database

This is a **measurement instrument**, not a deployment artifact.

---

## How It Works (High Level)

1. A global barrier tick synchronizes a fleet of simulated workers.
2. Each worker receives a deterministic time slot derived from a stable hash.
3. Network noise is injected after scheduling (transport jitter + spikes).
4. Arrival distributions are measured per tick.
5. Structural quality is quantified using a normalized spread metric (SPI).
6. A persistence gate promotes the maximum sustainable noise boundary (CSE).
7. All raw samples, configuration, and metrics are exported as a signed artifact.
8. A headless auditor recomputes every metric directly from the samples.

If the exported data is modified, verification fails.

---

## Quickstart

**Prerequisites**

* Node.js 18+

**Install**

```bash
npm install
```

**Run the UI**

```bash
npm run dev
```

Open the local URL shown in the terminal.

---

## Run the Standardized Experiment ("Gold Run")

The system includes a deterministic 90-second experiment sequence.

1. Click **Start Gold Run (90s)** in the UI.
2. The system automatically:

   * Establishes a baseline.
   * Injects controlled network entropy.
   * Measures structural stability.
   * Generates an evidence artifact.
3. Click **Commit / Export** to download the fingerprint JSON.
4. Drag the file back into the UI to verify replay integrity.

This produces a portable proof artifact.

---

## Verify Evidence via CLI (Headless)

All verification logic runs outside the browser.

**Verify integrity**

```bash
npm run audit:verify evidence/runs/fingerprint-XXXX.json
```

Exit codes:

* `0` — Validated
* `2` — Tampered
* `3` — Evidence deficit

**Generate formal audit report**

```bash
npm run audit:report evidence/runs/fingerprint-XXXX.json
```

Outputs a Markdown Appendix A-1 audit report.

---

## Repository Structure

```
cmd/                 # CLI auditor
utils/forensics.ts   # Canonical verification engine
components/          # UI visualization
services/            # Simulation logic
evidence/
  runs/              # Raw evidence artifacts
  reports/           # Generated audit reports
  protocol/          # Frozen forensic rules
test/                # Forensic unit tests
```

---

## Reproducibility & Auditability

This project supports:

* Deterministic experiment replay
* Canonical serialization for tamper detection
* Independent recomputation of metrics
* CI-enforced artifact validation
* Formal audit report generation

An auditor does not need to trust the UI.

They only need the JSON artifact and the verifier.

---

## License

MIT
