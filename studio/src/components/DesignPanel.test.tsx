import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockDesign } from "../test/fixtures";
import { DesignPanel, type DesignPanelProps } from "./DesignPanel";
import { THEME_PRESETS } from "./ThemePresets";

function createProps(overrides: Partial<DesignPanelProps> = {}): DesignPanelProps {
  return {
    design: createMockDesign(),
    deviceFrame: false,
    background: "#0E1B2A",
    frame: "17-pro-silver",
    fontFamily: '"DM Sans", system-ui, sans-serif',
    template: "",
    layout: "classic",
    screenOnly: false,
    headlineColor: "",
    subheadColor: "",
    fontSizeScale: 1,
    backgroundPattern: "none",
    patternOpacity: 0.05,
    deviceBacklight: false,
    panoramaMode: false,
    sceneBadges: {},
    sceneBackgrounds: {},
    onBackground: vi.fn(),
    onFrame: vi.fn(),
    onFontFamily: vi.fn(),
    onTemplate: vi.fn(),
    onLayout: vi.fn(),
    onScreenOnly: vi.fn(),
    onHeadlineColor: vi.fn(),
    onSubheadColor: vi.fn(),
    onFontSizeScale: vi.fn(),
    onBackgroundPattern: vi.fn(),
    onPatternOpacity: vi.fn(),
    onPatternColor: vi.fn(),
    onDeviceBacklight: vi.fn(),
    onPanoramaMode: vi.fn(),
    onSceneBadge: vi.fn(),
    onSceneBackground: vi.fn(),
    ...overrides,
  };
}

describe("DesignPanel", () => {
  it("renders all five design sections and applies a curated Theme Preset cleanly", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<DesignPanel {...props} />);

    expect(screen.getByText("Layout & Templates")).toBeInTheDocument();
    expect(screen.getByText("Theme Presets")).toBeInTheDocument();
    expect(screen.getByText("Background & Frame")).toBeInTheDocument();
    expect(screen.getByText("Typography & Colors")).toBeInTheDocument();
    expect(screen.getByText("Store Badges & Stickers")).toBeInTheDocument();

    const sunset = THEME_PRESETS.find((p) => p.id === "sunset-kinetic")!;
    await user.click(screen.getByRole("button", { name: /Sunset Kinetic/i }));

    expect(props.onBackground).toHaveBeenCalledWith(sunset.background);
    expect(props.onFrame).toHaveBeenCalledWith(sunset.frame);
    expect(props.onFontFamily).toHaveBeenCalledWith(sunset.fontFamily);
    expect(props.onHeadlineColor).toHaveBeenCalledWith(sunset.headlineColor);
    expect(props.onSubheadColor).toHaveBeenCalledWith(sunset.subheadColor);
    expect(props.onFontSizeScale).toHaveBeenCalledWith(sunset.fontSizeScale);
    expect(props.onDeviceBacklight).toHaveBeenCalledWith(sunset.deviceBacklight);
  });

  it("expands Typography & Colors and switches font size scale tabs", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<DesignPanel {...props} />);

    await user.click(screen.getByRole("button", { name: /Typography & Colors/i }));
    await user.click(screen.getByRole("tab", { name: "Large" }));
    expect(props.onFontSizeScale).toHaveBeenCalledWith(1.15);

    await user.click(screen.getByRole("tab", { name: "Compact" }));
    expect(props.onFontSizeScale).toHaveBeenCalledWith(0.85);
  });

  it("expands Background & Frame, switches background tabs, and selects a swatch", async () => {
    const user = userEvent.setup();
    const props = createProps({ background: "#0E1B2A" });
    render(<DesignPanel {...props} />);

    await user.click(screen.getByRole("button", { name: /Background & Frame/i }));
    await user.click(screen.getByRole("tab", { name: "Gradients" }));

    const transparentSwatch = screen.getByRole("button", { name: "Transparent" });
    await user.click(transparentSwatch);
    expect(props.onBackground).toHaveBeenCalledWith("transparent");
  });

  it("hides Base Layout picker when a template sequence is active", () => {
    const props = createProps({ template: "editorial" });
    render(<DesignPanel {...props} />);
    expect(screen.queryByText("Base Layout")).not.toBeInTheDocument();
  });
});
