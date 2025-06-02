// client/src/utils/fingerprint.js
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise = null;

export const initFingerprint = () => {
  fpPromise = FingerprintJS.load();
};

export const getDeviceFingerprint = async () => {
  if (!fpPromise) {
    initFingerprint();
  }

  const fp = await fpPromise;
  const result = await fp.get();

  // Check if we're in development/test mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // In development, check if we already have a test fingerprint in sessionStorage
    let testFingerprint = sessionStorage.getItem('test-fingerprint');

    if (!testFingerprint) {
      // Generate a unique fingerprint for this tab/window
      testFingerprint = result.visitorId + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('test-fingerprint', testFingerprint);
    }

    console.log('Using test fingerprint:', testFingerprint);
    return testFingerprint;
  }

  // In production, use the real fingerprint
  return result.visitorId;
};

export const getUserIdentifier = async (username, partyCode) => {
  const fingerprint = await getDeviceFingerprint();
  return {
    username,
    partyCode,
    fingerprint,
    uniqueId: `${partyCode}-${fingerprint}-${username}`
  };
};