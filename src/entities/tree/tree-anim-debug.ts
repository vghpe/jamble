/// <reference path="../../debug/debug-system.ts" />
/// <reference path="./tree-anim.ts" />

namespace Jamble {
  /**
   * TreeAnimDebugPanel - Debug controls for tweaking tree animation parameters
   * Registers with the debug system to allow real-time tuning of:
   * - Wiggle magnitude range
   * - Spring physics (omega/zeta)
   * - Animation duration
   */
  export class TreeAnimDebugPanel {
    private debugSystem: DebugSystem;
    
    // Animation parameters (accessible for TreeAnim to read)
    public wiggleMagnitudeMin: number = 0.1;   // Min radians for angular wiggle
    public wiggleMagnitudeMax: number = 0.2;   // Max radians for angular wiggle
    public omega: number = 15.0;               // Spring frequency
    public zeta: number = 0.2;                 // Damping coefficient
    public wiggleDuration: number = 0.6;       // Total animation time
    public arcWidth: number = 0.65;            // Arc width multiplier (0.5 = squished, 2.0 = wide)
    public sizeRandomness: number = 0.3;       // Size variation (0 = none, 1.0 = max variation)
    
    constructor(debugSystem: DebugSystem) {
      this.debugSystem = debugSystem;
      this.registerDebugSection();
    }
    
    /**
     * Register tree animation controls with the debug system
     */
    private registerDebugSection(): void {
      const section: DebugSection = {
        title: 'Tree Animation',
        controls: [
          {
            type: 'slider',
            label: 'Wiggle Min rad',
            min: 0,
            max: 1.0,
            step: 0.05,
            getValue: () => this.wiggleMagnitudeMin,
            setValue: (value: number) => { this.wiggleMagnitudeMin = value; }
          },
          {
            type: 'slider',
            label: 'Wiggle Max rad',
            min: 0,
            max: 1.5,
            step: 0.05,
            getValue: () => this.wiggleMagnitudeMax,
            setValue: (value: number) => { this.wiggleMagnitudeMax = value; }
          },
          {
            type: 'slider',
            label: 'Spring Frequency',
            min: 5,
            max: 30,
            step: 0.5,
            getValue: () => this.omega,
            setValue: (value: number) => { this.omega = value; }
          },
          {
            type: 'slider',
            label: 'Damping',
            min: 0.1,
            max: 1.0,
            step: 0.05,
            getValue: () => this.zeta,
            setValue: (value: number) => { this.zeta = value; }
          },
          {
            type: 'slider',
            label: 'Duration sec',
            min: 0.2,
            max: 2.0,
            step: 0.1,
            getValue: () => this.wiggleDuration,
            setValue: (value: number) => { this.wiggleDuration = value; }
          },
          {
            type: 'slider',
            label: 'Arc Width',
            min: 0.3,
            max: 2.0,
            step: 0.05,
            getValue: () => this.arcWidth,
            setValue: (value: number) => { this.arcWidth = value; }
          },
          {
            type: 'slider',
            label: 'Size Randomness',
            min: 0,
            max: 0.5,
            step: 0.05,
            getValue: () => this.sizeRandomness,
            setValue: (value: number) => { this.sizeRandomness = value; }
          },
          {
            type: 'display',
            label: 'Info',
            getValue: () => 'Higher freq = faster, higher damp = less bounce'
          }
        ]
      };
      
      this.debugSystem.registerSection('tree-animation', section);
    }
    
    /**
     * Get current wiggle magnitude (random between min and max)
     */
    getWiggleMagnitude(): number {
      return this.wiggleMagnitudeMin + 
             Math.random() * (this.wiggleMagnitudeMax - this.wiggleMagnitudeMin);
    }
    
    /**
     * Unregister from debug system (cleanup)
     */
    destroy(): void {
      this.debugSystem.unregisterSection('tree-animation');
    }
  }
}
