/**
 * Lewy Data Suite - Explorador de Pacientes
 */
const TableView = {
  currentPage: 1,
  pageSize: 25,
  searchTerm: '',
  currentPreset: 'general',
  sortColumn: 'lewy_id',
  sortDirection: 'asc',
  debounceTimer: null,

  onSearchInput(term) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.setSearch(term);
    }, 200);
  },

  presets: {
    'general': {
      title: 'General',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'genero', label: 'Género' },
        { key: 'dob', label: 'F. Nacimiento' },
        { key: 'escolarizacion_cat', label: 'Escolarización' },
        { key: 'hx_fecha_visita', label: 'Fecha Visita' },
        { key: 'dx_clinico', label: 'Diagnóstico' },
        { key: 'hx_mmse', label: 'MMSE' },
        { key: 'hx_moca', label: 'MoCA' },
        { key: 'estadio_gds', label: 'GDS' }
      ]
    },
    'clinica': {
      title: 'Clínica y Debut',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'hx_fecha_visita', label: 'F. Visita' },
        { key: 'primer_sintoma', label: 'Primer Síntoma' },
        { key: 'dt_primer_sintoma', label: 'Fecha Debut' },
        { key: 'hx_fluctuaciones', label: 'Fluctuaciones' },
        { key: 'hx_aluc_visuales', label: 'Alucinaciones Vis.' },
        { key: 'hx_tcsrem', label: 'TCSREM' },
        { key: 'hx_parkinsonismo', label: 'Parkinsonismo' }
      ]
    },
    'neuropsicologia': {
      title: 'Neuropsicología',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'npi_fecha', label: 'Fecha NPI' },
        { key: 'hx_mmse', label: 'MMSE' },
        { key: 'hx_moca', label: 'MoCA' },
        { key: 'npi_fcsrt_libre', label: 'FCSRT Libre' },
        { key: 'npi_fcsrt_facilitada', label: 'FCSRT Total' },
        { key: 'npi_tmt_a_tiempo', label: 'TMT-A' },
        { key: 'npi_tmt_b_tiempo', label: 'TMT-B' },
        { key: 'npi_rey_copia', label: 'Rey Copia' },
        { key: 'npi_rey_diferido', label: 'Rey Diferido' },
        { key: 'npi_fluidez_fonologica_p', label: 'Fluidez Fon.' },
        { key: 'npi_cdr_sb', label: 'CDR-SOB' }
      ]
    },
    'updrs_npi': {
      title: 'MDS-UPDRS y NPI',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'updrs_fecha', label: 'F. UPDRS' },
        { key: 'updrs_estado_examen', label: 'Estado' },
        { key: 'updrs_levodopa', label: 'Levodopa' },
        { key: 'updrs_marcha', label: 'Marcha' },
        { key: 'npi_puntuacion_total', label: 'NPI Total' },
        { key: 'npi_estres_total', label: 'NPI Estrés' }
      ]
    },
    'escalas': {
      title: 'Escalas Funcionales',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'faq_fecha', label: 'F. FAQ' },
        { key: 'faq_puntuacion_total', label: 'FAQ Total' },
        { key: 'test_informador_iqcode', label: 'IQCODE' },
        { key: 'cdr_fecha', label: 'F. CDR' },
        { key: 'cdr_global', label: 'CDR Global' },
        { key: 'np_jlo_total', label: 'JLO Benton' }
      ]
    },
    'lcr': {
      title: 'Punción Lumbar (LCR)',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'pl_fecha', label: 'F. Punción' },
        { key: 'pl_codigo', label: 'Muestra' },
        { key: 'pl_ab42_valor', label: 'Aβ42' },
        { key: 'pl_ptau_valor', label: 'p-Tau' },
        { key: 'pl_ttau_valor', label: 't-Tau' },
        { key: 'pl_coc_ptau_ab42_estado', label: 'Ratio p-tau/Aβ42' },
        { key: 'pl_nfl', label: 'NfL' },
        { key: 'pl_gfap', label: 'GFAP' },
        { key: 'pl_ykl40', label: 'YKL-40' }
      ]
    },
    'neuroimagen': {
      title: 'Neuroimagen y SPECT',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'rm_fecha', label: 'F. RM' },
        { key: 'schel_mta', label: 'MTA Scheltens' },
        { key: 'koed_parietal', label: 'Koedam' },
        { key: 'fazek_sust_blanca', label: 'Fazekas' },
        { key: 'datscan_fecha', label: 'F. DaTSCAN' },
        { key: 'datscan_resultado', label: 'DaTSCAN' },
        { key: 'petami_fecha', label: 'F. PET Amiloide' },
        { key: 'petami_resultado', label: 'PET Amiloide' },
        { key: 'petfdg_patron_visual', label: 'PET-FDG' }
      ]
    },
    'eeg': {
      title: 'Electroencefalograma',
      columns: [
        { key: 'lewy_id', label: 'ID Lewy' },
        { key: 'eeg_clinico_fecha', label: 'F. EEG' },
        { key: 'eeg_ritmo_fondo', label: 'Ritmo Fondo' },
        { key: 'eeg_anomalias_epilept', label: 'Anomalías' },
        { key: 'eeg_ondas_lentas_front', label: 'Lentas Frontales' },
        { key: 'eeg_global_slowing_ratio', label: 'Slowing Ratio' },
        { key: 'eeg_global_alpha_rel', label: 'Alpha Rel.' }
      ]
    }
  },

  render() {
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    if (!tableHeader || !tableBody) return;

    const preset = this.presets[this.currentPreset] || this.presets['general'];
    const columns = preset.columns;

    let headerHTML = '<tr>';
    columns.forEach(col => {
      const isSorted = this.sortColumn === col.key;
      const arrow = isSorted ? (this.sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
      headerHTML += `<th onclick="TableView.handleSort('${col.key}')">${col.label} <span class="sort-indicator">${arrow}</span></th>`;
    });
    headerHTML += '<th style="text-align:right;">Acciones</th></tr>';
    tableHeader.innerHTML = headerHTML;

    let filteredIds = AppState.patientIds.filter(id => {
      if (!this.searchTerm) return true;
      const term = this.searchTerm.toLowerCase();
      if (id.toLowerCase().includes(term)) return true;
      
      const dx = AppState.getPatientDiagnosis(id);
      if (dx && dx.toLowerCase().includes(term)) return true;
      const note = AppState.getPatientValue(id, 'primer_sintoma') || AppState.getPatientValue(id, 'tx_detalles');
      if (note && note.toLowerCase().includes(term)) return true;
      return false;
    });

    filteredIds.sort((a, b) => {
      let valA = (this.sortColumn === 'dx_clinico') ? AppState.getPatientDiagnosis(a) : AppState.getPatientValue(a, this.sortColumn);
      let valB = (this.sortColumn === 'dx_clinico') ? AppState.getPatientDiagnosis(b) : AppState.getPatientValue(b, this.sortColumn);
      const numA = parseFloat(valA), numB = parseFloat(valB);
      let cmp = 0;
      if (!isNaN(numA) && !isNaN(numB)) {
        cmp = numA - numB;
      } else {
        cmp = String(valA || '').localeCompare(String(valB || ''));
      }
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });

    const totalItems = filteredIds.length;
    const totalPages = Math.ceil(totalItems / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const pageIds = filteredIds.slice(startIdx, startIdx + this.pageSize);

    if (pageIds.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="${columns.length + 1}" style="text-align:center; padding: 30px; color: var(--text-muted);">No se encontraron pacientes que coincidan con la búsqueda.</td></tr>`;
    } else {
      let bodyHTML = '';
      pageIds.forEach(id => {
        bodyHTML += `<tr>`;
        columns.forEach(col => {
          let val = (col.key === 'dx_clinico') ? AppState.getPatientDiagnosis(id) : AppState.getPatientValue(id, col.key);
          val = DictionaryManager.getChoiceText(col.key, val);

          if (col.key === 'lewy_id') {
            bodyHTML += `<td>
              <a href="javascript:void(0)" onclick="PatientViewer.open('${id}')" style="text-decoration:none;" title="Abrir Ficha Clínica del paciente ${id}">
                <span class="badge badge-primary badge-clickable">ID: ${val}</span>
              </a>
            </td>`;
          } else if (col.key === 'dx_clinico' || col.key.includes('sintoma') || col.key.includes('detalles')) {
            const safeVal = String(val || '').replace(/"/g, '&quot;');
            bodyHTML += `<td>
              <div class="table-truncate-cell" title="${safeVal}">${val || '-'}</div>
            </td>`;
          } else {
            bodyHTML += `<td>${val || '-'}</td>`;
          }
        });

        bodyHTML += `<td style="text-align:right;">
          <button class="btn btn-sm btn-outline-primary" onclick="PatientViewer.open('${id}')" title="Ver Ficha">Ficha</button>
          <button class="btn btn-sm btn-secondary" onclick="ReportPrinter.open('${id}')" title="Informe PDF">Informe</button>
        </td>`;
        bodyHTML += `</tr>`;
      });
      tableBody.innerHTML = bodyHTML;
    }

    const pageInfo = document.getElementById('pagination-info');
    if (pageInfo) {
      const from = totalItems > 0 ? startIdx + 1 : 0;
      const to = Math.min(startIdx + this.pageSize, totalItems);
      pageInfo.textContent = `Mostrando ${from} - ${to} de ${totalItems} pacientes`;
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
