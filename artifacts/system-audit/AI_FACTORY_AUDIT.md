
AI Agents Factory — Full Audit Report

**Root:** `/Users/nanofactory/ai-sdlc-factory`
**Project:** NearJobs (hyperlocal job marketplace)
**Audit date:** 2026-05-05 16:16 IST
**Auditor:** prompt-agent

---

## 1. Executive Summary

The factory is a **15-agent OpenClaw pipeline** wrapped in a small TypeScript orchestrator. It detects intent, runs a fixed sequence of agents per mode, injects `GLOBAL_RULES.md` + per-agent `AGENTS.md` into every prompt, and writes per-step artifacts to `artifacts/runs/<uuid>/`.

**Health verdict: functional but immature.** The skeleton works (3 prior runs on disk), but several declared capabilities are aspirational rather than wired:

- 2 agents registered + ruled but **never invoked** in any pipeline (`merge-agent`, `delivery-agent`).
- 1 agent directory **empty** and unregistered (`task-splitter-agent`).
- All 4 model tiers collapse to the same physical model (`anthropic/claude-opus-4-7`) — tiering is label-only.
- Rule enforcement is **prompt-only**; no programmatic policy gate, no diff inspection, no approval workflow despite `approvals/` directory.
- QA agent commands reference **paths that don't exist** in the scaffold (`nearjobs-backend/`, `frontend/nearjobs-web/`) — QA will fail until rules are corrected.
- Memory mandates a `QA_REPORT.json` that is never produced; `TASK_STATUS.json` is stale.
- 7 of 53 OpenClaw skills ready; the most useful for this factory (`github`, `gh-issues`, `coding-agent`, `oracle`) all need setup.

---

## 2. Repository Layout

```
/Users/nanofactory/ai-sdlc-factory
├── GLOBAL_RULES.md         # Top-level safety contract
├── factory.yaml            # Project metadata, stack, orchestration knobs
├── agents/                 # 15 sub-folders, each with AGENTS.md (1 empty)
├── orchestrator/           # TS orchestrator (tsx + zod + uuid)
│   └── src/
│       ├── index.ts        # Entry point
│       ├── agentRunner.ts  # Spawns `openclaw agent --agent <n> --message <p>`
│       ├── modeDetector.ts # Keyword-based intent classifier
│       ├── modelRouter.ts  # Logical tier → model alias map
│       └── pipelines.ts    # Mode → agent sequence
├── memory/                 # PROJECT_STATE.md, TASK_STATUS.json, NEXT_ACTIONS.json
├── artifacts/runs/<uuid>/  # Per-step .txt outputs (3 prior runs)
├── approvals/              # Empty (no approval workflow yet)
├── graphify/               # Empty (factory.yaml claims use_graphify=true)
├── logs/                   # Empty
├── workspace/              # Empty
└── nearjobs/               # Actual project repo (scaffolded earlier today)
```

---

## 3. Agents

15 factory agents are present on disk; 14 are registered with OpenClaw (plus the OpenClaw `main` default). All share workspace `~/ai-sdlc-factory/nearjobs` and physically run on `anthropic/claude-opus-4-7`.

| Agent | Role | Pipeline use | Status | Notes |
|---|---|---|---|---|
| `prompt-agent` | Raw request → JSON intent | new_project, new_feature | ✅ ready | Already emits `mode` — modeDetector duplicates this |
| `planning-architecture-agent` | Architecture + impl plan (JSON only) | new_project, new_feature, correction_feedback | ✅ ready | — |
| `codebase-analyzer-agent` | Read-only repo analysis | new_feature | ✅ ready | Would benefit from graphify (unimplemented) |
| `impact-analysis-agent` | Allowed/forbidden file scope | new_feature, correction_feedback | ✅ ready | — |
| `nearjobs-worker` | Implementation (FE + BE) | new_project, new_feature, correction_feedback | ✅ ready | "coding" tier resolves to opus-4-7 |
| `qa-agent` | JUnit + Playwright + regression | all 4 pipelines | ⚠️ **incomplete** | Rules reference `nearjobs-backend/` and `frontend/nearjobs-web/` — paths don't exist; actual scaffold is `backend/` + `frontend/` |
| `fix-agent` | Minimal-change bug fixes | bug_fix | ✅ ready | — |
| `bug-triage-agent` | Severity + module classification | bug_fix | ✅ ready | Rules file is very thin |
| `reproduction-agent` | Failing test before fix | bug_fix | ✅ ready | — |
| `root-cause-agent` | Fault localization | bug_fix | ✅ ready | — |
| `feedback-agent` | User feedback → correction task | correction_feedback | ✅ ready | — |
| `merge-agent` | Safe merge (no force/main push) | **none** | 🟡 **unused** | Not in any pipeline → merging is manual |
| `delivery-agent` | Setup guide + changelog + summary | **none** | 🟡 **unused** | Not in any pipeline → never runs |
| `memory-manager-agent` | PROJECT_STATE / TASK_STATUS / QA_REPORT | all 4 pipelines | ⚠️ incomplete | `QA_REPORT.json` mandated but absent; `TASK_STATUS.json` stale |
| `task-splitter-agent` | (implied) split big tasks | **none** | ❌ **incomplete** | Directory empty, no `AGENTS.md`, not registered with OpenClaw |

### 3.1 Agent rules — observations

- **Strict-output agents** (`prompt-agent`, `planning-architecture-agent`) clearly forbid file mutations. ✅
- **Worker / fix / qa** rules cover the destructive surface (DB, branches, force push, deletions, deps). ✅
- **Bug-triage and feedback rules** are minimal — only declare an output schema, no forbidden-actions list. Consider expanding for parity.
- **Memory-manager rules** mandate four files; only three exist. Either add the missing file or relax the rule.
- **No agent rules reference `approvals/` or `logs/`** — the factory has those directories but no protocol.
- **QA-agent rules contain stale paths** — highest-priority correctness bug in the rules layer.

---

## 4. Skills (OpenClaw)

`openclaw skills list` reports **7 ready / 53 total**. Full list condensed below.

### 4.1 Ready (7)

`browser-automation`, `healthcheck`, `node-connect`, `skill-creator`, `taskflow`, `taskflow-inbox-triage`, `weather`.

### 4.2 Recommended for this factory (currently `needs setup`)

| Skill | Why it matters here |
|---|---|
| `github` | Real merge-agent: branch ops, PR open/merge, status checks |
| `gh-issues` | Bug intake feeding `bug-triage-agent` from real issues |
| `coding-agent` | Offload heavy scaffolds/refactors (Claude Code / Codex) without burning opus tokens |
| `oracle` | Cross-model review of plans and diffs before merge |
| `session-logs` | Forensic search across pipeline runs (jq/rg) |
| `taskflow` (already ready) | Back the orchestrator state machine with durable, resumable jobs |

### 4.3 Not relevant for this factory now

`apple-notes`, `apple-reminders`, `bear-notes`, `blogwatcher`, `blucli`, `bluebubbles`, `camsnap`, `discord`, `eightctl`, `gifgrep`, `gog`, `goplaces`, `himalaya`, `imsg`, `nano-pdf`, `obsidian`, `openhue`, `ordercli`, `peekaboo`, `sag`, `sherpa-onnx-tts`, `slack`, `songsee`, `sonoscli`, `spotify-player`, `things-mac`, `trello`, `video-frames`, `voice-call`, `wacli`, `weather`, `xurl`, `notion`, `1password`, `clawhub`, `gemini`, `gh-issues` (until needed), `mcporter`, `model-usage`, `openai-whisper`, `openai-whisper-api`, `summarize`.

---

## 5. Memory

### 5.1 Present

| File | Purpose | State |
|---|---|---|
| `GLOBAL_RULES.md` | Safety contract injected into every prompt | ✅ current |
| `factory.yaml` | Project + stack + orchestration knobs | ✅ current |
| `memory/PROJECT_STATE.md` | High-level project state | ⚠️ slightly stale ("Status: Fresh project initialized" — scaffold now exists) |
| `memory/TASK_STATUS.json` | Current/completed/next tasks | ❌ stale (`next: create_orchestrator` — already built and run) |
| `memory/NEXT_ACTIONS.json` | Action queue | ⚠️ partly stale (orchestrator placeholder test predates 3 actual runs) |
| `agents/<name>/AGENTS.md` | Per-agent rules, injected at runtime | ✅ all but `task-splitter-agent/` |

### 5.2 Missing / declared but absent

- `memory/QA_REPORT.json` — mandated by `memory-manager-agent` rules.
- `memory/ARCHITECTURE_DECISIONS.md` (or ADR index) — rules say "Save architecture decisions"; nothing on disk.
- `memory/RUN_INDEX.json` — no manifest over `artifacts/runs/<uuid>/`; resume is not possible.
- `memory/APPROVALS_LOG.md` — `approvals/` exists empty; no audit trail for human-gated actions.
- `graphify/*` — `factory.yaml` declares `use_graphify: true`; directory is empty.
- `logs/*` — empty; only per-step `.txt` artifacts exist, no centralized run log.

---

## 6. Orchestrator

### 6.1 Pipelines (`orchestrator/src/pipelines.ts`)

```
new_project           → prompt → planning → worker → qa → memory
new_feature           → prompt → memory → analyzer → impact → planning → worker → qa → memory
bug_fix               → triage → reproduction → root-cause → fix → qa → memory
correction_feedback   → feedback → impact → planning → worker → qa → memory
```

### 6.2 Model routing (`modelRouter.ts`)

| Tier | Agents | Resolved to |
|---|---|---|
| cheap | prompt, memory-manager, delivery | `cheap_model` (label only) |
| reasoning | planning, analyzer, impact, triage, root-cause, feedback, merge | `strong_reasoning_model` (label only) |
| coding | worker, fix | `coding_model` (label only) |
| qa | qa, reproduction | `qa_reasoning_model` (label only) |

The strings are **prompt labels**, not real provider/model identifiers. `openclaw agents list` shows every registered agent uses `anthropic/claude-opus-4-7`. Tiering currently saves no cost and provides no specialization.

### 6.3 Runtime model

- `index.ts`: one-shot CLI invocation, sequential loop, no retries, no per-step timeout, no concurrency.
- `agentRunner.ts`: shells out to `openclaw agent --agent <n> --message <prompt>`, captures stdout, writes `NN_<agent>.txt` to the run dir.
- `modeDetector.ts`: keyword-based, brittle (`add` ⇒ new_feature, `fix` ⇒ bug_fix). Ignores the fact that `prompt-agent` already returns `mode`.
- `package.json`: `typescript: ^6.0.3` is invalid (no such release; current major is 5). Will break clean installs; bumping it is gated by global rules.

### 6.4 QA + safety enforcement

- `factory.yaml` declares `qa_required: true` and `max_parallel_workers: 3`.
- The orchestrator does **not parse QA output** — `currentInput = output` blindly. A failing `qa-agent` does not block the next step.
- Parallelism knob is ignored; loop is strictly sequential.
- No JSON schema validation despite `zod` being a declared dependency.
- All "no destructive action" rules rely on the model honoring the prompt — no diff sniffing, no command sandbox, no policy gate.

---

## 7. Missing Capabilities

1. **Branch hygiene** — no automated `git checkout -b feat/<runId>` step; rule "feature branch only" relies on agent self-discipline.
2. **PR + merge automation** — `merge-agent` exists but is unrouted; no `github` skill.
3. **Approvals workflow** — `approvals/` is empty; nothing writes/reads it; agents can't cleanly request human consent.
4. **JSON schema validation** — no `zod` schemas wired despite `zod` in `package.json`.
5. **QA gating** — pipeline does not abort on QA failure or branch into `bug_fix`.
6. **Resume / run index** — runs are UUID-isolated with no index, can't resume from step N.
7. **Centralized logs** — `logs/` empty; only per-step `.txt` artifacts.
8. **Code graph** — `graphify/` empty though declared.
9. **Real model tiering** — tier strings never become provider IDs.
10. **Approval-gated dependency installs** — global rules forbid dep changes; no mechanism to request/apply them.
11. **Schema for handoff** — outputs travel as raw stdout text, downstream agents must hope it parses.
12. **Per-step timeouts / retries** — none.

## 8. Unused Capabilities

- `merge-agent` — registered, ruled, never invoked.
- `delivery-agent` — registered, ruled, never invoked.
- `task-splitter-agent` — directory empty, not registered, not piped.
- `graphify/` — directory empty, declared in config.
- `approvals/` — directory empty, no protocol.
- `logs/` — directory empty.
- `workspace/` — directory empty (intent unclear).
- `zod` dep — installed, never imported.
- `taskflow` skill — ready, would naturally back the state machine; not used.

## 9. Risky Gaps

- **QA-agent rules drift** — wrong subdirectory names will make QA always fail or always pass-by-vacuity.
- **No programmatic policy enforcement** — model is the only line of defense for destructive ops despite the rule list.
- **Pipeline never terminates on QA failure** — memory-manager-agent will record success-shaped state regardless.
- **Stale memory** — agents read `TASK_STATUS.json` claiming setup work is still pending, biasing future runs.
- **modeDetector misroutes** — "add fix for bug" → matches both `add` and `bug`; first match wins (`bug_fix`), but a phrasing shift flips the pipeline silently.
- **Empty `task-splitter-agent` dir** — if anything later wires it in expecting rules, agentRunner will inject blank rules and the agent will run unbounded.

---

## 10. Recommended Next Steps

Ordered by leverage (highest first). Items marked 🔒 require human approval per global rules.

### Tier 1 — Correctness (do this week)

1. **Fix `qa-agent/AGENTS.md` paths**: `cd nearjobs-backend && ./mvnw test` → `cd backend && ./mvnw test`; `cd frontend/nearjobs-web && npm test` → `cd frontend && npm test`. Without this, QA cannot run.
2. **Add a QA gate in `index.ts`**: parse `qa-agent` JSON; if `status != "passed"`, abort or branch into `bug_fix`.
3. **Use `prompt-agent.mode` as the source of truth** instead of `modeDetector.ts`. Detector becomes a fallback for non-JSON inputs.
4. **Refresh memory**: update `PROJECT_STATE.md` to reflect the existing scaffold; rewrite `TASK_STATUS.json` and `NEXT_ACTIONS.json`; seed `memory/QA_REPORT.json` (empty) so memory-manager has its mandated set.

### Tier 2 — Plumbing

5. **Wire `merge-agent` and `delivery-agent`** into `new_feature`, `bug_fix`, `correction_feedback` (after QA passes).
6. **Validate every agent output with `zod`** in `agentRunner.ts`. One schema per agent, taken from each `AGENTS.md` "Output:" block.
7. **Add `memory/RUN_INDEX.json`** (append on each run) and per-run `logs/<runId>.ndjson`.
8. **Pre-flight branch step**: orchestrator creates `feat/<runId>` before worker; post-flight opens a PR (once `github` skill is set up).
9. **Decide and resolve `task-splitter-agent`**: either implement (rules + register + insert before worker for large plans) or 🔒 remove the empty directory.

### Tier 3 — Skill enablement

10. **Set up `github`** (install `gh`, auth) — unlocks real `merge-agent` and PR automation.
11. **Set up `gh-issues`** — feeds `bug-triage-agent` from a real tracker.
12. **Set up `coding-agent`** — delegate heavy scaffolds/refactors away from opus.
13. **Set up `oracle`** — second-model review pass before merge.
14. **Run `graphify`** over `nearjobs/backend` and `nearjobs/frontend`; store under `graphify/`. Honors `factory.yaml use_graphify: true`.

### Tier 4 — Hardening

15. **Approvals protocol**: orchestrator writes `approvals/<runId>.json` when an agent flags `approval_required`, blocks until updated to `status: approved`. Add `APPROVALS_LOG.md`.
16. **Real model tiering**: map tier → real provider/model in `modelRouter.ts`, pass via `--model` to `openclaw agent`. Likely cheaper, faster, and lets QA use a different reasoning profile than the worker.
17. **Per-step timeout + max-attempts retry** in `agentRunner.ts`.
18. **Honor `max_parallel_workers: 3`**: parallelize independent steps (e.g., `codebase-analyzer` + `impact-analysis` can run concurrently in `new_feature`).
19. **Back the state machine with the `taskflow` skill** for durable, resumable runs and child-task fanout.
20. 🔒 **Bump `orchestrator/package.json` typescript** from invalid `^6.0.3` to a real release (`^5.6.0`); this is a dependency change so requires approval.

### Tier 5 — Process polish

21. Expand thin agent rule files (`bug-triage-agent`, `feedback-agent`, `reproduction-agent`) with explicit forbidden-actions sections to match the rest of the fleet.
22. Add `docs/architecture/orchestrator.md` describing the pipelines, modes, and gates so the human operator has a single source of truth.
23. Move stale `nearjobs/.openclaw/` (per-agent runtime state) policy into `.gitignore` review (already excluded — just confirm it stays out).

---

## 11. Compliance Snapshot vs `GLOBAL_RULES.md`

| Rule | Enforcement today | Gap |
|---|---|---|
| No direct push to main | Prompt-only | No git hook / CI block |
| No force push | Prompt-only | No git hook / CI block |
| No branch delete | Prompt-only | No git hook |
| No file delete without approval | Prompt-only | No diff scanner |
| No dep change without approval | Prompt-only | No lockfile diff check |
| No destructive DB action | Prompt-only | No SQL linter / migration gate |
| QA must pass before merge | Prompt + `merge-agent` rule | `merge-agent` not in pipeline; no QA gate in orchestrator |
| JUnit for backend changes | `qa-agent` runs `mvn test` (paths broken) | Path bug = silent skip |
| Playwright for UI changes | `qa-agent` runs `npx playwright test` (paths broken) | Path bug = silent skip |
| Every agent outputs JSON first | Encoded in each `AGENTS.md` | Not validated programmatically |

**Bottom line:** every safety rule is a *prompt assertion*, not a *system invariant*. Acceptable for an early-stage factory; address before granting the worker or fix-agent broader autonomy.

---

## 12. One-Page TL;DR

- ✅ **Skeleton works.** Modes, pipelines, per-agent rules, artifact capture all in place.
- ⚠️ **3 high-impact fixes:** QA paths, QA gate in orchestrator, refresh stale memory.
- 🟡 **2 unused agents** (`merge-agent`, `delivery-agent`) and **1 empty agent dir** (`task-splitter-agent`) need a decision.
- ❌ **No real enforcement layer.** Rules are prompt text; add `zod` schema validation, an approvals protocol, and a QA gate.
- 🛠 **Biggest unlocks** if you set up 4 skills: `github`, `gh-issues`, `coding-agent`, `oracle`.
- 💸 **Tiering is a fiction** — every agent uses `opus-4-7`. Wire real model IDs to make `cheap` and `qa` tiers actually different.
