#!/usr/bin/env node
/**
 * Kumite — Selection Board Renderer
 *
 * Renders a selection-board.json file into a self-contained, accessible HTML page
 * for guided conversation or independent user browsing. Zero external runtime dependencies.
 *
 * Usage:
 *   node _tools/taste-board.mjs <path/to/selection-board.json> [--out <path/to/selection-board.html>]
 */

import fs from "node:fs";
import path from "node:path";

const QUALITIES = [
  "composition",
  "layout",
  "typography",
  "colour",
  "identity",
  "imagery",
  "components",
  "interaction",
  "motion",
  "responsive"
];

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseArgs(args) {
  let inputPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out" && i + 1 < args.length) {
      outputPath = args[++i];
    } else if (!args[i].startsWith("--") && !inputPath) {
      inputPath = args[i];
    }
  }

  return { inputPath, outputPath };
}

function renderHtml(boardData, inputRelativeDir) {
  const serialized = JSON.stringify(boardData, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Selection Board — ${escapeHtml(boardData.project || "Kumite")}</title>
  <style>
    :root {
      --bg: #0f1115;
      --surface: #181b22;
      --surface-raised: #212631;
      --border: #2e3545;
      --text: #f0f3f6;
      --text-muted: #8b949e;
      --accent: #388bfd;
      --accent-muted: #1f3a60;
      --keep: #2ea043;
      --reject: #f85149;
      --undecided: #d29922;
      --radius: 8px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem 1.5rem 5rem;
    }
    header {
      max-width: 1400px;
      margin: 0 auto 2.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
    }
    h1 { font-size: 1.75rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.35rem; }
    .meta { color: var(--text-muted); font-size: 0.9rem; }
    .decision {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-top: 0.75rem;
      font-size: 0.95rem;
    }
    .actions { display: flex; gap: 0.75rem; }
    button {
      background: var(--surface-raised);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }
    button:hover { background: var(--border); }
    button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    button.primary:hover { opacity: 0.9; }

    main {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.75rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card-preview {
      width: 100%;
      height: 220px;
      background: #000;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--border);
    }
    .card-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .preview-fallback {
      color: var(--text-muted);
      font-size: 0.85rem;
      padding: 1rem;
      text-align: center;
    }
    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .card-id {
      font-weight: 700;
      font-size: 1.1rem;
      font-mono: monospace;
    }
    .card-status {
      display: inline-flex;
      gap: 0.25rem;
    }
    .status-btn {
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .status-btn[data-state="keep"].active { background: var(--keep); border-color: var(--keep); color: #fff; }
    .status-btn[data-state="reject"].active { background: var(--reject); border-color: var(--reject); color: #fff; }
    .status-btn[data-state="undecided"].active { background: var(--undecided); border-color: var(--undecided); color: #000; }

    .source-info {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .source-info a { color: var(--accent); text-decoration: none; word-break: break-all; }
    .source-info a:hover { text-decoration: underline; }

    .qualities-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .qualities-group label.title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .qualities-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.4rem;
    }
    .quality-check {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .quality-check input { cursor: pointer; accent-color: var(--accent); }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .field-group label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }
    input[type="text"], textarea {
      background: var(--surface-raised);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      padding: 0.5rem;
      font-size: 0.85rem;
      font-family: inherit;
    }
    input[type="text"]:focus, textarea:focus {
      outline: 2px solid var(--accent);
      border-color: transparent;
    }
    textarea { resize: vertical; min-height: 60px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Selection Board: ${escapeHtml(boardData.project || "Untitled Project")}</h1>
      <div class="meta">
        <span>Updated: ${escapeHtml(boardData.updated || "Unknown")}</span> &bull;
        <span>Mode: ${escapeHtml(boardData.mode || "guided")}</span>
      </div>
      ${boardData.decision ? `<div class="decision"><strong>Decision:</strong> ${escapeHtml(boardData.decision)}</div>` : ""}
    </div>
    <div class="actions">
      <button id="export-json" class="primary">Export JSON</button>
      <button id="copy-json">Copy JSON</button>
    </div>
  </header>

  <main id="cards-container">
    ${(boardData.references || []).map((ref, idx) => {
      const selected = ref.selected || "undecided";
      const qualities = new Set(ref.qualities || []);
      const previewSrc = ref.preview ? (ref.preview.startsWith("http") ? ref.preview : (inputRelativeDir ? path.posix.join(inputRelativeDir, ref.preview) : ref.preview)) : "";

      return `
      <article class="card" data-idx="${idx}" data-id="${escapeHtml(ref.id)}">
        <div class="card-preview">
          ${previewSrc ? `<img src="${escapeHtml(previewSrc)}" alt="Preview of ${escapeHtml(ref.id)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">` : ""}
          <div class="preview-fallback" style="${previewSrc ? "display:none;" : ""}">
            <span>${escapeHtml(ref.preview || "No preview image recorded")}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-header">
            <span class="card-id">${escapeHtml(ref.id)}</span>
            <div class="card-status" role="group" aria-label="Selection status">
              <button type="button" class="status-btn ${selected === "keep" ? "active" : ""}" data-state="keep">Keep</button>
              <button type="button" class="status-btn ${selected === "undecided" ? "active" : ""}" data-state="undecided">Undecided</button>
              <button type="button" class="status-btn ${selected === "reject" ? "active" : ""}" data-state="reject">Reject</button>
            </div>
          </div>

          <div class="source-info">
            <div><strong>Source:</strong> ${escapeHtml(ref.source?.type || "unknown")}</div>
            <div>
              <strong>Identity:</strong>
              ${ref.source?.identity && ref.source.identity.startsWith("http")
                ? `<a href="${escapeHtml(ref.source.identity)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ref.source.identity)}</a>`
                : `<span>${escapeHtml(ref.source?.identity || "unknown")}</span>`}
            </div>
            <div><strong>Licence:</strong> ${escapeHtml(ref.source?.licence || "unknown")} &bull; <strong>Confidence:</strong> ${escapeHtml(ref.confidence || "estimated")}</div>
          </div>

          <div class="qualities-group">
            <label class="title">Qualities to borrow</label>
            <div class="qualities-grid">
              ${QUALITIES.map(q => `
                <label class="quality-check">
                  <input type="checkbox" name="quality" value="${q}" ${qualities.has(q) ? "checked" : ""}>
                  <span>${q}</span>
                </label>
              `).join("")}
            </div>
          </div>

          <div class="field-group">
            <label for="contrib-${idx}">Contribution</label>
            <input type="text" id="contrib-${idx}" class="card-contribution" value="${escapeHtml(ref.contribution || "")}" placeholder="e.g. type scale and caption treatment only">
          </div>

          <div class="field-group">
            <label for="notes-${idx}">Notes (user's words)</label>
            <textarea id="notes-${idx}" class="card-notes" placeholder="Notes in user's own words">${escapeHtml(ref.notes || "")}</textarea>
          </div>
        </div>
      </article>
      `;
    }).join("")}
  </main>

  <script>
    const boardState = ${serialized};

    // Handle card events
    const container = document.getElementById("cards-container");
    container.addEventListener("click", (e) => {
      const statusBtn = e.target.closest(".status-btn");
      if (statusBtn) {
        const card = statusBtn.closest(".card");
        const idx = Number(card.dataset.idx);
        const newState = statusBtn.dataset.state;

        card.querySelectorAll(".status-btn").forEach(btn => btn.classList.remove("active"));
        statusBtn.classList.add("active");
        boardState.references[idx].selected = newState;
        return;
      }
    });

    container.addEventListener("change", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const idx = Number(card.dataset.idx);

      if (e.target.name === "quality") {
        const checked = Array.from(card.querySelectorAll('input[name="quality"]:checked')).map(el => el.value);
        boardState.references[idx].qualities = checked;
      }
    });

    container.addEventListener("input", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const idx = Number(card.dataset.idx);

      if (e.target.classList.contains("card-contribution")) {
        boardState.references[idx].contribution = e.target.value;
      } else if (e.target.classList.contains("card-notes")) {
        boardState.references[idx].notes = e.target.value;
      }
    });

    // Export button
    document.getElementById("export-json").addEventListener("click", () => {
      boardState.updated = new Date().toISOString().split("T")[0];
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(boardState, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "selection-board.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // Copy button
    document.getElementById("copy-json").addEventListener("click", async () => {
      boardState.updated = new Date().toISOString().split("T")[0];
      await navigator.clipboard.writeText(JSON.stringify(boardState, null, 2));
      alert("JSON copied to clipboard!");
    });
  </script>
</body>
</html>
`;
}

function main() {
  const { inputPath, outputPath } = parseArgs(process.argv.slice(2));

  if (!inputPath) {
    console.error("Usage: node _tools/taste-board.mjs <selection-board.json> [--out <selection-board.html>]");
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedInput, "utf8");
  let boardData;
  try {
    boardData = JSON.parse(content);
  } catch (err) {
    console.error(`Invalid JSON in ${resolvedInput}:`, err.message);
    process.exit(1);
  }

  const targetOutput = outputPath
    ? path.resolve(outputPath)
    : resolvedInput.replace(/\.json$/i, ".html");

  const inputDir = path.dirname(resolvedInput);
  const outputDir = path.dirname(targetOutput);
  const relativeFromOutToIn = path.relative(outputDir, inputDir).replace(/\\/g, "/");

  const html = renderHtml(boardData, relativeFromOutToIn);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(targetOutput, html, "utf8");
  console.log(`Rendered selection board: ${targetOutput}`);
}

main();
