const Learner = (() => {
  let active = false;

  // Read current value from a field descriptor
  function readValue(field) {
    if (field.type === 'radio') {
      const checked = field.elements.find(el => el.checked);
      return checked ? checked.value : null;
    }
    if (field.type === 'checkbox') {
      return field.element.checked;
    }
    if (field.type === 'select') {
      const sel = field.element;
      // Support multi-select
      const selected = Array.from(sel.selectedOptions).map(o => o.value);
      return sel.multiple ? selected : selected[0] || null;
    }
    if (field.type === 'file') {
      // Can't read file input value for security reasons — skip
      return null;
    }
    return field.element.value || null;
  }

  // Snapshot all fields and their current values, save to storage
  async function snapshot() {
    const fields = Detector.detectFields();
    let saved = 0;

    for (const field of fields) {
      const labelText = field.labelText;
      if (!labelText) continue;

      const value = readValue(field);
      if (value === null || value === '' || value === false) continue;

      const fieldKey = Normalizer.key(labelText);
      const entry = {
        label: Normalizer.label(labelText),
        type: field.type,
        value,
      };

      // For select/radio, also store option texts for fuzzy matching later
      if (field.type === 'select') {
        entry.options = Array.from(field.element.options).map(o => ({
          value: o.value,
          text: o.text,
        }));
      }
      if (field.type === 'radio') {
        entry.options = field.elements.map(el => ({
          value: el.value,
          label: Detector.getLabelText(el) || el.value,
        }));
      }

      await Storage.saveAnswer(fieldKey, entry);
      saved++;
    }

    return saved;
  }

  function start() {
    active = true;
  }

  function stop() {
    active = false;
  }

  function isActive() {
    return active;
  }

  return { start, stop, isActive, snapshot };
})();
