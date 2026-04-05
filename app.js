/* =========================
   DRA. BRUZERA - app.js
   Frontend sin IA
   ========================= */

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyVS35VZ8GmXFUsq787A23ec74wnYKhK07_eRO7BQp5zVT_Jv_DJijt41VHthVXbZzdVQ/exec',
  STORAGE_USER_ID: 'dra_bruzera_user_id',
  STORAGE_HISTORY: 'dra_bruzera_history',
   CLOUDINARY_CLOUD_NAME: 'dwgwbdtud',
  CLOUDINARY_UPLOAD_PRESET: 'dra_bruzera_unsigned',
   CLOUDINARY_FOLDER: 'dra_bruzera',
   IMAGE_MODE: 'smart', // smart | safe_pad | face | contain
  OUTPUT_WIDTH: 1080,
  OUTPUT_HEIGHT: 1350,
  CREDITOS_IMAGEN: 1,
  CREDITOS_VIDEO: 4
};

const App = {
  state: {
    userId: null,
    mainImageData: null,
    logoImageData: null,
    generatedImage: null
  },

  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
    this.ensureUserId();
    this.initUserOnBackend();
    this.renderLocalHistory();
  },

  cacheElements() {
    this.elements = {
      mainImageInput: document.getElementById('mainImage'),
      logoImageInput: document.getElementById('logoImage'),

      titulo: document.getElementById('titulo'),
      texto: document.getElementById('texto'),
      instagram: document.getElementById('instagram'),
      web: document.getElementById('web'),
      whatsapp: document.getElementById('whatsapp'),
      ubicacion: document.getElementById('ubicacion'),

      previewMain: document.getElementById('previewMain'),
      previewLogo: document.getElementById('previewLogo'),

      btnGenerar: document.getElementById('btnGenerar'),
      btnDescargar: document.getElementById('btnDescargar'),
      btnCompartir: document.getElementById('btnCompartir'),

      loader: document.getElementById('loader'),
      loaderText: document.getElementById('loaderText'),

      resultSection: document.getElementById('resultSection'),
      resultImage: document.getElementById('resultImage'),

      historyList: document.getElementById('historyList'),
      userIdBox: document.getElementById('userIdBox')
    };
  },

  bindEvents() {
    const e = this.elements;

    if (e.mainImageInput) {
      e.mainImageInput.addEventListener('change', async (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;

        try {
          const dataUrl = await this.fileToDataURL(file);
          this.state.mainImageData = dataUrl;
          if (e.previewMain) e.previewMain.src = dataUrl;
        } catch (err) {
          console.error(err);
          this.showError('No se pudo leer la imagen principal');
        }
      });
    }

    if (e.logoImageInput) {
      e.logoImageInput.addEventListener('change', async (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;

        try {
          const dataUrl = await this.fileToDataURL(file);
          this.state.logoImageData = dataUrl;
          if (e.previewLogo) e.previewLogo.src = dataUrl;
        } catch (err) {
          console.error(err);
          this.showError('No se pudo leer el logo');
        }
      });
    }

    if (e.btnGenerar) {
      e.btnGenerar.addEventListener('click', () => this.generarFlyer());
    }

    if (e.btnDescargar) {
      e.btnDescargar.addEventListener('click', () => this.descargarImagen());
    }

    if (e.btnCompartir) {
      e.btnCompartir.addEventListener('click', () => this.compartirImagen());
    }
  },

  ensureUserId() {
    let userId = localStorage.getItem(CONFIG.STORAGE_USER_ID);

    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem(CONFIG.STORAGE_USER_ID, userId);
    }

    this.state.userId = userId;

    if (this.elements.userIdBox) {
      this.elements.userIdBox.textContent = userId;
    }
  },

  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  },

  async initUserOnBackend() {
    try {
      const res = await Backend.init(this.state.userId);
      console.log('Init backend OK:', res);
    } catch (err) {
      console.warn('Init backend error:', err);
    }
  },

  async generarFlyer() {
  const e = this.elements;

  if (!this.state.mainImageData) {
    this.showError('Primero subí una imagen');
    return;
  }

  const titulo = (e.titulo && e.titulo.value.trim()) || 'Flyer';
  const texto = (e.texto && e.texto.value.trim()) || '';
  const instagram = (e.instagram && e.instagram.value.trim()) || '@drabruzera';
  const web = (e.web && e.web.value.trim()) || 'www.bruzera.turnox.pro';
  const whatsapp = (e.whatsapp && e.whatsapp.value.trim()) || '343 5303848';
  const ubicacion = (e.ubicacion && e.ubicacion.value.trim()) || 'José Venturino 1239';

  try {
    this.setLoading(true, 'Subiendo imagen y optimizando...');

    const mainFile = await this.dataURLtoFile(this.state.mainImageData, 'main.jpg');
   const uploaded = await CloudinaryUpload.upload(mainFile, 'dra_bruzera');

    let finalMainImageUrl = null;

if (CONFIG.IMAGE_MODE === 'smart') {
  finalMainImageUrl = await this.getBestAvailableImageUrl([
    CloudinaryUpload.buildSmartFlyerUrl(uploaded.secureUrl),
    CloudinaryUpload.buildSafePadUrl(uploaded.secureUrl),
    CloudinaryUpload.buildContainUrl(uploaded.secureUrl)
  ]);
} else if (CONFIG.IMAGE_MODE === 'safe_pad') {
  finalMainImageUrl = await this.getBestAvailableImageUrl([
    CloudinaryUpload.buildSafePadUrl(uploaded.secureUrl),
    CloudinaryUpload.buildContainUrl(uploaded.secureUrl)
  ]);
} else if (CONFIG.IMAGE_MODE === 'face') {
  finalMainImageUrl = await this.getBestAvailableImageUrl([
    CloudinaryUpload.buildFacePriorityUrl(uploaded.secureUrl),
    CloudinaryUpload.buildSafePadUrl(uploaded.secureUrl),
    CloudinaryUpload.buildContainUrl(uploaded.secureUrl)
  ]);
} else {
  finalMainImageUrl = await this.getBestAvailableImageUrl([
    CloudinaryUpload.buildContainUrl(uploaded.secureUrl)
  ]);
}    let finalLogo = null;

    if (this.state.logoImageData) {
      try {
        const logoFile = await this.dataURLtoFile(this.state.logoImageData, 'logo.png');
        const logoUploaded = await CloudinaryUpload.upload(logoFile, 'dra_bruzera');
        finalLogo = logoUploaded.secureUrl;
      } catch (err) {
        console.warn('No se pudo subir el logo, sigo sin logo:', err);
      }
    }

    await Backend.registrar({
      userId: this.state.userId,
      tipo: 'imagen',
      titulo,
      creditos: CONFIG.CREDITOS_IMAGEN
    });

    this.setLoading(true, 'Armando flyer final...');

    const finalDataUrl = await this.componerFlyer({
      mainImage: finalMainImageUrl,
      logoImage: finalLogo,
      titulo,
      texto,
      instagram,
      web,
      whatsapp,
      ubicacion
    });

    this.state.generatedImage = finalDataUrl;

    if (e.resultImage) {
      e.resultImage.src = finalDataUrl;
    }

    if (e.resultSection) {
      e.resultSection.classList.remove('hidden');
      e.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    this.saveLocalHistory({
      titulo,
      tipo: 'imagen',
      creditos: CONFIG.CREDITOS_IMAGEN,
      fecha: new Date().toISOString()
    });

    this.renderLocalHistory();

  } catch (err) {
    console.error(err);
    this.showError(err.message || 'Error al generar el flyer');
  } finally {
    this.setLoading(false);
  }
},

  async componerFlyer({ mainImage, logoImage, titulo, texto, instagram, web, whatsapp, ubicacion }) {
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.OUTPUT_WIDTH;
    canvas.height = CONFIG.OUTPUT_HEIGHT;

    const ctx = canvas.getContext('2d');

    this.drawBackground(ctx, canvas.width, canvas.height);

    const mainImg = await this.loadImage(mainImage);
    this.drawMainImage(ctx, mainImg, canvas.width, canvas.height);

    this.drawTopDecoration(ctx, canvas.width, canvas.height);
    this.drawBottomPanel(ctx, canvas.width, canvas.height);

    if (titulo) {
      this.drawTitle(ctx, titulo, canvas.width);
    }

    if (texto) {
      this.drawBodyText(ctx, texto, canvas.width, canvas.height);
    }

    this.drawContactData(ctx, {
      instagram,
      web,
      whatsapp,
      ubicacion,
      width: canvas.width,
      height: canvas.height
    });

    if (logoImage) {
      try {
        const logoImg = await this.loadImage(logoImage);
        this.drawLogo(ctx, logoImg, canvas.width, canvas.height);
      } catch (err) {
        console.warn('No se pudo dibujar el logo:', err);
      }
    }

    return canvas.toDataURL('image/png', 1);
  },

 drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);

  // 🎨 NUEVA PALETA (más marca)
  gradient.addColorStop(0, '#f3e8ff');   // violeta muy claro
  gradient.addColorStop(0.35, '#e9d5ff'); // lavanda
  gradient.addColorStop(0.7, '#d8b4fe');  // violeta suave
  gradient.addColorStop(1, '#c084fc');    // violeta marca

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 🌿 ondas suaves (igual pero mejor contraste)
  for (let i = 0; i < 18; i++) {
    const x = (width / 18) * i;
    ctx.beginPath();
    ctx.arc(x, 120 + (i % 2) * 30, 90, 0, Math.PI * 2);

    // un poco más visible
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
  }

  // 🎛️ líneas sutiles
  for (let i = 0; i < 14; i++) {
    const y = 200 + i * 70;
    ctx.fillStyle = i % 2 === 0 
      ? 'rgba(255,255,255,0.05)' 
      : 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, y, width, 8);
  }
},
async getBestAvailableImageUrl(urls) {
  for (const url of urls) {
    try {
      await this.loadImage(url);
      return url;
    } catch (err) {
      console.warn('Fallback de imagen Cloudinary:', url, err);
    }
  }

  throw new Error('No se pudo cargar ninguna versión optimizada de la imagen');
},

  drawMainImage(ctx, img, width, height) {
  const frameX = 60;
  const frameW = width - 120;
  const frameY = 180;

  const imgRatio = img.width / img.height;

  // 🔥 altura dinámica pero con límites
  let frameH = frameW / imgRatio;

  // límites para no romper diseño
  frameH = Math.max(480, Math.min(frameH, 820));

  // guardamos esto para usarlo después
  this._lastFrame = {
    x: frameX,
    y: frameY,
    w: frameW,
    h: frameH
  };

  ctx.save();

  this.roundRect(ctx, frameX, frameY, frameW, frameH, 36);
  ctx.clip();

  ctx.drawImage(img, frameX, frameY, frameW, frameH);

  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  this.roundRect(ctx, frameX, frameY, frameW, frameH, 36);
  ctx.stroke();
},
   drawTopDecoration(ctx, width, height) {
  ctx.save();

  const g = ctx.createLinearGradient(0, 0, width, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0.75)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, 90);
  ctx.bezierCurveTo(width * 0.75, 160, width * 0.25, 20, 0, 120);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
},
  drawBottomPanel(ctx, width, height) {
    const panelH = 230;
    const y = Math.max(height - panelH, this._lastFrame.y + this._lastFrame.h + 120);

    const g = ctx.createLinearGradient(0, y, width, height);
    g.addColorStop(0, 'rgba(126, 61, 118, 0.88)');
    g.addColorStop(1, 'rgba(88, 34, 92, 0.96)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, y + 40);
    ctx.bezierCurveTo(width * 0.18, y - 20, width * 0.38, y + 85, width * 0.55, y + 15);
    ctx.bezierCurveTo(width * 0.72, y - 35, width * 0.88, y + 45, width, y);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(100, y + 120, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width - 120, y + 50, 70, 0, Math.PI * 2);
    ctx.fill();
  },

  drawTitle(ctx, titulo, width) {
    const maxWidth = width - 140;
    ctx.fillStyle = '#6f2c67';
    ctx.font = 'bold 58px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const lines = this.wrapText(ctx, titulo.toUpperCase(), maxWidth);

    let y = 70;
    lines.slice(0, 2).forEach(line => {
      ctx.fillText(line, width / 2, y);
      y += 66;
    });
  },

      drawBodyText(ctx, texto, width, height) {
    const maxWidth = width - 180;
    const startY = this._lastFrame.y + this._lastFrame.h + 40;
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 28px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lines = this.wrapText(ctx, texto, maxWidth);
    let y = startY;

    lines.slice(0, 4).forEach(line => {
      ctx.fillText(line, 90, y);
      y += 36;
    });
  },

  drawContactData(ctx, { instagram, web, whatsapp, ubicacion, width, height }) {
    const startX = 90;
    const baseY = height - 132;

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 25px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lines = [
      `Instagram: ${instagram}`,
      `Web: ${web}`,
      `WhatsApp: ${whatsapp}`,
      `Ubicación: ${ubicacion}`
    ];

    let y = baseY;
    lines.forEach(line => {
      ctx.fillText(line, startX, y);
      y += 32;
    });
  },

  drawLogo(ctx, img, width, height) {
    const maxW = 170;
    const maxH = 170;

    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;

    const x = width - drawW - 70;
    const y = height - drawH - 40;

    ctx.save();

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.roundRect(ctx, x - 14, y - 14, drawW + 28, drawH + 28, 26);
    ctx.fill();

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
  },

  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).split(/\s+/);
    const lines = [];
    let current = '';

    for (const word of words) {
      const testLine = current ? current + ' ' + word : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        current = testLine;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines;
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  async descargarImagen() {
    if (!this.state.generatedImage) {
      this.showError('Primero generá una imagen');
      return;
    }

    const a = document.createElement('a');
    a.href = this.state.generatedImage;
    a.download = 'flyer-dra-bruzera.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async compartirImagen() {
    if (!this.state.generatedImage) {
      this.showError('Primero generá una imagen');
      return;
    }

    try {
      const file = await this.dataURLtoFile(this.state.generatedImage, 'flyer-dra-bruzera.png');

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Flyer Dra. Bruzera',
          files: [file]
        });
      } else {
        this.showError('Tu dispositivo no permite compartir archivos desde el navegador');
      }
    } catch (err) {
      console.error(err);
      this.showError('No se pudo compartir la imagen');
    }
  },

  saveLocalHistory(item) {
    const raw = localStorage.getItem(CONFIG.STORAGE_HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(item);
    localStorage.setItem(CONFIG.STORAGE_HISTORY, JSON.stringify(history.slice(0, 20)));
  },

  renderLocalHistory() {
    const box = this.elements.historyList;
    if (!box) return;

    const raw = localStorage.getItem(CONFIG.STORAGE_HISTORY);
    const history = raw ? JSON.parse(raw) : [];

    if (!history.length) {
      box.innerHTML = '<div class="history-empty">Todavía no hay registros locales</div>';
      return;
    }

    box.innerHTML = history.map(item => {
      const fecha = new Date(item.fecha).toLocaleString('es-AR');
      return `
        <div class="history-item">
          <strong>${this.escapeHtml(item.titulo || 'Sin título')}</strong>
          <div>Tipo: ${this.escapeHtml(item.tipo || '-')}</div>
          <div>Créditos: ${this.escapeHtml(String(item.creditos || 0))}</div>
          <div>Fecha: ${this.escapeHtml(fecha)}</div>
        </div>
      `;
    }).join('');
  },

  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  dataURLtoFile(dataUrl, filename) {
    return fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => new File([blob], filename, { type: blob.type || 'image/png' }));
  },

 loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
},
  setLoading(isLoading, text = 'Cargando...') {
    const e = this.elements;

    if (e.loader) {
      e.loader.classList.toggle('hidden', !isLoading);
    }

    if (e.loaderText) {
      e.loaderText.textContent = text;
    }

    if (e.btnGenerar) {
      e.btnGenerar.disabled = isLoading;
    }
  },

  showError(message) {
    alert(message);
  },

  escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
};

/* =========================
   JSONP
   ========================= */

function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout en JSONP'));
    }, 20000);

    function cleanup() {
      clearTimeout(timeout);
      if (script.parentNode) script.parentNode.removeChild(script);
      try {
        delete window[callbackName];
      } catch (_) {
        window[callbackName] = undefined;
      }
    }

    window[callbackName] = function(data) {
      cleanup();
      if (data && data.success === false) {
        reject(new Error(data.error || 'Error del servidor'));
        return;
      }
      resolve(data);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('Error cargando JSONP'));
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = url + sep + 'callback=' + callbackName + '&_=' + Date.now();
    document.body.appendChild(script);
  });
}

/* =========================
   Backend
   ========================= */

const Backend = {
  init(userId) {
    const url =
      CONFIG.API_URL +
      '?action=init' +
      '&userId=' + encodeURIComponent(userId);

    return jsonpRequest(url);
  },

  registrar({ userId, tipo, titulo, creditos }) {
    const url =
      CONFIG.API_URL +
      '?action=registrar' +
      '&userId=' + encodeURIComponent(userId) +
      '&tipo=' + encodeURIComponent(tipo) +
      '&titulo=' + encodeURIComponent(titulo) +
      '&creditos=' + encodeURIComponent(creditos);

    return jsonpRequest(url);
  }
};
/* =========================
   Claudinary
   ========================= */
const CloudinaryUpload = {
  async upload(file, folder = CONFIG.CLOUDINARY_FOLDER) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const url = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`;

    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error('Error subiendo a Cloudinary: ' + txt);
    }

    const data = await res.json();

    if (!data || !data.secure_url || !data.public_id) {
      throw new Error('Respuesta inválida de Cloudinary');
    }

    return {
      secureUrl: data.secure_url,
      publicId: data.public_id,
      format: data.format || 'jpg',
      version: data.version
    };
  },

  buildUrlFromSecureUrl(secureUrl, transform = '') {
    if (!transform) return secureUrl;
    return secureUrl.replace('/image/upload/', `/image/upload/${transform}/`);
  },

  buildSmartFlyerUrl(secureUrl) {
    const transforms = [
      'f_auto',
      'q_auto',
      'c_fill',
      `w_${CONFIG.OUTPUT_WIDTH}`,
      `h_${CONFIG.OUTPUT_HEIGHT}`,
      'g_faces',
      'e_improve'
    ].join(',');

    return this.buildUrlFromSecureUrl(secureUrl, transforms);
  },

  buildSafePadUrl(secureUrl) {
    const transforms = [
      'f_auto',
      'q_auto',
      'c_pad',
      `w_${CONFIG.OUTPUT_WIDTH}`,
      `h_${CONFIG.OUTPUT_HEIGHT}`,
      'b_auto',
      'e_improve'
    ].join(',');

    return this.buildUrlFromSecureUrl(secureUrl, transforms);
  },

  buildFacePriorityUrl(secureUrl) {
    const transforms = [
      'f_auto',
      'q_auto',
      'c_fill',
      `w_${CONFIG.OUTPUT_WIDTH}`,
      `h_${CONFIG.OUTPUT_HEIGHT}`,
      'g_faces',
      'e_improve'
    ].join(',');

    return this.buildUrlFromSecureUrl(secureUrl, transforms);
  },

  buildContainUrl(secureUrl) {
    const transforms = [
      'f_auto',
      'q_auto',
      'c_pad',
      `w_${CONFIG.OUTPUT_WIDTH}`,
      `h_${CONFIG.OUTPUT_HEIGHT}`,
      'b_auto',
      'e_improve'
    ].join(',');

    return this.buildUrlFromSecureUrl(secureUrl, transforms);
  }
};

/* =========================
   Init
   ========================= */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
