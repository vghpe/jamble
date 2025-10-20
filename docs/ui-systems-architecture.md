# UI Systems Architecture

## Overview

Jamble currently has **three distinct UI systems** with different purposes, base classes, and lifecycle management. This document explains each system, their differences, and potential consolidation opportunities.

---

## The Three UI Systems

### 1. **HUD Panels** (Top overlay: Portrait, Monitor, Crescendo)

**Location:** `src/ui/`
- `portrait-panel.ts`
- `monitor/monitor-panel.ts` (contains HeartRatePanel, SensationPanel)
- `crescendo-panel.ts`

**Base Class:** None (raw classes)

**Characteristics:**
- Created directly by HUDManager
- Lifecycle managed by HUDManager
- Each has unique constructor signature and interface
- Positioned via direct DOM manipulation
- Data-driven display (passive - receive values from game)
- No shared base class or interface

**Example:**
```typescript
// Portrait Panel
constructor(parent: HTMLElement, size: number)
setState(state: string): void
render(): void

// Crescendo Panel  
constructor(parent: HTMLElement, width: number, height: number)
setValue(value: number): void
getValue(): number

// Monitor Panel
constructor(parent: HTMLElement, width: number, height: number)
pushData(value: number): void
setSensationValue(value: number): void
```

**Purpose:** Real-time data display (NPC arousal, crescendo progress, activity)

---

### 2. **Control Panel Modules** (Bottom grid: Hearts, Trees, Sliders)

**Location:** `src/ui/modules/`
- `module-base.ts` (base class)
- `heart-module.ts`
- `tree-module.ts`
- `softness-module.ts`
- `temperature-module.ts`

**Base Class:** `ControlModule` (abstract)

**Characteristics:**
- Extend shared `ControlModule` base class ✓
- Lifecycle managed by ControlPanel
- Consistent interface (createElement, resetState, update, render)
- Event-driven (emit custom events: `jamble:reset`, `jamble:heart-used`)
- Grid-based layout (4x4 grid, modules span 1x1 or 3x1)
- Interactive (buttons, sliders)

**Example:**
```typescript
export abstract class ControlModule {
  protected abstract createElement(): HTMLElement;
  protected abstract resetState(): void;
  update(deltaTime: number): void;
  render(): void;
  getId(): string;
  getElement(): HTMLElement;
}
```

**Purpose:** Player controls and game settings

---

### 3. **UI Component Base** (Layout containers: HUDManager, ControlPanel)

**Location:** `src/ui/ui-component-base.ts`

**Base Class:** `UIComponent` (abstract)

**Characteristics:**
- Abstract base class for high-level UI containers
- Auto-repositioning on window resize
- Lifecycle methods (show, hide, destroy)
- Game-relative positioning
- Used by: HUDManager, ControlPanel, (legacy ShopPanel)

**Example:**
```typescript
export abstract class UIComponent {
  protected abstract createContainer(): HTMLElement;
  protected abstract calculatePosition(gameRect: DOMRect): {left, top};
  abstract render(): void;
  
  show(): void;
  hide(): void;
  update(deltaTime: number): void;
  destroy(): void;
}
```

**Purpose:** Container management and positioning

---

## Key Differences

| Aspect | HUD Panels | Control Modules | UI Components |
|--------|-----------|-----------------|---------------|
| **Base Class** | None | ControlModule | UIComponent |
| **Abstraction Level** | Individual widgets | Individual widgets | Containers |
| **Consistency** | ❌ Each unique | ✅ Shared interface | ✅ Shared interface |
| **Lifecycle** | Manual | Managed by ControlPanel | Self-managed |
| **Positioning** | Direct CSS | Grid layout | Game-relative |
| **Event System** | Direct method calls | Custom events | Method calls |
| **Interactivity** | None (display only) | High (buttons, sliders) | Container-level |

---

## The Problem

### HUD Panels Have No Common Interface

**Current Issue:**
```typescript
// To dim HUD panels during editor mode, we need to:
this.sensationPanel.container.style.opacity = '0.5';  // Need to expose 'container'
this.crescendoPanel.???                              // Different API
this.portraitPanel.???                               // Different API
```

**Control Modules Have It:**
```typescript
// All modules can receive same event
window.dispatchEvent(new CustomEvent('jamble:editor-mode-change'));
// All modules implement: setupEditorModeListener()
```

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

## Could They Be Unified?

### Option A: Create `HUDPanel` Base Class (Recommended for now)

**Add a new base class for display-only panels:**

```typescript
abstract class HUDPanel {
  protected container: HTMLElement;
  
  constructor(parent: HTMLElement, width: number, height: number) {
    this.container = this.createElement(parent, width, height);
    this.setupEditorModeListener();
  }
  
  protected abstract createElement(parent: HTMLElement, width: number, height: number): HTMLElement;
  
  abstract update(deltaTime: number): void;
  abstract render(): void;
  
  setDimmed(dimmed: boolean): void {
    this.container.style.opacity = dimmed ? '0.5' : '1';
    this.container.style.pointerEvents = dimmed ? 'none' : 'auto';
  }
  
  resize(width: number, height: number): void {
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
  }
  
  destroy(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
  
  private setupEditorModeListener(): void {
    window.addEventListener('jamble:editor-mode-change', ((e: CustomEvent) => {
      this.setDimmed(e.detail.mode !== 'none');
    }) as EventListener);
  }
}
```

**Refactor effort:** Medium
- Portrait, Crescendo, Monitor panels extend HUDPanel
- Constructor signatures standardized (or made flexible)
- Shared editor mode dimming logic

---

### Option B: Single `UIWidget` Base Class (Future consolidation)

**Create one base class for ALL UI widgets:**

```typescript
abstract class UIWidget {
  protected container: HTMLElement;
  
  // Lifecycle
  abstract update(deltaTime: number): void;
  abstract render(): void;
  destroy(): void;
  
  // Display control
  setDimmed(dimmed: boolean): void;
  show(): void;
  hide(): void;
  
  // Event system
  protected emit(eventName: string, detail?: any): void;
  protected on(eventName: string, handler: Function): void;
  
  // Editor mode
  protected shouldStayActiveInEditorMode(mode: string): boolean {
    return false;
  }
}

// Both extend the same base
class PortraitPanel extends UIWidget { }
class HeartModule extends UIWidget { }
```

**Refactor effort:** High
- Requires rethinking all UI widgets
- Benefits: Complete consistency, easier to add new UI
- Risks: Over-engineering if use cases diverge

---

### Option C: Keep Separate, Add Minimal Interface (Current choice)

**Don't unify, just add a consistent dimming method:**

```typescript
// Add to each HUD panel class individually
setDimmed(dimmed: boolean): void {
  this.container.style.opacity = dimmed ? '0.5' : '1';
  this.container.style.pointerEvents = dimmed ? 'none' : 'auto';
}
```

**Refactor effort:** Low
- Add one method to 3 classes (Portrait, Crescendo, Monitor)
- HUDManager listens to editor mode and calls setDimmed()
- No breaking changes

**Tradeoffs:**
- ✅ Minimal code changes
- ✅ No architectural refactor
- ❌ Duplication (3 copies of setDimmed)
- ❌ No shared interface enforcement
- ❌ Next feature will hit same problem

---

## Recommendation

### Immediate: **Option C** (Minimal changes for tree placement feature)
- Add `setDimmed()` to 3 HUD panel classes
- Implement tree placement overlay
- Ship the feature

### Future: **Option A** (Create `HUDPanel` base class)
- After tree placement is working
- When adding next HUD panel feature
- Refactor Portrait, Crescendo, Monitor to extend HUDPanel
- Benefit: All future HUD panels get editor mode support for free

### Later: **Option B** (Full unification)
- Only if we're adding many more UI widgets
- Only if patterns have stabilized
- Requires careful design to avoid over-abstraction

---

## Current UI Hierarchy

```
UIComponent (abstract)
├── HUDManager
│   ├── PortraitPanel (no base class)
│   ├── MonitorPanel (no base class)
│   │   ├── HeartRatePanel (extends LineGraphPanel)
│   │   └── SensationPanel (extends LineGraphPanel)
│   ├── CrescendoPanel (no base class)
│   └── ControlPanel
│       └── ControlModule (abstract)
│           ├── HeartModule
│           ├── TreeModule
│           ├── SoftnessModule
│           └── TemperatureModule
└── ShopPanel (legacy)
```

---

## Proposed Future Hierarchy (Option A)

```
UIComponent (abstract) ← Containers
├── HUDManager
│   ├── HUDPanel (abstract) ← NEW: Display widgets
│   │   ├── PortraitPanel
│   │   ├── CrescendoPanel
│   │   └── MonitorPanel
│   └── ControlPanel
│       └── ControlModule (abstract) ← Interactive widgets
│           ├── HeartModule
│           ├── TreeModule
│           ├── SoftnessModule
│           └── TemperatureModule
└── ShopPanel (legacy)
```

**Benefits:**
- Clear separation: Containers vs Display vs Interactive
- Shared editor mode logic in `HUDPanel` and `ControlModule`
- Easy to add new panels/modules with correct behavior
- No breaking changes to existing code

---

## Conclusion

**Current state:** We have 3 UI systems with different levels of abstraction and consistency.

**Why it happened:** Iterative development, different use cases, learning as we go.

**Is it a problem?** Only when we need cross-cutting features (like editor mode dimming).

**Solution for now:** Option C (minimal changes)

**Solution for later:** Option A (add HUDPanel base class when we touch HUD code next)

**Not recommended:** Full rewrite unless we're adding 10+ more UI widgets and patterns are stable.
