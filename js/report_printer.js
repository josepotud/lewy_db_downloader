/**
 * Lewy Data Suite - Generador de Informes Médicos e Impresión / Guardar en PDF
 */
const ReportPrinter = {
  open(patientId) {
    const patient = AppState.getPatient(patientId);
    if (!patient) {
      App.showToast('Paciente no encontrado', 'danger');
      return;
    }

    const modalBody = document.getElementById('modal-report-body');
    if (!modalBody) return;

    // Extract patient data
    const gen = DictionaryManager.getChoiceText('genero', AppState.getPatientValue(patientId, 'genero'));
    const dob = AppState.getPatientValue(patientId, 'dob');
    const escol = DictionaryManager.getChoiceText('escolarizacion_cat', AppState.getPatientValue(patientId, 'escolarizacion_cat'));
    const dx = AppState.getPatientValue(patientId, 'dx_clinico') || AppState.getPatientValue(patientId, 'diag_sindrome_clinico') || 'No especificado';
    const debut = AppState.getPatientValue(patientId, 'primer_sintoma') || 'No descrito';
    const mmse = AppState.getPatientValue(patientId, 'hx_mmse') || '-';
    const moca = AppState.getPatientValue(patientId, 'hx_moca') || '-';
    const npiTotal = AppState.getPatientValue(patientId, 'npi_puntuacion_total') || '-';
    const cdrGlobal = AppState.getPatientValue(patientId, 'cdr_global') || '-';

    // Biomarcadores
    const ab42 = AppState.getPatientValue(patientId, 'pl_ab42_valor') || '-';
    const ptau = AppState.getPatientValue(patientId, 'pl_ptau_valor') || '-';
    const ttau = AppState.getPatientValue(patientId, 'pl_ttau_valor') || '-';
    const datscan = AppState.getPatientValue(patientId, 'datscan_resultado') || '-';
    const mta = AppState.getPatientValue(patientId, 'schel_mta') || '-';
    const petfdg = AppState.getPatientValue(patientId, 'petfdg_patron_visual') || '-';

    let html = `
      <div style="padding: 10px; font-family: system-ui, sans-serif; color: #000;">
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h2 style="color: #0369a1; font-size: 20px; font-weight: 700; margin: 0;">INFORME CLÍNICO MULTIMODAL - COHORTE LEWY MADRID</h2>
            <p style="font-size: 12px; color: #555; margin: 2px 0 0 0;">Registro de Investigación en Demencia por Cuerpos de Lewy y Alfa-Sinucleinopatías</p>
          </div>
          <div style="text-align: right; font-size: 12px;">
            <strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-ES')}
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">1. FILIACIÓN Y DIAGNÓSTICO</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 13px;">
            <div><strong>ID Lewy:</strong> <span class="badge badge-primary">${patientId}</span></div>
            <div><strong>Género:</strong> ${gen || '-'}</div>
            <div><strong>Fecha Nacimiento:</strong> ${dob || '-'}</div>
            <div><strong>Escolarización:</strong> ${escol || '-'}</div>
            <div style="grid-column: span 2;"><strong>Diagnóstico Clínico:</strong> <span style="font-weight: 700; color: #0369a1;">${dx}</span></div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">2. DEBUT Y SÍNTOMAS PRINCIPALES</h3>
          <p style="font-size: 13px; margin-bottom: 6px;"><strong>Primer Síntoma / Motivo:</strong> ${debut}</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">3. EVALUACIÓN COGNITIVA Y FUNCIONAL</h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 13px;">
            <div><strong>MMSE:</strong> ${mmse} / 30</div>
            <div><strong>MoCA:</strong> ${moca} / 30</div>
            <div><strong>CDR Global:</strong> ${cdrGlobal}</div>
            <div><strong>NPI Total:</strong> ${npiTotal}</div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">4. BIOMARCADORES Y NEUROIMAGEN</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 13px;">
            <div><strong>Aβ42 (LCR):</strong> ${ab42} pg/mL</div>
            <div><strong>p-Tau (LCR):</strong> ${ptau} pg/mL</div>
            <div><strong>t-Tau (LCR):</strong> ${ttau} pg/mL</div>
            <div><strong>MTA Scheltens (RM):</strong> ${mta}</div>
            <div><strong>DaTSCAN SPECT:</strong> ${datscan}</div>
            <div><strong>PET-FDG Visual:</strong> ${petfdg}</div>
          </div>
        </div>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; color: #666; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
          <div>Registro Multimodal Cohorte Lewy Madrid - Confidencial para investigación médica</div>
          <div>Firma del Facultativo / Investigador</div>
        </div>
      </div>
    `;

    modalBody.innerHTML = html;
    document.getElementById('modal-report').classList.add('active');
  },

  print() {
    window.print();
  }
};
