/**
 * PuzzleManager — модульная система загадок.
 *
 * Архитектура:
 * - PuzzleManager — координатор, получает puzzleId из сценария,
 *   находит конфигурацию, создаёт нужный тип загадки и рендерит её.
 * - Каждый тип загадки — отдельный класс с единым интерфейсом:
 *   { render(container, config, onSolve) }
 *
 * Поддерживаемые типы:
 * - 'code'      — ввод числового кода (замок, комбинация)
 * - 'cipher'    — расшифровка текста (шифр Цезаря)
 * - 'sequence'  — нажатие элементов в правильном порядке
 * - 'slider'    — собрать изображение из передвигаемых частей (15 puzzle)
 * - 'matching'  — сопоставление пар (карточки памяти)
 * - 'hidden'    — поиск скрытых объектов на изображении
 *
 * Как добавить свою загадку:
 * 1. Создать класс с методом render(container, config, onSolve)
 * 2. Зарегистрировать в _puzzleTypes: this._puzzleTypes['myType'] = new MyPuzzle();
 * 3. В scenario.json указать "type": "myType" и нужный config
 */

import { eventBus } from '../engine/EventBus.js';
import { gameState } from '../engine/GameState.js';
import { scenario } from '../engine/ScenarioLoader.js';
import { actionExecutor } from '../engine/ActionExecutor.js';

// === Типы загадок ===

/**
 * CodePuzzle — ввод числового/буквенного кода.
 * Пример: замок с 4 цифрами.
 */
class CodePuzzle {
  render(container, config, onSolve) {
    container.innerHTML = `
      <div class="puzzle-inner puzzle-code">
        <h3 class="puzzle-title">${config.title}</h3>
        <p class="puzzle-desc">${config.description}</p>
        <div class="code-input-row">
          ${Array.from({ length: config.length }, (_, i) => `
            <input type="text" maxlength="1" class="code-digit" data-index="${i}"
                   autocomplete="off" />
          `).join('')}
        </div>
        <button class="btn-novel btn-puzzle-submit">Проверить</button>
        <div class="puzzle-hint hidden">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${config.hint}</p>
        </div>
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;

    const inputs = container.querySelectorAll('.code-digit');
    const submitBtn = container.querySelector('.btn-puzzle-submit');
    const feedback = container.querySelector('.puzzle-feedback');
    const hintToggle = container.querySelector('.btn-hint-toggle');
    const hintText = container.querySelector('.hint-text');

    // Автофокус на первый input
    inputs[0]?.focus();

    // Переход между полями при вводе
    inputs.forEach((input, i) => {
      input.addEventListener('input', () => {
        if (input.value && i < inputs.length - 1) {
          inputs[i + 1].focus();
        }
      });
      // Backspace — переход назад
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && i > 0) {
          inputs[i - 1].focus();
        }
        // Enter — проверить
        if (e.key === 'Enter') submitBtn.click();
      });
    });

    // Проверка ответа
    submitBtn.addEventListener('click', () => {
      const answer = Array.from(inputs).map((i) => i.value).join('');
      if (answer.toUpperCase() === config.answer.toUpperCase()) {
        feedback.textContent = 'Верно!';
        feedback.classList.remove('hidden', 'wrong');
        feedback.classList.add('correct');
        setTimeout(() => onSolve(), 800);
      } else {
        feedback.textContent = 'Неправильно, попробуйте ещё раз';
        feedback.classList.remove('hidden', 'correct');
        feedback.classList.add('wrong');
        // Эффект тряски на неправильный ответ
        container.querySelector('.puzzle-inner').classList.add('effect-shake');
        setTimeout(() => {
          container.querySelector('.puzzle-inner')?.classList.remove('effect-shake');
        }, 500);
      }
    });

    // Подсказка
    hintToggle.addEventListener('click', () => {
      hintText.classList.toggle('hidden');
    });
    // Показываем кнопку подсказки
    container.querySelector('.puzzle-hint').classList.remove('hidden');
  }
}

/**
 * CipherPuzzle — расшифровка текста.
 * По умолчанию — шифр Цезаря, но можно задать любой шифр через config.
 */
class CipherPuzzle {
  render(container, config, onSolve) {
    container.innerHTML = `
      <div class="puzzle-inner puzzle-cipher">
        <h3 class="puzzle-title">${config.title}</h3>
        <p class="puzzle-desc">${config.description}</p>
        <div class="cipher-display">
          <span class="cipher-encoded">${config.encoded}</span>
        </div>
        <div class="cipher-input-row">
          <input type="text" class="cipher-answer" placeholder="Введите расшифровку..."
                 autocomplete="off" />
          <button class="btn-novel btn-puzzle-submit">Проверить</button>
        </div>
        <div class="puzzle-hint">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${config.hint}</p>
        </div>
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;

    const input = container.querySelector('.cipher-answer');
    const submitBtn = container.querySelector('.btn-puzzle-submit');
    const feedback = container.querySelector('.puzzle-feedback');
    const hintToggle = container.querySelector('.btn-hint-toggle');
    const hintText = container.querySelector('.hint-text');

    input.focus();

    const check = () => {
      if (input.value.toUpperCase().trim() === config.answer.toUpperCase()) {
        feedback.textContent = 'Расшифровано!';
        feedback.classList.remove('hidden', 'wrong');
        feedback.classList.add('correct');
        setTimeout(() => onSolve(), 800);
      } else {
        feedback.textContent = 'Не то... попробуйте ещё';
        feedback.classList.remove('hidden', 'correct');
        feedback.classList.add('wrong');
      }
    };

    submitBtn.addEventListener('click', check);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    hintToggle.addEventListener('click', () => hintText.classList.toggle('hidden'));
  }
}

/**
 * SequencePuzzle — нажатие элементов в правильном порядке.
 * Пример: собрать лицо из осколков зеркала (лоб → нос → глаз → рот).
 */
class SequencePuzzle {
  render(container, config, onSolve) {
    // Перемешиваем элементы для отображения
    const shuffled = [...config.items].sort(() => Math.random() - 0.5);
    let currentStep = 1;

    container.innerHTML = `
      <div class="puzzle-inner puzzle-sequence">
        <h3 class="puzzle-title">${config.title}</h3>
        <p class="puzzle-desc">${config.description}</p>
        <div class="sequence-items">
          ${shuffled.map((item) => `
            <button class="btn-sequence-item" data-id="${item.id}" data-order="${item.order}">
              ${item.label}
            </button>
          `).join('')}
        </div>
        <div class="sequence-progress">
          Шаг: <span class="seq-step">1</span> / ${config.items.length}
        </div>
        <div class="puzzle-hint">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${config.hint}</p>
        </div>
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;

    const stepDisplay = container.querySelector('.seq-step');
    const feedback = container.querySelector('.puzzle-feedback');
    const hintToggle = container.querySelector('.btn-hint-toggle');
    const hintText = container.querySelector('.hint-text');

    container.querySelectorAll('.btn-sequence-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const order = parseInt(btn.dataset.order);

        if (order === currentStep) {
          // Правильный порядок
          btn.classList.add('sequence-correct');
          btn.disabled = true;
          currentStep++;
          stepDisplay.textContent = currentStep;
          eventBus.emit('audio:playSound', { name: 'btn_click' });

          if (currentStep > config.items.length) {
            feedback.textContent = 'Собрано!';
            feedback.classList.remove('hidden', 'wrong');
            feedback.classList.add('correct');
            setTimeout(() => onSolve(), 800);
          }
        } else {
          // Неправильный порядок — сброс
          btn.classList.add('sequence-wrong');
          setTimeout(() => btn.classList.remove('sequence-wrong'), 500);

          feedback.textContent = 'Неправильный порядок, начните сначала';
          feedback.classList.remove('hidden', 'correct');
          feedback.classList.add('wrong');

          // Сброс
          currentStep = 1;
          stepDisplay.textContent = 1;
          container.querySelectorAll('.btn-sequence-item').forEach((b) => {
            b.classList.remove('sequence-correct');
            b.disabled = false;
          });
        }
      });
    });

    hintToggle.addEventListener('click', () => hintText.classList.toggle('hidden'));
  }
}

/**
 * SliderPuzzle — паззл 15 (sliding puzzle).
 * Сетка 3x3 с одной пустой ячейкой. Нужно расставить числа по порядку.
 */
class SliderPuzzle {
  render(container, config, onSolve) {
    const size = config.gridSize ?? 3;
    const total = size * size;
    // Генерируем решаемую перестановку
    let tiles = this._generateSolvable(size);

    container.innerHTML = `
      <div class="puzzle-inner puzzle-slider">
        <h3 class="puzzle-title">${config.title ?? 'Соберите паззл'}</h3>
        <p class="puzzle-desc">${config.description ?? 'Передвигайте плитки, чтобы расставить их по порядку.'}</p>
        <div class="slider-grid" style="grid-template-columns: repeat(${size}, 1fr);"></div>
        <div class="puzzle-hint">
          <button class="btn-hint-toggle">Подсказка</button>
          <p class="hint-text hidden">${config.hint ?? 'Начните с верхнего левого угла.'}</p>
        </div>
      </div>
    `;

    const grid = container.querySelector('.slider-grid');

    const renderGrid = () => {
      grid.innerHTML = '';
      tiles.forEach((val, i) => {
        const tile = document.createElement('div');
        tile.classList.add('slider-tile');
        if (val === 0) {
          tile.classList.add('slider-empty');
        } else {
          tile.textContent = val;
          tile.addEventListener('click', () => {
            const emptyIndex = tiles.indexOf(0);
            if (this._isAdjacent(i, emptyIndex, size)) {
              // Меняем местами
              [tiles[i], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[i]];
              eventBus.emit('audio:playSound', { name: 'btn_click' });
              renderGrid();

              // Проверяем решение
              if (this._isSolved(tiles)) {
                setTimeout(() => onSolve(), 500);
              }
            }
          });
        }
        grid.appendChild(tile);
      });
    };

    renderGrid();

    const hintToggle = container.querySelector('.btn-hint-toggle');
    const hintText = container.querySelector('.hint-text');
    hintToggle.addEventListener('click', () => hintText.classList.toggle('hidden'));
  }

  _isAdjacent(i, j, size) {
    const rowI = Math.floor(i / size), colI = i % size;
    const rowJ = Math.floor(j / size), colJ = j % size;
    return Math.abs(rowI - rowJ) + Math.abs(colI - colJ) === 1;
  }

  _isSolved(tiles) {
    for (let i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[tiles.length - 1] === 0;
  }

  _generateSolvable(size) {
    const total = size * size;
    let arr;
    do {
      arr = Array.from({ length: total }, (_, i) => i);
      // Fisher-Yates shuffle
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } while (!this._checkSolvable(arr, size));
    return arr;
  }

  _checkSolvable(arr, size) {
    let inversions = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) inversions++;
      }
    }
    if (size % 2 === 1) return inversions % 2 === 0;
    const emptyRow = Math.floor(arr.indexOf(0) / size);
    return (inversions + emptyRow) % 2 === 1;
  }
}

/**
 * MatchingPuzzle — сопоставление пар (Memory Cards).
 * Переворачиваем карточки и находим пары.
 */
class MatchingPuzzle {
  render(container, config, onSolve) {
    // Дублируем пары и перемешиваем
    const pairs = config.pairs ?? [
      { id: 1, label: 'Луна' }, { id: 2, label: 'Звезда' },
      { id: 3, label: 'Тень' }, { id: 4, label: 'Свет' },
    ];
    const cards = [...pairs, ...pairs]
      .map((p, i) => ({ ...p, uid: i }))
      .sort(() => Math.random() - 0.5);

    let flipped = [];
    let matched = 0;

    container.innerHTML = `
      <div class="puzzle-inner puzzle-matching">
        <h3 class="puzzle-title">${config.title ?? 'Найдите пары'}</h3>
        <p class="puzzle-desc">${config.description ?? 'Переворачивайте карточки и находите совпадения.'}</p>
        <div class="matching-grid">
          ${cards.map((c) => `
            <div class="match-card" data-id="${c.id}" data-uid="${c.uid}">
              <div class="card-front">?</div>
              <div class="card-back">${c.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.match-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (flipped.length >= 2 || card.classList.contains('flipped') || card.classList.contains('matched')) {
          return;
        }

        card.classList.add('flipped');
        flipped.push(card);
        eventBus.emit('audio:playSound', { name: 'btn_click' });

        if (flipped.length === 2) {
          const [a, b] = flipped;
          if (a.dataset.id === b.dataset.id) {
            // Совпадение
            a.classList.add('matched');
            b.classList.add('matched');
            matched++;
            flipped = [];
            eventBus.emit('audio:playSound', { name: 'puzzle_solved' });

            if (matched === pairs.length) {
              setTimeout(() => onSolve(), 600);
            }
          } else {
            // Не совпадение — переворачиваем обратно
            setTimeout(() => {
              a.classList.remove('flipped');
              b.classList.remove('flipped');
              flipped = [];
            }, 800);
          }
        }
      });
    });
  }
}

/**
 * HiddenObjectsPuzzle — поиск скрытых объектов на изображении.
 * По сути — набор hotspots на изображении внутри контейнера загадки.
 */
class HiddenObjectsPuzzle {
  render(container, config, onSolve) {
    const objects = config.objects ?? [];
    let found = 0;

    container.innerHTML = `
      <div class="puzzle-inner puzzle-hidden">
        <h3 class="puzzle-title">${config.title ?? 'Найдите все предметы'}</h3>
        <p class="puzzle-desc">${config.description ?? ''}</p>
        <div class="hidden-scene" style="background-image: url(${config.image ?? ''});">
          ${objects.map((obj) => `
            <div class="hidden-object" data-id="${obj.id}"
                 style="left:${obj.x}%; top:${obj.y}%; width:${obj.w}%; height:${obj.h}%;"
                 title="${obj.label}">
            </div>
          `).join('')}
        </div>
        <div class="hidden-counter">Найдено: <span>0</span> / ${objects.length}</div>
      </div>
    `;

    const counter = container.querySelector('.hidden-counter span');

    container.querySelectorAll('.hidden-object').forEach((obj) => {
      obj.addEventListener('click', () => {
        if (obj.classList.contains('found')) return;

        obj.classList.add('found');
        found++;
        counter.textContent = found;
        eventBus.emit('audio:playSound', { name: 'btn_click' });

        if (found === objects.length) {
          setTimeout(() => onSolve(), 600);
        }
      });
    });
  }
}

/**
 * WireCutPuzzle — обезвреживание устройства путём перерезания проводов.
 * 
 * Правила:
 * - Провода: Красный, Синий, Чёрный, Жёлтый, Зелёный (всегда в этом порядке)
 * - Верный порядок: Жёлтый → Синий → Красный → Зелёный
 * - Чёрный провод перерезать нельзя (но это нигде не указано)
 * - При ошибке все провода восстанавливаются
 */
class WireCutPuzzle {
  render(container, config, onSolve) {
    // Правильный порядок разрезания (индексы проводов: 0-красный, 1-синий, 2-чёрный, 3-жёлтый, 4-зелёный)
    const correctOrder = [3, 1, 0, 4]; // Жёлтый → Синий → Красный → Зелёный
    
    // Состояние проводов: false = целый, true = разрезан
    let wireState = [false, false, false, false, false];
    // Порядок разрезания (храним индексы в том порядке, как резал игрок)
    let cutSequence = [];
    // Флаг, что загадка уже решена (блокируем повторные проверки)
    let solved = false;
    
    // Цвета проводов (для тёмного фона)
    const wireColors = [
      '#c41e3a', // Красный - тёмно-красный
      '#2c5f8a', // Синий - приглушённый синий
      '#2a2a2a', // Чёрный - почти чёрный с оттенком
      '#c4a747', // Жёлтый - тёмно-золотой
      '#2d6b3f'  // Зелёный - тёмно-зелёный
    ];
    
    const wireNames = ['Красный', 'Синий', 'Чёрный', 'Жёлтый', 'Зелёный'];
    
    container.innerHTML = `
      <div class="puzzle-inner puzzle-wirecut">
        <h3 class="puzzle-title">${config.title || 'Обезвредите устройство'}</h3>
        <p class="puzzle-desc">${config.description || 'Перережьте провода в правильном порядке.'}</p>
        
        <div class="wires-container">
          ${wireNames.map((name, idx) => `
            <button class="wire-btn" data-index="${idx}" data-name="${name}" 
                    style="background: ${wireColors[idx]};">
              <span class="wire-cut-mark hidden">/</span>
            </button>
          `).join('')}
        </div>
        
        <div class="wire-actions">
          <button class="btn-novel btn-puzzle-submit">Проверить</button>
        </div>
        
        <p class="puzzle-feedback hidden"></p>
      </div>
    `;
    
    // Стили для контейнера проводов
    const style = document.createElement('style');
    style.textContent = `
      .wires-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 20px 0;
        padding: 10px;
      }
      
      .wire-btn {
        width: 100%;
        height: 48px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      
      .wire-btn:hover {
        filter: brightness(1.1);
        transform: scale(1.01);
      }
      
      .wire-btn:active {
        transform: scale(0.99);
      }
      
      .wire-btn.cut {
        opacity: 0.6;
        cursor: default;
        filter: grayscale(0.3);
      }
      
      .wire-btn.cut:hover {
        filter: grayscale(0.3);
        transform: none;
      }
      
      .wire-cut-mark {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 42px;
        font-weight: bold;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.3);
        text-shadow: 0 0 2px black;
        pointer-events: none;
      }
      
      .wire-cut-mark:not(.hidden) {
        display: flex;
      }
      
      .wire-cut-mark.hidden {
        display: none;
      }
    `;
    container.appendChild(style);
    
    const wires = container.querySelectorAll('.wire-btn');
    const feedback = container.querySelector('.puzzle-feedback');
    const submitBtn = container.querySelector('.btn-puzzle-submit');
    
    // Функция обновления визуального состояния проводов
    const updateWireVisual = () => {
      wires.forEach((wire, idx) => {
        const cutMark = wire.querySelector('.wire-cut-mark');
        if (wireState[idx]) {
          wire.classList.add('cut');
          cutMark.classList.remove('hidden');
        } else {
          wire.classList.remove('cut');
          cutMark.classList.add('hidden');
        }
      });
    };
    
    // Функция сброса загадки
    const resetPuzzle = () => {
      wireState = [false, false, false, false, false];
      cutSequence = [];
      updateWireVisual();
      feedback.classList.add('hidden');
    };
    
    // Функция проверки решения
    const checkSolution = () => {
      if (solved) return;
      
      // Сравниваем последовательность с правильным порядком
      let isCorrect = true;
      
      // Должно быть перерезано ровно 4 провода (чёрный остаётся)
      if (cutSequence.length !== correctOrder.length) {
        isCorrect = false;
      } else {
        // Проверяем каждый шаг
        for (let i = 0; i < correctOrder.length; i++) {
          if (cutSequence[i] !== correctOrder[i]) {
            isCorrect = false;
            break;
          }
        }
      }
      
      // Дополнительная проверка: чёрный провод (индекс 2) не должен быть разрезан
      if (wireState[2] === true) {
        isCorrect = false;
      }
      
      if (isCorrect) {
        feedback.textContent = 'Правильно!';
        feedback.classList.remove('hidden', 'wrong');
        feedback.classList.add('correct');
        solved = true;
        
        // Блокируем все провода
        wires.forEach((wire) => {
          wire.disabled = true;
        });
        
        setTimeout(() => onSolve(), 800);
      } else {
        feedback.textContent = 'Неправильный порядок!';
        feedback.classList.remove('hidden', 'correct');
        feedback.classList.add('wrong');
        
        // Эффект тряски
        container.querySelector('.puzzle-inner').classList.add('effect-shake');
        setTimeout(() => {
          container.querySelector('.puzzle-inner')?.classList.remove('effect-shake');
        }, 500);
        
        // Сбрасываем загадку
        resetPuzzle();
      }
    };
    
    // Обработчик нажатия на провод
    wires.forEach((wire) => {
      wire.addEventListener('click', () => {
        if (solved) return;
        
        const idx = parseInt(wire.dataset.index);
        
        // Если провод уже разрезан - игнорируем
        if (wireState[idx]) return;
        
        // Перерезаем провод
        wireState[idx] = true;
        cutSequence.push(idx);
        updateWireVisual();
        
        // Звук (если есть)
        eventBus.emit('audio:playSound', { name: 'btn_click' });
      });
    });
    
    // Проверка по кнопке
    submitBtn.addEventListener('click', checkSolution);
    
    // Инициализация
    updateWireVisual();
  }
}

// === Координатор загадок ===

class PuzzleManager {
  constructor() {
    this._container = null;

    // Реестр типов загадок — сюда можно добавлять свои
    this._puzzleTypes = {
      code: new CodePuzzle(),
      cipher: new CipherPuzzle(),
      sequence: new SequencePuzzle(),
      slider: new SliderPuzzle(),
      matching: new MatchingPuzzle(),
      hidden: new HiddenObjectsPuzzle(),
      generator: new WireCutPuzzle(),
    };
  }

  /** Инициализация */
  init() {
    this._container = document.getElementById('puzzle-container');

    eventBus.on('puzzle:start', (data) => this.startPuzzle(data.puzzleId));
  }

  /**
   * Запустить загадку по id.
   * Ищет конфигурацию в текущей комнате → создаёт DOM → ожидает решения.
   */
  startPuzzle(puzzleId) {
    const room = scenario.getRoom(gameState.currentRoom);
    if (!room?.puzzles?.[puzzleId]) {
      console.error(`[PuzzleManager] Загадка "${puzzleId}" не найдена`);
      return;
    }

    const puzzleData = room.puzzles[puzzleId];
    const puzzleClass = this._puzzleTypes[puzzleData.type];

    if (!puzzleClass) {
      console.error(`[PuzzleManager] Тип загадки "${puzzleData.type}" не зарегистрирован`);
      return;
    }

    // Показываем контейнер загадки
    this._container.classList.remove('hidden');
    this._container.innerHTML = '';

    // Рендерим загадку
    puzzleClass.render(this._container, puzzleData.config, () => {
      // Callback при решении
      this._container.classList.add('hidden');
      this._container.innerHTML = '';

      // Выполняем onSolve-действия из сценария
      actionExecutor.execute(puzzleData.onSolve);

      // Уведомляем, что загадка решена
      eventBus.emit('puzzle:solved');
    });
  }

  /**
   * Зарегистрировать новый тип загадки.
   * @param {string} type — имя типа (используется в JSON: "type": "myType")
   * @param {Object} instance — объект с методом render(container, config, onSolve)
   */
  registerPuzzleType(type, instance) {
    this._puzzleTypes[type] = instance;
  }
}

export const puzzleManager = new PuzzleManager();
