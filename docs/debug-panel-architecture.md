Current debug panel wiring duplicates work every time a new control is added. HUDManager exposes monitor internals via bespoke setters, DebugSystem hard codes HTML for each slider, and even small monitor tweaks mean editing hud-manager, monitor-panel, and the debug system together.

The approach doesn’t scale to other subsystems because each feature would need similar pass-through plumbing and markup. We should move to a registry-style flow where each system registers a compact description of the data it wants to show (labels, current values, control metadata) and DebugSystem just renders whatever is registered.

HUDManager would expose a monitor section definition, EconomyManager would provide its stats section, Player would provide movement metrics, etc. That keeps feature logic co-located and lets the debug UI grow without more cross-file churn.
