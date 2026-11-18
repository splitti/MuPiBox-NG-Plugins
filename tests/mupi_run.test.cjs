'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const G = require('../examples/mupi-run/logic.js');

test('start, lane change, stop at riverbanks, jump and crouch',()=>{
  const s=G.fresh(123);
  assert.equal(s.phase,'ready');
  assert.equal(G.act(s,'start'),true);
  G.act(s,'left');G.act(s,'left');assert.equal(s.lane,-1);
  G.act(s,'right');assert.equal(s.lane,0);
  G.act(s,'jump');assert.ok(G.jumpHeight(s)<1);
  assert.equal(G.act(s,'duck'),false);  // cannot duck mid-jump
  for(let i=0;i<8;i++)G.step(s,.05);
  assert.ok(G.jumpHeight(s)>28);
  for(let i=0;i<14;i++)G.step(s,.05);
  assert.equal(s.jumpAge,-1);
  G.act(s,'duck');assert.equal(G.ducking(s),true);
});

test('hazards remain possible: any wave occupies at most two of three lanes',()=>{
  const s=G.fresh(42);G.act(s,'start');
  for(let i=0;i<20000;i++){
    // Clear obstacles by staying in lane with no hazard near collision.
    for(const item of s.obstacles.filter(o=>o.z<19&&o.z>0)){
      if(item.lane===s.lane){
        const free=G.LANES.find(l=>!s.obstacles.some(o=>o.lane===l&&Math.abs(o.z-item.z)<3));
        if(free!==undefined)s.lane=free;
      }
    }
    if(s.phase==='over')break;
    G.step(s,.025);
  }
  assert.ok(s.distance>300,'Runner should be able to progress');
  assert.ok(G.speedAt(200)>G.speedAt(0));
  assert.equal(G.speedAt(99999),29);
  assert.ok(s.waves>5);
});

test('collision and action-specific protection',()=>{
  const fail=G.fresh(33); G.act(fail,'start');
  fail.obstacles=[{lane:0,z:2.04,kind:'avoid',item:'stump',checked:false}];
  G.step(fail,.03);assert.equal(fail.phase,'over');
  const jump=G.fresh(33); G.act(jump,'start');
  G.act(jump,'jump');
  for(let i=0;i<5;i++)G.step(jump,.05);
  jump.obstacles=[{lane:0,z:2.04,kind:'jump',item:'rock',checked:false}];
  G.step(jump,.03);assert.equal(jump.phase,'running');
  const duck=G.fresh(33); G.act(duck,'start');G.act(duck,'duck');
  for(let i=0;i<3;i++)G.step(duck,.05);
  duck.obstacles=[{lane:0,z:2.04,kind:'duck',item:'vine',checked:false}];
  G.step(duck,.03);assert.equal(duck.phase,'running');
});

test('pausing and resume do not secretly advance running distance',()=>{
  const s=G.fresh(99);G.act(s,'start');
  G.step(s,.025);const before=s.distance;
  G.act(s,'pause');G.step(s,20);
  assert.equal(s.distance,before);
  G.act(s,'pause');assert.equal(s.phase,'running');
  G.step(s,.025);assert.ok(s.distance>before);
});

test('all hazard definitions map to an action',()=>{
  const all=Object.values(G.kinds).flat();
  assert.equal(new Set(all).size,all.length);
  assert.equal(G.LANES.length,3);
});
