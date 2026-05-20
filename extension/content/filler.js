const Filler = (() => {
  // Dispatch native events so React/Vue/Angular pick up the change
  function triggerChange(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function fillText(el, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el), 'value'
    );
    if (nativeInputValueSetter && nativeInputValueSetter.set) {
      nativeInputValueSetter.set.call(el, value);
    } else {
      el.value = value;
    }
    triggerChange(el);
  }

  function fillSelect(el, entry) {
    const options = Array.from(el.options);

    // Try exact value match first
    let match = options.find(o => o.value === entry.value);

    // Try text match on stored options
    if (!match && entry.options) {
      const storedText = Normalizer.option(
        entry.options.find(o => o.value === entry.value)?.text || ''
      );
      match = options.find(o => Normalizer.option(o.text) === storedText);
    }

    // Fuzzy text match
    if (!match) {
      const targetText = Normalizer.option(entry.value);
      match = options.find(o => Normalizer.option(o.text).includes(targetText) || targetText.includes(Normalizer.option(o.text)));
    }

    if (match) {
      el.value = match.value;
      triggerChange(el);
      return true;
    }
    return false;
  }

  function fillRadio(elements, entry) {
    // Try exact value match
    let target = elements.find(el => el.value === entry.value);

    // Fuzzy: match by label text if stored options available
    if (!target && entry.options) {
      const storedOpt = entry.options.find(o => o.value === entry.value);
      if (storedOpt) {
        const storedLabel = Normalizer.option(storedOpt.label || storedOpt.value);
        for (const el of elements) {
          const elLabel = Normalizer.option(Detector.getLabelText(el) || el.value);
          if (elLabel === storedLabel || elLabel.includes(storedLabel)) {
            target = el;
            break;
          }
        }
      }
    }

    if (target) {
      target.checked = true;
      triggerChange(target);
      return true;
    }
    return false;
  }

  function fillCheckbox(el, value) {
    el.checked = Boolean(value);
    triggerChange(el);
  }

  // Main fill routine — returns stats { filled, skipped, unmatched }
  async function fillPage() {
    const answers = await Storage.getAnswers();
    const storedKeys = Object.keys(answers);
    const fields = Detector.detectFields();

    const stats = { filled: 0, skipped: 0, unmatched: [] };

    for (const field of fields) {
      if (field.type === 'file') { stats.skipped++; continue; }

      const labelText = field.labelText;
      if (!labelText) { stats.skipped++; continue; }

      const fieldKey = Normalizer.key(labelText);

      // Exact match first, then fuzzy
      let entry = answers[fieldKey];
      if (!entry) {
        const best = Matcher.findBestMatch(fieldKey, storedKeys);
        if (best) entry = answers[best.key];
      }

      if (!entry) {
        stats.unmatched.push(labelText);
        continue;
      }

      let ok = false;
      if (field.type === 'radio') {
        ok = fillRadio(field.elements, entry);
      } else if (field.type === 'checkbox') {
        fillCheckbox(field.element, entry.value);
        ok = true;
      } else if (field.type === 'select') {
        ok = fillSelect(field.element, entry);
      } else {
        // text / textarea
        fillText(field.element, entry.value);
        ok = true;
      }

      if (ok) stats.filled++;
      else stats.skipped++;
    }

    return stats;
  }

  return { fillPage };
})();
