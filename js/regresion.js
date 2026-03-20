/**
 * Módulo de Regresión Lineal
 * Contiene la lógica de Mínimos Cuadrados, Entrada Manual y Parsing del Excel (xlsx).
 */

export let regresionModoActivo = 'manual';
let chartRegGlobal = null;

/** Activa el Panel Manual o el de Excel */
export function setFaseRegresion(modo) {
    regresionModoActivo = modo;
    document.getElementById('btn_reg_excel').classList.toggle('activo', modo === 'excel');
    document.getElementById('btn_reg_manual').classList.toggle('activo', modo === 'manual');
    document.getElementById('panel_excel').style.display = modo === 'excel' ? 'block' : 'none';
    document.getElementById('panel_manual').style.display = modo === 'manual' ? 'block' : 'none';
    document.getElementById('reg_btn_calcular_wrap').style.display = 'none';
}

/** Inyecta Tabla HTML para Captura */
export function setTablaManual(numDatos) {
    const tableHTML = `<table class="regresion_tabla"><thead><tr><th>X</th><th>Y</th></tr></thead><tbody>
        ${Array.from({length: numDatos}).map((_, i) => `<tr><td><input class="r_x" type="number" step="any" placeholder="x${i+1}"></td><td><input class="r_y" type="number" step="any" placeholder="y${i+1}"></td></tr>`).join('')}
    </tbody></table>`;
    document.getElementById('contenedor_tabla_reg').innerHTML = tableHTML;
    document.getElementById('reg_btn_calcular_wrap').style.display = 'flex';
}

/** Devora el Excel y escupe la Tabla precargada */
export function parsearExcelARegresion(archivo) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]]; 
            const jsonMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            const rows = jsonMatrix.filter(row => row.length >= 2 && !isNaN(parseFloat(row[0])) && !isNaN(parseFloat(row[1])));
            if (rows.length < 2) return alert('Archivo sin datos suficientes en las primeras columnas.');

            const tableHTML = `<table class="regresion_tabla"><thead><tr><th>X</th><th>Y</th></tr></thead><tbody>
                ${rows.map(r => `<tr><td><input class="r_x" type="number" step="any" value="${r[0]}"></td><td><input class="r_y" type="number" step="any" value="${r[1]}"></td></tr>`).join('')}
            </tbody></table>`;

            document.getElementById('contenedor_tabla_excel').innerHTML = tableHTML;
            document.getElementById('reg_btn_calcular_wrap').style.display = 'flex';
        } catch (err) { alert('Error al leer Excel: ' + err.message); }
    };
    reader.readAsArrayBuffer(archivo);
}

/** Lee del DOM y tira matemáticas de Ajuste Lineal (MCD) */
export function ejecutarMCDRegresion() {
    const selector = regresionModoActivo === 'manual' ? '#contenedor_tabla_reg' : '#contenedor_tabla_excel';
    const inputsX = document.querySelectorAll(`${selector} .r_x`), inputsY = document.querySelectorAll(`${selector} .r_y`);
    
    let xDatos = [], yDatos = [];
    inputsX.forEach((ix, idx) => {
        const valX = parseFloat(ix.value), valY = parseFloat(inputsY[idx].value);
        if (!isNaN(valX) && !isNaN(valY)) { xDatos.push(valX); yDatos.push(valY); }
    });

    if (xDatos.length < 2) return alert('Se requieren mínimo 2 pares ordenados.');

    const n = xDatos.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (let i = 0; i < n; i++) {
        sumX += xDatos[i]; sumY += yDatos[i]; sumXY += xDatos[i]*yDatos[i];
        sumX2 += xDatos[i]*xDatos[i]; sumY2 += yDatos[i]*yDatos[i];
    }

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    
    const valRContext = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r2 = valRContext === 0 ? 0 : Math.pow((n * sumXY - sumX * sumY) / valRContext, 2);

    document.getElementById('reg_ecuacion').innerHTML = `<strong>ECUACIÓN: Y = ${m.toFixed(4)}x ${b >= 0 ? '+' : '-'} ${Math.abs(b).toFixed(4)}</strong>`;
    document.getElementById('reg_resumen').innerHTML = [
        ['N Datos (n)', n], ['Sumatoria X', sumX.toFixed(2)], ['Sumatoria Y', sumY.toFixed(2)],
        ['Sumatoria X²', sumX2.toFixed(2)], ['Pendiente (m)', m.toFixed(4)], ['Intercepto (b)', b.toFixed(4)], ['R²', r2.toFixed(4)]
    ].map(([tit, val]) => `<div class="reg_stat_item"><div class="reg_stat_etiqueta">${tit}</div><div class="reg_stat_valor">${val}</div></div>`).join('');

    if (chartRegGlobal) chartRegGlobal.destroy();
    const minX = Math.min(...xDatos), maxX = Math.max(...xDatos), margen = (maxX - minX) * 0.1;
    
    chartRegGlobal = new Chart(document.getElementById('chart_regresion'), {
        type: 'scatter',
        data: {
            datasets: [
                { label: 'Puntos Experimentales', data: xDatos.map((x, i) => ({x, y: yDatos[i]})), backgroundColor: '#4db8ff' },
                { label: 'Recta de Tendencia', data: [{x: minX-margen, y: m*(minX-margen)+b}, {x: maxX+margen, y: m*(maxX-margen)+b}], type: 'line', borderColor: '#e74c3c', fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks:{color:'#fff'}, grid:{color:'#0d2e3f'}}, y: { ticks:{color:'#fff'}, grid:{color:'#0d2e3f'}} } }
    });

    const panelFinal = document.getElementById('panel_regresion_resultado');
    panelFinal.style.display = 'block'; panelFinal.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
