# Sensor Architecture Analysis

**Date:** November 19, 2025  
**Status:** Analysis Complete - Implementation Pending

## Current State

### Location
`/src/entities/sensor.ts` - **INCORRECT LOCATION**

Sensor is currently in `/entities` but is not a game entity - it's a component/utility class that extends GameObject.

### What is Sensor?

Sensor is a **trigger collider component** similar to Unity's trigger colliders. It can:
- Attach to parent GameObjects (follow their transform)
- Exist as standalone world triggers
- Detect collision events via callbacks (`onTriggerEnter`, `onTriggerExit`, `onTriggerStay`)
- Be enabled/disabled dynamically

### Current Usage Patterns

#### 1. **Entity-Owned Child Sensors** (Component Pattern)
Entities own sensors internally and expose them via `getSensor()`:

**Home Entity:**
```typescript
private sensor: Sensor;
constructor() {
  this.sensor = new Sensor(`${id}-sensor`, this, 0, -20);
  this.sensor.setTriggerSize(30, 10);
}
getSensor(): Sensor { return this.sensor; }
```
- Position: Above home at -20 offset
- Purpose: Detect player arrival for state transitions
- **Problem:** Behavior configured externally in `game.ts` (tight coupling)

**Tree Entity:**
```typescript
private leafSensor: Sensor;
constructor() {
  this.leafSensor = new Sensor(`${id}-leaf-sensor`, this, 0, offsetY, width, height);
  this.leafSensor.onTriggerEnter = (other) => {
    if (other.id.startsWith('player')) {
      this.anim.triggerWiggle(); // Self-contained!
    }
  };
}
getSensor(): Sensor { return this.leafSensor; }
```
- Position: At leaf canopy position
- Purpose: Trigger wiggle animation on player contact
- ✅ **Self-contained** - callback configured within Tree constructor

#### 2. **World-Level Sensors** (Standalone Triggers)

**Ground Sensor:**
```typescript
// Created in LevelManager.spawnGroundSensor()
const groundSensor = new Sensor('ground-sensor', undefined, x, y);
groundSensor.setTriggerSize(gameWidth, 5);

// Configured in game.ts setupGroundSensor()
groundSensor.onTriggerEnter = (other) => {
  if (other.id === 'player' && this.stateManager.isRunning()) {
    homeSensor.setEnabled(true); // Reaches across entities!
  }
};
```
- Position: Bottom of game world (full width)
- Purpose: Re-enable home sensor when player lands
- ❌ **Architectural smell** - exists solely to manipulate another entity's sensor

### Manual Registration Problem

Sensors must be **manually added** to `gameObjects` array:

```typescript
// LevelManager
allEntities.push(home, home.getSensor()); // Must remember both!

// Game.ts
this.gameObjects.push(tree);
this.gameObjects.push(tree.getSensor()); // Easy to forget!
```

This is error-prone and breaks encapsulation.

---

## Architectural Issues Identified

### 1. **Inconsistent Sensor Behavior Configuration**

**Tree (Good Pattern):**
- Entity owns sensor
- Entity configures callback internally
- Self-contained, no external coupling

**Home (Problematic Pattern):**
```typescript
// Home.ts - just creates sensor, no behavior
this.sensor = new Sensor(...);

// game.ts - configures behavior externally
setupHomeSensor() {
  const homeSensor = this.home.getSensor();
  homeSensor.onTriggerEnter = (other) => {
    // Complex state logic here
    this.stateManager.enterIdle();
    this.skillManager.setSkillEnabled('jump', false);
  };
}
```

**Why the difference?**  
Home's sensor triggers **cross-system state changes** (StateManager, SkillManager) while Tree's sensor only affects its own animation. This creates tight coupling between game.ts and Home entity.

### 2. **Ground Sensor Anti-Pattern**

The `groundSensor` exists only to re-enable Home's sensor - a circular dependency:

```
Player leaves home → home.sensor disabled
     ↓
Player jumps/runs
     ↓
Player hits groundSensor → home.sensor.setEnabled(true)
```

**Problem:** groundSensor reaches into another entity to manipulate its internal state.

**Root cause:** Lack of event-driven architecture. Should be:
```
Player leaves home → emit 'player-left-home' event
     ↓
Home listens → automatically re-enables own sensor
```

### 3. **Tight Coupling in game.ts**

`game.ts` orchestrates everything through direct method calls:
- `setupHomeSensor()` - configures Home's sensor behavior
- `setupGroundSensor()` - configures ground sensor to affect Home
- `setupTreePlacement()` - configures tree system

This creates a **God Object** anti-pattern where game.ts knows too much about entity internals.

---

## Event Architecture Analysis

### Current Event Patterns in Codebase

The project already uses **domain events extensively**:

**Editor/UI Events:**
- `jamble:editor-mode-change` (EditorModeManager)
- `jamble:control-panel-reset` (ControlContainer)

**Tree Placement Events:**
- `jamble:tree-module-clicked` (TreePlacementControl)
- `jamble:tree-placed` (EntityPlacementOverlay)
- `jamble:tree-removed` (EntityPlacementOverlay)

**Gameplay Events:**
- `jamble:heart-used` (HeartControl → respawn knobs)

### State Manager Comparison

**EditorModeManager** (Event-Driven ✅):
```typescript
class EditorModeManager {
  exitEditorMode(): void {
    this.currentMode = 'none';
    this.notifyModeChange(); // Emits event
  }
  
  private notifyModeChange(): void {
    window.dispatchEvent(new CustomEvent('jamble:editor-mode-change', {
      detail: { mode: this.currentMode, activeControlId: this.activeControlId }
    }));
  }
}
```
Listeners: Player (dimming), UI controls, monitors - all react to events without polling.

**StateManager** (Polling ❌):
```typescript
class StateManager {
  enterIdle(): void {
    this.setState('idle'); // No event emission!
  }
}

// Components poll state every frame:
if (this.stateManager.isRunning()) { ... }
if (this.stateManager.isIdle()) { ... }
```
6+ components poll StateManager every frame instead of listening to state change events.

---

## Proposed Solutions

### 1. **Move Sensor to `/src/core/`**

**Rationale:**
- Sensor is a pure component, not a game entity
- Similar to Unity's collider components (engine core, not gameplay)
- Used by multiple entity types and as standalone triggers
- No entity-specific logic

**New location:** `/src/core/sensor.ts`

### 2. **Entity Domain Events (FSM/Playmaker Pattern)**

Entities should emit events about themselves:

```typescript
// Home entity becomes self-contained
class Home {
  constructor() {
    this.sensor.onTriggerEnter = (other) => {
      if (other.id === 'player') {
        this.emitPlayerArrived();
      }
    };
    
    this.sensor.onTriggerExit = (other) => {
      if (other.id === 'player') {
        this.emitPlayerLeft();
      }
    };
  }
  
  private emitPlayerArrived() {
    window.dispatchEvent(new CustomEvent('jamble:player-arrived-home', {
      detail: { homeId: this.id }
    }));
  }
  
  private emitPlayerLeft() {
    window.dispatchEvent(new CustomEvent('jamble:player-left-home', {
      detail: { homeId: this.id }
    }));
  }
}
```

Benefits:
- ✅ Home is self-contained (owns sensor + behavior)
- ✅ No groundSensor needed (use `onTriggerExit` instead)
- ✅ game.ts listens and coordinates (not orchestrates)
- ✅ Matches existing event patterns (tree placement, editor modes)

### 3. **Event-Driven StateManager**

Make StateManager consistent with EditorModeManager:

```typescript
class StateManager {
  private setState(newState: GameState): void {
    if (this.currentState === newState) return;
    
    const oldState = this.currentState;
    this.currentState = newState;
    this.notifyStateChange(oldState, newState);
  }
  
  private notifyStateChange(oldState: GameState, newState: GameState): void {
    window.dispatchEvent(new CustomEvent('jamble:game-state-change', {
      detail: { oldState, newState, timestamp: Date.now() }
    }));
  }
}
```

Components listen instead of polling:
```typescript
// UI components
window.addEventListener('jamble:game-state-change', (e: CustomEvent) => {
  if (e.detail.newState === 'run') this.show();
  else this.hide();
});
```

**Refactor scope:** ~8 files, ~200 lines
- JumpPrompt, ControlContainer, TapPrompt switch from polling to listening
- Home emits domain events
- game.ts listens and coordinates state transitions

### 4. **FSM Organization**

Create `/src/systems/fsm/` folder for finite state machines:

```
/src/systems/
  fsm/
    game-state-fsm.ts        # GameState: transition/idle/run
    editor-state-fsm.ts      # EditorMode: none/entity-placement
  
  collision-manager.ts
  economy-manager.ts
  input-manager.ts
  level-manager.ts
```

**Naming convention:** `*-state-fsm.ts` or `*-fsm.ts`
- Communicates purpose clearly
- Separates state machines from managers
- Scalable (future: audio-fsm, dialogue-fsm, etc.)

---

## Comparison: Direct Coupling vs Event-Driven

### Current (Tight Coupling):
```typescript
// game.ts knows entity internals
setupHomeSensor() {
  const sensor = this.home.getSensor(); // Reaching into entity
  sensor.onTriggerEnter = (other) => {
    this.stateManager.enterIdle();     // Direct call
    this.skillManager.setSkillEnabled(); // Direct call
  };
}
```

### Proposed (Event-Driven):
```typescript
// Home is self-contained
class Home {
  constructor() {
    this.sensor.onTriggerEnter = () => this.emitPlayerArrived();
  }
}

// game.ts coordinates via events
constructor() {
  window.addEventListener('jamble:player-arrived-home', () => {
    // React to event (no entity knowledge needed)
  });
}
```

---

## Action Items

### Immediate (This Session):
1. ✅ Document sensor architecture analysis
2. ⏳ Move Sensor from `/entities/` to `/core/`
3. ⏳ Update all reference paths

### Future (Follow-up Refactor):
4. Create `/systems/fsm/` folder structure
5. Rename `state-manager.ts` → `game-state-fsm.ts`
6. Rename `editor-mode-manager.ts` → `editor-state-fsm.ts`
7. Make StateManager emit events (like EditorModeManager)
8. Refactor Home to emit domain events
9. Remove groundSensor hack
10. Update listeners to use events instead of polling

### Reference Counts:
- StateManager: ~40 references across 6 files
- Sensor: 17 references across 4 files
- groundSensor: 3 references (can be removed)

---

## Key Insights

1. **Sensor is a component, not an entity** → belongs in `/core`
2. **Event-driven architecture already exists** → EditorModeManager, tree placement, heart system
3. **StateManager is inconsistent** → should emit events like EditorModeManager
4. **Entities should emit domain events** → FSM/Playmaker subscription pattern
5. **game.ts is a God Object** → should coordinate via events, not orchestrate directly
6. **groundSensor is a hack** → symptom of missing event architecture

The codebase wants to be event-driven (evidence: tree placement, editor modes) but has legacy direct-coupling patterns (Home sensor, StateManager polling) that create tight coupling and architectural inconsistencies.
