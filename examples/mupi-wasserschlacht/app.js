/* MuPi Wasserschlacht – original UI for the MuPiBox-NG Plugin SDK. */
(()=>{"use strict";
const E=WaterBattle, sdk=window.MuPiBoxSDK, $=id=>document.getElementById(id);
const words={
 de:{level:"MuPi-Stärke",easy:"Leicht",medium:"Mittel",hard:"Schlau",new:"Neu",opponent:"MuPis Versteck",own:"Deine Boote",
 rotate:"↻ Drehen",random:"Zufall",start:"Los geht's!",again:"Nochmal!",help:"Boote rechts platzieren. Danach links ein Feld antippen.",
 controller:"Controller: Pfeile · A wählen · X drehen",ready:"Platziere deine Boote!",placed:"Alle Boote sind bereit!",next:"Boot mit {n} Feldern",invalid:"Hier ist zu wenig Platz.",yourTurn:"Du bist dran! Tippe links auf ein Feld.",
 botTurn:"MuPi sucht ein Feld …",miss:"Platsch! Nur Wasser!",hit:"Huch! MuPi bekommt nasse Füße!",sunk:"Oh nein! MuPi braucht den Rettungsring!",win:"Juhu, du hast gewonnen!",lose:"MuPi hat gewonnen. Nächste Runde?",
 ownMiss:"MuPi ist ins Wasser geplumpst!",ownHit:"Auweia! Dein Boot wurde getroffen!",ownSunk:"Blubb! Ein Boot ist untergegangen!",wait:"MuPi ist noch am Zug.",preview:"Vorschau: Fenster schließen"},
 en:{level:"MuPi skill",easy:"Easy",medium:"Normal",hard:"Clever",new:"New",opponent:"MuPi's hideout",own:"Your boats",
 rotate:"↻ Rotate",random:"Random",start:"Let's go!",again:"Play again!",help:"Place your boats on the right. Then tap the left ocean.",
 controller:"Controller: arrows · A select · X rotate",ready:"Place your boats!",placed:"All boats are ready!",next:"Boat with {n} squares",invalid:"Not enough room here.",yourTurn:"Your turn! Tap a square on the left.",
 botTurn:"MuPi is searching …",miss:"Splash! Just water!",hit:"Oops! MuPi's getting wet!",sunk:"Oh no! MuPi needs the lifebuoy!",win:"Hooray, you won!",lose:"MuPi won. Another round?",
 ownMiss:"MuPi splashed into the sea!",ownHit:"Oh dear! Your boat was hit!",ownSunk:"Glug! A boat went down!",wait:"MuPi's turn.",preview:"Preview: close this window"}
};
let lang="de",player=E.empty(),computer=E.empty(),phase="place",turn="player",placed=0,vertical=false,selected=27,epoch=0,muted=false,reactionTimer=0;
const ui={enemy:[],own:[]};
const t=(key,arg)=>((words[lang]||words.de)[key]||words.de[key]||key).replace("{n}",String(arg??""));
function translate(){
 document.documentElement.lang=lang;
 document.querySelectorAll("[data-i18n]").forEach(node=>node.textContent=t(node.dataset.i18n));
 $("title").textContent=lang==="de"?"MuPi Wasserschlacht":"MuPi Splash Battle";
}
function makeGrid(which){
 const element=$(which);
 for(let i=0;i<64;i++){
  const btn=document.createElement("button");
  btn.type="button";btn.className="cell";btn.dataset.i=String(i);
  btn.addEventListener("click",()=>which==="own"?tryPlace(i):tryFire(i));
  btn.setAttribute("aria-label",(which==="enemy"?"Opposite ":"Own ")+String.fromCharCode(65+i%8)+(Math.floor(i/8)+1));
  ui[which].push(btn);element.appendChild(btn);
 }
}
function draw(){
 const ownCell=new Set(player.ships.flatMap(s=>s.cells));
 for(const which of ["enemy","own"]){
  const board=which==="enemy"?computer:player;
  ui[which].forEach((btn,i)=>{
   const shot=board.shots[i];
   btn.className="cell";
   if(which==="own"&&ownCell.has(i))btn.classList.add("ship");
   if(shot)btn.classList.add(shot);
   if(selected===i&&(phase==="place"?which==="own":which==="enemy")&&phase!=="finished")btn.classList.add("aim");
   btn.disabled=phase==="finished"||(which==="enemy"?(phase!=="play"||turn!=="player"||shot!==null):(phase!=="place"));
  });
 }
 $("own-score").textContent=E.sunkCount(player)+" / "+E.FLEET.length;
 $("enemy-score").textContent=E.sunkCount(computer)+" / "+E.FLEET.length;
 $("start").disabled=placed<E.FLEET.length;
 $("placement").hidden=phase!=="place";
 $("game-controls").hidden=phase==="place";
 $("again").hidden=phase!=="finished";
 $("ship-hint").textContent=placed===E.FLEET.length?t("placed"):t("next",E.FLEET[placed])+" "+(vertical?"↕":"↔");
 $("rotate").setAttribute("aria-pressed",String(vertical));
 $("turn").textContent=phase==="finished"?"":turn==="player"?t("yourTurn"):t("botTurn");
}
let audioContext;
function browserSound(kind){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  audioContext=audioContext||new AC();
  if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  const now=audioContext.currentTime;
  // Realistic synthetic watery splash: decaying filtered noise + bubble chirps.
  const duration=kind==="sunk"?.6:kind==="hit"?.34:.22;
  const length=Math.floor(audioContext.sampleRate*duration);
  const buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++){
   const d=i/length;data[i]=(Math.random()*2-1)*Math.pow(1-d,2)*(kind==="sunk"?.6:.38);
  }
  const noise=audioContext.createBufferSource(),low=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  noise.buffer=buffer;low.type="lowpass";low.frequency.value=kind==="miss"?930:1500;
  gain.gain.value=.32;noise.connect(low);low.connect(gain);gain.connect(audioContext.destination);
  noise.start(now);
  const notes=kind==="miss"?[280,390]:kind==="hit"?[480,330,540]:[390,290,210,170];
  for(let i=0;i<notes.length;i++){
   const osc=audioContext.createOscillator(),g=audioContext.createGain();
   osc.type="sine";osc.frequency.setValueAtTime(notes[i],now+i*.085);
   osc.frequency.exponentialRampToValueAtTime(Math.max(110,notes[i]*.68),now+i*.085+.12);
   g.gain.setValueAtTime(.0001,now+i*.085);
   g.gain.exponentialRampToValueAtTime(.065,now+i*.085+.018);
   g.gain.exponentialRampToValueAtTime(.0001,now+i*.085+.16);
   osc.connect(g);g.connect(audioContext.destination);osc.start(now+i*.085);osc.stop(now+i*.085+.17);
  }
 }catch(error){console.warn("Preview audio",error);}
}
function sound(kind){
 if(muted)return;
 if(!sdk.isHosted){browserSound(kind);return;}
 // Native Pi audio transport only exposes approved notes, not sample playback.
 const tones=kind==="miss"?["C4","G4"]:kind==="hit"?["G4","E4","C5"]:["C4","E4","G4","C5"];
 const instrument=kind==="miss"?"marimba":kind==="hit"?"xylophone":"glockenspiel";
 tones.forEach((note,i)=>setTimeout(()=>{if(!muted)sdk.audio.playNote(note,42,instrument,{relative:true}).catch(()=>{});},i*90));
}
function picture(kind){
 $("reaction-img").src="assets/"+kind+".svg";
 const node=$("reaction");node.classList.remove("pop");void node.offsetWidth;node.classList.add("pop");
 clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>node.classList.remove("pop"),500);
}
function message(text){$("message").textContent=text;}
function announce(kind,key){picture(kind);sound(kind);message(t(key));}
function newRound(){
 epoch++;player=E.empty();computer=E.empty();phase="place";turn="player";placed=0;vertical=false;selected=27;
 $("reaction-img").src="assets/hit.svg";message(t("ready"));draw();
}
function tryPlace(i){
 if(phase!=="place"||placed>=E.FLEET.length)return;
 selected=i;const [x,y]=E.xy(i);
 if(!E.place(player,x,y,E.FLEET[placed],vertical)){message(t("invalid"));draw();return;}
 placed++;message(t(placed===E.FLEET.length?"placed":"ready"));draw();
}
function randomPlacement(){
 if(phase!=="place")return;
 player=E.randomFleet();placed=E.FLEET.length;message(t("placed"));draw();
}
function begin(){
 if(phase!=="place"||placed!==E.FLEET.length)return;
 computer=E.randomFleet();phase="play";turn="player";selected=27;message(t("yourTurn"));draw();
}
function finish(won){
 phase="finished";turn=won?"player":"computer";
 picture(won?"sunk":"hit");sound(won?"sunk":"hit");message(t(won?"win":"lose"));draw();
}
function tryFire(i){
 if(phase!=="play"||turn!=="player")return;
 selected=i;const hit=E.fire(computer,i);
 if(!hit){draw();return;}
 announce(hit.type,hit.type);draw();
 if(hit.win){finish(true);return;}
 turn="computer";draw();
 const run=epoch;
 setTimeout(()=>{
  if(run!==epoch||phase!=="play"||turn!=="computer")return;
  const chosen=E.chooseShot(player.shots,$("level").value);
  if(chosen===null){finish(true);return;}
  const response=E.fire(player,chosen);
  if(!response)return;
  announce(response.type,response.type==="miss"?"ownMiss":response.type==="hit"?"ownHit":"ownSunk");
  if(response.win){finish(false);return;}
  turn="player";draw();
 },680);
}
$("exit").onclick=()=>{epoch++;sdk.exit().then(ok=>{if(ok===false)message(t("preview"));}).catch(()=>{});};
$("restart").onclick=newRound;$("again").onclick=newRound;
$("start").onclick=begin;$("auto").onclick=randomPlacement;
$("rotate").onclick=()=>{vertical=!vertical;draw();};
$("sound").onclick=()=>{muted=!muted;$("sound").textContent=muted?"♪̸":"♪";$("sound").setAttribute("aria-pressed",String(!muted));};
$("level").onchange=newRound;
sdk.on("input",({button,action})=>{
 if(action!=="press")return;
 if(button==="BACK"||button==="B"){epoch++;sdk.exit().catch(()=>{});return;}
 if(button==="X"&&phase==="place"){vertical=!vertical;draw();return;}
 if(button==="Y"&&phase==="place"){randomPlacement();return;}
 if(button==="START"&&phase==="place"&&placed===E.FLEET.length){begin();return;}
 if(["UP","DOWN","LEFT","RIGHT"].includes(button)){
  let [x,y]=E.xy(selected);
  if(button==="UP")y=(y+7)%8;else if(button==="DOWN")y=(y+1)%8;
  else if(button==="LEFT")x=(x+7)%8;else x=(x+1)%8;
  selected=E.index(x,y);draw();
 }
 if(button==="A"||button==="START"){
  if(phase==="place")tryPlace(selected);else if(phase==="play")tryFire(selected);else newRound();
 }
});
sdk.on("lifecycle.pause",()=>{epoch++;if(phase==="play"&&turn==="computer"){turn="player";draw();}});
makeGrid("enemy");makeGrid("own");translate();newRound();
sdk.getContext().then(ctx=>{const tag=String(ctx?.language||"de").toLowerCase();lang=tag.startsWith("en")?"en":"de";translate();draw();if(phase==="place")message(t("ready"));}).catch(()=>{});
})();