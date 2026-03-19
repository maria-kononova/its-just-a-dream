/**
 * EffectsManager — система визуальных эффектов.
 *
 * Все эффекты применяются через CSS-классы и анимации.
 * Каждый эффект можно применить к любому элементу:
 * - 'screen'  → весь игровой экран
 * - 'puzzle'  → контейнер загадки
 * - конкретный CSS-селектор
 *
 * Типы эффектов:
 * - fadeToBlack / fadeFromBlack   — затемнение / появление из черноты
 * - fadeToWhite / fadeFromWhite   — засветление / появление из белого
 * - glitchLight                   — лёгкий глитч (мерцание)
 * - glitchMedium                  — средний глитч (смещение каналов)
 * - glitchHeavy                   — тяжёлый глитч (полный распад)
 * - shake                         — тряска экрана
 * - noise                         — шум / статика
 * - pulseGlow                     — пульсация свечения
 * - chromatic                     — хроматическая аберрация
 * - flicker                       — мерцание света
 * - vignette                      — затемнение по краям (эмбиент)
 *
 * Эмбиент-эффекты (vignette, flicker, chromatic) работают постоянно,
 * пока не будет вызвано clearAmbient при смене комнаты.
 */

import { eventBus } from '../engine/EventBus.js';

class EffectsManager {
  constructor() {
    this._overlay = null;
    this._gameScreen = null;

    // Активные эмбиент-эффекты: имя → DOM-элемент
    this._ambientEffects = {};
  }

  /** Инициализация */
  init() {
    this._overlay = document.getElementById('effects-overlay');
    this._gameScreen = document.getElementById('screen-game');

    // Подписки
    eventBus.on('effect:play', (data) => this.play(data));
    eventBus.on('effect:playAmbient', (data) => this.playAmbient(data.name));
    eventBus.on('effect:clearAmbient', () => this.clearAmbient());
  }

  /**
   * Воспроизвести эффект.
   * @param {Object} params — { name, duration, target }
   */
  play({ name, duration = 1000, target = 'screen' }) {
    // Получаем целевой элемент
    const targetEl = this._resolveTarget(target);

    switch (name) {
      case 'fadeToBlack':
        this._fade(targetEl, 'black', 'in', duration);
        break;
      case 'fadeFromBlack':
        this._fade(targetEl, 'black', 'out', duration);
        break;
      case 'fadeToWhite':
        this._fade(targetEl, 'white', 'in', duration);
        break;
      case 'fadeFromWhite':
        this._fade(targetEl, 'white', 'out', duration);
        break;
      case 'glitchLight':
        this._glitch(targetEl, 'light', duration);
        break;
      case 'glitchMedium':
        this._glitch(targetEl, 'medium', duration);
        break;
      case 'glitchHeavy':
        this._glitch(targetEl, 'heavy', duration);
        break;
      case 'shake':
        this._shake(targetEl, duration);
        break;
      case 'noise':
        this._noise(duration);
        break;
      case 'pulseGlow':
        this._pulseGlow(targetEl, duration);
        break;

      // Вариативные переходы между комнатами
      case 'transitionDoor':
        this._transitionDoor(duration);
        break;
      case 'transitionGlitch':
        this._transitionGlitch(duration);
        break;
      case 'transitionSpiral':
        this._transitionSpiral(duration);
        break;
      default:
        console.warn(`[EffectsManager] Неизвестный эффект: "${name}"`);
        // Для неизвестных эффектов — просто ждём duration и отправляем done
        setTimeout(() => eventBus.emit('effect:done'), duration);
    }
  }

  /**
   * Fade — затемнение / засветление.
   * direction: 'in' = экран покрывается цветом, 'out' = цвет уходит.
   */
  _fade(targetEl, color, direction, duration) {
    const fadeEl = document.createElement('div');
    fadeEl.classList.add('effect-fade');
    fadeEl.style.backgroundColor = color;
    fadeEl.style.transitionDuration = `${duration}ms`;

    if (direction === 'in') {
      // Начинаем прозрачным, заканчиваем непрозрачным
      fadeEl.style.opacity = '0';
      this._overlay.appendChild(fadeEl);
      // Запускаем transition на следующем кадре
      requestAnimationFrame(() => {
        fadeEl.style.opacity = '1';
      });
    } else {
      // Начинаем непрозрачным, заканчиваем прозрачным
      fadeEl.style.opacity = '1';
      this._overlay.appendChild(fadeEl);
      requestAnimationFrame(() => {
        fadeEl.style.opacity = '0';
      });
    }

    // Убираем элемент и отправляем done после завершения
    setTimeout(() => {
      fadeEl.remove();
      eventBus.emit('effect:done');
    }, duration + 50);
  }

  /**
   * Глитч — применяется CSS-класс с соответствующей анимацией.
   * Три уровня интенсивности: light, medium, heavy.
   */
  _glitch(targetEl, intensity, duration) {
    const className = `effect-glitch-${intensity}`;
    targetEl.classList.add(className);

    setTimeout(() => {
      targetEl.classList.remove(className);
      eventBus.emit('effect:done');
    }, duration);
  }

  /** Тряска экрана */
  _shake(targetEl, duration) {
    targetEl.classList.add('effect-shake');

    setTimeout(() => {
      targetEl.classList.remove('effect-shake');
      eventBus.emit('effect:done');
    }, duration);
  }

  /** Шум / статика — оверлей с анимированным шумом */
  _noise(duration) {
    const noiseEl = document.createElement('div');
    noiseEl.classList.add('effect-noise');
    this._overlay.appendChild(noiseEl);

    setTimeout(() => {
      noiseEl.remove();
      eventBus.emit('effect:done');
    }, duration);
  }

  /** Пульсация свечения */
  _pulseGlow(targetEl, duration) {
    targetEl.classList.add('effect-pulse');

    setTimeout(() => {
      targetEl.classList.remove('effect-pulse');
      eventBus.emit('effect:done');
    }, duration);
  }

  /** Переход «дверной проём» — чёрные полосы сходятся к центру */
  _transitionDoor(duration) {
    const el = document.createElement('div');
    el.classList.add('transition-door');
    el.innerHTML = '<div class="door-left"></div><div class="door-right"></div>';
    this._overlay.appendChild(el);

    // Через половину duration — открываем
    setTimeout(() => {
      el.classList.add('opening');
    }, duration / 2);

    setTimeout(() => {
      el.remove();
      eventBus.emit('effect:done');
    }, duration);
  }

  /** Переход «глитч-разрыв» — экран разбивается на горизонтальные полосы */
  _transitionGlitch(duration) {
    const el = document.createElement('div');
    el.classList.add('transition-glitch');

    // Создаём 8 полос
    const stripCount = 8;
    const stripHeight = 100 / stripCount;
    for (let i = 0; i < stripCount; i++) {
      const strip = document.createElement('div');
      strip.classList.add('transition-glitch-strip');
      strip.style.top = `${i * stripHeight}%`;
      strip.style.height = `${stripHeight}%`;
      strip.style.animationDelay = `${i * 0.05}s`;
      el.appendChild(strip);
    }

    this._overlay.appendChild(el);

    setTimeout(() => {
      el.remove();
      eventBus.emit('effect:done');
    }, duration);
  }

  /**
   * Переход «спираль» — кружение в темноту.
   * Чёрный круг сходится к центру, затем расходится обратно.
   */
  _transitionSpiral(duration) {
    const el = document.createElement('div');
    el.classList.add('transition-spiral');
    this._overlay.appendChild(el);

    // Через половину duration — открываем
    setTimeout(() => {
      el.classList.add('opening');
    }, duration / 2);

    setTimeout(() => {
      el.remove();
      eventBus.emit('effect:done');
    }, duration);
  }

  /**
   * Запустить эмбиент-эффект (работает постоянно, пока не clearAmbient).
   * @param {string} name — имя эффекта (vignette, flicker, chromatic, pulse)
   */
  playAmbient(name) {
    // Не дублируем
    if (this._ambientEffects[name]) return;

    const el = document.createElement('div');
    el.classList.add('ambient-effect', `ambient-${name}`);
    this._overlay.appendChild(el);
    this._ambientEffects[name] = el;
  }

  /** Убрать все эмбиент-эффекты */
  clearAmbient() {
    Object.values(this._ambientEffects).forEach((el) => el.remove());
    this._ambientEffects = {};
  }

  /** Получить DOM-элемент по имени цели */
  _resolveTarget(target) {
    switch (target) {
      case 'screen':
        return this._gameScreen;
      case 'puzzle':
        return document.getElementById('puzzle-container');
      default:
        return document.querySelector(target) ?? this._gameScreen;
    }
  }
}

export const effectsManager = new EffectsManager();
