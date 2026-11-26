// hud.js — DOM for Skyline Courier: top-bar stats, mission brief, ring
// checklist, weather readout, cargo panel, ticker and overlay screens.
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }

  function fmtAlt(y) {
    // altitude in feet above the field (ground y = 470)
    return Math.max(0, Math.round((470 - y) * 2)) + ' ft';
  }

  function update(state) {
    if (!state) return;
    var p = state.plane;
    el('missionLabel').textContent = state.mission.num + ' / 3';
    el('score').textContent = state.score;
    el('combo').textContent = '×' + state.combo;
    var fuelEl = el('fuel');
    fuelEl.textContent = Math.round(state.fuel);
    fuelEl.className = 'value' + (state.fuel <= 0 ? ' low' : state.fuel < 25 ? ' low' : state.fuel < 45 ? ' warn' : '');
    el('alt').textContent = fmtAlt(p.y);
    el('speed').textContent = Math.round(p.vx) + ' kt';
    var windEl = el('wind');
    windEl.textContent = Math.round(state.windX) + ' kt';
    windEl.className = 'value' + (Math.abs(state.windX) > 18 ? ' warn' : '');
    var hullEl = el('hull');
    hullEl.textContent = Math.round(state.hull) + '%';
    hullEl.className = 'value' + (state.hull < 35 ? ' low' : state.hull < 65 ? ' warn' : '');

    // mission brief
    el('briefPanel').innerHTML =
      '<div class="bName">MISSION ' + state.mission.num + ' — ' + state.mission.name.toUpperCase() + '</div>' +
      state.mission.sub +
      '<br><span class="dim">Route: ' + state.mission.length + ' m · Strip at ' + state.mission.strip.x0 + '–' + state.mission.strip.x1 + ' m · Fuel ' + state.mission.fuelMax + '</span>';

    // ring checklist
    var rh = '';
    for (var i = 0; i < state.mission.rings.length; i++) {
      var r = state.mission.rings[i];
      var cls = r.state === 'passed' ? 'passed' : r.state === 'perfect' ? 'perfect' : r.state === 'missed' ? 'missed' : 'todo';
      var word = r.state === 'passed' ? 'PASSED' : r.state === 'perfect' ? 'PERFECT!' : r.state === 'missed' ? 'MISSED' : 'AHEAD';
      rh += '<div class="ringRow"><span>RING ' + (i + 1) + ' — ' + r.x + ' m</span><span class="rState ' + cls + '">' + word + '</span></div>';
    }
    el('ringPanel').innerHTML = rh;

    // weather
    var w = state.mission;
    var stormTxt = w.storms.length + ' storm cell' + (w.storms.length > 1 ? 's' : '') + ' on route';
    var birdTxt = w.birds.filter(function (b) { return !b.gone; }).length + ' birds in the sky';
    el('weatherPanel').innerHTML =
      'Wind <b>' + Math.round(state.windX) + ' kt</b> gusting' +
      (Math.abs(state.windX) > 18 ? ' <span class="wBad">— strong gusts!</span>' : '') +
      '<br>' + stormTxt + ' <span class="wBad">(hull damage inside)</span>' +
      '<br>' + birdTxt + ' <span class="dim">(30 hull per strike)</span>';

    // cargo
    el('cargoPanel').innerHTML =
      'Parcels: <b>' + state.ringsPassed + ' / ' + state.mission.rings.length + '</b> rings flown' +
      '<br>Delivered on landing: <span class="cDone">+' + (200 + 150) + ' base</span>' +
      '<br><span class="dim">Land inside the green strip, descent &lt; 110, speed 50–250.</span>';

    // ticker / caption
    if (state.caption) el('ticker').textContent = state.caption;
  }

  function showOverlay(title, text, statsHtml, btnLabel) {
    el('overlayTitle').textContent = title;
    el('overlayText').textContent = text;
    el('overlayStats').innerHTML = statsHtml || '';
    el('overlayBtn').textContent = btnLabel;
    el('overlay').classList.remove('hidden');
  }

  function hideOverlay() {
    el('overlay').classList.add('hidden');
  }

  window.FlightHud = {
    update: update,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay
  };
})();
