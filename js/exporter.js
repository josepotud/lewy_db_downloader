/**
 * Lewy Data Suite - Exportador Multiformato
 */
const Exporter = {
  getExportMode() {
    const rawRadio = document.getElementById('export-mode-raw');
    return rawRadio && rawRadio.checked ? 'raw' : 'labels';
  },

  // 1. Exportar Libro Excel Multi-Hoja General (16 pestañas temáticas)
  exportExcelMultiSheet(mode = null) {
    if (typeof XLSX === 'undefined') {
      App.showToast('Librería SheetJS no disponible', 'danger');
      return;
    }

    const exportMode = mode || this.getExportMode();
    const isLabels = exportMode === 'labels';
    App.showToast(`Generando Excel (${isLabels ? 'Etiquetas de Texto' : 'Valores Numéricos'})...`, 'info');

    const wb = XLSX.utils.book_new();

    // Hoja 1: Maestro General
    const generalRows = AppState.patientIds.map(id => {
      const genVal = AppState.getPatientValue(id, 'genero');
      const escVal = AppState.getPatientValue(id, 'escolarizacion_cat');
      const dxVal = AppState.getPatientDiagnosis(id);
      const gdsVal = AppState.getPatientValue(id, 'estadio_gds') || AppState.getPatientValue(id, 'diag_gds');

      return {
        lewy_id: id,
        genero: isLabels ? DictionaryManager.getChoiceText('genero', genVal) : genVal,
        dob: AppState.getPatientValue(id, 'dob'),
        escolarizacion: isLabels ? DictionaryManager.getChoiceText('escolarizacion_cat', escVal) : escVal,
        dx_clinico: dxVal,
        fecha_visita: AppState.getPatientValue(id, 'hx_fecha_visita'),
        mmse: AppState.getPatientValue(id, 'hx_mmse'),
        moca: AppState.getPatientValue(id, 'hx_moca'),
        gds: isLabels ? DictionaryManager.getChoiceText('estadio_gds', gdsVal) : gdsVal
      };
    });

    const wsGeneral = XLSX.utils.json_to_sheet(generalRows);
    XLSX.utils.book_append_sheet(wb, wsGeneral, '00_General_Cohorte');

    // Hojas 1 a 15: Cada Instrumento
    DictionaryManager.formsList.forEach(form => {
      const formVars = DictionaryManager.getFormVariables(form.id).map(v => v.var);
      const isRepeating = TimeMatcher.instrumentConfig[form.id] ? TimeMatcher.instrumentConfig[form.id].isRepeating : false;
      const sheetRows = [];

      AppState.patientIds.forEach(id => {
        const p = AppState.getPatient(id);
        if (!p) return;

        if (!isRepeating) {
          const rowObj = { lewy_id: id };
          formVars.forEach(v => {
            const rawVal = p.baseRow ? (p.baseRow[v] || '') : '';
            rowObj[v] = isLabels ? DictionaryManager.getChoiceText(v, rawVal) : rawVal;
          });
          sheetRows.push(rowObj);
        } else {
          const instances = p.repeating[form.id] || [];
          if (instances.length === 0) {
            const rowObj = { lewy_id: id, redcap_repeat_instance: '' };
            formVars.forEach(v => { rowObj[v] = ''; });
            sheetRows.push(rowObj);
          } else {
            instances.forEach(inst => {
              const rowObj = { lewy_id: id, redcap_repeat_instance: inst.redcap_repeat_instance || 1 };
              formVars.forEach(v => {
                const rawVal = inst[v] || '';
                rowObj[v] = isLabels ? DictionaryManager.getChoiceText(v, rawVal) : rawVal;
              });
              sheetRows.push(rowObj);
            });
          }
        }
      });

      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const sheetName = form.id.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const modeSuffix = isLabels ? 'Etiquetas' : 'Valores';
    XLSX.writeFile(wb, `BaseDeDatosLewy_MultiHoja_${modeSuffix}_${dateStr}.xlsx`);
    App.showToast(`✅ Excel (${modeSuffix}) descargado con éxito`, 'success');
  },

  // 2. Exportar Tabla de Fusión Temporal (Multi-Hoja)
  exportTimeMatchedTable(format = 'xlsx') {
    const options = App.getTimeMatcherOptions();
    const result = TimeMatcher.generateTimeMatchedTable(options);
    
    if (result.rows.length === 0) {
      App.showToast('No hay datos emparejados para exportar', 'warning');
      return;
    }

    const exportMode = this.getExportMode();
    const isLabels = exportMode === 'labels';
    const dateStr = new Date().toISOString().split('T')[0];
    const modeSuffix = isLabels ? 'Etiquetas' : 'Valores';
    const fileName = `Fusion_Temporal_Ref_${result.anchorForm}_Ventana_${result.toleranceDays}d_${modeSuffix}_${dateStr}`;

    if (format === 'xlsx' && typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();

      // 1. HOJA 1: FUSIÓN MAESTRA (Todas las variables de todos los instrumentos seleccionados en 1 sola fila/paciente)
      const flatMasterRows = result.rows.map(r => TimeMatcher.flattenPatientRow(r, result.selectedForms, true, exportMode));
      const wsMaster = XLSX.utils.json_to_sheet(flatMasterRows);
      XLSX.utils.book_append_sheet(wb, wsMaster, '00_Fusion_Maestra');

      // 2. HOJAS INDIVIDUALES POR CADA INSTRUMENTO SELECCIONADO
      result.selectedForms.forEach((formName, idx) => {
        const formCfg = TimeMatcher.instrumentConfig[formName];
        const isAnchor = (formName === result.anchorForm);
        const isIndependent = formCfg && formCfg.isIndependent;

        const formRows = result.rows.map(r => {
          const id = r.lewy_id;
          const rowData = r.instruments_data[formName];
          const diffInfo = r.temporal_diffs[formName];

          const obj = {
            lewy_id: id,
            genero: isLabels ? DictionaryManager.getChoiceText('genero', r.genero) : r.genero,
            dob: r.dob,
            dx_clinico: r.dx_clinico
          };

          // Si es temporal, incluir fecha y auditoría de delta
          if (!isIndependent) {
            obj[`${formName}_fecha`] = (diffInfo && diffInfo.dateStr) ? diffInfo.dateStr : '';
            if (!isAnchor) {
              obj[`${formName}_diff_dias`] = (diffInfo && diffInfo.days !== null) ? diffInfo.days : '';
              obj[`${formName}_posicion`] = (diffInfo && diffInfo.direction && diffInfo.days !== null) ? diffInfo.direction : '';
            }
          }

          // Variables completas del instrumento
          const formEntries = DictionaryManager.getFormVariables(formName);
          let formVars = formEntries.map(e => e.var);
          if (formVars.length === 0 && rowData) formVars = Object.keys(rowData);

          formVars.forEach(v => {
            if (v === 'lewy_id' || v === 'redcap_repeat_instrument' || v === 'redcap_repeat_instance' || v.endsWith('_complete')) return;
            const rawVal = rowData ? (rowData[v] !== undefined && rowData[v] !== null ? rowData[v] : '') : '';
            obj[v] = isLabels ? DictionaryManager.getChoiceText(v, rawVal) : rawVal;
          });

          return obj;
        });

        const wsForm = XLSX.utils.json_to_sheet(formRows);
        const rawTitle = (formCfg ? formCfg.title : formName).replace(/[/\\?*:\[\]]/g, '').substring(0, 26);
        const sheetTitle = `${idx + 1}_${rawTitle}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, wsForm, sheetTitle);
      });

      XLSX.writeFile(wb, `${fileName}.xlsx`);
      App.showToast(`✅ Libro Excel descargado con ${result.selectedForms.length + 1} hojas`, 'success');

    } else if (typeof Papa !== 'undefined') {
      const flatMasterRows = result.rows.map(r => TimeMatcher.flattenPatientRow(r, result.selectedForms, true, exportMode));
      const csv = Papa.unparse(flatMasterRows, { quotes: true, header: true });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
      App.showToast(`✅ Fusión temporal descargada en CSV`, 'success');
    }
  },

  // 3. Exportar CSV Oficial REDCap
  exportREDCapCSV() {
    if (typeof Papa === 'undefined') {
      App.showToast('Librería PapaParse no disponible', 'danger');
      return;
    }

    App.showToast('Generando CSV oficial REDCap...', 'info');

    const csvContent = Papa.unparse(AppState.rawRows, {
      quotes: true,
      header: true
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `CohorteLewy_Import_REDCap_Valores_${dateStr}.csv`;
    link.click();

    App.showToast('✅ CSV REDCap descargado', 'success');
  },

  // 4. Exportar Backup JSON
  exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState.rawRows, null, 2));
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = dataStr;
    link.download = `CohorteLewy_Backup_${dateStr}.json`;
    link.click();
    App.showToast('✅ Backup JSON descargado', 'success');
  }
};
