/**
 * Lewy Data Suite - Gestor Dinámico y Autoconstruible del Diccionario de Datos REDCap
 * Se autoconstruye dinámicamente en tiempo real desde la API de REDCap (content=metadata)
 * o infiere variables nuevas desde archivos CSV/Excel locales.
 */
const DictionaryManager = {
  dictionary: typeof LEWY_DICTIONARY !== 'undefined' ? LEWY_DICTIONARY : [],
  varMap: new Map(),
  formGroups: new Map(),
  formsList: [],

  init() {
    this.varMap.clear();
    this.formGroups.clear();

    const formCounts = new Map();

    this.dictionary.forEach(item => {
      this.varMap.set(item.var, item);
      if (!this.formGroups.has(item.form)) {
        this.formGroups.set(item.form, []);
      }
      this.formGroups.get(item.form).push(item);
      formCounts.set(item.form, (formCounts.get(item.form) || 0) + 1);
    });

    // Reconstruir lista de formularios dinámicamente preservando el orden
    const knownFormTitles = {
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

    const newFormsList = [];
    let idx = 1;
    this.formGroups.forEach((vars, formId) => {
      const cleanTitle = knownFormTitles[formId] || this.formatFormTitle(formId);
      newFormsList.push({
        id: formId,
        title: `${idx}. ${cleanTitle}`,
        rawTitle: cleanTitle,
        count: vars.length
      });
      idx++;
    });

    this.formsList = newFormsList;

    // Actualizar dinámicamente la configuración de Fusión Temporal
    this.syncTimeMatcherConfig();
  },

  /**
   * Carga y reconstruye dinámicamente el diccionario desde los metadatos oficiales de la API REDCap
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
        form: r.form_name || 'general',
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
    console.log(`[DictionaryManager] Diccionario autoconstruido dinámicamente con ${this.dictionary.length} variables.`);
  },

  /**
   * Infiere y registra dinámicamente columnas desconocidas de un archivo CSV o Excel importado
   */
  inferFromRawData(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return;

    const existingVars = new Set(this.dictionary.map(item => item.var));
    let newVarsCount = 0;

    // Recolectar todas las columnas presentes en los datos
    rawRows.forEach(row => {
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim();
        if (!cleanKey || cleanKey === 'redcap_repeat_instrument' || cleanKey === 'redcap_repeat_instance') return;

        if (!existingVars.has(cleanKey)) {
          existingVars.add(cleanKey);
          newVarsCount++;

          // Inferir nombre de formulario por prefijo habitual o asignarlo a 'datos_adicionales'
          let inferredForm = 'datos_adicionales';
          if (cleanKey.startsWith('pl_')) inferredForm = 'puncion_lumbar';
          else if (cleanKey.startsWith('rm_') || cleanKey.startsWith('schel_') || cleanKey.startsWith('koed_') || cleanKey.startsWith('fazek_') || cleanKey.includes('hippocampus_')) inferredForm = 'resonancia_magnetica';
          else if (cleanKey.startsWith('petfdg_') || cleanKey.includes('_cbl') || cleanKey.includes('_pons_tc') || cleanKey.includes('_sn_pons')) inferredForm = 'pet_fdg';
          else if (cleanKey.startsWith('petami_')) inferredForm = 'pet_amiloide';
          else if (cleanKey.startsWith('datscan_')) inferredForm = 'datscan_spect';
          else if (cleanKey.startsWith('eeg_')) inferredForm = 'electroencefalograma';
          else if (cleanKey.startsWith('npi_')) inferredForm = 'evaluacion_neuropsicologica';
          else if (cleanKey.startsWith('updrs_')) inferredForm = 'mds_updrs_examination';
          else if (cleanKey.startsWith('hx_') || cleanKey.startsWith('tx_') || cleanKey.startsWith('diag_')) inferredForm = 'visita_estudio';
          else if (cleanKey.startsWith('faq_') || cleanKey.startsWith('cdr_')) inferredForm = 'escalas_funcionales_y_globales';
          else if (cleanKey.startsWith('ant_')) inferredForm = 'antecedentes';

          this.dictionary.push({
            var: cleanKey,
            form: inferredForm,
            header: '',
            type: 'text',
            label: this.formatLabel(cleanKey),
            choices: {},
            note: 'Variable inferida de la importación de datos',
            vtype: '',
            min: '',
            max: ''
          });
        }
      });
    });

    if (newVarsCount > 0) {
      this.init();
      console.log(`[DictionaryManager] Se registraron ${newVarsCount} variables nuevas desde la importación.`);
    }
  },

  /**
   * Sincroniza dinámicamente la configuración de Fusión Temporal según los formularios existentes
   */
  syncTimeMatcherConfig() {
    if (typeof TimeMatcher === 'undefined' || !TimeMatcher.instrumentConfig) return;

    this.formGroups.forEach((vars, formId) => {
      if (!TimeMatcher.instrumentConfig[formId]) {
        // Encontrar posibles variables de fecha
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
    return formId
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  },

  formatLabel(varName) {
    return varName
      .replace(/_/g, ' ')
      .replace(/\w/g, l => l.toUpperCase());
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

// Auto-inicialización inicial con diccionario base
if (typeof LEWY_DICTIONARY !== 'undefined') {
  DictionaryManager.init();
}
