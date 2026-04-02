// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxYDuT215tlMq4W_jXVFPZqhjkp9GsQX2ymNtPQoyqYppxkYZ_oTPPoTB1sVS_4w3dcRA/exec',
  CLOUDINARY_CLOUD: 'dwgwbdtud',
  CLOUDINARY_UPLOAD_PRESET: 'web_upload',
  DEFAULT_IG_USER: 'drabruzera',
  DEFAULT_WEB_URL: 'drabruzera.com.ar',
  MAX_FILE_SIZE: 10 * 1024 * 1024
};

// ============================================
// HELPERS DOM
// ============================================
function $(id) {
  return document.getElementById(id);
}

const UI = {
  fileInput: $('fileInput'),
  dropZone: $('dropZone'),
  preview: $('preview'),
  texto: $('texto'),
  tipoPieza: $('tipoPieza'),
  titulo: $('titulo'),
  precio: $('precio'),
  cta: $('cta'),
  estiloVisual: $('estiloVisual'),
  preservarImagen: $('preservarImagen'),
  tipoNegocio: $('tipoNegocio'),
  usuarioIG: $('usuarioIG'),
  webSitio: $('webSitio'),
  btnGenerar: $('btnGenerar'),
  btnCopiar: $('btnCopiar'),
  btnDescargar: $('btnDescargar'),
  loading: $('loading'),
  loadingText: $('loadingText'),
  resultado: $('resultado'),
  error: $('error'),
  success: $('success'),
  imgFinal: $('imgFinal'),
  caption: $('captionText'),
  frase: $('fraseText'),
  creditos: $('creditos')
};

// ============================================
// ESTADO GLOBAL
// ============================================
let currentImageUrl = null;
let currentPublicId = null;
let userId = null;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initUser();
  initEventListeners();
  loadCreditos();
  disableGenerar(true);
  console.log('App lista. User ID:', userId);
});

function initUser() {
  userId = localStorage.getItem('ig_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    localStorage.setItem('ig_user_id', userId);
  }
}

function initEventListeners() {
  if (UI.fileInput) {
    UI.fileInput.addEventListener('change', handleFileSelect);
  }

  if (UI.dropZone && UI.fileInput) {
    UI.dropZone.addEventListener('click', () => UI.fileInput.click());

    UI.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      UI.dropZone.classList.add('dragover');
    });

    UI.dropZone.addEventListener('dragleave', () => {
      UI.dropZone.classList.remove('dragover');
    });

    UI.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      UI.dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    });
  }

  if (UI.btnGenerar) {
    UI.btnGenerar.addEventListener('click', generarContenido);
  }

  if (UI.btnCopiar) {
    UI.btnCopiar.addEventListener('click', copiarCaption);
  }

  if (UI.btnDescargar) {
    UI.btnDescargar.addEventListener('click', descargarImagen);
  }
}

// ============================================
// MANEJO DE ARCHIVOS
// ============================================
function handleFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (file) {
    processFile(file);
  }
}

function processFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('Por favor seleccioná una imagen válida');
    return;
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showError('La imagen no debe superar los 10MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    if (UI.preview) {
      UI.preview.src = e.target.result;
      UI.preview.style.display = 'block';
    }

    if (UI.dropZone) {
      UI.dropZone.classList.add('has-image');
    }

    uploadToCloudinary(file);
  };
  reader.readAsDataURL(file);
}

// ============================================
// SUBIDA A CLOUDINARY
// ============================================
async function uploadToCloudinary(file) {
  showLoading('Subiendo imagen...');
  hideError();
  hideSuccess();
  disableGenerar(true);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'instagram_generator');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error('Error en upload: ' + response.status);
    }

    const data = await response.json();
    currentImageUrl = data.secure_url;
    currentPublicId = data.public_id;

    hideLoading();
    showSuccess('Imagen lista para procesar');
    disableGenerar(false);

    console.log('✅ Cloudinary URL:', currentImageUrl);
    console.log('✅ Public ID:', currentPublicId);

  } catch (error) {
    console.error('Error Cloudinary:', error);
    hideLoading();
    showError('Error al subir imagen: ' + error.message);
  }
}

// ============================================
// CARGAR CRÉDITOS
// ============================================
function loadCreditos() {
  jsonpRequest('creditos', {}, 15000)
    .then((response) => {
      if (response && response.ok) {
        updateCreditosUI(
          response.creditosDisponibles ?? response.creditos ?? '?'
        );
      } else {
        updateCreditosUI('?');
      }
    })
    .catch((err) => {
      console.error('Error créditos:', err);
      updateCreditosUI('?');
    });
}

function updateCreditosUI(cantidad) {
  if (UI.creditos) {
    UI.creditos.textContent = cantidad;
  }
}

// ============================================
// GENERAR CONTENIDO
// ============================================
async function generarContenido() {
  if (!currentImageUrl) {
    showError('Primero subí una imagen');
    return;
  }

 const payload = {
  imageUrl: currentImageUrl,
  titulo: UI.titulo ? UI.titulo.value.trim() : '',
  precio: UI.precio ? UI.precio.value.trim() : '',
  cta: UI.cta ? UI.cta.value.trim() : '',
  usuarioIG: UI.usuarioIG ? UI.usuarioIG.value.trim() : '',
  webSitio: UI.webSitio ? UI.webSitio.value.trim() : '',
  whatsapp: '' // opcional si después lo agregás al UI
};

  showLoading('Iniciando generación con IA...');
  hideError();
  hideSuccess();

  try {
    const resultado = await jsonpRequest('generar', payload, 60000);

mostrarResultado(resultado);
hideLoading();
    mostrarResultado(resultado);
    hideLoading();
    
    if (resultado.creditosRestantes !== undefined) {
      updateCreditosUI(resultado.creditosRestantes);
    }

  } catch (error) {
    console.error('Error:', error);
    hideLoading();
    showError('Error: ' + error.message);
  }
}

async function pollingEstado(jobId, maxIntentos) {
  for (let i = 0; i < maxIntentos; i++) {
    await new Promise(r => setTimeout(r, 5000)); // Esperar 5s
    
    const estado = await jsonpRequest('estado', { jobId }, 10000);
    
    if (estado.listo) {
      return estado;
    }
    
    if (estado.error) {
      throw new Error(estado.error);
    }
    
    // Sigue procesando, actualizar mensaje
    showLoading(`Generando... (${(i + 1) * 5}s)`);
  }
  
  throw new Error('Timeout: la generación está tardando demasiado. Intentá de nuevo en un minuto.');
}
// ============================================
// JSONP
// ============================================
function jsonpRequest(action, params = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const script = document.createElement('script');

  let timeout;

if (timeoutMs && timeoutMs > 0) {
  timeout = setTimeout(() => {
    cleanupScript(script, callbackName);
    reject(new Error('Timeout del servidor'));
  }, timeoutMs);
}

    window[callbackName] = function (response) {
      if (timeout) clearTimeout(timeout);
      cleanupScript(script, callbackName);

      if (response && response.ok) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Error desconocido del servidor'));
      }
    };

    script.onerror = function () {
      clearTimeout(timeout);
      cleanupScript(script, callbackName);
      reject(new Error('Error de conexión con el servidor'));
    };

    const allParams = new URLSearchParams({
      action,
      userId,
      callback: callbackName,
      ...normalizeParams(params)
    });

    const url = `${CONFIG.SCRIPT_URL}?${allParams.toString()}`;
    console.log('📡 JSONP:', url);

    script.src = url;
    document.head.appendChild(script);
  });
}

function normalizeParams(params) {
  const normalized = {};

  Object.keys(params).forEach((key) => {
    const value = params[key];

    if (typeof value === 'boolean') {
      normalized[key] = value ? 'true' : 'false';
    } else if (value === null || value === undefined) {
      normalized[key] = '';
    } else {
      normalized[key] = String(value);
    }
  });

  return normalized;
}

function cleanupScript(script, callbackName) {
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
  if (callbackName && window[callbackName]) {
    delete window[callbackName];
  }
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================
function mostrarResultado(data) {
  if (UI.imgFinal && data.image) {
    UI.imgFinal.src = data.image;
    UI.imgFinal.style.display = 'block';
  }

  const textoFinal = [data.caption || '', data.hashtags || '']
    .filter(Boolean)
    .join('\n\n');

  if (UI.caption) {
    UI.caption.value = textoFinal;
  }

  if (UI.frase) {
    UI.frase.textContent = data.frase || '';
  }

  if (UI.resultado) {
    UI.resultado.style.display = 'block';
    UI.resultado.scrollIntoView({ behavior: 'smooth' });
  }

  currentImageUrl = data.image || currentImageUrl;
}

// ============================================
// ACCIONES
// ============================================
async function copiarCaption() {
  const texto = UI.caption ? UI.caption.value : '';

  if (!texto) {
    showError('No hay texto para copiar');
    return;
  }

  try {
    await navigator.clipboard.writeText(texto);
    showSuccess('Caption copiado al portapapeles');
  } catch (err) {
    try {
      UI.caption.select();
      document.execCommand('copy');
      showSuccess('Caption copiado al portapapeles');
    } catch {
      showError('No se pudo copiar el caption');
    }
  }
}

async function descargarImagen() {
  if (!currentImageUrl) {
    showError('No hay imagen para descargar');
    return;
  }

  try {
    const response = await fetch(currentImageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'instagram-post-' + Date.now() + '.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess('Imagen descargada');
  } catch (error) {
    window.open(currentImageUrl, '_blank');
  }
}

// ============================================
// UI HELPERS
// ============================================
function showLoading(mensaje) {
  if (UI.loading) UI.loading.style.display = 'flex';
  if (UI.loadingText) UI.loadingText.textContent = mensaje;
  disableGenerar(true);
}

function hideLoading() {
  if (UI.loading) UI.loading.style.display = 'none';
  disableGenerar(!currentImageUrl);
}

function disableGenerar(disabled) {
  if (UI.btnGenerar) UI.btnGenerar.disabled = disabled;
}

function showError(mensaje) {
  console.error('Error:', mensaje);
  if (UI.error) {
    UI.error.textContent = mensaje;
    UI.error.style.display = 'block';
  }
}

function hideError() {
  if (UI.error) {
    UI.error.style.display = 'none';
    UI.error.textContent = '';
  }
}

function showSuccess(mensaje) {
  console.log('Success:', mensaje);
  if (UI.success) {
    UI.success.textContent = mensaje;
    UI.success.style.display = 'block';
    setTimeout(() => {
      UI.success.style.display = 'none';
    }, 3000);
  }
}

function hideSuccess() {
  if (UI.success) {
    UI.success.style.display = 'none';
    UI.success.textContent = '';
  }
}
