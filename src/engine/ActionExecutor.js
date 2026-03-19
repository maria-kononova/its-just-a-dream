/**
 * ActionExecutor — выполняет действия (events) из JSON-сценария.
 *
 * Это «мозг» движка. Каждая фраза может иметь массивы before/after,
 * каждый hotspot — onInteract, каждая загадка — onSolve.
 * Все они содержат объекты-действия вида { type: '...', ...params }.
 *
 * ActionExecutor знает, как выполнить каждый тип действия,
 * делегируя работу другим менеджерам через EventBus.
 *
 * Поддерживаемые типы действий:
 * - effect          → запуск визуального эффекта
 * - sound           → воспроизведение звука
 * - showCharacter   → показать персонажа на сцене
 * - hideCharacter   → убрать персонажа со сцены
 * - changeSprite    → сменить спрайт (эмоцию) персонажа
 * - changeBackground → сменить фон
 * - addItem         → добавить предмет в инвентарь
 * - setFlag         → установить сюжетный флаг
 * - goToRoom        → перейти в другую комнату
 * - startPuzzle     → запустить загадку
 * - enableHotspots  → активировать кликабельные зоны
 * - continueDialogue → продолжить диалог с определённой фразы
 * - showFinalChoice → показать финальный выбор
 * - showCredits     → показать титры
 * - playVideo       → воспроизвести катсцену
 */

import { eventBus } from './EventBus.js';
import { gameState } from './GameState.js';

class ActionExecutor {
  /**
   * Выполнить массив действий последовательно.
   * Каждое действие может быть асинхронным (например, fade длится 2 секунды).
   *
   * @param {Array<Object>} actions — массив действий из JSON
   */
  async execute(actions) {
    if (!actions || !Array.isArray(actions)) return;

    for (const action of actions) {
      await this._executeOne(action);
    }
  }

  /**
   * Выполнить одно действие.
   * @param {Object} action — объект действия { type, ...params }
   */
  async _executeOne(action) {
    switch (action.type) {
      // --- Визуальные эффекты ---
      case 'effect':
        await this._awaitEvent('effect:done', () => {
          eventBus.emit('effect:play', {
            name: action.name,
            duration: action.duration ?? 1000,
            target: action.target ?? 'screen',
          });
        });
        break;

      // --- Звук ---
      case 'sound':
        // Звуки не блокируют — воспроизводятся параллельно
        eventBus.emit('audio:playSound', { name: action.name });
        break;

      // --- Персонажи ---
      case 'showCharacter':
        eventBus.emit('character:show', {
          character: action.character,
          position: action.position ?? 'center',
          sprite: action.sprite ?? 'neutral',
        });
        break;

      case 'hideCharacter':
        eventBus.emit('character:hide', { character: action.character });
        break;

      case 'changeSprite':
        eventBus.emit('character:changeSprite', {
          character: action.character,
          sprite: action.sprite,
        });
        break;

      // --- Фон ---
      case 'changeBackground':
        eventBus.emit('scene:changeBackground', { src: action.src });
        break;

      // --- Инвентарь и флаги ---
      case 'addItem':
        gameState.addItem(action.item);
        eventBus.emit('inventory:updated', { itemId: action.item });
        break;

      case 'setFlag':
        gameState.setFlag(action.flag, action.value ?? true);
        break;

      // --- Навигация ---
      case 'goToRoom':
        // Если указан тип перехода — проигрываем его перед сменой комнаты
        if (action.transition) {
          const transitionDuration = action.transitionDuration ?? 1200;
          await this._awaitEvent('effect:done', () => {
            eventBus.emit('effect:play', {
              name: action.transition,
              duration: transitionDuration,
            });
          });
        }
        eventBus.emit('scene:goToRoom', { room: action.room });
        break;

      // --- Загадки ---
      case 'startPuzzle':
        // Ждём, пока загадка будет решена
        await this._awaitEvent('puzzle:solved', () => {
          eventBus.emit('puzzle:start', { puzzleId: action.puzzleId });
        });
        break;

      // --- Управление диалогом ---
      case 'enableHotspots':
        eventBus.emit('hotspots:enable');
        break;

      case 'continueDialogue':
        eventBus.emit('dialogue:continueFrom', { phraseId: action.phraseId });
        break;

      case 'showFinalChoice':
        eventBus.emit('dialogue:showFinalChoice');
        break;

      case 'showCredits':
        eventBus.emit('game:showCredits');
        break;

      // --- Видео ---
      case 'playVideo':
        await this._awaitEvent('video:ended', () => {
          eventBus.emit('video:play', { src: action.src });
        });
        break;

      default:
        console.warn(`[ActionExecutor] Неизвестный тип действия: "${action.type}"`);
    }
  }

  /**
   * Утилита: выполнить действие и ждать события-подтверждения.
   * Используется для блокирующих операций (эффекты, загадки, видео).
   *
   * @param {string} doneEvent — событие, которое сигнализирует об окончании
   * @param {Function} startFn — функция, запускающая операцию
   * @returns {Promise<void>}
   */
  _awaitEvent(doneEvent, startFn) {
    return new Promise((resolve) => {
      eventBus.once(doneEvent, resolve);
      startFn();
    });
  }
}

export const actionExecutor = new ActionExecutor();
