/**
 * Módulo de Flujos de Recibos y Tarjetas
 * Se encarga de la orquestación principal y dibujar el DOM.
 */

import { cargarRecibos, guardarRecibos, existePeriodo } from './storage.js';
import { modoSubidaActual, mostrarProgreso, actualizarProgreso } from './ui.js';
import { extraerTextoOCR, extraerTextoPDF, limpiarTextoCrudo, extraerDatosFrente, extraerDatosReverso } from './ocr.js';

export async function iniciarProcesamiento() {
    if (!modoSubidaActual) return alert('Selecciona Imágenes o PDF primero.');
    modoSubidaActual === 'pdf' ? await orquestarPDF() : await orquestarImagenes();
}

async function orquestarImagenes() {
    const fileFrente = document.getElementById('imagen_frente').files[0];
    const fileReverso = document.getElementById('imagen_reverso').files[0];
    if (!fileFrente) return alert('Se requiere la imagen del frente.');

    mostrarProgreso(true, 'Iniciando OCR...');
    try {
        const textoFrente = await extraerTextoOCR(fileFrente, p => actualizarProgreso('Leyendo frente...', 10 + p*0.4));
        const textoReverso = fileReverso ? await extraerTextoOCR(fileReverso, p => actualizarProgreso('Leyendo reverso...', 50 + p*0.4)) : '';

        actualizarProgreso('Procesando datos...', 95);
        const dataFte = extraerDatosFrente(limpiarTextoCrudo(textoFrente));
        const dataRev = extraerDatosReverso(limpiarTextoCrudo(textoReverso));

        validarYGuardarUnRecibo(dataFte, dataRev, 'la imagen');
    } catch (e) { alert('Error OCR: ' + e.message); mostrarProgreso(false); }
}

async function orquestarPDF() {
    const files = document.getElementById('archivo_pdf').files;
    if (!files.length) return alert('Sube al menos un PDF.');

    mostrarProgreso(true, 'Iniciando extracción PDF...');
    let procesados = 0, errores = [];

    try {
        for (let i = 0; i < files.length; i++) {
            actualizarProgreso(`Leyendo PDF ${i+1}/${files.length}`, (i/files.length)*100);
            const paginas = await extraerTextoPDF(files[i]);
            const textoCompleto = paginas.join('\n');
            const dataFte = extraerDatosFrente(limpiarTextoCrudo(paginas[0] || textoCompleto)); 
            let dataRev = extraerDatosReverso(limpiarTextoCrudo(paginas.slice(1).join('\n')));  
            if (!dataRev.historico.length) dataRev = extraerDatosReverso(limpiarTextoCrudo(textoCompleto));

            if (!dataFte.totalPagar || !dataFte.periodo) {
                const fallback = extraerDatosFrente(limpiarTextoCrudo(textoCompleto));
                Object.keys(dataFte).forEach(key => { if (!dataFte[key]) dataFte[key] = fallback[key]; });
            }
            if (validarYGuardarUnRecibo(dataFte, dataRev, files[i].name, true)) procesados++;
            else errores.push(files[i].name);
        }
        actualizarProgreso('Completado', 100);
        if (errores.length) alert(`Procesados: ${procesados}.\nOmitidos (${errores.length}):\n${errores.join('\n')}`);
        
        document.getElementById('modal_upload').style.display = 'none';
        renderizarTarjetas();
    } catch (e) { alert('Error PDF: ' + e.message); mostrarProgreso(false); }
}

function validarYGuardarUnRecibo(datosFte, datosRev, sourceName, silencioso = false) {
    if (!datosFte.periodo) {
        const p = prompt(`No se detectó el periodo en ${sourceName}.\nEjemplo: 01 ENE 25 - 01 MAR 25`);
        if (!p) return false;
        datosFte.periodo = p.trim().toUpperCase();
    }
    if (existePeriodo(datosFte.periodo)) {
        if (!silencioso) alert(`Periodo duplicado: ${datosFte.periodo}`);
        return false;
    }

    const recibos = cargarRecibos();
    recibos.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        ...datosFte, historico: datosRev.historico || [], fecha: new Date().toISOString()
    });
    guardarRecibos(recibos);
    if (!silencioso) { document.getElementById('modal_upload').style.display = 'none'; renderizarTarjetas(); }
    return true;
}

// ---------------- DOM Renderizado ----------------

export function renderizarTarjetas() {
    const contenedor = document.getElementById('contenedor_recibos');
    const recibos = cargarRecibos();
    const barra = document.getElementById('barra_recibos');
    contenedor.innerHTML = '';

    if (!recibos.length) {
        barra.style.display = 'none';
        contenedor.innerHTML = '<p class="mensaje_vacio">Agrega un recibo para comenzar.</p>';
        return;
    }

    barra.style.display = 'flex';
    document.getElementById('total_recibos').textContent = `Total recibos guardados: ${recibos.length}`;
    recibos.slice(0, 5).forEach(r => contenedor.appendChild(crearNodoTarjeta(r)));

    if (recibos.length > 5) {
        const btn = document.createElement('button');
        btn.className = 'btn_ver_mas'; btn.textContent = `Ver los ${recibos.length - 5} recibos restantes...`;
        btn.onclick = () => {
            const modCont = document.getElementById('contenedor_todos'); modCont.innerHTML = '';
            recibos.forEach(r => modCont.appendChild(crearNodoTarjeta(r)));
            document.getElementById('modal_todos').style.display = 'flex';
        };
        contenedor.appendChild(btn);
    }
}

function crearNodoTarjeta(recibo) {
    const div = document.createElement('div');
    div.className = 'tarjeta_recibo';

    const calcStats = () => {
        const vals = recibo.historico.map(h => h.kwh);
        return {
            prom: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length),
            min: Math.min(...vals), max: Math.max(...vals),
            tendencia: vals[0] > vals[1] ? 'Sube' : (vals[0] < vals[1] ? 'Baja' : 'Igual')
        };
    };

    const hasHist = recibo.historico && recibo.historico.length;
    let historicoHTML = '', statsHTML = '';
    
    if (hasHist) {
        const stats = calcStats();
        historicoHTML = `
            <div class="contenedor_grafico"><canvas id="chart_${recibo.id}"></canvas></div>
            <table class="tabla_historico">
                <thead><tr><th>Periodo</th><th>kWh</th><th>Importe</th></tr></thead>
                <tbody>${recibo.historico.map(h => `<tr><td>${h.periodo}</td><td>${h.kwh}</td><td>$${h.importe||0}</td></tr>`).join('')}</tbody>
            </table>`;
        statsHTML = `<div class="estadisticas">
            <div class="stat_item"><div class="stat_etiqueta">PROMEDIO</div><div class="stat_valor">${stats.prom} kWh</div></div>
            <div class="stat_item"><div class="stat_etiqueta">MINIMO</div><div class="stat_valor">${stats.min} kWh</div></div>
            <div class="stat_item"><div class="stat_etiqueta">MAXIMO</div><div class="stat_valor">${stats.max} kWh</div></div>
            <div class="stat_item"><div class="stat_etiqueta">TENDENCIA</div><div class="stat_valor">${stats.tendencia}</div></div>
        </div>`;
    }

    div.innerHTML = `
        <div class="tarjeta_header">
            <div class="tarjeta_resumen"><span class="tarjeta_flecha">&#9654;</span><h3>${recibo.periodo}</h3><span class="tarjeta_total">$${Number(recibo.totalPagar).toFixed(2)}</span></div>
            <button class="btn_eliminar" data-id="${recibo.id}">Borrar</button>
        </div>
        <div class="tarjeta_contenido">
            <div class="datos_beneficiario">
                ${recibo.nombre && recibo.nombre !== 'No detectado' ? '<p><strong>' + recibo.nombre + '</strong></p>' : ''}
                <p>${recibo.direccion||''} | No. Serv: ${recibo.noServicio||''}</p>
            </div>
            <div class="datos_clave">
                <div class="dato_item"><div class="dato_etiqueta">TOTAL A PAGAR</div><div class="dato_valor">$${Number(recibo.totalPagar).toFixed(2)}</div></div>
                <div class="dato_item"><div class="dato_etiqueta">CONSUMO</div><div class="dato_valor">${recibo.kwhConsumidos||0} kWh</div></div>
                <div class="dato_item"><div class="dato_etiqueta">PRECIO/kWh</div><div class="dato_valor">$${Number(recibo.precioPorKwh||0).toFixed(3)}</div></div>
                <div class="dato_item"><div class="dato_etiqueta">LECTURA ACTUAL</div><div class="dato_valor">${recibo.lecturaActual||0}</div></div>
            </div>
            ${historicoHTML}${statsHTML}
        </div>
    `;

    div.querySelector('.tarjeta_header').addEventListener('click', (e) => {
        if (e.target.closest('.btn_eliminar')) {
            if (confirm('¿Borrar recibo?')) {
                guardarRecibos(cargarRecibos().filter(r => r.id !== recibo.id)); renderizarTarjetas();
                document.getElementById('modal_todos').style.display = 'none';
            }
            return;
        }
        div.classList.toggle('expandida');
        if (div.classList.contains('expandida') && hasHist) {
            const ctx = document.getElementById(`chart_${recibo.id}`);
            if (ctx && !ctx.getAttribute('data-rend')) {
                ctx.setAttribute('data-rend', '1'); setTimeout(() => renderizarGrafico(ctx, recibo.historico), 100);
            }
        }
    });

    return div;
}

function renderizarGrafico(ctx, historico) {
    const dReq = [...historico].reverse();
    new Chart(ctx, {
        type: 'bar',
        data: { labels: dReq.map(h => h.periodo.split('-')[1]?.trim() || h.periodo), datasets: [{ label: 'Consumo kWh', data: dReq.map(h => h.kwh), backgroundColor: '#91d9ff' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#adcfe5' } }, y: { beginAtZero: true, ticks: { color: '#adcfe5' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });
}
