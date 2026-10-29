/* Audio lifecycle bridge for the preserved legacy teacher. Its DOM, lesson,
   history and quiz remain alive when the parent Studio closes the overlay. */
(function(root){
'use strict';
let active=true;
try{if(root.parent!==root){const overlay=root.parent.document.getElementById('oldOverlay');if(overlay)active=!overlay.hidden;}}catch(_){}
const contexts=new Set(),oscillators=new Set(),constructors=new Map();
function settled(promise){if(promise?.catch)promise.catch(()=>{});}
function wrap(Native){
 if(constructors.has(Native))return constructors.get(Native);
 function TrackedAudioContext(...args){
  const context=new Native(...args),nativeResume=context.resume?.bind(context),nativeSuspend=context.suspend?.bind(context),nativeCreate=context.createOscillator.bind(context);
  const entry={context,resume:nativeResume,suspend:nativeSuspend};contexts.add(entry);
  context.resume=function(){return active&&nativeResume?nativeResume():Promise.resolve();};
  context.createOscillator=function(...values){
   const oscillator=nativeCreate(...values),nativeStart=oscillator.start.bind(oscillator),nativeStop=oscillator.stop.bind(oscillator);
   let suppressed=false;
   const tracked={oscillator,stop:nativeStop};
   oscillator.start=function(...when){if(!active){suppressed=true;return;}oscillators.add(tracked);return nativeStart(...when);};
   oscillator.stop=function(...when){if(suppressed)return;return nativeStop(...when);};
   oscillator.addEventListener?.('ended',()=>oscillators.delete(tracked),{once:true});
   return oscillator;
  };
  if(!active&&nativeSuspend)settled(nativeSuspend());
  return context;
 }
 TrackedAudioContext.prototype=Native.prototype;Object.setPrototypeOf(TrackedAudioContext,Native);constructors.set(Native,TrackedAudioContext);return TrackedAudioContext;
}
for(const name of ['AudioContext','webkitAudioContext'])if(typeof root[name]==='function')root[name]=wrap(root[name]);
function pause(){
 active=false;
 for(const node of oscillators)try{node.stop();}catch(_){}
 oscillators.clear();
 for(const entry of contexts)if(entry.suspend)try{settled(entry.suspend());}catch(_){}
}
function resume(){
 active=true;
 for(const entry of contexts)if(entry.resume)try{settled(entry.resume());}catch(_){}
}
root.addEventListener?.('message',event=>{
 if(event.source!==root.parent)return;
 if(event.data?.type==='chord-studio:legacy-pause')pause();
 else if(event.data?.type==='chord-studio:legacy-resume')resume();
});
root.ChordStudioHost={pause,resume,get active(){return active;},get contextCount(){return contexts.size;},get oscillatorCount(){return oscillators.size;}};
})(window);
