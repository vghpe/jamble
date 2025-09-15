(function(){
  // Expose API
  (window as any).Jamble = { Game: Jamble.Game, Settings: Jamble.Settings, Skills: {
    InputIntent: Jamble.InputIntent,
    JumpSkill: Jamble.JumpSkill,
    DashSkill: Jamble.DashSkill,
    SkillManager: Jamble.SkillManager
  }};

  // Always load default profile from dist over HTTP(S). Use npm run serve.
  Jamble.Settings.loadFrom('dist/profiles/default.json').finally(function(){
    try { window.dispatchEvent(new CustomEvent('jamble:settingsLoaded')); } catch(_e){}
  });
})();
