
# RESEARCH METHOD & CLAIMS: SpiralOS Phase Controller

## Abstract
This instrument demonstrates deterministic mitigation of "Thundering Herd" events using a hash-based phase offset primitive. By partitioning concurrent worker execution into a bounded temporal corridor, we achieve fleet synchronization without the non-determinism of random jitter.

## Core Claims (Falsifiable)
1. **Deterministic Partitioning**: Phase offsets are computed via FNV-1a hashing of Instance IDs, ensuring immutable slotting across the execution corridor.
2. **Corridor Preservation**: The Spread-of-Arrivals Index (SPI) remains > 0.85 even under stochastic transport noise (entropy) up to a measurable Stress Envelope (CSE).
3. **Persistence Gating**: The Resilience Boundary (CSE) is only validated if stability holds for $K=3$ consecutive complete ticks, preventing claims based on transient outliers.
4. **Forensic Integrity**: Exported Fingerprints utilize canonical serialization and FNV-1a signatures to remain **tamper-evident**.

## Claim Lock (Audit Boundary)
**We explicitly claim:**
- Deterministic phase slotting partitions start times across a corridor.
- Corridor persistence under injected transport noise is measured by SPI.
- Resilience boundary (CSE) is only promoted after K complete stable ticks.
- Exported fingerprints are tamper-evident via canonical hashing + replay validation.

## Forensic Verification Methodology (The Cold Audit)
To ensure evidence integrity, every fingerprint must pass a **"Cold Audit"** before its claims are accepted.

1. **Integrity Check**: Recompute the FNV-1a hash of the canonicalized JSON payload. Any mismatch flags the artifact as tampered.
2. **Re-calculation**: SPI and CSE metrics are re-derived directly from the raw `samples` array, bypassing the summary block.
3. **Stability Trace**: Verification of the K-factor gating through the entire sample history, identifying every reset and quality breach.

## Verification Protocol (Appendix A-1)
Upon successful validation, the system generates a **Formal Audit Report (Appendix A-1)**. This Markdown document provides:
- Deterministic recomputation status.
- Stability Trace (initial stabilization and reset points).
- Repro instructions for peer review.

## The Evidence Vault
Serious reviewers should maintain a `/evidence` directory structured as follows:
- `/evidence/runs/`: Stores `.json` fingerprints and corresponding `.md` Appendix reports.
- `/evidence/protocol/`: Stores the canonical `forensics.ts` logic for independent audit.

---
*SpiralOS Phase Controller // Build 8834-A-PATCH-5*
