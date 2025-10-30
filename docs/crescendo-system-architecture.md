# Crescendo System Architecture

This document explains how the crescendo meter fills and triggers the win state, tracking the data flow from NPC arousal through to UI rendering.

## Overview

The crescendo system is a win condition mechanic where the player must maintain the NPC's arousal within a specific "sweet spot" range to fill a crescendo meter. When the meter reaches 100%, the win state triggers.

## System Components

### 1. NPC Arousal System (`BaseNPC`)

The foundation of the crescendo system is the NPC's arousal value, which tracks stimulation over time.

#### Arousal Value
- **Range**: `-1.0` to `6.0` (configurable via `NPCArousalConfig`)
- **Baseline**: `0.2` (default resting state)
- **Current Implementation (Soma)**: 
  - Min: `-1.0`
  - Max: `6.0`
  - Baseline: `0.2`
  - Pain Threshold: `5.0`

#### Arousal Changes
Arousal increases through **impulses** (player interactions like knob hits):
```typescript
applyArousalImpulse(intensity: number, player?: Player, collisionType?: 'top' | 'side')
```

Arousal decreases through **decay** over time:
- Decays toward baseline value each frame
- Decay rate affected by player's temperature setting (cold = slower, hot = faster)
- Exception: Fast decay (`2.0/s`) when in pain zone (arousal > pain threshold)

#### Normalization
The arousal value is normalized to `0-1` range for UI display:
```typescript
getArousalNormalized(): number {
  const range = maxValue - minValue; // 6.0 - (-1.0) = 7.0
  return (arousalValue - minValue) / range;
}

getSensationNormalized(): number {
  return this.getArousalNormalized(); // Same calculation
}
```

**Example**: Arousal value of `4.3` → normalized to `(4.3 - (-1.0)) / 7.0 = 0.757`

### 2. Crescendo Meter System (`BaseNPC`)

The crescendo meter tracks sustained arousal within a target zone.

#### Crescendo Configuration (Soma defaults)
```typescript
crescendoConfig = {
  targetArousalValue: 4.3,     // Center of sweet spot
  arousalTolerance: 0.7,       // ±0.7 around target (zone: 3.6-5.0)
  riseRate: 0.15,              // Units per second when in zone
  decayRate: 0.1,              // Units per second when outside zone
  threshold: 1.0,              // Win threshold
  maxValue: 1.0                // Maximum crescendo value
}
```

#### Zone Detection
```typescript
isInCrescendoZone(): boolean {
  const target = 4.3;
  const tolerance = 0.7;
  return arousalValue >= 3.6 && arousalValue <= 5.0;
}
```

#### Crescendo Value Updates
Every frame, the crescendo value changes based on arousal zone:
```typescript
updateCrescendo(deltaTime: number): void {
  if (arousalValue in [3.6, 5.0] && crescendoEnabled) {
    crescendoValue += riseRate * deltaTime;  // +0.15 per second
  } else {
    crescendoValue -= decayRate * deltaTime;  // -0.1 per second
  }
  
  crescendoValue = clamp(0.1, 1.0, crescendoValue);
}
```

**Time to Fill**: From minimum (0.1) to threshold (1.0) takes approximately **6 seconds** at full rise rate.

#### Win Trigger
When `crescendoValue >= threshold (1.0)`:
1. Set `crescendoThresholdReached = true`
2. Freeze crescendo at threshold
3. Lock win expression (`winExpressionLocked = true`)
4. Notify listeners via `onCrescendoThreshold` callbacks

#### Crescendo Enable/Disable
The crescendo can be temporarily disabled (preventing rise but allowing decay):
- **Disabled** when knobs retract due to pain
- **Re-enabled** when knobs extend again
- Decay continues even when disabled

### 3. Game Wiring (`game.ts`)

The game connects NPC changes to UI updates via listener callbacks:

```typescript
// Arousal → Sensation Panel
activeNPC.onArousalChange((value, npc) => {
  hudManager.setSensationValue(npc.getSensationNormalized());
});

// Crescendo → Crescendo Panel
activeNPC.onCrescendoChange((value, npc) => {
  hudManager.setCrescendoValue(npc.getCrescendoNormalized());
});

// Win Condition
activeNPC.onCrescendoThreshold(() => {
  // Win state triggered - handle game win
});
```

### 4. UI Rendering

#### Sensation Panel (`SensationPanel`)
Displays the normalized arousal value as a scrolling line graph:

- **Input**: Normalized value `0-1` from `npc.getSensationNormalized()`
- **Display**: Line graph with color-coded zones
  - Uses 6 color zones mapped from HSL gradient
  - Base hue: `335°` (pink/red)
  - Lightness varies from `96%` (baseline) → `52.1%` (peak at ~3.0) → `12%` (pain at 6.0)
- **Debug Mode**: Shows red dashed line at pain threshold when enabled

#### Crescendo Panel (`CrescendoPanel`)
Displays the crescendo meter as a vertical fill bar:

- **Input**: Normalized value `0-1` from `npc.getCrescendoNormalized()`
- **Display**: Vertical gradient bar with animated wavy top edge
  - Fill height: `panelHeight * crescendoValue`
  - Minimum visible fill: `10%` (so bar is always visible)
  - Gradient: Pink HSL colors (`hsl(350, 80-90%, 50-75%)`)
  - Brighter colors at 100%
  
**Wave Animation**:
```typescript
// Wave parameters (default)
waveSpeed: 15,        // pixels per second horizontal scroll
waveFrequency: 0.9,   // waves per panel width
waveAmplitude: 0.5    // pixels of vertical displacement
```

The wave creates a horizontally scrolling sine wave on the fill's top edge for visual interest.

## Data Flow Summary

```
Player Interaction (knob hit)
  ↓
NPC.applyArousalImpulse()
  ↓
arousalValue updated (clamped to [-1, 6])
  ↓
notifyArousalListeners()
  ↓
Game listener: hudManager.setSensationValue(npc.getSensationNormalized())
  ↓
monitorPanel.setSensationValue() → sensationPanel.setValue()
  ↓
sensationPanel.render() draws line graph
```

```
Every Frame
  ↓
NPC.updateArousal(deltaTime)
  ↓
arousalValue decays toward baseline
  ↓
NPC.updateCrescendo(deltaTime)
  ↓
if isInCrescendoZone() && crescendoEnabled:
  crescendoValue += riseRate * deltaTime
else:
  crescendoValue -= decayRate * deltaTime
  ↓
if crescendoValue >= threshold:
  TRIGGER WIN STATE
else:
  notifyCrescendoChangeListeners()
  ↓
Game listener: hudManager.setCrescendoValue(npc.getCrescendoNormalized())
  ↓
crescendoPanel.setValue()
  ↓
crescendoPanel.render() draws fill bar
```

## Key Mathematical Relationships

### Arousal to Sensation Display
```
Raw Arousal: -1.0 to 6.0 (7 units range)
Normalized: (arousal - (-1.0)) / 7.0
Display: 0-1 range mapped to color zones
```

### Crescendo Fill Rate
```
In zone (3.6 ≤ arousal ≤ 5.0):
  crescendoValue += 0.15 * deltaTime

Out of zone:
  crescendoValue -= 0.1 * deltaTime

Time to fill (0.1 → 1.0): ~6 seconds sustained
Time to empty (1.0 → 0.1): ~9 seconds out of zone
```

### Win Condition
```
Win triggers when: crescendoValue >= 1.0
Once triggered: crescendoValue frozen, game ends
```

## Pain Zone Mechanics

When arousal exceeds pain threshold (`5.0`):
1. Knobs retract automatically
2. `crescendoEnabled` set to `false` (no rise, only decay)
3. Fast decay applied (`2.0/s` instead of normal `0.8/s`)
4. Pain expression locked until arousal drops below threshold
5. Crescendo continues to decay while in pain zone

This creates a risk/reward dynamic where going too high prevents progress.

## Configuration Impact

### Changing Target Zone
To make crescendo easier/harder:
```typescript
// Wider zone = easier
arousalTolerance: 1.0  // Zone: 3.3-5.3

// Narrower zone = harder
arousalTolerance: 0.3  // Zone: 4.0-4.6
```

### Changing Fill Speed
To make win faster/slower:
```typescript
// Faster fill (4 seconds)
riseRate: 0.225

// Slower fill (12 seconds)
riseRate: 0.075
```

### Changing Decay Speed
To make maintenance easier/harder:
```typescript
// Less punishing out-of-zone
decayRate: 0.05  // 18 seconds to empty

// More punishing out-of-zone
decayRate: 0.2   // 4.5 seconds to empty
```

## Current Tuning (Soma)

The current values create this gameplay feel:
- **Sweet spot**: Arousal between `3.6` and `5.0` (normalized: `0.657` to `0.857`)
- **Target**: Arousal around `4.3` (normalized: `0.757`)
- **Danger zone**: Arousal above `5.0` triggers pain/retraction
- **Fill time**: ~6 seconds of sustained sweet-spot play
- **Forgiveness**: Can leave zone briefly (~5 seconds buffer before significant decay)
- **Risk**: Going slightly too high triggers pain cascade

This creates a dynamic where players must maintain careful control rather than simply "hit as hard as possible."
