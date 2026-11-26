// render.js — canvas drawing for Skyline Courier. Pure pixels: sky palettes
// per mission, parallax clouds and hills, ground + runways, checkpoint
// rings, storm cells, birds, the cargo plane (pitched, propeller spinning)
// and score floaters. No images, no network.
(function () {
  'use strict';

  var W = 880, H = 540;
  var GROUND_Y = 470;
  var PLANE_SX = 250;

  var SKIES = {
    day:   { top: '#6fb6e8', mid: '#a8d4f0', low: '#dceffb', ground: '#5da24a', groundDark: '#4a8a3c', sun: '#fff3b0', sunX: 720, sunY: 80 },
    dusk:  { top: '#2b3a67', mid: '#7a5a8a', low: '#e88a4f', ground: '#4d6b3a', groundDark: '#3d5730', sun: '#ffb347', sunX: 700, sunY: 300 },
    night: { top: '#060d1f', mid: '#0e1d38', low: '#22395c', ground: '#2e4a2e', groundDark: '#243a24', sun: '#f4f1de', sunX: 690, sunY: 90 }
  };

  function prand(i) { return window.FlightMissions.prand(i); }

  function drawSky(ctx, state) {
    var sky = SKIES[state.mission.sky];
    var g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, sky.top);
    g.addColorStop(0.6, sky.mid);
    g.addColorStop(1, sky.low);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);

    var camX = state.plane.worldX - PLANE_SX;
    // stars at night
    if (state.mission.sky === 'night') {
      ctx.fillStyle = '#ffffff';
      for (var i = 0; i < 40; i++) {
        var sx = (prand(i) * 1400 - camX * 0.05) % W;
        if (sx < 0) sx += W;
        var sy = prand(i + 100) * 260;
        ctx.globalAlpha = 0.35 + prand(i + 200) * 0.65;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    ctx.fillStyle = sky.sun;
    ctx.beginPath();
    ctx.arc(sky.sunX, sky.sunY, state.mission.sky === 'night' ? 26 : 34, 0, Math.PI * 2);
    ctx.fill();
    if (state.mission.sky === 'night') {
      ctx.fillStyle = SKIES.night.mid;
      ctx.beginPath();
      ctx.arc(sky.sunX - 12, sky.sunY - 6, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    // clouds (parallax, deterministic)
    ctx.fillStyle = state.mission.sky === 'night' ? 'rgba(120,140,180,0.5)' : 'rgba(255,255,255,0.85)';
    for (var c = 0; c < 9; c++) {
      var cx = (prand(c) * 1600 - camX * 0.3) % 1100;
      if (cx < -120) cx += 1100;
      var cy = 40 + prand(c + 50) * 180;
      var cs = 26 + prand(c + 70) * 26;
      ctx.beginPath();
      ctx.arc(cx, cy, cs, 0, Math.PI * 2);
      ctx.arc(cx + cs * 0.9, cy + 6, cs * 0.7, 0, Math.PI * 2);
      ctx.arc(cx - cs * 0.9, cy + 8, cs * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // distant hills (parallax)
    ctx.fillStyle = sky.groundDark;
    ctx.globalAlpha = 0.55;
    for (var h = 0; h < 6; h++) {
      var hx = (prand(h + 300) * 2000 - camX * 0.55) % 1200;
      if (hx < -200) hx += 1200;
      var hw = 220 + prand(h + 310) * 120;
      var hh = 60 + prand(h + 320) * 70;
      ctx.beginPath();
      ctx.moveTo(hx - hw / 2, GROUND_Y);
      ctx.quadraticCurveTo(hx, GROUND_Y - hh, hx + hw / 2, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGround(ctx, state) {
    var sky = SKIES[state.mission.sky];
    var camX = state.plane.worldX - PLANE_SX;
    ctx.fillStyle = sky.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = sky.groundDark;
    ctx.fillRect(0, GROUND_Y, W, 4);
    // distance ticks every 500 m
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px Verdana, sans-serif';
    ctx.textAlign = 'center';
    for (var d = 0; d <= state.mission.length + 500; d += 500) {
      var sx = d - camX;
      if (sx < -20 || sx > W + 20) continue;
      ctx.fillRect(sx, GROUND_Y + 34, 2, 8);
      ctx.fillText(d + ' m', sx, GROUND_Y + 54);
    }
    // takeoff runway (world 0..520)
    drawRunway(ctx, 0 - camX, 520 - camX, '#3a3f4a', '#f5f5f5');
    // landing strip (green-tinted, with edge lights)
    var st = state.mission.strip;
    drawRunway(ctx, st.x0 - camX, st.x1 - camX, '#2f6b3a', '#ffe082');
    ctx.fillStyle = '#66bb6a';
    ctx.font = 'bold 13px Verdana, sans-serif';
    var midX = (st.x0 + st.x1) / 2 - camX;
    if (midX > -80 && midX < W + 80) ctx.fillText('▼ LANDING STRIP ▼', midX, GROUND_Y - 12);
    // strip edge lights
    ctx.fillStyle = '#ffe082';
    for (var lx = st.x0; lx <= st.x1; lx += 50) {
      var lsx = lx - camX;
      if (lsx < -10 || lsx > W + 10) continue;
      ctx.beginPath();
      ctx.arc(lsx, GROUND_Y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRunway(ctx, x0, x1, color, dashColor) {
    if (x1 < -40 || x0 > W + 40) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.max(0, x0), GROUND_Y + 2, Math.min(W, x1) - Math.max(0, x0), 26);
    ctx.fillStyle = dashColor;
    for (var x = Math.max(0, x0) + 8; x < Math.min(W, x1) - 10; x += 34) {
      ctx.fillRect(x, GROUND_Y + 13, 18, 4);
    }
  }

  function drawRings(ctx, state) {
    var camX = state.plane.worldX - PLANE_SX;
    for (var i = 0; i < state.mission.rings.length; i++) {
      var r = state.mission.rings[i];
      var sx = r.x - camX;
      if (sx < -90 || sx > W + 90) continue;
      var col = r.state === 'passed' ? '#66bb6a' : r.state === 'perfect' ? '#ffd54f' : r.state === 'missed' ? 'rgba(239,83,80,0.5)' : '#4dd0e1';
      ctx.strokeStyle = col;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(sx, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(sx, r.y, r.r - 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (r.state === 'todo') {
        ctx.fillStyle = col;
        ctx.font = 'bold 13px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RING ' + (i + 1), sx, r.y - r.r - 10);
      }
    }
  }

  function drawStorms(ctx, state) {
    var camX = state.plane.worldX - PLANE_SX;
    for (var i = 0; i < state.mission.storms.length; i++) {
      var s = state.mission.storms[i];
      var sx = s.x - camX;
      if (sx < -s.r - 40 || sx > W + s.r + 40) continue;
      // danger radius ring
      ctx.strokeStyle = 'rgba(178,132,255,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // cloud mass
      ctx.fillStyle = '#4a3a6e';
      ctx.beginPath();
      ctx.arc(sx - 30, s.y - 10, 34, 0, Math.PI * 2);
      ctx.arc(sx + 10, s.y - 26, 42, 0, Math.PI * 2);
      ctx.arc(sx + 44, s.y - 6, 30, 0, Math.PI * 2);
      ctx.arc(sx + 6, s.y + 14, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a4fa3';
      ctx.beginPath();
      ctx.arc(sx + 4, s.y - 18, 26, 0, Math.PI * 2);
      ctx.fill();
      // rain streaks
      ctx.strokeStyle = 'rgba(180,200,255,0.6)';
      ctx.lineWidth = 2;
      for (var k = 0; k < 8; k++) {
        var rx = sx - 50 + k * 14;
        ctx.beginPath();
        ctx.moveTo(rx, s.y + 18);
        ctx.lineTo(rx - 6, s.y + 44);
        ctx.stroke();
      }
      // lightning
      if (s.flash > 0) {
        ctx.strokeStyle = '#fff176';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx + 6, s.y + 10);
        ctx.lineTo(sx - 6, s.y + 42);
        ctx.lineTo(sx + 8, s.y + 66);
        ctx.lineTo(sx - 2, s.y + 92);
        ctx.stroke();
      }
      ctx.fillStyle = '#e1bee7';
      ctx.font = 'bold 12px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ STORM', sx, s.y - s.r - 8);
    }
  }

  function drawBirds(ctx, state) {
    var camX = state.plane.worldX - PLANE_SX;
    for (var i = 0; i < state.mission.birds.length; i++) {
      var b = state.mission.birds[i];
      if (b.gone) continue;
      var sx = b.x - camX;
      if (sx < -40 || sx > W + 40) continue;
      var flap = Math.sin(state.elapsed * 10 + b.phase) * 7;
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - 12, b.y - flap);
      ctx.quadraticCurveTo(sx, b.y + 2, sx, b.y);
      ctx.quadraticCurveTo(sx, b.y + 2, sx + 12, b.y - flap);
      ctx.stroke();
    }
  }

  function drawPlane(ctx, state) {
    var p = state.plane;
    var px = PLANE_SX;
    var py = p.y;
    var shakeX = state.shake > 0 ? (prand(Math.floor(state.elapsed * 40)) - 0.5) * 6 : 0;
    var shakeY = state.shake > 0 ? (prand(Math.floor(state.elapsed * 40) + 7) - 0.5) * 6 : 0;
    ctx.save();
    ctx.translate(px + shakeX, py + shakeY);
    ctx.rotate(-p.pitch);
    // shadow on ground when low
    ctx.restore();
    ctx.save();
    if (p.airborne && p.y < GROUND_Y - 10) {
      var hFrac = Math.min(1, (GROUND_Y - p.y) / 260);
      ctx.globalAlpha = 0.25 * (1 - hFrac);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(px, GROUND_Y + 30, 34 * (1 - hFrac * 0.5), 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.translate(px + shakeX, py + shakeY);
    ctx.rotate(-p.pitch);
    // propeller (spins with throttle)
    var propA = state.elapsed * (10 + p.throttle * 40);
    ctx.strokeStyle = 'rgba(60,60,60,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30 + Math.cos(propA) * 16, Math.sin(propA) * 16);
    ctx.lineTo(30 - Math.cos(propA) * 16, -Math.sin(propA) * 16);
    ctx.stroke();
    // tail wing
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.lineTo(-36, -14);
    ctx.lineTo(-28, -14);
    ctx.lineTo(-18, -4);
    ctx.closePath();
    ctx.fill();
    // fuselage
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.quadraticCurveTo(-28, -10, -6, -11);
    ctx.quadraticCurveTo(18, -12, 30, -3);
    ctx.quadraticCurveTo(32, 2, 18, 5);
    ctx.quadraticCurveTo(-6, 9, -26, 6);
    ctx.closePath();
    ctx.fill();
    // wing
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(8, -8);
    ctx.lineTo(2, 12);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();
    // cockpit window
    ctx.fillStyle = '#b3e5fc';
    ctx.beginPath();
    ctx.ellipse(14, -6, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // cargo door
    ctx.strokeStyle = '#8d6e00';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-14, -6, 12, 11);
    // wheels
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(-12, 10, 4, 0, Math.PI * 2);
    ctx.arc(14, 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFloaters(ctx, state) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Verdana, sans-serif';
    for (var i = 0; i < state.floaters.length; i++) {
      var f = state.floaters[i];
      ctx.globalAlpha = Math.min(1, f.ttl);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - (2.4 - f.ttl) * 30);
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx, state) {
    ctx.clearRect(0, 0, W, H);
    drawSky(ctx, state);
    drawGround(ctx, state);
    drawRings(ctx, state);
    drawStorms(ctx, state);
    drawBirds(ctx, state);
    drawPlane(ctx, state);
    drawFloaters(ctx, state);
    // storm flash overlay
    for (var i = 0; i < state.mission.storms.length; i++) {
      if (state.mission.storms[i].flash > 0) {
        ctx.fillStyle = 'rgba(255,241,118,' + (state.mission.storms[i].flash * 1.2) + ')';
        ctx.fillRect(0, 0, W, GROUND_Y);
      }
    }
  }

  window.FlightRender = { draw: draw, W: W, H: H };
})();
