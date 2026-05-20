const Normalizer = (() => {
  function label(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[*:?()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Canonical key for storage: strip punctuation, collapse spaces, lowercase
  function key(text) {
    return label(text).replace(/\s/g, '_');
  }

  // Normalize select/radio option text for comparison
  function option(text) {
    if (!text) return '';
    return text.toLowerCase().trim();
  }

  return { label, key, option };
})();
