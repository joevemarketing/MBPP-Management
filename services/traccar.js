const axios = require('axios');

let override = null;

function hasTraccarConfig() {
  const base = override?.baseUrl || process.env.TRACCAR_BASE_URL;
  const user = override?.username || process.env.TRACCAR_USERNAME;
  const pass = override?.password || process.env.TRACCAR_PASSWORD;
  return !!base && !!user && !!pass;
}

function createAxios() {
  if (!hasTraccarConfig()) return null;
  const baseURL = override?.baseUrl || process.env.TRACCAR_BASE_URL;
  const username = override?.username || process.env.TRACCAR_USERNAME;
  const password = override?.password || process.env.TRACCAR_PASSWORD;
  const instance = axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
    auth: { username, password }
  });
  return instance;
}

function setTraccarConfig(cfg) {
  const baseUrl = String(cfg?.baseUrl || '').trim();
  const username = String(cfg?.username || '').trim();
  const password = String(cfg?.password || '').trim();
  if (!baseUrl || !username || !password) {
    override = null;
    return false;
  }
  override = { baseUrl, username, password };
  return true;
}

async function getDevicesFromTraccar(http) {
  const { data } = await http.get('/api/devices');
  return data;
}

async function getPositionsFromTraccar(http) {
  const { data } = await http.get('/api/positions');
  return data;
}

function fallbackDevices() {
  return [
    { id: 1, name: 'Truck 01', uniqueId: 'TRUCK01' },
    { id: 2, name: 'Truck 02', uniqueId: 'TRUCK02' }
  ];
}

function fallbackPositions() {
  return [
    {
      deviceId: 1,
      latitude: 5.417, longitude: 100.329,
      speed: 12.3, course: 90,
      attributes: { ignition: true, batteryLevel: 88 },
      serverTime: new Date().toISOString()
    },
    {
      deviceId: 2,
      latitude: 5.420, longitude: 100.315,
      speed: 0.0, course: 0,
      attributes: { ignition: false, batteryLevel: 92 },
      serverTime: new Date().toISOString()
    }
  ];
}

function traccarClient() {
  const http = createAxios();
  return {
    async getDevices() {
      if (!http) return fallbackDevices();
      return getDevicesFromTraccar(http);
    },
    async getLatestPositions() {
      if (!http) return fallbackPositions();
      return getPositionsFromTraccar(http);
    }
  };
}

module.exports = { traccarClient, hasTraccarConfig, setTraccarConfig };
