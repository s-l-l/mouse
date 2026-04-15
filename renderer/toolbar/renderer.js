(function () {
  'use strict';

  const drawToggle = document.getElementById('drawToggle');
  const pinToggle = document.getElementById('pinToggle');
  const clearBtn = document.getElementById('clearBtn');
  const exitBtn = document.getElementById('exitBtn');
  const drawingStatus = document.getElementById('drawingStatus');

  let isDrawingEnabled = false;
  let isPinned = false;

  // ===== Mode buttons =====

  document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.toolbarAPI.setDrawSettings({ mode: btn.dataset.mode });
    });
  });

  // ===== Color buttons =====

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.toolbarAPI.setDrawSettings({ color: btn.dataset.color });
    });
  });

  // ===== Width buttons =====

  document.querySelectorAll('.width-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.width-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.toolbarAPI.setDrawSettings({ lineWidth: parseInt(btn.dataset.width) });
    });
  });

  // ===== Action buttons =====

  drawToggle.addEventListener('click', () => {
    window.toolbarAPI.toggleDrawing();
  });

  pinToggle.addEventListener('click', () => {
    isPinned = !isPinned;
    pinToggle.classList.toggle('pinned', isPinned);
    window.toolbarAPI.setDrawSettings({ keepShapes: isPinned });
  });

  clearBtn.addEventListener('click', () => {
    window.toolbarAPI.setDrawSettings({ clear: true });
  });

  exitBtn.addEventListener('click', () => {
    window.toolbarAPI.togglePresentation();
  });

  // ===== IPC state updates =====

  window.toolbarAPI.onModeChanged((state) => {
    isDrawingEnabled = state.drawing;

    drawToggle.classList.toggle('drawing-on', state.drawing);
    drawingStatus.classList.toggle('active', state.drawing);

    if (state.drawing) {
      drawingStatus.textContent = '绘制中 - 按 Insert 切换';
    } else if (state.presentation) {
      drawingStatus.textContent = '按 Insert 开始绘制';
    } else {
      drawingStatus.textContent = '';
    }
  });

  // Init
  Promise.all([
    window.toolbarAPI.getPresentationState(),
    window.toolbarAPI.getDrawingState()
  ]).then(([pres, drawing]) => {
    isDrawingEnabled = drawing;
    drawToggle.classList.toggle('drawing-on', drawing);
    drawingStatus.classList.toggle('active', drawing);
    if (drawing) drawingStatus.textContent = '绘制中 - 按 Insert 切换';
    else if (pres) drawingStatus.textContent = '按 Insert 开始绘制';
  });

})();
