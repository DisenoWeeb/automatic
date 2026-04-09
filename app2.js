/* =========================
   DRA. BRUZERA - app.js
   Preview + drag + zoom
   ========================= */

const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyVS35VZ8GmXFUsq787A23ec74wnYKhK07_eRO7BQp5zVT_Jv_DJijt41VHthVXbZzdVQ/exec',
  STORAGE_USER_ID: 'dra_bruzera_user_id',
  STORAGE_HISTORY: 'dra_bruzera_history',
  CLOUDINARY_CLOUD_NAME: 'dwgwbdtud',
  CLOUDINARY_UPLOAD_PRESET: 'dra_bruzera_unsigned',
  CLOUDINARY_FOLDER: 'dra_bruzera',
  USE_CLOUDINARY_AI: true,
  OUTPUT_WIDTH: 1080,
  OUTPUT_HEIGHT: 1350,
  CREDITOS_IMAGEN: 1,
  CREDITOS_VIDEO: 4,
   DEFAULT_MAIN_IMAGE: 'https://res.cloudinary.com/dwgwbdtud/image/upload/v1775422555/dra_bruzera/uwnto8lhkn6gwlz8krry.jpg',
  DEFAULT_LOGO_IMAGE: 'https://res.cloudinary.com/dwgwbdtud/image/upload/v1775681766/offb0lgokdl0pfunyx1m.png'
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
  this.loadDefaultAssets();
},

  cacheElements() {
    this.elements = {
  mainImageGalleryInput: document.getElementById('mainImageGallery'),
  mainImageCameraInput: document.getElementById('mainImageCamera'),
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
async loadDefaultAssets() {
  const e = this.elements;

  try {
    if (CONFIG.DEFAULT_MAIN_IMAGE) {
      this.state.mainImageData = CONFIG.DEFAULT_MAIN_IMAGE;
      if (e.previewMain) e.previewMain.src = CONFIG.DEFAULT_MAIN_IMAGE;

      const mainImg = await this.loadImage(CONFIG.DEFAULT_MAIN_IMAGE);
      this.state.editor.img = mainImg;
      this.resetImageTransform();
    }

    if (CONFIG.DEFAULT_LOGO_IMAGE) {
      this.state.logoImageData = CONFIG.DEFAULT_LOGO_IMAGE;
      if (e.previewLogo) e.previewLogo.src = CONFIG.DEFAULT_LOGO_IMAGE;

      const logoImg = await this.loadImage(CONFIG.DEFAULT_LOGO_IMAGE);
      this.state.editor.logoImg = logoImg;
    }

    this.renderPreview();
  } catch (err) {
    console.error('Error cargando imagen/logo por defecto:', err);
  }
},
 bindEvents() {
  const e = this.elements;

  const handleMainImageChange = async (ev) => {
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

      ev.target.value = '';
    } catch (err) {
      console.error(err);
      this.showError('No se pudo leer la imagen principal');
    }
  };

  if (e.mainImageGalleryInput) {
    e.mainImageGalleryInput.addEventListener('change', handleMainImageChange);
  }

  if (e.mainImageCameraInput) {
    e.mainImageCameraInput.addEventListener('change', handleMainImageChange);
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

        ev.target.value = '';
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
 dataURLtoExactFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return Promise.resolve(new File([u8arr], filename, { type: mime }));
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
const dragFactor = 0.72;

this.state.editor.offsetX += dx * dragFactor;
this.state.editor.offsetY += dy * dragFactor;

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
      const factor = ev.deltaY < 0 ? 1.035 : 0.965;
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
       const rawNextScale = this.state.editor.pinchStartScale * ratio;
const nextScale = this.state.editor.scale + (rawNextScale - this.state.editor.scale) * 0.22;

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
    this.state.editor.maxScale = baseScale * 6;
    this.state.editor.offsetX = photo.x + (photo.w - img.width * baseScale) / 2;
    this.state.editor.offsetY = photo.y + (photo.h - img.height * baseScale) / 2;
  },

  getPhotoLayout(img) {
  const width = CONFIG.OUTPUT_WIDTH;
  const height = CONFIG.OUTPUT_HEIGHT;

  const x = 70;
  const y = 170;
  const w = width - 140;
  const h = 700;

  const bodyStartY = y + h + 42;
  const panelH = 240;
  const panelY = height - panelH;

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
getFlyerColors() {
  const s = getComputedStyle(document.documentElement);

  return {
    bg1: s.getPropertyValue('--flyer-bg-1').trim(),
    bg2: s.getPropertyValue('--flyer-bg-2').trim(),
    bg3: s.getPropertyValue('--flyer-bg-3').trim(),
    bg4: s.getPropertyValue('--flyer-bg-4').trim(),

    title: s.getPropertyValue('--flyer-title').trim(),

    panel1: s.getPropertyValue('--flyer-panel-1').trim(),
    panel2: s.getPropertyValue('--flyer-panel-2').trim(),

    bodyText: s.getPropertyValue('--flyer-body-text').trim(),
    contactText: s.getPropertyValue('--flyer-contact-text').trim(),

    frame: s.getPropertyValue('--flyer-frame').trim(),
    frameSoft: s.getPropertyValue('--flyer-frame-soft').trim(),

    placeholder: s.getPropertyValue('--flyer-placeholder').trim(),
    logoBg: s.getPropertyValue('--flyer-logo-bg').trim(),

    top1: s.getPropertyValue('--flyer-top-1').trim(),
    top2: s.getPropertyValue('--flyer-top-2').trim(),
    top3: s.getPropertyValue('--flyer-top-3').trim()
  };
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
      this.drawBodyText(ctx, data.texto, photo, photo.bodyStartY, photo.panelY);
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
  const c = this.getFlyerColors();

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, c.bg1);
  gradient.addColorStop(0.28, c.bg2);
  gradient.addColorStop(0.68, c.bg3);
  gradient.addColorStop(1, c.bg4);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(width - 120, 120, 170, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(120, height - 180, 210, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? c.line1 : c.line2;
    ctx.fillRect(0, 120 + i * 96, width, 10);
  }
},
drawTopDecoration(ctx, width, height) {
  const c = this.getFlyerColors();

  ctx.save();

  const g = ctx.createLinearGradient(0, 0, width, 0);
  g.addColorStop(0, c.top1);
  g.addColorStop(0.5, c.top2);
  g.addColorStop(1, c.top3);

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, 115);
  ctx.bezierCurveTo(width * 0.82, 80, width * 0.42, 145, 0, 92);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
},
drawPhotoPlaceholder(ctx, photo) {
  const c = this.getFlyerColors();

  ctx.save();
  this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 40);
  ctx.clip();

  ctx.fillStyle = c.placeholderFill;
  ctx.fillRect(photo.x, photo.y, photo.w, photo.h);

  ctx.restore();

  ctx.strokeStyle = c.frame;
  ctx.lineWidth = 4;
  this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 40);
  ctx.stroke();

  ctx.strokeStyle = c.frameSoft;
  ctx.lineWidth = 2;
  this.roundRect(ctx, photo.x + 14, photo.y + 14, photo.w - 28, photo.h - 28, 28);
  ctx.stroke();

  ctx.fillStyle = c.placeholderText;
  ctx.font = '700 34px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Subí una imagen y acomodala', photo.x + photo.w / 2, photo.y + photo.h / 2 - 18);
  ctx.fillText('con zoom + arrastre', photo.x + photo.w / 2, photo.y + photo.h / 2 + 26);
},

drawMainImage(ctx, img, photo) {
  const c = this.getFlyerColors();
  const ed = this.state.editor;

  this.clampImagePosition();

  ctx.save();
  this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 40);
  ctx.clip();
  ctx.drawImage(img, ed.offsetX, ed.offsetY, img.width * ed.scale, img.height * ed.scale);
  ctx.restore();

  ctx.strokeStyle = c.frame;
  ctx.lineWidth = 4;
  this.roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 40);
  ctx.stroke();

  ctx.strokeStyle = c.frameSoft;
  ctx.lineWidth = 2;
  this.roundRect(ctx, photo.x + 14, photo.y + 14, photo.w - 28, photo.h - 28, 28);
  ctx.stroke();
},
drawTitle(ctx, titulo, width) {
  const c = this.getFlyerColors();
  const maxWidth = width - 220;

  ctx.fillStyle = c.title;
  ctx.font = '800 64px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const lines = this.wrapText(ctx, (titulo || 'Flyer').toUpperCase(), maxWidth);

  let y = 58;
  lines.slice(0, 2).forEach(line => {
    ctx.fillText(line, 78, y);
    y += 68;
  });
},
drawBottomPanel(ctx, width, height, y, panelH) {
  const c = this.getFlyerColors();

  const g = ctx.createLinearGradient(0, y, width, height);
  g.addColorStop(0, c.panel1);
  g.addColorStop(1, c.panel2);

  ctx.fillStyle = g;
  this.roundRect(ctx, 0, y, width, panelH + 20, 0);
  ctx.fill();

  ctx.fillStyle = c.panelGlow;
  ctx.beginPath();
  ctx.arc(130, y + 70, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(width - 110, y + 130, 90, 0, Math.PI * 2);
  ctx.fill();
},

drawBodyText(ctx, texto, photo, startY, panelY) {
  const c = this.getFlyerColors();
  if (!texto) return;

  const textX = photo.x + 8;
  const textY = startY - 4;
  const maxWidth = photo.w - 20;
  const availableH = Math.max(0, panelY - textY - 24);
  if (availableH < 30) return;

  const lineHeight = 42;
  const maxLines = Math.max(1, Math.floor(availableH / lineHeight));

  ctx.fillStyle = c.bodyText;
  ctx.font = '500 34px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const lines = this.wrapText(ctx, texto, maxWidth);

  let y = textY;
  lines.slice(0, maxLines).forEach(line => {
    ctx.fillText(line, textX, y);
    y += lineHeight;
  });
},
   
drawContactData(ctx, { instagram, web, whatsapp, ubicacion, width, panelY }) {
  const c = this.getFlyerColors();

  const leftX = 70;
  const rightX = 560;
  const baseY = panelY + 78;

  ctx.fillStyle = c.contactText;
  ctx.font = '600 26px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillText(`Instagram: ${instagram}`, leftX, baseY);
  ctx.fillText(`Web: ${web}`, leftX, baseY + 38);

  ctx.fillText(`WhatsApp: ${whatsapp}`, rightX, baseY);
  ctx.fillText(`Ubicación: ${ubicacion}`, rightX, baseY + 38);
},

drawLogo(ctx, img, width, panelY) {
  const c = this.getFlyerColors();

  const maxW = 150;
  const maxH = 150;

  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const drawW = img.width * ratio;
  const drawH = img.height * ratio;

  // arriba a la derecha, enfrentado al título
  const x = width - drawW - 80;
  const y = 52;

  ctx.save();

  const pad = 18;
  const boxW = drawW + pad * 2;
  const boxH = drawH + pad * 2;

  const g = ctx.createLinearGradient(x, y, x + boxW, y + boxH);
  g.addColorStop(0, 'rgba(255,255,255,0.30)');
  g.addColorStop(1, c.logoBg);

  ctx.fillStyle = g;
  this.roundRect(ctx, x - pad, y - pad, boxW, boxH, 28);
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
      const testLine = current ? `${current} ${word}` : word;
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

 async generarFlyer() {
  

  try {
    this.setLoading(true, 'Preparando imagen...');

    console.log('mainImageData existe:', !!this.state.mainImageData);
    console.log('mainImageData tipo:', typeof this.state.mainImageData);
    console.log('mainImageData inicio:', String(this.state.mainImageData).slice(0, 80));

let originalUrl = '';

// fallback si no hay nada
if (!this.state.mainImageData) {
  this.state.mainImageData = CONFIG.DEFAULT_MAIN_IMAGE;
}

// CASO 1: base64 (usuario subió imagen)
if (this.state.mainImageData.startsWith('data:image/')) {

  const mainFile = await this.dataURLtoFile(this.state.mainImageData, 'main.jpg');

  this.setLoading(true, 'Subiendo imagen...');

  const uploadRes = await CloudinaryUpload.upload(mainFile, CONFIG.CLOUDINARY_FOLDER);
  originalUrl = uploadRes.secure_url;

}

// CASO 2: URL (default o externa)
else if (this.state.mainImageData.startsWith('http')) {

  originalUrl = this.state.mainImageData;

}

// CASO 3: fallback absoluto
else {

  originalUrl = CONFIG.DEFAULT_MAIN_IMAGE;

}
     let aiUrl = originalUrl;

    if (CONFIG.USE_CLOUDINARY_AI) {
      this.setLoading(true, 'Aplicando optimización Cloudinary...');
      aiUrl = CloudinaryAI.buildOriginalOptimizedUrl(originalUrl);
      console.log('aiUrl:', aiUrl);

      try {
        await this.loadImage(aiUrl);
      } catch (err) {
        console.warn('Optimización Cloudinary falló, uso imagen original:', err);
        aiUrl = originalUrl;
      }
    }

    this.setLoading(true, 'Cargando imagen final...');

    const aiImg = await this.loadImage(aiUrl);
    this.state.editor.img = aiImg;
    this.resetImageTransform();
    this.renderPreview();

    await Backend.registrar({
      userId: this.state.userId,
      tipo: 'imagen',
      titulo: this.getFormData().titulo,
      creditos: CONFIG.CREDITOS_IMAGEN
    });

    this.saveLocalHistory({
      titulo: this.getFormData().titulo,
      tipo: 'imagen',
      creditos: CONFIG.CREDITOS_IMAGEN,
      fecha: new Date().toISOString(),
      originalUrl,
      aiUrl
    });

    this.renderLocalHistory();
    alert('Flyer listo para descargar');
  } catch (err) {
    console.error('❌ generarFlyer error:', err);
    this.showError(err.message || 'Error generando flyer');
  } finally {
    this.setLoading(false);
  }
},
   async descargarImagen() {
    if (!this.state.generatedImage) {
      this.renderPreview();
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
    this.renderPreview();
  }

  try {
    const file = await this.dataURLtoExactFile(this.state.generatedImage, 'flyer-dra-bruzera.png');

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

  dataURLtoFile(dataUrl, filename = 'main.jpg') {
  return new Promise((resolve, reject) => {
    try {
      const arr = dataUrl.split(',');
      if (arr.length < 2) {
        reject(new Error('No vas a subir una foto?'));
        return;
      }

      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      resolve(new File([u8arr], filename, { type: mime }));
    } catch (err) {
      reject(new Error('No se pudo convertir la imagen a archivo'));
    }
  });
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
   Cloudinary
   ========================= */

const CloudinaryUpload = {
  async upload(file, folder = CONFIG.CLOUDINARY_FOLDER) {
    console.log('⬆️ Subiendo a Cloudinary...');
    console.log('file:', file);
    console.log('file.name:', file.name);
    console.log('file.type:', file.type);
    console.log('file.size:', file.size);
    console.log('folder:', folder);

    const formData = new FormData();
    formData.append('file', file, file.name || 'image.png');
    formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    const data = await res.json();

    console.log('☁️ Cloudinary status:', res.status);
    console.log('☁️ Cloudinary response:', data);

    if (!res.ok || !data.secure_url) {
      throw new Error(data?.error?.message || 'No se pudo subir a Cloudinary');
    }

    return data;
  }
};
const CloudinaryAI = {
  buildOriginalOptimizedUrl(secureUrl) {
    return secureUrl.replace(
      '/upload/',
      '/upload/e_improve/f_auto,q_auto/'
    );
  },

  buildBgRemovalUrl(secureUrl) {
    return secureUrl.replace('/upload/', '/upload/e_background_removal/f_auto,q_auto/');
  },

  buildGenFillUrl(secureUrl) {
    return secureUrl.replace(
      '/upload/',
      `/upload/c_pad,b_gen_fill,w_${CONFIG.OUTPUT_WIDTH},h_${CONFIG.OUTPUT_HEIGHT},g_auto/f_auto,q_auto/`
    );
  }
};
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
   Init
   ========================= */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
