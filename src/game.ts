/// <reference path="./constants.ts" />
/// <reference path="./player.ts" />
/// <reference path="./obstacle.ts" />
/// <reference path="./countdown.ts" />
/// <reference path="./wiggle.ts" />
namespace Jamble {
  export class Game {
    private root: HTMLElement;
    private gameEl: HTMLDivElement;
    private player: Player;
    private tree1: Obstacle;
    private tree2: Obstacle;
    private countdown: Countdown;
    private resetBtn: HTMLButtonElement;
    private startBtn: HTMLButtonElement;
    private shuffleBtn: HTMLButtonElement;
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

    constructor(root: HTMLElement){
      this.root = root;
      const gameEl = root.querySelector('.jamble-game') as HTMLDivElement | null;
      const playerEl = root.querySelector('.jamble-player') as HTMLElement | null;
      const t1 = root.querySelector('.jamble-tree[data-tree="1"]') as HTMLElement | null;
      const t2 = root.querySelector('.jamble-tree[data-tree="2"]') as HTMLElement | null;
      const cdEl = root.querySelector('.jamble-countdown') as HTMLElement | null;
      const resetBtn = root.querySelector('.jamble-reset') as HTMLButtonElement | null;
      const messageEl = null as unknown as HTMLElement | null;
      const levelEl = root.querySelector('.jamble-level') as HTMLElement | null;
      const startBtn = root.querySelector('.jamble-start') as HTMLButtonElement | null;
      const shuffleBtn = root.querySelector('.jamble-shuffle') as HTMLButtonElement | null;

      if (!gameEl || !playerEl || !t1 || !t2 || !cdEl || !resetBtn || !startBtn || !shuffleBtn){
        throw new Error('Jamble: missing required elements');
      }

      this.gameEl = gameEl;
      this.player = new Player(playerEl);
      this.tree1 = new Obstacle(t1);
      this.tree2 = new Obstacle(t2);
      this.countdown = new Countdown(cdEl);
      this.resetBtn = resetBtn;
      this.startBtn = startBtn;
      this.shuffleBtn = shuffleBtn;
      this.levelEl = levelEl;
      this.wiggle = new Wiggle(this.player.el);

      this.onPointerDown = this.onPointerDown.bind(this);
      this.loop = this.loop.bind(this);
    }

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
    }

    reset(): void {
      this.wiggle.stop();
      this.countdown.hide();
      if (this.startCountdownTimer !== null) { window.clearTimeout(this.startCountdownTimer); this.startCountdownTimer = null; }
      if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
      if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
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
      this.countdown.start(Const.START_FREEZE_TIME);
      this.inCountdown = true;
      this.startCountdownTimer = window.setTimeout(() => {
        this.player.clearFrozenStart();
        this.inCountdown = false;
        this.startCountdownTimer = null;
      }, Const.START_FREEZE_TIME);
    }

    private onShuffleClick(): void {
      if (!this.awaitingStartTap || this.waitGroundForStart) return;
      this.shuffleTrees();
    }

    private shuffleTrees(): void {
      const min = Const.TREE_EDGE_MARGIN_PCT;
      const max = 100 - Const.TREE_EDGE_MARGIN_PCT;
      const gap = Const.TREE_MIN_GAP_PCT;
      const left1 = min + Math.random() * (max - min - gap);
      const left2 = left1 + gap + Math.random() * (max - (left1 + gap));
      (this.tree1 as any).el.style.left = left1.toFixed(1) + '%';
      (this.tree2 as any).el.style.left = left2.toFixed(1) + '%';
    }

    private bind(): void {
      document.addEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.addEventListener('click', () => this.reset());
      this.startBtn.addEventListener('click', () => this.onStartClick());
      this.shuffleBtn.addEventListener('click', () => this.onShuffleClick());
    }
    private unbind(): void {
      document.removeEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.removeEventListener('click', () => this.reset());
      this.startBtn.removeEventListener('click', () => this.onStartClick());
      this.shuffleBtn.removeEventListener('click', () => this.onShuffleClick());
    }

    private showIdleControls(): void {
      this.startBtn.style.display = 'block';
      this.shuffleBtn.style.display = 'block';
    }
    private hideIdleControls(): void {
      this.startBtn.style.display = 'none';
      this.shuffleBtn.style.display = 'none';
    }

    private onPointerDown(e: PointerEvent): void {
      if (e.target === this.resetBtn || e.target === this.startBtn || e.target === this.shuffleBtn) return;
      if (this.player.frozenDeath) return;
      const rect = this.gameEl.getBoundingClientRect();
      const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
      const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
      if (withinX && withinY) {
        // Note: starting countdown happens via Start button only
        if (!this.player.frozenStart && this.player.isJumping) {
          const dashed = this.player.startDash();
          if (!dashed) this.player.jump();
        } else if (!this.player.frozenStart) {
          this.player.jump();
        } else if (!this.waitGroundForStart) {
          // Allow jumping during idle and countdown; buttons are filtered above
          this.player.jump();
        }
      }
    }

    private updateLevel(): void {
      if (this.levelEl) this.levelEl.textContent = String(this.level);
    }
    private collisionWith(ob: Obstacle): boolean {
      const pr = this.player.el.getBoundingClientRect();
      const tr = ob.rect();
      return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top;
    }
    private reachedRight(): boolean {
      // Consider a virtual wall offset from the right by PLAYER_START_OFFSET
      const rightLimit = this.gameEl.offsetWidth - Const.PLAYER_START_OFFSET;
      return this.player.getRight(this.gameEl.offsetWidth) >= rightLimit;
    }
    private reachedLeft(): boolean { return this.player.x <= Const.PLAYER_START_OFFSET; }

    private loop(ts: number): void {
      if (this.lastTime === null) this.lastTime = ts;
      const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
      const dt60 = deltaSec * 60;
      this.lastTime = ts;

      // Keep countdown position near player
      const cx = this.player.x + this.player.el.offsetWidth / 2;
      const cy = this.player.jumpHeight + this.player.el.offsetHeight + 10;
      this.countdown.updatePosition(cx, cy);

      // Horizontal movement when not frozen/dead
      if (!this.player.frozenStart && !this.player.frozenDeath){
        const base = Jamble.Settings.current.playerSpeed;
        const speed = base + (this.player.isDashing ? Const.DASH_SPEED : 0);
        const dx = speed * deltaSec * this.direction;
        this.player.moveX(dx);

        if (this.direction === 1 && this.reachedRight()){
          this.player.snapRight(this.gameEl.offsetWidth);
          this.level += 1; this.updateLevel();
          // Apply idle visuals, freeze horizontal movement
          this.player.setFrozenStart();
          // Ensure downward motion starts immediately
          if (this.player.velocity > 0) this.player.velocity = -0.1;
          // Wait until grounded before allowing start tap
          this.waitGroundForStart = true;
          this.awaitingStartTap = false;
          this.direction = -1;
        } else if (this.direction === -1 && this.reachedLeft()){
          this.player.setX(Const.PLAYER_START_OFFSET);
          this.level += 1; this.updateLevel();
          this.player.setFrozenStart();
          if (this.player.velocity > 0) this.player.velocity = -0.1;
          this.waitGroundForStart = true;
          this.awaitingStartTap = false;
          this.direction = 1;
        }
      }

      // Vertical physics and dash timer
      this.player.update(dt60);
      this.player.updateDash(deltaSec * 1000);

      // If we reached a side while airborne, wait to grant start until grounded
      if (this.waitGroundForStart && this.player.jumpHeight === 0 && !this.player.isJumping){
        this.waitGroundForStart = false;
        this.awaitingStartTap = true;
        this.showIdleControls();
      }

      // Collision: wiggle + freeze; show reset button, no auto reset
      if (!this.player.frozenStart && !this.player.frozenDeath && (this.collisionWith(this.tree1) || this.collisionWith(this.tree2))){
        this.player.setFrozenDeath();
        if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
        if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
        this.wiggle.start(this.player.x);
        this.deathWiggleTimer = window.setTimeout(() => {
          this.wiggle.stop();
          this.player.el.style.left = this.player.x + 'px';
          this.deathWiggleTimer = null;
        }, Const.DEATH_FREEZE_TIME);
        this.showResetTimer = window.setTimeout(() => {
          this.resetBtn.style.display = 'block';
          this.showResetTimer = null;
        }, Const.SHOW_RESET_DELAY_MS);
      }

      this.rafId = window.requestAnimationFrame(this.loop);
    }
  }
}
