/// <reference path="game.ts" />
/// <reference path="ui/instrument-container.ts" />

namespace Jamble {
  export interface GameContainerOptions {
    width?: number;
    height?: number;
    debugContainer?: HTMLElement;
  }

  /**
   * GameContainer - Handles all DOM, layout, and scaling concerns.
   * Separates presentation layer from game logic.
   * 
   * Responsibilities:
   * - Create and manage DOM structure (gameShell, canvasWrapper, canvasHost)
   * - Create and setup canvas element with proper context
   * - Handle responsive scaling for canvas and HUD
   * - Coordinate layout between game canvas and UI panels
   * - Provide DOM references for game overlays/prompts (temporary)
   */
  export class GameContainer {
    private rootElement: HTMLElement;
    private gameShell: HTMLElement;
    private canvasWrapper: HTMLElement;
    private canvasHost: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    private game: Game;
    private hudManager: InstrumentContainer;
    
    private readonly gameWidth: number;
    private readonly gameHeight: number;
    
    constructor(rootElement: HTMLElement, options: GameContainerOptions = {}) {
      this.rootElement = rootElement;
      this.gameWidth = options.width ?? 500;
      this.gameHeight = options.height ?? 100;
      
      // Setup DOM structure
      this.gameShell = this.createGameShell();
      this.canvasWrapper = this.createCanvasWrapper();
      this.canvasHost = this.createCanvasHost();
      this.canvas = this.createCanvas();
      this.ctx = this.setupCanvasContext();
      
      // Create HUD (manages its own scaling)
      this.hudManager = new InstrumentContainer(
        this.gameShell,
        this.gameWidth,
        this.gameHeight
      );
      
      // Create game instance (receives context, not DOM creation responsibility)
      this.game = new Game(
        this.ctx,
        this.canvasWrapper,  // Temporary: for prompts/overlays until refactored
        this.gameWidth,
        this.gameHeight,
        this.hudManager,
        options.debugContainer
      );
      
      // Setup responsive scaling
      this.setupResizeListener();
      this.updateScale();
    }
    
    // ============================================================================
    // DOM Creation
    // ============================================================================
    
    private createGameShell(): HTMLElement {
      this.rootElement.innerHTML = '';
      const shell = document.createElement('div');
      shell.className = 'game-shell';
      shell.style.cssText = `
        width: 100%;
        max-width: ${this.gameWidth}px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0 auto;
        overflow: visible;
      `;
      this.rootElement.appendChild(shell);
      return shell;
    }
    
    private createCanvasWrapper(): HTMLElement {
      const wrapper = document.createElement('div');
      wrapper.className = 'canvas-wrapper';
      wrapper.style.cssText = `
        position: relative;
        width: 100%;
        overflow: visible;
      `;
      this.gameShell.appendChild(wrapper);
      return wrapper;
    }
    
    private createCanvasHost(): HTMLElement {
      const host = document.createElement('div');
      host.className = 'game-canvas';
      host.style.cssText = `
        position: relative;
        width: 100%;
        aspect-ratio: ${this.gameWidth} / ${this.gameHeight};
        overflow: hidden;
      `;
      this.canvasWrapper.appendChild(host);
      return host;
    }
    
    private createCanvas(): HTMLCanvasElement {
      const canvas = document.createElement('canvas');
      canvas.id = 'gameCanvas';
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        z-index: 3;
      `;
      this.canvasHost.appendChild(canvas);
      return canvas;
    }
    
    private setupCanvasContext(): CanvasRenderingContext2D {
      const ctx = this.canvas.getContext('2d', { alpha: true });
      if (!ctx) {
        throw new Error('Could not get 2D canvas context');
      }
      
      // Setup high-DPI rendering
      const pixelRatio = window.devicePixelRatio || 1;
      this.canvas.width = this.gameWidth * pixelRatio;
      this.canvas.height = this.gameHeight * pixelRatio;
      
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingEnabled = false;
      
      return ctx;
    }
    
    // ============================================================================
    // Scaling & Responsiveness
    // ============================================================================
    
    private calculateScale(): number {
      const canvasRect = this.canvasHost.getBoundingClientRect();
      return canvasRect.width / this.gameWidth;
    }
    
    private updateScale(): void {
      const scale = this.calculateScale();
      this.hudManager.setScale(scale);
    }
    
    private setupResizeListener(): void {
      window.addEventListener('resize', () => this.updateScale());
    }
    
    // ============================================================================
    // Public API
    // ============================================================================
    
    /**
     * Start the game loop
     */
    start(): void {
      this.game.start();
    }
    
    /**
     * Get canvas wrapper for external components (e.g., prompts, overlays)
     * Note: This is temporary until prompts/overlays are refactored out of Game
     */
    getCanvasWrapper(): HTMLElement {
      return this.canvasWrapper;
    }
    
    /**
     * Get canvas host for external components that need canvas reference
     */
    getCanvasHost(): HTMLElement {
      return this.canvasHost;
    }
    
    /**
     * Get game instance (for advanced control)
     */
    getGame(): Game {
      return this.game;
    }
    
    /**
     * Get HUD manager (for external access)
     */
    getHUDManager(): InstrumentContainer {
      return this.hudManager;
    }
  }
}
