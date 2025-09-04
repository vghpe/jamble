"use strict";
(function () {
    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }
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
    class Player {
        constructor(el) {
            this.isJumping = false;
            this.jumpHeight = 0;
            this.velocity = 0;
            this.x = Const.PLAYER_START_OFFSET;
            this.won = false;
            this.frozenStart = true;
            this.frozenDeath = false;
            this.el = el;
            this.reset();
        }
        reset() {
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
        setNormal() { this.el.className = 'jamble-player jamble-normal'; }
        setFrozenStart() { this.frozenStart = true; this.el.className = 'jamble-player jamble-frozen-start'; }
        clearFrozenStart() { this.frozenStart = false; this.setNormal(); }
        setFrozenDeath() { this.frozenDeath = true; this.el.className = 'jamble-player jamble-frozen-death'; }
        getRight(_gameWidth) { return this.x + this.el.offsetWidth; }
        snapRight(gameWidth) { this.x = gameWidth - this.el.offsetWidth; this.el.style.left = this.x + 'px'; }
        jump() {
            if (this.isJumping || this.frozenDeath)
                return;
            this.isJumping = true;
            this.velocity = Const.JUMP_STRENGTH;
        }
        update(dt60) {
            if (!this.frozenDeath && this.isJumping) {
                this.jumpHeight += this.velocity * dt60;
                if (this.velocity > 2)
                    this.velocity -= Const.GRAVITY_UP * dt60;
                else if (this.velocity > -2)
                    this.velocity -= Const.GRAVITY_MID * dt60;
                else
                    this.velocity -= Const.GRAVITY_DOWN * dt60;
                if (this.jumpHeight <= 0) {
                    this.jumpHeight = 0;
                    this.isJumping = false;
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
    class Obstacle {
        constructor(el) { this.el = el; }
        rect() { return this.el.getBoundingClientRect(); }
    }
    class Wiggle {
        constructor(playerEl) {
            this.interval = null;
            this.playerEl = playerEl;
        }
        start(x) {
            let direction = 1;
            this.stop();
            this.interval = window.setInterval(() => {
                this.playerEl.style.left = (x + direction * Const.DEATH_WIGGLE_DISTANCE) + 'px';
                direction *= -1;
            }, 100);
        }
        stop() { if (this.interval !== null) {
            window.clearInterval(this.interval);
            this.interval = null;
        } }
    }
    class Game {
        constructor(root) {
            this.lastTime = null;
            this.rafId = null;
            this.root = root;
            const gameEl = root.querySelector('.jamble-game');
            const playerEl = root.querySelector('.jamble-player');
            const t1 = root.querySelector('.jamble-tree[data-tree="1"]');
            const t2 = root.querySelector('.jamble-tree[data-tree="2"]');
            const cdEl = root.querySelector('.jamble-countdown');
            const resetBtn = root.querySelector('.jamble-reset');
            const messageEl = root.querySelector('.jamble-message');
            if (!gameEl || !playerEl || !t1 || !t2 || !cdEl || !resetBtn) {
                throw new Error('Jamble: missing required elements');
            }
            this.gameEl = gameEl;
            this.player = new Player(playerEl);
            this.tree1 = new Obstacle(t1);
            this.tree2 = new Obstacle(t2);
            this.countdown = new Countdown(cdEl);
            this.resetBtn = resetBtn;
            this.messageEl = messageEl;
            this.wiggle = new Wiggle(this.player.el);
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
            this.player.reset();
            this.resetBtn.style.display = 'none';
            if (this.messageEl)
                this.messageEl.textContent = 'Tap to jump';
            this.player.setFrozenStart();
            this.countdown.start(Const.START_FREEZE_TIME);
            window.setTimeout(() => this.player.clearFrozenStart(), Const.START_FREEZE_TIME);
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
            if (this.player.won || e.target === this.resetBtn)
                return;
            const rect = this.gameEl.getBoundingClientRect();
            const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
            const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
            if (withinX && withinY)
                this.player.jump();
        }
        collisionWith(ob) {
            const pr = this.player.el.getBoundingClientRect();
            const tr = ob.rect();
            return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top;
        }
        reachedRight() {
            return this.player.getRight(this.gameEl.offsetWidth) >= this.gameEl.offsetWidth;
        }
        loop(ts) {
            if (this.lastTime === null)
                this.lastTime = ts;
            const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
            const dt60 = deltaSec * 60;
            this.lastTime = ts;
            const cx = this.player.x + this.player.el.offsetWidth / 2;
            const cy = this.player.jumpHeight + this.player.el.offsetHeight + 10;
            this.countdown.updatePosition(cx, cy);
            if (!this.player.won) {
                if (!this.player.frozenStart && !this.player.frozenDeath) {
                    this.player.moveX(Const.PLAYER_SPEED * deltaSec);
                    if (this.reachedRight()) {
                        this.player.snapRight(this.gameEl.offsetWidth);
                        this.player.won = true;
                        this.resetBtn.style.display = 'block';
                    }
                }
                this.player.update(dt60);
                if (!this.player.frozenStart && !this.player.frozenDeath && (this.collisionWith(this.tree1) || this.collisionWith(this.tree2))) {
                    this.player.setFrozenDeath();
                    this.wiggle.start(this.player.x);
                    window.setTimeout(() => this.reset(), Const.DEATH_FREEZE_TIME);
                }
            }
            this.rafId = window.requestAnimationFrame(this.loop);
        }
    }
    window.Jamble = { Game };
})();
