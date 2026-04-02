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
// FUNCIÓN PRINCIPAL - USAR IFRAME PARA EVITAR CORS
// ============================================
async function generar() {
  const file = elementos.file.files[0];
  const texto = elementos.texto.value.trim();
  const tipoNegocio = elementos.tipoNegocio.value;
  const usuarioIG = elementos.usuarioIG.value.trim() || "mitienda";

  if (!file) return mostrarError('⚠️ Por favor selecciona una imagen');

  setLoading(true);
  ocultarError();
  ocultarResultado();

  try {
    const base64 = await toBase64(file);

    const requestId = 'req_' + Date.now();
    const callbackName = 'callback_' + requestId;

    // Crear formulario oculto
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = CONFIG.API_URL;
    form.target = requestId;
    form.style.display = 'none';

    // Campos del formulario
    const campos = { userId: CONFIG.USER_ID, image: base64, texto, tipoNegocio, usuarioIG, callback: callbackName };
    Object.keys(campos).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = campos[key];
      form.appendChild(input);
    });

    // Crear iframe para recibir respuesta
    const iframe = document.createElement('iframe');
    iframe.name = requestId;
    iframe.id = requestId;
    iframe.style.display = 'none';

    // Append antes de submit
    document.body.appendChild(form);
    document.body.appendChild(iframe);

    // Manejar respuesta
    iframe.onload = function () {
      try {
        const bodyText = iframe.contentDocument.body.innerText || iframe.contentDocument.body.textContent;
        let data;
        try { data = JSON.parse(bodyText); } 
        catch (e) {
          const jsonMatch = bodyText.match(/\{[\s\S]*\}/);
          if (jsonMatch) data = JSON.parse(jsonMatch[0]);
          else throw new Error('Respuesta no válida');
        }

        if (data.ok) {
          mostrarResultado(data);
          actualizarCreditos(data.creditosRestantes);
        } else {
          throw new Error(data.error || 'Error del servidor');
        }

        setTimeout(() => { form.remove(); iframe.remove(); }, 1000);

      } catch (err) {
        console.error('Error procesando respuesta:', err);
        mostrarError('❌ Error: ' + err.message);
        setLoading(false);
        form.remove(); iframe.remove();
      }
    };

    iframe.onerror = function () {
      mostrarError('❌ Error de conexión');
      setLoading(false);
      form.remove(); iframe.remove();
    };

    // Timeout de seguridad
    setTimeout(() => {
      if (elementos.btnGenerar.disabled) {
        mostrarError('⏱️ Tiempo de espera agotado. Intentá de nuevo.');
        setLoading(false);
        form.remove(); iframe.remove();
      }
    }, 30000);

    // Finalmente submit
    form.submit();

  } catch (err) {
    mostrarError('❌ Error inesperado: ' + err.message);
    setLoading(false);
  }
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
  }
}

function copiarTexto() {
  const texto = elementos.caption.value;
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.querySelector('.btn-copiar');
    btn.textContent = '✅ ¡Copiado!';
    btn.style.background = '#45a049';
    setTimeout(() => {
      btn.textContent = '📋 Copiar texto';
      btn.style.background = '#4caf50';
    }, 2000);
  }).catch(() => {
    elementos.caption.select();
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
