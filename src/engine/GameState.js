/**
 * GameState — глобальное состояние игры.
 *
 * Хранит:
 * - текущую комнату
 * - инвентарь
 * - флаги (решённые загадки, найденные предметы, сюжетные триггеры)
 * - историю пройденных фраз
 * - настройки громкости/скорости текста
 *
 * Сохранение не требуется (новелла одноразовая),
 * но структура позволяет добавить его при необходимости.
 */

class GameState {
  constructor() {
    this.reset();
  }

  /** Сброс состояния к начальному */
  reset() {
    // Текущая комната
    this.currentRoom = null;

    // Индекс текущей фразы в массиве phrases комнаты
    this.phraseIndex = 0;

    // В какой фазе находится комната: 'phrases' | 'hotspots' | 'puzzleSolved'
    this.roomPhase = 'phrases';

    // Инвентарь: массив id предметов
    this.inventory = [];

    // Флаги — произвольные булевы переменные для условий
    // Например: { cipher_solved: true, light_on: false }
    this.flags = {};

    // История фраз: [{ character, name, text, roomId }]
    this.history = [];

    // Настройки (значения по умолчанию, перезаписываются из UI)
    this.settings = {
      musicVolume: 0.7,
      sfxVolume: 0.8,
      textSpeed: 5, // 1-10, где 10 — мгновенно
    };
  }

  /** Добавить предмет в инвентарь */
  addItem(itemId) {
    if (!this.inventory.includes(itemId)) {
      this.inventory.push(itemId);
    }
  }

  /** Проверить наличие предмета */
  hasItem(itemId) {
    return this.inventory.includes(itemId);
  }

  /** Установить флаг */
  setFlag(flag, value = true) {
    this.flags[flag] = value;
  }

  /** Получить значение флага */
  getFlag(flag) {
    return this.flags[flag] ?? false;
  }

  /** Добавить фразу в историю */
  addToHistory(entry) {
    this.history.push({
      character: entry.character,
      name: entry.name,
      text: entry.text,
      roomId: entry.roomId,
    });
  }

  /**
   * Получить историю для текущей комнаты.
   * (Заказчик просил возможность смотреть историю «в конкретном блоке/комнате»)
   */
  getHistoryForRoom(roomId) {
    return this.history.filter((h) => h.roomId === roomId);
  }

  /**
   * Перевести скорость текста (1-10) в задержку между символами (мс).
   * 1 = медленно (80мс), 10 = мгновенно (0мс).
   */
  getCharDelay() {
    const speed = this.settings.textSpeed;
    if (speed >= 10) return 0;
    // Линейная интерполяция: speed 1 → 80мс, speed 9 → ~10мс
    return Math.round(80 - (speed - 1) * 8.75);
  }
}

// Singleton
export const gameState = new GameState();
