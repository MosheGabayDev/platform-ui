import { describe, it, expect } from "vitest";
import {
  fetchBatchTasks,
  fetchBatchTask,
  cancelBatchTask,
  startBatchTask,
} from "./helpdesk.batch";

describe("helpdesk batch tasks client (mock mode)", () => {
  it("fetchBatchTasks returns paginated list with counts", async () => {
    const res = await fetchBatchTasks({ page: 1, per_page: 50 });
    expect(res.success).toBe(true);
    expect(res.data.tasks.length).toBeGreaterThan(0);
    expect(res.data.running_count).toBeGreaterThanOrEqual(0);
    expect(res.data.queued_count).toBeGreaterThanOrEqual(0);
  });

  it("fetchBatchTasks filters by status", async () => {
    const res = await fetchBatchTasks({
      page: 1,
      per_page: 50,
      status: "succeeded",
    });
    expect(res.data.tasks.every((t) => t.status === "succeeded")).toBe(true);
    expect(res.data.tasks.length).toBeGreaterThan(0);
  });

  it("fetchBatchTasks filters by task_type", async () => {
    const res = await fetchBatchTasks({
      page: 1,
      per_page: 50,
      task_type: "bulk_export",
    });
    expect(res.data.tasks.every((t) => t.task_type === "bulk_export")).toBe(true);
  });

  it("partial-status task carries failures with reasons", async () => {
    const res = await fetchBatchTasks({
      page: 1,
      per_page: 50,
      status: "partial",
    });
    const t = res.data.tasks[0];
    expect(t.result).not.toBeNull();
    expect(t.result!.failures.length).toBeGreaterThan(0);
    expect(t.result!.failures[0].error.length).toBeGreaterThan(0);
    expect(t.progress.processed).toBe(t.progress.succeeded + t.progress.failed);
  });

  it("succeeded export task exposes artifact_url", async () => {
    const res = await fetchBatchTask(7003);
    expect(res.data.task.status).toBe("succeeded");
    expect(res.data.task.result?.artifact_url).toMatch(/\/batch\/7003\/download$/);
  });

  it("fetchBatchTask throws 404 for unknown id", async () => {
    await expect(fetchBatchTask(99999)).rejects.toThrow(/404/);
  });

  it("cancelBatchTask cancels a running task", async () => {
    const res = await cancelBatchTask({ taskId: 7001 });
    expect(res.success).toBe(true);
    expect(res.data?.task.status).toBe("cancelled");
  });

  it("cancelBatchTask refuses to cancel a succeeded task", async () => {
    await expect(cancelBatchTask({ taskId: 7003 })).rejects.toThrow(
      /cannot cancel task in status/i,
    );
  });

  it("startBatchTask appends a queued task", async () => {
    const before = await fetchBatchTasks({ page: 1, per_page: 50 });
    const res = await startBatchTask({
      task_type: "sla_recompute",
      label: "Recompute SLA on critical-priority tickets",
      input_params: { scope: "critical_only" },
    });
    expect(res.success).toBe(true);
    expect(res.data?.task.status).toBe("queued");
    expect(res.data?.task.id).toBeGreaterThan(7000);
    const after = await fetchBatchTasks({ page: 1, per_page: 50 });
    expect(after.data.total).toBe(before.data.total + 1);
  });
});
