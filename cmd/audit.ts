
import * as fs from 'fs';
import * as path from 'path';
// Explicitly import process to resolve type issues with argv, exit, and cwd in certain TypeScript configurations
import process from 'process';
import { verifyFingerprint, generateCLIAuditReport, generateAuditMarkdown, AuditStatus } from '../utils/forensics';

/**
 * Headless CLI for SpiralOS Phase Controller Audit Toolchain.
 * Usage: 
 *   ts-node cmd/audit.ts verify <path>
 *   ts-node cmd/audit.ts report <path> --out <report_path>
 */

const args = process.argv.slice(2);
const command = args[0];
const filePath = args[1];

if (!command || !filePath) {
  console.error("Usage:");
  console.error("  audit verify <path/to/fingerprint.json>");
  console.error("  audit report <path/to/fingerprint.json> --out <path/to/report.md>");
  process.exit(1);
}

try {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found at ${absolutePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(absolutePath, 'utf-8');
  const jsonData = JSON.parse(rawData);
  
  const report = verifyFingerprint(jsonData);

  if (command === 'verify') {
    console.log(generateCLIAuditReport(jsonData, report));
    process.exit(report.status);
  } else if (command === 'report') {
    const outIdx = args.indexOf('--out');
    const outPath = outIdx !== -1 ? args[outIdx + 1] : filePath.replace('.json', '.A-1.md');
    
    if (!outPath) {
      console.error("Error: --out path required.");
      process.exit(1);
    }

    const markdown = generateAuditMarkdown(jsonData, report);
    fs.writeFileSync(path.resolve(process.cwd(), outPath), markdown);
    console.log(`Successfully generated report: ${outPath}`);
    process.exit(0);
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
} catch (err) {
  console.error("Critical Failure:", err instanceof Error ? err.message : err);
  process.exit(1);
}
