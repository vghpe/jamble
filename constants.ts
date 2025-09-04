namespace Jamble {
  export const Const = {
    JUMP_STRENGTH: 7,
    GRAVITY_UP: 0.32,
    GRAVITY_MID: 0.4,
    GRAVITY_DOWN: 0.65,
    PLAYER_SPEED: 130,
    // Dash tuning
    DASH_SPEED: 280,          // extra px/s while dashing
    DASH_DURATION_MS: 220,    // how long a dash lasts
    START_FREEZE_TIME: 3000,
    DEATH_FREEZE_TIME: 500,   // how long the wiggle runs
    SHOW_RESET_DELAY_MS: 150, // short beat before showing reset button
    PLAYER_START_OFFSET: 10,
    DEATH_WIGGLE_DISTANCE: 1
  } as const;
}

