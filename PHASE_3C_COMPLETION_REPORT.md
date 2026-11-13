# Phase 3C — Completion Report

Runtime phase: component-instance vs component-implementation targeting, source
owner resolution, and non-destructive class edits (including the Phase 3B
`cn()` data-loss case).

## Scope and environment

| Item | Value |
|---|---|
| Host | Windows, PowerShell, Node 24.14.0 |
| Kumite repository | `C:\Users\malco\OneDrive\Documentos\Vscode\Projects\kumite`, branch `master`, HEAD `dc39910` |
| Upstream working copy | `C:\Users\malco\AppData\Local\Temp\opencode\onlook-desktop-phase0`, base commit `a3685a49bdb9ace3708ee38464874b097e2485d3` |
| App | Onlook Studio production build (`dist/` + `dist-electron/main/index.js` + preload), rebuilt this phase |
| Launch | `electron.launch({ executablePath: .../electron.exe, args: ['dist-electron/main/index.js'], env: { NODE_ENV: 'production' } })` |
| Fixture | `C:\Users\malco\AppData\Local\Temp\opencode\kumite-phase3b-fixture` — Vite 6, React 18.3, TypeScript 5.6, Tailwind 3.4, shadcn/ui `card.tsx` using `React.forwardRef` |
| Fixture server | External Vite on port 3100 (`node-pty` is unbuilt in this checkout) |
| Evidence | `C:\Users\malco\AppData\Local\Temp\opencode\kumite-phase3c-evidence\` |
| Probes | `apps/studio/probe3c.mjs`, `apps/studio/probe3c-refusals.mjs` (both inject and restore their own fixture markup) |

### Working tree preserved

- Kumite: no tracked file modified; only the documents named at the end.
- Upstream checkout: no branch, commit, push or PR. All changes are uncommitted
  working-copy edits.
- No unrelated project (including Vaal) was opened or modified.

## 1. Changes and their reasons

### Shared contract

| File | Change | Reason |
|---|---|---|
| `packages/models/src/actions/target.ts` | new `EditTarget` union: `{ kind: 'implementation-node'; oid }` or `{ kind: 'component-instance'; callSiteOid; instanceId; implementationOid; componentName? }` | the scope decision is carried explicitly; the engine no longer has to infer it from which oid it happened to receive |
| `packages/models/src/code/index.ts` | `CodeDiffRequest.editTarget`, `CodeDiffRequest.sourcePath`; `CodeDiffFailureReason` (`missing-oid`, `missing-instance-id`, `missing-source-mapping`, `duplicate-target`, `stale-mapping`, `source-node-not-found`, `unsupported-instance-style`, `class-transform-unsupported`, `source-write-failure`); `CodeDiffResult` | every refusal is typed, explainable to the user, and distinguishable from success |

### Main process — target resolution

| File | Change | Reason |
|---|---|---|
| `electron/main/code/edit-target/index.ts` (new) | `resolveEditTarget`: resolve the oid through the run mapping, verify an optional expected `sourcePath`, verify `instanceId === callSiteOid === request.oid`, resolve the implementation oid, then run the forwarding gate | one authoritative owner per request; nothing is written until the owner is proven |
| `electron/main/code/edit-target/ast.ts` (new) | `checkClassNameForwarding` (props binding, props spread, destructured `className`, `React.forwardRef`/`memo` unwrapping), `countOidOccurrences` | an instance edit is only accepted when a call-site `className` demonstrably reaches the markup |
| `electron/main/code/templateNode-lookup.ts`, `electron/main/code/jsx-walk.ts` (new) | source-order JSX walker and call-site lookup by (component name, index) | deterministic call-site selection, no `@babel/traverse` dependency, no last-candidate guessing |
| `electron/main/code/diff/index.ts` | resolve every request first, group by source file, refuse duplicate `(sourcePath, sourceOid)`, require exactly one `data-oid` occurrence before transforming; return `CodeDiffResult` | a batch is all-or-nothing; one target cannot win a race or be edited twice |
| `electron/main/events/code.ts` | IPC returns `CodeDiffResult`; a failed disk write becomes `source-write-failure` | no silent success at the boundary |
| `electron/main/code/templateNode.ts`, `electron/main/code/classes.ts` | structured results instead of nullable side effects | read paths cannot report "nothing" as success |

### Main process — non-destructive class edits

| File | Change | Reason |
|---|---|---|
| `electron/main/code/diff/style.ts` | fail-closed `addClassToNode` / `replaceNodeClasses` returning `ClassTransformResult` | the Phase 3B failure: a literal class replaced a `cn(...)` expression |
| `electron/main/code/diff/class-expression.ts` (new) | readonly class-attribute detection, spread detection, static string/template readers, class-utility whitelist (`cn`, `clsx`, `classNames`, `cx`, `twMerge`) | only expressions whose semantics are fully known may be touched |
| `electron/main/code/diff/transform.ts` | transforms consume the resolved target; return a `TransformReport` | class, attribute and text edits share one audited path |

### Renderer

| File | Change | Reason |
|---|---|---|
| `src/lib/editor/engine/code/target.ts` (new) | `getEditTarget(element, 'root' \| 'instance')`, `getEditTargetOid` | the UI states the intended scope; it never falls back between scopes |
| `src/lib/editor/engine/code/helpers.ts`, `code/index.ts` | requests carry `editTarget` + `sourcePath`; refusals log `Source write refused (<reason>)`, send analytics and toast "Source edit not applied" | the user sees why nothing changed |
| `src/lib/editor/engine/style/index.ts` | style actions build the target for the current `StyleMode` | instance vs root styling is explicit |
| `src/lib/editor/engine/ast/index.ts`, `element/index.ts` | class/template lookups use the target oid; a changed runtime identity clears the selection | no stale selection can retarget the next edit |
| `EditPanel/StylesTab/single/TailwindInput/index.tsx` | Instance and Root fields both commit through `getEditTarget`; the instance field is only offered when an instance target exists | the Phase 3B UI sent the instance oid with no scope information |
| `EditPanel/PropsTab/index.tsx` | prop edits declare an `implementation-node` target | explicit, not implied |

### Tests

| File | Change | Reason |
|---|---|---|
| `electron/main/code/phase3c.acceptance.test.ts` (new) | 30 cases in four suites: boundary lookup, forwarding preconditions, one-target-one-source-node, class expression transforms | the invariants are executable, not just documented |

### Contract notes

- `editTarget` is the only target contract. An absent `editTarget` is read as an
  `implementation-node` target for narrow backward compatibility with pre-3C
  requests; it is never promoted to an instance target.
- Instance edits write only the call site; root edits write only the
  implementation node. There is no fallback in either direction.
- The runtime instance id is not durable identity: it is derived from the
  call-site `data-oid`, verified on every request, and a mismatch is refused.

## 2. Runtime test results

Every row was measured in the running production build against the Tailwind
fixture, not inferred from source. Instance identity in the tables is the value
observed in that run.

### 2.1 Instance-scope class edit on a shadcn component (the Phase 3B failure)

Selected: the `CardHeader` `div` inside `<Card>` in `src/pages/Home.tsx`
(`card.tsx` defines `CardHeader` as `React.forwardRef(({ className, ...props }, ref) => …)`
merging with `cn("flex flex-col space-y-1.5 p-6", className)`).

| Test | Result | Evidence |
|---|---|---|
| Instance Classes field is offered | PASS | after selection: runtime instance id `m2yth9z`, implementation oid `l0_18rn`; Instance field editable, Root field read-only with the spread warning |
| Commit `bg-red-50` in Instance Classes | PASS | call site becomes `<CardHeader data-oid="m2yth9z" className="bg-red-50">` |
| Rendered change | PASS | `className="flex flex-col space-y-1.5 p-6 bg-red-50"`, background `rgb(254, 242, 242)` |
| Library file untouched | PASS | `src/components/ui/card.tsx` unchanged; `cn("flex flex-col space-y-1.5 p-6", className)` still present (`true`) |
| Blast radius | PASS | 1 of 13 source files changed (`src/pages/Home.tsx`) |
| Persists after reload | PASS | after `webview.reload()`: same call site, same rendered background and class list |

### 2.2 Root-scope edit on the same node

| Test | Result | Evidence |
|---|---|---|
| Root edit of a `cn()`-merged library class | REFUSED, as designed | `class-transform-unsupported` — "A spread attribute may own className, so the class cannot be replaced safely." |
| Files changed | PASS (none) | 0 files; `card.tsx` `cn()` intact |
| UI explains the refusal | PASS | Root Classes field is read-only: "Warning: The class may come from a spread. Open the code to edit." |

### 2.3 Instance edit on a component that does not forward `className`

Selected: the `FeatureCard` `<article>` (component takes no props).

| Test | Result | Evidence |
|---|---|---|
| Commit from the Instance field | REFUSED | toast "Source edit not applied" + "FeatureCard does not accept props, so a call-site className cannot reach its markup."; 0 files changed |
| Same refusal at the IPC boundary | REFUSED | `{ ok: false, reason: "unsupported-instance-style", message: "FeatureCard does not accept props, so a call-site className cannot reach its markup." }` |
| Unknown component name is not guessed | REFUSED | `unsupported-instance-style` — "No component definition named NoSuchComponent was found in the implementation file."; 0 files |
| No root fallback | PASS | the instance request never wrote `FeatureCard.tsx` or the page |

### 2.4 Identity and batch integrity

| Test | Result | Evidence |
|---|---|---|
| Runtime identity must match its call site | REFUSED | `stale-mapping` — "The component instance no longer matches its call site. Re-select the element."; 0 files |
| Two edits for one source node | REFUSED | `duplicate-target` — "Two edits target the same source node (x:pejp1). Retry them separately."; 0 files |
| Batch with one unmapped target | REFUSED atomically | `missing-source-mapping`; the valid instance edit in the same batch was **not** written; call site still `className="bg-red-50"`; 0 files |

The batch also proves ordering: target resolution and duplicate detection happen
for every request before any file is transformed.

### 2.5 Automated acceptance suite

`node --test` over the bundled suite: **30 tests, 4 suites, 30 pass, 0 fail**
(~265 ms).

| # | Case | Expectation | Result |
|---|---|---|---|
| 1 | second of two call sites by index | resolves `card-b` | PASS |
| 2 | out-of-range index | refuses, does not return the last candidate | PASS |
| 3 | `-1` with more than one call site | refuses as ambiguous | PASS |
| 4 | `-1` with a single call site | resolves it | PASS |
| 5 | member-expression component | refuses instead of guessing | PASS |
| 6 | absent component | reports no candidate | PASS |
| 7 | component forwards `className` through a props binding | accepts | PASS |
| 8 | component spreads its props object | accepts | PASS |
| 9 | arrow component with destructured `className` | accepts | PASS |
| 10 | `React.forwardRef` (shadcn shape) | accepts | PASS |
| 11 | `forwardRef` wrapper with a name that hides the inner function | inspects the wrapper, does not trust the name | PASS |
| 12 | component returns a fragment | refuses | PASS |
| 13 | component ignores `className` | refuses | PASS |
| 14 | component takes no props | refuses | PASS |
| 15 | component cannot be found by name | refuses | PASS |
| 16 | single occurrence of an oid | counts 1 | PASS |
| 17 | duplicated oid | counts 2 so the batch can be refused | PASS |
| 18 | missing target | counts 0 | PASS |
| 19 | class merge into a static string | merges | PASS |
| 20 | no existing `className` | inserts one | PASS |
| 21 | recognised `cn()` call | appends an argument, preserves the logic | PASS |
| 22 | unknown helper call | refuses without touching it | PASS |
| 23 | conditional `className` | refuses | PASS |
| 24 | logical `className` | refuses | PASS |
| 25 | spread that may own `className` | refuses | PASS |
| 26 | dynamic template literal | refuses | PASS |
| 27 | static template literal | adds a class without losing existing ones | PASS |
| 28 | static string with override | replaces it | PASS |
| 29 | override of a `cn()` call | refuses (the Phase 3B data-loss case) | PASS |
| 30 | override of a conditional | refuses | PASS |

## 3. Verification commands

| Command | Result | Notes |
|---|---|---|
| `npx esbuild electron/main/code/phase3c.acceptance.test.ts --bundle --platform=node --format=cjs --outfile=.phase3c/tests.cjs --external:@babel/parser --external:@babel/generator --external:@babel/types` then `node --test .phase3c/tests.cjs` | PASS | 30/30; the temporary bundle directory was removed afterwards |
| `npx tsc --noEmit` (apps/studio) | PASS | exit 0, no output |
| `npx eslint <touched main, renderer, model paths>` | PASS | 0 errors, 6 warnings; the same six warnings exist on the base commit (verified by linting the `HEAD` copies of the two files), so no new lint debt |
| `npx vite build` (apps/studio) | PASS | renderer `dist/`, main `dist-electron/main/index.js`, preload rebuilt |
| Runtime probes (`node probe3c.mjs`, `node probe3c-refusals.mjs`) | PASS | results in section 2; both probes restore `src/pages/Home.tsx` |
| `node --test "tests/**/*.test.mjs"` (Kumite root) | FAIL (pre-existing) | 5 failures in `tests/architecture.test.mjs` (skill frontmatter assertions); same baseline as Phase 3B, nothing under `.agents/` touched |
| `python _tools/links.py` (Kumite root) | FAIL (pre-existing) | `_shared/patterns/README.md` links `gsap/README.md`, which is absent |
| `npm test` / `bun test` (apps/studio) | NOT RUN | `bun` is not installed on this host |
| `npm run e2e` (apps/studio) | NOT RUN | suite expects a dev server and a display; runtime verification used direct Electron launch |

## 4. Known limits

1. **Forwarding detection is static and conservative.** It accepts props
   bindings, props spreads, destructured `className`, and `forwardRef`/`memo`
   wrappers. It does not follow aliases/re-exports (`const C = Card`), HOC
   wrappers, or components that forward a differently named prop. Such
   components are refused, not guessed.
2. **Library-internal classes are protected by refusal.** When `className` is a
   `cn()` call, a spread, a conditional or a dynamic template, root-scope edits
   are refused (`class-transform-unsupported`) instead of rewriting the
   expression. The Instance field remains the supported way to style those
   components, and it works when forwarding is proven (section 2.1).
3. **Class-utility whitelist only.** `cn`, `clsx`, `classNames`, `cx`,
   `twMerge`. Other helpers and all computed expressions are refused.
4. **Runtime identity is not durable.** The instance id is derived from the
   call-site `data-oid` and is materialized by the selection instrumentation; a
   selection taken before instrumentation has no instance id (the probe records
   `null` before selection and `m2yth9z` after). The engine refuses instead of
   falling back to the root target.
5. **Scope of migration.** Phase 3C migrated the class/attribute/text/style
   path. Structural actions (insert, remove, move, duplicate) keep their existing
   contract and were not re-targeted in this phase.
6. **`node-pty` unbuilt** in the isolated checkout, so the fixture's dev server
   runs externally; injection still comes from the real `run-start` flow.
7. **No `bun`**, so the Studio unit suite and Playwright e2e suite were not run;
   equivalent behaviour was measured by direct runtime probes.
8. **Batch deduplication is per IPC call.** Two identical requests in one batch
   are refused (`duplicate-target`); two sequential user actions are separate
   transactions and each may commit.

## 5. Acceptance gate

| Criterion | Result |
|---|---|
| Instance vs implementation edits are explicit and never inferred | PASS |
| Instance edits work when `className` forwarding is proven (shadcn `React.forwardRef` `CardHeader`) | PASS |
| Instance edits are refused with a reason when forwarding is not proven | PASS |
| One target = one source node; one request = one owner | PASS |
| No scope escalation or reduction, no silent fallback | PASS |
| A batch with one impossible target writes nothing | PASS |
| Existing JSX expressions are never replaced destructively; the Phase 3B `cn()` loss cannot recur | PASS |
| History semantics preserved (the call site keeps its own node; the library keeps its expression) | PASS |
| Runtime identity is verified, not assumed durable | PASS |
| Typecheck, lint, build, acceptance suite | PASS; 5 pre-existing, unrelated Kumite test failures documented |

**Gate result: PASS for Phase 3C scope.**

The Phase 3B row "Edit a library component's internal node — FAIL" is
superseded: the same `CardHeader` edit now succeeds at the call site, and the
root path refuses without damaging `card.tsx`.

## Unchanged-work statement

- No branch, commit, push, fork or PR.
- Kumite changes: this report and `UPSTREAM.md`.
- Upstream checkout: uncommitted changes listed in section 1; no other source
  touched.
- Fixture restored to its pre-run baseline after each probe (`Home.tsx`
  rewritten from the probe snapshot, no instrumentation card, no acceptance
  classes); the app project store was restored from backup.
- Security posture unchanged; no hardening added or removed.
