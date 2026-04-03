var I=Object.defineProperty;var $=(o,e,t)=>e in o?I(o,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):o[e]=t;var z=(o,e,t)=>$(o,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function t(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(i){if(i.ep)return;i.ep=!0;const n=t(i);fetch(i.href,n)}})();class q{constructor(){this._listeners=new Map}on(e,t){return this._listeners.has(e)||this._listeners.set(e,new Set),this._listeners.get(e).add(t),()=>this.off(e,t)}once(e,t){const s=(...i)=>{this.off(e,s),t(...i)};this.on(e,s)}off(e,t){const s=this._listeners.get(e);s&&s.delete(t)}emit(e,t){const s=this._listeners.get(e);if(s)for(const i of s)try{i(t)}catch(n){console.error(`[EventBus] Ошибка в обработчике "${e}":`,n)}}}const r=new q;class M{constructor(){this.reset()}reset(){this.currentRoom=null,this.phraseIndex=0,this.roomPhase="phrases",this.inventory=[],this.flags={},this.history=[],this.settings={musicVolume:.7,sfxVolume:.8,textSpeed:5}}addItem(e){this.inventory.includes(e)||this.inventory.push(e)}hasItem(e){return this.inventory.includes(e)}setFlag(e,t=!0){this.flags[e]=t}getFlag(e){return this.flags[e]??!1}addToHistory(e){this.history.push({character:e.character,name:e.name,text:e.text,roomId:e.roomId})}getHistoryForRoom(e){return this.history.filter(t=>t.roomId===e)}getCharDelay(){const e=this.settings.textSpeed;return e>=10?0:Math.round(80-(e-1)*8.75)}}const u=new M;class P{constructor(){this.data=null}async load(e="/data/scenario.json"){const t=await fetch(e);if(!t.ok)throw new Error(`Не удалось загрузить сценарий: ${t.status}`);return this.data=await t.json(),this.data}get settings(){var e;return((e=this.data)==null?void 0:e.settings)??{}}getRoom(e){var t,s;return((s=(t=this.data)==null?void 0:t.rooms)==null?void 0:s[e])??null}getCharacter(e){var t,s;return((s=(t=this.data)==null?void 0:t.characters)==null?void 0:s[e])??null}getItem(e){var t,s;return((s=(t=this.data)==null?void 0:t.items)==null?void 0:s[e])??null}getMusicPath(e){var t,s,i;return((i=(s=(t=this.data)==null?void 0:t.audio)==null?void 0:s.music)==null?void 0:i[e])??null}getSoundPath(e){var t,s,i;return((i=(s=(t=this.data)==null?void 0:t.audio)==null?void 0:s.sounds)==null?void 0:i[e])??null}get startRoom(){return this.settings.startRoom??null}}const g=new P;class B{async execute(e){if(!(!e||!Array.isArray(e)))for(const t of e)await this._executeOne(t)}async _executeOne(e){switch(e.type){case"effect":await this._awaitEvent("effect:done",()=>{r.emit("effect:play",{name:e.name,duration:e.duration??1e3,target:e.target??"screen"})});break;case"sound":r.emit("audio:playSound",{name:e.name});break;case"showCharacter":r.emit("character:show",{character:e.character,position:e.position??"center",sprite:e.sprite??"neutral"});break;case"hideCharacter":r.emit("character:hide",{character:e.character});break;case"changeSprite":r.emit("character:changeSprite",{character:e.character,sprite:e.sprite});break;case"changeBackground":{r.emit("scene:changeBackground",{src:e.src});break}case"addItem":u.addItem(e.item),r.emit("inventory:updated",{itemId:e.item});break;case"setFlag":u.setFlag(e.flag,e.value??!0);break;case"goToRoom":if(e.transition){const t=e.transitionDuration??1200;await this._awaitEvent("effect:done",()=>{r.emit("effect:play",{name:e.transition,duration:t})})}r.emit("scene:goToRoom",{room:e.room});break;case"startPuzzle":await this._awaitEvent("puzzle:solved",()=>{r.emit("puzzle:start",{puzzleId:e.puzzleId})});break;case"enableHotspots":r.emit("hotspots:enable");break;case"continueDialogue":r.emit("dialogue:continueFrom",{phraseId:e.phraseId});break;case"showFinalChoice":r.emit("dialogue:showFinalChoice");break;case"showCredits":r.emit("game:showCredits");break;case"playVideo":await this._awaitEvent("video:ended",()=>{const t=document.getElementById("mask");t.classList.remove("hidden"),t.classList.add("visible"),r.emit("video:play",{src:e.src})});break;default:console.warn(`[ActionExecutor] Неизвестный тип действия: "${e.type}"`)}}_awaitEvent(e,t){return new Promise(s=>{r.once(e,s),t()})}}const v=new B,b=class b{constructor(){this._box=null,this._speakerEl=null,this._textEl=null,this._hintEl=null,this._choicesContainer=null,this._isTyping=!1,this._fullText="",this._typeTimer=null,this._currentCharIndex=0,this._isProcessing=!1,this._waitingForClick=!1,this._currentPhrases=[],this._currentPhraseIndex=0,this._portraitEl=null}init(){this._box=document.getElementById("dialogue-box"),this._portraitEl=document.getElementById("dialogue-portrait"),this._speakerEl=this._box.querySelector(".dialogue-speaker"),this._textEl=this._box.querySelector(".dialogue-text"),this._hintEl=this._box.querySelector(".dialogue-continue-hint"),this._choicesContainer=document.getElementById("choices-container"),this._box.addEventListener("click",()=>this._onAdvance()),document.addEventListener("keydown",e=>{(e.code==="Space"||e.code==="Enter")&&(this._box.classList.contains("hidden")||(e.preventDefault(),this._onAdvance()))}),r.on("dialogue:start",e=>this.startPhrases(e.phrases)),r.on("dialogue:continueFrom",e=>this._continueFrom(e.phraseId)),r.on("dialogue:showFinalChoice",()=>this._showFinalChoice())}startPhrases(e){this._currentPhrases=e,this._currentPhraseIndex=0,this._showPhrase(this._currentPhrases[0])}async _showPhrase(e){var c;if(!e)return;this._isProcessing=!0,this._waitingForClick=!1;const t=g.getCharacter(e.character),s=(t==null?void 0:t.name)??"",i=(t==null?void 0:t.color)??"#ccc",n=e.character==="glitch";this._box.classList.remove("hidden"),this._box.classList.toggle("dialogue-glitch",n),this._speakerEl.textContent=s,this._speakerEl.style.color=i,this._textEl.classList.toggle("glitch-text-style",n),this._hintEl.classList.add("hidden");const a=(c=t==null?void 0:t.sprites)==null?void 0:c[e.sprite??"neutral"];a&&s?(this._portraitEl.style.backgroundImage=`url(${a})`,this._portraitEl.classList.remove("portrait-hidden"),this._portraitEl.classList.toggle("portrait-glitch",n)):this._portraitEl.classList.add("portrait-hidden"),await v.execute(e.before),u.addToHistory({character:e.character,name:s,text:e.text,roomId:u.currentRoom}),r.emit("history:updated"),this._isProcessing=!1,await this._typeText(e.text,n),this._isProcessing=!0,await v.execute(e.after),this._isProcessing=!1,this._hintEl.classList.remove("hidden"),this._waitingForClick=!0}_typeText(e,t=!1){return new Promise(s=>{this._fullText=e,this._textEl.textContent="",this._currentCharIndex=0,this._isTyping=!0;const i=u.getCharDelay();if(i===0){this._textEl.textContent=e,this._isTyping=!1,s();return}let n=0;this._typeResolve=s,this._typeTimer=setInterval(()=>{if(this._currentCharIndex<this._fullText.length){const a=this._fullText[this._currentCharIndex];if(t&&Math.random()<.15&&a!==" "){const c=b.GLITCH_CHARS[Math.floor(Math.random()*b.GLITCH_CHARS.length)];this._textEl.textContent+=c;const l=this._textEl.textContent.length-1;setTimeout(()=>{const h=this._textEl.textContent;this._textEl.textContent=h.substring(0,l)+a+h.substring(l+1)},60)}else this._textEl.textContent+=a;this._currentCharIndex++,n++,n>=3&&(n=0,r.emit("audio:playSound",{name:t?"glitch_type":"text_type"}))}else clearInterval(this._typeTimer),this._isTyping=!1,s()},i)})}async _onAdvance(){if(!this._isProcessing){if(this._isTyping){clearInterval(this._typeTimer),this._textEl.textContent=this._fullText,this._isTyping=!1,this._typeResolve&&(this._typeResolve(),this._typeResolve=null);return}if(this._waitingForClick)if(this._waitingForClick=!1,this._hintEl.classList.add("hidden"),this._currentPhraseIndex++,this._currentPhraseIndex<this._currentPhrases.length){const e=this._currentPhrases[this._currentPhraseIndex];e&&await this._showPhrase(e)}else this.hide()}}_continueFrom(e){const t=g.getRoom(u.currentRoom);if(!t)return;let s=t.onHotspotsComplete??[],i=s.findIndex(n=>n.id===e);i===-1&&(s=t.onPuzzleSolved??[],i=s.findIndex(n=>n.id===e)),i!==-1&&this.startPhrases(s.slice(i))}_showFinalChoice(){this.hide();const e=document.querySelector(".final-choice-darken, .dark-overlay, #dark-overlay");e&&e.classList.add("hidden"),r.emit("finalChoice:show")}show(){this._box.classList.remove("hidden")}hide(){this._box.classList.add("hidden"),this._hintEl.classList.add("hidden"),this._waitingForClick=!1}};z(b,"GLITCH_CHARS","█▓░▒╔╗╚╝╠╣╬│─┼╪▄▀■□◊◘◙");let E=b;const k=new E;class F{constructor(){this._bgImg=null,this._bgContainer=null,this._hotspotsLayer=null,this._charactersLayer=null,this._activeCharacters={},this._hotspotsEnabled=!1,this._parallaxBound=null}init(){this._bgImg=document.getElementById("scene-bg"),this._bgContainer=document.getElementById("background-container"),this._hotspotsLayer=document.getElementById("hotspots-layer"),this._charactersLayer=document.getElementById("characters-layer"),r.on("scene:goToRoom",e=>this.loadRoom(e.room)),r.on("scene:changeBackground",e=>this._crossfadeBackground(e.src)),r.on("character:show",e=>this._showCharacter(e)),r.on("character:hide",e=>this._hideCharacter(e.character)),r.on("character:changeSprite",e=>this._changeSprite(e)),r.on("hotspots:enable",()=>this._enableHotspots()),this._parallaxBound=this._onMouseMoveParallax.bind(this)}loadRoom(e){const t=g.getRoom(e);if(!t){console.error(`[SceneManager] Комната "${e}" не найдена`);return}if(e=="ending_room"){const s=document.getElementById("choices-container");s.classList.remove("final-choice-container"),s.classList.add("hidden")}u.currentRoom=e,u.phraseIndex=0,u.roomPhase="phrases",this._clearScene(),this._bgImg.src=t.background,this._bgImg.alt=t.id,t.music&&t.music!=="none"?r.emit("audio:playMusic",{name:t.music}):r.emit("audio:stopMusic"),t.ambientEffects&&t.ambientEffects.forEach(s=>{r.emit("effect:playAmbient",{name:s})}),this._showGameScreen(),this._enableParallax(),this._prepareHotspots(t.hotspots??[]),t.phrases&&t.phrases.length>0&&k.startPhrases(t.phrases)}_clearScene(){this._charactersLayer.innerHTML="",this._activeCharacters={},this._hotspotsLayer.innerHTML="",this._hotspotsEnabled=!1,r.emit("effect:clearAmbient")}_showGameScreen(){document.getElementById("screen-title").classList.remove("active"),document.getElementById("screen-game").classList.add("active")}_crossfadeBackground(e){const t=document.createElement("img");if(t.src=e,t.classList.add("scene-bg-crossfade"),t.alt="",this._bgContainer.appendChild(t),requestAnimationFrame(()=>{t.style.opacity="1"}),setTimeout(()=>{this._bgImg.src=e,t.remove()},600),e==="/its-just-a-dream/assets/backgrounds/clock.gif"){const s=document.getElementById("mask");s.classList.remove("hidden"),s.classList.add("visible")}else{const s=document.getElementById("mask");s.classList.remove("visible"),s.classList.add("hidden")}}_enableParallax(){document.removeEventListener("mousemove",this._parallaxBound),document.addEventListener("mousemove",this._parallaxBound)}_onMouseMoveParallax(e){const t=(e.clientX/window.innerWidth-.5)*2,s=(e.clientY/window.innerHeight-.5)*2,i=8,n=4;this._bgImg&&(this._bgImg.style.transform=`translate(${-t*i}px, ${-s*i}px) scale(1.02)`),this._charactersLayer&&(this._charactersLayer.style.transform=`translate(${-t*n}px, ${-s*n}px)`)}_showCharacter({character:e,position:t,sprite:s}){var c,l;const i=g.getCharacter(e);if(!i)return;let n=this._activeCharacters[e];n||(n=document.createElement("div"),n.classList.add("character-sprite"),n.dataset.character=e,this._charactersLayer.appendChild(n),this._activeCharacters[e]=n);const a=((c=i.sprites)==null?void 0:c[s])??((l=i.sprites)==null?void 0:l.neutral);a&&(n.style.backgroundImage=`url(${a})`),n.classList.remove("pos-left","pos-center","pos-right"),n.classList.add(`pos-${t}`),n.classList.add("character-enter"),n.addEventListener("animationend",()=>n.classList.remove("character-enter"),{once:!0})}_hideCharacter(e){const t=this._activeCharacters[e];t&&(t.classList.add("character-exit"),t.addEventListener("animationend",()=>{t.remove(),delete this._activeCharacters[e]},{once:!0}))}_changeSprite({character:e,sprite:t}){var a;const s=this._activeCharacters[e],i=g.getCharacter(e);if(!s||!i)return;const n=(a=i.sprites)==null?void 0:a[t];n&&(s.style.backgroundImage=`url(${n})`)}_prepareHotspots(e){e.forEach(t=>{const s=document.createElement("div");s.classList.add("hotspot","hidden"),s.dataset.id=t.id,s.style.left=`${t.x}%`,s.style.top=`${t.y}%`,s.style.width=`${t.width}%`,s.style.height=`${t.height}%`,s.style.cursor=t.cursor??"pointer",t.tooltip&&(s.title=t.tooltip),s.addEventListener("click",()=>{t.requiresFlag&&!u.getFlag(t.requiresFlag)||(this._disableHotspots(),v.execute(t.onInteract))}),this._hotspotsLayer.appendChild(s)})}_enableHotspots(){this._hotspotsEnabled=!0,this._hotspotsLayer.querySelectorAll(".hotspot").forEach(e=>{e.classList.remove("hidden"),e.classList.add("hotspot-active")})}_disableHotspots(){this._hotspotsEnabled=!1,this._hotspotsLayer.querySelectorAll(".hotspot").forEach(e=>{e.classList.add("hidden"),e.classList.remove("hotspot-active")})}}const S=new F;class A{constructor(){this._musicAudio=null,this._currentMusicName=null,this._soundCache=new Map,this._crossfadeDuration=1500}init(){r.on("audio:playMusic",e=>this.playMusic(e.name)),r.on("audio:stopMusic",()=>this.stopMusic()),r.on("audio:playSound",e=>this.playSound(e.name)),r.on("settings:changed",()=>this._updateVolumes())}playMusic(e){if(this._currentMusicName===e)return;const t=g.getMusicPath(e);if(!t){console.warn(`[AudioManager] Музыка "${e}" не найдена в сценарии`);return}this._musicAudio&&this._fadeOut(this._musicAudio,this._crossfadeDuration);const s=new Audio(t);s.loop=!0,s.volume=0,s.play().catch(()=>{const i=()=>{s.play().catch(()=>{}),document.removeEventListener("click",i)};document.addEventListener("click",i,{once:!0})}),this._fadeIn(s,this._crossfadeDuration,u.settings.musicVolume),this._musicAudio=s,this._currentMusicName=e}stopMusic(){this._musicAudio&&(this._fadeOut(this._musicAudio,this._crossfadeDuration),this._musicAudio=null,this._currentMusicName=null)}playSound(e){const t=g.getSoundPath(e);if(!t)return;let s=this._soundCache.get(e);s?s.currentTime=0:(s=new Audio(t),this._soundCache.set(e,s)),s.volume=u.settings.sfxVolume,s.play().catch(()=>{})}_fadeIn(e,t,s){const n=t/20,a=s/20;let c=0;const l=setInterval(()=>{c++,e.volume=Math.min(a*c,s),c>=20&&clearInterval(l)},n)}_fadeOut(e,t){const i=t/20,n=e.volume,a=n/20;let c=0;const l=setInterval(()=>{c++,e.volume=Math.max(n-a*c,0),c>=20&&(clearInterval(l),e.pause(),e.src="")},i)}_updateVolumes(){this._musicAudio&&(this._musicAudio.volume=u.settings.musicVolume)}}const H=new A;class R{constructor(){this._overlay=null,this._gameScreen=null,this._ambientEffects={},this._activeFade=null}init(){this._overlay=document.getElementById("effects-overlay"),this._gameScreen=document.getElementById("screen-game"),r.on("effect:play",e=>this.play(e)),r.on("effect:playAmbient",e=>this.playAmbient(e.name)),r.on("effect:clearAmbient",()=>this.clearAmbient())}play({name:e,duration:t=1e3,target:s="screen",onComplete:i=null}){const n=this._resolveTarget(s);switch(e){case"transitionFade":this._transitionFade(t,i);break;case"fadeToBlack":this._fadeToColor("black",t,i);break;case"fadeFromBlack":this._fadeFromColor("black",t,i);break;case"fadeToWhite":this._fadeToColor("white",t,i);break;case"fadeFromWhite":this._fadeFromColor("white",t,i);break;case"transitionDoor":this._transitionDoor(t,i);break;case"transitionGlitch":this._transitionGlitch(t,i);break;case"transitionSpiral":this._transitionSpiral(t,i);break;case"glitchLight":this._glitch(n,"light",t,i);break;case"glitchMedium":this._glitch(n,"medium",t,i);break;case"glitchHeavy":this._glitch(n,"heavy",t,i);break;case"shake":this._shake(n,t,i);break;case"noise":this._noise(t,i);break;case"pulseGlow":this._pulseGlow(n,t,i);break;default:console.warn(`[EffectsManager] Неизвестный эффект: "${e}"`),i?i():r.emit("effect:done")}}_transitionFade(e,t){this._activeFade&&(this._activeFade.remove(),this._activeFade=null);const s=document.createElement("div");s.className="transition-fade",s.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #000000;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity ${e}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `,document.body.appendChild(s),this._activeFade=s,requestAnimationFrame(()=>{s.classList.add("in"),s.style.opacity="1"}),setTimeout(()=>{t?t():r.emit("effect:done"),requestAnimationFrame(()=>{s.classList.remove("in"),s.style.opacity="0"}),setTimeout(()=>{s.parentNode&&s.remove(),this._activeFade=null},e)},e)}_transitionFadeColored(e="#0a0508",t,s){this._activeFade&&(this._activeFade.remove(),this._activeFade=null);const i=document.createElement("div");i.className="transition-fade-colored",i.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${e};
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity ${t}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `,document.body.appendChild(i),this._activeFade=i,requestAnimationFrame(()=>{i.style.opacity="1"}),setTimeout(()=>{s?s():r.emit("effect:done"),requestAnimationFrame(()=>{i.style.opacity="0"}),setTimeout(()=>{i.parentNode&&i.remove(),this._activeFade=null},t)},t)}_fadeToColor(e,t,s){this._activeFade&&(this._activeFade.remove(),this._activeFade=null);const i=document.createElement("div");i.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${e};
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity ${t}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `,document.body.appendChild(i),this._activeFade=i,requestAnimationFrame(()=>{i.style.opacity="1"}),setTimeout(()=>{s?s():r.emit("effect:done")},t)}_fadeFromColor(e,t,s){if(this._activeFade&&this._activeFade.style.backgroundColor===e){const i=this._activeFade;requestAnimationFrame(()=>{i.style.opacity="0"}),setTimeout(()=>{i.remove(),this._activeFade=null,s?s():r.emit("effect:done")},t)}else{const i=document.createElement("div");i.style.cssText=`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: ${e};
        z-index: 1000;
        pointer-events: none;
        opacity: 1;
        transition: opacity ${t}ms cubic-bezier(0.4, 0.0, 0.2, 1);
      `,document.body.appendChild(i),requestAnimationFrame(()=>{i.style.opacity="0"}),setTimeout(()=>{i.remove(),s?s():r.emit("effect:done")},t)}}_transitionDoor(e,t){const s=e/2,i=document.createElement("div");i.style.cssText=`
      position: fixed;
      inset: 0;
      display: flex;
      z-index: 1000;
      pointer-events: none;
    `;const n=document.createElement("div");n.style.cssText=`
      flex: 1;
      background: #000;
      transform: scaleX(0);
      transform-origin: left;
      transition: transform ${s}ms ease-in;
    `;const a=document.createElement("div");a.style.cssText=`
      flex: 1;
      background: #000;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform ${s}ms ease-in;
    `,i.appendChild(n),i.appendChild(a),document.body.appendChild(i),requestAnimationFrame(()=>{n.style.transform="scaleX(1)",a.style.transform="scaleX(1)"}),setTimeout(()=>{t?t():r.emit("effect:done"),n.style.transform="scaleX(0)",a.style.transform="scaleX(0)",setTimeout(()=>{i.remove()},s)},s)}_transitionGlitch(e,t){const s=document.createElement("div");s.className="transition-glitch",s.style.cssText=`
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: none;
    overflow: hidden;
    background: #000;
  `;const i=12,n=100/i;for(let a=0;a<i;a++){const c=document.createElement("div");c.className="transition-glitch-strip";const l=a%2===0,h=l?"#ff0000":"#00ff00",d=l?"#ff3333":"#33ff33",m=l?"#cc0000":"#00cc66";c.style.cssText=`
      position: absolute;
      left: 0;
      right: 0;
      top: ${a*n}%;
      height: ${n}%;
      background: linear-gradient(90deg, ${h}, ${d}, ${h}, ${m}, ${h});
      transform: translateX(-100%);
      transition: transform ${e*.7}ms cubic-bezier(0.4, 0.0, 0.2, 1);
      transition-delay: ${a*.025}s;
      mix-blend-mode: screen;
      box-shadow: 0 0 8px ${l?"rgba(255, 0, 0, 0.6)":"rgba(0, 255, 0, 0.6)"};
    `,s.appendChild(c)}document.body.appendChild(s),requestAnimationFrame(()=>{s.querySelectorAll(".transition-glitch-strip").forEach(c=>{c.style.transform="translateX(0)"})}),setTimeout(()=>{s.querySelectorAll(".transition-glitch-strip").forEach((c,l)=>{c.style.transition=`opacity 0.2s ease ${l*.01}s`,c.style.opacity="0"}),setTimeout(()=>{s.remove(),t?t():r.emit("effect:done")},200)},e)}_transitionGlitchRGB(e,t){const s=document.createElement("div");s.className="transition-glitch-rgb",s.style.cssText=`
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: none;
    overflow: hidden;
    background: #000;
  `;const i=15,n=100/i;for(let a=0;a<i;a++){const c=document.createElement("div");c.className="rgb-strip";let l;a%3===0?l="#ff0000":a%3===1?l="#00ff00":l="#0044ff",c.style.cssText=`
      position: absolute;
      left: 0;
      right: 0;
      top: ${a*n}%;
      height: ${n}%;
      background: ${l};
      transform: translateX(-100%);
      transition: transform ${e*.6}ms cubic-bezier(0.4, 0.0, 0.2, 1);
      transition-delay: ${a*.02}s;
      mix-blend-mode: screen;
      box-shadow: 0 0 12px ${l};
    `,s.appendChild(c)}document.body.appendChild(s),requestAnimationFrame(()=>{s.querySelectorAll(".rgb-strip").forEach(c=>{c.style.transform="translateX(0)"})}),setTimeout(()=>{s.querySelectorAll(".rgb-strip").forEach((c,l)=>{c.style.transition=`opacity 0.15s ease ${l*.008}s`,c.style.opacity="0"}),setTimeout(()=>{s.remove(),t?t():r.emit("effect:done")},200)},e)}_transitionSpiral(e,t){const s=e/2,i=document.createElement("div");i.style.cssText=`
      position: fixed;
      inset: 0;
      background-color: #000;
      z-index: 1000;
      pointer-events: none;
      transition: clip-path ${s}ms ease-in-out;
      clip-path: circle(150% at 50% 50%);
    `,document.body.appendChild(i),requestAnimationFrame(()=>{i.style.clipPath="circle(0% at 50% 50%)"}),setTimeout(()=>{t?t():r.emit("effect:done"),i.style.clipPath="circle(150% at 50% 50%)",setTimeout(()=>{i.remove()},s)},s)}_glitch(e,t,s,i){const n=`effect-glitch-${t}`;e.classList.add(n),setTimeout(()=>{e.classList.remove(n),i?i():r.emit("effect:done")},s)}_shake(e,t,s){e.classList.add("effect-shake"),setTimeout(()=>{e.classList.remove("effect-shake"),s?s():r.emit("effect:done")},t)}_noise(e,t){const s=document.createElement("div");s.classList.add("effect-noise"),s.style.cssText=`
      position: fixed;
      inset: 0;
      z-index: 999;
      pointer-events: none;
    `,this._overlay.appendChild(s),setTimeout(()=>{s.remove(),t?t():r.emit("effect:done")},e)}_pulseGlow(e,t,s){e.classList.add("effect-pulse"),setTimeout(()=>{e.classList.remove("effect-pulse"),s?s():r.emit("effect:done")},t)}playAmbient(e){if(this._ambientEffects[e])return;const t=document.createElement("div");t.classList.add("ambient-effect",`ambient-${e}`),t.style.cssText=`
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 5;
    `,this._overlay.appendChild(t),this._ambientEffects[e]=t}clearAmbient(){Object.values(this._ambientEffects).forEach(e=>e.remove()),this._ambientEffects={}}_resolveTarget(e){switch(e){case"screen":return this._gameScreen;case"puzzle":return document.getElementById("puzzle-container");default:return document.querySelector(e)??this._gameScreen}}}const N=new R;class O{render(e,t,s){var h;e.innerHTML=`
      <div class="puzzle-inner puzzle-code">
        <h3 class="puzzle-title">${t.title}</h3>
        <p class="puzzle-desc">${t.description}</p>
        <div class="code-input-row">
          ${Array.from({length:t.length},(d,m)=>`
            <input type="text" maxlength="1" class="code-digit" data-index="${m}"
                   autocomplete="off" />
          `).join("")}
        </div>
        <button class="btn-novel btn-puzzle-submit">Проверить</button>
        <div class="puzzle-hint hidden">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${t.hint}</p>
        </div>
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;const i=e.querySelectorAll(".code-digit"),n=e.querySelector(".btn-puzzle-submit"),a=e.querySelector(".puzzle-feedback"),c=e.querySelector(".btn-hint-toggle"),l=e.querySelector(".hint-text");(h=i[0])==null||h.focus(),i.forEach((d,m)=>{d.addEventListener("input",()=>{d.value&&m<i.length-1&&i[m+1].focus()}),d.addEventListener("keydown",p=>{p.key==="Backspace"&&!d.value&&m>0&&i[m-1].focus(),p.key==="Enter"&&n.click()})}),n.addEventListener("click",()=>{Array.from(i).map(m=>m.value).join("").toUpperCase()===t.answer.toUpperCase()?(a.textContent="Верно!",a.classList.remove("hidden","wrong"),a.classList.add("correct"),setTimeout(()=>s(),800)):(a.textContent="Неправильно, попробуйте ещё раз",a.classList.remove("hidden","correct"),a.classList.add("wrong"),e.querySelector(".puzzle-inner").classList.add("effect-shake"),setTimeout(()=>{var m;(m=e.querySelector(".puzzle-inner"))==null||m.classList.remove("effect-shake")},500))}),c.addEventListener("click",()=>{l.classList.toggle("hidden")}),e.querySelector(".puzzle-hint").classList.remove("hidden")}}class j{render(e,t,s){e.innerHTML=`
      <div class="puzzle-inner puzzle-cipher">
        <h3 class="puzzle-title">${t.title}</h3>
        <p class="puzzle-desc">${t.description}</p>
        <div class="cipher-display">
          <span class="cipher-encoded">${t.encoded}</span>
        </div>
        <div class="cipher-input-row">
          <input type="text" class="cipher-answer" placeholder="Введите расшифровку..."
                 autocomplete="off" />
          <button class="btn-novel btn-puzzle-submit">Проверить</button>
        </div>
        <div class="puzzle-hint">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${t.hint}</p>
        </div>
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;const i=e.querySelector(".cipher-answer"),n=e.querySelector(".btn-puzzle-submit"),a=e.querySelector(".puzzle-feedback"),c=e.querySelector(".btn-hint-toggle"),l=e.querySelector(".hint-text");i.focus();const h=()=>{i.value.toUpperCase().trim()===t.answer.toUpperCase()?(a.textContent="Расшифровано!",a.classList.remove("hidden","wrong"),a.classList.add("correct"),setTimeout(()=>s(),800)):(a.textContent="Не то... попробуйте ещё",a.classList.remove("hidden","correct"),a.classList.add("wrong"))};n.addEventListener("click",h),i.addEventListener("keydown",d=>{d.key==="Enter"&&h()}),c.addEventListener("click",()=>l.classList.toggle("hidden"))}}class G{render(e,t,s){const i=[...t.items].sort(()=>Math.random()-.5);let n=1;e.innerHTML=`
      <div class="puzzle-inner puzzle-sequence">
        <h3 class="puzzle-title">${t.title}</h3>
        <p class="puzzle-desc">${t.description}</p>
        <div class="sequence-items">
          ${i.map(d=>`
            <button class="btn-sequence-item" data-id="${d.id}" data-order="${d.order}">
              ${d.label}
            </button>
          `).join("")}
        </div>
        <div class="sequence-progress">
          Шаг: <span class="seq-step">1</span> / ${t.items.length}
        </div>
        <div class="puzzle-hint">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${t.hint}</p>
        </div>
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;const a=e.querySelector(".seq-step"),c=e.querySelector(".puzzle-feedback"),l=e.querySelector(".btn-hint-toggle"),h=e.querySelector(".hint-text");e.querySelectorAll(".btn-sequence-item").forEach(d=>{d.addEventListener("click",()=>{parseInt(d.dataset.order)===n?(d.classList.add("sequence-correct"),d.disabled=!0,n++,a.textContent=n,r.emit("audio:playSound",{name:"btn_click"}),n>t.items.length&&(c.textContent="Собрано!",c.classList.remove("hidden","wrong"),c.classList.add("correct"),setTimeout(()=>s(),800))):(d.classList.add("sequence-wrong"),setTimeout(()=>d.classList.remove("sequence-wrong"),500),c.textContent="Неправильный порядок, начните сначала",c.classList.remove("hidden","correct"),c.classList.add("wrong"),n=1,a.textContent=1,e.querySelectorAll(".btn-sequence-item").forEach(p=>{p.classList.remove("sequence-correct"),p.disabled=!1}))})}),l.addEventListener("click",()=>h.classList.toggle("hidden"))}}class D{render(e,t,s){const i=t.gridSize??3;let n=this._generateSolvable(i);e.innerHTML=`
      <div class="puzzle-inner puzzle-slider">
        <h3 class="puzzle-title">${t.title??"Соберите паззл"}</h3>
        <p class="puzzle-desc">${t.description??"Передвигайте плитки, чтобы расставить их по порядку."}</p>
        <div class="slider-grid" style="grid-template-columns: repeat(${i}, 1fr);"></div>
        <div class="puzzle-hint">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${t.hint??"Начните с верхнего левого угла."}</p>
        </div>
      </div>
    `;const a=e.querySelector(".slider-grid"),c=()=>{a.innerHTML="",n.forEach((d,m)=>{const p=document.createElement("div");p.classList.add("slider-tile"),d===0?p.classList.add("slider-empty"):(p.textContent=d,p.addEventListener("click",()=>{const _=n.indexOf(0);this._isAdjacent(m,_,i)&&([n[m],n[_]]=[n[_],n[m]],r.emit("audio:playSound",{name:"btn_click"}),c(),this._isSolved(n)&&setTimeout(()=>s(),500))})),a.appendChild(p)})};c();const l=e.querySelector(".btn-hint-toggle"),h=e.querySelector(".hint-text");l.addEventListener("click",()=>h.classList.toggle("hidden"))}_isAdjacent(e,t,s){const i=Math.floor(e/s),n=e%s,a=Math.floor(t/s),c=t%s;return Math.abs(i-a)+Math.abs(n-c)===1}_isSolved(e){for(let t=0;t<e.length-1;t++)if(e[t]!==t+1)return!1;return e[e.length-1]===0}_generateSolvable(e){const t=e*e;let s;do{s=Array.from({length:t},(i,n)=>n);for(let i=s.length-1;i>0;i--){const n=Math.floor(Math.random()*(i+1));[s[i],s[n]]=[s[n],s[i]]}}while(!this._checkSolvable(s,e));return s}_checkSolvable(e,t){let s=0;for(let n=0;n<e.length;n++)for(let a=n+1;a<e.length;a++)e[n]&&e[a]&&e[n]>e[a]&&s++;if(t%2===1)return s%2===0;const i=Math.floor(e.indexOf(0)/t);return(s+i)%2===1}}class X{render(e,t,s){const i=t.pairs??[{id:1,label:"Луна"},{id:2,label:"Звезда"},{id:3,label:"Тень"},{id:4,label:"Свет"}],n=[...i,...i].map((l,h)=>({...l,uid:h})).sort(()=>Math.random()-.5);let a=[],c=0;e.innerHTML=`
      <div class="puzzle-inner puzzle-matching">
        <h3 class="puzzle-title">${t.title??"Найдите пары"}</h3>
        <p class="puzzle-desc">${t.description??"Переворачивайте карточки и находите совпадения."}</p>
        <div class="matching-grid">
          ${n.map(l=>`
            <div class="match-card" data-id="${l.id}" data-uid="${l.uid}">
              <div class="card-front">?</div>
              <div class="card-back">${l.label}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `,e.querySelectorAll(".match-card").forEach(l=>{l.addEventListener("click",()=>{if(!(a.length>=2||l.classList.contains("flipped")||l.classList.contains("matched"))&&(l.classList.add("flipped"),a.push(l),r.emit("audio:playSound",{name:"btn_click"}),a.length===2)){const[h,d]=a;h.dataset.id===d.dataset.id?(h.classList.add("matched"),d.classList.add("matched"),c++,a=[],r.emit("audio:playSound",{name:"puzzle_solved"}),c===i.length&&setTimeout(()=>s(),600)):setTimeout(()=>{h.classList.remove("flipped"),d.classList.remove("flipped"),a=[]},800)}})})}}class V{render(e,t,s){const i=t.objects??[];let n=0;e.innerHTML=`
      <div class="puzzle-inner puzzle-hidden">
        <h3 class="puzzle-title">${t.title??"Найдите все предметы"}</h3>
        <p class="puzzle-desc">${t.description??""}</p>
        <div class="hidden-scene" style="background-image: url(${t.image??""});">
          ${i.map(c=>`
            <div class="hidden-object" data-id="${c.id}"
                 style="left:${c.x}%; top:${c.y}%; width:${c.w}%; height:${c.h}%;"
                 title="${c.label}">
            </div>
          `).join("")}
        </div>
        <div class="hidden-counter">Найдено: <span>0</span> / ${i.length}</div>
      </div>
    `;const a=e.querySelector(".hidden-counter span");e.querySelectorAll(".hidden-object").forEach(c=>{c.addEventListener("click",()=>{c.classList.contains("found")||(c.classList.add("found"),n++,a.textContent=n,r.emit("audio:playSound",{name:"btn_click"}),n===i.length&&setTimeout(()=>s(),600))})})}}class U{render(e,t,s){const i=[3,1,4,0];let n=[!1,!1,!1,!1,!1],a=[],c=!1;const l=["#c41e3a","#2c5f8a","#2a2a2a","#c4a747","#2d6b3f"],h=["Красный","Синий","Чёрный","Жёлтый","Зелёный"];e.innerHTML=`
      <div class="puzzle-inner puzzle-wirecut">
        <h3 class="puzzle-title">${t.title||"Обезвредите устройство"}</h3>
        <p class="puzzle-desc">${t.description||"Перережьте провода в правильном порядке."}</p>
        
        <div class="wires-container">
          ${h.map((y,f)=>`
            <button class="wire-btn" data-index="${f}" data-name="${y}" 
                    style="background: ${l[f]};">
              <span class="wire-cut-mark hidden">/</span>
            </button>
          `).join("")}
        </div>
        
                
        <div class="wire-actions">
          <button class="btn-novel btn-puzzle-submit">Проверить</button>
        </div>
        
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;const d=document.createElement("style");d.textContent=`
      .wires-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 20px 0;
        padding: 10px;
      }
      
      .wire-btn {
        width: 100%;
        height: 28px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      
      .wire-btn:hover {
        filter: brightness(1.1);
        transform: scale(1.01);
      }
      
      .wire-btn:active {
        transform: scale(0.99);
      }
      
      .wire-btn.cut {
        opacity: 0.6;
        cursor: default;
        filter: grayscale(0.3);
      }
      
      .wire-btn.cut:hover {
        filter: grayscale(0.3);
        transform: none;
      }
      
      .wire-cut-mark {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 42px;
        font-weight: bold;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.3);
        text-shadow: 0 0 2px black;
        pointer-events: none;
      }
      
      .wire-cut-mark:not(.hidden) {
        display: flex;
      }
      
      .wire-cut-mark.hidden {
        display: none;
      }
    `,e.appendChild(d);const m=e.querySelectorAll(".wire-btn"),p=e.querySelector(".puzzle-feedback"),_=e.querySelector(".btn-puzzle-submit"),L=()=>{m.forEach((y,f)=>{const x=y.querySelector(".wire-cut-mark");n[f]?(y.classList.add("cut"),x.classList.remove("hidden")):(y.classList.remove("cut"),x.classList.add("hidden"))})},T=()=>{n=[!1,!1,!1,!1,!1],a=[],L(),p.classList.add("hidden")},C=()=>{if(c)return;let y=!0;if(a.length!==i.length)y=!1;else for(let f=0;f<i.length;f++)if(a[f]!==i[f]){y=!1;break}n[2]===!0&&(y=!1),y?(p.textContent="Правильно!",p.classList.remove("hidden","wrong"),p.classList.add("correct"),c=!0,m.forEach(f=>{f.disabled=!0}),setTimeout(()=>s(),800)):(p.textContent="Неправильный порядок!",p.classList.remove("hidden","correct"),p.classList.add("wrong"),e.querySelector(".puzzle-inner").classList.add("effect-shake"),setTimeout(()=>{var f;(f=e.querySelector(".puzzle-inner"))==null||f.classList.remove("effect-shake")},500),T())};m.forEach(y=>{y.addEventListener("click",()=>{if(c)return;const f=parseInt(y.dataset.index);n[f]||(n[f]=!0,a.push(f),L(),r.emit("audio:playSound",{name:"btn_click"}))})}),_.addEventListener("click",C),L()}}class W{constructor(){this._container=null,this._puzzleTypes={code:new O,cipher:new j,sequence:new G,slider:new D,matching:new X,hidden:new V,generator:new U}}init(){this._container=document.getElementById("puzzle-container"),r.on("puzzle:start",e=>this.startPuzzle(e.puzzleId))}startPuzzle(e){var n;const t=g.getRoom(u.currentRoom);if(!((n=t==null?void 0:t.puzzles)!=null&&n[e])){console.error(`[PuzzleManager] Загадка "${e}" не найдена`);return}const s=t.puzzles[e],i=this._puzzleTypes[s.type];if(!i){console.error(`[PuzzleManager] Тип загадки "${s.type}" не зарегистрирован`);return}this._container.classList.remove("hidden"),this._container.innerHTML="",i.render(this._container,s.config,()=>{this._container.classList.add("hidden"),this._container.innerHTML="",v.execute(s.onSolve),r.emit("puzzle:solved")})}registerPuzzleType(e,t){this._puzzleTypes[e]=t}}const Y=new W;class J{constructor(){this._historyPanel=null,this._historyList=null,this._inventoryPanel=null,this._inventoryList=null}init(){this._historyPanel=document.getElementById("history-panel"),this._historyList=document.getElementById("history-list"),this._inventoryPanel=document.getElementById("inventory-panel"),this._inventoryList=document.getElementById("inventory-list"),this._initTitleScreen(),this._initGameButtons(),this._initPanelCloseButtons(),this._initButtonSounds(),this._progressFill=document.getElementById("progress-fill"),this._toastContainer=document.getElementById("toast-container"),r.on("history:updated",()=>this._updateHistoryPanel()),r.on("inventory:updated",e=>{if(this._updateInventoryPanel(),e!=null&&e.itemId){const t=g.getItem(e.itemId);t&&this._showToast(`Получено: ${t.name}`,"item")}}),r.on("finalChoice:show",()=>this._showFinalChoice()),r.on("game:showCredits",()=>this._showCredits()),r.on("puzzle:solved",()=>this._showToast("Загадка решена!","puzzle")),r.on("scene:goToRoom",()=>this._updateProgress()),r.on("dialogue:showChoices",e=>this._showChoices(e))}_initTitleScreen(){const e=document.getElementById("screen-title");e.querySelector('[data-action="start"]').addEventListener("click",()=>{r.emit("game:start")}),e.querySelector('[data-action="about"]').addEventListener("click",()=>{document.getElementById("modal-about").classList.remove("hidden")}),e.querySelector('[data-action="settings"]').addEventListener("click",()=>{document.getElementById("modal-settings").classList.remove("hidden")}),document.querySelectorAll(".btn-close-modal").forEach(t=>{t.addEventListener("click",()=>{t.closest(".modal").classList.add("hidden")})}),this._initSettingsSliders()}_initSettingsSliders(){const e=document.getElementById("volume-music"),t=document.getElementById("volume-sfx"),s=document.getElementById("text-speed");e&&e.addEventListener("input",i=>{const n=parseInt(i.target.value);u.settings.musicVolume=n/100,i.target.nextElementSibling.textContent=`${n}%`,r.emit("settings:changed")}),t&&t.addEventListener("input",i=>{const n=parseInt(i.target.value);u.settings.sfxVolume=n/100,i.target.nextElementSibling.textContent=`${n}%`}),s&&s.addEventListener("input",i=>{const n=parseInt(i.target.value);u.settings.textSpeed=n,i.target.nextElementSibling.textContent=n})}_initGameButtons(){document.querySelectorAll("#ui-buttons .btn-ui").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.action;t==="history"?this._togglePanel(this._historyPanel):t==="inventory"&&this._togglePanel(this._inventoryPanel)})})}_initPanelCloseButtons(){document.querySelectorAll(".btn-close-panel").forEach(e=>{e.addEventListener("click",()=>{e.closest(".side-panel").classList.add("hidden")})})}_initButtonSounds(){document.body.addEventListener("mouseenter",e=>{e.target.matches("button, .btn-novel, .btn-ui, .hotspot-active")&&r.emit("audio:playSound",{name:"btn_hover"})},!0),document.body.addEventListener("click",e=>{e.target.matches("button, .btn-novel, .btn-ui")&&r.emit("audio:playSound",{name:"btn_click"})})}_togglePanel(e){e===this._historyPanel?this._inventoryPanel.classList.add("hidden"):this._historyPanel.classList.add("hidden"),e.classList.toggle("hidden")}_updateHistoryPanel(){const e=u.currentRoom?u.getHistoryForRoom(u.currentRoom):u.history;this._historyList.innerHTML="",e.forEach(t=>{const s=document.createElement("div");if(s.classList.add("history-entry"),t.name){const n=document.createElement("span");n.classList.add("history-name"),n.textContent=t.name,s.appendChild(n)}const i=document.createElement("span");i.classList.add("history-text"),i.textContent=t.text,s.appendChild(i),this._historyList.appendChild(s)}),this._historyList.scrollTop=this._historyList.scrollHeight}_updateInventoryPanel(){if(this._inventoryList.innerHTML="",u.inventory.length===0){const e=document.createElement("div");e.classList.add("inventory-empty"),e.textContent="Инвентарь пуст",this._inventoryList.appendChild(e);return}u.inventory.forEach(e=>{const t=g.getItem(e);if(!t)return;const s=document.createElement("div");s.classList.add("inventory-item");const i=document.createElement("div");i.classList.add("item-icon"),i.style.backgroundImage=`url(${t.icon})`,s.appendChild(i);const n=document.createElement("div");n.classList.add("item-info");const a=document.createElement("div");a.classList.add("item-name"),a.textContent=t.name,n.appendChild(a);const c=document.createElement("div");c.classList.add("item-desc"),c.textContent=t.description,n.appendChild(c),s.appendChild(n),this._inventoryList.appendChild(s)})}_showFinalChoice(){const e=g.getRoom(u.currentRoom);if(!(e!=null&&e.finalChoice))return;const t=document.querySelector(".dark-screen, .final-choice-darken, #dark-overlay, .overlay-dark");t&&t.classList.add("hidden");const s=document.getElementById("choices-container");s.classList.remove("hidden"),s.innerHTML="",s.classList.add("final-choice-container"),e.finalChoice.buttons.forEach(i=>{const n=document.createElement("button");n.classList.add("btn-novel","btn-choice"),n.textContent=i.text,i.type==="runaway"?(n.classList.add("btn-runaway"),n.addEventListener("mouseover",a=>{this._runawayButton(n,a)})):n.addEventListener("click",()=>{s.classList.add("hidden"),v.execute(i.onSelect)}),s.appendChild(n)})}_runawayButton(e,t){const i=e.parentElement.getBoundingClientRect(),n=e.getBoundingClientRect(),a=i.width-n.width-20,c=i.height-n.height-20,l=Math.random()*a,h=Math.random()*c;e.style.position="absolute",e.style.left=`${l}px`,e.style.top=`${h}px`,e.style.transition="left 0.2s, top 0.2s",r.emit("audio:playSound",{name:"btn_hover"})}_showCredits(){const e=document.getElementById("screen-game"),t=document.createElement("div");t.classList.add("credits-overlay"),t.innerHTML=`
      <div class="credits-content">
        <h2>Конец</h2>
        <p>Спасибо за время, проведённое с тобой</p>
        <p class="credits-small">Идея: Тайо</p>
        <p class="credits-small">Разработка: Тайо (Claude Code)</p>
        <p class="credits-small">Плохой дизайн: Тайо</p>
        <p class="credits-small">Музыка: скачено с интернетика по поиску "бесплатни"</p>
        <p class="credits-small">Сценарий: Тайо</p>
        <button class="btn-novel btn-credits-close">Скачать</button>
      </div>
    `;const s=new Audio("/its-just-a-dream/assets/sounds/gena.mp3");s.loop=!1,s.volume=.3,s.play().catch(i=>console.log("Ошибка воспроизведения:",i)),t.audioElement=s,t.querySelector(".btn-credits-close").addEventListener("click",()=>{s&&!s.paused&&(s.pause(),s.currentTime=0);const i="/its-just-a-dream/assets/items/heart.png",n=document.createElement("a");n.href=i,n.download="heart.png",document.body.appendChild(n),n.click(),document.body.removeChild(n)}),e.appendChild(t)}_showToast(e,t="info"){if(!this._toastContainer)return;const s=document.createElement("div");s.classList.add("toast",`toast-${t}`);const i={item:"Инвентарь",puzzle:"Загадка",info:"Информация"};s.innerHTML=`
      <div class="toast-title">${i[t]??""}</div>
      <div>${e}</div>
    `,this._toastContainer.appendChild(s),setTimeout(()=>s.remove(),3200)}_updateProgress(){if(!this._progressFill||!g.data)return;const e=Object.keys(g.data.rooms).length,t=new Set(u.history.map(i=>i.roomId)),s=Math.round(t.size/e*100);this._progressFill.style.width=`${s}%`}_showChoices(e){const t=document.getElementById("choices-container");t.classList.remove("hidden"),t.innerHTML="",e.choices.forEach(s=>{const i=document.createElement("button");i.classList.add("choice-option"),i.textContent=s.text,i.addEventListener("click",()=>{t.classList.add("hidden"),t.innerHTML="",r.emit("audio:playSound",{name:"btn_click"}),s.onSelect&&v.execute(s.onSelect)}),t.appendChild(i)})}}const K=new J,Q="/assets/music/background_theme.mp3";async function w(){try{await g.load("/its-just-a-dream/data/scenario.json"),console.log("[Novel] Сценарий загружен"),await ne(g.data),S.init(),k.init(),H.init(),N.init(),Y.init(),K.init(),ie(),console.log("[Novel] Все модули инициализированы"),ae(),r.on("game:start",()=>te()),document.getElementById("screen-title").classList.add("active"),se(),Z(),re(),ce(),le(),de()}catch(o){console.error("[Novel] Ошибка инициализации:",o),document.body.innerHTML=`
      <div style="
        display: flex; align-items: center; justify-content: center;
        height: 100vh; color: #e74c5c; font-family: sans-serif;
        text-align: center; padding: 20px;
      ">
        <div>
          <h2>Ошибка загрузки</h2>
          <p style="color: #888; margin-top: 10px;">${o.message}</p>
        </div>
      </div>
    `}}function Z(){let o=document.getElementById("title-bg-music");o||(o=document.createElement("audio"),o.id="title-bg-music",o.loop=!0,o.volume=.1,o.src=Q,document.body.appendChild(o)),o.load();const e=o.play();e!==void 0&&e.catch(t=>{console.warn("[Audio] Не удалось автоматически запустить музыку:",t),console.warn("[Audio] Возможно, требуется взаимодействие с пользователем");const s=document.querySelector("#screen-title .start-button");if(s){const i=()=>{o.play().catch(n=>console.warn("[Audio] Всё ещё не удалось:",n)),s.removeEventListener("click",i)};s.addEventListener("click",i)}})}function ee(){const o=document.getElementById("title-bg-music");if(o&&!o.paused){const e=setInterval(()=>{o.volume>.05?o.volume-=.05:(o.pause(),o.volume=.5,clearInterval(e))},50)}}function te(){u.reset(),ee();const o=document.getElementById("screen-title");document.getElementById("screen-game"),o.style.transition="opacity 0.8s ease",o.style.opacity="0",setTimeout(()=>{o.classList.remove("active"),o.style.opacity="",o.style.transition="";const e=g.startRoom;e&&S.loadRoom(e),oe()},800)}function se(){const o=document.getElementById("title-particles");if(!o)return;const e=30;for(let t=0;t<e;t++){const s=document.createElement("div");s.classList.add("title-particle");const i=Math.random()*100,n=1+Math.random()*2.5,a=6+Math.random()*10,c=Math.random()*a,l=60+Math.random()*40;s.style.cssText=`
      left: ${i}%;
      bottom: -${l}%;
      width: ${n}px;
      height: ${n}px;
      animation-duration: ${a}s;
      animation-delay: ${c}s;
      opacity: 0;
    `,o.appendChild(s)}}function ie(){const o=document.getElementById("video-container"),e=document.getElementById("cutscene-video");r.on("video:play",({src:t})=>{e.src=t,o.classList.remove("hidden"),e.play().catch(()=>{}),e.onended=()=>{o.classList.add("hidden"),e.src="",r.emit("video:ended")},o.onclick=()=>{e.pause(),o.classList.add("hidden"),e.src="",r.emit("video:ended"),o.onclick=null}})}async function ne(o){const e=document.getElementById("loading-fill"),t=[];if(o.rooms)for(const i of Object.values(o.rooms))i.background&&t.push(i.background);if(o.characters){for(const i of Object.values(o.characters))if(i.sprites)for(const n of Object.values(i.sprites))t.push(n)}if(o.items)for(const i of Object.values(o.items))i.icon&&t.push(i.icon);if(t.length===0){e&&(e.style.width="100%");return}let s=0;await Promise.all(t.map(i=>new Promise(n=>{const a=new Image;a.onload=a.onerror=()=>{s++,e&&(e.style.width=`${Math.round(s/t.length*100)}%`),n()},a.src=i}))),console.log(`[Novel] Предзагружено ${s} ассетов`)}function ae(){const o=document.getElementById("loading-screen");o&&(o.style.transition="opacity 0.6s ease",o.style.opacity="0",setTimeout(()=>{o.remove()},600))}function oe(){const o=document.documentElement,e=o.requestFullscreen||o.webkitRequestFullscreen||o.mozRequestFullScreen||o.msRequestFullscreen;e&&e.call(o).catch(()=>{})}function re(){document.addEventListener("keydown",o=>{if(o.target.tagName==="INPUT"||o.target.tagName==="TEXTAREA")return;const e=document.getElementById("screen-game").classList.contains("active");o.key==="Escape"&&(document.querySelectorAll(".side-panel:not(.hidden)").forEach(t=>t.classList.add("hidden")),document.querySelectorAll(".modal:not(.hidden)").forEach(t=>t.classList.add("hidden"))),e&&((o.key==="h"||o.key==="H"||o.key==="р"||o.key==="Р")&&(document.getElementById("history-panel").classList.toggle("hidden"),document.getElementById("inventory-panel").classList.add("hidden")),(o.key==="i"||o.key==="I"||o.key==="ш"||o.key==="Ш")&&(document.getElementById("inventory-panel").classList.toggle("hidden"),document.getElementById("history-panel").classList.add("hidden")))})}function ce(){const o=document.getElementById("cursor-trail");if(!o)return;let e=!1,t=0;r.on("character:show",s=>{s.character==="glitch"&&(e=!0)}),r.on("character:hide",s=>{s.character==="glitch"&&(e=!1)}),r.on("scene:goToRoom",()=>{e=!1}),document.addEventListener("mousemove",s=>{if(t++,t%3!==0)return;const i=document.createElement("div");i.classList.add("trail-dot"),e&&i.classList.add("trail-dot-glitch"),i.style.left=`${s.clientX-2}px`,i.style.top=`${s.clientY-2}px`,o.appendChild(i),setTimeout(()=>i.remove(),e?400:600)})}function le(){const o=document.getElementById("idle-hint"),e=o==null?void 0:o.querySelector(".idle-hint-text");if(!o||!e)return;let t=null,s=!1;const i=()=>{var l;const a=g.getRoom(u.currentRoom);if(!a)return null;if(a.idleHint)return a.idleHint;if(((l=a.hotspots)==null?void 0:l.length)>0&&document.querySelector(".hotspot-active")){const h=a.hotspots.find(d=>d.hint);return h?h.hint:"Осмотрите комнату — нажмите на светящуюся область"}const c=document.getElementById("puzzle-container");return c&&!c.classList.contains("hidden")?"Попробуйте подсказку внизу загадки":null},n=()=>{clearTimeout(t),s&&(o.classList.add("hidden"),s=!1),t=setTimeout(()=>{const a=i();a&&(e.textContent=a,o.classList.remove("hidden"),s=!0)},3e4)};document.addEventListener("click",n),document.addEventListener("keydown",n),document.addEventListener("mousemove",()=>{s||(clearTimeout(t),t=setTimeout(()=>{const a=i();a&&(e.textContent=a,o.classList.remove("hidden"),s=!0)},3e4))}),r.on("scene:goToRoom",n)}function de(){const o=document.getElementById("scene-bg");o&&(r.on("scene:goToRoom",()=>{o.classList.remove("ambient-breathing","ambient-breathing-fast"),o.classList.add("ambient-breathing")}),r.on("character:show",e=>{e.character==="glitch"&&(o.classList.remove("ambient-breathing"),o.classList.add("ambient-breathing-fast"))}),r.on("character:hide",e=>{e.character==="glitch"&&(o.classList.remove("ambient-breathing-fast"),o.classList.add("ambient-breathing"))}))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",w):w();
