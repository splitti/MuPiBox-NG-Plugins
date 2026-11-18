/* MuPi Run – deterministic, independent endless-runner rules (MIT). */
(function (root, factory) {
  'use strict';
  const game = factory();
  if (typeof module === 'object' && module.exports) module.exports = game;
  if (root) root.MuPiRun = game;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LANES = [-1, 0, 1];
  const JUMP_DURATION = 0.93;
  const DUCK_DURATION = 0.88;
  const kinds = {
    jump: ['log', 'rock', 'root', 'ripple', 'boot'],
    duck: ['branch', 'vine', 'willow'],
    avoid: ['boulder', 'stump', 'reeds', 'basket']
  };

  function fresh(seed) {
    return {
      phase: 'ready', distance: 0, speed: 13, lane: 0, visualLane: 0,
      jumpAge: -1, duckAge: -1, obstacles: [], spawnIn: 1.5,
      seed: (seed >>> 0) || 0x1badc0de, waves: 0,
      time: 0, crash: null
    };
  }

  function random(s) {
    let x = s.seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.seed = x >>> 0;
    return (s.seed >>> 0) / 4294967296;
  }

  function choice(s, items) { return items[Math.floor(random(s) * items.length)]; }
  function speedAt(distance) { return Math.min(29, 13 + distance * 0.022); }
  function intervalAt(distance, speed) {
    // Distances between waves never drop below a safe minimum even at max speed.
    return Math.max(1.17, 2.12 - distance * 0.00108, 28 / speed);
  }
  function jumpHeight(s) {
    if (s.jumpAge < 0 || s.jumpAge >= JUMP_DURATION) return 0;
    return Math.sin(Math.PI * s.jumpAge / JUMP_DURATION) * 82;
  }
  function ducking(s) { return s.duckAge >= 0 && s.duckAge < DUCK_DURATION; }

  function act(s, action) {
    if (action === 'start') {
      if (s.phase === 'ready') { s.phase = 'running'; return true; }
      return false;
    }
    if (action === 'pause') {
      if (s.phase === 'running') { s.phase = 'paused'; return true; }
      if (s.phase === 'paused') { s.phase = 'running'; return true; }
      return false;
    }
    if (s.phase !== 'running') return false;
    if (action === 'left') { s.lane = Math.max(-1, s.lane - 1); return true; }
    if (action === 'right') { s.lane = Math.min(1, s.lane + 1); return true; }
    if (action === 'jump' && s.jumpAge < 0) {
      s.jumpAge = 0; s.duckAge = -1; return true;
    }
    if (action === 'duck' && s.jumpAge < 0) {
      s.duckAge = 0; return true;
    }
    return false;
  }

  function spawnWave(s) {
    const firstLane = choice(s, LANES);
    const second = s.distance >= 125 && random(s) < Math.min(0.72, (s.distance - 90) / 570);
    const lanes = [firstLane];
    if (second) lanes.push(choice(s, LANES.filter(l => l !== firstLane)));
    lanes.forEach(lane => {
      const type = choice(s, s.distance < 40 ? ['jump', 'avoid'] : ['jump', 'avoid', 'duck']);
      s.obstacles.push({
        lane: lane, z: 83, kind: type, item: choice(s, kinds[type]),
        passed: false, checked: false
      });
    });
    s.waves++;
  }

  function canPass(s, obstacle) {
    if (s.lane !== obstacle.lane) return true;
    if (obstacle.kind === 'jump') return jumpHeight(s) >= 28;
    if (obstacle.kind === 'duck') return ducking(s) && s.duckAge >= 0.08;
    return false;
  }

  function step(s, delta) {
    if (s.phase !== 'running' || !Number.isFinite(delta) || delta <= 0) return s;
    const dt = Math.min(0.075, delta); // prevent resume/background frame skips
    s.time += dt;
    if (s.jumpAge >= 0) {
      s.jumpAge += dt;
      if (s.jumpAge >= JUMP_DURATION) s.jumpAge = -1;
    }
    if (s.duckAge >= 0) {
      s.duckAge += dt;
      if (s.duckAge >= DUCK_DURATION) s.duckAge = -1;
    }
    s.visualLane += (s.lane - s.visualLane) * Math.min(1, dt * 13.5);
    s.speed = speedAt(s.distance);
    const travel = s.speed * dt;
    s.distance += travel;
    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      spawnWave(s);
      s.spawnIn += intervalAt(s.distance, s.speed);
    }

    for (const obstacle of s.obstacles) {
      const was = obstacle.z;
      obstacle.z -= travel;
      if (!obstacle.checked && was > 1.9 && obstacle.z <= 1.9) {
        obstacle.checked = true;
        if (!canPass(s, obstacle)) {
          s.phase = 'over';
          s.crash = obstacle.item;
          break;
        }
        obstacle.passed = true;
      }
    }
    s.obstacles = s.obstacles.filter(o => o.z > -12);
    return s;
  }

  return Object.freeze({
    fresh, act, step, jumpHeight, ducking, speedAt, intervalAt,
    JUMP_DURATION, DUCK_DURATION, LANES, kinds
  });
});