// main.js — game state, loop, input, mission flow, screenshot staging,
// debug API. Rules live in physics.js, missions in missions.js, pixels in
// render.js, DOM in hud.js, sound in audio.js.
(function () {
  'use strict';

  var GROUND_Y = 470;
  var PLANE_SX = 250;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var state = null;

  function freshState(missionNum) {
    var m = window.FlightMissions.buildMission(missionNum);
    return {
      phase: 'playing',
      paused: false,
      missionNum: missionNum,
      mission: m,
      score: state ? state.score : 0,
      missionStartScore: state ? state.score : 0,
      combo: 1,
      bestCombo: 1,
      ringsPassed: 0,
      ringsMissed: 0,
      perfectRings: 0,
      fuel: m.fuelMax,
      hull: 100,
      windX: 0,
      windY: 0,
      shake: 0,
      plane: {
        worldX: 0, y: GROUND_Y, vx: 0, vy: 0,
        pitch: 0, throttle: 0, airborne: false
      },
      keys: {},
      floaters: [],
      caption: '',
      elapsed: 0,
      frozen: false,
      loseReason: ''
    };
  }

  function startMission(n) {
    var keepScore = state ? state.score : 0;
    state = freshState(n);
    state.score = keepScore;
    state.missionStartScore = keepScore;
    var m = state.mission;
    state.caption = 'Mission ' + n + ' — ' + m.name + ': throttle up with →, pitch up with ↑ to lift off, then thread ' +
      m.rings.length + ' rings and land on the strip at ' + m.strip.x0 + ' m. Fuel ' + m.fuelMax + ', wind ' + m.windBase + ' kt.';
    window.FlightHud.hideOverlay();
    window.FlightHud.update(state);
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!state) return;
    var now = ts / 1000;
    if (loop.last === undefined) loop.last = now;
    var dt = Math.min(0.05, now - loop.last);
    loop.last = now;
    if (!state.paused) window.FlightPhysics.update(state, dt);
    window.FlightRender.draw(ctx, state);
    window.FlightAudio.engineSet(state.plane.throttle, state.plane.airborne);
    window.FlightHud.update(state);
  }

  // ---- input ----
  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (!state) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    state.keys[k] = true;
    window.FlightAudio.unlock();
    if (k === 'm') {
      window.FlightAudio.toggleMute();
      window.FlightHud.update(state);
      return;
    }
    if (k === 'p' && state.phase === 'playing') {
      state.paused = !state.paused;
      if (state.paused) {
        window.FlightHud.showOverlay('PAUSED',
          'The plane is holding steady. Take a breath — the rings will wait.',
          'SCORE: ' + state.score + ' &nbsp;·&nbsp; MISSION ' + state.mission.num + ' — ' + state.mission.name,
          'RESUME');
      } else {
        window.FlightHud.hideOverlay();
      }
      return;
    }
    if (k === 'r' && (state.phase === 'playing' || state.phase === 'missionLost')) {
      state.score = state.missionStartScore;
      startMission(state.mission.num);
    }
  });
  window.addEventListener('keyup', function (e) {
    if (state) state.keys[e.key.toLowerCase()] = false;
  });

  // Mouse: drag horizontally across the canvas to set the throttle
  // (left = idle, right = full). Clicking the overlay button is separate.
  var dragging = false;
  function throttleFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var frac = (e.clientX - rect.left) / rect.width;
    if (!state || state.phase !== 'playing') return;
    state.plane.throttle = Math.max(0, Math.min(1, frac));
    state.caption = 'Throttle ' + Math.round(state.plane.throttle * 100) + '% — drag across the sky to set it.';
    window.FlightAudio.unlock();
  }
  canvas.addEventListener('pointerdown', function (e) { dragging = true; throttleFromEvent(e); });
  canvas.addEventListener('pointermove', function (e) { if (dragging) throttleFromEvent(e); });
  window.addEventListener('pointerup', function () { dragging = false; });

  document.getElementById('muteBtn').addEventListener('click', function () {
    window.FlightAudio.toggleMute();
    window.FlightHud.update(state);
  });

  document.getElementById('overlayBtn').addEventListener('click', function () {
    if (!state) { startMission(1); return; }
    if (state.paused) {
      state.paused = false;
      window.FlightHud.hideOverlay();
      return;
    }
    if (state.phase === 'missionWon') startMission(state.mission.num + 1);
    else if (state.phase === 'missionLost') {
      state.score = state.missionStartScore;
      startMission(state.mission.num);
    } else if (state.phase === 'campaignWon' || state.phase === 'menu') {
      state.score = 0;
      startMission(1);
    } else if (state.phase === 'playing') {
      startMission(state.mission.num);
    }
  });

  // ---- screenshot staging (?shot=cover|cruise|storm|landing) ----
  // Stages a real mid-game state and freezes timers so the capture is stable.
  // Staging only sets state — it never changes gameplay rules.
  function stageShot(name) {
    if (name === 'cover') {
      startMission(1);
      state.plane.worldX = 600;
      state.plane.y = 330;
      state.plane.vx = 220;
      state.plane.vy = -30;
      state.plane.pitch = 0.14;
      state.plane.throttle = 0.8;
      state.plane.airborne = true;
      state.fuel = 92;
      state.score = 0;
      state.caption = 'Airborne! Climb out and line up ring 1 — the valley route is 5,200 m.';
    } else if (name === 'cruise') {
      startMission(2);
      state.plane.worldX = 2600;
      state.plane.y = 260;
      state.plane.vx = 230;
      state.plane.vy = -12;
      state.plane.pitch = 0.08;
      state.plane.throttle = 0.85;
      state.plane.airborne = true;
      state.mission.rings[0].state = 'passed';
      state.mission.rings[1].state = 'perfect';
      state.ringsPassed = 2;
      state.perfectRings = 1;
      state.fuel = 64;
      state.score = 340;
      state.combo = 1.5;
      state.bestCombo = 1.5;
      state.floaters.push({ x: 250, y: 200, text: '+150 PERFECT!', ttl: 2.4, color: '#ffd54f' });
      state.caption = 'Ring 2 PERFECT — dead centre! Crosswind is pushing; hold the line to ring 3.';
    } else if (name === 'storm') {
      startMission(3);
      state.plane.worldX = 2450;
      state.plane.y = 400;
      state.plane.vx = 190;
      state.plane.vy = 20;
      state.plane.pitch = -0.05;
      state.plane.throttle = 0.7;
      state.plane.airborne = true;
      state.mission.rings[0].state = 'passed';
      state.mission.rings[1].state = 'passed';
      state.ringsPassed = 2;
      state.fuel = 18;
      state.hull = 62;
      state.score = 520;
      state.combo = 1.75;
      state.bestCombo = 1.75;
      state.shake = 1;
      state.mission.storms[0].flash = 0.15;
      state.caption = '⚠ STORM CELL — hull taking damage! FUEL LOW — 18 left. Get out of the cell and find the strip!';
    } else if (name === 'landing') {
      startMission(1);
      state.mission.rings.forEach(function (r) { r.state = 'passed'; });
      state.mission.rings[1].state = 'perfect';
      state.ringsPassed = 4;
      state.perfectRings = 1;
      state.plane.worldX = 4950;
      state.plane.y = GROUND_Y;
      state.plane.vx = 90;
      state.plane.vy = 0;
      state.plane.pitch = 0.03;
      state.plane.throttle = 0.1;
      state.plane.airborne = false;
      state.fuel = 41;
      state.score = 690;
      state.combo = 2;
      state.bestCombo = 2;
      state.floaters.push({ x: 250, y: 400, text: '+460 PERFECT LANDING!', ttl: 2.4, color: '#ffd54f' });
      state.caption = 'PERFECT LANDING — parcels delivered! +460 landing bonus, combo ×2.';
    }
    state.frozen = true;
    // frozen staging never runs update(), so set the live wind readout here
    state.windX = state.mission.windBase;
    state.windY = 0;
    window.FlightHud.update(state);
  }

  // ---- boot ----
  state = freshState(1);
  state.phase = 'menu';
  state.score = 0;
  window.FlightHud.showOverlay('SKYLINE COURIER',
    'Three missions. One little cargo plane. Take off from the runway, thread every checkpoint ring, dodge birds and storm cells, watch your fuel — and land soft on the strip to deliver the parcels. Land too hard and the cargo is scrap.',
    '', 'START MISSION 1');

  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  if (shot) stageShot(shot);
  requestAnimationFrame(loop);

  // ---- debug API for the scripted playtest (window.__flight) ----
  // The autopilot drives the REAL input path: it sets state.keys each tick
  // (throttle / pitch keys) and calls the real update(), exactly as a
  // player would — no teleporting through rings.
  function autopilotStep(dt) {
    var p = state.plane;
    var m = state.mission;
    var targetY, targetSpeed;
    if (!p.airborne) {
      targetY = GROUND_Y - 160;
      targetSpeed = 260;
    } else {
      var nextRing = null;
      for (var i = 0; i < m.rings.length; i++) {
        if (m.rings[i].state === 'todo' && m.rings[i].x > p.worldX - 10) { nextRing = m.rings[i]; break; }
      }
      if (nextRing) {
        targetY = nextRing.y;
        targetSpeed = 235;
      } else if (p.worldX < m.strip.x0 - 600) {
        targetY = GROUND_Y - 200;
        targetSpeed = 220;
      } else if (p.worldX < m.strip.x0) {
        // final glide: shallow descent onto the strip centre
        targetY = GROUND_Y - Math.max(0, (m.strip.x0 + 150 - p.worldX) * 0.33);
        targetSpeed = 130;
      } else {
        targetY = GROUND_Y - 5;
        targetSpeed = 95;
      }
    }
    // desired pitch from desired vertical speed
    var desiredVy = Math.max(-170, Math.min(170, (targetY - p.y) * 1.5));
    var denom = Math.max(40, p.vx * 0.9);
    var desiredPitch = Math.asin(Math.max(-0.55, Math.min(0.55, -(desiredVy - state.windY) / denom)));
    state.keys['arrowup'] = p.pitch < desiredPitch - 0.02;
    state.keys['arrowdown'] = p.pitch > desiredPitch + 0.02;
    state.keys['arrowright'] = p.vx < targetSpeed - 8;
    state.keys['arrowleft'] = p.vx > targetSpeed + 12;
    // flare: kill throttle over the strip so the touchdown is gentle
    if (p.airborne && p.worldX >= m.strip.x0 - 80) {
      state.keys['arrowright'] = false;
      state.keys['arrowleft'] = true;
      state.keys[' '] = true;
    } else {
      state.keys[' '] = false;
    }
    window.FlightPhysics.update(state, dt);
  }

  window.__flight = {
    state: function () { return state; },
    startMission: startMission,
    tick: function (dt) { window.FlightPhysics.update(state, dt); },
    setThrottle: function (v) { state.plane.throttle = v; },
    setPitch: function (v) { state.plane.pitch = v; },
    setFuel: function (v) { state.fuel = v; },
    setHull: function (v) { state.hull = v; },
    teleport: function (worldX, y) { state.plane.worldX = worldX; state.plane.y = y; },
    setKeys: function (k) { state.keys = k; },
    autopilotStep: autopilotStep,
    // Fly mission N start-to-finish through the real input path.
    completeMission: function (n) {
      startMission(n || 1);
      var guard = 0;
      var log = [];
      while (state.phase === 'playing' && guard < 6000) {
        autopilotStep(0.05);
        guard++;
        if (guard % 400 === 0) {
          log.push('t=' + (guard * 0.05).toFixed(0) + 's x=' + Math.round(state.plane.worldX) +
            ' y=' + Math.round(state.plane.y) + ' vx=' + Math.round(state.plane.vx) +
            ' fuel=' + Math.round(state.fuel) + ' rings=' + state.ringsPassed);
        }
      }
      return {
        phase: state.phase,
        score: state.score,
        ringsPassed: state.ringsPassed,
        ringsMissed: state.ringsMissed,
        perfectRings: state.perfectRings,
        fuel: Math.round(state.fuel),
        hull: Math.round(state.hull),
        worldX: Math.round(state.plane.worldX),
        loseReason: state.loseReason || '',
        steps: guard,
        log: log
      };
    }
  };
})();
