const WorkdayAdapter = (() => {
  function isWorkday() {
    return location.hostname.includes('myworkdayjobs.com') ||
           location.hostname.includes('workday.com') ||
           !!document.querySelector('[data-automation-id]');
  }

  // Resolve label from Workday's data-automation-label or inner label element
  function getLabelFromContainer(container) {
    // Most reliable: data-automation-label on the formField container
    const autoLabel = container.getAttribute('data-automation-label');
    if (autoLabel) return autoLabel.trim();

    // Inner <label> element
    const labelEl = container.querySelector('label');
    if (labelEl) {
      const clone = labelEl.cloneNode(true);
      clone.querySelectorAll('input,select,textarea,span[aria-hidden]').forEach(n => n.remove());
      const text = clone.innerText.replace(/\s*\*\s*$/, '').trim();
      if (text) return text;
    }

    // aria-label on the input itself
    const input = container.querySelector('input,textarea');
    if (input) {
      return input.getAttribute('aria-label') || input.getAttribute('placeholder') || '';
    }

    return '';
  }

  function detectFields() {
    const fields = [];

    // Workday wraps each field in [data-automation-id="formField"] or similar
    const containers = document.querySelectorAll(
      '[data-automation-id^="formField"], [data-automation-id*="-formField"]'
    );

    const seenRadioGroups = new Set();

    for (const container of containers) {
      const labelText = getLabelFromContainer(container);
      if (!labelText) continue;

      // Text / textarea
      const textarea = container.querySelector('textarea');
      if (textarea) {
        fields.push({ type: 'textarea', element: textarea, labelText, name: textarea.name || textarea.id });
        continue;
      }

      const textInput = container.querySelector('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])');
      if (textInput) {
        fields.push({ type: 'text', element: textInput, labelText, name: textInput.name || textInput.id });
        continue;
      }

      // Radio group
      const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
      if (radios.length > 0) {
        const groupName = radios[0].name;
        if (!seenRadioGroups.has(groupName)) {
          seenRadioGroups.add(groupName);
          fields.push({ type: 'radio', elements: radios, labelText, name: groupName });
        }
        continue;
      }

      // Checkbox
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (checkbox) {
        fields.push({ type: 'checkbox', element: checkbox, labelText, name: checkbox.name || checkbox.id });
        continue;
      }

      // Native select (rare in Workday but handle it)
      const select = container.querySelector('select');
      if (select) {
        fields.push({ type: 'select', element: select, labelText, name: select.name || select.id });
        continue;
      }

      // Workday custom dropdown — role="combobox" or data-automation-id containing "select"
      const combobox = container.querySelector('[role="combobox"], [data-automation-id*="select"], [data-automation-id*="dropdown"]');
      if (combobox) {
        fields.push({ type: 'workday-select', element: combobox, container, labelText, name: labelText });
        continue;
      }
    }

    // Also catch standalone inputs/textareas not inside formField containers (fallback)
    const standaloneSelector = 'input[aria-label]:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea[aria-label]';
    for (const el of document.querySelectorAll(standaloneSelector)) {
      const alreadyCovered = fields.some(f => f.element === el || (f.elements && f.elements.includes(el)));
      if (alreadyCovered) continue;
      const labelText = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
      if (!labelText) continue;
      fields.push({ type: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text', element: el, labelText, name: el.name || el.id });
    }

    return fields;
  }

  // Fill a Workday custom dropdown by clicking it and selecting the matching option
  async function fillWorkdaySelect(field, value) {
    const trigger = field.element.querySelector('button') || field.element;
    trigger.click();

    // Wait for options to render
    await new Promise(r => setTimeout(r, 600));

    // Workday renders options in a listbox (may be in document body, not inside container)
    const listbox = document.querySelector('[role="listbox"], [data-automation-id*="promptOption"], [data-automation-id*="selectOption"]');
    if (!listbox) return false;

    const options = listbox.querySelectorAll('[role="option"], li, [data-automation-id*="option"]');
    const normalizedValue = Normalizer.option(value);

    for (const opt of options) {
      const optText = Normalizer.option(opt.innerText || opt.textContent || '');
      if (optText === normalizedValue || optText.includes(normalizedValue) || normalizedValue.includes(optText)) {
        opt.click();
        await new Promise(r => setTimeout(r, 200));
        return true;
      }
    }

    // Close dropdown if no match found
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  }

  return { isWorkday, detectFields, fillWorkdaySelect, getLabelFromContainer };
})();
