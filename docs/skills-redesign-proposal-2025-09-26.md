# Skills redesign — skills only (2025-09-26)

Goal
- Make skills mirror elements: registry-owned defaults, clear IDs/types, minimal settings/HTML coupling.
- Add a first-class “bank + hand” for skills.

Outcomes
- Skills registry (with emoji symbol) mirrors elements registry.
- Per-type exclusivity (one variant per family/type unless opted out).
- Skill bank (all available) and skill hand (active loadout) managed in code, not hardcoded HTML.
- Settings only provide overrides/persistence; no skill defaults live in settings.

Design (additive, small)
1) Registry + naming
   - Descriptor: `{ id: '<type>.<variant>', name, type, slot, priority?, emoji, defaults, create }`.
   - Helpers: `registerCoreSkills(manager)`, `getCoreSkillDefinitions()`.
   - Registry owns defaults and emoji.
2) Exclusivity
   - Manager enforces single-equip per `type` by default; allow `familyExclusive: false` to opt out.
3) Skill bank + hand
   - New `SkillHandManager` (symmetry with elements) with:
     - `slotLimit` (per lane or start with `movement`).
     - `getBankView()` from registry (id, name, type, emoji, active flag).
     - `getHandView()` for slots (size = limit, each slot has skillId or empty).
     - `setActive(skillId: string, active: boolean)` clamps to slot limit and exclusivity.
   - Game wires `SkillHandManager` -> `SkillManager.equip/unequip`.
4) UI wiring (no hardcoded HTML)
   - Bank list: render from `getBankView()`.
   - Slots: render count from `slotLimit`; icons from descriptor `emoji`.
   - All strings/ids come from the registry/manager.
5) Settings minimization
   - Keep optional `skills.configs[skillId]` overrides only (tuning).
   - Default loadout and slot limits live in a small config alongside registry (see below).

Config (mirrors elements deck config)
- File: `src/skills/registry/skill-deck-config.ts`
  - `CoreSkillDeckConfig = { limits: { movement: 4 }, defaultLoadout: ['move','jump','dash'] }`
  - `deriveSkillsSettings(config)` → `{ slotLimit, defaultLoadout }`
  - Bank is implicitly all registered skills (or allow optional include/exclude arrays).

Naming conventions
- IDs: `<type>.<variant>` lowercase (e.g., `jump.high`).
- Types (families): `move`, `jump`, `dash`, ... exclusive by default.
- Slots (lanes): `movement | utility | ultimate`.
- Files:
  - Implementations: `src/skills/jump.ts`, `dash.ts`, `move.ts`.
  - Registry: `src/skills/registry/core-skills.ts`.
  - Config: `src/skills/registry/skill-deck-config.ts`.
  - Manager: `src/skills/skill-hand-manager.ts`.

Rollout (safe)
1) Add registry `emoji` + helpers; migrate defaults out of settings.
2) Add per-type exclusivity (opt-out supported).
3) Introduce `skill-deck-config.ts` with slot limit + default loadout.
4) Implement `SkillHandManager` and wire Game → SkillManager.
5) Update UI to render bank/hand from managers; remove hardcoded HTML lists.

Acceptance
- Adding a skill/variant = one descriptor entry; UI updates automatically.
- Default loadout/limits come from `skill-deck-config.ts`, not settings or HTML.
- Skills show their symbol from registry `emoji`.
