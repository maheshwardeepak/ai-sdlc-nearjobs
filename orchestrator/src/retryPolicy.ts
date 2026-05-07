export const retryPolicy = {
  maxFixAttempts: 3,
  failFastOnMissingImplementation: true,
  failFastOnPlaceholderCode: true,
  requireBackendTests: true,
  requireFrontendTests: true,
  requireRealJavaFilesMinimum: 20
};
