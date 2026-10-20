/**
 * Run: `npx tsx --test src/lib/qr-codes/render-svg.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_QR_DESIGN } from "./design";
import { renderQrDesignSvg } from "./render-svg";

describe("renderQrDesignSvg", () => {
  it("renders a scannable SVG with brand colors", async () => {
    const svg = await renderQrDesignSvg("https://app.example/q/token", {
      ...DEFAULT_QR_DESIGN,
      fgColor: "#123456",
      bgColor: "#fefefe",
    });
    assert.match(svg, /^<svg /);
    assert.match(svg, /#123456/);
    assert.match(svg, /#fefefe/);
  });

  it("includes the frame label on caption frames", async () => {
    const svg = await renderQrDesignSvg("https://app.example/q/token", {
      ...DEFAULT_QR_DESIGN,
      frameId: "caption",
      frameLabel: "Pay now",
    });
    assert.match(svg, /Pay now/);
    assert.ok(svg.includes("height=") && !svg.includes('height="0"'));
  });
});
