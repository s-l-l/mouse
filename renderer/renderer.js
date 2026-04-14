/**
 * Renderer process for Mouse Spotlight
 *
 * Two states within presentation mode:
 *  - Drawing ON  (Insert toggled ON):  window captures mouse, user can draw
 *  - Drawing OFF (Insert toggled OFF):  window click-through, user can operate desktop
 *
 * Ctrl+Alt+D = toggle presentation mode (toolbar visibility)
 * Insert     = toggle drawing capture on/off
 * Escape     = exit presentation mode
 */

(function () {
  'use strict';

  const drawCanvas = document.getElementById('drawCanvas');
  const fadeCanvas = document.getElementById('fadeCanvas');
  const toolbar = document.getElementById('toolbar');
  const edgeGlow = document.getElementById('edgeGlow');
  const clearBtn = document.getElementById('clearBtn');
  const exitBtn = document.getElementById('exitBtn');

  let engine = new DrawingEngine(drawCanvas, fadeCanvas);
  let isPresentationActive = false;
  let isDrawingEnabled = false;

  // ===== Mouse drawing handlers =====

  document.addEventListener('mousedown', (e) => {
    if (!isDrawingEnabled) return;
    if (e.button !== 0) return;

    const toolbarRect = toolbar.getBoundingClientRect();
    if (
      e.clientX >= toolbarRect.left && e.clientX <= toolbarRect.right &&
      e.clientY >= toolbarRect.top && e.clientY <= toolbarRect.bottom
    ) return;

    engine.startDrawing(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDrawingEnabled || !engine.isDrawing) return;
    engine.continueDrawing(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDrawingEnabled) return;
    if (e.button !== 0) return;
    engine.endDrawing();
  });

  // ===== Toolbar buttons =====

  toolbar.addEventListener('mousedown', (e) => e.stopPropagation());

  document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.tool-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      engine.setMode(mode);
      updateCursorClass(mode);
    });
  });

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      engine.setColor(btn.dataset.color);
    });
  });

  document.querySelectorAll('.width-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.width-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      engine.setLineWidth(parseInt(btn.dataset.width));
    });
  });

  clearBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    engine.clearAll();
  });

  exitBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  exitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.electronAPI.togglePresentation();
  });

  // ===== Keyboard shortcuts (local to renderer) =====

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPresentationActive) {
      window.electronAPI.togglePresentation();
    }
    if (e.key === '1') selectMode('pen');
    else if (e.key === '2') selectMode('line');
    else if (e.key === '3') selectMode('rect');
  });

  function selectMode(mode) {
    document.querySelectorAll('.tool-btn[data-mode]').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.tool-btn[data-mode="${mode}"]`);
    if (btn) btn.classList.add('active');
    engine.setMode(mode);
    updateCursorClass(mode);
  }

  function updateCursorClass(mode) {
    document.body.className = document.body.className.replace(/mode-\w+/g, '');
    document.body.classList.add('mode-' + mode);
  }

  // ===== Mode state management =====

  function applyState(presentation, drawing) {
    isPresentationActive = presentation;
    isDrawingEnabled = drawing;

    if (presentation) {
      document.body.classList.add('presentation-active');
      document.body.classList.add('mode-' + engine.mode);
      toolbar.classList.remove('hidden');
      toolbar.classList.add('visible');
      edgeGlow.classList.remove('hidden');
      edgeGlow.classList.add('visible');
    } else {
      document.body.classList.remove('presentation-active');
      toolbar.classList.remove('visible');
      toolbar.classList.add('hidden');
      edgeGlow.classList.remove('visible');
      edgeGlow.classList.add('hidden');
      engine.endDrawing();
      engine.clearAll();
    }

    // Update drawing indicator
    const indicator = document.getElementById('drawingIndicator');
    if (indicator) {
      if (drawing) {
        indicator.classList.add('active');
        indicator.textContent = '绘制中 - 按 Insert 切换';
      } else if (presentation) {
        indicator.classList.remove('active');
        indicator.textContent = '按 Insert 开始绘制';
      } else {
        indicator.classList.remove('active');
        indicator.textContent = '';
      }
    }
  }

  // ===== IPC listeners =====

  window.electronAPI.onModeChanged((state) => {
    applyState(state.presentation, state.drawing);
  });

  // Init
  Promise.all([
    window.electronAPI.getPresentationState(),
    window.electronAPI.getDrawingState()
  ]).then(([pres, drawing]) => {
    applyState(pres, drawing);
  });

})();
