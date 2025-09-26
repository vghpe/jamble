namespace Jamble {
  export class Player {
    public el: HTMLElement;
    public isJumping: boolean = false;
    public jumpHeight: number = 0;
    public velocity: number = 0;
    public x: number = Jamble.Settings.current.playerStartOffset;
    public won: boolean = false;
    public frozenStart: boolean = true;
    public frozenDeath: boolean = false;
    public isDashing: boolean = false;
    public isInvincible: boolean = false; // For phase dash - can pass through objects
    private dashRemainingMs: number = 0;
    private dashAvailable: boolean = true;
    public isHovering: boolean = false;
    private hoverTargetHeight: number = 0;
    private hoverLiftSpeed: number = 200; // px/s
    private hoverFallSpeed: number = 300; // px/s

    constructor(el: HTMLElement){
      this.el = el;
      this.reset();
    }

    reset(): void {
      this.isJumping = false;
      this.jumpHeight = 0;
      this.velocity = 0;
      this.x = Jamble.Settings.current.playerStartOffset;
      this.won = false;
      this.frozenStart = true;
      this.frozenDeath = false;
      this.isDashing = false;
      this.isInvincible = false;
      this.dashRemainingMs = 0;
      this.dashAvailable = true;
      this.isHovering = false;
      this.hoverTargetHeight = 0;
      this.el.style.left = this.x + 'px';
      this.el.style.bottom = this.jumpHeight + 'px';
      this.el.style.transform = 'scaleY(1) scaleX(1)';
      this.el.className = 'jamble-player jamble-player-idle';
    }

    // Visual state helpers
    setNormal(): void { this.el.className = 'jamble-player jamble-normal'; }
    setFrozenStart(): void { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-idle'; }
    setPrestart(): void { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-prestart'; }
    clearFrozenStart(): void { this.frozenStart = false; this.setNormal(); }
    setFrozenDeath(): void { this.frozenDeath = true; this.el.className = 'jamble-player jamble-frozen-death'; }

    // Collision shape for more forgiving gameplay
    getCollisionShape(): CollisionShape | null {
      // No collision when invincible (phase dash)
      if (this.isInvincible) return null;
      
      const rect = this.el.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      // Use 80% of the smaller dimension for more forgiving collision
      const radius = Math.min(rect.width, rect.height) / 2 * 0.8;

      return CollisionManager.createCircleShape(centerX, centerY, radius, 'player');
    }

    // Idle at current x
    idle(): void {
      this.isJumping = false;
      this.endDash();
      this.velocity = 0;
      if (!this.isHovering) {
        this.jumpHeight = 0;
        this.el.style.bottom = '0px';
      }
      this.el.style.transform = 'scaleY(1) scaleX(1)';
      this.setFrozenStart();
    }

    // Geometry helpers
    getRight(_gameWidth: number): number { return this.x + this.el.offsetWidth; }
    snapRight(gameWidth: number): void {
      // Stop with the same offset as the left side
      this.x = gameWidth - this.el.offsetWidth - Jamble.Settings.current.playerStartOffset;
      this.el.style.left = this.x + 'px';
    }

    // Begin a jump if allowed (strength should be provided via PlayerCapabilities)
    jump(): void {
      if (this.isJumping || this.frozenDeath) return;
      this.isJumping = true;
      // Note: velocity should be set by PlayerCapabilities.requestJump() after calling this
      this.velocity = 7; // Default fallback, skills should override this
    }

    // Dash: launch horizontally for a brief time. Only mid-air and once per airtime.
    startDash(durationOverrideMs?: number, invincible?: boolean): boolean {
      if (this.frozenStart || this.frozenDeath || !this.isJumping) return false;
      if (this.isDashing || !this.dashAvailable) return false;
      this.isDashing = true;
      this.isInvincible = invincible ?? false;
      this.dashRemainingMs = durationOverrideMs ?? 220; // Skills should provide duration
      this.dashAvailable = false;
      this.updateDashVisualState();
      return true;
    }

    private updateDashVisualState(): void {
      this.el.classList.toggle('jamble-dashing', this.isDashing);
      this.el.classList.toggle('jamble-invincible', this.isDashing && this.isInvincible);
    }
    updateDash(deltaMs: number): void {
      if (!this.isDashing) return;
      this.dashRemainingMs -= deltaMs;
      if (this.dashRemainingMs <= 0) this.endDash();
    }
    endDash(): void {
      if (!this.isDashing) return;
      this.isDashing = false;
      this.isInvincible = false;
      this.dashRemainingMs = 0;
      // After dashing, immediately transition to downward motion
      // If we were moving upward, flip to a slight downward velocity
      if (this.velocity > 0) this.velocity = -0.1;
      this.updateDashVisualState();
    }

    // Update vertical motion and apply squash/stretch
    update(dt60: number): void {
      // While dashing, freeze vertical motion (no gravity)
      if (this.isDashing) return;
      
      // Handle hover physics first
      if (this.isHovering) {
        this.updateHoverPhysics(dt60);
        return;
      }
      
      if (!this.frozenDeath && this.isJumping){
        this.jumpHeight += this.velocity * dt60;
        if (this.velocity > 2) this.velocity -= Jamble.Settings.current.gravityUp * dt60;
        else if (this.velocity > -2) this.velocity -= Jamble.Settings.current.gravityMid * dt60;
        else this.velocity -= Jamble.Settings.current.gravityDown * dt60;

        if (this.jumpHeight <= 0){
          this.jumpHeight = 0;
          this.isJumping = false;
          // Touching ground resets dash availability
          this.endDash();
          this.dashAvailable = true;
          if (Jamble.Settings.current.squashEnabled){
            const sy = Jamble.Settings.current.landScaleY;
            const sx = Jamble.Settings.current.landScaleX;
            // Snap to landing squash instantly, then ease back after duration
            this.el.style.transition = 'transform 0ms linear';
            this.el.style.transform = 'scaleY(' + sy + ') scaleX(' + sx + ')';
            const dur = Math.max(0, Jamble.Settings.current.landSquashDurationMs);
            window.setTimeout(() => {
              const ease = Math.max(0, Jamble.Settings.current.landEaseMs);
              this.el.style.transition = 'transform ' + ease + 'ms ease-out';
              this.el.style.transform = 'scaleY(1) scaleX(1)';
            }, dur);
          } else {
            this.el.style.transform = 'scaleY(1) scaleX(1)';
          }
        } else {
          if (Jamble.Settings.current.squashEnabled){
            const v = Math.max(0, this.velocity);
            const stretch = 1 + v * Jamble.Settings.current.stretchFactor;
            const squash = 1 - v * Jamble.Settings.current.squashFactor;
            const airMs = Math.max(0, Jamble.Settings.current.airTransformSmoothingMs);
            this.el.style.transition = 'transform ' + airMs + 'ms ease-out';
            this.el.style.transform = 'scaleY(' + stretch + ') scaleX(' + squash + ')';
          } else {
            this.el.style.transform = 'scaleY(1) scaleX(1)';
          }
        }
        this.el.style.bottom = this.jumpHeight + 'px';
      }
    }

    // Hover system
    setHoverMode(enabled: boolean): void {
      this.isHovering = enabled;
      if (enabled) {
        // When entering hover, we are no longer grounded and stop normal jumping physics
        this.isJumping = true; // Prevents grounded state checks
        this.velocity = 0; // Stop any current vertical motion
      } else {
        // When disabling hover, start falling
        if (this.jumpHeight > 0) {
          this.isJumping = true;
          this.velocity = -1; // Start falling
        } else {
          this.isJumping = false;
        }
      }
    }

    setHoverTarget(targetHeight: number, liftSpeed: number, fallSpeed: number): void {
      this.hoverTargetHeight = targetHeight;
      this.hoverLiftSpeed = liftSpeed;
      this.hoverFallSpeed = fallSpeed;
    }

    private updateHoverPhysics(dt60: number): void {
      if (!this.isHovering) return;

      const deltaHeight = this.hoverTargetHeight - this.jumpHeight;
      const threshold = 2; // px - close enough to target
      
      if (Math.abs(deltaHeight) < threshold) {
        // Close enough to target, maintain position
        this.jumpHeight = this.hoverTargetHeight;
        this.velocity = 0;
      } else {
        // Move towards target
        const speed = deltaHeight > 0 ? this.hoverLiftSpeed : this.hoverFallSpeed;
        const direction = deltaHeight > 0 ? 1 : -1;
        const maxMove = speed * (dt60 / 60); // Convert to 60fps-normalized movement
        const actualMove = Math.min(Math.abs(deltaHeight), maxMove) * direction;
        
        this.jumpHeight += actualMove;
        this.velocity = actualMove / (dt60 / 60); // Set velocity for visual effects
      }

      // Update visual position
      this.el.style.bottom = this.jumpHeight + 'px';
    }

    // Horizontal movement helpers
    moveX(dx: number): void { this.x += dx; this.el.style.left = this.x + 'px'; }
    setX(x: number): void { this.x = x; this.el.style.left = this.x + 'px'; }
  }
}
