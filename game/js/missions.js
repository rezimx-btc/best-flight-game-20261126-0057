// missions.js — mission configs for Skyline Courier. All positions are
// literal and deterministic: the same mission plays the same way every run.
// Sky palettes, wind, fuel, rings, storm cells and birds per mission.
(function () {
  'use strict';

  var MISSIONS = {
    1: {
      name: 'Dawn Run',
      sub: 'Calm morning air over the valley — learn the plane, thread 4 rings, land on the far strip.',
      sky: 'day',
      length: 5200,
      fuel: 100,
      fuelDrain: 1.0,
      windBase: 6,
      rings: [
        { x: 1200, y: 300, r: 46 },
        { x: 2200, y: 220, r: 46 },
        { x: 3200, y: 320, r: 46 },
        { x: 4200, y: 200, r: 46 }
      ],
      storms: [
        { x: 2700, y: 425, r: 90 }
      ],
      birds: [
        { x: 1700, y: 150, speed: 24 },
        { x: 3700, y: 385, speed: 30 }
      ],
      strip: { x0: 4800, x1: 5200 }
    },
    2: {
      name: 'Crosswind Ridge',
      sub: 'Dusk over the ridge — stronger gusts, 5 rings, two storm cells and a busier sky.',
      sky: 'dusk',
      length: 6400,
      fuel: 100,
      fuelDrain: 1.1,
      windBase: 16,
      rings: [
        { x: 1200, y: 280, r: 46 },
        { x: 2200, y: 180, r: 46 },
        { x: 3200, y: 340, r: 46 },
        { x: 4300, y: 200, r: 46 },
        { x: 5300, y: 300, r: 46 }
      ],
      storms: [
        { x: 2700, y: 430, r: 100 },
        { x: 4800, y: 115, r: 95 }
      ],
      birds: [
        { x: 1700, y: 385, speed: 26 },
        { x: 2700, y: 145, speed: 32 },
        { x: 3800, y: 420, speed: 28 },
        { x: 4800, y: 385, speed: 34 }
      ],
      strip: { x0: 5900, x1: 6300 }
    },
    3: {
      name: 'Night Storm',
      sub: 'Night leg through the storm belt — 6 rings, heavy gusts, three cells, tight fuel. Land by the strip lights.',
      sky: 'night',
      length: 7200,
      fuel: 110,
      fuelDrain: 1.25,
      windBase: 24,
      rings: [
        { x: 1100, y: 300, r: 46 },
        { x: 2000, y: 200, r: 46 },
        { x: 2900, y: 350, r: 46 },
        { x: 3800, y: 180, r: 46 },
        { x: 4700, y: 320, r: 46 },
        { x: 5600, y: 240, r: 46 }
      ],
      storms: [
        { x: 2500, y: 430, r: 100 },
        { x: 4200, y: 110, r: 95 },
        { x: 6100, y: 420, r: 105 }
      ],
      birds: [
        { x: 1500, y: 120, speed: 30 },
        { x: 2400, y: 425, speed: 26 },
        { x: 3300, y: 130, speed: 34 },
        { x: 5200, y: 405, speed: 30 },
        { x: 6000, y: 140, speed: 36 }
      ],
      strip: { x0: 6600, x1: 7100 }
    }
  };

  // Deterministic pseudo-random from an index (clouds, stars, hills).
  function prand(i) {
    var s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // Fresh per-run copies so staging/playtests never mutate the configs.
  function buildMission(n) {
    var c = MISSIONS[n];
    return {
      num: n,
      name: c.name,
      sub: c.sub,
      sky: c.sky,
      length: c.length,
      fuelMax: c.fuel,
      fuelDrain: c.fuelDrain,
      windBase: c.windBase,
      rings: c.rings.map(function (r, i) {
        return { id: i, x: r.x, y: r.y, r: r.r, state: 'todo' };
      }),
      storms: c.storms.map(function (s) {
        return { x: s.x, y: s.y, r: s.r, flash: 0 };
      }),
      birds: c.birds.map(function (b, i) {
        return { x: b.x, y: b.y, baseY: b.y, speed: b.speed, phase: i * 1.7, gone: false };
      }),
      strip: { x0: c.strip.x0, x1: c.strip.x1 }
    };
  }

  window.FlightMissions = {
    MISSIONS: MISSIONS,
    buildMission: buildMission,
    prand: prand
  };
})();
