"use strict";
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
            const factoryOptions = {
                id: instId,
                manager: options.manager,
                host: options.host,
                config: cfg
            };
            return desc.create(factoryOptions);
        }
    }
    Jamble.LevelElementRegistry = LevelElementRegistry;
    class TreeElement {
        constructor(id, el) {
            this.type = 'tree';
            this.collidable = true;
            this.defaultDisplay = '';
            this.initialized = false;
            this.id = id;
            this.el = el;
        }
        rect() { return this.el.getBoundingClientRect(); }
        setLeftPct(pct) {
            const n = Math.max(0, Math.min(100, pct));
            this.el.style.left = n.toFixed(1) + '%';
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
    class BirdElement {
        constructor(id, el) {
            this.type = 'bird';
            this.collidable = true;
            this.defaultDisplay = '';
            this.initialized = false;
            this.id = id;
            this.el = el;
            this.el.classList.add('jamble-bird');
            this.el.textContent = '🐦';
        }
        rect() { return this.el.getBoundingClientRect(); }
        init() {
            if (this.initialized)
                return;
            this.initialized = true;
            const current = this.el.style.display;
            this.defaultDisplay = current && current !== 'none' ? current : '';
            this.el.style.display = 'none';
        }
        activate() {
            this.el.style.display = this.defaultDisplay || '';
        }
        deactivate() {
            this.el.style.display = 'none';
        }
        dispose() {
            this.el.style.display = 'none';
        }
    }
    Jamble.BirdElement = BirdElement;
    class LevelElementManager {
        constructor(registry) {
            this.elements = new Map();
            this.activeIds = new Set();
            this.registry = null;
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
                instanceId: descriptorId
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
            if (isPositionableLevelElement(el))
                return el;
            return undefined;
        }
        getPositionablesByType(type) {
            const list = [];
            this.activeIds.forEach(id => {
                const el = this.elements.get(id);
                if (!el || el.type !== type)
                    return;
                if (isPositionableLevelElement(el))
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
    Jamble.CoreDeckConfig = {
        pool: [
            { id: 'treeA', definitionId: 'tree.basic', name: 'Tree A', type: 'tree', quantity: 3 },
            { id: 'birdA', definitionId: 'bird.basic', name: 'Bird A', type: 'bird', quantity: 3 }
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
            const qty = Math.max(1, (_a = blueprint.quantity) !== null && _a !== void 0 ? _a : 1);
            for (let i = 0; i < qty; i++) {
                const id = generateCardId(blueprint.id, i);
                deck.push({
                    id,
                    definitionId: blueprint.definitionId,
                    name: qty > 1 ? blueprint.name + ' ' + (i + 1) : blueprint.name,
                    type: blueprint.type,
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
        landEaseMs: 100,
    };
    class SettingsStore {
        constructor(initial) {
            this._loadedFrom = null;
            this._activeName = null;
            this._profileBaseline = null;
            this._skills = { loadout: { movement: ['move', 'jump', 'dash'], utility: [], ultimate: [] }, configs: {} };
            this._skillsBaseline = null;
            this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
            this._elementsBaseline = null;
            this._current = { ...embeddedDefaults, ...(initial !== null && initial !== void 0 ? initial : {}) };
        }
        get elements() {
            return {
                deck: this._elements.deck.map(card => ({ ...card })),
                hand: this._elements.hand.map(slot => ({ ...slot }))
            };
        }
        get current() { return this._current; }
        get source() { return this._loadedFrom; }
        get activeName() { return this._activeName; }
        get skills() { return this._skills; }
        update(patch) {
            this._current = { ...this._current, ...patch };
        }
        reset() {
            this._current = { ...embeddedDefaults };
            this._skills = { loadout: { movement: ['move', 'jump', 'dash'], utility: [], ultimate: [] }, configs: {} };
            this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
        }
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
            this._elementsBaseline = {
                deck: this._elements.deck.map(card => ({ ...card })),
                hand: this._elements.hand.map(slot => ({ ...slot }))
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
            if (this._elementsBaseline) {
                this._elements = {
                    deck: this._elementsBaseline.deck.map(card => ({ ...card })),
                    hand: this._elementsBaseline.hand.map(slot => ({ ...slot }))
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
                    this._skills = { loadout: { movement: ['move', 'jump', 'dash'], utility: [], ultimate: [] }, configs: {
                            jump: { strength: this._current.jumpStrength },
                            dash: { speed: (_a = this._current.dashSpeed) !== null && _a !== void 0 ? _a : 280, durationMs: (_b = this._current.dashDurationMs) !== null && _b !== void 0 ? _b : 220, cooldownMs: 150 }
                        } };
                }
                this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
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
                this._skills = { loadout: { movement: ['move', 'jump', 'dash'], utility: [], ultimate: [] }, configs: { jump: { strength: this._current.jumpStrength }, dash: { speed: 280, durationMs: 220, cooldownMs: 150 } } };
                this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
            }
        }
        setElements(next) {
            this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
        }
        toJSON() {
            return {
                ...this._current,
                game: { ...this._current },
                skills: { loadout: this._skills.loadout, configs: this._skills.configs },
                elements: {
                    deck: this._elements.deck.map(card => ({ ...card })),
                    hand: this._elements.hand.map(slot => ({ ...slot }))
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
    function registerCoreElements(registry, hostResolvers) {
        registry.register({
            id: 'tree.basic',
            name: 'Tree',
            type: 'tree',
            defaults: {},
            create: ({ id, host }) => {
                const el = host || hostResolvers.ensureTreeDom(id.replace(/[^0-9]+/g, '') || id);
                return new Jamble.TreeElement(id, el);
            }
        });
        registry.register({
            id: 'bird.basic',
            name: 'Bird',
            type: 'bird',
            defaults: {},
            create: ({ id, host }) => {
                const el = host || hostResolvers.ensureBirdDom(id);
                if (!el.classList.contains('jamble-bird'))
                    el.classList.add('jamble-bird');
                el.textContent = '🐦';
                return new Jamble.BirdElement(id, el);
            }
        });
    }
    Jamble.registerCoreElements = registerCoreElements;
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
            this.landCbs = [];
            this.wasGrounded = true;
            this.impulses = [];
            this.idleShuffleRemaining = 0;
            this.shuffleAllowanceInitialized = false;
            this.root = root;
            const gameEl = root.querySelector('.jamble-game');
            const playerEl = root.querySelector('.jamble-player');
            const t1 = root.querySelector('.jamble-tree[data-tree="1"]');
            const t2 = root.querySelector('.jamble-tree[data-tree="2"]');
            const cdEl = root.querySelector('.jamble-countdown');
            const resetBtn = root.querySelector('.jamble-reset');
            const levelEl = root.querySelector('.jamble-level');
            const startBtn = root.querySelector('.jamble-start');
            const shuffleBtn = root.querySelector('.jamble-shuffle');
            const skillSlotsEl = root.querySelector('#skill-slots');
            const skillMenuEl = root.querySelector('#skill-menu');
            const elementHandEl = root.querySelector('#element-hand');
            if (!gameEl || !playerEl || !t1 || !t2 || !cdEl || !resetBtn || !startBtn || !shuffleBtn) {
                throw new Error('Jamble: missing required elements');
            }
            this.gameEl = gameEl;
            this.player = new Jamble.Player(playerEl);
            this.elementRegistry = new Jamble.LevelElementRegistry();
            this.levelElements = new Jamble.LevelElementManager(this.elementRegistry);
            Jamble.registerCoreElements(this.elementRegistry, {
                ensureTreeDom: (label) => this.ensureTreeDom(label),
                ensureBirdDom: (id) => this.ensureBirdDom(id)
            });
            this.elementRegistry.register({
                id: 'bird.basic',
                name: 'Bird',
                type: 'tree',
                defaults: {},
                create: ({ id, host }) => {
                    if (!host)
                        throw new Error('Bird element requires a host element');
                    if (!host.classList.contains('jamble-bird'))
                        host.classList.add('jamble-bird');
                    host.textContent = '🐦';
                    return new Jamble.BirdElement(id, host);
                }
            });
            const treeHostOrder = [t1, t2, this.ensureTreeDom('3')];
            let nextTreeHostIndex = 0;
            const nextTreeHost = () => {
                if (!treeHostOrder[nextTreeHostIndex]) {
                    const label = String(nextTreeHostIndex + 1);
                    treeHostOrder[nextTreeHostIndex] = this.ensureTreeDom(label);
                }
                return treeHostOrder[nextTreeHostIndex++];
            };
            const elementHosts = {};
            const resolveHost = (card) => {
                if (elementHosts[card.id])
                    return elementHosts[card.id];
                let host;
                if (card.definitionId === 'tree.basic')
                    host = nextTreeHost();
                else if (card.definitionId === 'bird.basic')
                    host = this.ensureBirdDom(card.id);
                else
                    host = this.ensureTreeDom(String(nextTreeHostIndex + 1));
                elementHosts[card.id] = host;
                return host;
            };
            const canonicalElements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
            this.elementDeckPool = canonicalElements.deck.map(card => ({ ...card }));
            this.elementDeckPool.forEach(card => {
                const host = resolveHost(card);
                const instance = this.levelElements.spawnFromRegistry(card.definitionId, { instanceId: card.id, host, config: card.config, active: false });
                if (instance)
                    this.elementInstances.set(card.id, { definitionId: card.definitionId, name: card.name, type: card.type, config: card.config });
            });
            this.elementHandSlots = canonicalElements.hand.map(slot => ({ ...slot }));
            this.countdown = new Jamble.Countdown(cdEl);
            this.resetBtn = resetBtn;
            this.startBtn = startBtn;
            this.shuffleBtn = shuffleBtn;
            this.skillSlotsEl = skillSlotsEl;
            this.skillMenuEl = skillMenuEl;
            this.elementHandEl = elementHandEl;
            this.levelEl = levelEl;
            this.wiggle = new Jamble.Wiggle(this.player.el);
            this.applyElementHand();
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onStartClick = this.onStartClick.bind(this);
            this.onShuffleClick = this.onShuffleClick.bind(this);
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
            this.impulses.length = 0;
            this.idleShuffleRemaining = 0;
            this.shuffleAllowanceInitialized = false;
            this.updateShuffleButtonState();
        }
        ensureTreeDom(label) {
            const existing = this.gameEl.querySelector('.jamble-tree[data-tree="' + label + '"]');
            if (existing)
                return existing;
            const el = document.createElement('div');
            el.className = 'jamble-tree';
            el.setAttribute('data-tree', label);
            el.style.left = '50%';
            el.style.display = 'none';
            this.gameEl.appendChild(el);
            return el;
        }
        ensureBirdDom(id) {
            const existing = this.gameEl.querySelector('.jamble-bird[data-bird="' + id + '"]');
            if (existing)
                return existing;
            const el = document.createElement('div');
            el.className = 'jamble-bird';
            el.setAttribute('data-bird', id);
            el.textContent = '🐦';
            el.style.left = '50%';
            el.style.display = 'none';
            this.gameEl.appendChild(el);
            return el;
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
            this.shuffleAllowanceInitialized = false;
            this.idleShuffleRemaining = 0;
            this.showIdleControls();
            this.direction = 1;
            this.level = 0;
            this.updateLevel();
        }
        applyElementHand(triggerShuffle = true) {
            let activeCount = 0;
            this.elementHandSlots.forEach(slot => {
                const cardId = slot.cardId;
                if (!cardId)
                    return;
                if (!this.levelElements.get(cardId))
                    return;
                this.levelElements.setActive(cardId, slot.active);
                if (slot.active && this.levelElements.isActive(cardId))
                    activeCount++;
            });
            if (triggerShuffle && activeCount > 0)
                this.shuffleElements();
            this.updateShuffleButtonState();
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
                    return { id: 'placeholder-' + index, definitionId: 'placeholder', name: 'Empty', type: 'empty', active: false, available: false };
                }
                const meta = this.elementInstances.get(slot.cardId) || this.elementDeckPool.find(card => card.id === slot.cardId);
                if (!meta) {
                    return { id: slot.cardId, definitionId: 'unknown', name: 'Unknown', type: 'empty', active: false, available: false };
                }
                return { id: slot.cardId, definitionId: meta.definitionId, name: meta.name, type: meta.type, active: slot.active, available: true };
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
        onShuffleClick() {
            if (!this.awaitingStartTap || this.waitGroundForStart)
                return;
            if (!Jamble.Settings.current.shuffleEnabled)
                return;
            if (!this.shuffleAllowanceInitialized)
                this.startIdleShuffleSession();
            if (this.idleShuffleRemaining <= 0)
                return;
            this.shuffleElements();
            this.idleShuffleRemaining = Math.max(0, this.idleShuffleRemaining - 1);
            this.updateShuffleButtonState();
        }
        shuffleElements() {
            const trees = this.levelElements.getPositionablesByType('tree');
            if (trees.length === 0)
                return;
            const min = Jamble.Settings.current.treeEdgeMarginPct;
            const max = 100 - Jamble.Settings.current.treeEdgeMarginPct;
            const gap = Math.max(0, Jamble.Settings.current.treeMinGapPct);
            const usable = Math.max(0, max - min);
            const totalGap = gap * Math.max(0, trees.length - 1);
            const free = Math.max(0, usable - totalGap);
            const order = trees.slice();
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = order[i];
                order[i] = order[j];
                order[j] = tmp;
            }
            const weights = order.map(() => Math.random());
            const weightTotal = weights.reduce((acc, w) => acc + w, 0);
            let cursor = min;
            for (let i = 0; i < order.length; i++) {
                const share = weightTotal > 0 ? (weights[i] / weightTotal) * free : (order.length > 0 ? free / order.length : 0);
                cursor += share;
                order[i].setLeftPct(cursor);
                if (i < order.length - 1)
                    cursor += gap;
            }
        }
        startIdleShuffleSession() {
            this.shuffleAllowanceInitialized = true;
            if (!Jamble.Settings.current.shuffleEnabled) {
                this.idleShuffleRemaining = 0;
            }
            else {
                this.idleShuffleRemaining = Math.max(0, Math.round(Jamble.Settings.current.shuffleLimit));
            }
            this.updateShuffleButtonState();
        }
        updateShuffleButtonState() {
            if (!this.shuffleBtn)
                return;
            const enabledSetting = Jamble.Settings.current.shuffleEnabled;
            const idleVisible = this.awaitingStartTap && !this.waitGroundForStart && this.player.frozenStart;
            const activeTrees = this.levelElements.getByType('tree').length;
            if (!enabledSetting || !idleVisible) {
                this.shuffleBtn.style.display = 'none';
                this.shuffleBtn.disabled = true;
                this.shuffleBtn.title = enabledSetting ? 'Shuffle available during idle' : 'Shuffle disabled';
                return;
            }
            this.shuffleBtn.style.display = 'block';
            const remaining = this.idleShuffleRemaining;
            const usable = remaining > 0 && activeTrees > 0;
            this.shuffleBtn.disabled = !usable;
            if (!usable) {
                if (activeTrees === 0)
                    this.shuffleBtn.title = 'No elements to shuffle';
                else
                    this.shuffleBtn.title = 'No shuffles left';
            }
            else {
                this.shuffleBtn.title = 'Shuffle (' + remaining + ' left)';
            }
        }
        refreshShuffleSettings() {
            if (!Jamble.Settings.current.shuffleEnabled) {
                this.idleShuffleRemaining = 0;
                this.shuffleAllowanceInitialized = false;
            }
            else if (this.player.frozenStart && this.awaitingStartTap && !this.waitGroundForStart) {
                const limit = Math.max(0, Math.round(Jamble.Settings.current.shuffleLimit));
                if (!this.shuffleAllowanceInitialized) {
                    this.idleShuffleRemaining = limit;
                    this.shuffleAllowanceInitialized = true;
                }
                else {
                    this.idleShuffleRemaining = Math.min(this.idleShuffleRemaining, limit);
                }
            }
            this.updateShuffleButtonState();
        }
        bind() {
            document.addEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.addEventListener('click', this.reset);
            this.startBtn.addEventListener('click', this.onStartClick);
            this.shuffleBtn.addEventListener('click', this.onShuffleClick);
        }
        unbind() {
            document.removeEventListener('pointerdown', this.onPointerDown);
            this.resetBtn.removeEventListener('click', this.reset);
            this.startBtn.removeEventListener('click', this.onStartClick);
            this.shuffleBtn.removeEventListener('click', this.onShuffleClick);
        }
        showIdleControls() {
            this.startBtn.style.display = 'block';
            if (this.skillSlotsEl)
                this.skillSlotsEl.style.display = 'flex';
            if (this.skillMenuEl)
                this.skillMenuEl.style.display = 'flex';
            if (this.elementHandEl)
                this.elementHandEl.style.display = 'flex';
            this.startIdleShuffleSession();
            this.emitElementHandChanged();
        }
        hideIdleControls() {
            this.startBtn.style.display = 'none';
            this.shuffleBtn.style.display = 'none';
            this.shuffleBtn.disabled = true;
            this.shuffleBtn.title = 'Shuffle unavailable';
            this.shuffleAllowanceInitialized = false;
            if (this.skillSlotsEl)
                this.skillSlotsEl.style.display = 'flex';
            if (this.skillMenuEl)
                this.skillMenuEl.style.display = 'none';
            if (this.elementHandEl)
                this.elementHandEl.style.display = 'none';
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
                this.shuffleAllowanceInitialized = false;
                this.updateShuffleButtonState();
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
                    const dtMs = deltaSec * 1000;
                    for (const imp of this.impulses)
                        imp.remainingMs -= dtMs;
                    this.impulses = this.impulses.filter(i => i.remainingMs > 0);
                }
                if (this.direction === 1 && this.reachedRight()) {
                    this.handleEdgeArrival(-1, () => this.player.snapRight(this.gameEl.offsetWidth));
                }
                else if (this.direction === -1 && this.reachedLeft()) {
                    this.handleEdgeArrival(1, () => this.player.setX(Jamble.Settings.current.playerStartOffset));
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
    Jamble.Settings.loadFrom('dist/profiles/default.json').finally(function () {
        try {
            window.dispatchEvent(new CustomEvent('jamble:settingsLoaded'));
        }
        catch (_e) { }
    });
})();
