import {generateText, measure, clockText, countNewInput} from './core.mjs?v=ascii-hyphen-1';

const $ = id => document.getElementById(id);
const input = $('typing-input');
const targetElement = $('target');
const viewport = $('text-viewport');
let duration = 60, language = 'ru', target = '', typed = '', startedAt = null;
let phase = 'idle', timerId = null, attempts = 0, wrongAttempts = 0, finalElapsed = 0;
let characters = [];
const storageKey = () => `ritm-best-v1-${language}-${duration}`;
function getBest() { try { return Math.max(0, Number(localStorage.getItem(storageKey())) || 0); } catch { return 0; } }
function showBest() { const best = getBest(); $('best-value').textContent = best ? `${best} зн/мин` : '-'; }
const attemptHistoryKey = 'ritm-attempts-v1';
function loadAttempts() {
  try {
    const stored = JSON.parse(localStorage.getItem(attemptHistoryKey) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter(attempt => attempt && Number.isFinite(attempt.speed) && attempt.speed >= 0 &&
      Number.isFinite(attempt.accuracy) && attempt.accuracy >= 0 && attempt.accuracy <= 100 &&
      ['ru', 'en'].includes(attempt.language) && [30, 60, 120].includes(attempt.duration) &&
      typeof attempt.finishedAt === 'number' && Number.isFinite(new Date(attempt.finishedAt).getTime())).slice(0, 5);
  } catch { return []; }
}
let attemptHistory = loadAttempts();
function renderAttempts() {
  const rows = attemptHistory.map(attempt => {
    const row = document.createElement('tr');
    const date = new Date(attempt.finishedAt);
    const dateCell = document.createElement('td');
    const time = document.createElement('time');
    time.dateTime = date.toISOString();
    time.title = date.toLocaleString('ru-RU');
    time.textContent = date.toLocaleString('ru-RU', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
    dateCell.append(time);
    const speedCell = document.createElement('td'); speedCell.className = 'history-speed';
    const unit = document.createElement('span'); unit.className = 'history-unit'; unit.textContent = ' зн/мин';
    speedCell.append(document.createTextNode(String(attempt.speed)), unit);
    const accuracyCell = document.createElement('td'); accuracyCell.textContent = `${attempt.accuracy}%`;
    const modeCell = document.createElement('td'); modeCell.textContent = `${attempt.duration} с · ${attempt.language.toUpperCase()}`;
    row.append(dateCell, speedCell, accuracyCell, modeCell);
    return row;
  });
  $('history-rows').replaceChildren(...rows);
  $('history-table').hidden = rows.length === 0;
  $('history-empty').hidden = rows.length !== 0;
}
function rememberAttempt(result) {
  attemptHistory = [{speed: result.speed, accuracy: result.accuracy, duration, language,
    elapsedMs: finalElapsed, finishedAt: Date.now()}, ...attemptHistory].slice(0, 5);
  try { localStorage.setItem(attemptHistoryKey, JSON.stringify(attemptHistory)); } catch {}
  renderAttempts();
}
function elapsed() { return startedAt === null ? 0 : Math.min(duration * 1000, Math.max(0, performance.now() - startedAt)); }
function setStatus(text, active = false) {
  const dot = document.createElement('span'); dot.className = `status-dot${active ? ' active' : ''}`;
  $('status').replaceChildren(dot, document.createTextNode(text));
}
function refreshStats(ms = elapsed()) {
  const measuredMs = phase === 'running' ? Math.max(1000, ms) : ms;
  const result = measure(target, typed, measuredMs, attempts, wrongAttempts);
  $('speed').textContent = result.speed;
  $('accuracy').replaceChildren(document.createTextNode(result.accuracy), Object.assign(document.createElement('span'), {textContent: '%'}));
  const left = Math.max(0, duration - ms / 1000);
  $('time').textContent = clockText(left);
  $('time').classList.toggle('ending', left <= 10 && phase === 'running');
  $('progress-fill').style.width = `${left / duration * 100}%`;
  $('progress').setAttribute('aria-valuenow', String(Math.floor(ms / 1000)));
  $('input-count').textContent = `${typed.length} зн. · ${result.mistakes} ош.`;
  return result;
}
function paintCharacters() {
  for (let i = 0; i < characters.length; i++) {
    characters[i].className = 'char' + (i < typed.length ? typed[i] === target[i] ? ' correct' : ' incorrect' : i === typed.length ? ' current' : '');
  }
  const current = characters[Math.min(typed.length, characters.length - 1)];
  if (current) {
    const top = current.offsetTop;
    if (top < viewport.scrollTop || top > viewport.scrollTop + viewport.clientHeight - 42) viewport.scrollTop = Math.max(0, top - 38);
  }
}
function changeSettingsDisabled(disabled) {
  document.querySelectorAll('[data-duration], [data-language]').forEach(button => { button.disabled = disabled; });
}
function reset({focus = false, keepResult = false} = {}) {
  clearInterval(timerId); timerId = null; startedAt = null; phase = 'idle'; typed = ''; attempts = 0; wrongAttempts = 0; finalElapsed = 0;
  target = generateText(language, Math.random, target);
  characters = Array.from(target, character => { const span = document.createElement('span'); span.className = 'char'; span.textContent = character; span.setAttribute('aria-hidden', 'true'); return span; });
  const readableText = document.createElement('span'); readableText.className = 'sr-only'; readableText.textContent = target;
  targetElement.replaceChildren(readableText, ...characters);
  input.value = ''; input.disabled = false; input.maxLength = target.length; input.lang = language;
  input.placeholder = 'Начните печатать здесь…';
  $('typing-card').classList.remove('finished');
  if (!keepResult) { $('result').hidden = true; $('record-label').hidden = true; }
  $('input-help').textContent = 'Таймер начнётся с первой буквы';
  $('restart').querySelector('span').textContent = 'Начать заново';
  $('progress').setAttribute('aria-valuemax', String(duration));
  setStatus('Готовы, когда вы готовы'); changeSettingsDisabled(false); refreshStats(0); paintCharacters(); viewport.scrollTop = 0; showBest();
  if (focus) input.focus({preventScroll: true});
}
function finish() {
  if (phase !== 'running') return;
  finalElapsed = elapsed(); phase = 'finished'; clearInterval(timerId); timerId = null;
  const result = refreshStats(finalElapsed);
  rememberAttempt(result);
  const best = getBest();
  const isRecord = result.speed > best && finalElapsed >= 5000;
  if (isRecord) { try { localStorage.setItem(storageKey(), String(result.speed)); } catch {} }
  $('record-label').hidden = !isRecord;
  $('result-title').textContent = isRecord ? 'Ваш новый лучший ритм.' : 'Отличная практика.';
  $('result-description').textContent = `${result.speed} знаков в минуту · точность ${result.accuracy}% · верных знаков: ${result.correct}.`;
  $('result').hidden = false;
  reset({keepResult: true, focus: document.activeElement === input});
  setStatus('Новый текст готов - продолжайте');
  $('input-help').textContent = 'Следующий раунд начнётся с первой буквы';
}
function tick() { if (phase !== 'running') return; if (elapsed() >= duration * 1000) finish(); else refreshStats(); }
input.addEventListener('beforeinput', event => {
  if (phase === 'running' && elapsed() >= duration * 1000) { event.preventDefault(); finish(); }
  if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') { event.preventDefault(); setStatus('Набирайте текст с клавиатуры'); }
});
input.addEventListener('paste', event => { event.preventDefault(); setStatus('Набирайте текст с клавиатуры'); });
input.addEventListener('drop', event => { event.preventDefault(); setStatus('Набирайте текст с клавиатуры'); });
input.addEventListener('input', event => {
  if (phase === 'finished' || event.isComposing) return;
  if (phase === 'running' && elapsed() >= duration * 1000) { input.value = typed; finish(); return; }
  const next = input.value.replace(/[\r\n]/g, ' ').slice(0, target.length);
  input.value = next;
  if (phase === 'idle' && next.length) {
    $('result').hidden = true; $('record-label').hidden = true;
    phase = 'running'; startedAt = performance.now(); changeSettingsDisabled(true);
    timerId = setInterval(tick, 100); setStatus('Всё идёт своим ритмом', true); $('input-help').textContent = 'Ошибку можно исправить клавишей Backspace';
  }
  const added = countNewInput(typed, next, target); attempts += added.attempts; wrongAttempts += added.wrong; typed = next;
  paintCharacters(); refreshStats();
  if (typed === target) finish();
});
input.addEventListener('compositionend', () => input.dispatchEvent(new Event('input')));
document.querySelectorAll('[data-duration]').forEach(button => button.addEventListener('click', () => {
  duration = Number(button.dataset.duration);
  document.querySelectorAll('[data-duration]').forEach(item => { const selected = item === button; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected)); });
  reset();
}));
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
  language = button.dataset.language;
  document.querySelectorAll('[data-language]').forEach(item => { const selected = item === button; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected)); });
  reset();
}));
$('restart').addEventListener('click', () => reset({focus: true}));
document.addEventListener('keydown', event => {
  if (event.key === 'Tab' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    if (!event.repeat) reset({focus: true});
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
window.addEventListener('pageshow', tick);
reset();
renderAttempts();
