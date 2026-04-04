/**
 * DRA. BRUZERA - Sistema de Flyers
 * Backend sin IA generativa para mejora (solo registro)
 */

const CONFIG = {
  SHEET_NAME: 'Registros',
  HEADERS: ['userId', 'tipo', 'titulo', 'creditos', 'fecha']
};

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  try {
    let response;

    switch (action) {
      case 'init':
        response = handleInit(e.parameter);
        break;

      case 'registrar':
        response = handleRegistrar(e.parameter);
        break;

      default:
        response = { success: false, error: 'Acción no válida' };
    }

    return outputJSONP(response, callback);

  } catch (error) {
    return outputJSONP({
      success: false,
      error: error.toString()
    }, callback);
  }
}

// INIT
function handleInit(params) {
  const userId = params.userId;
  if (!userId) throw new Error('userId requerido');

  initSheet();

  return {
    success: true,
    userId: userId
  };
}

// REGISTRO DE USO
function handleRegistrar(params) {
  const { userId, tipo, titulo, creditos } = params;

  if (!userId || !tipo || !titulo) {
    throw new Error('Datos incompletos');
  }

  initSheet();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);

  sheet.appendRow([
    userId,
    tipo,
    titulo,
    parseInt(creditos) || 0,
    new Date()
  ]);

  return { success: true };
}

// INIT SHEET
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(CONFIG.HEADERS);
  }

  return sheet;
}

// JSONP
function outputJSONP(data, callback) {
  const json = JSON.stringify(data);

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
