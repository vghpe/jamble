# Gravity Flip Skill — Feature Request (2025-09-27)

## Summary
Add a VVVVVV-style gravity flip skill that toggles the player’s vertical baseline between floor and ceiling. When inverted, the ceiling becomes "ground" and the player’s feet land on it. The skill affects only the player.

## Behavior
- Input: Primary input (tap/air-tap) toggles gravity when the skill is equipped.
- Orientation:
  - Normal: feet toward floor; grounded at jumpHeight = 0 on floor.
  - Inverted: feet toward ceiling; grounded at jumpHeight = 0 on ceiling.
- Mid-air use: Allowed. Flip preserves world Y and vertical speed continuity.
- Landing: When jumpHeight <= 0, land on current ground (floor or ceiling), reset dash availability, and play landing squash.
- No effect on level elements; collisions are unchanged except that the player treats the ceiling as ground when inverted.

## Physics Model
- State variables
  - jumpHeight: distance from current ground (0 means grounded).
  - velocity: positive = moving away from ground; negative = moving toward ground.
  - inverted: whether gravity is flipped (ground is ceiling).
- Gravity application
  - Gravity accelerates toward the current ground using existing tiered magnitudes (gravityUp/mid/down) applied as `velocity -= g * dt60`.
- Flip mapping
  - Let `h = gameHeight`, `ph = playerHeight`, `maxY = h - ph`.
  - Preserve world Y across flip by setting `jumpHeight' = maxY - clamp(jumpHeight, 0..maxY)`.
  - Invert velocity: `velocity' = -velocity`.
  - Set `isJumping = (jumpHeight' > 0)`.

## Visuals
- Outer element (`.jamble-player`): world transform only; no animated transition.
- Inner visual (`.jamble-player-inner`): squash/stretch and wiggle only.
  - transformOrigin:
    - Normal: `50% 100%` (feet at floor)
    - Inverted: `50% 0%` (feet at ceiling)
  - Scale: `scaleY` flips sign when inverted to mirror pose.
- Landing squash:
  - Triggered on landing in either orientation.
  - Use existing land squash/restore timings, anchored by `transform-origin`.

## Interactions with Other Skills
- Jump: Can co-exist or be excluded by design. If co-existing, Jump applies a positive impulse (away from ground) relative to current orientation.
- Dash: Dash freezes vertical position during dash as today. Flip during dash is permitted; post-dash gravity acts toward the new ground.
- Hover: Hover suspends gravity; flip changes orientation while hovering. On exit hover, the player starts falling toward current ground.
- Run end / edge arrival: Existing logic that nudges vertical velocity toward ground still applies and works in both orientations.

## Config
- Skill defaults
  - cooldownMs: 120–200 (prevent spam/double-tap flutters). Suggested default: 150ms.
- Optional UX toggles
  - Block flip during dash (default: false).
  - Visual indicator when inverted (tint or icon) (default: off).

## Acceptance Criteria
- With skill equipped, tapping toggles gravity mid-air and grounded.
- When inverted, feet reliably land on the ceiling (no penetration; jumpHeight clamps to 0 on landing).
- World Y and vertical speed are preserved at the flip moment (no teleport).
- Landing squash appears anchored to the relevant ground (floor or ceiling) with no offset between visual and collider.
- Dash/hover/run-end behaviors remain consistent; exiting hover or dash resumes falling toward current ground.
- Only the player is affected by the flip.

## Edge Cases
- Flip while grounded transitions immediately into airtime if distance to new ground > 0.
- Flip repeatedly; cooldown prevents rapid flicker.
- Container resizes mid-run; calculations use current game element dimensions and remain stable.
- Sub-pixel rounding; world Y snap within <= 1px to avoid jitter if necessary.

## Debugging & Telemetry
- Feature flag to log flip state changes (inverted, jumpHeight, velocity, worldY, outer/inner rects) when `window.__debugFlip` is enabled.
- Optional temporary disable of inner transitions for one frame during flip to avoid anchor tweens.

## Risks & Mitigations
- Visual/collider misalignment: Rely on inner-only scale with transformOrigin and no inner translateY; outer remains position-only.
- Large CSS tweens: Keep outer transition off; briefly disable inner transitions during flip.

## Implementation Notes
- Add `flipGravity()` to PlayerCapabilities that toggles `Player.inverted` and remaps `jumpHeight` as above.
- Implement `GravityFlipSkill` (movement slot, priority higher than Jump) with a short cooldown.
- Register skill in `core-skills` with symbol and defaults.
- Keep Player’s vertical update and squash unchanged aside from orientation handling and transform origin.
