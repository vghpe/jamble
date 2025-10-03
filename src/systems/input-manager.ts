namespace Jamble {
  export class InputManager {
    private keys: Set<string> = new Set();
    private keyDownHandlers: Map<string, () => void> = new Map();
    private keyUpHandlers: Map<string, () => void> = new Map();

    constructor() {
      this.setupEventListeners();
    }

    private setupEventListeners(): void {
      document.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
        
        const handler = this.keyDownHandlers.get(e.code);
        if (handler) {
          handler();
          e.preventDefault();
        }
      });

      document.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
        
        const handler = this.keyUpHandlers.get(e.code);
        if (handler) {
          handler();
        }
      });
    }

    // Check if a key is currently pressed
    isKeyPressed(keyCode: string): boolean {
      return this.keys.has(keyCode);
    }

    // Register a handler for when a key is pressed down
    onKeyDown(keyCode: string, handler: () => void): void {
      this.keyDownHandlers.set(keyCode, handler);
    }

    // Register a handler for when a key is released
    onKeyUp(keyCode: string, handler: () => void): void {
      this.keyUpHandlers.set(keyCode, handler);
    }

    // Remove a key handler
    removeKeyHandler(keyCode: string): void {
      this.keyDownHandlers.delete(keyCode);
      this.keyUpHandlers.delete(keyCode);
    }

    // Check movement keys (convenience methods)
    isMovingLeft(): boolean {
      return this.isKeyPressed('ArrowLeft') || this.isKeyPressed('KeyA');
    }

    isMovingRight(): boolean {
      return this.isKeyPressed('ArrowRight') || this.isKeyPressed('KeyD');
    }

    isJumping(): boolean {
      return this.isKeyPressed('Space');
    }

    // Cleanup
    destroy(): void {
      this.keyDownHandlers.clear();
      this.keyUpHandlers.clear();
      this.keys.clear();
    }
  }
}