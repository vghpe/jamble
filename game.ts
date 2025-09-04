namespace Jamble {
  export class Game {
    private root: HTMLElement;
    private gameEl: HTMLDivElement;
    private player: Player;
    private tree1: Obstacle;
    private tree2: Obstacle;
    private countdown: Countdown;
    private resetBtn: HTMLButtonElement;
    private messageEl: HTMLElement | null;
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

    constructor(root: HTMLElement){
      this.root = root;
      const gameEl = root.querySelector('.jamble-game') as HTMLDivElement | null;
      const playerEl = root.querySelector('.jamble-player') as HTMLElement | null;
      const t1 = root.querySelector('.jamble-tree[data-tree="1"]') as HTMLElement | null;
      const t2 = root.querySelector('.jamble-tree[data-tree="2"]') as HTMLElement | null;
      const cdEl = root.querySelector('.jamble-countdown') as HTMLElement | null;
      const resetBtn = root.querySelector('.jamble-reset') as HTMLButtonElement | null;
      const messageEl = root.querySelector('.jamble-message') as HTMLElement | null;
      const levelEl = root.querySelector('.jamble-level') as HTMLElement | null;

      if (!gameEl || !playerEl || !t1 || !t2 || !cdEl || !resetBtn){
        throw new Error('Jamble: missing required elements');
      }

      this.gameEl = gameEl;
      this.player = new Player(playerEl);
      this.tree1 = new Obstacle(t1);
      this.tree2 = new Obstacle(t2);
      this.countdown = new Countdown(cdEl);
      this.resetBtn = resetBtn;
      this.messageEl = messageEl;
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
      if (this.messageEl) this.messageEl.textContent = 'Tap to jump';
      this.player.setFrozenStart();
      this.awaitingStartTap = true;
      this.direction = 1;
      this.level = 0;
      this.updateLevel();
    }

    private bind(): void {
      document.addEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.addEventListener('click', () => this.reset());
    }
    private unbind(): void {
      document.removeEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.removeEventListener('click', () => this.reset());
    }

    private onPointerDown(e: PointerEvent): void {
      if (e.target === this.resetBtn) return;
      if (this.player.frozenDeath) return;
      const rect = this.gameEl.getBoundingClientRect();
      const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
      const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
      if (withinX && withinY) {
        if (this.awaitingStartTap) {
          this.awaitingStartTap = false;
          this.player.setPrestart();
          this.countdown.start(Const.START_FREEZE_TIME);
          this.startCountdownTimer = window.setTimeout(() => {
            this.player.clearFrozenStart();
            this.startCountdownTimer = null;
          }, Const.START_FREEZE_TIME);
          return;
        }
        if (!this.player.frozenStart && this.player.isJumping) {
          const dashed = this.player.startDash();
          if (!dashed) this.player.jump();
        } else {
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
        const speed = Const.PLAYER_SPEED + (this.player.isDashing ? Const.DASH_SPEED : 0);
        const dx = speed * deltaSec * this.direction;
        this.player.moveX(dx);

        if (this.direction === 1 && this.reachedRight()){
          this.player.snapRight(this.gameEl.offsetWidth);
          this.level += 1; this.updateLevel();
          this.player.idle();
          this.awaitingStartTap = true;
          this.direction = -1;
        } else if (this.direction === -1 && this.reachedLeft()){
          this.player.setX(Const.PLAYER_START_OFFSET);
          this.level += 1; this.updateLevel();
          this.player.idle();
          this.awaitingStartTap = true;
          this.direction = 1;
        }
      }

      // Vertical physics and dash timer
      this.player.update(dt60);
      this.player.updateDash(deltaSec * 1000);

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
