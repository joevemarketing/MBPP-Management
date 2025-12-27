(function(){
  const CONFIG = window.APP_CONFIG || {};
  let API_BASE = localStorage.getItem('api_base') || (CONFIG.apiBase || '/');
  let API_KEY = localStorage.getItem('api_key') || (CONFIG.defaultApiKey || 'dev');
  let AUTH_TOKEN = localStorage.getItem('authToken') || CONFIG.authToken;
  
  const headers = { 
    'x-api-key': API_KEY,
    ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
  };

  // Enhanced Notifications
  function showNotification(message, type = 'success', duration = 4000) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Clear any existing timeout
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    // Auto-hide after duration
    notification.timeout = setTimeout(() => {
      notification.classList.remove('show');
    }, duration);
  }

  // Loading Overlay Management
  function showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const textElement = overlay?.querySelector('.loading-text');
    if (overlay) {
      if (textElement) textElement.textContent = text;
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

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

  const statusEl = document.getElementById('statusText');
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
  const kpiTasksFinished = document.getElementById('kpiTasksFinished');
  const kpiTasksUnfinished = document.getElementById('kpiTasksUnfinished');
  const tasksTable = document.getElementById('tasksTable');
  function setStatus(text) { if (statusEl) statusEl.textContent = text; }
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
    // Re-initialize charts to apply new theme colors
    setupChartDefaults();
    setupAdvancedCharts();
    refreshDashboard();
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
    refreshDashboard();
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
      const fillLevelImg = charts.fillLevel?.toBase64Image();
      const performanceImg = charts.collectionPerformance?.toBase64Image();
      if (fillLevelImg) { doc.addImage(fillLevelImg, 'PNG', pad, y, 250, 160); }
      if (performanceImg) { doc.addImage(performanceImg, 'PNG', pad + 270, y, 250, 160); }
      y += 180;
      doc.setFontSize(12); doc.text('Vehicles by Contractor', pad, y); y += 14;
      metrics.byContractor.forEach((c) => { doc.text(`${c.name}: ${c.vehicles}`, pad, y); y += 14; });
      doc.save('MBPP-Report.pdf');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF report');
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

  // Vehicle Icon System with SVG-based markers for better performance and accessibility
  const VEHICLE_ICONS = {
    // Collection Trucks - Large waste collection vehicles
    'collection_truck': {
      svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#2563eb" d="M4 12h24l-2 8H6L4 12zm0-2l2-6h16l2 6H4z"/><rect fill="#1e40af" x="8" y="6" width="4" height="4"/><rect fill="#1e40af" x="20" y="6" width="4" height="4"/><circle fill="#fbbf24" cx="12" cy="24" r="3"/><circle fill="#fbbf24" cx="24" cy="24" r="3"/></svg>',
      color: '#2563eb',
      size: [32, 32],
      className: 'vehicle-icon-collection-truck',
      label: 'Collection Truck'
    },
    'garbage_truck': {
      svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#16a34a" d="M4 12h24l-2 8H6L4 12zm0-2l2-6h16l2 6H4z"/><rect fill="#15803d" x="8" y="6" width="4" height="4"/><rect fill="#15803d" x="20" y="6" width="4" height="4"/><circle fill="#fbbf24" cx="12" cy="24" r="3"/><circle fill="#fbbf24" cx="24" cy="24" r="3"/><path fill="#dc2626" d="M10 4h12v2H10z"/></svg>',
      color: '#16a34a',
      size: [32, 32],
      className: 'vehicle-icon-garbage-truck',
      label: 'Garbage Truck'
    },
    // Side Loaders - Medium waste collection vehicles
    'side_loader': {
      svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#7c3aed" d="M6 10h20l-2 8H8L6 10zm0-2l2-4h12l2 4H6z"/><rect fill="#6d28d9" x="10" y="6" width="3" height="3"/><rect fill="#6d28d9" x="19" y="6" width="3" height="3"/><circle fill="#fbbf24" cx="12" cy="22" r="3"/><circle fill="#fbbf24" cx="20" cy="22" r="3"/><path fill="#f59e0b" d="M14 8h4v2h-4z"/></svg>',
      color: '#7c3aed',
      size: [28, 28],
      className: 'vehicle-icon-side-loader',
      label: 'Side Loader'
    },
    // Front Loaders - Front-end loading vehicles
    'front_loader': {
      svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#ea580c" d="M5 11h22l-2 7H7L5 11zm0-2l2-5h14l2 5H5z"/><rect fill="#dc2626" x="9" y="6" width="4" height="4"/><rect fill="#dc2626" x="19" y="6" width="4" height="4"/><circle fill="#fbbf24" cx="13" cy="22" r="3"/><circle fill="#fbbf24" cx="23" cy="22" r="3"/><path fill="#f59e0b" d="M8 4h16v2H8z"/></svg>',
      color: '#ea580c',
      size: [30, 30],
      className: 'vehicle-icon-front-loader',
      label: 'Front Loader'
    },
    // Compactor Trucks - Waste compaction vehicles
    'compactor_truck': {
      svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#0891b2" d="M4 13h24l-1 7H5l-1-7zm0-3l1-5h18l1 5H4z"/><rect fill="#0e7490" x="8" y="7" width="4" height="3"/><rect fill="#0e7490" x="20" y="7" width="4" height="3"/><circle fill="#fbbf24" cx="12" cy="22" r="3"/><circle fill="#fbbf24" cx="22" cy="22" r="3"/><path fill="#f59e0b" d="M12 5h8v2h-8z"/></svg>',
      color: '#0891b2',
      size: [32, 32],
      className: 'vehicle-icon-compactor-truck',
      label: 'Compactor Truck'
    },
    // Small Vehicles - Compact service vehicles
    'pickup_truck': {
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#dc2626" d="M4 16h16l-1 4H5l-1-4zm0-2l1-4h10l1 4H4z"/><rect fill="#b91c1c" x="6" y="10" width="3" height="2"/><rect fill="#b91c1c" x="14" y="10" width="3" height="2"/><circle fill="#fbbf24" cx="8" cy="22" r="2"/><circle fill="#fbbf24" cx="16" cy="22" r="2"/></svg>',
      color: '#dc2626',
      size: [24, 24],
      className: 'vehicle-icon-pickup-truck',
      label: 'Pickup Truck'
    },
    'van': {
      svg: '<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><rect fill="#64748b" x="4" y="8" width="20" height="10"/><rect fill="#475569" x="6" y="10" width="8" height="6"/><rect fill="#475569" x="18" y="10" width="4" height="6"/><circle fill="#fbbf24" cx="10" cy="22" r="2"/><circle fill="#fbbf24" cx="18" cy="22" r="2"/></svg>',
      color: '#64748b',
      size: [26, 26],
      className: 'vehicle-icon-van',
      label: 'Service Van'
    },
    // Special Vehicles - Equipment transporters
    'sweeper': {
      svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#9333ea" d="M4 14h24l-1 6H5l-1-6zm0-3l1-4h18l1 4H4z"/><rect fill="#7e22ce" x="8" y="9" width="3" height="3"/><rect fill="#7e22ce" x="21" y="9" width="3" height="3"/><circle fill="#fbbf24" cx="11" cy="24" r="3"/><circle fill="#fbbf24" cx="21" cy="24" r="3"/><path fill="#f59e0b" d="M6 6h20v1H6z"/></svg>',
      color: '#9333ea',
      size: [30, 30],
      className: 'vehicle-icon-sweeper',
      label: 'Street Sweeper'
    },
    // Default/Unknown vehicle
    'default': {
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect fill="#6b7280" x="4" y="10" width="16" height="6"/><rect fill="#4b5563" x="6" y="12" width="3" height="2"/><rect fill="#4b5563" x="15" y="12" width="3" height="2"/><circle fill="#fbbf24" cx="8" cy="18" r="2"/><circle fill="#fbbf24" cx="16" cy="18" r="2"/></svg>',
      color: '#6b7280',
      size: [24, 24],
      className: 'vehicle-icon-default',
      label: 'Unknown Vehicle'
    }
  };

  // Vehicle type mapping system - maps various type strings to icon keys
  const VEHICLE_TYPE_MAPPING = {
    // Collection Trucks
    'collection truck': 'collection_truck',
    'collection-truck': 'collection_truck',
    'collection': 'collection_truck',
    'garbage truck': 'garbage_truck',
    'garbage-truck': 'garbage_truck',
    'garbage': 'garbage_truck',
    'waste truck': 'collection_truck',
    'waste-truck': 'collection_truck',
    
    // Loaders
    'side loader': 'side_loader',
    'side-loader': 'side_loader',
    'side': 'side_loader',
    'front loader': 'front_loader',
    'front-loader': 'front_loader',
    'front': 'front_loader',
    'loader': 'side_loader',
    
    // Compactors
    'compactor truck': 'compactor_truck',
    'compactor-truck': 'compactor_truck',
    'compactor': 'compactor_truck',
    'compactor vehicle': 'compactor_truck',
    
    // Small Vehicles
    'pickup truck': 'pickup_truck',
    'pickup-truck': 'pickup_truck',
    'pickup': 'pickup_truck',
    'van': 'van',
    'service van': 'van',
    'service-van': 'van',
    
    // Special Vehicles
    'sweeper': 'sweeper',
    'street sweeper': 'sweeper',
    'street-sweeper': 'sweeper',
    'sweeping vehicle': 'sweeper',
    
    // Common variations and fallbacks
    'truck': 'collection_truck',
    'lorry': 'collection_truck',
    'vehicle': 'default',
    'car': 'pickup_truck',
    'suv': 'van',
    'bus': 'collection_truck'
  };

  // Icon cache for performance optimization
  const iconCache = new Map();

  // Function to normalize vehicle type string
  function normalizeVehicleType(type) {
    if (!type) return 'default';
    const normalized = type.toLowerCase().trim();
    return VEHICLE_TYPE_MAPPING[normalized] || 'default';
  }

  // Function to create vehicle icon with proper caching and accessibility
  function createVehicleIcon(vehicleType, speed = 0, deviceInfo = {}) {
    const iconKey = normalizeVehicleType(vehicleType);
    const baseIcon = VEHICLE_ICONS[iconKey] || VEHICLE_ICONS.default;
    
    // Create cache key based on vehicle type and status
    const isMoving = speed > 0;
    const cacheKey = `${iconKey}_${isMoving ? 'moving' : 'stopped'}_${deviceInfo.deviceId || 'unknown'}`;
    
    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey);
    }
    
    // Modify icon color based on vehicle status
    const statusColor = isMoving ? '#10b981' : '#ef4444';
    const svgWithStatus = baseIcon.svg.replace(/fill="[^"]*"/g, `fill="${statusColor}"`);
    
    // Create custom icon with accessibility features
    const icon = L.divIcon({
      className: `vehicle-marker ${baseIcon.className} ${isMoving ? 'vehicle-moving' : 'vehicle-stopped'}`,
      html: `
        <div class="vehicle-icon-container" 
             role="img" 
             aria-label="${baseIcon.label} - ${isMoving ? 'Moving' : 'Stopped'}"
             data-vehicle-type="${baseIcon.label}"
             data-vehicle-id="${deviceInfo.deviceId || 'unknown'}"
             data-vehicle-status="${isMoving ? 'moving' : 'stopped'}">
          <div class="vehicle-icon-svg">${svgWithStatus}</div>
          ${isMoving ? '<div class="pulse-indicator"></div>' : ''}
        </div>
      `,
      iconSize: baseIcon.size,
      iconAnchor: [baseIcon.size[0] / 2, baseIcon.size[1] / 2],
      popupAnchor: [0, -baseIcon.size[1] / 2],
      tooltipAnchor: [baseIcon.size[0] / 2, 0]
    });
    
    // Cache the icon
    iconCache.set(cacheKey, icon);
    
    // Limit cache size to prevent memory issues
    if (iconCache.size > 100) {
      const firstKey = iconCache.keys().next().value;
      iconCache.delete(firstKey);
    }
    
    return icon;
  }
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
    errorTileUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    crossOrigin: true
  }).addTo(map);

  // Add vehicle legend to map
  function createVehicleLegend() {
    const legend = L.control({ position: 'bottomleft' });
    
    legend.onAdd = function(map) {
      const div = L.DomUtil.create('div', 'vehicle-legend');
      div.innerHTML = `
        <h4>Vehicle Types</h4>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.collection_truck.svg}</div>
          <div class="vehicle-legend-text">Collection Truck</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.garbage_truck.svg}</div>
          <div class="vehicle-legend-text">Garbage Truck</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.side_loader.svg}</div>
          <div class="vehicle-legend-text">Side Loader</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.front_loader.svg}</div>
          <div class="vehicle-legend-text">Front Loader</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.compactor_truck.svg}</div>
          <div class="vehicle-legend-text">Compactor Truck</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.pickup_truck.svg}</div>
          <div class="vehicle-legend-text">Pickup Truck</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.van.svg}</div>
          <div class="vehicle-legend-text">Service Van</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.sweeper.svg}</div>
          <div class="vehicle-legend-text">Street Sweeper</div>
        </div>
        <div class="vehicle-legend-item">
          <div class="vehicle-legend-icon">${VEHICLE_ICONS.default.svg}</div>
          <div class="vehicle-legend-text">Unknown Vehicle</div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 11px; color: var(--muted);">
          <div style="margin-bottom: 4px;">● Green: Moving</div>
          <div>● Red: Stopped</div>
        </div>
      `;
      
      // Prevent map interactions on legend
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      
      return div;
    };
    
    return legend;
  }
  
  // Add legend to map
  const vehicleLegend = createVehicleLegend();
  vehicleLegend.addTo(map);

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
    console.log('[Dashboard] Adding/updating marker for:', p);
    
    // Validate required fields
    if (!p || typeof p.deviceId === 'undefined') {
      console.warn('[Dashboard] Invalid position data, missing deviceId:', p);
      return;
    }
    
    if (!p.latitude || !p.longitude) {
      console.warn('[Dashboard] Invalid coordinates for device', p.deviceId, ':', p);
      return;
    }
    
    const key = String(p.deviceId);
    let pos = [parseFloat(p.latitude), parseFloat(p.longitude)];
    
    // Check for valid coordinates
    if (isNaN(pos[0]) || isNaN(pos[1])) {
      console.warn('[Dashboard] Invalid coordinate values for device', p.deviceId, ':', pos);
      return;
    }
    
    console.log('[Dashboard] Position:', pos, 'Bounds contains:', ISLAND_BOUNDS.contains(pos));
    if (!ISLAND_BOUNDS.contains(pos)) {
      if (p.demo) {
        pos = clampToBounds(pos[0], pos[1]);
        console.log('[Dashboard] Clamped position:', pos);
      } else {
        console.log('[Dashboard] Position out of bounds, skipping device:', p.deviceId);
        return;
      }
    }
    
    // Create popup content with enhanced vehicle information
    const speed = parseFloat(p.speed) || 0;
    const vehicleInfo = vehiclesList.find(v => v.id == p.deviceId || v.vehicle_id == p.deviceId) || {};
    const vehicleType = vehicleInfo.type || vehicleInfo.vehicle_type || 'default';
    const vehicleLabel = vehicleInfo.plate || vehicleInfo.registration_number || `Vehicle ${p.deviceId}`;
    
    const label = `<div class="popup-content">
      <strong>${vehicleLabel}</strong><br>
      <em>Type: ${vehicleType}</em><br>
      Speed: ${speed.toFixed(1)} km/h<br>
      Status: ${speed > 0 ? '<span style="color: #22c55e;">Moving</span>' : '<span style="color: #ef4444;">Stopped</span>'}<br>
      Position: ${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}<br>
      ${vehicleInfo.driver_name ? `Driver: ${vehicleInfo.driver_name}<br>` : ''}
      ${vehicleInfo.fuel_level ? `Fuel: ${vehicleInfo.fuel_level}%<br>` : ''}
      <small>Last Update: ${p.serverTime || p.timestamp || new Date().toISOString()}</small>
    </div>`;
    
    // Create enhanced vehicle icon with proper type and status
    const icon = createVehicleIcon(vehicleType, speed, { deviceId: p.deviceId, ...vehicleInfo });

    if (markers.has(key)) {
      const m = markers.get(key);
      console.log('[Dashboard] Updating existing marker:', m);
      m.setLatLng(pos);
      m.setIcon(icon);
      m.setPopupContent(label);
    } else {
      console.log('[Dashboard] Creating new marker at:', pos);
      const m = L.marker(pos, { icon }).addTo(map).bindPopup(label);
      markers.set(key, m);
      console.log('[Dashboard] New marker created:', m);
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
      div.innerHTML = `<span>${c.name}</span><span class="badge">${c.vehicles || 0} vehicles</span>`;
      div.dataset.contractorId = c.contractorId ?? c.id;
      div.addEventListener('click', () => showContractorSettings(div.dataset.contractorId));
      el.appendChild(div);
    });
  }
  function renderVehicles(list){
    const el = document.getElementById('vehicles');
    if (!el) {
      console.error('[Dashboard] Vehicles container element not found');
      showNotification('Vehicles display area not found', 'error');
      return;
    }
    
    // Clear existing content with fade effect
    el.style.opacity = '0.5';
    el.innerHTML = '';
    
    vehiclesList = Array.isArray(list) ? list : [];
    console.log('[Dashboard] Rendering vehicles:', vehiclesList.length, 'vehicles');
    
    if (vehiclesList.length === 0) {
      el.innerHTML = `
        <div class="item empty-state">
          <span>No vehicles available</span>
          <button class="btn cyan-btn" onclick="document.getElementById('addVehicleBtn')?.click()">Add First Vehicle</button>
        </div>
      `;
      el.style.opacity = '1';
      return;
    }
    
    // Sort vehicles by plate number for consistent ordering
    vehiclesList.sort((a, b) => {
      const plateA = (a.plate || a.registration_number || a.vehicle_id || '').toLowerCase();
      const plateB = (b.plate || b.registration_number || b.vehicle_id || '').toLowerCase();
      return plateA.localeCompare(plateB);
    });
    
    // Render vehicles with enhanced display
    vehiclesList.forEach((v, index) => {
      const div = document.createElement('div');
      div.className = 'item vehicle-item';
      
      // Handle different field names from API with fallbacks
      const plate = v.plate || v.registration_number || v.vehicle_id || 'Unknown';
      const type = v.type || v.vehicle_type || 'Unknown';
      const capacity = v.capacity_kg || v.capacity || 0;
      const contractorId = v.contractor_id || v.contractorId || 0;
      
      // Find contractor name if available
      const contractor = contractorsList?.find(c => c.id === contractorId);
      const contractorName = contractor ? contractor.name : `Contractor ${contractorId}`;
      
      // Add data attributes for debugging and interaction
      div.dataset.vehicleId = v.id;
      div.dataset.plate = plate;
      div.dataset.type = type;
      
      // Enhanced HTML with more information
      div.innerHTML = `
        <div class="vehicle-main-info">
          <span class="vehicle-plate">${plate}</span>
          <span class="badge vehicle-type">${type}</span>
        </div>
        <div class="vehicle-details">
          <span class="vehicle-capacity">${capacity}kg</span>
          <span class="vehicle-contractor">${contractorName}</span>
        </div>
      `;
      
      // Add click handler for vehicle details
      div.addEventListener('click', () => {
        showNotification(`Vehicle: ${plate} (${type}, ${capacity}kg) - ${contractorName}`, 'info', 3000);
      });
      
      // Add hover effects
      div.addEventListener('mouseenter', () => {
        div.style.transform = 'translateY(-2px)';
        div.style.boxShadow = 'var(--shadow-md)';
      });
      
      div.addEventListener('mouseleave', () => {
        div.style.transform = 'translateY(0)';
        div.style.boxShadow = 'var(--shadow-sm)';
      });
      
      el.appendChild(div);
      
      // Animate entrance
      setTimeout(() => {
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
      }, index * 50);
    });
    
    // Restore opacity
    el.style.opacity = '1';
    console.log('[Dashboard] Successfully rendered', vehiclesList.length, 'vehicles');
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

  // Enhanced Contractor Management Functions
  function showContractorSettings(contractorId = null) {
    const modal = document.getElementById('contractorSettingsModal');
    const title = document.getElementById('contractorSettingsTitle');
    
    if (contractorId) {
      title.textContent = 'Edit Contractor';
      loadContractorData(contractorId);
    } else {
      title.textContent = 'Add New Contractor';
      clearContractorForm();
    }
    
    modal.classList.add('show');
    modalBackdrop.classList.add('show');
    document.body.classList.add('modal-open');
  }
  
  function hideContractorSettings() {
    const modal = document.getElementById('contractorSettingsModal');
    modal.classList.remove('show');
    modalBackdrop.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
  
  function loadContractorData(contractorId) {
    // Load contractor data from API
    fetch(`/api/contractors/${contractorId}`, { headers })
      .then(res => res.json())
      .then(contractor => {
        document.getElementById('contractorId').value = contractor.id;
        document.getElementById('cName').value = contractor.name || '';
        document.getElementById('cRegNo').value = contractor.registration_no || '';
        document.getElementById('cContactPerson').value = contractor.contact_person || '';
        document.getElementById('cEmail').value = contractor.email || '';
        document.getElementById('cPhone').value = contractor.phone || '';
        document.getElementById('cAddress').value = contractor.address || '';
        document.getElementById('cContractStart').value = contractor.contract_start || '';
        document.getElementById('cContractEnd').value = contractor.contract_end || '';
        document.getElementById('cMonthlyRate').value = contractor.monthly_rate || '';
        document.getElementById('cSLA').value = contractor.sla || '';
        document.getElementById('cStatus').value = contractor.status || 'active';
        
        // Set service areas
        const serviceAreas = document.getElementById('cServiceAreas');
        Array.from(serviceAreas.options).forEach(option => {
          option.selected = contractor.service_areas?.includes(option.value) || false;
        });
        
        // Set specialties
        const specialties = document.getElementById('cSpecialties');
        Array.from(specialties.options).forEach(option => {
          option.selected = contractor.specialties?.includes(option.value) || false;
        });
        
        // Load vehicles
        loadContractorVehicles(contractorId);
        
        // Load audit trail
        loadAuditTrail(contractorId);
      })
      .catch(error => {
        console.error('Failed to load contractor data:', error);
        showNotification('Failed to load contractor data', 'error');
      });
  }
  
  function clearContractorForm() {
    document.getElementById('contractorId').value = '';
    document.getElementById('cName').value = '';
    document.getElementById('cRegNo').value = '';
    document.getElementById('cContactPerson').value = '';
    document.getElementById('cEmail').value = '';
    document.getElementById('cPhone').value = '';
    document.getElementById('cAddress').value = '';
    document.getElementById('cContractStart').value = '';
    document.getElementById('cContractEnd').value = '';
    document.getElementById('cMonthlyRate').value = '';
    document.getElementById('cSLA').value = '';
    document.getElementById('cStatus').value = 'active';
    
    // Clear service areas
    const serviceAreas = document.getElementById('cServiceAreas');
    Array.from(serviceAreas.options).forEach(option => {
      option.selected = false;
    });
    
    // Clear specialties
    const specialties = document.getElementById('cSpecialties');
    Array.from(specialties.options).forEach(option => {
      option.selected = false;
    });
    
    // Clear vehicles list
    document.getElementById('contractorVehiclesList').innerHTML = '';
    
    // Clear audit trail
    document.getElementById('contractorAuditList').innerHTML = '';
  }
  
  function validateContractorForm() {
    const name = document.getElementById('cName').value.trim();
    const regNo = document.getElementById('cRegNo').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    
    if (!name) {
      showNotification('Please enter company name', 'error');
      return false;
    }
    
    if (!regNo) {
      showNotification('Please enter registration number', 'error');
      return false;
    }
    
    if (email && !isValidEmail(email)) {
      showNotification('Please enter a valid email address', 'error');
      return false;
    }
    
    return true;
  }
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  function saveContractor() {
    if (!validateContractorForm()) return;
    
    const contractorId = document.getElementById('contractorId').value;
    const isEdit = contractorId !== '';
    
    const serviceAreas = Array.from(document.getElementById('cServiceAreas').selectedOptions)
      .map(option => option.value);
    
    const specialties = Array.from(document.getElementById('cSpecialties').selectedOptions)
      .map(option => option.value);
    
    const contractorData = {
      name: document.getElementById('cName').value.trim(),
      registration_no: document.getElementById('cRegNo').value.trim(),
      contact_person: document.getElementById('cContactPerson').value.trim(),
      email: document.getElementById('cEmail').value.trim(),
      phone: document.getElementById('cPhone').value.trim(),
      address: document.getElementById('cAddress').value.trim(),
      service_areas: serviceAreas,
      specialties: specialties,
      contract_start: document.getElementById('cContractStart').value,
      contract_end: document.getElementById('cContractEnd').value,
      monthly_rate: parseFloat(document.getElementById('cMonthlyRate').value) || 0,
      sla: document.getElementById('cSLA').value.trim(),
      status: document.getElementById('cStatus').value
    };
    
    showLoading('Saving contractor...');
    
    const url = isEdit ? `/api/contractors/${contractorId}` : '/api/contractors';
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
      method: method,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contractorData)
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      hideLoading();
      hideContractorSettings();
      showNotification(isEdit ? 'Contractor updated successfully' : 'Contractor created successfully', 'success');
      
      // Refresh contractors list
      refreshContractorsList();
      
      // Log audit entry
      if (isEdit) {
        logAuditEntry(contractorId, 'CONTRACTOR_UPDATED', `Updated contractor: ${contractorData.name}`);
      } else {
        logAuditEntry(data.id, 'CONTRACTOR_CREATED', `Created contractor: ${contractorData.name}`);
      }
    })
    .catch(error => {
      hideLoading();
      console.error('Failed to save contractor:', error);
      showNotification('Failed to save contractor', 'error');
    });
  }
  
  function deleteContractor() {
    const contractorId = document.getElementById('contractorId').value;
    if (!contractorId) {
      showNotification('No contractor selected', 'error');
      return;
    }
    
    const contractorName = document.getElementById('cName').value.trim();
    
    if (!confirm(`Are you sure you want to delete contractor "${contractorName}"? This action cannot be undone and will also remove all associated vehicles.`)) {
      return;
    }
    
    showLoading('Deleting contractor...');
    
    fetch(`/api/contractors/${contractorId}`, {
      method: 'DELETE',
      headers: headers
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      hideLoading();
      hideContractorSettings();
      showNotification('Contractor deleted successfully', 'success');
      refreshContractorsList();
      
      // Log audit entry
      logAuditEntry(contractorId, 'CONTRACTOR_DELETED', `Deleted contractor: ${contractorName}`);
    })
    .catch(error => {
      hideLoading();
      console.error('Failed to delete contractor:', error);
      showNotification('Failed to delete contractor', 'error');
    });
  }
  
  // Tab functionality
  function initContractorSettingsTabs() {
    const tabButtons = document.querySelectorAll('.contractor-settings-tabs .tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Update button states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update content visibility
        tabContents.forEach(content => {
          if (content.id === `${targetTab}Tab`) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      });
    });
  }
  
  // Event listeners for contractor settings
  document.getElementById('addContractorBtn')?.addEventListener('click', () => showContractorSettings());
  document.getElementById('contractorSettingsClose')?.addEventListener('click', hideContractorSettings);
  document.getElementById('contractorSettingsSave')?.addEventListener('click', saveContractor);
  document.getElementById('contractorSettingsDelete')?.addEventListener('click', deleteContractor);
  
  // Initialize tabs
  initContractorSettingsTabs();
  
  // Update existing contractor list items to be clickable
  function makeContractorsClickable() {
    const contractorItems = document.querySelectorAll('#contractors .list-item');
    contractorItems.forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', (e) => {
        const contractorId = item.getAttribute('data-contractor-id');
        if (contractorId) {
          showContractorSettings(contractorId);
        }
      });
    });
  }
  
  // Legacy functions for backward compatibility
  function showContractorManage(){ showContractorSettings(); }
  function hideContractorManage(){ hideContractorSettings(); }
  const contractorManageClose = document.getElementById('contractorSettingsClose');
  const contractorManageSave = document.getElementById('contractorSettingsSave');
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
      
      // Capture form values before hiding modal
      const savedName = cName.value;
      const savedRegNo = cRegNo.value;
      const savedVehicles = cVehicles.value;
      
      hideContractorManage();
      
      // Refresh data
      try {
        const contractors = await getJson('/api/contractors');
          const metrics = await getJson('/api/metrics');
          renderContractors(metrics.byContractor ?? contractors);
        } catch (refreshError) {
          console.error('Failed to refresh contractors list:', refreshError);
          // Add the newly saved contractor to the local list manually
          if (contractorsList && savedName && savedRegNo && savedVehicles) {
            const newContractor = {
              id: Date.now(), // Temporary ID
              name: savedName,
              registration_no: savedRegNo,
              vehicles: Number(savedVehicles)
            };
            contractorsList.push(newContractor);
            renderContractors(contractorsList);
          }
        }
        
        try {
          updateCharts(metrics);
        } catch (metricsError) {
          console.warn('Failed to update charts:', metricsError);
        }
        
        setUpdated();
      
      console.log('Contractor saved successfully');
      alert('Contractor added successfully!');
    } catch (error) {
      console.error('Error saving contractor:', error);
      alert('Error adding contractor. Please try again.');
    }
  });

  // Enhanced Vehicle Management Functions
  function showVehicleManage(vehicleId = null, contractorId = null) {
    const modal = document.getElementById('vehicleManageModal');
    const title = document.getElementById('vehicleManageTitle');
    
    if (vehicleId) {
      title.textContent = 'Edit Vehicle';
      loadVehicleData(vehicleId);
    } else {
      title.textContent = 'Add New Vehicle';
      clearVehicleForm();
      if (contractorId) {
        document.getElementById('vContractorId').value = contractorId;
      }
    }
    
    modal.classList.add('show');
    modalBackdrop.classList.add('show');
    document.body.classList.add('modal-open');
  }
  
  function hideVehicleManage(){ 
    const modal = document.getElementById('vehicleManageModal');
    modal.classList.remove('show'); 
    modalBackdrop.classList.remove('show'); 
    document.body.classList.remove('modal-open'); 
  }
  
  function loadVehicleData(vehicleId) {
    fetch(`/api/vehicles/${vehicleId}`, { headers })
      .then(res => res.json())
      .then(vehicle => {
        document.getElementById('vId').value = vehicle.id;
        document.getElementById('vContractorId').value = vehicle.contractor_id || '';
        document.getElementById('vPlate').value = vehicle.plate || '';
        document.getElementById('vType').value = vehicle.type || '';
        document.getElementById('vCap').value = vehicle.capacity_kg || '';
        document.getElementById('vYear').value = vehicle.year_of_manufacture || '';
        document.getElementById('vInsuranceExpiry').value = vehicle.insurance_expiry || '';
        document.getElementById('vRoadTaxExpiry').value = vehicle.road_tax_expiry || '';
        document.getElementById('vStatus').value = vehicle.status || 'active';
        document.getElementById('vTraccarDeviceId').value = vehicle.traccar_device_id || '';
        
        // Show delete button for existing vehicles
        document.getElementById('vehicleManageDelete').style.display = 'inline-block';
      })
      .catch(error => {
        console.error('Failed to load vehicle data:', error);
        showNotification('Failed to load vehicle data', 'error');
      });
  }
  
  function clearVehicleForm() {
    document.getElementById('vId').value = '';
    document.getElementById('vContractorId').value = '';
    document.getElementById('vPlate').value = '';
    document.getElementById('vType').value = 'Compactor';
    document.getElementById('vCap').value = '';
    document.getElementById('vYear').value = '';
    document.getElementById('vInsuranceExpiry').value = '';
    document.getElementById('vRoadTaxExpiry').value = '';
    document.getElementById('vStatus').value = 'active';
    document.getElementById('vTraccarDeviceId').value = '';
    
    // Hide delete button for new vehicles
    document.getElementById('vehicleManageDelete').style.display = 'none';
  }
  
  function validateVehicleForm() {
    const plate = document.getElementById('vPlate').value.trim();
    const type = document.getElementById('vType').value;
    const capacity = document.getElementById('vCap').value;
    
    if (!plate) {
      showNotification('Please enter vehicle registration plate', 'error');
      return false;
    }
    
    if (!type) {
      showNotification('Please select vehicle type', 'error');
      return false;
    }
    
    if (!capacity || capacity <= 0) {
      showNotification('Please enter a valid capacity', 'error');
      return false;
    }
    
    return true;
  }
  
  function saveVehicle() {
    if (!validateVehicleForm()) return;
    
    const vehicleId = document.getElementById('vId').value;
    const isEdit = vehicleId !== '';
    
    const vehicleData = {
      contractor_id: parseInt(document.getElementById('vContractorId').value) || null,
      plate: document.getElementById('vPlate').value.trim(),
      type: document.getElementById('vType').value,
      capacity_kg: parseInt(document.getElementById('vCap').value),
      year_of_manufacture: parseInt(document.getElementById('vYear').value) || null,
      insurance_expiry: document.getElementById('vInsuranceExpiry').value,
      road_tax_expiry: document.getElementById('vRoadTaxExpiry').value,
      status: document.getElementById('vStatus').value,
      traccar_device_id: parseInt(document.getElementById('vTraccarDeviceId').value) || null
    };
    
    showLoading('Saving vehicle...');
    
    const url = isEdit ? `/api/vehicles/${vehicleId}` : '/api/vehicles';
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
      method: method,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vehicleData)
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      hideLoading();
      hideVehicleManage();
      showNotification(isEdit ? 'Vehicle updated successfully' : 'Vehicle created successfully', 'success');
      
      // Refresh vehicles list
      refreshVehiclesList();
      
      // Refresh contractor vehicles if in contractor settings
      const contractorId = document.getElementById('vContractorId').value;
      if (contractorId) {
        loadContractorVehicles(contractorId);
      }
      
      // Log audit entry
      if (isEdit) {
        logAuditEntry(contractorId, 'VEHICLE_UPDATED', `Updated vehicle: ${vehicleData.plate}`);
      } else {
        logAuditEntry(contractorId, 'VEHICLE_CREATED', `Created vehicle: ${vehicleData.plate}`);
      }
    })
    .catch(error => {
      hideLoading();
      console.error('Failed to save vehicle:', error);
      showNotification('Failed to save vehicle', 'error');
    });
  }
  
  function deleteVehicle() {
    const vehicleId = document.getElementById('vId').value;
    if (!vehicleId) {
      showNotification('No vehicle selected', 'error');
      return;
    }
    
    const vehiclePlate = document.getElementById('vPlate').value.trim();
    
    if (!confirm(`Are you sure you want to delete vehicle "${vehiclePlate}"? This action cannot be undone.`)) {
      return;
    }
    
    showLoading('Deleting vehicle...');
    
    fetch(`/api/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: headers
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      hideLoading();
      hideVehicleManage();
      showNotification('Vehicle deleted successfully', 'success');
      refreshVehiclesList();
      
      // Refresh contractor vehicles if in contractor settings
      const contractorId = document.getElementById('vContractorId').value;
      if (contractorId) {
        loadContractorVehicles(contractorId);
      }
      
      // Log audit entry
      logAuditEntry(contractorId, 'VEHICLE_DELETED', `Deleted vehicle: ${vehiclePlate}`);
    })
    .catch(error => {
      hideLoading();
      console.error('Failed to delete vehicle:', error);
      showNotification('Failed to delete vehicle', 'error');
    });
  }
  
  function loadContractorVehicles(contractorId) {
    const vehiclesList = document.getElementById('contractorVehiclesList');
    vehiclesList.innerHTML = '<p>Loading vehicles...</p>';
    
    fetch(`/api/contractors/${contractorId}/vehicles`, { headers })
      .then(res => res.json())
      .then(vehicles => {
        if (vehicles.length === 0) {
          vehiclesList.innerHTML = '<p>No vehicles assigned to this contractor.</p>';
          return;
        }
        
        vehiclesList.innerHTML = vehicles.map(vehicle => `
          <div class="vehicle-card">
            <div class="vehicle-info">
              <h4>${vehicle.plate}</h4>
              <p>Type: ${vehicle.type}</p>
              <p>Capacity: ${vehicle.capacity_kg} kg</p>
              <p>Status: <span class="badge ${vehicle.status}">${vehicle.status}</span></p>
              ${vehicle.year_of_manufacture ? `<p>Year: ${vehicle.year_of_manufacture}</p>` : ''}
            </div>
            <div class="vehicle-actions">
              <button class="btn secondary-btn" onclick="showVehicleManage(${vehicle.id}, ${contractorId})">Edit</button>
              <button class="btn danger-btn" onclick="deleteVehicleFromContractor(${vehicle.id}, ${contractorId})">Remove</button>
            </div>
          </div>
        `).join('');
      })
      .catch(error => {
        console.error('Failed to load contractor vehicles:', error);
        vehiclesList.innerHTML = '<p>Failed to load vehicles.</p>';
      });
  }
  
  function deleteVehicleFromContractor(vehicleId, contractorId) {
    const vehicleCard = event.target.closest('.vehicle-card');
    const vehiclePlate = vehicleCard.querySelector('h4').textContent;
    
    if (!confirm(`Are you sure you want to remove vehicle "${vehiclePlate}" from this contractor?`)) {
      return;
    }
    
    showLoading('Removing vehicle...');
    
    fetch(`/api/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: headers
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      hideLoading();
      showNotification('Vehicle removed successfully', 'success');
      loadContractorVehicles(contractorId);
      refreshVehiclesList();
      
      // Log audit entry
      logAuditEntry(contractorId, 'VEHICLE_REMOVED', `Removed vehicle: ${vehiclePlate}`);
    })
    .catch(error => {
      hideLoading();
      console.error('Failed to remove vehicle:', error);
      showNotification('Failed to remove vehicle', 'error');
    });
  }
  
  // Event listeners for vehicle management
  document.getElementById('addVehicleBtn')?.addEventListener('click', () => showVehicleManage());
  document.getElementById('addVehicleToContractor')?.addEventListener('click', () => {
    const contractorId = document.getElementById('contractorId').value;
    if (contractorId) {
      showVehicleManage(null, contractorId);
    } else {
      showNotification('Please save the contractor first', 'error');
    }
  });
  document.getElementById('vehicleManageClose')?.addEventListener('click', hideVehicleManage);
  document.getElementById('vehicleManageSave')?.addEventListener('click', saveVehicle);
  document.getElementById('vehicleManageDelete')?.addEventListener('click', deleteVehicle);
  
  // Legacy functions for backward compatibility
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
  addVehicleBtn?.addEventListener('click', async () => {
    await showVehicleManage();
  });
  vehicleManageClose?.addEventListener('click', hideVehicleManage);
  vehicleManageSave?.addEventListener('click', async () => {
    try {
      // Validate form elements exist
      if (!vPlate?.value || !vType?.value || !vContractor?.value) {
        showNotification('Form elements not found. Please refresh the page.', 'error');
        return;
      }
      
      // Validate form data
      const plate = vPlate.value.trim();
      const type = vType.value.trim();
      const capacity = Number(vCap.value || 0);
      const contractorId = Number(vContractor.value || 0);
      
      if (!plate) {
        showNotification('Please enter vehicle registration plate', 'warning');
        vPlate?.focus();
        return;
      }
      
      if (!type) {
        showNotification('Please select vehicle type', 'warning');
        vType?.focus();
        return;
      }
      
      if (capacity <= 0) {
        showNotification('Please enter valid capacity (kg)', 'warning');
        vCap?.focus();
        return;
      }
      
      if (contractorId <= 0) {
        showNotification('Please select a valid contractor', 'warning');
        vContractor?.focus();
        return;
      }
      
      const payload = {
        plate: plate,
        type: type,
        capacity_kg: capacity,
        contractor_id: contractorId
      };
      
      console.log('Saving vehicle:', payload);
      showLoading('Adding vehicle...');
      
      const res = await fetch('/api/vehicles', { 
        method: 'POST', 
        headers: { ...headers, 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || 'Server error';
        } catch (e) {
          const textError = await res.text();
          errorMessage = textError || `HTTP ${res.status}`;
        }
        
        console.error('Save failed:', res.status, errorMessage);
        hideLoading();
        showNotification(`Failed to add vehicle: ${errorMessage}`, 'error');
        return;
      }
      
      let savedVehicle;
      try {
        savedVehicle = await res.json();
        console.log('Server response:', savedVehicle);
      } catch (e) {
        console.error('Failed to parse server response:', e);
        hideLoading();
        showNotification('Invalid server response format', 'error');
        return;
      }
      
      // Validate server response
      if (!savedVehicle || !savedVehicle.id) {
        hideLoading();
        showNotification('Invalid vehicle data received from server', 'error');
        return;
      }
      
      // Capture form values before hiding modal
      const savedPlate = vPlate.value;
      const savedType = vType.value;
      const savedCap = vCap.value;
      const savedContractor = vContractor.value;
      
      hideVehicleManage();
      hideLoading();
      
      // Refresh data with enhanced error handling
      try {
        console.log('Refreshing vehicles list...');
        const vehicles = await getJson('/api/vehicles');
        if (Array.isArray(vehicles)) {
          console.log('Successfully refreshed vehicles:', vehicles.length);
          renderVehicles(vehicles);
          showNotification(`Vehicle ${savedVehicle.plate || savedPlate} added successfully!`, 'success');
        } else {
          throw new Error('Invalid vehicles data format');
        }
      } catch (refreshError) {
        console.error('Failed to refresh vehicles list:', refreshError);
        
        // Fallback: Add the newly saved vehicle to the local list
        if (vehiclesList && savedPlate && savedType && savedCap && savedContractor) {
          const newVehicle = {
            id: savedVehicle.id || Date.now(),
            plate: savedVehicle.plate || savedPlate,
            type: savedVehicle.type || savedType,
            capacity_kg: savedVehicle.capacity_kg || Number(savedCap),
            contractor_id: savedVehicle.contractor_id || Number(savedContractor)
          };
          
          // Check for duplicates
          const exists = vehiclesList.some(v => 
            v.plate === newVehicle.plate || 
            (v.id === newVehicle.id && v.id !== Date.now())
          );
          
          if (!exists) {
            vehiclesList.push(newVehicle);
            renderVehicles(vehiclesList);
            showNotification(`Vehicle ${newVehicle.plate} added successfully!`, 'success');
            console.log('Added vehicle to local list:', newVehicle);
          } else {
            showNotification('Vehicle already exists in the list', 'info');
          }
        } else {
          showNotification('Failed to update local vehicle list', 'warning');
        }
      }
      
      // Update other dashboard components
      try {
        const metrics = await getJson('/api/metrics');
        if (metrics) {
          renderTotals(metrics);
          updateCharts(metrics);
        }
      } catch (metricsError) {
        console.error('Failed to refresh metrics:', metricsError);
        // Non-critical error, don't show notification
      }
      
      setUpdated();
      console.log('Vehicle save process completed successfully');
      
    } catch (error) {
      console.error('Unexpected error in vehicle save:', error);
      hideLoading();
      showNotification('An unexpected error occurred while adding the vehicle', 'error');
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
      
      // Capture form values before hiding modal
      const savedTitle = tTitle.value;
      const savedVehicle = tVehicle.value;
      const savedContractor = tContractor.value;
      const savedPriority = tPriority.value;
      const savedScheduled = tScheduled.value;
      
      hideTaskManage();
      
      // Refresh data
      try {
        const tasks = await getJson('/api/tasks');
          renderTasks(tasks);
        } catch (refreshError) {
          console.error('Failed to refresh tasks list:', refreshError);
          // Add the newly created task to the local list manually
          if (tasksList && savedTitle && savedVehicle && savedContractor) {
            const newTask = {
              id: Date.now(), // Temporary ID
              title: savedTitle,
              vehicle_id: Number(savedVehicle),
              contractor_id: Number(savedContractor),
              priority: savedPriority,
              status: 'pending',
              scheduled_time: savedScheduled
            };
            tasksList.push(newTask);
            renderTasks(tasksList);
          }
        }
        
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

  // Consolidated dashboard refresh logic with comprehensive logging
  async function refreshDashboard() {
    console.log('[Dashboard] Starting data refresh at:', new Date().toISOString());
    const startTime = performance.now();
    
    // Verify critical DOM elements exist before proceeding
    const smartBinsContainerCheck = document.getElementById('smartBins');
    if (!smartBinsContainerCheck) {
      console.error('[Dashboard] Critical: smartBinsContainer not found, skipping refresh');
      return false;
    }
    
    try {
      // Step 1: Fetch all data sources in parallel
      const [
        health,
        summary,
        bins,
        alerts,
        tasks,
        vehicles,
        contractors,
        positions
      ] = await Promise.all([
        getJson('/api/health').catch(e => ({ status: 'error', error: e.message })),
        getJson('/api/dashboard-summary').catch(e => null),
        getJson('/api/smart-bins').catch(e => []),
        getJson('/api/alerts').catch(e => []),
        getJson('/api/collection-tasks').catch(e => []),
        getJson('/api/vehicles').catch(e => []),
        getJson('/api/contractors').catch(e => []),
        getJson('/api/positions').catch(e => [])
      ]);

      console.log('[Dashboard] Data fetch completed in', (performance.now() - startTime).toFixed(2), 'ms');

      // Step 2: Update Server Status
      if (health && health.status === 'ok') {
        setStatus(`Server OK • Traccar ${health.traccarConfigured ? 'connected' : 'fallback'}`);
      } else {
        setStatus('Server unreachable or error; using local data if available');
      }

      // Step 3: Map and Bind KPI Data
      if (summary && summary.overview) {
        const ov = summary.overview;
        console.log('[Dashboard] Updating KPIs from summary:', ov);
        
        if (kpiTotalBins) kpiTotalBins.textContent = ov.total_bins ?? 0;
        if (kpiCriticalBins) kpiCriticalBins.textContent = ov.critical_bins ?? 0;
        if (kpiHighFillBins) kpiHighFillBins.textContent = ov.high_fill_bins ?? 0;
        if (kpiVehiclesService) kpiVehiclesService.textContent = ov.active_vehicles ?? 0;
        if (kpiTotalVehicles) kpiTotalVehicles.textContent = vehicles.length || ov.total_vehicles || 0;
        if (kpiActiveContractors) kpiActiveContractors.textContent = ov.contractors_active ?? 0;
        if (kpiPendingTasks) kpiPendingTasks.textContent = ov.pending_tasks ?? 0;
        if (kpiUnreadAlerts) kpiUnreadAlerts.textContent = ov.unread_alerts ?? 0;
      } else {
        console.warn('[Dashboard] Dashboard summary missing or malformed, loading demo KPIs');
        loadDemoKPIData();
      }

      // Step 4: Update Global Lists and UI Components
      alertsList = alerts;
      collectionTasksList = tasks;
      vehiclesList = vehicles;
      contractorsList = contractors;

      if (bins && bins.length > 0) {
        smartBinsList = bins;
        console.log('[Dashboard] Loading bins from API:', bins.length, 'bins');
        renderSmartBins(bins);
      } else {
        console.log('[Dashboard] No bins from API, loading demo bins data');
        // Clear existing bin markers to ensure consistency
        clearBinMarkers();
        loadDemoSmartBinsData();
      }
      
      if (vehicles && vehicles.length > 0) {
        renderVehicles(vehicles);
      } else {
        console.log('[Dashboard] No vehicles from API, loading demo vehicles data');
        loadDemoVehiclesData();
      }
      
      if (contractors && contractors.length > 0) {
        renderContractors(contractors);
      } else {
        console.log('[Dashboard] No contractors from API, loading demo contractors data');
        loadDemoContractorsData();
      }
      
      renderAlerts(alerts);
      renderCollectionTasks(tasks);
      
      // Step 5: Update Map Markers
      if (positions && positions.length > 0) {
        console.log('[Dashboard] Processing', positions.length, 'vehicle positions');
        positions.forEach(upsertMarker);
      } else {
        console.log('[Dashboard] No positions from API, loading demo vehicle data');
        loadDemoVehicleData();
      }
      
      if (bins && bins.length > 0) {
        console.log('[Dashboard] Processing', bins.length, 'bin markers');
        bins.forEach(upsertBinMarker);
      } else {
        console.log('[Dashboard] No bins from API for markers');
      }

      // Step 6: Update Charts
      updateAdvancedCharts(bins, summary);
      
      setUpdated();
      console.log('[Dashboard] Refresh complete');
      return true;

    } catch (error) {
      console.error('[Dashboard] Critical refresh error:', error);
      setStatus('Refresh error; check console for details');
      
      // Fallback to demo data if critical error occurs
      if (smartBinsList.length === 0) {
        console.log('[Dashboard] Triggering demo data fallback');
        loadDemoSmartBinsData();
        loadDemoVehicleData();
      }
      return false;
    }
  }

  // Auto-refresh dashboard every 30 seconds
  setInterval(refreshDashboard, 30000);

  // Initial load
  console.log('[Dashboard] Initiating first load...');
  refreshDashboard().then(success => {
    if (success) subscribe();
  });

  
    // Legacy setupCharts removed

  
  function updateCharts(metrics){
    // Legacy function removed
  }
  
  // Legacy chart data generators removed

  
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
  const kpiHighFillBins = document.getElementById('kpiHighFillBins');
  const kpiVehiclesService = document.getElementById('kpiVehiclesService');
  const kpiTotalVehicles = document.getElementById('kpiTotalVehicles');
  const kpiActiveContractors = document.getElementById('kpiActiveContractors');
  const kpiPendingTasks = document.getElementById('kpiPendingTasks');
  const kpiUnreadAlerts = document.getElementById('kpiUnreadAlerts');
  const alertsContainer = document.getElementById('alerts');
  const smartBinsContainer = document.getElementById('smartBins');
  const binAreaFilter = document.getElementById('binAreaFilter');
  const binStatusFilter = document.getElementById('binStatusFilter');
  const collectionTasksTable = document.getElementById('collectionTasksTable');
  const taskStatusFilter = document.getElementById('taskStatusFilter');
  const createTaskBtn = document.getElementById('addTaskBtn');
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

  // Render smart bins with enhanced card design
  function renderSmartBins(bins) {
    if (!smartBinsContainer) {
      console.error('[Dashboard] Smart bins container element not found');
      return;
    }
    
    const areaFilter = binAreaFilter && binAreaFilter.value ? binAreaFilter.value : '';
    const statusFilter = binStatusFilter && binStatusFilter.value ? binStatusFilter.value : '';
    
    let filteredBins = bins || [];
    console.log('[Dashboard] Rendering smart bins:', {
      totalBins: bins.length,
      filteredBins: 'will be calculated',
      areaFilter: areaFilter || 'none',
      statusFilter: statusFilter || 'none',
      sourceDataAvailable: !!bins && bins.length > 0
    });
    
    // Apply filters
    if (areaFilter) {
      filteredBins = filteredBins.filter(bin => bin.area === areaFilter);
    }
    if (statusFilter) {
      filteredBins = filteredBins.filter(bin => {
        const status = getFillLevelStatus(bin.current_fill_level);
        return status.status === statusFilter;
      });
    }
    
    console.log('[Dashboard] Filter results:', {
      beforeFilter: bins.length,
      afterFilter: filteredBins.length,
      activeFilters: { area: areaFilter, status: statusFilter }
    });
    
    if (filteredBins.length === 0) {
      const hasActiveFilters = areaFilter || statusFilter;
      const emptyMessage = hasActiveFilters 
        ? 'No smart bins match your current filters'
        : 'No smart bins available';
      const emptySubtext = hasActiveFilters
        ? 'Try adjusting your filter settings'
        : 'Check connection or try refreshing the dashboard';
      
      smartBinsContainer.innerHTML = `
        <div class="empty-state-container">
          <div class="empty-state-icon">🗑️</div>
          <div class="empty-state-message">
            <h3>${emptyMessage}</h3>
            <p>${emptySubtext}</p>
            ${areaFilter || statusFilter ? '<button class="btn cyan-btn" onclick="clearFilters()">Clear Filters</button>' : ''}
          </div>
        </div>
      `;
      return;
    }

    smartBinsContainer.innerHTML = '';
    
    // Sort bins by area for better grouping
    const sortedBins = [...filteredBins].sort((a, b) => {
      const areaCompare = (a.area || '').localeCompare(b.area || '');
      if (areaCompare !== 0) return areaCompare;
      return (a.bin_id || '').localeCompare(b.bin_id || '');
    });
    
    sortedBins.forEach((bin, index) => {
      const fillStatus = getFillLevelStatus(bin.current_fill_level || 0);
      const binCard = document.createElement('div');
      binCard.className = `smart-bin-card ${fillStatus.status}`;
      binCard.style.animationDelay = `${index * 50}ms`;
      
      const isSelected = selectedBins.has(bin.bin_id);
      const isOperational = bin.status === 'active' || bin.status === 'operational';
      
      // Determine bin type icon
      const binTypeIcon = getBinTypeIcon(bin.bin_type || 'general');
      const fillPercentage = Math.round(bin.current_fill_level || 0);
      
      binCard.innerHTML = `
        <div class="bin-card-main">
          <!-- Selection Checkbox -->
          <div class="bin-selection">
            ${isSelected ? 
              '<div class="bin-checkbox checked">✓</div>' : 
              `<div class="bin-checkbox" onclick="toggleBinSelection('${bin.bin_id}', event)">✓</div>`
            }
          </div>
          
          <!-- Status Indicator -->
          <div class="bin-status-indicator">
            <div class="status-dot ${fillStatus.status}"></div>
            <div class="status-icon">${isOperational ? '✓' : ''}</div>
          </div>
          
          <!-- Bin ID and Type -->
          <div class="bin-identity">
            <div class="bin-id-badge">${bin.bin_id || 'Unknown'}</div>
            <div class="bin-type-icon">${binTypeIcon}</div>
          </div>
          
          <!-- Fill Level with Progress -->
          <div class="bin-fill-section">
            <div class="fill-level-display">
              <div class="fill-percentage ${fillStatus.status}">${fillPercentage}%</div>
              <div class="fill-label">${fillStatus.text}</div>
            </div>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill ${fillStatus.status}" style="width: ${Math.min(fillPercentage, 100)}%"></div>
              </div>
              <div class="progress-markers">
                <div class="marker" style="left: 50%"></div>
                <div class="marker" style="left: 80%"></div>
              </div>
            </div>
          </div>
          
          <!-- Location Information -->
          <div class="bin-location-info">
            <div class="location-name">${bin.name || 'Unknown Location'}</div>
            <div class="location-area">
              <span class="area-icon">📍</span>
              <span class="area-name">${bin.area || 'Unknown Area'}</span>
            </div>
          </div>
          
          <!-- Capacity and Type -->
          <div class="bin-details">
            <div class="capacity-info">
              <span class="capacity-value">${bin.capacity_kg || 0}</span>
              <span class="capacity-unit">kg</span>
              <span class="capacity-label">Capacity</span>
            </div>
            <div class="bin-type-badge ${(bin.bin_type || 'general').toLowerCase()}">
              ${(bin.bin_type || 'general').toUpperCase()}
            </div>
          </div>
        </div>
      `;
      
      binCard.addEventListener('click', (e) => {
        if (!e.target.classList.contains('bin-checkbox')) {
          if (bin.latitude && bin.longitude) {
            map.setView([bin.latitude, bin.longitude], 15);
            if (binMarkers[bin.bin_id]) {
              binMarkers[bin.bin_id].openPopup();
            }
          }
        }
      });
      
      smartBinsContainer.appendChild(binCard);
      
      // Animate entrance
      setTimeout(() => {
        binCard.classList.add('visible');
      }, index * 50);
    });
    
    updateSelectedBinsDisplay();
    updateAreaFilter(bins);
    
    // Trigger update indicator when bins are rendered
    updateLastRefreshTime();
    console.log(`[Dashboard] Rendered ${sortedBins.length} smart bins successfully`);
  }

  // Helper function to get bin type icon
  function getBinTypeIcon(type) {
    const icons = {
      'general': '🗑️',
      'recycling': '♻️',
      'organic': '🌱',
      'hazardous': '☣️',
      'paper': '📄',
      'plastic': '🍾',
      'glass': '🫗'
    };
    return icons[type] || icons['general'];
  }

  // Clear filters function
  function clearFilters() {
    if (binAreaFilter) binAreaFilter.value = '';
    if (binStatusFilter) binStatusFilter.value = '';
    
    // Re-render bins with cleared filters
    renderSmartBins(smartBinsList);
    
    // Update area filter options
    updateAreaFilter(smartBinsList);
    
    showNotification('Filters cleared successfully', 'success', 2000);
  }

  // Helper function to clear bin markers
  function clearBinMarkers() {
    for (const binId in binMarkers) {
      if (map && binMarkers[binId]) {
        map.removeLayer(binMarkers[binId]);
      }
    }
    binMarkers = {};
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
    const statusFilter = taskStatusFilter && taskStatusFilter.value ? taskStatusFilter.value : '';
    
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
      refreshDashboard(); // Refresh data
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

  // Initialize advanced charts
  function setupAdvancedCharts() {
    const fillCtx = document.getElementById('fillLevelChart')?.getContext('2d');
    const perfCtx = document.getElementById('collectionPerformanceChart')?.getContext('2d');
    const wasteCtx = document.getElementById('wasteTrendsChart')?.getContext('2d');
    const efficiencyCtx = document.getElementById('contractorEfficiencyChart')?.getContext('2d');

    if (fillCtx) {
      charts.fillLevel = new Chart(fillCtx, {
        type: 'bar',
        data: {
          labels: ['Low (<25%)', 'Medium (25-50%)', 'High (50-75%)', 'Critical (>75%)'],
          datasets: [{
            label: 'Bins by Fill Level',
            data: [0, 0, 0, 0],
            backgroundColor: ['#10b981', '#eab308', '#f59e0b', '#ef4444'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: chartColors.border } } }
        }
      });
    }

    if (perfCtx) {
      charts.collectionPerformance = new Chart(perfCtx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Completed Tasks',
            data: [12, 19, 15, 25, 22, 30, 28],
            borderColor: chartColors.accent,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(6,182,212,0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: chartColors.border } } }
        }
      });
    }

    if (wasteCtx) {
      charts.wasteTrends = new Chart(wasteCtx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Waste Volume (Tons)',
            data: [45, 52, 48, 61, 55, 67],
            borderColor: '#8b5cf6',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: chartColors.border } } }
        }
      });
    }

    if (efficiencyCtx) {
      charts.contractorEfficiency = new Chart(efficiencyCtx, {
        type: 'radar',
        data: {
          labels: ['On-time', 'Completion', 'Quality', 'Safety', 'Reporting'],
          datasets: [{
            label: 'Average Efficiency',
            data: [85, 90, 78, 92, 88],
            backgroundColor: 'rgba(6,182,212,0.2)',
            borderColor: chartColors.accent,
            pointBackgroundColor: chartColors.accent
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              grid: { color: chartColors.border },
              angleLines: { color: chartColors.border }
            }
          }
        }
      });
    }
  }

  function updateAdvancedCharts(bins, summary) {
    if (charts.fillLevel && summary && summary.bins_by_fill_level) {
      const b = summary.bins_by_fill_level;
      charts.fillLevel.data.datasets[0].data = [b.low, b.medium, b.high, b.critical];
      charts.fillLevel.update();
    }

    if (summary && summary.analytics && summary.analytics.length > 0) {
      const dates = summary.analytics.map(a => new Date(a.metric_date).toLocaleDateString('en-MY', { weekday: 'short' }));
      
      if (charts.collectionPerformance) {
        charts.collectionPerformance.data.labels = dates;
        charts.collectionPerformance.data.datasets[0].data = summary.analytics.map(a => a.total_collections);
        charts.collectionPerformance.update();
      }

      if (charts.wasteTrends) {
        charts.wasteTrends.data.labels = dates;
        charts.wasteTrends.data.datasets[0].data = summary.analytics.map(a => a.total_waste_kg);
        charts.wasteTrends.update();
      }

      if (charts.contractorEfficiency) {
        // Use the latest record for radar chart
        const latest = summary.analytics[summary.analytics.length - 1];
        charts.contractorEfficiency.data.datasets[0].data = [
          latest.route_completion_rate || 85,
          latest.vehicle_utilization_rate || 90,
          80, // Quality (placeholder)
          95, // Safety (placeholder)
          88  // Reporting (placeholder)
        ];
        charts.contractorEfficiency.update();
      }
    } else {
      // Fallback or update anyway if we want to show empty/stale data
      if (charts.collectionPerformance) charts.collectionPerformance.update();
      if (charts.wasteTrends) charts.wasteTrends.update();
      if (charts.contractorEfficiency) charts.contractorEfficiency.update();
    }
  }

  // Real-time subscription via SSE
  function subscribe() {
    console.log('[Dashboard] Subscribing to real-time positions...');
    const source = new EventSource(joinUrl(API_BASE, `/api/stream/positions?api_key=${API_KEY}`));
    
    source.onmessage = (event) => {
      try {
        const positions = JSON.parse(event.data);
        console.log('[Dashboard] Received real-time positions:', positions.length);
        positions.forEach(upsertMarker);
      } catch (e) {
        console.error('[Dashboard] SSE parse error:', e);
      }
    };

    source.onerror = (err) => {
      console.error('[Dashboard] SSE connection error:', err);
      source.close();
      // Fallback to polling via refreshDashboard already handled by setInterval
      setStatus('Real-time stream disconnected; using polling');
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          console.log('[Dashboard] Attempting to reconnect SSE...');
          subscribe();
        }
      }, 5000);
    };
    
    source.onopen = () => {
      console.log('[Dashboard] SSE connection established');
      setStatus('Real-time updates active');
    };

    return source;
  }

  function loadDemoKPIData() {
    console.log('[Dashboard] Loading demo KPI data');
    
    // Verify DOM elements exist before updating
    console.log('[Dashboard] KPI elements check:', {
      kpiTotalBins: !!kpiTotalBins,
      kpiCriticalBins: !!kpiCriticalBins,
      kpiHighFillBins: !!kpiHighFillBins,
      kpiVehiclesService: !!kpiVehiclesService,
      kpiTotalVehicles: !!kpiTotalVehicles,
      kpiActiveContractors: !!kpiActiveContractors,
      kpiPendingTasks: !!kpiPendingTasks,
      kpiUnreadAlerts: !!kpiUnreadAlerts
    });
    
    // Update KPI cards with demo values
    const demoKPIs = {
      total_bins: 42,
      critical_bins: 3,
      high_fill_bins: 5,
      active_vehicles: 8,
      total_vehicles: 12,
      active_contractors: 4,
      pending_tasks: 7,
      unread_alerts: 2
    };
 
    console.log('[Dashboard] Updating KPIs with demo values:', demoKPIs);
    
    if (kpiTotalBins) {
      kpiTotalBins.textContent = demoKPIs.total_bins;
      console.log('[Dashboard] Updated kpiTotalBins:', kpiTotalBins.textContent);
    }
    if (kpiCriticalBins) {
      kpiCriticalBins.textContent = demoKPIs.critical_bins;
      console.log('[Dashboard] Updated kpiCriticalBins:', kpiCriticalBins.textContent);
    }
    if (kpiHighFillBins) {
      kpiHighFillBins.textContent = demoKPIs.high_fill_bins;
      console.log('[Dashboard] Updated kpiHighFillBins:', kpiHighFillBins.textContent);
    }
    if (kpiVehiclesService) {
      kpiVehiclesService.textContent = demoKPIs.active_vehicles;
      console.log('[Dashboard] Updated kpiVehiclesService:', kpiVehiclesService.textContent);
    }
    if (kpiTotalVehicles) {
      kpiTotalVehicles.textContent = demoKPIs.total_vehicles;
      console.log('[Dashboard] Updated kpiTotalVehicles:', kpiTotalVehicles.textContent);
    }
    if (kpiActiveContractors) {
      kpiActiveContractors.textContent = demoKPIs.active_contractors;
      console.log('[Dashboard] Updated kpiActiveContractors:', kpiActiveContractors.textContent);
    }
    if (kpiPendingTasks) {
      kpiPendingTasks.textContent = demoKPIs.pending_tasks;
      console.log('[Dashboard] Updated kpiPendingTasks:', kpiPendingTasks.textContent);
    }
    if (kpiUnreadAlerts) {
      kpiUnreadAlerts.textContent = demoKPIs.unread_alerts;
      console.log('[Dashboard] Updated kpiUnreadAlerts:', kpiUnreadAlerts.textContent);
    }

    // Create demo analytics for charts
    const demoAnalytics = Array(7).fill(0).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        return {
            metric_date: d.toISOString().split('T')[0],
            total_collections: Math.floor(Math.random() * 50) + 10,
            total_waste_kg: Math.floor(Math.random() * 500) + 100,
            route_completion_rate: 85 + Math.random() * 15,
            vehicle_utilization_rate: 70 + Math.random() * 20
        };
    }).reverse();
    
    // Demo fill levels
    const demoFillLevels = {
        low: 12, medium: 15, high: 8, critical: 3
    };
    
    // Update charts with mock summary
    updateAdvancedCharts(smartBinsList, {
        bins_by_fill_level: demoFillLevels,
        analytics: demoAnalytics
    });
  }

  function loadDemoSmartBinsData() {
    console.log('[Dashboard] Loading demo smart bins data');
    const demoBins = [
      { bin_id: 'BIN001', name: 'Gurney Plaza Entrance', area: 'Georgetown', current_fill_level: 85, capacity_kg: 100, bin_type: 'General', latitude: 5.4376, longitude: 100.3098 },
      { bin_id: 'BIN002', name: 'Queensbay Mall South', area: 'Bayan Lepas', current_fill_level: 45, capacity_kg: 100, bin_type: 'Recycle', latitude: 5.3325, longitude: 100.3067 },
      { bin_id: 'BIN003', name: 'Penang Times Square', area: 'Georgetown', current_fill_level: 95, capacity_kg: 120, bin_type: 'General', latitude: 5.4123, longitude: 100.3254 },
      { bin_id: 'BIN004', name: 'KOMTAR Bus Terminal', area: 'Georgetown', current_fill_level: 72, capacity_kg: 150, bin_type: 'General', latitude: 5.4140, longitude: 100.3290 },
      { bin_id: 'BIN005', name: 'Batu Ferringhi Beach', area: 'Batu Ferringhi', current_fill_level: 38, capacity_kg: 80, bin_type: 'Recycle', latitude: 5.4710, longitude: 100.2770 }
    ];
    
    console.log('[Dashboard] Rendering demo bins:', demoBins.length, 'bins');
    smartBinsList = demoBins;
    renderSmartBins(demoBins);
    
    // Add bin markers to map with delay
    setTimeout(() => {
      demoBins.forEach(bin => {
        upsertBinMarker(bin);
      });
      console.log('[Dashboard] Added', demoBins.length, 'bin markers to map');
    }, 1000);
  }

  function loadDemoVehiclesData() {
    console.log('[Dashboard] Loading demo vehicles data');
    const demoVehicles = [
      { 
        id: 1, vehicle_id: 'V001', plate: 'ABC 1234', registration_number: 'ABC 1234', 
        type: 'Collection Truck', vehicle_type: 'Collection Truck', status: 'active', 
        driver_name: 'Ahmad Hassan', fuel_level: 75, last_maintenance: '2024-12-01' 
      },
      { 
        id: 2, vehicle_id: 'V002', plate: 'XYZ 5678', registration_number: 'XYZ 5678', 
        type: 'Garbage Truck', vehicle_type: 'Garbage Truck', status: 'maintenance', 
        driver_name: 'Siti Rahmah', fuel_level: 30, last_maintenance: '2024-12-10' 
      },
      { 
        id: 3, vehicle_id: 'V003', plate: 'DEF 9012', registration_number: 'DEF 9012', 
        type: 'Side Loader', vehicle_type: 'Side Loader', status: 'active', 
        driver_name: 'Mohamed Razak', fuel_level: 88, last_maintenance: '2024-11-20' 
      },
      { 
        id: 4, vehicle_id: 'V004', plate: 'GHI 3456', registration_number: 'GHI 3456', 
        type: 'Front Loader', vehicle_type: 'Front Loader', status: 'active', 
        driver_name: 'Lim Wei Chong', fuel_level: 65, last_maintenance: '2024-11-15' 
      },
      { 
        id: 5, vehicle_id: 'V005', plate: 'JKL 7890', registration_number: 'JKL 7890', 
        type: 'Compactor Truck', vehicle_type: 'Compactor Truck', status: 'active', 
        driver_name: 'Rajesh Kumar', fuel_level: 92, last_maintenance: '2024-10-20' 
      }
    ];
    
    console.log('[Dashboard] Rendering demo vehicles:', demoVehicles.length, 'vehicles');
    vehiclesList = demoVehicles;
    renderVehicles(demoVehicles);
  }

  function loadDemoContractorsData() {
    console.log('[Dashboard] Loading demo contractors data');
    const demoContractors = [
      { contractor_id: 'C001', name: 'CleanPenang Services', contact_person: 'Lim Wei Seng', phone: '+604-123-4567', email: 'info@cleanpenang.com', status: 'active' },
      { contractor_id: 'C002', name: 'EcoWaste Management', contact_person: 'Sharifah Aminah', phone: '+604-234-5678', email: 'contact@ecowaste.com', status: 'active' },
      { contractor_id: 'C003', name: 'Green Island Solutions', contact_person: 'Kumar Rajan', phone: '+604-345-6789', email: 'support@greenisland.com', status: 'inactive' }
    ];
    renderContractors(demoContractors);
    contractorsList = demoContractors;
  }

  function loadDemoVehicleData() {
    console.log('[Dashboard] Loading demo vehicle data');
    const demoPositions = [
      {
        deviceId: 1,
        latitude: 5.417, longitude: 100.329,
        speed: 12.3, course: 90,
        attributes: { ignition: true, batteryLevel: 88 },
        demo: true,
        serverTime: new Date().toISOString()
      },
      {
        deviceId: 2,
        latitude: 5.420, longitude: 100.315,
        speed: 0.0, course: 0,
        attributes: { ignition: false, batteryLevel: 92 },
        demo: true,
        serverTime: new Date().toISOString()
      },
      {
        deviceId: 3,
        latitude: 5.350, longitude: 100.300,
        speed: 45.0, course: 180,
        attributes: { ignition: true, batteryLevel: 75 },
        demo: true,
        serverTime: new Date().toISOString()
      },
      {
        deviceId: 4,
        latitude: 5.380, longitude: 100.340,
        speed: 0.0, course: 0,
        attributes: { ignition: false, batteryLevel: 65 },
        demo: true,
        serverTime: new Date().toISOString()
      },
      {
        deviceId: 5,
        latitude: 5.460, longitude: 100.280,
        speed: 25.0, course: 270,
        attributes: { ignition: true, batteryLevel: 82 },
        demo: true,
        serverTime: new Date().toISOString()
      }
    ];
    
    console.log('[Dashboard] Adding', demoPositions.length, 'demo vehicle markers');
    demoPositions.forEach((position, index) => {
      setTimeout(() => {
        upsertMarker(position);
      }, index * 500); // Stagger marker creation for visual effect
    });
  }

  // Initialize advanced charts
  setupAdvancedCharts();

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

  // Mobile Menu Functionality
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  const mobileThemeToggle = document.getElementById('mobileThemeToggle');
  const mobileDownloadPdf = document.getElementById('mobileDownloadPdf');
  const mobileLogout = document.getElementById('mobileLogout');
  const mobileShowTrails = document.getElementById('mobileShowTrails');
  const mobileFollowDevice = document.getElementById('mobileFollowDevice');
  const mobileDeviceSelect = document.getElementById('mobileDeviceSelect');
  const mobileApiEnv = document.getElementById('mobileApiEnv');
  const mobileApiKeyInput = document.getElementById('mobileApiKeyInput');
  const mobileSaveApi = document.getElementById('mobileSaveApi');
  const mobileUserName = document.getElementById('mobileUserName');
  const mobileUserRole = document.getElementById('mobileUserRole');
  const mobileStatus = document.getElementById('mobileStatus');

  // Toggle mobile menu
  mobileMenuBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
    // Update mobile menu with current values
    if (mobileUserName) mobileUserName.textContent = userName?.textContent || 'Loading...';
    if (mobileUserRole) mobileUserRole.textContent = userRole?.textContent || '';
    if (mobileStatus) mobileStatus.textContent = statusEl?.textContent || 'Loading…';
    if (mobileThemeToggle) mobileThemeToggle.innerHTML = document.documentElement.classList.contains('light') ? '🌞 Theme' : '🌙 Theme';
    if (mobileShowTrails) mobileShowTrails.checked = showTrails?.checked || false;
    if (mobileFollowDevice) mobileFollowDevice.checked = followDevice?.checked || false;
    if (mobileDeviceSelect) {
      mobileDeviceSelect.innerHTML = deviceSelect?.innerHTML || '<option value="">Select Device</option>';
      mobileDeviceSelect.value = selectedDeviceId || '';
    }
    if (mobileApiEnv) mobileApiEnv.value = apiEnv?.value || '/';
    if (mobileApiKeyInput) mobileApiKeyInput.value = apiKeyInput?.value || '';
  });

  // Close mobile menu
  mobileMenuClose?.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
  });

  // Mobile menu functionality
  mobileThemeToggle?.addEventListener('click', () => {
    themeToggle?.click();
    mobileThemeToggle.innerHTML = document.documentElement.classList.contains('light') ? '🌞 Theme' : '🌙 Theme';
  });

  mobileDownloadPdf?.addEventListener('click', () => {
    downloadPdfBtn?.click();
    mobileMenu.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
  });

  mobileLogout?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  });

  mobileShowTrails?.addEventListener('change', () => {
    if (showTrails) showTrails.checked = mobileShowTrails.checked;
  });

  mobileFollowDevice?.addEventListener('change', () => {
    if (followDevice) followDevice.checked = mobileFollowDevice.checked;
  });

  mobileDeviceSelect?.addEventListener('change', () => {
    selectedDeviceId = mobileDeviceSelect?.value || '';
    if (deviceSelect) deviceSelect.value = selectedDeviceId;
  });

  mobileSaveApi?.addEventListener('click', () => {
    API_BASE = mobileApiEnv?.value || '/';
    API_KEY = mobileApiKeyInput?.value || 'dev';
    localStorage.setItem('api_base', API_BASE);
    localStorage.setItem('api_key', API_KEY);
    headers['x-api-key'] = API_KEY;
    if (apiEnv) apiEnv.value = API_BASE;
    if (apiKeyInput) apiKeyInput.value = API_KEY;
    refreshDashboard();
    mobileMenu.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileMenu?.classList.contains('active') && 
        !mobileMenu.contains(e.target) && 
        !mobileMenuBtn.contains(e.target)) {
      mobileMenu.classList.remove('active');
      mobileMenuBtn.classList.remove('active');
    }
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
    const vehicleId = routeVehicleSelect?.value || '';
    const contractorId = routeContractorSelect?.value || '';
    
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
        refreshDashboard(); // Refresh to show new route and tasks
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

  // Audit Trail and Helper Functions
  function logAuditEntry(contractorId, action, description) {
    const auditEntry = {
      contractor_id: contractorId,
      action: action,
      description: description,
      timestamp: new Date().toISOString(),
      user: document.getElementById('userName')?.textContent || 'System'
    };
    
    // Send to backend
    fetch('/api/audit-log', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(auditEntry)
    })
    .then(res => {
      if (!res.ok) {
        console.warn('Failed to log audit entry:', res.status);
      }
    })
    .catch(error => {
      console.warn('Failed to log audit entry:', error);
    });
  }
  
  function loadAuditTrail(contractorId) {
    const auditList = document.getElementById('contractorAuditList');
    auditList.innerHTML = '<p>Loading audit trail...</p>';
    
    fetch(`/api/contractors/${contractorId}/audit`, { headers })
      .then(res => res.json())
      .then(auditEntries => {
        if (auditEntries.length === 0) {
          auditList.innerHTML = '<p>No audit entries found.</p>';
          return;
        }
        
        auditList.innerHTML = auditEntries.map(entry => `
          <div class="audit-entry">
            <div class="audit-info">
              <h4>${entry.action.replace('_', ' ')}</h4>
              <p>${entry.description}</p>
              <p>User: ${entry.user}</p>
            </div>
            <div class="audit-timestamp">
              ${new Date(entry.timestamp).toLocaleString()}
            </div>
          </div>
        `).join('');
      })
      .catch(error => {
        console.error('Failed to load audit trail:', error);
        auditList.innerHTML = '<p>Failed to load audit trail.</p>';
      });
  }
  
  // Helper functions for data refresh
  function refreshContractorsList() {
    try {
      fetch('/api/contractors', { headers })
        .then(res => res.json())
        .then(contractors => {
          renderContractors(contractors);
          makeContractorsClickable();
        })
        .catch(error => {
          console.error('Failed to refresh contractors list:', error);
        });
    } catch (error) {
      console.error('Failed to refresh contractors list:', error);
    }
  }
  
  function refreshVehiclesList() {
    try {
      fetch('/api/vehicles', { headers })
        .then(res => res.json())
        .then(vehicles => {
          renderVehicles(vehicles);
        })
        .catch(error => {
          console.error('Failed to refresh vehicles list:', error);
        });
    } catch (error) {
      console.error('Failed to refresh vehicles list:', error);
    }
  }
  
  // Enhanced error handling
  function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      showNotification('Authentication error. Please log in again.', 'error');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } else if (error.message.includes('404')) {
      showNotification('Resource not found.', 'error');
    } else if (error.message.includes('409')) {
      showNotification('Conflict: This resource may have been modified by another user.', 'error');
    } else if (error.message.includes('422')) {
      showNotification('Invalid data provided. Please check your inputs.', 'error');
    } else if (error.message.includes('500')) {
      showNotification('Server error. Please try again later.', 'error');
    } else {
      showNotification(defaultMessage, 'error');
    }
  }
  
  // Accessibility enhancements
  function enhanceAccessibility() {
    // Add ARIA labels to dynamically created elements
    document.addEventListener('DOMNodeInserted', (e) => {
      const element = e.target;
      
      // Add ARIA labels to buttons
      if (element.tagName === 'BUTTON' && !element.getAttribute('aria-label')) {
        const text = element.textContent.trim();
        if (text) {
          element.setAttribute('aria-label', text);
        }
      }
      
      // Add ARIA labels to inputs
      if (element.tagName === 'INPUT' && element.id && !element.getAttribute('aria-label')) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) {
          element.setAttribute('aria-label', label.textContent);
        }
      }
    });
    
    // Keyboard navigation for modals
    document.addEventListener('keydown', (e) => {
      const modal = document.querySelector('.modal.show');
      if (!modal) return;
      
      // Trap focus within modal
      if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });
  }
  
  // Network status monitoring
  function monitorNetworkStatus() {
    function updateOnlineStatus() {
      if (navigator.onLine) {
        showNotification('Connection restored', 'success');
        refreshDashboard();
      } else {
        showNotification('Connection lost. Working offline.', 'warn');
      }
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }
  
  // Initialize enhanced features
  document.addEventListener('DOMContentLoaded', () => {
    // Clear any saved layout positions
    localStorage.removeItem('dashboardLayout');
    
    // Initialize accessibility features
    enhanceAccessibility();
    
    // Initialize network monitoring
    monitorNetworkStatus();
    
    // Make contractor items clickable
    setTimeout(() => {
      makeContractorsClickable();
    }, 1000);
  });

})();