const BASE="https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/";
const SOURCES={crates:"crates.json",keys:"keys.json",musicKits:"music_kits.json",stickers:"stickers.json",agents:"agents.json",patches:"patches.json",baseWeapons:"base_weapons.json",skins:"skins.json",inventory:"inventory.json"};
const imageOk=value=>typeof value==="string"&&/^https:\/\/(community\.akamai\.steamstatic\.com\/economy\/image\/|cdn\.steamstatic\.com\/apps\/730\/icons\/|raw\.githubusercontent\.com\/ByMykel\/counter-strike-image-tracker\/)/.test(value);
const number=value=>value===null||value===undefined||value===""?null:Number.isInteger(Number(value))&&Number(value)>0?Number(value):null;
const indexFromId=(value,prefix)=>{const match=String(value||"").match(new RegExp("^"+prefix+"-(\\d+)$"));return match?Number(match[1]):null};
const GLOVE_WEAPONS=new Set([4725,5027,5030,5031,5032,5033,5034,5035]);
const row=(id,name,category,extra={})=>({id:Number(id),name:String(name||"Unknown item"),category,catalogKey:extra.catalogKey||"def:"+id,...extra});
export async function loadOnlineCatalogue(fetcher=fetch){
 const entries=await Promise.all(Object.entries(SOURCES).map(async([key,file])=>{
  try{
   const response=await fetcher(BASE+file,{cache:"force-cache"});
   if(!response.ok)throw Error("Could not load "+file+" ("+response.status+")");
   const data=await response.json();
   if(key==="inventory"?(!data||typeof data!=="object"||Array.isArray(data)):!Array.isArray(data))throw Error("Unexpected data format in "+file);
   return [key,data];
  }catch(error){console.warn("Catalogue source unavailable:",file,error);return [key,[]]}
 }));
 const source=Object.fromEntries(entries),artwork={baseWeapons:{},crates:{},keys:{},musicKits:{},stickers:{},agents:{},patches:{}},skins={},items=[];
 const addArt=(target,key,item)=>{const image=item?.image;if(key!=null&&!target[String(key)]&&imageOk(image))target[String(key)]=image};
 const inventory=source.inventory||{};
 for(const [apiKey,mapKey] of [["crates","crates"],["keys","keys"],["music_kits","musicKits"],["stickers","stickers"],["agents","agents"],["patches","patches"]]){
  for(const [id,item] of Object.entries(inventory[apiKey]||{}))addArt(artwork[mapKey],id,item);
 }
 for(const item of source.baseWeapons){const id=number(item.def_index);addArt(artwork.baseWeapons,id,item)}
 for(const item of source.crates){const id=number(item.def_index??indexFromId(item.id,"crate"));addArt(artwork.crates,id,item);if(id!=null)items.push(row(id,item.name,"cases",{catalogKey:"def:"+id,containerType:item.type||"Container",artwork:artwork.crates[String(id)]|| (imageOk(item.image)?item.image:"")}))}
 for(const item of source.keys){const id=number(item.def_index??indexFromId(item.id,"key"));addArt(artwork.keys,id,item);if(id!=null)items.push(row(id,item.name,"keys",{catalogKey:"def:"+id,artwork:artwork.keys[String(id)]|| (imageOk(item.image)?item.image:"")}))}
 for(const item of source.agents){const id=number(item.def_index??indexFromId(item.id,"agent"));addArt(artwork.agents,id,item);if(id!=null)items.push(row(id,item.name,"agents",{catalogKey:"def:"+id,team:item.team||item.team_name||item.teamName||item.team_id||"",artwork:artwork.agents[String(id)]|| (imageOk(item.image)?item.image:"")}))}
 for(const item of source.musicKits){const kit=number(item.def_index??indexFromId(item.id,"music_kit"));addArt(artwork.musicKits,kit,item);if(kit!=null)items.push(row(1314,item.name,"music",{catalogKey:"music:"+kit,kitIndex:kit,defIndex:1314,artwork:artwork.musicKits[String(kit)]|| (imageOk(item.image)?item.image:"")}))}
 for(const item of source.stickers){const kit=number(item.def_index??indexFromId(item.id,"sticker"));addArt(artwork.stickers,kit,item);if(kit!=null)items.push(row(1209,item.name,"stickers",{catalogKey:"sticker:"+kit,kitIndex:kit,defIndex:1209,artwork:artwork.stickers[String(kit)]|| (imageOk(item.image)?item.image:"")}))}
 for(const item of source.patches){const id=number(item.def_index??indexFromId(item.id,"patch"));addArt(artwork.patches,id,item);if(id!=null)items.push(row(id,item.name,"patches",{catalogKey:"def:"+id,artwork:artwork.patches[String(id)]|| (imageOk(item.image)?item.image:"")}))}
 for(const item of source.skins){const weapon=number(item.weapon?.weapon_id),paint=number(item.paint_index);if(weapon==null||paint==null||!(item?.legacy_model===true||GLOVE_WEAPONS.has(weapon)))continue;const image=inventory.skins?.[String(weapon)]?.[String(paint)]?.image||item.image;if(imageOk(image))skins[weapon+":"+paint]=image}
 const unique=new Map();for(const item of items)unique.set(item.catalogKey,item);
 return {items:[...unique.values()],artwork,skins,legacySkins:source.skins.filter(item=>item?.legacy_model===true||GLOVE_WEAPONS.has(Number(item.weapon?.weapon_id))),counts:Object.fromEntries(Object.entries(artwork).map(([key,value])=>[key,Object.keys(value).length]))};
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
