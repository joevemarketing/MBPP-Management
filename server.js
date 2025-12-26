const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { z } = require('zod');
dotenv.config();

const { traccarClient, hasTraccarConfig } = require('./services/traccar');
const { getVehiclesAsync, getContractorsAsync, getMetrics } = require('./services/domain');
const tasks = require('./data/tasks.json');
const { supabaseService } = require('./services/supabase');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", 'https://unpkg.com', 'https://fonts.googleapis.com', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors({ origin: true }));
app.use(compression());
app.use(express.json({ limit: '256kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
  }
});
app.use('/api/', apiLimiter);

function requireApiKey(req, res, next) {
  const key = req.header('x-api-key') || req.query.api_key;
  if (!process.env.APP_API_KEY) {
    return res.status(500).json({ error: 'Server not configured: APP_API_KEY missing' });
  }
  if (key !== process.env.APP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', traccarConfigured: hasTraccarConfig() });
});

app.get('/api/info', requireApiKey, async (req, res) => {
  try {
    const client = traccarClient();
    const positions = await client.getLatestPositions();
    res.json({ ok: true, traccar: hasTraccarConfig(), positions: positions.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'info_failed' });
  }
});

app.get('/api/devices', requireApiKey, async (req, res) => {
  try {
    const client = traccarClient();
    const devices = await client.getDevices();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.get('/api/positions', requireApiKey, async (req, res) => {
  try {
    const client = traccarClient();
    const positions = await client.getLatestPositions();
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

app.get('/api/vehicles', requireApiKey, async (req, res) => {
  try {
    const v = await getVehiclesAsync();
    res.json(v);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

const contractorSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(1),
  reg_no: z.string().min(1).optional(),
  kpi_on_time_rate: z.number().min(0).max(1).optional(),
  kpi_collection_efficiency: z.number().min(0).max(1).optional()
});

const vehicleSchema = z.object({
  id: z.number().int().optional(),
  plate: z.string().min(1),
  type: z.string().min(1),
  capacity_kg: z.number().int().optional(),
  contractor_id: z.number().int().optional()
});

function ensureServiceClient(res) {
  const sb = supabaseService();
  if (!sb) {
    res.status(500).json({ error: 'server_missing_service_key' });
    return null;
  }
  return sb;
}

app.post('/api/contractors', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const parsed = contractorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_payload' });
  const { data, error } = await sb.from('contractors').insert([parsed.data]).select('*').single();
  if (error) return res.status(500).json({ error: 'insert_failed' });
  res.json(data);
});

app.put('/api/contractors/:id', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const id = Number(req.params.id);
  const parsed = contractorSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_payload' });
  const { data, error } = await sb.from('contractors').update(parsed.data).eq('id', id).select('*').single();
  if (error) return res.status(500).json({ error: 'update_failed' });
  res.json(data);
});

app.delete('/api/contractors/:id', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const id = Number(req.params.id);
  const { error } = await sb.from('contractors').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'delete_failed' });
  res.json({ ok: true });
});

app.post('/api/vehicles', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_payload' });
  const { data, error } = await sb.from('vehicles').insert([parsed.data]).select('*').single();
  if (error) return res.status(500).json({ error: 'insert_failed' });
  res.json(data);
});

app.put('/api/vehicles/:id', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const id = Number(req.params.id);
  const parsed = vehicleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_payload' });
  const { data, error } = await sb.from('vehicles').update(parsed.data).eq('id', id).select('*').single();
  if (error) return res.status(500).json({ error: 'update_failed' });
  res.json(data);
});

app.delete('/api/vehicles/:id', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const id = Number(req.params.id);
  const { error } = await sb.from('vehicles').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'delete_failed' });
  res.json({ ok: true });
});

app.get('/api/contractors', requireApiKey, async (req, res) => {
  try {
    const c = await getContractorsAsync();
    res.json(c);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch contractors' });
  }
});

app.get('/api/metrics', requireApiKey, async (req, res) => {
  try {
    const client = traccarClient();
    const positions = await client.getLatestPositions();
    const metrics = await getMetrics(positions);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute metrics' });
  }
});

app.get('/api/tasks', requireApiKey, async (req, res) => {
  // Simple file-backed tasks API; expand to Supabase as needed
  try {
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/stream/positions', requireApiKey, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let active = true;
  const client = traccarClient();
  async function tick() {
    if (!active) return;
    try {
      const positions = await client.getLatestPositions();
      res.write(`data: ${JSON.stringify(positions)}\n\n`);
    } catch (e) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'poll_failed' })}\n\n`);
    }
    setTimeout(tick, 5000);
  }
  tick();
  req.on('close', () => { active = false; });
});

app.use(express.static(path.join(__dirname, 'public')));
// Serve legacy app (static build) and SPA fallback
app.use('/legacy', express.static(path.join(__dirname, 'public', 'legacy')));
app.get('/legacy/*', (req, res) => {
  const legacyIndex = path.join(__dirname, 'public', 'legacy', 'index.html');
  res.sendFile(legacyIndex, (err) => {
    if (err) res.status(404).send('Legacy app not found');
  });
});

const port = process.env.APP_PORT ? Number(process.env.APP_PORT) : 3000;
app.listen(port, () => {
  console.log(`MBPP dashboard listening on http://localhost:${port}`);
});
