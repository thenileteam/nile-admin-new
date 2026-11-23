import { describe, expect, it } from "vitest";
import { ACTIVITY_FILTERS, ACTIVITY_META, groupActivityByDay, type ActivityItem } from "./activity";

const item = (id: string, at: string): ActivityItem => ({
  id,
  at,
  type: "order",
  title: `Item ${id}`,
});

describe("groupActivityByDay", () => {
  it("groups consecutive items of the same day", () => {
    const groups = groupActivityByDay([
      item("a", "2026-11-22T10:00:00.000Z"),
      item("b", "2026-11-22T08:00:00.000Z"),
      item("c", "2026-11-21T20:00:00.000Z"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((entry) => entry.id)).toEqual(["c"]);
  });

  it("keeps a malformed timestamp in an 'unknown' bucket", () => {
    const groups = groupActivityByDay([item("a", "not-a-date")]);
    expect(groups[0].day).toBe("unknown");
    expect(groups[0].label).toBe("Unknown date");
  });

  it("returns an empty list for no activity", () => {
    expect(groupActivityByDay([])).toEqual([]);
  });
});

describe("activity filters", () => {
  it("offers an 'all' filter plus every activity type", () => {
    const values = ACTIVITY_FILTERS.map((filter) => filter.value);
    expect(values[0]).toBe("all");
    expect(values).toHaveLength(Object.keys(ACTIVITY_META).length + 1);
    for (const type of Object.keys(ACTIVITY_META)) {
      expect(values).toContain(type);
    }
  });
});
