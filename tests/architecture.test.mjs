import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, ".agents", "skills");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const frontmatter = (s) => s.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
const field = (s, key) => {
  const match = s.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!match) return "";
  const value = match[1].trim();
  if (!/^[>|][+-]?$/.test(value)) return value;
  const body = s.slice((match.index ?? 0) + match[0].length).replace(/^\r?\n/, "");
  const lines = [];
  for (const line of body.split(/\r?\n/)) {
    if (!/^[ \t]+\S/.test(line)) break;
    lines.push(line.trim());
  }
  return lines.join(" ");
};

test("root routing remains concise and points to both pipelines", () => {
  const agents = read("AGENTS.md");
  assert.ok(agents.split(/\r?\n/).length <= 60);
  assert.match(agents, /pipelines\/content-experience/);
  assert.match(agents, /pipelines\/product-experience/);
});

test("root context routes both pipelines and shared guidance", () => {
  const context = read("CONTEXT.md");
  for (const p of ["pipelines/content-experience/CONTEXT.md","pipelines/product-experience/CONTEXT.md","_shared/CONTEXT.md"]) assert.ok(context.includes(p));
});

test("all Kumite skills have matching directory names and useful descriptions", () => {
  const dirs = fs.readdirSync(SKILLS,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name);
  assert.equal(dirs.length,12);
  for (const dir of dirs) {
    const p=path.join(SKILLS,dir,"SKILL.md");
    assert.ok(fs.existsSync(p),`${dir} missing SKILL.md`);
    const fm=frontmatter(fs.readFileSync(p,"utf8"));
    assert.equal(field(fm,"name"),dir);
    assert.ok(field(fm,"description").length>20);
  }
});

test("Kumite has no vendored GSAP or SitePeel architecture dependencies", () => {
  for (const p of [
    ".agents/skills/gsap-core/SKILL.md",
    "_shared/reference-intelligence/adapters/sitepeel.md",
    "_shared/reference-intelligence/showcase/gsap.md",
    "_shared/patterns/gsap/README.md",
    "_shared/motion/gsap-patterns.md",
    "_shared/motion/lenis.md",
    "_tools/taste-board.mjs",
  ]) assert.ok(!exists(p),`${p} should not exist`);
  const motion=read("_shared/motion/README.md");
  assert.match(motion,/library-agnostic/i);
  assert.doesNotMatch(motion,/GSAP routing|gsap-core|Lenis/);
});

test("reference discovery supports user-supplied and researched references", () => {
  const skill=read(".agents/skills/kumite-design-discovery/SKILL.md");
  assert.match(skill,/User supplied a reference/);
  assert.match(skill,/No reference supplied/);
  assert.match(skill,/four to six/);
  assert.match(skill,/awards/);
  assert.match(skill,/independent expert reviews/);
  assert.match(skill,/credible community discussions/);
  assert.match(skill,/Never invent ratings/);
});

test("selection records are link-first and contain no preview field", () => {
  const board=JSON.parse(read("_templates/selection-board.json"));
  assert.equal(board.version,2);
  assert.ok(Array.isArray(board.references));
  for(const ref of board.references) {
    assert.ok(ref.title);
    assert.match(ref.source.url,/^https:\/\//);
    assert.ok(ref.reason);
    assert.ok(!("preview" in ref));
  }
  const policy=read("_shared/foundations/selection-board.md");
  assert.match(policy,/No screenshots/);
  assert.match(policy,/direct link/i);
});

test("Figma discovery uses links first and defers extraction until selection", () => {
  const discovery=read(".agents/skills/kumite-design-discovery/SKILL.md");
  assert.match(discovery,/Figma Community/);
  assert.match(discovery,/Do not inspect Figma contents before the user selects/);
  const integration=read(".agents/skills/kumite-figma-integration/SKILL.md");
  assert.match(integration,/file key/i);
});

test("both pipelines retain five complete stage contracts", () => {
  const pipelines=[
    ["content-experience",["01_brief","02_reference","03_composition","04_motion","05_build"]],
    ["product-experience",["01_brief","02_system","03_flows","04_motion","05_build"]],
  ];
  for(const [name,stages] of pipelines) {
    assert.ok(exists(`pipelines/${name}/CONTEXT.md`));
    for(const stage of stages) {
      const p=`pipelines/${name}/${stage}/CONTEXT.md`;
      assert.ok(exists(p),`missing ${p}`);
      const text=read(p);
      for(const h of ["## Inputs","## Process","## Outputs","## Check"]) assert.ok(text.includes(h),`${p} missing ${h}`);
      assert.match(text,/Reference \(every run\):/);
      assert.match(text,/Working \(this run\):/);
      assert.match(text,/check\.md/);
    }
  }
});

test("selection stages present compact choices and defer deep inspection", () => {
  const content=read("pipelines/content-experience/02_reference/CONTEXT.md");
  const product=read("pipelines/product-experience/02_system/CONTEXT.md");
  for(const s of [content,product]) {
    assert.match(s,/four to six/);
    assert.match(s,/direct links/);
    assert.match(s,/no screenshots|No\s+screenshots/i);
    assert.match(s,/selection/i);
  }
});

test("motion stages are library-neutral and respect reduced motion", () => {
  for(const p of ["pipelines/content-experience/04_motion/CONTEXT.md","pipelines/product-experience/04_motion/CONTEXT.md"]) {
    const s=read(p);
    assert.match(s,/existing dependencies/);
    assert.match(s,/Do not prescribe or add an animation library/);
    assert.match(s,/reduced-motion/i);
    assert.doesNotMatch(s,/gsap-/i);
  }
});

test("shared factory includes evidence, Figma, selection and quality guidance", () => {
  for(const p of [
    "_shared/CONTEXT.md",
    "_shared/references/evidence-and-confidence.md",
    "_shared/references/reference-intelligence.md",
    "_shared/references/anti-slop-rules.json",
    "_shared/foundations/selection-board.md",
    "_shared/foundations/taste-profile.md",
    "_shared/reference-intelligence/README.md",
    "_shared/reference-intelligence/adapters/live-page.md",
    "_shared/reference-intelligence/adapters/figma.md",
    "_templates/selection-board.json",
    "_templates/motion-spec.md",
    "THIRD-PARTY-NOTICES.md",
  ]) assert.ok(exists(p),`missing ${p}`);
});
