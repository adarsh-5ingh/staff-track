const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current date in YYYY-MM-DD format in the India/Kolkata timezone.
 */
export function getTodayDateString(timezone: string = DEFAULT_TIMEZONE): string {
  return getLocalDateString(new Date(), timezone);
}

/**
 * Returns the YYYY-MM-DD representation of a Date object in the India/Kolkata timezone.
 */
export function getLocalDateString(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}
