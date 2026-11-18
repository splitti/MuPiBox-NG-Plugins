/* MuPi Run – deterministic, independent endless-runner rules (MIT). */
(function (root, factory) {
  'use strict';
  const game = factory();
  if (typeof module === 'object' && module.exports) module.exports = game;
  if (root) root.MuPiRun = game;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LANES = [-1, 0, 1];
  // Generous timing for controller and touch reactions.
  const JUMP_DURATION = 1.20;
  const DUCK_DURATION = 1.25;
  const kinds = {
    jump: ['log', 'rock', 'root', 'ripple', 'boot', 'stepping-stones'],
    duck: ['branch', 'vine', 'willow', 'low-bridge'],
    avoid: ['boulder', 'stump', 'reeds', 'basket']
  };

  const ZONES = Object.freeze([
    {name:'river',start:0,end:195},
    {name:'boardwalk',start:195,end:360},
    {name:'forest',start:360,end:530},
    {name:'river',start:530,end:650}
  ]);
  const ZONE_LENGTH = 650;
  function terrainAt(distance) {
    const pos=((distance%ZONE_LENGTH)+ZONE_LENGTH)%ZONE_LENGTH;
    return ZONES.find(z => pos>=z.start && pos<z.end).name;
  }
  function fresh(seed) {
    return {
      phase: 'ready', distance: 0, speed: 13, lane: 0, visualLane: 0,
      jumpAge: -1, duckAge: -1, obstacles: [], spawnIn: 1.5,
      seed: (seed >>> 0) || 0x1badc0de, waves: 0,
      time: 0, crash: null, completedDucks: 0, completedJumps: 0,
      completedDodges: 0, lastTerrain: 'river'
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
    const spawn = (lane,kind,item) => {
      s.obstacles.push({lane,z:83,kind,item,passed:false,checked:false});
    };
    // Playable first three challenges. The low bridge is a REAL collider,
    // spans all three lanes and is overcome only by crouching.
    if(s.waves===0) spawn(-1,'jump','rock');
    else if(s.waves===1) spawn(1,'avoid','boulder');
    else if(s.waves===2) spawn(null,'duck','low-bridge');
    else {
      const terrain=terrainAt(s.distance+60);
      // A recurring low-hanging bridge, independent of the lane, creates
      // genuine duck moments even after the tutorial.
      const bridgeChance=terrain==='boardwalk'?.19:terrain==='forest'?.13:.11;
      if(s.waves%10===0 || random(s)<bridgeChance) {
        spawn(null,'duck','low-bridge');
      }else{
        const firstLane=choice(s,LANES);
        const second=s.distance>=125 && random(s)<Math.min(.67,(s.distance-85)/650);
        const lanes=[firstLane];
        if(second)lanes.push(choice(s,LANES.filter(l=>l!==firstLane)));
        for(const lane of lanes){
          const type=choice(s,s.distance<40?['jump','avoid']:['jump','avoid','duck']);
          const items=terrain==='boardwalk' && type==='jump'?['log','stepping-stones','rock']:
           terrain==='forest' && type==='duck'?['branch','willow','vine']:kinds[type].filter(v=>v!=='low-bridge');
          spawn(lane,type,choice(s,items));
        }
      }
    }
    s.waves++;
  }

  function canPass(s, obstacle) {
    if (obstacle.lane!==null && s.lane!==obstacle.lane) return true;
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
    s.lastTerrain = terrainAt(s.distance);
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
        if (obstacle.kind==='duck') s.completedDucks++;
        else if (obstacle.kind==='jump') s.completedJumps++;
        else s.completedDodges++;
      }
    }
    s.obstacles = s.obstacles.filter(o => o.z > -12);
    return s;
  }

  return Object.freeze({
    fresh, act, step, jumpHeight, ducking, speedAt, intervalAt,
    JUMP_DURATION, DUCK_DURATION, LANES, kinds, terrainAt, ZONES
  });
});