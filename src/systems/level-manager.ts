/// <reference path="../npc/base-npc.ts" />

namespace Jamble {
  /**
   * LevelManager - manages level progression and win conditions.
   * Currently monitors NPC crescendo threshold for level completion.
   */
  export class LevelManager {
    private currentNPC: BaseNPC | null = null;
    private levelCompleteListeners: Array<(npc: BaseNPC) => void> = [];
    private crescendoThresholdListener: ((npc: BaseNPC) => void) | null = null;

    constructor() {
      // Level manager starts without an active NPC
    }

    /**
     * Set the current NPC to monitor for level completion
     */
    setActiveNPC(npc: BaseNPC): void {
      // Clean up previous NPC listener if exists
      if (this.currentNPC && this.crescendoThresholdListener) {
        this.currentNPC.removeCrescendoThresholdListener(this.crescendoThresholdListener);
      }

      this.currentNPC = npc;

      // Listen for crescendo threshold
      this.crescendoThresholdListener = (npc: BaseNPC) => {
        this.onCrescendoThresholdReached(npc);
      };
      this.currentNPC.onCrescendoThreshold(this.crescendoThresholdListener);
    }

    /**
     * Get the current NPC
     */
    getCurrentNPC(): BaseNPC | null {
      return this.currentNPC;
    }

    /**
     * Register listener for level complete event
     */
    onLevelComplete(callback: (npc: BaseNPC) => void): void {
      this.levelCompleteListeners.push(callback);
    }

    /**
     * Remove level complete listener
     */
    removeLevelCompleteListener(callback: (npc: BaseNPC) => void): void {
      const index = this.levelCompleteListeners.indexOf(callback);
      if (index !== -1) {
        this.levelCompleteListeners.splice(index, 1);
      }
    }

    /**
     * Handle crescendo threshold reached
     */
    private onCrescendoThresholdReached(npc: BaseNPC): void {
      console.log(`LevelManager: ${npc.getName()} completed level!`);
      this.notifyLevelComplete(npc);
    }

    /**
     * Notify all level complete listeners
     */
    private notifyLevelComplete(npc: BaseNPC): void {
      for (const listener of this.levelCompleteListeners) {
        try {
          listener(npc);
        } catch (error) {
          console.error('Error in level complete listener:', error);
        }
      }
    }

    /**
     * Reset level (for future use)
     */
    reset(): void {
      if (this.currentNPC && this.crescendoThresholdListener) {
        this.currentNPC.removeCrescendoThresholdListener(this.crescendoThresholdListener);
      }
      this.currentNPC = null;
      this.crescendoThresholdListener = null;
    }

    /**
     * Clean up
     */
    destroy(): void {
      this.reset();
      this.levelCompleteListeners = [];
    }
  }
}
