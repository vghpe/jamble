/// <reference path="base-npc.ts" />

namespace Jamble {
  export class Soma extends BaseNPC {
    constructor() {
      super('Soma', {
        baselineValue: 0.2,
        decayRate: 0.2,       // Slightly slower decay
        maxValue: 6.0,
        minValue: -1.0,
        sensitivity: 1.0
      });
      
      // Configure Soma's crescendo zone (target arousal around 4.0)
      this.crescendoConfig = {
        targetArousalValue: 4.0,
        arousalTolerance: 0.5,   // Zone is 3.5-4.5
        riseRate: 0.15,           // Slow and steady rise
        decayRate: 0.1,           // Decays if out of zone
        threshold: 1.0,           // Win at 1.0
        maxValue: 1.0
      };
    }

    initialize(): void {
      console.log(`${this.name} initialized - baseline arousal: ${this.arousalValue}`);
    }

    update(deltaTime: number): void {
      // Update base arousal decay
      super.updateArousal(deltaTime);
      
      // Update crescendo (rises when arousal in target zone)
      super.updateCrescendo(deltaTime);
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