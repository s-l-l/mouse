(function () {
  'use strict';

  const drawCanvas = document.getElementById('drawCanvas');
  const fadeCanvas = document.getElementById('fadeCanvas');
  const edgeGlow = document.getElementById('edgeGlow');

  const engine = new DrawingEngine(drawCanvas, fadeCanvas);
  let isDrawingEnabled = false;
  let toolbarBounds = null;

  // ===== Toolbar exclusion =====

  function isInToolbar(screenX, screenY) {
    if (!toolbarBounds) return false;
    return (
      screenX >= toolbarBounds.x && screenX <= toolbarBounds.x + toolbarBounds.width &&
      screenY >= toolbarBounds.y && screenY <= toolbarBounds.y + toolbarBounds.height
    );
  }

  window.overlayAPI.onToolbarBounds((bounds) => {
    toolbarBounds = bounds;
  });

  // ===== Mouse handlers =====
  // Overlay captures mouse when drawing mode is ON.
  // Toolbar is a separate window with higher z-level, so it gets clicks first in its area.
  // The toolbar exclusion check here is a safety backup.

  document.addEventListener('mousedown', (e) => {
    if (!isDrawingEnabled || e.button !== 0) return;
    if (isInToolbar(e.screenX, e.screenY)) return;
    engine.startDrawing(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDrawingEnabled || !engine.isDrawing) return;
    engine.continueDrawing(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    if (engine.isDrawing) engine.endDrawing();
  });

  // ===== IPC =====

  window.overlayAPI.onModeChanged((state) => {
    isDrawingEnabled = state.drawing;
    document.body.classList.toggle('drawing', state.drawing);

    if (state.presentation) {
      edgeGlow.classList.add('visible');
    } else {
      edgeGlow.classList.remove('visible');
      engine.endDrawing();
      engine.clearAll();
    }
  });

  window.overlayAPI.onDrawSettingsChanged((s) => {
    if (s.mode !== undefined) engine.setMode(s.mode);
    if (s.color !== undefined) engine.setColor(s.color);
    if (s.lineWidth !== undefined) engine.setLineWidth(s.lineWidth);
    if (s.clear) engine.clearAll();
  });

  window.overlayAPI.onFadeDurationChanged((ms) => {
    engine.fadeDuration = ms;
  });

  // Init
  Promise.all([
    window.overlayAPI.getPresentationState(),
    window.overlayAPI.getDrawingState(),
    window.overlayAPI.getFadeDuration()
  ]).then(([pres, drawing, fade]) => {
    isDrawingEnabled = drawing;
    document.body.classList.toggle('drawing', drawing);
    if (pres) edgeGlow.classList.add('visible');
    engine.fadeDuration = fade;
  });

})();
