/// <reference path="../game/collision-manager.ts" />
namespace Jamble {
  type ColliderCategory = NonNullable<Jamble.CollisionShape['category']>;

  const CATEGORY_COLORS: Record<ColliderCategory, string> = {
    player: '#7F00FF',       // violet
    deadly: '#ef4444',       // red
    neutral: '#ffcc02',      // yellow
    environment: '#60a5fa'   // blue (optional)
  };

  export class DebugDraw {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dpr: number = window.devicePixelRatio || 1;
    private originLeft = 0;
    private originTop = 0;
    private visible = false;

    constructor(private container: HTMLElement){
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'jamble-debug-canvas';
      Object.assign(this.canvas.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '9999',
        display: 'none'
      } as CSSStyleDeclaration);
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('DebugDraw: 2D context unavailable');
      this.ctx = ctx;
      this.container.appendChild(this.canvas);
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    setOrigin(rect: DOMRect): void {
      // Canvas is positioned relative to the container's padding box, but rect is for the border box.
      // Adjust origin by the container's border widths so drawing aligns with the canvas (content) coordinates.
      const cs = getComputedStyle(this.container);
      const bl = parseFloat(cs.borderLeftWidth || '0') || 0;
      const bt = parseFloat(cs.borderTopWidth || '0') || 0;
      this.originLeft = rect.left + bl;
      this.originTop = rect.top + bt;
    }

    resize(): void {
      const { clientWidth, clientHeight } = this.container;
      this.canvas.width = Math.max(1, Math.floor(clientWidth * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(clientHeight * this.dpr));
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    beginFrame(): void {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clear(): void {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setVisible(v: boolean): void {
      if (this.visible === v) return;
      this.visible = v;
      this.canvas.style.display = v ? 'block' : 'none';
      if (!v) this.clear();
    }

    isVisible(): boolean { return this.visible; }

  private colorFor(shape: Jamble.CollisionShape, fallback = '#22d3ee'): string {
      if (shape.category && CATEGORY_COLORS[shape.category]) return CATEGORY_COLORS[shape.category];
      return fallback; // cyan default
    }

  drawShape(shape: Jamble.CollisionShape, opts?: { color?: string; lineWidth?: number }): void {
      const color = opts?.color || this.colorFor(shape);
      const lineWidth = opts?.lineWidth ?? 2;
      this.ctx.save();
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = color;
      this.ctx.globalAlpha = 0.95;

      if (shape.type === 'rect') {
        const r = shape.bounds;
        const x = r.left - this.originLeft;
        const y = r.top - this.originTop;
        this.ctx.strokeRect(x, y, r.width, r.height);
      } else if (shape.type === 'circle') {
        const r = shape.bounds;
        const cx = r.x + r.width / 2 - this.originLeft;
        const cy = r.y + r.height / 2 - this.originTop;
        const radius = shape.radius ?? r.width / 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        // optional center mark
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 3, cy);
        this.ctx.lineTo(cx + 3, cy);
        this.ctx.moveTo(cx, cy - 3);
        this.ctx.lineTo(cx, cy + 3);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

  drawPair(a: Jamble.CollisionShape, b: Jamble.CollisionShape, collided: boolean): void {
      const colorA = collided ? '#ef4444' : this.colorFor(a);
      const colorB = collided ? '#ef4444' : this.colorFor(b);
      this.drawShape(a, { color: colorA });
      this.drawShape(b, { color: colorB });
    }
  }
}
