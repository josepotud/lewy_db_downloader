/**
 * Lewy Data Suite - Gestor del Diccionario de Datos REDCap
 * Diccionario Maestro Unificado: 1498 Variables en 15 Instrumentos
 */
const DictionaryManager = {
  dictionary: typeof LEWY_DICTIONARY !== 'undefined' ? LEWY_DICTIONARY : [],
  varMap: new Map(),
  formGroups: new Map(),

  formsList: [
    { id: 'demograficos', title: '1. Demográficos', count: 8 },
    { id: 'antecedentes', title: '2. Antecedentes', count: 17 },
    { id: 'visita_estudio', title: '3. Visita de Estudio', count: 97 },
    { id: 'evaluacion_neuropsicologica', title: '4. Neuropsicología', count: 51 },
    { id: 'mds_updrs_examination', title: '5. MDS-UPDRS', count: 80 },
    { id: 'inventario_neuropsiquiatrico_npi', title: '6. NPI Cummings', count: 26 },
    { id: 'escalas_funcionales_y_globales', title: '7. Escalas Funcionales', count: 13 },
    { id: 'diagnostico_y_gds', title: '8. Diagnóstico y GDS', count: 14 },
    { id: 'puncion_lumbar', title: '9. Punción Lumbar', count: 55 },
    { id: 'genetica_molecular', title: '10. Genética Molecular', count: 4 },
    { id: 'resonancia_magnetica', title: '11. Resonancia Magnética', count: 350 },
    { id: 'datscan_spect', title: '12. DaTSCAN SPECT', count: 5 },
    { id: 'pet_amiloide', title: '13. PET Amiloide', count: 5 },
    { id: 'pet_fdg', title: '14. PET-FDG', count: 731 },
    { id: 'electroencefalograma', title: '15. Electroencefalograma', count: 42 }
  ],

  init() {
    this.varMap.clear();
    this.formGroups.clear();

    this.dictionary.forEach(item => {
      this.varMap.set(item.var, item);
      if (!this.formGroups.has(item.form)) {
        this.formGroups.set(item.form, []);
      }
      this.formGroups.get(item.form).push(item);
    });
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
