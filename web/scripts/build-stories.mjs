import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const rawPath = path.join(root, ".tmp", "stories-raw.json");
const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));

function fullText(story) {
  let out = `${story.title} ${story.blurb}`;
  for (const seg of story.segs ?? []) {
    out += ` ${seg.name ?? ""} ${seg.P?.c ?? ""} ${(seg.P?.t ?? []).join(" ")}`;
    for (const key of ["G", "Y", "R", "X"]) {
      const phase = seg[key];
      if (!phase) continue;
      out += ` ${phase.c ?? ""} ${(phase.t ?? []).join(" ")}`;
    }
    out += ` ${seg.ask?.q ?? ""}`;
  }
  return out;
}

function languageOf(story) {
  const text = fullText(story);
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  return "en";
}

const byLocale = { en: new Map(), zh: new Map() };
for (const story of raw) {
  const language = languageOf(story);
  if (language !== "en" && language !== "zh") continue;
  if (!story.id || !Array.isArray(story.segs)) continue;
  if (!byLocale[language].has(story.id)) {
    byLocale[language].set(story.id, story);
  }
}

const outRoot = path.join(root, "src", "data", "stories");

for (const locale of ["en", "zh"]) {
  const stories = [...byLocale[locale].values()];
  const dir = path.join(outRoot, locale);
  fs.mkdirSync(dir, { recursive: true });

  const meta = [];
  const imports = [];
  const entries = [];

  for (const story of stories) {
    const payload = {
      id: story.id,
      body: story.body,
      tone: story.tone,
      title: story.title,
      blurb: story.blurb,
      tags: story.tags ?? [],
      mins: story.mins,
      names: story.names ?? {},
      marks: story.marks,
      segs: story.segs,
      finale: story.finale,
      oops: story.oops,
      endings: story.endings ?? {},
      fill: story.fill ?? [],
    };
    fs.writeFileSync(
      path.join(dir, `${story.id}.json`),
      JSON.stringify(payload, null, 2),
      "utf8",
    );
    meta.push({
      id: story.id,
      body: story.body,
      tone: story.tone,
      title: story.title,
      blurb: story.blurb,
      tags: story.tags ?? [],
      mins: story.mins,
    });
    const safe = `story_${story.id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    imports.push(`import ${safe} from "./${locale}/${story.id}.json";`);
    entries.push(`  ${JSON.stringify(story.id)}: ${safe} as unknown as Story,`);
  }

  fs.writeFileSync(
    path.join(dir, "index.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );

  const ts = `import type { Story } from "./types";

${imports.join("\n")}

export const ${locale}Stories: Record<string, Story> = {
${entries.join("\n")}
};
`;
  fs.writeFileSync(path.join(outRoot, `${locale}.ts`), ts, "utf8");
  console.log(locale, stories.length, "stories");
}
