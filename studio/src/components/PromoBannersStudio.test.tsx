import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioActionsContext } from "../context/StudioContext";
import {
  createMockCaptures,
  createMockDesign,
  createMockDeviceSpec,
  createMockManifest,
} from "../test/fixtures";
import { PromoBannersStudio, type PromoBannersStudioProps } from "./PromoBannersStudio";

const mockApiFetch = vi.fn();

vi.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("../lib/analytics", () => ({
  trackAssetDownloaded: vi.fn(),
  trackExport: vi.fn(),
  trackToolOpened: vi.fn(),
}));

vi.mock("./AdBanner", () => ({
  AdBanner: () => <div data-testid="mock-ad-banner" />,
}));

function createBannerProps(overrides: Partial<PromoBannersStudioProps> = {}): PromoBannersStudioProps {
  const design = createMockDesign();
  const manifest = createMockManifest({ design });
  return {
    manifest,
    platform: "ios",
    design,
    captures: createMockCaptures(),
    spec: createMockDeviceSpec(),
    locale: "en-US",
    background: "#0E1B2A",
    frameUrl: "/frames/17-pro-silver.png",
    fontFamily: '"DM Sans", system-ui, sans-serif',
    copy: {},
    order: [],
    template: "",
    layout: "classic",
    screenOnly: false,
    sceneLayouts: {},
    sceneBackgrounds: {},
    sceneBadges: {},
    appInfo: {
      name: "BudgetFlow",
      subtitle: "Smart Personal Finance",
      category: "Finance",
    },
    ...overrides,
  };
}

describe("PromoBannersStudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === "/api/icon") {
        return new Response(JSON.stringify({ iconUrl: null }), { status: 200 });
      }
      if (url === "/api/export-banner") {
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob(["png-bytes"], { type: "image/png" }),
        };
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
  });

  it("renders banner customizer, switches formats & retina resolution, and toggles safe area presets", async () => {
    const user = userEvent.setup();
    render(
      <StudioActionsContext.Provider value={{ refresh: vi.fn(async () => {}), toast: vi.fn() }}>
        <PromoBannersStudio {...createBannerProps()} />
      </StudioActionsContext.Provider>,
    );

    expect(screen.getByText("Banner Customizer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download PNG.*1024×500/i })).toBeInTheDocument();

    // Switch format to Product Hunt (1270×760)
    await user.click(screen.getByRole("button", { name: /Product Hunt/i }));
    expect(screen.getByRole("button", { name: /Download PNG.*1270×760/i })).toBeInTheDocument();

    // Switch resolution to 2x Retina
    await user.click(screen.getByRole("button", { name: "2x" }));
    expect(screen.getByRole("button", { name: /Download PNG.*2540×1520/i })).toBeInTheDocument();

    // Toggle Store Safe Area Overlay ON -> reveals Cutoff Margin Preset controls
    const safeAreaBtn = screen.getByRole("button", { name: "OFF" });
    await user.click(safeAreaBtn);
    expect(screen.getByRole("button", { name: "ON" })).toBeInTheDocument();
    expect(screen.getByText("Cutoff Margin Preset")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Strict (20%)" }));
  });

  it("posts banner payload to /api/export-banner when downloading PNG", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <StudioActionsContext.Provider value={{ refresh: vi.fn(async () => {}), toast: vi.fn() }}>
        <PromoBannersStudio {...createBannerProps()} />
      </StudioActionsContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: /Download PNG/i }));

    await waitFor(() => {
      const exportCall = mockApiFetch.mock.calls.find(([url]) => url === "/api/export-banner");
      expect(exportCall).toBeTruthy();
      const body = JSON.parse(exportCall![1].body as string);
      expect(body.type).toBe("google-play");
      expect(body.scale).toBe(1);
      expect(body.title).toBe("BudgetFlow");
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    clickSpy.mockRestore();
  });
});
