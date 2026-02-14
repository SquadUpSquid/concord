import { describe, it, expect } from "vitest";
import { formatTimestamp } from "./formatters";

describe("formatTimestamp", () => {
  it("shows time for today", () => {
    const now = Date.now();
    const result = formatTimestamp(now);
    // Should be a time string like "2:30 PM" or "14:30"
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("shows 'Yesterday' for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(14, 30, 0, 0);
    const result = formatTimestamp(yesterday.getTime());
    expect(result).toContain("Yesterday");
  });

  it("shows date for older messages", () => {
    const old = new Date("2024-01-15T10:00:00Z");
    const result = formatTimestamp(old.getTime());
    // Should contain a date format
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});
