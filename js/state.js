/**
 * Lewy Data Suite - Almacén Central de Datos en Memoria (Visor y Exportación)
 */
const AppState = {
  rawRows: [],           // Filas brutas de la cohorte en memoria
  patientsMap: new Map(),// Índice organizado: lewy_id -> { baseRow, repeating: { formName: [instances] } }
  patientIds: [],        // Lista ordenada de lewy_id únicos
  source: 'none',        // 'none', 'api', 'file'
  
  init() {
    if (window.LEWY_DEFAULT_DATA && Array.isArray(window.LEWY_DEFAULT_DATA) && window.LEWY_DEFAULT_DATA.length > 0) {
      this.loadData(window.LEWY_DEFAULT_DATA, 'file');
    } else {
      this.rebuildIndex();
    }
  },

  hasData() {
    return this.patientIds.length > 0;
  },

  loadData(rows, source = 'file') {
    this.rawRows = rows || [];
    this.source = source;
    this.rebuildIndex();
  },

  rebuildIndex() {
    this.patientsMap.clear();
    const idsSet = new Set();

    this.rawRows.forEach(row => {
      // Manejar nombres de campo con posibles espacios o variaciones
      const idKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'lewy_id') || 'lewy_id';
      const id = row[idKey] ? String(row[idKey]).trim() : '';
      if (!id) return;

      idsSet.add(id);
      if (!this.patientsMap.has(id)) {
        this.patientsMap.set(id, {
          lewy_id: id,
          baseRow: null,
          repeating: {}
        });
      }

      const pRecord = this.patientsMap.get(id);
      const repKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'redcap_repeat_instrument') || 'redcap_repeat_instrument';
      const repInstrument = (row[repKey] || '').trim();

      if (!repInstrument) {
        pRecord.baseRow = Object.assign({}, row);
      } else {
        if (!pRecord.repeating[repInstrument]) {
          pRecord.repeating[repInstrument] = [];
        }
        pRecord.repeating[repInstrument].push(Object.assign({}, row));
      }
    });

    this.patientsMap.forEach((pRecord, id) => {
      if (!pRecord.baseRow) {
        pRecord.baseRow = { lewy_id: id };
      }
    });

    this.patientIds = Array.from(idsSet).sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b);
    });

    console.log(`Estado: ${this.patientIds.length} pacientes únicos (${this.rawRows.length} filas totales).`);
  },

  getPatient(id) {
    return this.patientsMap.get(String(id).trim());
  },

  // Extracción robusta de diagnóstico buscando en formulario de diagnóstico y campos de texto libre
  getPatientDiagnosis(id) {
    const p = this.getPatient(id);
    if (!p) return '';

    // 1. Revisar instancias repetidas de diagnostico_y_gds
    const repDx = p.repeating['diagnostico_y_gds'] || [];
    for (const r of repDx) {
      if (r.dx_clinico_libre && String(r.dx_clinico_libre).trim()) return String(r.dx_clinico_libre).trim();
      if (r.dx_clinico && String(r.dx_clinico).trim()) {
        const txt = DictionaryManager.getChoiceText('dx_clinico', r.dx_clinico);
        if (txt) return txt;
      }
      if (r.dx_etiologico_libre && String(r.dx_etiologico_libre).trim()) return String(r.dx_etiologico_libre).trim();
      if (r.dx_etiologico && String(r.dx_etiologico).trim()) {
        const txt = DictionaryManager.getChoiceText('dx_etiologico', r.dx_etiologico);
        if (txt) return txt;
      }
      if (r.diag_sindrome_clinico && String(r.diag_sindrome_clinico).trim()) return String(r.diag_sindrome_clinico).trim();
    }

    // 2. Revisar fila base
    if (p.baseRow) {
      if (p.baseRow.dx_clinico_libre && String(p.baseRow.dx_clinico_libre).trim()) return String(p.baseRow.dx_clinico_libre).trim();
      if (p.baseRow.dx_clinico && String(p.baseRow.dx_clinico).trim()) {
        const txt = DictionaryManager.getChoiceText('dx_clinico', p.baseRow.dx_clinico);
        if (txt) return txt;
      }
      if (p.baseRow.dx_etiologico_libre && String(p.baseRow.dx_etiologico_libre).trim()) return String(p.baseRow.dx_etiologico_libre).trim();
      if (p.baseRow.dx_etiologico && String(p.baseRow.dx_etiologico).trim()) {
        const txt = DictionaryManager.getChoiceText('dx_etiologico', p.baseRow.dx_etiologico);
        if (txt) return txt;
      }
      if (p.baseRow.diag_sindrome_clinico && String(p.baseRow.diag_sindrome_clinico).trim()) return String(p.baseRow.diag_sindrome_clinico).trim();
    }

    // 3. Revisar cualquier otra instancia repetida
    for (const formName in p.repeating) {
      const rows = p.repeating[formName];
      for (const r of rows) {
        if (r.dx_clinico_libre && String(r.dx_clinico_libre).trim()) return String(r.dx_clinico_libre).trim();
        if (r.dx_clinico && String(r.dx_clinico).trim()) {
          const txt = DictionaryManager.getChoiceText('dx_clinico', r.dx_clinico);
          if (txt) return txt;
        }
        if (r.dx_etiologico_libre && String(r.dx_etiologico_libre).trim()) return String(r.dx_etiologico_libre).trim();
      }
    }

    return '';
  },

  getPatientValue(id, varName) {
    if (varName === 'dx_clinico' || varName === 'diagnostico' || varName === 'diag_sindrome_clinico') {
      return this.getPatientDiagnosis(id);
    }

    const p = this.getPatient(id);
    if (!p) return '';
    if (p.baseRow && p.baseRow[varName] !== undefined && p.baseRow[varName] !== '') {
      return p.baseRow[varName];
    }
    for (const formName in p.repeating) {
      const instances = p.repeating[formName];
      for (const inst of instances) {
        if (inst[varName] !== undefined && inst[varName] !== '') {
          return inst[varName];
        }
      }
    }
    return '';
  },

  clearData() {
    this.rawRows = [];
    this.source = 'none';
    this.rebuildIndex();
  }
};
