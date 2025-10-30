/// <reference path="base-npc.ts" />

namespace Jamble {
  export class Soma extends BaseNPC {
    private readonly expressionEmojis: Record<string, string> = {
      default: '😒',
      enjoy: '😌',
      aroused: '😳',
      pain: '😖',
      win: '🫠'
    };
    
    constructor() {
      super('Soma', {
        baselineValue: 0.2,
        decayRate: 0.8,       // Slightly slower decay
        maxValue: 6.0,
        minValue: -1.0,
        sensitivity: 3.0,
        painThreshold: 5.0    // Pain zone starts at 5.0
      });
      
      // Configure Soma's crescendo zone (target arousal around 4.0)
      this.crescendoConfig = {
        targetArousalValue: 4.3,
        arousalTolerance: 0.7,   // Zone is 3.5-4.5
        riseRate: 0.15,           // Slow and steady rise
        decayRate: 0.1,           // Decays if out of zone
        threshold: 1.0,           // Win at 1.0
        maxValue: 1.0
      };

      this.evaluateExpression(true);
    }

    initialize(): void {
      console.log(`${this.name} initialized - baseline arousal: ${this.arousalValue}`);
    }

    update(deltaTime: number, player?: Player): void {
      // Update base arousal decay (pass player for temperature effects)
      super.updateArousal(deltaTime, player);
      
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

    protected resolveExpression(): NPCExpressionDescriptor {
      if (this.isPainExpressionActive()) {
        return {
          id: 'pain',
          emoji: this.expressionEmojis?.pain
        };
      }
      
      if (this.isWinExpressionActive()) {
        return {
          id: 'win',
          emoji: this.expressionEmojis?.win
        };
      }
      
      if (this.isInCrescendoZone()) {
        return {
          id: 'aroused',
          emoji: this.expressionEmojis?.aroused
        };
      }
      
      if (this.arousalValue <= 0.2) {
        return {
          id: 'default',
          emoji: this.expressionEmojis?.default
        };
      }
      
      return {
        id: 'enjoy',
        emoji: this.expressionEmojis?.enjoy
      };
    }
  }
}
