/// <reference path="tree.ts" />

namespace Jamble {
  /**
   * TreeAnim - Pivot-based spring animation for tree leafs
   * Each leaf rotates around its attachment point to the trunk
   */
  export class TreeAnim {
    private debugPanel?: any;
    private leafStates: Array<{
      angle: number;
      angularVelocity: number;
      targetAngle: number;
      pivotX: number;
      pivotY: number;
      radius: number;
      isAnimating: boolean;
      elapsedTime: number;
    }> = [];
    
    // Default animation parameters (source of truth)
    private static readonly DEFAULT_WIGGLE_MIN = 0.1;
    private static readonly DEFAULT_WIGGLE_MAX = 0.15;
    private static readonly DEFAULT_OMEGA = 15.0;
    private static readonly DEFAULT_ZETA = 0.2;
    private static readonly DEFAULT_DURATION = 0.6;
    private static readonly SETTLEMENT_THRESHOLD = 0.05;
    
    constructor(private tree: Tree, debugPanel?: any) {
      this.debugPanel = debugPanel;
      
      const anchors = (tree as any).leafAnchors as Array<{ x: number; y: number; radius: number }>;
      
      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        
        // Calculate pivot point at edge closest to trunk
        const distToCenter = Math.sqrt(anchor.x * anchor.x + anchor.y * anchor.y);
        const dirX = anchor.x / distToCenter;
        const dirY = anchor.y / distToCenter;
        const pivotX = anchor.x - dirX * anchor.radius;
        const pivotY = anchor.y - dirY * anchor.radius;
        
        this.leafStates.push({
          angle: 0,
          angularVelocity: 0,
          targetAngle: 0,
          pivotX,
          pivotY,
          radius: anchor.radius,
          isAnimating: false,
          elapsedTime: 0
        });
      }
    }
    
    /**
     * Get animation parameters (from debug panel if available, otherwise defaults)
     */
    private getParams() {
      if (this.debugPanel) {
        return {
          omega: this.debugPanel.omega ?? TreeAnim.DEFAULT_OMEGA,
          zeta: this.debugPanel.zeta ?? TreeAnim.DEFAULT_ZETA,
          wiggleDuration: this.debugPanel.wiggleDuration ?? TreeAnim.DEFAULT_DURATION,
          settlementThreshold: TreeAnim.SETTLEMENT_THRESHOLD
        };
      }
      return {
        omega: TreeAnim.DEFAULT_OMEGA,
        zeta: TreeAnim.DEFAULT_ZETA,
        wiggleDuration: TreeAnim.DEFAULT_DURATION,
        settlementThreshold: TreeAnim.SETTLEMENT_THRESHOLD
      };
    }
    
    update(deltaTime: number): void {
      const params = this.getParams();
      const omegaSquared = params.omega * params.omega;
      const dampingFactor = -2 * params.zeta * params.omega;
      
      for (let i = 0; i < this.leafStates.length; i++) {
        const state = this.leafStates[i];
        if (!state.isAnimating) continue;
        
        state.elapsedTime += deltaTime;
        
        // Angular spring physics
        const angularDisplacement = state.angle - state.targetAngle;
        const angularAcc = dampingFactor * state.angularVelocity - omegaSquared * angularDisplacement;
        state.angularVelocity += angularAcc * deltaTime;
        state.angle += state.angularVelocity * deltaTime;
        
        // Check if settled
        if (Math.abs(state.angle - state.targetAngle) < params.settlementThreshold &&
            Math.abs(state.angularVelocity) < params.settlementThreshold ||
            state.elapsedTime > params.wiggleDuration) {
          state.angle = state.targetAngle;
          state.angularVelocity = 0;
          state.isAnimating = false;
        }
      }
    }
    
    /**
     * Trigger wiggle animation with randomized initial angles
     */
    triggerWiggle(): void {
      for (let i = 0; i < this.leafStates.length; i++) {
        const state = this.leafStates[i];
        
        const magnitude = this.debugPanel?.getWiggleMagnitude?.() ?? 
          (TreeAnim.DEFAULT_WIGGLE_MIN + Math.random() * (TreeAnim.DEFAULT_WIGGLE_MAX - TreeAnim.DEFAULT_WIGGLE_MIN));
        const direction = Math.random() < 0.5 ? -1 : 1;
        
        state.angle = direction * magnitude;
        state.targetAngle = 0;
        state.angularVelocity = 0;
        state.elapsedTime = 0;
        state.isAnimating = true;
      }
    }
    
    /**
     * Get current offset for a leaf (rotated around its pivot point)
     */
    getLeafOffset(leafIndex: number): { x: number; y: number } {
      if (leafIndex < 0 || leafIndex >= this.leafStates.length) {
        return { x: 0, y: 0 };
      }
      
      const state = this.leafStates[leafIndex];
      const anchors = (this.tree as any).leafAnchors as Array<{ x: number; y: number; radius: number }>;
      const anchor = anchors[leafIndex];
      
      // Vector from pivot to center at rest
      const restVecX = anchor.x - state.pivotX;
      const restVecY = anchor.y - state.pivotY;
      
      // Rotate by current angle
      const cos = Math.cos(state.angle);
      const sin = Math.sin(state.angle);
      const rotatedX = restVecX * cos - restVecY * sin;
      const rotatedY = restVecX * sin + restVecY * cos;
      
      // Return offset from original anchor
      return {
        x: state.pivotX + rotatedX - anchor.x,
        y: state.pivotY + rotatedY - anchor.y
      };
    }
    
    /**
     * Check if any leaf is animating
     */
    isAnimating(): boolean {
      for (let i = 0; i < this.leafStates.length; i++) {
        if (this.leafStates[i].isAnimating) return true;
      }
      return false;
    }
    
    /**
     * Reset all animation state
     */
    reset(): void {
      for (let i = 0; i < this.leafStates.length; i++) {
        const state = this.leafStates[i];
        state.angle = 0;
        state.angularVelocity = 0;
        state.targetAngle = 0;
        state.isAnimating = false;
        state.elapsedTime = 0;
      }
    }
  }
}
