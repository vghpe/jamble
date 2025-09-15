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
        landScaleY: 0.6,
        landScaleX: 1.4,
        airTransformSmoothingMs: 100,
        landEaseMs: 100,
    };
    class SettingsStore {
        constructor(initial) {
            this._loadedFrom = null;
            this._activeName = null;
            this._profileBaseline = null;
            this._skills = { loadout: { movement: ['jump', 'dash'], utility: [], ultimate: [] }, configs: {} };
            this._skillsBaseline = null;
            this._current = { ...embeddedDefaults, ...(initial !== null && initial !== void 0 ? initial : {}) };
        }
        get current() { return this._current; }
        get source() { return this._loadedFrom; }
        get activeName() { return this._activeName; }
        get skills() { return this._skills; }
        update(patch) {
            this._current = { ...this._current, ...patch };
        }
        reset() { this._current = { ...embeddedDefaults }; this._skills = { loadout: { movement: ['jump', 'dash'], utility: [], ultimate: [] }, configs: {} }; }
        markBaseline(name) {
            this._activeName = name;
            this._profileBaseline = { ...this._current };
            this._skillsBaseline = {
                loadout: {
                    movement: [...(this._skills.loadout.movement || [])],
                    utility: [...(this._skills.loadout.utility || [])],
                    ultimate: [...(this._skills.loadout.ultimate || [])],
                },
                configs: JSON.parse(JSON.stringify(this._skills.configs || {}))
            };
        }
        revertToProfile() {
            if (this._profileBaseline) {
                this._current = { ...this._profileBaseline };
            }
            if (this._skillsBaseline) {
                this._skills = {
                    loadout: {
                        movement: [...(this._skillsBaseline.loadout.movement || [])],
                        utility: [...(this._skillsBaseline.loadout.utility || [])],
                        ultimate: [...(this._skillsBaseline.loadout.ultimate || [])],
                    },
                    configs: JSON.parse(JSON.stringify(this._skillsBaseline.configs || {}))
                };
            }
        }
        async loadFrom(url) {
            var _a, _b;
            try {
                const res = await fetch(url, { cache: 'no-cache' });
                if (!res.ok)
                    throw new Error('HTTP ' + res.status);
                const data = await res.json();
                const skills = (data && data.skills) || null;
                this._current = { ...embeddedDefaults, ...(data && data.game ? data.game : data) };
                if (skills && skills.loadout && skills.configs) {
                    this._skills = { loadout: skills.loadout, configs: skills.configs };
                }
                else {
                    this._skills = { loadout: { movement: ['jump', 'dash'], utility: [], ultimate: [] }, configs: {
                            jump: { strength: this._current.jumpStrength },
                            dash: { speed: (_a = this._current.dashSpeed) !== null && _a !== void 0 ? _a : 280, durationMs: (_b = this._current.dashDurationMs) !== null && _b !== void 0 ? _b : 220, cooldownMs: 150 }
                        } };
                }
                this._loadedFrom = url;
                try {
                    const u = new URL(url, (typeof location !== 'undefined' ? location.href : undefined));
                    const parts = u.pathname.split('/');
                    this._activeName = parts[parts.length - 1] || url;
                }
                catch (_e) {
                    this._activeName = url;
                }
                this._profileBaseline = { ...this._current };
            }
            catch (_err) {
                this._current = { ...embeddedDefaults };
                this._loadedFrom = null;
                this._activeName = null;
                this._profileBaseline = { ...this._current };
                this._skills = { loadout: { movement: ['jump', 'dash'], utility: [], ultimate: [] }, configs: { jump: { strength: this._current.jumpStrength }, dash: { speed: 280, durationMs: 220, cooldownMs: 150 } } };
            }
        }
        toJSON() {
            return {
                ...this._current,
                game: { ...this._current },
                skills: { loadout: this._skills.loadout, configs: this._skills.configs }
            };
        }
    }
    Jamble.SettingsStore = SettingsStore;
    Jamble.Settings = new SettingsStore();
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    let InputIntent;
    (function (InputIntent) {
        InputIntent["Tap"] = "tap";
        InputIntent["HoldStart"] = "hold_start";
        InputIntent["HoldEnd"] = "hold_end";
        InputIntent["DoubleTap"] = "double_tap";
        InputIntent["AirTap"] = "air_tap";
    })(InputIntent = Jamble.InputIntent || (Jamble.InputIntent = {}));
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class CooldownTimer {
        constructor(durationMs) {
            this.readyAt = 0;
            this.durationMs = Math.max(0, durationMs);
        }
        reset() { this.readyAt = 0; }
        isReady(nowMs) { return nowMs >= this.readyAt; }
        tryConsume(nowMs) {
            if (!this.isReady(nowMs))
                return false;
            this.readyAt = nowMs + this.durationMs;
            return true;
        }
    }
    Jamble.CooldownTimer = CooldownTimer;
    class ChargesPool {
        constructor(options) {
            var _a;
            this.lastUseMs = 0;
            this.max = Math.max(0, options.max);
            this.regenMs = Math.max(0, options.regenMs);
            this.charges = Math.min(this.max, Math.max(0, (_a = options.initial) !== null && _a !== void 0 ? _a : this.max));
        }
        get count() { return this.charges; }
        tryUse(nowMs) {
            this.tick(nowMs);
            if (this.charges <= 0)
                return false;
            this.charges -= 1;
            this.lastUseMs = nowMs;
            return true;
        }
        tick(nowMs) {
            if (this.charges >= this.max || this.regenMs <= 0)
                return;
            const elapsed = nowMs - this.lastUseMs;
            if (elapsed <= 0)
                return;
            const gained = Math.floor(elapsed / this.regenMs);
            if (gained > 0) {
                this.charges = Math.min(this.max, this.charges + gained);
                this.lastUseMs += gained * this.regenMs;
            }
        }
        refillAll() { this.charges = this.max; this.lastUseMs = 0; }
    }
    Jamble.ChargesPool = ChargesPool;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class SkillManager {
        constructor(caps, limits) {
            this.registry = new Map();
            this.equipped = new Map();
            this.slotCounts = new Map();
            this.lastError = null;
            this.configs = new Map();
            this.caps = caps;
            this.slotLimits = { movement: 2, utility: 2, ultimate: 1, ...(limits || {}) };
        }
        register(desc) { this.registry.set(desc.id, desc); }
        getAvailable() { return Array.from(this.registry.values()); }
        getEquipped() { return Array.from(this.equipped.values()); }
        isEquipped(id) { return this.equipped.has(id); }
        countInSlot(slot) {
            let n = 0;
            for (const s of this.equipped.values())
                if (s.slot === slot)
                    n++;
            return n;
        }
        canEquip(desc) {
            var _a;
            const cap = (_a = this.slotLimits[desc.slot]) !== null && _a !== void 0 ? _a : 0;
            if (this.countInSlot(desc.slot) >= cap) {
                this.lastError = `No free ${desc.slot} slots`;
                return false;
            }
            if (desc.prerequisites && desc.prerequisites.some(id => !this.equipped.has(id))) {
                this.lastError = `Missing prerequisites for ${desc.id}`;
                return false;
            }
            if (desc.excludes && desc.excludes.some(id => this.equipped.has(id))) {
                this.lastError = `Cannot equip ${desc.id} with excluded skill present`;
                return false;
            }
            this.lastError = null;
            return true;
        }
        equip(id) {
            var _a, _b;
            const desc = this.registry.get(id);
            if (!desc) {
                this.lastError = `Unknown skill ${id}`;
                return false;
            }
            if (this.equipped.has(id))
                return true;
            if (!this.canEquip(desc))
                return false;
            const cfg = (_b = (_a = this.configs.get(id)) !== null && _a !== void 0 ? _a : desc.defaults) !== null && _b !== void 0 ? _b : {};
            const inst = desc.create(cfg);
            try {
                inst.onEquip && inst.onEquip(this.caps, cfg);
            }
            catch (_) { }
            this.equipped.set(id, inst);
            return true;
        }
        unequip(id) {
            const inst = this.equipped.get(id);
            if (!inst)
                return true;
            try {
                inst.onUnequip && inst.onUnequip();
            }
            catch (_) { }
            this.equipped.delete(id);
            return true;
        }
        clear() { for (const id of Array.from(this.equipped.keys()))
            this.unequip(id); }
        handleInput(intent, ctx) {
            const list = Array.from(this.equipped.values()).sort((a, b) => (b.priority || 0) - (a.priority || 0));
            for (const s of list) {
                if (s.onInput && s.onInput(intent, ctx, this.caps))
                    return true;
            }
            return false;
        }
        tick(ctx) { for (const s of this.equipped.values())
            if (s.onTick)
                s.onTick(ctx, this.caps); }
        onLand(ctx) { for (const s of this.equipped.values())
            if (s.onLand)
                s.onLand(ctx, this.caps); }
        getConfig(id) { return this.configs.get(id); }
        setConfig(id, cfg) { this.configs.set(id, cfg); }
        patchConfig(id, patch) {
            const cur = this.configs.get(id) || {};
            this.configs.set(id, { ...cur, ...patch });
        }
        async listPresets(skillId) {
            if (!skillId) {
                const res = await fetch('/__skill_presets');
                return res.json();
            }
            else {
                const res = await fetch('/__skill_presets/' + encodeURIComponent(skillId));
                return res.json();
            }
        }
        async applyPreset(skillId, presetFile) {
            const url = 'dist/skill-presets/' + encodeURIComponent(skillId) + '/' + encodeURIComponent(presetFile);
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok)
                throw new Error('Failed to fetch preset ' + presetFile);
            const preset = await res.json();
            this.patchConfig(skillId, preset);
        }
    }
    Jamble.SkillManager = SkillManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class JumpSkill {
        constructor(id = 'jump', priority = 10, cfg = { strength: 7 }) {
            this.name = 'Jump';
            this.slot = 'movement';
            this.cd = null;
            this.id = id;
            this.priority = priority;
            this.cfg = { strength: cfg.strength };
            this.cd = cfg.cooldownMs && cfg.cooldownMs > 0 ? new Jamble.CooldownTimer(cfg.cooldownMs) : null;
        }
        onInput(intent, ctx, caps) {
            if (intent !== Jamble.InputIntent.Tap && intent !== Jamble.InputIntent.AirTap)
                return false;
            if (!ctx.grounded && intent !== Jamble.InputIntent.AirTap)
                return false;
            const now = ctx.nowMs;
            if (this.cd && !this.cd.isReady(now))
                return false;
            const ok = caps.requestJump(this.cfg.strength);
            if (ok && this.cd)
                this.cd.tryConsume(now);
            return ok;
        }
    }
    Jamble.JumpSkill = JumpSkill;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class DashSkill {
        constructor(id = 'dash', priority = 20, cfg) {
            this.name = 'Dash';
            this.slot = 'movement';
            this.usedThisAir = false;
            this.id = id;
            this.priority = priority;
            this.cfg = cfg;
            this.cd = new Jamble.CooldownTimer(cfg.cooldownMs);
        }
        onEquip(caps) { }
        onLand(_ctx, _caps) { this.usedThisAir = false; }
        onInput(intent, ctx, caps) {
            if (intent !== Jamble.InputIntent.AirTap)
                return false;
            if (ctx.grounded)
                return false;
            if (this.usedThisAir)
                return false;
            const now = ctx.nowMs;
            if (!this.cd.isReady(now))
                return false;
            const ok = caps.startDash(this.cfg.speed, this.cfg.durationMs);
            if (ok) {
                this.cd.tryConsume(now);
                this.usedThisAir = true;
            }
            return ok;
        }
    }
    Jamble.DashSkill = DashSkill;
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
                this.playerEl.style.left = (x + direction * Jamble.Settings.current.deathWiggleDistance) + 'px';
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
            this.x = Jamble.Settings.current.playerStartOffset;
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
            this.x = Jamble.Settings.current.playerStartOffset;
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
            this.x = gameWidth - this.el.offsetWidth - Jamble.Settings.current.playerStartOffset;
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
            this.dashRemainingMs = Jamble.Settings.current.dashDurationMs;
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
                    this.velocity -= Jamble.Settings.current.gravityUp * dt60;
                else if (this.velocity > -2)
                    this.velocity -= Jamble.Settings.current.gravityMid * dt60;
                else
                    this.velocity -= Jamble.Settings.current.gravityDown * dt60;
                if (this.jumpHeight <= 0) {
                    this.jumpHeight = 0;
                    this.isJumping = false;
                    this.endDash();
                    this.dashAvailable = true;
                    if (Jamble.Settings.current.squashEnabled) {
                        const sy = Jamble.Settings.current.landScaleY;
                        const sx = Jamble.Settings.current.landScaleX;
                        this.el.style.transition = 'transform 0ms linear';
                        this.el.style.transform = 'scaleY(' + sy + ') scaleX(' + sx + ')';
                        const dur = Math.max(0, Jamble.Settings.current.landSquashDurationMs);
                        window.setTimeout(() => {
                            const ease = Math.max(0, Jamble.Settings.current.landEaseMs);
                            this.el.style.transition = 'transform ' + ease + 'ms ease-out';
                            this.el.style.transform = 'scaleY(1) scaleX(1)';
                        }, dur);
                    }
                    else {
                        this.el.style.transform = 'scaleY(1) scaleX(1)';
                    }
                }
                else {
                    if (Jamble.Settings.current.squashEnabled) {
                        const v = Math.max(0, this.velocity);
                        const stretch = 1 + v * Jamble.Settings.current.stretchFactor;
                        const squash = 1 - v * Jamble.Settings.current.squashFactor;
                        const airMs = Math.max(0, Jamble.Settings.current.airTransformSmoothingMs);
                        this.el.style.transition = 'transform ' + airMs + 'ms ease-out';
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
            var _a, _b, _c, _d, _f, _g, _h, _j;
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
            this.landCbs = [];
            this.wasGrounded = true;
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
            const caps = {
                requestJump: (strength) => {
                    if (this.player.isJumping || this.player.frozenDeath)
                        return false;
                    this.player.jump();
                    if (typeof strength === 'number')
                        this.player.velocity = strength;
                    return true;
                },
                startDash: (_speed, _durationMs) => {
                    return this.player.startDash();
                },
                addHorizontalImpulse: (speed, durationMs) => {
                    const start = performance.now();
                    const dir = this.direction;
                    const apply = () => {
                        const now = performance.now();
                        const dt = Math.min((now - start) / 1000, durationMs / 1000);
                        const dx = speed * dt * dir;
                        this.player.moveX(dx);
                        if (now - start < durationMs)
                            window.requestAnimationFrame(apply);
                    };
                    window.requestAnimationFrame(apply);
                },
                setVerticalVelocity: (vy) => { this.player.velocity = vy; },
                onLand: (cb) => { this.landCbs.push(cb); }
            };
            this.skills = new Jamble.SkillManager(caps, { movement: 2 });
            this.skills.register({ id: 'jump', name: 'Jump', slot: 'movement', priority: 10, defaults: { strength: (_b = (_a = Jamble.Settings.skills.configs.jump) === null || _a === void 0 ? void 0 : _a.strength) !== null && _b !== void 0 ? _b : Jamble.Settings.current.jumpStrength }, create: (cfg) => new Jamble.JumpSkill('jump', 10, cfg) });
            this.skills.register({ id: 'dash', name: 'Dash', slot: 'movement', priority: 20, defaults: { speed: (_d = (_c = Jamble.Settings.skills.configs.dash) === null || _c === void 0 ? void 0 : _c.speed) !== null && _d !== void 0 ? _d : Jamble.Settings.current.dashSpeed, durationMs: (_g = (_f = Jamble.Settings.skills.configs.dash) === null || _f === void 0 ? void 0 : _f.durationMs) !== null && _g !== void 0 ? _g : Jamble.Settings.current.dashDurationMs, cooldownMs: (_j = (_h = Jamble.Settings.skills.configs.dash) === null || _h === void 0 ? void 0 : _h.cooldownMs) !== null && _j !== void 0 ? _j : 150 }, create: (cfg) => new Jamble.DashSkill('dash', 20, cfg) });
            const sj = Jamble.Settings.skills.configs.jump;
            if (sj)
                this.skills.setConfig('jump', sj);
            const sd = Jamble.Settings.skills.configs.dash;
            if (sd)
                this.skills.setConfig('dash', sd);
            const loadoutMoves = Jamble.Settings.skills.loadout.movement || ['jump', 'dash'];
            loadoutMoves.forEach(id => { try {
                this.skills.equip(id);
            }
            catch (_e) { } });
        }
        getSkillManager() { return this.skills; }
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
            this.countdown.start(Jamble.Settings.current.startFreezeTime);
            this.inCountdown = true;
            this.startCountdownTimer = window.setTimeout(() => {
                this.player.clearFrozenStart();
                this.inCountdown = false;
                this.startCountdownTimer = null;
            }, Jamble.Settings.current.startFreezeTime);
        }
        onShuffleClick() {
            if (!this.awaitingStartTap || this.waitGroundForStart)
                return;
            this.shuffleTrees();
        }
        shuffleTrees() {
            const min = Jamble.Settings.current.treeEdgeMarginPct;
            const max = 100 - Jamble.Settings.current.treeEdgeMarginPct;
            const gap = Jamble.Settings.current.treeMinGapPct;
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
                const grounded = this.player.jumpHeight === 0 && !this.player.isJumping;
                if (this.player.frozenStart && this.waitGroundForStart)
                    return;
                const intent = grounded ? Jamble.InputIntent.Tap : Jamble.InputIntent.AirTap;
                const ctx = {
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
            const rightLimit = this.gameEl.offsetWidth - Jamble.Settings.current.playerStartOffset;
            return this.player.getRight(this.gameEl.offsetWidth) >= rightLimit;
        }
        reachedLeft() { return this.player.x <= Jamble.Settings.current.playerStartOffset; }
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
                const speed = base + (this.player.isDashing ? Jamble.Settings.current.dashSpeed : 0);
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
                    this.player.setX(Jamble.Settings.current.playerStartOffset);
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
            const grounded = this.player.jumpHeight === 0 && !this.player.isJumping;
            const sctx = {
                nowMs: performance.now(),
                grounded,
                velocityY: this.player.velocity,
                isDashing: this.player.isDashing,
                jumpHeight: this.player.jumpHeight,
                dashAvailable: !this.player.isDashing
            };
            this.skills.tick(sctx);
            if (!this.wasGrounded && grounded) {
                this.skills.onLand(sctx);
                const cbs = this.landCbs.slice();
                this.landCbs.length = 0;
                cbs.forEach(cb => { try {
                    cb();
                }
                catch (_e) { } });
            }
            this.wasGrounded = grounded;
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
                }, Jamble.Settings.current.deathFreezeTime);
                this.showResetTimer = window.setTimeout(() => {
                    this.resetBtn.style.display = 'block';
                    this.showResetTimer = null;
                }, Jamble.Settings.current.showResetDelayMs);
            }
            this.rafId = window.requestAnimationFrame(this.loop);
        }
    }
    Jamble.Game = Game;
})(Jamble || (Jamble = {}));
(function () {
    window.Jamble = { Game: Jamble.Game, Settings: Jamble.Settings, Skills: {
            InputIntent: Jamble.InputIntent,
            JumpSkill: Jamble.JumpSkill,
            DashSkill: Jamble.DashSkill,
            SkillManager: Jamble.SkillManager
        } };
    Jamble.Settings.loadFrom('dist/profiles/default.json').finally(function () {
        try {
            window.dispatchEvent(new CustomEvent('jamble:settingsLoaded'));
        }
        catch (_e) { }
    });
})();
