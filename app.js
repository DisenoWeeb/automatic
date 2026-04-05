/* =========================
   DRA. BRUZERA - VETERINARIA MODERNA
   Frontend optimizado
   ========================= */

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyVS35VZ8GmXFUsq787A23ec74wnYKhK07_eRO7BQp5zVT_Jv_DJijt41VHthVXbZzdVQ/exec',
  STORAGE_USER_ID: 'dra_bruzera_user_id',
  STORAGE_HISTORY: 'dra_bruzera_history',
  CLOUDINARY_CLOUD_NAME: 'dwgwbdtud',
  CLOUDINARY_UPLOAD_PRESET: 'dra_bruzera_unsigned',
  CLOUDINARY_FOLDER: 'dra_bruzera',
  IMAGE_MODE: 'smart',
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
      }

      let finalLogo = null;
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
    // Gradiente suave de fondo
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8f6fc');
    gradient.addColorStop(0.3, '#f0ebf5');
    gradient.addColorStop(0.7, '#e8e0f0');
    gradient.addColorStop(1, '#362A6F');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Patrón de huellas sutil
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#362A6F';
    
    for (let i = 0; i < 8; i++) {
      const x = (width / 8) * i + 40;
      const y = 150 + (i % 2) * 200;
      this.drawPawPrint(ctx, x, y, 25 + (i % 3) * 8);
    }
    ctx.restore();

    // Líneas onduladas modernas
    ctx.strokeStyle = 'rgba(196,38,133,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 400 + i * 180);
      ctx.bezierCurveTo(width * 0.3, 350 + i * 180, width * 0.7, 450 + i * 180, width, 400 + i * 180);
      ctx.stroke();
    }
  },

  drawPawPrint(ctx, x, y, size) {
    // Almohadilla principal
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Dedos
    const toeSize = size * 0.35;
    const positions = [
      {dx: -size*0.6, dy: -size*0.9, rot: -0.3},
      {dx: -size*0.2, dy: -size*1.1, rot: -0.1},
      {dx: size*0.2, dy: -size*1.1, rot: 0.1},
      {dx: size*0.6, dy: -size*0.9, rot: 0.3}
    ];
    
    positions.forEach(pos => {
      ctx.save();
      ctx.translate(x + pos.dx, y + pos.dy);
      ctx.rotate(pos.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, toeSize, toeSize * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  },

  drawTopDecoration(ctx, width, height) {
    ctx.save();
    
    // Glassmorphism effect
    const gradient = ctx.createLinearGradient(0, 0, width, 120);
    gradient.addColorStop(0, 'rgba(54,42,111,0.85)');
    gradient.addColorStop(0.5, 'rgba(196,38,133,0.75)');
    gradient.addColorStop(1, 'rgba(54,42,111,0.85)');
    
    ctx.fillStyle = gradient;
    
    // Forma moderna con curva suave
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, 75);
    ctx.quadraticCurveTo(width * 0.5, 110, 0, 75);
    ctx.closePath();
    ctx.fill();
    
    // Línea de acento magenta
    ctx.strokeStyle = '#C42685';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 75);
    ctx.quadraticCurveTo(width * 0.5, 110, width, 75);
    ctx.stroke();
    
    ctx.restore();
  },

  drawMainImage(ctx, img, width, height) {
    const frameX = 60;
    const frameY = 140;
    const frameW = width - 120;
    const frameH = 680;
    
    this._lastFrame = { x: frameX, y: frameY, w: frameW, h: frameH };

    ctx.save();
    
    // Sombra moderna difusa
    ctx.shadowColor = 'rgba(54,42,111,0.15)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    
    // Marco con borde redondeado
    this.roundRect(ctx, frameX, frameY, frameW, frameH, 40);
    ctx.clip();
    
    ctx.shadowColor = 'transparent';

    // Cover adaptativo
    const imgRatio = img.width / img.height;
    const boxRatio = frameW / frameH;
    let drawW, drawH, drawX, drawY;

    if (imgRatio > boxRatio) {
      drawH = frameH;
      drawW = drawH * imgRatio;
      drawX = frameX - (drawW - frameW) / 2;
      drawY = frameY;
    } else {
      drawW = frameW;
      drawH = drawW / imgRatio;
      drawX = frameX;
      drawY = frameY - (drawH - frameH) * 0.3;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Doble borde moderno
    ctx.save();
    ctx.strokeStyle = 'rgba(196,38,133,0.4)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, frameX - 4, frameY - 4, frameW + 8, frameH + 8, 44);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, frameX, frameY, frameW, frameH, 40);
    ctx.stroke();
    ctx.restore();
  },

  drawBottomPanel(ctx, width, height) {
    const y = this._lastFrame.y + this._lastFrame.h + 50;
    const panelH = height - y - 40;
    const margin = 40;

    ctx.save();
    
    // Card blanca con sombra
    ctx.shadowColor = 'rgba(54,42,111,0.12)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    
    // Fondo blanco con esquinas redondeadas
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, margin, y, width - margin * 2, panelH, 30);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Barra de color en la parte superior
    const barGradient = ctx.createLinearGradient(margin, y, width - margin, y);
    barGradient.addColorStop(0, '#362A6F');
    barGradient.addColorStop(0.5, '#C42685');
    barGradient.addColorStop(1, '#362A6F');
    
    ctx.fillStyle = barGradient;
    ctx.beginPath();
    ctx.moveTo(margin + 30, y);
    ctx.lineTo(width - margin - 30, y);
    ctx.quadraticCurveTo(width - margin, y, width - margin, y + 30);
    ctx.lineTo(width - margin, y + 6);
    ctx.lineTo(margin, y + 6);
    ctx.lineTo(margin, y + 30);
    ctx.quadraticCurveTo(margin, y, margin + 30, y);
    ctx.closePath();
    ctx.fill();
    
    // Círculos decorativos sutiles
    ctx.fillStyle = 'rgba(54,42,111,0.04)';
    ctx.beginPath();
    ctx.arc(margin + 60, y + panelH - 60, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(196,38,133,0.06)';
    ctx.beginPath();
    ctx.arc(width - margin - 80, y + 40, 35, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  },

  drawTitle(ctx, titulo, width) {
    const maxWidth = width - 100;
    
    ctx.save();
    
    // Sombra sutil
    ctx.shadowColor = 'rgba(54,42,111,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = '#362A6F';
    ctx.font = 'bold 52px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const lines = this.wrapText(ctx, titulo.toUpperCase(), maxWidth);
    let y = 45;

    lines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, width / 2, y);
      
      // Subrayado decorativo
      if (index === 0) {
        const metrics = ctx.measureText(line);
        const lineWidth = metrics.width;
        const startX = (width - lineWidth) / 2;
        
        ctx.fillStyle = '#C42685';
        ctx.fillRect(startX, y + 58, lineWidth, 5);
        
        // Punto decorativo
        ctx.beginPath();
        ctx.arc(startX + lineWidth + 8, y + 60, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#362A6F';
      }
      y += 62;
    });
    
    ctx.restore();
  },

  drawBodyText(ctx, texto, width, height) {
    const maxWidth = width - 160;
    const startY = this._lastFrame.y + this._lastFrame.h + 80;

    ctx.save();
    
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '400 26px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lines = this.wrapText(ctx, texto, maxWidth);
    let y = startY;

    lines.slice(0, 3).forEach((line) => {
      // Bullet moderno
      ctx.fillStyle = '#C42685';
      this.roundRect(ctx, 65, y + 8, 8, 8, 2);
      ctx.fill();
      
      ctx.fillStyle = '#4a4a4a';
      ctx.fillText(line, 85, y);
      y += 36;
    });
    
    ctx.restore();
  },

  drawContactData(ctx, { instagram, web, whatsapp, ubicacion, width, height }) {
    const cardY = this._lastFrame.y + this._lastFrame.h + 50;
    const cardH = height - cardY - 40;
    const centerY = cardY + cardH - 75;
    
    ctx.save();
    
    // Layout en grid: 2 columnas
    const col1X = 80;
    const col2X = width / 2 + 20;
    const startY = centerY - 20;
    
    const items = [
      { icon: 'IG', text: instagram, color: '#C42685', x: col1X, y: startY },
      { icon: 'WEB', text: web, color: '#362A6F', x: col2X, y: startY },
      { icon: 'WA', text: whatsapp, color: '#362A6F', x: col1X, y: startY + 35 },
      { icon: 'LOC', text: ubicacion, color: '#362A6F', x: col2X, y: startY + 35 }
    ];

    items.forEach(item => {
      // Badge del icono
      ctx.fillStyle = item.color;
      this.roundRect(ctx, item.x, item.y, 28, 22, 4);
      ctx.fill();
      
      // Texto del icono
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Montserrat, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, item.x + 14, item.y + 11);
      
      // Texto del valor
      ctx.fillStyle = '#555555';
      ctx.font = '500 20px Montserrat, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.text, item.x + 38, item.y + 16);
    });
    
    ctx.restore();
  },

  drawLogo(ctx, img, width, height) {
    const size = 130;
    const x = width - size - 70;
    const y = height - size - 55;

    ctx.save();
    
    // Círculo de fondo con gradiente
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#362A6F');
    gradient.addColorStop(1, '#C42685');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2 + 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Círculo blanco interior
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Clip para la imagen
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2 - 4, 0, Math.PI * 2);
    ctx.clip();
    
    // Dibujar logo centrado
    const ratio = Math.min((size-8) / img.width, (size-8) / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;
    const drawX = x + (size - drawW) / 2;
    const drawY = y + (size - drawH) / 2;
    
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    
    ctx.restore();
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
   Cloudinary
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
