import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

vi.mock("./api/health", () => ({
  fetchHealth: vi.fn().mockResolvedValue({ status: "UP" }),
}));

describe("App", () => {
  it("renders title and resolves backend health", async () => {
    render(<App />);
    expect(screen.getByText(/TaskFlowLite/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("health-status")).toHaveTextContent("UP");
    });
  });
});