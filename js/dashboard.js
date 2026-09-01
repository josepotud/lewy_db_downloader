/**
 * Lewy Data Suite - Panel Descriptivo Clínico y Estadístico
 */
const DashboardManager = {
  chartDiagnosis: null,
  chartBiomarkers: null,

  render() {
    const hasData = AppState.hasData();
    const emptyBanner = document.getElementById('dashboard-empty-banner');
    const contentPanel = document.getElementById('dashboard-content');

    if (!hasData) {
      if (emptyBanner) emptyBanner.style.display = 'block';
      if (contentPanel) contentPanel.style.display = 'none';
      return;
    }

    if (emptyBanner) emptyBanner.style.display = 'none';
    if (contentPanel) contentPanel.style.display = 'block';

    this.renderDescriptiveSummary();
    this.renderCharts();
  },

  renderDescriptiveSummary() {
    const totalPatients = AppState.patientIds.length;
    const totalRows = AppState.rawRows.length;

    let totalAge = 0, ageCount = 0, minAge = 999, maxAge = -1;
    let maleCount = 0, femaleCount = 0;
    const agesList = [];

    let plCount = 0, rmCount = 0, datCount = 0, petfdgCount = 0, petamiCount = 0, eegCount = 0, npCount = 0, updrsCount = 0;

    AppState.patientIds.forEach(id => {
      const p = AppState.getPatient(id);
      if (!p) return;

      // Género
      const gen = AppState.getPatientValue(id, 'genero');
      if (gen === '1' || String(gen).toLowerCase().includes('hombre') || String(gen).toLowerCase().includes('masc')) {
        maleCount++;
      } else if (gen === '2' || String(gen).toLowerCase().includes('mujer') || String(gen).toLowerCase().includes('fem')) {
        femaleCount++;
      }

      // Edad a la visita
      const dob = AppState.getPatientValue(id, 'dob');
      const visitDate = AppState.getPatientValue(id, 'hx_fecha_visita');
      let age = null;

      if (dob && visitDate) {
        const d1 = new Date(dob);
        const d2 = new Date(visitDate);
        if (!isNaN(d1) && !isNaN(d2)) {
          age = (d2 - d1) / (365.25 * 24 * 60 * 60 * 1000);
        }
      }
      if (age === null && dob) {
        const d1 = new Date(dob);
        if (!isNaN(d1)) {
          age = (new Date() - d1) / (365.25 * 24 * 60 * 60 * 1000);
        }
      }

      if (age !== null && age > 20 && age < 110) {
        totalAge += age;
        ageCount++;
        agesList.push(age);
        if (age < minAge) minAge = age;
        if (age > maxAge) maxAge = age;
      }

      // Biomarcadores y Pruebas
      if (p.repeating['puncion_lumbar'] && p.repeating['puncion_lumbar'].length > 0) plCount++;
      else if (p.baseRow && p.baseRow['pl_fecha']) plCount++;

      if (p.repeating['resonancia_magnetica'] && p.repeating['resonancia_magnetica'].length > 0) rmCount++;
      else if (p.baseRow && (p.baseRow['rm_fecha'] || p.baseRow['fecha_rm'])) rmCount++;

      if (p.baseRow && p.baseRow['datscan_fecha']) datCount++;
      if (p.repeating['pet_fdg'] && p.repeating['pet_fdg'].length > 0) petfdgCount++;
      else if (p.baseRow && p.baseRow['petfdg_fecha_visual']) petfdgCount++;

      if (p.baseRow && p.baseRow['petami_fecha']) petamiCount++;
      if (p.baseRow && (p.baseRow['eeg_clinico_fecha'] || p.baseRow['eeg_fecha'])) eegCount++;
      if (p.baseRow && p.baseRow['npi_fecha']) npCount++;
      if (p.baseRow && p.baseRow['updrs_fecha']) updrsCount++;
    });

    // Calcular media y desviación estándar de edad
    const meanAge = ageCount > 0 ? (totalAge / ageCount) : null;
    let sdAge = 0;
    if (meanAge && ageCount > 1) {
      const sumSq = agesList.reduce((acc, a) => acc + Math.pow(a - meanAge, 2), 0);
      sdAge = Math.sqrt(sumSq / (ageCount - 1));
    }

    const pctMale = totalPatients > 0 ? ((maleCount / totalPatients) * 100).toFixed(1) : '0';
    const pctFemale = totalPatients > 0 ? ((femaleCount / totalPatients) * 100).toFixed(1) : '0';

    const demoTable = document.getElementById('dashboard-demo-table');
    if (demoTable) {
      demoTable.innerHTML = `
        <table class="table-clean" style="width:100%; font-size:13px; border-collapse:collapse;">
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Pacientes registrados:</td><td style="padding:8px 0; text-align:right; font-weight:700; color:#0f172a;">${totalPatients}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Filas / Evaluaciones:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${totalRows}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Edad (Media ± DE):</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${meanAge ? `${meanAge.toFixed(1)} ± ${sdAge.toFixed(1)} años` : '-'}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Rango de edad:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${minAge < 999 ? `${minAge.toFixed(0)} - ${maxAge.toFixed(0)} años` : '-'}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Hombres:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0369a1;">${maleCount} (${pctMale}%)</td></tr>
            <tr><td style="padding:8px 0; color:#64748b;">Mujeres:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f766e;">${femaleCount} (${pctFemale}%)</td></tr>
          </tbody>
        </table>
      `;
    }

    const testTable = document.getElementById('dashboard-tests-table');
    if (testTable) {
      const getPct = (cnt) => totalPatients > 0 ? `(${((cnt / totalPatients) * 100).toFixed(1)}%)` : '';
      testTable.innerHTML = `
        <table class="table-clean" style="width:100%; font-size:13px; border-collapse:collapse;">
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Punción Lumbar (LCR):</td><td style="padding:8px 0; text-align:right; font-weight:700; color:#0f172a;">${plCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(plCount)}</span></td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Resonancia Magnética (RM):</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${rmCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(rmCount)}</span></td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">DaTSCAN SPECT:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${datCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(datCount)}</span></td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">PET-FDG Metabólico:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${petfdgCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(petfdgCount)}</span></td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">PET Amiloide:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${petamiCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(petamiCount)}</span></td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Electroencefalograma (EEG):</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${eegCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(eegCount)}</span></td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 0; color:#64748b;">Neuropsicología Formal:</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${npCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(npCount)}</span></td></tr>
            <tr><td style="padding:8px 0; color:#64748b;">MDS-UPDRS (Motor):</td><td style="padding:8px 0; text-align:right; font-weight:600; color:#0f172a;">${updrsCount} <span style="font-size:11px; color:#64748b; font-weight:400;">${getPct(updrsCount)}</span></td></tr>
          </tbody>
        </table>
      `;
    }
  },

  renderCharts() {
    if (typeof Chart === 'undefined') return;

    // Diagnósticos agrupados
    const dxGroups = {};
    AppState.patientIds.forEach(id => {
      const dx = AppState.getPatientDiagnosis(id);
      if (!dx) {
        dxGroups['Sin diagnóstico'] = (dxGroups['Sin diagnóstico'] || 0) + 1;
        return;
      }
      const dxLower = dx.toLowerCase();
      let group = 'Otras patologías / No clasificado';

      if (dxLower.includes('lewy') || dxLower.includes('dcl') && dxLower.includes('lewy')) {
        group = 'Demencia Cuerpos Lewy / DCL Lewy';
      } else if (dxLower.includes('alzheimer') || dxLower.includes(' ea') || dxLower.includes('ea ')) {
        group = 'Enfermedad de Alzheimer / Continuum EA';
      } else if (dxLower.includes('deterioro cognitivo leve') || dxLower.includes('dcl')) {
        group = 'Deterioro Cognitivo Leve';
      } else if (dxLower.includes('parkinson')) {
        group = 'Enfermedad de Parkinson';
      } else if (dxLower.includes('afasia') || dxLower.includes('app')) {
        group = 'Afasia Primaria Progresiva';
      } else if (dxLower.includes('corticobasal') || dxLower.includes('psp') || dxLower.includes('acp')) {
        group = 'Síndromes Focales / Atípicos (ACP/SCB)';
      } else if (dxLower.includes('control') || dxLower.includes('sano')) {
        group = 'Controles Sanos';
      }

      dxGroups[group] = (dxGroups[group] || 0) + 1;
    });

    const ctxDx = document.getElementById('chart-diagnosis');
    if (ctxDx) {
      if (this.chartDiagnosis) this.chartDiagnosis.destroy();
      const labels = Object.keys(dxGroups);
      const dataValues = Object.values(dxGroups);

      this.chartDiagnosis = new Chart(ctxDx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Nº Pacientes',
            data: dataValues,
            backgroundColor: ['#0284c7', '#0f766e', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b']
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    // Cobertura de Pruebas
    const ctxBio = document.getElementById('chart-biomarkers');
    if (ctxBio) {
      if (this.chartBiomarkers) this.chartBiomarkers.destroy();

      let pl = 0, rm = 0, dat = 0, petfdg = 0, petami = 0, eeg = 0, np = 0;
      AppState.patientIds.forEach(id => {
        const p = AppState.getPatient(id);
        if (!p) return;
        if ((p.repeating['puncion_lumbar'] && p.repeating['puncion_lumbar'].length) || (p.baseRow && p.baseRow.pl_fecha)) pl++;
        if ((p.repeating['resonancia_magnetica'] && p.repeating['resonancia_magnetica'].length) || (p.baseRow && (p.baseRow.rm_fecha || p.baseRow.fecha_rm))) rm++;
        if (p.baseRow && p.baseRow.datscan_fecha) dat++;
        if ((p.repeating['pet_fdg'] && p.repeating['pet_fdg'].length) || (p.baseRow && p.baseRow.petfdg_fecha_visual)) petfdg++;
        if (p.baseRow && p.baseRow.petami_fecha) petami++;
        if (p.baseRow && (p.baseRow.eeg_clinico_fecha || p.baseRow.eeg_fecha)) eeg++;
        if (p.baseRow && p.baseRow.npi_fecha) np++;
      });

      this.chartBiomarkers = new Chart(ctxBio, {
        type: 'bar',
        data: {
          labels: ['LCR', 'Resonancia', 'DaTSCAN', 'PET-FDG', 'PET-Amiloide', 'EEG', 'Neuropsicología'],
          datasets: [{
            label: 'Pacientes con prueba',
            data: [pl, rm, dat, petfdg, petami, eeg, np],
            backgroundColor: '#0284c7',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }
  }
};
