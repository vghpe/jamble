/// <reference path="../core/transform.ts" />

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
  export class Player implements TransformElement {
    public el: HTMLElement;
    private visualEl: HTMLElement;
    public isJumping: boolean = false;
    public jumpHeight: number = 0;
    public velocity: number = 0;
  // Logical horizontal center (origin at feet center)
  public x: number = Jamble.Settings.current.playerStartOffset;
    
    // Transform-based properties (replacing DOM queries)
    private transform: ElementTransform;
    private collisionConfig: CollisionConfig;
    public won: boolean = false;
    public frozenStart: boolean = true;
    public frozenDeath: boolean = false;
    public isDashing: boolean = false;
    public isInvincible: boolean = false; // For phase dash - can pass through objects
    private dashRemainingMs: number = 0;
    private dashAvailable: boolean = true;
    public isHovering: boolean = false;
    /** VVVVVV-style gravity flip state - when true, ceiling becomes ground */
    public gravityInverted: boolean = false;
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
      
      // Initialize transform with logical dimensions (get initial size from DOM once)
      const rect = this.el.getBoundingClientRect();
      this.transform = {
        x: Jamble.Settings.current.playerStartOffset + rect.width / 2,
        y: 0, // jumpHeight equivalent
        width: rect.width,
        height: rect.height
      };
      
      // Initialize collision config - using rectangle for better platform collision
      this.collisionConfig = {
        shape: 'rect',
        scaleX: 0.8,  // More forgiving collision
        scaleY: 0.8,
        offsetX: 0,
        offsetY: 0
      };
      
      this.reset();
    }

    public getConfig(): Readonly<PlayerConfig> { return this.config; }
    public updateConfig(patch: Partial<PlayerConfig>): void {
      this.config = { ...this.config, ...(patch || {}) };
    }

    // TransformElement interface implementation
    getTransform(): ElementTransform {
      return { ...this.transform };
    }

    getCollisionConfig(): CollisionConfig {
      return { ...this.collisionConfig };
    }

    syncVisualToTransform(): void {
      // This is what applyTransform() does - sync DOM to logical state
      this.applyTransform();
    }

    reset(spawnPosition?: { x: number, y: number }): void {
      this.isJumping = false;
      this.jumpHeight = 0;
      this.velocity = 0;
      
      if (spawnPosition) {
        // Use provided spawn position (e.g., from home platform)
        this.x = spawnPosition.x;
        this.transform.x = this.x;
        this.transform.y = spawnPosition.y;
      } else {
        // Fallback to original spawn logic
        this.x = Jamble.Settings.current.playerStartOffset + this.transform.width / 2;
        this.transform.x = this.x;
        this.transform.y = 0;
      }
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

    /**
     * Get collision shape using hybrid transform approach.
     * Position from DOM (reliable), size from transform data (configurable).
     * 
     * @returns CollisionShape for collision detection, or null if invincible
     */
    getCollisionShape(): CollisionShape | null {
      // No collision when invincible (phase dash)
      if (this.isInvincible) return null;
      
      // Hybrid approach: DOM for position (reliable), transform data for sizing (configurable)
      const rect = this.el.getBoundingClientRect();
      
      // Calculate collision size from transform data (configurable)
      const collisionWidth = this.transform.width * this.collisionConfig.scaleX;
      const collisionHeight = this.transform.height * this.collisionConfig.scaleY;
      
      // Center the collision box within the visual bounds
      const offsetX = (rect.width - collisionWidth) / 2 + this.collisionConfig.offsetX;
      const offsetY = (rect.height - collisionHeight) / 2 + this.collisionConfig.offsetY;
      
      const collisionBounds = new DOMRect(
        rect.x + offsetX,
        rect.y + offsetY,
        collisionWidth,
        collisionHeight
      );

      return CollisionManager.createRectShape(collisionBounds, 'player');
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
  // Right edge position from center-x (using transform data)
  getRight(_gameWidth: number): number { return this.x + this.transform.width / 2; }
    snapRight(gameWidth: number): void {
      // Stop with the same offset as the left side; compute center-x (using transform data)
      this.x = gameWidth - Jamble.Settings.current.playerStartOffset - this.transform.width / 2;
      this.transform.x = this.x;
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
        
        // Apply tiered gravity magnitude based on current velocity
        let gravityMagnitude: number;
        if (this.velocity > 2) gravityMagnitude = Jamble.Settings.current.gravityUp;
        else if (this.velocity > -2) gravityMagnitude = Jamble.Settings.current.gravityMid;
        else gravityMagnitude = Jamble.Settings.current.gravityDown;
        
        // Apply gravity toward current ground (floor or ceiling)
        if (this.gravityInverted) {
          this.velocity += gravityMagnitude * dt60; // Accelerate toward ceiling
        } else {
          this.velocity -= gravityMagnitude * dt60; // Accelerate toward floor
        }

        // Check for landing on current ground (floor or ceiling)
        const gameEl = this.el.parentElement;
        const gameHeight = gameEl ? gameEl.offsetHeight : 0;
        const playerHeight = this.transform.height;
        
        let hasLanded = false;
        if (this.gravityInverted) {
          // Landing on ceiling - account for border thickness to match floor behavior
          const borderOffset = 4; // 2px top + 2px bottom border from CSS
          const ceilingJumpHeight = gameHeight - playerHeight - borderOffset;
          if (this.jumpHeight >= ceilingJumpHeight) {
            this.jumpHeight = ceilingJumpHeight;
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
            // Set transform origin based on which surface we landed on
            if (this.gravityInverted) {
              // Landing on ceiling - scale from TOP (head touches ceiling)
              this.visualEl.style.transformOrigin = 'center top';
            } else {
              // Landing on floor - scale from BOTTOM (feet touch floor)
              this.visualEl.style.transformOrigin = 'center bottom';
            }
            
            // Use same squash values for both - the transform origin handles the direction
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
              // Reset transform origin after animation completes
              window.setTimeout(() => {
                this.visualEl.style.transformOrigin = '';
              }, ease);
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
    /**
     * VVVVVV-style gravity flip: toggles gravity direction and preserves world position.
     * When inverted, the ceiling becomes ground and player falls upward.
     * Velocity is reset to prevent runaway acceleration on repeated flips.
     */
    flipGravity(): void {
      this.gravityInverted = !this.gravityInverted;
      
      // Reset velocity to small value toward new ground to prevent buildup
      const baseFlipVelocity = 1;
      this.velocity = this.gravityInverted ? baseFlipVelocity : -baseFlipVelocity;
      
      // Visual indication and ensure physics continue
      this.el.classList.toggle('gravity-inverted', this.gravityInverted);
      this.isJumping = true;
    }

    // Horizontal movement helpers
    moveX(dx: number): void { 
      this.x += dx; 
      this.transform.x = this.x;
      this.applyTransform(); 
    }
    setX(x: number): void { 
      this.x = x; 
      this.transform.x = this.x;
      this.applyTransform(); 
    }

    // Visual helpers
    private setScale(sx: number, sy: number, transitionMs?: number): void {
      this.scaleX = sx;
      this.scaleY = sy;
      if (typeof transitionMs === 'number'){
        this.visualEl.style.transition = 'transform ' + Math.max(0, transitionMs) + 'ms ease-out';
      }
    }

    private applyTransform(): void {
      // Update transform state
      this.transform.x = this.x;
      this.transform.y = this.jumpHeight;
      
      // Outer element: world position only (using transform data)
  const tx = `${this.x - this.transform.width / 2}px`;
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
