/* =========================
   DRA. BRUZERA - app.js
   Preview + drag + zoom
   ========================= */

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyVS35VZ8GmXFUsq787A23ec74wnYKhK07_eRO7BQp5zVT_Jv_DJijt41VHthVXbZzdVQ/exec',
  STORAGE_USER_ID: 'dra_bruzera_user_id',
  STORAGE_HISTORY: 'dra_bruzera_history',
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
    generatedImage: null,
    editor: {
      img: null,
      logoImg: null,
      scale: 1,
      minScale: 1,
      maxScale: 4,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
      pinchStartDistance: 0,
      pinchStartScale: 1
    }
  },

  elements: {},
  canvas: null,
  ctx: null,
  layout: null,

  init() {
    this.cacheElements();
    this.ensureCanvas();
    this.bindEvents();
    this.bindCanvasInteractions();
    this.ensureUserId();
    this.initUserOnBackend();
    this.renderLocalHistory();
    this.renderPreview();
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

  ensureCanvas() {
    const box = this.elements.resultSection || document.body;

    let canvas = document.getElementById('flyerCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'flyerCanvas';
      canvas.width = CONFIG.OUTPUT_WIDTH;
      canvas.height = CONFIG.OUTPUT_HEIGHT;
      canvas.style.width = '100%';
      canvas.style.maxWidth = '540px';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.borderRadius = '24px';
      canvas.style.touchAction = 'none';
      canvas.style.cursor = 'grab';
      canvas.style.background = '#f3eefb';

      if (this.elements.resultImage && this.elements.resultImage.parentNode) {
        this.elements.resultImage.parentNode.insertBefore(canvas, this.elements.resultImage);
        this.elements.resultImage.style.display = 'none';
      } else {
        box.appendChild(canvas);
      }
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
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

          const img = await this.loadImage(dataUrl);
          this.state.editor.img = img;
          this.resetImageTransform();
          this.renderPreview();
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

          const img = await this.loadImage(dataUrl);
          this.state.editor.logoImg = img;
          this.renderPreview();
        } catch (err) {
          console.error(err);
          this.showError('No se pudo leer el logo');
        }
      });
    }

    ['input', 'change'].forEach(evt => {
      ['titulo', 'texto', 'instagram', 'web', 'whatsapp', 'ubicacion'].forEach(key => {
        const el = e[key];
        if (el) el.addEventListener(evt, () => this.renderPreview());
      });
    });

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

  bindCanvasInteractions() {
    if (!this.canvas) return;

    const getPoint = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const startDrag = (x, y) => {
      this.state.editor.dragging = true;
      this.state.editor.lastX = x;
      this.state.editor.lastY = y;
      this.canvas.style.cursor = 'grabbing';
    };

    const moveDrag = (x, y) => {
      if (!this.state.editor.dragging || !this.layout?.photo) return;

      const dx = x - this.state.editor.lastX;
      const dy = y - this.state.editor.lastY;

      this.state.editor.offsetX += dx;
      this.state.editor.offsetY += dy;

      this.state.editor.lastX = x;
      this.state.editor.lastY = y;

      this.clampImagePosition();
      this.renderPreview();
    };

    const endDrag = () => {
      this.state.editor.dragging = false;
      this.canvas.style.cursor = 'grab';
    };

    this.canvas.addEventListener('mousedown', (ev) => {
      const p = getPoint(ev.clientX, ev.clientY);
      startDrag(p.x, p.y);
    });

    window.addEventListener('mousemove', (ev) => {
      const p = getPoint(ev.clientX, ev.clientY);
      moveDrag(p.x, p.y);
    });

    window.addEventListener('mouseup', endDrag);

    this.canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      if (!this.layout?.photo) return;

      const p = getPoint(ev.clientX, ev.clientY);
      const factor = ev.deltaY < 0 ? 1.08 : 0.92;
      this.zoomAtPoint(factor, p.x, p.y);
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (ev) => {
      if (ev.touches.length === 1) {
        const t = ev.touches[0];
        const p = getPoint(t.clientX, t.clientY);
        startDrag(p.x, p.y);
      } else if (ev.touches.length === 2) {
        this.state.editor.dragging = false;
        this.state.editor.pinchStartDistance = this.getTouchDistance(ev.touches[0], ev.touches[1]);
        this.state.editor.pinchStartScale = this.state.editor.scale;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (ev) => {
      ev.preventDefault();

      if (ev.touches.length === 1) {
        const t = ev.touches[0];
        const p = getPoint(t.clientX, t.clientY);
        moveDrag(p.x, p.y);
      } else if (ev.touches.length === 2) {
        if (!this.layout?.photo) return;

        const dist = this.getTouchDistance(ev.touches[0], ev.touches[1]);
        if (!this.state.editor.pinchStartDistance) return;

        const ratio = dist / this.state.editor.pinchStartDistance;
        const nextScale = this.state.editor.pinchStartScale * ratio;

        const midClientX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
        const midClientY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
        const p = getPoint(midClientX, midClientY);

        this.setScaleAtPoint(nextScale, p.x, p.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      endDrag();
      this.state.editor.pinchStartDistance = 0;
    });

    this.canvas.addEventListener('dblclick', () => {
      this.resetImageTransform();
      this.renderPreview();
    });
  },

  getTouchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
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

  getFormData() {
    const e = this.elements;
    return {
      titulo: (e.titulo && e.titulo.value.trim()) || 'Flyer',
      texto: (e.texto && e.texto.value.trim()) || '',
      instagram: (e.instagram && e.instagram.value.trim()) || '@drabruzera',
      web: (e.web && e.web.value.trim()) || 'www.bruzera.turnox.pro',
      whatsapp: (e.whatsapp && e.whatsapp.value.trim()) || '343 5303848',
      ubicacion: (e.ubicacion && e.ubicacion.value.trim()) || 'José Venturino 1239'
    };
  },

  resetImageTransform() {
    const img = this.state.editor.img;
    if (!img) return;

    const photo = this.getPhotoLayout(img);
    const baseScale = Math.max(photo.w / img.width, photo.h / img.height);

    this.state.editor.scale = baseScale;
    this.state.editor.minScale = baseScale;
    this.state.editor.maxScale = baseScale * 4;
    this.state.editor.offsetX = photo.x + (photo.w - img.width * baseScale) / 2;
    this.state.editor.offsetY = photo.y + (photo.h - img.height * baseScale) / 2;
  },

  getPhotoLayout(img) {
    const width = CONFIG.OUTPUT_WIDTH;
    const height = CONFIG.OUTPUT_HEIGHT;
    const ratio = img ? (img.width / img.height) : 1;

    const x = 60;
    const y = 180;
    const w = width - 120;

    let h = w / ratio;
    h = Math.max(470, Math.min(h, 810));

    const bodyStartY = y + h + 30;
    const panelH = 250;
    const panelY = Math.max(height - panelH, bodyStartY + 90);

    return {
      x, y, w, h,
      bodyStartY,
      panelY,
      panelH
    };
  },

  zoomAtPoint(factor, px, py) {
    const current = this.state.editor.scale;
    const next = current * factor;
    this.setScaleAtPoint(next, px, py);
  },

  setScaleAtPoint(nextScale, px, py) {
    const ed = this.state.editor;
    nextScale = Math.max(ed.minScale, Math.min(nextScale, ed.maxScale));

    const worldX = (px - ed.offsetX) / ed.scale;
    const worldY = (py - ed.offsetY) / ed.scale;

    ed.scale = nextScale;
    ed.offsetX = px - worldX * ed.scale;
    ed.offsetY = py - worldY * ed.scale;

    this.clampImagePosition();
    this.renderPreview();
  },

  clampImagePosition() {
    const ed = this.state.editor;
    const photo = this.layout?.photo;
    if (!ed.img || !photo) return;

    const drawW = ed.img.width * ed.scale;
    const drawH = ed.img.height * ed.scale;

    const minX = photo.x + photo.w - drawW;
    const maxX = photo.x;
    const minY = photo.y + photo.h - drawH;
    const maxY = photo.y;

    ed.offsetX = Math.min(maxX, Math.max(minX, ed.offsetX));
    ed.offsetY = Math.min(maxY, Math.max(minY, ed.offsetY));
  },

  renderPreview() {
    if (!this.ctx || !this.canvas) return;

    const data = this.getFormData();
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    this.drawBackground(ctx, width, height);
    this.drawTopDecoration(ctx, width, height);

    const img = this.state.editor.img;
    const photo = img
      ? this.getPhotoLayout(img)
      : {
          x: 60,
          y: 180,
          w: width - 120,
          h: 700,
          bodyStartY: 910,
          panelY: 1100,
          panelH: 250
        };

    this.layout = { photo };

    if (img) {
      this.drawMainImage(ctx, img, photo);
    } else {
      this.drawPhotoPlaceholder(ctx, photo);
    }

    this.drawTitle(ctx, data.titulo, width);
    this.drawBottomPanel(ctx, width, height, photo.panelY, photo.panelH);

    if (data.texto) {
      this.drawBodyText(ctx, data.texto, width, photo.bodyStartY, photo.panelY);
    }

    this.drawContactData(ctx, {
      instagram: data.instagram,
      web: data.web,
      whatsapp: data.whatsapp,
      ubicacion: data.ubicacion,
      width,
      panelY: photo.panelY
    });

    if (this.state.editor.logoImg) {
      this.drawLogo(ctx, this.state.editor.logoImg, width, photo.panelY);
    }

    this.state.generatedImage = this.canvas.toDataURL('image/png', 1);
  },

  drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3eefb');
    gradient.addColorStop(0.35, '#eadcf8');
    gradient.addColorStop(0.7, '#d6b8f3');
    gradient.addColorStop(1, '#b98de8');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 18; i++) {
      const x = (width / 18) * i;
      ctx.beginPath();
      ctx.arc(x, 120 + (i % 2) * 30, 90, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
    }

    for (let i = 0; i < 14; i++) {
      const y = 200 + i * 70;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(0, y, width, 8);
    }
  },

  drawTopDecoration(ctx, width, height) {
    ctx.save();

    const g = ctx.createLinearGradient(0, 0, width, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.20)');
    g.addColorStop(1, 'rgba(255,255,255,0.65)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, 78);
    ctx.bezierCurveTo(width * 0.72, 114, width * 0.28, 38, 0, 110);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  drawPhotoPlaceholder(ctx, photo) {
    ctx.save();
    this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 36);
    ctx.clip();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(photo.x, photo.y, photo.w, photo.h);

    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 4;
    this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 36);
    ctx.stroke();

    ctx.fillStyle = 'rgba(111,44,103,0.75)';
    ctx.font = '600 34px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Subí una imagen y acomodala con zoom + arrastre', photo.x + photo.w / 2, photo.y + photo.h / 2);
  },

  drawMainImage(ctx, img, photo) {
    const ed = this.state.editor;

    this.clampImagePosition();

    ctx.save();
    this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 36);
    ctx.clip();
    ctx.drawImage(img, ed.offsetX, ed.offsetY, img.width * ed.scale, img.height * ed.scale);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 4;
    this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 36);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, photo.x + 14, photo.y + 14, photo.w - 28, photo.h - 28, 26);
    ctx.stroke();
  },

  
