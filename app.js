const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxYDuT215tlMq4W_jXVFPZqhjkp9GsQX2ymNtPQoyqYppxkYZ_oTPPoTB1sVS_4w3dcRA/exec'
};

function $(id) {
  return document.getElementById(id);
}

const UI = {
  prompt: $('prompt'),
  btnGenerar: $('btnGenerar'),
  loading: $('loading'),
  error: $('error'),
  resultado: $('resultado'),
  imgFinal: $('imgFinal'),
  promptUsado: $('promptUsado')
};

document.addEventListener('DOMContentLoaded', () => {
  if (UI.btnGenerar) {
    UI.btnGenerar.addEventListener('click', generarImagen);
  }
});

async function generarImagen() {
  const prompt = UI.prompt ? UI.prompt.value.trim() : '';

  if (!prompt) {
    showError('Escribí un prompt');
    return;
  }

  hideError();
  showLoading(true);
  hideResultado();

  try {
    const data = await jsonpRequest('generar', { prompt }, 120000);

    if (!data.image) {
      throw new Error('No se recibió imagen');
    }

    if (UI.imgFinal) {
      UI.imgFinal.onload = function () {
        showLoading(false);
      };

      UI.imgFinal.onerror = function () {
        showLoading(false);
        showError('No se pudo cargar la imagen generada');
      };

      UI.imgFinal.src = data.image;
      UI.imgFinal.style.display = 'block';
    }

    if (UI.promptUsado) {
      UI.promptUsado.textContent = 'Prompt usado: ' + (data.promptUsado || prompt);
    }

    showResultado();

  } catch (error) {
    showLoading(false);
    showError(error.message || 'Error al generar');
    console.error(error);
  }
}

function jsonpRequest(action, params = {}, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const script = document.createElement('script');
    let timeout = null;

    if (timeoutMs > 0) {
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
      if (timeout) clearTimeout(timeout);
      cleanupScript(script, callbackName);
      reject(new Error('Error de conexión con Apps Script'));
    };

    const allParams = new URLSearchParams({
      action,
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
    try {
      delete window[callbackName];
    } catch (e) {
      window[callbackName] = undefined;
    }
  }
}

function showLoading(show) {
  if (!UI.loading) return;
  UI.loading.style.display = show ? 'block' : 'none';
}

function showError(message) {
  if (!UI.error) return;
  UI.error.textContent = message;
  UI.error.style.display = 'block';
}

function hideError() {
  if (!UI.error) return;
  UI.error.textContent = '';
  UI.error.style.display = 'none';
}

function showResultado() {
  if (!UI.resultado) return;
  UI.resultado.style.display = 'block';
}

function hideResultado() {
  if (!UI.resultado) return;
  UI.resultado.style.display = 'none';
}
