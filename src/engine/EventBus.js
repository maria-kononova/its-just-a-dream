/**
 * EventBus — центральная шина событий.
 *
 * Все модули общаются между собой через EventBus.
 * Это позволяет избежать прямых зависимостей между компонентами:
 * DialogueManager не знает про EffectsManager, но может отправить
 * событие 'effect:play', и EffectsManager его подхватит.
 *
 * Использование:
 *   eventBus.on('effect:play', (data) => { ... });
 *   eventBus.emit('effect:play', { name: 'glitch', duration: 1000 });
 *   eventBus.off('effect:play', handler);
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Подписаться на событие.
   * @param {string} event — имя события
   * @param {Function} callback — обработчик
   * @returns {Function} — функция для отписки (удобно для cleanup)
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Возвращаем функцию отписки для удобства
    return () => this.off(event, callback);
  }

  /**
   * Подписаться на событие один раз — обработчик автоматически удалится после вызова.
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  /**
   * Отписаться от события.
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  /**
   * Отправить событие всем подписчикам.
   * @param {string} event — имя события
   * @param {*} data — данные события (любой тип)
   */
  emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      for (const callback of set) {
        try {
          callback(data);
        } catch (err) {
          console.error(`[EventBus] Ошибка в обработчике "${event}":`, err);
        }
      }
    }
  }
}

// Единственный экземпляр на всё приложение (singleton)
export const eventBus = new EventBus();
