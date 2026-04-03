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
 * - transitionFade                — плавное затемнение в чёрный (основной переход)
 * - fadeToBlack / fadeFromBlack   — затемнение / появление из черноты
 * - fadeToWhite / fadeFromWhite   — засветление / появление из белого
 * - transitionDoor                — дверной проём (чёрные полосы)
 * - transitionGlitch              — глитч-разрыв
 * - transitionSpiral              — спиральное затемнение
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
    
    // Активный fade-эффект (чтобы не накладывать несколько)
    this._activeFade = null;
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
   * @param {Object} params — { name, duration, target, onComplete }
   */
  play({ name, duration = 1000, target = 'screen', onComplete = null }) {
    // Получаем целевой элемент
    const targetEl = this._resolveTarget(target);

    switch (name) {
      case 'transitionFade':
        this._transitionFade(duration, onComplete);
        break;
      case 'fadeToBlack':
        this._fadeToColor('black', duration, onComplete);
        break;
      case 'fadeFromBlack':
        this._fadeFromColor('black', duration, onComplete);
        break;
      case 'fadeToWhite':
        this._fadeToColor('white', duration, onComplete);
        break;
      case 'fadeFromWhite':
        this._fadeFromColor('white', duration, onComplete);
        break;
      case 'transitionDoor':
        this._transitionDoor(duration, onComplete);
        break;
      case 'transitionGlitch':
        this._transitionGlitch(duration, onComplete);
        break;
      case 'transitionSpiral':
        this._transitionSpiral(duration, onComplete);
        break;
      case 'glitchLight':
        this._glitch(targetEl, 'light', duration, onComplete);
        break;
      case 'glitchMedium':
        this._glitch(targetEl, 'medium', duration, onComplete);
        break;
      case 'glitchHeavy':
        this._glitch(targetEl, 'heavy', duration, onComplete);
        break;
      case 'shake':
        this._shake(targetEl, duration, onComplete);
        break;
      case 'noise':
        this._noise(duration, onComplete);
        break;
      case 'pulseGlow':
        this._pulseGlow(targetEl, duration, onComplete);
        break;
      default:
        console.warn(`[EffectsManager] Неизвестный эффект: "${name}"`);
        if (onComplete) onComplete();
        else eventBus.emit('effect:done');
    }
  }

  /**
   * transitionFade — плавное затемнение в чёрный и обратно
   * Основной переход для хоррор-атмосферы.
   * Использует CSS-классы .transition-fade и .transition-fade.in
   */
  _transitionFade(duration, onComplete) {
    // Удаляем предыдущий fade, если есть
    if (this._activeFade) {
      this._activeFade.remove();
      this._activeFade = null;
    }

    const fadeEl = document.createElement('div');
    fadeEl.className = 'transition-fade';
    
    // Убеждаемся, что стили применены (на случай, если CSS не загружен)
    fadeEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #000000;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `;
    
    document.body.appendChild(fadeEl);
    this._activeFade = fadeEl;
    
    // Запускаем затемнение
    requestAnimationFrame(() => {
      fadeEl.classList.add('in');
      fadeEl.style.opacity = '1';
    });
    
    // Ждём завершения затемнения, вызываем коллбэк и запускаем появление
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        eventBus.emit('effect:done');
      }
      
      // Запускаем появление из черноты
      requestAnimationFrame(() => {
        fadeEl.classList.remove('in');
        fadeEl.style.opacity = '0';
      });
      
      // Удаляем элемент после завершения анимации появления
      setTimeout(() => {
        if (fadeEl.parentNode) {
          fadeEl.remove();
        }
        this._activeFade = null;
      }, duration);
    }, duration);
  }

  /**
   * transitionFadeColored — плавное затемнение в цветной фон
   * Для особых атмосферных моментов (фиолетовое затемнение)
   */
  _transitionFadeColored(color = '#0a0508', duration, onComplete) {
    // Удаляем предыдущий fade, если есть
    if (this._activeFade) {
      this._activeFade.remove();
      this._activeFade = null;
    }

    const fadeEl = document.createElement('div');
    fadeEl.className = 'transition-fade-colored';
    
    fadeEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${color};
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `;
    
    document.body.appendChild(fadeEl);
    this._activeFade = fadeEl;
    
    // Запускаем затемнение
    requestAnimationFrame(() => {
      fadeEl.style.opacity = '1';
    });
    
    // Ждём завершения затемнения, вызываем коллбэк и запускаем появление
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        eventBus.emit('effect:done');
      }
      
      // Запускаем появление
      requestAnimationFrame(() => {
        fadeEl.style.opacity = '0';
      });
      
      // Удаляем элемент после завершения анимации появления
      setTimeout(() => {
        if (fadeEl.parentNode) {
          fadeEl.remove();
        }
        this._activeFade = null;
      }, duration);
    }, duration);
  }

  /**
   * Затемнение (fade to color)
   * Создаёт полноэкранный оверлей, который становится непрозрачным
   */
  _fadeToColor(color, duration, onComplete) {
    // Удаляем предыдущий fade, если есть
    if (this._activeFade) {
      this._activeFade.remove();
      this._activeFade = null;
    }

    const fadeEl = document.createElement('div');
    fadeEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${color};
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `;
    
    document.body.appendChild(fadeEl);
    this._activeFade = fadeEl;
    
    // Запускаем анимацию затемнения
    requestAnimationFrame(() => {
      fadeEl.style.opacity = '1';
    });
    
    // Ждём завершения
    setTimeout(() => {
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
    }, duration);
  }

  /**
   * Появление из цвета (fade from color)
   * Убирает затемнение, открывая изображение
   */
  _fadeFromColor(color, duration, onComplete) {
    // Если есть активный fade — используем его
    if (this._activeFade && this._activeFade.style.backgroundColor === color) {
      const fadeEl = this._activeFade;
      
      requestAnimationFrame(() => {
        fadeEl.style.opacity = '0';
      });
      
      setTimeout(() => {
        fadeEl.remove();
        this._activeFade = null;
        if (onComplete) onComplete();
        else eventBus.emit('effect:done');
      }, duration);
    } else {
      // Если нет активного fade — создаём новый и сразу начинаем исчезать
      const fadeEl = document.createElement('div');
      fadeEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: ${color};
        z-index: 1000;
        pointer-events: none;
        opacity: 1;
        transition: opacity ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1);
      `;
      
      document.body.appendChild(fadeEl);
      
      requestAnimationFrame(() => {
        fadeEl.style.opacity = '0';
      });
      
      setTimeout(() => {
        fadeEl.remove();
        if (onComplete) onComplete();
        else eventBus.emit('effect:done');
      }, duration);
    }
  }

  /**
   * Переход «дверной проём» — чёрные полосы сходятся/расходятся
   * Использует CSS-классы .transition-door, .door-left, .door-right
   */
  _transitionDoor(duration, onComplete) {
    const halfDuration = duration / 2;
    
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      z-index: 1000;
      pointer-events: none;
    `;
    
    const leftDoor = document.createElement('div');
    leftDoor.style.cssText = `
      flex: 1;
      background: #000;
      transform: scaleX(0);
      transform-origin: left;
      transition: transform ${halfDuration}ms ease-in;
    `;
    
    const rightDoor = document.createElement('div');
    rightDoor.style.cssText = `
      flex: 1;
      background: #000;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform ${halfDuration}ms ease-in;
    `;
    
    el.appendChild(leftDoor);
    el.appendChild(rightDoor);
    document.body.appendChild(el);
    
    // Закрываем двери
    requestAnimationFrame(() => {
      leftDoor.style.transform = 'scaleX(1)';
      rightDoor.style.transform = 'scaleX(1)';
    });
    
    // Ждём закрытия, затем делаем коллбэк и открываем
    setTimeout(() => {
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
      
      // Открываем двери
      leftDoor.style.transform = 'scaleX(0)';
      rightDoor.style.transform = 'scaleX(0)';
      
      // Удаляем элемент после анимации открытия
      setTimeout(() => {
        el.remove();
      }, halfDuration);
    }, halfDuration);
  }

  /**
   * Переход «глитч-разрыв» — экран разбивается на горизонтальные полосы
   */
  /**
 * Переход «глитч-разрыв» — разноцветные полосы (красный + зелёный/синий)
 */
_transitionGlitch(duration, onComplete) {
  const el = document.createElement('div');
  el.className = 'transition-glitch';
  el.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: none;
    overflow: hidden;
    background: #000;
  `;
  
  // Создаём полосы с разными цветами
  const stripCount = 12; // Больше полос — эффектнее глитч
  const stripHeight = 100 / stripCount;
  
  for (let i = 0; i < stripCount; i++) {
    const strip = document.createElement('div');
    strip.className = 'transition-glitch-strip';
    
    // Чередуем цвета: красный и зелёный
    const isEven = i % 2 === 0;
    const color1 = isEven ? '#ff0000' : '#00ff00';
    const color2 = isEven ? '#ff3333' : '#33ff33';
    const color3 = isEven ? '#cc0000' : '#00cc66';
    
    strip.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${i * stripHeight}%;
      height: ${stripHeight}%;
      background: linear-gradient(90deg, ${color1}, ${color2}, ${color1}, ${color3}, ${color1});
      transform: translateX(-100%);
      transition: transform ${duration * 0.7}ms cubic-bezier(0.4, 0.0, 0.2, 1);
      transition-delay: ${i * 0.025}s;
      mix-blend-mode: screen;
      box-shadow: 0 0 8px ${isEven ? 'rgba(255, 0, 0, 0.6)' : 'rgba(0, 255, 0, 0.6)'};
    `;
    
    el.appendChild(strip);
  }
  
  document.body.appendChild(el);
  
  // Анимируем появление полос
  requestAnimationFrame(() => {
    const strips = el.querySelectorAll('.transition-glitch-strip');
    strips.forEach(strip => {
      strip.style.transform = 'translateX(0)';
    });
  });
  
  // Ждём завершения и убираем
  setTimeout(() => {
    // Добавляем эффект исчезновения
    const strips = el.querySelectorAll('.transition-glitch-strip');
    strips.forEach((strip, idx) => {
      strip.style.transition = `opacity 0.2s ease ${idx * 0.01}s`;
      strip.style.opacity = '0';
    });
    
    setTimeout(() => {
      el.remove();
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
    }, 200);
  }, duration);
}

/**
 * Альтернативный RGB-глитч переход (красный + зелёный + синий)
 */
_transitionGlitchRGB(duration, onComplete) {
  const el = document.createElement('div');
  el.className = 'transition-glitch-rgb';
  el.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: none;
    overflow: hidden;
    background: #000;
  `;
  
  const stripCount = 15;
  const stripHeight = 100 / stripCount;
  
  for (let i = 0; i < stripCount; i++) {
    const strip = document.createElement('div');
    strip.className = 'rgb-strip';
    
    // Три цвета: красный, зелёный, синий
    let color;
    if (i % 3 === 0) color = '#ff0000';
    else if (i % 3 === 1) color = '#00ff00';
    else color = '#0044ff';
    
    strip.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${i * stripHeight}%;
      height: ${stripHeight}%;
      background: ${color};
      transform: translateX(-100%);
      transition: transform ${duration * 0.6}ms cubic-bezier(0.4, 0.0, 0.2, 1);
      transition-delay: ${i * 0.02}s;
      mix-blend-mode: screen;
      box-shadow: 0 0 12px ${color};
    `;
    
    el.appendChild(strip);
  }
  
  document.body.appendChild(el);
  
  requestAnimationFrame(() => {
    const strips = el.querySelectorAll('.rgb-strip');
    strips.forEach(strip => {
      strip.style.transform = 'translateX(0)';
    });
  });
  
  setTimeout(() => {
    const strips = el.querySelectorAll('.rgb-strip');
    strips.forEach((strip, idx) => {
      strip.style.transition = `opacity 0.15s ease ${idx * 0.008}s`;
      strip.style.opacity = '0';
    });
    
    setTimeout(() => {
      el.remove();
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
    }, 200);
  }, duration);
}

  /**
   * Переход «спираль» — круговое затемнение
   */
  _transitionSpiral(duration, onComplete) {
    const halfDuration = duration / 2;
    
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      inset: 0;
      background-color: #000;
      z-index: 1000;
      pointer-events: none;
      transition: clip-path ${halfDuration}ms ease-in-out;
      clip-path: circle(150% at 50% 50%);
    `;
    
    document.body.appendChild(el);
    
    // Схлопываем круг
    requestAnimationFrame(() => {
      el.style.clipPath = 'circle(0% at 50% 50%)';
    });
    
    // Ждём схлопывания, делаем коллбэк и раскрываем
    setTimeout(() => {
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
      
      // Раскрываем круг
      el.style.clipPath = 'circle(150% at 50% 50%)';
      
      // Удаляем элемент
      setTimeout(() => {
        el.remove();
      }, halfDuration);
    }, halfDuration);
  }

  /**
   * Глитч — применяется CSS-класс с соответствующей анимацией.
   * Три уровня интенсивности: light, medium, heavy.
   */
  _glitch(targetEl, intensity, duration, onComplete) {
    const className = `effect-glitch-${intensity}`;
    targetEl.classList.add(className);

    setTimeout(() => {
      targetEl.classList.remove(className);
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
    }, duration);
  }

  /** Тряска экрана */
  _shake(targetEl, duration, onComplete) {
    targetEl.classList.add('effect-shake');

    setTimeout(() => {
      targetEl.classList.remove('effect-shake');
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
    }, duration);
  }

  /** Шум / статика — оверлей с анимированным шумом */
  _noise(duration, onComplete) {
    const noiseEl = document.createElement('div');
    noiseEl.classList.add('effect-noise');
    noiseEl.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999;
      pointer-events: none;
    `;
    this._overlay.appendChild(noiseEl);

    setTimeout(() => {
      noiseEl.remove();
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
    }, duration);
  }

  /** Пульсация свечения */
  _pulseGlow(targetEl, duration, onComplete) {
    targetEl.classList.add('effect-pulse');

    setTimeout(() => {
      targetEl.classList.remove('effect-pulse');
      if (onComplete) onComplete();
      else eventBus.emit('effect:done');
    }, duration);
  }

  /**
   * Запустить эмбиент-эффект (работает постоянно, пока не clearAmbient).
   * @param {string} name — имя эффекта (vignette, flicker, chromatic, pulse, breathing)
   */
  playAmbient(name) {
    // Не дублируем
    if (this._ambientEffects[name]) return;

    const el = document.createElement('div');
    el.classList.add('ambient-effect', `ambient-${name}`);
    el.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 5;
    `;
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