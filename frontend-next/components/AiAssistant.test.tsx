import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AiAssistant from "./AiAssistant";

const mocks = vi.hoisted(() => ({
  pathname: "/feed",
  post: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));
vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", is_demo: false } }),
}));
vi.mock("@/api/client", () => ({ default: { post: mocks.post } }));

describe("AiAssistant guided tour", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.pathname = "/feed";
    mocks.post.mockReset().mockResolvedValue({ data: { reply: "Tour step" } });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    Element.prototype.scrollIntoView = vi.fn();
  });

  function openAssistant() {
    render(<AiAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "ai.title" }));
  }

  it("starts with tour context and ends when the user selects End tour", async () => {
    openAssistant();

    fireEvent.click(screen.getByRole("button", { name: "ai.startTour" }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    expect(mocks.post.mock.calls[0][1].context).toMatchObject({
      page: "/feed",
      tourMode: true,
    });
    expect(await screen.findByText("Tour step")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "ai.endTour" }));

    expect(screen.getByText("ai.tourEnded")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "ai.endTour" })).toBeNull();
  });

  it("ends the tour when the route changes", async () => {
    const { rerender } = render(<AiAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "ai.title" }));
    fireEvent.click(screen.getByRole("button", { name: "ai.startTour" }));
    await screen.findByText("Tour step");

    mocks.pathname = "/orders";
    rerender(<AiAssistant />);

    await waitFor(() => expect(screen.getByText("ai.tourPageChanged")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "ai.endTour" })).toBeNull();
  });

  it("ends immediately when the user types a clear stop command", async () => {
    openAssistant();
    fireEvent.click(screen.getByRole("button", { name: "ai.startTour" }));
    await screen.findByText("Tour step");

    const input = screen.getByRole("textbox", { name: "ai.placeholder" });
    fireEvent.change(input, { target: { value: "stop the tour" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(await screen.findByText("ai.tourEnded")).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "ai.endTour" })).toBeNull();
  });
});
