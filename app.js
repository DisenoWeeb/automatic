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
    timeout: 60000,

    request: function(url, params, callback) {
        const callbackName = 'jsonp_callback_' + (++this.counter);
        const script = document.createElement('script');
        const cleanup = () => {
            if (script.parentNode) script.parentNode.removeChild(script);
            delete this.callbacks[callbackName];
            delete window[callbackName];
        };

        window[callbackName] = (data) => {
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
            clearTimeout(timeoutId);
            cleanup();
            callback(new Error('Error JSONP'));
        };

        const timeoutId = setTimeout(() => {
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
    
    // 1. Fondo
    await this.drawBackground(mainImageData);
        
        // 2. Marca de agua
        this.drawWatermark();
        
        // 3. Sujeto
        await this.drawSubject(enhancedImageUrl);
        
        // 4. BANDA MAGENTA (antes del logo para que el logo esté ENCIMA)
       // this.drawHeaderBand(text);
        this.drawTitleSmart(text);
        // 5. Logo chico (AHORA DESPUÉS DE LA BANDA, visible)
        if (logoData) {
            await this.drawSmallLogo(logoData);
        }
        
        // 6. Footer
        this.drawFooter();
        
        // 7. Marca IA
        if (iaUsed) this.drawIAMark();
        
        return {
            dataUrl: canvas.toDataURL('image/jpeg', 0.95),
            iaUsed: iaUsed
        };
    },
   drawTitleSmart: function(text) {
    const ctx = this.ctx;
    const canvas = this.canvas;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "left";

    const padding = 60;

    ctx.fillText(text, padding, padding + 40);
},
    drawTitleSmart: function(text) {
    const ctx = this.ctx;
    const canvas = this.canvas;

    if (!text) return;

    const paddingX = 60;
    const topY = 95;
    const maxWidth = canvas.width * 0.42;

    let fontSize = 64;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    const lines = [];
    const words = text.toUpperCase().split(/\s+/).filter(Boolean);

    const buildLines = () => {
        lines.length = 0;
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const width = ctx.measureText(testLine).width;

            if (width <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }

        if (currentLine) lines.push(currentLine);
    };

    do {
        ctx.font = `bold ${fontSize}px Montserrat, Arial, sans-serif`;
        buildLines();
        fontSize -= 2;
    } while ((lines.length > 3 || lines.some(line => ctx.measureText(line).width > maxWidth)) && fontSize > 34);

    ctx.font = `bold ${fontSize}px Montserrat, Arial, sans-serif`;

    const lineHeight = fontSize * 1.08;
    const blockHeight = lines.length * lineHeight;

    // prueba primero arriba izquierda
    const leftX = paddingX;
    const rightX = canvas.width - paddingX - maxWidth;

    // como el sujeto está bastante centrado, elegimos derecha por defecto
    // si querés, podés invertir esta prioridad
    const preferredX = rightX;

    // fondo sutil detrás del texto para legibilidad
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.roundRect(preferredX - 18, topY - 12, maxWidth + 36, blockHeight + 24, 18);
    ctx.fill();

    // texto
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], preferredX, topY + i * lineHeight);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
},
    drawBackground: function(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const ctx = this.ctx;
                const canvas = this.canvas;
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                
                ctx.filter = 'blur(12px) brightness(0.6)';
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                ctx.filter = 'none';
                
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, 'rgba(30, 58, 95, 0.5)');
                gradient.addColorStop(0.5, 'rgba(30, 58, 95, 0.3)');
                gradient.addColorStop(1, 'rgba(30, 58, 95, 0.6)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                resolve();
            };
            img.onerror = reject;
            img.src = imageData;
        });
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

    drawSubject: function(imageUrl) {
        
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const ctx = this.ctx;
                const availableHeight = this.canvas.height - 320;
                const scale = Math.min((this.canvas.width * 0.8) / img.width, availableHeight / img.height);
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (this.canvas.width - width) / 2;
                const y = 150 + (availableHeight - height) / 2;
                
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 50;
                ctx.shadowOffsetY = 20;
                
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(x - 5, y - 5, width + 10, height + 10, 15);
                ctx.clip();
                ctx.drawImage(img, x, y, width, height);
                ctx.restore();
                
                ctx.shadowColor = 'transparent';
                resolve();
            };
            img.onerror = () => resolve();
            img.src = imageUrl;
        });
    },

   drawHeaderBand: function(text) {
        const ctx = this.ctx;
        const bandHeight = 140;
        
        // Fondo magenta sólido
        ctx.fillStyle = '#d81b60';
        ctx.fillRect(0, 0, this.canvas.width, bandHeight);
        
        // Sombra debajo
        const shadowGradient = ctx.createLinearGradient(0, bandHeight, 0, bandHeight + 15);
        shadowGradient.addColorStop(0, 'rgba(0,0,0,0.2)');
        shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(0, bandHeight, this.canvas.width, 15);
        
        // Texto
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let fontSize = 48;
        ctx.font = `bold ${fontSize}px Montserrat`;
        const maxWidth = this.canvas.width - 200; // Dejar espacio para logo
        while (ctx.measureText(text.toUpperCase()).width > maxWidth && fontSize > 24) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px Montserrat`;
        }
        ctx.fillText(text.toUpperCase(), this.canvas.width / 2 + 40, bandHeight / 2); // +40 para no tapar logo
    },

    drawSmallLogo: function(logoData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const ctx = this.ctx;
                const size = 120; // Un poco más grande
                const x = -30;    // Margen izquierdo
                const y = 30;    // Margen superior (dentro de los 140px de banda)
                
                // Fondo blanco circular con borde
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/2 + 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Logo recortado circular
                ctx.save();
                ctx.beginPath();
                ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, x, y, size, size);
                ctx.restore();
                
                // Sombra sutil
                ctx.shadowColor = 'rgba(0,0,0,0.2)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 3;
                
                resolve();
            };
            img.onerror = () => resolve();
            img.src = logoData;
        });
    },
 


    drawFooter: function() {
        const ctx = this.ctx;
        const footerHeight = 160;
        const y = this.canvas.height - footerHeight;
        
        ctx.beginPath();
        ctx.moveTo(0, y + 50);
        ctx.bezierCurveTo(this.canvas.width * 0.25, y - 10, this.canvas.width * 0.75, y + 70, this.canvas.width, y + 30);
        ctx.lineTo(this.canvas.width, this.canvas.height);
        ctx.lineTo(0, this.canvas.height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, y, 0, this.canvas.height);
        gradient.addColorStop(0, '#2a4a6f');
        gradient.addColorStop(1, '#1e3a5f');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(0, y + 45);
        ctx.bezierCurveTo(this.canvas.width * 0.25, y - 15, this.canvas.width * 0.75, y + 65, this.canvas.width, y + 25);
        ctx.strokeStyle = '#d81b60';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const centerY = y + 85;
        ctx.font = '700 26px Montserrat';
        ctx.fillText('@dra.bruzera', this.canvas.width / 2, centerY);
        ctx.font = '500 20px Montserrat';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText('www.drabruzera.com', this.canvas.width / 2, centerY + 30);
        ctx.font = '600 22px Montserrat';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('WhatsApp: 11-XXXX-XXXX', this.canvas.width / 2, centerY + 58);
    },

    drawIAMark: function() {
        const ctx = this.ctx;
        const x = this.canvas.width - 50;
        const y = this.canvas.height - 30;
        
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#d81b60';
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AI', x, y);
    }
};

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

