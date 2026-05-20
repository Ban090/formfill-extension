const Learner = (() => {
  let active = false;

  function getActiveAdapter() {
    if (typeof WorkdayAdapter !== 'undefined' && WorkdayAdapter.isWorkday()) return WorkdayAdapter;
    return GenericAdapter;
  }

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
      const selected = Array.from(sel.selectedOptions).map(o => o.value);
      return sel.multiple ? selected : selected[0] || null;
    }
    if (field.type === 'file') return null;
    if (field.type === 'workday-select') {
      // Read the currently displayed value from the combobox button text
      const btn = field.element.querySelector('button') || field.element;
      const text = btn.innerText || btn.textContent || '';
      return text.trim() || null;
    }
    return field.element.value || null;
  }

  async function snapshot() {
    const adapter = getActiveAdapter();
    const fields = adapter.detectFields();
    let saved = 0;

    console.info('[FormFill] Detected fields:', fields.map(f => `${f.labelText} [${f.type}]`));

    for (const field of fields) {
      const labelText = field.labelText;
      if (!labelText) continue;

      const value = readValue(field);
      if (value === null || value === '' || value === false) continue;

      const fieldKey = Normalizer.key(labelText);
      const entry = { label: Normalizer.label(labelText), type: field.type, value };

      if (field.type === 'select') {
        entry.options = Array.from(field.element.options).map(o => ({ value: o.value, text: o.text }));
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

  function start() { active = true; }
  function stop()  { active = false; }
  function isActive() { return active; }

  return { start, stop, isActive, snapshot };
})();
