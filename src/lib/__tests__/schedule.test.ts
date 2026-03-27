import { describe, it, expect } from "vitest";
import { calculateNextExecution, formatFrequency } from "../schedule";

describe("calculateNextExecution", () => {
  const baseDate = new Date("2026-03-15T12:00:00Z");

  describe("daily frequency", () => {
    it("adds 1 day for interval 1", () => {
      const result = calculateNextExecution("daily", 1, null, null, baseDate);
      expect(result.getDate()).toBe(16);
    });

    it("adds multiple days for larger interval", () => {
      const result = calculateNextExecution("daily", 3, null, null, baseDate);
      expect(result.getDate()).toBe(18);
    });
  });

  describe("weekly frequency", () => {
    it("adds 7 days for interval 1 without dayOfWeek", () => {
      const result = calculateNextExecution("weekly", 1, null, null, baseDate);
      expect(result.getDate()).toBe(22);
    });

    it("adds 14 days for interval 2 without dayOfWeek", () => {
      const result = calculateNextExecution("weekly", 2, null, null, baseDate);
      expect(result.getDate()).toBe(29);
    });

    it("snaps to target day of week", () => {
      // March 15 2026 is a Sunday (0)
      // Target: Monday (1)
      const result = calculateNextExecution("weekly", 1, 1, null, baseDate);
      expect(result.getDay()).toBe(1); // Monday
      expect(result > baseDate).toBe(true);
    });
  });

  describe("monthly frequency", () => {
    it("adds 1 month for interval 1", () => {
      const result = calculateNextExecution("monthly", 1, null, null, baseDate);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
    });

    it("snaps to target day of month", () => {
      const result = calculateNextExecution("monthly", 1, null, 25, baseDate);
      expect(result.getDate()).toBe(25);
      expect(result.getMonth()).toBe(3); // April
    });

    it("caps day at end of shorter months", () => {
      // From Jan 15, go 1 month to February, target day 31
      const janDate = new Date("2026-01-15T12:00:00Z");
      const result = calculateNextExecution("monthly", 1, null, 31, janDate);
      // Feb 2026 has 28 days
      expect(result.getDate()).toBe(28);
      expect(result.getMonth()).toBe(1); // February
    });

    it("adds multiple months for larger interval", () => {
      const result = calculateNextExecution("monthly", 3, null, null, baseDate);
      expect(result.getMonth()).toBe(5); // June
    });
  });

  describe("unknown frequency", () => {
    it("falls back to monthly", () => {
      const result = calculateNextExecution("custom", 1, null, null, baseDate);
      expect(result.getMonth()).toBe(3); // April
    });
  });
});

describe("formatFrequency", () => {
  describe("interval 1", () => {
    it("daily", () => {
      expect(formatFrequency("daily", 1, null, null)).toBe("Every day");
    });

    it("weekly without day", () => {
      expect(formatFrequency("weekly", 1, null, null)).toBe("Every week");
    });

    it("weekly with day", () => {
      expect(formatFrequency("weekly", 1, 1, null)).toBe("Every Monday");
    });

    it("monthly without day", () => {
      expect(formatFrequency("monthly", 1, null, null)).toBe("Every month");
    });

    it("monthly with day", () => {
      expect(formatFrequency("monthly", 1, null, 15)).toBe(
        "Monthly on the 15th"
      );
    });

    it("monthly with 1st", () => {
      expect(formatFrequency("monthly", 1, null, 1)).toBe(
        "Monthly on the 1st"
      );
    });

    it("monthly with 2nd", () => {
      expect(formatFrequency("monthly", 1, null, 2)).toBe(
        "Monthly on the 2nd"
      );
    });

    it("monthly with 3rd", () => {
      expect(formatFrequency("monthly", 1, null, 3)).toBe(
        "Monthly on the 3rd"
      );
    });
  });

  describe("interval > 1", () => {
    it("daily interval 3", () => {
      expect(formatFrequency("daily", 3, null, null)).toBe("Every 3 days");
    });

    it("weekly interval 2", () => {
      expect(formatFrequency("weekly", 2, null, null)).toBe("Every 2 weeks");
    });

    it("weekly interval 2 with day", () => {
      expect(formatFrequency("weekly", 2, 5, null)).toBe(
        "Every 2 weeks on Friday"
      );
    });

    it("monthly interval 3", () => {
      expect(formatFrequency("monthly", 3, null, null)).toBe(
        "Every 3 months"
      );
    });

    it("monthly interval 2 with day", () => {
      expect(formatFrequency("monthly", 2, null, 10)).toBe(
        "Every 2 months on the 10th"
      );
    });
  });

  describe("unknown frequency", () => {
    it("returns generic format", () => {
      expect(formatFrequency("custom", 2, null, null)).toBe(
        "Every 2 custom"
      );
    });
  });
});
