# V1 Cleanup Plan

## Overview
Post-V1 refactoring to clean up technical debt before V2 prototype development. Focus on reducing code complexity, improving structure, and setting up foundations for future tooling.

## Design Context
- **Level concept**: Each NPC's "mind" is a platforming square with different layouts
- **Future direction**: Expand tree placement editor into full level editor (for both puzzle-solving and level authoring)
- **Philosophy**: Lean prototyping - avoid over-engineering, build foundations that can evolve

## Phase 1: Structural Cleanup

### 1. Remove MonitorPanel Passthrough Layer
**Problem**: ~80% of `MonitorPanel` methods just forward calls to child panels (documented in `docs/RefactorConsiderations/ui-systems-architecture.md`)

**Solution**: 
- Remove `src/ui/monitor/monitor-panel.ts`
- Have `HUDManager` directly own `HeartRatePanel` and `SensationPanel`

### 2. Move Entity Spawning to LevelManager
**Problem**: `game.ts` is too heavy (404 lines), handles entity instantiation, tree placement, input setup, state transitions

**Solution**:
- Create spawn helper methods in `LevelManager`: `spawnHome()`, `spawnKnob()`, `spawnPlatform()`, etc.
- Move all entity creation from `game.ts` to `LevelManager`
- Use hardcoded methods (e.g., `createSomaLevel()`) for now
- Helper methods will serve as foundation for future level editor expansion

**LevelManager Scope**:
- ✅ Handle instantiation and spawning
- ❌ Not handle progression (NPC system handles that)
- ❌ Not data-driven yet (wait until editor needs emerge)

### 3. Remove Economy System Usage
**Problem**: Currency system no longer used (old knob hits added currency)

**Solution**:
- Keep `EconomyManager` class (self-contained, might revisit)
- Remove currency references from `src/entities/knob/knob.ts` (line 213)
- Remove economy display from `src/debug/debug-system.ts`

### 4. Reorganize Folder Structure
**Problem**: Single-file folders create unnecessary nesting

**Solution**:
- Move `src/slots/slot-manager.ts` → `src/systems/slot-manager.ts`
- Keep `src/skills/` as-is (likely to expand)

## Phase 2: Code Review & Simplification
(After Phase 1 completion)

Review classes one at a time for code reduction opportunities:
- Look for panicked iterations that ended up simpler than the code suggests
- Remove unnecessary abstractions
- Identify features that aren't actually needed

**Starting candidates**: `game.ts`, `base-npc.ts`

## Deferred Items

### Debug Code Stripping
- Keep debug system in all builds for now (valuable for prototyping)
- Future: Strip on `npm run export:blog` (needs build tooling decision)

### Softness/Hardness Collision Location
- Currently in `BaseNPC.applyArousalImpulse()` (~35 lines)
- Staying for V2, but BaseNPC is growing large
- Consider moving to `CollisionManager` or `Player` class later

### Tree Placement System
- Working well, leave as-is
- Will expand into full level editor (any entity type, export/import data)
- Current slot-based approach is good foundation

## Keep As-Is

- **Sensor class**: Working well as first-class entity
- **Skills folder**: Keep separate, likely to expand like entities
- **EconomyManager**: Self-contained, might revisit economy features

## Success Metrics
- `game.ts` significantly reduced in size (target: <200 lines)
- Clear separation: game orchestration vs. entity spawning vs. UI management
- Foundation ready for level editor expansion
- No premature abstractions that might conflict with V2 direction
