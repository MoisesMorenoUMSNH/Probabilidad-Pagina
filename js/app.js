/**
 * PUNTO DE ENTRADA PRINCIPAL (app.js)
 * 
 * Al haber modularizado toda la lógica en ES6 Modules,
 * este archivo únicamente se encarga de importar las funciones necesarias
 * y escuchar los eventos del DOM (clics de botones, Drag&Drop).
 */

// Importaciones desde Módulos Específicos
import { guardarRecibos } from './storage.js';
import { abrirModalSubida, seleccionarModoSubida, configurarDropZone } from './ui.js';
import { iniciarProcesamiento, renderizarTarjetas } from './recibos.js';
import { ejecutarCalculoMedia, ejecutarCalculoVarianza } from './calculos.js';
import { setFaseRegresion, setTablaManual, parsearExcelARegresion, ejecutarMCDRegresion } from './regresion.js';

document.addEventListener('DOMContentLoaded', () => {

    /* --- GESTIÓN DE RECIBOS Y MODALES --- */
    document.getElementById('btn_agregar').addEventListener('click', abrirModalSubida);
    document.getElementById('btn_procesar').addEventListener('click', iniciarProcesamiento);
    document.getElementById('btn_cancelar').addEventListener('click', () => document.getElementById('modal_upload').style.display = 'none');
    document.getElementById('btn_borrar_todos').addEventListener('click', () => {
        if(confirm('¿Seguro quieres borrar todos los datos permanentemente?')) { guardarRecibos([]); renderizarTarjetas(); }
    });

    document.getElementById('btn_tipo_imagen').addEventListener('click', () => seleccionarModoSubida('imagen'));
    document.getElementById('btn_tipo_pdf').addEventListener('click', () => seleccionarModoSubida('pdf'));

    /* --- CÁLCULOS ESTADÍSTICOS --- */
    document.getElementById('btn_calc_media').addEventListener('click', ejecutarCalculoMedia);
    document.getElementById('btn_calc_varianza').addEventListener('click', ejecutarCalculoVarianza);

    /* --- REGRESIÓN LINEAL --- */
    document.getElementById('btn_reg_excel').addEventListener('click', () => setFaseRegresion('excel'));
    document.getElementById('btn_reg_manual').addEventListener('click', () => setFaseRegresion('manual'));
    
    document.getElementById('btn_crear_tabla').addEventListener('click', () => setTablaManual(parseInt(document.getElementById('reg_num_datos').value) || 2));
    document.getElementById('btn_calcular_regresion').addEventListener('click', ejecutarMCDRegresion);

    /* --- HOOK DRAG & DROP MULTIPLES ZONAS --- */
    configurarDropZone('drop_frente', 'imagen_frente', false);
    configurarDropZone('drop_reverso', 'imagen_reverso', false);
    configurarDropZone('drop_pdf', 'archivo_pdf', true);
    
    const excelZipHndlr = () => parsearExcelARegresion(document.getElementById('archivo_excel').files[0]);
    configurarDropZone('drop_excel', 'archivo_excel', false);
    document.getElementById('archivo_excel').addEventListener('change', () => document.getElementById('archivo_excel').files.length && excelZipHndlr());
    document.getElementById('drop_excel').addEventListener('drop', () => setTimeout(() => document.getElementById('archivo_excel').files.length && excelZipHndlr(), 100));

    /* --- MODALES ACCIONES POR FUERA (CERRAR) --- */
    document.getElementById('btn_cerrar_todos').addEventListener('click', () => document.getElementById('modal_todos').style.display='none');
    ['modal_todos', 'modal_upload'].forEach(id => {
        document.getElementById(id).addEventListener('click', function(e) { if(e.target === this) this.style.display = 'none'; });
    });

    /* --- NAVBAR HAMBURGUESA MOBILE --- */
    const bm = document.getElementById('btn_menu'), nl = document.getElementById('nav_links');
    if (bm && nl) {
        bm.addEventListener('click', () => { bm.classList.toggle('abierto'); nl.classList.toggle('abierto'); });
        nl.querySelectorAll('a').forEach(l => l.addEventListener('click', () => { bm.classList.remove('abierto'); nl.classList.remove('abierto'); }));
    }

    // ARRANQUE DE PÁGINA
    renderizarTarjetas();
});
