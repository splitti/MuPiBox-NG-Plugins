/* MuPi Run – hand-drawn 2.5D runner, original graphics, offline. MIT. */
(function () {
  'use strict';
  const game = window.MuPiRun;
  const sdk = window.MuPiBoxSDK;
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d', {alpha: false});
  // Optimized transparent local art sprites; no online assets or SVG engine needed at runtime.
  const art = Object.create(null);
  const spriteNames = [
    'mupi-running-24','mupi-back','mupi-back-run-left','mupi-back-run-right',
    'mupi-tail','mupi-body',
    'mupi-body-run-0','mupi-body-run-1','mupi-body-run-2',
    'mupi-body-run-3','mupi-body-run-4','mupi-body-run-5',
    'tree-oak','tree-fir','tree-willow','fern','flower','mushroom',
    'reeds','rock','log','branch','vine','splash','stump','basket','boot','backdrop',
    'foreground','fallen-arch','waterfall','water-caustics','dragonfly',
    'duck-bridge','duck-bridge-rear','duck-bridge-front','stepping-stones','rail-post','wood-deck','forest-earth'
  ];
  for (const name of spriteNames) {
    const image = new Image();
    image.src = './art/' + name + (name==='mupi-running-24'?'.webp':'.png');
    art[name] = image;
  }
  function drawArt(name, cx, bottom, width, height, opacity=1) {
    const image = art[name];
    if (!image || !image.complete || !image.naturalWidth) return false;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(image,cx-width/2,bottom-height,width,height);
    ctx.restore();
    return true;
  }
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
  let previousTerrain='river';
  let controllerMode=false;
  const gameElement=document.querySelector('.game');
  function setControllerMode(active){
    controllerMode=active;
    gameElement.classList.toggle('controller-active',active);
  }
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
    if(!drawArt('backdrop',400,480,800,480)){
      const bg=ctx.createLinearGradient(0,0,0,480);
      bg.addColorStop(0,'#1b5d6b');bg.addColorStop(.63,'#9ac7a0');bg.addColorStop(1,'#365f50');
      ctx.fillStyle=bg;ctx.fillRect(0,0,800,480);
    }
    // Distant firs, their trunks and delicate crowns remain behind the water.
    for(let i=0;i<6;i++){
      const x=((i*191+23+(state.distance*.07))%1030)-115;
      const horizon=194+(i%4)*10;
      drawArt(i%3===0?'tree-oak':'tree-fir',x,horizon,70+(i%3)*17,85+(i%3)*20,.26+(i%3)*.08);
    }
    const rays=ctx.createLinearGradient(475,80,690,430);
    rays.addColorStop(0,'#fff6c021');rays.addColorStop(.6,'#f2edba12');rays.addColorStop(1,'#f2f9d100');
    ctx.fillStyle=rays;
    ctx.beginPath();ctx.moveTo(592,0);ctx.lineTo(692,0);
    ctx.lineTo(795,480);ctx.lineTo(447,480);ctx.closePath();ctx.fill();
    for(let i=0;i<10;i++){
      const x=(i*127+state.distance*.2)%865-45;
      const y=190+(i%3)*21;
      ctx.fillStyle=i%2?'#e9facb78':'#c8fde36f';
      ctx.beginPath();ctx.arc(x,y,1.5+(i%3),0,Math.PI*2);ctx.fill();
    }
  }
  function roadX(z, offset) {
    // Let objects travel PAST the player's plane rather than freezing at z=0.
    const t = Math.max(0,Math.min(1.34, 1-z/95));
    const bend=Math.sin(t*3.1+state.distance*.012)*23*Math.sin(Math.min(1,t)*Math.PI/2);
    return 400 + bend + offset*(58 + 302*Math.pow(t,1.6));
  }
  function project(z,lane){
    const t=Math.max(0,Math.min(1.34,1-z/95));
    return {x:roadX(z,lane/1.5),y:147+299*Math.pow(t,1.75),scale:.18+.91*Math.pow(t,1.35),t:t};
  }
  function scenery() {
    // Bank objects are independent pre-rendered transparent illustrations.
    // Perspective and parallax make them move while the runner stays centred.
    const objects=[];
    for(let i=0;i<24;i++) {
      const side=(i%7<3)?-1:1;
      const z=94-((i*19.73+i*i*.29+state.distance*(.58+(i%4)*.06))%94);
      objects.push({i,side,z});
    }
    objects.sort((a,b)=>b.z-a.z);
    for(const {i,side,z} of objects){
      const p=project(z,0);
      const t=p.t;
      const off=1.35+(i%5)*.31;
      const x=roadX(z,side*off);
      const ground=p.y+8+t*12;
      const type=i%8;
      if(type===0||type===5||type===7){
        const name=type===0?'tree-oak':(type===5?'tree-willow':'tree-fir');
        const width=(137+73*t)*(0.28+p.scale*.78);
        const height=(174+96*t)*(0.28+p.scale*.78);
        drawArt(name,x,ground+13,width,height,.88);
      } else if(type===1){
        drawArt('rock',x,ground,125*p.scale,98*p.scale);
        drawArt('fern',x+side*38*p.scale,ground+4,82*p.scale,83*p.scale,.9);
      } else if(type===2){
        drawArt('fern',x,ground,122*p.scale,116*p.scale);
        drawArt('flower',x+side*35*p.scale,ground,75*p.scale,80*p.scale);
      } else if(type===3) {
        drawArt('mushroom',x,ground,97*p.scale,85*p.scale);
      } else if(type===4) {
        drawArt('reeds',x,ground,95*p.scale,98*p.scale);
      } else {
        drawArt('flower',x,ground,98*p.scale,97*p.scale);
        drawArt('fern',x-side*35*p.scale,ground,73*p.scale,68*p.scale);
      }
    }
    // Light reflections around the stones, constrained to the river edge.
    for(let i=0;i<14;i++){
      const z=(i*9.2+state.distance*.91)%95;
      const p=project(z,0);
      const side=i%2?-1:1;
      const x=roadX(z,side*.97);
      ctx.strokeStyle='#d8ffec9a';ctx.lineWidth=Math.max(1,p.scale*2);
      ctx.beginPath();ctx.arc(x,p.y+2,Math.max(2,p.scale*13),0,Math.PI);ctx.stroke();
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
        left.push([roadX(z,-width)+wobble-4*Math.sin(i*1.23),p.y]);
        right.push([roadX(z,width)+wobble+4*Math.cos(i*1.43),p.y]);
      }
      // Continue beyond the screen edge so no straight horizontal seam is visible.
      left.push([roadX(0,-width)-16,510]);
      right.push([roadX(0,width)+16,510]);
      return left.concat(right.reverse());
    }
    polygon(ribbon(1.16),'#536e62');
    polygon(ribbon(1.11),'#698b72');
    polygon(ribbon(1.045),'#a8b78b');
    const water=ctx.createLinearGradient(0,150,0,480);
    water.addColorStop(0,'#b0dbb5');water.addColorStop(.36,'#4faea7');
    water.addColorStop(.75,'#247d91');water.addColorStop(1,'#175b80');
    polygon(ribbon(.995),'#2b7869');
    polygon(ribbon(.97),water);
    // Water surface is independently illustrated and clipped to the
    // winding river, not a flat blue road or a global backdrop.
    const surface=art['water-caustics'];
    if(surface && surface.complete && surface.naturalWidth) {
      const vertices=ribbon(.968);
      ctx.save();ctx.beginPath();ctx.moveTo(vertices[0][0],vertices[0][1]);
      for(let i=1;i<vertices.length;i++)ctx.lineTo(vertices[i][0],vertices[i][1]);
      ctx.closePath();ctx.clip();
      const drift=(state.distance*2.7)%410;
      ctx.globalAlpha=.68;
      ctx.drawImage(surface,0,-375+drift,800,590);
      ctx.drawImage(surface,0,215+drift,800,590);
  // Warm light from the forest canopy scatters across the moving stream.
  const solar=ctx.createRadialGradient(590,225,8,580,228,244);
  solar.addColorStop(0,'#fff5b568');solar.addColorStop(.33,'#f4ec9f2a');
  solar.addColorStop(1,'#e1f1ae00');
  ctx.fillStyle=solar;ctx.fillRect(0,145,800,335);
    ctx.restore();

    }
    // Winding bright waterline follows the shore through perspective,
    // rather than resembling a paved road with painted dividers.
    for(let side of [-1,1]){
      const shore=[];
      for(let j=0;j<18;j++){
        const z=94-j*5.2;
        const projection=project(z,0);
        const wiggle=Math.sin(j*1.65+state.distance*.19)*2.2*projection.t;
        shore.push([roadX(z,side*.967)+wiggle,projection.y]);
      }
      ctx.beginPath();ctx.moveTo(shore[0][0],shore[0][1]);
      for(let j=1;j<shore.length;j++){
        const a=shore[j-1],b=shore[j];
        ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);
      }
      ctx.strokeStyle='#d1f7deb3';ctx.lineWidth=3;ctx.stroke();
    }
    // Darker channel under current and moving hand-drawn highlights.
    polygon(ribbon(.87),'#2b9fa51b');
    for(let i=0;i<21;i++){
      const z=(i*7.7+state.distance*(.70+(i%3)*.10))%94;
      const p=project(z,0), t=p.t;
      // The glints drift along irregular currents; avoid artificial lane dashes.
      for(let k=0;k<2;k++){
        const channel=Math.sin(i*5.19+k*2.67)*.66;
        const x=roadX(z,channel)+(i%2?4:-4)*t,y=p.y+(i%2)*1.5;
        const length=(i%5===0?18:8)*(0.4+t);
        ctx.beginPath();
        ctx.moveTo(x-length,y+(i%3));
        ctx.quadraticCurveTo(x,y-3*t,x+length*.8,y-1.5*t);
        ctx.strokeStyle=i%4===0?'#e9fff1a5':'#b8f1eb6f';
        ctx.lineWidth=Math.max(1,2.5*t);ctx.stroke();
      }
    }
    // Bubbles and small sunlit eddies in the shallows, non-collidable.
    for(let i=0;i<21;i++){
      const z=(i*9.13+state.distance*.78)%94,p=project(z,0);
      const channel=Math.sin(i*4.17)*.78;
      const x=roadX(z,channel);
      ellipse(x,p.y+2,Math.max(1,p.scale*(2+i%4)),Math.max(.6,p.scale*1.8),'#c8f9e56b');
    }
    // Semi-submerged stones cast soft shadows under the flowing water.
    for(let i=0;i<16;i++){
      const z=(i*15.71+state.distance)%93;
      const p=project(z,0);
      const lane=(i%3-1)*.48;
      const x=roadX(z,lane)+Math.sin(i*31)*11*p.t;
      drawArt('rock',x,p.y+4,37*p.scale,24*p.scale,.22+(i%4)*.055);
      ctx.strokeStyle='#dbfff389';ctx.lineWidth=Math.max(.5,1.6*p.scale);
      ctx.beginPath();ctx.ellipse(x,p.y+2,14*p.scale,5*p.scale,0,0,Math.PI);ctx.stroke();
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
  // Match the illustration's rear-foot contact (SVG y=339) to the world plane.
  // Height=210 maps SVG y=339 to a bottom offset of 53.54 pixels.
  // The old render anchored transparent SVG padding/tail to the floor
  // and accidentally left both feet roughly 45 pixels above the ground.
  const MUPI_HEIGHT=210;
  const MUPI_WIDTH=172;
  const MUPI_FOOT_BOTTOM=MUPI_HEIGHT*(455-339)/455;
  function muPi(x,foot,jump,duck,time) {
    const jumping=jump>1;
    const surface=game.terrainAt(state.distance);
    const wave=Math.sin(time*15.2);
    const bounce=jumping||duck||state.phase!=='running'?0:Math.abs(wave)*1.2;
    const y=foot-jump-bounce;
    const elevation=Math.min(1,jump/82);
    // Contact shadow stays on the floor; it gets narrower, softer and
    // more transparent when MuPi actually jumps above it.
    ctx.save();
    ctx.globalAlpha=1-elevation*.58;
    ellipse(x,foot+2,31-elevation*8,6-elevation*1.8,
      surface==='river'?'#133f557a':'#2c291f83');
    ctx.restore();

    // Foot-specific environmental contact: splashing in the river;
    // dusty puffs on the forest path; planted feet on the wooden deck.
    const planted=x+(wave>0?19:-19);
    if(!jumping && state.phase==='running') {
      if(surface==='river'){
        ctx.save();
        ctx.strokeStyle='#d7fff2c1';
        ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(x,foot+1,31+Math.abs(wave)*5,6.4,0,0,Math.PI*2);ctx.stroke();
        const splash=Math.abs(wave);
        for(let i=0;i<4;i++){
          const side=i%2===0?1:-1;
          const dx=side*(16+i*5)+Math.sin(time*9+i)*4;
          const rise=(i*7.7+time*21)%27;
          ellipse(planted+dx*.65,foot-2-rise*.58,1.7+(i%2),2.1+(i%3),
            i%2?'#ecffebbe':'#98e8f1c9');
        }
        ctx.restore();
      } else if(surface==='forest'){
        for(let i=0;i<3;i++){
          const rise=(time*14+i*8.7)%23;
          ellipse(planted+(i-1)*10,foot-rise*.65,
            2.8+i,2.1+i*.45,i%2?'#c4b18a7b':'#e1c89488');
        }
      }else{
        ellipse(planted,foot+.7,14,2.3,'#312c2680');
      }
    }
    ctx.save();
    ctx.translate(x,y);
    // Compression is about the FOOT plane, so ducking never makes MuPi float.
    if(duck)ctx.scale(1,.69);
    else if(!jumping)ctx.rotate(wave*.018);
    // User-provided native 6x4, 24-frame sprite sheet.
    // Each rendered pose is extracted unaltered from a 512px source cell
    // and downscaled to 320px at build time. The game advances the actual
    // 24 cells, not a GIF browser animation or a geometrically modeled MuPi.
    const atlas=art['mupi-running-24'];
    if(atlas && atlas.complete && atlas.naturalWidth===1920 && atlas.naturalHeight===1280){
      const pace=20+Math.min(8,Math.max(0,(state.speed-13)*.47));
      const index=state.phase==='running' ? Math.floor(time*pace)%24 : 0;
      const cell=320, drawSize=205;
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(atlas,(index%6)*cell,Math.floor(index/6)*cell,cell,cell,
        -drawSize/2,-drawSize*(486/512),drawSize,drawSize);
      ctx.restore();
    }else{
      // Fallback only if the user spritesheet failed to load.
      const phase=Math.floor((time*15.2/(Math.PI*2)*6))%6;
    const sprite=state.phase==='running'&&!duck&&!jumping ?
      'mupi-body-run-'+((phase+6)%6) : 'mupi-body';
    // The tail is animated on a separate, strictly BACK layer. The body,
    // arms, legs and head are always composited on top. No sprite frame
    // can put the tail in front of a leg.
    const pivotY=MUPI_FOOT_BOTTOM-MUPI_HEIGHT+MUPI_HEIGHT*(255/455);
    ctx.save();
    ctx.translate(0,pivotY);
    ctx.rotate(jumping ? -.04 : Math.sin(time*8.1)*.09);
    ctx.translate(0,-pivotY);
    drawArt('mupi-tail',0,MUPI_FOOT_BOTTOM,MUPI_WIDTH,MUPI_HEIGHT);
    ctx.restore();
    drawArt(sprite,0,MUPI_FOOT_BOTTOM,MUPI_WIDTH,MUPI_HEIGHT);
    ctx.restore();
    }

    // Foreground water lip partly occludes the planted feet and the curved
    // tail; it is visibly grounded, never a detached white oval below MuPi.
    if(!jumping && surface==='river' && state.phase==='running'){
      ctx.save();
      ctx.beginPath();ctx.ellipse(x,foot+4,35,6,0,Math.PI,Math.PI*2);
      ctx.strokeStyle='#d5fff3b0';ctx.lineWidth=2.7;ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(planted-12,foot+1);ctx.quadraticCurveTo(planted,foot-3,planted+12,foot+1);
      ctx.strokeStyle='#f0fff6d6';ctx.lineWidth=2.0;ctx.stroke();
      ctx.restore();
    }
  }
  const hazardSprites={
    rock:'rock',boulder:'rock',log:'log',root:'branch',ripple:'splash',boot:'boot',
    stump:'stump',reeds:'reeds',basket:'basket','stepping-stones':'stepping-stones','low-bridge':'duck-bridge',
    branch:'branch',vine:'vine',willow:'vine'
  };
  function hazard(ob, bridgeLayer="all") {
    if(ob.z>95||ob.z<-11)return;
    const p=project(ob.z,ob.lane===null?0:ob.lane);
    // Once the object passes the running plane it grows and drops out of
    // the viewport naturally. Collision and render use the SAME world z.
    const lowBridge=ob.item==='low-bridge';
    const name=hazardSprites[ob.item]||'rock';
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.scale,p.scale);
    if(lowBridge){
      // An actual whole-width collider, matching the game's duck mechanic.
      // As the bridge approaches, the crossbeam lowers toward MuPi's head.
      // Supports stay behind the player. Only the overhead crossbar can
      // overlap MuPi, and it fades out after passing the collision plane.
      const fade=ob.z<0?Math.max(0,1+ob.z/8):1;
      const name=bridgeLayer==='rear'?'duck-bridge-rear':
                 bridgeLayer==='front'?'duck-bridge-front':'duck-bridge';
      drawArt(name,0,25,620,259,fade);
      if(bridgeLayer!=='front'&&ob.z < state.speed * .93 && ob.z > 3){
        rounded(-22,-238,44,44,16,'#e9a446e8','#ffdf89');
        centeredText('↓',0,-216,36,'#ffffff','#7a4d2d');
      }
    }else{
      const overhead=ob.kind==='duck';
      const width=ob.item==='stepping-stones'?151:overhead?153:ob.item==='log'?145:ob.item==='boulder'?125:121;
      const height=ob.item==='stepping-stones'?85:overhead?151:ob.item==='log'?91:ob.item==='ripple'?74:111;
      ellipse(0,1,51,10,'#132f3d80');
      drawArt(name,0,4,width,height);
      if(ob.z < state.speed * .93 && ob.z > 3){
        const symbol=ob.kind==='jump'?'↑':overhead?'↓':'↔';
        const color=ob.kind==='jump'?'#ffe09a':overhead?'#a3f7e3':'#ffb5a7';
        rounded(-16,-height-12,32,32,10,color,'#ffffffb0');
        centeredText(symbol,0,-height+4,23,'#214b53');
      }
    }
    ctx.restore();
  }
  function terrain() {
    // Physically different running surfaces, not a fixed water-only wallpaper:
    // river (0–195m), wooden footbridge (195–360m), forest dirt (360–530m).
    const tiles={
      boardwalk:art['wood-deck'],
      forest:art['forest-earth']
    };
    // Merge adjacent 3.5m segments into only 1–3 texture-clipped zones.
    // Avoid 50 oversized image draws per frame on Raspberry Pi 4/5.
    const spans=[];
    let active=null;
    for(let far=95;far>0;far-=3.5){
      const near=Math.max(0,far-3.5);
      const type=game.terrainAt(state.distance+(far+near)/2);
      if(type==='river'){
        if(active){spans.push(active);active=null;}
        continue;
      }
      if(!active||active.type!==type){
        if(active)spans.push(active);
        active={type,far,near};
      }else active.near=near;
    }
    if(active)spans.push(active);
    for(const region of spans){
      const off=region.type==='boardwalk'?1.005:1.125;
      const left=[],right=[];
      const n=Math.max(2,Math.ceil((region.far-region.near)/3.5));
      for(let i=0;i<=n;i++){
        const z=region.far-(region.far-region.near)*i/n;
        const p=project(z,0);
        left.push([roadX(z,-off),p.y]);
        right.push([roadX(z,off),p.y]);
      }
      // Organic edge at the terrain boundary. This gives the bridge a
      // softened ramp and the forest path a scattered-soil transition,
      // rather than instantly covering water with a straight-edged sheet.
      const nearY=project(region.near,0).y;
      const farY=project(region.far,0).y;
      const flat=right.reverse();
      const nearEdge=[],farEdge=[];
      const nearL=left[left.length-1],nearR=flat[0];
      const farR=flat[flat.length-1],farL=left[0];
      for(let i=1;i<9;i++){
        const t=i/9;
        const wobble=(Math.sin(t*17+state.distance*.035)+Math.sin(t*29))*
          (region.type==='forest'?4:1.3);
        nearEdge.push([nearL[0]+(nearR[0]-nearL[0])*t,nearY+wobble]);
      }
      for(let i=8;i>=1;i--){
        const t=i/9;
        const wobble=(Math.sin(t*21+state.distance*.021)+Math.sin(t*15))*
          (region.type==='forest'?4:1.3);
        farEdge.push([farL[0]+(farR[0]-farL[0])*t,farY+wobble]);
      }
      const vertices=left.concat(nearEdge,flat,farEdge);
      polygon(vertices,region.type==='boardwalk'?'#9e7858':'#7d8560');
      const tex=tiles[region.type];
      if(tex&&tex.complete&&tex.naturalWidth){
        ctx.save();
        ctx.beginPath();ctx.moveTo(vertices[0][0],vertices[0][1]);
        for(let k=1;k<vertices.length;k++)ctx.lineTo(vertices[k][0],vertices[k][1]);
        ctx.closePath();ctx.clip();
        ctx.globalAlpha=region.type==='boardwalk'?.67:.90;
        const scroll=(state.distance*(region.type==='boardwalk'?15:8))%480;
        ctx.drawImage(tex,0,-480+scroll,800,560);
        ctx.drawImage(tex,0,80+scroll,800,560);
        ctx.restore();
      }
    }
    // Small physical transitions keep the corridor visibly connected:
    // stones at river/forest entrances; bridge end rails at boardwalk.
    for(let offset=-1;offset<=1;offset++){
      for(const boundary of [195,360,530,650]){
        const nearby=(Math.floor(state.distance/650))*650+boundary;
        for(const world of [nearby,nearby+650]){
          const z=world-state.distance;
          if(z<0||z>95)continue;
          const p=project(z,0);
          const x=roadX(z,offset*.69);
          if(boundary===195||boundary===360){
            drawArt('rock',x,p.y+4*p.scale,45*p.scale,26*p.scale,.83);
          }else if(boundary===530||boundary===650){
            drawArt('fern',x,p.y+4*p.scale,38*p.scale,44*p.scale,.88);
          }
        }
      }
    }
    // Perspective-correct board joints and planted trail edges.
    for(let z=95-(state.distance%6);z>0;z-=6){
      const type=game.terrainAt(state.distance+z);
      const p=project(z,0);
      if(type==='boardwalk'){
        const left=roadX(z,-.98),right=roadX(z,.98);
        line(left,p.y,right,p.y,'#2f342de0',Math.max(1.1,p.scale*3.5));
        line(left,p.y-2*p.scale,right,p.y-2*p.scale,'#f5b876a1',Math.max(.7,p.scale*1.9));
        if(Math.floor((state.distance+z)/6)%3===0){
          ellipse(roadX(z,-.77),p.y-3*p.scale,1.3*p.scale,1.2*p.scale,'#f6dca4');
          ellipse(roadX(z,.77),p.y-3*p.scale,1.3*p.scale,1.2*p.scale,'#f6dca4');
        }
      }
      if(type==='forest' && Math.floor((state.distance+z)/6)%2===0){
        const side=Math.floor((state.distance+z)/6)%4<2?-1:1;
        drawArt('fern',roadX(z,side*.89),p.y,36*p.scale,37*p.scale,.86);
      }
    }
    // Upright railing sprites and ropes attach the wooden bridge to the banks.
    // Spacing is in world coordinates, so they move with the runner.
    const posts=[];
    for(let z=95-(state.distance%10);z>0;z-=10){
      if(game.terrainAt(state.distance+z)!=='boardwalk')continue;
      const p=project(z,0);
      posts.push({z,p});
    }
    posts.reverse(); // near objects occlude far ones for convincing depth
    for(const {z,p} of posts){
      const sc=p.scale;
      for(const side of [-1,1]){
        drawArt('rail-post',roadX(z,side*1.04),p.y+8*sc,61*sc,86*sc);
      }
    }
  }
  function environmentFeatures() {
    // Distinctive landmarks have absolute WORLD locations and now approach,
    // grow, pass the camera, and disappear, rather than being a stationary
    // overlay at x=731 / y=326 in every running frame.
    const loop=650;
    const lap=Math.floor(state.distance/loop);
    for(let n=lap;n<=lap+1;n++){
      const origin=n*loop;
      const archZ=origin+102-state.distance;
      if(archZ>=-9&&archZ<96){
        const p=project(archZ,0);
        // The old artwork is decorative, NOT a collision hazard. Drawn
        // behind MuPi and real obstacle sprites to prevent false hit cues.
        drawArt('fallen-arch',p.x,p.y+10*p.scale,480*p.scale,202*p.scale,.9);
      }
      const fallZ=origin+52-state.distance;
      if(fallZ>=-9&&fallZ<96){
        const p=project(fallZ,0);
        const wx=roadX(fallZ,2.0);
        const shimmering=.85+.1*Math.sin(state.time*3.8);
        drawArt('waterfall',wx,p.y+6*p.scale,265*p.scale,203*p.scale,shimmering);
      }
    }
    // Foreground plants frame the camera without participating in collisions.
    drawArt('foreground',400,480,800,480,.92);
    // A moving insect provides some environmental motion (screen-space).
    const dragonX=677+Math.sin(state.time*.8)*21;
    const dragonY=172+Math.sin(state.time*3.4)*14;
    ctx.save();ctx.translate(dragonX,dragonY);
    ctx.rotate(Math.sin(state.time*2)*.15);
    ctx.scale(.89+Math.sin(state.time*24)*.1,1);
    drawArt('dragonfly',0,0,49,36,.87);
    ctx.restore();
  }
  function render() {
    ctx.save();
    if (state.phase==='over' && performance.now()-crashAt<330) {
      const amplitude=(1-(performance.now()-crashAt)/330)*5;
      ctx.translate(Math.sin(performance.now()*.12)*amplitude,Math.cos(performance.now()*.17)*amplitude);
    }
    sky(); road(); terrain(); scenery(); environmentFeatures();
    const objects=state.obstacles.slice().sort((a,b)=>b.z-a.z);
    objects.filter(o=>o.z>2.5 || o.item!=='low-bridge').forEach(o=>hazard(o));
    const nearestBridges=objects.filter(o=>o.z<=2.5&&o.item==='low-bridge');
    nearestBridges.forEach(o=>hazard(o,'rear'));
    const x=roadX(0,state.visualLane/1.5);
    muPi(x,435,game.jumpHeight(state),game.ducking(state),state.time);
    // Only the beam occupies the foreground, not the entire bridge/supports.
    nearestBridges.forEach(o=>hazard(o,'front'));
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
      if(state.lastTerrain!==previousTerrain){
        previousTerrain=state.lastTerrain;
        showToast(previousTerrain==='boardwalk'?'HOLZSTEG!':previousTerrain==='forest'?'WALDPFAD!':'FLUSSBETT!');
      }
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
      previousTerrain='river';
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
    setControllerMode(true);
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
    setControllerMode(true);
    event.preventDefault();
    if(event.repeat)return;
    control(action);
  });
  for(const id of ['left','right','jump','duck']){
    const button=document.getElementById(id);
    button.addEventListener('pointerdown', event=>{
      event.preventDefault();setControllerMode(false);control(id);
    });
  }
  document.getElementById('exit').addEventListener('click',()=>control('exit'));
  pauseButton.addEventListener('click',()=>control('pause'));
  primary.addEventListener('click',begin);
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch')setControllerMode(false);
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
  // Only a standalone browser preview exposes deterministic test scenes.
  // This API is not registered inside hosted MuPiBox Qt.
  if(!sdk.isHosted){
    window.__MuPiRunPreview=Object.freeze({
      setScene(distance, obstacles=[], lane=0, mode='running') {
        if(!Number.isFinite(distance) || distance<0 || distance>1e6) return false;
        state.distance=distance;
        state.speed=game.speedAt(distance);
        state.lastTerrain=game.terrainAt(distance);
        state.lane=Math.max(-1,Math.min(1,Number(lane)||0));
        state.visualLane=state.lane;
        state.obstacles=obstacles.map(o=>({
          lane:o.lane===null?null:Math.max(-1,Math.min(1,Number(o.lane)||0)),
          kind:o.kind,item:o.item,z:Number(o.z)||20,checked:false,passed:false
        }));
        state.jumpAge=mode==='jump'?.23:-1;
        state.duckAge=mode==='duck'?.17:-1;
        state.phase='running';
        setControllerMode(true);
        renderOverlay();render();
        return true;
      },
      snapshot() {
        return {
          phase:state.phase,distance:state.distance,lane:state.lane,
          visualLane:state.visualLane,speed:state.speed,
          jumpAge:state.jumpAge,duckAge:state.duckAge,waves:state.waves,
          phaseJump:state.jumpAge,phaseDuck:state.duckAge,
          terrain:state.lastTerrain,obstacles:state.obstacles.map(o=>({...o})),
          missingSprites:Object.keys(art).filter(name=>!art[name].complete||!art[name].naturalWidth),
          controllerMode:gameElement.classList.contains('controller-active'),
          usingUserSheet:!!(art['mupi-running-24']&&art['mupi-running-24'].naturalWidth===1920),
          sheetFrame:Math.floor(state.time*(20+Math.min(8,Math.max(0,(state.speed-13)*.47))))%24
        };
      }
    });
  }
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