/* MuPi Run – hand-drawn 2.5D runner, original graphics, offline. MIT. */
(function () {
  'use strict';
  const game = window.MuPiRun;
  const sdk = window.MuPiBoxSDK;
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d', {alpha: false});
  const mupiSprite = new Image();
  mupiSprite.src = './mupi.png';
  const overlay = document.getElementById('overlay');
  const headline = document.getElementById('headline');
  const message = document.getElementById('message');
  const primary = document.getElementById('primary');
  const pauseButton = document.getElementById('pause');
  const bestLabel = document.getElementById('best');
  const distanceLabel = document.getElementById('distance');
  const toast = document.getElementById('toast');
  let state = game.fresh((Date.now() ^ 0x643bd8) >>> 0);
  let best = 0, lang = 'de', lastFrame = 0, lastLevel = 1, toastUntil = 0;
  let panStart = null, gamepadPrevious = new Set(), crashAt = -9999;

  const languages = {
    de: {meters:'METER',best:'REKORD',jump:'SPRUNG',duck:'DUCKEN',lanes:'SPUR',kicker:'DAS ENDLOS-ABENTEUER',intro:'Springen, ducken, ausweichen – wie weit kommst du?',start:"LOS GEHT'S!",controller:'Controller empfohlen · Auch mit Touch spielbar',pause:'PAUSE',resume:'WEITERLAUFEN',over:'AUSGELAUFEN!',again:'NOCH MAL!',result:'Geschafft: {n} Meter! Nächstes Mal kommst du noch weiter.',newbest:'NEUER REKORD!',level:'TEMPO {n}',pausedesc:'Drücke START, A oder tippe auf Weiterlaufen.'},
    en: {meters:'METERS',best:'BEST',jump:'JUMP',duck:'DUCK',lanes:'LANE',kicker:'THE ENDLESS ADVENTURE',intro:'Jump, duck and dodge! How far can you run?',start:"LET'S RUN!",controller:'Controller recommended · Touch also works',pause:'PAUSED',resume:'KEEP RUNNING',over:'GAME OVER!',again:'TRY AGAIN!',result:'You ran {n} meters. Can you beat it?',newbest:'NEW RECORD!',level:'SPEED {n}',pausedesc:'Press START, A or tap to resume.'},
    fr: {meters:'MÈTRES',best:'RECORD',jump:'SAUTER',duck:'BAISSER',lanes:'VOIE',kicker:"L'AVENTURE SANS FIN",intro:"Saute, baisse-toi et évite les obstacles !",start:'C’EST PARTI !',controller:'Manette conseillée · Tactile aussi',pause:'PAUSE',resume:'CONTINUER',over:'TERMINÉ !',again:'REJOUER',result:'Tu as parcouru {n} mètres !',newbest:'NOUVEAU RECORD !',level:'VITESSE {n}',pausedesc:'START, A ou toucher pour reprendre.'},
    es: {meters:'METROS',best:'RÉCORD',jump:'SALTA',duck:'AGÁCHATE',lanes:'CARRIL',kicker:'AVENTURA INFINITA',intro:'¡Salta, agáchate y esquiva obstáculos!',start:'¡A CORRER!',controller:'Se recomienda mando · También táctil',pause:'PAUSA',resume:'CONTINUAR',over:'¡FIN!',again:'¡OTRA VEZ!',result:'¡Has recorrido {n} metros!',newbest:'¡NUEVO RÉCORD!',level:'VELOCIDAD {n}',pausedesc:'Pulsa START, A o toca para continuar.'},
    it: {meters:'METRI',best:'RECORD',jump:'SALTA',duck:'ABBASSATI',lanes:'CORSIA',kicker:'AVVENTURA SENZA FINE',intro:'Salta, abbassati ed evita gli ostacoli!',start:'VIA!',controller:'Controller consigliato · Anche touch',pause:'PAUSA',resume:'CONTINUA',over:'FINE!',again:'RIPROVA!',result:'Hai percorso {n} metri!',newbest:'NUOVO RECORD!',level:'VELOCITÀ {n}',pausedesc:'Premi START, A o tocca per riprendere.'},
    nl: {meters:'METER',best:'RECORD',jump:'SPRING',duck:'BUK',lanes:'BAAN',kicker:'HET EINDELOZE AVONTUUR',intro:'Spring, buk en ontwijk obstakels!',start:'RENNEN!',controller:'Controller aanbevolen · Ook aanraakbaar',pause:'PAUZE',resume:'VERDER',over:'GAME OVER!',again:'OPNIEUW!',result:'Je rende {n} meter!',newbest:'NIEUW RECORD!',level:'SNELHEID {n}',pausedesc:'Druk START, A of tik om verder te gaan.'},
    sv: {meters:'METER',best:'REKORD',jump:'HOPPA',duck:'DUCKA',lanes:'BANA',kicker:'ÄVENTYRET FORTSÄTTER',intro:'Hoppa, ducka och undvik hinder!',start:'SPRING!',controller:'Handkontroll rekommenderas · Även touch',pause:'PAUS',resume:'FORTSÄTT',over:'SLUT!',again:'IGEN!',result:'Du sprang {n} meter!',newbest:'NYTT REKORD!',level:'FART {n}',pausedesc:'Tryck START, A eller tryck för att fortsätta.'}
  };
  function tr(key, params) {
    let text = (languages[lang] || languages.de)[key] || languages.en[key] || key;
    if (params) Object.keys(params).forEach(k => { text = text.replace('{' + k + '}', String(params[k])); });
    return text;
  }
  function translate() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
    renderOverlay();
  }

  function rounded(x,y,w,h,r,color,stroke) {
    r = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    if (color) {ctx.fillStyle = color;ctx.fill();}
    if (stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=2.4;ctx.stroke();}
  }
  function ellipse(x,y,rx,ry,color) {
    ctx.beginPath(); ctx.ellipse(x,y,Math.max(0.01,rx),Math.max(0.01,ry),0,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();
  }
  function polygon(points,color) {
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function line(x1,y1,x2,y2,color,width) {
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  function centeredText(text,x,y,size,color,stroke) {
    ctx.font='1000 '+size+'px "Trebuchet MS", sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(stroke){ctx.lineWidth=4;ctx.strokeStyle=stroke;ctx.strokeText(text,x,y);}
    ctx.fillStyle=color;ctx.fillText(text,x,y);
  }

  function sky() {
    const bg=ctx.createLinearGradient(0,0,0,480);
    bg.addColorStop(0,'#143e62');bg.addColorStop(.30,'#4b9fb2');
    bg.addColorStop(.52,'#b1d7aa');bg.addColorStop(1,'#436f65');
    ctx.fillStyle=bg;ctx.fillRect(0,0,800,480);
    ellipse(610,97,90,90,'#ffecb44d');
    ellipse(610,97,47,47,'#fff0bb');
    // Woodland ridge, deep forest and leafy canopy.
    polygon([[0,210],[74,130],[122,194],[196,135],[285,203],[400,127],[514,189],[604,125],[725,197],[800,139],[800,330],[0,330]],'#6ab49a');
    polygon([[0,212],[77,168],[153,219],[240,159],[320,220],[421,165],[511,220],[616,168],[719,209],[800,163],[800,295],[0,295]],'#318785');
    for(let i=0;i<18;i++) {
      const x=i*53-40, y=146+(i%4)*15;
      ctx.fillStyle=i%2?'#286e69':'#327f6e';
      polygon([[x-27,y+75],[x,y-55],[x+27,y+75]],ctx.fillStyle);
      line(x,y+65,x,y+94,'#365c60',5);
    }
    // Dark leafy crowns frame the scene without blocking play.
    const canopy=['#1b594f','#236f57','#347c55','#3e945c'];
    for(const side of [-1,1]) {
      for(let i=0;i<10;i++) {
        const x=side<0 ? i*33-120 : 800-i*33+120;
        const y=(i%4)*21-35;
        ellipse(x,y,57,33,canopy[i%canopy.length]);
        ellipse(x+side*15,y+13,45,24,'#3f996b');
      }
    }
    for(let i=0;i<8;i++){
      const x=((i*187+66-state.distance*(i%2?.35:.21))%1080+1080)%1080-100;
      const y=167+(i%3)*22;
      ellipse(x,y,19,5,'#d7f4df63');
    }
  }
    function roadX(z, offset) {
    const t = Math.max(0,Math.min(1, 1-z/95));
    const bend=Math.sin(t*3.1+state.distance*.012)*23*Math.sin(t*Math.PI/2);
    return 400 + bend + offset*(58 + 302*Math.pow(t,1.6));
  }
  function project(z,lane){
    const t=Math.max(0,Math.min(1,1-z/95));
    return {x:roadX(z,lane/1.5),y:147+299*Math.pow(t,1.75),scale:.18+.91*Math.pow(t,1.35),t:t};
  }
  function scenery() {
    // River banks, animated reeds, ferns and gnarled trees.
    polygon([[0,175],[400,142],[0,480]],'#6cb981');
    polygon([[800,175],[400,142],[800,480]],'#76c28b');
    for(let i=0;i<12;i++){
      const side=i%2?-1:1;
      const z=(i*9.7+state.distance*.35)%96;
      const p=project(z,side*2.5);
      const scale=p.scale*2.0;
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);
      ellipse(0,2,40,11,'#1d625479');
      if(i%4===0){
        line(0,7,-3,-93,'#745c4d',12);
        line(-3,-48,-32,-70,'#745c4d',7);
        line(-1,-68,35,-91,'#745c4d',9);
        for(let k=0;k<7;k++) ellipse((k-3)*12,-99+(k%2)*8,19,26,k%2?'#2e9265':'#43a76c');
      }else if(i%3===0){
        rounded(-27,-16,55,16,6,'#8c8478','#e3d8ad');
        ellipse(-10,-14,18,5,'#9ab79f');
      }else{
        for(let k=-2;k<=2;k++){
          const sx=k*10;
          line(0,0,sx,-38+(k%2)*13,'#285d54',4);
          ellipse(sx,-34+(k%2)*13,8,17,k%2?'#4eb277':'#64c784');
        }
      }
      ctx.restore();
    }
    // In-stream glistening stones; distinct from hazards.
    for(let i=0;i<22;i++){
      const z=(i*11.7+state.distance*.85)%95;
      const p=project(z,(i%3-1)*.59);
      ellipse(p.x,p.y,Math.max(1,p.scale*11),Math.max(1,p.scale*3),i%3?'#a8ebdc65':'#e0d7b473');
    }
  }
    function road() {
    // A naturally winding, shallow stream with soft banks and a stony riverbed.
    function ribbon(width) {
      const left=[],right=[];
      for(let i=0;i<=27;i++){
        const z=95-i*(95/27);
        const p=project(z,0);
        const wobble=Math.sin(state.distance*.045+i*.81)*(2+p.t*7);
        left.push([roadX(z,-width)+wobble,p.y]);
        right.push([roadX(z,width)+wobble,p.y]);
      }
      // Continue beyond the screen edge so no straight horizontal seam is visible.
      left.push([roadX(0,-width)-16,510]);
      right.push([roadX(0,width)+16,510]);
      return left.concat(right.reverse());
    }
    polygon(ribbon(1.12),'#c5c99c');
    const water=ctx.createLinearGradient(0,150,0,480);
    water.addColorStop(0,'#80ccb4');water.addColorStop(.48,'#42a5af');water.addColorStop(1,'#287e9c');
    polygon(ribbon(.97),water);
    // Darker channel under current and moving hand-drawn highlights.
    polygon(ribbon(.87),'#2b9fa51b');
    for(let i=0;i<37;i++){
      const z=(i*7.7+state.distance*(.70+(i%3)*.10))%94;
      const p=project(z,0), t=p.t;
      for(let k=-1;k<=1;k++){
        const x=roadX(z,k*.36)+(i%2?4:-4)*t,y=p.y+(i%2)*1.5;
        line(x-(7+9*t),y,x+(9+11*t),y-(i%3)*1.2,
          i%4===0?'#e3fff2c7':'#b4ece7a1',Math.max(1,2.7*t));
      }
    }
    // Glints designate playable channels without artificial road markings.
    for(const boundary of [-1/3,1/3]){
      for(let i=0;i<10;i++){
        const z=(i*11.7+state.distance)%95,p=project(z,0),x=roadX(z,boundary);
        line(x-2*p.scale,p.y,x+8*p.scale,p.y-1,'#9cece29e',Math.max(1,p.scale*2));
      }
    }
    // Smooth stones, scattered moss, grass and reeds line the banks.
    for(let i=0;i<18;i++){
      const z=(i*8.8+state.distance*.83)%96;
      const p=project(z,0);
      const side=i%2?-1:1;
      const x=roadX(z,side*1.04),y=p.y;
      ellipse(x,y,Math.max(1,p.scale*(8+i%3*4)),Math.max(1,p.scale*(3+i%2*2)),i%3?'#ded7af':'#9cba98');
      if(i%3===0){
        line(x,y,x-side*8*p.scale,y-24*p.scale,'#428968',Math.max(1,p.scale*3));
        ellipse(x-side*8*p.scale,y-24*p.scale,5*p.scale,10*p.scale,'#73ba76');
      }
    }
  }
  function muPi(x,foot,jump,duck,time) {
    const bob=jump===0&&!duck ? Math.sin(time*20)*2.2 : 0;
    // The exact orange three-gilled MuPi mascot from the project's existing artwork.
    if(mupiSprite.complete && mupiSprite.naturalWidth>0){
      ctx.save();
      ctx.translate(x,foot-jump+bob);
      ctx.scale(1,duck?.62:1);
      ctx.rotate(!duck && jump===0 ? Math.sin(time*16)*.035 : 0);
      ellipse(1,5,47,9,'#143d515e');
      ctx.drawImage(mupiSprite,-82,-165,164,164);
      ctx.restore();
      return;
    }
    const bodyScale=duck ? .64 : 1;
    const y=foot-jump+bob;
    ctx.save();ctx.translate(x,y);ctx.scale(1,bodyScale);
    ellipse(3,4,47,10,'#143d515e');
    // Long curved axolotl tail – deliberately not a generic humanoid runner.
    ctx.save();ctx.rotate(Math.sin(time*12)*.09);
    ctx.beginPath();ctx.moveTo(16,-44);
    ctx.bezierCurveTo(42,-66,77,-57,68,-26);
    ctx.bezierCurveTo(65,-12,48,-16,40,-25);
    ctx.bezierCurveTo(53,-25,55,-41,37,-40);ctx.closePath();
    ctx.fillStyle='#e47e42';ctx.fill();
    ctx.beginPath();ctx.moveTo(30,-48);ctx.quadraticCurveTo(75,-65,69,-28);ctx.quadraticCurveTo(59,-42,40,-39);ctx.closePath();
    ctx.fillStyle='#ffc777';ctx.fill();ctx.restore();
    const stride=Math.sin(time*16)*7;
    ellipse(-22+stride,-5,15,9,'#f4914c');
    ellipse(23-stride,-5,15,9,'#f4914c');
    ellipse(-27,-34,13,21,'#e88946');ellipse(27,-34,13,21,'#e88946');
    ellipse(0,-42,35,37,'#ed8a42');ellipse(0,-45,32,34,'#ffa64b');
    ellipse(0,-35,22,24,'#ffe2a3');
    // EXACTLY three frilled external gill branches on each side.
    for(const side of [-1,1]){
      for(let j=0;j<3;j++){
        const gy=-95+j*16;
        line(side*36,gy+10,side*(58+j*2),gy-4,'#a94863',9);
        ellipse(side*(60+j*2),gy-6,10,7,'#f58189');
        for(let k=0;k<3;k++){
          const gx=side*(45+j*2+k*7);
          line(gx,gy+4-k*3,gx+side*3,gy-5-k*5,'#ffbec0',2.5);
        }
      }
    }
    // Orange MuPi's round salamander head, bright cheeks and smiling face.
    ellipse(0,-78,47,40,'#e68543');
    ellipse(0,-81,46,40,'#ffb160');
    ellipse(-19,-88,7,8.5,'#202a44');ellipse(19,-88,7,8.5,'#202a44');
    ellipse(-21,-91,2.2,3,'#fff');ellipse(17,-91,2.2,3,'#fff');
    ellipse(-29,-76,10,5,'#f88e8e');ellipse(29,-76,10,5,'#f88e8e');
    ctx.beginPath();ctx.arc(0,-74,13,.17,Math.PI-.17);ctx.strokeStyle='#824647';ctx.lineWidth=3.3;ctx.stroke();
    ellipse(0,-81,3,2,'#ba7858');
    ellipse(-11,-107,16,5,'#ffe0a68a');
    ctx.restore();
  }
    function hazard(ob) {
    if(ob.z>95||ob.z<-11)return;
    const p=project(ob.z,ob.lane);
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.scale,p.scale);
    ellipse(0,0,49,10,'#14394680');
    switch(ob.item){
      case 'rock':
      case 'boulder':
        polygon([[-49,-5],[-44,-35],[-22,-64],[13,-69],[44,-41],[53,-8]],'#6c8581');
        polygon([[-22,-64],[13,-69],[27,-37],[-37,-31]],'#a4b8a3');
        line(-11,-49,3,-57,'#d9ddd1',5);
        ellipse(25,-14,12,5,'#4cae83');break;
      case 'log':
        rounded(-59,-34,120,30,15,'#916d53','#584b43');
        ellipse(-52,-19,14,16,'#ca976a');ellipse(-52,-19,7,10,'#795843');
        line(-20,-26,35,-26,'#cfab7a',4);
        ellipse(8,-38,16,7,'#509d72');break;
      case 'root':
        line(-53,-13,46,-19,'#775f51',15);
        line(-24,-20,-40,-44,'#806452',10);
        line(25,-19,39,-38,'#806452',10);
        ellipse(-43,-48,17,9,'#478965');break;
      case 'ripple':
        ellipse(0,-8,53,18,'#cceaf0');
        ellipse(0,-8,43,12,'#4e96ab');
        ellipse(0,-12,34,6,'#e9faf1');
        for(let k=0;k<3;k++) ellipse((k-1)*22,-25-k*4,7,10,'#c9f4fa');break;
      case 'boot':
        rounded(-26,-56,52,46,12,'#9a697a','#604e68');
        rounded(-36,-18,85,19,8,'#e6b885','#7e5e57');
        line(-14,-43,10,-43,'#fff2bf',4);line(-14,-35,10,-35,'#fff2bf',4);break;
      case 'stump':
        rounded(-37,-58,74,57,11,'#906849','#5c4a40');
        ellipse(0,-59,38,13,'#c89d6d');ellipse(0,-59,22,7,'#9c7759');
        line(-24,-40,-23,-13,'#b88560',4);break;
      case 'reeds':
        for(let i=-2;i<=2;i++){
          line(i*14,0,i*16,-80+(i%2)*14,'#4d9461',6);
          ellipse(i*16,-82+(i%2)*14,6,13,'#a58b64');
          ellipse(i*13-8,-26,12,5,'#72b97c');
        }break;
      case 'basket':
        rounded(-39,-51,78,50,11,'#c38e64','#805c50');
        ctx.beginPath();ctx.arc(0,-48,29,Math.PI,0);ctx.strokeStyle='#77564d';ctx.lineWidth=8;ctx.stroke();
        for(let i=-2;i<=2;i++)line(i*14,-41,i*14,-8,'#f1c18b',4);
        line(-35,-26,35,-26,'#f1c18b',5);break;
      case 'branch':
        line(-62,-114,60,-112,'#735744',13);
        line(-7,-115,-23,-53,'#715440',10);
        ellipse(-22,-57,23,18,'#4a9b6a');ellipse(17,-114,26,16,'#78b96d');
        ellipse(40,-118,25,18,'#3e925c');break;
      case 'vine':
        line(-56,-139,60,-139,'#426a4e',10);
        for(let i=-2;i<=2;i++){
          const x=i*24;
          line(x,-137,x+6,-54+(i%2)*6,'#5e9664',6);
          ellipse(x+7,-85,15,6,'#80c67d');
        }break;
      case 'willow':
        line(-65,-125,63,-125,'#665947',13);
        for(let i=-3;i<=3;i++){
          line(i*16,-120,i*16+8,-55+(i%2)*13,'#5c9b6c',5);
          ellipse(i*16+12,-75+(i%2)*13,9,15,'#a0d284');
        }break;
    }
    if(ob.z<28&&ob.z>5) {
      const symbol=ob.kind==='jump'?'↑':(ob.kind==='duck'?'↓':'↔');
      rounded(-15,-141,30,29,9,ob.kind==='jump'?'#fed077':(ob.kind==='duck'?'#76e7de':'#ffa3aa'));
      centeredText(symbol,0,-126,23,'#193651');
    }
    ctx.restore();
  }
    function render() {
    ctx.save();
    if (state.phase==='over' && performance.now()-crashAt<330) {
      const amplitude=(1-(performance.now()-crashAt)/330)*5;
      ctx.translate(Math.sin(performance.now()*.12)*amplitude,Math.cos(performance.now()*.17)*amplitude);
    }
    sky(); scenery(); road();
    state.obstacles.slice().sort((a,b)=>b.z-a.z).forEach(hazard);
    const x=roadX(0,state.visualLane/1.5);
    muPi(x,435,game.jumpHeight(state),game.ducking(state),state.time);
    ctx.restore();
    distanceLabel.textContent=Math.floor(state.distance).toLocaleString(lang==='de'?'de-DE':'en-US');
    bestLabel.textContent=best.toLocaleString(lang==='de'?'de-DE':'en-US')+' m';
    if(performance.now()>toastUntil)toast.classList.remove('visible');
  }
  function showToast(label) {
    toast.textContent=label;
    toastUntil=performance.now()+1350;
    toast.classList.add('visible');
  }
  function resize(){
    const r=canvas.getBoundingClientRect(), dpr=Math.min(1.5,window.devicePixelRatio||1);
    canvas.width=Math.max(1,Math.round(r.width*dpr));
    canvas.height=Math.max(1,Math.round(r.height*dpr));
    ctx.setTransform(canvas.width/800,0,0,canvas.height/480,0,0);
  }
  function renderOverlay(){
    const phase=state.phase;
    if(phase==='running'){overlay.classList.add('hidden');pauseButton.textContent='Ⅱ';return;}
    overlay.classList.remove('hidden');
    if(phase==='ready'){
      headline.innerHTML='MuPi <em>RUN</em>';
      message.textContent=tr('intro');primary.textContent=tr('start');
    }else if(phase==='paused'){
      headline.textContent=tr('pause');
      message.textContent=tr('pausedesc');primary.textContent=tr('resume');
    }else{
      headline.textContent=tr('over');
      message.textContent=tr('result',{n:Math.floor(state.distance)})+
        (Math.floor(state.distance)>=best && best>0?' '+tr('newbest'):'');
      primary.textContent=tr('again');
    }
    pauseButton.textContent=phase==='paused'?'▶':'Ⅱ';
  }
  function finish(){
    if(state.phase!=='over')return;
    crashAt=performance.now();
    const distance=Math.floor(state.distance);
    if(distance>best){
      best=distance;
      void sdk.storage.set('bestMeters',best).catch(()=>{});
    }
    renderOverlay();
  }
  function frame(now){
    const delta=lastFrame ? Math.min(.075,(now-lastFrame)/1000) : 0;
    lastFrame=now;
    if(state.phase==='running'){
      game.step(state,delta);
      const level=1+Math.floor(state.distance/150);
      if(level>lastLevel){lastLevel=level;showToast(tr('level',{n:level}));}
      if(state.phase==='over')finish();
    }
    pollGamepad();
    render();
    window.requestAnimationFrame(frame);
  }
  function begin(){
    if(state.phase==='over'){
      state=game.fresh((Date.now() ^ (Math.random()*0xffffffff))>>>0);
      lastLevel=1;
    }
    if(state.phase==='paused')game.act(state,'pause');
    else game.act(state,'start');
    renderOverlay();
  }
  function togglePause(){
    if(state.phase==='running'||state.phase==='paused'){
      game.act(state,'pause');renderOverlay();
    }
  }
  function control(action){
    if(action==='exit'){ void sdk.exit().catch(()=>{});return; }
    if(action==='pause'){
      if(state.phase==='ready'||state.phase==='over') begin();
      else togglePause();
      return;
    }
    if(state.phase!=='running'){
      if(action==='start'||action==='jump')begin();
      return;
    }
    game.act(state,action);
  }
  function controllerButton(button) {
    const map={LEFT:'left',RIGHT:'right',UP:'jump',DOWN:'duck',
      A:'jump',B:'duck',X:'jump',Y:'duck',LB:'left',RB:'right',
      L1:'left',R1:'right',START:'pause',MENU:'pause',BACK:'exit',SELECT:'exit'};
    if(map[button])control(map[button]);
  }
  sdk.on('input', payload=>{
    if(payload&&payload.action==='press')controllerButton(String(payload.button||'').toUpperCase());
  });
  sdk.on('lifecycle.pause',()=>{
    if(state.phase==='running') {game.act(state,'pause');renderOverlay();}
  });
  sdk.on('lifecycle.resume',()=>{lastFrame=0;renderOverlay();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&state.phase==='running'){game.act(state,'pause');renderOverlay();}
    lastFrame=0;
  });

  function pollGamepad(){
    if(sdk.isHosted||!navigator.getGamepads)return;
    let pad;
    try{pad=Array.from(navigator.getGamepads()).find(Boolean);}catch(_){return;}
    if(!pad){gamepadPrevious.clear();return;}
    const pressed=new Set();
    const named={0:'A',1:'B',2:'X',3:'Y',8:'SELECT',9:'START',12:'UP',13:'DOWN',14:'LEFT',15:'RIGHT'};
    pad.buttons.forEach((button,index)=>{
      if(button.pressed && named[index])pressed.add(named[index]);
    });
    if(pad.axes[0]<-.55)pressed.add('LEFT');
    if(pad.axes[0]>.55)pressed.add('RIGHT');
    if(pad.axes[1]<-.55)pressed.add('UP');
    if(pad.axes[1]>.55)pressed.add('DOWN');
    pressed.forEach(button=>{if(!gamepadPrevious.has(button))controllerButton(button);});
    gamepadPrevious=pressed;
  }
  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',
    ArrowUp:'jump',Space:'jump',KeyW:'jump',ArrowDown:'duck',KeyS:'duck',
    Enter:'start',KeyP:'pause',Escape:'exit'};
  document.addEventListener('keydown',event=>{
    const action=keyMap[event.code];
    if(!action)return;
    event.preventDefault();
    if(event.repeat)return;
    control(action);
  });
  for(const id of ['left','right','jump','duck']){
    const button=document.getElementById(id);
    button.addEventListener('pointerdown', event=>{
      event.preventDefault();control(id);
    });
  }
  document.getElementById('exit').addEventListener('click',()=>control('exit'));
  pauseButton.addEventListener('click',()=>control('pause'));
  primary.addEventListener('click',begin);
  canvas.addEventListener('pointerdown',event=>{
    panStart={x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointerup',event=>{
    if(!panStart)return;
    const dx=event.clientX-panStart.x,dy=event.clientY-panStart.y;
    panStart=null;
    if(Math.abs(dx)>25&&Math.abs(dx)>Math.abs(dy))control(dx<0?'left':'right');
    else if(Math.abs(dy)>25)control(dy<0?'jump':'duck');
    else control('jump');
  });
  canvas.addEventListener('pointercancel',()=>{panStart=null;});
  window.addEventListener('resize',resize);
  resize();renderOverlay();
  window.requestAnimationFrame(frame);

  (async()=>{
    try{
      const context=await sdk.getContext();
      const candidate=String(context&&context.language||'').slice(0,2).toLowerCase();
      lang=languages[candidate]?candidate:'de';
    }catch(_){
      const candidate=String(navigator.language||'de').slice(0,2).toLowerCase();
      lang=languages[candidate]?candidate:'de';
    }
    try{
      const stored=await sdk.storage.get('bestMeters');
      if(Number.isSafeInteger(stored)&&stored>=0)best=stored;
    }catch(_){}
    translate();
  })().catch(error=>console.warn('[MuPi Run] context error',error));
})();