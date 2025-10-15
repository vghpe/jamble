# Debug Panel Architecture

## Overview

Registry-based debug system where components define their own debug controls. DebugSystem renders registered sections with auto-generated HTML and event handlers.

## Type System

Four control types: display, slider, button, checkbox.

```typescript
interface DebugDisplay {
  type: 'display';
  label: string;
  getValue: () => string | number;
}

interface DebugSlider {
  type: 'slider';
  label: string;
  min: number;
  max: number;
  step?: number;
  getValue: () => number;
  setValue: (value: number) => void;
}

interface DebugButton {
  type: 'button';
  label: string;
  onClick: () => void;
}

interface DebugCheckbox {
  type: 'checkbox';
  label: string;
  getValue: () => boolean;
  setValue: (value: boolean) => void;
}

interface DebugSection {
  title: string;
  controls: (DebugDisplay | DebugSlider | DebugButton | DebugCheckbox)[];
}
```

## Registry API

- `registerSection(id, section)` - Register controls from any system
- `unregisterSection(id)` - Remove a section
- Auto-renders HTML, attaches events, updates displays each frame

## UI Features

- **Vertical stacking** - Each control on its own row
- **Collapsible sections** - Click section header to expand/collapse
- **Live updates** - Display values refresh automatically

## Registered Sections

**Built-in** (in DebugSystem):
- Economy - Currency display
- Player Stats - Position, velocity, grounded state
- Debug Controls - Visual debug toggles (colliders, origins, slots)

**System-defined** (co-located with features):
- HUD Controls - Monitor panel sliders (portrait size, scroll speed, etc.)
- Game Controls - Respawn button
- NPC Configuration - Arousal and crescendo parameters

## Adding New Controls

1. Add `getDebugSection()` to your system:

```typescript
getDebugSection(): Jamble.DebugSection {
  return {
    title: 'My Feature',
    controls: [
      {
        type: 'slider',
        label: 'Speed',
        min: 0,
        max: 100,
        getValue: () => this.speed,
        setValue: (v) => this.speed = v
      },
      {
        type: 'button',
        label: 'Reset',
        onClick: () => this.reset()
      }
    ]
  };
}
```

2. Register in game.ts:

```typescript
this.debugSystem.registerSection('feature-id', mySystem.getDebugSection());
```

Debug config stays co-located with feature code. No need to modify DebugSystem.
