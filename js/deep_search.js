/**
 * Lewy Data Suite - Motor de Búsqueda Libre de Alto Rendimiento (Ultra-Fast Search)
 * Utiliza un índice plano en memoria (Search Corpus) precalculado al inicio,
 * con debouncing de 250ms y renderizado paginado para no congelar el navegador.
 */
const DeepSearch = {
  searchIndex: [],     // Índice plano: [{ pid, form, formTitle, var, label, valLower, valDisplay, instance }]
  isIndexed: false,
  debounceTimer: null,
  lastQuery: '',
  lastResults: [],
  displayLimit: 25,

  // 1. Construir el índice en memoria una sola vez al cargar o cambiar datos (toma <100ms)
  buildIndex() {
    console.log('Construyendo índice de búsqueda rápida...');
    this.searchIndex = [];

    AppState.patientIds.forEach(id => {
      const pRecord = AppState.getPatient(id);
      if (!pRecord) return;

      const indexRow = (row, defaultForm, instanceNum) => {
        if (!row) return;
        for (const varName in row) {
          if (varName === 'lewy_id' || varName.includes('complete') || varName.startsWith('redcap_')) continue;
          const rawVal = row[varName];
          if (rawVal === undefined || rawVal === null) continue;
          const strVal = String(rawVal).trim();
          if (!strVal) continue;

          const varMeta = DictionaryManager.get(varName);
          const formName = (varMeta && varMeta.form) ? varMeta.form : defaultForm;
          const formMeta = DictionaryManager.formsList.find(f => f.id === formName);
          const formTitle = formMeta ? formMeta.title : formName;
          const label = varMeta && varMeta.label ? varMeta.label : varName;
          const choiceText = DictionaryManager.getChoiceText(varName, strVal);

          // Texto completo combinando valor, opción y etiqueta para búsqueda rápida
          const fullTextLower = `${strVal} ${choiceText} ${label}`.toLowerCase();

          this.searchIndex.push({
            pid: id,
            formName: formName,
            formTitle: formTitle,
            instance: instanceNum,
            variable: varName,
            label: label,
            displayValue: choiceText,
            fullTextLower: fullTextLower
          });
        }
      };

      // Fila base
      if (pRecord.baseRow) {
        indexRow(pRecord.baseRow, 'demograficos', 0);
      }

      // Instancias repetidas
      if (pRecord.repeating) {
        for (const formName in pRecord.repeating) {
          pRecord.repeating[formName].forEach((instRow, idx) => {
            indexRow(instRow, formName, instRow.redcap_repeat_instance || (idx + 1));
          });
        }
      }
    });

    this.isIndexed = true;
    console.log(`Índice de búsqueda listo: ${this.searchIndex.length} elementos indexados.`);
  },

  // 2. Manejador de input con debounce para que no se congele al teclear
  onInput(query) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    const indicator = document.getElementById('search-loading-indicator');
    if (indicator && query.trim().length >= 2) indicator.style.display = 'inline-flex';

    this.debounceTimer = setTimeout(() => {
      this.search(query);
      if (indicator) indicator.style.display = 'none';
    }, 250);
  },

  // 3. Ejecución ultra-rápida de la búsqueda (<15ms)
  search(query) {
    if (!this.isIndexed || this.searchIndex.length === 0) {
      this.buildIndex();
    }

    const term = (query || '').trim().toLowerCase();
    this.lastQuery = (query || '').trim();
    this.displayLimit = 25;

    if (!term || term.length < 2) {
      this.lastResults = [];
      this.render();
      return;
    }

    // Búsqueda en el índice plano
    const patientHits = new Map(); // pid -> [items]

    for (let i = 0; i < this.searchIndex.length; i++) {
      const item = this.searchIndex[i];
      if (item.fullTextLower.includes(term)) {
        if (!patientHits.has(item.pid)) {
          patientHits.set(item.pid, []);
        }
        patientHits.get(item.pid).push(item);
      }
    }

    // Agrupar resultados por paciente
    const results = [];
    patientHits.forEach((matches, pid) => {
      results.push({
        patientId: pid,
        genero: AppState.getPatientValue(pid, 'genero'),
        dob: AppState.getPatientValue(pid, 'dob'),
        dx: AppState.getPatientValue(pid, 'dx_clinico') || AppState.getPatientValue(pid, 'diag_sindrome_clinico'),
        matchesCount: matches.length,
        matches: matches
      });
    });

    this.lastResults = results;
    this.render();
  },

  // 4. Renderizado eficiente del DOM
  render() {
    const container = document.getElementById('search-results-container');
    const countEl = document.getElementById('search-results-count');
    const actionsEl = document.getElementById('search-export-actions');
    if (!container) return;

    if (!this.lastQuery || this.lastQuery.length < 2) {
      if (countEl) countEl.textContent = 'Escribe al menos 2 caracteres para buscar en toda la base';
      if (actionsEl) actionsEl.style.display = 'none';
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <div style="font-size:36px; margin-bottom:10px;">🔍</div>
          <h3 style="font-size:15px; color:var(--text-main); margin-bottom:4px;">Buscador Rápido de Texto y Hallazgos</h3>
          <p style="font-size:13px; max-width:600px; margin:0 auto;">
            Escribe cualquier término (ej. <em>"temblor"</em>, <em>"donepezilo"</em>, <em>"alucinaciones"</em>, <em>"GBA"</em>, <em>"302.1"</em>). El sistema rastrea instantáneamente todas las variables y te muestra su ubicación exacta.
          </p>
        </div>
      `;
      return;
    }

    const totalPatients = this.lastResults.length;
    let totalHits = 0;
    this.lastResults.forEach(p => { totalHits += p.matchesCount; });

    if (countEl) {
      countEl.innerHTML = `Resultados para <strong>"${this.lastQuery}"</strong>: <span class="badge badge-success" style="font-size:12px;">${totalPatients} pacientes</span> (<span class="badge badge-teal" style="font-size:12px;">${totalHits} hallazgos</span>)`;
    }
    if (actionsEl) {
      actionsEl.style.display = totalPatients > 0 ? 'flex' : 'none';
    }

    if (totalPatients === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:35px; color:var(--text-muted);">
          <div style="font-size:28px; margin-bottom:6px;">😕</div>
          <h3 style="font-size:15px; color:var(--text-main);">No se encontraron coincidencias para "${this.lastQuery}"</h3>
          <p style="font-size:12px; margin-top:2px;">Prueba con otra palabra clave o término más general.</p>
        </div>
      `;
      return;
    }

    // Renderizar solo hasta displayLimit pacientes para mantener el DOM ultra-rápido
    const visibleResults = this.lastResults.slice(0, this.displayLimit);
    let html = '';

    visibleResults.forEach(p => {
      const genText = DictionaryManager.getChoiceText('genero', p.genero) || '-';
      html += `
        <div class="card" style="margin-bottom:12px; border-left:4px solid var(--primary); padding:14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-primary" style="font-size:13px;">ID: ${p.patientId}</span>
              <span style="font-size:12px; font-weight:600; color:#1e293b;">${genText} (${p.dob || '-'})</span>
              <span style="font-size:12px; color:#0369a1; font-weight:600;">${p.dx || 'Sin diagnóstico especificado'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge badge-teal">${p.matchesCount} coincidencia${p.matchesCount > 1 ? 's' : ''}</span>
              <button class="btn btn-sm btn-outline-primary" onclick="PatientViewer.open('${p.patientId}')">👁️ Ficha</button>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
      `;

      p.matches.forEach(m => {
        const highlightedVal = this.highlightText(m.displayValue, this.lastQuery);
        const highlightedLabel = this.highlightText(m.label, this.lastQuery);
        const instBadge = m.instance > 0 ? `<span class="badge badge-purple" style="font-size:10px;">Inst #${m.instance}</span>` : '';

        html += `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:8px 10px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:2px; font-size:11px; color:#64748b;">
              <span><strong>📍 ${m.formTitle}</strong> ${instBadge} &gt; <code>${m.variable}</code></span>
            </div>
            <div style="color:#334155; margin-bottom:2px;">
              ${highlightedLabel}
            </div>
            <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:4px; padding:4px 8px; margin-top:3px; color:#0f172a;">
              <strong>Valor:</strong> ${highlightedVal}
            </div>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    if (totalPatients > this.displayLimit) {
      html += `
        <div style="text-align:center; padding:12px; margin-top:8px;">
          <button class="btn btn-secondary" onclick="DeepSearch.loadMore()">
            🔽 Mostrar más pacientes (${totalPatients - this.displayLimit} restantes)
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  loadMore() {
    this.displayLimit += 25;
    this.render();
  },

  highlightText(text, query) {
    if (!text || !query) return text || '';
    const str = String(text);
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(regex, '<mark style="background:#fef08a; padding:0 2px; border-radius:2px; font-weight:700;">$1</mark>');
  },

  filterTableWithResults() {
    if (this.lastResults.length === 0) return;
    const patientIds = this.lastResults.map(p => p.patientId);
    TableView.searchTerm = this.lastQuery;
    App.switchTab('tab-table');
    App.showToast(`Filtrados ${patientIds.length} pacientes en la tabla`, 'info');
  },

  exportSearchResults(format = 'xlsx') {
    if (this.lastResults.length === 0) {
      App.showToast('No hay resultados de búsqueda para exportar', 'warning');
      return;
    }

    const flatRows = [];
    this.lastResults.forEach(p => {
      p.matches.forEach(m => {
        flatRows.push({
          lewy_id: p.patientId,
          genero: DictionaryManager.getChoiceText('genero', p.genero),
          dob: p.dob,
          dx_clinico: p.dx,
          instrumento: m.formTitle,
          variable: m.variable,
          etiqueta_campo: m.label,
          instancia: m.instance || 1,
          valor_encontrado: m.displayValue,
          termino_buscado: this.lastQuery
        });
      });
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const safeTerm = this.lastQuery.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
    const fileName = `Busqueda_Lewy_${safeTerm}_${dateStr}`;

    if (format === 'xlsx' && typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(flatRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Resultados_Busqueda');
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      App.showToast('✅ Resultados de búsqueda exportados a Excel', 'success');
    } else if (typeof Papa !== 'undefined') {
      const csv = Papa.unparse(flatRows, { quotes: true, header: true });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
      App.showToast('✅ Resultados de búsqueda exportados a CSV', 'success');
    }
  }
};
