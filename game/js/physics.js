// physics.js — the flight model for Skyline Courier.
// Arcade physics, tuned so a steady hand (and the debug autopilot) can fly
// every mission: throttle sets target speed, pitch sets climb/descent,
// low speed stalls into a sink, wind gusts push the plane, storm cells shake
// it and eat hull, birds cost 30 hull, and landings are judged on descent
// rate, speed and strip position. y grows DOWNWARD: pitch up = climb.
(function () {
  'use strict';

  var GROUND_Y = 470;
  var MAXV = 300;          // px/s at full throttle
  var STALL = 95;          // below this the plane sinks
  var PITCH_MAX = 0.55;    // radians
  var PITCH_RATE = 1.15;   // rad/s
  var THROTTLE_RATE = 0.8; // per second

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function floater(state, x, y, text, color) {
    state.floaters.push({ x: x, y: y, text: text, ttl: 2.4, color: color || '#ffd54f' });
  }

  function crash(state, reason) {
    if (state.phase !== 'playing') return;
    state.phase = 'missionLost';
    state.loseReason = reason;
    window.FlightAudio.crash();
    window.FlightHud.showOverlay('MISSION FAILED',
      reason,
      'SCORE: ' + state.score + ' &nbsp;·&nbsp; RINGS: ' + state.ringsPassed + '/' + state.mission.rings.length +
      '<br>DISTANCE: ' + Math.round(state.plane.worldX) + ' m &nbsp;·&nbsp; BEST COMBO: ×' + state.bestCombo,
      'RETRY MISSION ' + state.mission.num);
  }

  function land(state, impactVy) {
    var p = state.plane;
    var soft = Math.max(0, Math.round(110 - impactVy));
    var perfect = impactVy < 45;
    var bonus = 200 + soft + (perfect ? 100 : 0) + 150;
    state.score += bonus;
    state.phase = state.mission.num === 3 ? 'campaignWon' : 'missionWon';
    window.FlightAudio.land();
    floater(state, 250, state.plane.y - 60,
      (perfect ? 'PERFECT LANDING! +' : 'LANDED! +') + bonus, '#ffd54f');
    var stats = 'SCORE: ' + state.score + ' &nbsp;·&nbsp; RINGS: ' + state.ringsPassed + '/' + state.mission.rings.length +
      ' (' + state.perfectRings + ' PERFECT)<br>LANDING BONUS: +' + bonus + ' &nbsp;·&nbsp; HULL: ' +
      Math.round(state.hull) + '% &nbsp;·&nbsp; FUEL LEFT: ' + Math.round(state.fuel) + '<br>BEST COMBO: ×' + state.bestCombo;
    if (state.phase === 'campaignWon') {
      window.FlightAudio.win();
      window.FlightHud.showOverlay('COURIER LEGEND — ALL 3 MISSIONS DONE!',
        'Dawn, dusk and night storm — every parcel delivered, every strip kissed, and the little plane is still in one piece.',
        'FINAL SCORE: ' + state.score + '<br>' + stats, 'FLY AGAIN');
    } else {
      window.FlightAudio.win();
      window.FlightHud.showOverlay('MISSION ' + state.mission.num + ' COMPLETE — PARCELS DELIVERED!',
        state.mission.name + ' done. Next leg is harder: stronger wind, more rings, tighter fuel.',
        stats, 'START MISSION ' + (state.mission.num + 1));
    }
  }

  function update(state, dt) {
    if (!state || state.phase !== 'playing' || state.frozen) return;
    var p = state.plane;
    var m = state.mission;
    state.elapsed += dt;

    // ---- input: throttle + pitch ----
    var keys = state.keys;
    if (keys['arrowright'] || keys['d']) p.throttle = clamp(p.throttle + THROTTLE_RATE * dt, 0, 1);
    if (keys['arrowleft'] || keys['a']) p.throttle = clamp(p.throttle - THROTTLE_RATE * dt, 0, 1);
    if (keys['arrowup'] || keys['w']) p.pitch = clamp(p.pitch + PITCH_RATE * dt, -PITCH_MAX, PITCH_MAX);
    else if (keys['arrowdown'] || keys['s']) p.pitch = clamp(p.pitch - PITCH_RATE * dt, -PITCH_MAX, PITCH_MAX);
    else p.pitch += (0 - p.pitch) * 0.12 * dt; // gentle auto-level
    var flaps = !!(keys[' ']);
    var effThrottle = p.throttle * (flaps ? 0.45 : 1);

    // ---- fuel ----
    if (state.fuel > 0) {
      state.fuel -= (0.2 + effThrottle * 1.5) * m.fuelDrain * dt;
      if (state.fuel <= 0) {
        state.fuel = 0;
        p.throttle = 0;
        state.caption = 'FUEL EMPTY — gliding! Find the strip and land soft!';
        window.FlightAudio.empty();
      }
    } else {
      p.throttle = 0;
    }

    // ---- wind (gusting, deterministic in elapsed time) ----
    var gust = m.windBase * (0.7 + 0.3 * Math.sin(state.elapsed * 0.45 + 1.3));
    state.windX = gust;
    state.windY = gust * 0.22 * Math.sin(state.elapsed * 0.8);

    // ---- speed ----
    var target = effThrottle * MAXV;
    p.vx += (target - p.vx) * 0.55 * dt;
    if (!p.airborne && p.vx < 0) p.vx = 0;

    // ---- vertical velocity from pitch, stall sink, storm turbulence ----
    var vy = -Math.sin(p.pitch) * p.vx * 0.9 + state.windY;
    if (p.airborne && p.vx < STALL) vy += (STALL - p.vx) * 1.15;
    var inStorm = null;
    for (var si = 0; si < m.storms.length; si++) {
      var st = m.storms[si];
      var dx = p.worldX - st.x, dy = p.y - st.y;
      if (dx * dx + dy * dy < st.r * st.r) { inStorm = st; break; }
    }
    if (inStorm) {
      vy += Math.sin(state.elapsed * 11 + inStorm.x) * 55;
      state.hull -= 6 * dt;
      state.shake = 1;
      if (Math.sin(state.elapsed * 2.3 + inStorm.x) > 0.996) inStorm.flash = 0.15;
      if (state.hull <= 0) {
        state.hull = 0;
        crash(state, 'The storm cell tore the plane apart — hull at 0%. Storms shake the airframe: fly around them, not through them.');
        return;
      }
    } else {
      state.shake = Math.max(0, state.shake - dt * 2);
    }
    p.vy = vy;

    // ---- integrate ----
    var prevX = p.worldX;
    p.worldX += (p.vx + state.windX * 0.35) * dt;
    if (!p.airborne) {
      // rolling: pinned to the runway until liftoff speed + pitch
      p.y = GROUND_Y;
      p.vy = 0;
    } else {
      p.y += vy * dt;
    }
    if (p.y < 28) { p.y = 28; p.vy = 0; }

    // ---- birds ----
    for (var bi = 0; bi < m.birds.length; bi++) {
      var b = m.birds[bi];
      if (b.gone) continue;
      b.x -= b.speed * dt;
      b.y = b.baseY + Math.sin(state.elapsed * 2 + b.phase) * 18;
      var bdx = p.worldX - b.x, bdy = p.y - b.y;
      if (bdx * bdx + bdy * bdy < 30 * 30) {
        b.gone = true;
        state.hull -= 30;
        state.combo = 1;
        floater(state, 250, p.y - 50, 'BIRD STRIKE! -30 HULL', '#ff5252');
        state.caption = 'Bird strike! Hull ' + Math.round(state.hull) + '% — dodge the flocks.';
        window.FlightAudio.hit();
        if (state.hull <= 0) {
          state.hull = 0;
          crash(state, 'Bird strike at speed — the plane came apart. Watch the flocks and give them room.');
          return;
        }
      }
    }

    // ---- rings: crossed this tick? ----
    for (var ri = 0; ri < m.rings.length; ri++) {
      var ring = m.rings[ri];
      if (ring.state !== 'todo') continue;
      if (prevX < ring.x && p.worldX >= ring.x) {
        var dy = Math.abs(p.y - ring.y);
        if (dy < ring.r) {
          var perfect = dy < 16;
          var pts = Math.round((perfect ? 150 : 100) * state.combo);
          state.score += pts;
          state.ringsPassed++;
          if (perfect) state.perfectRings++;
          ring.state = perfect ? 'perfect' : 'passed';
          state.combo = Math.min(3, +(state.combo + 0.25).toFixed(2));
          state.bestCombo = Math.max(state.bestCombo, state.combo);
          floater(state, 250, p.y - 60, '+' + pts + (perfect ? ' PERFECT!' : ' RING!'), perfect ? '#ffd54f' : '#4dd0e1');
          window.FlightAudio.ring(perfect);
          state.caption = perfect
            ? 'PERFECT ring — dead centre! +' + pts + ' — combo now ×' + state.combo + '.'
            : 'Ring ' + state.ringsPassed + '/' + m.rings.length + ' — +' + pts + ' — combo ×' + state.combo + '.';
        } else {
          ring.state = 'missed';
          state.ringsMissed++;
          state.combo = 1;
          state.caption = 'Missed a ring — combo reset. Line up the next one early.';
          window.FlightAudio.miss();
        }
      }
    }

    // ---- floaters ----
    for (var fi = state.floaters.length - 1; fi >= 0; fi--) {
      state.floaters[fi].ttl -= dt;
      if (state.floaters[fi].ttl <= 0) state.floaters.splice(fi, 1);
    }
    for (var sj = 0; sj < m.storms.length; sj++) {
      if (m.storms[sj].flash > 0) m.storms[sj].flash -= dt;
    }

    // ---- ground contact ----
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      if (!p.airborne) {
        // rolling on the runway / strip
        p.vy = 0;
        if (p.vx > 130 && p.pitch > 0.08) {
          p.airborne = true;
          state.caption = 'Airborne! Climb out and line up ring 1.';
          window.FlightAudio.takeoff();
        } else if (p.vx < 25 && state.fuel <= 0) {
          crash(state, 'Out of fuel — the plane rolled to a stop short of the strip. Keep some fuel in reserve for the landing.');
          return;
        }
      } else {
        // touchdown while flying: judge it
        var impactVy = p.vy;
        var inStrip = p.worldX >= m.strip.x0 && p.worldX <= m.strip.x1;
        if (inStrip && impactVy < 110 && p.vx >= 50 && p.vx <= 250) {
          p.airborne = false;
          p.vy = 0;
          land(state, impactVy);
          return;
        }
        var why = !inStrip
          ? (p.worldX < m.strip.x0
            ? 'Came down ' + Math.round(m.strip.x0 - p.worldX) + ' m short of the strip — the field is not a runway.'
            : 'Overshot the strip by ' + Math.round(p.worldX - m.strip.x1) + ' m — too much speed on final.')
          : (impactVy >= 110
            ? 'Hard touchdown — descent ' + Math.round(impactVy) + ' px/s snapped the gear. Flare with Space and ease the nose up.'
            : 'Touchdown speed ' + Math.round(p.vx) + ' kt was outside the safe window — land between 50 and 250.');
        crash(state, why);
        return;
      }
    }

    // ---- overshoot: flew past the strip still airborne ----
    if (p.airborne && p.worldX > m.strip.x1 + 400) {
      crash(state, 'Flew past the strip with no runway left. Turn the throttle down earlier and land inside the green strip.');
      return;
    }
  }

  window.FlightPhysics = {
    update: update,
    GROUND_Y: GROUND_Y,
    MAXV: MAXV,
    STALL: STALL,
    land: land,
    crash: crash
  };
})();
