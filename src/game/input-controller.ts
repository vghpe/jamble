/// <reference path="./player.ts" />
/// <reference path="./ui/game-ui.ts" />
/// <reference path="../skills/types.ts" />
/// <reference path="../skills/skill-manager.ts" />

namespace Jamble {
  interface InputControllerOptions {
    player: Player;
    skills: SkillManager;
    ui: GameUi;
    gameEl: HTMLElement;
    getWaitGroundForStart: () => boolean;
  }

  export class InputController {
    private player: Player;
    private skills: SkillManager;
    private ui: GameUi;
    private gameEl: HTMLElement;
    private getWaitGroundForStart: () => boolean;
    private bound: boolean = false;

    constructor(options: InputControllerOptions){
      this.player = options.player;
      this.skills = options.skills;
      this.ui = options.ui;
      this.gameEl = options.gameEl;
      this.getWaitGroundForStart = options.getWaitGroundForStart;
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
    }

    bind(): void {
      if (this.bound) return;
      document.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('keydown', this.onKeyDown);
      this.bound = true;
    }

    unbind(): void {
      if (!this.bound) return;
      document.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('keydown', this.onKeyDown);
      this.bound = false;
    }

    private onPointerDown(e: PointerEvent): void {
      if (this.ui.isControlElement(e.target)) return;
      if (this.player.frozenDeath) return;
      const rect = this.gameEl.getBoundingClientRect();
      const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
      const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
      if (!withinX || !withinY) return;
      this.dispatchPrimaryInput();
    }

    private onKeyDown(e: KeyboardEvent): void {
      if (e.code !== 'Space' && e.key !== ' ' && e.key !== 'Spacebar') return;
      if (e.repeat) return;
      e.preventDefault();
      this.dispatchPrimaryInput();
    }

    private dispatchPrimaryInput(): void {
      if (this.player.frozenDeath) return;
      if (this.player.frozenStart && this.getWaitGroundForStart()) return;
      const grounded = this.isGrounded();
      const intent = grounded ? InputIntent.Tap : InputIntent.AirTap;
      const ctx = this.createSkillContext(grounded);
      this.skills.handleInput(intent, ctx);
    }

    private isGrounded(): boolean {
      return this.player.jumpHeight === 0 && !this.player.isJumping && !this.player.isHovering;
    }

    private createSkillContext(grounded: boolean): SkillContext {
      return {
        nowMs: performance.now(),
        grounded,
        velocityY: this.player.velocity,
        isDashing: this.player.isDashing,
        jumpHeight: this.player.jumpHeight,
        dashAvailable: !this.player.isDashing,
        isHovering: this.player.isHovering
      };
    }
  }
}
