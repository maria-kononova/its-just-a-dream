/**
 * DialogueManager — управление диалогами.
 *
 * Отвечает за:
 * - Последовательный вывод фраз из текущей комнаты
 * - Эффект «печатающегося текста» (посимвольный вывод)
 * - Скип анимации печати при повторном клике
 * - Выполнение before/after-действий для каждой фразы
 * - Отображение выборов (choices)
 * - Запись фраз в историю
 */

import { eventBus } from './EventBus.js';
import { gameState } from './GameState.js';
import { scenario } from './ScenarioLoader.js';
import { actionExecutor } from './ActionExecutor.js';

class DialogueManager {
  constructor() {
    // DOM-элементы (инициализируются в init)
    this._box = null;
    this._speakerEl = null;
    this._textEl = null;
    this._hintEl = null;
    this._choicesContainer = null;

    // Состояние печати
    this._isTyping = false;       // Идёт ли сейчас анимация печати
    this._fullText = '';          // Полный текст текущей фразы
    this._typeTimer = null;       // Таймер посимвольного вывода
    this._currentCharIndex = 0;   // Индекс текущего символа
    this._isProcessing = false;   // Блокировка на время выполнения действий
    this._waitingForClick = false; // Ожидание клика для перехода к следующей фразе

    // Текущий набор фраз (phrases или onHotspotsComplete и т.д.)
    this._currentPhrases = [];
    this._currentPhraseIndex = 0;

    // Портрет персонажа
    this._portraitEl = null;
  }

  /** Инициализация — привязка к DOM и подписка на события */
  init() {
    this._box = document.getElementById('dialogue-box');
    this._portraitEl = document.getElementById('dialogue-portrait');
    this._speakerEl = this._box.querySelector('.dialogue-speaker');
    this._textEl = this._box.querySelector('.dialogue-text');
    this._hintEl = this._box.querySelector('.dialogue-continue-hint');
    this._choicesContainer = document.getElementById('choices-container');

    // Клик по диалоговому блоку — продвигает диалог
    this._box.addEventListener('click', () => this._onAdvance());

    // Клавиши: пробел и Enter тоже продвигают диалог
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!this._box.classList.contains('hidden')) {
          e.preventDefault();
          this._onAdvance();
        }
      }
    });

    // Подписки на события от других модулей
    eventBus.on('dialogue:start', (data) => this.startPhrases(data.phrases));
    eventBus.on('dialogue:continueFrom', (data) => this._continueFrom(data.phraseId));
    eventBus.on('dialogue:showFinalChoice', () => this._showFinalChoice());
  }

  /**
   * Начать воспроизведение набора фраз.
   * @param {Array} phrases — массив фраз из JSON
   */
  startPhrases(phrases) {
    this._currentPhrases = phrases;
    this._currentPhraseIndex = 0;
    this._showPhrase(this._currentPhrases[0]);
  }

  /**
   * Показать конкретную фразу.
   * Выполняет before-действия → печатает текст → выполняет after-действия → ждет клик.
   */
  async _showPhrase(phrase) {
    if (!phrase) return;

    this._isProcessing = true;
    this._waitingForClick = false;

    // Получаем данные персонажа
    const character = scenario.getCharacter(phrase.character);
    const speakerName = character?.name ?? '';
    const speakerColor = character?.color ?? '#ccc';

    // Определяем, говорит ли глитч-персонаж
    const isGlitch = phrase.character === 'glitch';

    // Показываем диалоговый блок
    this._box.classList.remove('hidden');
    this._box.classList.toggle('dialogue-glitch', isGlitch);
    this._speakerEl.textContent = speakerName;
    this._speakerEl.style.color = speakerColor;
    this._textEl.classList.toggle('glitch-text-style', isGlitch);
    this._hintEl.classList.add('hidden');

    // Портрет персонажа
    const spriteSrc = character?.sprites?.[phrase.sprite ?? 'neutral'];
    if (spriteSrc && speakerName) {
      this._portraitEl.style.backgroundImage = `url(${spriteSrc})`;
      this._portraitEl.classList.remove('portrait-hidden');
      this._portraitEl.classList.toggle('portrait-glitch', isGlitch);
    } else {
      this._portraitEl.classList.add('portrait-hidden');
    }

    // Выполняем before-действия (смена фона, эффекты, появление персонажей)
    await actionExecutor.execute(phrase.before);

    // Записываем фразу в историю
    gameState.addToHistory({
      character: phrase.character,
      name: speakerName,
      text: phrase.text,
      roomId: gameState.currentRoom,
    });
    eventBus.emit('history:updated');

    // Запускаем посимвольный вывод текста
    this._isProcessing = false;
    await this._typeText(phrase.text, isGlitch);

    // Автоматически выполняем after-действия после завершения печати
    this._isProcessing = true;
    await actionExecutor.execute(phrase.after);
    this._isProcessing = false;

    // Показываем подсказку и ждем клика для перехода к следующей фразе
    this._hintEl.classList.remove('hidden');
    this._waitingForClick = true;
  }

  /**
   * Эффект печатающегося текста.
   * Возвращает Promise, который резолвится когда текст полностью напечатан
   * (либо анимация, либо скип).
   */
  /**
   * Глитч-символы — случайно заменяют букву на долю секунды.
   * Используются при печати текста глитч-персонажа.
   */
  static GLITCH_CHARS = '█▓░▒╔╗╚╝╠╣╬│─┼╪▄▀■□◊◘◙';

  _typeText(text, isGlitch = false) {
    return new Promise((resolve) => {
      this._fullText = text;
      this._textEl.textContent = '';
      this._currentCharIndex = 0;
      this._isTyping = true;

      const delay = gameState.getCharDelay();

      // Если скорость максимальная — показываем сразу
      if (delay === 0) {
        this._textEl.textContent = text;
        this._isTyping = false;
        resolve();
        return;
      }

      // Счётчик для звука печати (не каждый символ, чтобы не спамить)
      let charsSinceSound = 0;

      // Посимвольный вывод
      this._typeResolve = resolve;
      this._typeTimer = setInterval(() => {
        if (this._currentCharIndex < this._fullText.length) {
          const realChar = this._fullText[this._currentCharIndex];

          // Глитч-эффект: с вероятностью 15% показываем случайный символ на мгновение
          if (isGlitch && Math.random() < 0.15 && realChar !== ' ') {
            const glitchChar = DialogueManager.GLITCH_CHARS[
              Math.floor(Math.random() * DialogueManager.GLITCH_CHARS.length)
            ];
            this._textEl.textContent += glitchChar;

            // Через 60мс заменяем на настоящий символ
            const idx = this._textEl.textContent.length - 1;
            setTimeout(() => {
              const t = this._textEl.textContent;
              this._textEl.textContent = t.substring(0, idx) + realChar + t.substring(idx + 1);
            }, 60);
          } else {
            this._textEl.textContent += realChar;
          }

          this._currentCharIndex++;

          // Звук печати (каждые 3 символа, чтобы не спамить)
          charsSinceSound++;
          if (charsSinceSound >= 3) {
            charsSinceSound = 0;
            eventBus.emit('audio:playSound', {
              name: isGlitch ? 'glitch_type' : 'text_type',
            });
          }
        } else {
          clearInterval(this._typeTimer);
          this._isTyping = false;
          resolve();
        }
      }, delay);
    });
  }

  /**
   * Обработчик клика/пробела — продвигает диалог.
   * Если текст печатается — скипает (показывает сразу).
   * Если текст уже напечатан и after выполнен — переходит к следующей фразе.
   */
  async _onAdvance() {
    // Блокировка на время выполнения действий
    if (this._isProcessing) return;

    // Скип анимации печати
    if (this._isTyping) {
      clearInterval(this._typeTimer);
      this._textEl.textContent = this._fullText;
      this._isTyping = false;
      if (this._typeResolve) {
        this._typeResolve();
        this._typeResolve = null;
      }
      return;
    }

    // Если waitingForClick === true, значит after уже выполнен и можно переходить
    if (this._waitingForClick) {
      this._waitingForClick = false;
      this._hintEl.classList.add('hidden');
      
      // Переход к следующей фразе
      this._currentPhraseIndex++;

      if (this._currentPhraseIndex < this._currentPhrases.length) {
        // Показываем следующую фразу
        const nextPhrase = this._currentPhrases[this._currentPhraseIndex];
        if (nextPhrase) {
          await this._showPhrase(nextPhrase);
        }
      } else {
        // Фразы закончились — скрываем диалог
        this.hide();
      }
    }
  }

  /**
   * Продолжить диалог с определённой фразы (вызывается из hotspot/puzzle).
   * Ищет фразу по id в onHotspotsComplete или onPuzzleSolved.
   */
  _continueFrom(phraseId) {
    const room = scenario.getRoom(gameState.currentRoom);
    if (!room) return;

    // Ищем фразу в onHotspotsComplete
    let phrases = room.onHotspotsComplete ?? [];
    let startIndex = phrases.findIndex((p) => p.id === phraseId);

    // Если не нашли — ищем в onPuzzleSolved
    if (startIndex === -1) {
      phrases = room.onPuzzleSolved ?? [];
      startIndex = phrases.findIndex((p) => p.id === phraseId);
    }

    if (startIndex !== -1) {
      this.startPhrases(phrases.slice(startIndex));
    }
  }

  /** Показать финальный выбор (кнопки «Проснуться» / «Остаться») */
  _showFinalChoice() {
    this.hide();
    eventBus.emit('finalChoice:show');
  }

  /** Показать диалоговый блок */
  show() {
    this._box.classList.remove('hidden');
  }

  /** Скрыть диалоговый блок */
  hide() {
    this._box.classList.add('hidden');
    this._hintEl.classList.add('hidden');
    this._waitingForClick = false;
  }
}

export const dialogueManager = new DialogueManager();