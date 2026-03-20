/**
 * Módulo de Cálculos Estadísticos
 * Maneja operaciones Matemáticas de Media y Varianza y su graficado.
 */

import { cargarRecibos } from './storage.js';

let chartMediaGlobal = null, chartVarianzaGlobal = null;

export function ejecutarCalculoMedia() {
    const recibos = cargarRecibos();
    if (!recibos.length) return alert('No hay datos.');
    
    const pagos = recibos.map(r => r.totalPagar);
    const media = pagos.reduce((a, b) => a + b, 0) / pagos.length;

    document.getElementById('formula_media').innerHTML = `Suma Totales / ${pagos.length}`;
    document.getElementById('valor_media').textContent = `Media = $${media.toFixed(2)}`;
    document.getElementById('panel_media').style.display = 'block';

    if (chartMediaGlobal) chartMediaGlobal.destroy();
    chartMediaGlobal = new Chart(document.getElementById('chart_media'), {
        type: 'bar',
        data: {
            labels: recibos.map(r => r.periodo),
            datasets: [
                { label: 'Total a Pagar', data: pagos, backgroundColor: '#91d9ff', order: 2 },
                { label: `Media ($${media.toFixed(2)})`, data: pagos.map(() => media), type: 'line', borderColor: '#6bffb8', order: 1 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#adcfe5'} }, y: { ticks: { color: '#adcfe5'} } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });
}

export function ejecutarCalculoVarianza() {
    const recibos = cargarRecibos();
    if (!recibos.length) return alert('No hay datos.');
    
    const pagos = recibos.map(r => r.totalPagar);
    const n = pagos.length;
    const media = pagos.reduce((a, b) => a + b, 0) / n;
    
    const desviaciones2 = pagos.map(v => Math.pow(v - media, 2));
    const varianza = desviaciones2.reduce((a, b) => a + b, 0) / n;

    document.getElementById('formula_varianza').innerHTML = `Σ (X - Media)² / N`;
    document.getElementById('valor_varianza').textContent = `Varianza = $${varianza.toFixed(2)}`;
    document.getElementById('panel_varianza').style.display = 'block';

    if (chartVarianzaGlobal) chartVarianzaGlobal.destroy();
    chartVarianzaGlobal = new Chart(document.getElementById('chart_varianza'), {
        type: 'bar',
        data: {
            labels: recibos.map(r => r.periodo),
            datasets: [{ label: '(Xi - Media)²', data: desviaciones2, backgroundColor: 'rgba(145, 217, 255, 0.7)' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#adcfe5'} }, y: { ticks: { color: '#adcfe5'} } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });
}
