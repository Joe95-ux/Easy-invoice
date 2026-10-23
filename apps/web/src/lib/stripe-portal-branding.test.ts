/**
 * Run: `npx tsx --test src/lib/stripe-portal-branding.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  colorsTooSimilar,
  hexToRgbCss,
  parseCssColor,
  portalAvatarBlendsWithSidebar,
  rgbDistance,
} from "./stripe-portal-branding";

describe("parseCssColor", () => {
  it("parses hex and rgb", () => {
    assert.deepEqual(parseCssColor("#4338ca"), { r: 67, g: 56, b: 202 });
    assert.deepEqual(parseCssColor("#fff"), { r: 255, g: 255, b: 255 });
    assert.deepEqual(parseCssColor("rgb(67, 56, 202)"), { r: 67, g: 56, b: 202 });
  });
});

describe("colorsTooSimilar", () => {
  it("treats the brand indigo and white as distinct", () => {
    assert.equal(colorsTooSimilar("#4338ca", "#ffffff"), false);
    assert.ok(rgbDistance({ r: 67, g: 56, b: 202 }, { r: 255, g: 255, b: 255 }) > 48);
  });

  it("detects a letter-avatar plate that matches the sidebar", () => {
    assert.equal(colorsTooSimilar("#4338ca", "rgb(67, 56, 202)"), true);
    assert.equal(colorsTooSimilar("#4338ca", "#3d32b8"), true);
  });
});

describe("hexToRgbCss", () => {
  it("formats brand hex for Stripe branding settings", () => {
    assert.equal(hexToRgbCss("#4338ca"), "rgb(67, 56, 202)");
  });
});

describe("portalAvatarBlendsWithSidebar", () => {
  it("blends when Stripe falls back to a letter avatar", () => {
    assert.equal(
      portalAvatarBlendsWithSidebar({
        hasIcon: false,
        primaryColor: "#4338ca",
      }),
      true,
    );
  });

  it("blends when contrast matches the brand sidebar color", () => {
    assert.equal(
      portalAvatarBlendsWithSidebar({
        hasIcon: true,
        primaryColor: "#4338ca",
        contrastColor: "#4338ca",
      }),
      true,
    );
  });

  it("does not blend when the icon plate is white", () => {
    assert.equal(
      portalAvatarBlendsWithSidebar({
        hasIcon: true,
        primaryColor: "#4338ca",
        contrastColor: "#ffffff",
      }),
      false,
    );
  });
});
