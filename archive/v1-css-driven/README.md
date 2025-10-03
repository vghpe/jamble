# CSS-Driven Architecture (v1)

This is the archived version of the CSS-driven Jamble game architecture.

## Key Characteristics
- Heavy DOM manipulation with `createElement` and direct style properties
- CSS positioning with `style.left`, `style.bottom` 
- Complex element host factories in `core-elements.ts`
- Movement system based on CSS transforms
- Skills system with complex capability providers

## Key Files to Reference
- `src/game/game.ts` - Main game loop and state management
- `src/level/registry/core-elements.ts` - DOM element creation patterns
- `src/skills/` - Skills and movement system
- `src/game/movement-system.ts` - CSS-based movement
- `jamble.css` - All visual styling and animations

## What We're Moving Away From
- Direct DOM manipulation
- CSS-driven positioning and animation
- Complex HTML element creation factories
- Tight coupling between game logic and DOM structure

Archived on: October 3, 2025