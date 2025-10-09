namespace Jamble {
  /**
   * Monitor Panel - Real-time scrolling activity monitor (formerly ActivityMonitor)
   * Displays a scrolling line graph of game activity data with EMA smoothing
   */
  export class MonitorPanel {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dataBuffer: number[] = [];
    private maxBufferSize: number;
    private pixelAccumulator: number = 0;
    
    // Parameters for the sine wave simulation and smoothing
    private time: number = 0;
    private frequency: number = 0.5;   // Wave oscillations per second
    private amplitude: number = 0.3;   // Wave amplitude (0-0.5 range)
    private sampleSpacing: number = 1; // Pixels between samples
    private smoothing: number = 0.3;   // EMA smoothing factor
    private smoothedValue: number = 0; // Current smoothed value
    private scrollSpeed: number = 50;  // Pixels per second for the graph advance
    
    constructor(parent: HTMLElement, width: number, height: number) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        flex: 1;
        box-sizing: border-box;
      `;
      
      // Set up high DPI rendering
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      
      this.ctx = this.canvas.getContext('2d')!;
      this.ctx.scale(dpr, dpr);
      
      this.maxBufferSize = Math.ceil(width / this.sampleSpacing) + 10; // Buffer size based on width
      
      parent.appendChild(this.canvas);
      
      // Initialize buffer with some starting values
      this.initializeBuffer();
    }

    private initializeBuffer(): void {
      // Start with an empty buffer so the graph appears only after data arrives
      this.dataBuffer.length = 0;
      this.smoothedValue = 0.5; // Neutral midpoint to seed smoothing
    }
    
    /**
     * Push new data to the monitor (from external game events)
     */
    pushData(value: number): void {
      // Clamp value between 0 and 1
      const clampedValue = Math.max(0, Math.min(1, value));
      
      // Apply EMA smoothing
      this.smoothedValue = this.smoothing * clampedValue + (1 - this.smoothing) * this.smoothedValue;
      
      this.dataBuffer.push(this.smoothedValue);
      
      // Maintain buffer size
      if (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }
    }
    
    update(deltaTime: number): void {
      this.time += this.frequency * deltaTime;
      this.pixelAccumulator += this.scrollSpeed * deltaTime;

      while (this.pixelAccumulator >= this.sampleSpacing) {
        this.pixelAccumulator -= this.sampleSpacing;
        const sineValue = Math.sin(this.time * Math.PI * 2) * this.amplitude + 0.5; // Between 0-1
        this.pushData(sineValue);
      }
    }
    
    render(): void {
      const width = this.canvas.width / (window.devicePixelRatio || 1);
      const height = this.canvas.height / (window.devicePixelRatio || 1);
      
      // Clear canvas with transparent background
      this.ctx.clearRect(0, 0, width, height);
      
      // Draw the scrolling line with fading trail (newest samples fully opaque)
      const totalSegments = this.dataBuffer.length - 1;
      if (totalSegments <= 0) return;

      this.ctx.strokeStyle = '#757575';
      this.ctx.lineWidth = 1;

      const totalWidth = totalSegments * this.sampleSpacing;
      const startX = width - totalWidth;

      for (let i = 0; i < totalSegments; i++) {
        const x1 = startX + i * this.sampleSpacing;
        const y1 = height - (this.dataBuffer[i] * height * 0.8) - height * 0.1; // 10% padding
        const x2 = startX + (i + 1) * this.sampleSpacing;
        const y2 = height - (this.dataBuffer[i + 1] * height * 0.8) - height * 0.1;

        const age = (i + 1) / totalSegments; // 0 (old) → 1 (new)
        const opacity = Math.pow(age, 1.5); // Ease curve for nicer falloff

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
    
    // Getters for debugging
    getSampleSpacing(): number { return this.sampleSpacing; }
    getScrollSpeed(): number { return this.scrollSpeed; }
    getFrequency(): number { return this.frequency; }
    getAmplitude(): number { return this.amplitude; }
    getSmoothing(): number { return this.smoothing; }
    
    // Setters for debugging
    setSampleSpacing(value: number): void {
      this.sampleSpacing = Math.max(1, Math.min(10, value)); // Clamp between 1-10
      this.maxBufferSize = Math.ceil((this.canvas.width / (window.devicePixelRatio || 1)) / this.sampleSpacing) + 10;
      // Trim buffer if it's now too large
      while (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }
    }

    setScrollSpeed(value: number): void {
      this.scrollSpeed = Math.max(5, Math.min(200, value));
    }

    setFrequency(value: number): void {
      this.frequency = Math.max(0.05, Math.min(5, value));
    }

    setAmplitude(value: number): void {
      this.amplitude = Math.max(0.05, Math.min(0.45, value));
    }

    setSmoothing(value: number): void {
      this.smoothing = Math.max(0.1, Math.min(1.0, value));
    }
  }
}
