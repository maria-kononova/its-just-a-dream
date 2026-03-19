/**
 * AudioManager — управление звуком.
 *
 * Два канала:
 * 1. Музыка (BGM) — один трек за раз, с плавным переходом (crossfade)
 * 2. Звуковые эффекты (SFX) — могут играть одновременно
 *
 * Все пути к файлам берутся из scenario.json через ScenarioLoader.
 * Звуки кешируются после первой загрузки.
 */

import { eventBus } from './EventBus.js';
import { gameState } from './GameState.js';
import { scenario } from './ScenarioLoader.js';

class AudioManager {
  constructor() {
    // Текущий музыкальный трек
    this._musicAudio = null;
    this._currentMusicName = null;

    // Кеш загруженных звуков
    this._soundCache = new Map();

    // Время плавного перехода между треками (мс)
    this._crossfadeDuration = 1500;
  }

  /** Инициализация — подписка на события */
  init() {
    eventBus.on('audio:playMusic', (data) => this.playMusic(data.name));
    eventBus.on('audio:stopMusic', () => this.stopMusic());
    eventBus.on('audio:playSound', (data) => this.playSound(data.name));

    // Обновление громкости из настроек
    eventBus.on('settings:changed', () => this._updateVolumes());
  }

  /**
   * Воспроизвести фоновую музыку.
   * Если уже играет тот же трек — ничего не делаем.
   * Если играет другой — плавно переключаемся.
   */
  playMusic(name) {
    if (this._currentMusicName === name) return;

    const path = scenario.getMusicPath(name);
    if (!path) {
      console.warn(`[AudioManager] Музыка "${name}" не найдена в сценарии`);
      return;
    }

    // Плавно затухаем старый трек
    if (this._musicAudio) {
      this._fadeOut(this._musicAudio, this._crossfadeDuration);
    }

    // Создаём новый
    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = 0;

    // Пробуем воспроизвести (может не сработать до первого клика пользователя)
    audio.play().catch(() => {
      // Браузер заблокировал автоплей — попробуем после первого взаимодействия
      const tryPlay = () => {
        audio.play().catch(() => {});
        document.removeEventListener('click', tryPlay);
      };
      document.addEventListener('click', tryPlay, { once: true });
    });

    // Плавно нарастаем громкость
    this._fadeIn(audio, this._crossfadeDuration, gameState.settings.musicVolume);

    this._musicAudio = audio;
    this._currentMusicName = name;
  }

  /** Остановить музыку с плавным затуханием */
  stopMusic() {
    if (this._musicAudio) {
      this._fadeOut(this._musicAudio, this._crossfadeDuration);
      this._musicAudio = null;
      this._currentMusicName = null;
    }
  }

  /**
   * Воспроизвести звуковой эффект.
   * Звуки короткие и играют поверх всего остального.
   */
  playSound(name) {
    const path = scenario.getSoundPath(name);
    if (!path) {
      // Не предупреждаем в консоль — звуки опциональны в демо
      return;
    }

    // Используем кешированный аудио-объект или создаём новый
    let audio = this._soundCache.get(name);
    if (audio) {
      // Если звук ещё играет — перезапускаем
      audio.currentTime = 0;
    } else {
      audio = new Audio(path);
      this._soundCache.set(name, audio);
    }

    audio.volume = gameState.settings.sfxVolume;
    audio.play().catch(() => {});
  }

  /** Плавное нарастание громкости */
  _fadeIn(audio, duration, targetVolume) {
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(volumeStep * currentStep, targetVolume);

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepTime);
  }

  /** Плавное затухание громкости, после — остановка */
  _fadeOut(audio, duration) {
    const steps = 20;
    const stepTime = duration / steps;
    const startVolume = audio.volume;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(startVolume - volumeStep * currentStep, 0);

      if (currentStep >= steps) {
        clearInterval(timer);
        audio.pause();
        audio.src = '';
      }
    }, stepTime);
  }

  /** Обновить громкость текущей музыки из настроек */
  _updateVolumes() {
    if (this._musicAudio) {
      this._musicAudio.volume = gameState.settings.musicVolume;
    }
  }
}

export const audioManager = new AudioManager();
