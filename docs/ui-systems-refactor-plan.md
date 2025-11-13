# UI Systems Refactor Plan

## Current State Analysis

### Existing Architecture Patterns

The codebase currently has **4 distinct UI patterns** that evolved organically:

1. **UIComponent Base Class** - Container/layout pattern with auto-positioning
   - Used by: `HUDManager`, `ControlPanel`, `JumpInstructionPanel`
   - Features: Fixed positioning, resize handling, abstract positioning methods

2. **ControlModule Base Class** - Interactive widget pattern
   - Used by: `HeartModule`, `TreeModule`, `SoftnessModule`, `TemperatureModule`
   - Features: Grid-based sizing, reset events, auto-dimming in editor mode

3. **Direct DOM Panels** - Canvas-based display pattern
   - Used by: `PortraitPanel`, `CrescendoPanel`
   - Features: Canvas rendering, manual dimming, no base class

4. **LineGraphPanel Base Class** - Data visualization pattern
   - Used by: `HeartRatePanel`, `SensationPanel`
   - Features: Scrolling graphs, EMA smoothing, buffer management

5. **Overlay Canvases** - Game-relative pattern
   - Used by: `TapIndicator`, `TreePlacementOverlay`
   - Features: Absolute positioning over canvas, direct pointer events

### Key Problems Identified

1. **Inconsistent base classes** - 4 different patterns with overlapping concerns
2. **Positioning complexity** - Multiple positioning systems fighting each other
3. **Fragmented dimming** - 3 different dimming approaches with no unified interface
4. **Naming confusion** - "Panel" used inconsistently across patterns
5. **Special cases** - Many one-off solutions that complicate maintenance

---

## Conceptual Framework

### The "Fiction" - Three Categories

**A. Instruments** (In-fiction, player's equipment)
- **Monitors**: Display information from the game world
  - Portrait (NPC expression, ID)
  - Sensation (arousal/sensation graph)
  - Crescendo (win condition progress)
  - Activity (heart rate graph - legacy)
  
- **Controls**: Interactive elements that affect gameplay
  - Softness (collision softness adjustment)
  - Temperature (decay rate adjustment)
  - Heart (respawn knobs)
  - Tree Placement (level configuration tool) *- Special: Editor-like but still an instrument*

- **Future**: Level-configurable loadout system ("bring these tools to this level")

**B. UX Prompts** (Out-of-fiction, player guidance)
- Jump instruction ("TAP OR SPACE TO JUMP")
- Tap indicator (blue circle around idle player)
- **Characteristic**: Pure UI helpers, don't exist in game world

**C. Authoring Tools** (Meta-level)
- Entity Placement Overlay (currently tree placement, will expand)
- Debug panels
- **Characteristic**: Development/design tools, not gameplay

---

## Proposed Architecture

### Naming Convention

```
Instruments (in-fiction player equipment):
  Monitors:
    - PortraitMonitor      (was: PortraitPanel)
    - SensationMonitor     (was: SensationPanel)
    - CrescendoMonitor     (was: CrescendoPanel)
    - ActivityMonitor      (was: HeartRatePanel)
  
  Controls:
    - SoftnessControl      (was: SoftnessModule)
    - TemperatureControl   (was: TemperatureModule)
    - HeartControl         (was: HeartModule)
    - TreePlacementControl (was: TreeModule)
    
  Container:
    - InstrumentPanel      (combines: HUDManager + ControlPanel)

UX Prompts (out-of-fiction guidance):
  - JumpPrompt           (was: JumpInstructionPanel)
  - TapPrompt            (was: TapIndicator)

Authoring Tools:
  - EntityPlacementOverlay (was: TreePlacementOverlay, will expand)
  - DebugPanel           (keep as-is)
```

### Folder Structure

**Option A: By Category (Recommended)**
```
ui/
  instruments/
    monitors/
      portrait-monitor.ts
      sensation-monitor.ts
      crescendo-monitor.ts
      activity-monitor.ts
    controls/
      softness-control.ts
      temperature-control.ts
      heart-control.ts
      tree-placement-control.ts
    instrument-panel.ts
  prompts/
    jump-prompt.ts
    tap-prompt.ts
  editor/
    entity-placement-overlay.ts
  debug/
    debug-panel.ts
```

**Option B: Flatter (Alternative)**
```
ui/
  instrument-monitors/
  instrument-controls/
  instrument-panel.ts
  prompts/
  editor/
  debug/
```

### Simplified Base Classes

```typescript
// Single unified base for all UI
abstract class UIElement {
  protected container: HTMLElement;
  protected isVisible: boolean = false;
  
  abstract render(): void;
  abstract update(deltaTime: number): void;
  
  // Unified dimming interface
  setDimmed(dimmed: boolean): void {
    this.container.style.opacity = dimmed ? '0.5' : '1';
    this.container.style.pointerEvents = dimmed ? 'none' : 'auto';
  }
  
  show(): void { /* ... */ }
  hide(): void { /* ... */ }
  destroy(): void { /* ... */ }
}

// Instrument components implement this
interface IInstrumentComponent extends UIElement {
  getCategory(): 'monitor' | 'control';
  shouldDimInEditorMode(editorMode: string): boolean;
}

// UX prompts implement this  
interface IUXPrompt extends UIElement {
  shouldShowInState(gameState: string): boolean;
}
```

**Key Changes:**
- Removed auto-repositioning complexity
- Unified dimming at base level
- Clear categorization via interfaces
- Simpler lifecycle methods

---

## Scaling Strategy

### Current Problem
Multiple components handle positioning independently, making unified scaling difficult.

### Proposed Solution
Apply transform scaling at container level only:

```typescript
class InstrumentPanel {
  setScale(scale: number): void {
    // Scale entire panel as one unit
    this.container.style.transform = `scale(${scale})`;
    this.container.style.transformOrigin = 'top left';
    
    // Adjust spacing to account for scaling
    const scaledHeight = this.actualHeight * scale;
    this.container.style.marginBottom = `${scaledHeight - this.actualHeight}px`;
  }
}
```

**Benefits:**
- Everything scales proportionally
- No per-component positioning logic
- Simpler mobile support
- Consistent across all instruments

**Test Required:** Verify this approach works before committing to full refactor.

---

## Dimming System

### Current State
Three different implementations:
1. Event-based auto-dimming in `ControlModule`
2. Manual `setDimmed()` calls from `HUDManager`
3. Direct container style manipulation

### Proposed Unified System

```typescript
class EditorModeManager {
  private currentMode: 'none' | 'entity-placement' = 'none';
  private activeControl: string | null = null;
  
  enterEditorMode(mode: string, activeControlId: string): void {
    this.currentMode = mode;
    this.activeControl = activeControlId;
    this.notifyModeChange();
  }
  
  exitEditorMode(): void {
    this.currentMode = 'none';
    this.activeControl = null;
    this.notifyModeChange();
  }
  
  private notifyModeChange(): void {
    window.dispatchEvent(new CustomEvent('jamble:editor-mode-change', {
      detail: {
        mode: this.currentMode,
        activeControl: this.activeControl
      }
    }));
  }
}
```

**Dimming Rules:**
- Entity placement mode active:
  - Dim all monitors
  - Dim all controls except tree placement control
  - Keep overlay bright
- No editor mode:
  - All instruments bright
  - UX prompts show/hide based on game state

**Implementation:**
Each instrument component checks if it should dim based on current editor mode.

---

## Migration Path

### Phase A: Test Scaling Assumption (Quick Validation)

**Goal:** Verify transform scaling works before major refactor

**Steps:**
1. Remove `autoReposition` logic from `UIComponent`
2. Apply transform scaling to `HUDManager` container
3. Test on narrow window (simulate mobile)
4. Test all UI interactions still work

**Decision Point:** If scaling doesn't work as expected, adjust plan before proceeding.

---

### Phase B: Rename & Restructure (After Phase A validates)

**Goal:** Align naming with conceptual framework

**Steps:**
1. Rename files according to new convention
2. Create new folder structure (`instruments/`, `prompts/`, `editor/`)
3. Move files to new locations
4. Update all imports and references
5. Update `tsconfig.json` file list

**Files to rename:**
```
PortraitPanel → PortraitMonitor
SensationPanel → SensationMonitor
CrescendoPanel → CrescendoMonitor
HeartRatePanel → ActivityMonitor
SoftnessModule → SoftnessControl
TemperatureModule → TemperatureControl
HeartModule → HeartControl
TreeModule → TreePlacementControl
JumpInstructionPanel → JumpPrompt
TapIndicator → TapPrompt
TreePlacementOverlay → EntityPlacementOverlay
```

**New combined files:**
```
HUDManager + ControlPanel → InstrumentPanel
```

---

### Phase C: Unified Base + Dimming (After Phase B complete)

**Goal:** Simplify architecture with unified patterns

**Steps:**
1. Create simplified `UIElement` base class
2. Add `IInstrumentComponent` and `IUXPrompt` interfaces
3. Refactor all UI components to use new base
4. Implement unified dimming via base class
5. Create `EditorModeManager` singleton
6. Migrate dimming logic to centralized system
7. Remove old dimming implementations

**Expected Outcome:**
- Single base class for all UI
- Consistent dimming behavior
- Clearer separation of concerns
- Less code overall

---

## Special Considerations

### Tree Placement Control

**Unique characteristics:**
- Part of instruments (in-fiction)
- Acts like an editor tool
- Enables the `EntityPlacementOverlay`
- Dims other instruments when active

**Design Decision:**
- Keep as instrument control (not moved to editor category)
- Has special dimming rules (stays bright when active)
- Will serve as model for future level configuration tools

### Activity Monitor (Legacy)

**Current:** HeartRatePanel displays simulated sine wave

**Question:** Is this still needed in V2?
- If yes: Keep as `ActivityMonitor`
- If no: Remove during refactor

### Module Base Class

**Decision pending:** Keep `ControlModule` name or rename?
- Option A: Rename to `InstrumentControl` base class
- Option B: Eliminate entirely, fold into `UIElement`

The name "Control" vs "Module" needs final decision.

---

## Open Questions

1. **Folder structure:** Prefer Option A (by category) or Option B (flatter)?

2. **Control naming:** Better alternatives to "Control"?
   - `SoftnessControl`
   - `SoftnessConfig`
   - `SoftnessTool`
   - Other suggestions?

3. **InstrumentPanel split:** Should it be one class or two?
   - One: `InstrumentPanel` (combines monitors + controls)
   - Two: `InstrumentMonitors` + `InstrumentControls` (with shared parent)

4. **Activity Monitor:** Keep or remove for V2?

5. **Module base class:** Rename to `InstrumentControl` or eliminate?

---

## Success Criteria

After refactor is complete:

✅ **Architecture:**
- Single base class for all UI elements
- Clear categorization (instruments, prompts, authoring)
- Unified scaling system

✅ **Dimming:**
- Consistent dimming interface
- Selective dimming based on editor mode
- Centralized mode management

✅ **Code Quality:**
- Reduced duplication
- Fewer special cases
- Clearer naming conventions
- Better folder organization

✅ **Functionality:**
- All UI works as before
- Mobile scaling functional
- Editor mode dimming works correctly
- No visual regressions

---

## Timeline Estimate

- **Phase A (Validation):** 1-2 hours
- **Phase B (Rename/Restructure):** 3-4 hours
- **Phase C (Unified Base):** 4-6 hours

**Total:** ~8-12 hours of focused work

**Recommended:** Tackle in separate sessions, test thoroughly between phases.

---

## Notes

- This is a larger refactor than MonitorPanel removal
- Benefits compound over time as new UI is added
- Sets foundation for level-configurable instrument loadouts
- Enables smoother expansion of entity placement to full editor
- Consider doing after other Phase 1 cleanup tasks (entity spawning, economy removal)
