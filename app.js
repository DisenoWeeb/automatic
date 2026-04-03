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
    POLLINATIONS_API_KEY: 'sk_ra2ebNYzZbwxPSGKUA2FEFZjFJnpr152',
    POLLINATIONS_URL: 'https://image.pollinations.ai/prompt'
};
// ==========================================
// POLLINATIONS IA CON LOGGING
// ==========================================
const PollinationsAI = {
    lastUsed: false,
    lastUrl: null,

    enhanceSubject: function(imageUrl) {
        const prompt = 'professional veterinary photo, subject isolation, clean edges, enhanced lighting, high contrast, sharp focus';
        const encodedPrompt = encodeURIComponent(prompt);
        const encodedImage = encodeURIComponent(imageUrl);
        
        let url = `${CONFIG.POLLINATIONS_URL}/${encodedPrompt}?width=800&height=1000&seed=42&nologo=true&reference=${encodedImage}&strength=0.25`;
        
        // Agregar API key si existe (como query param alternativo)
        if (CONFIG.POLLINATIONS_API_KEY) {
            url += `&key=${CONFIG.POLLINATIONS_API_KEY}`;
        }
        
        this.lastUrl = url;
        return url;
    },

    processImage: async function(imageUrl) {
        console.log('🤖 IA: Iniciando procesamiento...');
        const startTime = Date.now();
        
        const pollinationUrl = this.enhanceSubject(imageUrl);
        
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const duration = Date.now() - startTime;
                console.log(`✅ IA: Imagen procesada en ${duration}ms`);
                console.log('🔗 URL IA:', pollinationUrl);
                this.lastUsed = true;
                resolve(pollinationUrl);
            };
            
            img.onerror = () => {
                console.log('❌ IA: Falló, usando original');
                this.lastUsed = false;
                resolve(imageUrl);
            };
            
            // Timeout 20s
            setTimeout(() => {
                if (!img.complete) {
                    console.log('⏱️ IA: Timeout, usando original');
                    this.lastUsed = false;
                    resolve(imageUrl);
                }
            }, 20000);
            
            img.src = pollinationUrl;
        });
    },

    getStatus: function() {
        return {
            used: this.lastUsed,
            url: this.lastUrl
        };
    }
};

// ==========================================
// GENERADOR FLYER CON MARCA IA
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
        const iaUsed = enhancedImageUrl !== mainImageData;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Fondo
        await this.drawBackground(mainImageData);
        
        // 2. Marca de agua
        this.drawWatermark();
        
        // 3. Sujeto (IA o original)
        await this.drawSubject(enhancedImageUrl);
        
        // 4. Logo
        if (logoData) await this.drawSmallLogo(logoData);
        
        // 5. Banda magenta
        this.drawHeaderBand(text);
        
        // 6. Footer
        this.drawFooter();
        
        // 7. INDICADOR IA (esquina inferior derecha, sutil)
        if (iaUsed) {
            this.drawIAMark();
        }
        
        return {
            dataUrl: canvas.toDataURL('image/jpeg', 0.95),
            iaUsed: iaUsed,
            iaUrl: enhancedImageUrl
        };
    },

    drawIAMark: function() {
        const ctx = this.ctx;
        const x = this.canvas.width - 80;
        const y = this.canvas.height - 40;
        
        // Círculo indicador
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#d81b60';
        ctx.fill();
        
        // Texto "AI"
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AI', x, y);
    },

    // ... resto de métodos draw iguales ...
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

    drawSmallLogo: function(logoData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const ctx = this.ctx;
                const size = 65;
                const padding = 30;
                const yPos = 37;
                
                ctx.beginPath();
                ctx.arc(padding + size/2, yPos + size/2, size/2 + 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.fill();
                
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
        ctx.fillStyle = '#d81b60';
        ctx.fillRect(0, 0, this.canvas.width, bandHeight);
        
        const shadowGradient = ctx.createLinearGradient(0, bandHeight, 0, bandHeight + 15);
        shadowGradient.addColorStop(0, 'rgba(0,0,0,0.2)');
        shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(0, bandHeight, this.canvas.width, 15);
        
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
    }
};

// ==========================================
// UI CON STATUS IA
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
            newFlyerBtn: document.getElementById('newFlyerBtn'),
            iaStatus: document.getElementById('iaStatus') // nuevo elemento
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
            
            // Subir original
            const mainFile = await this.dataURLtoFile(this.mainImageData, 'main.jpg');
            const mainUrl = await CloudinaryUpload.upload(mainFile, 'dra_bruzera/originales');
            
            // PROCESAR CON IA
            console.log('🚀 Iniciando IA...');
            const enhancedUrl = await PollinationsAI.processImage(mainUrl);
            
            // Logo
            let logoUrl = null;
            if (this.logoImageData) {
                const logoFile = await this.dataURLtoFile(this.logoImageData, 'logo.png');
                logoUrl = await CloudinaryUpload.upload(logoFile, 'dra_bruzera/logos');
            }
            
            // Registrar
            Backend.registrarUso('imagen', text, 1, () => {});
            
            // Generar
            const result = await FlyerGenerator.generate(this.mainImageData, this.logoImageData, text, enhancedUrl);
            
            // Subir final
            const finalFile = await this.dataURLtoFile(result.dataUrl, 'flyer.jpg');
            const finalUrl = await CloudinaryUpload.upload(finalFile, 'dra_bruzera/flyers');
            
            // MOSTRAR STATUS IA
            this.showIAStatus(result.iaUsed, result.iaUrl);
            
            console.log('✅ Flyer completo:', finalUrl);
            console.log('🤖 IA usada:', result.iaUsed);
            
            e.loader.classList.add('hidden');
            e.resultSection.classList.remove('hidden');
            e.resultSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error generando flyer.');
            e.loader.classList.add('hidden');
        }
    },

    showIAStatus: function(used, url) {
        const e = this.elements;
        if (!e.iaStatus) return;
        
        if (used) {
            e.iaStatus.innerHTML = `
                <div class="ia-badge success">
                    <span>✨ Procesado con IA</span>
                    <a href="${url}" target="_blank">Ver imagen IA</a>
                </div>
            `;
            e.iaStatus.classList.remove('hidden');
        } else {
            e.iaStatus.innerHTML = `
                <div class="ia-badge fallback">
                    <span>📷 Imagen original (IA no disponible)</span>
                </div>
            `;
            e.iaStatus.classList.remove('hidden');
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
        if (e.iaStatus) e.iaStatus.classList.add('hidden');
        this.mainImageData = null;
        this.logoImageData = null;
        this.checkFormValidity();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
