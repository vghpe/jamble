/// <reference path="./player.ts" />
/// <reference path="./level-elements.ts" />
/// <reference path="./countdown.ts" />
/// <reference path="./wiggle.ts" />
/// <reference path="./skills/types.ts" />
/// <reference path="./skills/manager.ts" />
/// <reference path="./skills/jump.ts" />
/// <reference path="./skills/dash.ts" />
namespace Jamble {
  export class Game {
    private root: HTMLElement;
    private gameEl: HTMLDivElement;
    private player: Player;
    private levelElements: LevelElementManager;
    private countdown: Countdown;
    private resetBtn: HTMLButtonElement;
    private startBtn: HTMLButtonElement;
    private shuffleBtn: HTMLButtonElement;
    private skillSlotsEl: HTMLElement | null = null;
    private skillMenuEl: HTMLElement | null = null;
    private wiggle: Wiggle;
    private lastTime: number | null = null;
    private rafId: number | null = null;
    private awaitingStartTap: boolean = false;
    private startCountdownTimer: number | null = null;
    private direction: 1 | -1 = 1;
    private level: number = 0;
    private levelEl: HTMLElement | null = null;
    private deathWiggleTimer: number | null = null;
    private showResetTimer: number | null = null;
    private waitGroundForStart: boolean = false;
    private inCountdown: boolean = false;
    // Skills
    private skills: SkillManager;
    private landCbs: Array<() => void> = [];
    private wasGrounded: boolean = true;
    private impulses: Array<{ speed: number; remainingMs: number }> = [];

    constructor(root: HTMLElement){
      this.root = root;
      const gameEl = root.querySelector('.jamble-game') as HTMLDivElement | null;
      const playerEl = root.querySelector('.jamble-player') as HTMLElement | null;
      const t1 = root.querySelector('.jamble-tree[data-tree="1"]') as HTMLElement | null;
      const t2 = root.querySelector('.jamble-tree[data-tree="2"]') as HTMLElement | null;
      const cdEl = root.querySelector('.jamble-countdown') as HTMLElement | null;
      const resetBtn = root.querySelector('.jamble-reset') as HTMLButtonElement | null;
      const levelEl = root.querySelector('.jamble-level') as HTMLElement | null;
      const startBtn = root.querySelector('.jamble-start') as HTMLButtonElement | null;
      const shuffleBtn = root.querySelector('.jamble-shuffle') as HTMLButtonElement | null;
      const skillSlotsEl = root.querySelector('#skill-slots') as HTMLElement | null;
      const skillMenuEl = root.querySelector('#skill-menu') as HTMLElement | null;

      if (!gameEl || !playerEl || !t1 || !t2 || !cdEl || !resetBtn || !startBtn || !shuffleBtn){
        throw new Error('Jamble: missing required elements');
      }

      this.gameEl = gameEl;
      this.player = new Player(playerEl);
      this.levelElements = new LevelElementManager();
      this.levelElements.add(new TreeElement('tree1', t1));
      this.levelElements.add(new TreeElement('tree2', t2));
      this.countdown = new Countdown(cdEl);
      this.resetBtn = resetBtn;
      this.startBtn = startBtn;
      this.shuffleBtn = shuffleBtn;
      this.skillSlotsEl = skillSlotsEl;
      this.skillMenuEl = skillMenuEl;
      this.levelEl = levelEl;
      this.wiggle = new Wiggle(this.player.el);

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onStartClick = this.onStartClick.bind(this);
      this.onShuffleClick = this.onShuffleClick.bind(this);
      this.reset = this.reset.bind(this);
      this.loop = this.loop.bind(this);

      // Capabilities facade for skills
      const caps: PlayerCapabilities = {
        requestJump: (strength?: number) => {
          if (this.player.isJumping || this.player.frozenDeath) return false;
          // Use built-in jump to keep side effects consistent, then override strength if provided
          this.player.jump();
          if (typeof strength === 'number') this.player.velocity = strength;
          return true;
        },
        startDash: (_speed: number, durationMs: number) => {
          return this.player.startDash(durationMs);
        },
        addHorizontalImpulse: (speed: number, durationMs: number) => {
          this.impulses.push({ speed, remainingMs: Math.max(0, durationMs) });
        },
        setVerticalVelocity: (vy: number) => { this.player.velocity = vy; },
        onLand: (cb: () => void) => { this.landCbs.push(cb); }
      };

      // Skill manager and default registry/loadout
      this.skills = new SkillManager(caps, { movement: 4 });
      // Register skills with defaults
      this.skills.register({ id: 'move', name: 'Move', slot: 'movement', priority: 5, defaults: {}, create: (_cfg) => new MoveSkill('move', 5) });
      this.skills.register({ id: 'jump', name: 'Jump', slot: 'movement', priority: 10, defaults: { strength: Jamble.Settings.skills.configs.jump?.strength ?? Jamble.Settings.current.jumpStrength }, create: (cfg) => new JumpSkill('jump', 10, cfg) });
      this.skills.register({ id: 'dash', name: 'Dash', slot: 'movement', priority: 20, defaults: { speed: Jamble.Settings.skills.configs.dash?.speed ?? Jamble.Settings.current.dashSpeed, durationMs: Jamble.Settings.skills.configs.dash?.durationMs ?? Jamble.Settings.current.dashDurationMs, cooldownMs: Jamble.Settings.skills.configs.dash?.cooldownMs ?? 150 }, create: (cfg) => new DashSkill('dash', 20, cfg) });
      // Initialize configs from loaded skills profile if present
      const sj = Jamble.Settings.skills.configs.jump; if (sj) this.skills.setConfig('jump', sj);
      const sd = Jamble.Settings.skills.configs.dash; if (sd) this.skills.setConfig('dash', sd);
      // Equip from loadout or fallback
      const loadoutMoves = Jamble.Settings.skills.loadout.movement || ['move','jump','dash'];
      loadoutMoves.forEach(id => { try { this.skills.equip(id); } catch(_e){} });
    }
    public getSkillManager(): SkillManager { return this.skills; }

    start(): void {
      this.bind();
      this.reset();
      this.rafId = window.requestAnimationFrame(this.loop);
    }

    stop(): void {
      this.unbind();
      if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.wiggle.stop();
      this.countdown.hide();
      this.impulses.length = 0;
    }

    reset(): void {
      this.wiggle.stop();
      this.countdown.hide();
      if (this.startCountdownTimer !== null) { window.clearTimeout(this.startCountdownTimer); this.startCountdownTimer = null; }
      if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
      if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
      this.impulses.length = 0;
      this.player.reset();
      this.resetBtn.style.display = 'none';
      this.player.setFrozenStart();
      this.awaitingStartTap = true;
      this.waitGroundForStart = false;
      this.inCountdown = false;
      this.showIdleControls();
      this.direction = 1;
      this.level = 0;
      this.updateLevel();
    }

    private onStartClick(): void {
      if (this.waitGroundForStart) return; // cannot start until grounded at edge
      if (!this.awaitingStartTap) return;
      this.awaitingStartTap = false;
      this.player.setPrestart();
      this.hideIdleControls();
      this.countdown.start(Jamble.Settings.current.startFreezeTime);
      this.inCountdown = true;
      this.startCountdownTimer = window.setTimeout(() => {
        this.player.clearFrozenStart();
        this.inCountdown = false;
        this.startCountdownTimer = null;
      }, Jamble.Settings.current.startFreezeTime);
    }

    private onShuffleClick(): void {
      if (!this.awaitingStartTap || this.waitGroundForStart) return;
      this.shuffleTrees();
    }

    private shuffleTrees(): void {
      const min = Jamble.Settings.current.treeEdgeMarginPct;
      const max = 100 - Jamble.Settings.current.treeEdgeMarginPct;
      const gap = Jamble.Settings.current.treeMinGapPct;
      const left1 = min + Math.random() * (max - min - gap);
      const left2 = left1 + gap + Math.random() * (max - (left1 + gap));
      const tree1 = this.levelElements.getPositionable('tree1');
      const tree2 = this.levelElements.getPositionable('tree2');
      if (tree1) tree1.setLeftPct(left1);
      if (tree2) tree2.setLeftPct(left2);
    }

    private bind(): void {
      document.addEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.addEventListener('click', this.reset);
      this.startBtn.addEventListener('click', this.onStartClick);
      this.shuffleBtn.addEventListener('click', this.onShuffleClick);
    }
    private unbind(): void {
      document.removeEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.removeEventListener('click', this.reset);
      this.startBtn.removeEventListener('click', this.onStartClick);
      this.shuffleBtn.removeEventListener('click', this.onShuffleClick);
    }

    private showIdleControls(): void {
      this.startBtn.style.display = 'block';
      this.shuffleBtn.style.display = 'block';
      if (this.skillSlotsEl) this.skillSlotsEl.style.display = 'flex';
      if (this.skillMenuEl) this.skillMenuEl.style.display = 'flex';
    }
    private hideIdleControls(): void {
      this.startBtn.style.display = 'none';
      this.shuffleBtn.style.display = 'none';
      // Keep skill slots visible during runs; hide only the menu
      if (this.skillSlotsEl) this.skillSlotsEl.style.display = 'flex';
      if (this.skillMenuEl) this.skillMenuEl.style.display = 'none';
    }

    private onPointerDown(e: PointerEvent): void {
      if (e.target === this.resetBtn || e.target === this.startBtn || e.target === this.shuffleBtn) return;
      if (this.player.frozenDeath) return;
      const rect = this.gameEl.getBoundingClientRect();
      const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
      const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
      if (withinX && withinY) {
        // Note: starting countdown happens via Start button only
        // Build intent based on grounded state; allow jumps during idle unless waiting for ground
        const grounded = this.player.jumpHeight === 0 && !this.player.isJumping;
        if (this.player.frozenStart && this.waitGroundForStart) return;
        const intent = grounded ? InputIntent.Tap : InputIntent.AirTap;
        const ctx: SkillContext = {
          nowMs: performance.now(),
          grounded,
          velocityY: this.player.velocity,
          isDashing: this.player.isDashing,
          jumpHeight: this.player.jumpHeight,
          dashAvailable: !this.player.isDashing
        };
        this.skills.handleInput(intent, ctx);
      }
    }

    private updateLevel(): void {
      if (this.levelEl) this.levelEl.textContent = String(this.level);
    }
    private collisionWith(ob: LevelElement): boolean {
      const pr = this.player.el.getBoundingClientRect();
      const tr = ob.rect();
      return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top;
    }
    private reachedRight(): boolean {
      // Consider a virtual wall offset from the right by playerStartOffset
      const rightLimit = this.gameEl.offsetWidth - Jamble.Settings.current.playerStartOffset;
      return this.player.getRight(this.gameEl.offsetWidth) >= rightLimit;
    }
    private reachedLeft(): boolean { return this.player.x <= Jamble.Settings.current.playerStartOffset; }

    private handleEdgeArrival(nextDirection: 1 | -1, align: () => void): void {
      align();
      this.level += 1;
      this.updateLevel();
      if (Jamble.Settings.current.mode === 'idle'){
        this.player.setFrozenStart();
        if (this.player.velocity > 0) this.player.velocity = -0.1;
        this.waitGroundForStart = true;
        this.awaitingStartTap = false;
      } else {
        if (this.player.velocity > 0) this.player.velocity = -0.1;
        this.awaitingStartTap = false;
        this.waitGroundForStart = false;
        this.hideIdleControls();
      }
      this.direction = nextDirection;
    }

    private loop(ts: number): void {
      if (this.lastTime === null) this.lastTime = ts;
      const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
      const dt60 = deltaSec * 60;
      this.lastTime = ts;

      // Keep countdown position near player
      const cx = this.player.x + this.player.el.offsetWidth / 2;
      const cy = this.player.jumpHeight + this.player.el.offsetHeight + 10;
      this.countdown.updatePosition(cx, cy);

      // If mode switched to pingpong while idling, resume immediately
      if (Jamble.Settings.current.mode === 'pingpong' && this.player.frozenStart && !this.inCountdown && !this.player.frozenDeath){
        this.awaitingStartTap = false;
        this.waitGroundForStart = false;
        this.hideIdleControls();
        this.player.clearFrozenStart();
      }

      // Horizontal movement when not frozen/dead
      // Base auto-run applies only if Move is equipped; Dash contributes via accumulated impulses
      if (!this.player.frozenStart && !this.player.frozenDeath){
        if (this.skills.isEquipped('move')){
          const base = Jamble.Settings.current.playerSpeed;
          const dx = base * deltaSec * this.direction;
          this.player.moveX(dx);
        }

        // Apply horizontal impulses (e.g., from Dash). Sum all active speeds.
        if (this.impulses.length > 0){
          let sum = 0;
          for (const imp of this.impulses) sum += Math.max(0, imp.speed);
          const dxImp = sum * deltaSec * this.direction;
          if (dxImp !== 0) this.player.moveX(dxImp);
          // decrement remaining and cull finished
          const dtMs = deltaSec * 1000;
          for (const imp of this.impulses) imp.remainingMs -= dtMs;
          this.impulses = this.impulses.filter(i => i.remainingMs > 0);
        }

        if (this.direction === 1 && this.reachedRight()){
          this.handleEdgeArrival(-1, () => this.player.snapRight(this.gameEl.offsetWidth));
        } else if (this.direction === -1 && this.reachedLeft()){
          this.handleEdgeArrival(1, () => this.player.setX(Jamble.Settings.current.playerStartOffset));
        }
      }

      // Vertical physics and dash timer
      this.player.update(dt60);
      this.player.updateDash(deltaSec * 1000);

      // Skills tick + land detection
      const grounded = this.player.jumpHeight === 0 && !this.player.isJumping;
      const sctx: SkillContext = {
        nowMs: performance.now(),
        grounded,
        velocityY: this.player.velocity,
        isDashing: this.player.isDashing,
        jumpHeight: this.player.jumpHeight,
        dashAvailable: !this.player.isDashing
      };
      this.skills.tick(sctx);
      if (!this.wasGrounded && grounded){
        this.skills.onLand(sctx);
        // fire simple onLand callbacks registered via caps
        const cbs = this.landCbs.slice(); this.landCbs.length = 0; cbs.forEach(cb => { try { cb(); } catch(_e){} });
      }
      this.wasGrounded = grounded;

      // If we reached a side while airborne, wait to grant start until grounded
      if (Jamble.Settings.current.mode === 'idle' && this.waitGroundForStart && this.player.jumpHeight === 0 && !this.player.isJumping){
        this.waitGroundForStart = false;
        this.awaitingStartTap = true;
        this.showIdleControls();
      }

      // Collision: wiggle + freeze; show reset button, no auto reset
      const hitElement = this.levelElements.someCollidable(el => this.collisionWith(el));
      if (!this.player.frozenStart && !this.player.frozenDeath && hitElement){
        this.player.setFrozenDeath();
        if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
        if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
        this.wiggle.start(this.player.x);
        this.deathWiggleTimer = window.setTimeout(() => {
          this.wiggle.stop();
          this.player.el.style.left = this.player.x + 'px';
          this.deathWiggleTimer = null;
        }, Jamble.Settings.current.deathFreezeTime);
        this.showResetTimer = window.setTimeout(() => {
          this.resetBtn.style.display = 'block';
          this.showResetTimer = null;
        }, Jamble.Settings.current.showResetDelayMs);
      }

      this.rafId = window.requestAnimationFrame(this.loop);
    }
  }
}
