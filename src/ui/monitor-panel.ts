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
    private currentX: number = 0;
    
    // Parameters for the sine wave simulation and smoothing
    private time: number = 0;
    private speed: number = 0.02;      // How fast the wave moves
    private sampleRate: number = 2;    // How often to sample (pixels between samples)
    private smooth: number = 0.3;      // EMA smoothing factor (0-1, higher = more responsive)
    private smoothedValue: number = 0; // Current smoothed value
    
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
      
      this.maxBufferSize = Math.ceil(width / this.sampleRate) + 10; // Buffer size based on width
      
      parent.appendChild(this.canvas);
      
      // Initialize buffer with some starting values
      this.initializeBuffer();
    }
    
    private initializeBuffer(): void {
      // Fill initial buffer with sine wave
      for (let i = 0; i < this.maxBufferSize; i++) {
        const value = Math.sin(i * 0.1) * 0.5 + 0.5; // Normalized sine wave
        this.dataBuffer.push(value);
      }
      this.smoothedValue = this.dataBuffer[this.dataBuffer.length - 1];
    }
    
    /**
     * Push new data to the monitor (from external game events)
     */
    pushData(value: number): void {
      // Clamp value between 0 and 1
      const clampedValue = Math.max(0, Math.min(1, value));
      
      // Apply EMA smoothing
      this.smoothedValue = this.smooth * clampedValue + (1 - this.smooth) * this.smoothedValue;
      
      this.dataBuffer.push(this.smoothedValue);
      
      // Maintain buffer size
      if (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }
    }
    
    update(deltaTime: number): void {
      this.time += this.speed;
      
      // Generate sine wave data for continuous scrolling effect
      if (Math.floor(this.currentX) % this.sampleRate === 0) {
        const sineValue = Math.sin(this.time) * 0.3 + 0.5; // Sine wave between 0.2-0.8
        this.pushData(sineValue);
      }
      
      this.currentX += 0.5; // Scroll speed
    }
    
    render(): void {
      const width = this.canvas.width / (window.devicePixelRatio || 1);
      const height = this.canvas.height / (window.devicePixelRatio || 1);
      
      // Clear canvas with transparent background
      this.ctx.clearRect(0, 0, width, height);
      
      // Draw the scrolling line
      this.ctx.strokeStyle = '#757575ff';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      
      for (let i = 0; i < this.dataBuffer.length - 1; i++) {
        const x1 = i * this.sampleRate;
        const y1 = height - (this.dataBuffer[i] * height * 0.8) - height * 0.1; // 10% padding
        const x2 = (i + 1) * this.sampleRate;
        const y2 = height - (this.dataBuffer[i + 1] * height * 0.8) - height * 0.1;
        
        if (i === 0) {
          this.ctx.moveTo(x1, y1);
        }
        this.ctx.lineTo(x2, y2);
      }
      
      this.ctx.stroke();
    }
    
    // Getters for debugging
    getSampleRate(): number { return this.sampleRate; }
    getSpeed(): number { return this.speed; }
    getSmooth(): number { return this.smooth; }
    
    // Setters for debugging
    setSampleRate(value: number): void {
      this.sampleRate = Math.max(1, Math.min(10, value)); // Clamp between 1-10
      this.maxBufferSize = Math.ceil((this.canvas.width / (window.devicePixelRatio || 1)) / this.sampleRate) + 10;
      // Trim buffer if it's now too large
      while (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }
    }
    
    setSpeed(value: number): void {
      this.speed = Math.max(0.001, Math.min(0.1, value)); // Clamp between 0.001-0.1
    }
    
    setSmooth(value: number): void {
      this.smooth = Math.max(0.1, Math.min(1.0, value)); // Clamp between 0.1-1.0
    }
  }
}