import test from "node:test";
import assert from "node:assert/strict";
import {parseKV,stringifyKV,get,set} from "./kv.js";
test("KeyValues nested data round trips",()=>{const input='"items" { "2" { "def_index" "507" "attributes" { "6" "38.000000" } } }';const parsed=parseKV(input);assert.equal(get(get(parsed,"items").find(x=>x[0]==="2")[1],"def_index"),"507");const output=stringifyKV(parsed);const again=parseKV(output);assert.equal(get(get(again,"items").find(x=>x[0]==="2")[1],"def_index"),"507")});
test("KeyValues escapes backslashes and quotes",()=>{const value='csgo\\scripts\\items "game".txt';const parsed=parseKV('"path" '+JSON.stringify(value));assert.equal(get(parsed,"path"),value)});
test("KeyValues preserves duplicate keys and updates first matching key",()=>{const parsed=parseKV('"x" "1" "x" "2"');assert.equal(parsed.length,2);set(parsed,"x","3");assert.equal(parsed[0][1],"3");assert.equal(parsed[1][1],"2")});
