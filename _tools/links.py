#!/usr/bin/env python3
"""Check that relative links and reference inputs in Kumite resolve.

Run from anywhere:
    python -I _tools/links.py [ROOT] [--skip FOLDER ...]

ROOT defaults to the folder that holds _tools/. Standard library only.

Checks every .md file outside dot-folders, node_modules/, _archive/ and
_templates/, plus any folder named with --skip:
  - markdown links [text](path) and @AGENTS.md style imports;
  - backticked paths in list items under an Inputs heading.

Working inputs are allowed to be missing: the run produces them. Reference
inputs must already exist. Fenced code blocks are skipped.

Exit 1 if any reference link or input does not resolve.
"""
import os
import re
import sys
import urllib.parse
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SKIP = {"node_modules", "_archive", "_templates", "raw", "capture", "assets"}
LINK = re.compile(r"\[[^\]]*\]\((<[^>]+>|[^)\s]+)\)")
TICK = re.compile(r"`([^`\s]+)`")
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
IMPORT = re.compile(r"^@(\S+\.md)\s*$")


def front_matter(text):
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[3:end], text[end + 4:]
    return "", text


def lines_outside_fences(body):
    fence = None
    for line in body.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            mark = stripped[:3]
            fence = None if fence == mark else (fence or mark)
            continue
        if fence is None:
            yield line


def looks_like_path(value):
    if any(char in value for char in "{}<>*?|"):
        return False
    if re.match(r"^[a-z]+:", value):
        return False
    return "/" in value or bool(re.search(r"\.\w{1,5}$", value))


def main():
    args, skip = sys.argv[1:], set(SKIP)
    while "--skip" in args:
        index = args.index("--skip")
        skip.add(args[index + 1])
        del args[index:index + 2]
    root = Path(args[0]).resolve() if args else Path(__file__).resolve().parent.parent

    files = sorted(
        path
        for path in root.rglob("*.md")
        if not any(
            part.startswith(".") or part in skip
            for part in path.relative_to(root).parts[:-1]
        )
    )
    broken, checked = [], 0

    def check_link(source, relative, target):
        nonlocal checked
        if (
            re.match(r"^[a-z]+:", target)
            or target.startswith("#")
            or "{" in target
        ):
            return
        checked += 1
        resolved = (source.parent / urllib.parse.unquote(target.split("#")[0])).resolve()
        if not resolved.exists():
            broken.append(f"{relative}: {target}")

    for path in files:
        relative = path.relative_to(root).as_posix()
        _, body = front_matter(
            path.read_text(encoding="utf-8-sig", errors="replace")
        )
        in_inputs = False
        for line in lines_outside_fences(body):
            heading = HEADING.match(line)
            if heading:
                in_inputs = heading.group(2).strip().lower() == "inputs"
                continue
            imported = IMPORT.match(line.strip())
            if imported and not re.match(r"^(~|/|[A-Za-z]:)", imported.group(1)):
                check_link(path, relative, imported.group(1))
            for match in LINK.finditer(line):
                target = match.group(1)
                if target.startswith("<") and target.endswith(">"):
                    target = target[1:-1]
                check_link(path, relative, target)
            if in_inputs and re.match(r"\s*[-*]\s", line):
                if re.match(r"\s*[-*]\s*working\b", line, re.I):
                    continue  # produced during this run
                for match in TICK.finditer(line):
                    value = match.group(1)
                    if not looks_like_path(value):
                        continue
                    checked += 1
                    candidates = [
                        (path.parent / value).resolve(),
                        (root / value).resolve(),
                    ]
                    if not any(candidate.exists() for candidate in candidates):
                        broken.append(f"{relative}: input `{value}`")

    for item in broken:
        print(item)
    print(f"{len(files)} files, {checked} links and inputs checked, {len(broken)} broken")
    sys.exit(1 if broken else 0)


if __name__ == "__main__":
    main()
