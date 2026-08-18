async function request(path, options) {
  const response = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || 'Request failed.'); error.data = data; throw error; }
  return data;
}

export const api = {
  config: () => request('/api/config'),
  submit: body => request('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
  adminConfig: () => request('/api/admin/config'),
  saveConfig: body => request('/api/admin/config', { method: 'PUT', body: JSON.stringify(body) }),
  publish: () => request('/api/admin/publish', { method: 'POST' }),
  leads: () => request('/api/admin/leads')
};
