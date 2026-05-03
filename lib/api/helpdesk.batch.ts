/**
 * Batch tasks client (Phase C — long-running ticket operations).
 *
 * Distinct from the synchronous bulk ops in `helpdesk.ts`. Those return
 * results in the same request; batch tasks return an ID immediately and
 * the UI polls. Real backend will likely use a job queue (Celery/RQ).
 *
 * MOCK MODE shares the master flag from helpdesk.ts. Mock fixtures cover
 * all 5 statuses (queued, running, succeeded, partial, failed). Schema
 * tracked as Q-HD-10.
 */
import { MOCK_MODE } from "./helpdesk";
import type {
  BatchTask,
  BatchTaskType,
  BatchTaskStatus,
  BatchTasksListParams,
  BatchTasksListResponse,
  BatchTaskActionResponse,
} from "@/lib/modules/helpdesk/types";

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

const MOCK_TASKS: BatchTask[] = [
  {
    id: 7001,
    org_id: 1,
    task_type: "bulk_reassign",
    status: "running",
    label: "Reassign 14 tickets to OnCall Olivia",
    input_params: { from_user_id: 12, to_user_id: 9, ticket_count: 14 },
    progress: { processed: 8, total: 14, succeeded: 8, failed: 0 },
    result: null,
    error_message: null,
    created_by: 7,
    created_by_name: "Tech Tim",
    created_at: minutesAgo(3),
    started_at: minutesAgo(2),
    completed_at: null,
  },
  {
    id: 7002,
    org_id: 1,
    task_type: "sla_recompute",
    status: "queued",
    label: "Recompute SLA on 412 open tickets",
    input_params: { scope: "all_open" },
    progress: { processed: 0, total: 412, succeeded: 0, failed: 0 },
    result: null,
    error_message: null,
    created_by: 7,
    created_by_name: "Tech Tim",
    created_at: minutesAgo(1),
    started_at: null,
    completed_at: null,
  },
  {
    id: 7003,
    org_id: 1,
    task_type: "bulk_export",
    status: "succeeded",
    label: "Export Q1 resolved tickets to CSV",
    input_params: {
      filters: { status: "resolved", from: "2026-01-01", to: "2026-03-31" },
    },
    progress: { processed: 287, total: 287, succeeded: 287, failed: 0 },
    result: {
      succeeded_ids: [],
      failures: [],
      artifact_url: "/api/proxy/helpdesk/api/batch/7003/download",
    },
    error_message: null,
    created_by: 9,
    created_by_name: "OnCall Olivia",
    created_at: minutesAgo(45),
    started_at: minutesAgo(45),
    completed_at: minutesAgo(43),
  },
  {
    id: 7004,
    org_id: 1,
    task_type: "bulk_status_change",
    status: "partial",
    label: "Sweep close 18 onboarding tickets older than 30d",
    input_params: { status: "resolved", scope: "onboarding_stale" },
    progress: { processed: 18, total: 18, succeeded: 15, failed: 3 },
    result: {
      succeeded_ids: [
        2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012,
        2013, 2014, 2015,
      ],
      failures: [
        { id: 2016, error: "ticket already closed" },
        { id: 2017, error: "ticket already closed" },
        { id: 2018, error: "permission denied (cross-org)" },
      ],
      artifact_url: null,
    },
    error_message: null,
    created_by: 7,
    created_by_name: "Tech Tim",
    created_at: minutesAgo(120),
    started_at: minutesAgo(120),
    completed_at: minutesAgo(118),
  },
  {
    id: 7005,
    org_id: 1,
    task_type: "ticket_archive",
    status: "failed",
    label: "Archive tickets older than 2y to cold storage",
    input_params: { older_than: "730d" },
    progress: { processed: 0, total: null, succeeded: 0, failed: 0 },
    result: null,
    error_message: "Cold storage bucket not configured (config.archive_url missing)",
    created_by: 9,
    created_by_name: "OnCall Olivia",
    created_at: minutesAgo(360),
    started_at: minutesAgo(360),
    completed_at: minutesAgo(360),
  },
];

function applyFilters(
  tasks: BatchTask[],
  params: BatchTasksListParams,
): BatchTask[] {
  let result = tasks;
  if (params.status) {
    result = result.filter((t) => t.status === params.status);
  }
  if (params.task_type) {
    result = result.filter((t) => t.task_type === params.task_type);
  }
  return [...result].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function deriveCounts(): { running: number; queued: number } {
  let running = 0;
  let queued = 0;
  for (const t of MOCK_TASKS) {
    if (t.status === "running") running += 1;
    else if (t.status === "queued") queued += 1;
  }
  return { running, queued };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchBatchTasks(
  params: BatchTasksListParams,
): Promise<BatchTasksListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 120));
    const filtered = applyFilters(MOCK_TASKS, params);
    const start = (params.page - 1) * params.per_page;
    const counts = deriveCounts();
    return {
      success: true,
      data: {
        tasks: filtered.slice(start, start + params.per_page),
        total: filtered.length,
        running_count: counts.running,
        queued_count: counts.queued,
        page: params.page,
        per_page: params.per_page,
      },
    };
  }
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("per_page", String(params.per_page));
  if (params.status) qs.set("status", params.status);
  if (params.task_type) qs.set("task_type", params.task_type);
  const res = await fetch(`/api/proxy/helpdesk/api/batch?${qs.toString()}`);
  if (!res.ok) throw new Error(`fetchBatchTasks failed: ${res.status}`);
  return res.json();
}

export async function fetchBatchTask(id: number): Promise<{
  success: boolean;
  data: { task: BatchTask };
}> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const task = MOCK_TASKS.find((t) => t.id === id);
    if (!task) throw new Error(`404: batch task ${id} not found`);
    return { success: true, data: { task } };
  }
  const res = await fetch(`/api/proxy/helpdesk/api/batch/${id}`);
  if (!res.ok) throw new Error(`fetchBatchTask failed: ${res.status}`);
  return res.json();
}

export interface CancelBatchTaskInput {
  taskId: number;
  reason?: string;
}

export async function cancelBatchTask(
  input: CancelBatchTaskInput,
): Promise<BatchTaskActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 180));
    const idx = MOCK_TASKS.findIndex((t) => t.id === input.taskId);
    if (idx < 0) throw new Error(`404: batch task ${input.taskId} not found`);
    const t = MOCK_TASKS[idx];
    if (t.status !== "queued" && t.status !== "running") {
      throw new Error(`Cannot cancel task in status "${t.status}"`);
    }
    MOCK_TASKS[idx] = {
      ...t,
      status: "cancelled",
      completed_at: new Date().toISOString(),
    };
    return {
      success: true,
      message: `(mock) Batch task #${input.taskId} cancelled.`,
      data: { task: MOCK_TASKS[idx] },
    };
  }
  const res = await fetch(
    `/api/proxy/helpdesk/api/batch/${input.taskId}/cancel`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: input.reason }),
    },
  );
  if (!res.ok) throw new Error(`cancelBatchTask failed: ${res.status}`);
  return res.json();
}

export interface StartBatchTaskInput {
  task_type: BatchTaskType;
  label: string;
  input_params: Record<string, unknown>;
}

export async function startBatchTask(
  input: StartBatchTaskInput,
): Promise<BatchTaskActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    const newId =
      MOCK_TASKS.reduce((max, t) => (t.id > max ? t.id : max), 7000) + 1;
    const created: BatchTask = {
      id: newId,
      org_id: 1,
      task_type: input.task_type,
      status: "queued",
      label: input.label,
      input_params: input.input_params,
      progress: { processed: 0, total: null, succeeded: 0, failed: 0 },
      result: null,
      error_message: null,
      created_by: 7,
      created_by_name: "Tech Tim",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };
    MOCK_TASKS.push(created);
    return {
      success: true,
      message: `(mock) Batch task #${newId} queued.`,
      data: { task: created },
    };
  }
  const res = await fetch(`/api/proxy/helpdesk/api/batch`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`startBatchTask failed: ${res.status}`);
  return res.json();
}
