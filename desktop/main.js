'use strict';
// Offline desktop host for Chord Lab Studio. The renderer runs without Node
// privileges; the menu sends named commands, the PDF export is the only IPC.
const {app,BrowserWindow,ipcMain,dialog,shell,session,Menu}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const entry=path.resolve(__dirname,'../index.html');
const mac=process.platform==='darwin';
let studio;

function send(command){if(studio&&!studio.isDestroyed())studio.webContents.send('studio:command',command);}
function createWindow(){
  studio=new BrowserWindow({width:1440,height:900,minWidth:980,minHeight:660,
    title:'Chord Lab Studio',backgroundColor:'#f3f1ea',show:false,
    ...(mac?{titleBarStyle:'hiddenInset',trafficLightPosition:{x:18,y:20}}:{}),
    icon:path.resolve(__dirname,'../assets/icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  studio.loadFile(entry);
  studio.once('ready-to-show',()=>studio.show());
  studio.webContents.setWindowOpenHandler(({url})=>{
    if(/^https?:\/\//.test(url))shell.openExternal(url);
    // The browser fallback for the PDF opens a blank page; the desktop app never needs it.
    return {action:'deny'};
  });
  studio.webContents.on('will-navigate',(event,url)=>{if(url!==pathToFileURL(entry).href)event.preventDefault();});
  studio.on('closed',()=>{studio=null;});
}

function buildMenu(){
  const item=(label,command,accelerator)=>({label,accelerator,click:()=>send(command)});
  const template=[
    ...(mac?[{label:'Chord Lab Studio',submenu:[{role:'about',label:'Σχετικά με το Chord Lab Studio'},{type:'separator'},
      item('Ρυθμίσεις…','settings','Cmd+,'),{type:'separator'},{role:'hide',label:'Απόκρυψη'},{role:'hideOthers',label:'Απόκρυψη άλλων'},{role:'unhide'},{type:'separator'},{role:'quit',label:'Τερματισμός'}]}]:[]),
    {label:'Αρχείο',submenu:[item('Νέα σύνθεση','new','CmdOrCtrl+N'),item('Άνοιγμα JSON…','open','CmdOrCtrl+O'),{type:'separator'},
      item('Αποθήκευση στη βιβλιοθήκη','save','CmdOrCtrl+S'),item('Αντίγραφο JSON…','save-json','Shift+CmdOrCtrl+S'),{type:'separator'},
      item('Εξαγωγή MIDI…','export-midi','CmdOrCtrl+E'),item('PDF για reMarkable…','export-pdf','CmdOrCtrl+P'),
      ...(mac?[]:[{type:'separator'},{role:'quit',label:'Έξοδος'}])]},
    {label:'Επεξεργασία',submenu:[item('Αναίρεση','undo','CmdOrCtrl+Z'),item('Επαναφορά','redo','Shift+CmdOrCtrl+Z'),{type:'separator'},
      {role:'cut',label:'Αποκοπή'},{role:'copy',label:'Αντιγραφή'},{role:'paste',label:'Επικόλληση'},{role:'selectAll',label:'Επιλογή όλων'},{type:'separator'},
      item('Διπλασιασμός βήματος','duplicate','CmdOrCtrl+D'),item('Νότες του βήματος','edit')]},
    {label:'Προβολή',submenu:[item('Σύνθεση','view-compose','CmdOrCtrl+1'),item('Ανάλυση','view-analysis','CmdOrCtrl+2'),{type:'separator'},
      item('Εργαστήριο θεωρίας','theory-lab','Shift+CmdOrCtrl+T'),{type:'separator'},{role:'togglefullscreen',label:'Πλήρης οθόνη'},
      {role:'resetZoom',label:'Πραγματικό μέγεθος'},{role:'zoomIn',label:'Μεγέθυνση'},{role:'zoomOut',label:'Σμίκρυνση'}]},
    {label:'Παράθυρο',submenu:[{role:'minimize',label:'Ελαχιστοποίηση'},{role:'zoom',label:'Ζουμ'},...(mac?[{type:'separator'},{role:'front',label:'Όλα μπροστά'}]:[{role:'close',label:'Κλείσιμο'}])]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const safeName=name=>{const base=String(name||'').replace(/[^a-z0-9.\-]/gi,'').slice(0,90);return /\.pdf$/i.test(base)?base:'chord-lab-'+new Date().toISOString().slice(0,10)+'.pdf';};
ipcMain.handle('studio:export-pdf',async(event,html,name)=>{
  if(!studio||event.sender!==studio.webContents||event.senderFrame!==studio.webContents.mainFrame)throw Error('Μη εξουσιοδοτημένη εξαγωγή.');
  if(typeof html!=='string'||html.length>4000000||!html.startsWith('<!doctype html>'))throw Error('Μη έγκυρη αναφορά.');
  const choice=await dialog.showSaveDialog(studio,{title:'PDF για reMarkable',defaultPath:path.join(app.getPath('documents'),safeName(name)),filters:[{name:'PDF',extensions:['pdf']}]});
  if(choice.canceled||!choice.filePath)return {canceled:true};
  const report=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,javascript:false}});
  report.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  try{
    await report.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
    // The page size (157×210 mm) and margins come from the report's @page rule.
    const pdf=await report.webContents.printToPDF({printBackground:true,preferCSSPageSize:true});
    await fs.writeFile(choice.filePath,pdf);
    return {canceled:false,path:choice.filePath};
  }finally{report.destroy();}
});

app.setName('Chord Lab Studio');
app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===studio?.webContents&&['midi','midiSysex'].includes(permission)));
  session.defaultSession.setPermissionCheckHandler((contents,permission)=>contents===studio?.webContents&&permission==='midi');
  buildMenu();
  createWindow();
});
app.on('window-all-closed',()=>{if(!mac)app.quit();});
app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
