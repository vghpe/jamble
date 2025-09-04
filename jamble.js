(function(){
  // Jamble: A class-based clone of the "Jump Over Tree" game.
  //
  // Structure
  // - Const: Tunable constants for physics and timings
  // - Countdown: Handles the frozen-start countdown animation and positioning
  // - Player: Manages player state, physics, and visuals (squash & stretch)
  // - Obstacle: Simple wrapper around a tree element for collision rects
  // - Wiggle: Death-animation shimmy before reset
  // - Game: Orchestrates input, loop, collisions, and reset/win states
  //
  // Usage (handled by the shortcode):
  //   const game = new Jamble.Game(document.getElementById('jamble'))
  //   game.start()

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  const Const = {
    JUMP_STRENGTH: 7,
    GRAVITY_UP: 0.32,
    GRAVITY_MID: 0.4,
    GRAVITY_DOWN: 0.65,
    PLAYER_SPEED: 130,
    START_FREEZE_TIME: 3000,
    DEATH_FREEZE_TIME: 500,
    PLAYER_START_OFFSET: 10,
    DEATH_WIGGLE_DISTANCE: 1
  };

  // Countdown: controls the numeric countdown that follows the player
  class Countdown {
    constructor(el){
      this.el = el;
      this.timeout = null;
      this.steps = 0;
      this.stepMs = 0;
    }
    // Start the countdown split into steps of roughly 1s.
    start(totalMs){
      this.steps = Math.max(2, Math.ceil(totalMs / 1000));
      this.stepMs = totalMs / this.steps;
      this.el.style.display = 'block';
      this._tick(this.steps);
    }
    // Internal: play one tick and schedule the next.
    _tick(num){
      this.el.textContent = String(num);
      this.el.style.animationDuration = this.stepMs + 'ms';
      this.el.classList.remove('jamble-animate');
      void this.el.offsetWidth;
      this.el.classList.add('jamble-animate');
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        const next = num - 1;
        if (next >= 1) this._tick(next);
        else this.hide();
      }, this.stepMs);
    }
    // Hide and stop animation/timeouts.
    hide(){
      clearTimeout(this.timeout);
      this.el.style.display = 'none';
      this.el.classList.remove('jamble-animate');
    }
    // Keep the countdown centered above the player.
    updatePosition(x, y){
      if (this.el.style.display !== 'block') return;
      this.el.style.left = x + 'px';
      this.el.style.bottom = y + 'px';
    }
  }

  // Player: physics + visuals; owns jump state and x/jumpHeight.
  class Player {
    constructor(el){
      this.el = el;
      this.reset();
    }
    // Reset state to initial spawn; frozenStart is set true by default.
    reset(){
      this.isJumping = false;
      this.jumpHeight = 0;
      this.velocity = 0;
      this.x = Const.PLAYER_START_OFFSET;
      this.won = false;
      this.frozenStart = true;
      this.frozenDeath = false;
      this.el.style.left = this.x + 'px';
      this.el.style.bottom = this.jumpHeight + 'px';
      this.el.style.transform = 'scaleY(1) scaleX(1)';
      this.el.className = 'jamble-player jamble-frozen-start';
    }
    // Visual state helpers
    setNormal(){ this.el.className = 'jamble-player jamble-normal'; }
    setFrozenStart(){ this.frozenStart = true; this.el.className = 'jamble-player jamble-frozen-start'; }
    clearFrozenStart(){ this.frozenStart = false; this.setNormal(); }
    setFrozenDeath(){ this.frozenDeath = true; this.el.className = 'jamble-player jamble-frozen-death'; }
    // Geometry helpers
    getRight(gameWidth){ return this.x + this.el.offsetWidth; }
    snapRight(gameWidth){ this.x = gameWidth - this.el.offsetWidth; this.el.style.left = this.x + 'px'; }
    // Begin a jump if allowed
    jump(){
      if (this.isJumping || this.frozenDeath) return;
      this.isJumping = true;
      this.velocity = Const.JUMP_STRENGTH;
    }
    // Update vertical motion and apply squash/stretch
    update(dt60){
      if (!this.frozenDeath && this.isJumping){
        this.jumpHeight += this.velocity * dt60;
        if (this.velocity > 2) this.velocity -= Const.GRAVITY_UP * dt60;
        else if (this.velocity > -2) this.velocity -= Const.GRAVITY_MID * dt60;
        else this.velocity -= Const.GRAVITY_DOWN * dt60;

        if (this.jumpHeight <= 0){
          this.jumpHeight = 0;
          this.isJumping = false;
          this.el.style.transform = 'scaleY(0.6) scaleX(1.4)';
          setTimeout(() => { this.el.style.transform = 'scaleY(1) scaleX(1)'; }, 150);
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
    moveX(dx){ this.x += dx; this.el.style.left = this.x + 'px'; }
    setX(x){ this.x = x; this.el.style.left = this.x + 'px'; }
  }

  // Obstacle: lightweight wrapper to fetch bounding rects for collisions.
  class Obstacle {
    constructor(el){ this.el = el; }
    rect(){ return this.el.getBoundingClientRect(); }
  }

  // Wiggle: small back-and-forth shimmy effect during death freeze.
  class Wiggle {
    constructor(playerEl){ this.playerEl = playerEl; this._interval = null; }
    start(x){
      let direction = 1;
      this.stop();
      this._interval = setInterval(() => {
        this.playerEl.style.left = (x + direction * Const.DEATH_WIGGLE_DISTANCE) + 'px';
        direction *= -1;
      }, 100);
    }
    stop(){ if (this._interval){ clearInterval(this._interval); this._interval = null; } }
  }

  // Game: main orchestrator (input, loop, collisions, reset/win state)
  class Game {
    constructor(root){
      this.root = root;
      this.gameEl = root.querySelector('.jamble-game');
      this.player = new Player(root.querySelector('.jamble-player'));
      this.tree1 = new Obstacle(root.querySelector('.jamble-tree[data-tree="1"]'));
      this.tree2 = new Obstacle(root.querySelector('.jamble-tree[data-tree="2"]'));
      this.countdown = new Countdown(root.querySelector('.jamble-countdown'));
      this.resetBtn = root.querySelector('.jamble-reset');
      this.messageEl = root.querySelector('.jamble-message');
      this.wiggle = new Wiggle(this.player.el);
      this.lastTime = null;
      this._raf = null;

      this._onPointerDown = this._onPointerDown.bind(this);
      this._loop = this._loop.bind(this);
    }

    // Start the game: bind events, reset state, begin RAF loop
    start(){
      this._bind();
      this.reset();
      this._raf = requestAnimationFrame(this._loop);
    }
    // Stop the game and clean up timers/listeners
    stop(){
      this._unbind();
      cancelAnimationFrame(this._raf);
      this.wiggle.stop();
      this.countdown.hide();
    }
    // Reset after death or when pressing the reset button
    reset(){
      this.wiggle.stop();
      this.countdown.hide();
      this.player.reset();
      this.resetBtn.style.display = 'none';
      if (this.messageEl) this.messageEl.textContent = 'Tap to jump';
      this.player.setFrozenStart();
      this.countdown.start(Const.START_FREEZE_TIME);
      setTimeout(() => this.player.clearFrozenStart(), Const.START_FREEZE_TIME);
    }

    // Event binding helpers
    _bind(){
      document.addEventListener('pointerdown', this._onPointerDown);
      this.resetBtn.addEventListener('click', () => this.reset());
    }
    _unbind(){
      document.removeEventListener('pointerdown', this._onPointerDown);
      this.resetBtn.removeEventListener('click', () => this.reset());
    }

    // Input: tap/click within an extended game area triggers jump
    _onPointerDown(e){
      if (this.player.won || e.target === this.resetBtn) return;
      const rect = this.gameEl.getBoundingClientRect();
      const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
      const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
      if (withinX && withinY) this.player.jump();
    }

    // AABB collision between player and an obstacle
    _collisionWith(ob){
      const pr = this.player.el.getBoundingClientRect();
      const tr = ob.rect();
      return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top;
    }

    _reachedRight(){ return this.player.getRight(this.gameEl.offsetWidth) >= this.gameEl.offsetWidth; }

    // Main RAF loop: move, apply physics, check collisions and win state
    _loop(ts){
      if (this.lastTime === null) this.lastTime = ts;
      const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
      const dt60 = deltaSec * 60;
      this.lastTime = ts;

      // Update countdown position near player
      const cx = this.player.x + this.player.el.offsetWidth / 2;
      const cy = this.player.jumpHeight + this.player.el.offsetHeight + 10;
      this.countdown.updatePosition(cx, cy);

      if (!this.player.won){
        if (!this.player.frozenStart && !this.player.frozenDeath){
          this.player.moveX(Const.PLAYER_SPEED * deltaSec);
          if (this._reachedRight()){
            this.player.snapRight(this.gameEl.offsetWidth);
            this.player.won = true;
            this.resetBtn.style.display = 'block';
          }
        }

        this.player.update(dt60);

        if (!this.player.frozenStart && !this.player.frozenDeath && (this._collisionWith(this.tree1) || this._collisionWith(this.tree2))){
          this.player.setFrozenDeath();
          this.wiggle.start(this.player.x);
          setTimeout(() => this.reset(), Const.DEATH_FREEZE_TIME);
        }
      }
      this._raf = requestAnimationFrame(this._loop);
    }
  }

  window.Jamble = { Game };
})();
