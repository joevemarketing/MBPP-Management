(function(){
  const CONFIG = window.APP_CONFIG || {};
  let API_BASE = localStorage.getItem('api_base') || (CONFIG.apiBase || '/');
  let API_KEY = localStorage.getItem('api_key') || (CONFIG.defaultApiKey || 'dev');
  const headers = { 'x-api-key': API_KEY };

  const statusEl = document.getElementById('status');
  const updatedEl = document.getElementById('updatedAt');
  const themeToggle = document.getElementById('themeToggle');
  const downloadPdfBtn = document.getElementById('downloadPdf');
  const contractorModal = document.getElementById('contractorModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalClose = document.getElementById('modalClose');
  const modalOk = document.getElementById('modalOk');
  const vehicleTable = document.getElementById('vehicleTable');
  const vehicleFilter = document.getElementById('vehicleFilter');
  const addContractorBtn = document.getElementById('addContractorBtn');
  const contractorManageModal = document.getElementById('contractorManageModal');
  const contractorManageClose = document.getElementById('contractorManageClose');
  const contractorManageSave = document.getElementById('contractorManageSave');
  const cName = document.getElementById('cName');
  const cRegNo = document.getElementById('cRegNo');
  const addVehicleBtn = document.getElementById('addVehicleBtn');
  const vehicleManageModal = document.getElementById('vehicleManageModal');
  const vehicleManageClose = document.getElementById('vehicleManageClose');
  const vehicleManageSave = document.getElementById('vehicleManageSave');
  const vPlate = document.getElementById('vPlate');
  const vType = document.getElementById('vType');
  const vCap = document.getElementById('vCap');
  const vContractor = document.getElementById('vContractor');
  function setStatus(text) { statusEl.textContent = text; }
  function setUpdated() { updatedEl.textContent = new Date().toLocaleTimeString(); }

  function applyTheme(t){
    const root = document.documentElement;
    if (t === 'light') root.classList.add('light'); else root.classList.remove('light');
    localStorage.setItem('theme', t);
  }
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
    if (charts.contractor) { try { charts.contractor.destroy(); } catch {} }
    if (charts.status) { try { charts.status.destroy(); } catch {} }
    charts.contractor = null; charts.status = null;
    setupChartDefaults();
    setupCharts();
  });
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  const apiEnv = document.getElementById('apiEnv');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApi = document.getElementById('saveApi');
  if (apiEnv) apiEnv.value = API_BASE;
  if (apiKeyInput) apiKeyInput.value = API_KEY;
  saveApi?.addEventListener('click', () => {
    API_BASE = apiEnv?.value || '/';
    API_KEY = apiKeyInput?.value || 'dev';
    localStorage.setItem('api_base', API_BASE);
    localStorage.setItem('api_key', API_KEY);
    headers['x-api-key'] = API_KEY;
    initialLoad();
  });

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function setupChartDefaults(){
    const c = cssVar('--text') || '#e5e7eb';
    const m = cssVar('--muted') || '#94a3b8';
    Chart.defaults.color = c;
    Chart.defaults.borderColor = cssVar('--border') || '#20304d';
    Chart.defaults.font.family = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    Chart.defaults.plugins.legend.labels.color = m;
    Chart.defaults.animation.duration = 600;
  }

  async function downloadPdf(){
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) return;
      let metrics;
      try { metrics = await getJson('/api/metrics'); } catch {
        const counts = {};
        vehiclesList.forEach(v => { const cid = Number(v.contractorId ?? v.contractor_id); counts[cid] = (counts[cid]||0)+1; });
        metrics = {
          totals: { vehicles: vehiclesList.length, active: 0, idle: Math.max(0, vehiclesList.length) },
          byContractor: contractorsList.map(c => ({ contractorId: c.contractorId ?? c.id, name: c.name, vehicles: counts[Number(c.contractorId ?? c.id)] || 0 }))
        };
      }
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pad = 36; let y = pad;
      doc.setFontSize(16); doc.text('MBPP Smart Waste Report', pad, y); y += 18;
      doc.setFontSize(10); doc.text(new Date().toLocaleString(), pad, y); y += 18;
      doc.setFontSize(12); doc.text(`Vehicles: ${metrics.totals.vehicles}`, pad, y); y += 16;
      doc.text(`Active: ${metrics.totals.active}  Idle: ${metrics.totals.idle}`, pad, y); y += 20;
      const contractorImg = charts.contractor?.toBase64Image();
      const statusImg = charts.status?.toBase64Image();
      if (contractorImg) { doc.addImage(contractorImg, 'PNG', pad, y, 250, 160); }
      if (statusImg) { doc.addImage(statusImg, 'PNG', pad + 270, y, 250, 160); }
      y += 180;
      doc.setFontSize(12); doc.text('Vehicles by Contractor', pad, y); y += 14;
      metrics.byContractor.forEach((c) => { doc.text(`${c.name}: ${c.vehicles}`, pad, y); y += 14; });
      doc.save('MBPP-Report.pdf');
    } catch {}
  }
  downloadPdfBtn?.addEventListener('click', downloadPdf);

  function joinUrl(base, url){
    if (!base || base === '/') return url;
    return base.replace(/\/$/, '') + url;
  }
  async function getJson(url) {
    const res = await fetch(joinUrl(API_BASE, url), { headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  let map = L.map('map').setView([5.417, 100.329], 12);
  const ISLAND_BOUNDS = L.latLngBounds([5.26, 100.20], [5.50, 100.35]);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const markers = new Map();
  const trails = new Map();
  const trailPoints = new Map();
  const TRAIL_LIMIT = 50;
  let selectedDeviceId = null;
  const showTrailsEl = document.getElementById('showTrails');
  const followDeviceEl = document.getElementById('followDevice');
  const deviceSelectEl = document.getElementById('deviceSelect');
  function clampToBounds(lat, lng){
    const sw = ISLAND_BOUNDS.getSouthWest();
    const ne = ISLAND_BOUNDS.getNorthEast();
    const clat = Math.min(Math.max(lat, sw.lat), ne.lat);
    const clng = Math.min(Math.max(lng, sw.lng), ne.lng);
    return [clat, clng];
  }
  let contractorsList = [];
  let vehiclesList = [];
  let tasksList = [];
  function updateDeviceSelect(deviceId){
    if (!deviceSelectEl) return;
    const idStr = String(deviceId);
    if (![...deviceSelectEl.options].some(o => o.value === idStr)){
      const opt = document.createElement('option'); opt.value = idStr; opt.textContent = `Device ${idStr}`; deviceSelectEl.appendChild(opt);
      if (!selectedDeviceId) { selectedDeviceId = idStr; deviceSelectEl.value = idStr; }
    }
  }
  deviceSelectEl?.addEventListener('change', () => { selectedDeviceId = deviceSelectEl.value; });

  function upsertMarker(p){
    const key = String(p.deviceId);
    let pos = [p.latitude, p.longitude];
    if (!ISLAND_BOUNDS.contains(pos)) {
      if (p.demo) pos = clampToBounds(pos[0], pos[1]); else return;
    }
    const label = `ID ${p.deviceId} | ${p.speed?.toFixed?.(1) ?? 0} km/h`;
    if (markers.has(key)) {
      const m = markers.get(key);
      m.setLatLng(pos).bindPopup(label);
    } else {
      const m = L.marker(pos).addTo(map).bindPopup(label);
      markers.set(key, m);
    }
    updateDeviceSelect(p.deviceId);
    if (showTrailsEl?.checked) {
      const arr = trailPoints.get(key) || [];
      arr.push(pos);
      if (arr.length > TRAIL_LIMIT) arr.shift();
      trailPoints.set(key, arr);
      if (trails.has(key)) {
        trails.get(key).setLatLngs(arr);
      } else {
        const poly = L.polyline(arr, { color: cssVar('--accent') || '#22d3ee', weight: 3, opacity: 0.8 }).addTo(map);
        trails.set(key, poly);
      }
    } else if (trails.has(key)) {
      trails.get(key).remove(); trails.delete(key); trailPoints.delete(key);
    }
    if (followDeviceEl?.checked && selectedDeviceId === key) {
      const arr = trailPoints.get(key) || [pos];
      const b = L.latLngBounds(arr);
      map.fitBounds(b.pad(0.25));
    }
  }

  function renderTotals(metrics){
    const el = document.getElementById('totals');
    el.innerHTML = '';
    const rows = [
      { k: 'Vehicles', v: metrics.totals.vehicles },
      { k: 'Active', v: metrics.totals.active },
      { k: 'Idle', v: metrics.totals.idle }
    ];
    rows.forEach(r => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<span>${r.k}</span><span class="badge">${r.v}</span>`;
      el.appendChild(div);
    });
  }
  function renderContractors(list){
    const el = document.getElementById('contractors');
    el.innerHTML = '';
    contractorsList = list;
    list.forEach(c => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<span>${c.name}</span><span class="badge">${c.vehicles} vehicles</span>`;
      div.dataset.contractorId = c.contractorId ?? c.id;
      div.addEventListener('click', () => showContractorDetails(div.dataset.contractorId));
      el.appendChild(div);
    });
  }
  function renderVehicles(list){
    const el = document.getElementById('vehicles');
    el.innerHTML = '';
    vehiclesList = list;
    list.forEach(v => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<span>${v.plate}</span><span class="badge">${v.type}</span>`;
      el.appendChild(div);
    });
  }

  function renderTasks(list){
    tasksList = list || [];
    const tbody = tasksTable?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    tasksList.forEach(t => {
      const tr = document.createElement('tr');
      const statusBadge = `<span class="badge">${t.status}</span>`;
      tr.innerHTML = `<td>${t.id}</td><td>${t.title}</td><td>${statusBadge}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderOverview(metrics){
    if (!metrics?.totals) return;
    kpiVehiclesService.textContent = metrics.totals.active ?? '—';
    kpiTotalVehicles.textContent = metrics.totals.vehicles ?? '—';
    kpiActiveContractors.textContent = metrics.totals.activeContractors ?? '—';
    const finished = tasksList.filter(t => String(t.status).toLowerCase() === 'finished').length;
    const unfinished = tasksList.filter(t => String(t.status).toLowerCase() !== 'finished').length;
    kpiTasksFinished.textContent = finished;
    kpiTasksUnfinished.textContent = unfinished;
  }

  function showModal(){ contractorModal.classList.add('show'); modalBackdrop.classList.add('show'); document.body.classList.add('modal-open'); }
  function hideModal(){ contractorModal.classList.remove('show'); modalBackdrop.classList.remove('show'); document.body.classList.remove('modal-open'); }
  modalClose.addEventListener('click', hideModal);
  modalOk.addEventListener('click', hideModal);
  modalBackdrop.addEventListener('click', hideModal);

  function showContractorManage(){ contractorManageModal.classList.add('show'); modalBackdrop.classList.add('show'); document.body.classList.add('modal-open'); }
  function hideContractorManage(){ contractorManageModal.classList.remove('show'); modalBackdrop.classList.remove('show'); document.body.classList.remove('modal-open'); }
  addContractorBtn?.addEventListener('click', showContractorManage);
  contractorManageClose?.addEventListener('click', hideContractorManage);
  contractorManageSave?.addEventListener('click', async () => {
    try {
      const payload = {
        name: cName.value.trim(),
        reg_no: cRegNo.value.trim()
      };
      const res = await fetch('/api/contractors', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('save_failed');
      hideContractorManage();
      const contractors = await getJson('/api/contractors');
      const metrics = await getJson('/api/metrics');
      renderContractors(metrics.byContractor ?? contractors);
      updateCharts(metrics);
      setUpdated();
    } catch {}
  });

  function showVehicleManage(){ vehicleManageModal.classList.add('show'); modalBackdrop.classList.add('show'); document.body.classList.add('modal-open'); }
  function hideVehicleManage(){ vehicleManageModal.classList.remove('show'); modalBackdrop.classList.remove('show'); document.body.classList.remove('modal-open'); }
  addVehicleBtn?.addEventListener('click', async () => {
    showVehicleManage();
    vContractor.innerHTML = '';
    contractorsList.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.contractorId ?? c.id; opt.textContent = c.name; vContractor.appendChild(opt);
    });
  });
  vehicleManageClose?.addEventListener('click', hideVehicleManage);
  vehicleManageSave?.addEventListener('click', async () => {
    try {
      const payload = {
        plate: vPlate.value.trim(),
        type: vType.value.trim(),
        capacity_kg: Number(vCap.value || 0),
        contractor_id: Number(vContractor.value || 0)
      };
      const res = await fetch('/api/vehicles', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('save_failed');
      hideVehicleManage();
      const vehicles = await getJson('/api/vehicles');
      renderVehicles(vehicles);
      const metrics = await getJson('/api/metrics');
      renderTotals(metrics);
      updateCharts(metrics);
      setUpdated();
    } catch {}
  });

  function showContractorDetails(id){
    const c = contractorsList.find(x => String(x.contractorId ?? x.id) === String(id));
    if (!c) return;
    modalTitle.textContent = c.name;
    summaryCompanyName.textContent = c.name || '—';
    const registeredVehicles = vehiclesList.filter(v => String(v.contractorId ?? v.contractor_id) === String(c.contractorId ?? c.id)).length;
    summaryRegisteredVehicles.textContent = String(registeredVehicles);
    summaryRegNo.textContent = c.reg_no || c.regNo || c.company_reg_no || '—';
    const onTime = Number(c.kpi_on_time_rate ?? 0);
    const eff = Number(c.kpi_collection_efficiency ?? 0);
    const onTimePct = Math.round(onTime * 100);
    const effPct = Math.round(eff * 100);
    document.getElementById('kpiOnTimeLabel').textContent = onTimePct + '%';
    document.getElementById('kpiEfficiencyLabel').textContent = effPct + '%';
    document.getElementById('kpiOnTimeBar').style.width = onTimePct + '%';
    document.getElementById('kpiEfficiencyBar').style.width = effPct + '%';

    const tbody = vehicleTable.querySelector('tbody');
    tbody.innerHTML = '';
    const rows = vehiclesList.filter(v => String(v.contractorId ?? v.contractor_id) === String(c.contractorId ?? c.id));
    rows.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${v.plate}</td><td>${v.type}</td><td>${v.capacity_kg ?? ''}</td>`;
      tbody.appendChild(tr);
    });
    vehicleFilter.value = '';
    vehicleFilter.oninput = () => {
      const q = vehicleFilter.value.toLowerCase();
      tbody.querySelectorAll('tr').forEach(tr => {
        const text = tr.textContent.toLowerCase();
        tr.style.display = text.includes(q) ? '' : 'none';
      });
    };
    showModal();
  }

  async function initialLoad(){
    try {
      const health = await getJson('/api/health');
      setStatus(`Server OK • Traccar ${health.traccarConfigured ? 'connected' : 'fallback'}`);
      const metrics = await getJson('/api/metrics');
      renderTotals(metrics);
      if (!charts.contractor) { setupChartDefaults(); setupCharts(); }
      updateCharts(metrics);
      const contractors = await getJson('/api/contractors');
      const byId = new Map((metrics.byContractor || []).map(x => [Number(x.contractorId ?? x.id), x.vehicles]));
      const merged = contractors.map(co => ({
        ...co,
        contractorId: co.id ?? co.contractorId,
        vehicles: byId.get(Number(co.id ?? co.contractorId)) || 0
      }));
      renderContractors(merged);
      const vehicles = await getJson('/api/vehicles');
      renderVehicles(vehicles);
      try {
        const tasks = await getJson('/api/tasks');
        renderTasks(tasks);
      } catch {}
      renderOverview(metrics);
      const positions = await getJson('/api/positions');
      positions.forEach(upsertMarker);
      setUpdated();
      return true;
    } catch (e) {
      setStatus('Demo mode: static sample data');
      const demoVehicles = [
        { plate: 'PMG 1234', type: 'Compactor' },
        { plate: 'PMG 5678', type: 'Tipper' }
      ];
      const demoContractors = [
        { name: 'Contractor A', vehicles: 1 },
        { name: 'Contractor B', vehicles: 1 }
      ];
      renderVehicles(demoVehicles);
      renderContractors(demoContractors);
      renderTotals({ totals: { vehicles: 2, active: 1, idle: 1, activeContractors: 1 } });
      const demoTasks = [
        { id: 101, title: 'Zone A collection', status: 'finished', contractorId: 10 },
        { id: 102, title: 'Zone B collection', status: 'unfinished', contractorId: 11 },
        { id: 103, title: 'Bulky pickup - Jelutong', status: 'unfinished', contractorId: 10 },
        { id: 104, title: 'Street sweeping - Georgetown', status: 'finished', contractorId: 11 }
      ];
      renderTasks(demoTasks);
      renderOverview({ totals: { vehicles: 2, active: 1, idle: 1, activeContractors: 1 } });
      const demoPositions = [
        { deviceId: 1, latitude: 5.417, longitude: 100.329, speed: 10, demo: true },
        { deviceId: 2, latitude: 5.420, longitude: 100.315, speed: 0, demo: true }
      ];
      demoPositions.forEach(upsertMarker);
      setUpdated();
      setInterval(() => {
        demoPositions[0].longitude += 0.001;
        const c = clampToBounds(demoPositions[0].latitude, demoPositions[0].longitude);
        demoPositions[0].latitude = c[0];
        demoPositions[0].longitude = c[1];
        demoPositions[0].speed = 12;
        upsertMarker(demoPositions[0]);
        setUpdated();
      }, 5000);
      return false;
    }
  }

  function subscribe(){
    try {
      const sse = new EventSource(joinUrl(API_BASE, `/api/stream/positions?api_key=${encodeURIComponent(API_KEY)}`), { withCredentials: false });
      sse.onmessage = (e) => {
        try {
          const arr = JSON.parse(e.data);
          arr.forEach(upsertMarker);
        } catch {}
      };
      sse.onerror = async () => {
        setStatus('Realtime stream error; switching to polling');
        sse.close();
        setInterval(async () => {
          try {
            const positions = await getJson('/api/positions');
            positions.forEach(upsertMarker);
          } catch {}
        }, 5000);
      };
    } catch {}
  }

  setInterval(async () => {
    try {
      const metrics = await getJson('/api/metrics');
      renderTotals(metrics);
      updateCharts(metrics);
      renderOverview(metrics);
      setUpdated();
    } catch {}
  }, 10000);

  initialLoad().then(success => {
    if (success) subscribe();
  });
})();
  let charts = { contractor: null, status: null };
  function setupCharts(){
    const cc = document.getElementById('contractorChart');
    const sc = document.getElementById('statusChart');
    const accent = cssVar('--accent') || '#22d3ee';
    const border = cssVar('--border') || '#20304d';
    const ctx = cc.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, cc.height);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, 'rgba(34,211,238,0.3)');
    charts.contractor = new Chart(cc, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Vehicles by Contractor', data: [], backgroundColor: gradient, borderRadius: 8, borderSkipped: false }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: border } }, x: { grid: { display: false } } } }
    });
    charts.status = new Chart(sc, {
      type: 'doughnut',
      data: { labels: ['Active','Idle'], datasets: [{ data: [0,0], backgroundColor: [accent, border], borderColor: border }] },
      options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom' } } }
    });
  }

  function updateCharts(metrics){
    if (!charts.contractor || !charts.status) return;
    charts.contractor.data.labels = metrics.byContractor.map(x => x.name);
    charts.contractor.data.datasets[0].data = metrics.byContractor.map(x => x.vehicles);
    charts.contractor.update();
    const a = metrics.totals.active, i = metrics.totals.idle;
    charts.status.data.datasets[0].data = [a, i];
    charts.status.update();
  }
  const summaryCompanyName = document.getElementById('summaryCompanyName');
  const summaryRegisteredVehicles = document.getElementById('summaryRegisteredVehicles');
  const summaryRegNo = document.getElementById('summaryRegNo');
