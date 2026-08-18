import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { openDatabase, getPublishedConfig, getEditableConfig, saveDraft, publishDraft, listLeads, insertLead } from './store.js';
import { calculateEstimate, validateConfig } from './calculate.js';
import { toPublicConfig } from './public-config.js';

const port = Number(process.env.PORT || 3000);
const db = await openDatabase();
const dist = join(process.cwd(), 'dist');

const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
const parseBody = async req => {
  let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1_000_000) throw new Error('Request too large'); }
  return JSON.parse(body || '{}');
};
const equal = (a, b) => { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); };
const authorized = req => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Basic' || !token) return false;
  const [user, pass] = Buffer.from(token, 'base64').toString().split(':');
  return equal(user || '', process.env.OWNER_USERNAME || 'dale') && equal(pass || '', process.env.OWNER_PASSWORD || 'northline-demo');
};
const requireAuth = (req, res) => {
  if (authorized(req)) return true;
  res.writeHead(401, { 'www-authenticate': 'Basic realm="Northline owner panel"', 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Owner login required.' })); return false;
};
const validateContact = contact => {
  const errors = {};
  if (!contact?.name?.trim()) errors.name = 'Enter your name.';
  if (!/^\+?[\d\s().-]{7,20}$/.test(contact?.phone || '')) errors.phone = 'Enter a valid phone number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact?.email || '')) errors.email = 'Enter a valid email address.';
  return errors;
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, toPublicConfig(await getPublishedConfig(db)));
    if (req.method === 'POST' && url.pathname === '/api/leads') {
      const body = await parseBody(req);
      const contactErrors = validateContact(body.contact);
      const config = await getPublishedConfig(db, Number(body.configVersion));
      if (!config) return json(res, 409, { error: 'This estimate session expired. Please restart with the latest questions.' });
      const estimate = calculateEstimate(config, body.answers || {});
      if (estimate.errors || Object.keys(contactErrors).length) return json(res, 422, { errors: { ...estimate.errors, ...contactErrors } });
      const lead = { id: `ld_${randomUUID().slice(0, 8)}`, captured_at: new Date().toISOString(), config_version: config.config_version, ...body.contact, answers: body.answers, estimate_low: estimate.low, estimate_high: estimate.high };
      await insertLead(db, lead);
      return json(res, 201, lead);
    }
    if (url.pathname.startsWith('/api/admin')) {
      if (!requireAuth(req, res)) return;
      if (req.method === 'GET' && url.pathname === '/api/admin/config') return json(res, 200, await getEditableConfig(db));
      if (req.method === 'PUT' && url.pathname === '/api/admin/config') {
        const body = await parseBody(req); const errors = validateConfig(body);
        if (errors.length) return json(res, 422, { error: errors[0], errors });
        return json(res, 200, { config: await saveDraft(db, body), message: 'Draft saved. The public estimator is unchanged.' });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/publish') {
        const published = await publishDraft(db); return published ? json(res, 200, { config: published, message: `Version ${published.config_version} is live.` }) : json(res, 409, { error: 'There is no draft to publish.' });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/leads') return json(res, 200, await listLeads(db));
    }
    if (url.pathname === '/owner' && !requireAuth(req, res)) return;
    if (req.method === 'GET') {
      const requested = url.pathname === '/' || url.pathname === '/owner' ? 'index.html' : normalize(url.pathname).replace(/^\/+/, '');
      if (requested.includes('..')) return json(res, 400, { error: 'Invalid path.' });
      try {
        const file = await readFile(join(dist, requested));
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
        res.writeHead(200, { 'content-type': types[extname(requested)] || 'application/octet-stream' }); return res.end(file);
      } catch { if (!extname(requested)) { const file = await readFile(join(dist, 'index.html')); res.writeHead(200, { 'content-type': 'text/html' }); return res.end(file); } }
    }
    json(res, 404, { error: 'Not found.' });
  } catch (error) { console.error(error); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
});

server.listen(port, () => console.log(`Northline listening on http://localhost:${port}`));
