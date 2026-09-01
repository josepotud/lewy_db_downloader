/**
 * Lewy Data Suite - Diccionario y Metadatos REDCap
 */
const DictionaryManager = {
  entries: [],
  byVar: new Map(),
  byForm: new Map(),
  formsList: [
    { id: 'demograficos', title: '1. Demográficos', count: 8 },
    { id: 'antecedentes', title: '2. Antecedentes', count: 17 },
    { id: 'visita_estudio', title: '3. Visita de Estudio', count: 82 },
    { id: 'evaluacion_neuropsicologica', title: '4. Neuropsicología', count: 51 },
    { id: 'mds_updrs_examination', title: '5. MDS-UPDRS', count: 70 },
    { id: 'inventario_neuropsiquiatrico_npi', title: '6. NPI Cummings', count: 26 },
    { id: 'escalas_funcionales_y_globales', title: '7. Escalas Funcionales', count: 13 },
    { id: 'diagnostico_y_gds', title: '8. Diagnóstico y GDS', count: 14 },
    { id: 'puncion_lumbar', title: '9. Punción Lumbar', count: 55 },
    { id: 'genetica_molecular', title: '10. Genética Molecular', count: 4 },
    { id: 'resonancia_magnetica', title: '11. Resonancia Magnética', count: 290 },
    { id: 'datscan_spect', title: '12. DaTSCAN SPECT', count: 5 },
    { id: 'pet_amiloide', title: '13. PET Amiloide', count: 5 },
    { id: 'pet_fdg', title: '14. PET-FDG', count: 520 },
    { id: 'electroencefalograma', title: '15. Electroencefalograma', count: 42 }
  ],

  init() {
    if (window.LEWY_DICTIONARY) {
      this.entries = window.LEWY_DICTIONARY;
      this.entries.forEach(e => {
        this.byVar.set(e.var, e);
        if (!this.byForm.has(e.form)) {
          this.byForm.set(e.form, []);
        }
        this.byForm.get(e.form).push(e);
      });
    }
  },

  get(varName) {
    return this.byVar.get(varName);
  },

  getFormVariables(formName) {
    return this.byForm.get(formName) || [];
  },

  getLabel(varName) {
    const entry = this.byVar.get(varName);
    return entry && entry.label ? entry.label : varName;
  },

  getChoiceText(varName, val) {
    if (val === null || val === undefined || val === '') return '';
    const entry = this.byVar.get(varName);
    if (!entry || !entry.choices) return String(val);
    const key = String(val).trim();
    return entry.choices[key] !== undefined ? entry.choices[key] : String(val);
  }
};
