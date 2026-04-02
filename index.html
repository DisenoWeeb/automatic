<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generador de Contenido Instagram</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 10px;
      font-size: 24px;
    }
    
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 25px;
      font-size: 14px;
    }
    
    .creditos-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .creditos-numero {
      font-size: 32px;
      font-weight: bold;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-weight: 600;
      font-size: 14px;
    }
    
    input[type="text"],
    input[type="file"],
    select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    
    input[type="text"]:focus,
    select:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .file-input-wrapper {
      position: relative;
      overflow: hidden;
      display: inline-block;
      width: 100%;
    }
    
    .file-input-wrapper input[type=file] {
      position: absolute;
      left: -9999px;
    }
    
    .file-input-label {
      display: block;
      padding: 40px 20px;
      border: 3px dashed #ddd;
      border-radius: 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #fafafa;
    }
    
    .file-input-label:hover {
      border-color: #667eea;
      background: #f0f0ff;
    }
    
    .file-input-label.has-file {
      border-color: #4caf50;
      background: #e8f5e9;
    }
    
    .preview-img {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
      margin-top: 10px;
    }
    
    button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .resultado {
      margin-top: 25px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
      display: none;
    }
    
    .resultado.visible {
      display: block;
      animation: fadeIn 0.5s;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .resultado h3 {
      color: #333;
      margin-bottom: 15px;
    }
    
    .imagen-final {
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      margin-bottom: 15px;
    }
    
    .caption-box {
      background: white;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      margin-bottom: 10px;
    }
    
    .caption-text {
      white-space: pre-wrap;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
    
    .btn-copiar {
      background: #4caf50;
      padding: 10px 20px;
      font-size: 14px;
      margin-top: 10px;
    }
    
    .btn-copiar:hover {
      background: #45a049;
    }
    
    .loading {
      display: none;
      text-align: center;
      padding: 20px;
    }
    
    .loading.visible {
      display: block;
    }
    
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error {
      background: #ffebee;
      color: #c62828;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
      display: none;
    }
    
    .error.visible {
      display: block;
    }
  </style>
</head>
<body>

<div class="container">
  <h1>🚀 Generador de Posts para Instagram</h1>
  <p class="subtitle">Crea contenido profesional en segundos</p>
  
  <!-- Créditos disponibles -->
  <div class="creditos-box">
    <div>Créditos disponibles</div>
    <div class="creditos-numero" id="creditos">25</div>
  </div>
  
  <!-- Formulario -->
  <div class="form-group">
    <label>📷 Selecciona una imagen</label>
    <div class="file-input-wrapper">
      <input type="file" id="file" accept="image/*">
      <label for="file" class="file-input-label" id="fileLabel">
        <div>📤 Arrastra una imagen o haz clic para seleccionar</div>
        <small>JPG, PNG - Máx 5MB</small>
      </label>
    </div>
    <img id="preview" class="preview-img" style="display: none;">
  </div>
  
  <div class="form-group">
    <label>✏️ ¿Qué querés mostrar? (opcional)</label>
    <input type="text" id="texto" placeholder="Ej: Nuevo producto en oferta, Cuidado de mascotas, etc.">
  </div>
  
  <div class="form-group">
    <label>🏷️ Tipo de negocio</label>
    <select id="tipoNegocio">
      <option value="veterinaria">🐾 Veterinaria / Mascotas</option>
      <option value="tienda">🛍️ Tienda / Productos</option>
      <option value="servicios">💼 Servicios Profesionales</option>
      <option value="general">⭐ General / Otros</option>
    </select>
  </div>
  
  <div class="form-group">
    <label>📱 Tu usuario de Instagram</label>
    <input type="text" id="usuarioIG" placeholder="mitienda (sin @)">
    <small style="color: #666;">Aparecerá en la imagen generada</small>
  </div>
  
  <button onclick="generar()" id="btnGenerar">GENERAR POST</button>
  
  <!-- Loading -->
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <p>✨ Generando tu contenido con IA...</p>
    <small>Esto puede tomar unos segundos</small>
  </div>
  
  <!-- Error -->
  <div class="error" id="error"></div>
  
  <!-- Resultado -->
  <div class="resultado" id="resultado">
    <h3>🎉 ¡Tu post está listo!</h3>
    
    <img id="imagenFinal" class="imagen-final" alt="Post generado">
    
    <div class="caption-box">
      <strong>📝 Texto para copiar:</strong>
      <div class="caption-text" id="caption"></div>
    </div>
    
    <button class="btn-copiar" onclick="copiarTexto()">📋 Copiar texto</button>
    
    <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 8px; font-size: 13px;">
      <strong>💡 Tip:</strong> Descargá la imagen (clic derecho > Guardar imagen) y copiá el texto para publicar en Instagram.
    </div>
  </div>
</div>

<script src="app.js"></script>

</body>
</html>
