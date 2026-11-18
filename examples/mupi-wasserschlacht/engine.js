/* MuPi Wasserschlacht – original offline guessing-game logic, MIT. */
const WaterBattle = (() => {
  "use strict";
  const SIZE=8, FLEET=[4,3,3,2], N=SIZE*SIZE;
  const xy=i=>[i%SIZE,Math.floor(i/SIZE)];
  const index=(x,y)=>y*SIZE+x;
  const inside=(x,y)=>x>=0&&x<SIZE&&y>=0&&y<SIZE;
  const empty=()=>({ships:[],shots:Array(N).fill(null)});
  function cellsFor(x,y,length,vertical){
    const cells=[];
    for(let k=0;k<length;k++){
      const xx=x+(vertical?0:k), yy=y+(vertical?k:0);
      if(!inside(xx,yy))return null;
      cells.push(index(xx,yy));
    }
    return cells;
  }
  function canPlace(board,x,y,length,vertical){
    const cells=cellsFor(x,y,length,vertical);
    if(!cells)return false;
    const occupied=new Set(board.ships.flatMap(s=>s.cells));
    return cells.every(i=>{
      const [cx,cy]=xy(i);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(inside(cx+dx,cy+dy)&&occupied.has(index(cx+dx,cy+dy)))return false;
      }
      return true;
    });
  }
  function place(board,x,y,length,vertical){
    if(!canPlace(board,x,y,length,vertical))return false;
    board.ships.push({cells:cellsFor(x,y,length,vertical),length});
    return true;
  }
  function randomFleet(random=Math.random){
    // Randomized recursive backtracking ensures complete non-touching fleets.
    const board=empty();
    function search(n){
      if(n===FLEET.length)return true;
      const choices=[];
      for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)
        for(const v of [false,true])if(canPlace(board,x,y,FLEET[n],v))choices.push([x,y,v]);
      for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
      for(const [x,y,v] of choices){
        place(board,x,y,FLEET[n],v);
        if(search(n+1))return true;
        board.ships.pop();
      }
      return false;
    }
    if(!search(0))throw new Error("No fleet placement found");
    return board;
  }
  function fire(board,i){
    if(!Number.isInteger(i)||i<0||i>=N||board.shots[i]!==null)return null;
    const ship=board.ships.find(s=>s.cells.includes(i));
    if(!ship){board.shots[i]="miss";return {type:"miss",win:false};}
    board.shots[i]="hit";
    const sunk=ship.cells.every(c=>board.shots[c]==="hit");
    if(sunk)for(const c of ship.cells)board.shots[c]="sunk";
    const win=board.ships.every(s=>s.cells.every(c=>board.shots[c]==="sunk"));
    return {type:sunk?"sunk":"hit",win,length:ship.length};
  }
  function chooseShot(shots,level="medium",random=Math.random){
    const free=[];
    for(let i=0;i<N;i++)if(shots[i]===null)free.push(i);
    if(!free.length)return null;
    const pick=a=>a[Math.floor(random()*a.length)];
    if(level==="easy")return pick(free);
    const hits=[];
    for(let i=0;i<N;i++)if(shots[i]==="hit")hits.push(i);
    const neighbors=new Set();
    for(const i of hits){
      const [x,y]=xy(i);
      for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
        const xx=x+dx,yy=y+dy;
        if(inside(xx,yy)&&shots[index(xx,yy)]===null)neighbors.add(index(xx,yy));
      }
    }
    if(level==="medium"){
      if(neighbors.size&&random()<0.85)return pick([...neighbors]);
      return pick(free);
    }
    // "Hard" never receives the hidden ship placements, only observed hits and misses.
    const heat=Array(N).fill(0);
    const active=hits.length>0, remaining=FLEET;
    for(const len of remaining)for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)for(const vertical of [false,true]){
      const cells=cellsFor(x,y,len,vertical);
      if(!cells||cells.some(i=>shots[i]==="miss"||shots[i]==="sunk"))continue;
      const matches=cells.filter(i=>shots[i]==="hit").length;
      if(active&&!matches)continue;
      const weight=1+matches*14;
      for(const i of cells)if(shots[i]===null)heat[i]+=weight;
    }
    const max=Math.max(...free.map(i=>heat[i]));
    if(max<=0)return neighbors.size?pick([...neighbors]):pick(free);
    const best=free.filter(i=>heat[i]===max);
    return pick(best);
  }
  const sunkCount=board=>board.ships.filter(s=>s.cells.every(c=>board.shots[c]==="sunk")).length;
  return {SIZE,FLEET,empty,xy,index,cellsFor,canPlace,place,randomFleet,fire,chooseShot,sunkCount};
})();
if(typeof module!=="undefined")module.exports=WaterBattle;