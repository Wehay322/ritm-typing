import {generateText, measure, clockText, countNewInput} from './core.mjs';

const $ = id => document.getElementById(id);
const input = $('typing-input');
const targetElement = $('target');
const viewport = $('text-viewport');
let duration = 60, language = 'ru', target = '', typed = '', startedAt = null;
let phase = 'idle', timerId = null, attempts = 0, wrongAttempts = 0, finalElapsed = 0;
let characters = [];
const storageKey = () => `ritm-best-v1-${language}-${duration}`;
function getBest() { try { return Math.max(0, Number(localStorage.getItem(storageKey())) || 0); } catch { return 0; } }
function showBest() { const best = getBest(); $('best-value').textContent = best ? `${best} зн/мин` : '—'; }
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
function reset({newText = true, focus = false} = {}) {
  clearInterval(timerId); timerId = null; startedAt = null; phase = 'idle'; typed = ''; attempts = 0; wrongAttempts = 0; finalElapsed = 0;
  if (newText) target = generateText(language, Math.random, target);
  characters = Array.from(target, character => { const span = document.createElement('span'); span.className = 'char'; span.textContent = character; span.setAttribute('aria-hidden', 'true'); return span; });
  const readableText = document.createElement('span'); readableText.className = 'sr-only'; readableText.textContent = target;
  targetElement.replaceChildren(readableText, ...characters);
  input.value = ''; input.disabled = false; input.maxLength = target.length; input.lang = language;
  input.placeholder = 'Начните печатать здесь…';
  $('typing-card').classList.remove('finished'); $('result').hidden = true; $('record-label').hidden = true;
  $('input-help').textContent = 'Таймер начнётся с первой буквы';
  $('restart').querySelector('span').textContent = 'Начать заново';
  $('progress').setAttribute('aria-valuemax', String(duration));
  setStatus('Готовы, когда вы готовы'); changeSettingsDisabled(false); refreshStats(0); paintCharacters(); viewport.scrollTop = 0; showBest();
  if (focus) input.focus({preventScroll: true});
}
function finish() {
  if (phase !== 'running') return;
  finalElapsed = elapsed(); phase = 'finished'; clearInterval(timerId); timerId = null;
  input.disabled = true; $('typing-card').classList.add('finished'); changeSettingsDisabled(false);
  const result = refreshStats(finalElapsed);
  const best = getBest();
  const isRecord = result.speed > best && finalElapsed >= 5000;
  if (isRecord) { try { localStorage.setItem(storageKey(), String(result.speed)); } catch {} }
  $('record-label').hidden = !isRecord;
  $('result-title').textContent = isRecord ? 'Ваш новый лучший ритм.' : 'Отличная практика.';
  $('result-description').textContent = `${result.speed} знаков в минуту · точность ${result.accuracy}% · верных знаков: ${result.correct}. Ещё один раунд?`;
  $('result').hidden = false; setStatus('Тренировка завершена');
  $('input-help').textContent = 'Каждая попытка — шаг вперёд'; $('restart').querySelector('span').textContent = 'Ещё раз'; showBest();
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
$('new-text').addEventListener('click', () => reset({focus: true}));
$('restart').addEventListener('click', () => reset({newText: false, focus: true}));
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); reset({newText: false, focus: true}); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
window.addEventListener('pageshow', tick);
reset();
