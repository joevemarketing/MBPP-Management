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
          
          <!-- Fill Level with Progress Bar (Option B) -->
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