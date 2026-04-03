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
// UTILIDADES JSONP ROBUSTO
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
            callback(new Error('Error cargando script JSONP'));
        };

        const timeoutId = setTimeout(() => {
            cleanup();
            callback(new Error('Timeout en request JSONP'));
        }, this.timeout);

        document.head.appendChild(script);
    }
};

// ==========================================
// UTILIDADES DE USUARIO
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
// CLOUDINARY UPLOAD
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
                    reject(new Error('Error subiendo a Cloudinary'));
                }
            };
            
            xhr.onerror = () => reject(new Error('Error de red en Cloudinary'));
            xhr.send(formData);
        });
    }
};

// ==========================================
// GENERADOR DE FLYER - CORREGIDO
// ==========================================
const FlyerGenerator = {
    canvas: null,
    ctx: null,
    
    init: function() {
        this.canvas = document.getElementById('flyerCanvas');
        this.ctx = this.canvas.getContext('2d');
    },

    generate: async function(mainImageData, logoData, text) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Limpiar canvas completamente
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Dibujar fondo borroso/oscurecido (la imagen original como fondo)
        await this.drawBackground(mainImageData);
        
        // 2. Logo grande marca de agua (detrás del sujeto)
        this.drawWatermark();
        
        // 3. Sujeto principal recortado (SOLO UNA VEZ, en el centro)
        await this.drawSubject(mainImageData);
        
        // 4. Logo chico arriba izquierda
        if (logoData) {
            await this.drawSmallLogo(logoData);
        }
        
        // 5. Banda magenta superior con texto (AL FRENTE DE TODO)
        this.drawHeaderBand(text);
        
        // 6. Zócalo inferior
        this.drawFooter();
        
        return canvas.toDataURL('image/jpeg', 0.95);
    },

    drawBackground: function(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const ctx = this.ctx;
                const canvas = this.canvas;
                
                // Dibujar imagen como fondo con blur y oscurecido
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                
                // Filtro de blur para el fondo
                ctx.filter = 'blur(8px) brightness(0.7)';
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                ctx.filter = 'none';
                
                // Overlay azul adicional para legibilidad
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, 'rgba(30, 58, 95, 0.4)');
                gradient.addColorStop(0.5, 'rgba(30, 58, 95, 0.2)');
                gradient.addColorStop(1, 'rgba(30, 58, 95, 0.5)');
                
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
        
        // Texto marca de agua más sutil
        ctx.font = 'bold 100px Montserrat';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DRA. BRUZERA', 0, 0);
        
        ctx.restore();
    },

    drawSubject: function(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const ctx = this.ctx;
                const canvas = this.canvas;
                
                // Calcular dimensiones para que el sujeto ocupe el centro
                // Dejar espacio arriba para la banda magenta y abajo para el footer
                const availableHeight = canvas.height - 320; // 140 banda + 180 footer + margen
                const scale = Math.min(
                    (canvas.width * 0.85) / img.width,
                    availableHeight / img.height
                );
                
                const width = img.width * scale;
                const height = img.height * scale;
                
                // Centrar horizontalmente, posicionar verticalmente entre banda y footer
                const x = (canvas.width - width) / 2;
                const y = 160 + (availableHeight - height) / 2; // 160 = debajo de la banda magenta
                
                // Sombra suave
                ctx.shadowColor = 'rgba(0,0,0,0.4)';
                ctx.shadowBlur = 40;
                ctx.shadowOffsetY = 15;
                
                // Recorte circular/ovalado suave opcional (efecto moderno)
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(x - 10, y - 10, width + 20, height + 20, 20);
                ctx.clip();
                
                ctx.drawImage(img, x, y, width, height);
                ctx.restore();
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                
                resolve();
            };
            img.onerror = () => resolve(); // Continuar sin sujeto si falla
            img.src = imageData;
        });
    },

    drawSmallLogo: function(logoData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const ctx = this.ctx;
                const size = 70;
                const padding = 25;
                const yPos = 35; // Dentro de la banda magenta
                
                // Fondo circular blanco
                ctx.beginPath();
                ctx.arc(padding + size/2, yPos + size/2, size/2 + 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.fill();
                
                // Borde sutil
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Logo con recorte circular
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
        
        // Banda magenta superior - DIBUJAR AL FINAL PARA QUE ESTÉ AL FRENTE
        const bandHeight = 140;
        
        // Fondo sólido magenta
        ctx.fillStyle = '#d81b60';
        ctx.fillRect(0, 0, this.canvas.width, bandHeight);
        
        // Sombra sutil debajo de la banda
        const shadowGradient = ctx.createLinearGradient(0, bandHeight, 0, bandHeight + 15);
        shadowGradient.addColorStop(0, 'rgba(0,0,0,0.2)');
        shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(0, bandHeight, this.canvas.width, 15);
        
        // Texto centrado en la banda
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Ajustar tamaño de fuente según longitud
        let fontSize = 48;
        ctx.font = `bold ${fontSize}px Montserrat`;
        
        const maxWidth = this.canvas.width - 100;
        while (ctx.measureText(text.toUpperCase()).width > maxWidth && fontSize > 24) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px Montserrat`;
        }
        
        // Dibujar texto centrado verticalmente en la banda
        ctx.fillText(text.toUpperCase(), this.canvas.width / 2, bandHeight / 2);
    },

    drawFooter: function() {
        const ctx = this.ctx;
        const footerHeight = 160;
        const y = this.canvas.height - footerHeight;
        
        // Forma de onda moderna
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
        
        // Línea decorativa magenta
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
        
        // Información de contacto
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        
        const centerY = y + 90;
        
        // Instagram
        ctx.font = '700 28px Montserrat';
        ctx.fillText('@dra.bruzera', this.canvas.width / 2, centerY);
        
        // Web
        ctx.font = '500 22px Montserrat';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText('www.drabruzera.com', this.canvas.width / 2, centerY + 32);
        
        // WhatsApp
        ctx.font = '600 24px Montserrat';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('WhatsApp: 11-XXXX-XXXX', this.canvas.width / 2, centerY + 62);
    }
};

// ==========================================
// GOOGLE APPS SCRIPT BACKEND
// ==========================================
const Backend = {
    init: function(callback) {
        const userId = UserManager.getUserId();
        JSONP.request(CONFIG.GAS_URL, {
            action: 'init',
            userId: userId
        }, callback);
    },

    registrarUso: function(tipo, titulo, creditos, callback) {
        const userId = UserManager.getUserId();
        JSONP.request(CONFIG.GAS_URL, {
            action: 'registrar',
            userId: userId,
            tipo: tipo,
            titulo: titulo,
            creditos: creditos
        }, callback);
    }
};

// ==========================================
// UI CONTROLLER
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
            if (err) console.log('Error init backend:', err);
            else console.log('Usuario inicializado:', data);
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
            
            // Subir imagen original
            const mainFile = await this.dataURLtoFile(this.mainImageData, 'main.jpg');
            const mainUrl = await CloudinaryUpload.upload(mainFile, 'dra_bruzera/originales');
            
            // Subir logo si existe
            let logoUrl = null;
            if (this.logoImageData) {
                const logoFile = await this.dataURLtoFile(this.logoImageData, 'logo.png');
                logoUrl = await CloudinaryUpload.upload(logoFile, 'dra_bruzera/logos');
            }
            
            // Registrar uso
            Backend.registrarUso('imagen', text, 1, (err, data) => {
                if (err) console.log('Error registrando uso:', err);
            });
            
            // Generar flyer usando los Data URLs locales (más rápido y confiable)
            await FlyerGenerator.generate(this.mainImageData, this.logoImageData, text);
            
            // Subir resultado final
            const finalDataUrl = e.canvas.toDataURL('image/jpeg', 0.95);
            const finalFile = await this.dataURLtoFile(finalDataUrl, 'flyer.jpg');
            const finalUrl = await CloudinaryUpload.upload(finalFile, 'dra_bruzera/flyers');
            
            console.log('Flyer final:', finalUrl);
            
            e.loader.classList.add('hidden');
            e.resultSection.classList.remove('hidden');
            e.resultSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error generando el flyer. Intentá de nuevo.');
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
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
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
        e.mainImagePreview.innerHTML = '<span class="preview-placeholder">Vista previa de imagen principal</span>';
        e.logoPreview.innerHTML = '<span class="preview-placeholder">Vista previa del logo</span>';
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
