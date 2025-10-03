(function(){
  // Expose API
  (window as any).Jamble = { Game: Jamble.Game, Settings: Jamble.Settings, Skills: {
    InputIntent: Jamble.InputIntent,
    MoveSkill: Jamble.MoveSkill,
    JumpSkill: Jamble.JumpSkill,
    DashSkill: Jamble.DashSkill,
    SkillManager: Jamble.SkillManager
  }};

  try { window.dispatchEvent(new CustomEvent('jamble:settingsLoaded')); } catch(_e){}
})();
