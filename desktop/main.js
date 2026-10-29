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

const MENU={
  el:{about:'Σχετικά με το Chord Lab Studio',settings:'Ρυθμίσεις…',hide:'Απόκρυψη',hideOthers:'Απόκρυψη άλλων',showAll:'Εμφάνιση όλων',quit:'Τερματισμός',exit:'Έξοδος',
    file:'Αρχείο',new:'Νέα σύνθεση',open:'Άνοιγμα JSON…',save:'Αποθήκευση στη βιβλιοθήκη',saveJson:'Αντίγραφο JSON…',midi:'Εξαγωγή MIDI…',pdf:'Εξαγωγή PDF…',
    edit:'Επεξεργασία',undo:'Αναίρεση',redo:'Επαναφορά',cut:'Αποκοπή',copy:'Αντιγραφή',paste:'Επικόλληση',selectAll:'Επιλογή όλων',duplicate:'Διπλασιασμός βήματος',notes:'Νότες του βήματος',
    view:'Προβολή',compose:'Σύνθεση',analysis:'Ανάλυση',lab:'Εργαστήριο θεωρίας',full:'Πλήρης οθόνη',reset:'Πραγματικό μέγεθος',zoomIn:'Μεγέθυνση',zoomOut:'Σμίκρυνση',
    window:'Παράθυρο',minimize:'Ελαχιστοποίηση',zoom:'Ζουμ',front:'Όλα μπροστά',close:'Κλείσιμο',pdfTitle:'Εξαγωγή PDF'},
  en:{about:'About Chord Lab Studio',settings:'Settings…',hide:'Hide',hideOthers:'Hide Others',showAll:'Show All',quit:'Quit',exit:'Exit',
    file:'File',new:'New piece',open:'Open JSON…',save:'Save to library',saveJson:'JSON copy…',midi:'Export MIDI…',pdf:'Export PDF…',
    edit:'Edit',undo:'Undo',redo:'Redo',cut:'Cut',copy:'Copy',paste:'Paste',selectAll:'Select All',duplicate:'Duplicate step',notes:'Notes of the step',
    view:'View',compose:'Compose',analysis:'Analysis',lab:'Theory lab',full:'Full Screen',reset:'Actual Size',zoomIn:'Zoom In',zoomOut:'Zoom Out',
    window:'Window',minimize:'Minimise',zoom:'Zoom',front:'Bring All to Front',close:'Close',pdfTitle:'Export PDF'}
};
// Set from the system once ready; the window then sends the language the person chose.
let language='el';
function buildMenu(){
  const m=MENU[language],item=(label,command,accelerator)=>({label,accelerator,click:()=>send(command)});
  const template=[
    ...(mac?[{label:'Chord Lab Studio',submenu:[{role:'about',label:m.about},{type:'separator'},
      item(m.settings,'settings','Cmd+,'),{type:'separator'},{role:'hide',label:m.hide},{role:'hideOthers',label:m.hideOthers},{role:'unhide',label:m.showAll},{type:'separator'},{role:'quit',label:m.quit}]}]:[]),
    {label:m.file,submenu:[item(m.new,'new','CmdOrCtrl+N'),item(m.open,'open','CmdOrCtrl+O'),{type:'separator'},
      item(m.save,'save','CmdOrCtrl+S'),item(m.saveJson,'save-json','Shift+CmdOrCtrl+S'),{type:'separator'},
      item(m.midi,'export-midi','CmdOrCtrl+E'),item(m.pdf,'export-pdf','CmdOrCtrl+P'),
      ...(mac?[]:[{type:'separator'},{role:'quit',label:m.exit}])]},
    {label:m.edit,submenu:[item(m.undo,'undo','CmdOrCtrl+Z'),item(m.redo,'redo','Shift+CmdOrCtrl+Z'),{type:'separator'},
      {role:'cut',label:m.cut},{role:'copy',label:m.copy},{role:'paste',label:m.paste},{role:'selectAll',label:m.selectAll},{type:'separator'},
      item(m.duplicate,'duplicate','CmdOrCtrl+D'),item(m.notes,'edit')]},
    {label:m.view,submenu:[item(m.compose,'view-compose','CmdOrCtrl+1'),item(m.analysis,'view-analysis','CmdOrCtrl+2'),{type:'separator'},
      item(m.lab,'theory-lab','Shift+CmdOrCtrl+T'),{type:'separator'},{role:'togglefullscreen',label:m.full},
      {role:'resetZoom',label:m.reset},{role:'zoomIn',label:m.zoomIn},{role:'zoomOut',label:m.zoomOut}]},
    {label:m.window,submenu:[{role:'minimize',label:m.minimize},{role:'zoom',label:m.zoom},...(mac?[{type:'separator'},{role:'front',label:m.front}]:[{role:'close',label:m.close}])]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
ipcMain.on('studio:language',(event,lang)=>{
  if(!studio||event.sender!==studio.webContents)return;
  const next=lang==='en'?'en':'el';if(next===language)return;language=next;buildMenu();
});

const safeName=name=>{const base=String(name||'').replace(/[^a-z0-9.\-]/gi,'').slice(0,90);return /\.pdf$/i.test(base)?base:'chord-lab-'+new Date().toISOString().slice(0,10)+'.pdf';};
ipcMain.handle('studio:export-pdf',async(event,html,name)=>{
  if(!studio||event.sender!==studio.webContents||event.senderFrame!==studio.webContents.mainFrame)throw Error('Μη εξουσιοδοτημένη εξαγωγή.');
  if(typeof html!=='string'||html.length>4000000||!html.startsWith('<!doctype html>'))throw Error('Μη έγκυρη αναφορά.');
  const choice=await dialog.showSaveDialog(studio,{title:MENU[language].pdfTitle,defaultPath:path.join(app.getPath('documents'),safeName(name)),filters:[{name:'PDF',extensions:['pdf']}]});
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
  language=/^el\b/i.test(app.getLocale()||'')?'el':'en';
  buildMenu();
  createWindow();
});
app.on('window-all-closed',()=>{if(!mac)app.quit();});
app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
