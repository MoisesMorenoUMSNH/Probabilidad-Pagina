/**
 * Módulo OCR y Parseo Regex
 * Contiene el motor de lectura de Tesseract/PDF.js
 * y toda la lógica de RegEx para escupir los datos JSON limpios.
 */

import { MESES_VALIDOS } from './storage.js';

// ============================================================================
// EXTRACCIÓN CRUDOS
// ============================================================================

export async function extraerTextoOCR(archivoImagen, cbProgreso) {
    const resultado = await Tesseract.recognize(archivoImagen, 'spa', {
        logger: info => {
            if (info.status === 'recognizing text' && cbProgreso) cbProgreso(info.progress * 100);
        }
    });
    return resultado.data.text;
}

export async function extraerTextoPDF(archivoPdf) {
    // IMPORTANTE: Asegurate que pdf.min.js está en el index HTML (el worker lo usa)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const buffer = await archivoPdf.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const paginas = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const contenido = await pagina.getTextContent();
        paginas.push(contenido.items.map(item => item.str).join(' '));
    }
    return paginas;
}

// ============================================================================
// LIMPIEZA REGEX Y PARSEO
// ============================================================================

export function limpiarTextoCrudo(texto) {
    return texto
        .replace(/[—–]/g, ' ')                        
        .replace(/0CT/g, 'OCT').replace(/0ct/g, 'oct')
        .replace(/0IC/g, 'DIC').replace(/d1c/gi, 'dic')
        .replace(/([A-Z]{3})Z[S5]\b/g, '$1 25')        
        .replace(/([A-Z]{3})Z[4]\b/g, '$1 24')         
        .replace(/(\d{2})[,.]([A-Z]{3})(\d{2})/g, '$1 $2 $3') 
        .replace(/(\d{2})([A-Z]{3})(\d{2})/g, '$1 $2 $3')     
        .replace(/\s+/g, ' ');                         
}

function aislarColumnaIzquierda(linea) {
    return linea
        .replace(/TOTAL\s*A\s*PAGAR.*$/i, '')
        .replace(/DESCARGA.*$/i, '')
        .replace(/\$\s*\d[\d,.]*\s*(PESOS|MXN|M\.N\.)?.*$/i, '')
        .replace(/\(DOSCIENTOS.*$/i, '')
        .trim();
}

/** Extrae JSON con Nombre, Dirección, Periodo, Tarifas */
export function extraerDatosFrente(textoFrente) {
    const rawData = { nombre: '', direccion: '', noServicio: '', periodo: '', totalPagar: 0, kwhConsumidos: 0, precioPorKwh: 0, lecturaActual: 0, lecturaAnterior: 0 };
    const lineas = textoFrente.split('\n');
    let dirArray = [];

    const regexDir = /\b(AV\b|CALLE|C\.?P\.?\s*\d|CANTERA|VILLAS|COL\b|FRA\b|FRACC|COLONIA|PEDREGAL|MORELIA|MICH)/i;
    const regexStopwords = /\b(CFE|COMISI|FEDERAL|ELECTRICIDAD|CONCEPTO|ENERGIA|BASICO|PERIODO|LECTURA|MEDID|TARIFA|CORTE|DESCARGA|MERCADO|SUBTOTAL|PRECIO)\b/i;

    lineas.forEach((linea) => {
        const limpia = aislarColumnaIzquierda(linea.trim());
        if (limpia.length < 3) return;

        if (regexDir.test(limpia)) dirArray.push(limpia);
        
        const soloLetras = limpia.replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '').trim();
        if (!rawData.nombre && soloLetras.length >= 8 && soloLetras.split(' ').length >= 2 && !regexStopwords.test(soloLetras)) {
            rawData.nombre = soloLetras;
        }
    });
    rawData.direccion = dirArray.join(', ');

    const matchServ = textoFrente.match(/NO\.?\s*(?:DE\s*)?SERVICIO\s*:?\s*([\d\s]{8,})/i) || textoFrente.match(/\b(\d{12})\b/);
    if (matchServ) rawData.noServicio = matchServ[1].replace(/\s/g, '');

    const matchPeriodo = textoFrente.match(/(\d{1,2}\s+[A-Z]{3}\s+\d{2})\s*[-~]\s*(\d{1,2}\s+[A-Z]{3}\s+\d{2})/i);
    if (matchPeriodo && MESES_VALIDOS.includes(matchPeriodo[1].match(/[A-Z]{3}/i)[0].toUpperCase())) {
        rawData.periodo = `${matchPeriodo[1].toUpperCase()} - ${matchPeriodo[2].toUpperCase()}`;
    }

    const matchTotal = textoFrente.match(/\bTotal\s+\$\s*([\d,.]+)/i) || textoFrente.match(/TOTAL\s*A\s*PAGAR[\s\S]{0,60}\$\s*([\d,.]+)/i);
    if (matchTotal) rawData.totalPagar = parseFloat(matchTotal[1].replace(/,/g, ''));

    const matchEnergia = textoFrente.match(/Energ[iíÍ]a\s*\(?\s*k\s*w\s*h?\s*\)?\s*0*(\d{2,5})\s+0*(\d{2,5})\s+(\d{1,4})/i);
    if (matchEnergia) {
        let l1 = parseInt(matchEnergia[1]), l2 = parseInt(matchEnergia[2]);
        rawData.lecturaActual = Math.max(l1, l2);
        rawData.lecturaAnterior = Math.min(l1, l2);
        rawData.kwhConsumidos = parseInt(matchEnergia[3]);
    }

    const matchPrecio = textoFrente.match(/[BbÁá][áaÁ]sico\s+\d+\s+([\d]+\.[\d]{2,})/i);
    if (matchPrecio) rawData.precioPorKwh = parseFloat(matchPrecio[1]);

    return rawData;
}

/** Extrae la matriz histórica del reverso o de la pág 2 del PDF */
export function extraerDatosReverso(textoReverso) {
    const historico = [];
    if (!textoReverso) return { historico };
    const lineas = textoReverso.split('\n');
    const regexFecha = /(\d{1,2})\s*[,.\s]*([A-Z]{3})\s*[,.\s]*(\d{2})/gi;

    lineas.forEach(linea => {
        let fechas = [];
        let match;
        while ((match = regexFecha.exec(linea)) !== null) {
            if (MESES_VALIDOS.includes(match[2].toUpperCase())) fechas.push(`${match[1]} ${match[2].toUpperCase()} ${match[3]}`);
        }
        
        if (fechas.length >= 2) {
            const nums = linea.match(/\b(\d{2,3})\b/g) || [];
            let kwhFinal = 0;
            for (let num of nums) {
                let n = parseInt(num);
                if (n >= 20 && n <= 500 && !fechas.some(f => f.includes(num))) {
                    kwhFinal = n; break;
                }
            }
            const matchImporte = linea.match(/\$([\d,.]+)/);
            if (kwhFinal > 0) historico.push({ periodo: `${fechas[0]} - ${fechas[1]}`, kwh: kwhFinal, importe: matchImporte ? parseFloat(matchImporte[1].replace(/,/g, '')) : 0 });
        }
    });
    return { historico };
}
