import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, ".agents", "skills");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function exists(relative) {
  return fs.existsSync(path.join(ROOT, relative));
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : "";
}

function field(front, name) {
  const match = front.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

function blockField(front, name) {
  const block = front.match(new RegExp(`^${name}:\\s*[>|]-?\\s*$`, "m"));
  if (!block) return field(front, name);
  const rest = front.slice(front.indexOf(block[0]) + block[0].length).split(/\r?\n/);
  const lines = [];
  for (const line of rest) {
    if (line.trim() === "") {
      lines.push("");
      continue;
    }
    if (!/^\s+/.test(line)) break;
    lines.push(line.trim());
  }
  return lines.join(" ").trim();
}

test("root AGENTS.md is a routing catalog under 60 lines", () => {
  const lines = read("AGENTS.md").split(/\r?\n/);
  assert.ok(lines.length <= 60, `AGENTS.md is ${lines.length} lines`);
  assert.match(read("AGENTS.md"), /CONTEXT\.md/);
  assert.match(read("AGENTS.md"), /pipelines\/content-experience/);
  assert.match(read("AGENTS.md"), /pipelines\/product-experience/);
});

test("root CONTEXT.md routes both pipelines and the shared factory", () => {
  const text = read("CONTEXT.md");
  for (const needle of [
    "pipelines/content-experience/CONTEXT.md",
    "pipelines/product-experience/CONTEXT.md",
    "_shared/CONTEXT.md",
    "_archive/design-memory-map/README.md",
  ]) {
    assert.ok(text.includes(needle), `CONTEXT.md is missing ${needle}`);
  }
});

test("every skill directory name equals its frontmatter name", () => {
  const directories = fs
    .readdirSync(SKILLS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.ok(directories.length >= 17, `found ${directories.length} skills`);

  for (const directory of directories) {
    const skillPath = path.join(SKILLS, directory, "SKILL.md");
    assert.ok(fs.existsSync(skillPath), `${directory} has no SKILL.md`);
    const front = frontmatter(fs.readFileSync(skillPath, "utf8"));
    const name = field(front, "name");
    const description = blockField(front, "description");
    assert.equal(name, directory, `${directory} declares name "${name}"`);
    assert.match(directory, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(description.length > 20, `${directory} has no usable description`);
  }
});

test("the twelve Kumite skills and eight GSAP skills are present", () => {
  const kumite = [
    "kumite-content-experience",
    "kumite-product-experience",
    "kumite-design-intelligence",
    "kumite-design-discovery",
    "kumite-figma-integration",
    "kumite-component-first",
    "kumite-visual-assets",
    "kumite-design-quality",
    "kumite-motion-design",
    "kumite-taste",
    "kumite-design-system",
    "kumite-component-intelligence",
  ];
  const gsap = [
    "gsap-core",
    "gsap-timeline",
    "gsap-scrolltrigger",
    "gsap-plugins",
    "gsap-utils",
    "gsap-performance",
    "gsap-react",
    "gsap-frameworks",
  ];
  for (const name of [...kumite, ...gsap]) {
    assert.ok(exists(`.agents/skills/${name}/SKILL.md`), `missing skill ${name}`);
  }
  for (const name of gsap) {
    const front = frontmatter(read(`.agents/skills/${name}/SKILL.md`));
    assert.match(field(front, "license"), /MIT/i, `${name} must declare MIT`);
  }
  assert.ok(exists("_shared/motion/gsap/LICENSE"));
});

test("both pipelines have a router and five stage contracts", () => {
  const pipelines = [
    ["content-experience", ["01_brief", "02_reference", "03_composition", "04_motion", "05_build"]],
    ["product-experience", ["01_brief", "02_system", "03_flows", "04_motion", "05_build"]],
  ];
  for (const [pipeline, stages] of pipelines) {
    assert.ok(exists(`pipelines/${pipeline}/CONTEXT.md`), `${pipeline} has no router`);
    for (const stage of stages) {
      assert.ok(
        exists(`pipelines/${pipeline}/${stage}/CONTEXT.md`),
        `${pipeline}/${stage} has no CONTEXT.md`,
      );
    }
  }
});

test("pipeline skills and routers describe the same five stage contracts", () => {
  const pipelines = [
    ["content-experience", ".agents/skills/kumite-content-experience/SKILL.md", ["01_brief", "02_reference", "03_composition", "04_motion", "05_build"]],
    ["product-experience", ".agents/skills/kumite-product-experience/SKILL.md", ["01_brief", "02_system", "03_flows", "04_motion", "05_build"]],
  ];
  for (const [pipeline, skillPath, stages] of pipelines) {
    const router = read(`pipelines/${pipeline}/CONTEXT.md`);
    const skill = read(skillPath);
    for (const stage of stages) {
      assert.ok(router.includes(stage), `${pipeline} router omits ${stage}`);
      assert.ok(skill.includes(stage), `${pipeline} skill omits ${stage}`);
    }
    assert.doesNotMatch(skill, /six-stage|02_taste|04_direction|06_build/);
  }
});

test("taste and direction are mandatory before either pipeline builds", () => {
  const contentTaste = read("pipelines/content-experience/02_reference/CONTEXT.md");
  const contentDirection = read("pipelines/content-experience/03_composition/CONTEXT.md");
  const productTaste = read("pipelines/product-experience/02_system/CONTEXT.md");
  const productDirection = read("pipelines/product-experience/03_flows/CONTEXT.md");
  for (const text of [contentTaste, productTaste]) {
    assert.match(text, /selection board/i);
    assert.match(text, /user's own words/i);
  }
  for (const text of [contentDirection, productDirection]) {
    assert.match(text, /concept.frame/i);
    assert.match(text, /explicit user approval/i);
  }
});

test("every stage contract follows the ICM format", () => {
  const contracts = [];
  for (const pipeline of ["content-experience", "product-experience"]) {
    for (const stage of fs.readdirSync(path.join(ROOT, "pipelines", pipeline))) {
      const contract = path.join("pipelines", pipeline, stage, "CONTEXT.md");
      if (fs.existsSync(path.join(ROOT, contract))) contracts.push(contract);
    }
  }
  assert.equal(contracts.length, 10);

  for (const contract of contracts) {
    const text = read(contract);
    assert.match(text, /^# \d{2}_/m, `${contract} needs an NN_ title`);
    for (const heading of ["## Inputs", "## Process", "## Outputs", "## Check"]) {
      assert.ok(text.includes(heading), `${contract} is missing ${heading}`);
    }
    assert.equal(
      (text.match(/^## Check$/gm) ?? []).length,
      1,
      `${contract} must have exactly one Check`,
    );
    assert.match(text, /Reference \(every run\):/, `${contract} needs a reference input`);
    assert.match(text, /Working \(this run\):/, `${contract} needs a working input`);
    assert.match(text, /^1\. /m, `${contract} needs a numbered process`);
    assert.match(text, /`[^`]+`/, `${contract} needs a backticked path`);
    assert.match(text, /check\.md/, `${contract} must write check.md`);
  }
});

test("the shared factory exposes the required references, scripts and motion files", () => {
  const required = [
    "_shared/CONTEXT.md",
    "_shared/references/evidence-and-confidence.md",
    "_shared/references/reference-intelligence.md",
    "_shared/references/anti-slop-rules.json",
    "_shared/references/anti-slop-review-template.md",
    "_shared/references/visual-quality-policy.md",
    "_shared/references/image-composition-intelligence.md",
    "_shared/references/implementation-spec-template.md",
    "_shared/references/figma-community-discovery.md",
    "_shared/references/licensing-policy.md",
    "_shared/foundations/README.md",
    "_shared/foundations/taste-profile.md",
    "_shared/foundations/selection-board.md",
    "_shared/foundations/reference-decomposition.md",
    "_shared/foundations/conflict-resolution.md",
    "_shared/foundations/direction-approval.md",
    "_shared/foundations/design-system.md",
    "_shared/foundations/implementation-checkpoints.md",
    "_shared/foundations/responsive-and-accessibility.md",
    "_shared/scripts/anti-slop-check.mjs",
    "_shared/scripts/fidelity-check.mjs",
    "_shared/scripts/capture-screenshots.mjs",
    "_shared/scripts/lib/anti-slop.mjs",
    "_shared/scripts/lib/fidelity.mjs",
    "_shared/scripts/lib/image-composition.mjs",
    "_shared/motion/README.md",
    "_shared/motion/gsap-patterns.md",
    "_shared/motion/lenis.md",
    "_shared/patterns/gsap/README.md",
    "_shared/reference-intelligence/README.md",
    "_shared/reference-intelligence/adapters/screenshot.md",
    "_shared/reference-intelligence/adapters/live-page.md",
    "_shared/reference-intelligence/adapters/figma.md",
    "_shared/reference-intelligence/adapters/sitepeel.md",
    "_shared/reference-intelligence/adapters/21st-dev.md",
    "_templates/content-brief.md",
    "_templates/product-brief.md",
    "_templates/reference-evidence.json",
    "_templates/selection-board.json",
    "_templates/taste-profile.json",
    "_templates/motion-spec.md",
    "_templates/audit.md",
    "_tools/links.py",
    "_tools/taste-board.mjs",
    "THIRD-PARTY-NOTICES.md",
  ];
  for (const file of required) {
    assert.ok(exists(file), `missing ${file}`);
  }
});

test("the archived Design Memory Map is preserved and self-contained", () => {
  const required = [
    "_archive/design-memory-map/README.md",
    "_archive/design-memory-map/references/design-memory-schema.json",
    "_archive/design-memory-map/references/design-memory-guide.md",
    "_archive/design-memory-map/references/design-memory-example.json",
    "_archive/design-memory-map/scripts/validate-memory.mjs",
    "_archive/design-memory-map/scripts/lib/design-memory.mjs",
    "_archive/design-memory-map/scripts/lib/schema.mjs",
    "_archive/design-memory-map/tests/design-memory.test.mjs",
  ];
  for (const file of required) {
    assert.ok(exists(file), `missing ${file}`);
  }
  const fixtures = fs.readdirSync(
    path.join(ROOT, "_archive", "design-memory-map", "tests", "fixtures", "design-memory"),
  );
  assert.ok(fixtures.length >= 10, `archive has ${fixtures.length} fixtures`);
});

test("no pipeline stage requires the archived memory map", () => {
  for (const pipeline of ["content-experience", "product-experience"]) {
    for (const stage of fs.readdirSync(path.join(ROOT, "pipelines", pipeline))) {
      const contract = path.join(ROOT, "pipelines", pipeline, stage, "CONTEXT.md");
      if (!fs.existsSync(contract)) continue;
      const text = fs.readFileSync(contract, "utf8");
      assert.ok(
        !text.includes("design-memory-schema.json"),
        `${pipeline}/${stage} still requires the archived schema`,
      );
      assert.ok(
        !text.includes("validate-memory.mjs"),
        `${pipeline}/${stage} still requires the archived validator`,
      );
    }
  }
});

test("the old top-level skills, references and scripts trees are gone", () => {
  assert.ok(!exists("skills"), "old skills/ tree still exists");
  assert.ok(!exists("references"), "old references/ tree still exists");
  assert.ok(!exists("scripts"), "old scripts/ tree still exists");
});

test("third-party notices record the exact upstream commits", () => {
  const text = read("THIRD-PARTY-NOTICES.md");
  for (const commit of [
    "aed9cfd3277740755f6bfc1155c7aa645403b760",
    "e01eefb1f55cd08bc051521d74f5f8182b71ee9d",
    "8bc2f5610d3843b3ffa31a142effe6b6337fef3c",
  ]) {
    assert.ok(text.includes(commit), `THIRD-PARTY-NOTICES.md is missing ${commit}`);
  }
  assert.match(text, /MIT/);
});

test("taste board safely embeds untrusted JSON without closing its script element", async () => {
  const { execSync } = await import("node:child_process");
  const input = path.join(ROOT, "tests", "fixtures", "temp-taste-board-input.json");
  const output = path.join(ROOT, "tests", "fixtures", "temp-taste-board-output.html");
  try {
    fs.writeFileSync(input, JSON.stringify({
      project: "Injection test",
      references: [{
        id: "ref-x",
        source: { type: "url", identity: "https://example.com", licence: "unknown" },
        selected: "keep",
        qualities: [],
        notes: "</script><script>globalThis.pwned=true</script>"
      }]
    }));
    execSync(`node _tools/taste-board.mjs "${path.relative(ROOT, input)}" --out "${path.relative(ROOT, output)}"`, {
      cwd: ROOT,
      stdio: "pipe"
    });
    const html = fs.readFileSync(output, "utf8");
    assert.match(html, /\\\\u003c\\\\u002fscript\\\\u003e/i);
    assert.doesNotMatch(html, /<script>globalThis\.pwned/i);
  } finally {
    for (const file of [input, output]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
});

test("taste board tool generates self-contained selection board HTML", async () => {
  const { execSync } = await import("node:child_process");
  const tempOut = path.join(ROOT, "tests", "fixtures", "temp-taste-board.html");
  try {
    const cmd = `node _tools/taste-board.mjs _templates/selection-board.json --out ${path.relative(ROOT, tempOut)}`;
    execSync(cmd, { cwd: ROOT, stdio: "pipe" });
    assert.ok(fs.existsSync(tempOut), "taste-board.mjs did not produce output file");
    const html = fs.readFileSync(tempOut, "utf8");
    assert.match(html, /<!DOCTYPE html>/i);
    assert.match(html, /Selection Board/);
    assert.match(html, /data-state="keep"/);
    assert.match(html, /prefers-reduced-motion/);
  } finally {
    if (fs.existsSync(tempOut)) {
      fs.unlinkSync(tempOut);
    }
  }
});
