/* SUPERDOT TTS — Dot Games shared Korean/English speech module */
(function(){
  'use strict';
  if(window.TW_TTS){window.SUPERDOT_TTS=window.TW_TTS;return}

  function selfBase(){
    try{
      var s=document.currentScript;
      if(!s){var list=document.getElementsByTagName('script');for(var i=list.length-1;i>=0;i--){if(list[i].src&&/(^|\/)superdot-tts-core\.js(\?|$)/.test(list[i].src)){s=list[i];break}}}
      if(s&&s.src){var u=new URL(s.src,window.location.href);if(u.origin&&u.origin!==window.location.origin)return u.origin}
    }catch(e){}
    return ''
  }
  var githubPages=/(^|\.)github\.io$/i.test(location.hostname);
  var CFG={endpoint:selfBase()+'/api/tts',maxLen:190,rate:1.05,pitch:1,serverFirst:!githubPages,allowSpeechFallback:true,retry:!githubPages};
  var enabled=true,lang='ko',koVoice=null,enVoice=null,current=null,token=0;
  function inFrame(){try{return window.self!==window.top}catch(e){return true}}
  function hasSpeech(){return !!(window.speechSynthesis&&window.SpeechSynthesisUtterance)}
  function voices(){return hasSpeech()?(window.speechSynthesis.getVoices()||[]):[]}
  function novelty(v,list){return list.some(function(x){return v.name&&v.name.indexOf(x)>-1})}
  var KO_NOV=['Eddy','Flo','Grandma','Grandpa','Reed','Rocko','Sandy','Shelley','Bubbles','Jester','Superstar','Trinoids','Bells','Boing','Bahh','Wobble','Cellos','Organ','Zarvox','Whisper','Albert','Bad News','Good News','Junior','Kathy','Ralph'];
  var EN_NOV=['Novelty','Bad News','Good News','Bubbles','Jester','Trinoids','Whisper','Zarvox','Albert','Wobble','Bahh','Boing','Bells','Cellos','Deranged','Hysterical','Organ','Superstar'];
  function pickKo(){var vs=voices();if(!vs.length)return;var isKo=function(v){return v.lang&&v.lang.toLowerCase().indexOf('ko')===0};koVoice=vs.find(function(v){return isKo(v)&&['Yuna','유나','Heami','SunHi'].some(function(n){return v.name&&v.name.indexOf(n)>-1})})||vs.find(function(v){return isKo(v)&&v.localService&&!novelty(v,KO_NOV)})||vs.find(function(v){return isKo(v)&&!novelty(v,KO_NOV)})||vs.find(isKo)||koVoice}
  function pickEn(){var vs=voices();if(!vs.length)return;var isEn=function(v){return v.lang&&v.lang.toLowerCase().indexOf('en')===0};enVoice=vs.find(function(v){return isEn(v)&&['Samantha','Google US English','Microsoft Aria','Microsoft Jenny','Aria','Jenny'].some(function(n){return v.name&&v.name.indexOf(n)>-1})})||vs.find(function(v){return isEn(v)&&v.localService&&!novelty(v,EN_NOV)})||vs.find(function(v){return isEn(v)&&!novelty(v,EN_NOV)})||vs.find(isEn)||enVoice}
  if(hasSpeech()){try{pickKo();pickEn();window.speechSynthesis.onvoiceschanged=function(){pickKo();pickEn()}}catch(e){}}
  function split(text,max){if(text.length<=max)return[text];var out=[],rest=text,seps=['. ','! ','? ','\n',', ',' '];while(rest.length>max){var cut=max;for(var i=0;i<seps.length;i++){var idx=rest.lastIndexOf(seps[i],max);if(idx>max*.4){cut=idx+seps[i].length;break}}out.push(rest.slice(0,cut).trim());rest=rest.slice(cut).trim()}if(rest)out.push(rest);return out.filter(Boolean)}
  function applyVoice(u,lg){if(lg==='en'){u.lang='en-US';if(!enVoice)pickEn();if(enVoice)u.voice=enVoice}else{u.lang='ko-KR';if(!koVoice)pickKo();if(koVoice)u.voice=koVoice}u.rate=CFG.rate;u.pitch=CFG.pitch}
  function speakBrowser(text,lg,onEnd){if(!hasSpeech()){if(onEnd)onEnd();return}try{window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);applyVoice(u,lg);if(onEnd)u.onend=onEnd;window.speechSynthesis.speak(u)}catch(e){if(onEnd)onEnd()}}
  function playServer(queue,tok,lg,onEnd,isRetry){
    if(tok!==token)return;if(!queue.length){if(onEnd)onEnd();return}
    var seg=queue[0],url=CFG.endpoint+'?q='+encodeURIComponent(seg)+'&tl='+(lg==='en'?'en':'ko'),a=new Audio(url),done=false;current=a;
    var fail=function(){if(done||tok!==token)return;done=true;if(CFG.retry&&!isRetry){setTimeout(function(){playServer(queue,tok,lg,onEnd,true)},180);return}var rest=queue.slice(1);if(inFrame()||!hasSpeech()||!CFG.allowSpeechFallback){playServer(rest,tok,lg,onEnd,false);return}speakBrowser([seg].concat(rest).join(' '),lg,onEnd)};
    a.onended=function(){if(done||tok!==token)return;done=true;playServer(queue.slice(1),tok,lg,onEnd,false)};a.onerror=fail;a.play().catch(fail)
  }
  function stop(){token++;if(current){try{current.pause();current.src=''}catch(e){}current=null}if(hasSpeech())try{window.speechSynthesis.cancel()}catch(e){}}
  function speak(text,opts){if(!enabled||!text)return;var onEnd;if(typeof opts==='function'){onEnd=opts;opts={}}else{opts=opts||{};onEnd=opts.onEnd}var lg=opts.lang==='en'||opts.lang==='ko'?opts.lang:lang;token++;var tok=token;if(current){try{current.pause();current.src=''}catch(e){}current=null}if(hasSpeech())try{window.speechSynthesis.cancel()}catch(e){}if(CFG.serverFirst||inFrame())playServer(split(String(text),CFG.maxLen),tok,lg,onEnd,false);else speakBrowser(String(text),lg,onEnd)}
  try{window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',function(){if(document.hidden)stop()})}catch(e){}
  window.TW_TTS={speak:speak,stop:stop,setLang:function(lg){if(lg==='en'||lg==='ko')lang=lg},getLang:function(){return lang},setEnabled:function(on){enabled=!!on;if(!enabled)stop()},isEnabled:function(){return enabled},config:function(o){if(o)for(var k in o)if(Object.prototype.hasOwnProperty.call(o,k))CFG[k]=o[k];return CFG}};
  window.SUPERDOT_TTS=window.TW_TTS;
})();
