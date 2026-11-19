import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(process.argv[2], "utf8");

function readStringLiteral(src, start) {
  // start points at the opening quote
  const quote = src[start];
  let out = "";
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      out += ch + src[i + 1];
      i += 2;
      continue;
    }
    if (ch === quote) return { raw: src.slice(start, i + 1), end: i + 1 };
    out += ch;
    i += 1;
  }
  throw new Error("unterminated string");
}

function readBalanced(src, start) {
  let depth = 0;
  let i = start;
  let quote = null;
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; i += 1; continue; }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { raw: src.slice(start, i + 1), end: i + 1 };
    }
    i += 1;
  }
  throw new Error("unterminated object");
}

const context = vm.createContext(Object.create(null));
const results = [];
let pos = 0;

while (true) {
  const objAt = source.indexOf("t.exports={id:", pos);
  const jsonAt = source.indexOf("t.exports=JSON.parse('", pos);
  let next;
  if (objAt === -1 && jsonAt === -1) break;
  if (objAt !== -1 && (jsonAt === -1 || objAt < jsonAt)) {
    const start = objAt + "t.exports=".length;
    const { raw, end } = readBalanced(source, start);
    try {
      const value = vm.runInContext(`(${raw})`, context, { timeout: 200 });
      results.push({ format: "object", value });
    } catch (error) {
      results.push({ format: "object", error: String(error), raw: raw.slice(0, 200) });
    }
    next = end;
  } else {
    const quoteAt = jsonAt + "t.exports=JSON.parse(".length;
    const { raw, end } = readStringLiteral(source, quoteAt);
    try {
      const jsonText = vm.runInContext(`(${raw})`, context, { timeout: 200 });
      results.push({ format: "json", value: JSON.parse(jsonText) });
    } catch (error) {
      results.push({ format: "json", error: String(error), raw: raw.slice(0, 200) });
    }
    next = end;
  }
  pos = next;
}

const stories = results.filter((r) => r.value && r.value.id && r.value.segs);
const errors = results.filter((r) => r.error);
console.log("parsed", results.length, "stories", stories.length, "errors", errors.length);
if (errors.length) console.log(errors.slice(0, 5));

function scriptOf(text) {
  const s = String(text || "");
  if (/[\u3040-\u30ff]/.test(s)) return "ja";
  if (/[\uac00-\ud7af]/.test(s)) return "ko";
  if (/[\u4e00-\u9fff]/.test(s)) return "zh";
  return "en";
}
const byScript = {};
for (const r of stories) {
  const k = scriptOf(r.value.title + " " + r.value.blurb);
  byScript[k] = (byScript[k] || 0) + 1;
}
console.log("by script", byScript);
const ids = new Map();
for (const r of stories) {
  const k = r.value.id;
  ids.set(k, (ids.get(k) || 0) + 1);
}
console.log("unique ids", ids.size);
console.log("sample en", stories.find((r) => scriptOf(r.value.title) === "en")?.value.id);
console.log("sample zh", stories.find((r) => scriptOf(r.value.title) === "zh")?.value.id);
fs.writeFileSync(new URL("../.tmp/stories-raw.json", import.meta.url), JSON.stringify(stories.map((r) => r.value), null, 2));
