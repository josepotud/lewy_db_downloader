/**
 * Lewy Data Suite - Motor de Autocálculos Clínicos en Tiempo Real
 */
const ClinicalCalculations = {
  // 1. Índice de Masa Corporal (IMC) = peso (kg) / (altura (m))^2
  calculateBMI(peso, alturaCm) {
    const p = parseFloat(peso);
    const h = parseFloat(alturaCm);
    if (!p || !h || h <= 0) return null;
    const hM = h > 3 ? h / 100 : h; // si ingresó en cm vs m
    const bmi = p / (hM * hM);
    let category = '';
    if (bmi < 18.5) category = 'Bajo peso';
    else if (bmi < 25) category = 'Normopeso';
    else if (bmi < 30) category = 'Sobrepeso';
    else category = 'Obesidad';
    return { value: bmi.toFixed(2), category };
  },

  // 2. Cociente LCR p-tau181 / Abeta42
  calculatePtauAb42Ratio(ptau, ab42) {
    const p = parseFloat(ptau);
    const a = parseFloat(ab42);
    if (!p || !a || a <= 0) return null;
    const ratio = (p / a);
    let status = ratio > 0.068 ? 'Perfil Patológico (AD-like)' : 'Normal / No sugestivo EA';
    return { value: ratio.toFixed(4), status, ratio };
  },

  // 3. CDR Sum of Boxes (CDR-SOB)
  calculateCDRSOB(fields) {
    const keys = ['cdr_memoria', 'cdr_orientacion', 'cdr_razonamiento', 'cdr_act_comunitarias', 'cdr_hogar_aficiones', 'cdr_cuidado_personal'];
    let sum = 0;
    let count = 0;
    keys.forEach(k => {
      const val = parseFloat(fields[k]);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    });
    if (count === 0) return null;
    return { value: sum.toFixed(1), count };
  },

  // 4. Puntuación Total NPI de Cummings & Estrés Total
  calculateNPITotals(fields) {
    const domains = ['delirios', 'alucinaciones', 'agitacion', 'depresion', 'ansiedad', 'euforia', 'apatia', 'desinhibicion', 'irritabilidad', 'motora', 'sueno', 'apetito'];
    let totalScore = 0;
    let totalDistress = 0;
    let scoreCount = 0;
    let distressCount = 0;

    domains.forEach(d => {
      const g = parseFloat(fields[`npi_${d}_grav`]);
      const e = parseFloat(fields[`npi_${d}_estres`]);
      if (!isNaN(g)) {
        totalScore += g;
        scoreCount++;
      }
      if (!isNaN(e)) {
        totalDistress += e;
        distressCount++;
      }
    });

    return {
      totalScore: scoreCount > 0 ? totalScore : null,
      totalDistress: distressCount > 0 ? totalDistress : null
    };
  },

  // 5. UPDRS Subtotales
  calculateUPDRSTotals(fields) {
    let part3Sum = 0;
    let part3Count = 0;
    for (const k in fields) {
      if (k.startsWith('updrs_') && !k.includes('fecha') && !k.includes('estado') && !k.includes('levodopa') && !k.includes('complete')) {
        const val = parseFloat(fields[k]);
        if (!isNaN(val)) {
          part3Sum += val;
          part3Count++;
        }
      }
    }
    return { part3Sum: part3Count > 0 ? part3Sum : null, count: part3Count };
  }
};
