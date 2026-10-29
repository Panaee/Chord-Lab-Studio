/* Chord Lab 1.6 · NextChords: what can follow the chord you are on.
   Three proposals per step. With a style selected, two come from the style's
   own vocabulary (its paths, continued from your history, and its colours on
   the key's chords); the third is a plain move in the key, marked as such.
   Heuristics are named and auditable; they do not predict any composer. */
(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./theory-map.js'):root.TheoryMap,
    node?require('./fifths-engine.js'):root.FifthsLab,
    node?require('./messiaen-engine.js'):root.MessiaenModes,
    node?require('../legacy/landscapes.js'):root.Landscapes,
    node?require('../legacy/chord_namer.js'):root.ChordNamer);
  if(node)module.exports=api;else root.NextChords=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(T,F,M,L,CN){
'use strict';
const pc=T.mod;
const uniq=xs=>[...new Set(xs)].sort((a,b)=>a-b);
const sig=pcs=>uniq(pcs.map(pc)).join(',');
const pretty=s=>String(s||'').replace(/#/g,'♯').replace(/\b([A-G])b/g,'$1♭').replace(/\(b/g,'(♭').replace(/ b(\d)/g,' ♭$1');

/* Qualities the studio stores. Anything else is 'custom' with explicit notes. */
const QUAL={major:[0,4,7],minor:[0,3,7],dim:[0,3,6],aug:[0,4,8],sus2:[0,2,7],sus4:[0,5,7],
  maj7:[0,4,7,11],m7:[0,3,7,10],'7':[0,4,7,10],m7b5:[0,3,6,10],dim7:[0,3,6,9],add9:[0,2,4,7],madd9:[0,2,3,7]};
const LANDQ={'':'major',m:'minor',7:'7',maj7:'maj7',m7:'m7',dim:'dim',dim7:'dim7',m7b5:'m7b5',aug:'aug',sus2:'sus2',sus4:'sus4',add9:'add9',madd9:'madd9'};
function tonesFor(q){if(QUAL[q])return QUAL[q];const t=L.TONES[q];return t?t.map(pc):QUAL.major;}

/* major · minor · dom · dim · aug · sus, from the pitch classes above a root. */
function family(pcs,root){
  const s=new Set(pcs.map(p=>pc(p-root)));
  if(s.has(3)&&s.has(6)&&!s.has(7)&&!s.has(4))return 'dim';
  if(s.has(4)&&s.has(8)&&!s.has(7))return 'aug';
  if(s.has(4)&&s.has(10))return 'dom';
  if(s.has(4))return 'major';
  if(s.has(3))return 'minor';
  return 'sus';
}
const LOWER=new Set(['minor','dim']);

/* The chord symbol of actual notes, preferring the intended root. */
function symbol(notes,root,fallback){
  const list=uniq(notes);
  if(uniq(list.map(pc)).length===1)return T.name(list[0])+' · ίσον';
  const all=CN.readings(list);
  const pick=Number.isInteger(root)?(all.find(r=>r.root===pc(root))||all[0]):all[0];
  if(pick)return pretty(pick.label);
  return fallback||(T.name(Number.isInteger(root)?root:list[0])+'('+uniq(list.map(n=>pc(n-(root??list[0])))).filter(Boolean).map(x=>['','♭9','9','♯9','3','11','♯11','5','♭13','13','7','maj7'][x]).join(' ')+')');
}

/* Roman numeral against the key, with the case following the chord's third. */
const NUM=['I','II','III','IV','V','VI','VII'],CHROM=['I','♭II','II','♭III','III','IV','♯IV','V','♭VI','VI','♭VII','VII'];
function roman(ch,key){
  const pcs=ch.pcs||uniq(ch.notes.map(pc)),r=pc(ch.root);
  if(key.messiaen){const col=key.collection;const ix=col.offsets.indexOf(pc(r-col.tonic-col.transposition));return ix>=0?`M${col.mode}·${ix+1}`:`M${col.mode}·χρ.`;}
  const steps=(T.MODE[key.mode]||T.MODE.ionian).steps,ix=steps.map(s=>pc(key.tonic+s)).indexOf(r);
  let deg=ix>=0?(steps[ix]-[0,2,4,5,7,9,11][ix]<0?'♭':steps[ix]-[0,2,4,5,7,9,11][ix]>0?'♯':'')+NUM[ix]:CHROM[pc(r-key.tonic)];
  const fam=family(pcs,r),s=new Set(pcs.map(p=>pc(p-r)));
  if(LOWER.has(fam))deg=deg.replace(/[IV]+$/,x=>x.toLowerCase());
  if(fam==='dim')deg+=s.has(10)?'ø':'°';
  if(fam==='aug')deg+='+';
  if(s.has(11)&&fam!=='dim')deg+='maj7';else if(s.has(10)&&fam!=='dim')deg+='7';else if(s.has(9)&&fam==='dim')deg+='7';
  return deg;
}

/* Smallest movement from the notes you hold to a target collection:
   common tones stay put, the bass goes to the nearest target bass, the other
   voices move to the nearest free target tone. */
function voiceLead(from,targetPcs,bassPc){
  const src=uniq(from||[]);const pcs=uniq(targetPcs.map(pc));
  const bassTarget=Number.isInteger(bassPc)?pc(bassPc):pcs[0];
  if(!src.length){const b=48+bassTarget;return uniq([b,...pcs.filter(p=>p!==bassTarget).map(p=>60+pc(p-0)),...(pcs.length<3?[b+12]:[])]);}
  const nearest=n=>p=>{let best=null;for(let d=0;d<=6&&best===null;d++)for(const c of [n-d,n+d])if(best===null&&pc(c)===p)best=c;return best;};
  const above=(n,floor)=>{while(n<=floor)n+=12;return n;};
  // The bass stays between E1 and D4, moved by octaves so it keeps its note.
  let bass=nearest(src[0])(bassTarget);while(bass>62)bass-=12;while(bass<28)bass+=12;
  const voices=src.slice(1).length?src.slice(1):[bass+12,bass+16,bass+19];
  const want=new Set(pcs.filter(p=>p!==bassTarget));
  if(!want.size)want.add(bassTarget);
  const placed=[],free=[];
  // Held tones stay where they are.
  for(const n of voices){const p=pc(n);if(want.has(p)){placed.push(above(n,bass));want.delete(p);}else free.push(n);}
  // Each missing tone goes to the free voice that reaches it with the least movement.
  const pairs=[];
  free.forEach((n,i)=>want.forEach(p=>{const c=above(nearest(n)(p),bass);pairs.push({i,p,c,d:Math.abs(c-n)});}));
  pairs.sort((a,b)=>a.d-b.d);
  const usedVoice=new Set();
  for(const x of pairs){if(usedVoice.has(x.i)||!want.has(x.p))continue;usedVoice.add(x.i);want.delete(x.p);placed.push(x.c);}
  // Voices left over double the nearest chord tone; tones left over go on top.
  free.forEach((n,i)=>{if(usedVoice.has(i))return;let best=null;for(const p of pcs){const c=above(nearest(n)(p),bass);if(!placed.includes(c)&&(best===null||Math.abs(c-n)<Math.abs(best-n)))best=c;}if(best!==null)placed.push(best);});
  for(const p of want){let t=Math.max(bass,...placed)+1;while(pc(t)!==p)t++;placed.push(t);}
  let notes=uniq([bass,...placed]);
  while(notes.length>1&&Math.max(...notes)-bass>31){const top=Math.max(...notes);notes=uniq(notes.map(n=>n===top?above(n-12,bass):n));if(Math.max(...notes)===top)break;}
  return notes;
}

/* A landscape colour voiced from a bass near the current bass. */
function fromTemplate(offsets,rootPc,from){
  const ref=from?.length?Math.min(...from):48;
  let bass=ref-pc(ref-rootPc);if(ref-bass>6)bass+=12;
  while(bass+Math.max(...offsets)>100)bass-=12;
  while(bass<28)bass+=12;
  return uniq(offsets.map(o=>bass+o));
}

/* What stays and what moves, in note names. */
function motion(from,to){
  const a=uniq(from||[]),b=uniq(to||[]);
  const held=uniq(a.map(pc).filter(p=>b.map(pc).includes(p)));
  // Voices are paired low to high; extra notes are entries or exits.
  const pairs=[];const n=Math.min(a.length,b.length);
  if(a.length===b.length)for(let i=0;i<n;i++)pairs.push([a[i],b[i]]);
  else{const rest=b.slice();for(const x of a){if(!rest.length)break;let k=0;rest.forEach((m,i)=>{if(Math.abs(m-x)<Math.abs(rest[k]-x))k=i;});pairs.push([x,rest[k]]);rest.splice(k,1);}}
  const cost=pairs.reduce((s,[x,y])=>s+Math.abs(y-x),0)+Math.abs(a.length-b.length)*2;
  const moves=pairs.filter(([x,y])=>x!==y&&!(b.map(pc).includes(pc(x))&&pc(x)===pc(y))).map(([x,y])=>({from:x,to:y,delta:y-x}))
    .filter(m=>!held.includes(pc(m.to))||!held.includes(pc(m.from)));
  moves.sort((p,q)=>Math.abs(p.delta)-Math.abs(q.delta));
  return {held,moves:moves.slice(0,3),cost,text:[held.length?'κρατά '+held.map(T.name).join('·'):'',...moves.slice(0,2).map(m=>`${T.name(m.from)}→${T.name(m.to)} ${m.delta>0?'↑':'↓'}${Math.abs(m.delta)}`)].filter(Boolean).join(' · ')};
}

function keyOf(opts){
  const mode=opts.mode||'ionian';
  if(/^messiaen/.test(mode)){const m=Number(mode.split('-')[1])||2;const collection=M.collection(m,opts.tonic||0,opts.transposition||0);return {tonic:opts.tonic||0,mode,messiaen:true,collection,pcs:collection.pitchClasses};}
  const steps=(T.MODE[mode]||T.MODE.ionian).steps;
  return {tonic:opts.tonic||0,mode:T.MODE[mode]?mode:'ionian',messiaen:false,pcs:steps.map(s=>pc((opts.tonic||0)+s))};
}

/* The key's own triads (or sevenths), for the wheel and for plain moves. */
function keyChords(key,sevenths=false){
  if(key.messiaen){
    const out=[];for(let r=0;r<12;r++)for(const q of ['major','minor','dim']){const pcs=QUAL[q].map(x=>pc(r+x));if(pcs.every(p=>key.pcs.includes(p)))out.push({root:r,quality:q,pcs});}
    return out;
  }
  return F.degrees(key.tonic,key.mode,sevenths).map((d,i)=>({root:d.root,quality:d.quality==='custom'?'major':d.quality,pcs:uniq(d.pcs),degree:i}));
}

const PRIORITY={suspension:[3,1,5,4,2,6,0],nostalgia:[5,3,2,1,0,4,6],tension:[4,6,1,3,5,2,0],release:[0,4,3,5,1,2,6],mystery:[2,5,6,1,3,4,0],motion:[4,1,3,5,2,0,6]};
const INTENTS=[
  {id:'motion',label:'Κίνηση',hint:'σχέσεις 4ης/5ης, μπάσο που προχωρά'},
  {id:'suspension',label:'Αιώρηση',hint:'κοινές νότες, χρώμα χωρίς λύση'},
  {id:'nostalgia',label:'Σκιά',hint:'δανεικές ελάσσονες, μια σκιά στο φως'},
  {id:'tension',label:'Ένταση',hint:'ημιτόνια, τρίτονα, δεσπόζουσες'},
  {id:'release',label:'Λύση',hint:'επιστροφή στο κέντρο'},
  {id:'mystery',label:'Μυστήριο',hint:'συμμετρικές, αμφίσημες συγχορδίες'}
];

function features(c,s,key,steps){
  const rel=new Set(c.pcs.map(p=>pc(p-c.root)));
  const semitone=c.pcs.some(p=>c.pcs.includes(pc(p+1)));
  const tritone=c.pcs.some(p=>c.pcs.includes(pc(p+6)));
  const inKey=c.pcs.every(p=>key.pcs.includes(p));
  const fam=family(c.pcs,c.root);
  const rootMove=pc(c.root-s.root);
  return {rel,semitone,tritone,inKey,fam,rootMove,tonic:c.root===pc(key.tonic),colour:c.pcs.length>3||fam==='sus'};
}

function score(c,s,key,opts,hist){
  const f=features(c,s,key),reasons=[];let v=c.base;
  const mv=c.motion;
  v+=mv.held.length*.45-Math.min(mv.cost,14)*.07;
  const intent=opts.intent||'motion';
  if(f.inKey)v+=key.messiaen?1.2:intent==='mystery'||intent==='tension'?0:.5;else if(intent==='mystery'||intent==='tension')v+=.4;
  if(Number.isInteger(c.degree)&&!key.messiaen){const r=(PRIORITY[intent]||PRIORITY.motion).indexOf(c.degree);if(r>=0)v+=(6-r)*.18;}
  const add=(x,why)=>{v+=x;if(why&&x>0)reasons.push([x,why]);};
  switch(intent){
    case 'suspension':if(mv.held.length>=2)add(1.1,'κρατά δύο κοινές νότες');if(f.colour)add(1.1,'ανοιχτό χρώμα χωρίς λύση');if(f.fam==='dom')add(-1);if(f.tonic&&c.pcs.length===3)add(-.8);break;
    case 'nostalgia':if(f.fam==='minor')add(.9,'ελάσσονα σκιά');if(f.fam==='minor'&&f.rootMove===5&&family(s.pcs,s.root)!=='minor')add(1.6,'δανεική iv: η 3η πέφτει ημιτόνιο');if([8,10].includes(pc(c.root-key.tonic))&&f.fam==='major')add(1,'♭VI / ♭VII από την ελάσσονα');if(f.rel.has(11)||f.rel.has(10))add(.5);if(mv.moves.some(m=>Math.abs(m.delta)===1))add(.6,'μία φωνή κινείται ημιτόνιο');break;
    case 'tension':if(['dom','dim','aug'].includes(f.fam))add(1.5,f.fam==='dom'?'δεσπόζουσα: το τρίτονο ζητά λύση':'συμμετρική, ασταθής συγχορδία');if(f.semitone)add(.8,'ημιτόνιο μέσα στη συγχορδία');if(f.tritone)add(.8,'τρίτονο');if(!f.inKey)add(.6,'νότες έξω από την κλίμακα');if(f.tonic)add(-1);break;
    case 'release':if(f.tonic&&['major','minor'].includes(f.fam))add(2.5,'επιστροφή στο κέντρο');if(pc(s.root-key.tonic)===7&&f.tonic)add(1.2,'πτώση V → I');if(pc(c.root-key.tonic)===7&&f.fam!=='minor')add(.8,'η δεσπόζουσα ετοιμάζει την επιστροφή');if(!f.inKey)add(-.8);if(['dim'].includes(f.fam))add(-1);break;
    case 'mystery':if(['aug','dim','sus'].includes(f.fam)||c.pcs.length>4)add(1.3,'αμφίσημη συλλογή');if(!f.inKey)add(.8,'φως από άλλη κλίμακα');if([3,4,6,8,9].includes(f.rootMove))add(.8,'ρίζα σε 3η ή τρίτονο: απρόσμενη σχέση');break;
    default:if([5,7].includes(f.rootMove))add(1.4,f.rootMove===5?'η ρίζα ανεβαίνει 4η: προχωρά μπροστά':'η ρίζα ανεβαίνει 5η');if([1,2,10,11].includes(f.rootMove))add(.5,'το μπάσο κινείται βήμα');
  }
  const style=opts.style;
  if(style==='jazz'&&c.pcs.length>=4)add(.8);
  if(style==='classical'&&pc(s.root-key.tonic)===7&&f.tonic)add(1.2,'τέλεια πτώση');
  if(style==='morricone'&&f.fam==='major'&&[3,4,8,9].includes(f.rootMove))add(.6,'χρωματική μεσότητα');
  if(style==='takemitsu'){if(!f.inKey)add(.5);if(c.pcs.length===3&&['major','minor'].includes(f.fam))add(-.6);}
  if(style==='stravinsky'&&[3,6,9].includes(f.rootMove))add(.6);
  if(style==='glass'){if(mv.held.length>=2)add(.8,'αλλάζει μία νότα');if(mv.cost<=2)add(.6);}
  if(style==='electronic'&&(f.fam==='sus'||f.rel.has(2)))add(.8);
  if(style==='hadjidakis'&&f.fam==='minor')add(.5);
  if(style==='byzantine'){if(f.rel.has(3)||f.rel.has(4))add(-2);else add(1.5);}
  const recent=hist.slice(-4).map(x=>sig(x.pcs||x.notes));
  if(recent.includes(sig(c.pcs)))v-=style==='glass'?.2:1.4;
  reasons.sort((a,b)=>b[0]-a[0]);
  return {score:v,reason:reasons[0]?.[1]||''};
}

/* Style path continuation: the longest suffix of your history that matches
   the start of one of the style's paths gives the path's next chord. */
function continuations(land,hist){
  const out=[];if(!land)return out;
  for(const p of land.progressions){
    const steps=p.steps;if(!steps||steps.length<2)continue;
    for(let k=Math.min(steps.length-1,hist.length);k>=1;k--){
      const anchor=hist[hist.length-k];const afam=family(anchor.pcs,anchor.root);
      if(!(p.applies.includes('any')||p.applies.includes(afam)))continue;
      let ok=true;
      for(let j=0;j<k&&ok;j++){
        const h=hist[hist.length-k+j],[off,q]=steps[j];
        if(pc(h.root)!==pc(anchor.root+off)){ok=false;break;}
        const want=q==='same'?afam:q==='ison'?'sus':family(tonesFor(LANDQ[q]??q).map(x=>pc(x)),0);
        const got=family(h.pcs,h.root);
        if(!(want===got||(want==='major'&&got==='dom')||(want==='dom'&&got==='major'&&j===0)))ok=false;
      }
      if(!ok)continue;
      const [off,q,bassOff]=steps[k];
      const r=pc(anchor.root+off);
      let pcs,quality;
      if(q==='same'){quality=anchor.quality;pcs=(QUAL[anchor.quality]?QUAL[anchor.quality].map(x=>pc(r+x)):anchor.pcs.map(p=>pc(p-anchor.root+r)));}
      else if(q==='ison'){quality='custom';pcs=[r];}
      else {quality=LANDQ[q]??'custom';pcs=uniq(tonesFor(LANDQ[q]??q).map(x=>pc(r+x)));}
      out.push({root:r,quality,pcs,bassPc:Number.isInteger(bassOff)?pc(anchor.root+bassOff):r,bassFixed:Number.isInteger(bassOff),base:4+(k-1)*1.1,origin:'style',
        originLabel:`${land.name} · ${p.name}`,why:p.why,ison:q==='ison'});
      break;
    }
  }
  return out;
}

/* A style's colour rule applied to a chord: notes added or left out. */
function colourise(land,ch){
  if(!land)return null;
  const fam=family(ch.pcs,ch.root);
  const rule=(land.addColor||[]).find(r=>r.applies.includes('any')||r.applies.includes(fam==='dom'?'dom':fam));
  if(!rule)return null;
  const add=(rule.add||[]).filter(a=>a[2]!=='bass'&&a[2]!=='top').map(a=>pc(ch.root+a[0]));
  const top=(rule.add||[]).filter(a=>a[2]==='top').map(a=>pc(ch.root+a[0]));
  const low=(rule.add||[]).filter(a=>a[2]==='bass').map(a=>a[0]);
  const remove=(rule.remove||[]).map(x=>pc(ch.root+x));
  let pcs=uniq([...ch.pcs.filter(p=>!remove.includes(p)||p===pc(ch.root)),...add]);
  if(!add.length&&!remove.length&&!top.length&&!low.length)return {same:true,rule};
  return {pcs,top,low,rule};
}

function suggest(opts={}){
  const key=keyOf(opts);
  const land=L.LANDSCAPES.find(l=>l.id===opts.style)||null;
  const current=opts.current;
  if(!current||!current.notes?.length)return [];
  const s={...current,root:pc(current.root),pcs:uniq(current.notes.map(pc))};
  const hist=(opts.history&&opts.history.length?opts.history:[s]).map(h=>({...h,root:pc(h.root),pcs:uniq((h.pcs&&h.pcs.length?h.pcs:h.notes).map(pc))}));
  const sevenths=opts.style==='jazz'||opts.sevenths;
  const pool=[];
  const push=c=>{
    if(!c||!c.pcs?.length)return;
    if(sig(c.pcs)===sig(s.pcs)&&pc(c.bassPc??c.root)===pc(Math.min(...s.notes)))return;
    let notes;
    if(c.template)notes=fromTemplate(c.template,c.root,s.notes);
    else if(c.ison){const b=fromTemplate([0,12],c.root,s.notes);notes=b;}
    else {let bp=c.bassPc??c.root;const curBass=pc(Math.min(...s.notes));
      // Minimalism and suspension keep the bass when it belongs to the next chord.
      if(!c.bassFixed&&(opts.style==='glass'||opts.intent==='suspension')&&c.pcs.includes(curBass))bp=curBass;
      notes=voiceLead(s.notes,c.pcs,bp);
      if(c.top?.length){c.lower=notes.slice();let t=Math.max(...notes);for(const p of c.top){let n=t+1;while(pc(n)!==p)n++;notes.push(n);t=n;}}
      if(c.low?.length){const b=Math.min(...notes);for(const o of c.low)if(b+o>=24)notes.push(b+o);}
      notes=uniq(notes);}
    if(notes.length>12)notes=notes.slice(0,12);
    const cand={...c,notes,pcs:uniq(notes.map(pc))};
    cand.motion=motion(s.notes,notes);
    const sc=score(cand,s,key,opts,hist);
    cand.score=sc.score;cand.reason=sc.reason;
    // Two layers (Stravinsky) read as a polychord: lower + upper triad.
    cand.label=c.lower?symbol(c.lower,c.root)+' + '+T.name(c.top[0]):symbol(notes,c.root,c.fallbackLabel);
    cand.roman=roman(c.lower?{root:c.root,notes:c.lower}:cand,key);
    cand.family=family(cand.pcs,c.root);
    cand.inKey=cand.pcs.every(p=>key.pcs.includes(p));
    pool.push(cand);
  };
  // 1. The style's paths, continued from your history.
  for(const c of continuations(land,hist))push(c);
  // 2. The key's chords, plain and in the style's colour.
  const kc=key.messiaen?keyChords(key):keyChords(key,sevenths);
  for(const d of kc){
    const plain={root:d.root,quality:d.quality,pcs:d.pcs,degree:d.degree,base:1.2,origin:'key',originLabel:key.messiaen?`Messiaen ${key.collection.mode}`:'Τονικότητα'};
    push(plain);
    const col=colourise(land,d);
    if(col&&!col.same)push({root:d.root,quality:'custom',pcs:col.pcs,top:col.top,low:col.low,bassFixed:col.low.length>0,degree:d.degree,base:2.6,origin:'style',originLabel:`${land.name} · ${col.rule.name}`,why:col.rule.why});
    else if(col&&col.same&&land)pool[pool.length-1].styleFit=col.rule;
  }
  // 3. The style's colours on your chord's root and on the strongest degree.
  if(land)for(const color of land.colors){
    const offsets=color.notes.map(n=>n[0]);
    for(const r of uniq([s.root]))push({root:r,quality:'custom',pcs:uniq(offsets.map(o=>pc(r+o))),template:offsets,base:2,origin:'style',originLabel:`${land.name} · ${color.name}`,why:color.why,fallbackLabel:T.name(r)+'('+color.notes.slice(1).map(n=>n[1]).join(' ')+')'});
  }
  // 4. Neo-Riemannian neighbours: one voice moves.
  const sf=family(s.pcs,s.root);
  if(sf==='major'||sf==='minor'){
    for(const t of T.transformations(T.triad(s.root,sf==='major'?'major':'minor')))
      push({root:t.to.root,quality:t.to.quality,pcs:t.to.pcs,base:.9,origin:'key',originLabel:`${t.id} · ${t.short}`,why:t.detail});
  }
  // Glass and Hadjidakis keep the triad: their colour lives in repetition.
  for(const c of pool)if(c.styleFit){c.origin='style';c.base+=1.2;c.score+=1.2;c.originLabel=`${land.name} · ${c.styleFit.name}`;c.why=c.styleFit.why;c.fit=true;}
  pool.sort((a,b)=>b.score-a.score);
  const count=opts.count||3,final=[],seen=new Set(),roots=new Map();
  const take=c=>{const k=sig(c.pcs)+'/'+pc(Math.min(...c.notes));if(seen.has(k)||final.length>=count)return false;if((roots.get(c.root)||0)>=2)return false;
    seen.add(k);roots.set(c.root,(roots.get(c.root)||0)+1);final.push(c);return true;};
  if(land){
    // Two style proposals on different roots when the style offers them.
    let n=0;for(const c of pool){if(n>=count-1)break;if(c.origin==='style'&&!roots.has(c.root)&&take(c))n++;}
    for(const c of pool){if(n>=count-1)break;if(c.origin==='style'&&take(c))n++;}
    // A style that rejects chords (Byzantine) gets no plain contrast.
    if(!land.chordWarning)for(const c of pool){if(final.length>=count)break;if(c.origin!=='style'&&take(c))c.contrast=true;}
    else for(const c of pool){if(final.length>=count)break;if(c.origin==='style')take(c);}
  }
  for(const c of pool){if(final.length>=count)break;take(c);}
  return final.map((c,i)=>({root:c.root,quality:QUAL[c.quality]&&sig(QUAL[c.quality].map(x=>pc(c.root+x)))===sig(c.pcs)?c.quality:'custom',
    notes:c.notes,pcs:c.pcs,label:c.label,roman:c.roman,family:c.family,inKey:c.inKey,origin:c.origin,
    originLabel:c.contrast?'Βασική κίνηση · '+(c.originLabel||'τονικότητα'):c.originLabel,contrast:Boolean(c.contrast),
    why:c.why||'',reason:c.reason||'',fit:Boolean(c.fit),motion:c.motion,score:Math.round(c.score*100)/100,rank:i+1}));
}

/* A starting phrase: one of the style's paths, built on the tonic chord.
   Paths of four chords come first; turn walks through the others. Without a
   path for this style or for a Messiaen collection, null. */
function phrase(opts={}){
  const land=L.LANDSCAPES.find(l=>l.id===opts.style)||null,key=keyOf(opts),start=opts.start;
  if(!land||key.messiaen||!start?.notes?.length)return null;
  const t=pc(start.root),fam=family(uniq(start.notes.map(pc)),t)==='minor'?'minor':'major';
  const paths=land.progressions.filter(p=>p.steps.length>=3&&(p.applies.includes('any')||p.applies.includes(fam)))
    .sort((a,b)=>(b.steps.length===4)-(a.steps.length===4)||b.steps.length-a.steps.length);
  if(!paths.length)return null;
  const p=paths[(opts.turn||0)%paths.length];
  let prev=start.notes;
  const chords=p.steps.map(([off,q,bassOff])=>{
    const r=pc(t+off);let quality,notes;
    if(q==='ison'){quality='custom';notes=fromTemplate([0,12],r,prev);}
    else{quality=q==='same'?fam:(LANDQ[q]??'custom');
      notes=voiceLead(prev,uniq(tonesFor(q==='same'?fam:LANDQ[q]??q).map(x=>pc(r+x))),Number.isInteger(bassOff)?pc(t+bassOff):r);}
    prev=notes;
    const ch={root:r,quality:QUAL[quality]?quality:'custom',notes,pcs:uniq(notes.map(pc))};
    ch.label=symbol(notes,r);ch.roman=roman(ch,key);ch.family=family(ch.pcs,r);ch.inKey=ch.pcs.every(x=>key.pcs.includes(x));
    return ch;
  });
  return {name:`${land.name} · ${p.name}`,why:p.why,chords,count:paths.length};
}

/* A chord on the wheel: root plus ring (major outer, minor middle, dim inner). */
function chordFor(root,ring,opts={}){
  const key=keyOf(opts);let q=ring==='minor'?'minor':ring==='dim'?'dim':'major';
  const ext=opts.extension||'triad';
  if(ext==='7'){
    const deg=!key.messiaen&&F.degrees(key.tonic,key.mode,true).find(d=>d.root===pc(root));
    const qq=deg&&family(QUAL[q].map(x=>pc(root+x)),root)===family(deg.pcs,root)?deg.quality:null;
    q=qq&&QUAL[qq]?qq:q==='minor'?'m7':q==='dim'?'m7b5':'7';
  }else if(ext==='add9')q=q==='minor'?'madd9':q==='dim'?q:'add9';
  else if(ext==='sus2'||ext==='sus4')q=ext;
  const pcs=uniq(QUAL[q].map(x=>pc(root+x)));
  const notes=opts.from?.length?voiceLead(opts.from,pcs,root):QUAL[q].map(x=>(q==='add9'||q==='madd9')&&x===2?62+root:60+pc(root)+x).map(n=>n>72?n-12:n);
  const ch={root:pc(root),quality:q,notes:uniq(notes),pcs};
  ch.label=symbol(ch.notes,ch.root);ch.roman=roman(ch,key);ch.family=family(pcs,ch.root);ch.inKey=pcs.every(p=>key.pcs.includes(p));
  return ch;
}

/* From played or edited notes to a stored chord. */
function recognise(notes,key){
  const list=uniq(notes);const r=CN.readings(list)[0];
  const root=r?r.root:pc(list[0]);
  const pcs=uniq(list.map(pc));
  const quality=Object.keys(QUAL).find(q=>sig(QUAL[q].map(x=>pc(root+x)))===sig(pcs))||'custom';
  const ch={root,quality,notes:list,pcs};
  ch.label=symbol(list,root);ch.roman=key?roman(ch,keyOf(key)):'';ch.family=family(pcs,root);
  return ch;
}

/* Where a chord sits on the wheel. */
function wheelSlot(ch){
  const fam=family(ch.pcs||uniq(ch.notes.map(pc)),ch.root);
  const ring=fam==='minor'?'minor':fam==='dim'?'dim':'major';
  const index=ring==='major'?F.ROOTS.indexOf(pc(ch.root)):F.MINOR_ROOTS.indexOf(pc(ch.root));
  return {ring,index};
}

return {QUAL,INTENTS,PRIORITY,family,symbol,roman,voiceLead,fromTemplate,motion,keyOf,keyChords,suggest,phrase,chordFor,recognise,wheelSlot,pretty,sig};
});
