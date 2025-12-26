const vehicles = require('../data/vehicles.json');
const contractors = require('../data/contractors.json');
const { hasSupabaseConfig, supabaseAnon } = require('./supabase');

async function getVehiclesAsync() {
  if (hasSupabaseConfig()) {
    const sb = supabaseAnon();
    const { data, error } = await sb.from('vehicles').select('*');
    if (!error && data) return data.map(d => ({ ...d, contractorId: d.contractor_id, traccar_device_id: d.traccar_device_id }));
  }
  return vehicles;
}

async function getContractorsAsync() {
  if (hasSupabaseConfig()) {
    const sb = supabaseAnon();
    const { data, error } = await sb.from('contractors').select('*');
    if (!error && data) return data;
  }
  return contractors;
}

function haversineKm(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function getMetrics(latestPositions) {
  const v = await getVehiclesAsync();
  const c = await getContractorsAsync();
  const totalVehicles = v.length;
  const active = latestPositions.filter(p => p.speed && p.speed > 0).length;
  const idle = totalVehicles - active;
  const activeDeviceIds = new Set(latestPositions.filter(p => p.speed && p.speed > 0).map(p => Number(p.deviceId)));
  const activeContractorIds = new Set();
  for (const vv of v) {
    const did = Number(vv.traccar_device_id ?? vv.deviceId);
    if (did && activeDeviceIds.has(did)) {
      const cid = vv.contractorId ?? vv.contractor_id;
      if (cid != null) activeContractorIds.add(Number(cid));
    }
  }
  let counts = {};
  if (hasSupabaseConfig()) {
    try {
      const sb = supabaseAnon();
      const { data } = await sb.from('vehicles').select('contractor_id, count:count(*)').group('contractor_id');
      data?.forEach(row => { counts[Number(row.contractor_id)] = Number(row.count) || 0; });
    } catch {}
  } else {
    counts = {};
    for (const vv of v) {
      const cid = vv.contractorId ?? vv.contractor_id;
      if (cid != null) counts[Number(cid)] = (counts[Number(cid)] || 0) + 1;
    }
  }
  const byContractor = c.map(co => ({
    contractorId: co.id,
    name: co.name,
    vehicles: counts[Number(co.id)] || 0
  }));
  return {
    totals: { vehicles: totalVehicles, active, idle, activeContractors: activeContractorIds.size },
    byContractor
  };
}

module.exports = { getVehiclesAsync, getContractorsAsync, getMetrics, haversineKm };
