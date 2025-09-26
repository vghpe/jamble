/// <reference path="../game/player.ts" />
/// <reference path="../game/movement-system.ts" />
/// <reference path="./types.ts" />
namespace Jamble {
  export interface CapabilityProviderDeps {
    player: Player;
    movement: MovementSystem;
    onLandRegister: (cb: () => void) => void;
  }

  export class CapabilityProvider {
    static create(deps: CapabilityProviderDeps): PlayerCapabilities {
      const { player, movement, onLandRegister } = deps;
      const caps: PlayerCapabilities = {
        requestJump: (strength?: number) => {
          if (player.isJumping || player.frozenDeath) return false;
          player.jump();
          if (typeof strength === 'number') player.velocity = strength;
          return true;
        },
        startDash: (_speed: number, durationMs: number, invincible?: boolean) => {
          return player.startDash(durationMs, invincible);
        },
        addHorizontalImpulse: (speed: number, durationMs: number) => {
          movement.addImpulse(speed, durationMs);
        },
        setVerticalVelocity: (vy: number) => { player.velocity = vy; },
        onLand: (cb: () => void) => { onLandRegister(cb); },
        setHoverMode: (enabled: boolean) => { player.setHoverMode(enabled); },
        setHoverTarget: (targetHeight: number, liftSpeed: number, fallSpeed: number) => {
          player.setHoverTarget(targetHeight, liftSpeed, fallSpeed);
        }
      };
      return caps;
    }
  }
}
