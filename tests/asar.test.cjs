/* The asar packer: an independent reader parses the archive the way Electron
   does and finds every file intact, with matching integrity hashes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'asar-')),'app.asar');
const printed=execFileSync(process.execPath,[path.join(root,'installer/make-asar.cjs'),out],{encoding:'utf8'}).trim();
const buf=fs.readFileSync(out);
assert.equal(buf.readUInt32LE(0),4);
const headerSize=buf.readUInt32LE(4);
const payload=buf.readUInt32LE(8),len=buf.readInt32LE(12);
assert.equal(payload+4,headerSize);
const json=buf.subarray(16,16+len).toString('utf8');
assert.equal(crypto.createHash('sha256').update(json).digest('hex'),printed,'printed hash is the header hash');
const header=JSON.parse(json),base=8+headerSize;
let count=0;
(function check(node,rel){
  for(const [name,entry] of Object.entries(node.files)){
    const p=path.join(rel,name);
    if(entry.files){check(entry,p);continue;}
    const data=buf.subarray(base+Number(entry.offset),base+Number(entry.offset)+entry.size);
    assert.deepEqual(data,fs.readFileSync(path.join(root,p)),p);
    assert.equal(entry.integrity.hash,crypto.createHash('sha256').update(data).digest('hex'),p);
    count++;
  }
})(header,'');
for(const p of ['index.html','package.json','desktop/main.js','desktop/preload.js','src/studio.js','src/next-engine.js','legacy/index.html','assets/fonts/literata-greek-wght-normal.woff2'])
  assert(p.split('/').reduce((n,k)=>n&&(n.files?n.files[k]:null),header),p+' packed');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'))).main,'desktop/main.js');
console.log(`asar: ${count} files, header hash and per-file integrity verified by an independent reader`);
