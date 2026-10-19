const take = (array, random) => array.splice(Math.min(array.length - 1, Math.floor(random() * array.length)), 1)[0];
const normalizeDashes = text => text.replace(/[\u2010-\u2015\u2212]/g, '-');
const phrases = {
  ru: [
    ['Утренний свет', 'Свежий ветер', 'Тихий дождь', 'Первый луч солнца', 'Тёплый вечер', 'Лёгкий туман'],
    ['наполняет комнату', 'меняет привычный пейзаж', 'напоминает о простых радостях', 'делает этот день особенным', 'помогает увидеть красоту вокруг', 'создаёт спокойное настроение'],
    ['Иногда стоит замедлиться и заметить детали.', 'Впереди ещё много интересных открытий.', 'Каждый маленький шаг ведёт к большой цели.', 'Хорошие идеи приходят в самые обычные моменты.', 'Новый день начинается с простых вещей.', 'Можно выбрать свой путь и двигаться без спешки.', 'Немного терпения, и всё обязательно получится.', 'Привычка учиться делает жизнь интереснее.', 'В любимом деле всегда есть место для роста.', 'Главное - продолжать и радоваться процессу.']
  ],
  en: [
    ['The morning light', 'A gentle breeze', 'The quiet rain', 'A warm evening', 'The first ray of sunshine', 'A silver mist'],
    ['fills the room', 'changes the familiar view', 'reminds us of simple joys', 'makes this day feel special', 'brings a sense of calm', 'makes the world feel brighter'],
    ['Sometimes it helps to slow down and notice the details.', 'There are still so many things to discover.', 'Every small step brings you closer to your goal.', 'Good ideas often arrive in ordinary moments.', 'A new day begins with simple things.', 'You can choose your own path and take your time.', 'A little patience can make a big difference.', 'Learning something new makes life more interesting.', 'There is always room to grow in the things you love.', 'Keep going and enjoy the process.']
  ]
};

export function generateText(language = 'ru', random = Math.random, previous = '') {
  const [subjects, actions, extra] = phrases[language] || phrases.ru;
  const sentences = [];
  const openings = subjects.flatMap(subject => actions.map(action => `${subject} ${action}.`));
  const endings = [...extra];
  for (let i = 0; i < 20; i++) {
    sentences.push(take(i % 2 === 0 ? openings : endings, random));
  }
  let text = normalizeDashes(sentences.join(' '));
  if (text === previous) text = normalizeDashes(sentences.slice(1).concat(sentences[0]).join(' '));
  return text;
}

export function measure(target, typed, elapsedMs, totalAttempts = typed.length, wrongAttempts = 0) {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++;
  const speed = elapsedMs > 0 ? Math.round(correct * 60000 / elapsedMs) : 0;
  const accuracy = totalAttempts > 0 ? Math.round((totalAttempts - wrongAttempts) / totalAttempts * 100) : 100;
  return {correct, speed, accuracy: Math.max(0, Math.min(100, accuracy)), mistakes: typed.length - correct};
}

export function clockText(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export function countNewInput(previous, next, target) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let oldEnd = previous.length;
  let newEnd = next.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) { oldEnd--; newEnd--; }
  let wrong = 0;
  for (let i = start; i < newEnd; i++) if (next[i] !== target[i]) wrong++;
  return {attempts: newEnd - start, wrong};
}
