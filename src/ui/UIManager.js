/**
 * UIManager — управление интерфейсом.
 *
 * Отвечает за:
 * - Кнопки управления (история, инвентарь)
 * - Панель истории фраз
 * - Панель инвентаря
 * - Модальные окна (об игре, настройки)
 * - Финальный выбор (кнопка, убегающая от курсора)
 * - Звуки кнопок при наведении и клике
 * - Титры
 */

import { eventBus } from '../engine/EventBus.js';
import { gameState } from '../engine/GameState.js';
import { scenario } from '../engine/ScenarioLoader.js';
import { actionExecutor } from '../engine/ActionExecutor.js';

class UIManager {
  constructor() {
    this._historyPanel = null;
    this._historyList = null;
    this._inventoryPanel = null;
    this._inventoryList = null;
  }

  /** Инициализация — привязка всех обработчиков */
  init() {
    this._historyPanel = document.getElementById('history-panel');
    this._historyList = document.getElementById('history-list');
    this._inventoryPanel = document.getElementById('inventory-panel');
    this._inventoryList = document.getElementById('inventory-list');

    this._initTitleScreen();
    this._initGameButtons();
    this._initPanelCloseButtons();
    this._initButtonSounds();

    // Элементы прогресс-бара и toast
    this._progressFill = document.getElementById('progress-fill');
    this._toastContainer = document.getElementById('toast-container');

    // Подписки
    eventBus.on('history:updated', () => this._updateHistoryPanel());
    eventBus.on('inventory:updated', (data) => {
      this._updateInventoryPanel();
      // Toast при получении предмета
      if (data?.itemId) {
        const item = scenario.getItem(data.itemId);
        if (item) this._showToast(`Получено: ${item.name}`, 'item');
      }
    });
    eventBus.on('finalChoice:show', () => this._showFinalChoice());
    eventBus.on('game:showCredits', () => this._showCredits());
    eventBus.on('puzzle:solved', () => this._showToast('Загадка решена!', 'puzzle'));
    eventBus.on('scene:goToRoom', () => this._updateProgress());
    eventBus.on('dialogue:showChoices', (data) => this._showChoices(data));
  }

  /** Настройка кнопок титульного экрана */
  _initTitleScreen() {
    const titleScreen = document.getElementById('screen-title');

    // Кнопка «Начать»
    titleScreen.querySelector('[data-action="start"]').addEventListener('click', () => {
      eventBus.emit('game:start');
    });

    // Кнопка «Об игре»
    titleScreen.querySelector('[data-action="about"]').addEventListener('click', () => {
      document.getElementById('modal-about').classList.remove('hidden');
    });

    // Кнопка «Настройки»
    titleScreen.querySelector('[data-action="settings"]').addEventListener('click', () => {
      document.getElementById('modal-settings').classList.remove('hidden');
    });

    // Закрытие модальных окон
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.modal').classList.add('hidden');
      });
    });

    // Слайдеры настроек
    this._initSettingsSliders();
  }

  /** Настройка слайдеров громкости и скорости текста */
  _initSettingsSliders() {
    const musicSlider = document.getElementById('volume-music');
    const sfxSlider = document.getElementById('volume-sfx');
    const textSpeedSlider = document.getElementById('text-speed');

    if (musicSlider) {
      musicSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        gameState.settings.musicVolume = val / 100;
        e.target.nextElementSibling.textContent = `${val}%`;
        eventBus.emit('settings:changed');
      });
    }

    if (sfxSlider) {
      sfxSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        gameState.settings.sfxVolume = val / 100;
        e.target.nextElementSibling.textContent = `${val}%`;
      });
    }

    if (textSpeedSlider) {
      textSpeedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        gameState.settings.textSpeed = val;
        e.target.nextElementSibling.textContent = val;
      });
    }
  }

  /** Кнопки игрового экрана (история, инвентарь) */
  _initGameButtons() {
    document.querySelectorAll('#ui-buttons .btn-ui').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'history') {
          this._togglePanel(this._historyPanel);
        } else if (action === 'inventory') {
          this._togglePanel(this._inventoryPanel);
        }
      });
    });
  }

  /** Кнопки закрытия боковых панелей */
  _initPanelCloseButtons() {
    document.querySelectorAll('.btn-close-panel').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.side-panel').classList.add('hidden');
      });
    });
  }

  /**
   * Звуки на всех кнопках.
   * Используем делегирование событий — один обработчик на body.
   */
  _initButtonSounds() {
    document.body.addEventListener('mouseenter', (e) => {
      if (e.target.matches('button, .btn-novel, .btn-ui, .hotspot-active')) {
        eventBus.emit('audio:playSound', { name: 'btn_hover' });
      }
    }, true); // useCapture для mouseenter

    document.body.addEventListener('click', (e) => {
      if (e.target.matches('button, .btn-novel, .btn-ui')) {
        eventBus.emit('audio:playSound', { name: 'btn_click' });
      }
    });
  }

  /** Переключить видимость боковой панели */
  _togglePanel(panel) {
    // Закрываем другую панель
    if (panel === this._historyPanel) {
      this._inventoryPanel.classList.add('hidden');
    } else {
      this._historyPanel.classList.add('hidden');
    }
    panel.classList.toggle('hidden');
  }

  /** Обновить содержимое панели истории */
  _updateHistoryPanel() {
    const history = gameState.currentRoom
      ? gameState.getHistoryForRoom(gameState.currentRoom)
      : gameState.history;

    this._historyList.innerHTML = '';
    history.forEach((entry) => {
      const el = document.createElement('div');
      el.classList.add('history-entry');

      if (entry.name) {
        const nameEl = document.createElement('span');
        nameEl.classList.add('history-name');
        nameEl.textContent = entry.name;
        el.appendChild(nameEl);
      }

      const textEl = document.createElement('span');
      textEl.classList.add('history-text');
      textEl.textContent = entry.text;
      el.appendChild(textEl);

      this._historyList.appendChild(el);
    });

    // Прокрутка вниз
    this._historyList.scrollTop = this._historyList.scrollHeight;
  }

  /** Обновить содержимое панели инвентаря */
  _updateInventoryPanel() {
    this._inventoryList.innerHTML = '';

    if (gameState.inventory.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('inventory-empty');
      empty.textContent = 'Инвентарь пуст';
      this._inventoryList.appendChild(empty);
      return;
    }

    gameState.inventory.forEach((itemId) => {
      const item = scenario.getItem(itemId);
      if (!item) return;

      const el = document.createElement('div');
      el.classList.add('inventory-item');

      const icon = document.createElement('div');
      icon.classList.add('item-icon');
      icon.style.backgroundImage = `url(${item.icon})`;
      el.appendChild(icon);

      const info = document.createElement('div');
      info.classList.add('item-info');

      const name = document.createElement('div');
      name.classList.add('item-name');
      name.textContent = item.name;
      info.appendChild(name);

      const desc = document.createElement('div');
      desc.classList.add('item-desc');
      desc.textContent = item.description;
      info.appendChild(desc);

      el.appendChild(info);
      this._inventoryList.appendChild(el);
    });
  }

  /**
   * Финальный выбор — «Проснуться» и «Остаться» (убегает от курсора).
   */
  _showFinalChoice() {
    const room = scenario.getRoom(gameState.currentRoom);
    if (!room?.finalChoice) return;

    // Скрываем затемнённый экран, если он есть
    const darkScreen = document.querySelector('.dark-screen, .final-choice-darken, #dark-overlay, .overlay-dark');
    if (darkScreen) {
      darkScreen.classList.add('hidden');
    }

    const container = document.getElementById('choices-container');
    container.classList.remove('hidden');
    container.innerHTML = '';
    container.classList.add('final-choice-container');

    room.finalChoice.buttons.forEach((btnData) => {
      const btn = document.createElement('button');
      btn.classList.add('btn-novel', 'btn-choice');
      btn.textContent = btnData.text;

      if (btnData.type === 'runaway') {
        // Кнопка, убегающая от курсора
        btn.classList.add('btn-runaway');
        btn.addEventListener('mouseover', (e) => {
          this._runawayButton(btn, e);
        });
      } else {
        // Обычная кнопка — выполняет действия
        btn.addEventListener('click', () => {
          container.classList.add('hidden');
          actionExecutor.execute(btnData.onSelect);
        });
      }

      container.appendChild(btn);
    });
  }

  /**
   * Логика «убегающей» кнопки.
   * При наведении кнопка перемещается в случайную позицию,
   * оставаясь в пределах экрана.
   */
  _runawayButton(btn, event) {
    const container = btn.parentElement;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    // Генерируем новую позицию (в пределах контейнера)
    const maxX = containerRect.width - btnRect.width - 20;
    const maxY = containerRect.height - btnRect.height - 20;

    const newX = Math.random() * maxX;
    const newY = Math.random() * maxY;

    btn.style.position = 'absolute';
    btn.style.left = `${newX}px`;
    btn.style.top = `${newY}px`;
    btn.style.transition = 'left 0.2s, top 0.2s';

    // Звук при каждом «побеге»
    eventBus.emit('audio:playSound', { name: 'btn_hover' });
  }

  /** Показать титры */
  _showCredits() {
    const gameScreen = document.getElementById('screen-game');
    const credits = document.createElement('div');
    credits.classList.add('credits-overlay');
    credits.innerHTML = `
      <div class="credits-content">
        <h2>Конец</h2>
        <p>Спасибо за время, проведённое с тобой</p>
        <p class="credits-small">Идея: Тайо</p>
        <p class="credits-small">Разработка: Тайо (Claude Code)</p>
        <p class="credits-small">Плохой дизайн: Тайо</p>
        <p class="credits-small">Музыка: скачено с интернетика по поиску "бесплатни"</p>
        <p class="credits-small">Сценарий: Тайо</p>
        <button class="btn-novel btn-credits-close">Скачать</button>
      </div>
    `;

    credits.querySelector('.btn-credits-close').addEventListener('click', () => {
      const imageUrl = '/assets/items/heart.png';
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'heart.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    gameScreen.appendChild(credits);
  }

  /**
   * Toast-уведомление — появляется справа вверху и исчезает через 3 сек.
   * @param {string} message — текст
   * @param {string} type — 'item' | 'puzzle' | 'info'
   */
  _showToast(message, type = 'info') {
    if (!this._toastContainer) return;

    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);

    const titles = { item: 'Инвентарь', puzzle: 'Загадка', info: 'Информация' };
    toast.innerHTML = `
      <div class="toast-title">${titles[type] ?? ''}</div>
      <div>${message}</div>
    `;

    this._toastContainer.appendChild(toast);

    // Удаляем после анимации (3 сек: 0.4 вход + 2.2 показ + 0.4 выход)
    setTimeout(() => toast.remove(), 3200);
  }

  /**
   * Обновить индикатор прогресса (сколько комнат пройдено).
   */
  _updateProgress() {
    if (!this._progressFill || !scenario.data) return;

    const totalRooms = Object.keys(scenario.data.rooms).length;
    // Считаем уникальные посещённые комнаты из истории
    const visited = new Set(gameState.history.map((h) => h.roomId));
    const percent = Math.round((visited.size / totalRooms) * 100);

    this._progressFill.style.width = `${percent}%`;
  }

  /**
   * Показать диалоговые варианты выбора.
   * @param {Object} data — { choices: [{ text, onSelect }] }
   */
  _showChoices(data) {
    const container = document.getElementById('choices-container');
    container.classList.remove('hidden');
    container.innerHTML = '';

    data.choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.classList.add('choice-option');
      btn.textContent = choice.text;

      btn.addEventListener('click', () => {
        container.classList.add('hidden');
        container.innerHTML = '';
        eventBus.emit('audio:playSound', { name: 'btn_click' });
        if (choice.onSelect) {
          actionExecutor.execute(choice.onSelect);
        }
      });

      container.appendChild(btn);
    });
  }
}

export const uiManager = new UIManager();