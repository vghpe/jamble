"use strict";
var Jamble;
(function (Jamble) {
    Jamble.Const = {
        JUMP_STRENGTH: 7,
        GRAVITY_UP: 0.32,
        GRAVITY_MID: 0.4,
        GRAVITY_DOWN: 0.65,
        PLAYER_SPEED: 130,
        DASH_SPEED: 280,
        DASH_DURATION_MS: 220,
        START_FREEZE_TIME: 3000,
        DEATH_FREEZE_TIME: 500,
        SHOW_RESET_DELAY_MS: 150,
        PLAYER_START_OFFSET: 10,
        DEATH_WIGGLE_DISTANCE: 1
    };
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Countdown {
        constructor(el) {
            this.timeout = null;
            this.steps = 0;
            this.stepMs = 0;
            this.el = el;
        }
        start(totalMs) {
            this.steps = Math.max(2, Math.ceil(totalMs / 1000));
            this.stepMs = totalMs / this.steps;
            this.el.style.display = 'block';
            this.tick(this.steps);
        }
        tick(num) {
            this.el.textContent = String(num);
            this.el.style.animationDuration = this.stepMs + 'ms';
            this.el.classList.remove('jamble-animate');
            void this.el.offsetWidth;
            this.el.classList.add('jamble-animate');
            if (this.timeout !== null)
                window.clearTimeout(this.timeout);
            this.timeout = window.setTimeout(() => {
                const next = num - 1;
                if (next >= 1)
                    this.tick(next);
                else
                    this.hide();
            }, this.stepMs);
        }
        hide() {
            if (this.timeout !== null)
                window.clearTimeout(this.timeout);
            this.timeout = null;
            this.el.style.display = 'none';
            this.el.classList.remove('jamble-animate');
        }
        updatePosition(x, y) {
            if (this.el.style.display !== 'block')
                return;
            this.el.style.left = x + 'px';
            this.el.style.bottom = y + 'px';
        }
    }
    Jamble.Countdown = Countdown;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Obstacle {
        constructor(el) { this.el = el; }
        rect() { return this.el.getBoundingClientRect(); }
    }
    Jamble.Obstacle = Obstacle;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Wiggle {
        constructor(playerEl) {
            this.interval = null;
            this.playerEl = playerEl;
        }
        start(x) {
            let direction = 1;
            this.stop();
            this.interval = window.setInterval(() => {
                this.playerEl.style.left = (x + direction * Jamble.Const.DEATH_WIGGLE_DISTANCE) + 'px';
                direction *= -1;
            }, 100);
        }
        stop() { if (this.interval !== null) {
            window.clearInterval(this.interval);
            this.interval = null;
        } }
    }
    Jamble.Wiggle = Wiggle;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Player {
        constructor(el) {
            this.isJumping = false;
            this.jumpHeight = 0;
            this.velocity = 0;
            this.x = Jamble.Const.PLAYER_START_OFFSET;
            this.won = false;
            this.frozenStart = true;
            this.frozenDeath = false;
            this.isDashing = false;
            this.dashRemainingMs = 0;
            this.dashAvailable = true;
            this.el = el;
            this.reset();
        }
        reset() {
            this.isJumping = false;
            this.jumpHeight = 0;
            this.velocity = 0;
            this.x = Jamble.Const.PLAYER_START_OFFSET;
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
        setNormal() { this.el.className = 'jamble-player jamble-normal'; }
        setFrozenStart() { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-idle'; }
        setPrestart() { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-prestart'; }
        clearFrozenStart() { this.frozenStart = false; this.setNormal(); }
        setFrozenDeath() { this.frozenDeath = true; this.el.className = 'jamble-player jamble-frozen-death'; }
        idle() {
            this.isJumping = false;
            this.endDash();
            this.velocity = 0;
            this.jumpHeight = 0;
            this.el.style.bottom = '0px';
            this.el.style.transform = 'scaleY(1) scaleX(1)';
            this.setFrozenStart();
        }
        getRight(_gameWidth) { return this.x + this.el.offsetWidth; }
        snapRight(gameWidth) {
            this.x = gameWidth - this.el.offsetWidth - Jamble.Const.PLAYER_START_OFFSET;
            this.el.style.left = this.x + 'px';
        }
        jump() {
            if (this.isJumping || this.frozenDeath)
                return;
            this.isJumping = true;
            this.velocity = Jamble.Const.JUMP_STRENGTH;
        }
        startDash() {
            if (this.frozenStart || this.frozenDeath || !this.isJumping)
                return false;
            if (this.isDashing || !this.dashAvailable)
                return false;
            this.isDashing = true;
            this.dashRemainingMs = Jamble.Const.DASH_DURATION_MS;
            this.dashAvailable = false;
            this.el.classList.add('jamble-dashing');
            return true;
        }
        updateDash(deltaMs) {
            if (!this.isDashing)
                return;
            this.dashRemainingMs -= deltaMs;
            if (this.dashRemainingMs <= 0)
                this.endDash();
        }
        endDash() {
            if (!this.isDashing)
                return;
            this.isDashing = false;
            this.dashRemainingMs = 0;
            if (this.velocity > 0)
                this.velocity = -0.1;
            this.el.classList.remove('jamble-dashing');
        }
        update(dt60) {
            if (this.isDashing)
                return;
            if (!this.frozenDeath && this.isJumping) {
                this.jumpHeight += this.velocity * dt60;
                if (this.velocity > 2)
                    this.velocity -= Jamble.Const.GRAVITY_UP * dt60;
                else if (this.velocity > -2)
                    this.velocity -= Jamble.Const.GRAVITY_MID * dt60;
                else
                    this.velocity -= Jamble.Const.GRAVITY_DOWN * dt60;
                if (this.jumpHeight <= 0) {
                    this.jumpHeight = 0;
                    this.isJumping = false;
                    this.endDash();
                    this.dashAvailable = true;
                    this.el.style.transform = 'scaleY(0.6) scaleX(1.4)';
                    window.setTimeout(() => { this.el.style.transform = 'scaleY(1) scaleX(1)'; }, 150);
                }
                else {
                    const v = Math.max(0, this.velocity);
                    const stretch = 1 + v * 0.05;
                    const squash = 1 - v * 0.02;
                    this.el.style.transform = 'scaleY(' + stretch + ') scaleX(' + squash + ')';
                }
                this.el.style.bottom = this.jumpHeight + 'px';
            }
        }
        moveX(dx) { this.x += dx; this.el.style.left = this.x + 'px'; }
        setX(x) { this.x = x; this.el.style.left = this.x + 'px'; }
    }
    Jamble.Player = Player;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Game {
        constructor(root) {
            this.lastTime = null;
            this.rafId = null;
            this.awaitingStartTap = false;
            this.startCountdownTimer = null;
            this.direction = 1;
            this.level = 0;
            this.levelEl = null;
            this.deathWiggleTimer = null;
            this.showResetTimer = null;
            this.waitGroundForStart = false;
            this.root = root;
            const gameEl = root.querySelector('.jamble-game');
            const playerEl = root.querySelector('.jamble-player');
            const t1 = root.querySelector('.jamble-tree[data-tree="1"]');
            const t2 = root.querySelector('.jamble-tree[data-tree="2"]');
            const cdEl = root.querySelector('.jamble-countdown');
            const resetBtn = root.querySelector('.jamble-reset');
            const messageEl = root.querySelector('.jamble-message');
            const levelEl = root.querySelector('.jamble-level');
            if (!gameEl || !playerEl || !t1 || !t2 || !cdEl || !resetBtn) {
                throw new Error('Jamble: missing required elements');
            }
            this.gameEl = gameEl;
            this.player = new Jamble.Player(playerEl);
            this.tree1 = new Jamble.Obstacle(t1);
            this.tree2 = new Jamble.Obstacle(t2);
            this.countdown = new Jamble.Countdown(cdEl);
            this.resetBtn = resetBtn;
            this.messageEl = messageEl;
            this.levelEl = levelEl;
            this.wiggle = new Jamble.Wiggle(this.player.el);
            this.onPointerDown = this.onPointerDown.bind(this);
            this.loop = this.loop.bind(this);
        }
        start() {
            this.bind();
            this.reset();
            this.rafId = window.requestAnimationFrame(this.loop);
        }
        stop() {
            this.unbind();
            if (this.rafId !== null)
                window.cancelAnimationFrame(this.rafId);
            this.rafId = null;
            this.wiggle.stop();
            this.countdown.hide();
        }
        reset() {
            this.wiggle.stop();
            this.countdown.hide();
            if (this.startCountdownTimer !== null) {
                window.clearTimeout(this.startCountdownTimer);
                this.startCountdownTimer = null;
            }
            if (this.deathWiggleTimer !== null) {
                window.clearTimeout(this.deathWiggleTimer);
                this.deathWiggleTimer = null;
            }
            if (this.showResetTimer !== null) {
                window.clearTimeout(this.showResetTimer);
                this.showResetTimer = null;
            }
            this.player.reset();
            this.resetBtn.style.display = 'none';
            if (this.messageEl)
                this.messageEl.textContent = 'Tap to jump';
            this.player.setFrozenStart();
            this.awaitingStartTap = true;
            this.waitGroundForStart = false;
            this.direction = 1;
            this.level = 0;
            this.updateLevel();
        }
        bind() {
            document.addEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.addEventListener('click', () => this.reset());
        }
        unbind() {
            document.removeEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.removeEventListener('click', () => this.reset());
        }
        onPointerDown(e) {
            if (e.target === this.resetBtn)
                return;
            if (this.player.frozenDeath)
                return;
            const rect = this.gameEl.getBoundingClientRect();
            const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
            const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
            if (withinX && withinY) {
                if (this.awaitingStartTap) {
                    this.awaitingStartTap = false;
                    this.player.setPrestart();
                    this.countdown.start(Jamble.Const.START_FREEZE_TIME);
                    this.startCountdownTimer = window.setTimeout(() => {
                        this.player.clearFrozenStart();
                        this.startCountdownTimer = null;
                    }, Jamble.Const.START_FREEZE_TIME);
                    return;
                }
                if (!this.player.frozenStart && this.player.isJumping) {
                    const dashed = this.player.startDash();
                    if (!dashed)
                        this.player.jump();
                }
                else if (!this.player.frozenStart) {
                    this.player.jump();
                }
                else if (!this.waitGroundForStart) {
                    this.player.jump();
                }
            }
        }
        updateLevel() {
            if (this.levelEl)
                this.levelEl.textContent = String(this.level);
        }
        collisionWith(ob) {
            const pr = this.player.el.getBoundingClientRect();
            const tr = ob.rect();
            return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top;
        }
        reachedRight() {
            const rightLimit = this.gameEl.offsetWidth - Jamble.Const.PLAYER_START_OFFSET;
            return this.player.getRight(this.gameEl.offsetWidth) >= rightLimit;
        }
        reachedLeft() { return this.player.x <= Jamble.Const.PLAYER_START_OFFSET; }
        loop(ts) {
            if (this.lastTime === null)
                this.lastTime = ts;
            const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
            const dt60 = deltaSec * 60;
            this.lastTime = ts;
            const cx = this.player.x + this.player.el.offsetWidth / 2;
            const cy = this.player.jumpHeight + this.player.el.offsetHeight + 10;
            this.countdown.updatePosition(cx, cy);
            if (!this.player.frozenStart && !this.player.frozenDeath) {
                const speed = Jamble.Const.PLAYER_SPEED + (this.player.isDashing ? Jamble.Const.DASH_SPEED : 0);
                const dx = speed * deltaSec * this.direction;
                this.player.moveX(dx);
                if (this.direction === 1 && this.reachedRight()) {
                    this.player.snapRight(this.gameEl.offsetWidth);
                    this.level += 1;
                    this.updateLevel();
                    this.player.setFrozenStart();
                    if (this.player.velocity > 0)
                        this.player.velocity = -0.1;
                    this.waitGroundForStart = true;
                    this.awaitingStartTap = false;
                    this.direction = -1;
                }
                else if (this.direction === -1 && this.reachedLeft()) {
                    this.player.setX(Jamble.Const.PLAYER_START_OFFSET);
                    this.level += 1;
                    this.updateLevel();
                    this.player.setFrozenStart();
                    if (this.player.velocity > 0)
                        this.player.velocity = -0.1;
                    this.waitGroundForStart = true;
                    this.awaitingStartTap = false;
                    this.direction = 1;
                }
            }
            this.player.update(dt60);
            this.player.updateDash(deltaSec * 1000);
            if (this.waitGroundForStart && this.player.jumpHeight === 0 && !this.player.isJumping) {
                this.waitGroundForStart = false;
                this.awaitingStartTap = true;
            }
            if (!this.player.frozenStart && !this.player.frozenDeath && (this.collisionWith(this.tree1) || this.collisionWith(this.tree2))) {
                this.player.setFrozenDeath();
                if (this.deathWiggleTimer !== null) {
                    window.clearTimeout(this.deathWiggleTimer);
                    this.deathWiggleTimer = null;
                }
                if (this.showResetTimer !== null) {
                    window.clearTimeout(this.showResetTimer);
                    this.showResetTimer = null;
                }
                this.wiggle.start(this.player.x);
                this.deathWiggleTimer = window.setTimeout(() => {
                    this.wiggle.stop();
                    this.player.el.style.left = this.player.x + 'px';
                    this.deathWiggleTimer = null;
                }, Jamble.Const.DEATH_FREEZE_TIME);
                this.showResetTimer = window.setTimeout(() => {
                    this.resetBtn.style.display = 'block';
                    this.showResetTimer = null;
                }, Jamble.Const.SHOW_RESET_DELAY_MS);
            }
            this.rafId = window.requestAnimationFrame(this.loop);
        }
    }
    Jamble.Game = Game;
})(Jamble || (Jamble = {}));
(function () {
    window.Jamble = { Game: Jamble.Game };
})();
