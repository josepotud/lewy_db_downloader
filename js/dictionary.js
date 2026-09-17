/**
 * Lewy Data Suite - Gestor Dinámico del Diccionario de Datos REDCap
 * Diccionario Maestro Unificado (15 Instrumentos Canónicos)
 * Resuelve automáticamente campos de checkbox (nombre___codigo) en sus formularios de origen.
 */
const DictionaryManager = {
  dictionary: typeof LEWY_DICTIONARY !== 'undefined' ? LEWY_DICTIONARY : [],
  varMap: new Map(),
  formGroups: new Map(),
  formsList: [],

  // Orden canónico estricto de los 15 instrumentos clínicos
  canonicalOrder: [
    { id: 'demograficos', title: '1. Demográficos', rawTitle: 'Demográficos' },
    { id: 'antecedentes', title: '2. Antecedentes', rawTitle: 'Antecedentes' },
    { id: 'visita_estudio', title: '3. Visita de Estudio', rawTitle: 'Visita de Estudio' },
    { id: 'evaluacion_neuropsicologica', title: '4. Neuropsicología', rawTitle: 'Neuropsicología' },
    { id: 'mds_updrs_examination', title: '5. MDS-UPDRS', rawTitle: 'MDS-UPDRS' },
    { id: 'inventario_neuropsiquiatrico_npi', title: '6. NPI Cummings', rawTitle: 'NPI Cummings' },
    { id: 'escalas_funcionales_y_globales', title: '7. Escalas Funcionales', rawTitle: 'Escalas Funcionales' },
    { id: 'diagnostico_y_gds', title: '8. Diagnóstico y GDS', rawTitle: 'Diagnóstico y GDS' },
    { id: 'puncion_lumbar', title: '9. Punción Lumbar', rawTitle: 'Punción Lumbar' },
    { id: 'genetica_molecular', title: '10. Genética Molecular', rawTitle: 'Genética Molecular' },
    { id: 'resonancia_magnetica', title: '11. Resonancia Magnética', rawTitle: 'Resonancia Magnética' },
    { id: 'datscan_spect', title: '12. DaTSCAN SPECT', rawTitle: 'DaTSCAN SPECT' },
    { id: 'pet_amiloide', title: '13. PET Amiloide', rawTitle: 'PET Amiloide' },
    { id: 'pet_fdg', title: '14. PET-FDG', rawTitle: 'PET-FDG' },
    { id: 'electroencefalograma', title: '15. Electroencefalograma', rawTitle: 'Electroencefalograma' }
  ],

  init() {
    this.varMap.clear();
    this.formGroups.clear();

    // 1. Inicializar grupos de los formularios canónicos
    this.canonicalOrder.forEach(f => {
      this.formGroups.set(f.id, []);
    });

    // 2. Distribuir variables en sus formularios
    this.dictionary.forEach(item => {
      this.varMap.set(item.var, item);
      if (!this.formGroups.has(item.form)) {
        this.formGroups.set(item.form, []);
      }
      this.formGroups.get(item.form).push(item);
    });

    // 3. Construir lista de formularios preservando el orden canónico estricto
    const newFormsList = [];
    let idx = 1;

    this.canonicalOrder.forEach(f => {
      const vars = this.formGroups.get(f.id) || [];
      newFormsList.push({
        id: f.id,
        title: `${idx}. ${f.rawTitle}`,
        rawTitle: f.rawTitle,
        count: vars.length
      });
      idx++;
    });

    // Añadir formularios extra solo si realmente existen en el diccionario de metadatos
    this.formGroups.forEach((vars, formId) => {
      if (!this.canonicalOrder.some(f => f.id === formId) && vars.length > 0) {
        const cleanTitle = this.formatFormTitle(formId);
        newFormsList.push({
          id: formId,
          title: `${idx}. ${cleanTitle}`,
          rawTitle: cleanTitle,
          count: vars.length
        });
        idx++;
      }
    });

    this.formsList = newFormsList;

    // Sincronizar Fusión Temporal
    this.syncTimeMatcherConfig();
  },

  /**
   * Carga y reconstruye dinámicamente el diccionario desde metadatos oficiales de REDCap API
   */
  loadFromREDCapMetadata(metaList) {
    if (!Array.isArray(metaList) || metaList.length === 0) return;

    this.dictionary = metaList.map(r => {
      const choicesDict = {};
      const rawChoices = r.select_choices_or_calculations || '';
      if (rawChoices && (rawChoices.includes('|') || rawChoices.includes(','))) {
        const parts = rawChoices.split('|').map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          if (p.includes(',')) {
            const [code, ...rest] = p.split(',');
            choicesDict[code.trim()] = rest.join(',').trim();
          }
        });
      }

      return {
        var: r.field_name,
        form: r.form_name || 'demograficos',
        header: r.section_header || '',
        type: r.field_type || 'text',
        label: r.field_label || r.field_name,
        choices: choicesDict,
        note: r.field_note || '',
        vtype: r.text_validation_type_or_show_slider_number || '',
        min: r.text_validation_min || '',
        max: r.text_validation_max || ''
      };
    });

    this.init();
    console.log(`[DictionaryManager] Diccionario sincronizado dinámicamente con ${this.dictionary.length} variables.`);
  },

  /**
   * Infiere y asigna inteligentemente columnas de checkboxes (xxx___code) y campos adicionales a sus formularios de origen
   */
  inferFromRawData(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return;

    const existingVars = new Set(this.dictionary.map(item => item.var));
    let newVarsCount = 0;

    rawRows.forEach(row => {
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim();
        if (!cleanKey || cleanKey === 'redcap_repeat_instrument' || cleanKey === 'redcap_repeat_instance') return;

        if (!existingVars.has(cleanKey)) {
          existingVars.add(cleanKey);
          newVarsCount++;

          let assignedForm = null;
          let assignedLabel = null;
          let assignedChoices = {};

          // Caso 1: Expansión de Checkbox de REDCap (ej. estadio_gds___5, tipo_mutacion___1, tx_categorias___3)
          const checkboxMatch = cleanKey.match(/^(.+)___([a-zA-Z0-9_\-]+)$/);
          if (checkboxMatch) {
            const baseVar = checkboxMatch[1];
            const choiceCode = checkboxMatch[2];
            const parentItem = this.varMap.get(baseVar);

            if (parentItem) {
              assignedForm = parentItem.form;
              const choiceLabel = (parentItem.choices && parentItem.choices[choiceCode]) ? parentItem.choices[choiceCode] : `Opción ${choiceCode}`;
              assignedLabel = `${parentItem.label} [${choiceLabel}]`;
              assignedChoices = { "0": "No", "1": "Sí" };
            }
          }

          // Caso 2: Variable de Estado de Formulario de REDCap (ej. puncion_lumbar_complete)
          if (!assignedForm && cleanKey.endsWith('_complete')) {
            const baseForm = cleanKey.slice(0, -9);
            if (this.canonicalOrder.some(f => f.id === baseForm)) {
              assignedForm = baseForm;
              assignedLabel = `Estado del Formulario (${this.formatFormTitle(baseForm)})`;
              assignedChoices = { "0": "Incompleto", "1": "No verificado", "2": "Completo" };
            }
          }

          // Caso 3: Inferencia por Prefijo Clínico si no se detectó formulario
          if (!assignedForm) {
            if (cleanKey.startsWith('pl_')) assignedForm = 'puncion_lumbar';
            else if (cleanKey.startsWith('rm_') || cleanKey.startsWith('schel_') || cleanKey.startsWith('koed_') || cleanKey.startsWith('fazek_') || cleanKey.includes('hippocampus_') || cleanKey.includes('_thick') || cleanKey.includes('_vol_mm3')) assignedForm = 'resonancia_magnetica';
            else if (cleanKey.startsWith('petfdg_') || cleanKey.includes('_cbl') || cleanKey.includes('_pons_tc') || cleanKey.includes('_sn_pons')) assignedForm = 'pet_fdg';
            else if (cleanKey.startsWith('petami_')) assignedForm = 'pet_amiloide';
            else if (cleanKey.startsWith('datscan_')) assignedForm = 'datscan_spect';
            else if (cleanKey.startsWith('eeg_')) assignedForm = 'electroencefalograma';
            else if (cleanKey.startsWith('npi_')) assignedForm = 'evaluacion_neuropsicologica';
            else if (cleanKey.startsWith('updrs_')) assignedForm = 'mds_updrs_examination';
            else if (cleanKey.startsWith('hx_') || cleanKey.startsWith('tx_') || cleanKey.startsWith('primer_sintoma') || cleanKey.startsWith('dt_primer_sintoma')) assignedForm = 'visita_estudio';
            else if (cleanKey.startsWith('diag_') || cleanKey.startsWith('fecha_dx_gds') || cleanKey.startsWith('dx_') || cleanKey.startsWith('estadio_gds')) assignedForm = 'diagnostico_y_gds';
            else if (cleanKey.startsWith('faq_') || cleanKey.startsWith('cdr_') || cleanKey.startsWith('test_informador_')) assignedForm = 'escalas_funcionales_y_globales';
            else if (cleanKey.startsWith('ant_')) assignedForm = 'antecedentes';
            else if (cleanKey.startsWith('mutacion_') || cleanKey.startsWith('estudio_genetico') || cleanKey.startsWith('tipo_mutacion')) assignedForm = 'genetica_molecular';
            else assignedForm = 'visita_estudio'; // Por defecto asignar a visita clínica antes de crear categoría huérfana
          }

          if (!assignedLabel) {
            assignedLabel = this.formatLabel(cleanKey);
          }

          this.dictionary.push({
            var: cleanKey,
            form: assignedForm,
            header: '',
            type: 'text',
            label: assignedLabel,
            choices: assignedChoices,
            note: '',
            vtype: '',
            min: '',
            max: ''
          });
        }
      });
    });

    if (newVarsCount > 0) {
      this.init();
      console.log(`[DictionaryManager] Se integraron ${newVarsCount} variables en sus formularios de origen.`);
    }
  },

  syncTimeMatcherConfig() {
    if (typeof TimeMatcher === 'undefined' || !TimeMatcher.instrumentConfig) return;

    this.formGroups.forEach((vars, formId) => {
      if (!TimeMatcher.instrumentConfig[formId]) {
        const dateVars = vars
          .filter(v => v.var.includes('fecha') || (v.vtype && v.vtype.startsWith('date_')))
          .map(v => v.var);

        const isIndependent = dateVars.length === 0;

        TimeMatcher.instrumentConfig[formId] = {
          title: this.formatFormTitle(formId),
          dateVars: dateVars,
          isIndependent: isIndependent,
          isRepeating: formId === 'puncion_lumbar' || formId === 'resonancia_magnetica' || formId === 'pet_fdg' || formId === 'diagnostico_y_gds',
          color: '#0284c7'
        };
      }
    });
  },

  formatFormTitle(formId) {
    const known = {
      'demograficos': 'Demográficos',
      'antecedentes': 'Antecedentes',
      'visita_estudio': 'Visita de Estudio',
      'evaluacion_neuropsicologica': 'Neuropsicología',
      'mds_updrs_examination': 'MDS-UPDRS',
      'inventario_neuropsiquiatrico_npi': 'NPI Cummings',
      'escalas_funcionales_y_globales': 'Escalas Funcionales',
      'diagnostico_y_gds': 'Diagnóstico y GDS',
      'puncion_lumbar': 'Punción Lumbar',
      'genetica_molecular': 'Genética Molecular',
      'resonancia_magnetica': 'Resonancia Magnética',
      'datscan_spect': 'DaTSCAN SPECT',
      'pet_amiloide': 'PET Amiloide',
      'pet_fdg': 'PET-FDG',
      'electroencefalograma': 'Electroencefalograma'
    };
    if (known[formId]) return known[formId];

    return formId
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  },

  formatLabel(varName) {
    return varName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  },

  getVariable(varName) {
    return this.varMap.get(varName) || null;
  },

  getLabel(varName) {
    const v = this.varMap.get(varName);
    return v ? v.label : varName;
  },

  getFormVariables(formName) {
    return this.formGroups.get(formName) || [];
  },

  getChoiceText(varName, code) {
    if (code === undefined || code === null || code === '') return '';
    const v = this.varMap.get(varName);
    if (!v || !v.choices) return String(code);
    return v.choices[String(code)] || String(code);
  }
};

// Auto-inicialización
if (typeof LEWY_DICTIONARY !== 'undefined') {
  DictionaryManager.init();
}
