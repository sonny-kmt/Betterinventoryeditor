// Valve KeyValues text parser/serializer. Pairs are arrays so duplicate keys and source order survive.
export function parseKV(source){
  const tokens=[];let i=source.charCodeAt(0)===0xfeff?1:0;
  while(i<source.length){
    const c=source[i];
    if(/\s/.test(c)){i++;continue}
    if(c==="/"&&source[i+1]==="/"){while(i<source.length&&source[i]!=="\n")i++;continue}
    if(c==="/"&&source[i+1]==="*"){i+=2;while(i<source.length&&!(source[i]==="*"&&source[i+1]==="/"))i++;if(i>=source.length)throw Error("Unterminated KeyValues comment.");i+=2;continue}
    if(c==="{"||c==="}"){tokens.push(c);i++;continue}
    if(c==='"'){
      i++;let value="",closed=false;
      while(i<source.length){const ch=source[i++];if(ch==='"'){closed=true;break}if(ch==="\\"){if(i>=source.length)throw Error("Incomplete escape in KeyValues string.");const next=source[i++];if(next==='"'||next==="\\")value+=next;else if(next==="n")value+="\n";else if(next==="t")value+="\t";else value+="\\"+next}else value+=ch}
      if(!closed)throw Error("Unterminated quoted KeyValues string.");tokens.push(value);continue;
    }
    let value="";while(i<source.length&&!/\s/.test(source[i])&&source[i]!=="{"&&source[i]!=="}"){if(source[i]==="/"&&["/","*"].includes(source[i+1]))break;value+=source[i++]}if(value)tokens.push(value);else if(source[i]==="/"&&source[i+1]==="/")continue;else if(source[i]==="/"&&source[i+1]==="*")continue;else throw Error("Unexpected character in KeyValues at position "+i);
  }
  let pos=0;
  function block(nested=false){const pairs=[];while(pos<tokens.length&&tokens[pos]!=="}"){const key=tokens[pos++];if(key==="{")throw Error("Unexpected opening brace.");if(pos>=tokens.length)throw Error("Missing value for KeyValues key: "+key);let value;if(tokens[pos]==="{"){pos++;value=block(true);if(tokens[pos]!=="}")throw Error("Unclosed KeyValues block.");pos++}else{value=tokens[pos++];if(value==="}")throw Error("Missing value for KeyValues key: "+key)}pairs.push([key,value])}if(nested&&pos>=tokens.length)throw Error("Unclosed KeyValues block.");return pairs}
  const result=block(false);if(pos!==tokens.length)throw Error("Unexpected closing brace in KeyValues.");return result;
}
export const get=(pairs,key)=>pairs?.find(pair=>pair[0]===key)?.[1];
export const getAll=(pairs,key)=>(pairs||[]).filter(pair=>pair[0]===key).map(pair=>pair[1]);
export function set(pairs,key,value){const pair=pairs.find(x=>x[0]===key);if(pair)pair[1]=value;else pairs.push([key,value]);return value}
export function remove(pairs,key){for(let i=pairs.length-1;i>=0;i--)if(pairs[i][0]===key)pairs.splice(i,1)}
function quote(value){return '"'+String(value).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\t/g,"\\t")+'"'}
export function stringifyKV(pairs,depth=0){const pad="\t".repeat(depth);return (pairs||[]).map(([key,value])=>Array.isArray(value)?pad+quote(key)+"\n"+pad+"{\n"+stringifyKV(value,depth+1)+"\n"+pad+"}":pad+quote(key)+"\t"+quote(value)).join("\n")}
