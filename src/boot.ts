(function(){
  // Expose API
  (window as any).Jamble = { Game: Jamble.Game, Settings: Jamble.Settings };

  // Only attempt to fetch the profile when served over HTTP(S).
  // Opening demo.html via file:// causes CORS errors for fetch; skip in that case.
  var proto = (typeof location !== 'undefined' ? location.protocol : '');
  var isHttp = proto === 'http:' || proto === 'https:';
  if (isHttp) {
    Jamble.Settings.loadFrom('dist/profiles/default.json').finally(function(){
      try { window.dispatchEvent(new CustomEvent('jamble:settingsLoaded')); } catch(_e){}
    });
  } else {
    // Use embedded defaults without fetching; no console error
    Jamble.Settings.reset();
    try { window.dispatchEvent(new CustomEvent('jamble:settingsLoaded')); } catch(_e){}
  }
})();
