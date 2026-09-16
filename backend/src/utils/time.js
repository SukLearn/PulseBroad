export const isoNow = () => new Date().toISOString();
export const sinceIso = (seconds) => new Date(Date.now() - seconds * 1000).toISOString();

