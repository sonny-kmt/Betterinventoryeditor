// Binary WebSocket protocol implemented by mikkokko/csgo_gc (protocol v1).
export const WS_URL = "ws://127.0.0.1:13001";
export const CMD = Object.freeze({ CREATE:0, MODIFY:1, DESTROY:2, SET_ID:3, SNAPSHOT:4, PROTOCOL:5 });
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal:true });
const UINT32_MAX = 0xffffffff;
function uint32(value, label="value") {
  const n=Number(value);
  if(!Number.isInteger(n)||n<0||n>UINT32_MAX) throw new Error(label+" must be an unsigned 32-bit integer.");
  return n;
}
class Writer {
  constructor(size){this.buffer=new ArrayBuffer(size);this.view=new DataView(this.buffer);this.offset=0}
  u32(n){this.view.setUint32(this.offset,uint32(n),true);this.offset+=4}
  bytes(b){new Uint8Array(this.buffer,this.offset,b.length).set(b);this.offset+=b.length}
  finish(){return this.buffer}
}
class Reader {
  constructor(buffer){if(!(buffer instanceof ArrayBuffer))throw Error("Expected a binary GC message.");this.view=new DataView(buffer);this.offset=0}
  remaining(){return this.view.byteLength-this.offset}
  need(n){if(n>this.remaining())throw Error("Truncated inventory message.")}
  u32(){this.need(4);const n=this.view.getUint32(this.offset,true);this.offset+=4;return n}
  string(){const n=this.u32();this.need(n);const s=decoder.decode(new Uint8Array(this.view.buffer,this.view.byteOffset+this.offset,n));this.offset+=n;return s}
  count(minimum){const n=this.u32();if(n>Math.floor(this.remaining()/minimum))throw Error("Invalid inventory message count.");return n}
}
const fields=["lowId","inventory","def_index","level","quality","flags","origin","in_use","rarity"];
export function parseMessage(buffer){
  const r=new Reader(buffer),commands=[];
  while(r.remaining()){
    const type=r.u32();
    if(type===CMD.PROTOCOL){if(commands.length)throw Error("Protocol information must be its own message.");commands.push({type:"protocol",version:r.u32()});if(r.remaining())throw Error("Unexpected bytes after protocol information.");}
    else if(type===CMD.SNAPSHOT){if(commands.length)throw Error("Snapshot marker must start a message.");commands.push({type:"snapshot"});}
    else if(type===CMD.SET_ID)commands.push({type:"setId",requestId:r.u32(),lowId:r.u32()});
    else if(type===CMD.DESTROY)commands.push({type:"destroy",lowId:r.u32()});
    else if(type===CMD.CREATE||type===CMD.MODIFY){
      const item={};for(const f of fields)item[f]=r.u32();
      item.attributes=[];for(let i=0,n=r.count(8);i<n;i++)item.attributes.push({def_index:r.u32(),value:r.string()});
      item.equipped_state=[];for(let i=0,n=r.count(8);i<n;i++)item.equipped_state.push({class_id:r.u32(),slot_id:r.u32()});
      commands.push({type:type===CMD.CREATE?"create":"modify",item});
    } else throw Error("Unknown GC command "+type+".");
  }
  return commands;
}
export function encodeItem(type,item,wireId=item.lowId){
  if(type!==CMD.CREATE&&type!==CMD.MODIFY)throw Error("Invalid item command.");
  const attrs=item.attributes||[],equips=item.equipped_state||[];
  const encoded=attrs.map(a=>({id:uint32(a.def_index,"Attribute ID"),bytes:encoder.encode(String(a.value??""))}));
  const size=4+fields.length*4+4+encoded.reduce((n,a)=>n+8+a.bytes.length,0)+4+equips.length*8;
  const w=new Writer(size);w.u32(type);w.u32(wireId);
  for(const f of fields.slice(1))w.u32(item[f]??0);
  w.u32(encoded.length);for(const a of encoded){w.u32(a.id);w.u32(a.bytes.length);w.bytes(a.bytes)}
  w.u32(equips.length);for(const e of equips){w.u32(e.class_id);w.u32(e.slot_id)}
  return w.finish();
}
export const encodeCreate=(item,requestId)=>encodeItem(CMD.CREATE,item,uint32(requestId,"Request ID"));
export const encodeModify=item=>encodeItem(CMD.MODIFY,item,item.lowId);
export function encodeDestroy(lowId){const w=new Writer(8);w.u32(CMD.DESTROY);w.u32(lowId);return w.finish()}
export class GCConnection extends EventTarget {
  constructor(){super();this.ws=null;this.items=new Map();this.ready=false;this.version=null;this.nextRequestId=1;this.pendingCreate=null;this.pendingDelete=null;this.createQueue=[];this.batchActive=false;this.createTimer=null;this.deleteTimer=null;this.timeoutTimer=null;this.status="Disconnected"}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}))}
  connect(){
    this.disconnect(false);this.status="Connecting";this.emit("status",this.status);
    let ws;try{ws=new WebSocket(WS_URL)}catch(e){this.fail(e.message);return}
    this.ws=ws;ws.binaryType="arraybuffer";
    this.timeoutTimer=setTimeout(()=>{if(this.ws===ws&&!this.ready)this.fail("Timed out waiting for the inventory snapshot. Check the game and GC server.")},10000);
    ws.onopen=()=>{if(this.ws===ws){this.status="Waiting for inventory";this.emit("status",this.status)}};
    ws.onmessage=e=>{if(this.ws!==ws)return;try{this.receive(parseMessage(e.data))}catch(err){this.fail(err.message)}};
    ws.onerror=()=>{if(this.ws===ws)this.fail("Connection failed. Check that csgo_gc is running and inventory_editor_origin matches this website exactly.")};
    ws.onclose=e=>{if(this.ws===ws){this.clearTimers();this.ws=null;this.ready=false;this.items.clear();this.pendingCreate=null;this.pendingDelete=null;this.createQueue=[];this.batchActive=false;this.status="Disconnected";this.emit("status",this.status);this.emit("close",{code:e.code})}};
  }
  receive(commands){
    if(this.version===null){if(commands.length!==1||commands[0].type!=="protocol")throw Error("GC did not send protocol information.");if(commands[0].version!==1)throw Error("Unsupported GC protocol version "+commands[0].version+".");this.version=1;return}
    const snapshot=commands[0]?.type==="snapshot";
    if(!this.ready&&!snapshot)throw Error("Expected the initial inventory snapshot.");
    if(snapshot){this.items=new Map();for(const c of commands.slice(1)){if(c.type!=="create")throw Error("Invalid command in inventory snapshot.");this.items.set(c.item.lowId,c.item)}this.ready=true;clearTimeout(this.timeoutTimer);this.status="Connected";this.emit("snapshot",[...this.items.values()]);this.emit("status",this.status);return}
    for(const c of commands){
      if(c.type==="create"||c.type==="modify")this.items.set(c.item.lowId,c.item);
      else if(c.type==="destroy")this.items.delete(c.lowId);
      else if(c.type==="setId"&&this.pendingCreate?.requestId===c.requestId)this.pendingCreate.assignedId=c.lowId;
    }
    if(this.pendingCreate&&this.pendingCreate.assignedId!=null&&this.items.has(this.pendingCreate.assignedId)){
      const completed=this.pendingCreate;clearTimeout(this.createTimer);this.emit("created",{requestId:completed.requestId,lowId:completed.assignedId});this.pendingCreate=null;if(completed.batch)this.pumpCreateQueue();
    }
    if(this.pendingDelete&&!this.items.has(this.pendingDelete.lowId)){
      clearTimeout(this.deleteTimer);this.emit("deleted",{lowId:this.pendingDelete.lowId});this.pendingDelete=null;
    }
    this.emit("change",[...this.items.values()]);
  }
  create(item){
    if(!this.ready||this.ws?.readyState!==WebSocket.OPEN||this.pendingCreate||this.pendingDelete||this.batchActive||this.createQueue.length)throw Error("Wait for a synchronized connection before adding an item.");
    const requestId=this.nextRequestId++;this.pendingCreate={requestId,assignedId:null,batch:false};this.ws.send(encodeCreate(item,requestId));
    this.createTimer=setTimeout(()=>{if(this.pendingCreate?.requestId===requestId){this.emit("uncertain",{action:"create",requestId});this.pendingCreate=null}},10000);return requestId;
  }
  createBatch(items){
    if(!Array.isArray(items)||!items.length)throw Error("A batch must contain at least one item.");
    if(!this.ready||this.ws?.readyState!==WebSocket.OPEN||this.pendingCreate||this.pendingDelete||this.batchActive)throw Error("Wait for a synchronized connection before adding items.");
    this.createQueue=items.slice();this.batchActive=true;this.pumpCreateQueue();return items.length;
  }
  pumpCreateQueue(){
    if(!this.batchActive||this.pendingCreate)return;
    if(!this.createQueue.length){this.batchActive=false;this.emit("batchComplete",{});return}
    const item=this.createQueue.shift(),requestId=this.nextRequestId++;
    this.pendingCreate={requestId,assignedId:null,batch:true};this.ws.send(encodeCreate(item,requestId));
    this.createTimer=setTimeout(()=>{if(this.pendingCreate?.requestId===requestId){const remaining=this.createQueue.length;this.createQueue=[];this.pendingCreate=null;this.batchActive=false;this.emit("uncertain",{action:"create",requestId,batch:true,remaining})}},10000);
  }
  modify(item){if(!this.ready||this.ws?.readyState!==WebSocket.OPEN)throw Error("Not connected to the GC.");this.ws.send(encodeModify(item))}
  destroy(lowId){
    if(!this.ready||this.ws?.readyState!==WebSocket.OPEN||this.pendingCreate||this.pendingDelete||this.batchActive||this.createQueue.length||!this.items.has(lowId))throw Error("Cannot remove this item until the live inventory is synchronized.");
    this.pendingDelete={lowId};this.ws.send(encodeDestroy(lowId));
    this.deleteTimer=setTimeout(()=>{if(this.pendingDelete?.lowId===lowId){this.emit("uncertain",{action:"delete",lowId});this.pendingDelete=null}},10000);
  }
  clearTimers(){clearTimeout(this.timeoutTimer);clearTimeout(this.createTimer);clearTimeout(this.deleteTimer)}
  fail(message){this.emit("error",message);this.disconnect();this.status="Error";this.emit("status",this.status)}
  disconnect(close=true){this.clearTimers();const ws=this.ws;this.ws=null;this.ready=false;this.version=null;this.items.clear();this.pendingCreate=null;this.pendingDelete=null;this.createQueue=[];this.batchActive=false;if(close&&ws&&ws.readyState<2)ws.close();if(close){this.status="Disconnected";this.emit("status",this.status)}}
  get connected(){return this.ready&&this.ws?.readyState===WebSocket.OPEN}
}
