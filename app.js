// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  // Tu URL de Apps Script (la misma de antes)
  API_URL: "https://script.google.com/macros/s/AKfycbzvUe0k-BiOUiyapzI_LsFC5Jp_CwlliT1qjjayeIm5VSO5qGcF2uwDlsERQg26PA7frw/exec",
  
  // Cloudinary config (pública, no hay problema mostrarla)
  CLOUDINARY_CLOUD: "dwgwbdtud",
  CLOUDINARY_PRESET: "web_upload",
  
  USER_ID: localStorage.getItem('ig_generator_user') || generarUserId()
};

function generarUserId() {
  const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('ig_generator_user', id);
  return id;
}

// ============================================
// ELEMENTOS DOM
// ============================================
const elementos = {
  file: document.getElementById('file'),
  fileLabel: document.getElementById('fileLabel'),
  preview: document.getElementById('preview'),
  texto: document.getElementById('texto'),
  tipoNegocio: document.getElementById('tipoNegocio'),
  usuarioIG: document.getElementById('usuarioIG'),
  btnGenerar: document.getElementById('btnGenerar'),
  loading: document.getElementById('loading'),
  resultado: document.getElementById('resultado'),
  error: document.getElementById('error'),
  imagenFinal: document.getElementById('imagenFinal'),
  caption: document.getElementById('caption'),
  creditos: document.getElementById('creditos')
};

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('App lista. User:', CONFIG.USER_ID);
  verificarCreditos();
});

elementos.file.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 10 * 1024 * 1024) {
    mostrarError('La imagen es muy grande. Máximo 10MB.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    elementos.preview.src = e.target.result;
    elementos.preview.style.display = 'block';
    elementos.fileLabel.classList.add('has-file');
    elementos.fileLabel.innerHTML = `<div>✅ ${file.name}</div><small>${(file.size/1024/1024).toFixed(2)} MB</small>`;
  };
  reader.readAsDataURL(file);
  ocultarError();
});

// ============================================
// FUNCIÓN PRINCIPAL: Subir a Cloudinary → Procesar en Apps Script
// ============================================
async function generar() {
  const file = elementos.file.files[0];
  const texto = elementos.texto.value.trim();
  const tipoNegocio = elementos.tipoNegocio.value;
  const usuarioIG = elementos.usuarioIG.value.trim() || "mitienda";

  if (!file) {
    mostrarError('⚠️ Seleccioná una imagen');
    return;
  }

  setLoading(true);
  ocultarError();
  ocultarResultado();

  try {
    // PASO 1: Subir imagen a Cloudinary directamente
    console.log('📤 Subiendo a Cloudinary...');
    const cloudinaryData = await subirACloudinary(file);
    console.log('✅ Cloudinary URL:', cloudinaryData.secure_url);
    
    // PASO 2: Llamar a Apps Script con la URL (GET, no POST, no base64)
    console.log('🤖 Procesando en Apps Script...');
    const resultado = await procesarEnAppsScript({
      userId: CONFIG.USER_ID,
      imageUrl: cloudinaryData.secure_url,
      publicId: cloudinaryData.public_id,
      texto: texto,
      tipoNegocio: tipoNegocio,
      usuarioIG: usuarioIG
    });
    
    // Mostrar resultado
    if (resultado.ok) {
      mostrarResultado(resultado);
      actualizarCreditos(resultado.creditosRestantes);
    } else {
      throw new Error(resultado.error || 'Error del servidor');
    }
    
  } catch (err) {
    console.error('Error:', err);
    mostrarError('❌ ' + err.message);
  } finally {
    setLoading(false);
  }
}

// ============================================
// PASO 1: Subir archivo a Cloudinary (Unsigned Upload)
// ============================================
async function subirACloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD}/image/upload`;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CONFIG.CLOUDINARY_PRESET);
  formData.append('folder', 'instagram_generator');
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error('Error subiendo a Cloudinary: ' + error);
  }
  
  return await response.json();
}

// ============================================
// PASO 2: Procesar en Apps Script (JSONP - FUNCIONA!)
// ============================================
async function procesarEnAppsScript(datos) {
  // Construir URL con parámetros
  const params = new URLSearchParams({
    action: 'generar',
    userId: datos.userId,
    imageUrl: datos.imageUrl,
    publicId: datos.publicId,
    texto: datos.texto,
    tipoNegocio: datos.tipoNegocio,
    usuarioIG: datos.usuarioIG
  });
  
  const url = `${CONFIG.API_URL}?${params.toString()}`;
  console.log('📡 Llamando a:', url.substring(0, 100) + '...');
  
  // Usar JSONP (funciona con CORS)
  return new Promise((resolve, reject) => {
    const callbackName = 'ig_cb_' + Date.now();
    const script = document.createElement('script');
    
    script.src = url + '&callback=' + callbackName;
    
    // Timeout de seguridad
    const timeout = setTimeout(() => {
      reject(new Error('Timeout - el servidor no respondió a tiempo'));
      cleanup();
    }, 30000);
    
    // Callback global que ejecutará Apps Script
    window[callbackName] = function(data) {
      clearTimeout(timeout);
      console.log('✅ Respuesta Apps Script:', data);
      resolve(data);
      cleanup();
    };
    
    // Error de carga
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Error de conexión con el servidor'));
      cleanup();
    };
    
    // Limpiar
    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    }
    
    document.head.appendChild(script);
  });
}

// ============================================
// VERIFICAR CRÉDITOS (JSONP)
// ============================================
function verificarCreditos() {
  const callbackName = 'creditos_cb_' + Date.now();
  const script = document.createElement('script');
  
  script.src = `${CONFIG.API_URL}?action=creditos&userId=${encodeURIComponent(CONFIG.USER_ID)}&callback=${callbackName}`;
  
  window[callbackName] = function(data) {
    if (data && data.ok) {
      actualizarCreditos(data.creditosDisponibles);
      console.log('💰 Créditos:', data.creditosDisponibles);
    }
    delete window[callbackName];
    if (script.parentNode) script.parentNode.removeChild(script);
  };
  
  script.onerror = () => {
    console.log('No se pudo cargar créditos');
    delete window[callbackName];
  };
  
  document.head.appendChild(script);
}
// ============================================
// FUNCIONES AUXILIARES
// ============================================
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function setLoading(loading) {
  elementos.btnGenerar.disabled = loading;
  elementos.loading.classList.toggle('visible', loading);
  elementos.btnGenerar.textContent = loading ? 'GENERANDO...' : 'GENERAR POST';
}

function mostrarResultado(data) {
  elementos.imagenFinal.src = data.image;
  elementos.caption.textContent = data.caption + '\n\n' + data.hashtags;
  elementos.resultado.classList.add('visible');
  elementos.resultado.scrollIntoView({ behavior: 'smooth' });
}

function ocultarResultado() {
  elementos.resultado.classList.remove('visible');
}

function mostrarError(mensaje) {
  elementos.error.innerHTML = mensaje;
  elementos.error.classList.add('visible');
  setLoading(false);
}

function ocultarError() {
  elementos.error.classList.remove('visible');
}

function actualizarCreditos(cantidad) {
  elementos.creditos.textContent = cantidad;
  elementos.creditos.style.color = cantidad <= 5 ? '#ff5252' : '';
}

function copiarTexto() {
  const texto = elementos.caption.textContent;
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.querySelector('.btn-copiar');
    const original = btn.textContent;
    btn.textContent = '✅ ¡Copiado!';
    setTimeout(() => btn.textContent = original, 2000);
  });
}

// Drag and drop
const dropZone = elementos.fileLabel;
['dragover', 'dragleave', 'drop'].forEach(event => {
  dropZone.addEventListener(event, (e) => {
    e.preventDefault();
    if (event === 'dragover') {
      dropZone.style.cssText = 'border-color: #667eea; background: #f0f0ff;';
    } else if (event === 'dragleave') {
      dropZone.style.cssText = '';
    } else {
      dropZone.style.cssText = '';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        elementos.file.files = files;
        elementos.file.dispatchEvent(new Event('change'));
      }
    }
  });
});
