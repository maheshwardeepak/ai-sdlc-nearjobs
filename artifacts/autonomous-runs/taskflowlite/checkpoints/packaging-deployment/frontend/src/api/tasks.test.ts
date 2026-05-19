import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { createTask, listTasks, updateTaskStatus } from "./tasks";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mocked = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

describe("tasks api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listTasks builds query string from filters", async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await listTasks({ teamId: 1, status: "TODO", unassigned: true });
    expect(mocked.get).toHaveBeenCalledWith(
      "/api/tasks?teamId=1&status=TODO&unassigned=true",
    );
  });

  it("createTask posts payload", async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await createTask({ title: "X", priority: "HIGH", teamId: 1 });
    expect(mocked.post).toHaveBeenCalledWith("/api/tasks", {
      title: "X",
      priority: "HIGH",
      teamId: 1,
    });
  });

  it("updateTaskStatus patches status", async () => {
    mocked.patch.mockResolvedValue({ data: { id: 1, status: "DONE" } });
    await updateTaskStatus(1, "DONE");
    expect(mocked.patch).toHaveBeenCalledWith("/api/tasks/1/status", {
      status: "DONE",
    });
  });
});