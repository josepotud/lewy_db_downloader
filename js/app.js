/**
 * Lewy Data Suite - Controlador Principal (Visor y Exportación)
 */
const App = {
  currentToleranceDays: 180,

  init() {
    console.log('Iniciando Lewy Data Suite...');
    
    DictionaryManager.init();
    AppState.init();
    ApiClient.init();

    DashboardManager.render();
    TableView.render();
    this.renderTimeMatcherUI();
    DeepSearch.render();
    this.setupDropzone();

    console.log('Aplicación iniciada correctamente.');
  },

  switchTab(tabId) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    const pane = document.getElementById(tabId);

    if (btn) btn.classList.add('active');
    if (pane) pane.classList.add('active');

    if (tabId === 'tab-dashboard') {
      DashboardManager.render();
    } else if (tabId === 'tab-table') {
      TableView.render();
    } else if (tabId === 'tab-matcher') {
      this.runTimeMatcher();
    } else if (tabId === 'tab-search') {
      DeepSearch.render();
    }
  },

  renderTimeMatcherUI() {
    const listEl = document.getElementById('matcher-instruments-checklist');
    if (!listEl) return;

    let html = '';

    // Grupo 1: Instrumentos Basales Independientes
    html += `<div style="font-size:11px; font-weight:700; color:#0369a1; text-transform:uppercase; margin-bottom:4px; border-bottom:1px solid #e0f2fe; padding-bottom:2px;">📌 Datos Basales (Sin medidas repetidas)</div>`;
    const independentKeys = ['demograficos', 'antecedentes', 'genetica_molecular'];
    independentKeys.forEach(formKey => {
      const cfg = TimeMatcher.instrumentConfig[formKey];
      if (!cfg) return;
      html += `<label class="check-item" style="background:#f0f9ff; border-color:#bae6fd;">
        <input type="checkbox" name="matcher_form" value="${formKey}" checked onchange="App.runTimeMatcher()" />
        <span>${cfg.icon || '📌'} ${cfg.title}</span>
      </label>`;
    });

    // Grupo 2: Pruebas y Evaluaciones Temporales
    html += `<div style="font-size:11px; font-weight:700; color:#0f766e; text-transform:uppercase; margin:10px 0 4px 0; border-bottom:1px solid #ccfbf1; padding-bottom:2px;">⏱️ Pruebas y Biomarcadores (Temporales)</div>`;
    const temporalKeys = ['visita_estudio', 'puncion_lumbar', 'pet_fdg', 'resonancia_magnetica', 'evaluacion_neuropsicologica', 'mds_updrs_examination', 'inventario_neuropsiquiatrico_npi', 'escalas_funcionales_y_globales', 'diagnostico_y_gds', 'datscan_spect', 'pet_amiloide', 'electroencefalograma'];
    const defaultChecked = ['visita_estudio', 'puncion_lumbar', 'pet_fdg', 'resonancia_magnetica', 'evaluacion_neuropsicologica', 'datscan_spect'];

    temporalKeys.forEach(formKey => {
      const cfg = TimeMatcher.instrumentConfig[formKey];
      if (!cfg) return;
      const checked = defaultChecked.includes(formKey) ? 'checked' : '';
      html += `<label class="check-item">
        <input type="checkbox" name="matcher_form" value="${formKey}" ${checked} onchange="App.runTimeMatcher()" />
        <span>${cfg.icon || '⏱️'} ${cfg.title}</span>
      </label>`;
    });

    listEl.innerHTML = html;
    this.runTimeMatcher();
  },

  setTolerance(days) {
    this.currentToleranceDays = parseInt(days, 10) || 180;
    const customInput = document.getElementById('matcher-custom-days');
    if (customInput) customInput.value = this.currentToleranceDays;

    document.querySelectorAll('.tolerance-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.days, 10) === this.currentToleranceDays);
    });
    this.runTimeMatcher();
  },

  onCustomDaysInput(val) {
    const days = parseInt(val, 10);
    if (isNaN(days) || days <= 0) return;
    this.currentToleranceDays = days;
    document.querySelectorAll('.tolerance-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.days, 10) === this.currentToleranceDays);
    });
    this.runTimeMatcher();
  },

  getTimeMatcherOptions() {
    const anchorSelect = document.getElementById('matcher-anchor-select');
    const anchorForm = anchorSelect ? anchorSelect.value : 'puncion_lumbar';

    const customInput = document.getElementById('matcher-custom-days');
    const toleranceDays = customInput ? (parseInt(customInput.value, 10) || this.currentToleranceDays) : this.currentToleranceDays;

    const strategySelect = document.getElementById('matcher-strategy-select');
    const strategy = strategySelect ? strategySelect.value : 'closest';

    const anchorStrategySelect = document.getElementById('matcher-anchor-strategy-select');
    const anchorStrategy = anchorStrategySelect ? anchorStrategySelect.value : 'most_complete';

    const selectedForms = [];
    document.querySelectorAll('input[name="matcher_form"]:checked').forEach(cb => {
      selectedForms.push(cb.value);
    });

    const completeOnlyCb = document.getElementById('matcher-complete-only');
    const onlyCompleteCases = completeOnlyCb ? completeOnlyCb.checked : false;

    return {
      anchorForm,
      toleranceDays: toleranceDays,
      selectedForms,
      strategy,
      anchorStrategy,
      onlyCompleteCases
    };
  },

  runTimeMatcher() {
    const options = this.getTimeMatcherOptions();
    const result = TimeMatcher.generateTimeMatchedTable(options);

    const elTotal = document.getElementById('matcher-stat-total');
    if (elTotal) elTotal.textContent = `${result.totalPatients} Pacientes con ${TimeMatcher.instrumentConfig[options.anchorForm] ? TimeMatcher.instrumentConfig[options.anchorForm].title : options.anchorForm} (±${result.toleranceDays} días)`;

    const thead = document.getElementById('matcher-table-head');
    const tbody = document.getElementById('matcher-table-body');
    if (!thead || !tbody) return;

    const anchorCfg = TimeMatcher.instrumentConfig[options.anchorForm];
    let headHTML = `<tr><th>ID Paciente</th><th>Género / Nac.</th><th>Diagnóstico</th><th>📍 ${anchorCfg ? anchorCfg.title : 'Referencia'} (Fecha)</th>`;
    options.selectedForms.forEach(f => {
      if (f !== options.anchorForm) {
        const cfg = TimeMatcher.instrumentConfig[f];
        headHTML += `<th>${cfg ? cfg.title : f}</th>`;
      }
    });
    headHTML += '<th>Resumen</th></tr>';
    thead.innerHTML = headHTML;

    if (result.rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${options.selectedForms.length + 4}" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron pacientes con evaluaciones en la prueba de referencia.</td></tr>`;
      return;
    }

    let bodyHTML = '';
    const sample = result.rows.slice(0, 50);
    sample.forEach(r => {
      const genText = DictionaryManager.getChoiceText('genero', r.genero) || '-';
      bodyHTML += `<tr>
        <td><a href="javascript:void(0)" onclick="PatientViewer.open('${r.lewy_id}')" style="text-decoration:none;" title="Abrir Ficha de ${r.lewy_id}"><span class="badge badge-primary badge-clickable">ID: ${r.lewy_id}</span></a></td>
        <td>${genText} (${r.dob || '-'})</td>
        <td><div class="table-truncate-cell" title="${String(r.dx_clinico || '').replace(/"/g, '&quot;')}">${r.dx_clinico || '-'}</div></td>
        <td><strong>${r.anchor_date || '-'}</strong></td>`;

      options.selectedForms.forEach(f => {
        if (f !== options.anchorForm) {
          const diff = r.temporal_diffs[f];
          const cfg = TimeMatcher.instrumentConfig[f];

          if (cfg && cfg.isIndependent) {
            bodyHTML += `<td><span class="badge badge-neutral" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd; font-size:11px;">Basal</span></td>`;
          } else if (diff && diff.status !== 'missing' && diff.days !== null) {
            const badgeClass = diff.days <= 30 ? 'badge-success' : (diff.days <= 90 ? 'badge-warning' : 'badge-neutral');
            const multiTag = diff.candidatesCount > 1 ? `<span class="badge badge-purple" style="font-size:10px;" title="${diff.candidatesCount} pruebas en ventana (${options.strategy})">${diff.candidatesCount}</span>` : '';
            const signedDelta = diff.deltaDays < 0 ? `-${Math.abs(diff.deltaDays)}d` : (diff.deltaDays > 0 ? `+${diff.deltaDays}d` : `0d`);

            bodyHTML += `<td>
              <div><strong>${diff.dateStr}</strong> ${multiTag}</div>
              <div style="margin-top:2px;">
                <span class="badge ${badgeClass}">${signedDelta}</span>
              </div>
            </td>`;
          } else {
            bodyHTML += `<td><span class="badge badge-neutral" style="opacity:0.4;">Fuera de ventana</span></td>`;
          }
        }
      });

      let summaryPills = '';
      if (r.instruments_data['puncion_lumbar'] && r.instruments_data['puncion_lumbar'].pl_ab42_valor) {
        summaryPills += `<span class="badge badge-teal">LCR: ${r.instruments_data['puncion_lumbar'].pl_ab42_valor}</span> `;
      }
      if (r.instruments_data['visita_estudio'] && r.instruments_data['visita_estudio'].hx_mmse) {
        summaryPills += `<span class="badge badge-primary">MMSE: ${r.instruments_data['visita_estudio'].hx_mmse}</span> `;
      }
      if (r.instruments_data['resonancia_magnetica'] && r.instruments_data['resonancia_magnetica'].schel_mta) {
        summaryPills += `<span class="badge badge-purple">MTA: ${r.instruments_data['resonancia_magnetica'].schel_mta}</span> `;
      }
      if (r.instruments_data['pet_fdg'] && r.instruments_data['pet_fdg'].petfdg_patron_visual) {
        summaryPills += `<span class="badge badge-warning">PET-FDG</span> `;
      }

      bodyHTML += `<td>${summaryPills || '-'}</td></tr>`;
    });

    if (result.rows.length > 50) {
      bodyHTML += `<tr><td colspan="${options.selectedForms.length + 4}" style="text-align:center; padding:12px; background:#f8fafc; font-weight:600; color:var(--text-muted);">... y ${result.rows.length - 50} pacientes más (Descarga la tabla completa en Excel arriba)</td></tr>`;
    }

    tbody.innerHTML = bodyHTML;
  },

  setupDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
  },

  handleFileUpload(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    App.showToast(`Procesando archivo: ${file.name}...`, 'info');

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            AppState.loadData(results.data, 'file');
            App.closeModal('modal-import');
            App.showToast(`✅ Base cargada: ${results.data.length} filas`, 'success');
            DashboardManager.render();
            TableView.render();
            App.runTimeMatcher();
            DeepSearch.render();
          }
        },
        error: (err) => {
          App.showToast(`Error al leer CSV: ${err.message}`, 'danger');
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
        if (rows && rows.length > 0) {
          AppState.loadData(rows, 'file');
          App.closeModal('modal-import');
          App.showToast(`✅ Excel cargado: ${rows.length} filas`, 'success');
          DashboardManager.render();
          TableView.render();
          App.runTimeMatcher();
          DeepSearch.render();
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rows = JSON.parse(e.target.result);
          if (Array.isArray(rows)) {
            AppState.loadData(rows, 'file');
            App.closeModal('modal-import');
            App.showToast(`✅ JSON cargado: ${rows.length} filas`, 'success');
            DashboardManager.render();
            TableView.render();
            App.runTimeMatcher();
            DeepSearch.render();
          }
        } catch (err) {
          App.showToast('Error al parsear JSON', 'danger');
        }
      };
      reader.readAsText(file);
    }
  },

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
