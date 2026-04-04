// CONFIG
const CONFIG = {
    GAS_URL: 'https://script.google.com/macros/s/AKfycbxLhR_vAg14TC2qnoywDnyc6iKLm3AmWQ8GPCdlL9Lo6RPDxgXHZSrFZ5YkHJ47K5-8Dg/exec',
    CLOUDINARY_CLOUD_NAME: 'dwgwbdtud',
    CLOUDINARY_UPLOAD_PRESET: 'dra_bruzera_unsigned'
};

// JSONP
const JSONP = {
    request(url, params, callback) {
        const cb = 'cb_' + Date.now();
        window[cb] = (data) => {
            delete window[cb];
            callback(null, data);
        };

        const query = Object.keys(params)
            .map(k => `${k}=${encodeURIComponent(params[k])}`)
            .join('&');

        const script = document.createElement('script');
        script.src = `${url}?${query}&callback=${cb}`;
        document.body.appendChild(script);
    }
};

// USER
const UserManager = {
    getUserId() {
        let id = localStorage.getItem('uid');
        if (!id) {
            id = 'u_' + Date.now();
            localStorage.setItem('uid', id);
        }
        return id;
    }
};

// CLOUDINARY UPLOAD
const CloudinaryUpload = {
    upload(file, folder) {
        return new Promise((resolve, reject) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
            fd.append('folder', folder);

            fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: fd
            })
            .then(r => r.json())
            .then(d => resolve(d.secure_url))
            .catch(reject);
        });
    }
};

// 🔥 TRANSFORMACIÓN SEGURA (LA CLAVE)
const CloudinaryTransform = {
    enhance(url) {
        return url.replace(
            '/upload/',
            '/upload/q_auto,f_auto,e_auto_contrast,e_sharpen:60/'
        );
    }
};

// BACKEND
const Backend = {
    init(cb) {
        JSONP.request(CONFIG.GAS_URL, {
            action: 'init',
            userId: UserManager.getUserId()
        }, cb);
    },

    registrar(titulo) {
        JSONP.request(CONFIG.GAS_URL, {
            action: 'registrar',
            userId: UserManager.getUserId(),
            tipo: 'imagen',
            titulo: titulo,
            creditos: 1
        }, () => {});
    }
};

// GENERADOR
const Generator = {

    async generar(mainData, texto) {

        // subir original
        const file = await this.dataURLtoFile(mainData);
        const originalUrl = await CloudinaryUpload.upload(file, 'dra_bruzera/originales');

        // 🔥 mejora REAL sin IA
        const enhancedUrl = CloudinaryTransform.enhance(originalUrl);

        // dibujar
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        await this.draw(ctx, canvas, enhancedUrl);

        // exportar
        const finalFile = await this.dataURLtoFile(canvas.toDataURL('image/jpeg', 0.95));

        const finalUrl = await CloudinaryUpload.upload(finalFile, 'dra_bruzera/flyers');

        Backend.registrar(texto);

        console.log('FINAL:', finalUrl);
    },

    draw(ctx, canvas, url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {

                ctx.fillStyle = '#fff';
                ctx.fillRect(0,0,canvas.width,canvas.height);

                // contain (NO recorta caras)
                const scale = Math.min(
                    canvas.width / img.width,
                    canvas.height / img.height
                );

                const w = img.width * scale;
                const h = img.height * scale;

                const x = (canvas.width - w)/2;
                const y = (canvas.height - h)/2;

                ctx.drawImage(img, x, y, w, h);

                resolve();
            };

            img.src = url;
        });
    },

    dataURLtoFile(dataurl) {
        return fetch(dataurl)
            .then(res => res.blob())
            .then(blob => new File([blob], 'img.jpg'));
    }
};
