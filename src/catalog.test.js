import test from "node:test";
import assert from "node:assert/strict";
import {loadOnlineCatalogue,inventoryArtwork} from "./catalog.js";
const steam="https://community.akamai.steamstatic.com/economy/image/test";
const fixtures={
 "crates.json":[{id:"crate-4001",def_index:"4001",name:"CS:GO Weapon Case",type:"Case",image:steam+"/case"},{id:"crate-4288",def_index:"4288",name:"Dust II Souvenir Package",type:"Souvenir Package",image:steam+"/souvenir"}],
 "keys.json":[{id:"key-1203",def_index:"1203",name:"CS:GO Case Key",image:steam+"/key"}],
 "music_kits.json":[{id:"music_kit-1",def_index:"1",name:"Music Kit | Test",image:steam+"/music"}],
 "stickers.json":[{id:"sticker-100",def_index:"100",name:"Sticker | Test",image:steam+"/sticker"}],
 "agents.json":[{id:"agent-4613",def_index:"4613",name:"Agent | Test",image:steam+"/agent"}],
 "patches.json":[{id:"patch-4609",def_index:"4609",name:"Patch | Test",image:steam+"/patch"}],
 "base_weapons.json":[{id:"base_weapon-weapon_deagle",def_index:1,name:"Desert Eagle",image:steam+"/weapon"}],
 "skins.json":[{id:"skin-test",legacy_model:true,weapon:{weapon_id:1},paint_index:"5",name:"Desert Eagle | Test",image:steam+"/skin"},{id:"skin-new",legacy_model:false,weapon:{weapon_id:1},paint_index:"6",name:"New model",image:steam+"/new"}],
 "inventory.json":{crates:{"4001":{image:steam+"/case"},"4288":{image:steam+"/souvenir"}},keys:{"1203":{image:steam+"/key"}},music_kits:{"1":{image:steam+"/music"}},stickers:{"100":{image:steam+"/sticker"}},agents:{"4613":{image:steam+"/agent"}},patches:{"4609":{image:steam+"/patch"}},skins:{"1":{"5":{image:steam+"/skin"}}}}
};
const mockFetch=async url=>({ok:true,json:async()=>fixtures[url.split("/").pop()]});
test("online catalogue includes cases, souvenir packages, keys, music kits, stickers and agents",async()=>{
 const data=await loadOnlineCatalogue(mockFetch);
 const categories=data.items.map(x=>x.category);
 for(const category of ["cases","keys","music","stickers","agents"])assert.ok(categories.includes(category),category);
 assert.ok(data.items.some(x=>x.containerType==="Souvenir Package"));
 assert.equal(data.items.find(x=>x.name==="Music Kit | Test").defIndex,1314);
 assert.equal(data.items.find(x=>x.name==="Sticker | Test").defIndex,1209);
});
test("weapon and music-kit artwork use separate indexes and never collide",async()=>{
 const data=await loadOnlineCatalogue(mockFetch);
 assert.equal(inventoryArtwork({def_index:1,category:"pistols"},[],data),steam+"/weapon");
 assert.equal(inventoryArtwork({def_index:1314,category:"music"},[{def_index:166,value:"1"}],data),steam+"/music");
});
test("legacy skin artwork is selected by weapon definition and paint kit",async()=>{
 const data=await loadOnlineCatalogue(mockFetch);
 assert.equal(inventoryArtwork({def_index:1,category:"pistols"},[{def_index:6,value:"5"}],data),steam+"/skin");
 assert.equal(data.skins["1:6"],undefined);
});
test("stickers and cases resolve through their own category maps",async()=>{
 const data=await loadOnlineCatalogue(mockFetch);
 assert.equal(inventoryArtwork({def_index:1209,category:"stickers"},[{def_index:113,value:"100"}],data),steam+"/sticker");
 assert.equal(inventoryArtwork({def_index:4288,category:"cases"},[],data),steam+"/souvenir");
});
