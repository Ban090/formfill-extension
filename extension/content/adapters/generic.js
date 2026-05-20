// Generic adapter — wraps original Detector logic for non-ATS sites
const GenericAdapter = (() => {
  function isGeneric() { return true; } // fallback, always matches

  function detectFields() {
    return Detector.detectFields();
  }

  return { isGeneric, detectFields };
})();
