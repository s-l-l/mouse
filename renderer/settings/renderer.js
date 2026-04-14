(function () {
  'use strict';

  const shortcutPresentation = document.getElementById('shortcutPresentation');
  const shortcutDrawing = document.getElementById('shortcutDrawing');
  const fadeSlider = document.getElementById('fadeSlider');
  const fadeValue = document.getElementById('fadeValue');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  let currentSettings = {};
  let tempShortcutPresentation = '';
  let tempShortcutDrawing = '';

  // ===== Shortcut key recording =====

  function setupShortcutInput(el, setter) {
    el.addEventListener('focus', () => {
      el.querySelector('.shortcut-keys').textContent = '请按键...';
    });

    el.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore lone modifier keys
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let key = e.key;
      if (key === ' ') key = 'Space';
      if (key.length === 1) key = key.toUpperCase();
      // Map common keys to Electron accelerator format
      const keyMap = {
        'Insert': 'Insert', 'Delete': 'Delete', 'Home': 'Home', 'End': 'End',
        'PageUp': 'PageUp', 'PageDown': 'PageDown',
        'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
        'Escape': 'Escape', 'Tab': 'Tab', 'Backspace': 'Backspace',
        'Enter': 'Return',
      };
      if (keyMap[key]) key = keyMap[key];

      parts.push(key);
      const combo = parts.join('+');

      el.querySelector('.shortcut-keys').textContent = formatShortcut(combo);
      setter(combo);
      el.blur();
    });

    el.addEventListener('blur', () => {
      // If no key was recorded, show current
      const current = el === shortcutPresentation ? tempShortcutPresentation : tempShortcutDrawing;
      if (!el.querySelector('.shortcut-keys').textContent.includes('请按')) return;
      el.querySelector('.shortcut-keys').textContent = current
        ? formatShortcut(current)
        : '点击录入';
    });
  }

  function formatShortcut(combo) {
    return combo
      .replace(/CommandOrControl/g, 'Ctrl')
      .replace(/\+/g, ' + ');
  }

  setupShortcutInput(shortcutPresentation, (v) => { tempShortcutPresentation = v; });
  setupShortcutInput(shortcutDrawing, (v) => { tempShortcutDrawing = v; });

  // ===== Fade slider =====

  fadeSlider.addEventListener('input', () => {
    const sec = (parseInt(fadeSlider.value) / 1000).toFixed(1);
    fadeValue.textContent = sec + ' 秒';
  });

  // ===== Save / Cancel =====

  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      shortcutPresentation: tempShortcutPresentation || currentSettings.shortcutPresentation,
      shortcutDrawing: tempShortcutDrawing || currentSettings.shortcutDrawing,
      fadeDuration: parseInt(fadeSlider.value),
    };

    const ok = await window.settingsAPI.saveSettings(newSettings);
    if (ok) {
      window.settingsAPI.closeSettings();
    }
  });

  cancelBtn.addEventListener('click', () => {
    window.settingsAPI.closeSettings();
  });

  // ===== Init =====

  window.settingsAPI.getSettings().then((settings) => {
    currentSettings = settings;
    tempShortcutPresentation = settings.shortcutPresentation;
    tempShortcutDrawing = settings.shortcutDrawing;

    shortcutPresentation.querySelector('.shortcut-keys').textContent =
      formatShortcut(settings.shortcutPresentation);
    shortcutDrawing.querySelector('.shortcut-keys').textContent =
      formatShortcut(settings.shortcutDrawing);

    fadeSlider.value = settings.fadeDuration;
    fadeValue.textContent = (settings.fadeDuration / 1000).toFixed(1) + ' 秒';
  });

})();
