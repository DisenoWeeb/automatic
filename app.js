// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzVWvluMf1eiPO6wRXTfo9iEEOKGJQJEp8kEKHhv29Y-N-Hh6pO5pObv4ESbjRyTY2exA/exec',
  CLOUDINARY_CLOUD: 'dwgwbdtud',
  CLOUDINARY_UPLOAD_PRESET: 'web_upload',
  DEFAULT_IG_USER: 'drabruzera',
  MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
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
document.addEventListener('DOMContentLoaded', function() {
  initUser();
  initEventListeners();
  loadCreditos();
});

function initUser() {
  userId = localStorage.getItem('ig_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('ig_user_id', userId);
  }
  console.log('User ID:', userId);
}

function initEventListeners() {
  // Upload de imagen
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  if (dropZone) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    });
  }
  
  // Botón generar
  const btnGenerar = document.getElementById('btnGenerar');
  if (btnGenerar) {
    btnGenerar.addEventListener('click', generarContenido);
  }
  
  // Copiar caption
  const btnCopiar = document.getElementById('btnCopiar');
  if (btnCopiar) {
    btnCopiar.addEventListener('click', copiarCaption);
  }
  
  // Descargar imagen
  const btnDescargar = document.getElementById('btnDescargar');
  if (btnDescargar) {
    btnDescargar.addEventListener('click', descargarImagen);
  }
}

// ============================================
// MANEJO DE ARCHIVOS
// ============================================
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    processFile(file);
  }
}

function processFile(file) {
  // Validaciones
  if (!file.type.startsWith('image/')) {
    showError('Por favor selecciona una imagen válida');
    return;
  }
  
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showError('La imagen no debe superar los 10MB');
    return;
  }
  
  // Mostrar preview
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('preview');
    const dropZone = document.getElementById('dropZone');
    
    if (preview) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
    
    if (dropZone) {
      dropZone.classList.add('has-image');
    }
    
    // Subir a Cloudinary
    uploadToCloudinary(file);
  };
  reader.readAsDataURL(file);
}

// ============================================
// CLOUDINARY UPLOAD
// ============================================
async function uploadToCloudinary(file) {
  showLoading('Subiendo imagen...');
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'instagram_generator');
  
  try {
    console.log('📤 Subiendo a Cloudinary...');
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Error en upload: ' + response.status);
    }
    
    const data = await response.json();
    console.log('✅ Cloudinary URL:', data.secure_url);
    console.log('✅ Public ID:', data.public_id);
    
    currentImageUrl = data.secure_url;
    currentPublicId = data.public_id;
    
    hideLoading();
    showSuccess('Imagen lista para procesar');
    
    // Habilitar botón generar
    const btnGenerar = document.getElementById('btnGenerar');
    if (btnGenerar) {
      btnGenerar.disabled = false;
    }
    
  } catch (error) {
    console.error('Error Cloudinary:', error);
    hideLoading();
    showError('Error al subir imagen: ' + error.message);
  }
}

// ============================================
// APPS SCRIPT - CRÉDITOS
// ============================================
function loadCreditos() {
  console.log('💳 Cargando créditos...');
  
  const script = document.createElement('script');
  const callbackName = 'creditosCallback_' + Date.now();
  
  const params = new URLSearchParams({
    action: 'creditos',
    userId: userId,
    callback: callbackName
  });
  
  window[callbackName] = function(response) {
    console.log('Respuesta créditos:', response);
    
    if (response && response.ok) {
      updateCreditosUI(response.creditosDisponibles);
    } else {
      console.error('Error créditos:', response?.error);
      updateCreditosUI('?');
    }
    
    cleanupScript(script, callbackName);
  };
  
  script.onerror = function() {
    console.error('Error de conexión al cargar créditos');
    updateCreditosUI('?');
    cleanupScript(script, callbackName);
  };
  
  script.src = `${CONFIG.SCRIPT_URL}?${params.toString()}`;
  document.head.appendChild(script);
}

function updateCreditosUI(cantidad) {
  const el = document.getElementById('creditos');
  if (el) {
    el.textContent = cantidad;
  }
}

// ============================================
// APPS SCRIPT - GENERAR CONTENIDO
// ============================================
async function generarContenido() {
  if (!currentImageUrl) {
    showError('Primero sube una imagen');
    return;
  }
  
  const texto = document.getElementById('texto')?.value || '';
  const tipoNegocio = document.getElementById('tipoNegocio')?.value || 'general';
  const usuarioIG = document.getElementById('usuarioIG')?.value || CONFIG.DEFAULT_IG_USER;
  
  showLoading('Generando contenido con IA...');
  
  try {
    const resultado = await llamarAppsScript('generar', {
      imageUrl: currentImageUrl,
      publicId: currentPublicId,
      texto: texto,
      tipoNegocio: tipoNegocio,
      usuarioIG: usuarioIG
    });
    
    console.log('✅ Resultado:', resultado);
    
    // Mostrar resultados
    mostrarResultado(resultado);
    
    // Actualizar créditos
    if (resultado.creditosRestantes !== undefined) {
      updateCreditosUI(resultado.creditosRestantes);
    }
    
    hideLoading();
    
  } catch (error) {
    console.error('Error generación:', error);
    hideLoading();
    showError('Error: ' + error.message);
  }
}

function llamarAppsScript(action, params) {
  return new Promise((resolve, reject) => {
    const callbackName = 'igCallback_' + Date.now();
    const timeout = setTimeout(() => {
      cleanupScript(script, callbackName);
      reject(new Error('Timeout del servidor (30s)'));
    }, 30000);
    
    const script = document.createElement('script');
    
    const allParams = new URLSearchParams({
      action: action,
      userId: userId,
      callback: callbackName,
      ...params
    });
    
    window[callbackName] = function(response) {
      clearTimeout(timeout);
      cleanupScript(script, callbackName);
      
      console.log('Respuesta Apps Script:', response);
      
      if (response && response.ok) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Error desconocido del servidor'));
      }
    };
    
    script.onerror = function() {
      clearTimeout(timeout);
      cleanupScript(script, callbackName);
      reject(new Error('Error de conexión con el servidor'));
    };
    
    const url = `${CONFIG.SCRIPT_URL}?${allParams.toString()}`;
    console.log('📡 Llamando a:', url);
    script.src = url;
    document.head.appendChild(script);
  });
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
  // Imagen final
  const imgFinal = document.getElementById('imgFinal');
  if (imgFinal && data.image) {
    imgFinal.src = data.image;
    imgFinal.style.display = 'block';
  }
  
  // Caption
  const captionText = document.getElementById('captionText');
  if (captionText) {
    captionText.value = data.caption + '\n\n' + data.hashtags;
  }
  
  // Frase
  const fraseText = document.getElementById('fraseText');
  if (fraseText) {
    fraseText.textContent = data.frase;
  }
  
  // Mostrar sección resultado
  const resultado = document.getElementById('resultado');
  if (resultado) {
    resultado.style.display = 'block';
    resultado.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Guardar URL para descarga
  currentImageUrl = data.image;
}

// ============================================
// ACCIONES
// ============================================
function copiarCaption() {
  const captionText = document.getElementById('captionText');
  if (captionText) {
    captionText.select();
    document.execCommand('copy');
    showSuccess('Caption copiado al portapapeles');
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
    // Fallback: abrir en nueva pestaña
    window.open(currentImageUrl, '_blank');
  }
}

// ============================================
// UI HELPERS
// ============================================
function showLoading(mensaje) {
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  
  if (loading) loading.style.display = 'flex';
  if (loadingText) loadingText.textContent = mensaje;
  
  const btnGenerar = document.getElementById('btnGenerar');
  if (btnGenerar) btnGenerar.disabled = true;
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  
  const btnGenerar = document.getElementById('btnGenerar');
  if (btnGenerar) btnGenerar.disabled = false;
}

function showError(mensaje) {
  console.error('Error:', mensaje);
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
  alert('Error: ' + mensaje);
}

function showSuccess(mensaje) {
  console.log('Success:', mensaje);
  const successDiv = document.getElementById('success');
  if (successDiv) {
    successDiv.textContent = mensaje;
    successDiv.style.display = 'block';
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  }
}
