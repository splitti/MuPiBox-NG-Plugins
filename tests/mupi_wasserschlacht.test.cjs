const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../examples/mupi-wasserschlacht/engine.js");
test("random fleet has requested lengths and no contact",()=>{
 for(let run=0;run<120;run++){
  const b=E.randomFleet();
  assert.deepEqual(b.ships.map(s=>s.cells.length),E.FLEET);
  const unique=new Set(b.ships.flatMap(s=>s.cells));assert.equal(unique.size,12);
  for(let a=0;a<b.ships.length;a++)for(let c=a+1;c<b.ships.length;c++)
   for(const ia of b.ships[a].cells)for(const ib of b.ships[c].cells){
    const [ax,ay]=E.xy(ia),[bx,by]=E.xy(ib);assert.ok(Math.abs(ax-bx)>1||Math.abs(ay-by)>1);
   }
 }
});
test("manual placement rejects overlap, neighbors and bounds",()=>{
 const b=E.empty();assert.ok(E.place(b,0,0,4,false));
 assert.equal(E.place(b,2,0,2,false),false);
 assert.equal(E.place(b,4,1,2,true),false);
 assert.equal(E.place(b,7,6,4,false),false);
 assert.ok(E.place(b,5,4,2,true));
});
test("miss, repeated shot, hit, sunk and win",()=>{
 const b=E.empty();E.place(b,0,0,2,false);
 assert.equal(E.fire(b,55).type,"miss");assert.equal(E.fire(b,55),null);
 assert.equal(E.fire(b,0).type,"hit");const last=E.fire(b,1);
 assert.equal(last.type,"sunk");assert.equal(last.win,true);
 assert.equal(E.sunkCount(b),1);
});
test("AI chooses only unknown squares, does not depend on hidden ships",()=>{
 for(const level of ["easy","medium","hard"]){
  const shots=Array(64).fill(null);shots[0]="miss";shots[9]="hit";shots[20]="sunk";
  for(let k=0;k<50;k++){
   const i=E.chooseShot(shots,level);assert.ok(i>=0&&i<64);assert.equal(shots[i],null);
  }
 }
});
test("AI has no valid move when exhausted",()=>{
 for(const level of ["easy","medium","hard"])assert.equal(E.chooseShot(Array(64).fill("miss"),level),null);
});