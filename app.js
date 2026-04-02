// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzvUe0k-BiOUiyapzI_LsFC5Jp_CwlliT1qjjayeIm5VSO5qGcF2uwDlsERQg26PA7frw/exec",
  USER_ID: localStorage.getItem('ig_generator_user') || generarUserId()
};

function generarUserId() {
  const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('ig_generator_user', id);
  return id;
}

// ============================================
// ELEMENTOS DEL DOM
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
  console.log('App lista. User ID:', CONFIG.USER_ID);
  // Cargar créditos al iniciar
  verificarCreditos();
});

elementos.file.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    mostrarError('La imagen es muy grande. Máximo 5MB.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    elementos.preview.src = e.target.result;
    elementos.preview.style.display = 'block';
    elementos.fileLabel.classList.add('has-file');
    elementos.fileLabel.innerHTML = `<div>✅ Imagen seleccionada</div><small>${file.name}</small>`;
  };
  reader.readAsDataURL(file);
  ocultarError();
});

// ============================================
// FUNCIÓN PRINCIPAL - IFRAME CORREGIDO
// ============================================
async function generar() {
  const file = elementos.file.files[0];
  const texto = elementos.texto.value.trim();
  const tipoNegocio = elementos.tipoNegocio.value;
  const usuarioIG = elementos.usuarioIG.value.trim() || "mitienda";

  if (!file) {
    mostrarError('⚠️ Por favor selecciona una imagen');
    return;
  }

  setLoading(true);
  ocultarError();
  ocultarResultado();

  try {
    const base64 = await toBase64(file);
    const requestId = 'req_' + Date.now();
    
    // Crear iframe PRIMERO
    const iframe = document.createElement('iframe');
    iframe.name = requestId;
    iframe.id = requestId;
    iframe.style.display = 'none';
    
    // Crear formulario que apunte al iframe
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = CONFIG.API_URL;
    form.target = requestId;
    form.style.display = 'none';
    
    // Campos del formulario
    const campos = {
      userId: CONFIG.USER_ID,
      image: base64,
      texto: texto,
      tipoNegocio: tipoNegocio,
      usuarioIG: usuarioIG
    };
    
    Object.keys(campos).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = campos[key];
      form.appendChild(input);
    });
    
    // Variable para controlar si se procesó la respuesta
    let procesado = false;
    
    // Definir onload UNA SOLA VEZ
    iframe.onload = function() {
      if (procesado) return; // Evitar doble ejecución
      procesado = true;
      
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const bodyText = iframeDoc.body ? (iframeDoc.body.innerText || iframeDoc.body.textContent || '') : '';
        
        console.log('Respuesta raw:', bodyText.substring(0, 500));
        
        if (!bodyText || bodyText.trim() === '') {
          throw new Error('Respuesta vacía del servidor');
        }
        
        // Intentar parsear JSON directamente
        let data;
        try {
          data = JSON.parse(bodyText);
        } catch (e) {
          // Buscar JSON en la respuesta (por si hay HTML alrededor)
          const jsonMatch = bodyText.match(/\{[\s\S]*"ok"\s*:[\s\S]*\}/);
          if (jsonMatch) {
            try {
              data = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              throw new Error('No se pudo parsear la respuesta JSON');
            }
          } else {
            // Si no hay JSON, mostrar parte de la respuesta para debug
            const preview = bodyText.substring(0, 200).replace(/<[^>]*>/g, '');
            throw new Error('Respuesta no válida. Preview: ' + preview);
          }
        }
        
        if (data.ok) {
          mostrarResultado(data);
          actualizarCreditos(data.creditosRestantes);
        } else {
          throw new Error(data.error || 'Error del servidor');
        }
        
      } catch (err) {
        console.error('Error procesando respuesta:', err);
        mostrarError('❌ ' + err.message);
        setLoading(false);
      } finally {
        // Limpiar DOM después de un momento
        setTimeout(() => {
          if (form.parentNode) form.remove();
          if (iframe.parentNode) iframe.remove();
        }, 1000);
      }
    };
    
    // Manejar errores del iframe
    iframe.onerror = function() {
      if (procesado) return;
      procesado = true;
      mostrarError('❌ Error de conexión con el servidor');
      setLoading(false);
      form.remove();
      iframe.remove();
    };
    
    // Timeout de seguridad
    const timeout = setTimeout(() => {
      if (!procesado) {
        procesado = true;
        mostrarError('⏱️ Tiempo de espera agotado (30s). Intentá de nuevo.');
        setLoading(false);
        try { form.remove(); } catch(e) {}
        try { iframe.remove(); } catch(e) {}
      }
    }, 30000);
    
    // Agregar al DOM y enviar
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    
    console.log('Enviando formulario...');
    form.submit();
    
  } catch (err) {
    console.error('Error en generar():', err);
    mostrarError('❌ ' + err.message);
    setLoading(false);
  }
}

// ============================================
// VERIFICAR CRÉDITOS AL CARGAR
// ============================================
function verificarCreditos() {
  const requestId = 'req_creditos_' + Date.now();
  
  const iframe = document.createElement('iframe');
  iframe.name = requestId;
  iframe.style.display = 'none';
  
  const form = document.createElement('form');
  form.method = 'GET'; // GET para consulta
  form.action = CONFIG.API_URL + '?action=creditos&userId=' + encodeURIComponent(CONFIG.USER_ID);
  form.target = requestId;
  form.style.display = 'none';
  
  let procesado = false;
  
  iframe.onload = function() {
    if (procesado) return;
    procesado = true;
    
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const bodyText = iframeDoc.body ? (iframeDoc.body.innerText || '') : '';
      
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch (e) {
        const jsonMatch = bodyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      }
      
      if (data && data.ok) {
        actualizarCreditos(data.creditosDisponibles);
      }
    } catch (e) {
      console.log('No se pudo cargar créditos iniciales');
    }
    
    setTimeout(() => {
      form.remove();
      iframe.remove();
    }, 500);
  };
  
  document.body.appendChild(iframe);
  document.body.appendChild(form);
  form.submit();
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
  setLoading(false);
}

function ocultarResultado() {
  elementos.resultado.classList.remove('visible');
}

function mostrarError(mensaje) {
  elementos.error.textContent = mensaje;
  elementos.error.classList.add('visible');
  setLoading(false);
}

function ocultarError() {
  elementos.error.classList.remove('visible');
}

function actualizarCreditos(cantidad) {
  elementos.creditos.textContent = cantidad;
  if (cantidad <= 5) {
    elementos.creditos.style.color = '#ff5252';
  } else {
    elementos.creditos.style.color = '';
  }
}

function copiarTexto() {
  const texto = elementos.caption.textContent;
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.querySelector('.btn-copiar');
    btn.textContent = '✅ ¡Copiado!';
    btn.style.background = '#45a049';
    setTimeout(() => {
      btn.textContent = '📋 Copiar texto';
      btn.style.background = '#4caf50';
    }, 2000);
  }).catch(() => {
    // Fallback
    const range = document.createRange();
    range.selectNode(elementos.caption);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
  });
}

// Drag and drop
const dropZone = elementos.fileLabel;
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#667eea';
  dropZone.style.background = '#f0f0ff';
});
dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#ddd';
  dropZone.style.background = '#fafafa';
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#ddd';
  dropZone.style.background = '#fafafa';
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    elementos.file.files = files;
    elementos.file.dispatchEvent(new Event('change'));
  }
});
