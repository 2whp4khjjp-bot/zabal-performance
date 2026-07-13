/**
 * API de Google Apps Script para Zabal Performance.
 * Despliegue como aplicación web ejecutada por el propietario.
 */
const SHEETS = {
  PLAYERS: 'Jugadores',
  MEASUREMENTS: 'Mediciones',
  SESSIONS: 'Sesiones',
  CONFIG: 'Configuración',
};

const HEADERS = {
  Jugadores: ['id', 'nombre', 'dorsal', 'activo', 'orden', 'fecha_alta'],
  Mediciones: ['id', 'fecha', 'hora', 'fecha_hora', 'jugador_id', 'jugador_nombre', 'peso', 'fatiga', 'molestias', 'comentarios', 'sesion_id', 'creado_por', 'actualizado_en'],
  Sesiones: ['id', 'fecha', 'tipo_sesion', 'rival', 'jornada', 'activa', 'hora_apertura', 'hora_cierre'],
  Configuración: ['clave', 'valor'],
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Zabal Performance')
    .addItem('Preparar pestañas y datos demo', 'setupProject')
    .addItem('Configurar PIN', 'configurePinFromUi')
    .addToUi();
}

function configurePinFromUi() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Configurar PIN', 'Introduce un PIN de 4 a 12 dígitos. Se guardará únicamente su hash.', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  setStaffPin(response.getResponseText());
  ui.alert('PIN configurado correctamente.');
}

function doGet() {
  return json_({ ok: true, data: { service: 'Zabal Performance API', version: 1 } });
}

function doPost(event) {
  try {
    const input = JSON.parse(event.postData.contents || '{}');
    const action = String(input.action || '');
    if (action === 'authenticate') return json_({ ok: true, data: authenticate_(input.pin) });
    if (action === 'logout') return json_({ ok: true, data: logout_(input.token) });
    requireSession_(input.token);
    if (action === 'getPlayers') return json_({ ok: true, data: getPlayers_() });
    if (action === 'getMeasurements') return json_({ ok: true, data: getMeasurements_() });
    if (action === 'getCurrentSession') return json_({ ok: true, data: getCurrentSession_() });
    if (action === 'saveMeasurement') return json_({ ok: true, data: saveMeasurement_(input.measurement, Boolean(input.overwrite)) });
    throw apiError_('Acción no permitida.', 'INVALID_ACTION');
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: error.message || 'Error interno.', code: error.code || 'SERVER_ERROR' });
  }
}

function setupProject() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Abre este script desde la hoja de cálculo antes de ejecutar la configuración.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  Object.keys(HEADERS).forEach(function(name) {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS[name].length).setBackground('#16365f').setFontColor('#ffffff').setFontWeight('bold');
    sheet.autoResizeColumns(1, HEADERS[name].length);
  });
  seedPlayers_();
  upsertConfig_('nombre_equipo', 'Atlético Zabal Linense');
  upsertConfig_('temporada', '2026-27');
  upsertConfig_('duracion_sesion_minutos', '30');
  upsertConfig_('fatiga_moderada_desde', '4');
  upsertConfig_('fatiga_alerta_desde', '7');
  upsertConfig_('molestias_moderada_desde', '4');
  upsertConfig_('molestias_alerta_desde', '7');
  return 'Estructura creada. Usa el menú Zabal Performance > Configurar PIN.';
}

function setStaffPin(pin) {
  const clean = String(pin || '').trim();
  if (!/^\d{4,12}$/.test(clean)) throw new Error('El PIN debe contener entre 4 y 12 dígitos.');
  PropertiesService.getScriptProperties().setProperty('STAFF_PIN_SHA256', sha256_(clean));
  return 'PIN guardado como hash SHA-256.';
}

function authenticate_(pin) {
  const configured = PropertiesService.getScriptProperties().getProperty('STAFF_PIN_SHA256');
  if (!configured) throw apiError_('El PIN todavía no está configurado en el servidor.', 'CONFIG');
  if (sha256_(String(pin || '')) !== configured) throw apiError_('El PIN no es correcto. Inténtalo de nuevo.', 'INVALID_PIN');
  const token = Utilities.getUuid() + Utilities.getUuid();
  const duration = 30 * 60;
  CacheService.getScriptCache().put('session:' + token, 'valid', duration);
  return { token: token, expiresAt: Date.now() + duration * 1000 };
}

function logout_(token) {
  if (token) CacheService.getScriptCache().remove('session:' + String(token));
  return true;
}

function requireSession_(token) {
  if (!token || CacheService.getScriptCache().get('session:' + String(token)) !== 'valid') {
    throw apiError_('La sesión ha caducado. Vuelve a introducir el PIN.', 'UNAUTHORIZED');
  }
}

function getPlayers_() {
  return rows_(SHEETS.PLAYERS).filter(function(row) { return boolean_(row.activo); }).map(function(row) {
    return { id: String(row.id), name: String(row.nombre), number: numberOrNull_(row.dorsal), active: true, order: Number(row.orden || 0), joinedAt: dateKey_(row.fecha_alta) };
  }).sort(function(a, b) { return a.order - b.order; });
}

function getMeasurements_() {
  return rows_(SHEETS.MEASUREMENTS).map(function(row) {
    const date = dateKey_(row.fecha);
    const createdAt = iso_(row.fecha_hora);
    return {
      id: String(row.id), date: date, time: String(row.hora), createdAt: createdAt,
      playerId: String(row.jugador_id), playerName: String(row.jugador_nombre),
      weight: Number(row.peso), fatigue: Number(row.fatiga), soreness: Number(row.molestias),
      comments: String(row.comentarios || ''), sessionId: String(row.sesion_id),
      createdBy: String(row.creado_por || ''), updatedAt: iso_(row.actualizado_en),
    };
  });
}

function getCurrentSession_() {
  const today = dateKey_(new Date());
  const sessions = rows_(SHEETS.SESSIONS);
  let row = sessions.find(function(item) { return dateKey_(item.fecha) === today && boolean_(item.activa); });
  if (!row) {
    const now = new Date();
    row = { id: 'session-' + today, fecha: today, tipo_sesion: 'Entrenamiento', rival: '', jornada: '', activa: true, hora_apertura: now, hora_cierre: '' };
    sheet_(SHEETS.SESSIONS).appendRow([row.id, row.fecha, row.tipo_sesion, row.rival, row.jornada, row.activa, row.hora_apertura, row.hora_cierre]);
  }
  return { id: String(row.id), date: today, type: String(row.tipo_sesion), opponent: String(row.rival || ''), matchday: String(row.jornada || ''), active: true, openedAt: iso_(row.hora_apertura), closedAt: row.hora_cierre ? iso_(row.hora_cierre) : undefined };
}

function saveMeasurement_(input, overwrite) {
  if (!input) throw apiError_('Faltan los datos de la medición.', 'VALIDATION');
  const players = getPlayers_();
  const player = players.find(function(item) { return item.id === String(input.playerId); });
  if (!player || player.name !== String(input.playerName)) throw apiError_('Jugador no válido.', 'INVALID_PLAYER');
  const weight = Number(input.weight);
  const fatigue = Number(input.fatigue);
  const soreness = Number(input.soreness);
  if (!(weight >= 30 && weight <= 250)) throw apiError_('El peso no es válido.', 'VALIDATION');
  if (![fatigue, soreness].every(function(value) { return Number.isInteger(value) && value >= 1 && value <= 10; })) throw apiError_('Los valores deben estar entre 1 y 10.', 'VALIDATION');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_(SHEETS.MEASUREMENTS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const playerColumn = headers.indexOf('jugador_id');
    const dateColumn = headers.indexOf('fecha');
    const today = dateKey_(new Date());
    let rowIndex = -1;
    for (let index = 1; index < values.length; index += 1) {
      if (String(values[index][playerColumn]) === player.id && dateKey_(values[index][dateColumn]) === today) { rowIndex = index + 1; break; }
    }
    if (rowIndex > 0 && !overwrite) throw apiError_('Ya existe una medición de hoy.', 'DUPLICATE');
    const now = new Date();
    const previousId = rowIndex > 0 ? String(sheet.getRange(rowIndex, 1).getValue()) : '';
    const previousCreated = rowIndex > 0 ? sheet.getRange(rowIndex, 4).getValue() : now;
    const id = previousId || Utilities.getUuid();
    const comments = String(input.comments || '').replace(/[<>]/g, '').trim().slice(0, 500);
    const row = [id, today, Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm'), previousCreated, player.id, player.name, weight, fatigue, soreness, comments, String(input.sessionId || ''), 'tablet-vestuario', now];
    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    return { id: id, date: today, time: row[2], createdAt: iso_(previousCreated), playerId: player.id, playerName: player.name, weight: weight, fatigue: fatigue, soreness: soreness, comments: comments, sessionId: String(input.sessionId || ''), createdBy: 'tablet-vestuario', updatedAt: now.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function seedPlayers_() {
  const sheet = sheet_(SHEETS.PLAYERS);
  if (sheet.getLastRow() > 1) return;
  const names = ['Adrián Vega','Bruno Castillo','Carlos Medina','Darío Prieto','Elías Navarro','Fabio Serrano','Gael Romero','Hugo Torres','Iván Lozano','Jairo Campos','Leo Ramírez','Marcos Vidal','Nico Herrera','Óscar Molina','Pablo Ríos','Quim Santana','Raúl Cabrera','Sergio Moya','Tiago León','Unai Galindo','Víctor Soler','Xavi Moreno','Yeray Santos','Álex Peña'];
  const today = dateKey_(new Date());
  const values = names.map(function(name, index) { return ['player-' + String(index + 1).padStart(2, '0'), name, index + 1, true, index + 1, today]; });
  sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
}

function upsertConfig_(key, value) {
  const sheet = sheet_(SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][0]) === key) { sheet.getRange(index + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

function sheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw apiError_('La hoja de cálculo no está configurada.', 'CONFIG');
  const sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw apiError_('Falta la pestaña ' + name + '.', 'CONFIG');
  return sheet;
}

function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(function(row) { return row.some(function(value) { return value !== ''; }); }).map(function(row) {
    return headers.reduce(function(object, key, index) { object[key] = row[index]; return object; }, {});
  });
}

function sha256_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(function(byte) { const unsigned = byte < 0 ? byte + 256 : byte; return unsigned.toString(16).padStart(2, '0'); }).join('');
}
function dateKey_(value) { return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function iso_(value) { return new Date(value).toISOString(); }
function boolean_(value) { return value === true || String(value).toLowerCase() === 'true' || value === 1; }
function numberOrNull_(value) { return value === '' || value === null ? undefined : Number(value); }
function apiError_(message, code) { const error = new Error(message); error.code = code; return error; }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
