/**
 * Módulo de Utilidades de Interfaz de Usuario (UI)
 * Domina el comportamiento de los modales, la barra de progreso
 * y la detección de Drag & Drop para subir archivos.
 */

export let modoSubidaActual = null;

export function setModoSubida(modo) {
    modoSubidaActual = modo;
}

/** Prepara y muestra el modal principal de agregar recibo limpio */
export function abrirModalSubida() {
    setModoSubida(null);
    mostrarProgreso(false);
    document.getElementById('modal_upload').style.display = 'flex';
    document.getElementById('selector_tipo').style.display = 'block';
    document.getElementById('btn_procesar').style.display = 'none';

    ['campos_imagen', 'campos_pdf'].forEach(id => document.getElementById(id).style.display = 'none');
    ['imagen_frente', 'imagen_reverso', 'archivo_pdf'].forEach(id => document.getElementById(id).value = '');
    ['btn_tipo_imagen', 'btn_tipo_pdf'].forEach(id => document.getElementById(id).classList.remove('activo'));
    ['drop_frente', 'drop_reverso', 'drop_pdf'].forEach(resetearDropZone);
    
    document.getElementById('pdf_contador').textContent = '';
}

/** Activa la vista para imagenes o PDF */
export function seleccionarModoSubida(modo) {
    setModoSubida(modo);
    document.getElementById('btn_tipo_imagen').classList.toggle('activo', modo === 'imagen');
    document.getElementById('btn_tipo_pdf').classList.toggle('activo', modo === 'pdf');
    document.getElementById('campos_imagen').style.display = modo === 'imagen' ? 'block' : 'none';
    document.getElementById('campos_pdf').style.display = modo === 'pdf' ? 'block' : 'none';
    document.getElementById('btn_procesar').style.display = 'inline-flex';
}

/** Alterna la barra del loading OCR */
export function mostrarProgreso(visible, mensaje = 'Procesando...', porcentaje = 0) {
    const progresoDiv = document.getElementById('ocr_progreso');
    progresoDiv.style.display = visible ? 'block' : 'none';
    if (visible) actualizarProgreso(mensaje, porcentaje);
}

/** Llena la barra dinámicamente */
export function actualizarProgreso(mensaje, porcentaje) {
    document.getElementById('ocr_mensaje').textContent = mensaje;
    document.getElementById('barra_llenado').style.width = porcentaje + '%';
}

// ---------------------- DRAG & DROP ----------------------

export function configurarDropZone(zonaId, inputId, multiple) {
    const zona = document.getElementById(zonaId);
    const input = document.getElementById(inputId);
    if (!zona || !input) return;

    zona.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('dragover'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('dragover'));
    
    zona.addEventListener('drop', (e) => {
        e.preventDefault();
        zona.classList.remove('dragover');
        if (!e.dataTransfer.files.length) return;

        const dt = new DataTransfer();
        Array.from(multiple ? [...input.files, ...e.dataTransfer.files] : [e.dataTransfer.files[0]])
            .filter(file => !multiple || file.type === 'application/pdf')
            .forEach(file => dt.items.add(file));
        
        input.files = dt.files;
        actualizarEstadoZona(zona, input, multiple);
    });

    input.addEventListener('change', () => actualizarEstadoZona(zona, input, multiple));
}

function actualizarEstadoZona(zona, input, multiple) {
    const prevText = zona.querySelector('.nombre_archivo');
    if (prevText) prevText.remove();
    if (input.files.length > 0) {
        zona.classList.add('tiene_archivo');
        const p = document.createElement('p'); p.className = 'nombre_archivo';
        if (multiple) {
            p.textContent = `${input.files.length} archivo(s)`;
            const counter = document.getElementById('pdf_contador');
            if (counter) counter.textContent = Array.from(input.files).map(f => f.name).join(', ');
        } else p.textContent = input.files[0].name;
        zona.appendChild(p);
    } else resetearDropZone(zona.id);
}

export function resetearDropZone(zonaId) {
    const zona = document.getElementById(zonaId);
    if (!zona) return;
    zona.classList.remove('tiene_archivo', 'dragover');
    const p = zona.querySelector('.nombre_archivo');
    if (p) p.remove();
}
