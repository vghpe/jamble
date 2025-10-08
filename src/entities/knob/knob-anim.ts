/// <reference path="knob.ts" />

namespace Jamble {
  export class KnobAnim {
    private isDeflecting: boolean = false;
    private deflectionDirection: number = 1;
    private deflectTimer: number = 0; // seconds remaining
    private readonly deflectDuration: number = 0.2; // seconds

    private isSquashing: boolean = false;
    private squashPhase: 'compress' | 'hold' | 'spring' = 'compress';
    private originalLength: number = 0;
    private originalLineWidth: number = 0;
    private squashVelocity: number = 0; // d(length)/dt
    private squashPhaseTimer: number = 0; // seconds for compress/hold
    private squashSpringElapsed: number = 0; // seconds in spring
    private readonly squashOmega: number = 24.6; // ~sqrt(605)
    private readonly squashZeta: number = 0.15;  // ~7.5/(2*24.6)
    private readonly squashHoldTimeS: number = 0.15;

    constructor(private knob: Knob) {}

    update(deltaTime: number): void {
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
        const targetLength = this.originalLength;
        const displacement = this.knob.config.length - targetLength;
        const omega = this.squashOmega;
        const zeta = this.squashZeta;
        const acc = -2 * zeta * omega * this.squashVelocity - (omega * omega) * displacement;
        this.squashVelocity += acc * deltaTime;
        this.knob.config.length += this.squashVelocity * deltaTime;
        this.squashSpringElapsed += deltaTime;

        // Width animation back to original
        const lengthProgress = 1 - Math.abs(displacement) / Math.abs(this.originalLength * 0.9);
        const clampedProgress = Math.max(0, Math.min(1, lengthProgress));
        const widthMultiplier = 1.3;
        this.knob.config.lineWidth = this.originalLineWidth * widthMultiplier -
          (this.originalLineWidth * (widthMultiplier - 1.0) * clampedProgress);

        const isSettled = Math.abs(displacement) < 0.01 && Math.abs(this.squashVelocity) < 0.01;
        if (isSettled || this.squashSpringElapsed > 1.5) {
          this.knob.config.length = this.originalLength;
          this.knob.config.lineWidth = this.originalLineWidth;
          this.isSquashing = false;
          this.squashVelocity = 0;
        }
      }
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

      // Compress length to a small percentage and widen line
      const squashPercent = 4; // preserve current look
      this.knob.config.length = this.originalLength * (squashPercent / 100);
      const widthMultiplier = 1.3;
      this.knob.config.lineWidth = this.originalLineWidth * widthMultiplier;

      // Phase timer for compress/hold
      this.squashPhaseTimer = this.squashHoldTimeS;
    }
  }
}

