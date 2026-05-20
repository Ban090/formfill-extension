const Detector = (() => {
  // Resolve human-readable label for a field element
  function getLabelText(el) {
    // 1. aria-label
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');

    // 2. aria-labelledby
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ref = document.getElementById(labelledBy);
      if (ref) return ref.innerText;
    }

    // 3. <label for="id">
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.innerText;
    }

    // 4. Wrapping <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      clone.querySelectorAll('input,select,textarea').forEach(n => n.remove());
      return clone.innerText;
    }

    // 5. Preceding sibling or parent text nodes
    const parent = el.parentElement;
    if (parent) {
      const prev = parent.querySelector('label, [class*="label"], [class*="Label"]');
      if (prev && prev !== el) return prev.innerText;
    }

    // 6. placeholder as fallback
    return el.placeholder || el.name || '';
  }

  function getFieldType(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'select';
    if (tag === 'input') {
      const type = (el.type || 'text').toLowerCase();
      if (type === 'radio') return 'radio';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'file') return 'file';
      return 'text';
    }
    return 'unknown';
  }

  // Collect all fillable fields in a container (default: document)
  function detectFields(root = document) {
    const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select';
    const elements = Array.from(root.querySelectorAll(selector));

    // Deduplicate radio groups — one entry per name
    const seen = new Set();
    const fields = [];

    for (const el of elements) {
      const type = getFieldType(el);

      if (type === 'radio') {
        if (seen.has(`radio_${el.name}`)) continue;
        seen.add(`radio_${el.name}`);
        // Collect all radios with same name
        const group = Array.from(root.querySelectorAll(`input[type="radio"][name="${el.name}"]`));
        const labelText = getLabelText(group[0]);
        fields.push({ type: 'radio', elements: group, labelText, name: el.name });
        continue;
      }

      const labelText = getLabelText(el);
      fields.push({ type, element: el, labelText, name: el.name || el.id });
    }

    return fields;
  }

  return { detectFields, getLabelText, getFieldType };
})();
