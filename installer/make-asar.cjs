/* Packs the app into an Electron asar archive without dependencies, with the
   per-file integrity blocks and the header hash Electron checks when asar
   integrity validation is on. Usage: node installer/make-asar.cjs <out.asar>
   Prints the header SHA-256 (for ElectronAsarIntegrity in Info.plist). */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const include=['index.html','package.json','src','legacy','assets','desktop'];
const BLOCK=4*1024*1024;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

const files=[];let offset=0;
function walk(rel){
  const abs=path.join(root,rel),st=fs.statSync(abs);
  if(st.isDirectory()){const node={files:{}};for(const name of fs.readdirSync(abs).sort()){if(name==='.DS_Store'||name.startsWith('._'))continue;node.files[name]=walk(path.join(rel,name));}return node;}
  const data=fs.readFileSync(abs),blocks=[];
  for(let i=0;i<data.length;i+=BLOCK)blocks.push(sha(data.subarray(i,i+BLOCK)));
  if(!blocks.length)blocks.push(sha(Buffer.alloc(0)));
  const entry={size:data.length,offset:String(offset),integrity:{algorithm:'SHA256',hash:sha(data),blockSize:BLOCK,blocks}};
  files.push(data);offset+=data.length;return entry;
}
const header={files:{}};
for(const name of include)header.files[name]=walk(name);
const json=JSON.stringify(header);
// Chromium Pickle: [payload size][string length][string][padding to 4].
const str=Buffer.from(json,'utf8'),pad=(4-(str.length%4))%4;
const headerPickle=Buffer.alloc(8+str.length+pad);
headerPickle.writeUInt32LE(4+str.length+pad,0);headerPickle.writeInt32LE(str.length,4);str.copy(headerPickle,8);
const sizePickle=Buffer.alloc(8);sizePickle.writeUInt32LE(4,0);sizePickle.writeUInt32LE(headerPickle.length,4);
const out=process.argv[2]||path.join(root,'app.asar');
fs.writeFileSync(out,Buffer.concat([sizePickle,headerPickle,...files]));
process.stdout.write(sha(str)+'\n');
