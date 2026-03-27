/**
 * Calculate the next scheduled run date for a report based on frequency and day.
 */
export function calculateNextRunAt(
  frequency: string,
  day: number | null,
  from?: Date
): Date {
  const base = from ?? new Date();
  const next = new Date(base);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly": {
      // day = 0-6 (Sun-Sat)
      const targetDay = day ?? 1; // default Monday
      const currentDay = next.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      next.setDate(next.getDate() + daysUntil);
      break;
    }
    case "monthly": {
      // day = 1-31
      const targetDom = day ?? 1;
      next.setMonth(next.getMonth() + 1);
      const maxDay = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();
      next.setDate(Math.min(targetDom, maxDay));
      break;
    }
    default:
      next.setDate(next.getDate() + 1);
  }

  // Set to midnight UTC
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Format a report schedule for display.
 */
export function formatReportSchedule(
  frequency: string,
  day: number | null
): string {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  switch (frequency) {
    case "daily":
      return "Every day";
    case "weekly":
      return day !== null && day >= 0 && day <= 6
        ? `Every ${dayNames[day]}`
        : "Every week";
    case "monthly": {
      if (day !== null && day >= 1 && day <= 31) {
        const s = ["th", "st", "nd", "rd"];
        const v = day % 100;
        const suffix = s[(v - 20) % 10] || s[v] || s[0];
        return `Monthly on the ${day}${suffix}`;
      }
      return "Every month";
    }
    default:
      return frequency;
  }
}
