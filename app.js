// ==========================================
// CONFIGURACIÓN - REEMPLAZAR CON TUS DATOS
// ==========================================
const CONFIG = {
    // Google Apps Script Web App URL
    GAS_URL: 'https://script.google.com/macros/s/AKfycbxDzBZ24YZMInvYH6SiFk6fJkUt0S_Q3PlYS4z6R7PlghXbKUWqPt_3ZlXx772sO8xGFw/exec',
    
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: 'dwgwbdtud',
    CLOUDINARY_UPLOAD_PRESET: 'dra_bruzera_unsigned',

    // Pollinations
    POLLINATIONS_API_KEY: 'sk_ra2ebNYzZbwxPSGKUA2FEFZjFJnpr152',
    POLLINATIONS_URL: 'https://image.pollinations.ai/prompt'
};

// ==========================================
// JSONP
// ==========================================
const JSONP = {
    callbacks: {},
    counter: 0,
    timeout: 200000,

    request: function(url, params, callback) {
        const callbackName = 'jsonp_callback_' + (++this.counter);
        const script = document.createElement('script');
        let finished = false;

        const cleanup = () => {
            if (script.parentNode) script.parentNode.removeChild(script);
            delete this.callbacks[callbackName];
            window[callbackName] = function() {};
        };

        window[callbackName] = (data) => {
            if (finished) return;
            finished = true;

            clearTimeout(timeoutId);
            cleanup();
            callback(null, data);
        };

        this.callbacks[callbackName] = true;

        const paramsArray = [];
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null) {
                paramsArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
        }

        paramsArray.push('callback=' + callbackName);

        const fullUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + paramsArray.join('&');

        script.src = fullUrl;

        script.onerror = () => {
            if (finished) return;
            finished = true;

            clearTimeout(timeoutId);
            cleanup();
            callback(new Error('Error JSONP'));
        };

        const timeoutId = setTimeout(() => {
            if (finished) return;
            finished = true;

            cleanup();
            callback(new Error('Timeout'));
        }, this.timeout);

        document.head.appendChild(script);
    }
};

// ==========================================
// USER
// ==========================================
const UserManager = {
    getUserId: function() {
        let userId = localStorage.getItem('dra_bruzera_userid');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('dra_bruzera_userid', userId);
        }
        return userId;
    }
};

// ==========================================
// CLOUDINARY
// ==========================================
const CloudinaryUpload = {
    upload: function(file, folder = 'dra_bruzera') {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
            formData.append('cloud_name', CONFIG.CLOUDINARY_CLOUD_NAME);
            formData.append('folder', folder);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`, true);
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.secure_url);
                } else {
                    reject(new Error('Error Cloudinary'));
                }
            };
            
            xhr.onerror = () => reject(new Error('Error red'));
            xhr.send(formData);
        });
    }
};

// ==========================================
// BACKEND (GOOGLE APPS SCRIPT)
// ==========================================
const Backend = {
    init: function(callback) {
        JSONP.request(CONFIG.GAS_URL, {
            action: 'init',
            userId: UserManager.getUserId()
        }, callback);
    },

    registrarUso: function(tipo, titulo, creditos, callback) {
        JSONP.request(CONFIG.GAS_URL, {
            action: 'registrar',
            userId: UserManager.getUserId(),
            tipo: tipo,
            titulo: titulo,
            creditos: creditos
        }, callback);
    },

    enhanceImage: function(imageUrl, texto, callback) {
    JSONP.request(CONFIG.GAS_URL, {
        action: 'enhanceOpenAI',
        imageUrl: imageUrl,
        texto: texto
    }, callback);
}
};

// ==========================================
// POLLINATIONS IA
// ==========================================
const PollinationsAI = {
    lastUsed: false,
    lastUrl: null,

    enhanceSubject: function(imageUrl) {
        const prompt = 'subject isolation, keep original subject unchanged, preserve face and identity exactly, do not replace subject, no animals, no dogs, no cats, no pets, professional portrait enhancement, clean edges, soft background blur, studio lighting, high sharpness, natural skin tones, subtle glow, premium quality, centered subject, modern marketing flyer style, floral design elements around borders, soft flowers, botanical decoration, elegant composition, colorful but clean, instagram ad design, high-end branding look';
        const encodedPrompt = encodeURIComponent(prompt);
        const encodedImage = encodeURIComponent(imageUrl);
        
        let url = `${CONFIG.POLLINATIONS_URL}/${encodedPrompt}?width=800&height=1000&seed=42&nologo=true&reference=${encodedImage}&strength=0.35`;
        
        if (CONFIG.POLLINATIONS_API_KEY) {
            url += `&key=${CONFIG.POLLINATIONS_API_KEY}`;
        }
        
        this.lastUrl = url;
        return url;
    },

    processImage: async function(imageUrl) {
        console.log('🤖 IA: Iniciando...');
        const startTime = Date.now();
        
        const pollinationUrl = this.enhanceSubject(imageUrl);
        
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                console.log(`✅ IA: OK en ${Date.now() - startTime}ms`);
                this.lastUsed = true;
                resolve(pollinationUrl);
            };
            
            img.onerror = () => {
                console.log('❌ IA: Falló');
                this.lastUsed = false;
                resolve(imageUrl);
            };
            
            setTimeout(() => {
                if (!img.complete) {
                    console.log('⏱️ IA: Timeout');
                    this.lastUsed = false;
                    resolve(imageUrl);
                }
            }, 200000);
            
            img.src = pollinationUrl;
        });
    }
};



// ==========================================
// GENERADOR FLYER
// ==========================================
const FlyerGenerator = {
    canvas: null,
    ctx: null,

    init: function() {
        this.canvas = document.getElementById('flyerCanvas');
        this.ctx = this.canvas.getContext('2d');
    },

    generate: async function(mainImageData, logoData, text, enhancedImageUrl, mainUrl) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        const iaUsed = enhancedImageUrl !== mainUrl;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Fondo limpio
        await this.drawBackground();

        // 3. Título oculto detrás del zócalo
        this.drawHiddenTitle(text);
        
        // 2. Imagen principal
        await this.drawSubject(enhancedImageUrl);
        
        // 4. Zócalo
        this.drawFooter();

        // 5. Logo arriba del zócalo
        if (logoData) {
            await this.drawLogoCenterRect(logoData);
        }

        // 6. Marca IA
        //if (iaUsed) this.drawIAMark();

        return {
            dataUrl: canvas.toDataURL('image/jpeg', 0.95),
            iaUsed: iaUsed
        };
    },

    drawBackground: function() {
        return new Promise((resolve) => {
            const ctx = this.ctx;
            const canvas = this.canvas;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            resolve();
        });
    },

    drawSubject: function(imageUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const ctx = this.ctx;
                const canvas = this.canvas;

                const footerHeight = 0;
                const targetX = 0;
                const targetY = 0;
                const targetW = canvas.width;
                const targetH = canvas.height - footerHeight;

                const scale = Math.max(targetW / img.width, targetH / img.height);
                const drawW = img.width * scale;
                const drawH = img.height * scale;
                const drawX = targetX + (targetW - drawW) / 2;
                const drawY = targetY + (targetH - drawH) / 2;

                ctx.save();
                ctx.drawImage(img, drawX, drawY, drawW, drawH);
                ctx.restore();

                resolve();
            };

            img.onerror = () => resolve();
            img.src = imageUrl;
        });
    },

    drawHiddenTitle: function(text) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        if (!text) return;

        const footerHeight = 180;
        const x = canvas.width / 2;
        const y = canvas.height - (footerHeight / 2);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.font = '600 22px';
        ctx.fillText(text, x, y);
    },

    drawTitleSmart: function(text) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        if (!text) return;

        const footerHeight = 180;
        const x = canvas.width / 2;
        const y = canvas.height - (footerHeight / 2);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '600 22px';
        ctx.fillText(text, x, y);
    },

    drawWatermark: function() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-Math.PI / 12);
        ctx.font = 'bold 100px Montserrat';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DRA. BRUZERA', 0, 0);
        ctx.restore();
    },

    drawLogoCenterRect: function(logoData) {
        return new Promise((resolve) => {
            const img = new Image();

            img.onload = () => {
                const ctx = this.ctx;
                const canvas = this.canvas;

                const footerHeight = 240;
                const boxW = 180;
                const boxH = 180;
                const x = (canvas.width - boxW) / 2;
                const y = canvas.height - footerHeight - 70;

                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.25)';
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 6;

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(x, y, boxW, boxH, 22);
                ctx.fill();

                const padding = 14;
                const maxW = boxW - padding * 2;
                const maxH = boxH - padding * 2;
                const scale = Math.min(maxW / img.width, maxH / img.height);

                const drawW = img.width * scale;
                const drawH = img.height * scale;
                const drawX = x + (boxW - drawW) / 2;
                const drawY = y + (boxH - drawH) / 2;

                ctx.drawImage(img, drawX, drawY, drawW, drawH);
                ctx.restore();

                resolve();
            };

            img.onerror = () => resolve();
            img.src = logoData;
        });
    },

   drawFooter: function() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        const footerHeight = 180;
        const y = canvas.height - footerHeight;

        // ── SOMBRA DEL ZÓCALO ──────────────────────────────────────────
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = -8;

        ctx.beginPath();
        ctx.moveTo(0, y + 40);
        ctx.bezierCurveTo(canvas.width * 0.25, y - 10, canvas.width * 0.75, y + 55, canvas.width, y + 20);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, '#2a4a6f');
        gradient.addColorStop(1, '#1a3050');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        // ── LÍNEAS MAGENTA ENTRELAZADAS ────────────────────────────────
        // Línea 1 — gruesa, arco principal (va de izq-abajo a der-arriba)
        ctx.beginPath();
        ctx.moveTo(0, y + 50);
        ctx.bezierCurveTo(canvas.width * 0.3, y - 20, canvas.width * 0.7, y + 60, canvas.width, y + 10);
        ctx.strokeStyle = 'rgba(216, 27, 96, 0.9)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Línea 2 — delgada, arco invertido (va de izq-arriba a der-abajo, cruza línea 1)
        ctx.beginPath();
        ctx.moveTo(0, y + 15);
        ctx.bezierCurveTo(canvas.width * 0.25, y + 70, canvas.width * 0.65, y - 5, canvas.width, y + 45);
        ctx.strokeStyle = 'rgba(216, 27, 96, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Línea 3 — media, arco suave que cruza entre las dos anteriores
        ctx.beginPath();
        ctx.moveTo(0, y + 30);
        ctx.bezierCurveTo(canvas.width * 0.4, y + 55, canvas.width * 0.6, y - 10, canvas.width, y + 28);
        ctx.strokeStyle = 'rgba(216, 27, 96, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── DATOS DE CONTACTO CON ICONOS ───────────────────────────────
        const baseY = y + 118;
        const leftX   = canvas.width * 0.18;
        const centerX = canvas.width * 0.50;
        const rightX  = canvas.width * 0.82;
        const iconSize = 22;
        const iconY = baseY - 36;
        const textFont = '600 22px Montserrat, Arial, sans-serif';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        // ── Icono Instagram (cámara redondeada) ──
        const drawInstagramIcon = (cx, cy, s) => {
            const r = s * 0.38;
            const x = cx - s / 2;
            const yy = cy - s / 2;

            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.fillStyle = 'transparent';

            // cuerpo
            ctx.beginPath();
            ctx.roundRect(x, yy, s, s, s * 0.22);
            ctx.stroke();

            // lente
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            // punto superior derecho
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + s * 0.78, yy + s * 0.22, s * 0.07, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // ── Icono Web (globo) ──
        const drawWebIcon = (cx, cy, s) => {
            const r = s * 0.46;
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;

            // círculo exterior
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            // elipse horizontal (líneas de latitud)
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 0.52, r, 0, 0, Math.PI * 2);
            ctx.stroke();

            // línea horizontal central
            ctx.beginPath();
            ctx.moveTo(cx - r, cy);
            ctx.lineTo(cx + r, cy);
            ctx.stroke();

            // línea vertical central
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx, cy + r);
            ctx.stroke();

            ctx.restore();
        };

        // ── Icono Teléfono ──
        const drawPhoneIcon = (cx, cy, s) => {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const w = s * 0.55;
            const h = s * 0.9;
            const x = cx - w / 2;
            const yy = cy - h / 2;
            const rr = s * 0.12;

            // cuerpo del teléfono
            ctx.beginPath();
            ctx.roundRect(x, yy, w, h, rr);
            ctx.stroke();

            // pantalla
            ctx.beginPath();
            ctx.roundRect(x + s * 0.08, yy + s * 0.1, w - s * 0.16, h - s * 0.28, rr * 0.5);
            ctx.stroke();

            // botón home
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, yy + h - s * 0.1, s * 0.06, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // Dibujar iconos
        drawInstagramIcon(leftX,   iconY, iconSize);
        drawWebIcon(centerX,       iconY, iconSize);
        drawPhoneIcon(rightX,      iconY, iconSize);

        // Textos
        ctx.fillStyle = '#ffffff';
        ctx.font = textFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText('@DraBruzera',        leftX,   baseY);
        ctx.fillText('www.bruzera.turnox.pro',  centerX, baseY);
        ctx.fillText('343 5303848',        rightX,  baseY);
    },

}; // cierra FlyerGenerator

// ==========================================
// UI
// ==========================================
const UI = {
    elements: {},
    mainImageData: null,
    logoImageData: null,

    init: function() {
        this.elements = {
            mainImage: document.getElementById('mainImage'),
            logoImage: document.getElementById('logoImage'),
            flyerText: document.getElementById('flyerText'),
            generateBtn: document.getElementById('generateBtn'),
            mainImagePreview: document.getElementById('mainImagePreview'),
            logoPreview: document.getElementById('logoPreview'),
            wordCount: document.getElementById('wordCount'),
            loader: document.getElementById('loader'),
            resultSection: document.getElementById('resultSection'),
            canvas: document.getElementById('flyerCanvas'),
            downloadBtn: document.getElementById('downloadBtn'),
            newFlyerBtn: document.getElementById('newFlyerBtn')
        };

        this.bindEvents();
        this.checkFormValidity();
        FlyerGenerator.init();
        Backend.init(() => {});
    },

    bindEvents: function() {
        const e = this.elements;

        e.mainImage.addEventListener('change', (ev) => {
            this.handleFileSelect(ev, e.mainImagePreview, 'main');
        });

        e.logoImage.addEventListener('change', (ev) => {
            this.handleFileSelect(ev, e.logoPreview, 'logo');
        });

        e.flyerText.addEventListener('input', () => {
            const words = e.flyerText.value.trim().split(/\s+/).filter(w => w.length > 0);
            e.wordCount.textContent = words.length + ' palabra' + (words.length !== 1 ? 's' : '');
            this.checkFormValidity();
        });

        e.generateBtn.addEventListener('click', () => this.generateFlyer());
        e.downloadBtn.addEventListener('click', () => this.downloadFlyer());
        e.newFlyerBtn.addEventListener('click', () => this.resetForm());
    },

    handleFileSelect: function(event, previewContainer, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            if (type === 'main') {
                this.mainImageData = e.target.result;
            } else {
                this.logoImageData = e.target.result;
            }
            this.checkFormValidity();
        };
        reader.readAsDataURL(file);
    },

    checkFormValidity: function() {
        const e = this.elements;
        e.generateBtn.disabled = !(this.mainImageData && e.flyerText.value.trim().length > 0);
    },

    generateFlyer: async function() {
        const e = this.elements;

        e.loader.classList.remove('hidden');
        e.resultSection.classList.add('hidden');

        try {
            const text = e.flyerText.value.trim();

            const mainFile = await this.dataURLtoFile(this.mainImageData, 'main.jpg');
            const mainUrl = await CloudinaryUpload.upload(mainFile, 'dra_bruzera/originales');

            const enhancedUrl = await new Promise((resolve) => {
                Backend.enhanceImage(mainUrl, text, (err, res) => {
                    console.log('📦 enhanceImage -> err:', err);
                    console.log('📦 enhanceImage -> res:', res);

                    if (err || !res || !res.success || !res.enhancedUrl) {
                        console.log('⚠️ OpenAI fallback');
                        resolve(mainUrl);
                        return;
                    }

                    console.log('🤖 OpenAI OK');
                    resolve(res.enhancedUrl);
                });
            });

            let logoUrl = null;
            if (this.logoImageData) {
                const logoFile = await this.dataURLtoFile(this.logoImageData, 'logo.png');
                logoUrl = await CloudinaryUpload.upload(logoFile, 'dra_bruzera/logos');
            }

            Backend.registrarUso('imagen', text, 1, () => {});

            const result = await FlyerGenerator.generate(this.mainImageData, this.logoImageData, text, enhancedUrl, mainUrl);

            const finalFile = await this.dataURLtoFile(result.dataUrl, 'flyer.jpg');
            const finalUrl = await CloudinaryUpload.upload(finalFile, 'dra_bruzera/flyers');

            console.log('✅ IA usada:', result.iaUsed);
            console.log('🔗 Final:', finalUrl);

            e.loader.classList.add('hidden');
            e.resultSection.classList.remove('hidden');
            e.resultSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error generando flyer.');
            e.loader.classList.add('hidden');
        }
    },

    dataURLtoFile: function(dataurl, filename) {
        return new Promise((resolve) => {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            resolve(new File([u8arr], filename, { type: mime }));
        });
    },

    downloadFlyer: function() {
        const link = document.createElement('a');
        link.download = 'flyer-dra-bruzera.jpg';
        link.href = this.elements.canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    },

    resetForm: function() {
        const e = this.elements;
        e.mainImage.value = '';
        e.logoImage.value = '';
        e.flyerText.value = '';
        e.mainImagePreview.innerHTML = '<span class="preview-placeholder">Vista previa</span>';
        e.logoPreview.innerHTML = '<span class="preview-placeholder">Vista previa</span>';
        e.wordCount.textContent = '0 palabras';
        e.resultSection.classList.add('hidden');
        this.mainImageData = null;
        this.logoImageData = null;
        this.checkFormValidity();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
