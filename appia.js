(function () {
  'use strict';

  let selectedType = 'post';
  let selectedTone = 'profesional';
  let ultimoResultado = null;

  const API_URL = (window.CONFIG && window.CONFIG.API_URL) || (window.API_URL || '');
  const DEFAULT_USER_ID =
    localStorage.getItem('userId') ||
    localStorage.getItem('demoUserId') ||
    'demo-user';

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function jsonpRequest(url, params = {}, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      const script = document.createElement('script');
      const query = new URLSearchParams({
        ...params,
        callback: callbackName,
        _: Date.now()
      });

      let finished = false;

      function cleanup() {
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      }

      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error('Tiempo de espera agotado'));
      }, timeout);

      window[callbackName] = function (data) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error('No se pudo conectar con el backend'));
      };

      script.src = url + (url.includes('?') ? '&' : '?') + query.toString();
      document.body.appendChild(script);
    });
  }

  function mostrarResultPanel() {
    $('editPanel')?.classList.add('u-hidden');
    $('resultPanel')?.classList.remove('u-hidden');

    if ($('iaLoading')) $('iaLoading').style.display = 'flex';
    $('iaReady')?.classList.add('u-hidden');
    $('iaError')?.classList.add('u-hidden');
  }

  function volverAEditar() {
    $('editPanel')?.classList.remove('u-hidden');
    $('resultPanel')?.classList.add('u-hidden');
    ultimoResultado = null;
  }

  function mostrarResultados(r) {
    if ($('iaLoading')) $('iaLoading').style.display = 'none';
    $('iaReady')?.classList.remove('u-hidden');
    $('iaError')?.classList.add('u-hidden');

    if ($('outCaption')) $('outCaption').textContent = r.caption || '';
    if ($('outHashtags')) $('outHashtags').textContent = r.hashtags || '';
    if ($('outTip')) $('outTip').textContent = r.tip_extra ? 'Sugerencia: ' + r.tip_extra : '';
    if ($('outHorario')) $('outHorario').textContent = r.horario || '';

    ultimoResultado = r;
  }

  function mostrarError(msg) {
    if ($('iaLoading')) $('iaLoading').style.display = 'none';
    $('iaReady')?.classList.add('u-hidden');
    $('iaError')?.classList.remove('u-hidden');

    if ($('iaErrorMsg')) {
      $('iaErrorMsg').innerHTML = '<strong>Error:</strong> ' + escapeHtml(msg);
    }
  }

  function copiarTodo() {
    if (!ultimoResultado) return;

    const r = ultimoResultado;
    const texto = [
      r.caption?.trim(),
      r.hashtags?.trim()
    ].filter(Boolean).join('\n\n');

    if (!texto) return;

    const btn = $('btnCopyAll');

    navigator.clipboard.writeText(texto).then(() => {
      if (btn) {
        btn.textContent = '✓ Copiado';
        btn.classList.add('copied');

        setTimeout(() => {
          btn.textContent = 'Copiar texto';
          btn.classList.remove('copied');
        }, 1800);
      }
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();

      try {
        document.execCommand('copy');
        if (btn) {
          btn.textContent = '✓ Copiado';
          btn.classList.add('copied');

          setTimeout(() => {
            btn.textContent = 'Copiar texto';
            btn.classList.remove('copied');
          }, 1800);
        }
      } catch (_) {
        alert('No se pudo copiar');
      }

      document.body.removeChild(ta);
    });
  }

  async function generarContenido() {
    if (!API_URL) {
      mostrarError('Falta configurar API_URL');
      return;
    }

    const userId = DEFAULT_USER_ID;
    const titulo = ($('titulo')?.value || '').trim() || 'Contenido generado';
    const descripcion = ($('videoDesc')?.value || '').trim();
    const ciudad = ($('ciudad')?.value || '').trim() || 'Paraná';

    if (!descripcion) {
      mostrarError('Falta la descripción del contenido.');
      return;
    }

    try {
      const res = await jsonpRequest(API_URL, {
        action: 'generarContenido',
        userId,
        titulo,
        descripcion,
        formato: selectedType,
        tono: selectedTone,
        ciudad
      });

      if (!res || !res.success) {
        throw new Error(res?.error || 'No se pudo generar el contenido');
      }

      mostrarResultados(res.data);

    } catch (err) {
      mostrarError(err.message || 'Error inesperado');
    }
  }

  function initSelectors() {
    document.querySelectorAll('.chip[data-type]').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-type]').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        selectedType = el.dataset.type;
      });
    });

    document.querySelectorAll('.tone-btn[data-tone]').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.tone-btn[data-tone]').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        selectedTone = el.dataset.tone;
      });
    });
  }

  function initActions() {
    $('btnGenerar')?.addEventListener('click', () => {
      mostrarResultPanel();
      generarContenido();
    });

    $('btnNuevo')?.addEventListener('click', volverAEditar);
    $('btnCopyAll')?.addEventListener('click', copiarTodo);

    $('btnDescargar')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('piper:descargar'));
    });

    $('btnCompartir')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('piper:compartir'));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSelectors();
    initActions();
  });
})();
