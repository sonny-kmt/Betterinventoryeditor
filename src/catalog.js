const BASE="https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/";
const SOURCES={crates:"crates.json",keys:"keys.json",musicKits:"music_kits.json",stickers:"stickers.json",agents:"agents.json",patches:"patches.json",baseWeapons:"base_weapons.json",skins:"skins.json"};
const imageOk=value=>typeof value==="string"&&/^https:\/\/(community\.akamai\.steamstatic\.com\/economy\/image\/|cdn\.steamstatic\.com\/apps\/730\/icons\/)/.test(value);
const number=value=>Number.isInteger(Number(value))?Number(value):null;
const indexFromId=(value,prefix)=>{const match=String(value||"").match(new RegExp("^"+prefix+"-(\\d+)$"));return match?Number(match[1]):null};
const row=(id,name,category,extra={})=>({id:Number(id),name:String(name||"Unknown item"),category,catalogKey:extra.catalogKey||"def:"+id,...extra});
export async function loadOnlineCatalogue(fetcher=fetch){
 const entries=await Promise.all(Object.entries(SOURCES).map(async([key,file])=>{
  try{
   const response=await fetcher(BASE+file,{cache:"force-cache"});
   if(!response.ok)throw Error("Could not load "+file+" ("+response.status+")");
   const data=await response.json();
   if(!Array.isArray(data))throw Error("Unexpected data format in "+file);
   return [key,data];
  }catch(error){console.warn("Catalogue source unavailable:",file,error);return [key,[]]}
 }));
 const source=Object.fromEntries(entries),artwork={baseWeapons:{},crates:{},keys:{},musicKits:{},stickers:{},agents:{},patches:{}},skins={},items=[];
 const addArt=(target,key,item)=>{const image=item?.image;if(key!=null&&imageOk(image))target[String(key)]=image};
 for(const item of source.baseWeapons){const id=number(item.def_index);addArt(artwork.baseWeapons,id,item)}
 for(const item of source.crates){const id=number(item.def_index??indexFromId(item.id,"crate"));addArt(artwork.crates,id,item);if(id!=null)items.push(row(id,item.name,"cases",{catalogKey:"def:"+id,containerType:item.type||"Container",artwork:imageOk(item.image)?item.image:""}))}
 for(const item of source.keys){const id=number(item.def_index??indexFromId(item.id,"key"));addArt(artwork.keys,id,item);if(id!=null)items.push(row(id,item.name,"keys",{catalogKey:"def:"+id,artwork:imageOk(item.image)?item.image:""}))}
 for(const item of source.agents){const id=number(item.def_index??indexFromId(item.id,"agent"));addArt(artwork.agents,id,item);if(id!=null)items.push(row(id,item.name,"agents",{catalogKey:"def:"+id,artwork:imageOk(item.image)?item.image:""}))}
 for(const item of source.musicKits){const kit=number(item.def_index??indexFromId(item.id,"music_kit"));addArt(artwork.musicKits,kit,item);if(kit!=null)items.push(row(1314,item.name,"music",{catalogKey:"music:"+kit,kitIndex:kit,defIndex:1314,artwork:imageOk(item.image)?item.image:""}))}
 for(const item of source.stickers){const kit=number(item.def_index??indexFromId(item.id,"sticker"));addArt(artwork.stickers,kit,item);if(kit!=null)items.push(row(1209,item.name,"stickers",{catalogKey:"sticker:"+kit,kitIndex:kit,defIndex:1209,artwork:imageOk(item.image)?item.image:""}))}
 for(const item of source.patches){const id=number(item.def_index??indexFromId(item.id,"patch"));addArt(artwork.patches,id,item);if(id!=null)items.push(row(id,item.name,"patches",{catalogKey:"def:"+id,artwork:imageOk(item.image)?item.image:""}))}
 for(const item of source.skins){if(item?.legacy_model!==true)continue;const weapon=number(item.weapon?.weapon_id),paint=number(item.paint_index);if(weapon==null||paint==null)continue;addArt(skins,weapon+":"+paint,item)}
 const unique=new Map();for(const item of items)unique.set(item.catalogKey,item);
 return {items:[...unique.values()],artwork,skins,counts:Object.fromEntries(Object.entries(artwork).map(([key,value])=>[key,Object.keys(value).length]))};
}
export function inventoryArtwork(item,attributes,library){
 const category=item?.category,def=String(item?.def_index??item?.id??""),attrs=new Map((attributes||[]).map(a=>[Number(a.def_index),a.value]));
 if(["rifles","snipers","smgs","shotguns","machineguns","pistols","knives","gloves"].includes(category)){
  const paint=Number(attrs.get(6)||0);
  if(paint>0&&library.skins?.[def+":"+paint])return library.skins[def+":"+paint];
  return library.artwork?.baseWeapons?.[def]||"";
 }
 const kitAttr=category==="music"?166:category==="stickers"?113:null;
 if(kitAttr!=null){const kit=Number(attrs.get(kitAttr)||0);const map=category==="music"?library.artwork?.musicKits:library.artwork?.stickers;return map?.[String(kit)]||""}
 const map={cases:"crates",keys:"keys",agents:"agents",patches:"patches"}[category];
 if(map)return library.artwork?.[map]?.[def]||"";
 return "";
}
