import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, initials, truncate, titleCase } from "./format";

describe("formatting helpers", () => {
  it("formats money and handles missing values", () => {
    expect(formatMoney(1200)).toContain("1,200");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney("not a number")).toBe("not a number");
  });

  it("formats numbers with separators", () => {
    expect(formatNumber(1234567)).toBe((1234567).toLocaleString());
    expect(formatNumber(null)).toBe("—");
  });

  it("derives initials from names", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Ada King Lovelace")).toBe("AL");
    expect(initials("Ada")).toBe("AD");
    expect(initials("")).toBe("?");
  });

  it("title-cases enum-ish strings", () => {
    expect(titleCase("IN_PROGRESS")).toBe("In Progress");
    expect(titleCase("superadmin")).toBe("Superadmin");
    expect(titleCase(null)).toBe("—");
  });

  it("truncates long text with an ellipsis", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
});
