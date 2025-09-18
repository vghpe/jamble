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
                    return true;
                }
            }
            return false;
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
        { type: 'ground', columns: 8, yPercent: 0, jitterXPct: 0, jitterYPct: 0, invalidColumns: [0, 7] },
        { type: 'air_low', columns: 8, yPercent: 28, jitterXPct: 0, jitterYPct: 4 },
        { type: 'air_mid', columns: 8, yPercent: 55, jitterXPct: 0, jitterYPct: 4 },
        { type: 'air_high', columns: 8, yPercent: 78, jitterXPct: 0, jitterYPct: 4 },
        { type: 'ceiling', columns: 8, yPercent: 100, jitterXPct: 0, jitterYPct: 0 }
    ];
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    function jitter(id, salt, range) {
        if (range <= 0)
            return 0;
        let hash = 2166136261 ^ salt;
        for (let i = 0; i < id.length; i++) {
            hash ^= id.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        const normalized = (hash >>> 0) / 0xffffffff;
        return (normalized * 2 - 1) * range;
    }
    class SlotManager {
        constructor(host) {
            this.metrics = { width: 0, height: 0 };
            this.slots = [];
            this.slotsByType = new Map();
            this.slotByElementId = new Map();
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
                for (let column = 0; column < template.columns; column++) {
                    const baseXPct = (column + 0.5) * stride;
                    const id = template.type + '-' + column;
                    const offsetX = jitter(id, 0x1f123bb5, template.jitterXPct);
                    const offsetY = jitter(id, 0x9e3779b9, template.jitterYPct);
                    const xPercent = clamp(baseXPct + offsetX, 0, 100);
                    const yPercent = clamp(template.yPercent + offsetY, 0, 100);
                    const slot = {
                        id,
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
    }
    Jamble.SlotManager = SlotManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class TreeElement {
        constructor(id, el, variant = 'ground') {
            this.collidable = true;
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
            pos = Math.max(0, Math.min(pos, Math.max(0, host.offsetWidth - this.el.offsetWidth)));
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
            const maxBottom = Math.max(0, host.offsetHeight - this.el.offsetHeight);
            const bottomPx = Math.max(0, Math.min(this.assignedSlot.yPx, maxBottom));
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
        assignSlot(slot) {
            this.assignedSlot = slot;
            const host = this.resolveHost();
            if (!host) {
                this.positionPx = null;
                return;
            }
            const maxX = Math.max(0, host.offsetWidth - this.el.offsetWidth);
            let target = Math.max(0, Math.min(slot.xPx, maxX));
            this.positionPx = target;
            this.applyPosition();
            this.applyVerticalFromSlot();
        }
        clearSlot() {
            this.assignedSlot = null;
            this.positionPx = null;
        }
    }
    Jamble.BirdElement = BirdElement;
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
        }
    };
    const CORE_ELEMENTS = [
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
            { definitionId: 'tree.basic', quantity: 3 },
            { definitionId: 'tree.ceiling', quantity: 3 },
            { definitionId: 'bird.basic', quantity: 3 }
        ]
    };
    const HAND_SLOTS = 5;
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
            hand.push({ slotId, cardId: card.id, active: true });
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
    class Game {
        constructor(root) {
            var _a, _b, _c, _d, _f, _g, _h, _j;
            this.elementInstances = new Map();
            this.skillSlotsEl = null;
            this.skillMenuEl = null;
            this.elementHandEl = null;
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
            this.resizeObserver = null;
            this.watchingResize = false;
            this.elementSlots = new Map();
            this.landCbs = [];
            this.wasGrounded = true;
            this.impulses = [];
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
            const canonicalElements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
            this.elementDeckPool = canonicalElements.deck.map(card => ({ ...card }));
            this.elementDeckPool.forEach(card => {
                const instance = this.levelElements.spawnFromRegistry(card.definitionId, { instanceId: card.id, config: card.config, active: false });
                if (instance)
                    this.elementInstances.set(card.id, { definitionId: card.definitionId, name: card.name, type: card.type, emoji: card.emoji, config: card.config });
            });
            this.elementHandSlots = canonicalElements.hand.map(slot => ({ ...slot }));
            this.countdown = new Jamble.Countdown(cdEl);
            this.resetBtn = resetBtn;
            this.startBtn = startBtn;
            this.skillSlotsEl = skillSlotsEl;
            this.skillMenuEl = skillMenuEl;
            this.elementHandEl = elementHandEl;
            this.levelEl = levelEl;
            this.wiggle = new Jamble.Wiggle(this.player.el);
            this.slotManager = new Jamble.SlotManager(gameEl);
            this.handleWindowResize = () => { this.rebuildSlots(); };
            this.applyElementHand();
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onStartClick = this.onStartClick.bind(this);
            this.reset = this.reset.bind(this);
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
                startDash: (_speed, durationMs) => {
                    return this.player.startDash(durationMs);
                },
                addHorizontalImpulse: (speed, durationMs) => {
                    this.impulses.push({ speed, remainingMs: Math.max(0, durationMs) });
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
            this.impulses.length = 0;
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
        applyElementHand() {
            this.elementHandSlots.forEach(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                if (!this.levelElements.get(cardId))
                    return;
                const currentlyActive = this.levelElements.isActive(cardId);
                if (slot.active) {
                    const placed = this.ensurePlacementForElement(cardId);
                    if (!placed) {
                        slot.active = false;
                        if (currentlyActive)
                            this.levelElements.setActive(cardId, false);
                        this.releaseElementSlot(cardId);
                        return;
                    }
                    if (!currentlyActive)
                        this.levelElements.setActive(cardId, true);
                }
                else {
                    if (currentlyActive)
                        this.levelElements.setActive(cardId, false);
                    this.releaseElementSlot(cardId);
                }
            });
            this.emitElementHandChanged();
        }
        emitElementHandChanged() {
            try {
                window.dispatchEvent(new CustomEvent('jamble:elementHandChanged', { detail: this.getElementHand() }));
            }
            catch (_e) { }
        }
        getElementHand() {
            return this.elementHandSlots.map((slot, index) => {
                if (!slot.cardId) {
                    return { id: 'placeholder-' + index, definitionId: 'placeholder', name: 'Empty', type: 'empty', emoji: '…', active: false, available: false };
                }
                const meta = this.elementInstances.get(slot.cardId) || this.elementDeckPool.find(card => card.id === slot.cardId);
                if (!meta) {
                    return { id: slot.cardId, definitionId: 'unknown', name: 'Unknown', type: 'empty', emoji: '❔', active: false, available: false };
                }
                return { id: slot.cardId, definitionId: meta.definitionId, name: meta.name, type: meta.type, emoji: meta.emoji || '❔', active: slot.active, available: true };
            });
        }
        getElementDeck() {
            return this.elementDeckPool.slice();
        }
        setElementCardActive(id, active) {
            const slot = this.elementHandSlots.find(s => s.cardId === id);
            if (!slot)
                return;
            if (!slot.cardId)
                return;
            if (slot.active === active)
                return;
            slot.active = active;
            this.applyElementHand();
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
        bind() {
            document.addEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.addEventListener('click', this.reset);
            this.startBtn.addEventListener('click', this.onStartClick);
        }
        unbind() {
            document.removeEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.removeEventListener('click', this.reset);
            this.startBtn.removeEventListener('click', this.onStartClick);
        }
        showIdleControls() {
            this.startBtn.style.display = 'block';
            if (this.skillSlotsEl)
                this.skillSlotsEl.style.display = 'flex';
            if (this.skillMenuEl)
                this.skillMenuEl.style.display = 'flex';
            if (this.elementHandEl)
                this.elementHandEl.style.display = 'flex';
            this.emitElementHandChanged();
        }
        hideIdleControls() {
            this.startBtn.style.display = 'none';
            if (this.skillSlotsEl)
                this.skillSlotsEl.style.display = 'flex';
            if (this.skillMenuEl)
                this.skillMenuEl.style.display = 'none';
            if (this.elementHandEl)
                this.elementHandEl.style.display = 'none';
        }
        onPointerDown(e) {
            if (e.target === this.resetBtn || e.target === this.startBtn)
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
            return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top && pr.top < tr.bottom;
        }
        reachedRight() {
            const rightLimit = this.gameEl.offsetWidth - Jamble.Settings.current.playerStartOffset;
            return this.player.getRight(this.gameEl.offsetWidth) >= rightLimit;
        }
        reachedLeft() { return this.player.x <= Jamble.Settings.current.playerStartOffset; }
        handleEdgeArrival(nextDirection, align) {
            align();
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
            this.direction = nextDirection;
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
                if (this.skills.isEquipped('move')) {
                    const base = Jamble.Settings.current.playerSpeed;
                    const dx = base * deltaSec * this.direction;
                    this.player.moveX(dx);
                }
                if (this.impulses.length > 0) {
                    let sum = 0;
                    for (const imp of this.impulses)
                        sum += Math.max(0, imp.speed);
                    const dxImp = sum * deltaSec * this.direction;
                    if (dxImp !== 0)
                        this.player.moveX(dxImp);
                    for (const imp of this.impulses)
                        imp.remainingMs -= deltaMs;
                    this.impulses = this.impulses.filter(i => i.remainingMs > 0);
                }
                if (this.direction === 1 && this.reachedRight()) {
                    this.handleEdgeArrival(-1, () => this.player.snapRight(this.gameEl.offsetWidth));
                }
                else if (this.direction === -1 && this.reachedLeft()) {
                    this.handleEdgeArrival(1, () => this.player.setX(Jamble.Settings.current.playerStartOffset));
                }
                this.levelElements.tick(deltaMs);
            }
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
            if (!this.player.frozenStart && !this.player.frozenDeath && hitElement) {
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
        debugActiveSlots() {
            return Array.from(this.elementSlots.values()).map(slot => ({ id: slot.id, type: slot.type, elementId: slot.elementId, elementType: slot.elementType }));
        }
        rebuildSlots() {
            this.slotManager.rebuild();
            this.refreshActiveElementPlacements();
        }
        refreshActiveElementPlacements() {
            this.elementSlots.clear();
            this.elementHandSlots.forEach(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                this.slotManager.releaseSlot(cardId);
            });
            this.elementHandSlots.forEach(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                if (!slot.active)
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
        }
        ensurePlacementForElement(cardId) {
            const meta = this.elementInstances.get(cardId);
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
            this.applySlotToElement(element, slot);
            return true;
        }
        applySlotToElement(element, slot) {
            if (element instanceof Jamble.BirdElement) {
                element.assignSlot(slot);
                return;
            }
            if (element instanceof Jamble.TreeElement) {
                element.setLeftPct(slot.xPercent);
                const host = element.el.parentElement;
                if (host)
                    element.applyVerticalFromSlot(slot, host);
                return;
            }
            if (Jamble.isPositionableLevelElement(element)) {
                element.setLeftPct(slot.xPercent);
            }
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
