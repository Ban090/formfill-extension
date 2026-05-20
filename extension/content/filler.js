const Filler = (() => {
  function getActiveAdapter() {
    if (typeof WorkdayAdapter !== 'undefined' && WorkdayAdapter.isWorkday()) return WorkdayAdapter;
    return GenericAdapter;
  }

  function triggerChange(el) {
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true }));
  }

  function fillText(el, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(el, value);
    } else {
      el.value = value;
    }
    triggerChange(el);
  }

  function fillSelect(el, entry) {
    const options = Array.from(el.options);
    let match = options.find(o => o.value === entry.value);

    if (!match && entry.options) {
      const storedText = Normalizer.option(
        entry.options.find(o => o.value === entry.value)?.text || ''
      );
      match = options.find(o => Normalizer.option(o.text) === storedText);
    }

    if (!match) {
      const target = Normalizer.option(entry.value);
      match = options.find(o => {
        const t = Normalizer.option(o.text);
        return t.includes(target) || target.includes(t);
      });
    }

    if (match) { el.value = match.value; triggerChange(el); return true; }
    return false;
  }

  function fillRadio(elements, entry) {
    let target = elements.find(el => el.value === entry.value);

    if (!target && entry.options) {
      const storedOpt = entry.options.find(o => o.value === entry.value);
      if (storedOpt) {
        const storedLabel = Normalizer.option(storedOpt.label || storedOpt.value);
        for (const el of elements) {
          const elLabel = Normalizer.option(Detector.getLabelText(el) || el.value);
          if (elLabel === storedLabel || elLabel.includes(storedLabel)) { target = el; break; }
        }
      }
    }

    if (target) { target.checked = true; triggerChange(target); return true; }
    return false;
  }

  function fillCheckbox(el, value) {
    el.checked = Boolean(value);
    triggerChange(el);
  }

  async function fillPage() {
    const adapter = getActiveAdapter();
    const answers  = await Storage.getAnswers();
    const storedKeys = Object.keys(answers);
    const fields   = adapter.detectFields();
    const stats    = { filled: 0, skipped: 0, unmatched: [] };

    console.info('[FormFill] Fill — detected fields:', fields.map(f => `${f.labelText} [${f.type}]`));
    console.info('[FormFill] Stored keys:', storedKeys);

    for (const field of fields) {
      if (field.type === 'file') { stats.skipped++; continue; }

      const labelText = field.labelText;
      if (!labelText) { stats.skipped++; continue; }

      const fieldKey = Normalizer.key(labelText);
      let entry = answers[fieldKey];
      if (!entry) {
        const best = Matcher.findBestMatch(fieldKey, storedKeys);
        if (best) {
          console.info(`[FormFill] Fuzzy match: "${fieldKey}" → "${best.key}" (score ${best.score.toFixed(2)})`);
          entry = answers[best.key];
        }
      }

      if (!entry) { stats.unmatched.push(labelText); continue; }

      let ok = false;
      if (field.type === 'radio') {
        ok = fillRadio(field.elements, entry);
      } else if (field.type === 'checkbox') {
        fillCheckbox(field.element, entry.value); ok = true;
      } else if (field.type === 'select') {
        ok = fillSelect(field.element, entry);
      } else if (field.type === 'workday-select') {
        ok = await WorkdayAdapter.fillWorkdaySelect(field, entry.value);
      } else {
        fillText(field.element, entry.value); ok = true;
      }

      if (ok) stats.filled++;
      else stats.skipped++;
    }

    console.info('[FormFill] Stats:', stats);
    return stats;
  }

  return { fillPage };
})();
