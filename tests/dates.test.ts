import { describe, expect, it, vi } from "vitest";
import { formatClockInTimeZone, todayIso } from "~/utils/dates";

describe("timezone date helpers", () => {
  it("uses timezone for todayIso instead of UTC midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T03:30:00.000Z"));

    expect(todayIso("UTC")).toBe("2026-07-02");
    expect(todayIso("America/New_York")).toBe("2026-07-01");

    vi.useRealTimers();
  });

  it("formats clock strings in a timezone", () => {
    const formatted = formatClockInTimeZone("UTC", new Date("2026-07-02T15:45:00.000Z"));
    expect(formatted).toContain("Jul");
    expect(formatted).toMatch(/3:45|15:45/);
  });
});
