/// <reference path="../npc/base-npc.ts" />
/// <reference path="../entities/home.ts" />
/// <reference path="../entities/knob/knob.ts" />
/// <reference path="../entities/platform.ts" />
/// <reference path="../entities/sensor.ts" />
/// <reference path="../slots/slot-manager.ts" />
/// <reference path="../core/game-object.ts" />

namespace Jamble {
  /**
   * Data returned when creating a level
   */
  export interface LevelData {
    home: Home;
    knobs: Knob[];
    groundSensor: Sensor;
    allEntities: GameObject[];
  }

  /**
   * LevelManager - manages level progression and entity spawning.
   * Handles instantiation and initial placement of level entities.
   * Does not handle progression (NPC system does that).
   */
  export class LevelManager {
    private currentNPC: BaseNPC | null = null;
    private levelCompleteListeners: Array<(npc: BaseNPC) => void> = [];
    private crescendoThresholdListener: ((npc: BaseNPC) => void) | null = null;
    private knobs: Knob[] = []; // Track spawned knobs for respawn functionality

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
      this.knobs = [];
    }

    // ==================== Knob Management ====================

    /**
     * Respawn all retracted knobs
     * Returns number of knobs respawned
     */
    respawnAllKnobs(): number {
      let respawnedCount = 0;
      this.knobs.forEach(knob => {
        if (knob.getState() === KnobState.RETRACTED) {
          knob.manualRespawn();
          respawnedCount++;
        }
      });
      
      console.log(`LevelManager: Respawned ${respawnedCount} knob(s)`);
      return respawnedCount;
    }

    /**
     * Get all tracked knobs
     */
    getKnobs(): Knob[] {
      return this.knobs;
    }
    
    /**
     * Connect to NPC pain threshold for gameplay response
     * When NPC hits pain threshold, retract all knobs and disable crescendo
     */
    onNPCPainThreshold(npc: BaseNPC): void {
      npc.onPainThreshold(() => {
        console.log('LevelManager: Pain threshold hit - retracting all knobs');
        this.knobs.forEach(knob => knob.retract());
        npc.disableCrescendo();
      });
    }

    // ==================== Entity Spawning ====================
    // Hardcoded methods that will serve as foundation for future level editor

    /**
     * Spawn home entity at the first ground slot
     * Home owns its sensor internally (accessed via home.getSensor())
     */
    spawnHome(slotManager: SlotManager, gameWidth: number, gameHeight: number): Home {
      const groundSlots = slotManager.getSlotsByType('ground');
      if (groundSlots.length === 0) {
        throw new Error('No ground slots available for home');
      }

      const homeSlot = groundSlots[0];
      const home = new Home('home', homeSlot.x, homeSlot.y);
      slotManager.occupySlot(homeSlot.id, home.id);
      
      return home;
    }

    /**
     * Spawn knob at specified ground slot index (from available slots)
     */
    spawnKnob(slotManager: SlotManager, npc: BaseNPC, slotIndex: number): Knob | null {
      const availableGroundSlots = slotManager.getAvailableSlots('ground');
      
      if (availableGroundSlots.length <= slotIndex) {
        console.warn(`Not enough available ground slots for knob at index ${slotIndex}`);
        return null;
      }

      const knobSlot = availableGroundSlots[slotIndex];
      const knob = new Knob(`knob${slotIndex + 1}`, knobSlot.x, knobSlot.y, slotManager, knobSlot.id, npc);
      slotManager.occupySlot(knobSlot.id, knob.id);
      
      return knob;
    }

    /**
     * Spawn platform at specified low air slot index
     */
    spawnPlatform(slotManager: SlotManager, slotIndex: number): Platform | null {
      const lowAirSlots = slotManager.getAvailableSlots('air_low');
      
      if (lowAirSlots.length <= slotIndex) {
        console.warn(`Not enough available air slots for platform at index ${slotIndex}`);
        return null;
      }

      const platformSlot = lowAirSlots[slotIndex];
      const platform = new Platform(`platform${slotIndex + 1}`, platformSlot.x, platformSlot.y);
      slotManager.occupySlot(platformSlot.id, platform.id);
      
      return platform;
    }

    /**
     * Create ground sensor for re-enabling home sensor
     */
    spawnGroundSensor(gameWidth: number, gameHeight: number): Sensor {
      const groundSensor = new Sensor('ground-sensor', undefined, gameWidth / 2, gameHeight - 5);
      groundSensor.setTriggerSize(gameWidth, 5); // Full width ground sensor, very thin
      return groundSensor;
    }

    /**
     * Create the Soma level (hardcoded for now, foundation for future editor)
     * Returns all spawned entities for game to track
     */
    createSomaLevel(slotManager: SlotManager, npc: BaseNPC, gameWidth: number, gameHeight: number): LevelData {
      const allEntities: GameObject[] = [];
      const knobs: Knob[] = [];

      // Spawn home (leftmost ground slot) - includes its child sensor
      const home = this.spawnHome(slotManager, gameWidth, gameHeight);
      allEntities.push(home, home.getSensor());

      // Trees are placed via tree placement overlay (no default spawn)

      // Spawn knob at fourth available ground slot
      const knob = this.spawnKnob(slotManager, npc, 3);
      if (knob) {
        allEntities.push(knob);
        knobs.push(knob);
      }

      // Spawn platform at third low air slot
      const platform = this.spawnPlatform(slotManager, 2);
      if (platform) {
        allEntities.push(platform);
      }

      // Spawn ground sensor for home re-enabling
      const groundSensor = this.spawnGroundSensor(gameWidth, gameHeight);
      allEntities.push(groundSensor);

      return {
        home,
        knobs,
        groundSensor,
        allEntities
      };
    }
  }
}
