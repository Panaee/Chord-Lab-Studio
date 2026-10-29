'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('chordDesktop',Object.freeze({
  platform:process.platform,
  hasMenu:true,
  exportPdf:(html,name)=>ipcRenderer.invoke('studio:export-pdf',html,name),
  onCommand:callback=>{ipcRenderer.removeAllListeners('studio:command');ipcRenderer.on('studio:command',(_event,command)=>callback(String(command)));}
}));
