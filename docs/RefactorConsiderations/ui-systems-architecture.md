# UI Systems Architecture

## Three UI Systems

Jamble has **three distinct UI systems** with different base classes:

### 1. HUD Panels (Top overlay)
**Files:** `portrait-panel.ts`, `crescendo-panel.ts`, `monitor-panel.ts`  
**Base:** None - each has unique API  
**Purpose:** Display-only (NPC state, arousal, crescendo)

### 2. Control Modules (Bottom grid)
**Files:** `modules/heart-module.ts`, `tree-module.ts`, `*-module.ts`  
**Base:** `ControlModule` (shared base class)  
**Purpose:** Interactive controls (buttons, sliders)

### 3. UI Components (Containers)
**Files:** `ui-component-base.ts`  
**Base:** `UIComponent` (shared base class)  
**Purpose:** Layout containers (`HUDManager`, `ControlPanel`)

### Why Are They Different?

**Historical Reasons:**
1. **HUD Panels** were built first, quickly, without anticipating future needs
2. **Control Modules** learned from HUD panels, created a proper base class
3. **UI Components** is a container-level abstraction (different purpose)

**Design Reasons:**
1. HUD panels are purely **data-driven displays** (passive)
2. Control modules are **interactive widgets** (active)
3. Different enough use cases that shared base seemed unnecessary at the time

---

## The Problem: MonitorPanel Passthrough Layer

**MonitorPanel** creates unnecessary indirection between `HUDManager` and `SensationPanel`:

```typescript
// To configure SensationPanel, we need 3 passthroughs:
Game.ts
  → hudManager.setSensationNPC(npc)
    → monitorPanel.setSensationNPC(npc)  // Just forwards
      → sensationPanel.setNPC(npc)       // Actually uses it
```

**Why it's bad:**
- Every new SensationPanel method requires 3 wrapper methods
- MonitorPanel forwards ~80% of its methods (pure boilerplate)
- Hard to discover which class does actual work

**MonitorPanel's actual responsibilities:**
1. Create flex container for HeartRate + Sensation panels ← HUDManager can do this
2. Forward update/render calls ← HUDManager already does this for other panels
3. Forward setter/getter calls ← The problem!

**Analysis:** MonitorPanel adds complexity without adding value.

---

## Architectural Principle

**When to add a layer:**
- ✅ Provides coordination (e.g., ControlPanel manages grid layout)
- ✅ Provides abstraction (e.g., UIComponent handles window resize)
- ✅ Enforces consistency (e.g., ControlModule base class)

**When to remove a layer:**
- ❌ Just forwards >50% of methods (MonitorPanel: ~80%)
- ❌ Just groups related things (use folders or direct ownership)
- ❌ Just hides structure (expose via getters instead)

**Rule of thumb:** If a class forwards >50% of its methods → it's a passthrough layer and should be removed.
