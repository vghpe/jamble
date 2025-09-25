"use strict";
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
        shuffleEnabled: true,
        shuffleLimit: 3,
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
        landEaseMs: 100
    };
    function defaultSkills() {
        return {
            loadout: { movement: ['move', 'jump', 'dash'], utility: [], ultimate: [] },
            configs: {
                jump: { strength: embeddedDefaults.jumpStrength },
                dash: { speed: embeddedDefaults.dashSpeed, durationMs: embeddedDefaults.dashDurationMs, cooldownMs: 150 }
            }
        };
    }
    class SettingsStore {
        constructor(initial, skills) {
            var _a, _b, _c;
            this._current = { ...embeddedDefaults, ...(initial !== null && initial !== void 0 ? initial : {}) };
            const baseSkills = defaultSkills();
            this._skills = {
                loadout: {
                    movement: ((_a = skills === null || skills === void 0 ? void 0 : skills.loadout) === null || _a === void 0 ? void 0 : _a.movement) ? skills.loadout.movement.slice() : baseSkills.loadout.movement.slice(),
                    utility: ((_b = skills === null || skills === void 0 ? void 0 : skills.loadout) === null || _b === void 0 ? void 0 : _b.utility) ? skills.loadout.utility.slice() : baseSkills.loadout.utility.slice(),
                    ultimate: ((_c = skills === null || skills === void 0 ? void 0 : skills.loadout) === null || _c === void 0 ? void 0 : _c.ultimate) ? skills.loadout.ultimate.slice() : baseSkills.loadout.ultimate.slice()
                },
                configs: { ...baseSkills.configs, ...((skills === null || skills === void 0 ? void 0 : skills.configs) || {}) }
            };
        }
        get current() { return this._current; }
        get skills() { return this._skills; }
        update(patch) {
            this._current = { ...this._current, ...patch };
        }
        reset() {
            this._current = { ...embeddedDefaults };
            this._skills = defaultSkills();
        }
        toJSON() {
            return {
                game: { ...this._current },
                skills: {
                    loadout: {
                        movement: this._skills.loadout.movement.slice(),
                        utility: this._skills.loadout.utility.slice(),
                        ultimate: this._skills.loadout.ultimate.slice()
                    },
                    configs: { ...this._skills.configs }
                }
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
    }
    Jamble.SkillManager = SkillManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class MoveSkill {
        constructor(id = 'move', priority = 5) {
            this.name = 'Move';
            this.slot = 'movement';
            this.id = id;
            this.priority = priority;
        }
    }
    Jamble.MoveSkill = MoveSkill;
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
                caps.addHorizontalImpulse(this.cfg.speed, this.cfg.durationMs);
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
    class CollisionManager {
        static checkCollision(a, b) {
            if (a.type === 'rect' && b.type === 'rect') {
                return CollisionManager.rectRect(a.bounds, b.bounds);
            }
            if (a.type === 'circle' && b.type === 'circle') {
                return CollisionManager.circleCircle(a, b);
            }
            if (a.type === 'rect' && b.type === 'circle') {
                return CollisionManager.rectCircle(a.bounds, b);
            }
            if (a.type === 'circle' && b.type === 'rect') {
                return CollisionManager.rectCircle(b.bounds, a);
            }
            return false;
        }
        static rectRect(a, b) {
            return a.left < b.right && a.right > b.left &&
                a.bottom > b.top && a.top < b.bottom;
        }
        static circleCircle(a, b) {
            if (!a.radius || !b.radius)
                return false;
            const centerAx = a.bounds.x + a.bounds.width / 2;
            const centerAy = a.bounds.y + a.bounds.height / 2;
            const centerBx = b.bounds.x + b.bounds.width / 2;
            const centerBy = b.bounds.y + b.bounds.height / 2;
            const dx = centerAx - centerBx;
            const dy = centerAy - centerBy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (a.radius + b.radius);
        }
        static rectCircle(rect, circle) {
            if (!circle.radius)
                return false;
            const circleCenterX = circle.bounds.x + circle.bounds.width / 2;
            const circleCenterY = circle.bounds.y + circle.bounds.height / 2;
            const closestX = Math.max(rect.left, Math.min(circleCenterX, rect.right));
            const closestY = Math.max(rect.top, Math.min(circleCenterY, rect.bottom));
            const dx = circleCenterX - closestX;
            const dy = circleCenterY - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < circle.radius;
        }
        static createRectShape(bounds) {
            return {
                type: 'rect',
                bounds: bounds
            };
        }
        static createCircleShape(centerX, centerY, radius) {
            return {
                type: 'circle',
                bounds: new DOMRect(centerX - radius, centerY - radius, radius * 2, radius * 2),
                radius: radius
            };
        }
    }
    Jamble.CollisionManager = CollisionManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    function isPositionableLevelElement(el) {
        return typeof el.setLeftPct === 'function';
    }
    Jamble.isPositionableLevelElement = isPositionableLevelElement;
    class LevelElementRegistry {
        constructor() {
            this.descriptors = new Map();
        }
        register(desc) {
            this.descriptors.set(desc.id, desc);
        }
        unregister(id) {
            this.descriptors.delete(id);
        }
        get(id) {
            return this.descriptors.get(id);
        }
        create(elementId, options) {
            const desc = this.descriptors.get(elementId);
            if (!desc)
                return undefined;
            const cfg = (options.config !== undefined ? options.config : desc.defaults);
            const instId = options.instanceId || elementId;
            const host = options.host || (desc.ensureHost ? desc.ensureHost(options.root, instId) : undefined);
            const factoryOptions = {
                id: instId,
                manager: options.manager,
                root: options.root,
                host,
                config: cfg
            };
            return desc.create(factoryOptions);
        }
    }
    Jamble.LevelElementRegistry = LevelElementRegistry;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class LevelElementManager {
        constructor(root, registry) {
            this.elements = new Map();
            this.activeIds = new Set();
            this.registry = null;
            this.root = root;
            if (registry)
                this.registry = registry;
        }
        attachRegistry(registry) {
            this.registry = registry;
        }
        getRegistry() {
            return this.registry;
        }
        add(element, options) {
            this.elements.set(element.id, element);
            const lifecycleCtx = { manager: this };
            if (element.init)
                element.init(lifecycleCtx);
            const active = options && options.active === false ? false : true;
            if (active) {
                this.activeIds.add(element.id);
                if (element.activate)
                    element.activate(lifecycleCtx);
            }
            else {
                this.activeIds.delete(element.id);
            }
        }
        spawnFromRegistry(id, options = {}) {
            if (!this.registry)
                return undefined;
            const descriptorId = options.instanceId || id;
            if (this.elements.has(descriptorId))
                return this.elements.get(descriptorId);
            const instance = this.registry.create(id, {
                manager: this,
                config: options.config,
                host: options.host,
                instanceId: descriptorId,
                root: this.root
            });
            if (!instance)
                return undefined;
            this.add(instance, { active: options.active });
            return instance;
        }
        remove(id) {
            const element = this.elements.get(id);
            if (!element) {
                this.activeIds.delete(id);
                return;
            }
            const lifecycleCtx = { manager: this };
            if (this.activeIds.has(id) && element.deactivate)
                element.deactivate(lifecycleCtx);
            if (element.dispose)
                element.dispose(lifecycleCtx);
            this.elements.delete(id);
            this.activeIds.delete(id);
        }
        setActive(id, active) {
            const element = this.elements.get(id);
            if (!element)
                return;
            const lifecycleCtx = { manager: this };
            if (active) {
                if (!this.activeIds.has(id)) {
                    this.activeIds.add(id);
                    if (element.activate)
                        element.activate(lifecycleCtx);
                }
            }
            else if (this.activeIds.has(id)) {
                this.activeIds.delete(id);
                if (element.deactivate)
                    element.deactivate(lifecycleCtx);
            }
        }
        isActive(id) {
            return this.activeIds.has(id);
        }
        get(id) {
            return this.elements.get(id);
        }
        getPositionable(id) {
            const el = this.elements.get(id);
            if (!el || !this.activeIds.has(id))
                return undefined;
            if (Jamble.isPositionableLevelElement(el))
                return el;
            return undefined;
        }
        getPositionablesByType(type) {
            const list = [];
            this.activeIds.forEach(id => {
                const el = this.elements.get(id);
                if (!el || el.type !== type)
                    return;
                if (Jamble.isPositionableLevelElement(el))
                    list.push(el);
            });
            return list;
        }
        forEach(cb) {
            this.activeIds.forEach(id => {
                const el = this.elements.get(id);
                if (el)
                    cb(el);
            });
        }
        getByType(type) {
            const list = [];
            this.activeIds.forEach(id => {
                const el = this.elements.get(id);
                if (el && el.type === type)
                    list.push(el);
            });
            return list;
        }
        someCollidable(predicate) {
            for (const id of this.activeIds) {
                const el = this.elements.get(id);
                if (!el || !el.collidable)
                    continue;
                const hit = predicate(el);
                if (hit) {
                    if (el.onCollision)
                        el.onCollision({ manager: this });
                    return el;
                }
            }
            return null;
        }
        tick(deltaMs) {
            if (deltaMs <= 0)
                return;
            const ctx = { manager: this, deltaMs };
            for (const id of this.activeIds) {
                const el = this.elements.get(id);
                if (!el || !el.tick)
                    continue;
                el.tick(ctx);
            }
        }
        clear() {
            const ids = Array.from(this.elements.keys());
            ids.forEach(id => this.remove(id));
        }
        all() {
            const list = [];
            this.activeIds.forEach(id => {
                const el = this.elements.get(id);
                if (el)
                    list.push(el);
            });
            return list;
        }
    }
    Jamble.LevelElementManager = LevelElementManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    const SLOT_LAYER_TEMPLATES = [
        { type: 'ground', columns: 8, yPercent: 0, noiseX: 1.5, noiseY: 0, invalidColumns: [0, 7] },
        { type: 'air_low', columns: 8, yPercent: 28, noiseX: 2.5, noiseY: 4 },
        { type: 'air_mid', columns: 8, yPercent: 55, noiseX: 2.5, noiseY: 4 },
        { type: 'air_high', columns: 8, yPercent: 78, noiseX: 2.5, noiseY: 4 },
        { type: 'ceiling', columns: 8, yPercent: 100, noiseX: 1.5, noiseY: 0 }
    ];
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    const NOISE_SEED = 142857;
    const PERM_SIZE = 256;
    const PERM_MASK = PERM_SIZE - 1;
    const gradients = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2],
        [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2]
    ];
    const NOISE_SCALE_PRIMARY_X = 2.1;
    const NOISE_SCALE_PRIMARY_Y = 1.7;
    const NOISE_SCALE_SECONDARY_X = 1.9;
    const NOISE_SCALE_SECONDARY_Y = 2.4;
    function mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    const perm = (() => {
        const p = new Uint8Array(PERM_SIZE * 2);
        const source = new Uint8Array(PERM_SIZE);
        for (let i = 0; i < PERM_SIZE; i++)
            source[i] = i;
        const rnd = mulberry32(NOISE_SEED);
        for (let i = PERM_SIZE - 1; i >= 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const tmp = source[i];
            source[i] = source[j];
            source[j] = tmp;
        }
        for (let i = 0; i < PERM_SIZE * 2; i++) {
            p[i] = source[i & PERM_MASK];
        }
        return p;
    })();
    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    function grad(hash, x, y) {
        const g = gradients[hash % gradients.length];
        return g[0] * x + g[1] * y;
    }
    function perlin2D(x, y) {
        const xi = Math.floor(x) & PERM_MASK;
        const yi = Math.floor(y) & PERM_MASK;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = fade(xf);
        const v = fade(yf);
        const aa = perm[xi + perm[yi]];
        const ab = perm[xi + perm[yi + 1]];
        const ba = perm[xi + 1 + perm[yi]];
        const bb = perm[xi + 1 + perm[yi + 1]];
        const x1 = grad(aa, xf, yf);
        const x2 = grad(ba, xf - 1, yf);
        const y1 = x1 + u * (x2 - x1);
        const x3 = grad(ab, xf, yf - 1);
        const x4 = grad(bb, xf - 1, yf - 1);
        const y2 = x3 + u * (x4 - x3);
        return y1 + v * (y2 - y1);
    }
    class SlotLayoutManager {
        constructor(host) {
            this.metrics = { width: 0, height: 0 };
            this.slots = [];
            this.slotsByType = new Map();
            this.slotByElementId = new Map();
            this.noiseOptions = { enabled: false, horizontal: 1, vertical: 1 };
            this.normalDistribution = { enabled: false, intensity: 0.6 };
            this.host = host;
            this.rebuild();
        }
        rebuild() {
            const rect = this.host.getBoundingClientRect();
            const width = rect.width || this.host.offsetWidth || 1;
            const height = rect.height || this.host.offsetHeight || 1;
            this.metrics = { width, height };
            this.slots = [];
            this.slotsByType.clear();
            this.slotByElementId.clear();
            SLOT_LAYER_TEMPLATES.forEach((template, layerIndex) => {
                const layerSlots = [];
                const stride = 100 / template.columns;
                const distributionXPcts = this.normalDistribution.enabled
                    ? this.computeNormalColumnPercents(template.columns)
                    : null;
                for (let column = 0; column < template.columns; column++) {
                    const baseXPct = distributionXPcts
                        ? distributionXPcts[column]
                        : (column + 0.5) * stride;
                    const slotId = template.type + '-' + column;
                    const nx = template.columns > 1 ? column / (template.columns - 1) : 0;
                    const ny = SLOT_LAYER_TEMPLATES.length > 1 ? layerIndex / (SLOT_LAYER_TEMPLATES.length - 1) : 0;
                    const noiseEnabled = this.noiseOptions.enabled;
                    const amplitudeX = noiseEnabled ? template.noiseX * Math.max(0, this.noiseOptions.horizontal) : 0;
                    const amplitudeY = noiseEnabled ? template.noiseY * Math.max(0, this.noiseOptions.vertical) : 0;
                    const noiseX = amplitudeX !== 0 ? perlin2D(nx * NOISE_SCALE_PRIMARY_X + 0.31, ny * NOISE_SCALE_PRIMARY_Y + 3.73) : 0;
                    const noiseY = amplitudeY !== 0 ? perlin2D(nx * NOISE_SCALE_SECONDARY_X + 4.11, ny * NOISE_SCALE_SECONDARY_Y + 1.19 + 7.0) : 0;
                    const offsetX = noiseX * amplitudeX;
                    const offsetY = noiseY * amplitudeY;
                    const xPercent = clamp(baseXPct + offsetX, 0, 100);
                    const yPercent = clamp(template.yPercent + offsetY, 0, 100);
                    const slot = {
                        id: slotId,
                        type: template.type,
                        column,
                        layerIndex,
                        xPercent,
                        yPercent,
                        xPx: (xPercent / 100) * this.metrics.width,
                        yPx: (yPercent / 100) * this.metrics.height,
                        invalid: template.invalidColumns ? template.invalidColumns.indexOf(column) !== -1 : false,
                        occupied: false,
                        elementId: null,
                        elementType: null
                    };
                    layerSlots.push(slot);
                    this.slots.push(slot);
                }
                this.slotsByType.set(template.type, layerSlots);
            });
        }
        getAllSlots() {
            return this.slots;
        }
        getSlotsByType(type) {
            return this.slotsByType.get(type) || [];
        }
        getMetrics() {
            return this.metrics;
        }
        getNoiseOptions() {
            return { ...this.noiseOptions };
        }
        setNoiseOptions(options) {
            this.noiseOptions = {
                ...this.noiseOptions,
                ...options
            };
            if (this.noiseOptions.horizontal < 0)
                this.noiseOptions.horizontal = 0;
            if (this.noiseOptions.vertical < 0)
                this.noiseOptions.vertical = 0;
            this.noiseOptions.enabled = options.enabled !== undefined ? options.enabled : this.noiseOptions.enabled;
        }
        getNormalDistributionOptions() {
            return { ...this.normalDistribution };
        }
        setNormalDistributionOptions(options) {
            this.normalDistribution = {
                ...this.normalDistribution,
                ...options
            };
            if (this.normalDistribution.intensity < 0)
                this.normalDistribution.intensity = 0;
            if (this.normalDistribution.intensity > 1)
                this.normalDistribution.intensity = 1;
            this.normalDistribution.enabled = options.enabled !== undefined ? options.enabled : this.normalDistribution.enabled;
        }
        getSlotForElement(elementId) {
            return this.slotByElementId.get(elementId);
        }
        releaseSlot(elementId) {
            const slot = this.slotByElementId.get(elementId);
            if (!slot)
                return;
            slot.occupied = false;
            slot.elementId = null;
            slot.elementType = null;
            this.slotByElementId.delete(elementId);
        }
        acquireSlot(elementId, elementType, placement) {
            const candidates = this.filterCandidates(elementType, placement);
            if (candidates.length === 0)
                return null;
            const selected = candidates[Math.floor(Math.random() * candidates.length)];
            selected.occupied = true;
            selected.elementId = elementId;
            selected.elementType = elementType;
            this.slotByElementId.set(elementId, selected);
            return selected;
        }
        applySlotToElement(element, slot, options = {}) {
            const result = { originApplied: false, needsRetry: false };
            const origin = options.origin ? this.normalizeOrigin(options.origin) : null;
            if (origin) {
                const leftPx = this.applySlotWithOrigin(element, slot, origin);
                if (leftPx !== null) {
                    this.applyPostOriginAdjustments(element, slot, leftPx);
                    result.originApplied = true;
                }
                else {
                    result.needsRetry = true;
                }
            }
            if (!result.originApplied) {
                this.applySlotFallback(element, slot);
            }
            return result;
        }
        filterCandidates(elementType, placement) {
            const allowStartZone = (placement === null || placement === void 0 ? void 0 : placement.allowStartZone) === true;
            const validTypes = placement === null || placement === void 0 ? void 0 : placement.validSlotTypes;
            const blocked = placement === null || placement === void 0 ? void 0 : placement.blockedNeighbors;
            const candidates = [];
            for (const slot of this.slots) {
                if (slot.occupied)
                    continue;
                if (!allowStartZone && slot.invalid)
                    continue;
                if (validTypes && validTypes.length > 0 && validTypes.indexOf(slot.type) === -1)
                    continue;
                if (blocked && this.violatesNeighborRule(slot, blocked))
                    continue;
                candidates.push(slot);
            }
            return candidates;
        }
        normalizeOrigin(origin) {
            const normalizedX = Number.isFinite(origin.x) ? origin.x : 0.5;
            const normalizedY = Number.isFinite(origin.y) ? origin.y : 0;
            const xUnit = origin.xUnit === 'px' ? 'px' : 'fraction';
            const yUnit = origin.yUnit === 'px' ? 'px' : 'fraction';
            return { x: normalizedX, y: normalizedY, xUnit, yUnit };
        }
        applySlotWithOrigin(element, slot, origin) {
            const host = element.el.offsetParent || element.el.parentElement;
            if (!host)
                return null;
            const hostRect = host.getBoundingClientRect();
            const hostWidth = host.offsetWidth || hostRect.width;
            const hostHeight = host.offsetHeight || hostRect.height;
            if (hostWidth <= 0 || hostHeight <= 0)
                return null;
            const elRect = element.el.getBoundingClientRect();
            const elWidth = element.el.offsetWidth || elRect.width || 1;
            const elHeight = element.el.offsetHeight || elRect.height || 1;
            const originX = origin.xUnit === 'px'
                ? origin.x
                : clamp(origin.x, 0, 1) * elWidth;
            const originY = origin.yUnit === 'px'
                ? origin.y
                : clamp(origin.y, 0, 1) * elHeight;
            const maxLeft = Math.max(0, hostWidth - elWidth);
            const maxBottom = Math.max(0, hostHeight - elHeight);
            const leftPx = clamp(slot.xPx - originX, 0, maxLeft);
            const bottomPx = clamp(slot.yPx - originY, 0, maxBottom);
            element.el.style.left = leftPx.toFixed(1) + 'px';
            element.el.style.bottom = bottomPx.toFixed(1) + 'px';
            return leftPx;
        }
        applyPostOriginAdjustments(element, slot, leftPx) {
            if (element.type === 'bird' && typeof element.assignSlot === 'function') {
                element.assignSlot(slot, leftPx);
            }
        }
        applySlotFallback(element, slot) {
            if (element.type === 'bird' && typeof element.assignSlot === 'function') {
                element.assignSlot(slot);
                return;
            }
            if ((element.type === 'tree' || element.type === 'tree_ceiling') && typeof element.setLeftPct === 'function') {
                element.setLeftPct(slot.xPercent);
                const host = element.el.parentElement;
                if (host && typeof element.applyVerticalFromSlot === 'function') {
                    element.applyVerticalFromSlot(slot, host);
                }
                return;
            }
            if (typeof element.setLeftPct === 'function') {
                element.setLeftPct(slot.xPercent);
            }
        }
        violatesNeighborRule(candidate, rule) {
            const distance = Math.max(0, Math.floor(rule.distance));
            if (distance <= 0 || !rule.types || rule.types.length === 0)
                return false;
            for (const slot of this.slots) {
                if (!slot.occupied)
                    continue;
                if (!slot.elementType || rule.types.indexOf(slot.elementType) === -1)
                    continue;
                const dx = Math.abs(slot.column - candidate.column);
                const dy = Math.abs(slot.layerIndex - candidate.layerIndex);
                const chebyshev = Math.max(dx, dy);
                if (chebyshev <= distance)
                    return true;
            }
            return false;
        }
        computeNormalColumnPercents(columns) {
            if (columns <= 0)
                return [];
            const intensity = clamp(this.normalDistribution.intensity, 0, 1);
            const stride = 100 / columns;
            const basePercents = new Array(columns);
            for (let column = 0; column < columns; column++) {
                basePercents[column] = (column + 0.5) * stride;
            }
            if (intensity <= 0)
                return basePercents;
            const spreadMin = 0.18;
            const spreadMax = 0.36;
            const spread = spreadMin + intensity * (spreadMax - spreadMin);
            const gaussianPercents = new Array(columns);
            const minErfInput = -1 + Number.EPSILON;
            const maxErfInput = 1 - Number.EPSILON;
            for (let column = 0; column < columns; column++) {
                const normalized = (column + 0.5) / columns;
                const centered = 2 * normalized - 1;
                const safeCentered = clamp(centered, minErfInput, maxErfInput);
                const z = Math.SQRT2 * inverseErf(safeCentered);
                const rawValue = clamp(0.5 + z * spread, 0, 1);
                gaussianPercents[column] = rawValue * 100;
            }
            let min = gaussianPercents[0];
            let max = gaussianPercents[0];
            for (let i = 1; i < gaussianPercents.length; i++) {
                const value = gaussianPercents[i];
                if (value < min)
                    min = value;
                if (value > max)
                    max = value;
            }
            if (max - min <= 1e-6)
                return basePercents;
            const firstBase = basePercents[0];
            const lastBase = basePercents[columns - 1];
            const scaledGaussian = gaussianPercents.map(value => {
                const normalized = (value - min) / (max - min);
                return firstBase + normalized * (lastBase - firstBase);
            });
            return scaledGaussian.map((value, idx) => {
                const base = basePercents[idx];
                return base + (value - base) * intensity;
            });
        }
    }
    Jamble.SlotLayoutManager = SlotLayoutManager;
    function inverseErf(x) {
        if (x <= -1 || x >= 1) {
            if (x === -1)
                return Number.NEGATIVE_INFINITY;
            if (x === 1)
                return Number.POSITIVE_INFINITY;
            return Number.NaN;
        }
        const a = 0.147;
        const ln = Math.log(1 - x * x);
        const part1 = 2 / (Math.PI * a) + ln / 2;
        const part2 = ln / a;
        const sign = x < 0 ? -1 : 1;
        const inside = part1 * part1 - part2;
        if (inside <= 0)
            return 0;
        return sign * Math.sqrt(Math.sqrt(inside) - part1);
    }
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class TreeElement {
        constructor(id, el, variant = 'ground') {
            this.collidable = true;
            this.deadly = true;
            this.defaultDisplay = '';
            this.initialized = false;
            this.id = id;
            this.el = el;
            this.variant = variant;
            this.type = variant === 'ceiling' ? 'tree_ceiling' : 'tree';
            this.el.classList.add('jamble-tree');
            if (variant === 'ceiling')
                this.el.classList.add('jamble-tree-ceiling');
        }
        rect() { return this.el.getBoundingClientRect(); }
        getCollisionShape() {
            const visualRect = this.el.getBoundingClientRect();
            const collisionWidth = 8;
            const collisionHeight = 25;
            const offsetX = (visualRect.width - collisionWidth) / 2;
            const offsetY = (visualRect.height - collisionHeight) / 2;
            const collisionBounds = new DOMRect(visualRect.x + offsetX, visualRect.y + offsetY, collisionWidth, collisionHeight);
            return Jamble.CollisionManager.createRectShape(collisionBounds);
        }
        setLeftPct(pct) {
            const n = Math.max(0, Math.min(100, pct));
            this.el.style.left = n.toFixed(1) + '%';
        }
        isCeiling() { return this.variant === 'ceiling'; }
        applyVerticalFromSlot(slot, host) {
            if (!this.isCeiling()) {
                this.el.style.top = 'auto';
                this.el.style.bottom = '0px';
                return;
            }
            const hostHeight = host.offsetHeight || host.getBoundingClientRect().height || 0;
            const clamped = Math.max(0, Math.min(hostHeight, slot.yPx));
            const topPx = Math.max(0, hostHeight - clamped);
            this.el.style.bottom = 'auto';
            this.el.style.top = topPx.toFixed(1) + 'px';
        }
        init() {
            if (this.initialized)
                return;
            this.initialized = true;
            const current = this.el.style.display;
            this.defaultDisplay = current && current !== 'none' ? current : '';
            this.el.style.display = 'none';
        }
        activate() {
            this.el.style.display = this.defaultDisplay;
        }
        deactivate() {
            this.el.style.display = 'none';
        }
        dispose() {
            this.el.style.display = 'none';
        }
        getOrigin() {
            return this.isCeiling()
                ? { x: 0.65, y: 0, xUnit: 'fraction', yUnit: 'fraction' }
                : { x: 0.65, y: 0, xUnit: 'fraction', yUnit: 'fraction' };
        }
    }
    Jamble.TreeElement = TreeElement;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class BirdElement {
        constructor(id, el, cfg) {
            var _a;
            this.type = 'bird';
            this.collidable = true;
            this.deadly = true;
            this.defaultDisplay = '';
            this.initialized = false;
            this.positionPx = null;
            this.assignedSlot = null;
            this.id = id;
            this.el = el;
            this.el.classList.add('jamble-bird');
            this.el.textContent = '🐦';
            this.speedPxPerSec = Math.max(5, Math.min(400, (_a = cfg === null || cfg === void 0 ? void 0 : cfg.speed) !== null && _a !== void 0 ? _a : 40));
            this.direction = (cfg === null || cfg === void 0 ? void 0 : cfg.direction) === -1 ? -1 : 1;
        }
        rect() { return this.el.getBoundingClientRect(); }
        getCollisionShape() {
            const rect = this.el.getBoundingClientRect();
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const radius = Math.min(rect.width, rect.height) / 2 * 0.7;
            return Jamble.CollisionManager.createCircleShape(centerX, centerY, radius);
        }
        resolveHost() {
            return this.el.offsetParent || this.el.parentElement;
        }
        ensurePosition() {
            if (this.positionPx !== null)
                return;
            const host = this.resolveHost();
            if (!host)
                return;
            const leftStyle = this.el.style.left || '50%';
            let pos = 0;
            if (leftStyle.indexOf('%') !== -1) {
                const pct = parseFloat(leftStyle);
                if (!Number.isNaN(pct))
                    pos = (pct / 100) * host.offsetWidth;
            }
            else {
                const raw = parseFloat(leftStyle);
                if (!Number.isNaN(raw))
                    pos = raw;
            }
            if (!Number.isFinite(pos))
                pos = host.offsetWidth / 2;
            const max = Math.max(0, host.offsetWidth - this.el.offsetWidth);
            pos = Math.max(0, Math.min(pos, max));
            this.positionPx = pos;
            this.applyPosition();
        }
        applyPosition() {
            if (this.positionPx === null)
                return;
            this.el.style.left = this.positionPx + 'px';
        }
        applyVerticalFromSlot() {
            if (!this.assignedSlot)
                return;
            const host = this.resolveHost();
            if (!host)
                return;
            const hostHeight = host.offsetHeight || host.getBoundingClientRect().height || 0;
            const maxBottom = Math.max(0, hostHeight - this.el.offsetHeight);
            const originY = this.el.offsetHeight * 0.5;
            const target = this.assignedSlot.yPx - originY;
            const bottomPx = Math.max(0, Math.min(target, maxBottom));
            this.el.style.bottom = bottomPx + 'px';
        }
        init() {
            if (this.initialized)
                return;
            this.initialized = true;
            const current = this.el.style.display;
            this.defaultDisplay = current && current !== 'none' ? current : '';
            this.el.style.display = 'none';
            this.ensurePosition();
        }
        activate() {
            this.el.style.display = this.defaultDisplay || '';
            if (this.assignedSlot) {
                this.assignSlot(this.assignedSlot);
            }
            else {
                this.ensurePosition();
            }
        }
        deactivate() {
            this.el.style.display = 'none';
        }
        dispose() {
            this.el.style.display = 'none';
        }
        getOrigin() {
            return { x: 0.5, y: 0.5, xUnit: 'fraction', yUnit: 'fraction' };
        }
        tick(ctx) {
            if (ctx.deltaMs <= 0)
                return;
            if (this.assignedSlot) {
                this.applyVerticalFromSlot();
            }
            this.ensurePosition();
            if (this.positionPx === null)
                return;
            const host = this.resolveHost();
            if (!host)
                return;
            const maxX = Math.max(0, host.offsetWidth - this.el.offsetWidth);
            if (maxX <= 0)
                return;
            const deltaSec = ctx.deltaMs / 1000;
            const next = this.positionPx + this.direction * this.speedPxPerSec * deltaSec;
            if (next <= 0) {
                this.positionPx = 0;
                this.direction = 1;
            }
            else if (next >= maxX) {
                this.positionPx = maxX;
                this.direction = -1;
            }
            else {
                this.positionPx = next;
            }
            this.applyPosition();
        }
        assignSlot(slot, leftPx) {
            this.assignedSlot = slot;
            if (typeof leftPx === 'number') {
                this.setHorizontalPositionPx(leftPx);
            }
            this.applyVerticalFromSlot();
        }
        clearSlot() {
            this.assignedSlot = null;
            this.positionPx = null;
        }
        setHorizontalPositionPx(px) {
            const host = this.resolveHost();
            let clamped = px;
            if (host) {
                const max = Math.max(0, host.offsetWidth - this.el.offsetWidth);
                clamped = Math.max(0, Math.min(px, max));
            }
            this.positionPx = clamped;
            this.applyPosition();
        }
    }
    Jamble.BirdElement = BirdElement;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class LapsElement {
        constructor(id, el, config) {
            this.type = 'laps';
            this.collidable = false;
            this.deadly = false;
            this.id = id;
            this.el = el;
            this.el.classList.add('jamble-laps');
            this.el.setAttribute('aria-hidden', 'true');
            this.el.style.display = 'none';
            this.value = clampLaps(config === null || config === void 0 ? void 0 : config.value);
        }
        rect() {
            return this.el.getBoundingClientRect();
        }
        getValue() {
            return this.value;
        }
        setValue(next) {
            this.value = clampLaps(next);
        }
        increment() {
            this.value = clampLaps(this.value + 1);
            return this.value;
        }
    }
    Jamble.LapsElement = LapsElement;
    function clampLaps(value) {
        if (!Number.isFinite(value))
            return 1;
        return Math.max(1, Math.min(9, Math.floor(value)));
    }
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class KnobElement {
        constructor(id, el, config) {
            this.type = 'knob';
            this.collidable = true;
            this.deadly = false;
            this.initialized = false;
            this.defaultDisplay = '';
            this.theta = 0;
            this.thetaDot = 0;
            this.thetaTarget = 0;
            this.lastTickTime = 0;
            this.collisionState = 'none';
            this.lastPlayerCenter = 0;
            this.basePos = { x: 0, y: 0 };
            this.springPoints = [];
            this.id = id;
            this.el = el;
            const defaults = {
                length: 10,
                segments: 6,
                omega: 18.0,
                zeta: 0.25,
                maxAngleDeg: 85,
                bowFactor: 0.35,
                lineWidth: 12,
                knobColor: '#ff968f',
                baseRadius: 3,
                showPoints: false,
                visualOffsetY: 4
            };
            this.config = { ...defaults, ...config };
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'jamble-knob-canvas';
            this.canvas.style.cssText = `
        position: absolute;
        top: ${this.config.visualOffsetY}px;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;
            const ctx = this.canvas.getContext('2d');
            if (!ctx)
                throw new Error('Could not get 2D context for knob canvas');
            this.ctx = ctx;
            this.el.appendChild(this.canvas);
            this.setupElementStyle();
            this.el.__knob_instance = this;
        }
        setupElementStyle() {
            this.el.classList.add('jamble-knob');
            const elementSize = 60;
            this.el.style.cssText = `
        position: absolute;
        width: ${elementSize}px;
        height: ${elementSize}px;
        pointer-events: none;
      `;
        }
        rect() {
            return this.el.getBoundingClientRect();
        }
        getCollisionShape() {
            const rect = this.el.getBoundingClientRect();
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const radius = Math.min(rect.width, rect.height) / 2 * 0.6;
            return Jamble.CollisionManager.createCircleShape(centerX, centerY, radius);
        }
        setLeftPct(pct) {
            const n = Math.max(0, Math.min(100, pct));
            this.el.style.left = n.toFixed(1) + '%';
        }
        init() {
            if (this.initialized)
                return;
            this.initialized = true;
            const current = this.el.style.display;
            this.defaultDisplay = current && current !== 'none' ? current : 'block';
            this.el.style.display = 'none';
            this.setupCanvas();
        }
        setupCanvas() {
            const elementSize = 60;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = elementSize * ratio;
            this.canvas.height = elementSize * ratio;
            this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            this.basePos.x = elementSize * 0.5;
            this.basePos.y = elementSize * 0.9;
        }
        activate() {
            this.el.style.display = this.defaultDisplay;
            this.lastTickTime = performance.now();
            this.applyImpulse(1);
            this.updateSpringPoints();
            this.render();
        }
        deactivate() {
            this.el.style.display = 'none';
        }
        tick(ctx) {
            const now = performance.now();
            if (this.lastTickTime === 0)
                this.lastTickTime = now;
            let dt = (now - this.lastTickTime) / 1000;
            this.lastTickTime = now;
            dt = Math.max(0.001, Math.min(dt, 1 / 30));
            this.checkCollisionExit();
            this.updatePhysics(dt);
            this.updateSpringPoints();
            this.render();
        }
        checkCollisionExit() {
            if (this.collisionState === 'none')
                return;
            const playerEl = document.querySelector('.jamble-player');
            if (!playerEl) {
                this.endCollision();
                return;
            }
            const playerRect = playerEl.getBoundingClientRect();
            const knobRect = this.el.getBoundingClientRect();
            const stillColliding = playerRect.left < knobRect.right &&
                playerRect.right > knobRect.left &&
                playerRect.bottom > knobRect.top &&
                playerRect.top < knobRect.bottom;
            if (!stillColliding) {
                this.handleCollisionExit();
            }
        }
        handleCollisionExit() {
            if (this.collisionState === 'none')
                return;
            this.collisionState = 'none';
            this.endCollision();
        }
        updatePhysics(dt) {
            const acceleration = -2 * this.config.zeta * this.config.omega * this.thetaDot -
                this.config.omega * this.config.omega * (this.theta - this.thetaTarget);
            this.thetaDot += acceleration * dt;
            this.theta += this.thetaDot * dt;
        }
        updateSpringPoints() {
            const tipX = this.basePos.x + this.config.length * Math.sin(this.theta);
            const tipY = this.basePos.y - this.config.length * Math.cos(this.theta);
            const normal = { x: Math.cos(this.theta), y: Math.sin(this.theta) };
            const midX = (this.basePos.x + tipX) / 2;
            const midY = (this.basePos.y + tipY) / 2;
            const bowOffset = -this.config.bowFactor * this.config.length * this.theta;
            const controlX = midX + normal.x * bowOffset;
            const controlY = midY + normal.y * bowOffset;
            const segments = Math.max(2, Math.round(this.config.segments));
            this.springPoints = [];
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const omt = 1 - t;
                const x = omt * omt * this.basePos.x + 2 * omt * t * controlX + t * t * tipX;
                const y = omt * omt * this.basePos.y + 2 * omt * t * controlY + t * t * tipY;
                this.springPoints.push({ x, y });
            }
        }
        render() {
            const elementSize = 60;
            this.ctx.clearRect(0, 0, elementSize, elementSize);
            this.ctx.save();
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = this.config.knobColor;
            this.ctx.lineWidth = this.config.lineWidth;
            this.ctx.beginPath();
            if (this.springPoints.length > 0) {
                this.ctx.moveTo(this.springPoints[0].x, this.springPoints[0].y);
                for (let i = 1; i < this.springPoints.length - 1; i++) {
                    const midX = 0.5 * (this.springPoints[i].x + this.springPoints[i + 1].x);
                    const midY = 0.5 * (this.springPoints[i].y + this.springPoints[i + 1].y);
                    this.ctx.quadraticCurveTo(this.springPoints[i].x, this.springPoints[i].y, midX, midY);
                }
                if (this.springPoints.length > 1) {
                    const last = this.springPoints[this.springPoints.length - 1];
                    this.ctx.lineTo(last.x, last.y);
                }
            }
            this.ctx.stroke();
            this.ctx.fillStyle = this.config.knobColor;
            this.ctx.beginPath();
            this.ctx.arc(this.basePos.x, this.basePos.y, this.config.baseRadius, 0, Math.PI * 2);
            this.ctx.fill();
            if (this.config.showPoints) {
                this.ctx.fillStyle = '#e7e7ea';
                for (const point of this.springPoints) {
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            this.ctx.restore();
        }
        applyImpulse(force) {
            this.thetaDot += force;
        }
        setTarget(angleDeg) {
            const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
            this.thetaTarget = Math.max(-maxAngle, Math.min(maxAngle, (angleDeg * Math.PI) / 180));
        }
        beginCollision(direction) {
            const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
            this.thetaTarget = direction * maxAngle;
            this.triggerEmojiReaction('colliding');
        }
        endCollision() {
            this.thetaTarget = 0;
            this.triggerEmojiReaction('post');
        }
        triggerEmojiReaction(state) {
            const gameInstance = window.__game;
            if (gameInstance && typeof gameInstance.triggerEmojiReaction === 'function') {
                gameInstance.triggerEmojiReaction(state);
            }
        }
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            if ('visualOffsetY' in newConfig) {
                this.canvas.style.top = `${this.config.visualOffsetY}px`;
            }
            this.setupCanvas();
            this.updateSpringPoints();
            this.render();
        }
        getCurrentAngleDeg() {
            return (this.theta * 180) / Math.PI;
        }
        getOrigin() {
            return { x: 0.5, y: 0.9, xUnit: 'fraction', yUnit: 'fraction' };
        }
        onCollision(ctx) {
            const playerEl = document.querySelector('.jamble-player');
            if (!playerEl)
                return;
            const playerRect = playerEl.getBoundingClientRect();
            const knobRect = this.el.getBoundingClientRect();
            const playerCenter = playerRect.left + playerRect.width / 2;
            const knobCenter = knobRect.left + knobRect.width / 2;
            const side = playerCenter < knobCenter ? 'left' : 'right';
            if (this.collisionState === 'none') {
                this.collisionState = side;
                this.lastPlayerCenter = playerCenter;
                const direction = side === 'left' ? 1 : -1;
                this.beginCollision(direction);
            }
            else if (this.collisionState !== side) {
                this.collisionState = side;
                const direction = side === 'left' ? 1 : -1;
                this.beginCollision(direction);
            }
            this.lastPlayerCenter = playerCenter;
        }
        dispose() {
            delete this.el.__knob_instance;
            if (this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
        }
    }
    Jamble.KnobElement = KnobElement;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    const hostFactories = {
        'tree-ground': (root, id) => {
            let el = root.querySelector('.jamble-tree[data-element-id="' + id + '"]');
            if (el)
                return el;
            el = document.createElement('div');
            el.className = 'jamble-tree';
            root.appendChild(el);
            el.setAttribute('data-element-id', id);
            if (!el.style.left)
                el.style.left = '50%';
            el.style.display = 'none';
            return el;
        },
        'tree-ceiling': (root, id) => {
            let el = root.querySelector('.jamble-tree.jamble-tree-ceiling[data-element-id="' + id + '"]');
            if (el)
                return el;
            el = document.createElement('div');
            el.className = 'jamble-tree jamble-tree-ceiling';
            root.appendChild(el);
            el.classList.add('jamble-tree', 'jamble-tree-ceiling');
            el.setAttribute('data-element-id', id);
            if (!el.style.left)
                el.style.left = '50%';
            el.style.display = 'none';
            return el;
        },
        'bird-floating': (root, id) => {
            let el = root.querySelector('.jamble-bird[data-element-id="' + id + '"]');
            if (el)
                return el;
            el = document.createElement('div');
            el.className = 'jamble-bird';
            el.textContent = '🐦';
            root.appendChild(el);
            el.setAttribute('data-element-id', id);
            if (!el.style.left)
                el.style.left = '50%';
            el.style.display = 'none';
            return el;
        },
        'laps-control': (root, id) => {
            let el = root.querySelector('.jamble-laps[data-element-id="' + id + '"]');
            if (el)
                return el;
            el = document.createElement('div');
            el.className = 'jamble-laps';
            el.setAttribute('data-element-id', id);
            el.style.display = 'none';
            root.appendChild(el);
            return el;
        },
        'knob-interactive': (root, id) => {
            let el = root.querySelector('.jamble-knob[data-element-id="' + id + '"]');
            if (el)
                return el;
            el = document.createElement('div');
            el.className = 'jamble-knob';
            el.setAttribute('data-element-id', id);
            if (!el.style.left)
                el.style.left = '50%';
            el.style.display = 'none';
            root.appendChild(el);
            return el;
        }
    };
    const CORE_ELEMENTS = [
        {
            id: 'laps.basic',
            name: 'Laps',
            emoji: '🔁',
            type: 'laps',
            hostKind: 'laps-control',
            defaults: { value: 1 },
            ensureHost: (root, id) => hostFactories['laps-control'](root, id),
            create: ({ id, host, root, config }) => {
                const el = host || hostFactories['laps-control'](root, id);
                return new Jamble.LapsElement(id, el, config);
            }
        },
        {
            id: 'tree.basic',
            name: 'Tree',
            emoji: '🌳',
            type: 'tree',
            hostKind: 'tree-ground',
            defaults: {},
            placement: { validSlotTypes: ['ground'], blockedNeighbors: { types: ['tree'], distance: 1 }, allowStartZone: false },
            ensureHost: (root, id) => hostFactories['tree-ground'](root, id),
            create: ({ id, host, root }) => {
                const el = host || hostFactories['tree-ground'](root, id);
                return new Jamble.TreeElement(id, el, 'ground');
            }
        },
        {
            id: 'tree.ceiling',
            name: 'Ceiling Tree',
            emoji: '🌲',
            type: 'tree_ceiling',
            hostKind: 'tree-ceiling',
            defaults: {},
            placement: { validSlotTypes: ['ceiling'], blockedNeighbors: { types: ['tree_ceiling'], distance: 1 }, allowStartZone: true },
            ensureHost: (root, id) => hostFactories['tree-ceiling'](root, id),
            create: ({ id, host, root }) => {
                const el = host || hostFactories['tree-ceiling'](root, id);
                return new Jamble.TreeElement(id, el, 'ceiling');
            }
        },
        {
            id: 'bird.basic',
            name: 'Bird',
            emoji: '🐦',
            type: 'bird',
            hostKind: 'bird-floating',
            defaults: { speed: 40, direction: 1 },
            placement: { validSlotTypes: ['air_low', 'air_mid'], blockedNeighbors: { types: ['bird'], distance: 1 }, allowStartZone: true },
            ensureHost: (root, id) => hostFactories['bird-floating'](root, id),
            create: ({ id, host, root, config }) => {
                const el = host || hostFactories['bird-floating'](root, id);
                return new Jamble.BirdElement(id, el, config);
            }
        },
        {
            id: 'bird.fast',
            name: 'Fast Bird',
            emoji: '🐦‍⬛',
            type: 'bird',
            hostKind: 'bird-floating',
            defaults: { speed: 60, direction: 1 },
            placement: { validSlotTypes: ['air_low', 'air_mid'], blockedNeighbors: { types: ['bird'], distance: 1 }, allowStartZone: true },
            ensureHost: (root, id) => hostFactories['bird-floating'](root, id),
            create: ({ id, host, root, config }) => {
                const el = host || hostFactories['bird-floating'](root, id);
                return new Jamble.BirdElement(id, el, config);
            }
        },
        {
            id: 'knob.basic',
            name: 'Knob',
            emoji: '🔔',
            type: 'knob',
            hostKind: 'knob-interactive',
            defaults: {},
            placement: { validSlotTypes: ['ground'], blockedNeighbors: { types: [], distance: 0 }, allowStartZone: true },
            ensureHost: (root, id) => hostFactories['knob-interactive'](root, id),
            create: ({ id, host, root, config }) => {
                const el = host || hostFactories['knob-interactive'](root, id);
                return new Jamble.KnobElement(id, el, config);
            }
        }
    ];
    function registerCoreElements(registry) {
        CORE_ELEMENTS.forEach(desc => registry.register(desc));
    }
    Jamble.registerCoreElements = registerCoreElements;
    function getCoreElementDefinition(id) {
        return CORE_ELEMENTS.find(def => def.id === id);
    }
    Jamble.getCoreElementDefinition = getCoreElementDefinition;
    function getCoreElementDefinitions() {
        return CORE_ELEMENTS;
    }
    Jamble.getCoreElementDefinitions = getCoreElementDefinitions;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    Jamble.CoreDeckConfig = {
        pool: [
            { definitionId: 'laps.basic', quantity: 1, config: { value: 1 } },
            { definitionId: 'tree.basic', quantity: 5 },
            { definitionId: 'tree.ceiling', quantity: 5 },
            { definitionId: 'bird.basic', quantity: 3 },
            { definitionId: 'bird.fast', quantity: 2 },
            { definitionId: 'knob.basic', quantity: 3 }
        ]
    };
    const HAND_SLOTS = 8;
    function generateCardId(baseId, index) {
        return baseId + '-' + (index + 1);
    }
    function expandDeck(config) {
        const deck = [];
        config.pool.forEach(blueprint => {
            var _a;
            const descriptor = Jamble.getCoreElementDefinition(blueprint.definitionId);
            if (!descriptor)
                return;
            const qty = Math.max(1, (_a = blueprint.quantity) !== null && _a !== void 0 ? _a : 1);
            const baseName = blueprint.name || descriptor.name;
            for (let i = 0; i < qty; i++) {
                const id = generateCardId(blueprint.definitionId, i);
                deck.push({
                    id,
                    definitionId: blueprint.definitionId,
                    name: qty > 1 ? baseName + ' ' + (i + 1) : baseName,
                    type: descriptor.type,
                    emoji: descriptor.emoji,
                    config: blueprint.config
                });
            }
        });
        return deck;
    }
    Jamble.expandDeck = expandDeck;
    function deriveElementsSettings(config) {
        const deck = expandDeck(config);
        const hand = [];
        const mutableDeck = deck.slice();
        for (let i = 0; i < HAND_SLOTS; i++) {
            const slotId = 'slot-' + i;
            if (mutableDeck.length === 0) {
                hand.push({ slotId, cardId: null, active: false });
                continue;
            }
            const index = Math.floor(Math.random() * mutableDeck.length);
            const [card] = mutableDeck.splice(index, 1);
            hand.push({ slotId, cardId: card.id, active: false });
        }
        return { deck, hand };
    }
    Jamble.deriveElementsSettings = deriveElementsSettings;
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
    class EmojiReaction {
        constructor(gameEl) {
            this.emojiEl = null;
            this.currentState = 'idle';
            this.postTimeout = null;
            this.enabled = false;
            this.EMOJI_MAP = {
                idle: '🙂',
                colliding: '😳',
                post: '🤭'
            };
            this.POST_DURATION_MS = 1000;
            this.createEmojiElement(gameEl);
        }
        createEmojiElement(gameEl) {
            this.emojiEl = document.createElement('div');
            this.emojiEl.className = 'jamble-emoji-reaction';
            this.emojiEl.style.cssText = `
        position: absolute;
        font-size: 32px;
        line-height: 1;
        pointer-events: none;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s ease;
        user-select: none;
      `;
            this.updatePosition(gameEl);
            if (gameEl.parentNode) {
                gameEl.parentNode.insertBefore(this.emojiEl, gameEl.nextSibling);
            }
            this.updateEmoji();
        }
        updatePosition(gameEl) {
            var _a;
            if (!this.emojiEl)
                return;
            const rect = gameEl.getBoundingClientRect();
            const parentRect = ((_a = gameEl.offsetParent) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect()) || { left: 0, top: 0 };
            const left = gameEl.offsetLeft - 50;
            const top = gameEl.offsetTop + (gameEl.offsetHeight / 2) - 16;
            this.emojiEl.style.left = `${left}px`;
            this.emojiEl.style.top = `${top}px`;
        }
        updateEmoji() {
            if (!this.emojiEl)
                return;
            this.emojiEl.textContent = this.EMOJI_MAP[this.currentState];
            this.emojiEl.style.opacity = this.enabled ? '1' : '0';
        }
        setEnabled(enabled) {
            this.enabled = enabled;
            this.updateEmoji();
        }
        isEnabled() {
            return this.enabled;
        }
        setState(state) {
            if (this.currentState === state)
                return;
            if (this.postTimeout !== null) {
                window.clearTimeout(this.postTimeout);
                this.postTimeout = null;
            }
            this.currentState = state;
            this.updateEmoji();
            if (state === 'post') {
                this.postTimeout = window.setTimeout(() => {
                    this.setState('idle');
                    this.postTimeout = null;
                }, this.POST_DURATION_MS);
            }
        }
        getState() {
            return this.currentState;
        }
        beginCollision() {
            this.setState('colliding');
        }
        endCollision() {
            this.setState('post');
        }
        reset() {
            this.setState('idle');
        }
        repositionForGame(gameEl) {
            this.updatePosition(gameEl);
        }
        dispose() {
            if (this.postTimeout !== null) {
                window.clearTimeout(this.postTimeout);
                this.postTimeout = null;
            }
            if (this.emojiEl && this.emojiEl.parentNode) {
                this.emojiEl.parentNode.removeChild(this.emojiEl);
            }
            this.emojiEl = null;
        }
    }
    Jamble.EmojiReaction = EmojiReaction;
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
            this.el.className = 'jamble-player jamble-player-idle';
        }
        setNormal() { this.el.className = 'jamble-player jamble-normal'; }
        setFrozenStart() { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-idle'; }
        setPrestart() { this.frozenStart = true; this.el.className = 'jamble-player jamble-player-prestart'; }
        clearFrozenStart() { this.frozenStart = false; this.setNormal(); }
        setFrozenDeath() { this.frozenDeath = true; this.el.className = 'jamble-player jamble-frozen-death'; }
        getCollisionShape() {
            const rect = this.el.getBoundingClientRect();
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const radius = Math.min(rect.width, rect.height) / 2 * 0.8;
            return Jamble.CollisionManager.createCircleShape(centerX, centerY, radius);
        }
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
        startDash(durationOverrideMs) {
            if (this.frozenStart || this.frozenDeath || !this.isJumping)
                return false;
            if (this.isDashing || !this.dashAvailable)
                return false;
            this.isDashing = true;
            this.dashRemainingMs = typeof durationOverrideMs === 'number' ? durationOverrideMs : Jamble.Settings.current.dashDurationMs;
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
    class HandManager {
        constructor(levelElements, settings) {
            this.levelElements = levelElements;
            this.instances = new Map();
            this.lapsCardId = null;
            this.lapsValue = 1;
            this.deck = settings.deck.map(card => ({ ...card }));
            this.handSlots = settings.hand.map(slot => ({ ...slot }));
            this.initializeDeckElements();
        }
        getDeckEntries() {
            return this.deck.map(card => ({ ...card }));
        }
        getHandView() {
            return this.handSlots.map((slot, index) => {
                if (!slot.cardId) {
                    return {
                        id: 'placeholder-' + index,
                        definitionId: 'placeholder',
                        name: 'Empty',
                        type: 'empty',
                        emoji: '…',
                        active: false,
                        available: false
                    };
                }
                const meta = this.instances.get(slot.cardId) || this.deck.find(card => card.id === slot.cardId);
                if (!meta) {
                    return {
                        id: slot.cardId,
                        definitionId: 'unknown',
                        name: 'Unknown',
                        type: 'empty',
                        emoji: '❔',
                        active: slot.active,
                        available: false
                    };
                }
                return {
                    id: slot.cardId,
                    definitionId: meta.definitionId,
                    name: meta.name,
                    type: meta.type,
                    emoji: meta.emoji || '❔',
                    active: slot.active,
                    available: true
                };
            });
        }
        getSlotCount() {
            return this.handSlots.length;
        }
        getCardMeta(cardId) {
            return this.instances.get(cardId) || this.deck.find(card => card.id === cardId);
        }
        setCardActive(cardId, active) {
            const slot = this.handSlots.find(s => s.cardId === cardId);
            if (!slot)
                return false;
            if (slot.active === active)
                return false;
            slot.active = active;
            return true;
        }
        isCardActive(cardId) {
            const slot = this.handSlots.find(s => s.cardId === cardId);
            return !!slot && !!slot.active;
        }
        forEachSlot(callback) {
            this.handSlots.forEach(slot => {
                callback({
                    slotId: slot.slotId,
                    cardId: slot.cardId,
                    isActive: () => slot.active,
                    setActive: (active) => { slot.active = active; }
                });
            });
        }
        incrementLaps() {
            const lapsElement = this.getLapsElement();
            if (!lapsElement)
                return this.lapsValue;
            const next = lapsElement.increment();
            this.lapsValue = next;
            this.updateLapsConfig(next);
            return this.lapsValue;
        }
        getLapsValue() {
            return this.lapsValue;
        }
        setLapsValue(value) {
            const clamped = this.clampLaps(value);
            const lapsElement = this.getLapsElement();
            if (lapsElement)
                lapsElement.setValue(clamped);
            this.lapsValue = clamped;
            this.updateLapsConfig(clamped);
            return this.lapsValue;
        }
        resetLapsValue() {
            return this.setLapsValue(1);
        }
        getLapsCardId() {
            return this.lapsCardId;
        }
        isLapsCard(cardId) {
            return !!this.lapsCardId && this.lapsCardId === cardId;
        }
        resetForIdle() {
            const lapsId = this.lapsCardId;
            const pool = this.deck.filter(card => card.id !== lapsId);
            const available = pool.slice();
            this.handSlots.forEach(slot => {
                slot.active = false;
                if (lapsId && slot.cardId === lapsId) {
                    return;
                }
                if (available.length === 0) {
                    slot.cardId = null;
                    return;
                }
                const index = Math.floor(Math.random() * available.length);
                const [card] = available.splice(index, 1);
                slot.cardId = card.id;
            });
            if (lapsId && !this.handSlots.some(slot => slot.cardId === lapsId)) {
                const target = this.handSlots[0];
                if (target.cardId) {
                }
                target.cardId = lapsId;
            }
        }
        initializeDeckElements() {
            this.deck.forEach(card => {
                const instance = this.levelElements.spawnFromRegistry(card.definitionId, {
                    instanceId: card.id,
                    config: card.config,
                    active: false
                });
                if (instance) {
                    this.instances.set(card.id, { ...card });
                    if (instance instanceof Jamble.LapsElement) {
                        this.lapsCardId = card.id;
                        this.lapsValue = instance.getValue();
                    }
                }
            });
            if (!this.lapsCardId) {
                const lapsEntry = this.deck.find(card => card.definitionId === 'laps.basic');
                if (lapsEntry)
                    this.lapsCardId = lapsEntry.id;
            }
        }
        getLapsElement() {
            if (!this.lapsCardId)
                return null;
            const instance = this.levelElements.get(this.lapsCardId);
            if (instance && instance instanceof Jamble.LapsElement)
                return instance;
            return null;
        }
        updateLapsConfig(value) {
            if (this.lapsCardId) {
                const meta = this.instances.get(this.lapsCardId);
                if (meta) {
                    meta.config = { ...(meta.config || {}), value };
                }
                const deckEntry = this.deck.find(card => card.id === this.lapsCardId);
                if (deckEntry) {
                    deckEntry.config = { ...(deckEntry.config || {}), value };
                }
            }
        }
        clampLaps(value) {
            if (!Number.isFinite(value))
                return 1;
            return Math.max(1, Math.min(9, Math.floor(value)));
        }
    }
    Jamble.HandManager = HandManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class RunStateManager {
        constructor() {
            this.state = 'idle';
            this.lapsTarget = 1;
            this.lapsRemaining = 1;
            this.runsCompleted = 0;
        }
        setInitialLaps(value) {
            const clamped = this.clampLaps(value);
            this.lapsTarget = clamped;
            this.lapsRemaining = clamped;
            this.state = 'idle';
        }
        startCountdown(lapsValue) {
            const target = this.clampLaps(lapsValue);
            this.lapsTarget = target;
            this.lapsRemaining = target;
            this.state = 'countdown';
        }
        startRun() {
            if (this.state !== 'countdown')
                return;
            this.state = 'running';
        }
        handleEdgeArrival() {
            if (this.state !== 'running')
                return false;
            if (this.lapsRemaining > 0)
                this.lapsRemaining -= 1;
            if (this.lapsRemaining <= 0) {
                this.finishRun();
                return true;
            }
            return false;
        }
        finishRun() {
            this.runsCompleted += 1;
            this.state = 'finished';
            this.lapsRemaining = 0;
        }
        resetToIdle(lapsValue) {
            this.lapsTarget = this.clampLaps(lapsValue);
            this.lapsRemaining = this.lapsTarget;
            this.state = 'idle';
        }
        getSnapshot() {
            return {
                state: this.state,
                lapsTarget: this.lapsTarget,
                lapsRemaining: this.lapsRemaining,
                runsCompleted: this.runsCompleted
            };
        }
        getRunsCompleted() {
            return this.runsCompleted;
        }
        setRunsCompleted(value) {
            this.runsCompleted = Math.max(0, Math.floor(value));
        }
        setLapsValue(value) {
            const clamped = this.clampLaps(value);
            this.lapsTarget = clamped;
            this.lapsRemaining = clamped;
        }
        applyLapValue(value) {
            const clamped = this.clampLaps(value);
            this.lapsTarget = clamped;
            this.lapsRemaining = clamped;
        }
        getLapsRemaining() {
            return this.lapsRemaining;
        }
        getLapsTarget() {
            return this.lapsTarget;
        }
        getState() {
            return this.state;
        }
        clampLaps(value) {
            if (!Number.isFinite(value))
                return 1;
            return Math.max(1, Math.min(9, Math.floor(value)));
        }
    }
    Jamble.RunStateManager = RunStateManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class GameUi {
        constructor(options) {
            var _a, _b, _c, _d;
            this.startButton = options.startButton;
            this.resetButton = options.resetButton;
            this.skillSlots = (_a = options.skillSlots) !== null && _a !== void 0 ? _a : null;
            this.skillMenu = (_b = options.skillMenu) !== null && _b !== void 0 ? _b : null;
            this.elementHand = (_c = options.elementHand) !== null && _c !== void 0 ? _c : null;
            this.levelLabel = (_d = options.levelLabel) !== null && _d !== void 0 ? _d : null;
        }
        getStartButton() {
            return this.startButton;
        }
        getResetButton() {
            return this.resetButton;
        }
        isControlElement(target) {
            return target === this.startButton || target === this.resetButton;
        }
        showIdleControls() {
            this.startButton.style.display = 'block';
            if (this.skillSlots)
                this.skillSlots.style.display = 'flex';
            if (this.skillMenu)
                this.skillMenu.style.display = 'flex';
            if (this.elementHand)
                this.elementHand.style.display = 'flex';
        }
        hideIdleControls() {
            this.startButton.style.display = 'none';
            if (this.skillSlots)
                this.skillSlots.style.display = 'flex';
            if (this.skillMenu)
                this.skillMenu.style.display = 'none';
            if (this.elementHand)
                this.elementHand.style.display = 'none';
        }
        setResetVisible(visible) {
            this.resetButton.style.display = visible ? 'block' : 'none';
        }
        setRunDisplay(text) {
            if (!this.levelLabel)
                return;
            if (this.levelLabel.textContent !== text)
                this.levelLabel.textContent = text;
        }
    }
    Jamble.GameUi = GameUi;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class InputController {
        constructor(options) {
            this.bound = false;
            this.player = options.player;
            this.skills = options.skills;
            this.ui = options.ui;
            this.gameEl = options.gameEl;
            this.getWaitGroundForStart = options.getWaitGroundForStart;
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onKeyDown = this.onKeyDown.bind(this);
        }
        bind() {
            if (this.bound)
                return;
            document.addEventListener('pointerdown', this.onPointerDown);
            window.addEventListener('keydown', this.onKeyDown);
            this.bound = true;
        }
        unbind() {
            if (!this.bound)
                return;
            document.removeEventListener('pointerdown', this.onPointerDown);
            window.removeEventListener('keydown', this.onKeyDown);
            this.bound = false;
        }
        onPointerDown(e) {
            if (this.ui.isControlElement(e.target))
                return;
            if (this.player.frozenDeath)
                return;
            const rect = this.gameEl.getBoundingClientRect();
            const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
            const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom + rect.height * 2;
            if (!withinX || !withinY)
                return;
            this.dispatchPrimaryInput();
        }
        onKeyDown(e) {
            if (e.code !== 'Space' && e.key !== ' ' && e.key !== 'Spacebar')
                return;
            if (e.repeat)
                return;
            e.preventDefault();
            this.dispatchPrimaryInput();
        }
        dispatchPrimaryInput() {
            if (this.player.frozenDeath)
                return;
            if (this.player.frozenStart && this.getWaitGroundForStart())
                return;
            const grounded = this.isGrounded();
            const intent = grounded ? Jamble.InputIntent.Tap : Jamble.InputIntent.AirTap;
            const ctx = this.createSkillContext(grounded);
            this.skills.handleInput(intent, ctx);
        }
        isGrounded() {
            return this.player.jumpHeight === 0 && !this.player.isJumping;
        }
        createSkillContext(grounded) {
            return {
                nowMs: performance.now(),
                grounded,
                velocityY: this.player.velocity,
                isDashing: this.player.isDashing,
                jumpHeight: this.player.jumpHeight,
                dashAvailable: !this.player.isDashing
            };
        }
    }
    Jamble.InputController = InputController;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class MovementSystem {
        constructor(gameEl) {
            this.gameEl = gameEl;
            this.impulses = [];
        }
        tick(deltaMs, deltaSec, player, direction, skills) {
            if (player.frozenStart || player.frozenDeath) {
                return { hit: false };
            }
            if (skills.isEquipped('move')) {
                const base = Jamble.Settings.current.playerSpeed;
                const dx = base * deltaSec * direction;
                player.moveX(dx);
            }
            this.processImpulses(deltaMs, deltaSec, direction, player);
            return this.checkBoundaries(player, direction);
        }
        addImpulse(speed, durationMs) {
            this.impulses.push({ speed, remainingMs: Math.max(0, durationMs) });
        }
        clearImpulses() {
            this.impulses.length = 0;
        }
        getActiveImpulses() {
            return this.impulses;
        }
        processImpulses(deltaMs, deltaSec, direction, player) {
            if (this.impulses.length === 0)
                return;
            let totalSpeed = 0;
            for (const imp of this.impulses) {
                totalSpeed += Math.max(0, imp.speed);
            }
            if (totalSpeed > 0) {
                const dxImp = totalSpeed * deltaSec * direction;
                player.moveX(dxImp);
            }
            for (const imp of this.impulses) {
                imp.remainingMs -= deltaMs;
            }
            this.impulses = this.impulses.filter(i => i.remainingMs > 0);
        }
        checkBoundaries(player, direction) {
            if (direction === 1 && this.reachedRight(player)) {
                return {
                    hit: true,
                    newDirection: -1,
                    alignmentFn: () => player.snapRight(this.gameEl.offsetWidth)
                };
            }
            if (direction === -1 && this.reachedLeft(player)) {
                return {
                    hit: true,
                    newDirection: 1,
                    alignmentFn: () => player.setX(Jamble.Settings.current.playerStartOffset)
                };
            }
            return { hit: false };
        }
        reachedRight(player) {
            const rightLimit = this.gameEl.offsetWidth - Jamble.Settings.current.playerStartOffset;
            return player.getRight(this.gameEl.offsetWidth) >= rightLimit;
        }
        reachedLeft(player) {
            return player.x <= Jamble.Settings.current.playerStartOffset;
        }
    }
    Jamble.MovementSystem = MovementSystem;
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
            this.deathWiggleTimer = null;
            this.showResetTimer = null;
            this.waitGroundForStart = false;
            this.inCountdown = false;
            this.resizeObserver = null;
            this.watchingResize = false;
            this.elementSlots = new Map();
            this.elementEditingEnabled = false;
            this.elementOriginOverrides = new Map();
            this.pendingOriginElementIds = new Set();
            this.pendingOriginFrame = null;
            this.landCbs = [];
            this.wasGrounded = true;
            this.root = root;
            const gameEl = root.querySelector('.jamble-game');
            const playerEl = root.querySelector('.jamble-player');
            const cdEl = root.querySelector('.jamble-countdown');
            const resetBtn = root.querySelector('.jamble-reset');
            const levelEl = root.querySelector('.jamble-level');
            const startBtn = root.querySelector('.jamble-start');
            const skillSlotsEl = root.querySelector('#skill-slots');
            const skillMenuEl = root.querySelector('#skill-menu');
            const elementHandEl = root.querySelector('#element-hand');
            if (!gameEl || !playerEl || !cdEl || !resetBtn || !startBtn) {
                throw new Error('Jamble: missing required elements');
            }
            this.gameEl = gameEl;
            this.player = new Jamble.Player(playerEl);
            this.elementRegistry = new Jamble.LevelElementRegistry();
            this.levelElements = new Jamble.LevelElementManager(gameEl, this.elementRegistry);
            Jamble.registerCoreElements(this.elementRegistry);
            this.slotManager = new Jamble.SlotLayoutManager(gameEl);
            const canonicalElements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
            this.hand = new Jamble.HandManager(this.levelElements, canonicalElements);
            this.run = new Jamble.RunStateManager();
            this.run.setInitialLaps(this.hand.getLapsValue());
            this.countdown = new Jamble.Countdown(cdEl);
            this.ui = new Jamble.GameUi({
                startButton: startBtn,
                resetButton: resetBtn,
                skillSlots: skillSlotsEl,
                skillMenu: skillMenuEl,
                elementHand: elementHandEl,
                levelLabel: levelEl
            });
            this.wiggle = new Jamble.Wiggle(this.player.el);
            this.emojiReaction = new Jamble.EmojiReaction(this.gameEl);
            this.handleWindowResize = () => { this.rebuildSlots(); };
            this.applyElementHand();
            this.onStartClick = this.onStartClick.bind(this);
            this.reset = this.reset.bind(this);
            this.loop = this.loop.bind(this);
            this.movementSystem = new Jamble.MovementSystem(this.gameEl);
            const caps = {
                requestJump: (strength) => {
                    if (this.player.isJumping || this.player.frozenDeath)
                        return false;
                    this.player.jump();
                    if (typeof strength === 'number')
                        this.player.velocity = strength;
                    return true;
                },
                startDash: (_speed, durationMs) => {
                    return this.player.startDash(durationMs);
                },
                addHorizontalImpulse: (speed, durationMs) => {
                    this.movementSystem.addImpulse(speed, durationMs);
                },
                setVerticalVelocity: (vy) => { this.player.velocity = vy; },
                onLand: (cb) => { this.landCbs.push(cb); }
            };
            this.skills = new Jamble.SkillManager(caps, { movement: 4 });
            this.skills.register({ id: 'move', name: 'Move', slot: 'movement', priority: 5, defaults: {}, create: (_cfg) => new Jamble.MoveSkill('move', 5) });
            this.skills.register({ id: 'jump', name: 'Jump', slot: 'movement', priority: 10, defaults: { strength: (_b = (_a = Jamble.Settings.skills.configs.jump) === null || _a === void 0 ? void 0 : _a.strength) !== null && _b !== void 0 ? _b : Jamble.Settings.current.jumpStrength }, create: (cfg) => new Jamble.JumpSkill('jump', 10, cfg) });
            this.skills.register({ id: 'dash', name: 'Dash', slot: 'movement', priority: 20, defaults: { speed: (_d = (_c = Jamble.Settings.skills.configs.dash) === null || _c === void 0 ? void 0 : _c.speed) !== null && _d !== void 0 ? _d : Jamble.Settings.current.dashSpeed, durationMs: (_g = (_f = Jamble.Settings.skills.configs.dash) === null || _f === void 0 ? void 0 : _f.durationMs) !== null && _g !== void 0 ? _g : Jamble.Settings.current.dashDurationMs, cooldownMs: (_j = (_h = Jamble.Settings.skills.configs.dash) === null || _h === void 0 ? void 0 : _h.cooldownMs) !== null && _j !== void 0 ? _j : 150 }, create: (cfg) => new Jamble.DashSkill('dash', 20, cfg) });
            const sj = Jamble.Settings.skills.configs.jump;
            if (sj)
                this.skills.setConfig('jump', sj);
            const sd = Jamble.Settings.skills.configs.dash;
            if (sd)
                this.skills.setConfig('dash', sd);
            const loadoutMoves = Jamble.Settings.skills.loadout.movement || ['move', 'jump', 'dash'];
            loadoutMoves.forEach(id => { try {
                this.skills.equip(id);
            }
            catch (_e) { } });
            this.input = new Jamble.InputController({
                player: this.player,
                skills: this.skills,
                ui: this.ui,
                gameEl: this.gameEl,
                getWaitGroundForStart: () => this.waitGroundForStart
            });
            window.__game = this;
        }
        getSkillManager() { return this.skills; }
        start() {
            this.ensureSlotResizeMonitoring();
            this.rebuildSlots();
            this.bind();
            this.reset();
            this.rafId = window.requestAnimationFrame(this.loop);
        }
        stop() {
            this.unbind();
            if (this.rafId !== null)
                window.cancelAnimationFrame(this.rafId);
            this.rafId = null;
            this.teardownSlotResizeMonitoring();
            this.wiggle.stop();
            this.countdown.hide();
            this.movementSystem.clearImpulses();
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
            this.movementSystem.clearImpulses();
            this.player.reset();
            this.ui.setResetVisible(false);
            this.player.setFrozenStart();
            this.awaitingStartTap = true;
            this.waitGroundForStart = false;
            this.inCountdown = false;
            this.showIdleControls();
            this.direction = 1;
            this.level = 0;
            this.run.setRunsCompleted(0);
            const defaultLaps = this.hand.resetLapsValue();
            this.run.setInitialLaps(defaultLaps);
            this.resetHandForIdle();
            this.updateLevel();
        }
        applyElementHand() {
            this.hand.forEachSlot(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                const element = this.levelElements.get(cardId);
                if (!element)
                    return;
                const currentlyActive = this.levelElements.isActive(cardId);
                if (slot.isActive()) {
                    if (!currentlyActive)
                        this.levelElements.setActive(cardId, true);
                    const placed = this.ensurePlacementForElement(cardId);
                    if (!placed) {
                        slot.setActive(false);
                        this.levelElements.setActive(cardId, false);
                        this.releaseElementSlot(cardId);
                    }
                }
                else {
                    if (currentlyActive)
                        this.levelElements.setActive(cardId, false);
                    this.releaseElementSlot(cardId);
                }
            });
            if (this.isIdleState()) {
                this.run.applyLapValue(this.hand.getLapsValue());
            }
            this.emitElementHandChanged();
            this.updateRunDisplay();
        }
        emitElementHandChanged() {
            try {
                window.dispatchEvent(new CustomEvent('jamble:elementHandChanged', { detail: this.getElementHand() }));
            }
            catch (_e) { }
        }
        getElementHand() {
            return this.hand.getHandView();
        }
        getHandSlotCount() {
            return this.hand.getSlotCount();
        }
        getElementDeck() {
            return this.hand.getDeckEntries();
        }
        setElementCardActive(id, active) {
            if (this.hand.isLapsCard(id))
                return;
            const wasActive = this.hand.isCardActive(id);
            if (!active && wasActive && !this.elementEditingEnabled)
                return;
            const changed = this.hand.setCardActive(id, active);
            if (!changed)
                return;
            this.applyElementHand();
        }
        incrementLaps() {
            if (!this.isIdleState())
                return this.hand.getLapsValue();
            const next = this.hand.incrementLaps();
            this.run.applyLapValue(next);
            this.updateRunDisplay();
            this.emitElementHandChanged();
            return next;
        }
        getLapsState() {
            return {
                value: this.hand.getLapsValue(),
                target: this.run.getLapsTarget(),
                remaining: this.run.getLapsRemaining(),
                max: 9,
                runs: this.run.getRunsCompleted()
            };
        }
        isIdle() {
            return this.isIdleState();
        }
        onStartClick() {
            if (this.waitGroundForStart)
                return;
            if (!this.awaitingStartTap)
                return;
            this.awaitingStartTap = false;
            this.player.setPrestart();
            this.hideIdleControls();
            this.run.startCountdown(this.hand.getLapsValue());
            this.updateRunDisplay();
            this.countdown.start(Jamble.Settings.current.startFreezeTime);
            this.inCountdown = true;
            this.startCountdownTimer = window.setTimeout(() => {
                this.player.clearFrozenStart();
                this.run.startRun();
                this.inCountdown = false;
                this.startCountdownTimer = null;
            }, Jamble.Settings.current.startFreezeTime);
        }
        bind() {
            this.input.bind();
            this.ui.getResetButton().addEventListener('click', this.reset);
            this.ui.getStartButton().addEventListener('click', this.onStartClick);
        }
        unbind() {
            this.input.unbind();
            this.ui.getResetButton().removeEventListener('click', this.reset);
            this.ui.getStartButton().removeEventListener('click', this.onStartClick);
        }
        showIdleControls() {
            this.ui.showIdleControls();
            this.emitElementHandChanged();
        }
        hideIdleControls() {
            this.ui.hideIdleControls();
        }
        updateLevel() {
            this.updateRunDisplay();
        }
        collisionWith(ob) {
            if (this.player.getCollisionShape && ob.getCollisionShape) {
                const playerShape = this.player.getCollisionShape();
                const elementShape = ob.getCollisionShape();
                return Jamble.CollisionManager.checkCollision(playerShape, elementShape);
            }
            const pr = this.player.el.getBoundingClientRect();
            const tr = ob.rect();
            return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top && pr.top < tr.bottom;
        }
        handleEdgeArrival(nextDirection, align) {
            align();
            this.level += 1;
            if (Jamble.Settings.current.mode === 'idle') {
                const finished = this.run.handleEdgeArrival();
                if (finished) {
                    this.finishRun(nextDirection);
                    this.updateLevel();
                    return;
                }
                if (this.player.velocity > 0)
                    this.player.velocity = -0.1;
                this.awaitingStartTap = false;
                this.waitGroundForStart = false;
                this.direction = nextDirection;
                this.updateLevel();
                return;
            }
            if (this.player.velocity > 0)
                this.player.velocity = -0.1;
            this.awaitingStartTap = false;
            this.waitGroundForStart = false;
            this.hideIdleControls();
            this.direction = nextDirection;
            this.updateLevel();
        }
        loop(ts) {
            if (this.lastTime === null)
                this.lastTime = ts;
            const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
            const deltaMs = deltaSec * 1000;
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
                const boundary = this.movementSystem.tick(deltaMs, deltaSec, this.player, this.direction, this.skills);
                if (boundary.hit && typeof boundary.newDirection === 'number' && boundary.alignmentFn) {
                    this.handleEdgeArrival(boundary.newDirection, boundary.alignmentFn);
                }
            }
            this.levelElements.tick(deltaMs);
            this.player.update(dt60);
            this.player.updateDash(deltaMs);
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
            const hitElement = this.levelElements.someCollidable(el => this.collisionWith(el));
            if (!this.player.frozenStart && !this.player.frozenDeath && hitElement && hitElement.deadly) {
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
                    this.ui.setResetVisible(true);
                    this.showResetTimer = null;
                }, Jamble.Settings.current.showResetDelayMs);
            }
            this.rafId = window.requestAnimationFrame(this.loop);
        }
        ensureSlotResizeMonitoring() {
            if (this.watchingResize)
                return;
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(() => { this.rebuildSlots(); });
                this.resizeObserver.observe(this.gameEl);
            }
            window.addEventListener('resize', this.handleWindowResize);
            this.watchingResize = true;
        }
        teardownSlotResizeMonitoring() {
            if (!this.watchingResize)
                return;
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }
            window.removeEventListener('resize', this.handleWindowResize);
            this.watchingResize = false;
        }
        getSlotManager() {
            return this.slotManager;
        }
        getElementSlot(cardId) {
            return this.elementSlots.get(cardId);
        }
        setElementOriginOverride(elementId, origin) {
            if (!origin) {
                this.elementOriginOverrides.delete(elementId);
            }
            else {
                this.elementOriginOverrides.set(elementId, origin);
            }
            const element = this.levelElements.get(elementId);
            const slot = element ? this.elementSlots.get(elementId) : undefined;
            if (element && slot) {
                const origin = this.getEffectiveOrigin(element);
                const result = this.slotManager.applySlotToElement(element, slot, { origin });
                if (result.needsRetry)
                    this.enqueueOriginRetry(element.id);
            }
        }
        debugActiveSlots() {
            return Array.from(this.elementSlots.values()).map(slot => ({ id: slot.id, type: slot.type, elementId: slot.elementId, elementType: slot.elementType }));
        }
        recomputeSlots() {
            this.rebuildSlots();
        }
        setElementEditMode(enabled) {
            this.elementEditingEnabled = !!enabled;
        }
        canEditElements() {
            return this.elementEditingEnabled;
        }
        rebuildSlots() {
            this.slotManager.rebuild();
            this.refreshActiveElementPlacements();
        }
        refreshActiveElementPlacements() {
            this.elementSlots.clear();
            this.hand.forEachSlot(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                this.slotManager.releaseSlot(cardId);
            });
            this.hand.forEachSlot(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                if (!slot.isActive())
                    return;
                if (!this.levelElements.isActive(cardId))
                    return;
                this.ensurePlacementForElement(cardId);
            });
        }
        releaseElementSlot(cardId) {
            const element = this.levelElements.get(cardId);
            if (element && element instanceof Jamble.BirdElement) {
                element.clearSlot();
            }
            this.slotManager.releaseSlot(cardId);
            this.elementSlots.delete(cardId);
            this.elementOriginOverrides.delete(cardId);
            this.pendingOriginElementIds.delete(cardId);
        }
        ensurePlacementForElement(cardId) {
            const meta = this.hand.getCardMeta(cardId);
            if (!meta)
                return false;
            const descriptor = this.elementRegistry.get(meta.definitionId);
            if (!descriptor)
                return false;
            const element = this.levelElements.get(cardId);
            if (!element)
                return false;
            const placement = descriptor.placement;
            if (!placement) {
                return true;
            }
            const existing = this.slotManager.getSlotForElement(cardId);
            let slot = existing || null;
            if (!slot) {
                slot = this.slotManager.acquireSlot(cardId, meta.type, placement);
            }
            if (!slot)
                return false;
            this.elementSlots.set(cardId, slot);
            const origin = this.getEffectiveOrigin(element);
            const result = this.slotManager.applySlotToElement(element, slot, { origin });
            if (result.needsRetry)
                this.enqueueOriginRetry(element.id);
            return true;
        }
        isIdleState() {
            return this.awaitingStartTap && this.player.frozenStart && !this.inCountdown;
        }
        updateRunDisplay() {
            const inRun = this.run.getState() === 'running';
            const value = inRun ? Math.max(this.run.getLapsRemaining(), 0) : Math.max(this.hand.getLapsValue(), 1);
            const text = String(value);
            this.ui.setRunDisplay(text);
        }
        clearHandPlacements() {
            this.hand.forEachSlot(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                if (this.levelElements.isActive(cardId))
                    this.levelElements.setActive(cardId, false);
                this.releaseElementSlot(cardId);
                slot.setActive(false);
            });
        }
        resetHandForIdle() {
            this.clearHandPlacements();
            this.hand.resetForIdle();
            this.applyElementHand();
        }
        finishRun(nextDirection) {
            this.run.finishRun();
            const defaultLaps = this.hand.resetLapsValue();
            this.run.resetToIdle(defaultLaps);
            this.player.setFrozenStart();
            this.player.velocity = 0;
            this.awaitingStartTap = true;
            this.waitGroundForStart = false;
            this.inCountdown = false;
            this.direction = nextDirection;
            this.showIdleControls();
            this.movementSystem.clearImpulses();
            this.resetHandForIdle();
            this.updateRunDisplay();
        }
        getEffectiveOrigin(element) {
            const override = this.elementOriginOverrides.get(element.id);
            if (override)
                return override;
            if (typeof element.getOrigin === 'function') {
                const fromElement = element.getOrigin();
                if (fromElement)
                    return fromElement;
            }
            return null;
        }
        enqueueOriginRetry(elementId) {
            this.pendingOriginElementIds.add(elementId);
            this.schedulePendingOriginPass();
        }
        schedulePendingOriginPass() {
            if (this.pendingOriginFrame !== null)
                return;
            this.pendingOriginFrame = window.requestAnimationFrame(() => {
                this.pendingOriginFrame = null;
                if (this.pendingOriginElementIds.size === 0)
                    return;
                const pending = Array.from(this.pendingOriginElementIds);
                this.pendingOriginElementIds.clear();
                let needsAnotherPass = false;
                for (const id of pending) {
                    const element = this.levelElements.get(id);
                    if (!element)
                        continue;
                    const slot = this.elementSlots.get(id);
                    if (!slot)
                        continue;
                    const origin = this.getEffectiveOrigin(element);
                    const result = this.slotManager.applySlotToElement(element, slot, { origin });
                    if (!result.originApplied && result.needsRetry) {
                        this.pendingOriginElementIds.add(id);
                        needsAnotherPass = true;
                    }
                }
                if (needsAnotherPass)
                    this.schedulePendingOriginPass();
            });
        }
        triggerEmojiReaction(state) {
            if (state === 'colliding') {
                this.emojiReaction.beginCollision();
            }
            else if (state === 'post') {
                this.emojiReaction.endCollision();
            }
        }
        setEmojiEnabled(enabled) {
            this.emojiReaction.setEnabled(enabled);
        }
        isEmojiEnabled() {
            return this.emojiReaction.isEnabled();
        }
    }
    Jamble.Game = Game;
})(Jamble || (Jamble = {}));
(function () {
    window.Jamble = { Game: Jamble.Game, Settings: Jamble.Settings, Skills: {
            InputIntent: Jamble.InputIntent,
            MoveSkill: Jamble.MoveSkill,
            JumpSkill: Jamble.JumpSkill,
            DashSkill: Jamble.DashSkill,
            SkillManager: Jamble.SkillManager
        } };
    try {
        window.dispatchEvent(new CustomEvent('jamble:settingsLoaded'));
    }
    catch (_e) { }
})();
