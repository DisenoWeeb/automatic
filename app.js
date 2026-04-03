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
    timeout: 30000, // 30 segundos

    request: function(url, params, callback) {
        const callbackName = 'jsonp_callback_' + (++this.counter);
        const script = document.createElement('script');
        const cleanup = () => {
            if (script.parentNode) script.parentNode.removeChild(script);
            delete this.callbacks[callbackName];
            delete window[callbackName];
        };

        // Crear función callback global
        window[callbackName] = (data) => {
            clearTimeout(timeoutId);
            cleanup();
            callback(null, data);
        };

        // Guardar referencia para timeout
        this.callbacks[callbackName] = true;

        // Construir URL con parámetros
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

        // Timeout
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
// POLLINATIONS IA
// ==========================================
const PollinationsAI = {
    enhanceImage: function(imageUrl, subject) {
        // Crear prompt para mejorar/recortar el sujeto sin inventar
        const prompt = `professional photo of ${subject}, high quality, sharp focus, clean edges, enhanced contrast, professional lighting, veterinary clinic style, remove distracting background elements, keep subject realistic and recognizable, maintain original pose and features`;
        
        const encodedPrompt = encodeURIComponent(prompt);
        const encodedImage = encodeURIComponent(imageUrl);
        
        // Usar image.pollinations.ai con seed fijo para consistencia
        return `${CONFIG.POLLINATIONS_URL}/${encodedPrompt}?width=1080&height=1350&seed=42&nologo=true&reference=${encodedImage}&strength=0.3`;
    },

    removeBackground: function(imageUrl) {
        // Prompt específico para extracción de sujeto
        const prompt = `subject cutout, transparent background, professional isolation, clean edges, maintain all details, high quality extraction`;
        const encodedPrompt = encodeURIComponent(prompt);
        
        return `${CONFIG.POLLINATIONS_URL}/${encodedPrompt}?width=1080&height=1350&seed=123&nologo=true&reference=${encodeURIComponent(imageUrl)}&strength=0.5`;
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
// GENERADOR DE FLYER
// ==========================================
const FlyerGenerator = {
    canvas: null,
    ctx: null,
    
    init: function() {
        this.canvas = document.getElementById('flyerCanvas');
        this.ctx = this.canvas.getContext('2d');
    },

    generate: async function(mainImage, logoImage, text) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Dibujar fondo (imagen principal en modo cover)
        await this.drawBackground(mainImage);
        
        // 2. Overlay azul suave
        this.drawOverlay();
        
        // 3. Logo grande marca de agua (detrás del sujeto)
        this.drawWatermark();
        
        // 4. Sujeto principal con procesamiento
        await this.drawSubject(mainImage);
        
        // 5. Logo chico arriba izquierda
        if (logoImage) {
            await this.drawSmallLogo(logoImage);
        }
        
        // 6. Banda magenta superior con texto
        this.drawHeaderBand(text);
        
        // 7. Zócalo inferior con información
        this.drawFooter();
        
        return canvas.toDataURL('image/jpeg', 0.95);
    },

    drawBackground: function(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const ctx = this.ctx;
                const canvas = this.canvas;
                
                // Calcular cover
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    },

    drawOverlay: function() {
        const ctx = this.ctx;
        // Overlay azul suave para mejorar legibilidad
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(30, 58, 95, 0.3)');
        gradient.addColorStop(0.5, 'rgba(30, 58, 95, 0.1)');
        gradient.addColorStop(1, 'rgba(30, 58, 95, 0.4)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    drawWatermark: function() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-Math.PI / 12);
        
        // Texto marca de agua
        ctx.font = 'bold 120px Montserrat';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DRA. BRUZERA', 0, 0);
        
        ctx.restore();
    },

    drawSubject: function(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const ctx = this.ctx;
                
                // Posicionar sujeto en el centro-inferior
                const targetHeight = this.canvas.height * 0.65;
                const scale = targetHeight / img.height;
                const width = img.width * scale;
                const height = targetHeight;
                
                const x = (this.canvas.width - width) / 2;
                const y = this.canvas.height * 0.25;
                
                // Sombra suave detrás del sujeto
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetY = 10;
                
                ctx.drawImage(img, x, y, width, height);
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                
                resolve();
            };
            img.onerror = () => {
                // Si falla, continuar sin sujeto procesado
                resolve();
            };
            // Usar imagen original si Pollinations falla
            img.src = imageUrl;
        });
    },

    drawSmallLogo: function(logoUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const ctx = this.ctx;
                const size = 80;
                const padding = 30;
                
                // Fondo circular blanco semitransparente
                ctx.beginPath();
                ctx.arc(padding + size/2, padding + size/2, size/2 + 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fill();
                
                // Logo
                ctx.drawImage(img, padding, padding, size, size);
                resolve();
            };
            img.onerror = resolve; // Continuar sin logo si falla
            img.src = logoUrl;
        });
    },

    drawHeaderBand: function(text) {
        const ctx = this.ctx;
        
        // Banda magenta superior
        const bandHeight = 140;
        ctx.fillStyle = '#d81b60';
        ctx.fillRect(0, 0, this.canvas.width, bandHeight);
        
        // Sombra de la banda
        const gradient = ctx.createLinearGradient(0, bandHeight, 0, bandHeight + 20);
        gradient.addColorStop(0, 'rgba(216, 27, 96, 0.3)');
        gradient.addColorStop(1, 'rgba(216, 27, 96, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, bandHeight, this.canvas.width, 20);
        
        // Texto
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Ajustar tamaño si el texto es largo
        let fontSize = 52;
        while (ctx.measureText(text).width > this.canvas.width - 80 && fontSize > 24) {
            fontSize -= 4;
            ctx.font = `bold ${fontSize}px Montserrat`;
        }
        
        ctx.fillText(text.toUpperCase(), this.canvas.width / 2, bandHeight / 2 + 5);
    },

    drawFooter: function() {
        const ctx = this.ctx;
        const footerHeight = 180;
        const y = this.canvas.height - footerHeight;
        
        // Forma de onda moderna
        ctx.beginPath();
        ctx.moveTo(0, y + 40);
        ctx.bezierCurveTo(
            this.canvas.width * 0.3, y - 20,
            this.canvas.width * 0.7, y + 60,
            this.canvas.width, y + 20
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
        
        // Información de contacto
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 28px Montserrat';
        ctx.textAlign = 'center';
        
        const centerY = y + 100;
        const lineHeight = 40;
        
        // Iconos y texto
        ctx.font = '700 32px Montserrat';
        ctx.fillText('@dra.bruzera', this.canvas.width / 2, centerY);
        
        ctx.font = '500 24px Montserrat';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText('www.drabruzera.com', this.canvas.width / 2, centerY + lineHeight);
        
        ctx.font = '600 26px Montserrat';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('WhatsApp: 11-XXXX-XXXX', this.canvas.width / 2, centerY + lineHeight * 2);
    }
};

// ==========================================
// UI CONTROLLER
// ==========================================
const UI = {
    elements: {},
    
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
        
        // Inicializar canvas
        FlyerGenerator.init();
        
        // Inicializar usuario en backend
        Backend.init((err, data) => {
            if (err) console.log('Error init backend:', err);
            else console.log('Usuario inicializado:', data);
        });
    },

    bindEvents: function() {
        const e = this.elements;
        
        // Preview de imagen principal
        e.mainImage.addEventListener('change', (ev) => {
            this.handleFileSelect(ev, e.mainImagePreview, 'main');
        });
        
        // Preview de logo
        e.logoImage.addEventListener('change', (ev) => {
            this.handleFileSelect(ev, e.logoPreview, 'logo');
        });
        
        // Contador de palabras
        e.flyerText.addEventListener('input', () => {
            const words = e.flyerText.value.trim().split(/\s+/).filter(w => w.length > 0);
            e.wordCount.textContent = words.length + ' palabra' + (words.length !== 1 ? 's' : '');
            this.checkFormValidity();
        });
        
        // Generar
        e.generateBtn.addEventListener('click', () => this.generateFlyer());
        
        // Descargar
        e.downloadBtn.addEventListener('click', () => this.downloadFlyer());
        
        // Nuevo flyer
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
        
        // Mostrar loader
        e.loader.classList.remove('hidden');
        e.resultSection.classList.add('hidden');
        
        try {
            const text = e.flyerText.value.trim();
            
            // Subir imagen original a Cloudinary
            console.log('Subiendo imagen original...');
            const mainFile = await this.dataURLtoFile(this.mainImageData, 'main.jpg');
            const mainUrl = await CloudinaryUpload.upload(mainFile, 'dra_bruzera/originales');
            
            // Subir logo si existe
            let logoUrl = null;
            if (this.logoImageData) {
                const logoFile = await this.dataURLtoFile(this.logoImageData, 'logo.png');
                logoUrl = await CloudinaryUpload.upload(logoFile, 'dra_bruzera/logos');
            }
            
            // Registrar uso en backend
            Backend.registrarUso('imagen', text, 1, (err, data) => {
                if (err) console.log('Error registrando uso:', err);
                else console.log('Uso registrado:', data);
            });
            
            // Generar flyer en canvas
            console.log('Generando flyer...');
            await FlyerGenerator.generate(mainUrl, logoUrl, text);
            
            // Subir resultado final a Cloudinary
            const finalDataUrl = e.canvas.toDataURL('image/jpeg', 0.95);
            const finalFile = await this.dataURLtoFile(finalDataUrl, 'flyer.jpg');
            const finalUrl = await CloudinaryUpload.upload(finalFile, 'dra_bruzera/flyers');
            
            console.log('Flyer final:', finalUrl);
            
            // Mostrar resultado
            e.loader.classList.add('hidden');
            e.resultSection.classList.remove('hidden');
            
            // Scroll al resultado
            e.resultSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error generando flyer:', error);
            alert('Hubo un error generando el flyer. Por favor intentá de nuevo.');
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
