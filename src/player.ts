/// <reference path="./constants.ts" />
namespace Jamble {
  export class Player {
    public el: HTMLElement;
    public isJumping: boolean = false;
    public jumpHeight: number = 0;
    public velocity: number = 0;
    public x: number = Const.PLAYER_START_OFFSET;
    public won: boolean = false;
    public frozenStart: boolean = true;
    public frozenDeath: boolean = false;
    public isDashing: boolean = false;
    private dashRemainingMs: number = 0;
    private dashAvailable: boolean = true;

    constructor(el: HTMLElement){
      this.el = el;
      this.reset();
    }

    reset(): void {
      this.isJumping = false;
      this.jumpHeight = 0;
      this.velocity = 0;
      this.x = Const.PLAYER_START_OFFSET;
      this.won = false;
      this.frozenStart = true;
      this.frozenDeath = false;
      this.isDashing = false;
      this.dashRemainingMs = 0;
      this.dashAvailable = true;
      this.el.style.left = this.x + 'px';
      this.el.style.bottom = this.jumpHeight + 'px';
      this.el.style.transform = 'scaleY(1) scaleX(1)';
      this.el.className = 'jamble-player jamble-frozen-start';
    }

    // Visual state helpers
    setNormal(): void { this.el.className = 'jamble-player jamble-normal'; }
    setFrozenStart(): void { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-idle'; }
    setPrestart(): void { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-prestart'; }
    clearFrozenStart(): void { this.frozenStart = false; this.setNormal(); }
    setFrozenDeath(): void { this.frozenDeath = true; this.el.className = 'jamble-player jamble-frozen-death'; }

    // Idle at current x
    idle(): void {
      this.isJumping = false;
      this.endDash();
      this.velocity = 0;
      this.jumpHeight = 0;
      this.el.style.bottom = '0px';
      this.el.style.transform = 'scaleY(1) scaleX(1)';
      this.setFrozenStart();
    }

    // Geometry helpers
    getRight(_gameWidth: number): number { return this.x + this.el.offsetWidth; }
    snapRight(gameWidth: number): void {
      // Stop with the same offset as the left side
      this.x = gameWidth - this.el.offsetWidth - Const.PLAYER_START_OFFSET;
      this.el.style.left = this.x + 'px';
    }

    // Begin a jump if allowed
    jump(): void {
      if (this.isJumping || this.frozenDeath) return;
      this.isJumping = true;
      this.velocity = Jamble.Settings.current.jumpStrength;
    }

    // Dash: launch horizontally for a brief time. Only mid-air and once per airtime.
    startDash(): boolean {
      if (this.frozenStart || this.frozenDeath || !this.isJumping) return false;
      if (this.isDashing || !this.dashAvailable) return false;
      this.isDashing = true;
      this.dashRemainingMs = Const.DASH_DURATION_MS;
      this.dashAvailable = false;
      this.el.classList.add('jamble-dashing');
      return true;
    }
    updateDash(deltaMs: number): void {
      if (!this.isDashing) return;
      this.dashRemainingMs -= deltaMs;
      if (this.dashRemainingMs <= 0) this.endDash();
    }
    endDash(): void {
      if (!this.isDashing) return;
      this.isDashing = false;
      this.dashRemainingMs = 0;
      // After dashing, immediately transition to downward motion
      // If we were moving upward, flip to a slight downward velocity
      if (this.velocity > 0) this.velocity = -0.1;
      this.el.classList.remove('jamble-dashing');
    }

    // Update vertical motion and apply squash/stretch
    update(dt60: number): void {
      // While dashing, freeze vertical motion (no gravity)
      if (this.isDashing) return;
      if (!this.frozenDeath && this.isJumping){
        this.jumpHeight += this.velocity * dt60;
        if (this.velocity > 2) this.velocity -= Const.GRAVITY_UP * dt60;
        else if (this.velocity > -2) this.velocity -= Const.GRAVITY_MID * dt60;
        else this.velocity -= Const.GRAVITY_DOWN * dt60;

        if (this.jumpHeight <= 0){
          this.jumpHeight = 0;
          this.isJumping = false;
          // Touching ground resets dash availability
          this.endDash();
          this.dashAvailable = true;
          if (Jamble.Settings.current.squashEnabled){
            this.el.style.transform = 'scaleY(0.6) scaleX(1.4)';
            const dur = Math.max(0, Jamble.Settings.current.landSquashDurationMs);
            window.setTimeout(() => { this.el.style.transform = 'scaleY(1) scaleX(1)'; }, dur);
          } else {
            this.el.style.transform = 'scaleY(1) scaleX(1)';
          }
        } else {
          if (Jamble.Settings.current.squashEnabled){
            const v = Math.max(0, this.velocity);
            const stretch = 1 + v * 0.05; // later: Settings.current.stretchFactor
            const squash = 1 - v * 0.02;  // later: Settings.current.squashFactor
            this.el.style.transform = 'scaleY(' + stretch + ') scaleX(' + squash + ')';
          } else {
            this.el.style.transform = 'scaleY(1) scaleX(1)';
          }
        }
        this.el.style.bottom = this.jumpHeight + 'px';
      }
    }

    // Horizontal movement helpers
    moveX(dx: number): void { this.x += dx; this.el.style.left = this.x + 'px'; }
    setX(x: number): void { this.x = x; this.el.style.left = this.x + 'px'; }
  }
}
