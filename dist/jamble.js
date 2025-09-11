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
        DEATH_WIGGLE_DISTANCE: 1,
        TREE_EDGE_MARGIN_PCT: 10,
        TREE_MIN_GAP_PCT: 20
    };
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    const embeddedDefaults = {
        jumpStrength: 7,
        gravityUp: 0.32,
        gravityMid: 0.4,
        gravityDown: 0.65,
        playerSpeed: 130,
        dashSpeed: 280,
        dashDurationMs: 220,
        startFreezeTime: 3000,
        deathFreezeTime: 500,
        showResetDelayMs: 150,
        playerStartOffset: 10,
        deathWiggleDistance: 1,
        treeEdgeMarginPct: 10,
        treeMinGapPct: 20,
        mode: 'idle',
        squashEnabled: true,
        stretchFactor: 0.05,
        squashFactor: 0.02,
        landSquashDurationMs: 150,
    };
    class SettingsStore {
        constructor(initial) {
            this._loadedFrom = null;
            this._current = { ...embeddedDefaults, ...(initial !== null && initial !== void 0 ? initial : {}) };
        }
        get current() { return this._current; }
        get source() { return this._loadedFrom; }
        update(patch) {
            this._current = { ...this._current, ...patch };
        }
        reset() { this._current = { ...embeddedDefaults }; }
        async loadFrom(url) {
            try {
                const res = await fetch(url, { cache: 'no-cache' });
                if (!res.ok)
                    throw new Error('HTTP ' + res.status);
                const data = await res.json();
                this._current = { ...embeddedDefaults, ...data };
                this._loadedFrom = url;
            }
            catch (_err) {
                this._current = { ...embeddedDefaults };
                this._loadedFrom = null;
            }
        }
        toJSON() { return { ...this._current }; }
    }
    Jamble.SettingsStore = SettingsStore;
    Jamble.Settings = new SettingsStore();
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
            this.velocity = Jamble.Settings.current.jumpStrength;
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
                    if (Jamble.Settings.current.squashEnabled) {
                        this.el.style.transform = 'scaleY(0.6) scaleX(1.4)';
                        const dur = Math.max(0, Jamble.Settings.current.landSquashDurationMs);
                        window.setTimeout(() => { this.el.style.transform = 'scaleY(1) scaleX(1)'; }, dur);
                    }
                    else {
                        this.el.style.transform = 'scaleY(1) scaleX(1)';
                    }
                }
                else {
                    if (Jamble.Settings.current.squashEnabled) {
                        const v = Math.max(0, this.velocity);
                        const stretch = 1 + v * 0.05;
                        const squash = 1 - v * 0.02;
                        this.el.style.transform = 'scaleY(' + stretch + ') scaleX(' + squash + ')';
                    }
                    else {
                        this.el.style.transform = 'scaleY(1) scaleX(1)';
                    }
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
            this.inCountdown = false;
            this.root = root;
            const gameEl = root.querySelector('.jamble-game');
            const playerEl = root.querySelector('.jamble-player');
            const t1 = root.querySelector('.jamble-tree[data-tree="1"]');
            const t2 = root.querySelector('.jamble-tree[data-tree="2"]');
            const cdEl = root.querySelector('.jamble-countdown');
            const resetBtn = root.querySelector('.jamble-reset');
            const messageEl = null;
            const levelEl = root.querySelector('.jamble-level');
            const startBtn = root.querySelector('.jamble-start');
            const shuffleBtn = root.querySelector('.jamble-shuffle');
            if (!gameEl || !playerEl || !t1 || !t2 || !cdEl || !resetBtn || !startBtn || !shuffleBtn) {
                throw new Error('Jamble: missing required elements');
            }
            this.gameEl = gameEl;
            this.player = new Jamble.Player(playerEl);
            this.tree1 = new Jamble.Obstacle(t1);
            this.tree2 = new Jamble.Obstacle(t2);
            this.countdown = new Jamble.Countdown(cdEl);
            this.resetBtn = resetBtn;
            this.startBtn = startBtn;
            this.shuffleBtn = shuffleBtn;
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
            this.player.setFrozenStart();
            this.awaitingStartTap = true;
            this.waitGroundForStart = false;
            this.inCountdown = false;
            this.showIdleControls();
            this.direction = 1;
            this.level = 0;
            this.updateLevel();
        }
        onStartClick() {
            if (this.waitGroundForStart)
                return;
            if (!this.awaitingStartTap)
                return;
            this.awaitingStartTap = false;
            this.player.setPrestart();
            this.hideIdleControls();
            this.countdown.start(Jamble.Const.START_FREEZE_TIME);
            this.inCountdown = true;
            this.startCountdownTimer = window.setTimeout(() => {
                this.player.clearFrozenStart();
                this.inCountdown = false;
                this.startCountdownTimer = null;
            }, Jamble.Const.START_FREEZE_TIME);
        }
        onShuffleClick() {
            if (!this.awaitingStartTap || this.waitGroundForStart)
                return;
            this.shuffleTrees();
        }
        shuffleTrees() {
            const min = Jamble.Const.TREE_EDGE_MARGIN_PCT;
            const max = 100 - Jamble.Const.TREE_EDGE_MARGIN_PCT;
            const gap = Jamble.Const.TREE_MIN_GAP_PCT;
            const left1 = min + Math.random() * (max - min - gap);
            const left2 = left1 + gap + Math.random() * (max - (left1 + gap));
            this.tree1.el.style.left = left1.toFixed(1) + '%';
            this.tree2.el.style.left = left2.toFixed(1) + '%';
        }
        bind() {
            document.addEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.addEventListener('click', () => this.reset());
            this.startBtn.addEventListener('click', () => this.onStartClick());
            this.shuffleBtn.addEventListener('click', () => this.onShuffleClick());
        }
        unbind() {
            document.removeEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.removeEventListener('click', () => this.reset());
            this.startBtn.removeEventListener('click', () => this.onStartClick());
            this.shuffleBtn.removeEventListener('click', () => this.onShuffleClick());
        }
        showIdleControls() {
            this.startBtn.style.display = 'block';
            this.shuffleBtn.style.display = 'block';
        }
        hideIdleControls() {
            this.startBtn.style.display = 'none';
            this.shuffleBtn.style.display = 'none';
        }
        onPointerDown(e) {
            if (e.target === this.resetBtn || e.target === this.startBtn || e.target === this.shuffleBtn)
                return;
            if (this.player.frozenDeath)
                return;
            const rect = this.gameEl.getBoundingClientRect();
            const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
            const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
            if (withinX && withinY) {
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
            if (Jamble.Settings.current.mode === 'pingpong' && this.player.frozenStart && !this.inCountdown && !this.player.frozenDeath) {
                this.awaitingStartTap = false;
                this.waitGroundForStart = false;
                this.hideIdleControls();
                this.player.clearFrozenStart();
            }
            if (!this.player.frozenStart && !this.player.frozenDeath) {
                const base = Jamble.Settings.current.playerSpeed;
                const speed = base + (this.player.isDashing ? Jamble.Const.DASH_SPEED : 0);
                const dx = speed * deltaSec * this.direction;
                this.player.moveX(dx);
                if (this.direction === 1 && this.reachedRight()) {
                    this.player.snapRight(this.gameEl.offsetWidth);
                    this.level += 1;
                    this.updateLevel();
                    if (Jamble.Settings.current.mode === 'idle') {
                        this.player.setFrozenStart();
                        if (this.player.velocity > 0)
                            this.player.velocity = -0.1;
                        this.waitGroundForStart = true;
                        this.awaitingStartTap = false;
                    }
                    else {
                        if (this.player.velocity > 0)
                            this.player.velocity = -0.1;
                        this.awaitingStartTap = false;
                        this.waitGroundForStart = false;
                        this.hideIdleControls();
                    }
                    this.direction = -1;
                }
                else if (this.direction === -1 && this.reachedLeft()) {
                    this.player.setX(Jamble.Const.PLAYER_START_OFFSET);
                    this.level += 1;
                    this.updateLevel();
                    if (Jamble.Settings.current.mode === 'idle') {
                        this.player.setFrozenStart();
                        if (this.player.velocity > 0)
                            this.player.velocity = -0.1;
                        this.waitGroundForStart = true;
                        this.awaitingStartTap = false;
                    }
                    else {
                        if (this.player.velocity > 0)
                            this.player.velocity = -0.1;
                        this.awaitingStartTap = false;
                        this.waitGroundForStart = false;
                        this.hideIdleControls();
                    }
                    this.direction = 1;
                }
            }
            this.player.update(dt60);
            this.player.updateDash(deltaSec * 1000);
            if (Jamble.Settings.current.mode === 'idle' && this.waitGroundForStart && this.player.jumpHeight === 0 && !this.player.isJumping) {
                this.waitGroundForStart = false;
                this.awaitingStartTap = true;
                this.showIdleControls();
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
    window.Jamble = { Game: Jamble.Game, Settings: Jamble.Settings };
    var proto = (typeof location !== 'undefined' ? location.protocol : '');
    var isHttp = proto === 'http:' || proto === 'https:';
    if (isHttp) {
        Jamble.Settings.loadFrom('dist/profiles/default.json').finally(function () {
            try {
                window.dispatchEvent(new CustomEvent('jamble:settingsLoaded'));
            }
            catch (_e) { }
        });
    }
    else {
        Jamble.Settings.reset();
        try {
            window.dispatchEvent(new CustomEvent('jamble:settingsLoaded'));
        }
        catch (_e) { }
    }
})();
