/* Chord Lab 0.3: explicit structure, no force/random graph.
   Triad transforms are neo-Riemannian P/L/R; distance is minimal
   total movement in semitones across the three voices (modulo octaves).
   Scale spelling is 12-TET pitch classes, with enharmonic caveat. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TheoryMap=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const N=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const mod=n=>(n%12+12)%12;
const name=n=>N[mod(n)];
const MODE={ionian:{label:'Ionian / Μείζονα',steps:[0,2,4,5,7,9,11],character:4,desc:'Μείζονα 3η · τονική έλξη'},dorian:{label:'Dorian / Δώριος',steps:[0,2,3,5,7,9,10],character:9,desc:'Ελάσσονα 3η, φυσική 6η'},phrygian:{label:'Phrygian / Φρύγιος',steps:[0,1,3,5,7,8,10],character:1,desc:'Χαρακτηριστική ♭2'},lydian:{label:'Lydian / Λύδιος',steps:[0,2,4,6,7,9,11],character:6,desc:'Χαρακτηριστική ♯4'},mixolydian:{label:'Mixolydian / Μιξολύδιος',steps:[0,2,4,5,7,9,10],character:10,desc:'Μείζονα 3η, ♭7'},aeolian:{label:'Aeolian / Φυσική ελάσσονα',steps:[0,2,3,5,7,8,10],character:8,desc:'♭3, ♭6 και ♭7'},locrian:{label:'Locrian / Λόκριος',steps:[0,1,3,5,6,8,10],character:6,desc:'♭2, ελαττωμένη 5η'}};
const INTERVAL=['ταυτοφωνία','μικρή 2η','μεγάλη 2η','μικρή 3η','μεγάλη 3η','καθαρή 4η','τρίτονο','καθαρή 5η','μικρή 6η','μεγάλη 6η','μικρή 7η','μεγάλη 7η'];
const RATIOS=['1:1','16:15','9:8','6:5','5:4','4:3','45:32','3:2','8:5','5:3','9:5','15:8'];
const QUAL={major:[0,4,7],minor:[0,3,7],dim:[0,3,6],aug:[0,4,8],sus2:[0,2,7],sus4:[0,5,7]};
const suffix={major:'',minor:'m',dim:'dim',aug:'aug',sus2:'sus2',sus4:'sus4'};
function triad(root=0,quality='major'){return {root:mod(root),quality,pcs:QUAL[quality].map(s=>mod(root+s)),label:name(root)+suffix[quality],id:mod(root)+':'+quality};}
function samePcs(a,b){return a.length===b.length&&a.every(x=>b.includes(x));}
function transformations(c){if(c.quality!=='major'&&c.quality!=='minor')return [];
 const r=c.root,maj=c.quality==='major';
 return [
 {id:'P',title:'Parallel',short:'Αλλάζει η 3η',to:triad(r,maj?'minor':'major'),detail:'Η ρίζα και η 5η παραμένουν, μετακινείται η 3η κατά ένα ημιτόνιο.'},
 {id:'R',title:'Relative',short:'Κίνηση ενός τόνου',to:triad(r+(maj?9:3),maj?'minor':'major'),detail:'Δύο κοινές νότες. Η τρίτη κινείται κατά έναν τόνο.'},
 {id:'L',title:'Leading-tone',short:'Κίνηση ημιτονίου',to:triad(r+(maj?4:8),maj?'minor':'major'),detail:'Δύο κοινές νότες. Η τρίτη κινείται κατά ένα ημιτόνιο.'}
 ];}
function chromaticOffset(a,b){let d=mod(b-a);if(d>6)d-=12;return d;}
// Exact Hungarian assignment avoids the factorial search for dense clusters.
function assignmentCost(matrix){
 const n=matrix.length;if(!n)return 0;
 const u=Array(n+1).fill(0),v=Array(n+1).fill(0),p=Array(n+1).fill(0),way=Array(n+1).fill(0);
 for(let i=1;i<=n;i++){
  p[0]=i;let j0=0;const min=Array(n+1).fill(Infinity),used=Array(n+1).fill(false);
  do{
   used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
   for(let j=1;j<=n;j++)if(!used[j]){
    const next=matrix[i0-1][j-1]-u[i0]-v[j];
    if(next<min[j]){min[j]=next;way[j]=j0;}
    if(min[j]<delta){delta=min[j];j1=j;}
   }
   for(let j=0;j<=n;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;
   j0=j1;
  }while(p[j0]!==0);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0!==0);
 }
 return Math.max(0,-v[0]);
}
function motion(source,goal){const A=source.pcs,B=goal.pcs;if(A.length!==B.length)throw Error('Equal voice count required');
 const costs=A.map(a=>B.map(b=>Math.abs(chromaticOffset(a,b)))),cost=assignmentCost(costs);
 const remaining=B.map((_,i)=>i),pairs=[];let spent=0;
 // Preserve the original first-in-input-order choice among optimal ties.
 for(let i=0;i<A.length;i++)for(let k=0;k<remaining.length;k++){
  const j=remaining[k],rest=remaining.filter(x=>x!==j);
  const residual=costs.slice(i+1).map(row=>rest.map(x=>row[x]));
  if(spent+costs[i][j]+assignmentCost(residual)!==cost)continue;
  pairs.push({from:A[i],to:B[j],delta:chromaticOffset(A[i],B[j])});spent+=costs[i][j];remaining.splice(k,1);break;
 }
 return {cost,pairs,common:pairs.filter(p=>p.delta===0).length};
}
function voiceMidi(srcMidi,targetPcs){const source={pcs:srcMidi.map(mod)},target={pcs:targetPcs};const m=motion(source,target);return m.pairs.map((p,i)=>srcMidi[i]+p.delta);}
function chordDegrees(tonic,modeId){const m=MODE[modeId];if(!m)throw Error('Unknown mode');return m.steps.map((step,i)=>{
 const interval3=mod(m.steps[(i+2)%7]-step),interval5=mod(m.steps[(i+4)%7]-step);
 const qual=Object.keys(QUAL).find(k=>QUAL[k].length===3&&QUAL[k][0]===0&&QUAL[k][1]===interval3&&QUAL[k][2]===interval5)||'unknown';
 const alteration=step-[0,2,4,5,7,9,11][i];
 const romanBase=(alteration<0?'♭'.repeat(-alteration):'♯'.repeat(alteration))+['I','II','III','IV','V','VI','VII'][i];const roman=qual==='minor'?romanBase.toLowerCase():qual==='dim'?romanBase.toLowerCase()+'°':qual==='aug'?romanBase+'+':romanBase;
 return {degree:i+1,roman,root:mod(tonic+step),quality:qual,label:name(tonic+step)+(suffix[qual]??'?'),pcs:[0,interval3,interval5].map(x=>mod(tonic+step+x)),inMode:true};
 });}
function diatonic(c,tonic,modeId){const pcs=MODE[modeId].steps.map(s=>mod(s+tonic));return c.pcs.every(x=>pcs.includes(x));}
function notesFor(c,octave=4){return c.pcs.map(p=>60+mod(p-c.root)+c.root+12*(octave-4));}
function pitchHz(n){return 440*Math.pow(2,(n-69)/12);}
function intervalInfo(root,semi){let step=mod(semi),ratio=Math.pow(2,step/12);return {from:name(root),to:name(root+step),step,label:INTERVAL[step],equalRatio:ratio.toFixed(5),reference:RATIOS[step]};}
return {N,MODE,INTERVAL,RATIOS,QUAL,mod,name,triad,transformations,motion,voiceMidi,chordDegrees,diatonic,notesFor,pitchHz,intervalInfo,samePcs};
});
