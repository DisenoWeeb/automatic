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

elementos.file.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    mostrarError('La imagen es muy grande. Máximo 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    elementos.preview.src = e.target.result;
    elementos.preview.style.display = 'block';
    elementos.fileLabel.classList.add('has-file');
    elementos.fileLabel.innerHTML = `<div>✅ Imagen seleccionada</div><small>${file.name}</small>`;
  };
  reader.readAsDataURL(file);
  ocultarError();
});

// Drag & Drop
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

// ============================================
// FUNCIÓN PRINCIPAL
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

    // Enviar al server
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: CONFIG.USER_ID,
        image: base64,
        texto,
        tipoNegocio,
        usuarioIG
      })
    });

    const data = await response.json();

    if (data.ok) {
      mostrarResultado(data);
      actualizarCreditos(data.creditosRestantes);
    } else {
      throw new Error(data.error || 'Error del servidor');
    }

  } catch (err) {
    console.error('Error generando post:', err);
    mostrarError('❌ ' + err.message);
  } finally {
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
  elementos.caption.textContent = data.caption + '\n\n' + data.hashtags;
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
  elementos.creditos.style.color = cantidad <= 5 ? '#ff5252' : '';
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
    elementos.caption.select();
    document.execCommand('copy');
  });
}

// ============================================
// BOTÓN GENERAR
// ============================================
elementos.btnGenerar.addEventListener('click', generar);
