import { listIncidents } from '../services/incidentService.js';
import { config } from '../config.js';

function startOfTodayInZone(timeZone) {
  const formatter = (includeTime) => new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' } : {})
  });
  const values = (date, includeTime) => Object.fromEntries(formatter(includeTime).formatToParts(date)
    .filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  const today = values(new Date(), false);
  const desiredUtc = Date.UTC(today.year, today.month - 1, today.day);
  let guess = desiredUtc;
  for (let attempt = 0; attempt < 2; attempt++) {
    const shown = values(new Date(guess), true);
    const displayedAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
    guess = desiredUtc - (displayedAsUtc - guess);
  }
  return new Date(guess).toISOString();
}

export function incidents(req, res) {
  const windows = { today: 86400, '24h': 86400, '7d': 604800 };
  const seconds = windows[req.query.range] ?? 604800;
  const since = req.query.range === 'today' ? startOfTodayInZone(config.timezone) : new Date(Date.now() - seconds * 1000).toISOString();
  res.json(listIncidents({ since, serviceId: req.query.serviceId, limit: req.query.limit }));
}
