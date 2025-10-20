/// <reference path="knob.ts" />

namespace Jamble {
  export class KnobAnim {
    // Animation timing constants
    private readonly deflectDuration: number = 0.2; // seconds
    private readonly squashHoldTimeS: number = 0.15; // seconds
    private readonly squashOmega: number = 24.6; // Spring frequency
    private readonly squashZeta: number = 0.15;  // Damping coefficient
    private readonly maxAnimationTime: number = 1.5; // Max spring settle time
    
    // Visual effect constants
    private readonly squashPercent: number = 4; // Compressed length percentage
    private readonly widthMultiplier: number = 1.3; // Width increase when compressed
    private readonly settlementThreshold: number = 0.01; // When to consider animation complete
    
    // Deflection state
    private isDeflecting: boolean = false;
    private deflectionDirection: number = 1;
    private deflectTimer: number = 0; // seconds remaining

    // Squash animation state
    private isSquashing: boolean = false;
    private squashPhase: 'compress' | 'hold' | 'spring' = 'compress';
    private originalLength: number = 0;
    private originalLineWidth: number = 0;
    private squashVelocity: number = 0; // d(length)/dt
    private squashPhaseTimer: number = 0; // seconds for compress/hold
    private squashSpringElapsed: number = 0; // seconds in spring

    // Despawn/spawn animation state
    private isDespawning: boolean = false;
    private despawnPhaseTimer: number = 0;
    private isSpawning: boolean = false;
    private spawnSpringElapsed: number = 0;
    private spawnVelocity: number = 0;
    
    private onDespawnComplete?: () => void;
    private onSpawnComplete?: () => void;

    constructor(private knob: Knob) {
      // Initialize original values from knob config
      this.originalLength = knob.config.length;
      this.originalLineWidth = knob.config.lineWidth;
    }

    update(deltaTime: number): void {
      // Handle despawn animation first (highest priority)
      if (this.isDespawning) {
        this.updateDespawn(deltaTime);
        return; // Don't run other animations during despawn
      }

      // Handle spawn animation
      if (this.isSpawning) {
        this.updateSpawn(deltaTime);
        return; // Don't run other animations during spawn
      }

      // Deflection hold timer and target angle maintenance
      if (this.isDeflecting) {
        this.deflectTimer -= deltaTime;
        if (this.deflectTimer <= 0) {
          this.isDeflecting = false;
          this.knob.thetaTarget = 0;
        } else {
          const maxAngle = (this.knob.config.maxAngleDeg * Math.PI) / 180;
          this.knob.thetaTarget = this.deflectionDirection * maxAngle;
        }
      }

      // Angular spring integration (ω/ζ form)
      const angZeta = this.knob.config.zeta;
      const angOmega = this.knob.config.omega;
      const angAcc = -2 * angZeta * angOmega * this.knob.thetaDot -
                     (angOmega * angOmega) * (this.knob.theta - this.knob.thetaTarget);
      this.knob.thetaDot += angAcc * deltaTime;
      this.knob.theta += this.knob.thetaDot * deltaTime;

      // Squash animation state machine
      if (!this.isSquashing) return;

      if (this.squashPhase === 'compress') {
        this.squashPhaseTimer -= deltaTime;
        if (this.squashPhaseTimer <= 0) {
          this.squashPhase = 'hold';
          this.squashPhaseTimer = this.squashHoldTimeS;
        }
        return;
      }

      if (this.squashPhase === 'hold') {
        this.squashPhaseTimer -= deltaTime;
        if (this.squashPhaseTimer <= 0) {
          this.squashPhase = 'spring';
          this.squashSpringElapsed = 0;
        }
        return;
      }

      if (this.squashPhase === 'spring') {
        this.updateSpringPhysics(
          this.originalLength,
          (newLength) => { this.knob.config.length = newLength; },
          this.squashVelocity,
          (newVelocity) => { this.squashVelocity = newVelocity; },
          deltaTime
        );
        this.squashSpringElapsed += deltaTime;

        // Width animation back to original
        this.updateWidthAnimation(this.knob.config.length, this.originalLength);

        const isSettled = Math.abs(this.knob.config.length - this.originalLength) < this.settlementThreshold && 
                         Math.abs(this.squashVelocity) < this.settlementThreshold;
        if (isSettled || this.squashSpringElapsed > this.maxAnimationTime) {
          this.knob.config.length = this.originalLength;
          this.knob.config.lineWidth = this.originalLineWidth;
          this.isSquashing = false;
          this.squashVelocity = 0;
        }
      }
    }

    /**
     * Update spring physics for length animation
     */
    private updateSpringPhysics(
      targetLength: number,
      setLength: (length: number) => void,
      velocity: number,
      setVelocity: (velocity: number) => void,
      deltaTime: number
    ): void {
      const currentLength = this.knob.config.length;
      const displacement = currentLength - targetLength;
      const acc = -2 * this.squashZeta * this.squashOmega * velocity - 
                  (this.squashOmega * this.squashOmega) * displacement;
      const newVelocity = velocity + acc * deltaTime;
      const newLength = currentLength + newVelocity * deltaTime;
      
      setVelocity(newVelocity);
      setLength(newLength);
    }

    /**
     * Update width animation based on length progress
     */
    private updateWidthAnimation(currentLength: number, targetLength: number): void {
      const displacement = Math.abs(currentLength - targetLength);
      const lengthProgress = 1 - displacement / Math.abs(targetLength * 0.9);
      const clampedProgress = Math.max(0, Math.min(1, lengthProgress));
      this.knob.config.lineWidth = this.originalLineWidth * this.widthMultiplier -
        (this.originalLineWidth * (this.widthMultiplier - 1.0) * clampedProgress);
    }

    triggerDeflect(direction: number): void {
      this.isDeflecting = true;
      this.deflectionDirection = direction >= 0 ? 1 : -1;
      const maxAngle = (this.knob.config.maxAngleDeg * Math.PI) / 180;
      this.knob.thetaTarget = this.deflectionDirection * maxAngle;
      this.deflectTimer = this.deflectDuration;
    }

    triggerSquash(): void {
      this.isSquashing = true;
      this.squashPhase = 'compress';
      this.originalLength = this.knob.config.length;
      this.originalLineWidth = this.knob.config.lineWidth;
      this.squashVelocity = 0;
      this.squashSpringElapsed = 0;

      // Apply compression
      this.applyCompression();
      
      // Phase timer for compress/hold
      this.squashPhaseTimer = this.squashHoldTimeS;
    }

    /**
     * Apply compression effect to knob (used by squash, despawn, spawn)
     */
    private applyCompression(): void {
      this.knob.config.length = this.originalLength * (this.squashPercent / 100);
      this.knob.config.lineWidth = this.originalLineWidth * this.widthMultiplier;
    }

    /**
     * Trigger despawn animation (compress down - first half of squash)
     */
    triggerDespawn(onComplete?: () => void): void {
      // Stop any ongoing animations
      this.stopAllAnimations();
      
      this.isDespawning = true;
      this.onDespawnComplete = onComplete;
      this.originalLength = this.knob.config.length;
      this.originalLineWidth = this.knob.config.lineWidth;
      
      // Apply compression and hold
      this.applyCompression();
      this.despawnPhaseTimer = this.squashHoldTimeS;
    }

    /**
     * Trigger spawn animation (spring up - second half of squash)
     */
    triggerSpawn(onComplete?: () => void): void {
      this.isSpawning = true;
      this.onSpawnComplete = onComplete;
      this.spawnSpringElapsed = 0;
      this.spawnVelocity = 0;
      
      // Start from compressed state
      this.applyCompression();
    }

    /**
     * Stop all ongoing animations
     */
    private stopAllAnimations(): void {
      this.isDeflecting = false;
      this.isSquashing = false;
      this.isSpawning = false;
    }

    /**
     * Update despawn animation (compress and hold)
     */
    private updateDespawn(deltaTime: number): void {
      this.despawnPhaseTimer -= deltaTime;
      
      if (this.despawnPhaseTimer <= 0) {
        this.isDespawning = false;
        if (this.onDespawnComplete) {
          this.onDespawnComplete();
          this.onDespawnComplete = undefined;
        }
      }
    }

    /**
     * Update spawn animation (spring up)
     */
    private updateSpawn(deltaTime: number): void {
      this.updateSpringPhysics(
        this.originalLength,
        (newLength) => { this.knob.config.length = newLength; },
        this.spawnVelocity,
        (newVelocity) => { this.spawnVelocity = newVelocity; },
        deltaTime
      );
      this.spawnSpringElapsed += deltaTime;

      // Width animation back to original
      this.updateWidthAnimation(this.knob.config.length, this.originalLength);

      const isSettled = Math.abs(this.knob.config.length - this.originalLength) < this.settlementThreshold && 
                       Math.abs(this.spawnVelocity) < this.settlementThreshold;
      if (isSettled || this.spawnSpringElapsed > this.maxAnimationTime) {
        this.knob.config.length = this.originalLength;
        this.knob.config.lineWidth = this.originalLineWidth;
        this.isSpawning = false;
        this.spawnVelocity = 0;
        
        if (this.onSpawnComplete) {
          this.onSpawnComplete();
          this.onSpawnComplete = undefined;
        }
      }
    }

    /**
     * Check if any animation is currently playing
     */
    isAnimating(): boolean {
      return this.isDeflecting || this.isSquashing || this.isDespawning || this.isSpawning;
    }

    /**
     * Reset all animation state (used when transitioning to RETRACTED)
     */
    reset(): void {
      this.stopAllAnimations();
      this.isDespawning = false;
      this.squashVelocity = 0;
      this.spawnVelocity = 0;
      
      // Reset to original config values
      this.knob.config.length = this.originalLength;
      this.knob.config.lineWidth = this.originalLineWidth;
    }
  }
}
