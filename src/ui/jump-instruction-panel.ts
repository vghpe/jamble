/// <reference path="ui-component-base.ts" />

namespace Jamble {
  /**
   * Jump Instruction Panel - Shows "TAP OR SPACE TO JUMP" during run mode
   * Replaces the control panel area with soft gray instructional text
   */
  export class JumpInstructionPanel extends UIComponent {
    private stateManager: any;
    private onJumpCallback: (() => void) | null = null;

    constructor(parentContainer: HTMLElement) {
      super(parentContainer, { mountNode: parentContainer, autoReposition: false });
      this.setupStyles();
      this.setupClickHandler();
      this.mountNode.appendChild(this.container);
    }

    private setupClickHandler(): void {
      this.container.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onJumpCallback && this.isVisible) {
          this.onJumpCallback();
        }
      });
    }

    /**
     * Set callback for when panel is clicked
     */
    setOnJump(callback: () => void): void {
      this.onJumpCallback = callback;
    }

    protected createContainer(): HTMLElement {
      const container = document.createElement('div');
      container.id = 'jump-instruction-panel';
      container.className = 'jump-instruction-panel';
      container.style.position = 'relative';
      container.textContent = 'TAP OR SPACE TO JUMP';
      return container;
    }

    protected calculatePosition(_gameRect: DOMRect): { left: number; top: number } {
      return { left: 0, top: 0 };
    }

    show(): void {
      if (this.isVisible) return;
      this.isVisible = true;
      // Trigger reflow for transition
      requestAnimationFrame(() => {
        this.container.classList.add('visible');
      });
    }

    hide(): void {
      if (!this.isVisible) return;
      this.isVisible = false;
      this.container.classList.remove('visible');
    }

    private setupStyles(): void {
      const style = document.createElement('style');
      style.textContent = `
        .jump-instruction-panel {
          position: relative;
          display: none;
          align-items: center;
          justify-content: center;
          width: 252px;
          height: 128px;
          margin: 16px auto 0;
          padding: 8px;
          background: #fff;
          border: 2px dashed #2196f3;
          box-sizing: border-box;
          font-size: 16px;
          font-weight: bold;
          color: #2196f3;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
          user-select: none;
        }

        .jump-instruction-panel.visible {
          display: flex;
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Set state manager for visibility control
     */
    setStateManager(stateManager: any): void {
      this.stateManager = stateManager;
    }

    /**
     * Update visibility based on game state
     */
    updateVisibility(): void {
      if (!this.stateManager) return;

      const shouldBeVisible = this.stateManager.isRunning();

      if (shouldBeVisible && !this.isVisible) {
        this.show();
      } else if (!shouldBeVisible && this.isVisible) {
        this.hide();
      }
    }

    render(): void {
      // No per-frame rendering needed
    }
  }
}
