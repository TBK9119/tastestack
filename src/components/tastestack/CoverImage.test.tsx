import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CoverImage from "./CoverImage";

describe("CoverImage", () => {
  it("renders an image when src is provided", () => {
    render(<CoverImage src="https://example.com/cover.jpg" alt="Test Cover" />);
    const img = screen.getByAltText("Test Cover");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain(encodeURIComponent("https://example.com/cover.jpg"));
  });

  it("renders the fallback icon when src is missing", () => {
    render(<CoverImage alt="Test Fallback" icon="☆" />);
    const fallbackText = screen.getByText("☆");
    expect(fallbackText).toBeInTheDocument();
  });

  it("applies the accent color to the fallback", () => {
    render(<CoverImage alt="Accent" icon="A" accent="#ff0000" />);
    const fallbackContainer = screen.getByText("A").closest("div");
    expect(fallbackContainer?.getAttribute("style")).toContain("#ff0000");
  });
});
