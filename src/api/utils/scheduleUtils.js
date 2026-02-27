/**
 * Schedule utility — compute the next run time from a schedule config.
 * Shared by internal routes & monitored-contributor creation.
 */

/**
 * Build a UTC Date that represents a specific wall-clock time in an IANA timezone.
 *
 * For example, buildDateInTZ(today, 23, 28, 'Asia/Kolkata') returns a UTC Date
 * whose equivalent in Asia/Kolkata is 23:28 on that same calendar date.
 *
 * Uses an iterative approach: start with a rough estimate, format it in the
 * target tz, check the difference, and adjust.
 */
function buildDateInTZ(dateRef, hours, minutes, tz) {
  if (!tz || tz === 'UTC') {
    const d = new Date(dateRef);
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
  }

  try {
    // Get the calendar date in the target timezone
    const dateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const dateStr = dateFmt.format(dateRef); // e.g. "2026-02-27"

    // Build an ISO string like "2026-02-27T23:28:00" and figure out the
    // UTC offset by comparing what Intl says the local time is.
    // First estimate: treat the desired time as UTC
    let estimate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);

    // Now find what the wall-clock time is in `tz` at this UTC instant
    const timeFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      const parts = timeFmt.formatToParts(estimate);
      const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
      const localH = get('hour') === 24 ? 0 : get('hour');
      const localM = get('minute');

      const diffMinutes = (hours * 60 + minutes) - (localH * 60 + localM);

      if (diffMinutes === 0) break; // exact match

      // Adjust: if local is behind desired, we need to subtract from UTC (move earlier)
      // if local is ahead of desired, we need to add to UTC (move later)
      // But careful about day wrapping: if diff is > 720 or < -720, adjust by ±1440
      let adj = diffMinutes;
      if (adj > 720) adj -= 1440;
      if (adj < -720) adj += 1440;

      estimate = new Date(estimate.getTime() + adj * 60 * 1000);
    }

    return estimate;
  } catch {
    // If tz is invalid, fall back to treating time as UTC
    const d = new Date(dateRef);
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
  }
}

/**
 * Calculate next run time based on schedule config.
 * @param {object} schedule – { type, time, timezone, config }
 * @returns {Date|null}
 */
function calculateNextRunAt(schedule) {
  if (!schedule) return null;

  const now = new Date();
  const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number);
  const tz = schedule.timezone || 'UTC';

  if (schedule.type === 'daily') {
    let next = buildDateInTZ(now, hours, minutes, tz);
    if (next <= now) {
      // Move to next calendar day
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      next = buildDateInTZ(tomorrow, hours, minutes, tz);
    }
    return next;
  }

  if (schedule.type === 'specific_weekdays') {
    const weekdays = schedule.config?.weekdays || [1, 2, 3, 4, 5]; // Mon-Fri default
    for (let i = 0; i < 8; i++) {
      const day = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const candidate = buildDateInTZ(day, hours, minutes, tz);
      // Get the day-of-week in the target timezone
      const tzDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, weekday: 'short' });
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const tzDay = dayMap[tzDayFmt.format(candidate)] ?? candidate.getUTCDay();

      if (weekdays.includes(tzDay) && candidate > now) {
        return candidate;
      }
    }
  }

  if (schedule.type === 'fixed_interval' || schedule.type === 'interval_days') {
    const intervalDays = schedule.config?.intervalDays || 1;
    const futureDay = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return buildDateInTZ(futureDay, hours, minutes, tz);
  }

  if (schedule.type === 'one_time') {
    if (schedule.config?.date) {
      const next = buildDateInTZ(new Date(schedule.config.date), hours, minutes, tz);
      return next > now ? next : null;
    }
    let next = buildDateInTZ(now, hours, minutes, tz);
    if (next <= now) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      next = buildDateInTZ(tomorrow, hours, minutes, tz);
    }
    return next;
  }

  // Fallback: next day at the configured time
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return buildDateInTZ(tomorrow, hours, minutes, tz);
}

module.exports = { calculateNextRunAt };
