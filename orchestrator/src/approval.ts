import fs from "fs";
import path from "path";
import { loadState, saveState } from "./state.js";

const APPROVAL_PATH = path.resolve(process.cwd(), "artifacts/plans/approval-state.json");

export type ApprovalState = {
  status:
    | "WAITING_FOR_PLAN"
    | "WAITING_FOR_HUMAN_APPROVAL"
    | "REVISION_REQUESTED"
    | "APPROVED";
  planVersion: number;
  approved: boolean;
  approvedAt: string | null;
  revisionRequested: boolean;
  revisionNotes: string[];
};

export function loadApprovalState(): ApprovalState {
  return JSON.parse(fs.readFileSync(APPROVAL_PATH, "utf8")) as ApprovalState;
}

export function requestApproval(planVersion: number): ApprovalState {
  const approval: ApprovalState = {
    status: "WAITING_FOR_HUMAN_APPROVAL",
    planVersion,
    approved: false,
    approvedAt: null,
    revisionRequested: false,
    revisionNotes: []
  };

  fs.writeFileSync(APPROVAL_PATH, JSON.stringify(approval, null, 2));

  const state = loadState();
  state.status = "WAITING_FOR_HUMAN_APPROVAL";
  state.planVersion = planVersion;
  saveState(state);

  return approval;
}

export function requestRevision(note: string): ApprovalState {
  const approval = loadApprovalState();
  approval.status = "REVISION_REQUESTED";
  approval.revisionRequested = true;
  approval.revisionNotes.push(note);
  approval.approved = false;
  approval.approvedAt = null;

  fs.writeFileSync(APPROVAL_PATH, JSON.stringify(approval, null, 2));
  return approval;
}

export function approvePlan(): ApprovalState {
  const approval = loadApprovalState();

  approval.status = "APPROVED";
  approval.approved = true;
  approval.approvedAt = new Date().toISOString();
  approval.revisionRequested = false;

  fs.writeFileSync(APPROVAL_PATH, JSON.stringify(approval, null, 2));

  const state = loadState();
  state.status = "APPROVED_FOR_EXECUTION";
  state.gates.PLAN_APPROVED = true;
  saveState(state);

  return approval;
}

export function assertPlanApproved(): void {
  const approval = loadApprovalState();

  if (!approval.approved) {
    throw new Error("Execution blocked: human approval is required before engineering starts.");
  }
}
