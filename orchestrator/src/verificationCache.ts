type CachedVerification = {
  timestamp: number;
  result: unknown;
};

let latestVerification: CachedVerification | null = null;

export function saveVerificationResult(result: unknown) {
  latestVerification = {
    timestamp: Date.now(),
    result
  };
}

export function loadVerificationResult(maxAgeMs = 300000): unknown | null {
  if (!latestVerification) {
    return null;
  }

  const age = Date.now() - latestVerification.timestamp;

  if (age > maxAgeMs) {
    return null;
  }

  return latestVerification.result;
}

export function clearVerificationCache() {
  latestVerification = null;
}
