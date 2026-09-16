export const timezone = 'Asia/Tbilisi';

export function formatDate(value, includeDate = false) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, ...(includeDate ? { day: '2-digit', month: 'short', year: 'numeric' } : {}),
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(value));
}

export function formatDuration(seconds) {
  if (seconds == null) return 'Ongoing';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

export const metric = (value, suffix = ' ms') => value == null ? '—' : `${Number(value).toFixed(value < 10 ? 1 : 0)}${suffix}`;
export const uptime = (value) => value == null ? 'No data' : `${Number(value).toFixed(2)}%`;

