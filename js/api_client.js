/**
 * Lewy Data Suite - Conector de API REDCap en Vivo con Almacenamiento Persistente
 */
const ApiClient = {
  init() {
    const savedUrl = localStorage.getItem('lewy_api_url') || 'https://redcap.sen.es/api/';
    const savedToken = localStorage.getItem('lewy_api_token') || '';

    const urlInput = document.getElementById('api-url-input');
    const tokenInput = document.getElementById('api-token-input');
    const savedBadge = document.getElementById('api-saved-badge');

    if (urlInput) urlInput.value = savedUrl;
    if (tokenInput && savedToken) {
      tokenInput.value = savedToken;
      if (savedBadge) savedBadge.style.display = 'inline-flex';
    }

    // Auto-save when user types
    if (urlInput) {
      urlInput.addEventListener('input', () => {
        localStorage.setItem('lewy_api_url', urlInput.value.trim());
      });
    }
    if (tokenInput) {
      tokenInput.addEventListener('input', () => {
        if (tokenInput.value.trim()) {
          localStorage.setItem('lewy_api_token', tokenInput.value.trim());
          if (savedBadge) savedBadge.style.display = 'inline-flex';
        } else {
          localStorage.removeItem('lewy_api_token');
          if (savedBadge) savedBadge.style.display = 'none';
        }
      });
    }
  },

  async fetchRecordsFromREDCap() {
    const urlInput = document.getElementById('api-url-input');
    const tokenInput = document.getElementById('api-token-input');
    const statusBox = document.getElementById('api-status-box');
    const savedBadge = document.getElementById('api-saved-badge');

    const apiUrl = urlInput ? urlInput.value.trim() : (localStorage.getItem('lewy_api_url') || 'https://redcap.sen.es/api/');
    const apiToken = tokenInput ? tokenInput.value.trim() : (localStorage.getItem('lewy_api_token') || '');

    if (!apiUrl) {
      App.showToast('Por favor, introduce la URL de la API REDCap', 'warning');
      return;
    }

    if (!apiToken) {
      App.showToast('Por favor, introduce tu Token de API de REDCap', 'warning');
      return;
    }

    // Guardar automáticamente
    localStorage.setItem('lewy_api_url', apiUrl);
    localStorage.setItem('lewy_api_token', apiToken);
    if (savedBadge) savedBadge.style.display = 'inline-flex';

    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.className = 'card';
      statusBox.style.background = '#f0fdf4';
      statusBox.style.borderColor = '#86efac';
      statusBox.innerHTML = `
        <div>
          <strong>Conectando con el servidor REDCap...</strong>
          <p style="font-size:12px; color:#475569; margin:0;">Descargando registros de la cohorte en vivo</p>
        </div>
      `;
    }

    const formData = new URLSearchParams();
    formData.append('token', apiToken);
    formData.append('content', 'record');
    formData.append('format', 'json');
    formData.append('type', 'flat');
    formData.append('rawOrLabel', 'raw');
    formData.append('rawOrLabelHeaders', 'raw');
    formData.append('exportCheckboxLabel', 'false');
    formData.append('returnFormat', 'json');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const records = await response.json();

      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('El servidor respondió pero no devolvió ningún registro.');
      }

      AppState.loadData(records, 'api');
      
      if (statusBox) {
        statusBox.style.background = '#d1fae5';
        statusBox.style.borderColor = '#34d399';
        statusBox.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            
            <div>
              <strong style="color:#065f46;">¡Conexión Exitosa con REDCap!</strong>
              <p style="font-size:12px; color:#065f46; margin:0;">Sincronizados ${records.length} registros en vivo. Credenciales guardadas.</p>
            </div>
          </div>
        `;
      }

      App.showToast(`Sincronizados ${records.length} registros desde REDCap`, 'success');
      DashboardManager.render();
      TableView.render();
      App.runTimeMatcher();

      setTimeout(() => {
        App.closeModal('modal-api');
      }, 1200);

    } catch (err) {
      console.warn('Error en conexión API REDCap:', err);

      if (statusBox) {
        statusBox.style.background = '#fef2f2';
        statusBox.style.borderColor = '#fca5a5';
        statusBox.innerHTML = `
          <div style="margin-bottom:8px;">
            <strong style="color:#991b1b;">No se pudo conectar directamente con la API</strong>
            <p style="font-size:12px; color:#7f1d1d; margin:4px 0 0 0;">
              El navegador bloqueó la conexión directa por política CORS del servidor REDCap o token incorrecto.
            </p>
          </div>
          <div style="background:#ffffff; border:1px solid #fecaca; border-radius:6px; padding:10px; margin-top:8px;">
            <p style="font-size:12px; color:#1e293b; font-weight:600; margin-bottom:6px;">Solución inmediata:</p>
            <p style="font-size:12px; color:#475569; margin-bottom:8px;">Carga el archivo CSV o Excel exportado desde REDCap:</p>
            <button class="btn btn-sm btn-primary" onclick="App.closeModal('modal-api'); App.openModal('modal-import');">
              Cargar Archivo CSV / Excel (.xlsx)
            </button>
          </div>
        `;
      }

      App.showToast(`Aviso API: Carga mediante archivo CSV o Excel disponible`, 'warning');
    }
  },

  clearSavedCredentials() {
    localStorage.removeItem('lewy_api_token');
    const tokenInput = document.getElementById('api-token-input');
    const savedBadge = document.getElementById('api-saved-badge');
    if (tokenInput) tokenInput.value = '';
    if (savedBadge) savedBadge.style.display = 'none';
    App.showToast('Credenciales borradas de este equipo', 'info');
  }
};
