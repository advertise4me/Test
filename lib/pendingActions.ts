import "server-only";
import { randomUUID } from "node:crypto";
import type { SpendDetails } from "@/lib/metaWriteGate";

// Server-side store for Meta write-tool calls that are awaiting explicit UI
// confirmation (see app/api/chat/route.ts, which creates these instead of
// calling the Meta API directly, and app/api/meta/confirm-action/route.ts,
// which is the only place that ever executes one).
//
// In-memory Map, scoped to this server process. Simplification/known
// limitation: a restart or a scale-out to multiple instances loses pending
// actions. That's an acceptable tradeoff here because nothing unsafe
// happens when an action is lost - the stored action is the only thing that
// can cause a Meta API call, so losing it just means the confirmation link
// goes stale. The TTL below, plus the "expired, please ask again" response
// in the confirm-action route, is the fallback for that case rather than a
// durable multi-instance store.

export interface PendingAction {
  id: string;
  userId: string;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  createdAt: number;
  spendAffecting: boolean;
  spendDetails?: SpendDetails;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map<string, PendingAction>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [id, action] of store) {
    if (now - action.createdAt > TTL_MS) store.delete(id);
  }
}

/** Records a proposed write action and returns it with a fresh id. */
export function createPendingAction(
  userId: string,
  tool: string,
  input: Record<string, unknown>,
  summary: string,
  spendAffecting: boolean,
  spendDetails?: SpendDetails,
): PendingAction {
  sweepExpired();
  const action: PendingAction = {
    id: randomUUID(),
    userId,
    tool,
    input,
    summary,
    createdAt: Date.now(),
    spendAffecting,
    spendDetails,
  };
  store.set(action.id, action);
  return action;
}

/** Looks up a pending action without removing it. Returns undefined if missing or expired. */
export function getPendingAction(id: string): PendingAction | undefined {
  const action = store.get(id);
  if (!action) return undefined;
  if (Date.now() - action.createdAt > TTL_MS) {
    store.delete(id);
    return undefined;
  }
  return action;
}

/**
 * Looks up and removes a pending action in one step, so it can only ever be
 * executed once. Use this right before calling the Meta API for it.
 */
export function consumePendingAction(id: string): PendingAction | undefined {
  const action = getPendingAction(id);
  if (action) store.delete(id);
  return action;
}

/** Discards a pending action (e.g. the user cancelled it). No-op if already gone. */
export function discardPendingAction(id: string): void {
  store.delete(id);
}
