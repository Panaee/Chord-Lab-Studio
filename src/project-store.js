/* Versioned, data-only project boundary shared by desktop and browser. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ProjectStore=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const fail=message=>{throw Error(message);};
function notes(value){if(!Array.isArray(value)||!value.length||value.length>32||value.some(n=>!Number.isInteger(n)||n<0||n>127))fail('Μη έγκυρες νότες MIDI στο έργο.');return [...new Set(value)].sort((a,b)=>a-b);}
function text(value,max,optional=false){if(value===undefined&&optional)return undefined;if(typeof value!=='string'||value.length>max)fail('Μη έγκυρο κείμενο έργου.');return value;}
function normalize(raw){
 if(!raw||typeof raw!=='object'||raw.format!=='chord-lab-project'||![1,2,3].includes(raw.version)||!Array.isArray(raw.sequence)||raw.sequence.length>512)fail('Μη υποστηριζόμενο αρχείο έργου.');
 const settings=raw.settings===undefined?{}:raw.settings;
 if(!settings||typeof settings!=='object'||Array.isArray(settings))fail('Μη έγκυρες ρυθμίσεις έργου.');
 const cleaned={};
 for(const key of ['tonic','bpm','messiaenMode','messiaenTrans'])if(settings[key]!==undefined){const n=settings[key];if(typeof n!=='number'||!Number.isFinite(n))fail('Μη έγκυρη αριθμητική ρύθμιση: '+key);cleaned[key]=n;}
 if(cleaned.tonic!==undefined&&(!Number.isInteger(cleaned.tonic)||cleaned.tonic<0||cleaned.tonic>11))fail('Μη έγκυρη τονική.');
 if(cleaned.bpm!==undefined&&(cleaned.bpm<40||cleaned.bpm>220))fail('Το BPM πρέπει να είναι μεταξύ 40 και 220.');
 if(cleaned.messiaenMode!==undefined&&(!Number.isInteger(cleaned.messiaenMode)||cleaned.messiaenMode<1||cleaned.messiaenMode>7))fail('Μη έγκυρος τρόπος Messiaen.');
 if(cleaned.messiaenTrans!==undefined&&(!Number.isInteger(cleaned.messiaenTrans)||cleaned.messiaenTrans<0||cleaned.messiaenTrans>5))fail('Μη έγκυρη μετάθεση.');
 for(const key of ['quality','mode','style','goal','scaleFamily','scale','intent'])if(settings[key]!==undefined)cleaned[key]=text(settings[key],80);
 for(const key of ['sevenths','keyLocked'])if(settings[key]!==undefined){if(typeof settings[key]!=='boolean')fail('Μη έγκυρη επιλογή έργου.');cleaned[key]=settings[key];}
 const sequence=raw.sequence.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||!Number.isInteger(row.root)||row.root<0||row.root>11)fail('Μη έγκυρη συγχορδία.');
  const result={root:row.root,quality:text(row.quality,40),label:text(row.label,90),notes:notes(row.notes),custom:Boolean(row.custom)};
  if(row.beats!==undefined){if(!Number.isInteger(row.beats)||row.beats<1||row.beats>16)fail('Μη έγκυρη διάρκεια βήματος.');result.beats=row.beats;}
  for(const [key,max] of [['sourceLabel',180],['theory',1200],['baseLabel',90],['seedQuality',40]])if(row[key]!==undefined)result[key]=text(row[key],max);
  if(row.seedNotes!==undefined)result.seedNotes=notes(row.seedNotes);
  if(row.seedRoot!==undefined){if(!Number.isInteger(row.seedRoot)||row.seedRoot<0||row.seedRoot>11)fail('Μη έγκυρη αρχική ρίζα.');result.seedRoot=row.seedRoot;}
  return result;
 });
 return {format:'chord-lab-project',version:3,name:text(raw.name===undefined?'Χωρίς τίτλο':raw.name,80),settings:cleaned,sequence};
}
function clone(project){return normalize(JSON.parse(JSON.stringify(project)));}
return {normalize,clone,notes};
});
