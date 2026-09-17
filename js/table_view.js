/**
 * Lewy Data Suite - Explorador Avanzado de Pacientes
 * Soporta los 15 instrumentos completos con el 100% de sus variables dinámicas,
 * navegación por instancias repetidas y decodificación automática de etiquetas.
 */
const TableView = {
  currentPage: 1,
  pageSize: 25,
  searchTerm: '',
  currentPreset: 'general',
  sortColumn: 'lewy_id',
  sortDirection: 'asc',
  debounceTimer: null,

  init() {
    this.renderDropdown();
    this.render();
  },

  onSearchInput(term) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.setSearch(term);
    }, 200);
  },

  renderDropdown() {
    const selectEl = document.getElementById('table-preset-select');
    if (!selectEl) return;

    let html = '<option value="general">0. Resumen General de Cohorte</option>';

    if (typeof DictionaryManager !== 'undefined' && DictionaryManager.formsList) {
      DictionaryManager.formsList.forEach(form => {
        const isSelected = form.id === this.currentPreset ? 'selected' : '';
        html += `<option value="${form.id}" ${isSelected}>${form.title} (${form.count} variables)</option>`;
      });
    }

    selectEl.innerHTML = html;
  },

  getGeneralColumns() {
    return [
      { key: 'lewy_id', label: 'ID Lewy' },
      { key: 'genero', label: 'Género' },
      { key: 'dob', label: 'F. Nacimiento' },
      { key: 'escolarizacion_cat', label: 'Escolarización' },
      { key: 'hx_fecha_visita', label: 'Fecha Visita' },
      { key: 'dx_clinico', label: 'Diagnóstico' },
      { key: 'hx_mmse', label: 'MMSE' },
      { key: 'hx_moca', label: 'MoCA' },
      { key: 'estadio_gds', label: 'GDS' }
    ];
  },

  getCurrentColumns() {
    if (this.currentPreset === 'general') {
      return this.getGeneralColumns();
    }

    const formVars = DictionaryManager.getFormVariables(this.currentPreset);
    const isRepeating = TimeMatcher.instrumentConfig[this.currentPreset] ? TimeMatcher.instrumentConfig[this.currentPreset].isRepeating : false;

    const cols = [
      { key: 'lewy_id', label: 'ID Lewy' },
      { key: 'dx_clinico', label: 'Diagnóstico' }
    ];

    if (isRepeating) {
      cols.push({ key: 'redcap_repeat_instance', label: 'Instancia' });
    }

    formVars.forEach(v => {
      if (v.var === 'lewy_id' || v.var === 'redcap_repeat_instrument' || v.var === 'redcap_repeat_instance' || v.var.endsWith('_complete')) return;
      cols.push({
        key: v.var,
        label: v.label || v.var,
        header: v.header || ''
      });
    });

    return cols;
  },

  buildDataset() {
    const rows = [];
    const isRepeating = (this.currentPreset !== 'general') && (TimeMatcher.instrumentConfig[this.currentPreset] ? TimeMatcher.instrumentConfig[this.currentPreset].isRepeating : false);

    AppState.patientIds.forEach(id => {
      const p = AppState.getPatient(id);
      if (!p) return;

      const baseInfo = {
        lewy_id: id,
        genero: AppState.getPatientValue(id, 'genero'),
        dob: AppState.getPatientValue(id, 'dob'),
        escolarizacion_cat: AppState.getPatientValue(id, 'escolarizacion_cat'),
        dx_clinico: AppState.getPatientDiagnosis(id),
        hx_fecha_visita: AppState.getPatientValue(id, 'hx_fecha_visita'),
        hx_mmse: AppState.getPatientValue(id, 'hx_mmse'),
        hx_moca: AppState.getPatientValue(id, 'hx_moca'),
        estadio_gds: AppState.getPatientValue(id, 'estadio_gds') || AppState.getPatientValue(id, 'diag_gds')
      };

      if (!isRepeating) {
        const fullRow = Object.assign({}, baseInfo, p.baseRow || {});
        rows.push(fullRow);
      } else {
        const instances = (p.repeating && p.repeating[this.currentPreset]) ? p.repeating[this.currentPreset] : [];
        if (instances.length === 0) {
          const emptyRow = Object.assign({}, baseInfo, { redcap_repeat_instance: '-' });
          rows.push(emptyRow);
        } else {
          instances.forEach((inst, idx) => {
            const instRow = Object.assign({}, baseInfo, inst, {
              redcap_repeat_instance: inst.redcap_repeat_instance || (idx + 1)
            });
            rows.push(instRow);
          });
        }
      }
    });

    return rows;
  },

  render() {
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    if (!tableHeader || !tableBody) return;

    this.renderDropdown();

    const columns = this.getCurrentColumns();

    // Renderizar cabeceras con ordenación
    let headerHTML = '<tr>';
    columns.forEach(col => {
      const isSorted = this.sortColumn === col.key;
      const arrow = isSorted ? (this.sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
      const colTitle = col.label.replace(/"/g, '&quot;');
      headerHTML += `<th onclick="TableView.handleSort('${col.key}')" title="${colTitle}" style="max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
        ${col.label} <span class="sort-indicator">${arrow}</span>
      </th>`;
    });
    headerHTML += '<th style="text-align:right; min-width:140px; position:sticky; right:0; background:#f8fafc; z-index:2;">Acciones</th></tr>';
    tableHeader.innerHTML = headerHTML;

    // Obtener y filtrar dataset
    const allRows = this.buildDataset();

    let filteredRows = allRows.filter(row => {
      if (!this.searchTerm) return true;
      const term = this.searchTerm.toLowerCase();
      
      if (String(row.lewy_id || '').toLowerCase().includes(term)) return true;
      if (String(row.dx_clinico || '').toLowerCase().includes(term)) return true;

      // Buscar en cualquier campo de la fila
      for (const key of Object.keys(row)) {
        const val = String(row[key] || '').toLowerCase();
        if (val.includes(term)) return true;
      }
      return false;
    });

    // Ordenación
    filteredRows.sort((a, b) => {
      let valA = (this.sortColumn === 'dx_clinico') ? (a.dx_clinico || '') : (a[this.sortColumn] || '');
      let valB = (this.sortColumn === 'dx_clinico') ? (b.dx_clinico || '') : (b[this.sortColumn] || '');

      const numA = parseFloat(valA), numB = parseFloat(valB);
      let cmp = 0;
      if (!isNaN(numA) && !isNaN(numB) && String(numA) === String(valA) && String(numB) === String(valB)) {
        cmp = numA - numB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });

    // Paginación
    const totalItems = filteredRows.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const pageRows = filteredRows.slice(startIdx, startIdx + this.pageSize);

    if (pageRows.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="${columns.length + 1}" style="text-align:center; padding: 40px; color: var(--text-muted);">No se encontraron registros que coincidan con la búsqueda.</td></tr>`;
    } else {
      let bodyHTML = '';
      pageRows.forEach(row => {
        const id = row.lewy_id;
        bodyHTML += `<tr>`;

        columns.forEach(col => {
          let rawVal = row[col.key];
          let displayVal = DictionaryManager.getChoiceText(col.key, rawVal);

          if (col.key === 'lewy_id') {
            bodyHTML += `<td>
              <a href="javascript:void(0)" onclick="PatientViewer.open('${id}')" style="text-decoration:none;" title="Abrir Ficha Clínica del paciente ${id}">
                <span class="badge badge-primary badge-clickable">ID: ${id}</span>
              </a>
            </td>`;
          } else if (col.key === 'redcap_repeat_instance') {
            const instNum = rawVal || '-';
            bodyHTML += `<td><span class="badge badge-teal">${instNum === '-' ? 'Sin datos' : '#' + instNum}</span></td>`;
          } else if (col.key === 'dx_clinico' || String(displayVal).length > 25) {
            const safeVal = String(displayVal || '').replace(/"/g, '&quot;');
            bodyHTML += `<td>
              <div class="table-truncate-cell" title="${safeVal}">${displayVal || '-'}</div>
            </td>`;
          } else {
            bodyHTML += `<td>${displayVal !== undefined && displayVal !== null && displayVal !== '' ? displayVal : '-'}</td>`;
          }
        });

        bodyHTML += `<td style="text-align:right; position:sticky; right:0; background:#ffffff; box-shadow:-2px 0 5px rgba(0,0,0,0.03);">
          <button class="btn btn-sm btn-outline-primary" onclick="PatientViewer.open('${id}')" title="Ver Ficha">Ficha</button>
          <button class="btn btn-sm btn-secondary" onclick="ReportPrinter.open('${id}')" title="Informe PDF">Informe</button>
        </td>`;
        bodyHTML += `</tr>`;
      });
      tableBody.innerHTML = bodyHTML;
    }

    // Información de paginación
    const pageInfo = document.getElementById('pagination-info');
    if (pageInfo) {
      const from = totalItems > 0 ? startIdx + 1 : 0;
      const to = Math.min(startIdx + this.pageSize, totalItems);
      const isRepeating = (this.currentPreset !== 'general') && (TimeMatcher.instrumentConfig[this.currentPreset] ? TimeMatcher.instrumentConfig[this.currentPreset].isRepeating : false);
      const unitName = isRepeating ? 'registros/evaluaciones' : 'pacientes';
      pageInfo.textContent = `Mostrando ${from} - ${to} de ${totalItems} ${unitName} (${columns.length - 1} variables)`;
    }

    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
  },

  handleSort(colKey) {
    if (this.sortColumn === colKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = colKey;
      this.sortDirection = 'asc';
    }
    this.render();
  },

  setPreset(presetKey) {
    this.currentPreset = presetKey;
    this.currentPage = 1;
    this.render();
  },

  setSearch(term) {
    this.searchTerm = term;
    this.currentPage = 1;
    this.render();
  },

  nextPage() {
    this.currentPage++;
    this.render();
  },

  prevPage() {
    this.currentPage--;
    this.render();
  }
};
