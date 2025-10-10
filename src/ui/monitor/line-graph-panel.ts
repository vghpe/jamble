namespace Jamble {
  export interface LineGraphOptions {
    sampleSpacing?: number;
    scrollSpeed?: number;
    smoothing?: number;
    strokeStyle?: string;
    verticalPaddingRatio?: number;
    initialValue?: number;
  }

  /**
   * Base class for scrolling line graph panels.
   * Handles canvas setup, EMA smoothing, buffer management and rendering.
   * Subclasses provide data samples via generateSample().
   */
  export abstract class LineGraphPanel {
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected dataBuffer: number[] = [];
    protected maxBufferSize: number;
    protected pixelAccumulator: number = 0;

    protected sampleSpacing: number;
    protected scrollSpeed: number;
    protected smoothing: number;
    protected smoothedValue: number;
    protected strokeStyle: string;
    protected verticalPaddingRatio: number;

    private readonly initialValue: number;
    private logicalWidth: number;
    private logicalHeight: number;
    private devicePixelRatio: number;

    constructor(parent: HTMLElement, width: number, height: number, options: LineGraphOptions = {}) {
      this.sampleSpacing = options.sampleSpacing ?? 1;
      this.scrollSpeed = options.scrollSpeed ?? 50;
      this.smoothing = options.smoothing ?? 0.3;
      this.strokeStyle = options.strokeStyle ?? '#757575';
      this.verticalPaddingRatio = options.verticalPaddingRatio ?? 0.1;
      this.initialValue = options.initialValue ?? 0.5;
      this.smoothedValue = this.initialValue;

      this.logicalWidth = width;
      this.logicalHeight = height;
      this.devicePixelRatio = window.devicePixelRatio || 1;

      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d')!;

      this.installCanvasSizing(width, height);

      parent.appendChild(this.canvas);

      this.maxBufferSize = Math.ceil(this.logicalWidth / this.sampleSpacing) + 10;
      this.resetBuffer();
    }

    /**
     * Called once per frame to advance internal simulation state.
     * Subclasses can perform per-frame updates here before sampling occurs.
     */
    protected onBeforeUpdate(_deltaTime: number): void {
      // Default no-op
    }

    /**
     * Subclasses must provide a sample value between 0-1 when requested.
     * Returning null skips pushing a sample for that iteration.
     */
    protected abstract generateSample(sampleIntervalSeconds: number): number | null;

    update(deltaTime: number): void {
      this.onBeforeUpdate(deltaTime);

      this.pixelAccumulator += this.scrollSpeed * deltaTime;
      const secondsPerPixel = 1 / Math.max(1, this.scrollSpeed);
      const sampleIntervalSeconds = this.sampleSpacing * secondsPerPixel;

      while (this.pixelAccumulator >= this.sampleSpacing) {
        this.pixelAccumulator -= this.sampleSpacing;
        const sample = this.generateSample(sampleIntervalSeconds);
        if (sample !== null && sample !== undefined) {
          this.pushData(sample);
        }
      }
    }

    render(): void {
      const width = this.logicalWidth;
      const height = this.logicalHeight;

      this.ctx.clearRect(0, 0, width, height);

      const totalSegments = this.dataBuffer.length - 1;
      if (totalSegments <= 0) return;

      const totalWidth = totalSegments * this.sampleSpacing;
      const startX = width - totalWidth;

      this.ctx.lineWidth = 1;

      for (let i = 0; i < totalSegments; i++) {
        const x1 = startX + i * this.sampleSpacing;
        const x2 = startX + (i + 1) * this.sampleSpacing;
        const y1 = this.valueToY(this.dataBuffer[i], height);
        const y2 = this.valueToY(this.dataBuffer[i + 1], height);

        const age = (i + 1) / totalSegments;
        const opacity = Math.pow(age, 1.5);

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.strokeStyle = this.strokeStyle;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    pushData(value: number): void {
      const clampedValue = Math.max(0, Math.min(1, value));
      this.smoothedValue = this.smoothing * clampedValue + (1 - this.smoothing) * this.smoothedValue;
      this.dataBuffer.push(this.smoothedValue);

      if (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }
    }

    setSampleSpacing(value: number): void {
      this.sampleSpacing = Math.max(1, Math.min(10, value));
      this.recalculateBufferSize();
    }

    setScrollSpeed(value: number): void {
      this.scrollSpeed = Math.max(5, Math.min(200, value));
    }

    setSmoothing(value: number): void {
      this.smoothing = Math.max(0.1, Math.min(1.0, value));
    }

    getSampleSpacing(): number { return this.sampleSpacing; }
    getScrollSpeed(): number { return this.scrollSpeed; }
    getSmoothing(): number { return this.smoothing; }

    resize(width: number, height: number): void {
      this.logicalWidth = width;
      this.logicalHeight = height;
      this.installCanvasSizing(width, height);
      this.recalculateBufferSize();
    }

    protected resetBuffer(): void {
      this.smoothedValue = this.initialValue;
      this.dataBuffer.length = 0;
    }

    private valueToY(value: number, height: number): number {
      const padding = height * this.verticalPaddingRatio;
      const usableHeight = height - padding * 2;
      return height - (value * usableHeight + padding);
    }

    private installCanvasSizing(width: number, height: number): void {
      const dpr = this.devicePixelRatio;

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;

      this.canvas.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        display: block;
        flex: 1;
        box-sizing: border-box;
      `;

      if (typeof (this.ctx as any).resetTransform === 'function') {
        (this.ctx as any).resetTransform();
      } else {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      this.ctx.scale(dpr, dpr);
    }

    private recalculateBufferSize(): void {
      this.maxBufferSize = Math.ceil(this.logicalWidth / this.sampleSpacing) + 10;
      while (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }
    }
  }
}
