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
import { Strip } from "./Strip";
import type { StripProps } from "./strip/helpers";

const mockApiFetch = vi.fn();

vi.mock("../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("../lib/analytics", () => ({
  trackAppImported: vi.fn(),
  trackAssetDownloaded: vi.fn(),
  trackExport: vi.fn(),
}));

function createStripProps(overrides: Partial<StripProps> = {}): StripProps {
  const design = createMockDesign();
  const manifest = createMockManifest({ design });
  return {
    manifest,
    design,
    captures: createMockCaptures(),
    spec: createMockDeviceSpec(),
    locale: "en-US",
    background: "#0E1B2A",
    frameUrl: "/frames/17-pro-silver.png",
    fontFamily: '"DM Sans", system-ui, sans-serif',
    copy: {},
    onCopy: vi.fn(),
    order: [],
    onReorder: vi.fn(),
    template: "",
    layout: "classic",
    screenOnly: false,
    sceneLayouts: {},
    onSceneLayout: vi.fn(),
    sceneBackgrounds: {},
    onSceneBackground: vi.fn(),
    sceneBadges: {},
    onSceneBadge: vi.fn(),
    onRefresh: vi.fn(async () => {}),
    onToast: vi.fn(),
    ...overrides,
  };
}

describe("Strip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there are no captures", () => {
    const props = createStripProps({ captures: { screenshots: [], clips: null } });
    const { container } = render(<Strip {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders screenshot slides and supports single-slide selection, select-all, and clear", async () => {
    const user = userEvent.setup();
    const props = createStripProps();
    render(
      <StudioActionsContext.Provider value={{ refresh: vi.fn(async () => {}), toast: vi.fn() }}>
        <Strip {...props} />
      </StudioActionsContext.Provider>,
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select All/i })).toBeInTheDocument();

    // Select slide 1
    await user.click(screen.getByRole("button", { name: "Select slide 1" }));
    expect(screen.getByText("1 Selected")).toBeInTheDocument();
    expect(screen.getByText("1 Slide Selected")).toBeInTheDocument();

    // Select all slides
    await user.click(screen.getByRole("button", { name: "Select All" }));
    expect(screen.getByText("All Selected")).toBeInTheDocument();
    expect(screen.getByText("3 Slides Selected")).toBeInTheDocument();

    // Clear selection from floating bar
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText("3 Slides Selected")).not.toBeInTheDocument();
  });

  it("exports selected slides as a ZIP archive via /api/export-selected-zip", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => new Blob(["zip-bytes"], { type: "application/zip" }),
    });

    const props = createStripProps();
    render(<Strip {...props} />);

    await user.click(screen.getByRole("button", { name: "Select slide 1" }));
    const zipButtons = screen.getAllByRole("button", { name: /Download ZIP/i });
    await user.click(zipButtons[0]!);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/export-selected-zip",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body as string);
    expect(body.device).toBe("iphone-6.9");
    expect(body.locale).toBe("en-US");
    expect(body.items).toEqual([{ sceneId: "home" }]);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("syncs captures from iPhone to Android & iPad and triggers refresh + toast", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const props = createStripProps();
    render(<Strip {...props} />);

    await user.click(screen.getByRole("button", { name: /Sync to Android\/iPad/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/sync-captures",
        expect.objectContaining({ method: "POST" }),
      );
      expect(props.onToast).toHaveBeenCalledWith(
        expect.stringContaining("Synced screenshots from iPhone"),
      );
      expect(props.onRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
