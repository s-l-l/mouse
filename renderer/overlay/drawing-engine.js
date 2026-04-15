/**
 * Drawing Engine for Mouse Spotlight
 * Handles shape drawing, fading, and canvas management
 */

class DrawingEngine {
  constructor(drawCanvas, fadeCanvas) {
    this.drawCanvas = drawCanvas;
    this.fadeCanvas = fadeCanvas;
    this.drawCtx = drawCanvas.getContext('2d');
    this.fadeCtx = fadeCanvas.getContext('2d');

    // Drawing settings
    this.color = '#FF6B35';
    this.lineWidth = 4;
    this.mode = 'pen'; // 'pen', 'line', 'rect', 'arrow'

    // Current drawing state
    this.isDrawing = false;
    this.currentShape = null;
    this.points = [];
    this.startPoint = null;

    // Fading shapes
    this.fadeShapes = [];
    this.keepShapes = []; // shapes that don't fade
    this.fadeDuration = 2000; // 2 seconds
    this.keepMode = false; // when true, shapes persist

    // Animation
    this.animationId = null;
    this.lastFrameTime = 0;

    this.setupCanvas();
    this.startAnimationLoop();
  }

  setupCanvas() {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      [this.drawCanvas, this.fadeCanvas].forEach(canvas => {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.getContext('2d').scale(dpr, dpr);
      });
    };

    resize();
    window.addEventListener('resize', resize);
  }

  setColor(color) {
    this.color = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  setMode(mode) {
    this.mode = mode;
  }

  setKeepMode(keep) {
    this.keepMode = keep;
  }

  startDrawing(x, y) {
    this.isDrawing = true;
    this.startPoint = { x, y };
    this.points = [{ x, y }];

    const color = this.color;

    this.currentShape = {
      type: this.mode,
      color: color,
      lineWidth: this.lineWidth,
      points: [{ x, y }],
      opacity: 1
    };

    this.clearDrawCanvas();
  }

  continueDrawing(x, y) {
    if (!this.isDrawing) return;

    if (this.mode === 'pen') {
      this.currentShape.points.push({ x, y });
      this.drawPenStroke();
    } else if (this.mode === 'line') {
      this.drawLinePreview(x, y);
    } else if (this.mode === 'rect') {
      this.drawRectPreview(x, y);
    } else if (this.mode === 'arrow') {
      this.drawArrowPreview(x, y);
    }
  }

  // ---- Pen (free draw) ----

  drawPenStroke() {
    const points = this.currentShape.points;
    if (points.length < 2) return;

    this.clearDrawCanvas();
    const ctx = this.drawCtx;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  // ---- Line (auto horizontal / vertical) ----

  drawLinePreview(x, y) {
    this.clearDrawCanvas();
    const start = this.startPoint;

    // Auto-detect direction: compare dx vs dy
    const dx = Math.abs(x - start.x);
    const dy = Math.abs(y - start.y);
    const isHorizontal = dx >= dy;

    const ctx = this.drawCtx;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';

    ctx.beginPath();

    let endX, endY;
    if (isHorizontal) {
      endX = x;
      endY = start.y;
    } else {
      endX = start.x;
      endY = y;
    }

    ctx.moveTo(start.x, start.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    this.currentShape.points = [start, { x: endX, y: endY }];
  }

  // ---- Rectangle ----

  drawRectPreview(x, y) {
    this.clearDrawCanvas();
    const start = this.startPoint;

    const rx = Math.min(start.x, x);
    const ry = Math.min(start.y, y);
    const rw = Math.abs(x - start.x);
    const rh = Math.abs(y - start.y);

    const ctx = this.drawCtx;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineJoin = 'round';

    // Subtle fill
    const fillColor = this.color + '18'; // ~10% opacity hex
    ctx.fillStyle = fillColor;

    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.fill();
    ctx.stroke();

    this.currentShape.points = [
      { x: rx, y: ry },
      { x: rx + rw, y: ry + rh }
    ];
  }

  // ---- Arrow ----

  drawArrowPreview(x, y) {
    this.clearDrawCanvas();
    const start = this.startPoint;

    const dx = x - start.x;
    const dy = y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    const headLen = this.lineWidth * 5;
    const angle = Math.atan2(dy, dx);
    const hw = headLen * 0.45;

    const baseX = x - headLen * Math.cos(angle);
    const baseY = y - headLen * Math.sin(angle);

    const ctx = this.drawCtx;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shaft stops at arrow base
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(baseX, baseY);
    ctx.stroke();

    // Arrowhead triangle
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      baseX + hw * Math.cos(angle - Math.PI / 2),
      baseY + hw * Math.sin(angle - Math.PI / 2)
    );
    ctx.lineTo(
      baseX - hw * Math.cos(angle - Math.PI / 2),
      baseY - hw * Math.sin(angle - Math.PI / 2)
    );
    ctx.closePath();
    ctx.fill();

    this.currentShape.points = [start, { x, y }];
  }

  // ---- End / Clear ----

  endDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentShape && this.hasValidShape()) {
      if (this.keepMode) {
        this.keepShapes.push({ ...this.currentShape });
      } else {
        this.fadeShapes.push({
          ...this.currentShape,
          startTime: Date.now()
        });
      }
    }

    this.currentShape = null;
    this.points = [];
    this.startPoint = null;
    this.clearDrawCanvas();
  }

  hasValidShape() {
    const shape = this.currentShape;
    if (!shape) return false;

    if (shape.type === 'pen') {
      return shape.points.length > 2;
    }
    if (shape.type === 'line' || shape.type === 'rect' || shape.type === 'arrow') {
      return shape.points.length === 2;
    }
    return false;
  }

  clearDrawCanvas() {
    this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
  }

  clearFadeCanvas() {
    this.fadeCtx.clearRect(0, 0, this.fadeCanvas.width, this.fadeCanvas.height);
  }

  clearAll() {
    this.clearDrawCanvas();
    this.clearFadeCanvas();
    this.fadeShapes = [];
    this.keepShapes = [];
  }

  // ---- Fade animation loop ----

  startAnimationLoop() {
    const animate = (currentTime) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }
      this.lastFrameTime = currentTime;
      this.updateFadeShapes();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  updateFadeShapes() {
    this.clearFadeCanvas();

    // Draw persistent shapes (no fade)
    for (const shape of this.keepShapes) {
      this.drawShape(this.fadeCtx, { ...shape, opacity: 1 });
    }

    if (this.fadeShapes.length === 0) return;

    const now = Date.now();
    this.fadeShapes = this.fadeShapes.filter(shape => {
      const elapsed = now - shape.startTime;
      const opacity = 1 - (elapsed / this.fadeDuration);

      if (opacity <= 0) return false;

      shape.opacity = opacity;
      this.drawShape(this.fadeCtx, shape);
      return true;
    });
  }

  drawShape(ctx, shape) {
    ctx.save();
    ctx.globalAlpha = shape.opacity;
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = shape.points;

    if (shape.type === 'pen' && points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();

    } else if (shape.type === 'line' && points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();

    } else if (shape.type === 'rect' && points.length === 2) {
      const [p1, p2] = points;
      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p2.x - p1.x);
      const rh = Math.abs(p2.y - p1.y);

      // Fill with low opacity
      const fillColor = shape.color + Math.round(shape.opacity * 25).toString(16).padStart(2, '0');
      ctx.fillStyle = fillColor;

      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.fill();
      ctx.stroke();

    } else if (shape.type === 'arrow' && points.length === 2) {
      const [p1, p2] = points;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);

      const headLen = shape.lineWidth * 5;
      const hw = headLen * 0.45;

      const baseX = p2.x - headLen * Math.cos(angle);
      const baseY = p2.y - headLen * Math.sin(angle);

      ctx.fillStyle = shape.color;

      // Shaft stops at arrow base
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(baseX, baseY);
      ctx.stroke();

      // Arrowhead triangle
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        baseX + hw * Math.cos(angle - Math.PI / 2),
        baseY + hw * Math.sin(angle - Math.PI / 2)
      );
      ctx.lineTo(
        baseX - hw * Math.cos(angle - Math.PI / 2),
        baseY - hw * Math.sin(angle - Math.PI / 2)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DrawingEngine;
}
