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
  const apiKey = process.env.APP_API_KEY || 'dev-key-12345'; // Fallback for Vercel
  
  if (key !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', traccarConfigured: hasTraccarConfig() });
});

// Simple authentication (for demo purposes - in production, use proper auth system)
const users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
  { id: 2, username: 'manager', password: 'manager123', role: 'manager', name: 'Operations Manager' },
  { id: 3, username: 'contractor', password: 'contractor123', role: 'contractor', name: 'Contractor User' }
];

function authenticateUser(username, password) {
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Simple token validation (in production, use JWT)
  const user = users.find(u => u.id === parseInt(token));
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = { ...user, password: undefined };
  next();
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = authenticateUser(username, password);
    
    if (user) {
      res.json({ 
        user, 
        token: user.id.toString(), // Simple token (use JWT in production)
        message: 'Login successful'
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Check authentication for main app
app.use((req, res, next) => {
  // Allow access to login, health, and static files without auth
  const publicPaths = ['/login.html', '/api/auth/login', '/api/health', '/', '/favicon.svg', '/logo.jpeg'];
  if (publicPaths.some(path => req.path === path || req.path.startsWith(path.replace('.html', '')))) {
    return next();
  }
  
  const token = req.header('Authorization') || req.query.token;
  // Skip auth for demo mode, but allow token-based auth if provided
  if (!token && req.path.startsWith('/api/')) {
    // For API endpoints, check if there's a token in headers
    const authHeader = req.header('Authorization');
    if (!authHeader && !req.query.api_key) {
      return res.status(401).json({ error: 'Authentication required' });
    }
  }
  next();
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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

// Smart Bins API
app.get('/api/smart-bins', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('smart_bins').select('*').order('bin_id');
  if (error) return res.status(500).json({ error: 'Failed to fetch smart bins' });
  res.json(data);
});

app.post('/api/smart-bins', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('smart_bins').insert([req.body]).select('*').single();
  if (error) return res.status(500).json({ error: 'Failed to create smart bin' });
  res.json(data);
});

app.put('/api/smart-bins/:id', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const binId = req.params.id;
  const { data, error } = await sb.from('smart_bins').update(req.body).eq('bin_id', binId).select('*').single();
  if (error) return res.status(500).json({ error: 'Failed to update smart bin' });
  res.json(data);
});

// Collection Tasks API
app.get('/api/collection-tasks', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('collection_tasks').select('*, smart_bins(*)').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch collection tasks' });
  res.json(data);
});

app.post('/api/collection-tasks', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('collection_tasks').insert([req.body]).select('*').single();
  if (error) return res.status(500).json({ error: 'Failed to create collection task' });
  res.json(data);
});

app.put('/api/collection-tasks/:id', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const id = req.params.id;
  const { data, error } = await sb.from('collection_tasks').update(req.body).eq('id', id).select('*').single();
  if (error) return res.status(500).json({ error: 'Failed to update collection task' });
  res.json(data);
});

// Collection Routes API
app.get('/api/collection-routes', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('collection_routes').select('*, contractors(*), vehicles(*)').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch collection routes' });
  res.json(data);
});

app.post('/api/collection-routes', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('collection_routes').insert([req.body]).select('*').single();
  if (error) return res.status(500).json({ error: 'Failed to create collection route' });
  res.json(data);
});

// Route Optimization API
app.post('/api/optimize-route', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { selected_bins, vehicle_id, contractor_id } = req.body;
  
  try {
    // Get selected bins with locations
    const { data: bins, error: binsError } = await sb
      .from('smart_bins')
      .select('*')
      .in('bin_id', selected_bins);
    
    if (binsError) return res.status(500).json({ error: 'Failed to fetch bins' });
    
    // Simple route optimization - sort by distance from first point
    if (bins.length === 0) {
      return res.status(400).json({ error: 'No bins selected' });
    }
    
    const optimizedRoute = optimizeRoute(bins);
    const estimatedDuration = Math.round(bins.length * 15 + optimizedRoute.distance * 3); // 15 min per bin + 3 min per km
    
    // Create optimized route
    const { data: route, error: routeError } = await sb
      .from('collection_routes')
      .insert([{
        route_name: `Optimized Route ${new Date().toISOString()}`,
        contractor_id,
        vehicle_id,
        route_order: optimizedRoute.orderedBins,
        estimated_duration_minutes: estimatedDuration,
        total_distance_km: optimizedRoute.distance,
        status: 'planned'
      }])
      .select('*')
      .single();
    
    if (routeError) return res.status(500).json({ error: 'Failed to create route' });
    
    // Create collection tasks for each bin
    const tasks = optimizedRoute.orderedBins.map((binId, index) => ({
      bin_id: binId,
      vehicle_id,
      assigned_contractor_id: contractor_id,
      task_type: 'collection',
      priority: bins[optimizedRoute.originalIndex[index]].current_fill_level >= 75 ? 'high' : 'normal',
      status: 'pending',
      scheduled_time: new Date(Date.now() + index * 15 * 60000).toISOString() // 15 min intervals
    }));
    
    const { error: tasksError } = await sb.from('collection_tasks').insert(tasks);
    if (tasksError) return res.status(500).json({ error: 'Failed to create tasks' });
    
    res.json({
      route,
      optimized_bins: optimizedRoute.orderedBins,
      estimated_duration: estimatedDuration,
      total_distance: optimizedRoute.distance
    });
    
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ error: 'Route optimization failed' });
  }
});

// Simple route optimization function
function optimizeRoute(bins) {
  if (bins.length <= 1) {
    return { orderedBins: bins.map(b => b.bin_id), distance: 0, originalIndex: [] };
  }
  
  // Start with the bin that's fullest
  const startIndex = bins.findIndex(b => b.current_fill_level === Math.max(...bins.map(b => b.current_fill_level)));
  const unvisited = bins.map((bin, index) => ({ ...bin, originalIndex: index }));
  const visited = [];
  let currentBin = unvisited[startIndex];
  let totalDistance = 0;
  
  visited.push(currentBin);
  unvisited.splice(startIndex, 1);
  
  while (unvisited.length > 0) {
    // Find nearest unvisited bin
    let nearestIndex = 0;
    let minDistance = calculateDistance(
      currentBin.latitude, currentBin.longitude,
      unvisited[0].latitude, unvisited[0].longitude
    );
    
    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(
        currentBin.latitude, currentBin.longitude,
        unvisited[i].latitude, unvisited[i].longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    currentBin = unvisited[nearestIndex];
    totalDistance += minDistance;
    visited.push(currentBin);
    unvisited.splice(nearestIndex, 1);
  }
  
  return {
    orderedBins: visited.map(b => b.bin_id),
    distance: Math.round(totalDistance * 100) / 100,
    originalIndex: visited.map(b => b.originalIndex)
  };
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Alerts API
app.get('/api/alerts', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('alerts').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: 'Failed to fetch alerts' });
  res.json(data);
});

app.put('/api/alerts/:id/acknowledge', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const id = req.params.id;
  const { acknowledged_by } = req.body;
  const { data, error } = await sb.from('alerts').update({ 
    is_read: true, 
    acknowledged_at: new Date().toISOString(),
    acknowledged_by 
  }).eq('id', id).select('*').single();
  if (error) return res.status(500).json({ error: 'Failed to acknowledge alert' });
  res.json(data);
});

// Analytics API
app.get('/api/analytics', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  const { data, error } = await sb.from('analytics').select('*, contractors(*)').order('metric_date', { ascending: false }).limit(30);
  if (error) return res.status(500).json({ error: 'Failed to fetch analytics' });
  res.json(data);
});

app.get('/api/dashboard-summary', requireApiKey, async (req, res) => {
  const sb = ensureServiceClient(res); if (!sb) return;
  
  try {
    // Get all data in parallel for better performance
    const [binsResult, alertsResult, tasksResult, routesResult, contractorsResult, vehiclesResult] = await Promise.all([
      sb.from('smart_bins').select('*'),
      sb.from('alerts').select('*').eq('is_read', false),
      sb.from('collection_tasks').select('*').eq('status', 'pending'),
      sb.from('collection_routes').select('*').eq('status', 'in_progress'),
      sb.from('contractors').select('*'),
      sb.from('vehicles').select('*')
    ]);

    const bins = binsResult.data || [];
    const alerts = alertsResult.data || [];
    const pendingTasks = tasksResult.data || [];
    const activeRoutes = routesResult.data || [];
    const contractors = contractorsResult.data || [];
    const vehicles = vehiclesResult.data || [];

    // Calculate metrics
    const totalBins = bins.length;
    const criticalBins = bins.filter(bin => bin.current_fill_level >= 90).length;
    const highFillBins = bins.filter(bin => bin.current_fill_level >= 75 && bin.current_fill_level < 90).length;
    const activeVehicles = vehicles.length; // This would be enhanced with GPS data
    const completedTasksToday = bins.filter(bin => bin.current_fill_level < 25).length; // Estimate

    res.json({
      overview: {
        total_bins: totalBins,
        critical_bins: criticalBins,
        high_fill_bins: highFillBins,
        active_vehicles: activeVehicles,
        pending_tasks: pendingTasks.length,
        active_routes: activeRoutes.length,
        unread_alerts: alerts.length,
        contractors_active: contractors.length
      },
      alerts: alerts.slice(0, 10), // Return latest 10 alerts
      recent_tasks: pendingTasks.slice(0, 5),
      bins_by_fill_level: {
        low: bins.filter(b => b.current_fill_level < 25).length,
        medium: bins.filter(b => b.current_fill_level >= 25 && b.current_fill_level < 50).length,
        high: bins.filter(b => b.current_fill_level >= 50 && b.current_fill_level < 75).length,
        critical: bins.filter(b => b.current_fill_level >= 75).length
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
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
