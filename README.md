
# Sovereign Reliability Demonstrator

The **Sovereign Reliability Demonstrator** is a high-fidelity visualization and verification harness designed to showcase deterministic fleet synchronization. It provides a real-time "Diagnostic Matrix" coupled with cryptographic audit trails, allowing operators to witness, stress-test, and mathematically verify the reliability of a sovereign system under varying entropy conditions.

## 🚀 Quickstart & Sanity Check

**Prerequisites**: Node.js 18+

1.  **Install**:
    ```bash
    npm install
    ```
2.  **Run**:
    ```bash
    npm run dev
    ```
3.  **Open**: [http://localhost:3000](http://localhost:3000) (or port shown in terminal)
4.  **Gold Run**:
    *   Click **"Start Gold Run (90s)"** in the top-left UI.
    *   Wait for the sequence (Baseline → Stress → Boundary) to complete.
    *   Click **"Commit/Export"** to save the `fingerprint-<HASH>.json`.
    *   **Replay**: Drag that JSON back into the "Evidence Vault" drop zone to verify the run.

## 🚀 How to Produce Evidence (Gold Run)
To generate a verifiable "Sovereign Fingerprint":
1. Open the UI and select **"Start Gold Run (90s)"**.
2. **Phase 1 (Baseline)**: System runs at 0% entropy for 30s.
3. **Phase 2 (Stress)**: System ramps to 50% entropy for 30s.
4. **Phase 3 (Boundary)**: System tests limits at 80% entropy for 30s.
5. Once complete, click **"Commit/Export"** in the Evidence Vault.
6. Move the resulting `.json` file to `/evidence/runs/`.

## 🛠 How to Verify Evidence (CLI)
Install dependencies:
```bash
npm install
```

Verify an artifact's integrity:
```bash
npm run audit:verify evidence/runs/fingerprint-<HASH>.json
```

Generate a formal Appendix A-1 audit report:
```bash
npm run audit:report evidence/runs/fingerprint-<HASH>.json
```

## 🔍 How to Replay Evidence (UI)
1. Launch the app.
2. Click **"Load External Fingerprint"** in the Evidence Vault.
3. Once loaded, the **Verification Certificate** will appear.
4. Observe the replay to confirm the "Diagnostic Matrix" matches the audited metrics.

## ⚖️ Forensic Integrity
All artifacts are protected by a deterministic FNV-1a signature. The verification toolchain re-derives all claims directly from raw sample data, ensuring that "Sovereign" status is mathematically earned, not just reported.

---
*SpiralOS Phase Controller Toolchain*
