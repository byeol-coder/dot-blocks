/* DOT BLOCKS Blind-first P0 runtime upgrade */
(function upgradeDotBlocksSource(){
  'use strict';
  var VERSION='p0-20260727-1';
  var root=document.documentElement;
  if(!root||root.getAttribute('data-blind-first-p0')===VERSION)return;
  if(!/(^|\/)dot-blocks\/?$/i.test(location.pathname)&&!/dot-blocks\/index\.html$/i.test(location.pathname))return;
  if(location.protocol==='file:')return;

  function countText(source,needle){return source.split(needle).length-1}
  function replaceText(source,needle,replacement,label){
    var count=countText(source,needle);
    if(count!==1)throw new Error(label+': expected 1 match, got '+count);
    return source.replace(needle,replacement)
  }
  function replaceRegex(source,re,replacement,label){
    var flags=re.flags.indexOf('g')>-1?re.flags:re.flags+'g';
    var matches=source.match(new RegExp(re.source,flags));
    var count=matches?matches.length:0;
    if(count!==1)throw new Error(label+': expected 1 match, got '+count);
    return source.replace(re,replacement)
  }
  function patchHtml(html){
    var s=html;
    s=replaceText(s,'<html lang="ko">','<html lang="ko" data-blind-first-p0="'+VERSION+'">','html marker');

    s=replaceText(s,
      '<button class="toggle" id="speechToggle" type="button" aria-pressed="true"><span id="speechLabel">음성 안내</span><span id="speechState">켜짐</span></button>',
      '<button class="toggle" id="speechToggle" type="button" aria-pressed="true"><span id="speechLabel">음성 안내</span><span id="speechState">켜짐</span></button>\n      <div class="speed-row"><label for="speechModeSelect" id="speechModeLabel">음성 안내 방식</label><select id="speechModeSelect"><option value="superdot">슈퍼닷 TTS</option><option value="screenreader">스크린리더만</option><option value="both">둘 다</option></select></div>',
      'speech source UI');
    s=replaceRegex(s,/<select id="speedSelect">[\s\S]*?<\/select>/,
      '<select id="speedSelect"><option value="tactile">촉각 저속</option><option value="turn">촉각 턴제</option><option value="relaxed">여유</option><option value="standard">표준</option><option value="challenge">도전</option></select>',
      'speed UI');

    s=replaceText(s,
      "const speechToggle=$('speechToggle'),sfxToggle=$('sfxToggle'),musicToggle=$('musicToggle'),assistToggle=$('assistToggle'),speedSelect=$('speedSelect'),musicStyleSelect=$('musicStyleSelect');",
      "const speechToggle=$('speechToggle'),sfxToggle=$('sfxToggle'),musicToggle=$('musicToggle'),assistToggle=$('assistToggle'),speedSelect=$('speedSelect'),musicStyleSelect=$('musicStyleSelect'),speechModeSelect=$('speechModeSelect');",
      'settings refs');
    s=replaceRegex(s,/let settings=\{speech:true,sfx:true,music:true,assist:true,speed:'[^']+',musicStyle:'procedural'\};/,
      "let settings={speech:true,speechMode:'superdot',sfx:true,music:true,assist:true,speed:'tactile',musicStyle:'procedural'};",
      'settings defaults');
    s=replaceRegex(s,/settings\.speed=\[[^\]]+\]\.includes\(settings\.speed\)\?settings\.speed:'relaxed';/,
      "settings.speed=['tactile','turn','relaxed','standard','challenge'].includes(settings.speed)?settings.speed:'tactile';",
      'speed validation');
    s=replaceText(s,
      "settings.musicStyle=['procedural','retro'].includes(settings.musicStyle)?settings.musicStyle:'procedural';",
      "settings.musicStyle=['procedural','retro'].includes(settings.musicStyle)?settings.musicStyle:'procedural';\n  settings.speechMode=['superdot','screenreader','both'].includes(settings.speechMode)?settings.speechMode:'superdot';",
      'speech source validation');
    s=replaceText(s,
      'let dropTimer=0,dropLast=0,gravityAccumulator=0,groundedAt=0,lastDanger=0;',
      "let dropTimer=0,dropLast=0,gravityAccumulator=0,groundedAt=0,lastDanger=0;\n  let padMenu='intro',padSettingIndex=0,confirmAction='',confirmUntil=0;\n  const PAD_SETTING_KEYS=['speech','speechMode','sfx','music','assist','speed','musicStyle'];",
      'DotPad menu state');

    s=replaceRegex(s,
      /  function stopSpeech\(\)\{[\s\S]*?  function announce\(text,\{phase='play',tts=true,critical=false\}=\{\}\)\{[^\n]+\}\n/,
`  function screenReaderSpeech(){return settings.speech&&(settings.speechMode==='screenreader'||settings.speechMode==='both')}
  function syntheticSpeech(){return settings.speech&&(settings.speechMode==='superdot'||settings.speechMode==='both')}
  function syncSpeechModeAria(){
    status.setAttribute('aria-live',screenReaderSpeech()?'polite':'off');
    criticalLive.setAttribute('aria-live',screenReaderSpeech()?'assertive':'off');
    criticalLive.setAttribute('role',screenReaderSpeech()?'alert':'status');
    if(window.SUPERDOT_TTS){SUPERDOT_TTS.setLang&&SUPERDOT_TTS.setLang(LANG);SUPERDOT_TTS.setEnabled&&SUPERDOT_TTS.setEnabled(syntheticSpeech())}
  }
  function stopSpeech(){if(window.SUPERDOT_TTS&&SUPERDOT_TTS.stop)SUPERDOT_TTS.stop();try{speechSynthesis.cancel()}catch(e){}}
  function speak(text,critical=false){
    if(!text)return;
    if(critical&&screenReaderSpeech()){criticalLive.textContent='';requestAnimationFrame(()=>criticalLive.textContent=text)}
    if(!syntheticSpeech())return;
    audio.duck(Math.min(5200,900+text.length*55));
    if(window.SUPERDOT_TTS){SUPERDOT_TTS.setLang&&SUPERDOT_TTS.setLang(LANG);SUPERDOT_TTS.speak(text);return}
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=LANG==='en'?'en-US':'ko-KR';u.rate=.95;speechSynthesis.speak(u)}catch(e){}
  }
  function announce(text,{phase='play',tts=true,critical=false}={}){statusText.textContent=text;status.dataset.phase=phase;if(tts)speak(text,critical);else if(critical&&screenReaderSpeech()){criticalLive.textContent='';requestAnimationFrame(()=>criticalLive.textContent=text)}}
`, 'speech routing');

    s=replaceRegex(s,
      /  function speedBase\(\)\{[^\n]+\}\n  function gravityInterval\(\)\{[^\n]+\}\n  function lockDelay\(\)\{[^\n]+\}\n/,
`  function speedBase(){if(settings.speed==='tactile')return 3000;if(settings.speed==='turn')return Infinity;return settings.speed==='challenge'?640:settings.speed==='standard'?820:1050}
  function gravityInterval(){if(settings.speed==='turn')return Infinity;if(settings.speed==='tactile')return Math.max(1800,3000-(level-1)*85);const base=speedBase(),step=settings.speed==='challenge'?65:settings.speed==='standard'?58:42;return Math.max(settings.speed==='relaxed'?260:110,base-(level-1)*step)}
  function lockDelay(){if(settings.speed==='turn')return Infinity;if(settings.speed==='tactile')return 2600;if(!settings.assist)return 260;return settings.speed==='challenge'?520:settings.speed==='standard'?700:950}
`, 'drop timing');
    s=replaceRegex(s,
      /  function dropLoop\(now\)\{[\s\S]*?\n  \}\n  function ghostY/,
`  function dropLoop(now){
    if(mode!=='drop'||!running||over)return;
    if(!paused&&!scanMode&&!isAnimating){
      const dt=Math.min(120,now-dropLast);
      if(settings.speed!=='turn'){
        gravityAccumulator+=dt;
        if(gravityAccumulator>=gravityInterval()){gravityAccumulator=0;moveDrop(0,1,{auto:true})}
        if(active&&collides(active,0,1,active.cells)){if(!groundedAt)groundedAt=now;if(now-groundedAt>=lockDelay())lockDrop()}else groundedAt=0
      }
    }
    dropLast=now;dropTimer=requestAnimationFrame(dropLoop)
  }
  function ghostY`, 'turn-based loop');
    s=replaceText(s,
      "if(dy>0&&!groundedAt){groundedAt=performance.now();audio.earcon('ground',{pan:panForColumn(active.x,DROP_W),row:Math.max(0,active.y)})}",
      "if(dy>0&&!groundedAt){groundedAt=performance.now();audio.earcon('ground',{pan:panForColumn(active.x,DROP_W),row:Math.max(0,active.y)});if(settings.speed==='turn'&&!auto)speak(S('바닥입니다. F2와 F3을 두 번 눌러 블록을 확정하세요.','On the floor. Press F2 and F3 twice to confirm the piece.'))}",
      'turn-based floor cue');

    s=replaceRegex(s,
      /  function fillTactileCell\(g,x,y,cw,ch,kind\)\{[\s\S]*?\n  \}\n  function buildPortraitFrame/,
`  function fillTactileCell(g,x,y,cw,ch,kind){
    const ox=x*cw,oy=y*ch;
    if(kind==='solid'){
      for(let yy=0;yy<ch-1;yy++)for(let xx=0;xx<cw-1;xx++)setPin(g,ox+xx,oy+yy)
    }else if(kind==='active'){
      for(let xx=0;xx<cw;xx++){setPin(g,ox+xx,oy);setPin(g,ox+xx,oy+ch-1)}
      for(let yy=1;yy<ch-1;yy++){setPin(g,ox,oy+yy);setPin(g,ox+cw-1,oy+yy)}
    }else if(kind==='ghost'){
      const cy=oy+Math.floor((ch-1)/2);setPin(g,ox+Math.max(1,Math.floor(cw/2)-1),cy);setPin(g,ox+Math.min(cw-2,Math.floor(cw/2)),cy)
    }else if(kind==='invalid'){
      const n=Math.min(cw,ch);for(let i=0;i<n;i++){setPin(g,ox+i,oy+i);setPin(g,ox+cw-1-i,oy+i)}
    }else if(kind==='surface'){
      for(let xx=0;xx<cw;xx++)setPin(g,ox+xx,oy)
    }else if(kind==='flash'){
      for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++)setPin(g,ox+xx,oy+yy)
    }
  }
  function buildPortraitFrame`, 'tactile grammar');
    s=replaceText(s,
      "function buildPortraitFrame(){const g=blankPortrait();if(mode==='drop'){",
      "function buildPortraitFrame(){const g=blankPortrait();if(mode==='drop'){if(flashRows.length){for(const y of flashRows)for(let x=0;x<DROP_W;x++)fillTactileCell(g,x,y,4,3,'flash');return g}",
      'tactile line flash');

    var helpers=`  function clearConfirm(){confirmAction='';confirmUntil=0}
  function confirmActionTwice(name,prompt,action){
    const now=performance.now();
    if(confirmAction===name&&now<confirmUntil){clearConfirm();action();return true}
    confirmAction=name;confirmUntil=now+1800;audio.earcon('blocked');speak(prompt);return false
  }
  function confirmedHardDrop(){return confirmActionTwice('hardDrop',S('즉시 낙하 확인. 1.8초 안에 같은 키를 한 번 더 누르세요.','Hard drop confirmation. Press the same key again within 1.8 seconds.'),hardDrop)}
  function confirmedRestart(){return confirmActionTwice('restart',S('다시 시작 확인. 1.8초 안에 F1을 한 번 더 누르세요.','Restart confirmation. Press F1 again within 1.8 seconds.'),newGame)}
  function padSettingName(key){return {speech:S('음성 안내','speech guidance'),speechMode:S('음성 안내 방식','speech source'),sfx:S('방향 효과음','directional effects'),music:S('배경음악','music'),assist:S('잠금 유예','lock delay'),speed:S('낙하 방식','drop style'),musicStyle:S('음악 스타일','music style')}[key]}
  function padSettingValue(key){if(key==='speechMode')return {superdot:S('슈퍼닷 TTS','SuperDot TTS'),screenreader:S('스크린리더만','screen reader only'),both:S('둘 다','both')}[settings.speechMode];if(key==='speed')return {tactile:S('촉각 저속','tactile slow'),turn:S('촉각 턴제','tactile turn based'),relaxed:S('여유','relaxed'),standard:S('표준','standard'),challenge:S('도전','challenge')}[settings.speed];if(key==='musicStyle')return settings.musicStyle==='retro'?S('레트로','retro'):S('앰비언트','ambient');return settings[key]?S('켜짐','on'):S('꺼짐','off')}
  function announcePadSetting(){const key=PAD_SETTING_KEYS[padSettingIndex];speak((padSettingIndex+1)+'/'+PAD_SETTING_KEYS.length+'. '+padSettingName(key)+', '+padSettingValue(key)+'. '+S('F1 이전, F2 다음, F3 변경, F4 닫기.','F1 previous, F2 next, F3 change, F4 close.'))}
  function syncSettingUI(){
    setToggle(speechToggle,'speechState',settings.speech);setToggle(sfxToggle,'sfxState',settings.sfx);setToggle(musicToggle,'musicState',settings.music);setToggle(assistToggle,'assistState',settings.assist);
    speechModeSelect.value=settings.speechMode;speedSelect.value=settings.speed;musicStyleSelect.value=settings.musicStyle;syncSpeechModeAria();saveSettings()
  }
  function enterPadSettings(){padMenu='settings';padSettingIndex=0;clearConfirm();announcePadSetting()}
  function changePadSetting(){const key=PAD_SETTING_KEYS[padSettingIndex];if(key==='speechMode'){const a=['superdot','screenreader','both'];settings.speechMode=a[(a.indexOf(settings.speechMode)+1)%a.length]}else if(key==='speed'){const a=['tactile','turn','relaxed','standard','challenge'];settings.speed=a[(a.indexOf(settings.speed)+1)%a.length]}else if(key==='musicStyle'){settings.musicStyle=settings.musicStyle==='procedural'?'retro':'procedural';audio.setMusicStyle(settings.musicStyle)}else{settings[key]=!settings[key];if(key==='sfx')audio.setSfxEnabled(settings.sfx);if(key==='music')audio.setMusicEnabled(settings.music)}syncSettingUI();announcePadSetting()}
  function handlePadSettingsKey(keyCode){if(keyCode===KeyCodes.KeyFunction1){padSettingIndex=(padSettingIndex+PAD_SETTING_KEYS.length-1)%PAD_SETTING_KEYS.length;announcePadSetting()}else if(keyCode===KeyCodes.KeyFunction2){padSettingIndex=(padSettingIndex+1)%PAD_SETTING_KEYS.length;announcePadSetting()}else if(keyCode===KeyCodes.KeyFunction3){changePadSetting()}else if(keyCode===KeyCodes.KeyFunction4){padMenu=introScreen.hidden?null:'intro';speak(S('설정을 닫았습니다.','Settings closed.'))}}

`;
    s=replaceText(s,'  // ---------- DOTPAD ----------\n',helpers+'  // ---------- DOTPAD ----------\n','DotPad helpers');
    s=replaceRegex(s,
      /  function handleDotPadKey\(keyCode\)\{[\s\S]*?\n  \}\n  async function loadSDK/,
`  function handleDotPadKey(keyCode){
    if(!KeyCodes)return;document.body.classList.add('kbd');ensureAudio();
    if(padMenu==='settings'){handlePadSettingsKey(keyCode);return}
    if(!introScreen.hidden){
      if(keyCode===KeyCodes.KeyFunction1){setMode('drop',false);showPlay();newGame()}
      else if(keyCode===KeyCodes.KeyFunction2){setMode('puzzle',false);showPlay();newGame()}
      else if(keyCode===KeyCodes.KeyFunction3){tutorial()}
      else if(keyCode===KeyCodes.KeyFunction4){enterPadSettings()}
      return
    }
    if(over){
      if(keyCode===KeyCodes.KeyFunction1||keyCode===KeyCodes.LPF1)confirmedRestart();
      else if(keyCode===KeyCodes.KeyFunction2){showIntro();speak(S('모드 선택. F1 낙하, F2 퍼즐, F3 도움말, F4 설정.','Mode selection. F1 drop, F2 puzzle, F3 help, F4 settings.'))}
      else if(keyCode===KeyCodes.KeyFunction4)enterPadSettings();
      return
    }
    if(KeyCodes.LPF4!==undefined&&keyCode===KeyCodes.LPF4){enterPadSettings();return}
    if(mode==='drop'){
      if(keyCode===KeyCodes.KeyFunction1)moveDrop(-1,0);else if(keyCode===KeyCodes.KeyFunction2)moveDrop(1,0);else if(keyCode===KeyCodes.KeyFunction3)rotateDrop();else if(keyCode===KeyCodes.KeyFunction4)moveDrop(0,1);else if(keyCode===KeyCodes.KeyFunction12)holdDrop();else if(keyCode===KeyCodes.KeyFunction23||keyCode===KeyCodes.PanningRight)confirmedHardDrop();else if(keyCode===KeyCodes.PanningLeft)readDropStatus(false);else if(keyCode===KeyCodes.PanningAll)toggleScan();else if(keyCode===KeyCodes.RPF4)togglePause();else if(keyCode===KeyCodes.LPF1)confirmedRestart();else if(keyCode===KeyCodes.KeyFunction34)readDropStatus(true);else if(keyCode===KeyCodes.KeyFunction24)readNextHold()
    }else{
      if(keyCode===KeyCodes.KeyFunction1)movePuzzle(-1,0);else if(keyCode===KeyCodes.KeyFunction2)movePuzzle(1,0);else if(keyCode===KeyCodes.KeyFunction3)movePuzzle(0,-1);else if(keyCode===KeyCodes.KeyFunction4)movePuzzle(0,1);else if(keyCode===KeyCodes.PanningLeft)rotatePuzzle();else if(keyCode===KeyCodes.PanningRight)cyclePuzzle();else if(keyCode===KeyCodes.PanningAll||keyCode===KeyCodes.KeyFunction23)placePuzzle();else if(keyCode===KeyCodes.KeyFunction12)readPuzzleStatus(true);else if(keyCode===KeyCodes.RPF4)readPuzzleStatus(false);else if(keyCode===KeyCodes.LPF1)confirmedRestart()
    }
  }
  async function loadSDK`, 'DotPad navigation');
    s=replaceRegex(s,/  function setDpUI\(on\)\{[^\n]+\}\n/,
`  function setDpUI(on){dpBtn.dataset.on=on?'1':'0';$('dpLabel').textContent=on?S('닷패드 연결됨','DotPad connected'):S('닷패드 연결','Connect DotPad');$('introDpLabel').textContent=on?S('닷패드 연결됨','DotPad connected'):S('닷패드 먼저 연결','Connect DotPad first');if(on){padMenu=introScreen.hidden?null:'intro';speak(S('닷패드가 연결됐어요. 기기를 세로로 세우세요. 인트로에서는 F1 낙하 모드, F2 블록 퍼즐, F3 도움말, F4 설정입니다.','DotPad connected. Stand it vertically. On the intro screen, F1 is Drop Mode, F2 Block Puzzle, F3 Help, and F4 Settings.'))}}
`, 'DotPad connection guidance');

    s=replaceText(s,'function showIntro(){','function showIntro(){padMenu=\'intro\';clearConfirm();','intro menu state');
    s=replaceText(s,'function showPlay(){','function showPlay(){padMenu=null;clearConfirm();','play menu state');

    s=replaceText(s,"if(k==='n'||k==='N'){newGame();ev.preventDefault();return}","if(k==='n'||k==='N'){confirmedRestart();ev.preventDefault();return}",'keyboard restart');
    s=replaceText(s,"if(k==='Enter'&&over){newGame();ev.preventDefault();return}","if(k==='Enter'&&over){confirmedRestart();ev.preventDefault();return}",'keyboard result restart');
    s=replaceText(s,"else if(k===' ')hardDrop();","else if(k===' ')confirmedHardDrop();",'keyboard hard drop');
    s=replaceText(s,'else if(dy>55)hardDrop();','else if(dy>55)confirmedHardDrop();','touch hard drop');

    s=replaceRegex(s,/  speechToggle\.addEventListener\('click',[^\n]+\n/,
      "  speechToggle.addEventListener('click',()=>{settings.speech=!settings.speech;syncSettingUI();if(settings.speech)speak(S('음성 안내를 켰어요.','Speech guidance on.'));else stopSpeech()});\n",
      'speech toggle event');
    s=replaceText(s,'  musicStyleSelect.value=settings.musicStyle;',
      "  speechModeSelect.value=settings.speechMode;speechModeSelect.addEventListener('change',()=>{settings.speechMode=speechModeSelect.value;syncSettingUI();speak(S('음성 안내 방식을 변경했습니다.','Speech source changed.'))});\n  musicStyleSelect.value=settings.musicStyle;",
      'speech source event');
    s=replaceRegex(s,/  speedSelect\.value=settings\.speed;speedSelect\.addEventListener\('change',[^\n]+\n/,
      "  speedSelect.value=settings.speed;speedSelect.addEventListener('change',()=>{settings.speed=speedSelect.value;saveSettings();speak(S('낙하 방식을 '+speedSelect.options[speedSelect.selectedIndex].text+'로 설정했습니다.','Drop style changed.'))});\n",
      'speed event');
    s=replaceText(s,
      "  setToggle(speechToggle,'speechState',settings.speech);setToggle(sfxToggle,'sfxState',settings.sfx);setToggle(musicToggle,'musicState',settings.music);setToggle(assistToggle,'assistState',settings.assist);",
      "  setToggle(speechToggle,'speechState',settings.speech);setToggle(sfxToggle,'sfxState',settings.sfx);setToggle(musicToggle,'musicState',settings.music);setToggle(assistToggle,'assistState',settings.assist);syncSpeechModeAria();",
      'initial speech mode sync');

    s=replaceText(s,"$('speechLabel').textContent='Speech guidance';",
      "$('speechLabel').textContent='Speech guidance';$('speechModeLabel').textContent='Speech source';speechModeSelect.options[0].text='SuperDot TTS';speechModeSelect.options[1].text='Screen reader only';speechModeSelect.options[2].text='Both';",
      'English speech source');
    s=replaceText(s,"speedSelect.options[0].text='Relaxed';speedSelect.options[1].text='Standard';speedSelect.options[2].text='Challenge';",
      "speedSelect.options[0].text='Tactile slow';speedSelect.options[1].text='Tactile turn-based';speedSelect.options[2].text='Relaxed';speedSelect.options[3].text='Standard';speedSelect.options[4].text='Challenge';",
      'English speed options');

    s=s.replace(/촘촘한 면: 고정 블록/g,'작은 촘촘한 면: 고정 블록')
       .replace(/테두리: 움직이는 블록/g,'큰 빈 테두리: 움직이는 블록')
       .replace(/촘촘=고정 · 테두리=현재 · 두 점=착지/g,'작은 면=고정 · 큰 테두리=현재 · 두 점=착지')
       .replace(/Dense: settled block/g,'Compact dense tile: settled block')
       .replace(/Outline: moving piece/g,'Large hollow outline: moving piece')
       .replace(/Dense=settled · outline=current · two dots=landing/g,'compact=settled · hollow=current · two dots=landing')
       .replace(/F2\+F3 내려놓기/g,'F2+F3 두 번 내려놓기')
       .replace(/오른쪽 패닝 내려놓기/g,'오른쪽 패닝 두 번 내려놓기')
       .replace(/F2\+F3 drop & place/g,'F2+F3 twice to drop')
       .replace(/right pan drop & place/g,'right pan twice to drop')
       .replace(/<span class="key">Space<\/span> 바로 내리기/g,'<span class="key">Space×2</span> 바로 내리기')
       .replace(/<span class="key">Space<\/span> hard drop/g,'<span class="key">Space×2</span> hard drop');

    var required=["data-blind-first-p0=\""+VERSION+"\"","speechMode:'superdot'","value=\"turn\"","confirmedHardDrop","enterPadSettings","kind==='flash'","Tactile turn-based"];
    for(var i=0;i<required.length;i++)if(s.indexOf(required[i])<0)throw new Error('post-patch marker missing: '+required[i]);
    if((s.match(/function handleDotPadKey/g)||[]).length!==1||(s.match(/function fillTactileCell/g)||[]).length!==1)throw new Error('duplicate core function after patch');
    return s
  }

  window.__DOTBLOCKS_PATCH_HTML=patchHtml;
  try{
    var xhr=new XMLHttpRequest();
    xhr.open('GET',location.href.split('#')[0],false);
    xhr.setRequestHeader('Cache-Control','no-cache');
    xhr.send(null);
    if(xhr.status<200||xhr.status>=300)return;
    var upgraded=patchHtml(xhr.responseText);
    document.open();document.write(upgraded);document.close();
  }catch(error){console.error('[DOT BLOCKS] Blind-first upgrade skipped:',error)}
})();
