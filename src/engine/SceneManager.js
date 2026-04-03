/**
 * SceneManager — управление сценами (комнатами).
 *
 * Отвечает за:
 * - Загрузку комнаты (фон, музыка, эмбиент-эффекты)
 * - Отображение/скрытие персонажей
 * - Управление кликабельными зонами (hotspots)
 * - Переход между комнатами
 */

import { eventBus } from './EventBus.js';
import { gameState } from './GameState.js';
import { scenario } from './ScenarioLoader.js';
import { dialogueManager } from './DialogueManager.js';
import { actionExecutor } from './ActionExecutor.js';

class SceneManager {
  constructor() {
    // DOM-элементы
    this._bgImg = null;
    this._bgContainer = null;
    this._hotspotsLayer = null;
    this._charactersLayer = null;

    // Активные персонажи на сцене: { characterId: HTMLElement }
    this._activeCharacters = {};

    // Флаг: активны ли hotspots
    this._hotspotsEnabled = false;

    // Параллакс: обработчик движения мыши
    this._parallaxBound = null;
  }

  /** Инициализация — привязка к DOM и подписка на события */
  init() {
    this._bgImg = document.getElementById('scene-bg');
    this._bgContainer = document.getElementById('background-container');
    this._hotspotsLayer = document.getElementById('hotspots-layer');
    this._charactersLayer = document.getElementById('characters-layer');

    // Подписки на события
    eventBus.on('scene:goToRoom', (data) => this.loadRoom(data.room));
    eventBus.on('scene:changeBackground', (data) => this._crossfadeBackground(data.src));
    eventBus.on('character:show', (data) => this._showCharacter(data));
    eventBus.on('character:hide', (data) => this._hideCharacter(data.character));
    eventBus.on('character:changeSprite', (data) => this._changeSprite(data));
    eventBus.on('hotspots:enable', () => this._enableHotspots());

    // Параллакс при движении мыши
    this._parallaxBound = this._onMouseMoveParallax.bind(this);
  }

  /**
   * Загрузить комнату: установить фон, запустить музыку, начать диалог.
   * @param {string} roomId — id комнаты из scenario.json
   */
  loadRoom(roomId) {
    const room = scenario.getRoom(roomId);
    if (!room) {
      console.error(`[SceneManager] Комната "${roomId}" не найдена`);
      return;
    }
    
    if(roomId == "ending_room"){
      const container = document.getElementById('choices-container');
      container.classList.remove("final-choice-container");
      container.classList.add("hidden");
    }

    // Обновляем состояние
    gameState.currentRoom = roomId;
    gameState.phraseIndex = 0;
    gameState.roomPhase = 'phrases';

    // Очищаем сцену от предыдущей комнаты
    this._clearScene();

    // Устанавливаем фон
    this._bgImg.src = room.background;
    this._bgImg.alt = room.id;

    // Запускаем фоновую музыку (если изменилась)
    if (room.music && room.music !== 'none') {
      eventBus.emit('audio:playMusic', { name: room.music });
    } else {
      eventBus.emit('audio:stopMusic');
    }

    // Запускаем эмбиент-эффекты (виньетка, мерцание и пр.)
    if (room.ambientEffects) {
      room.ambientEffects.forEach((effectName) => {
        eventBus.emit('effect:playAmbient', { name: effectName });
      });
    }

    // Показываем игровой экран
    this._showGameScreen();

    // Включаем параллакс
    this._enableParallax();

    // Подготавливаем hotspots (скрытые, пока не enableHotspots)
    this._prepareHotspots(room.hotspots ?? []);

    // Начинаем диалог
    if (room.phrases && room.phrases.length > 0) {
      dialogueManager.startPhrases(room.phrases);
    }
  }

  /** Очистить сцену: убрать персонажей, hotspots, эффекты */
  _clearScene() {
    this._charactersLayer.innerHTML = '';
    this._activeCharacters = {};
    this._hotspotsLayer.innerHTML = '';
    this._hotspotsEnabled = false;
    eventBus.emit('effect:clearAmbient');
  }

  /** Показать игровой экран, скрыть титульный */
  _showGameScreen() {
    document.getElementById('screen-title').classList.remove('active');
    document.getElementById('screen-game').classList.add('active');
  }

  /**
   * Crossfade-смена фона — старый тускнеет, новый проявляется.
   * Создаём временный img поверх, делаем плавный переход.
   */
  _crossfadeBackground(src) {
    const newImg = document.createElement('img');
    newImg.src = src;
    newImg.classList.add('scene-bg-crossfade');
    newImg.alt = '';

    this._bgContainer.appendChild(newImg);

    // Запускаем transition на следующем кадре
    requestAnimationFrame(() => {
      newImg.style.opacity = '1';
    });

    // После завершения transition — заменяем основной фон
    setTimeout(() => {
      this._bgImg.src = src;
      newImg.remove();
    }, 600);

                if(src  === "/its-just-a-dream/assets/backgrounds/clock.gif"){
                const mask = document.getElementById('mask');
                mask.classList.remove('hidden');
                mask.classList.add('visible');
          } else {
                const mask = document.getElementById('mask');
                mask.classList.remove('visible');
                mask.classList.add('hidden');
          }
  }

  /**
   * Параллакс-эффект — фон и персонажи слегка сдвигаются
   * при движении мыши, создавая ощущение глубины.
   */
  _enableParallax() {
    // Убираем предыдущий обработчик
    document.removeEventListener('mousemove', this._parallaxBound);
    document.addEventListener('mousemove', this._parallaxBound);
  }

  _onMouseMoveParallax(e) {
    // Нормализуем позицию мыши: -1..1 от центра экрана
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    // Фон двигается на 8px, персонажи на 4px (разные скорости = глубина)
    const bgShift = 8;
    const charShift = 4;

    if (this._bgImg) {
      this._bgImg.style.transform = `translate(${-x * bgShift}px, ${-y * bgShift}px) scale(1.02)`;
    }
    if (this._charactersLayer) {
      this._charactersLayer.style.transform = `translate(${-x * charShift}px, ${-y * charShift}px)`;
    }
  }

  /**
   * Показать персонажа на сцене.
   * @param {Object} data — { character, position, sprite }
   */
  _showCharacter({ character: charId, position, sprite }) {
    const charData = scenario.getCharacter(charId);
    if (!charData) return;

    // Если персонаж уже на сцене — обновляем спрайт и позицию
    let el = this._activeCharacters[charId];
    if (!el) {
      el = document.createElement('div');
      el.classList.add('character-sprite');
      el.dataset.character = charId;
      this._charactersLayer.appendChild(el);
      this._activeCharacters[charId] = el;
    }

    // Устанавливаем спрайт (изображение)
    const spriteSrc = charData.sprites?.[sprite] ?? charData.sprites?.neutral;
    if (spriteSrc) {
      el.style.backgroundImage = `url(${spriteSrc})`;
    }

    // Позиционирование: left / center / right
    el.classList.remove('pos-left', 'pos-center', 'pos-right');
    el.classList.add(`pos-${position}`);

    // Анимация появления
    el.classList.add('character-enter');
    el.addEventListener(
      'animationend',
      () => el.classList.remove('character-enter'),
      { once: true }
    );
  }

  /** Убрать персонажа со сцены */
  _hideCharacter(charId) {
    const el = this._activeCharacters[charId];
    if (!el) return;

    // Анимация исчезновения
    el.classList.add('character-exit');
    el.addEventListener(
      'animationend',
      () => {
        el.remove();
        delete this._activeCharacters[charId];
      },
      { once: true }
    );
  }

  /** Сменить спрайт (эмоцию) персонажа */
  _changeSprite({ character: charId, sprite }) {
    const el = this._activeCharacters[charId];
    const charData = scenario.getCharacter(charId);
    if (!el || !charData) return;

    const spriteSrc = charData.sprites?.[sprite];
    if (spriteSrc) {
      el.style.backgroundImage = `url(${spriteSrc})`;
    }
  }

  /**
   * Подготовить кликабельные зоны (hotspots).
   * Создаёт DOM-элементы, но оставляет их скрытыми до enableHotspots.
   */
  _prepareHotspots(hotspots) {
    hotspots.forEach((hs) => {
      const el = document.createElement('div');
      el.classList.add('hotspot', 'hidden');
      el.dataset.id = hs.id;

      // Координаты в процентах от размера сцены
      el.style.left = `${hs.x}%`;
      el.style.top = `${hs.y}%`;
      el.style.width = `${hs.width}%`;
      el.style.height = `${hs.height}%`;
      el.style.cursor = hs.cursor ?? 'pointer';

      // Тултип при наведении
      if (hs.tooltip) {
        el.title = hs.tooltip;
      }

      // Обработчик клика
      el.addEventListener('click', () => {
        // Проверяем условие (requiresFlag)
        if (hs.requiresFlag && !gameState.getFlag(hs.requiresFlag)) {
          return; // Флаг не установлен — зона неактивна
        }

        // Отключаем hotspots после клика (одноразовое взаимодействие)
        this._disableHotspots();

        // Выполняем действия
        actionExecutor.execute(hs.onInteract);
      });

      this._hotspotsLayer.appendChild(el);
    });
  }

  /** Активировать hotspots (показать, сделать кликабельными) */
  _enableHotspots() {
    this._hotspotsEnabled = true;
    this._hotspotsLayer.querySelectorAll('.hotspot').forEach((el) => {
      el.classList.remove('hidden');
      el.classList.add('hotspot-active');
    });
  }

  /** Деактивировать hotspots */
  _disableHotspots() {
    this._hotspotsEnabled = false;
    this._hotspotsLayer.querySelectorAll('.hotspot').forEach((el) => {
      el.classList.add('hidden');
      el.classList.remove('hotspot-active');
    });
  }
}

export const sceneManager = new SceneManager();
