(function(){
  // Jamble: A class-based clone of the "Jump Over Tree" game in TypeScript.

  // Utility: clamp a value between min and max
  function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  // Tunable constants for physics and timings
  const Const = {
    JUMP_STRENGTH: 7,
    GRAVITY_UP: 0.32,
    GRAVITY_MID: 0.4,
    GRAVITY_DOWN: 0.65,
    PLAYER_SPEED: 130,
    // Dash tuning
    DASH_SPEED: 280,          // extra px/s while dashing
    DASH_DURATION_MS: 220,    // how long a dash lasts
    START_FREEZE_TIME: 3000,
    DEATH_FREEZE_TIME: 500,   // how long the wiggle runs
    SHOW_RESET_DELAY_MS: 150, // short beat before showing reset button
    PLAYER_START_OFFSET: 10,
    DEATH_WIGGLE_DISTANCE: 1
  } as const;

  // Countdown: controls the numeric countdown that follows the player
  class Countdown {
    private el: HTMLElement;
    private timeout: number | null = null;
    private steps = 0;
    private stepMs = 0;

    constructor(el: HTMLElement){
      this.el = el;
    }

    // Start the countdown split into steps of roughly 1s.
    start(totalMs: number): void {
      this.steps = Math.max(2, Math.ceil(totalMs / 1000));
      this.stepMs = totalMs / this.steps;
      this.el.style.display = 'block';
      this.tick(this.steps);
    }

    // Internal: play one tick and schedule the next.
    private tick(num: number): void {
      this.el.textContent = String(num);
      (this.el.style as CSSStyleDeclaration).animationDuration = this.stepMs + 'ms';
      this.el.classList.remove('jamble-animate');
      void this.el.offsetWidth; // restart animation
      this.el.classList.add('jamble-animate');
      if (this.timeout !== null) window.clearTimeout(this.timeout);
      this.timeout = window.setTimeout(() => {
        const next = num - 1;
        if (next >= 1) this.tick(next);
        else this.hide();
      }, this.stepMs);
    }

    // Hide and stop animation/timeouts.
    hide(): void {
      if (this.timeout !== null) window.clearTimeout(this.timeout);
      this.timeout = null;
      this.el.style.display = 'none';
      this.el.classList.remove('jamble-animate');
    }

    // Keep the countdown centered above the player.
    updatePosition(x: number, y: number): void {
      if (this.el.style.display !== 'block') return;
      this.el.style.left = x + 'px';
      this.el.style.bottom = y + 'px';
    }
  }

  // Player: physics + visuals; owns jump state and x/jumpHeight.
  class Player {
    public el: HTMLElement;
    public isJumping: boolean = false;
    public jumpHeight: number = 0;
    public velocity: number = 0;
    public x: number = Const.PLAYER_START_OFFSET;
    public won: boolean = false;
    public frozenStart: boolean = true;
    public frozenDeath: boolean = false;
    // Dash state
    public isDashing: boolean = false;
    private dashRemainingMs: number = 0;
    private dashAvailable: boolean = true;

    // Switch to idle state at current position
    idle(): void {
      this.isJumping = false;
      this.endDash();
      this.velocity = 0;
      this.jumpHeight = 0;
      this.el.style.bottom = '0px';
      this.el.style.transform = 'scaleY(1) scaleX(1)';
      this.setFrozenStart();
    }

    constructor(el: HTMLElement){
      this.el = el;
      this.reset();
    }

    // Reset state to initial spawn; frozenStart is set true by default.
    reset(): void {
      this.isJumping = false;
      this.jumpHeight = 0;
      this.velocity = 0;
      this.x = Const.PLAYER_START_OFFSET;
      this.won = false;
      this.frozenStart = true;
      this.frozenDeath = false;
      this.isDashing = false;
      this.dashRemainingMs = 0;
      this.dashAvailable = true;
      this.el.style.left = this.x + 'px';
      this.el.style.bottom = this.jumpHeight + 'px';
      this.el.style.transform = 'scaleY(1) scaleX(1)';
      this.el.className = 'jamble-player jamble-frozen-start';
    }

    // Visual state helpers
    setNormal(): void { this.el.className = 'jamble-player jamble-normal'; }
    setFrozenStart(): void { this.frozenStart = true; this.el.className = 'jamble-player jamble-frozen-start'; }
    clearFrozenStart(): void { this.frozenStart = false; this.setNormal(); }
    setFrozenDeath(): void { this.frozenDeath = true; this.el.className = 'jamble-player jamble-frozen-death'; }

    // Geometry helpers
    getRight(_gameWidth: number): number { return this.x + this.el.offsetWidth; }
    snapRight(gameWidth: number): void { this.x = gameWidth - this.el.offsetWidth; this.el.style.left = this.x + 'px'; }

    // Begin a jump if allowed
    jump(): void {
      if (this.isJumping || this.frozenDeath) return;
      this.isJumping = true;
      this.velocity = Const.JUMP_STRENGTH;
    }

    // Dash: launch horizontally for a brief time. Only mid-air and once per airtime.
    startDash(): boolean {
      if (this.frozenStart || this.frozenDeath || !this.isJumping) return false;
      if (this.isDashing || !this.dashAvailable) return false;
      this.isDashing = true;
      this.dashRemainingMs = Const.DASH_DURATION_MS;
      this.dashAvailable = false;
      this.el.classList.add('jamble-dashing');
      return true;
    }
    updateDash(deltaMs: number): void {
      if (!this.isDashing) return;
      this.dashRemainingMs -= deltaMs;
      if (this.dashRemainingMs <= 0) this.endDash();
    }
    endDash(): void {
      if (!this.isDashing) return;
      this.isDashing = false;
      this.dashRemainingMs = 0;
      this.el.classList.remove('jamble-dashing');
    }

    // Update vertical motion and apply squash/stretch
    update(dt60: number): void {
      // While dashing, freeze vertical motion (no gravity)
      if (this.isDashing) return;
      if (!this.frozenDeath && this.isJumping){
        this.jumpHeight += this.velocity * dt60;
        if (this.velocity > 2) this.velocity -= Const.GRAVITY_UP * dt60;
        else if (this.velocity > -2) this.velocity -= Const.GRAVITY_MID * dt60;
        else this.velocity -= Const.GRAVITY_DOWN * dt60;

        if (this.jumpHeight <= 0){
          this.jumpHeight = 0;
          this.isJumping = false;
          // Touching ground resets dash availability
          this.endDash();
          this.dashAvailable = true;
          this.el.style.transform = 'scaleY(0.6) scaleX(1.4)';
          window.setTimeout(() => { this.el.style.transform = 'scaleY(1) scaleX(1)'; }, 150);
        } else {
          const v = Math.max(0, this.velocity);
          const stretch = 1 + v * 0.05;
          const squash = 1 - v * 0.02;
          this.el.style.transform = 'scaleY(' + stretch + ') scaleX(' + squash + ')';
        }
        this.el.style.bottom = this.jumpHeight + 'px';
      }
    }

    // Horizontal movement helpers
    moveX(dx: number): void { this.x += dx; this.el.style.left = this.x + 'px'; }
    setX(x: number): void { this.x = x; this.el.style.left = this.x + 'px'; }
  }

  // Obstacle: lightweight wrapper to fetch bounding rects for collisions.
  class Obstacle {
    private el: HTMLElement;
    constructor(el: HTMLElement){ this.el = el; }
    rect(): DOMRect { return this.el.getBoundingClientRect(); }
  }

  // Wiggle: small back-and-forth shimmy effect during death freeze.
  class Wiggle {
    private playerEl: HTMLElement;
    private interval: number | null = null;
    constructor(playerEl: HTMLElement){ this.playerEl = playerEl; }
    start(x: number): void {
      let direction = 1;
      this.stop();
      this.interval = window.setInterval(() => {
        this.playerEl.style.left = (x + direction * Const.DEATH_WIGGLE_DISTANCE) + 'px';
        direction *= -1;
      }, 100);
    }
    stop(): void { if (this.interval !== null){ window.clearInterval(this.interval); this.interval = null; } }
  }

  // Game: main orchestrator (input, loop, collisions, reset/win state)
  class Game {
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

    // Start the game: bind events, reset state, begin RAF loop
    start(): void {
      this.bind();
      this.reset();
      this.rafId = window.requestAnimationFrame(this.loop);
    }

    // Stop the game and clean up timers/listeners
    stop(): void {
      this.unbind();
      if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.wiggle.stop();
      this.countdown.hide();
    }

    // Reset after death or when pressing the reset button
    reset(): void {
      this.wiggle.stop();
      this.countdown.hide();
      if (this.startCountdownTimer !== null) { window.clearTimeout(this.startCountdownTimer); this.startCountdownTimer = null; }
      if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
      if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
      this.player.reset();
      this.resetBtn.style.display = 'none';
      if (this.messageEl) this.messageEl.textContent = 'Tap to jump';
      // Idle: wait for first tap to begin countdown.
      this.player.setFrozenStart();
      this.awaitingStartTap = true;
      this.direction = 1;
      this.level = 0;
      this.updateLevel();
    }

    // Event binding helpers
    private bind(): void {
      document.addEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.addEventListener('click', () => this.reset());
    }
    private unbind(): void {
      document.removeEventListener('pointerdown', this.onPointerDown);
      this.resetBtn.removeEventListener('click', () => this.reset());
    }

    // Input: tap/click within an extended game area triggers jump
    private onPointerDown(e: PointerEvent): void {
      if (e.target === this.resetBtn) return;
      if (this.player.frozenDeath) return; // ignore taps while dead
      const rect = this.gameEl.getBoundingClientRect();
      const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
      const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
      if (withinX && withinY) {
        // First tap: start countdown, do not jump yet
        if (this.awaitingStartTap) {
          this.awaitingStartTap = false;
          this.countdown.start(Const.START_FREEZE_TIME);
          this.startCountdownTimer = window.setTimeout(() => {
            this.player.clearFrozenStart();
            this.startCountdownTimer = null;
          }, Const.START_FREEZE_TIME);
          return;
        }
        // If mid-air and not in start freeze, trigger dash; otherwise jump.
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

    private reachedLeft(): boolean {
      return this.player.x <= Const.PLAYER_START_OFFSET;
    }

    // AABB collision between player and an obstacle
    private collisionWith(ob: Obstacle): boolean {
      const pr = this.player.el.getBoundingClientRect();
      const tr = ob.rect();
      return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top;
    }

    private reachedRight(): boolean {
      return this.player.getRight(this.gameEl.offsetWidth) >= this.gameEl.offsetWidth;
    }

    // Main RAF loop: move, apply physics, check collisions and side reaches
    private loop(ts: number): void {
      if (this.lastTime === null) this.lastTime = ts;
      const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
      const dt60 = deltaSec * 60;
      this.lastTime = ts;

      // Update countdown position near player
      const cx = this.player.x + this.player.el.offsetWidth / 2;
      const cy = this.player.jumpHeight + this.player.el.offsetHeight + 10;
      this.countdown.updatePosition(cx, cy);

      // Horizontal movement phase (no movement while frozen/idle)
      if (!this.player.frozenStart && !this.player.frozenDeath){
        let speed = Const.PLAYER_SPEED + (this.player.isDashing ? Const.DASH_SPEED : 0);
        const dx = speed * deltaSec * this.direction;
        this.player.moveX(dx);

        // Handle reaching sides: enter idle, flip direction, and increment level
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

      // Vertical physics + dash timer
      this.player.update(dt60);
      this.player.updateDash(deltaSec * 1000);

      // Collisions: run wiggle, freeze in place, then show reset button (no auto reset)
      if (!this.player.frozenStart && !this.player.frozenDeath && (this.collisionWith(this.tree1) || this.collisionWith(this.tree2))){
        this.player.setFrozenDeath();
        // Start wiggle around current x; ensure old timers are cleared
        if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
        if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
        this.wiggle.start(this.player.x);
        // Stop wiggle after configured time and keep frozen
        this.deathWiggleTimer = window.setTimeout(() => {
          this.wiggle.stop();
          // Restore element left to canonical x to avoid drift
          this.player.el.style.left = this.player.x + 'px';
          this.deathWiggleTimer = null;
        }, Const.DEATH_FREEZE_TIME);
        // Reveal reset button after a short beat
        this.showResetTimer = window.setTimeout(() => {
          this.resetBtn.style.display = 'block';
          this.showResetTimer = null;
        }, Const.SHOW_RESET_DELAY_MS);
      }
      this.rafId = window.requestAnimationFrame(this.loop);
    }
  }

  // Expose Game on window for the shortcode bootstrap script
  (window as any).Jamble = { Game };
})();
