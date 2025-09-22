namespace Jamble {
  export type EmojiState = 'idle' | 'colliding' | 'post';

  export class EmojiReaction {
    private emojiEl: HTMLElement | null = null;
    private currentState: EmojiState = 'idle';
    private postTimeout: number | null = null;
    private enabled: boolean = false;

    private readonly EMOJI_MAP = {
      idle: '🙂',       // Calm/neutral
      colliding: '😳',  // Surprised/reacting  
      post: '🤭'        // Embarrassed/sheepish after collision
    };

    private readonly POST_DURATION_MS = 1000; // How long to show post-collision emoji

    constructor(gameEl: HTMLElement) {
      this.createEmojiElement(gameEl);
    }

    private createEmojiElement(gameEl: HTMLElement): void {
      // Create emoji element positioned to the left of the game canvas
      this.emojiEl = document.createElement('div');
      this.emojiEl.className = 'jamble-emoji-reaction';
      this.emojiEl.style.cssText = `
        position: absolute;
        font-size: 32px;
        line-height: 1;
        pointer-events: none;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s ease;
        user-select: none;
      `;

      // Position it to the left of the game canvas
      this.updatePosition(gameEl);
      
      // Insert after the game element
      if (gameEl.parentNode) {
        gameEl.parentNode.insertBefore(this.emojiEl, gameEl.nextSibling);
      }

      this.updateEmoji();
    }

    private updatePosition(gameEl: HTMLElement): void {
      if (!this.emojiEl) return;

      const rect = gameEl.getBoundingClientRect();
      const parentRect = gameEl.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };
      
      // Position to the left of the game canvas, vertically centered
      const left = gameEl.offsetLeft - 50; // 50px to the left
      const top = gameEl.offsetTop + (gameEl.offsetHeight / 2) - 16; // Center vertically (16px = half emoji height)
      
      this.emojiEl.style.left = `${left}px`;
      this.emojiEl.style.top = `${top}px`;
    }

    private updateEmoji(): void {
      if (!this.emojiEl) return;
      
      this.emojiEl.textContent = this.EMOJI_MAP[this.currentState];
      this.emojiEl.style.opacity = this.enabled ? '1' : '0';
    }

    public setEnabled(enabled: boolean): void {
      this.enabled = enabled;
      this.updateEmoji();
    }

    public isEnabled(): boolean {
      return this.enabled;
    }

    public setState(state: EmojiState): void {
      if (this.currentState === state) return;

      // Clear any pending post-collision timeout
      if (this.postTimeout !== null) {
        window.clearTimeout(this.postTimeout);
        this.postTimeout = null;
      }

      this.currentState = state;
      this.updateEmoji();

      // Auto-transition from 'post' back to 'idle' after timeout
      if (state === 'post') {
        this.postTimeout = window.setTimeout(() => {
          this.setState('idle');
          this.postTimeout = null;
        }, this.POST_DURATION_MS);
      }
    }

    public getState(): EmojiState {
      return this.currentState;
    }

    public beginCollision(): void {
      this.setState('colliding');
    }

    public endCollision(): void {
      this.setState('post');
    }

    public reset(): void {
      this.setState('idle');
    }

    public repositionForGame(gameEl: HTMLElement): void {
      this.updatePosition(gameEl);
    }

    public dispose(): void {
      if (this.postTimeout !== null) {
        window.clearTimeout(this.postTimeout);
        this.postTimeout = null;
      }

      if (this.emojiEl && this.emojiEl.parentNode) {
        this.emojiEl.parentNode.removeChild(this.emojiEl);
      }
      this.emojiEl = null;
    }
  }
}