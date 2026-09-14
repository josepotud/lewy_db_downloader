/**
 * Lewy Data Suite - Conector de API REDCap en Vivo con Autoconstrucción Dinámica
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
          <strong>Sincronizando con REDCap...</strong>
          <p style="font-size:12px; color:#475569; margin:0;">Descargando estructura de metadatos y registros en vivo...</p>
        </div>
      `;
    }

    try {
      // 1. DESCARGA DINÁMICA DE METADATOS (Diccionario de Datos en Vivo)
      try {
        const metaFormData = new URLSearchParams();
        metaFormData.append('token', apiToken);
        metaFormData.append('content', 'metadata');
        metaFormData.append('format', 'json');
        metaFormData.append('returnFormat', 'json');

        const metaResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: metaFormData.toString()
        });

        if (metaResponse.ok) {
          const metadata = await metaResponse.json();
          if (Array.isArray(metadata) && metadata.length > 0) {
            DictionaryManager.loadFromREDCapMetadata(metadata);
          }
        }
      } catch (metaErr) {
        console.warn('Metadatos en vivo no disponibles, utilizando diccionario base:', metaErr);
      }

      // 2. DESCARGA DE REGISTROS DE LA COHORTE
      const recFormData = new URLSearchParams();
      recFormData.append('token', apiToken);
      recFormData.append('content', 'record');
      recFormData.append('format', 'json');
      recFormData.append('type', 'flat');
      recFormData.append('rawOrLabel', 'raw');
      recFormData.append('rawOrLabelHeaders', 'raw');
      recFormData.append('exportCheckboxLabel', 'false');
      recFormData.append('returnFormat', 'json');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: recFormData.toString()
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
              <strong style="color:#065f46;">Conexión y Sincronización Exitosa</strong>
              <p style="font-size:12px; color:#065f46; margin:0;">Estructura de ${DictionaryManager.dictionary.length} variables y ${records.length} registros sincronizados en vivo.</p>
            </div>
          </div>
        `;
      }

      App.showToast(`Sincronizados ${records.length} registros y ${DictionaryManager.dictionary.length} variables`, 'success');
      DashboardManager.render();
      TableView.render();
      App.renderTimeMatcherUI();
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
          <div style="background:#ffffff; border:1px solid #fecaca; border-radius:6px; padding:8px 10px; font-size:11.5px; color:#991b1b;">
            <strong>Solución recomendada:</strong> Exporta tu archivo CSV o Excel desde REDCap y cárgalo directamente en el botón <em>"Cargar Archivo Local"</em>.
          </div>
        `;
      }

      App.showToast('Error al conectar con la API de REDCap', 'danger');
    }
  },

  clearSavedCredentials() {
    localStorage.removeItem('lewy_api_url');
    localStorage.removeItem('lewy_api_token');
    const tokenInput = document.getElementById('api-token-input');
    const savedBadge = document.getElementById('api-saved-badge');
    const statusBox = document.getElementById('api-status-box');

    if (tokenInput) tokenInput.value = '';
    if (savedBadge) savedBadge.style.display = 'none';
    if (statusBox) statusBox.style.display = 'none';

    App.showToast('Credenciales guardadas eliminadas', 'info');
  }
};
