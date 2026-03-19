/**
 * main.js — точка входа приложения.
 *
 * Порядок инициализации:
 * 1. Загрузить сценарий (JSON)
 * 2. Инициализировать все менеджеры
 * 3. Создать атмосферные эффекты на стартовом экране
 * 4. Ожидать клик «Начать»
 * 5. При старте — плавный переход → загрузка первой комнаты
 */

import { eventBus } from './engine/EventBus.js';
import { gameState } from './engine/GameState.js';
import { scenario } from './engine/ScenarioLoader.js';
import { sceneManager } from './engine/SceneManager.js';
import { dialogueManager } from './engine/DialogueManager.js';
import { audioManager } from './engine/AudioManager.js';
import { effectsManager } from './effects/EffectsManager.js';
import { puzzleManager } from './puzzles/PuzzleManager.js';
import { uiManager } from './ui/UIManager.js';

/**
 * Инициализация приложения.
 */
async function init() {
  try {
    // 1. Загружаем сценарий
    await scenario.load('/data/scenario.json');
    console.log('[Novel] Сценарий загружен');

    // 2. Предзагрузка ассетов (изображения)
    await preloadAssets(scenario.data);

    // 3. Инициализируем все менеджеры
    sceneManager.init();
    dialogueManager.init();
    audioManager.init();
    effectsManager.init();
    puzzleManager.init();
    uiManager.init();
    initVideoPlayer();
    console.log('[Novel] Все модули инициализированы');

    // 4. Скрываем экран загрузки, показываем стартовый
    hideLoadingScreen();

    // 5. Подписываемся на старт игры
    eventBus.on('game:start', () => startGame());

    // 6. Показываем стартовый экран + атмосферные частицы
    document.getElementById('screen-title').classList.add('active');
    createTitleParticles();

    // 7. Горячие клавиши
    initKeyboardShortcuts();

    // 8. Шлейф курсора
    initCursorTrail();

    // 9. Подсказки по таймеру
    initIdleHints();

    // 10. Дыхание фона
    initBackgroundBreathing();

  } catch (err) {
    console.error('[Novel] Ошибка инициализации:', err);
    document.body.innerHTML = `
      <div style="
        display: flex; align-items: center; justify-content: center;
        height: 100vh; color: #e74c5c; font-family: sans-serif;
        text-align: center; padding: 20px;
      ">
        <div>
          <h2>Ошибка загрузки</h2>
          <p style="color: #888; margin-top: 10px;">${err.message}</p>
        </div>
      </div>
    `;
  }
}

/**
 * Запуск игры с плавным переходом.
 */
function startGame() {
  gameState.reset();

  const titleScreen = document.getElementById('screen-title');
  const gameScreen = document.getElementById('screen-game');

  // Плавное затухание стартового экрана
  titleScreen.style.transition = 'opacity 0.8s ease';
  titleScreen.style.opacity = '0';

  setTimeout(() => {
    titleScreen.classList.remove('active');
    titleScreen.style.opacity = '';
    titleScreen.style.transition = '';

    // Загружаем первую комнату
    const startRoom = scenario.startRoom;
    if (startRoom) {
      sceneManager.loadRoom(startRoom);
    }

    // Полноэкранный режим
    requestFullscreen();
  }, 800);
}

/**
 * Создать плавающие частицы на стартовом экране.
 * Лавандовые точки медленно поднимаются вверх — эффект сна.
 */
function createTitleParticles() {
  const container = document.getElementById('title-particles');
  if (!container) return;

  const COUNT = 30;

  for (let i = 0; i < COUNT; i++) {
    const particle = document.createElement('div');
    particle.classList.add('title-particle');

    // Случайные параметры для каждой частицы
    const left = Math.random() * 100;                       // позиция X (%)
    const size = 1 + Math.random() * 2.5;                   // размер (px)
    const duration = 6 + Math.random() * 10;                // скорость (сек)
    const delay = Math.random() * duration;                  // задержка старта
    const startY = 60 + Math.random() * 40;                 // старт снизу (%)

    particle.style.cssText = `
      left: ${left}%;
      bottom: -${startY}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      opacity: 0;
    `;

    container.appendChild(particle);
  }
}

/**
 * Инициализация видео-плеера для катсцен.
 */
function initVideoPlayer() {
  const container = document.getElementById('video-container');
  const video = document.getElementById('cutscene-video');

  eventBus.on('video:play', ({ src }) => {
    video.src = src;
    container.classList.remove('hidden');

    video.play().catch(() => {});

    // Когда видео закончится — скрываем и уведомляем
    video.onended = () => {
      container.classList.add('hidden');
      video.src = '';
      eventBus.emit('video:ended');
    };

    // Клик для скипа видео
    container.onclick = () => {
      video.pause();
      container.classList.add('hidden');
      video.src = '';
      eventBus.emit('video:ended');
      container.onclick = null;
    };
  });
}

/**
 * Предзагрузка всех изображений из сценария.
 * Показывает прогресс-бар на экране загрузки.
 */
async function preloadAssets(data) {
  const fill = document.getElementById('loading-fill');
  const urls = [];

  // Собираем все пути к изображениям из сценария
  if (data.rooms) {
    for (const room of Object.values(data.rooms)) {
      if (room.background) urls.push(room.background);
    }
  }
  if (data.characters) {
    for (const char of Object.values(data.characters)) {
      if (char.sprites) {
        for (const src of Object.values(char.sprites)) {
          urls.push(src);
        }
      }
    }
  }
  if (data.items) {
    for (const item of Object.values(data.items)) {
      if (item.icon) urls.push(item.icon);
    }
  }

  if (urls.length === 0) {
    if (fill) fill.style.width = '100%';
    return;
  }

  let loaded = 0;

  await Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => {
            loaded++;
            if (fill) {
              fill.style.width = `${Math.round((loaded / urls.length) * 100)}%`;
            }
            resolve();
          };
          img.src = url;
        })
    )
  );

  console.log(`[Novel] Предзагружено ${loaded} ассетов`);
}

/**
 * Скрыть экран загрузки с плавным переходом.
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;

  loadingScreen.style.transition = 'opacity 0.6s ease';
  loadingScreen.style.opacity = '0';

  setTimeout(() => {
    loadingScreen.remove();
  }, 600);
}

/**
 * Запрос полноэкранного режима.
 */
function requestFullscreen() {
  const el = document.documentElement;
  const requestFn = el.requestFullscreen
    || el.webkitRequestFullscreen
    || el.mozRequestFullScreen
    || el.msRequestFullscreen;

  if (requestFn) {
    requestFn.call(el).catch(() => {});
  }
}

/**
 * Глобальные горячие клавиши.
 */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Не перехватываем, если фокус в input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const gameActive = document.getElementById('screen-game').classList.contains('active');

    // Escape — закрыть панели / модальные окна
    if (e.key === 'Escape') {
      document.querySelectorAll('.side-panel:not(.hidden)').forEach((p) => p.classList.add('hidden'));
      document.querySelectorAll('.modal:not(.hidden)').forEach((m) => m.classList.add('hidden'));
    }

    if (!gameActive) return;

    // H / Р — история
    if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
      document.getElementById('history-panel').classList.toggle('hidden');
      document.getElementById('inventory-panel').classList.add('hidden');
    }

    // I / Ш — инвентарь
    if (e.key === 'i' || e.key === 'I' || e.key === 'ш' || e.key === 'Ш') {
      document.getElementById('inventory-panel').classList.toggle('hidden');
      document.getElementById('history-panel').classList.add('hidden');
    }
  });
}

/**
 * Шлейф курсора — лавандовые точки, тянущиеся за мышью.
 * В глитч-комнатах шлейф красный и дёрганый.
 */
function initCursorTrail() {
  const container = document.getElementById('cursor-trail');
  if (!container) return;

  let isGlitchRoom = false;
  let throttle = 0;

  // Отслеживаем, есть ли глитч-персонаж на экране
  eventBus.on('character:show', (data) => {
    if (data.character === 'glitch') isGlitchRoom = true;
  });
  eventBus.on('character:hide', (data) => {
    if (data.character === 'glitch') isGlitchRoom = false;
  });
  eventBus.on('scene:goToRoom', () => { isGlitchRoom = false; });

  document.addEventListener('mousemove', (e) => {
    throttle++;
    if (throttle % 3 !== 0) return; // Каждое 3-е движение

    const dot = document.createElement('div');
    dot.classList.add('trail-dot');
    if (isGlitchRoom) dot.classList.add('trail-dot-glitch');

    dot.style.left = `${e.clientX - 2}px`;
    dot.style.top = `${e.clientY - 2}px`;

    container.appendChild(dot);

    // Удаляем после анимации
    setTimeout(() => dot.remove(), isGlitchRoom ? 400 : 600);
  });
}

/**
 * Подсказки по таймеру — если игрок не взаимодействует 30 секунд,
 * показываем ненавязчивую подсказку.
 */
function initIdleHints() {
  const hintEl = document.getElementById('idle-hint');
  const hintText = hintEl?.querySelector('.idle-hint-text');
  if (!hintEl || !hintText) return;

  let idleTimer = null;
  let isShowing = false;

  // Текущая подсказка из комнаты (приоритет: JSON → общие)
  const getCurrentHint = () => {
    const room = scenario.getRoom(gameState.currentRoom);
    if (!room) return null;

    // 1. Подсказка из JSON-сценария (поле idleHint в комнате)
    if (room.idleHint) {
      return room.idleHint;
    }

    // 2. Подсказки для hotspots (если есть активные)
    if (room.hotspots?.length > 0 && document.querySelector('.hotspot-active')) {
      // Ищем подсказку в конкретном hotspot
      const hsWithHint = room.hotspots.find((hs) => hs.hint);
      if (hsWithHint) return hsWithHint.hint;
      return 'Осмотрите комнату — нажмите на светящуюся область';
    }

    // 3. Подсказки для загадок
    const puzzleContainer = document.getElementById('puzzle-container');
    if (puzzleContainer && !puzzleContainer.classList.contains('hidden')) {
      return 'Попробуйте подсказку внизу загадки';
    }

    return null;
  };

  const resetTimer = () => {
    clearTimeout(idleTimer);
    if (isShowing) {
      hintEl.classList.add('hidden');
      isShowing = false;
    }

    idleTimer = setTimeout(() => {
      const hint = getCurrentHint();
      if (hint) {
        hintText.textContent = hint;
        hintEl.classList.remove('hidden');
        isShowing = true;
      }
    }, 30000); // 30 секунд
  };

  // Сбрасываем таймер при любом взаимодействии
  document.addEventListener('click', resetTimer);
  document.addEventListener('keydown', resetTimer);
  document.addEventListener('mousemove', () => {
    if (isShowing) return; // Не сбрасываем при показанной подсказке
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const hint = getCurrentHint();
      if (hint) {
        hintText.textContent = hint;
        hintEl.classList.remove('hidden');
        isShowing = true;
      }
    }, 30000);
  });

  // Запускаем первый таймер при входе в комнату
  eventBus.on('scene:goToRoom', resetTimer);
}

/**
 * Дыхание фона — медленное масштабирование для ощущения жизни.
 * Добавляет CSS-класс на #scene-bg.
 */
function initBackgroundBreathing() {
  const bg = document.getElementById('scene-bg');
  if (!bg) return;

  // Включаем дыхание при загрузке комнаты
  eventBus.on('scene:goToRoom', () => {
    bg.classList.remove('ambient-breathing', 'ambient-breathing-fast');
    bg.classList.add('ambient-breathing');
  });

  // Ускоренное дыхание когда глитч-персонаж на экране
  eventBus.on('character:show', (data) => {
    if (data.character === 'glitch') {
      bg.classList.remove('ambient-breathing');
      bg.classList.add('ambient-breathing-fast');
    }
  });

  eventBus.on('character:hide', (data) => {
    if (data.character === 'glitch') {
      bg.classList.remove('ambient-breathing-fast');
      bg.classList.add('ambient-breathing');
    }
  });
}

// Запуск при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
