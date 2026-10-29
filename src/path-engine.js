/* Composer Paths: explicit harmony facts plus named, auditable aesthetic heuristics.
   Not an algorithm that can predict any composer's choices. 12-tone MIDI model.
   Uses the original Chord Lab landscape definitions and original TheoryMap. */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const v = factory(isNode ? require('./theory-map.js') : root.TheoryMap,
    isNode ? require('../legacy/landscapes.js') : root.Landscapes);
  if (isNode) module.exports = v; else root.ComposerPaths = v;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (T, Land) {
  'use strict';
  const mod = T.mod;
  const QUAL = {
    major:{notes:[0,4,7],label:''}, minor:{notes:[0,3,7],label:'m'},
    dim:{notes:[0,3,6],label:'dim'}, aug:{notes:[0,4,8],label:'aug'},
    sus2:{notes:[0,2,7],label:'sus2'}, sus4:{notes:[0,5,7],label:'sus4'},
    maj7:{notes:[0,4,7,11],label:'maj7'}, m7:{notes:[0,3,7,10],label:'m7'},
    '7':{notes:[0,4,7,10],label:'7'}, add9:{notes:[0,4,7,14],label:'add9'},
    m9:{notes:[0,3,7,10,14],label:'m9'}, m7b5:{notes:[0,3,6,10],label:'m7(♭5)'}, dim7:{notes:[0,3,6,9],label:'dim7'}, mMaj7:{notes:[0,3,7,11],label:'m(maj7)'}, quartal:{notes:[0,5,10],label:'(4ths)'},
    maj7sharp11:{notes:[0,4,11,18],label:'maj7(♯11)'},
    octColor:{notes:[0,1,6,10],label:'(oct.)'}
  };
  const GOALS = [
    {id:'suspension',label:'Αιώρηση',short:'χωρίς καθαρή λύση',intro:'Πρόσθεσε χρώμα, κράτησε κοινές νότες, απέφυγε την υποχρεωτική κατάληξη.'},
    {id:'nostalgia',label:'Νοσταλγία',short:'μια σκιά στο φως',intro:'Μικρές χρωματικές μετατοπίσεις, δανεικές ελάσσονες και μεγάλες 7ες.'},
    {id:'tension',label:'Ένταση',short:'τριβή / αναμονή',intro:'Ημιτόνια, αλλοιωμένοι φθόγγοι, αυξημένη πυκνότητα ή δεσπόζουσες.'},
    {id:'release',label:'Λύση',short:'επιστροφή / ανακούφιση',intro:'Αρμονική κατάληξη, σταθερότητα κέντρου και ομαλή κίνηση φωνών.'},
    {id:'mystery',label:'Μυστήριο',short:'ασαφές κέντρο',intro:'Αμφίσημες συγχορδίες, συμμετρικές συλλογές, πέπλα αντί για πτώσεις.'},
    {id:'motion',label:'Κίνηση',short:'προς τα εμπρός',intro:'Κίνηση μπάσου, σχέσεις πέμπτης, μετασχηματισμοί και διαδοχή.'}
  ];
  const byGoal = id => GOALS.find(x=>x.id===id)||GOALS[0];
  const name = T.name;
  const unique = a => [...new Set(a)].sort((a,b)=>a-b);
  const suffix = q => (QUAL[q]||QUAL.major).label;
  const chord = (root=0, quality='major', voicing) => {
    if(!QUAL[quality]) quality='major';
    root=mod(root); const notes = voicing?.length ? unique(voicing.map(Number)) : QUAL[quality].notes.map(n=>60+root+n);
    const pcs=unique(notes.map(mod));
    return {root,quality,label:name(root)+suffix(quality),notes,pcs,source:'core'};
  };
  const nameNotes = arr => arr.map(n=>name(n) + (Math.floor(n/12)-1)).join(' · ');
  const semis = (a,b) => {let d=mod(b-a);return d>6?d-12:d;};
  function compare(src,dst) {
    const common=src.pcs.filter(x=>dst.pcs.includes(x));
    const gone=src.pcs.filter(x=>!dst.pcs.includes(x));
    const gained=dst.pcs.filter(x=>!src.pcs.includes(x));
    const srcNotes=src.notes.slice().sort((a,b)=>a-b);
    let pairs=[], cost=0;
    if(src.notes.length===dst.notes.length && src.pcs.length===dst.pcs.length) {
      // Unique pitch classes in equal-sized voicings: globally minimal PC voice leading.
      const m=T.motion({pcs:src.pcs},{pcs:dst.pcs});
      pairs=m.pairs.map(p=>({from:p.from,to:p.to,delta:p.delta}));cost=m.cost;
    } else {
      cost=gone.reduce((n,a)=>n+Math.min(...dst.pcs.map(b=>Math.abs(semis(a,b)))),0)
        +gained.reduce((n,b)=>n+Math.min(...src.pcs.map(a=>Math.abs(semis(a,b)))),0);
      pairs=[];
    }
    return {common,gone,gained,pairs,cost,sourceNotes:srcNotes};
  }
  function voiceNear(src,dst) {
    // A pitch-class assignment has one slot per distinct pitch class. Doubled
    // octaves need an actual MIDI assignment, not an index into this model.
    if(src.notes.length!==dst.notes.length || src.pcs.length!==dst.pcs.length || src.notes.length!==src.pcs.length || dst.notes.length!==dst.pcs.length) return dst;
    const m=T.motion({pcs:src.notes.map(mod)},{pcs:dst.pcs});
    const notes=m.pairs.map((p,i)=>src.notes[i]+p.delta).sort((a,b)=>a-b);
    return {...dst,notes};
  }
  const category = q => (q==='major'||q==='maj7'||q==='add9'||q==='maj7sharp11')?'major':(q==='minor'||q==='m7'||q==='m9')?'minor':q==='7'?'dom':q==='dim'?'dim':q==='sus2'||q==='sus4'?'sus':'any';
  const legacyQuality = q => ({'':'major',m:'minor',7:'7',maj7:'maj7',m7:'m7',dim:'dim',aug:'aug',sus2:'sus2',sus4:'sus4',add9:'add9',m9:'m9'})[q] || null;
  function asTemplate(src, color, styleName) {
    const offsets=(color.notes||[]).map(n=>Number(n[0])).filter(Number.isFinite);
    if(!offsets.length) return null;
    const notes=unique(offsets.map(x=>60+src.root+x));
    return {root:src.root,quality:'custom',label:color.name,shortLabel:color.name,
      notes,pcs:unique(notes.map(mod)),source:'palette',sourceLabel:'Ηχόχρωμα · '+styleName,
      theory:color.why||'Συνδυασμός διαστημάτων από το επιλεγμένο συνθετικό τοπίο.',
      orchestration:color.use||''};
  }
  function describe(src, candidate, cmp, goal, sourceLabel) {
    const common=cmp.common.length;
    const first=common?`${common} κοιν${common===1?'ή νότα':'ές νότες'} (${cmp.common.map(name).join(', ')})`:'Δεν διατηρεί κοινή νότα';
    const movement=cmp.pairs.filter(x=>x.delta!==0).map(p=>`${name(p.from)}→${name(p.to)} (${p.delta>0?'+':''}${p.delta})`).join(', ');
    const relation=movement ? `Κίνηση: ${movement}.` : cmp.gained.length ? `Προστίθενται ${cmp.gained.map(name).join(', ')}· απομακρύνονται ${cmp.gone.map(name).join(', ')}.` : 'Η σχέση εξαρτάται από τη διάταξη των φθόγγων.';
    return {summary:first+'. '+relation, common, motion:movement, sourceLabel};
  }
  const minorish = q => ['minor','m7','m9','dim'].includes(q);
  function scoreCandidate(src,c,cmp,opts) {
    const {goal,style,tonic,mode,history=[]}=opts;
    let score=0;
    let why=[];
    const g=goal||'suspension'; const common=cmp.common.length;
    const diatonic=T.MODE[mode]?.steps.map(s=>mod(tonic+s))||[];
    const inMode=c.pcs.every(p=>diatonic.includes(p));
    score += common*.95;
    score -= Math.min(cmp.cost,15)*.12;
    if(inMode)score+=.65;
    if(c.source==='palette' && style!=='free') score+=3.0;
    if(c.source==='progression' && style!=='free')score+=2.45;
    if(c.source==='transform')score+=.65;
    if(c.source==='degree') score+=.3;
    const containsSemitone=c.pcs.some(p=>c.pcs.includes(mod(p+1)));
    const containsTritone=c.pcs.some(p=>c.pcs.includes(mod(p+6)));
    const familiar= c.root===mod(tonic);
    if(g==='suspension') {
      if(['sus2','sus4','maj7','add9','m9','quartal','maj7sharp11','custom'].includes(c.quality)){score+=3.1;why.push('ανοιχτή / μετέωρη ηχητική σχέση');}
      if(c.quality==='7')score-=1.2;
      if(common>=2)score+=1.0;
    } else if(g==='nostalgia') {
      if(['minor','m7','maj7','add9','m9'].includes(c.quality)){score+=2.8;why.push('ελάσσων ή εμπλουτισμένη 7η/9η');}
      if(src.quality==='major' && c.root===mod(src.root+5) && minorish(c.quality)) {score+=3;why.push('δανεική iv (modal mixture)');}
      if(cmp.pairs.some(p=>Math.abs(p.delta)===1))score+=1.2;
    } else if(g==='tension'){
      if(['7','dim','aug','octColor'].includes(c.quality)) {score+=3;why.push('αυξημένη αρμονική αστάθεια');}
      if(containsSemitone){score+=2;why.push('γειτονικά ημιτόνια');}
      if(containsTritone){score+=1.2;why.push('τρίτονο');}
    } else if(g==='release'){
      if(familiar && ['major','minor'].includes(c.quality)){score+=5;why.push('τονική άφιξη');}
      if(inMode)score+=1.4;
      if(['major','minor'].includes(c.quality))score+=1.7;
      if(c.quality==='dim'||c.quality==='7')score-=2;
    } else if(g==='mystery'){
      if(['dim','aug','sus2','sus4','quartal','octColor','custom','maj7sharp11'].includes(c.quality)) {score+=3.1;why.push('αμφίσημη / συμμετρική συλλογή');}
      if(containsTritone)score+=1.3;
      if(!inMode)score+=.8;
    } else if(g==='motion'){
      if([5,7].includes(mod(c.root-src.root))) {score+=3;why.push('σχέση τέταρτης ή πέμπτης');}
      if(c.source==='transform')score+=2.1;
      if(cmp.cost>=1 && cmp.cost<=3)score+=1;
      if(c.source==='progression')score+=1.4;
    }
    if(style==='takemitsu'){
      if(['maj7sharp11','quartal','custom','m9','sus2'].includes(c.quality))score+=1.4;
      if(containsSemitone||containsTritone)score+=.7;
      if(c.quality==='major')score-=.35;
    } else if(style==='morricone'||style==='hadjidakis'){
      if(['major','minor','maj7'].includes(c.quality))score+=.95;
      if(common>=2)score+=.4;
    } else if(style==='stravinsky'){
      if(['aug','dim','custom'].includes(c.quality)||containsTritone)score+=1;
    } else if(style==='glass'){
      if(inMode && cmp.cost<=3) score+=1.5;
      if(c.source==='progression') score+=.7;
    } else if(style==='classical'){
      if(inMode && ['major','minor','7'].includes(c.quality))score+=1.4;
    }
    if(c.source==='palette')why.unshift('πρότυπο ηχοχρώματος του ύφους');
    if(c.source==='progression')why.unshift('βήμα από διαδρομή του ύφους');
    if(c.source==='transform')why.unshift(c.transform+' · μετασχηματισμός με κοινές νότες');
    if(c.source==='degree')why.unshift('διατονική βαθμίδα');
    const recent=history.slice(-8), identity=x=>unique((x.pcs||x.notes?.map(mod)||[])).join(',');
    const repeated=recent.filter(x=>identity(x)===identity(c)).length;
    if(repeated){
      const penalty=style==='glass'?.18:g==='release'&&familiar?.2:1.15;
      score-=repeated*penalty;
      why.push(style==='glass'?'επιστροφή σε υλικό της αλυσίδας':'η πρόσφατη επανάληψη μειώνει την προτεραιότητα');
    }
    if(recent.length>=2 && g==='release' && familiar && mod(src.root-tonic)===7){
      score+=1.5;why.unshift('άφιξη στο κέντρο μετά τη διαδρομή της αλυσίδας');
    }
    if(inMode) why.push('νότες μέσα στον επιλεγμένο τρόπο');
    if(common) why.push(`${common} κοινές νότες`);
    if(!why.length)why.push('μικρή μετακίνηση φωνών');
    return {score,why:uniqueText(why).slice(0,4),inMode};
  }
  function uniqueText(xs){return [...new Set(xs)];}
  function candidates(src,opts={}) {
    const {style='takemitsu',tonic=0,mode='ionian',goal='suspension',limit=4,history=[]}=opts;
    let all=[], seen=new Map();
    function add(c){if(!c||c.pcs.every(p=>src.pcs.includes(p))&&src.pcs.length===c.pcs.length)return;
      const signature=c.pcs.join('_');
      const existing=seen.get(signature);
      const cmp=compare(src,c),meta=scoreCandidate(src,c,cmp,{style,tonic,mode,goal,history});
      c={...c,notes:c.source==='palette'?c.notes:voiceNear(src,c).notes,compared:cmp,...meta};
      c.id=`${c.source}:${c.root}:${c.quality}:${signature}`;
      c.explain=describe(src,c,cmp,goal,c.sourceLabel||'Μουσική σχέση');
      if(existing){if(c.score>existing.score){const at=all.indexOf(existing);all[at]=c;seen.set(signature,c);}}
      else {all.push(c);seen.set(signature,c);}
    }
    const land=Land.LANDSCAPES.find(x=>x.id===style);
    if(land){
      land.colors.forEach(color=>{const c=asTemplate(src,color,land.name);add(c);});
      land.progressions.forEach(p=>{
        if(!p.steps||p.steps.length<2)return;
        if(!(p.applies||['any']).includes('any') && !(p.applies||[]).includes(category(src.quality)))return;
        const [step,q] = p.steps[1]; const quality = q==='same'?src.quality : legacyQuality(q);
        if(!QUAL[quality])return;
        const c=chord(src.root+step,quality);
        c.source='progression';c.sourceLabel=`Πορεία · ${land.name}`;
        c.theory=p.why||p.name;c.orchestration='';c.path=p.name;add(c);
      });
    }
    if(src.quality==='major'||src.quality==='minor') {
      T.transformations(T.triad(src.root,src.quality)).forEach(x=>{
        const c=chord(x.to.root,x.to.quality);c.source='transform';c.sourceLabel=`${x.id} · ${x.title}`;
        c.transform=x.id;c.theory=x.detail;add(c);
      });
    }
    if(T.MODE[mode])T.chordDegrees(tonic,mode).forEach(d=>{
      if(!QUAL[d.quality])return;const c=chord(d.root,d.quality);
      c.source='degree';c.sourceLabel=`Βαθμίδα ${d.roman}`;c.theory=`${d.roman} στον ${T.MODE[mode].label}`;add(c);
    });
    [src.root,src.root+2,src.root+3,src.root+5,src.root+6,src.root+7,src.root+8,src.root+9,src.root+10,src.root+11].forEach(r=>{
      ['major','minor','maj7','m7','7','sus2','sus4','add9','dim','aug','m9','quartal','maj7sharp11','octColor'].forEach(q=>{
        const c=chord(r,q);c.source='color';c.sourceLabel='Αρμονική παραλλαγή';add(c);
      });
    });
    all.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label));
    // Diversify sources: prioritize one faithful landscape proposal and one theoretically related chord.
    const final=[],counts={};
    const pick=c=>{final.push(c);counts[c.source]=(counts[c.source]||0)+1;};
    if(land && style!=='free'){
      const styled=all.find(c=>['palette','progression'].includes(c.source));if(styled)pick(styled);
    }
    const theory=all.find(c=>['transform','degree'].includes(c.source)&&!final.includes(c));if(theory && final.length<limit)pick(theory);
    for(const c of all) {
      if(final.length>=limit)break;
      if(final.includes(c))continue;
      if((counts[c.source]||0)>=2)continue;
      pick(c);
    }
    return final.sort((a,b)=>b.score-a.score).slice(0,limit);
  }
  return {QUAL,GOALS,byGoal,chord,candidates,compare,nameNotes,scoreCandidate,asTemplate,voiceNear};
});
