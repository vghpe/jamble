# State Machine Refactor Proposal

**Date:** November 21, 2025  
**Status:** Proposed

## Current State

### State Manager Architecture

**StateManager** (Polling-based):
- States: `transition | idle | run`
- ~40 references across 6 files
- Components poll state every frame: `if (stateManager.isRunning()) { ... }`
- Transitions via direct method calls: `stateManager.enterIdle()`
- **No event emission**

**EditorModeManager** (Event-driven):
- Modes: `none | entity-placement`
- ~5 references across UI components
- Emits `jamble:editor-mode-change` on state transitions
- Components listen to events instead of polling

### The Problem

Two state machines with different patterns:
- StateManager = polling (legacy pattern)
- EditorModeManager = events (modern pattern)

This creates architectural inconsistency and tight coupling in `game.ts`.

---

## Proposed Changes

### 1. Create `/systems/fsm/` Folder

Separate state machines from managers:

```
/systems/
  fsm/
    game-state-fsm.ts        # GameState: transition/idle/run
    editor-state-fsm.ts      # EditorMode: none/entity-placement
  
  collision-manager.ts       # Existing managers stay here
  economy-manager.ts
  input-manager.ts
  level-manager.ts
```

**Naming convention:** `*-state-fsm.ts` or `*-fsm.ts`

### 2. Make StateManager Event-Driven

Add event emission like EditorModeManager:

```typescript
class GameStateFSM {
  private setState(newState: GameState): void {
    if (this.currentState === newState) return;
    
    const oldState = this.currentState;
    this.currentState = newState;
    
    // Emit event
    window.dispatchEvent(new CustomEvent('jamble:game-state-change', {
      detail: { oldState, newState, timestamp: Date.now() }
    }));
  }
}
```

Components switch from polling to listening:
```typescript
// Before (polling every frame)
if (this.stateManager.isRunning()) { this.show(); }

// After (event-driven)
window.addEventListener('jamble:game-state-change', (e: CustomEvent) => {
  if (e.detail.newState === 'run') this.show();
});
```

### 3. Entity Domain Events

Entities emit events about themselves (FSM/Playmaker pattern):

```typescript
// Home becomes self-contained
class Home {
  constructor() {
    this.sensor.onTriggerEnter = () => this.emitPlayerArrived();
    this.sensor.onTriggerExit = () => this.emitPlayerLeft();
  }
  
  private emitPlayerArrived() {
    window.dispatchEvent(new CustomEvent('jamble:player-arrived-home', {
      detail: { homeId: this.id }
    }));
  }
}

// game.ts coordinates via events (not orchestration)
window.addEventListener('jamble:player-arrived-home', () => {
  // React to event
});
```

**Removes groundSensor hack** - use `onTriggerExit` instead.

---

## Arguments For

✅ **Architectural consistency** - Both state machines use same event pattern  
✅ **Decouples game.ts** - Stops being a God Object that knows everything  
✅ **Matches existing patterns** - Tree placement, editor modes already use events  
✅ **Better debugging** - Events visible in console/devtools  
✅ **Extensible** - New systems can listen without modifying existing code  
✅ **FSM/Playmaker pattern** - Entities emit, systems listen (familiar pattern)  

## Arguments Against

❌ **Refactor scope** - ~8 files, ~200 lines to update  
❌ **Learning curve** - Event flow less obvious than direct calls initially  
❌ **Slight overhead** - Event listeners add boilerplate in constructors  
❌ **Type safety** - CustomEvent detail is `any` (mitigatable with TypeScript)  

---

## Refactor Scope

**Phase 1: FSM folder structure** (~2 files)
- Create `/systems/fsm/` folder
- Move `state-manager.ts` → `fsm/game-state-fsm.ts`
- Move `editor-mode-manager.ts` → `fsm/editor-state-fsm.ts`
- Update imports

**Phase 2: Event-driven StateManager** (~6 files)
- Add event emission to GameStateFSM
- Update listeners:
  - JumpPrompt (polling → events)
  - ControlContainer (polling → events)
  - TapPrompt (polling → events)
  - InputHandler (keep polling - runs every frame anyway)

**Phase 3: Entity events** (~2 files)
- Home emits domain events
- game.ts listens to coordinate state
- Remove groundSensor

**Total: ~10 files, ~250 lines**

---

## Decision

**Recommendation:** Proceed with refactor

**Rationale:**
- Aligns with existing event architecture (tree placement, editor modes)
- Reduces coupling and God Object anti-pattern
- Makes codebase more maintainable and extensible
- FSM pattern familiar from Unity/Playmaker experience

**Risk:** Medium refactor scope, but isolated changes with clear rollback points.
