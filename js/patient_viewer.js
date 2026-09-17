/**
 * Lewy Data Suite - Visor Clínico Estructurado (15 Instrumentos REDCap)
 */
const PatientViewer = {
  currentPatientId: null,
  activeFormId: 'demograficos',
  currentInstanceIdx: 0,

  open(patientId) {
    this.currentPatientId = String(patientId).trim();
    this.activeFormId = 'demograficos';
    this.currentInstanceIdx = 0;

    const patient = AppState.getPatient(this.currentPatientId);
    if (!patient) {
      App.showToast('Paciente no encontrado', 'danger');
      return;
    }

    App.switchTab('tab-viewer');

    const titleEl = document.getElementById('viewer-patient-title');
    if (titleEl) {
      titleEl.innerHTML = `Ficha Clínica del Paciente: <span class="badge badge-primary" style="font-size:16px;">${this.currentPatientId}</span>`;
    }

    this.renderSidebar();
    this.renderFormView();
  },

  renderSidebar() {
    const listEl = document.getElementById('viewer-form-list');
    if (!listEl) return;

    const patient = AppState.getPatient(this.currentPatientId);
    let html = '';

    DictionaryManager.formsList.forEach(form => {
      const isActive = form.id === this.activeFormId;
      const isRepeating = TimeMatcher.instrumentConfig[form.id] ? TimeMatcher.instrumentConfig[form.id].isRepeating : false;
      const repCount = (patient && patient.repeating && patient.repeating[form.id]) ? patient.repeating[form.id].length : 0;
      
      let badgeHTML = '';
      if (isRepeating && repCount > 0) {
        badgeHTML = `<span class="badge badge-teal">${repCount} eval.</span>`;
      }

      html += `<li class="viewer-form-item ${isActive ? 'active' : ''}" onclick="PatientViewer.switchForm('${form.id}')">
        <span>${form.title}</span>
        ${badgeHTML}
      </li>`;
    });

    listEl.innerHTML = html;
  },

  switchForm(formId) {
    this.activeFormId = formId;
    this.currentInstanceIdx = 0;
    this.renderSidebar();
    this.renderFormView();
  },

  renderFormView() {
    const container = document.getElementById('viewer-fields-container');
    if (!container) return;

    const patient = AppState.getPatient(this.currentPatientId);
    const formMeta = DictionaryManager.formsList.find(f => f.id === this.activeFormId);
    const variables = DictionaryManager.getFormVariables(this.activeFormId);
    const isRepeating = TimeMatcher.instrumentConfig[this.activeFormId] ? TimeMatcher.instrumentConfig[this.activeFormId].isRepeating : false;

    let activeRow = patient.baseRow || {};
    let totalInstances = 1;
    if (isRepeating) {
      const instances = (patient.repeating && patient.repeating[this.activeFormId]) ? patient.repeating[this.activeFormId] : [];
      totalInstances = Math.max(1, instances.length);
      activeRow = instances[this.currentInstanceIdx] || {};
    }

    let html = '';

    // Header del Formulario y Selector de Evaluación
    html += `<div class="card-header">
      <div>
        <h2 class="card-title">${formMeta ? formMeta.title : this.activeFormId}</h2>
        <p class="card-subtitle">Variables registradas (${variables.length} campos)</p>
      </div>`;

    if (isRepeating) {
      html += `<div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:12px; font-weight:600;">Evaluación:</span>
        <select class="select-control" onchange="PatientViewer.changeInstance(this.value)">`;
      for (let i = 0; i < totalInstances; i++) {
        html += `<option value="${i}" ${i === this.currentInstanceIdx ? 'selected' : ''}>Visita / Registro #${i + 1}</option>`;
      }
      html += `</select></div>`;
    }

    html += `</div>`;

    // Barra de Autocálculos Clínicos
    const calcBar = this.getCalculationsBanner(this.activeFormId, activeRow);
    if (calcBar) {
      html += calcBar;
    }

    // Secciones y Tarjetas de Variables
    let currentSection = '';
    let inSectionCard = false;

    variables.forEach(v => {
      if (v.header && v.header !== currentSection) {
        if (inSectionCard) {
          html += `</div></div>`;
        }
        currentSection = v.header;
        html += `<div class="form-section-card">
          <div class="form-section-header">${currentSection}</div>
          <div class="form-grid">`;
        inSectionCard = true;
      } else if (!inSectionCard) {
        html += `<div class="form-section-card"><div class="form-grid">`;
        inSectionCard = true;
      }

      const rawVal = activeRow[v.var] !== undefined ? activeRow[v.var] : '';
      const displayVal = DictionaryManager.getChoiceText(v.var, rawVal);
      html += this.renderFieldCard(v, rawVal, displayVal);
    });

    if (inSectionCard) {
      html += `</div></div>`;
    }

    container.innerHTML = html;
  },

  renderFieldCard(v, rawVal, displayVal) {
    const isFull = v.type === 'notes' || (v.label && v.label.length > 50) || (displayVal && displayVal.length > 60);
    const hasValue = rawVal !== '' && rawVal !== null && rawVal !== undefined;
    
    let badgeVal = '';
    if (!hasValue) {
      badgeVal = '<span style="color:#94a3b8; font-style:italic;">Sin registrar</span>';
    } else if (v.type === 'radio' || v.type === 'dropdown' || v.type === 'yesno') {
      badgeVal = `<span class="badge badge-primary" style="font-size:13px; font-weight:600;">${displayVal}</span>`;
    } else if (v.vtype === 'integer' || v.vtype === 'number') {
      badgeVal = `<strong style="font-size:14px; color:#0369a1;">${displayVal}</strong>`;
    } else {
      badgeVal = `<span style="font-size:13px; color:#1e293b;">${displayVal}</span>`;
    }

    return `
      <div class="form-group ${isFull ? 'full-width' : ''}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span class="form-label" style="font-size:12px; color:#475569;">${v.label || v.var}</span>
          <span class="var-code" style="font-size:11px; color:#94a3b8;">[${v.var}]</span>
        </div>
        <div style="margin-top:2px;">
          ${badgeVal}
        </div>
        ${v.note ? `<div class="form-note" style="font-size:11px; color:#64748b; margin-top:4px;">ℹ️ ${v.note}</div>` : ''}
      </div>
    `;
  },

  getCalculationsBanner(formId, row) {
    if (formId === 'visita_estudio') {
      const bmi = ClinicalCalculations.calculateBMI(row.hx_peso, row.hx_altura);
      if (bmi) {
        return `<div class="card" style="background:#f0fdf4; border-color:#86efac; padding:12px 16px; margin-bottom:16px;">
          <strong>Autocálculo Clínico:</strong> IMC = <span class="calc-badge">${bmi.value} kg/m²</span> (${bmi.category})
        </div>`;
      }
    } else if (formId === 'puncion_lumbar') {
      const ratio = ClinicalCalculations.calculatePtauAb42Ratio(row.pl_ptau_valor, row.pl_ab42_valor);
      if (ratio) {
        return `<div class="card" style="background:#f0fdf4; border-color:#86efac; padding:12px 16px; margin-bottom:16px;">
          <strong>Autocálculo LCR:</strong> Cociente p-tau181/Aβ42 = <span class="calc-badge">${ratio.value}</span> (${ratio.status})
        </div>`;
      }
    } else if (formId === 'escalas_funcionales_y_globales') {
      const cdrSob = ClinicalCalculations.calculateCDRSOB(row);
      if (cdrSob) {
        return `<div class="card" style="background:#f0fdf4; border-color:#86efac; padding:12px 16px; margin-bottom:16px;">
          <strong>Autocálculo CDR:</strong> CDR Sum of Boxes (CDR-SOB) = <span class="calc-badge">${cdrSob.value}</span>
        </div>`;
      }
    }
    return '';
  },

  changeInstance(idx) {
    this.currentInstanceIdx = parseInt(idx, 10) || 0;
    this.renderFormView();
  }
};
