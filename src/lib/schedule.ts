/**
 * Calculate the next execution date for a recurring schedule.
 */
export function calculateNextExecution(
  frequency: string,
  interval: number,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  from?: Date
): Date {
  const base = from ?? new Date();
  const next = new Date(base);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly": {
      next.setDate(next.getDate() + 7 * interval);
      // Snap to target day of week if specified
      if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
        const currentDay = next.getDay();
        const diff = dayOfWeek - currentDay;
        next.setDate(next.getDate() + diff);
        // If that pushed us backward, add a week
        if (next <= base) {
          next.setDate(next.getDate() + 7);
        }
      }
      break;
    }
    case "monthly": {
      next.setMonth(next.getMonth() + interval);
      // Snap to target day of month if specified (cap at max days in month)
      if (dayOfMonth !== null && dayOfMonth >= 1 && dayOfMonth <= 31) {
        const maxDay = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0
        ).getDate();
        next.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    }
    default:
      // Fallback: treat as monthly
      next.setMonth(next.getMonth() + interval);
  }

  return next;
}

/**
 * Format a frequency description for display.
 */
export function formatFrequency(
  frequency: string,
  interval: number,
  dayOfWeek: number | null,
  dayOfMonth: number | null
): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (interval === 1) {
    switch (frequency) {
      case "daily":
        return "Every day";
      case "weekly":
        return dayOfWeek !== null
          ? `Every ${dayNames[dayOfWeek]}`
          : "Every week";
      case "monthly":
        return dayOfMonth !== null
          ? `Monthly on the ${ordinal(dayOfMonth)}`
          : "Every month";
    }
  }

  switch (frequency) {
    case "daily":
      return `Every ${interval} days`;
    case "weekly":
      return dayOfWeek !== null
        ? `Every ${interval} weeks on ${dayNames[dayOfWeek]}`
        : `Every ${interval} weeks`;
    case "monthly":
      return dayOfMonth !== null
        ? `Every ${interval} months on the ${ordinal(dayOfMonth)}`
        : `Every ${interval} months`;
  }

  return `Every ${interval} ${frequency}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
