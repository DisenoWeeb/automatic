// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzvUe0k-BiOUiyapzI_LsFC5Jp_CwlliT1qjjayeIm5VSO5qGcF2uwDlsERQg26PA7frw/exec",
  USER_ID: localStorage.getItem('ig_generator_user') || generarUserId()
};

// Generar ID único para el usuario si no existe
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

// Preview de imagen seleccionada
elementos.file.addEventListener('change', function(e) {
  const file = e.target.files[0];
  
  if (file) {
    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      mostrarError('La imagen es muy grande. Máximo 5MB.');
      return;
    }
    
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = function(e) {
      elementos.preview.src = e.target.result;
      elementos.preview.style.display = 'block';
      elementos.fileLabel.classList.add('has-file');
      elementos.fileLabel.innerHTML = `
        <div>✅ Imagen seleccionada</div>
        <small>${file.name}</small>
      `;
    };
    reader.readAsDataURL(file);
    
    ocultarError();
  }
});

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

async function generar() {
  const file = elementos.file.files[0];
  const texto = elementos.texto.value.trim();
  const tipoNegocio = elementos.tipoNegocio.value;
  const usuarioIG = elementos.usuarioIG.value.trim() || "mitienda";

  // Validaciones
  if (!file) {
    mostrarError('⚠️ Por favor selecciona una imagen');
    return;
  }

  // Mostrar loading
  setLoading(true);
  ocultarError();
  ocultarResultado();

  try {
    // Convertir imagen a base64
    const base64 = await toBase64(file);
    
    // Preparar parámetros para GET
    const params = new URLSearchParams({
      userId: CONFIG.USER_ID,
      image: base64,
      texto: texto,
      tipoNegocio: tipoNegocio,
      usuarioIG: usuarioIG
    });

    const url = `${CONFIG.API_URL}?${params.toString()}`;
    
    console.log('Enviando vía GET...');
    console.log('URL length:', url.length);

    // Si la URL es muy larga, usar POST con no-cors
    if (url.length > 8000) {
      console.log('URL muy larga, usando POST alternativo');
      await enviarPostAlternativo(base64, texto, tipoNegocio, usuarioIG);
      return;
    }

    // Enviar vía GET
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow"
    });

    const data = await res.json();
    console.log('Respuesta:', data);

    if (data.ok) {
      mostrarResultado(data);
      actualizarCreditos(data.creditosRestantes);
    } else {
      throw new Error(data.error || 'Error desconocido');
    }

  } catch (err) {
    console.error('Error:', err);
    mostrarError('❌ ' + err.message);
  } finally {
    setLoading(false);
  }
}

// Alternativa POST si la imagen es muy grande
async function enviarPostAlternativo(base64, texto, tipoNegocio, usuarioIG) {
  // Crear formulario y enviar
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = CONFIG.API_URL;
  form.target = 'hidden-iframe';
  form.style.display = 'none';
  
  const createInput = (name, value) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    return input;
  };
  
  form.appendChild(createInput('userId', CONFIG.USER_ID));
  form.appendChild(createInput('image', base64));
  form.appendChild(createInput('texto', texto));
  form.appendChild(createInput('tipoNegocio', tipoNegocio));
  form.appendChild(createInput('usuarioIG', usuarioIG));
  
  let iframe = document.getElementById('hidden-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.name = 'hidden-iframe';
    iframe.id = 'hidden-iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  
  // Escuchar respuesta
  const checkResponse = setInterval(() => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const body = iframeDoc.body.innerText;
      
      if (body && body.includes('{')) {
        clearInterval(checkResponse);
        const data = JSON.parse(body);
        
        if (data.ok) {
          mostrarResultado(data);
          actualizarCreditos(data.creditosRestantes);
        } else {
          throw new Error(data.error);
        }
        
        setLoading(false);
        form.remove();
      }
    } catch (e) {
      // Todavía no hay respuesta
    }
  }, 500);
  
  setTimeout(() => {
    clearInterval(checkResponse);
    if (elementos.btnGenerar.disabled) {
      setLoading(false);
      mostrarError('⏱️ Tiempo de espera agotado');
    }
  }, 30000);
  
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
  elementos.caption.value = data.caption + '\n\n' + data.hashtags;
  elementos.resultado.classList.add('visible');
  elementos.resultado.scrollIntoView({ behavior: 'smooth' });
}

function ocultarResultado() {
  elementos.resultado.classList.remove('visible');
}

function mostrarError(mensaje) {
  elementos.error.textContent = mensaje;
  elementos.error.classList.add('visible');
}

function ocultarError() {
  elementos.error.classList.remove('visible');
}

function actualizarCreditos(cantidad) {
  elementos.creditos.textContent = cantidad;
  if (cantidad <= 5) {
    elementos.creditos.style.color = '#ff5252';
  }
}

function copiarTexto() {
  const texto = elementos.caption.value;
  
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.querySelector('.btn-copiar');
    const textoOriginal = btn.textContent;
    btn.textContent = '✅ ¡Copiado!';
    btn.style.background = '#45a049';
    
    setTimeout(() => {
      btn.textContent = textoOriginal;
      btn.style.background = '#4caf50';
    }, 2000);
  }).catch(() => {
    elementos.caption.select();
    document.execCommand('copy');
    alert('Texto copiado');
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
