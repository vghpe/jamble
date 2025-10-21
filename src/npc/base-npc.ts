namespace Jamble {
  export type ArousalState = 'default' | 'minimum' | 'medium' | 'high' | 'very-high' | 'pain';
  export type NPCExpressionState = 'default' | 'enjoy' | 'aroused' | 'pain' | 'win';

  export interface NPCExpressionDescriptor {
    id: NPCExpressionState | string;
    emoji?: string;
    sprite?: {
      atlasId: string;
      frame: string;
    };
  }

  export interface NPCArousalConfig {
    baselineValue: number;
    decayRate: number;
    maxValue: number;
    minValue: number;
    sensitivity: number;
    painThreshold: number;
  }

  export interface NPCCrescendoConfig {
    targetArousalValue: number;
    arousalTolerance: number;
    riseRate: number;
    decayRate: number;
    threshold: number;
    maxValue: number;
  }

  export abstract class BaseNPC {
    protected name: string;
    protected arousalValue: number;
    protected arousalConfig: NPCArousalConfig;
    protected crescendoValue: number;
    protected crescendoConfig: NPCCrescendoConfig;
    protected crescendoThresholdReached: boolean = false;
    protected crescendoEnabled: boolean = true;  // Can be disabled when knobs retract
    protected inPainZone: boolean = false;
    protected painExpressionLocked: boolean = false;
    protected winExpressionLocked: boolean = false;
    protected arousalChangeListeners: Array<(value: number, npc: BaseNPC) => void> = [];
    protected arousalImpulseListeners: Array<(impulse: number, npc: BaseNPC) => void> = [];
    protected crescendoChangeListeners: Array<(value: number, npc: BaseNPC) => void> = [];
    protected crescendoThresholdListeners: Array<(npc: BaseNPC) => void> = [];
    protected painThresholdListeners: Array<(npc: BaseNPC) => void> = [];
    protected expressionChangeListeners: Array<(expression: NPCExpressionDescriptor, npc: BaseNPC) => void> = [];
    protected expressionDescriptor: NPCExpressionDescriptor;
    
    // Momentum system for spreading impulses over time
    protected arousalMomentum: number = 0;
    protected momentumSpreadDuration: number = 0.3; // seconds to spread impulse

    constructor(name: string, config?: Partial<NPCArousalConfig>) {
      this.name = name;
      
      // Default arousal configuration
      this.arousalConfig = {
        baselineValue: 0.2,
        decayRate: 0.001,
        maxValue: 6.0,
        minValue: -1.0,
        sensitivity: 1.0,
        painThreshold: 5.0,
        ...config
      };
      
      // Default crescendo configuration
      this.crescendoConfig = {
        targetArousalValue: 4.0,
        arousalTolerance: 0.5,
        riseRate: 0.2,
        decayRate: 0.1,
        threshold: 1.0,
        maxValue: 1.0
      };
      
      this.arousalValue = this.arousalConfig.baselineValue;
      this.crescendoValue = 0.1;
      this.expressionDescriptor = this.resolveExpression();
    }

    // === AROUSAL MANAGEMENT ===
    
    getName(): string {
      return this.name;
    }
    
    getArousalValue(): number {
      return this.arousalValue;
    }
    
    /**
     * Apply an arousal impulse (from knob hits, events, etc.)
     * @param intensity Base impulse intensity
     * @param player Optional player reference for softness/temperature effects
     * @param collisionType Optional collision type ('top' or 'side')
     */
    applyArousalImpulse(intensity: number, player?: Player, collisionType?: 'top' | 'side'): void {
      const oldValue = this.arousalValue;
      let adjustedIntensity = intensity * this.arousalConfig.sensitivity;
      let momentumAmount = 0;
      
      // Apply softness effect if player provided and it's a side collision
      if (player && collisionType === 'side') {
        const softness = player.getSoftness(); // 0-1 scale from UI
        
        // Softness 0.5 = baseline (current 0.3 side collision)
        // Harder (0.0) = approaches top collision (0.5)
        // Softer (1.0) = 30% of baseline (0.09 total)
        
        if (softness < 0.5) {
          // Harder: scale from baseline (0.3) up toward top strength (0.5)
          // At softness=0, we want to get close to 0.5 but not exceed it
          // Linear interpolation: 0.0 → ~0.45, 0.5 → 0.3
          const t = softness / 0.5; // 0 to 1
          const maxHardImpulse = 0.45; // Close to top but not quite
          adjustedIntensity = intensity * this.arousalConfig.sensitivity * (maxHardImpulse + t * (1.0 - maxHardImpulse));
        } else {
          // Softer: scale from baseline down, splitting into instant + momentum
          // At softness=0.5, instant=100%, momentum=0%
          // At softness=1.0, instant+momentum=30% of baseline
          const t = (softness - 0.5) / 0.5; // 0 to 1
          const totalScale = 1.0 - t * 0.7; // 1.0 → 0.3
          adjustedIntensity = intensity * this.arousalConfig.sensitivity * totalScale;
          
          // Split into instant (60%) and momentum (40%)
          const instantRatio = 0.6;
          momentumAmount = adjustedIntensity * (1 - instantRatio);
          adjustedIntensity *= instantRatio;
        }
      }
      
      // Apply instant impulse
      this.arousalValue = Math.max(
        this.arousalConfig.minValue,
        Math.min(this.arousalConfig.maxValue, this.arousalValue + adjustedIntensity)
      );
      
      // Add to momentum if applicable
      if (momentumAmount > 0) {
        this.arousalMomentum += momentumAmount;
      }
      
      // Check for pain threshold crossing
      this.checkPainThreshold();
      
      // Notify impulse listeners with the actual applied intensity
      const actualIntensity = this.arousalValue - oldValue;
      if (actualIntensity !== 0) {
        this.notifyArousalImpulseListeners(actualIntensity);
        this.notifyArousalListeners();
      }
    }
    
    /**
     * Set arousal value directly
     */
    setArousalValue(value: number): void {
      const oldValue = this.arousalValue;
      this.arousalValue = Math.max(
        this.arousalConfig.minValue,
        Math.min(this.arousalConfig.maxValue, value)
      );
      
      if (oldValue !== this.arousalValue) {
        this.notifyArousalListeners();
      }
    }
    
    /**
     * Get normalized arousal value (0-1) for UI display
     */
    getArousalNormalized(): number {
      const range = this.arousalConfig.maxValue - this.arousalConfig.minValue;
      return Math.max(0, Math.min(1, 
        (this.arousalValue - this.arousalConfig.minValue) / range
      ));
    }
    
    /**
     * Get normalized sensation value (0-1) for sensation panel display.
     * This is the raw sensation level independent of arousal interpretation.
     */
    getSensationNormalized(): number {
      return this.getArousalNormalized();
    }
    
    /**
     * Get pain threshold value for UI visualization
     */
    getPainThreshold(): number {
      return this.arousalConfig.painThreshold;
    }
    
    /**
     * Get min/max arousal range for UI visualization
     */
    getArousalRange(): { min: number; max: number } {
      return {
        min: this.arousalConfig.minValue,
        max: this.arousalConfig.maxValue
      };
    }
    
    /**
     * Get arousal state based on thresholds
     */
    getArousalState(): ArousalState {
      if (this.arousalValue < 0.5) return 'default';
      if (this.arousalValue < 1.5) return 'minimum';
      if (this.arousalValue < 2.5) return 'medium';
      if (this.arousalValue < 3.5) return 'high';
      if (this.arousalValue < 4.5) return 'very-high';
      return 'pain';
    }
    
    /**
     * Update arousal over time (decay towards baseline + apply momentum)
     * @param deltaTime Time elapsed in seconds
     * @param player Optional player reference for temperature-based decay
     */
    updateArousal(deltaTime: number, player?: Player): void {
      const oldValue = this.arousalValue;
      
      // Apply momentum (spread arousal over time)
      if (this.arousalMomentum > 0) {
        const momentumPerSecond = this.arousalMomentum / this.momentumSpreadDuration;
        const momentumThisFrame = Math.min(momentumPerSecond * deltaTime, this.arousalMomentum);
        this.arousalMomentum -= momentumThisFrame;
        
        this.arousalValue = Math.max(
          this.arousalConfig.minValue,
          Math.min(this.arousalConfig.maxValue, this.arousalValue + momentumThisFrame)
        );
      }
      
      // Apply decay
      let decay = this.arousalConfig.decayRate;
      
      // Temperature affects decay rate (unless in pain zone)
      if (player && !this.inPainZone) {
        const temperature = player.getTemperature(); // 0-1 scale from UI
        // Cold (0) = 0.5x decay, Hot (1) = 1.0x decay
        decay *= (0.5 + temperature * 0.5);
      }
      
      // Pain zone: use hardcoded fast decay regardless of temperature
      if (this.inPainZone) {
        decay = 2.0; // Fast decay in pain zone
      }
      
      if (this.arousalValue > this.arousalConfig.baselineValue) {
        this.arousalValue -= decay * deltaTime;
        this.arousalValue = Math.max(this.arousalConfig.baselineValue, this.arousalValue);
      } else if (this.arousalValue < this.arousalConfig.baselineValue) {
        this.arousalValue += decay * deltaTime;
        this.arousalValue = Math.min(this.arousalConfig.baselineValue, this.arousalValue);
      }
      
      // Notify listeners if value changed
      if (oldValue !== this.arousalValue) {
        this.notifyArousalListeners();
      }
    }
    
    /**
     * Register listener for arousal changes
     */
    onArousalChange(callback: (value: number, npc: BaseNPC) => void): void {
      this.arousalChangeListeners.push(callback);
    }
    
    /**
     * Remove arousal change listener
     */
    removeArousalListener(callback: (value: number, npc: BaseNPC) => void): void {
      const index = this.arousalChangeListeners.indexOf(callback);
      if (index !== -1) {
        this.arousalChangeListeners.splice(index, 1);
      }
    }
    
    /**
     * Register listener for arousal impulses (for UI feedback)
     */
    onArousalImpulse(callback: (impulse: number, npc: BaseNPC) => void): void {
      this.arousalImpulseListeners.push(callback);
    }
    
    /**
     * Remove arousal impulse listener
     */
    removeArousalImpulseListener(callback: (impulse: number, npc: BaseNPC) => void): void {
      const index = this.arousalImpulseListeners.indexOf(callback);
      if (index !== -1) {
        this.arousalImpulseListeners.splice(index, 1);
      }
    }
    
    private notifyArousalListeners(): void {
      for (const listener of this.arousalChangeListeners) {
        try {
          listener(this.arousalValue, this);
        } catch (error) {
          console.error(`Error in arousal listener for ${this.name}:`, error);
        }
      }
      this.evaluateExpression();
    }
    
    private notifyArousalImpulseListeners(impulse: number): void {
      for (const listener of this.arousalImpulseListeners) {
        try {
          listener(impulse, this);
        } catch (error) {
          console.error(`Error in arousal impulse listener for ${this.name}:`, error);
        }
      }
    }
    
    /**
     * Check if pain threshold has been crossed
     */
    private checkPainThreshold(): void {
      const wasInPain = this.inPainZone;
      const isInPain = this.arousalValue > this.arousalConfig.painThreshold;
      
      // Fire event only on crossing into pain zone (not continuously)
      if (isInPain && !wasInPain) {
        this.inPainZone = true;
        if (!this.winExpressionLocked) {
          this.painExpressionLocked = true;
          this.evaluateExpression(true);
        }
        this.notifyPainThresholdListeners();
      } else if (!isInPain && wasInPain) {
        this.inPainZone = false;
      }
    }
    
    /**
     * Check if currently in pain zone
     */
    isInPainZone(): boolean {
      return this.inPainZone;
    }
    
    /**
     * Register listener for pain threshold crossed
     */
    onPainThreshold(callback: (npc: BaseNPC) => void): void {
      this.painThresholdListeners.push(callback);
    }
    
    /**
     * Remove pain threshold listener
     */
    removePainThresholdListener(callback: (npc: BaseNPC) => void): void {
      const index = this.painThresholdListeners.indexOf(callback);
      if (index !== -1) {
        this.painThresholdListeners.splice(index, 1);
      }
    }
    
    private notifyPainThresholdListeners(): void {
      for (const listener of this.painThresholdListeners) {
        try {
          listener(this);
        } catch (error) {
          console.error(`Error in pain threshold listener for ${this.name}:`, error);
        }
      }
    }
    
    getExpressionDescriptor(): NPCExpressionDescriptor {
      return this.expressionDescriptor;
    }
    
    onExpressionChange(callback: (expression: NPCExpressionDescriptor, npc: BaseNPC) => void): void {
      this.expressionChangeListeners.push(callback);
    }
    
    removeExpressionChangeListener(callback: (expression: NPCExpressionDescriptor, npc: BaseNPC) => void): void {
      const index = this.expressionChangeListeners.indexOf(callback);
      if (index !== -1) {
        this.expressionChangeListeners.splice(index, 1);
      }
    }
    
    protected resolveExpression(): NPCExpressionDescriptor {
      if (this.winExpressionLocked) {
        return { id: 'win' };
      }
      
      if (this.painExpressionLocked) {
        return { id: 'pain' };
      }
      
      return { id: 'default' };
    }
    
    protected evaluateExpression(force: boolean = false): void {
      const nextDescriptor = this.resolveExpression();
      if (!nextDescriptor) {
        return;
      }
      
      if (force || !this.areExpressionsEqual(this.expressionDescriptor, nextDescriptor)) {
        this.expressionDescriptor = nextDescriptor;
        this.notifyExpressionChangeListeners();
      }
    }
    
    protected areExpressionsEqual(a: NPCExpressionDescriptor, b: NPCExpressionDescriptor): boolean {
      if (!a || !b) {
        return false;
      }
      
      if (a.id !== b.id) {
        return false;
      }
      
      if (a.emoji !== b.emoji) {
        return false;
      }
      
      if (!a.sprite && !b.sprite) {
        return true;
      }
      
      if (!a.sprite || !b.sprite) {
        return false;
      }
      
      return a.sprite.atlasId === b.sprite.atlasId && a.sprite.frame === b.sprite.frame;
    }
    
    protected notifyExpressionChangeListeners(): void {
      for (const listener of this.expressionChangeListeners) {
        try {
          listener(this.expressionDescriptor, this);
        } catch (error) {
          console.error(`Error in expression listener for ${this.name}:`, error);
        }
      }
    }
    
    resetPainExpression(): void {
      if (this.painExpressionLocked) {
        this.painExpressionLocked = false;
        this.evaluateExpression(true);
      }
    }
    
    resetWinExpression(): void {
      if (this.winExpressionLocked) {
        this.winExpressionLocked = false;
        this.evaluateExpression(true);
      }
    }
    
    protected isPainExpressionActive(): boolean {
      return this.painExpressionLocked;
    }
    
    protected isWinExpressionActive(): boolean {
      return this.winExpressionLocked;
    }
    
    // === CRESCENDO MANAGEMENT ===
    
    getCrescendoValue(): number {
      return this.crescendoValue;
    }
    
    /**
     * Get normalized crescendo value (0-1) for UI display
     */
    getCrescendoNormalized(): number {
      return Math.max(0, Math.min(1, this.crescendoValue / this.crescendoConfig.maxValue));
    }
    
    /**
     * Check if arousal is in the target zone for crescendo growth
     */
    isInCrescendoZone(): boolean {
      const target = this.crescendoConfig.targetArousalValue;
      const tolerance = this.crescendoConfig.arousalTolerance;
      return this.arousalValue >= (target - tolerance) && 
             this.arousalValue <= (target + tolerance);
    }
    
    /**
     * Check if crescendo threshold has been reached
     */
    hasCrescendoThresholdReached(): boolean {
      return this.crescendoThresholdReached;
    }
    
    /**
     * Update crescendo over time based on arousal zone
     */
    updateCrescendo(deltaTime: number): void {
      // Don't update if threshold already reached
      if (this.crescendoThresholdReached) {
        return;
      }
      
      const oldValue = this.crescendoValue;
      const inZone = this.isInCrescendoZone();
      
      // Only allow crescendo to rise if enabled (knobs are active)
      // Crescendo can still decay when disabled
      let rate: number;
      if (inZone && this.crescendoEnabled) {
        rate = this.crescendoConfig.riseRate;
      } else {
        rate = -this.crescendoConfig.decayRate;
      }
      
      const change = rate * deltaTime;
      
      this.crescendoValue = Math.max(0.1, Math.min(this.crescendoConfig.maxValue, this.crescendoValue + change));
      
      // Check if threshold reached
      if (!this.crescendoThresholdReached && this.crescendoValue >= this.crescendoConfig.threshold) {
        this.crescendoThresholdReached = true;
        this.crescendoValue = this.crescendoConfig.threshold; // Freeze at threshold
        this.winExpressionLocked = true;
        this.evaluateExpression(true);
        this.notifyCrescendoThresholdListeners();
      }
      
      // Notify if value changed
      if (oldValue !== this.crescendoValue) {
        this.notifyCrescendoChangeListeners();
      }
    }
    
    /**
     * Enable crescendo rise (called when knobs become active)
     */
    enableCrescendo(): void {
      this.crescendoEnabled = true;
    }
    
    /**
     * Disable crescendo rise (called when knobs retract)
     */
    disableCrescendo(): void {
      this.crescendoEnabled = false;
    }
    
    /**
     * Check if crescendo is currently enabled
     */
    isCrescendoEnabled(): boolean {
      return this.crescendoEnabled;
    }
    
    /**
     * Register listener for crescendo changes
     */
    onCrescendoChange(callback: (value: number, npc: BaseNPC) => void): void {
      this.crescendoChangeListeners.push(callback);
    }
    
    /**
     * Remove crescendo change listener
     */
    removeCrescendoListener(callback: (value: number, npc: BaseNPC) => void): void {
      const index = this.crescendoChangeListeners.indexOf(callback);
      if (index !== -1) {
        this.crescendoChangeListeners.splice(index, 1);
      }
    }
    
    /**
     * Register listener for crescendo threshold reached
     */
    onCrescendoThreshold(callback: (npc: BaseNPC) => void): void {
      this.crescendoThresholdListeners.push(callback);
    }
    
    /**
     * Remove crescendo threshold listener
     */
    removeCrescendoThresholdListener(callback: (npc: BaseNPC) => void): void {
      const index = this.crescendoThresholdListeners.indexOf(callback);
      if (index !== -1) {
        this.crescendoThresholdListeners.splice(index, 1);
      }
    }
    
    private notifyCrescendoChangeListeners(): void {
      for (const listener of this.crescendoChangeListeners) {
        try {
          listener(this.crescendoValue, this);
        } catch (error) {
          console.error(`Error in crescendo listener for ${this.name}:`, error);
        }
      }
      this.evaluateExpression();
    }
    
    private notifyCrescendoThresholdListeners(): void {
      for (const listener of this.crescendoThresholdListeners) {
        try {
          listener(this);
        } catch (error) {
          console.error(`Error in crescendo threshold listener for ${this.name}:`, error);
        }
      }
    }
    
    /**
     * Get debug section for NPC configuration
     */
    getDebugSection(): Jamble.DebugSection {
      return {
        title: `${this.name} Configuration`,
        controls: [
          // Arousal Config
          {
            type: 'display',
            label: 'Arousal',
            getValue: () => this.arousalValue.toFixed(2)
          },
          {
            type: 'slider',
            label: 'Baseline',
            min: 0,
            max: 5,
            step: 0.1,
            getValue: () => this.arousalConfig.baselineValue,
            setValue: (value) => { this.arousalConfig.baselineValue = value; }
          },
          {
            type: 'slider',
            label: 'Decay Rate',
            min: 0.1,
            max: 2.0,
            step: 0.1,
            getValue: () => this.arousalConfig.decayRate,
            setValue: (value) => { this.arousalConfig.decayRate = value; }
          },
          {
            type: 'slider',
            label: 'Sensitivity',
            min: 0.5,
            max: 5.0,
            step: 0.1,
            getValue: () => this.arousalConfig.sensitivity,
            setValue: (value) => { this.arousalConfig.sensitivity = value; }
          },
          {
            type: 'slider',
            label: 'Pain Threshold',
            min: 3.0,
            max: 8.0,
            step: 0.1,
            getValue: () => this.arousalConfig.painThreshold,
            setValue: (value) => { this.arousalConfig.painThreshold = value; }
          },
          // Momentum Config
          {
            type: 'display',
            label: 'Momentum',
            getValue: () => this.arousalMomentum.toFixed(3)
          },
          {
            type: 'slider',
            label: 'Momentum Spread Sec',
            min: 0.1,
            max: 1.0,
            step: 0.05,
            getValue: () => this.momentumSpreadDuration,
            setValue: (value) => { this.momentumSpreadDuration = value; }
          },
          // Crescendo Config
          {
            type: 'display',
            label: 'Crescendo',
            getValue: () => this.crescendoValue.toFixed(2)
          },
          {
            type: 'slider',
            label: 'Target Arousal',
            min: 2.0,
            max: 6.0,
            step: 0.1,
            getValue: () => this.crescendoConfig.targetArousalValue,
            setValue: (value) => { this.crescendoConfig.targetArousalValue = value; }
          },
          {
            type: 'slider',
            label: 'Tolerance',
            min: 0.1,
            max: 2.0,
            step: 0.1,
            getValue: () => this.crescendoConfig.arousalTolerance,
            setValue: (value) => { this.crescendoConfig.arousalTolerance = value; }
          },
          {
            type: 'slider',
            label: 'Rise Rate',
            min: 0.05,
            max: 0.5,
            step: 0.05,
            getValue: () => this.crescendoConfig.riseRate,
            setValue: (value) => { this.crescendoConfig.riseRate = value; }
          },
          {
            type: 'slider',
            label: 'Decay Rate',
            min: 0.05,
            max: 0.5,
            step: 0.05,
            getValue: () => this.crescendoConfig.decayRate,
            setValue: (value) => { this.crescendoConfig.decayRate = value; }
          }
        ]
      };
    }
    
    // === ABSTRACT METHODS FOR SUBCLASSES ===
    
    /**
     * Initialize NPC-specific behavior
     */
    abstract initialize(): void;
    
    /**
     * Update NPC behavior each frame
     * @param deltaTime Time elapsed in seconds
     * @param player Optional player reference for temperature effects
     */
    abstract update(deltaTime: number, player?: Player): void;
    
    /**
     * React to specific game events
     */
    abstract onGameEvent(event: string, data?: any): void;
  }
}
