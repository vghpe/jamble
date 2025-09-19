/// <reference path="./player.ts" />
/// <reference path="./elements/types.ts" />
/// <reference path="./elements/manager.ts" />
/// <reference path="./elements/tree.ts" />
/// <reference path="./elements/bird.ts" />
/// <reference path="./elements/laps.ts" />
/// <reference path="./hand-controller.ts" />
/// <reference path="./run-controller.ts" />
/// <reference path="./game-ui.ts" />
/// <reference path="./input-controller.ts" />
/// <reference path="./countdown.ts" />
/// <reference path="./wiggle.ts" />
/// <reference path="./settings.ts" />
/// <reference path="./elements/core-elements.ts" />
/// <reference path="./skills/types.ts" />
/// <reference path="./skills/manager.ts" />
/// <reference path="./skills/jump.ts" />
/// <reference path="./skills/dash.ts" />
namespace Jamble {
  export class Game {
    private root: HTMLElement;
    private gameEl: HTMLDivElement;
    private player: Player;
    private levelElements: LevelElementManager;
    private elementRegistry: LevelElementRegistry;
    private hand: HandController;
    private run: RunController;
    private countdown: Countdown;
    private ui: GameUi;
    private input: InputController;
    private wiggle: Wiggle;
    private lastTime: number | null = null;
    private rafId: number | null = null;
    private awaitingStartTap: boolean = false;
    private startCountdownTimer: number | null = null;
    private direction: 1 | -1 = 1;
    private level: number = 0;
    private deathWiggleTimer: number | null = null;
    private showResetTimer: number | null = null;
    private waitGroundForStart: boolean = false;
    private inCountdown: boolean = false;
    private slotManager: SlotManager;
    private resizeObserver: ResizeObserver | null = null;
    private watchingResize: boolean = false;
    private handleWindowResize: () => void;
    private elementSlots = new Map<string, SlotDefinition>();
    private elementEditingEnabled: boolean = false;
    private elementOriginOverrides = new Map<string, ElementOrigin>();
    private pendingOriginElementIds = new Set<string>();
    private pendingOriginFrame: number | null = null;
    // Skills
    private skills: SkillManager;
    private landCbs: Array<() => void> = [];
    private wasGrounded: boolean = true;
    private impulses: Array<{ speed: number; remainingMs: number }> = [];

    constructor(root: HTMLElement){
      this.root = root;
      const gameEl = root.querySelector('.jamble-game') as HTMLDivElement | null;
      const playerEl = root.querySelector('.jamble-player') as HTMLElement | null;
      const cdEl = root.querySelector('.jamble-countdown') as HTMLElement | null;
      const resetBtn = root.querySelector('.jamble-reset') as HTMLButtonElement | null;
      const levelEl = root.querySelector('.jamble-level') as HTMLElement | null;
      const startBtn = root.querySelector('.jamble-start') as HTMLButtonElement | null;
      const skillSlotsEl = root.querySelector('#skill-slots') as HTMLElement | null;
      const skillMenuEl = root.querySelector('#skill-menu') as HTMLElement | null;
      const elementHandEl = root.querySelector('#element-hand') as HTMLElement | null;

      if (!gameEl || !playerEl || !cdEl || !resetBtn || !startBtn){
        throw new Error('Jamble: missing required elements');
      }

      this.gameEl = gameEl;
      this.player = new Player(playerEl);
      this.elementRegistry = new LevelElementRegistry();
      this.levelElements = new LevelElementManager(gameEl, this.elementRegistry);
      Jamble.registerCoreElements(this.elementRegistry);

      this.slotManager = new SlotManager(gameEl);
      const canonicalElements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
      this.hand = new HandController(this.levelElements, canonicalElements);
      this.run = new RunController();
      this.run.setInitialLaps(this.hand.getLapsValue());
      this.countdown = new Countdown(cdEl);
      this.ui = new GameUi({
        startButton: startBtn,
        resetButton: resetBtn,
        skillSlots: skillSlotsEl,
        skillMenu: skillMenuEl,
        elementHand: elementHandEl,
        levelLabel: levelEl
      });
      this.wiggle = new Wiggle(this.player.el);
      this.handleWindowResize = () => { this.rebuildSlots(); };

      this.applyElementHand();

      this.onStartClick = this.onStartClick.bind(this);
      this.reset = this.reset.bind(this);
      this.loop = this.loop.bind(this);

      // Capabilities facade for skills
      const caps: PlayerCapabilities = {
        requestJump: (strength?: number) => {
          if (this.player.isJumping || this.player.frozenDeath) return false;
          // Use built-in jump to keep side effects consistent, then override strength if provided
          this.player.jump();
          if (typeof strength === 'number') this.player.velocity = strength;
          return true;
        },
        startDash: (_speed: number, durationMs: number) => {
          return this.player.startDash(durationMs);
        },
        addHorizontalImpulse: (speed: number, durationMs: number) => {
          this.impulses.push({ speed, remainingMs: Math.max(0, durationMs) });
        },
        setVerticalVelocity: (vy: number) => { this.player.velocity = vy; },
        onLand: (cb: () => void) => { this.landCbs.push(cb); }
      };

      // Skill manager and default registry/loadout
      this.skills = new SkillManager(caps, { movement: 4 });
      // Register skills with defaults
      this.skills.register({ id: 'move', name: 'Move', slot: 'movement', priority: 5, defaults: {}, create: (_cfg) => new MoveSkill('move', 5) });
      this.skills.register({ id: 'jump', name: 'Jump', slot: 'movement', priority: 10, defaults: { strength: Jamble.Settings.skills.configs.jump?.strength ?? Jamble.Settings.current.jumpStrength }, create: (cfg) => new JumpSkill('jump', 10, cfg) });
      this.skills.register({ id: 'dash', name: 'Dash', slot: 'movement', priority: 20, defaults: { speed: Jamble.Settings.skills.configs.dash?.speed ?? Jamble.Settings.current.dashSpeed, durationMs: Jamble.Settings.skills.configs.dash?.durationMs ?? Jamble.Settings.current.dashDurationMs, cooldownMs: Jamble.Settings.skills.configs.dash?.cooldownMs ?? 150 }, create: (cfg) => new DashSkill('dash', 20, cfg) });
      // Initialize configs from loaded skills profile if present
      const sj = Jamble.Settings.skills.configs.jump; if (sj) this.skills.setConfig('jump', sj);
      const sd = Jamble.Settings.skills.configs.dash; if (sd) this.skills.setConfig('dash', sd);
      // Equip from loadout or fallback
      const loadoutMoves = Jamble.Settings.skills.loadout.movement || ['move','jump','dash'];
      loadoutMoves.forEach(id => { try { this.skills.equip(id); } catch(_e){} });

      this.input = new InputController({
        player: this.player,
        skills: this.skills,
        ui: this.ui,
        gameEl: this.gameEl,
        getWaitGroundForStart: () => this.waitGroundForStart
      });
    }
    public getSkillManager(): SkillManager { return this.skills; }

    start(): void {
      this.ensureSlotResizeMonitoring();
      this.rebuildSlots();
      this.bind();
      this.reset();
      this.rafId = window.requestAnimationFrame(this.loop);
    }

    stop(): void {
      this.unbind();
      if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.teardownSlotResizeMonitoring();
      this.wiggle.stop();
      this.countdown.hide();
      this.impulses.length = 0;
    }

    reset(): void {
      this.wiggle.stop();
      this.countdown.hide();
      if (this.startCountdownTimer !== null) { window.clearTimeout(this.startCountdownTimer); this.startCountdownTimer = null; }
      if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
      if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
      this.impulses.length = 0;
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

    private applyElementHand(): void {
      this.hand.forEachSlot(slot => {
        const cardId = slot.cardId;
        if (!cardId) return;
        const element = this.levelElements.get(cardId);
        if (!element) return;
        const currentlyActive = this.levelElements.isActive(cardId);
        if (slot.isActive()){
          if (!currentlyActive) this.levelElements.setActive(cardId, true);
          const placed = this.ensurePlacementForElement(cardId);
          if (!placed){
            slot.setActive(false);
            this.levelElements.setActive(cardId, false);
            this.releaseElementSlot(cardId);
          }
        } else {
          if (currentlyActive) this.levelElements.setActive(cardId, false);
          this.releaseElementSlot(cardId);
        }
      });
      if (this.isIdleState()){
        this.run.applyLapValue(this.hand.getLapsValue());
      }
      this.emitElementHandChanged();
      this.updateRunDisplay();
    }

    private emitElementHandChanged(): void {
      try {
        window.dispatchEvent(new CustomEvent('jamble:elementHandChanged', { detail: this.getElementHand() }));
      } catch(_e){}
    }

    public getElementHand(): ReadonlyArray<{ id: string; definitionId: string; name: string; type: LevelElementType; emoji: string; active: boolean; available: boolean }> {
      return this.hand.getHandView();
    }

    public getElementDeck(): ReadonlyArray<{ id: string; definitionId: string; name: string; type: LevelElementType; emoji: string }> {
      return this.hand.getDeckEntries();
    }

    public setElementCardActive(id: string, active: boolean): void {
      if (this.hand.isLapsCard(id)) return;
      const wasActive = this.hand.isCardActive(id);
      if (!active && wasActive && !this.elementEditingEnabled) return;
      const changed = this.hand.setCardActive(id, active);
      if (!changed) return;
      this.applyElementHand();
    }

    public incrementLaps(): number {
      if (!this.isIdleState()) return this.hand.getLapsValue();
      const next = this.hand.incrementLaps();
      this.run.applyLapValue(next);
      this.updateRunDisplay();
      this.emitElementHandChanged();
      return next;
    }

    public getLapsState(): { value: number; target: number; remaining: number; max: number; runs: number } {
      return {
        value: this.hand.getLapsValue(),
        target: this.run.getLapsTarget(),
        remaining: this.run.getLapsRemaining(),
        max: 9,
        runs: this.run.getRunsCompleted()
      };
    }

    public isIdle(): boolean {
      return this.isIdleState();
    }

    private onStartClick(): void {
      if (this.waitGroundForStart) return; // cannot start until grounded at edge
      if (!this.awaitingStartTap) return;
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

    private bind(): void {
      this.input.bind();
      this.ui.getResetButton().addEventListener('click', this.reset);
      this.ui.getStartButton().addEventListener('click', this.onStartClick);
    }
    private unbind(): void {
      this.input.unbind();
      this.ui.getResetButton().removeEventListener('click', this.reset);
      this.ui.getStartButton().removeEventListener('click', this.onStartClick);
    }

    private showIdleControls(): void {
      this.ui.showIdleControls();
      this.emitElementHandChanged();
    }
    private hideIdleControls(): void {
      this.ui.hideIdleControls();
    }

    private updateLevel(): void {
      this.updateRunDisplay();
    }
    private collisionWith(ob: LevelElement): boolean {
      const pr = this.player.el.getBoundingClientRect();
      const tr = ob.rect();
      return pr.left < tr.right && pr.right > tr.left && pr.bottom > tr.top && pr.top < tr.bottom;
    }
    private reachedRight(): boolean {
      // Consider a virtual wall offset from the right by playerStartOffset
      const rightLimit = this.gameEl.offsetWidth - Jamble.Settings.current.playerStartOffset;
      return this.player.getRight(this.gameEl.offsetWidth) >= rightLimit;
    }
    private reachedLeft(): boolean { return this.player.x <= Jamble.Settings.current.playerStartOffset; }

    private handleEdgeArrival(nextDirection: 1 | -1, align: () => void): void {
      align();
      this.level += 1;
      if (Jamble.Settings.current.mode === 'idle'){
        const finished = this.run.handleEdgeArrival();
        if (finished){
          this.finishRun(nextDirection);
          this.updateLevel();
          return;
        }
        if (this.player.velocity > 0) this.player.velocity = -0.1;
        this.awaitingStartTap = false;
        this.waitGroundForStart = false;
        this.direction = nextDirection;
        this.updateLevel();
        return;
      }
      if (this.player.velocity > 0) this.player.velocity = -0.1;
      this.awaitingStartTap = false;
      this.waitGroundForStart = false;
      this.hideIdleControls();
      this.direction = nextDirection;
      this.updateLevel();
    }

    private loop(ts: number): void {
      if (this.lastTime === null) this.lastTime = ts;
      const deltaSec = Math.min((ts - this.lastTime) / 1000, 0.05);
      const deltaMs = deltaSec * 1000;
      const dt60 = deltaSec * 60;
      this.lastTime = ts;

      // Keep countdown position near player
      const cx = this.player.x + this.player.el.offsetWidth / 2;
      const cy = this.player.jumpHeight + this.player.el.offsetHeight + 10;
      this.countdown.updatePosition(cx, cy);

      // If mode switched to pingpong while idling, resume immediately
      if (Jamble.Settings.current.mode === 'pingpong' && this.player.frozenStart && !this.inCountdown && !this.player.frozenDeath){
        this.awaitingStartTap = false;
        this.waitGroundForStart = false;
        this.hideIdleControls();
        this.player.clearFrozenStart();
      }

      // Horizontal movement when not frozen/dead
      // Base auto-run applies only if Move is equipped; Dash contributes via accumulated impulses
      if (!this.player.frozenStart && !this.player.frozenDeath){
        if (this.skills.isEquipped('move')){
          const base = Jamble.Settings.current.playerSpeed;
          const dx = base * deltaSec * this.direction;
          this.player.moveX(dx);
        }

        // Apply horizontal impulses (e.g., from Dash). Sum all active speeds.
        if (this.impulses.length > 0){
          let sum = 0;
          for (const imp of this.impulses) sum += Math.max(0, imp.speed);
          const dxImp = sum * deltaSec * this.direction;
          if (dxImp !== 0) this.player.moveX(dxImp);
          // decrement remaining and cull finished
          for (const imp of this.impulses) imp.remainingMs -= deltaMs;
          this.impulses = this.impulses.filter(i => i.remainingMs > 0);
        }

        if (this.direction === 1 && this.reachedRight()){
          this.handleEdgeArrival(-1, () => this.player.snapRight(this.gameEl.offsetWidth));
        } else if (this.direction === -1 && this.reachedLeft()){
          this.handleEdgeArrival(1, () => this.player.setX(Jamble.Settings.current.playerStartOffset));
        }

        this.levelElements.tick(deltaMs);
      }

      // Vertical physics and dash timer
      this.player.update(dt60);
      this.player.updateDash(deltaMs);

      // Skills tick + land detection
      const grounded = this.player.jumpHeight === 0 && !this.player.isJumping;
      const sctx: SkillContext = {
        nowMs: performance.now(),
        grounded,
        velocityY: this.player.velocity,
        isDashing: this.player.isDashing,
        jumpHeight: this.player.jumpHeight,
        dashAvailable: !this.player.isDashing
      };
      this.skills.tick(sctx);
      if (!this.wasGrounded && grounded){
        this.skills.onLand(sctx);
        // fire simple onLand callbacks registered via caps
        const cbs = this.landCbs.slice(); this.landCbs.length = 0; cbs.forEach(cb => { try { cb(); } catch(_e){} });
      }
      this.wasGrounded = grounded;

      // If we reached a side while airborne, wait to grant start until grounded
      if (Jamble.Settings.current.mode === 'idle' && this.waitGroundForStart && this.player.jumpHeight === 0 && !this.player.isJumping){
        this.waitGroundForStart = false;
      this.awaitingStartTap = true;
      this.showIdleControls();
      }

      // Collision: wiggle + freeze; show reset button, no auto reset
      const hitElement = this.levelElements.someCollidable(el => this.collisionWith(el));
      if (!this.player.frozenStart && !this.player.frozenDeath && hitElement){
        this.player.setFrozenDeath();
        if (this.deathWiggleTimer !== null) { window.clearTimeout(this.deathWiggleTimer); this.deathWiggleTimer = null; }
        if (this.showResetTimer !== null) { window.clearTimeout(this.showResetTimer); this.showResetTimer = null; }
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

    private ensureSlotResizeMonitoring(): void {
      if (this.watchingResize) return;
      if (typeof ResizeObserver !== 'undefined'){
        this.resizeObserver = new ResizeObserver(() => { this.rebuildSlots(); });
        this.resizeObserver.observe(this.gameEl);
      }
      window.addEventListener('resize', this.handleWindowResize);
      this.watchingResize = true;
    }

    private teardownSlotResizeMonitoring(): void {
      if (!this.watchingResize) return;
      if (this.resizeObserver){
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      window.removeEventListener('resize', this.handleWindowResize);
      this.watchingResize = false;
    }

    public getSlotManager(): SlotManager {
      return this.slotManager;
    }

    public getElementSlot(cardId: string): SlotDefinition | undefined {
      return this.elementSlots.get(cardId);
    }

    public setElementOriginOverride(elementId: string, origin: ElementOrigin | null | undefined): void {
      if (!origin){
        this.elementOriginOverrides.delete(elementId);
      } else {
        this.elementOriginOverrides.set(elementId, origin);
      }
      const element = this.levelElements.get(elementId);
      const slot = element ? this.elementSlots.get(elementId) : undefined;
      if (element && slot){
        const origin = this.getEffectiveOrigin(element);
        const result = this.slotManager.applySlotToElement(element, slot, { origin });
        if (result.needsRetry) this.enqueueOriginRetry(element.id);
      }
    }

    public debugActiveSlots(): Array<{ id: string; type: SlotType; elementId: string | null; elementType: LevelElementType | null }> {
      return Array.from(this.elementSlots.values()).map(slot => ({ id: slot.id, type: slot.type, elementId: slot.elementId, elementType: slot.elementType }));
    }

    public recomputeSlots(): void {
      this.rebuildSlots();
    }

    public setElementEditMode(enabled: boolean): void {
      this.elementEditingEnabled = !!enabled;
    }

    public canEditElements(): boolean {
      return this.elementEditingEnabled;
    }

    private rebuildSlots(): void {
      this.slotManager.rebuild();
      this.refreshActiveElementPlacements();
    }

    private refreshActiveElementPlacements(): void {
      this.elementSlots.clear();
      this.hand.forEachSlot(slot => {
        const cardId = slot.cardId;
        if (!cardId) return;
        this.slotManager.releaseSlot(cardId);
      });
      this.hand.forEachSlot(slot => {
        const cardId = slot.cardId;
        if (!cardId) return;
        if (!slot.isActive()) return;
        if (!this.levelElements.isActive(cardId)) return;
        this.ensurePlacementForElement(cardId);
      });
    }

    private releaseElementSlot(cardId: string): void {
      const element = this.levelElements.get(cardId);
      if (element && element instanceof BirdElement){
        element.clearSlot();
      }
      this.slotManager.releaseSlot(cardId);
      this.elementSlots.delete(cardId);
      this.elementOriginOverrides.delete(cardId);
      this.pendingOriginElementIds.delete(cardId);
    }

    private ensurePlacementForElement(cardId: string): boolean {
      const meta = this.hand.getCardMeta(cardId);
      if (!meta) return false;
      const descriptor = this.elementRegistry.get(meta.definitionId);
      if (!descriptor) return false;
      const element = this.levelElements.get(cardId);
      if (!element) return false;
      const placement = descriptor.placement;
      if (!placement){
        return true;
      }

      const existing = this.slotManager.getSlotForElement(cardId);
      let slot: SlotDefinition | null = existing || null;
      if (!slot){
        slot = this.slotManager.acquireSlot(cardId, meta.type, placement);
      }
      if (!slot) return false;
      this.elementSlots.set(cardId, slot);
      const origin = this.getEffectiveOrigin(element);
      const result = this.slotManager.applySlotToElement(element, slot, { origin });
      if (result.needsRetry) this.enqueueOriginRetry(element.id);
      return true;
    }

    private isIdleState(): boolean {
      return this.awaitingStartTap && this.player.frozenStart && !this.inCountdown;
    }

    private updateRunDisplay(): void {
      const inRun = this.run.getState() === 'running';
      const value = inRun ? Math.max(this.run.getLapsRemaining(), 0) : Math.max(this.hand.getLapsValue(), 1);
      const text = String(value);
      this.ui.setRunDisplay(text);
    }

    private clearHandPlacements(): void {
      this.hand.forEachSlot(slot => {
        const cardId = slot.cardId;
        if (!cardId) return;
        if (this.levelElements.isActive(cardId)) this.levelElements.setActive(cardId, false);
        this.releaseElementSlot(cardId);
        slot.setActive(false);
      });
    }

    private resetHandForIdle(): void {
      this.clearHandPlacements();
      this.hand.resetForIdle();
      this.applyElementHand();
    }

    private finishRun(nextDirection: 1 | -1): void {
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
      this.impulses.length = 0;
      this.resetHandForIdle();
      this.updateRunDisplay();
    }

    private getEffectiveOrigin(element: LevelElement): ElementOrigin | null {
      const override = this.elementOriginOverrides.get(element.id);
      if (override) return override;
      if (typeof element.getOrigin === 'function'){
        const fromElement = element.getOrigin();
        if (fromElement) return fromElement;
      }
      return null;
    }

    private enqueueOriginRetry(elementId: string): void {
      this.pendingOriginElementIds.add(elementId);
      this.schedulePendingOriginPass();
    }

    private schedulePendingOriginPass(): void {
      if (this.pendingOriginFrame !== null) return;
      this.pendingOriginFrame = window.requestAnimationFrame(() => {
        this.pendingOriginFrame = null;
        if (this.pendingOriginElementIds.size === 0) return;
        const pending = Array.from(this.pendingOriginElementIds);
        this.pendingOriginElementIds.clear();
        let needsAnotherPass = false;
        for (const id of pending){
          const element = this.levelElements.get(id);
          if (!element) continue;
          const slot = this.elementSlots.get(id);
          if (!slot) continue;
          const origin = this.getEffectiveOrigin(element);
          const result = this.slotManager.applySlotToElement(element, slot, { origin });
          if (!result.originApplied && result.needsRetry){
            this.pendingOriginElementIds.add(id);
            needsAnotherPass = true;
          }
        }
        if (needsAnotherPass) this.schedulePendingOriginPass();
      });
    }
  }
}
