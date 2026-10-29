const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let starts=0,stops=0,resumes=0,suspends=0;
class NativeContext{
 constructor(){this.state='running';}
 resume(){resumes++;this.state='running';return Promise.resolve();}
 suspend(){suspends++;this.state='suspended';return Promise.resolve();}
 createOscillator(){return {start(){starts++;},stop(){stops++;},addEventListener(){}};}
}
const listeners={};const trustedParent={};
const env=vm.createContext({window:null,AudioContext:NativeContext,webkitAudioContext:NativeContext,addEventListener:(type,fn)=>listeners[type]=fn});env.window=env;env.parent=trustedParent;
vm.runInContext(fs.readFileSync(path.join(__dirname,'../legacy/studio-host.js'),'utf8'),env);
const host=env.ChordStudioHost,context=new env.AudioContext();
assert(context instanceof NativeContext);assert.equal(host.contextCount,1);
const sounding=context.createOscillator(),scheduled=context.createOscillator();sounding.start();scheduled.start(30);assert.equal(host.oscillatorCount,2);
host.pause();assert.equal(host.active,false);assert.equal(stops,2);assert.equal(suspends,1);assert.equal(host.oscillatorCount,0);
context.resume();assert.equal(resumes,0,'Hidden legacy code cannot restart its context');
const hidden=context.createOscillator();hidden.start();hidden.stop(5);assert.equal(starts,2,'Hidden quiz callbacks cannot schedule later sound');
host.resume();assert.equal(resumes,1);assert.equal(host.active,true);context.createOscillator().start();assert.equal(starts,3);
host.pause();assert.equal(stops,3);
listeners.message({source:{},data:{type:'chord-studio:legacy-resume'}});assert.equal(host.active,false,'Untrusted senders cannot resume the teacher');
listeners.message({source:trustedParent,data:{type:'chord-studio:legacy-resume'}});assert.equal(host.active,true);
listeners.message({source:trustedParent,data:{type:'chord-studio:legacy-pause'}});assert.equal(host.active,false);
listeners.message({source:trustedParent,data:{type:'unknown'}});assert.equal(host.active,false);
console.log('Legacy host: preserves teacher state, stops scheduled/active sound, suspends contexts and gates hidden playback/resume');
