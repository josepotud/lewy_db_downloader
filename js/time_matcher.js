/**
 * Lewy Data Suite - Motor de Fusión Temporal Multimodal
 * Permite seleccionar TODOS los 15 instrumentos de REDCap:
 * - Instrumentos basales independientes (Demográficos, Antecedentes, Genética): sin filtro de fecha.
 * - Instrumentos temporales (Punción Lumbar, RM, PET, Neuropsicología...): aislados estrictamente en ventana.
 */
const TimeMatcher = {
  instrumentConfig: {
    // 1. INSTRUMENTOS BASALES INDEPENDIENTES (Sin medidas repetidas / Sin fecha)
    'demograficos': {
      title: 'Demográficos',
      icon: '👤',
      isIndependent: true,
      isRepeating: false,
      color: '#64748b'
    },
    'antecedentes': {
      title: 'Antecedentes',
      icon: '🏥',
      isIndependent: true,
      isRepeating: false,
      color: '#475569'
    },
    'genetica_molecular': {
      title: 'Genética Molecular',
      icon: '🧬',
      isIndependent: true,
      isRepeating: false,
      color: '#334155'
    },

    // 2. INSTRUMENTOS TEMPORALES (Con fechas y medidas longitudinales)
    'visita_estudio': {
      title: 'Visita de Estudio',
      icon: '🩺',
      dateVars: ['hx_fecha_visita'],
      isIndependent: false,
      isRepeating: false,
      color: '#0284c7'
    },
    'evaluacion_neuropsicologica': {
      title: 'Neuropsicología',
      icon: '🧠',
      dateVars: ['npi_fecha'],
      isIndependent: false,
      isRepeating: false,
      color: '#8b5cf6'
    },
    'mds_updrs_examination': {
      title: 'MDS-UPDRS',
      icon: '🚶',
      dateVars: ['updrs_fecha'],
      isIndependent: false,
      isRepeating: false,
      color: '#f59e0b'
    },
    'inventario_neuropsiquiatrico_npi': {
      title: 'NPI Cummings',
      icon: '💭',
      dateVars: ['npi_fecha'],
      isIndependent: false,
      isRepeating: false,
      color: '#a855f7'
    },
    'escalas_funcionales_y_globales': {
      title: 'Escalas Funcionales',
      icon: '📊',
      dateVars: ['faq_fecha', 'cdr_fecha'],
      isIndependent: false,
      isRepeating: false,
      color: '#10b981'
    },
    'diagnostico_y_gds': {
      title: 'Diagnóstico y GDS',
      icon: '🎯',
      dateVars: ['fecha_dx_gds'],
      isIndependent: false,
      isRepeating: true,
      color: '#ec4899'
    },
    'puncion_lumbar': {
      title: 'Punción Lumbar',
      icon: '🧪',
      dateVars: ['pl_fecha'],
      isIndependent: false,
      isRepeating: true,
      color: '#06b6d4'
    },
    'resonancia_magnetica': {
      title: 'Resonancia Magnética',
      icon: '🧲',
      dateVars: ['rm_fecha', 'fecha_rm'],
      isIndependent: false,
      isRepeating: true,
      color: '#6366f1'
    },
    'datscan_spect': {
      title: 'DaTSCAN SPECT',
      icon: '⚡',
      dateVars: ['datscan_fecha'],
      isIndependent: false,
      isRepeating: false,
      color: '#eab308'
    },
    'pet_amiloide': {
      title: 'PET Amiloide',
      icon: '🔬',
      dateVars: ['petami_fecha'],
      isIndependent: false,
      isRepeating: false,
      color: '#d946ef'
    },
    'pet_fdg': {
      title: 'PET-FDG',
      icon: '☢️',
      dateVars: ['petfdg_fecha_visual', 'fecha_petfdg'],
      isIndependent: false,
      isRepeating: true,
      color: '#ef4444'
    },
    'electroencefalograma': {
      title: 'Electroencefalograma',
      icon: '📈',
      dateVars: ['eeg_clinico_fecha', 'eeg_fecha'],
      isIndependent: false,
      isRepeating: false,
      color: '#14b8a6'
    }
  },

  extractEvaluations(patientRecord, formName) {
    const config = this.instrumentConfig[formName];
    if (!config || config.isIndependent || !config.dateVars) return [];
    const evaluations = [];

    const checkRow = (row, instanceNum) => {
      if (!row) return;
      let foundDate = null;
      let dateVarUsed = null;
      for (const dVar of config.dateVars) {
        if (row[dVar] && String(row[dVar]).trim()) {
          const parsed = this.parseDate(row[dVar]);
          if (parsed) {
            foundDate = parsed;
            dateVarUsed = dVar;
            break;
          }
        }
      }

      if (foundDate) {
        evaluations.push({
          formName,
          instance: instanceNum,
          date: foundDate.dateObj,
          dateStr: foundDate.formattedStr,
          dateVar: dateVarUsed,
          row: row
        });
      }
    };

    if (config.isRepeating) {
      if (patientRecord.repeating && patientRecord.repeating[formName] && patientRecord.repeating[formName].length > 0) {
        patientRecord.repeating[formName].forEach((instRow, idx) => {
          checkRow(instRow, instRow.redcap_repeat_instance || (idx + 1));
        });
      } else if (patientRecord.baseRow) {
        checkRow(patientRecord.baseRow, 0);
      }
    } else {
      if (patientRecord.baseRow) {
        checkRow(patientRecord.baseRow, 0);
      }
    }

    return evaluations;
  },

  parseDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    let d = null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const parts = s.split('-');
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(s)) {
      const sep = s.includes('/') ? '/' : '-';
      const parts = s.split(sep);
      d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    if (d && !isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return { dateObj: d, formattedStr: `${yyyy}-${mm}-${dd}` };
    }
    return null;
  },

  daysBetween(d1, d2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((d2.getTime() - d1.getTime()) / oneDay);
  },

  selectEvaluationByStrategy(evaluations, anchorDate, strategy, toleranceDays) {
    if (!anchorDate || !evaluations || evaluations.length === 0) {
      return null;
    }

    const candidates = [];
    evaluations.forEach(ev => {
      if (!ev.date) return;
      const deltaDays = this.daysBetween(anchorDate, ev.date);
      const absDays = Math.abs(deltaDays);

      if (absDays <= toleranceDays) {
        candidates.push({
          evaluation: ev,
          deltaDays: deltaDays,
          absDays: absDays,
          isPrior: deltaDays <= 0,
          isPost: deltaDays >= 0,
          dateObj: ev.date
        });
      }
    });

    if (candidates.length === 0) {
      return null;
    }

    let chosen = null;

    switch (strategy) {
      case 'closest':
        candidates.sort((a, b) => a.absDays - b.absDays || a.dateObj - b.dateObj);
        chosen = candidates[0];
        break;

      case 'farthest':
        candidates.sort((a, b) => b.absDays - a.absDays || a.dateObj - b.dateObj);
        chosen = candidates[0];
        break;

      case 'closest_prior':
        const priors = candidates.filter(c => c.isPrior);
        if (priors.length > 0) {
          priors.sort((a, b) => a.absDays - b.absDays);
          chosen = priors[0];
        } else {
          candidates.sort((a, b) => a.absDays - b.absDays);
          chosen = candidates[0];
        }
        break;

      case 'closest_posterior':
        const posts = candidates.filter(c => c.isPost);
        if (posts.length > 0) {
          posts.sort((a, b) => a.absDays - b.absDays);
          chosen = posts[0];
        } else {
          candidates.sort((a, b) => a.absDays - b.absDays);
          chosen = candidates[0];
        }
        break;

      case 'first_chrono':
        candidates.sort((a, b) => a.dateObj - b.dateObj);
        chosen = candidates[0];
        break;

      case 'last_chrono':
        candidates.sort((a, b) => b.dateObj - a.dateObj);
        chosen = candidates[0];
        break;

      case 'strict_prior':
        const strictPriors = candidates.filter(c => c.isPrior);
        if (strictPriors.length > 0) {
          strictPriors.sort((a, b) => a.absDays - b.absDays);
          chosen = strictPriors[0];
        }
        break;

      case 'strict_posterior':
        const strictPosts = candidates.filter(c => c.isPost);
        if (strictPosts.length > 0) {
          strictPosts.sort((a, b) => a.absDays - b.absDays);
          chosen = strictPosts[0];
        }
        break;

      default:
        candidates.sort((a, b) => a.absDays - b.absDays);
        chosen = candidates[0];
        break;
    }

    if (!chosen) return null;

    const dirText = chosen.deltaDays === 0 ? 'Mismo día' : (chosen.deltaDays < 0 ? `Pre (${Math.abs(chosen.deltaDays)}d)` : `Post (${chosen.deltaDays}d)`);

    return {
      evaluation: chosen.evaluation,
      absDays: chosen.absDays,
      deltaDays: chosen.deltaDays,
      direction: dirText,
      totalCandidatesInWindow: candidates.length
    };
  },

  generateTimeMatchedTable(options) {
    const {
      anchorForm = 'puncion_lumbar',
      toleranceDays = 180,
      selectedForms = ['demograficos', 'antecedentes', 'genetica_molecular', 'visita_estudio', 'puncion_lumbar', 'pet_fdg', 'resonancia_magnetica', 'evaluacion_neuropsicologica', 'datscan_spect'],
      strategy = 'closest',
      anchorStrategy = 'most_complete',
      onlyCompleteCases = false
    } = options;

    const patientRows = [];
    const patientIds = AppState.patientIds;

    patientIds.forEach(id => {
      const pRecord = AppState.getPatient(id);
      if (!pRecord) return;

      const anchorEvals = this.extractEvaluations(pRecord, anchorForm);

      // Si el paciente no tiene evaluación de referencia con fecha válida, se omite de la fusión
      if (anchorEvals.length === 0) {
        return;
      }

      let selectedAnchor = anchorEvals[0];

      if (anchorEvals.length > 1) {
        if (anchorStrategy === 'last') {
          anchorEvals.sort((a, b) => b.date - a.date);
          selectedAnchor = anchorEvals[0];
        } else if (anchorStrategy === 'first') {
          anchorEvals.sort((a, b) => a.date - b.date);
          selectedAnchor = anchorEvals[0];
        } else {
          let bestAnchor = anchorEvals[0];
          let maxMatches = -1;

          anchorEvals.forEach(aEval => {
            let mCount = 0;
            selectedForms.forEach(f => {
              if (f === anchorForm) return;
              const fConfig = this.instrumentConfig[f];
              if (fConfig && fConfig.isIndependent) return; // los independientes no cuentan en el cálculo de ventana
              const fEvals = this.extractEvaluations(pRecord, f);
              const match = this.selectEvaluationByStrategy(fEvals, aEval.date, strategy, toleranceDays);
              if (match) mCount++;
            });
            if (mCount > maxMatches) {
              maxMatches = mCount;
              bestAnchor = aEval;
            }
          });
          selectedAnchor = bestAnchor;
        }
      }

      const patientRow = {
        lewy_id: id,
        genero: AppState.getPatientValue(id, 'genero'),
        dob: AppState.getPatientValue(id, 'dob'),
        escolarizacion_cat: AppState.getPatientValue(id, 'escolarizacion_cat'),
        dx_clinico: AppState.getPatientDiagnosis(id),
        anchor_instrument: anchorForm,
        anchor_date: selectedAnchor.dateStr,
        anchor_date_var: selectedAnchor.dateVar,
        anchor_instance: selectedAnchor.instance,
        matched_instruments_count: 0,
        instruments_data: {},
        temporal_diffs: {}
      };

      let matchedCount = 0;
      let allRequiredPresent = true;

      selectedForms.forEach(targetForm => {
        const targetCfg = this.instrumentConfig[targetForm];

        // Caso A: Instrumentos Basales Independientes (Demográficos, Antecedentes, Genética)
        if (targetCfg && targetCfg.isIndependent) {
          patientRow.instruments_data[targetForm] = pRecord.baseRow || { lewy_id: id };
          patientRow.temporal_diffs[targetForm] = {
            days: 0,
            deltaDays: 0,
            dateStr: 'Basal',
            direction: 'Independiente',
            status: 'independent',
            candidatesCount: 1
          };
          return;
        }

        // Caso B: Instrumento de Referencia (Ancla)
        if (targetForm === anchorForm) {
          patientRow.instruments_data[targetForm] = selectedAnchor.row;
          patientRow.temporal_diffs[targetForm] = {
            days: 0,
            deltaDays: 0,
            dateStr: selectedAnchor.dateStr,
            direction: 'Referencia',
            status: 'same',
            candidatesCount: anchorEvals.length
          };
          return;
        }

        // Caso C: Instrumentos Temporales comparados
        const targetEvals = this.extractEvaluations(pRecord, targetForm);
        const match = this.selectEvaluationByStrategy(targetEvals, selectedAnchor.date, strategy, toleranceDays);

        if (match) {
          matchedCount++;
          patientRow.instruments_data[targetForm] = match.evaluation.row;
          patientRow.temporal_diffs[targetForm] = {
            days: match.absDays,
            deltaDays: match.deltaDays,
            dateStr: match.evaluation.dateStr,
            instance: match.evaluation.instance,
            direction: match.direction,
            candidatesCount: match.totalCandidatesInWindow,
            status: match.absDays <= 30 ? 'perfect' : (match.absDays <= 90 ? 'good' : 'acceptable')
          };
        } else {
          // Aislamiento estricto: si no coincide en ventana, null
          patientRow.instruments_data[targetForm] = null;
          patientRow.temporal_diffs[targetForm] = {
            days: null,
            deltaDays: null,
            dateStr: '',
            direction: 'Fuera de ventana',
            candidatesCount: 0,
            status: 'missing'
          };
          allRequiredPresent = false;
        }
      });

      patientRow.matched_instruments_count = matchedCount;

      if (onlyCompleteCases && !allRequiredPresent) {
        return;
      }

      patientRows.push(patientRow);
    });

    return {
      anchorForm,
      toleranceDays,
      selectedForms,
      strategy,
      anchorStrategy,
      totalPatients: patientRows.length,
      rows: patientRows
    };
  },

  flattenPatientRow(patientRow, selectedForms, includeAuditColumns = true, exportMode = 'labels') {
    const isLabels = exportMode === 'labels';
    const id = patientRow.lewy_id;

    const flat = {
      lewy_id: id,
      genero: isLabels ? DictionaryManager.getChoiceText('genero', patientRow.genero) : patientRow.genero,
      dob: patientRow.dob,
      escolarizacion: isLabels ? DictionaryManager.getChoiceText('escolarizacion_cat', patientRow.escolarizacion_cat) : patientRow.escolarizacion_cat,
      dx_clinico: patientRow.dx_clinico
    };

    // Exportar cada instrumento seleccionado en orden
    selectedForms.forEach(formName => {
      const config = this.instrumentConfig[formName];
      const rowData = patientRow.instruments_data[formName];
      const diffInfo = patientRow.temporal_diffs[formName];
      const isAnchor = (formName === patientRow.anchor_instrument);
      const isIndependent = config && config.isIndependent;

      // Si es un instrumento temporal con fecha
      if (!isIndependent) {
        flat[`${formName}_fecha`] = (diffInfo && diffInfo.dateStr) ? diffInfo.dateStr : '';

        if (includeAuditColumns && !isAnchor) {
          flat[`${formName}_diff_dias`] = (diffInfo && diffInfo.days !== null) ? diffInfo.days : '';
          flat[`${formName}_posicion`] = (diffInfo && diffInfo.direction && diffInfo.days !== null) ? diffInfo.direction : '';
        }
      }

      // Exportar el 100% de las variables del instrumento
      const formEntries = DictionaryManager.getFormVariables(formName);
      let formVars = formEntries.map(e => e.var);
      if (formVars.length === 0 && rowData) formVars = Object.keys(rowData);

      formVars.forEach(v => {
        if (v === 'lewy_id' || v === 'redcap_repeat_instrument' || v === 'redcap_repeat_instance' || v.endsWith('_complete')) return;
        const rawVal = rowData ? (rowData[v] !== undefined && rowData[v] !== null ? rowData[v] : '') : '';
        flat[v] = isLabels ? DictionaryManager.getChoiceText(v, rawVal) : rawVal;
      });
    });

    return flat;
  }
};
