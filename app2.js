// ==========================================
// CONFIGURACIÓN - REEMPLAZAR CON TUS DATOS
// ==========================================
const CONFIG = {
    // Google Apps Script Web App URL
    GAS_URL: 'https://script.google.com/macros/s/AKfycbxCJBHyutOZrL9zPvUrhb5V1f0yddX-sRfdR6Z7_O-uEVCbHJSSW6gUYyLjb08kESQa/exec',
    
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: 'dwgwbdtud',
    CLOUDINARY_UPLOAD_PRESET: 'dra_bruzera_unsigned',
    
    // Pollinations
    POLLINATIONS_URL: 'https://image.pollinations.ai/prompt'
};

// ==========================================
// JSONP
// ==========================================
const JSONP = {
    callbacks: {},
    counter: 0,
    timeout: 30000,

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
// POLLINATIONS IA
// ==========================================
const PollinationsAI = {
    // Mejorar imagen y extraer sujeto con fondo transparente/blur
    enhanceSubject: function(imageUrl) {
        const prompt = 'professional veterinary photo, subject isolation, clean edges, enhanced lighting, high contrast, sharp focus, professional color grading, remove distracting background, keep subject realistic and detailed';
        
        const encodedPrompt = encodeURIComponent(prompt);
        const encodedImage = encodeURIComponent(imageUrl);
        
        // Usar reference para mantener la imagen base + strength bajo para no inventar
        return `${CONFIG.POLLINATIONS_URL}/${encodedPrompt}?width=800&height=1000&seed=42&nologo=true&reference=${encodedImage}&strength=0.25&negative_prompt=blurry,low quality,distorted,extra limbs,mutated`;
    },

    // Procesar imagen y devolver URL mejorada
    processImage: function(imageUrl) {
        return new Promise((resolve) => {
            // Crear imagen para verificar carga
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const pollinationUrl = this.enhanceSubject(imageUrl);
            
            img.onload = () => resolve(pollinationUrl);
            img.onerror = () => {
                // Fallback a imagen original si Pollinations falla
                console.log('Pollinations falló, usando original');
                resolve(imageUrl);
            };
            
            // Timeout de seguridad
            setTimeout(() => {
                if (!img.complete) {
                    resolve(imageUrl);
                }
            }, 15000);
            
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

    generate: async function(mainImageData, logoData, text, enhancedImageUrl) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Fondo con blur
        await this.drawBackground(mainImageData);
        
        // 2. Marca de agua
        this.drawWatermark();
        
        // 3. Sujeto mejorado por IA (o original si falló)
        await this.drawSubject(enhancedImageUrl || mainImageData);
        
        // 4. Logo
        if (logoData) {
            await this.drawSmallLogo(logoData);
        }
        
        // 5. Banda magenta con texto (al frente)
        this.drawHeaderBand(text);
        
        // 6. Footer
        this.drawFooter();
        
        return canvas.toDataURL('image/jpeg', 0.95);
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
                
                // Blur y oscurecer fondo
                ctx.filter = 'blur(12px) brightness(0.6)';
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                ctx.filter = 'none';
                
                // Overlay azul
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
                const canvas = this.canvas;
                
                // Espacio disponible: entre banda (140) y footer (160)
                const availableHeight = canvas.height - 320;
                const scale = Math.min(
                    (canvas.width * 0.8) / img.width,
                    availableHeight / img.height
                );
                
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (canvas.width - width) / 2;
                const y = 150 + (availableHeight - height) / 2;
                
                // Sombra
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 50;
                ctx.shadowOffsetY = 20;
                
                // Recorte suave
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

    drawSmallLogo: function(logoData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const ctx = this.ctx;
                const size = 65;
                const padding = 30;
                const yPos = 37;
                
                // Fondo circular
                ctx.beginPath();
                ctx.arc(padding + size/2, yPos + size/2, size/2 + 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.fill();
                
                // Logo circular
                ctx.save();
                ctx.beginPath();
                ctx.arc(padding + size/2, yPos + size/2, size/2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, padding, yPos, size, size);
                ctx.restore();
                
                resolve();
            };
            img.onerror = () => resolve();
            img.src = logoData;
        });
    },

    drawHeaderBand: function(text) {
        const ctx = this.ctx;
        const bandHeight = 140;
        
        // Fondo magenta
        ctx.fillStyle = '#d81b60';
        ctx.fillRect(0, 0, this.canvas.width, bandHeight);
        
        // Sombra
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
        
        const maxWidth = this.canvas.width - 120;
        while (ctx.measureText(text.toUpperCase()).width > maxWidth && fontSize > 24) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px Montserrat`;
        }
        
        ctx.fillText(text.toUpperCase(), this.canvas.width / 2, bandHeight / 2);
    },

    drawFooter: function() {
        const ctx = this.ctx;
        const footerHeight = 160;
        const y = this.canvas.height - footerHeight;
        
        // Onda
        ctx.beginPath();
        ctx.moveTo(0, y + 50);
        ctx.bezierCurveTo(
            this.canvas.width * 0.25, y - 10,
            this.canvas.width * 0.75, y + 70,
            this.canvas.width, y + 30
        );
        ctx.lineTo(this.canvas.width, this.canvas.height);
        ctx.lineTo(0, this.canvas.height);
        ctx.closePath();
        
        // Gradiente azul
        const gradient = ctx.createLinearGradient(0, y, 0, this.canvas.height);
        gradient.addColorStop(0, '#2a4a6f');
        gradient.addColorStop(1, '#1e3a5f');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Línea magenta decorativa
        ctx.beginPath();
        ctx.moveTo(0, y + 45);
        ctx.bezierCurveTo(
            this.canvas.width * 0.25, y - 15,
            this.canvas.width * 0.75, y + 65,
            this.canvas.width, y + 25
        );
        ctx.strokeStyle = '#d81b60';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Contacto
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
    }
};

// ==========================================
// BACKEND
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
        
        Backend.init((err, data) => {
            if (err) console.log('Error init:', err);
        });
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
        const hasImage = this.mainImageData && this.mainImageData.length > 0;
        const hasText = e.flyerText.value.trim().length > 0;
        e.generateBtn.disabled = !(hasImage && hasText);
    },

    generateFlyer: async function() {
        const e = this.elements;
        
        e.loader.classList.remove('hidden');
        e.resultSection.classList.add('hidden');
        
        try {
            const text = e.flyerText.value.trim();
            
            // 1. Subir imagen original a Cloudinary (para tener URL pública)
            const mainFile = await this.dataURLtoFile(this.mainImageData, 'main.jpg');
            const mainUrl = await CloudinaryUpload.upload(mainFile, 'dra_bruzera/originales');
            
            // 2. PROCESAR CON IA (Pollinations)
            console.log('Procesando con IA...');
            const enhancedUrl = await PollinationsAI.processImage(mainUrl);
            
            // 3. Subir logo si existe
            let logoUrl = null;
            if (this.logoImageData) {
                const logoFile = await this.dataURLtoFile(this.logoImageData, 'logo.png');
                logoUrl = await CloudinaryUpload.upload(logoFile, 'dra_bruzera/logos');
            }
            
            // 4. Registrar uso
            Backend.registrarUso('imagen', text, 1, () => {});
            
            // 5. Generar flyer con imagen mejorada
            await FlyerGenerator.generate(this.mainImageData, this.logoImageData, text, enhancedUrl);
            
            // 6. Subir resultado final
            const finalDataUrl = e.canvas.toDataURL('image/jpeg', 0.95);
            const finalFile = await this.dataURLtoFile(finalDataUrl, 'flyer.jpg');
            const finalUrl = await CloudinaryUpload.upload(finalFile, 'dra_bruzera/flyers');
            
            console.log('Final:', finalUrl);
            
            e.loader.classList.add('hidden');
            e.resultSection.classList.remove('hidden');
            e.resultSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error generando flyer. Intentá de nuevo.');
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
