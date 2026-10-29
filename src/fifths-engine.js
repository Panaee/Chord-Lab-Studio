/* Circle of fifths and diatonic harmony. Deterministic, offline, pure JS.
   Major/minor rings represent key signatures, not a claim that all chords
   clockwise from a chosen chord are automatically 'correct'. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./theory-map.js'):root.TheoryMap,
    typeof module==='object'&&module.exports?require('./path-engine.js'):root.ComposerPaths);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FifthsLab=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(T,P){
  'use strict';
  const MAJOR=['C','G','D','A','E','B','F♯','D♭','A♭','E♭','B♭','F'];
  const MINOR=['Am','Em','Bm','F♯m','C♯m','G♯m','D♯m','B♭m','Fm','Cm','Gm','Dm'];
  const ROOTS=[0,7,2,9,4,11,6,1,8,3,10,5];
  const MINOR_ROOTS=ROOTS.map(r=>T.mod(r+9));
  const SIGNATURES=['0','1♯','2♯','3♯','4♯','5♯','6♯','5♭','4♭','3♭','2♭','1♭'];
  const mod12=T.mod;
  function at(index,minor=false){
    index=((index%12)+12)%12;
    return {index,minor,root:(minor?MINOR_ROOTS:ROOTS)[index],name:(minor?MINOR:MAJOR)[index],signature:SIGNATURES[index],mode:minor?'aeolian':'ionian'};
  }
  function keyFrom(root,mode){
    const minor=mode==='aeolian';
    const i=(minor?MINOR_ROOTS:ROOTS).indexOf(mod12(root));
    return at(i<0?0:i,minor);
  }
  const related=k=>({fifth:at(k.index+1,k.minor),fourth:at(k.index-1,k.minor),relative:at(k.index,!k.minor)});
  const q7={
    '0,4,7,11':'maj7','0,4,7,10':'7','0,3,7,10':'m7',
    '0,3,6,10':'m7b5','0,3,6,9':'dim7','0,3,7,11':'mMaj7',
    '0,4,8,11':'augMaj7'
  };
  const ROMAN=['I','II','III','IV','V','VI','VII'];
  const LETTERS='CDEFGAB', NATURAL=[0,2,4,5,7,9,11];
  function spellScale(root,mode){
    const key=keyFrom(root,mode), named=(mode==='aeolian'?key.name.replace(/m$/,''):mode==='ionian'?key.name:T.name(root));
    const first=LETTERS.indexOf(named[0]);
    return T.MODE[mode].steps.map((step,i)=>{
      const letter=(first+i)%7, target=mod12(root+step);
      let diff=mod12(target-NATURAL[letter]);if(diff>6)diff-=12;
      if(Math.abs(diff)>2)return T.name(target);
      return LETTERS[letter]+(diff===2?'𝄪':diff===1?'♯':diff===-1?'♭':diff===-2?'𝄫':'');
    });
  }
  function degrees(root,mode='ionian',sevenths=false){
    if(!T.MODE[mode])throw Error('Unknown mode');
    const steps=T.MODE[mode].steps,spelling=spellScale(root,mode);
    return steps.map((s,i)=>{
      const noteSteps=(sevenths?[0,2,4,6]:[0,2,4]).map(x=>{
        const pos=i+x;
        return steps[pos%7]+12*Math.floor(pos/7)-s;
      });
      const intervals=noteSteps.map(mod12);
      const q=sevenths?q7[intervals.join(',')]:Object.entries(T.QUAL).find(([name,arr])=>arr.length===3&&arr.every((x,j)=>x===intervals[j]))?.[0];
      const r=mod12(root+s), quality=q||'custom';
      const c=q&&P.QUAL[q]?P.chord(r,q):{
        root:r,quality:'custom',label:T.name(r)+'(7th)',notes:noteSteps.map(n=>60+r+n),pcs:intervals.map(x=>mod12(r+x)),source:'scale'};
      const alteration=s-[0,2,4,5,7,9,11][i];
      const romanStem=(alteration<0?'♭'.repeat(-alteration):'♯'.repeat(alteration))+ROMAN[i];
      const baseRoman=(quality==='minor'||quality==='m7'||quality==='mMaj7')?romanStem.toLowerCase():
        (quality==='dim'||quality==='m7b5'||quality==='dim7')?romanStem.toLowerCase()+'°':romanStem;
      const degLabel=!sevenths?baseRoman:
        quality==='m7b5'?romanStem.toLowerCase()+'ø7':quality==='dim7'?romanStem.toLowerCase()+'°7':
        quality==='maj7'?romanStem+'maj7':quality==='m7'?romanStem.toLowerCase()+'7':
        quality==='7'?romanStem+'7':baseRoman+'7';
      return {...c,label:spelling[i]+(P.QUAL[quality]?.label??'(7th)'),spelled:(sevenths?[0,2,4,6]:[0,2,4]).map(x=>spelling[(i+x)%7]),degree:i+1,roman:degLabel,root:r,intervals,source:'circle-degree',notes:(q&&P.QUAL[q])?P.chord(r,q).notes:c.notes,
        theory:`${degLabel} βαθμίδα της ${T.name(root)} ${T.MODE[mode].label}. ${sevenths?'Τετράφωνη εναρμόνιση':'Τρίφωνη εναρμόνιση'} με διαδοχικές τρίτες.`};
    });
  }
  const PATTERNS={
    ionian:[
      {id:'1451',name:'I – IV – V – I',degrees:[0,3,4,0],why:'Τονική → υποδεσπόζουσα → δεσπόζουσα → τονική. Η πτώση V–I δημιουργεί ισχυρή αίσθηση επιστροφής.'},
      {id:'251',name:'ii – V – I',degrees:[1,4,0],why:'Προδεσπόζουσα → δεσπόζουσα → τονική. Θεμελιώδης πορεία της λειτουργικής αρμονίας και της jazz.'},
      {id:'6415',name:'vi – IV – I – V',degrees:[5,3,0,4],why:'Διατηρεί διατονική συνοχή και μετακινεί την αίσθηση κέντρου μέσω σχετικών λειτουργιών.'}
    ],
    aeolian:[
      {id:'1671',name:'i – ♭VI – ♭VII – i',degrees:[0,5,6,0],why:'Διατονική πορεία της φυσικής ελάσσονας χωρίς υποχρεωτική αυξημένη έβδομη βαθμίδα.'},
      {id:'1461',name:'i – iv – ♭VI – i',degrees:[0,3,5,0],why:'Ελάσσων τόνος, σκοτεινή υποδεσπόζουσα και επιστροφή στο κέντρο.'}
    ]
  };
  function patterns(mode){return PATTERNS[mode]||[
     {id:'modal-1471',name:'I – IV – VII – I (βαθμίδες)',degrees:[0,3,6,0],why:'Modal εναλλαγή βαθμίδων: δεν συνεπάγεται λειτουργική δεσπόζουσα.'}
  ];}
  function arcSector(cx,cy,r0,r1,start,end){
    const point=(r,a)=>{const rad=(a-90)*Math.PI/180;return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];};
    const a=point(r1,start),b=point(r1,end),c=point(r0,end),d=point(r0,start);
    return `M${a.join(' ')} A${r1} ${r1} 0 0 1 ${b.join(' ')} L${c.join(' ')} A${r0} ${r0} 0 0 0 ${d.join(' ')} Z`;
  }
  function sector(index,inner=false){return arcSector(210,210,inner?75:143,inner?142:210,index*30-15,index*30+15);}
  function point(index,r){const a=(index*30-90)*Math.PI/180;return {x:210+r*Math.cos(a),y:210+r*Math.sin(a)};}
  function cycle(root,mode='ionian'){const k=keyFrom(root,mode),r=related(k);return{k,...r};}
  return {MAJOR,MINOR,ROOTS,MINOR_ROOTS,SIGNATURES,at,keyFrom,related,degrees,patterns,sector,point,cycle,spellScale};
});
