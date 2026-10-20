/**
 * Run: `npx tsx --test apps/web/src/lib/qr-codes/content.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWifiUri,
  isCouponExpired,
  qrPrintValue,
} from "./content";

describe("qrPrintValue", () => {
  it("encodes a native WIFI URI for Wi-Fi codes", () => {
    const value = qrPrintValue(
      "WIFI",
      { ssid: "Cafe Guest", password: "secret;1", encryption: "WPA" },
      "https://app.example/q/token",
    );
    assert.equal(value, 'WIFI:T:WPA;S:Cafe Guest;P:secret\\;1;;');
  });

  it("falls back to the short link for other types", () => {
    assert.equal(
      qrPrintValue("LINK", { url: "https://pay.example" }, "https://app.example/q/token"),
      "https://app.example/q/token",
    );
  });

  it("keeps the short link when a Wi-Fi code is gated", () => {
    assert.equal(
      qrPrintValue(
        "WIFI",
        { ssid: "Cafe Guest", password: "secret", encryption: "WPA" },
        "https://app.example/q/token",
        { gated: true },
      ),
      "https://app.example/q/token",
    );
  });
});

describe("buildWifiUri", () => {
  it("omits the password on open networks", () => {
    assert.equal(
      buildWifiUri({ ssid: "OpenNet", encryption: "nopass" }),
      "WIFI:T:nopass;S:OpenNet;;",
    );
  });
});

describe("isCouponExpired", () => {
  it("treats a date-only expiry as the end of that day", () => {
    assert.equal(isCouponExpired("2020-01-01", new Date("2020-01-01T12:00:00")), false);
    assert.equal(isCouponExpired("2020-01-01", new Date("2020-01-02T00:00:01")), true);
  });

  it("is not expired when no date is set", () => {
    assert.equal(isCouponExpired(undefined), false);
    assert.equal(isCouponExpired(""), false);
  });
});
