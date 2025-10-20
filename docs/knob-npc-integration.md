# Knob-NPC Integration Architecture

## Overview

The knob system serves as the primary gameplay input mechanism for influencing NPC arousal levels. This document outlines how player interactions with knobs propagate through the system to affect NPC state and drive win/loss conditions.

## Signal Flow

### 1. Collision Detection (Knob)

When a player collides with an active knob, the collision system triggers `onTriggerEnter()`:

```typescript
onTriggerEnter(other: GameObject): void {
  if (this.state !== KnobState.ACTIVE) return;
  if (other instanceof Player) {
    this.onCollected(other as Player);
  }
}
```

### 2. Collision Processing (Knob)

The knob determines collision type and calculates arousal impact:

```typescript
onCollected(player: Player): number {
  const collisionType = this.detectCollisionType(player);
  let arousalImpact: number;
  
  if (collisionType === 'top') {
    arousalImpact = 0.5;  // Top hits (player bouncing on knob)
    this.anim.triggerSquash();
  } else {
    arousalImpact = 0.3;  // Side hits (player running into knob)
    this.anim.triggerDeflect(...);
  }
  
  this.activeNPC.applyArousalImpulse(arousalImpact);
  return currencyAmount;
}
```

**Collision Types:**
- **Top collision**: Player moving downward, positioned above knob (Y < knobY - 10px)
- **Side collision**: All other collisions

### 3. Arousal Processing (BaseNPC)

The NPC receives the impulse and updates internal arousal state:

```typescript
applyArousalImpulse(intensity: number): void {
  const adjustedIntensity = intensity * this.arousalConfig.sensitivity;
  this.arousalValue = Math.max(minValue, Math.min(maxValue, 
    this.arousalValue + adjustedIntensity));
  
  this.checkPainThreshold();
  this.notifyArousalListeners();
  this.notifyArousalImpulseListeners(intensity);
}
```

**Key Behaviors:**
- Arousal is clamped between min/max values
- Sensitivity multiplier applied (3.0 for Soma)
- Automatic decay towards baseline (0.8/sec for Soma)
- Pain threshold check on every update

### 4. Crescendo System (BaseNPC)

Crescendo grows when arousal is maintained in the target zone:

```typescript
updateCrescendo(deltaTime: number): void {
  const inZone = this.isInCrescendoZone();  // 3.5-4.5 for Soma
  
  if (inZone && this.crescendoEnabled) {
    rate = this.crescendoConfig.riseRate;    // 0.15/sec
  } else {
    rate = -this.crescendoConfig.decayRate;  // -0.1/sec
  }
  
  this.crescendoValue += rate * deltaTime;
  
  if (!this.crescendoThresholdReached && 
      this.crescendoValue >= this.crescendoConfig.threshold) {
    this.crescendoThresholdReached = true;
    this.notifyCrescendoThresholdListeners();  // WIN CONDITION
  }
}
```

### 5. HUD Updates (Game)

Game initialization wires NPC events to HUD components:

```typescript
// Arousal -> Sensation Panel
this.activeNPC.onArousalChange((value, npc) => {
  this.hudManager.setSensationValue(npc.getSensationNormalized());
});

// Crescendo -> Crescendo Panel
this.activeNPC.onCrescendoChange((value, npc) => {
  this.hudManager.setCrescendoValue(npc.getCrescendoNormalized());
});

// Pain threshold -> Knob retraction
this.activeNPC.onPainThreshold(() => {
  this.knobs.forEach(knob => knob.retract());
  this.activeNPC.disableCrescendo();
});

// Crescendo threshold -> Win condition
this.activeNPC.onCrescendoThreshold((npc) => {
  console.log(`${npc.getName()} reached crescendo threshold!`);
  // TODO: Implement win state transition
});
```

## Configuration (Soma)

Current tuning values for the Soma NPC:

### Arousal Configuration
```typescript
{
  baselineValue: 0.2,      // Resting arousal level
  decayRate: 0.8,          // Return to baseline speed (per second)
  maxValue: 10.0,          // Maximum arousal
  minValue: 0.0,           // Minimum arousal
  sensitivity: 3.0,        // Impulse multiplier
  painThreshold: 5.0       // Triggers knob retraction
}
```

### Crescendo Configuration
```typescript
{
  targetArousalValue: 4.0,    // Center of optimal zone
  arousalTolerance: 0.5,      // Zone is ±0.5 (3.5-4.5)
  riseRate: 0.15,             // Growth speed in zone (per second)
  decayRate: 0.1,             // Decay speed outside zone (per second)
  threshold: 1.0,             // Win condition value
  maxValue: 1.0               // Maximum crescendo value
}
```

## Win/Loss Conditions

### Win Condition
- Maintain arousal in range 3.5-4.5
- Crescendo grows at 0.15/second while in range
- Takes approximately 6.7 seconds in zone to reach 1.0
- Triggers `onCrescendoThreshold()` callback

### Loss Condition
- Arousal exceeds 5.0 (pain threshold)
- Collision is disabled immediately on all knobs
- Current collision animation finishes playing
- Despawn animation plays (compress down, 0.15s)
- Knobs become hidden and fully retracted
- Crescendo stops growing (disabled)
- Requires manual respawn via heart (costs 1 heart)

## Animation System

### Collision Animations (Active State)

**Side Collision:**
- Deflects knob to max angle (85 degrees)
- Holds deflection for 0.2 seconds
- Springs back to center via damped oscillation
- Arousal impact: 0.3

**Top Collision:**
- Three-phase squash animation:
  1. **Compress**: Length reduced to 4%, width increased 1.3x (instant)
  2. **Hold**: Maintain compressed state for 0.15 seconds
  3. **Spring**: Damped spring back to original length (~1.5s max)
- Arousal impact: 0.5

### State Transition Animations

**Despawn Animation** (RETRACTING → RETRACTED):
1. Current collision animation completes (if any)
2. Compress down (same as squash compress phase)
3. Hold compressed state for 0.15 seconds
4. Transition to RETRACTED, hide knob
5. Animation state reset

**Spawn Animation** (RETRACTED → SPAWNING → ACTIVE):
1. Knob becomes visible
2. Start from compressed state (4% length)
3. Spring up to full length (damped oscillation, ~1.5s)
4. On completion, transition to ACTIVE
5. Collision enabled

### Animation Priority

Animations are processed in priority order:
1. **Despawn** (highest - blocks all other animations)
2. **Spawn** (blocks collision animations)
3. **Deflect / Squash** (normal gameplay)

The `isAnimating()` check prevents state bugs by ensuring:
- No collision animations trigger during despawn
- Current collision animation completes before despawn starts
- Animation state is reset when transitioning to RETRACTED

## Knob State Machine

```
     ┌──────[initial state]──────┐
     │                           │
     ▼                           │
RETRACTED ──[heart used]──> SPAWNING ──> ACTIVE ──[pain threshold]──> RETRACTING ──> RETRACTED
                             │             ^       [collision disabled]    │
                             │             │                               │
                             └─animation──┘                         animation finishes
                                                                    then despawn anim
```

**States:**
- **RETRACTED**: Initial state, hidden, collision disabled, animations reset
- **SPAWNING**: Playing spawn animation (spring up from compressed)
- **ACTIVE**: Normal gameplay, collision enabled, can trigger collision animations
- **RETRACTING**: Collision disabled, waiting for current animation then despawning

Only ACTIVE knobs process collisions and send arousal impulses.

### Pain Threshold Retraction Flow

When pain threshold is exceeded:
1. State transitions to RETRACTING
2. Collision disabled immediately (no new hits)
3. Check if collision animation is playing
4. If yes: wait for animation to complete
5. If no: start despawn immediately
6. Play despawn animation (compress + hold)
7. On completion: transition to RETRACTED and hide

## Heart-Based Respawn System

### Heart Module Configuration
- Maximum uses: 3 hearts
- Each heart use respawns all retracted knobs
- Hearts are consumed on click
- Module becomes depleted when all hearts are used

### Respawn Flow

1. **Player clicks heart button** in control panel
2. **HeartModule** decrements use count and emits event:
   ```typescript
   window.dispatchEvent(new CustomEvent('jamble:heart-used'));
   ```
3. **ControlPanel** listens and triggers respawn:
   ```typescript
   this.hudManager.getControlPanel().onHeartUsed(() => {
     this.respawnAllKnobs();
   });
   ```
4. **Game.respawnAllKnobs()** iterates through knobs:
   ```typescript
   this.knobs.forEach(knob => {
     if (knob.getState() === KnobState.RETRACTED) {
       knob.manualRespawn();
     }
   });
   this.activeNPC.enableCrescendo(); // Re-enable crescendo growth
   ```
5. **Knob.manualRespawn()** transitions state:
   ```typescript
   this.state = KnobState.SPAWNING;
   this.render.visible = true;
   
   this.anim.triggerSpawn(() => {
     // On animation complete
     this.state = KnobState.ACTIVE;
     this.collisionBox.enabled = true;
   });
   ```

### Initial State
- Knobs start in **RETRACTED** state
- Player must use first heart to spawn knobs and begin gameplay
- This encourages strategic heart usage

## Event Listeners

The system uses a listener pattern for loose coupling:

**NPC Events:**
- `onArousalChange(value, npc)` - Arousal value updated
- `onArousalImpulse(impulse, npc)` - New impulse received
- `onCrescendoChange(value, npc)` - Crescendo value updated
- `onCrescendoThreshold(npc)` - Win condition reached
- `onPainThreshold(npc)` - Pain threshold exceeded

**Usage Pattern:**
```typescript
npc.onArousalChange((value, npc) => {
  // Update UI, trigger effects, etc.
});
```

## Future Considerations

1. **Multiple NPCs**: System supports multiple NPCs but only one is active
2. **Knob Slot System**: Knobs occupy slots in the level layout
3. **Currency System**: Top hits give 5 currency, side hits give 1 currency
4. **Animation Refinement**: Current animations use placeholder squash timing, can be tuned for feel
