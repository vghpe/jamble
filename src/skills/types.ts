namespace Jamble {
  export type SkillSlot = 'movement' | 'utility' | 'ultimate';

  export enum InputIntent {
    Tap = 'tap',
    HoldStart = 'hold_start',
    HoldEnd = 'hold_end',
    DoubleTap = 'double_tap',
    AirTap = 'air_tap'
  }

  export interface SkillContext {
    nowMs: number;
    grounded: boolean;
    velocityY: number;
    isDashing: boolean;
    jumpHeight: number;
    dashAvailable: boolean;
    isHovering: boolean;
  }

  // Restricted facade exposed to skills
  export interface PlayerCapabilities {
    requestJump(strength?: number): boolean;
    startDash(speed: number, durationMs: number, invincible?: boolean): boolean;
    addHorizontalImpulse(speed: number, durationMs: number): void;
    setVerticalVelocity(vy: number): void;
    onLand(cb: () => void): void; // unsubscribe handled by manager in future phase
    setHoverMode(enabled: boolean): void;
    setHoverTarget(targetHeight: number, liftSpeed: number, fallSpeed: number): void;
  }

  export interface DashConfig {
    speed: number;
    durationMs: number;
    cooldownMs: number;
    invincible?: boolean;
  }

  export interface SkillConfig {
    id: string;
    name: string;
    slot: SkillSlot;
    priority: number; // higher wins when multiple can handle same intent
    cooldownMs?: number;
    charges?: number;
    regenMs?: number; // per charge regen
  }

  export interface Skill {
    readonly id: string;
    readonly name: string;
    readonly slot: SkillSlot;
    readonly priority: number;
    onEquip?(caps: PlayerCapabilities, cfg?: any): void;
    onUnequip?(): void;
    onTick?(ctx: SkillContext, caps: PlayerCapabilities): void;
    onInput?(intent: InputIntent, ctx: SkillContext, caps: PlayerCapabilities): boolean; // true if handled
    onLand?(ctx: SkillContext, caps: PlayerCapabilities): void;
  }
}
