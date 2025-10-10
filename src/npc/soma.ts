/// <reference path="base-npc.ts" />

namespace Jamble {
  export class Soma extends BaseNPC {
    constructor() {
      super('Soma', {
        baselineValue: 0.2,
        decayRate: 0.0008,       // Slightly slower decay
        maxValue: 6.0,
        minValue: -1.0
      });
    }

    initialize(): void {
      console.log(`${this.name} initialized - baseline arousal: ${this.arousalValue}`);
    }

    update(deltaTime: number): void {
      // Update base arousal decay
      super.updateArousal(deltaTime);
    }

    onGameEvent(event: string, data?: any): void {
      switch (event) {
        case 'knob-hit-side':
          this.applyArousalImpulse(0.15);
          break;
          
        case 'knob-hit-top':
          this.applyArousalImpulse(0.4);
          break;
          
        case 'game-start':
          // Reset to baseline when game starts
          this.setArousalValue(this.arousalConfig.baselineValue);
          break;
          
        default:
          // Handle other events
          break;
      }
    }

    // Simple behavior methods
    
    /**
     * Check if Soma wants the knob to hide (too much stimulation)
     */
    wantsKnobHidden(): boolean {
      const state = this.getArousalState();
      return state === 'pain';
    }
    
    /**
     * Check if Soma wants more stimulation (knob should be visible)
     */
    wantsMoreStimulation(): boolean {
      const state = this.getArousalState();
      return state === 'default' || state === 'minimum';
    }
  }
}