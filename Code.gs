/** @OnlyCurrentDoc */
/** Aladdin KIDS audition dashboard. Bind this script to the results spreadsheet. */
const FOLDER_ID = '17ecVYAE6D_Ae46_7QC2n02TdWCZ4FDh6';
const SHEET_NAME = 'Evaluations';
const HEADERS = ['Updated at', 'Teacher', 'Student', 'Video ID', 'Acting', 'Singing', 'Clarity and personality', 'Suggested role'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Aladdin KIDS | Audition Studio').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function getSheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Bind this script to the results spreadsheet first.');
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e9e0d5');
    sheet.setColumnWidths(1, HEADERS.length, 160);
  }
  return sheet;
}
function setup() { getSheet_(); }
function getAuditions() {
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  const videos = [];
  while (files.hasNext()) {
    const f = files.next();
    if (/\.(m4v|mp4|mov|webm)$/i.test(f.getName()) || f.getMimeType().indexOf('video/') === 0) {
      videos.push({ id: f.getId(), name: f.getName().replace(/\.[^.]+$/, '') });
    }
  }
  return videos.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity:'base'}));
}
function getEvaluations(teacher) {
  teacher = String(teacher || '').trim().toLowerCase();
  if (!teacher) return {};
  const rows = getSheet_().getDataRange().getValues().slice(1), result = {};
  rows.forEach(r => { if (String(r[1]).trim().toLowerCase() === teacher) result[String(r[3])] = {acting:r[4], singing:r[5], clarity:r[6], role:r[7]}; });
  return result;
}
function saveEvaluation(data) {
  const teacher = String(data.teacher || '').trim();
  const videoId = String(data.videoId || '');
  if (!teacher || teacher.length > 100) throw new Error('Please enter your name (100 characters or fewer).');
  const file = DriveApp.getFileById(videoId);
  if (!file.getParents().hasNext()) throw new Error('Video not found.');
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const matches = folder.getFilesByName(file.getName());
  let inFolder = false;
  while (matches.hasNext()) if (matches.next().getId() === videoId) inFolder = true;
  if (!inFolder || !(/\.(m4v|mp4|mov|webm)$/i.test(file.getName()) || file.getMimeType().indexOf('video/') === 0)) throw new Error('This video is not in the audition folder.');
  const scores = [data.acting, data.singing, data.clarity].map(v => Number(v));
  if (scores.some(v => !Number.isInteger(v) || v < 0 || v > 10)) throw new Error('Each score must be a whole number from 0 to 10.');
  const role = String(data.role || 'No suggestion').slice(0, 100);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sheet = getSheet_(), rows = sheet.getDataRange().getValues();
    const row = [new Date(), teacher, file.getName().replace(/\.[^.]+$/, ''), videoId, ...scores, role];
    const index = rows.findIndex((r, i) => i > 0 && String(r[1]).trim().toLowerCase() === teacher.toLowerCase() && String(r[3]) === videoId);
    if (index > 0) sheet.getRange(index + 1, 1, 1, row.length).setValues([row]); else sheet.appendRow(row);
    SpreadsheetApp.flush();
    return true;
  } finally { lock.releaseLock(); }
}

// Small transport endpoint for the standalone GitHub page. The page submits
// requests as form posts and receives the result through a temporary iframe.
function doPost(e) {
  let request = {}, result = null, error = '';
  try {
    request = JSON.parse(e.parameter.request || '{}');
    if (!/^[0-9a-f-]{36}$/i.test(request.token || '')) throw new Error('Invalid request.');
    if (request.action === 'auditions') result = getAuditions();
    else if (request.action === 'evaluations') result = getEvaluations(request.payload);
    else if (request.action === 'save') result = saveEvaluation(request.payload || {});
    else throw new Error('Unknown request.');
  } catch (err) { error = String(err.message || err); }
  const message = JSON.stringify({token:request.token || '', result:result, error:error}).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><script>window.top.postMessage(' + message + ',"https://jsokar.github.io");<\/script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
