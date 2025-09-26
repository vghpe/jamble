namespace Jamble {
  export interface PlayerConfig {
    squashEnabled: boolean;
    stretchFactor: number;
    squashFactor: number;
    landSquashDurationMs: number;
    landScaleY: number;
    landScaleX: number;
    airTransformSmoothingMs: number;
    landEaseMs: number;
    deathWiggleDistance: number;
  }
  export class Player {
    public el: HTMLElement;
    private visualEl: HTMLElement;
    public isJumping: boolean = false;
    public jumpHeight: number = 0;
    public velocity: number = 0;
  // Logical horizontal center (origin at feet center)
  public x: number = Jamble.Settings.current.playerStartOffset;
    public won: boolean = false;
    public frozenStart: boolean = true;
    public frozenDeath: boolean = false;
    public isDashing: boolean = false;
    public isInvincible: boolean = false; // For phase dash - can pass through objects
    private dashRemainingMs: number = 0;
    private dashAvailable: boolean = true;
    public isHovering: boolean = false;
    public gravityInverted: boolean = false; // VVVVVV-style gravity flip
    private hoverTargetHeight: number = 0;
    private hoverLiftSpeed: number = 200; // px/s
    private hoverFallSpeed: number = 300; // px/s
    // Visual scale state (decoupled from position)
    private scaleX: number = 1;
    private scaleY: number = 1;
  private hoverPrevOuterTransition: string | null = null;
    private static defaultConfig: PlayerConfig = {
      squashEnabled: true,
      stretchFactor: 0.05,
      squashFactor: 0.02,
      landSquashDurationMs: 150,
      landScaleY: 0.6,
      landScaleX: 1.4,
      airTransformSmoothingMs: 100,
      landEaseMs: 100,
      deathWiggleDistance: 1
    };
    private config: PlayerConfig = { ...Player.defaultConfig };

    constructor(el: HTMLElement){
      this.el = el;
      // Create a visual-only inner wrapper so scale/wiggle do not affect collider bounds
      let inner = this.el.querySelector('.jamble-player-inner') as HTMLElement | null;
      if (!inner){
        inner = document.createElement('div');
        inner.className = 'jamble-player-inner jamble-player-idle';
        while (this.el.firstChild){ inner.appendChild(this.el.firstChild); }
        this.el.appendChild(inner);
      }
      this.visualEl = inner;
      this.reset();
    }

    public getConfig(): Readonly<PlayerConfig> { return this.config; }
    public updateConfig(patch: Partial<PlayerConfig>): void {
      this.config = { ...this.config, ...(patch || {}) };
    }

    reset(): void {
      this.isJumping = false;
      this.jumpHeight = 0;
      this.velocity = 0;
  // Initialize as center-x: left edge offset + half width
  this.x = Jamble.Settings.current.playerStartOffset + this.el.offsetWidth / 2;
      this.won = false;
      this.frozenStart = true;
      this.frozenDeath = false;
      this.isDashing = false;
      this.isInvincible = false;
      this.dashRemainingMs = 0;
      this.dashAvailable = true;
      this.isHovering = false;
      this.hoverTargetHeight = 0;
      this.gravityInverted = false;
      this.scaleX = 1; this.scaleY = 1;
      // Clear any wiggle offset (visual-only)
      this.visualEl.style.setProperty('--wiggle-offset', '0px');
      // Prevent initial snap by disabling transitions on first placement
      const prevOuter = this.el.style.transition;
      const prevInner = this.visualEl.style.transition;
      this.el.style.transition = 'transform 0ms linear';
      this.visualEl.style.transition = 'transform 0ms linear';
      this.applyTransform();
      // Restore defaults on next frame
      window.requestAnimationFrame(() => {
        this.el.style.transition = prevOuter || '';
        this.visualEl.style.transition = prevInner || '';
      });
      // Visual state lives on inner element
      this.visualEl.className = 'jamble-player-inner jamble-player-idle';
    }

    // Visual state helpers
  setNormal(): void { this.visualEl.className = 'jamble-player-inner jamble-normal'; }
    setFrozenStart(): void { this.frozenStart = true; this.visualEl.className = 'jamble-player-inner jamble-player-idle'; }
    setPrestart(): void { this.frozenStart = true; this.visualEl.className = 'jamble-player-inner jamble-player-prestart'; }
    clearFrozenStart(): void { this.frozenStart = false; this.setNormal(); }
    setFrozenDeath(): void { this.frozenDeath = true; this.visualEl.className = 'jamble-player-inner jamble-frozen-death'; }

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
      }
      this.setScale(1, 1, this.config.airTransformSmoothingMs);
      this.applyTransform();
      this.setFrozenStart();
    }

    // Geometry helpers
  // Right edge position from center-x
  getRight(_gameWidth: number): number { return this.x + this.el.offsetWidth / 2; }
    snapRight(gameWidth: number): void {
      // Stop with the same offset as the left side; compute center-x
      this.x = gameWidth - Jamble.Settings.current.playerStartOffset - this.el.offsetWidth / 2;
      this.applyTransform();
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
      // Freeze vertical motion visually during dash by keeping last applied translateY
      // (update() already early-returns while dashing)
      this.applyTransform();
      return true;
    }

    private updateDashVisualState(): void {
      this.visualEl.classList.toggle('jamble-dashing', this.isDashing);
      this.visualEl.classList.toggle('jamble-invincible', this.isDashing && this.isInvincible);
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
      this.applyTransform();
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
        
        // Apply gravity in the direction toward current ground
        let gravityMagnitude: number;
        if (this.velocity > 2) gravityMagnitude = Jamble.Settings.current.gravityUp;
        else if (this.velocity > -2) gravityMagnitude = Jamble.Settings.current.gravityMid;
        else gravityMagnitude = Jamble.Settings.current.gravityDown;
        
        // When gravity is inverted, we accelerate toward ceiling (positive direction)
        // When normal, we accelerate toward floor (negative direction)
        if (this.gravityInverted) {
          this.velocity += gravityMagnitude * dt60;
        } else {
          this.velocity -= gravityMagnitude * dt60;
        }

        // Check for landing on current ground
        const gameEl = this.el.parentElement;
        const maxJumpHeight = gameEl ? gameEl.offsetHeight - this.el.offsetHeight : 0;
        
        let hasLanded = false;
        if (this.gravityInverted) {
          // When inverted, land on ceiling (max jump height)
          if (this.jumpHeight >= maxJumpHeight) {
            this.jumpHeight = maxJumpHeight;
            hasLanded = true;
          }
        } else {
          // When normal, land on floor (zero jump height)
          if (this.jumpHeight <= 0) {
            this.jumpHeight = 0;
            hasLanded = true;
          }
        }
        
        if (hasLanded) {
          this.isJumping = false;
          // Touching current ground resets dash availability
          this.endDash();
          this.dashAvailable = true;
          if (this.config.squashEnabled){
            const sy = this.config.landScaleY;
            const sx = this.config.landScaleX;
            // Snap to landing squash instantly, then ease back after duration
            this.visualEl.style.transition = 'transform 0ms linear';
            this.setScale(sx, sy);
            this.applyTransform();
            const dur = Math.max(0, this.config.landSquashDurationMs);
            window.setTimeout(() => {
              const ease = Math.max(0, this.config.landEaseMs);
              this.visualEl.style.transition = 'transform ' + ease + 'ms ease-out';
              this.setScale(1, 1);
              this.applyTransform();
            }, dur);
          } else {
            this.setScale(1, 1, this.config.airTransformSmoothingMs);
            this.applyTransform();
          }
        } else {
          if (this.config.squashEnabled){
            const v = Math.max(0, this.velocity);
            const stretch = 1 + v * this.config.stretchFactor;
            const squash = 1 - v * this.config.squashFactor;
            // Avoid animating translate (position) while in-air; only adjust scale values.
            // We cannot independently transition scale without affecting translate using a single transform property.
            // To preserve movement feel, do not set a non-zero transition here.
            this.visualEl.style.transition = 'transform 0ms linear';
            this.setScale(squash, stretch);
            this.applyTransform();
          } else {
            this.setScale(1, 1);
            this.applyTransform();
          }
        }
        this.applyTransform();
      }
    }

    // Hover system
    setHoverMode(enabled: boolean): void {
      this.isHovering = enabled;
      if (enabled) {
        // When entering hover, we are no longer grounded and stop normal jumping physics
        this.isJumping = true; // Prevents grounded state checks
        this.velocity = 0; // Stop any current vertical motion
        // Disable outer transition so vertical translate doesn't tween during hover control
        this.hoverPrevOuterTransition = this.el.style.transition || '';
        this.el.style.transition = 'transform 0ms linear';
      } else {
        // When disabling hover, start falling
        if (this.jumpHeight > 0) {
          this.isJumping = true;
          this.velocity = -1; // Start falling
        } else {
          this.isJumping = false;
        }
        // Restore previous outer transition
        if (this.hoverPrevOuterTransition !== null) {
          this.el.style.transition = this.hoverPrevOuterTransition;
          this.hoverPrevOuterTransition = null;
        }
        // Apply updated state immediately
        this.applyTransform();
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

      // Prevent going below ground
      if (this.jumpHeight < 0) this.jumpHeight = 0;

      // Update visual position
      this.applyTransform();
    }

    // Gravity flip methods
    flipGravity(): void {
      console.log(`[Player] Flipping gravity from ${this.gravityInverted ? 'inverted' : 'normal'} to ${!this.gravityInverted ? 'inverted' : 'normal'}`);
      console.log(`[Player] Before flip - jumpHeight: ${this.jumpHeight}, velocity: ${this.velocity}`);
      
      const gameEl = this.el.parentElement;
      const maxY = gameEl ? gameEl.offsetHeight - this.el.offsetHeight : 0;
      
      // Preserve world Y position by transforming jumpHeight
      const clampedHeight = Math.max(0, Math.min(this.jumpHeight, maxY));
      const newJumpHeight = maxY - clampedHeight;
      
      // Invert velocity direction  
      const newVelocity = -this.velocity;
      
      // Apply the transformation
      this.jumpHeight = newJumpHeight;
      this.velocity = newVelocity;
      this.gravityInverted = !this.gravityInverted;
      
      // Add visual indication of gravity state
      this.el.classList.toggle('gravity-inverted', this.gravityInverted);
      
      // If we're now at the "ground", we should be grounded
      if ((this.gravityInverted && this.jumpHeight >= maxY) || (!this.gravityInverted && this.jumpHeight <= 0)) {
        this.isJumping = false;
        console.log(`[Player] Grounded on ${this.gravityInverted ? 'ceiling' : 'floor'} after flip`);
      } else {
        this.isJumping = true;
      }
      
      console.log(`[Player] After flip - jumpHeight: ${this.jumpHeight}, velocity: ${this.velocity}, maxY: ${maxY}`);
      this.applyTransform();
    }

    // Horizontal movement helpers
    moveX(dx: number): void { this.x += dx; this.applyTransform(); }
    setX(x: number): void { this.x = x; this.applyTransform(); }

    // Visual helpers
    private setScale(sx: number, sy: number, transitionMs?: number): void {
      this.scaleX = sx;
      this.scaleY = sy;
      if (typeof transitionMs === 'number'){
        this.visualEl.style.transition = 'transform ' + Math.max(0, transitionMs) + 'ms ease-out';
      }
    }

    private applyTransform(): void {
      // Outer element: world position only
  const tx = `${this.x - this.el.offsetWidth / 2}px`;
  const ty = `${-this.jumpHeight}px`;
  this.el.style.transform = `translate(${tx}, ${ty})`;
  // Inner element: visual-only transforms (wiggle + scale)
  const wx = `var(--wiggle-offset, 0px)`;
  this.visualEl.style.transform = `translateX(${wx}) scaleY(${this.scaleY}) scaleX(${this.scaleX})`;
      // Ensure base anchors are at 0 so translate is relative to game origin
      this.el.style.left = '0px';
      this.el.style.bottom = '0px';
    }
  }
}
