!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).voiceCallPluginHelper=e()}(this,(function(){"use strict";const t={7:"g711a",8:"g711u"};class e{constructor(){this.cache=[],this.dataLength=0}push(t){this.cache.push(t),this.dataLength+=t.length}download(e){const{cache:n}=this,o=new Uint8Array(this.dataLength);let a=0;n.forEach((t=>{o.set(t,a),a+=t.length}));const c=new Blob([o]),s=URL.createObjectURL(c),h=document.createElement("a");h.href=s,h.download=`${Math.random().toString(32).slice(2)}.${t[e]}`,h.click(),setTimeout((()=>{URL.revokeObjectURL(s)}),50)}clear(){this.cache.length=0,this.dataLength=0}}return function(t){const n=new e;t.on("data",(t=>{n.push(t.data)})),t.on("stop",(()=>{n.download(t.opts.formatFlag),n.clear()}))}}));