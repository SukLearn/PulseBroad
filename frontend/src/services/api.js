const base = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const api = {
  dashboard: () => request('/dashboard'),
  services: (category) => request(`/services${category ? `?category=${category}` : ''}`),
  service: (id) => request(`/services/${id}`),
  results: (id, range) => request(`/services/${id}/results?range=${range}`),
  stats: (id) => request(`/services/${id}/stats`),
  serviceIncidents: (id) => request(`/services/${id}/incidents`),
  incidents: (range = '7d', serviceId = '') => request(`/incidents?range=${range}${serviceId ? `&serviceId=${serviceId}` : ''}`),
  external: () => request('/external-services'),
  externalDetail: (id) => request(`/external-services/${id}`),
  createService: (body) => request('/services', { method: 'POST', body }),
  updateService: (id, body) => request(`/services/${id}`, { method: 'PUT', body }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),
  checkService: (id) => request(`/services/${id}/check`, { method: 'POST' })
};
