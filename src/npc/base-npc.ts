namespace Jamble {
  export type ArousalState = 'default' | 'minimum' | 'medium' | 'high' | 'very-high' | 'pain';

  export interface NPCArousalConfig {
    baselineValue: number;
    decayRate: number;
    maxValue: number;
    minValue: number;
    sensitivity: number;
  }

  export abstract class BaseNPC {
    protected name: string;
    protected arousalValue: number;
    protected arousalConfig: NPCArousalConfig;
    protected arousalChangeListeners: Array<(value: number, npc: BaseNPC) => void> = [];
    protected arousalImpulseListeners: Array<(impulse: number, npc: BaseNPC) => void> = [];

    constructor(name: string, config?: Partial<NPCArousalConfig>) {
      this.name = name;
      
      // Default arousal configuration
      this.arousalConfig = {
        baselineValue: 0.2,
        decayRate: 0.001,
        maxValue: 6.0,
        minValue: -1.0,
        sensitivity: 1.0,
        ...config
      };
      
      this.arousalValue = this.arousalConfig.baselineValue;
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