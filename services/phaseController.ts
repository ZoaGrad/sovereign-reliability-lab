
/**
 * FNV-1a hash implementation for 32-bit unsigned integers.
 * This mirrors the logic in Go's hash/fnv.
 */
function fnv32a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    // Standard 32-bit FNV-1a: hash = (hash ^ byte) * prime
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0; // Ensure unsigned 32-bit
}

export class PhaseController {
  private enabled: boolean;
  private baseOffset: number;
  private maxSkew: number;

  constructor(enabled: boolean, baseOffsetMs: number = 57, maxSkewMs: number = 200) {
    this.enabled = enabled;
    this.baseOffset = baseOffsetMs;
    this.maxSkew = maxSkewMs;
  }

  /**
   * computeDelay mirrors the Go implementation's logic for deterministic skew.
   */
  public computeDelay(instanceId: string, contextType: string = "poller"): number {
    if (!this.enabled) return 0;

    const hashVal = fnv32a(instanceId + contextType);
    const maxUint32 = 0xFFFFFFFF;
    
    let skew = 0;
    if (this.maxSkew > 0) {
      skew = (hashVal / maxUint32) * this.maxSkew;
    }
    
    return this.baseOffset + skew;
  }

  /**
   * Emulates the WaitDelay primitive in a JS environment.
   */
  public async waitDelay(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
