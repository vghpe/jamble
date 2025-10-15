namespace Jamble {
  export type ArousalState = 'default' | 'minimum' | 'medium' | 'high' | 'very-high' | 'pain';

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
    protected arousalChangeListeners: Array<(value: number, npc: BaseNPC) => void> = [];
    protected arousalImpulseListeners: Array<(impulse: number, npc: BaseNPC) => void> = [];
    protected crescendoChangeListeners: Array<(value: number, npc: BaseNPC) => void> = [];
    protected crescendoThresholdListeners: Array<(npc: BaseNPC) => void> = [];
    protected painThresholdListeners: Array<(npc: BaseNPC) => void> = [];

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
      this.crescendoValue = 0;
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
     */
    applyArousalImpulse(intensity: number): void {
      const oldValue = this.arousalValue;
      const adjustedIntensity = intensity * this.arousalConfig.sensitivity;
      this.arousalValue = Math.max(
        this.arousalConfig.minValue,
        Math.min(this.arousalConfig.maxValue, this.arousalValue + adjustedIntensity)
      );
      
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
     * Update arousal over time (decay towards baseline)
     */
    updateArousal(deltaTime: number): void {
      const oldValue = this.arousalValue;
      
      if (this.arousalValue > this.arousalConfig.baselineValue) {
        this.arousalValue -= this.arousalConfig.decayRate * deltaTime;
        this.arousalValue = Math.max(this.arousalConfig.baselineValue, this.arousalValue);
      } else if (this.arousalValue < this.arousalConfig.baselineValue) {
        this.arousalValue += this.arousalConfig.decayRate * deltaTime;
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
      
      this.crescendoValue = Math.max(0, Math.min(this.crescendoConfig.maxValue, this.crescendoValue + change));
      
      // Check if threshold reached
      if (!this.crescendoThresholdReached && this.crescendoValue >= this.crescendoConfig.threshold) {
        this.crescendoThresholdReached = true;
        this.crescendoValue = this.crescendoConfig.threshold; // Freeze at threshold
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
     */
    abstract update(deltaTime: number): void;
    
    /**
     * React to specific game events
     */
    abstract onGameEvent(event: string, data?: any): void;
  }
}