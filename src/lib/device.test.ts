import { describe, expect, it } from "vitest";
import { describeDevice } from "./device";

describe("describeDevice", () => {
  it("combines browser and platform", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      ),
    ).toBe("Chrome on macOS");
  });

  it("recognises mobile Safari and Android Chrome", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iPhone");

    expect(
      describeDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/121.0 Mobile Safari/537.36"),
    ).toBe("Chrome on Android");
  });

  it("does not call Edge Chrome", () => {
    expect(
      describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0"),
    ).toBe("Edge on Windows");
  });

  it("falls back for missing or unrecognised agents", () => {
    expect(describeDevice(null)).toBe("Unknown device");
    expect(describeDevice("curl/8.4.0")).toBe("Unknown device");
  });
});
