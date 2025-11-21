# NPC Architecture Notes

**Date:** November 21, 2025  
**Context:** BaseNPC design for level-as-character system

## Current Design

**NPCs = Patient Levels** - Each NPC owns the gameplay state (arousal, crescendo, win condition).

**Current Implementation:**
- 1 NPC exists: `Soma` (~100 lines)
- `BaseNPC` base class (~730 lines) does all heavy lifting
- Soma is mostly configuration + expression mapping

## BaseNPC Structure

**Two Core Systems:**
1. **Arousal System** - Primary game state (impulses from player, decay over time, pain threshold)
2. **Crescendo System** - Win condition (rises when arousal in target zone)

**Supporting Systems:**
- Expression system (visual feedback based on state)
- Momentum system (spreads impulses over time for softer interactions)
- Observer pattern (6 listener arrays for UI reactivity)

**Player Modulation:**
- Softness affects impulse strength/momentum split
- Temperature affects arousal decay rate

## Key Stats

- **730 lines** in BaseNPC
- **6 listener types** (arousal, impulse, crescendo, threshold, pain, expression)
- **26 debug controls** for tuning
- **Only 1 subclass** currently (Soma)

## Architectural Assessment

**✅ Works well for:**
- Configuration-driven NPCs (different numbers, same mechanics)
- Prototype/single-level development
- Extensive debug/tuning capabilities

**⚠️ Potential issues:**
- Large monolithic class (no separation of concerns)
- Inheritance from BaseNPC assumes all NPCs use same systems
- Not clear what's truly "base" vs Soma-specific until NPC #2 exists

## Refactor Decision Point

**Wait for NPC #2 before refactoring.**

### Refactor if NPC #2:
- Has **different core mechanics** (no crescendo, multiple arousal zones, new systems)
- Needs **architectural changes** (not just config tweaks)

### Keep as-is if NPC #2:
- Is a **"reskin"** with different tuning parameters
- Uses **same arousal/crescendo systems** with different numbers

### Refactor Options (when needed):

**Option A: Data-Driven NPCs**
- Extract configs to JSON files
- Generic NPC class consumes configuration
- Fast level creation via data

**Option B: Composition over Inheritance**
- Split into systems (ArousalSystem, CrescendoSystem, ExpressionSystem)
- NPCs compose systems they need
- Mix & match mechanics per level

**Option C: Specialized Base Classes**
- Different archetypes (CrescendoNPC, StaminaNPC, etc.)
- Inheritance tree for NPC variants
- Keeps current pattern, adds variety

## Current Recommendation

**For 2-month prototype with uncertain NPC designs:**

1. **Keep BaseNPC as-is** - works fine for configuration-based NPCs
2. **Add section comments** to break up the 730-line file
3. **Design NPC #2** and see what's truly shared vs unique
4. **Refactor after NPC #2** when patterns emerge

**"Rule of Three" - Wait for the second duplication to understand what to abstract.**

## Implementation Note

BaseNPC effectively functions as a **Level State Machine** rather than a traditional character base class. Consider renaming if multiple NPCs never materialize, or if they end up being different state machines entirely.
