import {parseKV,get} from "./kv.js";

const QUALITY=Object.freeze({normal:0,genuine:1,vintage:2,unusual:3,unique:4,community:5,developer:6,selfmade:7,customized:8,strange:9,completed:10,tournament:12,trophy:13});
const RARITY=Object.freeze({default:0,common:1,uncommon:2,rare:3,mythical:4,legendary:5,ancient:6,immortal:7});
const STOP=new Set(["csgo","case","crate","key","weapon","item","the","of","and","a","an","pack","capsule","container"]);
function mergePairs(base,override){
  const out=(base||[]).map(([k,v])=>[k,Array.isArray(v)?mergePairs(v,[]):v]);
  for(const [key,value] of override||[]){const existing=out.find(x=>x[0]===key);if(!existing)out.push([key,Array.isArray(value)?mergePairs(value,[]):value]);else if(Array.isArray(existing[1])&&Array.isArray(value))existing[1]=mergePairs(existing[1],value);else existing[1]=value;}
  return out;
}
function resolvePrefab(item,prefabs,seen=new Set()){
  let result=[];const names=String(get(item,"prefab")||"").split(/\s+/).filter(Boolean);
  for(const name of names){if(seen.has(name))continue;const prefab=get(prefabs,name);if(prefab){const next=new Set(seen);next.add(name);result=mergePairs(result,resolvePrefab(prefab,prefabs,next));}}
  return mergePairs(result,item);
}
function categoryFor(className,itemNameToken,prefab,itemType){
  const text=(className+" "+itemNameToken+" "+prefab+" "+itemType).toLowerCase();
  if(/key/.test(text))return "keys";
  if(/glove/.test(text))return "gloves";
  if(/knife/.test(className.toLowerCase()))return "knives";
  if(/customplayer|agent/.test(text))return "agents";
  if(/crate|case|capsule|package|container|supply_crate/.test(text))return "cases";
  if(/sticker/.test(text))return "stickers";
  if(/patch/.test(text))return "patches";
  if(/music/.test(text))return "music";
  if(/sniper|awp|ssg08|scar20|g3sg1/.test(className.toLowerCase()))return "snipers";
  if(/rifle|ak47|m4a1|galil|famas|aug|sg556/.test(className.toLowerCase()))return "rifles";
  if(/smg|mac10|mp[579]|ump|bizon/.test(className.toLowerCase()))return "smgs";
  if(/shotgun|nova|xm1014|mag7|sawedoff/.test(className.toLowerCase()))return "shotguns";
  if(/pistol|glock|deagle|usp|tec9|p250|revolver/.test(className.toLowerCase()))return "pistols";
  if(/m249|negev/.test(className.toLowerCase()))return "machineguns";
  return "other";
}
function labelWords(item){
  const label=[item?.name,item?.itemNameToken,item?.className,item?.prefab].filter(Boolean).join(" ").toLowerCase();
  return new Set(label.replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(x=>x&&!STOP.has(x)));
}
function isGenericKey(item){
  const label=[item?.name,item?.itemNameToken,item?.className].filter(Boolean).join(" ").toLowerCase();
  return Number(item?.id)===1201||/csgo[_ ](?:crate|case)[_ ]key/.test(label)||/csgo crate key/.test(label);
}
export function parseLegacySchema(text,{definitions=new Map(),translations={}}={}){
  const root=parseKV(text),data=get(root,"items_game")||root,rawItems=get(data,"items");
  if(!rawItems)throw Error('No "items" section found in items_game.txt.');
  const prefabs=get(data,"prefabs")||[],items=[];
  for(const [rawId,raw] of rawItems){
    const id=Number(rawId);if(!Number.isSafeInteger(id)||id<0)continue;
    const merged=resolvePrefab(raw,prefabs);
    const className=String(get(merged,"name")||""),itemNameToken=String(get(merged,"item_name")||"");
    const prefab=String(get(merged,"prefab")||""),itemType=String(get(merged,"item_type")||"");
    const known=definitions.get(id),category=categoryFor(className,itemNameToken,prefab,itemType);
    const qualityName=String(get(merged,"item_quality")||"").toLowerCase(),rarityName=String(get(merged,"item_rarity")||"").toLowerCase();
    const attributes=get(merged,"attributes")||[],supply=get(attributes,"supply_crate_series");
    items.push({id,name:translations[itemNameToken]||known?.name||className||"Item "+id,itemNameToken,className,category,prefab,itemType,image:String(get(merged,"image_inventory")||""),rarity:rarityName,quality:qualityName,defaultQuality:QUALITY[qualityName]??4,defaultRarity:RARITY[rarityName]??(category==="keys"?1:3),supplyCrateSeries:supply==null?0:Number(supply)||0});
  }
  const paintKits=(get(data,"paint_kits")||[]).map(([id,p])=>{const token=String(get(p,"description_tag")||get(p,"name")||"");return {id:Number(id),token,name:translations[token]||token||("Paint kit "+id),min:Number(get(p,"wear_remap_min")??0),max:Number(get(p,"wear_remap_max")??1)}}).filter(x=>Number.isSafeInteger(x.id)&&x.id>0);
  return {items,paintKits};
}
export function findCaseKey(caseItem,allItems){
  if(!caseItem||caseItem.category!=="cases")return null;
  const keys=(allItems||[]).filter(x=>x.category==="keys");if(!keys.length)return null;
  const caseWords=labelWords(caseItem);
  const matches=keys.map(key=>{const words=labelWords(key);let score=0;for(const word of words)if(caseWords.has(word))score++;return {key,score}}).filter(x=>x.score>0&&!isGenericKey(x.key)).sort((a,b)=>b.score-a.score);
  if(matches.length&&(!matches[1]||matches[0].score>matches[1].score))return matches[0].key;
  return keys.find(isGenericKey)||null;
}
