import test from "node:test";
import assert from "node:assert/strict";
import {CMD,encodeItem,parseMessage,encodeDestroy,GCConnection} from "./gc.js";
const sample={lowId:42,inventory:1,def_index:507,level:1,quality:99,flags:0,origin:24,in_use:0,rarity:6,attributes:[{def_index:6,value:"38.000000"},{def_index:7,value:"41.000000"}],equipped_state:[{class_id:3,slot_id:2}]};
test("GC item payload round trips",()=>{const commands=parseMessage(encodeItem(CMD.CREATE,sample,7));assert.equal(commands[0].type,"create");assert.equal(commands[0].item.lowId,7);assert.equal(commands[0].item.def_index,507);assert.deepEqual(commands[0].item.attributes,sample.attributes);assert.deepEqual(commands[0].item.equipped_state,sample.equipped_state)});
test("GC destroy payload uses little-endian uint32",()=>{const commands=parseMessage(encodeDestroy(123));assert.deepEqual(commands,[{type:"destroy",lowId:123}])});
test("GC snapshot marker is parsed",()=>{const a=new Uint8Array(encodeItem(CMD.CREATE,sample,42));const b=new Uint8Array(4+a.length);new DataView(b.buffer).setUint32(0,CMD.SNAPSHOT,true);b.set(a,4);const commands=parseMessage(b.buffer);assert.equal(commands[0].type,"snapshot");assert.equal(commands[1].item.lowId,42)});

test("live create batches send one request at a time and await each assigned ID",()=>{
  const originalWebSocket=globalThis.WebSocket;
  const originalCustomEvent=globalThis.CustomEvent;
  class MockWebSocket{static OPEN=1;constructor(){this.readyState=1;this.sent=[]}send(data){this.sent.push(data)}close(){this.readyState=3}}
  if(!globalThis.CustomEvent)globalThis.CustomEvent=class CustomEvent extends Event{constructor(type,init={}){super(type);this.detail=init.detail}};
  globalThis.WebSocket=MockWebSocket;
  const connection=new GCConnection(),socket=new MockWebSocket();
  connection.ws=socket;connection.ready=true;connection.version=1;
  let completed=false;connection.addEventListener("batchComplete",()=>{completed=true});
  try{
    assert.equal(connection.createBatch([sample,sample]),2);
    assert.equal(socket.sent.length,1);
    const firstRequest=parseMessage(socket.sent[0])[0].item.lowId;
    connection.receive([{type:"setId",requestId:firstRequest,lowId:101},{type:"create",item:{...sample,lowId:101}}]);
    assert.equal(socket.sent.length,2);
    assert.equal(completed,false);
    const secondRequest=parseMessage(socket.sent[1])[0].item.lowId;
    connection.receive([{type:"setId",requestId:secondRequest,lowId:102},{type:"create",item:{...sample,lowId:102}}]);
    assert.equal(completed,true);
    assert.equal(connection.items.has(101),true);
    assert.equal(connection.items.has(102),true);
    assert.equal(connection.batchActive,false);
  }finally{
    connection.disconnect(false);
    if(originalWebSocket===undefined)delete globalThis.WebSocket;else globalThis.WebSocket=originalWebSocket;
    if(originalCustomEvent===undefined)delete globalThis.CustomEvent;else globalThis.CustomEvent=originalCustomEvent;
  }
});
