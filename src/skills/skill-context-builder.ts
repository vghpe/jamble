/// <reference path="../game/player.ts" />
/// <reference path="./types.ts" />
namespace Jamble {
  export class SkillContextBuilder {
    static groundedFrom(player: Player): boolean {
      return player.jumpHeight === 0 && !player.isJumping && !player.isHovering;
    }

    static build(player: Player): SkillContext {
      const grounded = this.groundedFrom(player);
      return {
        nowMs: performance.now(),
        grounded,
        velocityY: player.velocity,
        isDashing: player.isDashing,
        jumpHeight: player.jumpHeight,
        dashAvailable: !player.isDashing,
        isHovering: player.isHovering
      };
    }
  }
}
