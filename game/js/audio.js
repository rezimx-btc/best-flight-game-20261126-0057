// audio.js — procedural WebAudio for Skyline Courier. No audio files.
// A low engine hum whose pitch follows the throttle, wind noise, and chimes
// for rings, landings, hits and wins.
(function () {
  'use strict';

  var ctx = null;
  var muted = false;
  var engine = null; // { osc, osc2, gain }

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when) {
    if (muted) return;
    var ac = ensure();
    if (!ac) return;
    var t0 = ac.currentTime + (when || 0);
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, freq) {
    if (muted) return;
    var ac = ensure();
    if (!ac) return;
    var len = Math.floor(ac.sampleRate * dur);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ac.createBufferSource();
    src.buffer = buf;
    var f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = 0.8;
    var g = ac.createGain(); g.gain.value = vol || 0.15;
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start();
  }

  // Continuous engine hum: two detuned saws through a lowpass, pitch and
  // loudness follow the throttle. Started on first user gesture.
  function engineStart() {
    var ac = ensure();
    if (!ac || engine) return;
    var o1 = ac.createOscillator();
    var o2 = ac.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = 70; o2.frequency.value = 71.5;
    var f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 1.2;
    var g = ac.createGain();
    g.gain.value = 0.0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination);
    o1.start(); o2.start();
    engine = { o1: o1, o2: o2, gain: g };
  }

  function engineSet(throttle, airborne) {
    if (!engine || muted) return;
    var ac = ctx;
    if (!ac) return;
    var t = ac.currentTime;
    var base = 55 + throttle * 75 + (airborne ? 12 : 0);
    engine.o1.frequency.setTargetAtTime(base, t, 0.08);
    engine.o2.frequency.setTargetAtTime(base * 1.02, t, 0.08);
    engine.gain.gain.setTargetAtTime(muted ? 0 : 0.028 + throttle * 0.05, t, 0.1);
  }

  function engineStop() {
    if (!engine) return;
    try { engine.o1.stop(); engine.o2.stop(); } catch (e) {}
    engine = null;
  }

  window.FlightAudio = {
    ring: function (perfect) {
      tone(880, 0.12, 'sine', 0.13);
      tone(1174, 0.16, 'sine', 0.11, 0.08);
      if (perfect) { tone(1568, 0.22, 'sine', 0.12, 0.16); }
    },
    miss: function () { tone(311, 0.2, 'square', 0.06); },
    takeoff: function () { noise(0.5, 0.12, 900); tone(392, 0.3, 'triangle', 0.1, 0.05); },
    land: function () {
      tone(523, 0.14, 'triangle', 0.14);
      tone(659, 0.14, 'triangle', 0.14, 0.11);
      tone(784, 0.3, 'triangle', 0.14, 0.22);
    },
    hit: function () { noise(0.18, 0.25, 1200); tone(180, 0.3, 'sawtooth', 0.12); },
    empty: function () { tone(1046, 0.08, 'square', 0.06); tone(1046, 0.08, 'square', 0.06, 0.15); },
    crash: function () {
      noise(0.6, 0.3, 500);
      tone(220, 0.5, 'sawtooth', 0.14);
      tone(147, 0.7, 'sawtooth', 0.12, 0.15);
    },
    win: function () { var n = [523, 659, 784, 1046]; for (var i = 0; i < n.length; i++) tone(n[i], 0.24, 'triangle', 0.14, i * 0.14); },
    lose: function () { var n = [392, 330, 262, 196]; for (var i = 0; i < n.length; i++) tone(n[i], 0.26, 'triangle', 0.12, i * 0.16); },
    toggleMute: function () {
      muted = !muted;
      if (engine) engine.gain.gain.value = muted ? 0 : 0.05;
      return muted;
    },
    isMuted: function () { return muted; },
    unlock: function () { ensure(); engineStart(); },
    engineSet: engineSet,
    engineStop: engineStop
  };
})();
