/**
 * Módulo de Almacenamiento Local
 * Encargado de leer, grabar y buscar duplicados en el navegador.
 */

export const STORAGE_KEY = 'cfe_recibos';
export const MESES_VALIDOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/**
 * Carga la lista de recibos desde localStorage.
 * @returns {Array} Lista de recibos.
 */
export function cargarRecibos() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

/**
 * Sobrescribe la lista completa de recibos en localStorage.
 * @param {Array} recibos 
 */
export function guardarRecibos(recibos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recibos));
}

/**
 * Verifica si un periodo (ej '01 ENE 25 - 01 MAR 25') ya existe guardado
 * ignorando mayúsculas o espacios extra.
 * @param {string} periodo 
 * @returns {boolean}
 */
export function existePeriodo(periodo) {
    const recibos = cargarRecibos();
    const normalizado = periodo.trim().toUpperCase().replace(/\s+/g, ' ');
    return recibos.some(r => r.periodo.trim().toUpperCase().replace(/\s+/g, ' ') === normalizado);
}
