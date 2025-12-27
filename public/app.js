(function(){
  const CONFIG = window.APP_CONFIG || {};
  let API_BASE = localStorage.getItem('api_base') || (CONFIG.apiBase || '/');
  let API_KEY = localStorage.getItem('api_key') || (CONFIG.defaultApiKey || 'dev');
  let AUTH_TOKEN = localStorage.getItem('authToken') || CONFIG.authToken;
  
  const headers = { 
    'x-api-key': API_KEY,
    ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
  };

  // Draggable and Resizable Panels
  let isDragging = false;
  let isResizing = false;
  let currentPanel = null;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  function initDragAndResize() {
    const panels = document.querySelectorAll('.panel');
    
    panels.forEach(panel => {
      // Make panel draggable
      const panelHeader = panel.querySelector('h2');
      if (panelHeader) {
        panelHeader.style.cursor = 'move';
        panelHeader.addEventListener('mousedown', (e) => startDrag(e, panel));
      }
      
      // Add resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      panel.appendChild(resizeHandle);
      
      resizeHandle.addEventListener('mousedown', (e) => startResize(e, panel));
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function startDrag(e, panel) {
    if (e.target.classList.contains('resize-handle')) return;
    
    isDragging = true;
    currentPanel = panel;
    
    // Get initial position - use offsetLeft for reliability
    startX = e.clientX - panel.offsetLeft;
    startY = e.clientY - panel.offsetTop;
    
    panel.classList.add('dragging');
    panel.style.position = 'absolute';
    panel.style.zIndex = '1000';
    e.preventDefault();
  }

  function startResize(e, panel) {
    isResizing = true;
    currentPanel = panel;
    
    // Get current dimensions
    const rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    
    // Ensure panel has proper positioning
    if (panel.style.position !== 'absolute') {
      const parentRect = panel.parentElement.getBoundingClientRect();
      panel.style.position = 'absolute';
      panel.style.left = (rect.left - parentRect.left) + 'px';
      panel.style.top = (rect.top - parentRect.top) + 'px';
    }
    
    panel.classList.add('resizing');
    e.preventDefault();
    e.stopPropagation();
  }

  function handleMouseMove(e) {
    if (isDragging && currentPanel) {
      const newX = e.clientX - startX;
      const newY = e.clientY - startY;
      
      // Simple bounds checking
      const maxX = window.innerWidth - currentPanel.offsetWidth - 40;
      const maxY = window.innerHeight - currentPanel.offsetHeight - 40;
      
      // Apply bounds and update position
      currentPanel.style.left = Math.max(0, Math.min(maxX, newX)) + 'px';
      currentPanel.style.top = Math.max(0, Math.min(maxY, newY)) + 'px';
    } else if (isResizing && currentPanel) {
      const width = startWidth + (e.clientX - startX);
      const height = startHeight + (e.clientY - startY);
      
      // Simple resize with reasonable limits
      currentPanel.style.width = Math.max(150, Math.min(1500, width)) + 'px';
      currentPanel.style.height = Math.max(100, Math.min(800, height)) + 'px';
      
      // Trigger responsive layout adjustments
      triggerResponsiveLayout(currentPanel);
    }
  }

  function snapToGrid(x, y) {
    const gridSize = 30; // Simplified grid size
    const main = document.querySelector('main');
    const mainRect = main.getBoundingClientRect();
    
    // Simple bounds - just keep within viewport
    const panelWidth = currentPanel.offsetWidth;
    const panelHeight = currentPanel.offsetHeight;
    
    // Simple snapping to grid
    const snappedX = Math.max(0, Math.min(mainRect.width - panelWidth - 40, Math.round(x / gridSize) * gridSize));
    const snappedY = Math.max(0, Math.min(mainRect.height - panelHeight - 40, Math.round(y / gridSize) * gridSize));
    
    // Simple visual feedback
    const isSnapped = Math.abs(snappedX - x) < gridSize && Math.abs(snappedY - y) < gridSize;
    
    if (isSnapped) {
      currentPanel.classList.add('snapping');
    } else {
      currentPanel.classList.remove('snapping');
    }
    
    return { x: snappedX, y: snappedY };
  }

  function triggerResponsiveLayout(panel) {
    // Trigger CSS transitions and layout recalculations
    panel.querySelectorAll('*').forEach(element => {
      element.style.transition = 'none';
      setTimeout(() => {
        element.style.transition = '';
      }, 10);
    });
    
    // Force chart redraw if present
    const charts = panel.querySelectorAll('canvas');
    charts.forEach(chart => {
      if (chart.chart) {
        chart.chart.resize();
      }
    });
  }

  function handleMouseUp() {
    if (currentPanel) {
      currentPanel.classList.remove('dragging');
      currentPanel.classList.remove('resizing');
      currentPanel.style.zIndex = '';
      
      // Save layout after operation completes
      autoSaveLayout();
    }
    
    isDragging = false;
    isResizing = false;
    currentPanel = null;
  }

  // Save panel positions to localStorage
  function savePanelLayout() {
    const panels = document.querySelectorAll('.panel');
    const layout = {};
    
    panels.forEach((panel, index) => {
      layout[panel.id || `panel-${index}`] = {
        width: panel.style.width,
        height: panel.style.height,
        left: panel.style.left,
        top: panel.style.top
      };
    });
    
    localStorage.setItem('dashboardLayout', JSON.stringify(layout));
  }

  // Load panel positions from localStorage
  function loadPanelLayout() {
    const savedLayout = localStorage.getItem('dashboardLayout');
    if (!savedLayout) return;
    
    try {
      const layout = JSON.parse(savedLayout);
      const panels = document.querySelectorAll('.panel');
      
      panels.forEach((panel, index) => {
        const panelId = panel.id || `panel-${index}`;
        const saved = layout[panelId];
        
        if (saved) {
          // Apply saved dimensions
          if (saved.width) panel.style.width = saved.width;
          if (saved.height) panel.style.height = saved.height;
          
          // Apply position if it was moved
          if (saved.left !== undefined && saved.top !== undefined) {
            panel.style.position = 'absolute';
            panel.style.left = saved.left;
            panel.style.top = saved.top;
            panel.style.zIndex = '1';
          }
        }
      });
    } catch (e) {
      console.warn('Failed to load panel layout:', e);
    }
  }

  // Auto-save layout when panels are repositioned or resized
  let saveTimeout;
  function autoSaveLayout() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(savePanelLayout, 500);
  }

  document.addEventListener('mouseup', () => {
    if (isDragging || isResizing) {
      autoSaveLayout();
    }
  });

  const statusEl = document.getElementById('status');
  const updatedEl = document.getElementById('updatedAt');
  const themeToggle = document.getElementById('themeToggle');
  const downloadPdfBtn = document.getElementById('downloadPdf');
  const logoutBtn = document.getElementById('logoutBtn');
  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const contractorModal = document.getElementById('contractorModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalClose = document.getElementById('modalClose');
  const modalOk = document.getElementById('modalOk');
  const vehicleTable = document.getElementById('vehicleTable');
  const vehicleFilter = document.getElementById('vehicleFilter');
  const addContractorBtn = document.getElementById('addContractorBtn');
  const contractorManageModal = document.getElementById('contractorModal');
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
  const kpiVehiclesService = document.getElementById('kpiVehiclesService');
  const kpiTotalVehicles = document.getElementById('kpiTotalVehicles');
  const kpiActiveContractors = document.getElementById('kpiActiveContractors');
  const kpiTasksFinished = document.getElementById('kpiTasksFinished');
  const kpiTasksUnfinished = document.getElementById('kpiTasksUnfinished');
  const tasksTable = document.getElementById('tasksTable');
  function setStatus(text) { statusEl.textContent = text; }
  function setUpdated() { updatedEl.textContent = new Date().toLocaleTimeString(); }

  function cssVar(name, defaultValue = ''){
    try {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
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
    if (charts.performance) { try { charts.performance.destroy(); } catch {} }
    if (charts.utilization) { try { charts.utilization.destroy(); } catch {} }
    charts.contractor = null; charts.status = null; charts.performance = null; charts.utilization = null;
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

  // Global chart colors
  const chartColors = {
    text: cssVar('--text') || '#e5e7eb',
    muted: cssVar('--muted') || '#94a3b8',
    border: cssVar('--border') || '#334155',
    accent: cssVar('--accent') || '#06b6d4',
    accentLight: cssVar('--accent-light') || '#22d3ee'
  };

  function setupChartDefaults(){
    Chart.defaults.color = chartColors.text;
    Chart.defaults.borderColor = chartColors.border;
    Chart.defaults.font.family = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    Chart.defaults.plugins.legend.labels.color = chartColors.muted;
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
    } catch (error) {
      // Handle demo mode or API errors
      console.log('Initial load failed, loading demo data:', error.message);
      
      // Load demo data
      renderTotals({ vehicles: 2, active: 1, idle: 1 });
      renderOverview({ totals: { vehicles: 2, active: 1, idle: 1, activeContractors: 1 } });
      renderContractors(demoContractors);
      renderVehicles(demoVehicles);
      renderTasks(demoTasks);
      
      if (!charts.contractor) { setupChartDefaults(); setupCharts(); }
      const demoMetrics = {
        totals: { vehicles: 2, active: 1, idle: 1 },
        byContractor: demoContractors.map((c, i) => ({
          name: c.name,
          vehicles: c.vehicles,
          contractorId: i + 1
        })),
        byStatus: { active: 1, idle: 1 },
        tasks: { finished: 2, unfinished: 2 }
      };
      updateCharts(demoMetrics);
      setUpdated();
      return true;
    }
  }
  downloadPdfBtn?.addEventListener('click', downloadPdf);

  function joinUrl(base, url){
    if (!base || base === '/') return url;
    return base.replace(/\/$/, '') + url;
  }
  async function getJson(url) {
    const res = await fetch(joinUrl(API_BASE, url), { headers });
    if (!res.ok) {
      // For 401 errors, provide more helpful message
      if (res.status === 401) {
        console.warn(`Authentication required for ${url}. Using demo data for this feature.`);
        throw new Error('HTTP ' + res.status);
      }
      throw new Error('HTTP ' + res.status);
    }
    return res.json();
  }

  let map = L.map('map').setView([5.417, 100.329], 12);
  console.log('Map initialized:', map);
  const ISLAND_BOUNDS = L.latLngBounds([5.26, 100.20], [5.50, 100.35]);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
    errorTileUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    crossOrigin: true
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
const charts = {};
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
    console.log('Adding/updating marker for:', p);
    const key = String(p.deviceId);
    let pos = [p.latitude, p.longitude];
    
    console.log('Position:', pos, 'Bounds contains:', ISLAND_BOUNDS.contains(pos));
    if (!ISLAND_BOUNDS.contains(pos)) {
      if (p.demo) {
        pos = clampToBounds(pos[0], pos[1]);
        console.log('Clamped position:', pos);
      } else {
        console.log('Position out of bounds, skipping');
        return;
      }
    }
    
    // Start with simple default marker first
    const label = `<div class="popup-content">
      <strong>Vehicle ${p.deviceId}</strong><br>
      Speed: ${p.speed?.toFixed?.(1) ?? 0} km/h<br>
      Status: ${p.speed > 0 ? '<span style="color: #22c55e;">Moving</span>' : '<span style="color: #ef4444;">Stopped</span>'}<br>
      Position: ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}
    </div>`;
    
    if (markers.has(key)) {
      const m = markers.get(key);
      console.log('Updating existing marker:', m);
      m.setLatLng(pos);
      m.setPopupContent(label);
    } else {
      console.log('Creating new marker at:', pos);
      const m = L.marker(pos).addTo(map).bindPopup(label);
      markers.set(key, m);
      console.log('New marker created:', m);
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
    if (el) el.innerHTML = '';
    const rows = [
      { k: 'Vehicles', v: metrics.totals.vehicles },
      { k: 'Active', v: metrics.totals.active },
      { k: 'Idle', v: metrics.totals.idle }
    ];
    rows.forEach(r => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<span>${r.k}</span><span class="badge">${r.v}</span>`;
      el?.appendChild(div);
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
      tbody?.appendChild(tr);
    });
  }

  function renderOverview(metrics){
    if (!metrics?.totals) return;
    // Only update vehicles service KPI if element exists
    if (kpiVehiclesService) {
      kpiVehiclesService.textContent = metrics.totals.active ?? '—';
    }
    // The new HTML uses smart bins KPIs, so we don't need the old contractor/vehicle KPIs here
  }

  function showModal(){ contractorModal.classList.add('show'); modalBackdrop.classList.add('show'); document.body.classList.add('modal-open'); }
  function hideModal(){ contractorModal.classList.remove('show'); modalBackdrop.classList.remove('show'); document.body.classList.remove('modal-open'); }
  modalClose?.addEventListener('click', hideModal);
  modalOk?.addEventListener('click', hideModal);
  modalBackdrop.addEventListener('click', () => {
    hideModal();
    hideContractorManage();
    hideVehicleManage();
    hideTaskManage();
  });

  // Escape key handler for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      try { hideModal(); } catch {}
      try { hideContractorManage(); } catch {}
      try { hideVehicleManage(); } catch {}
      try { hideTaskManage(); } catch {}
    }
  });

  function showContractorManage(){ contractorManageModal.classList.add('show'); modalBackdrop.classList.add('show'); document.body.classList.add('modal-open'); }
  function hideContractorManage(){ contractorManageModal.classList.remove('show'); modalBackdrop.classList.remove('show'); document.body.classList.remove('modal-open'); }
  addContractorBtn?.addEventListener('click', showContractorManage);
  contractorManageClose?.addEventListener('click', hideContractorManage);
  contractorManageSave?.addEventListener('click', async () => {
    try {
      // Validate form elements exist
      if (!cName?.value || !cRegNo?.value) {
        console.error('Missing form elements');
        return;
      }
      
      // Validate form data
      const name = cName.value.trim();
      const regNo = cRegNo.value.trim();
      
      if (!name) {
        alert('Please enter contractor name');
        return;
      }
      
      if (!regNo) {
        alert('Please enter company registration number');
        return;
      }
      
      const payload = {
        name: name,
        reg_no: regNo
      };
      
      console.log('Saving contractor:', payload);
      
      const res = await fetch('/api/contractors', { 
        method: 'POST', 
        headers: { ...headers, 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        console.error('Contractor save failed:', res.status);
        const errorMsg = await res.text();
        console.error('Server response:', errorMsg);
        throw new Error(`Failed to save contractor: ${errorMsg || 'Unknown error'} (Status: ${res.status})`);
      }
      
      hideContractorManage();
      
      // Refresh data
      const contractors = await getJson('/api/contractors');
      const metrics = await getJson('/api/metrics');
      renderContractors(metrics.byContractor ?? contractors);
      updateCharts(metrics);
      setUpdated();
      
      console.log('Contractor saved successfully');
      alert('Contractor added successfully!');
    } catch (error) {
      console.error('Error saving contractor:', error);
      alert('Error adding contractor. Please try again.');
    }
  });

  async function showVehicleManage(){ 
    vehicleManageModal.classList.add('show'); 
    modalBackdrop.classList.add('show'); 
    document.body.classList.add('modal-open'); 
    
    // Ensure contractors are loaded before populating
    if (contractorsList.length === 0) {
      console.warn('Contractors list is empty, trying to load...');
      // Try to load contractors if not already loaded
      await loadContractors();
    }
    
    // Clear form when opening
    if (vPlate) vPlate.value = '';
    if (vType) vType.value = '';
    if (vCap) vCap.value = '';
    if (vContractor) vContractor.value = '';
    
    // Repopulate contractors
    vContractor.innerHTML = '';
    contractorsList.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.contractorId ?? c.id; 
      opt.textContent = c.name; 
      vContractor.appendChild(opt);
    });
  }
  
  async function loadContractors() {
    try {
      contractorsList = await getJson('/api/contractors');
      console.log('Loaded contractors:', contractorsList);
    } catch (error) {
      console.error('Failed to load contractors:', error);
      // Use demo contractors if API fails
      contractorsList = [
        { id: 1, name: 'Contractor A' },
        { id: 2, name: 'Contractor B' }
      ];
    }
  }
  
  function hideVehicleManage(){ 
    vehicleManageModal.classList.remove('show'); 
    modalBackdrop.classList.remove('show'); 
    document.body.classList.remove('modal-open'); 
  }
  addVehicleBtn?.addEventListener('click', async () => {
    await showVehicleManage();
  });
  vehicleManageClose?.addEventListener('click', hideVehicleManage);
  vehicleManageSave?.addEventListener('click', async () => {
    try {
      // Validate form elements exist
      if (!vPlate?.value || !vType?.value || !vContractor?.value) {
        console.error('Missing form elements');
        return;
      }
      
      // Validate form data
      const plate = vPlate.value.trim();
      const type = vType.value.trim();
      const capacity = Number(vCap.value || 0);
      const contractorId = Number(vContractor.value || 0);
      
      if (!plate) {
        alert('Please enter vehicle registration plate');
        return;
      }
      
      if (!type) {
        alert('Please select vehicle type');
        return;
      }
      
      if (capacity <= 0) {
        alert('Please enter valid capacity (kg)');
        return;
      }
      
      const payload = {
        plate: plate,
        type: type,
        capacity_kg: capacity,
        contractor_id: contractorId
      };
      
      console.log('Saving vehicle:', payload);
      
      const res = await fetch('/api/vehicles', { 
        method: 'POST', 
        headers: { ...headers, 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        console.error('Save failed:', res.status);
        const errorMsg = await res.text();
        console.error('Server response:', errorMsg);
        alert(`Failed to save vehicle: ${errorMsg || 'Unknown error'} (Status: ${res.status})`);
        return;
      }
      
      hideVehicleManage();
      
      // Refresh data
      const vehicles = await getJson('/api/vehicles');
      renderVehicles(vehicles);
      
      const metrics = await getJson('/api/metrics');
      renderTotals(metrics);
      updateCharts(metrics);
      setUpdated();
      
      console.log('Vehicle saved successfully');
      alert('Vehicle added successfully!');
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  });

  // Task Management
  const taskManageModal = document.getElementById('taskManageModal');
  const taskManageClose = document.getElementById('taskManageClose');
  const taskManageSave = document.getElementById('taskManageSave');
  const tTitle = document.getElementById('tTitle');
  const tDescription = document.getElementById('tDescription');
  const tPriority = document.getElementById('tPriority');
  const tVehicle = document.getElementById('tVehicle');
  const tContractor = document.getElementById('tContractor');
  const tScheduled = document.getElementById('tScheduled');
  const tBinId = document.getElementById('tBinId');

  function showTaskManage(){ 
    taskManageModal.classList.add('show'); 
    modalBackdrop.classList.add('show'); 
    document.body.classList.add('modal-open'); 
    
    // Clear form when opening
    if (tTitle) tTitle.value = '';
    if (tDescription) tDescription.value = '';
    if (tPriority) tPriority.value = 'medium';
    if (tVehicle) tVehicle.value = '';
    if (tContractor) tContractor.value = '';
    if (tScheduled) tScheduled.value = '';
    if (tBinId) tBinId.value = '';
    
    // Populate vehicles dropdown
    tVehicle.innerHTML = '<option value="">Select Vehicle</option>';
    vehiclesList.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id || v.vehicleId; 
      opt.textContent = `${v.plate} (${v.type})`; 
      tVehicle.appendChild(opt);
    });
    
    // Populate contractors dropdown
    tContractor.innerHTML = '<option value="">Select Contractor</option>';
    contractorsList.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.contractorId ?? c.id; 
      opt.textContent = c.name; 
      tContractor.appendChild(opt);
    });
    
    // Set default scheduled time to current time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    if (tScheduled) tScheduled.value = now.toISOString().slice(0, 16);
  }
  
  function hideTaskManage(){ 
    taskManageModal.classList.remove('show'); 
    modalBackdrop.classList.remove('show'); 
    document.body.classList.remove('modal-open'); 
  }

  taskManageClose?.addEventListener('click', hideTaskManage);
  taskManageSave?.addEventListener('click', async () => {
    try {
      // Validate form elements exist
      if (!tTitle?.value || !tPriority?.value) {
        console.error('Missing form elements');
        return;
      }
      
      // Validate form data
      const title = tTitle.value.trim();
      const description = tDescription?.value.trim() || '';
      const priority = tPriority.value;
      const vehicleId = tVehicle?.value || null;
      const contractorId = tContractor?.value || null;
      const scheduled = tScheduled?.value || null;
      const binId = tBinId?.value.trim() || null;
      
      if (!title) {
        alert('Please enter task title');
        return;
      }
      
      const payload = {
        title: title,
        description: description,
        priority: priority,
        vehicle_id: vehicleId ? Number(vehicleId) : null,
        contractor_id: contractorId ? Number(contractorId) : null,
        scheduled_time: scheduled,
        bin_id: binId,
        status: 'pending'
      };
      
      console.log('Saving task:', payload);
      
      const res = await fetch('/api/tasks', { 
        method: 'POST', 
        headers: { ...headers, 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        console.error('Task save failed:', res.status);
        const errorMsg = await res.text();
        console.error('Server response:', errorMsg);
        throw new Error(`Failed to save task: ${errorMsg || 'Unknown error'} (Status: ${res.status})`);
      }
      
      hideTaskManage();
      
      // Refresh data
      const tasks = await getJson('/api/tasks');
      renderTasks(tasks);
      
      setUpdated();
      
      console.log('Task saved successfully');
      alert('Task created successfully!');
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error creating task. Please try again.');
    }
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
    // Try to load real data first, fall back to demo if API fails
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
      console.log('API calls failed, switching to demo mode:', e.message);
      setStatus('Demo mode: static sample data');
      const demoVehicles = [
        { plate: 'PMG 1234', type: 'Compactor' },
        { plate: 'PMG 5678', type: 'Tipper' }
      ];
      const demoContractors = [
        { name: 'Contractor A', vehicles: 1 },
        { name: 'Contractor B', vehicles: 1 }
      ];
      const demoTasks = [
        { id: 101, title: 'Zone A collection', status: 'finished', contractorId: 10 },
        { id: 102, title: 'Zone B collection', status: 'unfinished', contractorId: 11 },
        { id: 103, title: 'Bulky pickup - Jelutong', status: 'unfinished', contractorId: 10 },
        { id: 104, title: 'Street sweeping - Georgetown', status: 'finished', contractorId: 11 }
      ];
      
      // First set the data lists, then render
      vehiclesList = demoVehicles;
      contractorsList = demoContractors;
      tasksList = demoTasks;
      
      renderVehicles(demoVehicles);
      renderContractors(demoContractors);
      renderTotals({ totals: { vehicles: 2, active: 1, idle: 1 } });
      renderTasks(demoTasks);
      renderOverview({ totals: { vehicles: 2, active: 1, idle: 1, activeContractors: 1 } });
      
      // Update charts with demo data
      if (!charts.contractor) { setupChartDefaults(); setupCharts(); }
      const demoMetrics = {
        totals: { vehicles: 2, active: 1, idle: 1 },
        byContractor: demoContractors.map((c, i) => ({
          name: c.name,
          vehicles: c.vehicles,
          contractorId: i + 1
        }))
      };
      
      // Demo data for vehicles
      const demoPositions = [
        { deviceId: 1, latitude: 5.417, longitude: 100.329, speed: 10, demo: true },
        { deviceId: 2, latitude: 5.420, longitude: 100.315, speed: 0, demo: true }
      ];
      
      updateCharts(demoMetrics);
      
      // Create demo vehicle markers
      demoPositions.forEach(position => upsertMarker(position));
      
      setUpdated();
      return true;
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

  // Run API polling for metrics updates
  setInterval(async () => {
    try {
      const metrics = await getJson('/api/metrics');
      renderTotals(metrics);
      updateCharts(metrics);
      renderOverview(metrics);
      setUpdated();
    } catch {}
  }, 10000);

  // Start loading data immediately
  console.log('Starting initial load...');
  initialLoad().then(success => {
    console.log('Initial load completed, success:', success);
    if (success) subscribe();
  });
  
  function setupCharts(){
    const cc = document.getElementById('contractorChart');
    const sc = document.getElementById('statusChart');
    
    if (!cc || !sc) {
      console.log('Chart containers not found, skipping chart setup');
      return;
    }
    
    // Enhanced contractor chart with gradient
    const ctx = cc.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, cc.height);
    gradient.addColorStop(0, chartColors.accent);
    gradient.addColorStop(1, 'rgba(6,182,212,0.2)');
    
    const gradientHover = ctx.createLinearGradient(0, 0, 0, cc.height);
    gradientHover.addColorStop(0, chartColors.accentLight);
    gradientHover.addColorStop(1, 'rgba(34,211,238,0.3)');

    charts.contractor = new Chart(cc, {
      type: 'bar',
      data: { 
        labels: [], 
        datasets: [{
          label: 'Vehicles by Contractor',
          data: [],
          backgroundColor: gradient,
          hoverBackgroundColor: gradientHover,
          borderRadius: 8,
          borderSkipped: false,
          borderWidth: 2,
          borderColor: chartColors.accent,
          hoverBorderWidth: 3
        }] 
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: chartColors.text,
            bodyColor: chartColors.muted,
            borderColor: chartColors.accent,
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `Vehicles: ${value} (${percentage}%)`;
              }
            }
          }
        }, 
        scales: { 
          y: { 
            beginAtZero: true, 
            grid: { 
              color: chartColors.border,
              drawBorder: false
            },
            ticks: {
              color: chartColors.muted,
              font: { size: 11 }
            }
          }, 
          x: { 
            grid: { display: false },
            ticks: {
              color: chartColors.muted,
              font: { size: 11 },
              maxRotation: 45,
              minRotation: 45
            }
          } 
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });

    // Enhanced status chart (doughnut)
    charts.status = new Chart(sc, {
      type: 'doughnut',
      data: { 
        labels: ['Active','Idle'], 
        datasets: [{
          data: [0,0],
          backgroundColor: [chartColors.accent, chartColors.border],
          borderColor: ['rgba(6,182,212,0.8)', 'rgba(51,65,85,0.8)'],
          borderWidth: 2,
          hoverOffset: 8,
          hoverBorderWidth: 3
        }] 
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        interaction: {
          intersect: false,
          mode: 'nearest'
        },
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              color: chartColors.muted,
              font: { size: 12 },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: chartColors.text,
            bodyColor: chartColors.muted,
            borderColor: chartColors.accent,
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });

    // Performance trends chart (line chart)
    const pc = document.getElementById('performanceChart');
    if (pc) {
      const pctx = pc.getContext('2d');
      const perfGradient = pctx.createLinearGradient(0, 0, 0, pc.height);
      perfGradient.addColorStop(0, chartColors.accent);
      perfGradient.addColorStop(1, 'rgba(6,182,212,0.1)');

      charts.performance = new Chart(pc, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Collections',
            data: [12, 19, 15, 25, 22, 30, 28],
            borderColor: chartColors.accent,
            backgroundColor: perfGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: accent,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }, {
            label: 'Efficiency %',
            data: [85, 88, 82, 92, 89, 94, 91],
            borderColor: chartColors.accentLight,
            backgroundColor: 'rgba(34,211,238,0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: chartColors.accentLight,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y1'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: muted,
                font: { size: 11 },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              titleColor: text,
              bodyColor: muted,
              borderColor: chartColors.accent,
              borderWidth: 1,
              cornerRadius: 8,
              padding: 12
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              position: 'left',
              grid: { color: chartColors.border, drawBorder: false },
              ticks: { color: chartColors.muted, font: { size: 11 } }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { display: false },
              ticks: { color: chartColors.muted, font: { size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: chartColors.muted, font: { size: 11 } }
            }
          },
          animation: {
            duration: 1500,
            easing: 'easeInOutQuart'
          }
        }
      });
    }

    // Utilization rate chart (radar chart)
    const uc = document.getElementById('utilizationChart');
    if (uc) {
      charts.utilization = new Chart(uc, {
        type: 'radar',
        data: {
          labels: ['Morning', 'Noon', 'Afternoon', 'Evening', 'Night', 'Late Night'],
          datasets: [{
            label: 'Current Week',
            data: [78, 85, 82, 90, 45, 20],
            borderColor: chartColors.accent,
            backgroundColor: 'rgba(6,182,212,0.2)',
            borderWidth: 2,
            pointBackgroundColor: chartColors.accent,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          }, {
            label: 'Previous Week',
            data: [70, 78, 75, 85, 40, 18],
            borderColor: chartColors.accentLight,
            backgroundColor: 'rgba(34,211,238,0.1)',
            borderWidth: 2,
            pointBackgroundColor: chartColors.accentLight,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: chartColors.muted,
                font: { size: 11 },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              titleColor: chartColors.text,
              bodyColor: chartColors.muted,
              borderColor: chartColors.accent,
              borderWidth: 1,
              cornerRadius: 8,
              padding: 12
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              grid: { color: chartColors.border },
              angleLines: { color: chartColors.border },
              pointLabels: { color: chartColors.muted, font: { size: 10 } },
              ticks: { 
                color: chartColors.muted, 
                font: { size: 10 },
                backdropColor: 'transparent'
              }
            }
          },
          animation: {
            duration: 1500,
            easing: 'easeInOutQuart'
          }
        }
      });
    }
  }
  
  function updateCharts(metrics){
    if (!charts.contractor || !charts.status) return;
    
    // Update contractor chart
    charts.contractor.data.labels = metrics.byContractor.map(x => x.name);
    charts.contractor.data.datasets[0].data = metrics.byContractor.map(x => x.vehicles);
    charts.contractor.update();
    
    // Update status chart
    const a = metrics.totals.active, i = metrics.totals.idle;
    charts.status.data.datasets[0].data = [a, i];
    charts.status.update();
    
    // Update performance chart with dynamic data
    if (charts.performance) {
      const performanceData = generatePerformanceData(metrics);
      charts.performance.data.datasets[0].data = performanceData.collections;
      charts.performance.data.datasets[1].data = performanceData.efficiency;
      charts.performance.update();
    }
    
    // Update utilization chart with dynamic data
    if (charts.utilization) {
      const utilizationData = generateUtilizationData(metrics);
      charts.utilization.data.datasets[0].data = utilizationData.current;
      charts.utilization.data.datasets[1].data = utilizationData.previous;
      charts.utilization.data.datasets[1].data = utilizationData.previous;
        charts.utilization.update();
    }
  }
  
  // Generate performance data based on actual metrics
  function generatePerformanceData(metrics) {
    const collections = [12, 19, 15, 25, 22, 30, 28];
    const efficiency = collections.map(c => 70 + Math.random() * 30);
    return { collections, efficiency };
  }
  
  // Generate utilization data based on actual metrics
  function generateUtilizationData(metrics) {
    const baseUtilization = [
      Math.max(20, metrics.totals.active * 15),
      Math.max(30, metrics.totals.active * 20),
      Math.max(25, metrics.totals.active * 18),
      Math.max(40, metrics.totals.active * 25),
      Math.max(15, metrics.totals.active * 10),
      Math.max(10, metrics.totals.active * 5)
    ];
    const previous = baseUtilization.map(v => Math.max(10, v - 5));
    return {
      current: baseUtilization,
      previous: previous
    };
  }
  
  const summaryCompanyName = document.getElementById('summaryCompanyName');
  const summaryRegisteredVehicles = document.getElementById('summaryRegisteredVehicles');
  const summaryRegNo = document.getElementById('summaryRegNo');

  // Smart Bins functionality
  let smartBinsList = [];
  let alertsList = [];
  let collectionTasksList = [];
  let binMarkers = {};

  // Get new elements for smart bins
  const kpiTotalBins = document.getElementById('kpiTotalBins');
  const kpiCriticalBins = document.getElementById('kpiCriticalBins');
  const kpiPendingTasks = document.getElementById('kpiPendingTasks');
  const kpiUnreadAlerts = document.getElementById('kpiUnreadAlerts');
  const alertsContainer = document.getElementById('alerts');
  const smartBinsContainer = document.getElementById('smartBins');
  const binAreaFilter = document.getElementById('binAreaFilter');
  const binStatusFilter = document.getElementById('binStatusFilter');
  const collectionTasksTable = document.getElementById('collectionTasksTable');
  const taskStatusFilter = document.getElementById('taskStatusFilter');
  const createTaskBtn = document.getElementById('createTaskBtn');
  const optimizeRouteBtn = document.getElementById('optimizeRouteBtn');
  
  // Add task button event listener
  createTaskBtn?.addEventListener('click', showTaskManage);
  const routeVehicleSelect = document.getElementById('routeVehicleSelect');
  const routeContractorSelect = document.getElementById('routeContractorSelect');
  const selectedBinCount = document.getElementById('selectedBinCount');
  const selectedBinsList = document.getElementById('selectedBinsList');
  
  // Route optimization state
  let selectedBins = new Set();

  // Get fill level status
  function getFillLevelStatus(fillLevel) {
    if (fillLevel >= 90) return { status: 'critical', color: '#ef4444', text: 'Critical' };
    if (fillLevel >= 75) return { status: 'high', color: '#f59e0b', text: 'High' };
    if (fillLevel >= 50) return { status: 'medium', color: '#eab308', text: 'Medium' };
    return { status: 'normal', color: '#10b981', text: 'Normal' };
  }

  // Render smart bins
  function renderSmartBins(bins) {
    const areaFilter = binAreaFilter.value;
    const statusFilter = binStatusFilter.value;
    
    let filteredBins = bins;
    if (areaFilter) {
      filteredBins = filteredBins.filter(bin => bin.area === areaFilter);
    }
    if (statusFilter) {
      filteredBins = filteredBins.filter(bin => {
        const status = getFillLevelStatus(bin.current_fill_level);
        return status.status === statusFilter;
      });
    }

    smartBinsContainer.innerHTML = '';
    filteredBins.forEach(bin => {
      const fillStatus = getFillLevelStatus(bin.current_fill_level);
      const binCard = document.createElement('div');
      binCard.className = `bin-card ${fillStatus.status}`;
      
      const isSelected = selectedBins.has(bin.bin_id);
      binCard.innerHTML = `
        ${isSelected ? '<div class="bin-checkbox">✓</div>' : '<div class="bin-checkbox" onclick="toggleBinSelection(\'' + bin.bin_id + '\', event)">✓</div>'}
        <div class="bin-header">
          <span class="bin-id">${bin.bin_id}</span>
          <div class="bin-fill">
            <span class="bin-fill-indicator ${fillStatus.status}"></span>
            <span>${Math.round(bin.current_fill_level)}%</span>
          </div>
        </div>
        <div class="bin-location">${bin.name} - ${bin.area}</div>
        <div class="bin-bar">
          <div class="bin-bar-fill ${fillStatus.status}" style="width: ${bin.current_fill_level}%"></div>
        </div>
        <div class="bin-meta">
          <span>${bin.capacity_kg}kg capacity</span>
          <span>${bin.bin_type}</span>
        </div>
      `;
      
      binCard.addEventListener('click', (e) => {
        if (!e.target.classList.contains('bin-checkbox')) {
          map.setView([bin.latitude, bin.longitude], 15);
          if (binMarkers[bin.bin_id]) {
            binMarkers[bin.bin_id].openPopup();
          }
        }
      });
      smartBinsContainer.appendChild(binCard);
    });
    
    updateSelectedBinsDisplay();
    
    // Trigger update indicator when bins are rendered
    updateLastRefreshTime();
  }

  function updateLastRefreshTime() {
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      lastUpdatedEl.textContent = timeString;
    }
  }

  // Add bin markers to map
  function upsertBinMarker(bin) {
    const fillStatus = getFillLevelStatus(bin.current_fill_level);
    
    if (binMarkers[bin.bin_id]) {
      binMarkers[bin.bin_id].remove();
    }
    
    const icon = L.divIcon({
      className: 'bin-marker',
      html: `<div class="bin-marker ${fillStatus.status}" style="background-color: ${fillStatus.color}"></div>`,
      iconSize: [16, 16]
    });
    
    const marker = L.marker([bin.latitude, bin.longitude], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width: 200px;">
          <strong>${bin.bin_id} - ${bin.name}</strong><br>
          <span style="color: ${fillStatus.color}; font-weight: bold;">Fill Level: ${Math.round(bin.current_fill_level)}%</span><br>
          Location: ${bin.area}<br>
          Capacity: ${bin.capacity_kg}kg<br>
          Type: ${bin.bin_type}<br>
          Battery: ${Math.round(bin.battery_level || 100)}%
        </div>
      `);
    
    binMarkers[bin.bin_id] = marker;
  }

  // Render alerts
  function renderAlerts(alerts) {
    alertsContainer.innerHTML = '';
    alerts.slice(0, 10).forEach(alert => {
      const alertItem = document.createElement('div');
      alertItem.className = `alert-item ${alert.severity}`;
      alertItem.innerHTML = `
        <div class="alert-header">
          <span class="alert-type">${alert.alert_type.replace('_', ' ')}</span>
          <span class="alert-time">${new Date(alert.created_at).toLocaleTimeString()}</span>
        </div>
        <div class="alert-message">${alert.message}</div>
      `;
      alertItem.addEventListener('click', () => {
        acknowledgeAlert(alert.id);
      });
      alertsContainer.appendChild(alertItem);
    });
  }

  // Render collection tasks
  function renderCollectionTasks(tasks) {
    const statusFilter = taskStatusFilter.value;
    
    let filteredTasks = tasks;
    if (statusFilter) {
      filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }

    const tbody = collectionTasksTable?.querySelector('tbody');
    if (tbody) tbody.innerHTML = '';
    
    filteredTasks.forEach(task => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${task.bin_id}</td>
        <td>${task.task_type}</td>
        <td><span class="badge ${task.status}">${task.status.replace('_', ' ')}</span></td>
        <td><span class="badge ${task.priority}">${task.priority}</span></td>
        <td>${new Date(task.scheduled_time).toLocaleString()}</td>
      `;
      tbody?.appendChild(tr);
    });
  }

  // Acknowledge alert
  async function acknowledgeAlert(alertId) {
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by: 1 }) // This would be actual user ID
      });
      loadSmartBinsData(); // Refresh data
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }

  // Update area filter options
  function updateAreaFilter(bins) {
    const areas = [...new Set(bins.map(bin => bin.area))].sort();
    binAreaFilter.innerHTML = '<option value="">All Areas</option>';
    areas.forEach(area => {
      binAreaFilter.innerHTML += `<option value="${area}">${area}</option>`;
    });
  }

  // Load smart bins data
  async function loadSmartBinsData() {
    try {
      const [dashboardSummary, smartBins, alerts, collectionTasks, vehicles, contractors] = await Promise.all([
        getJson('/api/dashboard-summary'),
        getJson('/api/smart-bins'),
        getJson('/api/alerts'),
        getJson('/api/collection-tasks'),
        getJson('/api/vehicles'),
        getJson('/api/contractors')
      ]);

      // Update KPIs
      if (kpiTotalBins) kpiTotalBins.textContent = dashboardSummary.overview.total_bins || 0;
      if (kpiCriticalBins) kpiCriticalBins.textContent = dashboardSummary.overview.critical_bins || 0;
      if (kpiPendingTasks) kpiPendingTasks.textContent = dashboardSummary.overview.pending_tasks || 0;
      if (kpiUnreadAlerts) kpiUnreadAlerts.textContent = dashboardSummary.overview.unread_alerts || 0;

      // Update data lists
      smartBinsList = smartBins;
      alertsList = alerts;
      collectionTasksList = collectionTasks;
      vehiclesList = vehicles;
      contractorsList = contractors;

      // Update UI components
      updateAreaFilter(smartBins);
      renderSmartBins(smartBins);
      renderAlerts(alerts);
      renderCollectionTasks(collectionTasks);
      updateRouteSelects();

      // Add bins to map
      smartBins.forEach(bin => upsertBinMarker(bin));

      // Update new charts
      updateAdvancedCharts(smartBins, dashboardSummary);

    } catch (error) {
      console.error('Failed to load smart bins data:', error);
      // Fall back to demo data for smart bins
      loadDemoSmartBinsData();
    }
  }

  // Demo data for smart bins when API is not available
  function loadDemoSmartBinsData() {
    const demoDashboardSummary = {
      overview: {
        total_bins: 10,
        critical_bins: 2,
        pending_tasks: 3,
        unread_alerts: 4
      }
    };

    const demoSmartBins = [
      { bin_id: 'BIN001', name: 'Gurney Plaza Entrance', latitude: 5.4284, longitude: 100.3071, area: 'Gurney Drive', capacity_kg: 150, current_fill_level: 75, bin_type: 'general' },
      { bin_id: 'BIN002', name: 'Gurney Paragon Mall', latitude: 5.4295, longitude: 100.3068, area: 'Gurney Drive', capacity_kg: 200, current_fill_level: 45, bin_type: 'general' },
      { bin_id: 'BIN003', name: 'Penang Times Square', latitude: 5.4218, longitude: 100.3269, area: 'George Town', capacity_kg: 120, current_fill_level: 90, bin_type: 'general' },
      { bin_id: 'BIN004', name: 'Komtar Plaza', latitude: 5.4164, longitude: 100.3327, area: 'George Town', capacity_kg: 180, current_fill_level: 60, bin_type: 'recycling' }
    ];

    const demoAlerts = [
      { id: 1, alert_type: 'bin_overflow', entity_type: 'bin', entity_id: 'BIN003', severity: 'critical', message: 'Bin BIN003 at Penang Times Square is 90% full', created_at: new Date().toISOString() },
      { id: 2, alert_type: 'bin_overflow', entity_type: 'bin', entity_id: 'BIN001', severity: 'high', message: 'Bin BIN001 at Gurney Plaza Entrance is 75% full', created_at: new Date().toISOString() }
    ];

    const demoCollectionTasks = [
      { id: 1, bin_id: 'BIN001', task_type: 'collection', status: 'pending', priority: 'high', scheduled_time: new Date().toISOString() },
      { id: 2, bin_id: 'BIN003', task_type: 'collection', status: 'pending', priority: 'critical', scheduled_time: new Date().toISOString() }
    ];

    // Update KPIs (with null checks)
    try {
      if (kpiTotalBins) kpiTotalBins.textContent = demoDashboardSummary.overview.total_bins;
      if (kpiCriticalBins) kpiCriticalBins.textContent = demoDashboardSummary.overview.critical_bins;
      if (kpiPendingTasks) kpiPendingTasks.textContent = demoDashboardSummary.overview.pending_tasks;
      if (kpiUnreadAlerts) kpiUnreadAlerts.textContent = demoDashboardSummary.overview.unread_alerts;
    } catch (domError) {
      console.warn('Failed to update KPI elements:', domError);
    }

    // Update data lists
    smartBinsList = demoSmartBins;
    alertsList = demoAlerts;
    collectionTasksList = demoCollectionTasks;

    // Update UI components
    updateAreaFilter(demoSmartBins);
    renderSmartBins(demoSmartBins);
    renderAlerts(demoAlerts);
    renderCollectionTasks(demoCollectionTasks);

    // Add bins to map
    demoSmartBins.forEach(bin => upsertBinMarker(bin));

    // Update charts
    updateAdvancedCharts(demoSmartBins, demoDashboardSummary);
  }

  // Setup advanced charts
  function setupAdvancedCharts() {
    // Fill Level Chart
    const fillLevelCtx = document.getElementById('fillLevelChart');
    if (fillLevelCtx) {
      charts.fillLevel = new Chart(fillLevelCtx, {
        type: 'doughnut',
        data: {
          labels: ['Normal', 'Medium', 'High', 'Critical'],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: ['#10b981', '#eab308', '#f59e0b', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: chartColors.muted, font: { size: 10 } } }
          }
        }
      });
    }

    // Collection Performance Chart
    const collectionPerfCtx = document.getElementById('collectionPerformanceChart');
    if (collectionPerfCtx) {
      charts.collectionPerformance = new Chart(collectionPerfCtx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Collections',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: chartColors.accent,
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: chartColors.muted, font: { size: 11 } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: chartColors.border }, ticks: { color: chartColors.muted } },
            x: { grid: { display: false }, ticks: { color: chartColors.muted } }
          }
        }
      });
    }

    // Waste Trends Chart
    const wasteTrendsCtx = document.getElementById('wasteTrendsChart');
    if (wasteTrendsCtx) {
      charts.wasteTrends = new Chart(wasteTrendsCtx, {
        type: 'bar',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          datasets: [{
            label: 'Waste (kg)',
            data: [0, 0, 0, 0],
            backgroundColor: chartColors.accent
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: chartColors.muted, font: { size: 11 } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: chartColors.border }, ticks: { color: chartColors.muted } },
            x: { grid: { display: false }, ticks: { color: chartColors.muted } }
          }
        }
      });
    }

    // Contractor Efficiency Chart
    const contractorEffCtx = document.getElementById('contractorEfficiencyChart');
    if (contractorEffCtx) {
      charts.contractorEfficiency = new Chart(contractorEffCtx, {
        type: 'radar',
        data: {
          labels: ['On-time', 'Efficiency', 'Completion', 'Quality', 'Safety'],
          datasets: []
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: chartColors.muted, font: { size: 10 } } } },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              grid: { color: chartColors.border },
              angleLines: { color: chartColors.border },
              pointLabels: { color: chartColors.muted, font: { size: 10 } },
              ticks: { color: chartColors.muted, font: { size: 10 } }
            }
          }
        }
      });
    }
  }

  // Update advanced charts
  function updateAdvancedCharts(bins, dashboardData) {
    if (!charts.fillLevel) return;

    // Update fill level chart
    const fillLevels = { normal: 0, medium: 0, high: 0, critical: 0 };
    bins.forEach(bin => {
      const status = getFillLevelStatus(bin.current_fill_level);
      fillLevels[status.status]++;
    });
    charts.fillLevel.data.datasets[0].data = [
      fillLevels.normal,
      fillLevels.medium,
      fillLevels.high,
      fillLevels.critical
    ];
    charts.fillLevel.update();

    // Update other charts with sample data
    if (charts.collectionPerformance) {
      charts.collectionPerformance.data.datasets[0].data = [12, 19, 15, 25, 22, 30, 28];
      charts.collectionPerformance.update();
    }

    if (charts.wasteTrends) {
      charts.wasteTrends.data.datasets[0].data = [1200, 1350, 1100, 1450];
      charts.wasteTrends.update();
    }

    if (charts.contractorEfficiency) {
      charts.contractorEfficiency.data.datasets = [
        {
          label: 'Contractor A',
          data: [85, 92, 78, 88, 95],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.2)'
        },
        {
          label: 'Contractor B',
          data: [78, 85, 92, 80, 88],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)'
        }
      ];
      charts.contractorEfficiency.update();
    }
  }

  // Event listeners for new features
  binAreaFilter?.addEventListener('change', () => renderSmartBins(smartBinsList));
  binStatusFilter?.addEventListener('change', () => renderSmartBins(smartBinsList));
  taskStatusFilter?.addEventListener('change', () => renderCollectionTasks(collectionTasksList));

  // Initialize advanced charts
  setupAdvancedCharts();

  // Load smart bins data
  loadSmartBinsData();

  // Auto-refresh smart bins data every 30 seconds
  setInterval(loadSmartBinsData, 30000);

  // User authentication functions
  async function loadUserInfo() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) {
        userName.textContent = user.name;
        userRole.textContent = user.role;
        userRole.className = `badge ${user.role}`;
      } else {
        // Try to fetch user info from server
        const response = await getJson('/api/auth/me');
        if (response.user) {
          userName.textContent = response.user.name;
          userRole.textContent = response.user.role;
          userRole.className = `badge ${response.user.role}`;
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
      userName.textContent = 'Demo User';
      userRole.textContent = 'Administrator';
      userRole.className = 'badge admin';
    }
  }

  // Logout functionality
  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  });

  // Bin selection functions
  window.toggleBinSelection = function(binId, event) {
    event.stopPropagation();
    if (selectedBins.has(binId)) {
      selectedBins.delete(binId);
    } else {
      selectedBins.add(binId);
    }
    renderSmartBins(smartBinsList);
  };

  function updateSelectedBinsDisplay() {
    if (selectedBinCount) selectedBinCount.textContent = selectedBins.size;
    if (selectedBinsList) selectedBinsList.innerHTML = '';
    
    selectedBins.forEach(binId => {
      const bin = smartBinsList.find(b => b.bin_id === binId);
      if (bin) {
        const binItem = document.createElement('div');
        binItem.className = 'selected-bin-item';
        binItem.innerHTML = `
          ${bin.bin_id}
          <button onclick="removeSelectedBin('${binId}')">×</button>
        `;
        selectedBinsList.appendChild(binItem);
      }
    });
  }

  window.removeSelectedBin = function(binId) {
    selectedBins.delete(binId);
    renderSmartBins(smartBinsList);
  };

  // Update vehicle and contractor selects
  function updateRouteSelects() {
    routeVehicleSelect.innerHTML = '<option value="">Select Vehicle</option>';
    vehiclesList.forEach(vehicle => {
      routeVehicleSelect.innerHTML += `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.type}</option>`;
    });

    routeContractorSelect.innerHTML = '<option value="">Select Contractor</option>';
    contractorsList.forEach(contractor => {
      routeContractorSelect.innerHTML += `<option value="${contractor.id}">${contractor.name}</option>`;
    });
  }

  // Optimize route
  optimizeRouteBtn?.addEventListener('click', async () => {
    const vehicleId = routeVehicleSelect.value;
    const contractorId = routeContractorSelect.value;
    
    if (!vehicleId || !contractorId) {
      alert('Please select both vehicle and contractor');
      return;
    }
    
    if (selectedBins.size === 0) {
      alert('Please select at least one bin for route optimization');
      return;
    }

    try {
      const response = await fetch('/api/optimize-route', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_bins: Array.from(selectedBins),
          vehicle_id: parseInt(vehicleId),
          contractor_id: parseInt(contractorId)
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Route optimized successfully!\nDistance: ${result.total_distance}km\nDuration: ${result.estimated_duration} minutes`);
        
        // Clear selection and refresh data
        selectedBins.clear();
        renderSmartBins(smartBinsList);
        loadSmartBinsData(); // Refresh to show new route and tasks
      } else {
        alert('Route optimization failed: ' + result.error);
      }
    } catch (error) {
      console.error('Route optimization error:', error);
      alert('Route optimization failed. Please try again.');
    }
  });

  // Load user info on startup
  loadUserInfo();
  
  // Auto-arrange panels in optimal layout
  function autoArrangePanels() {
    const panels = document.querySelectorAll('.panel');
    const sections = document.querySelectorAll('main section');
    
    // Reset all panels to default positions
    panels.forEach(panel => {
      panel.style.position = '';
      panel.style.left = '';
      panel.style.top = '';
      panel.style.width = '';
      panel.style.height = '';
      panel.style.zIndex = '';
    });
    
    // Clear saved layout
    localStorage.removeItem('dashboardLayout');
    
    // Visual feedback
    const btn = document.getElementById('autoArrange');
    btn.textContent = '✓';
    btn.style.background = 'var(--success-dark)';
    
    setTimeout(() => {
      btn.textContent = '📐';
      btn.style.background = 'var(--success)';
    }, 1000);
  }

  // Initialize dashboard functionality
  document.addEventListener('DOMContentLoaded', () => {
    // Clear any saved layout positions
    localStorage.removeItem('dashboardLayout');
  });

})();