      card.innerHTML = `
        <div class="contractor-main">
          <div class="card-icon" aria-hidden="true">🏢</div>
          <div class="contractor-name">${c.name || 'Unknown Contractor'}</div>
          <div class="contractor-meta">
            <span>${vehiclesCount} vehicles</span>
            ${areas ? `<span>${areas}</span>` : ''}
          </div>
        </div>
        <div class="contractor-actions">
          <!-- Status Bar (Option B) -->
          <div class="contractor-status-bar">
            <div class="contractor-status-fill" style="width: ${Math.min(vehiclesCount * 10, 100)}%"></div>
          </div>
          <span class="status-badge ${status}" aria-label="Status: ${status}">${status}</span>
          <button class="btn secondary-btn edit-btn" aria-label="Edit contractor" onclick="showContractorSettings(${card.dataset.contractorId})">Edit</button>
        </div>
      `;