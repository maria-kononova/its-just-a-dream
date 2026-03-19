/**
 * ScenarioLoader — загрузчик сценария из JSON.
 *
 * Загружает /data/scenario.json и предоставляет
 * удобный доступ к комнатам, персонажам, предметам и аудио.
 */

class ScenarioLoader {
  constructor() {
    /** @type {Object|null} — загруженный сценарий */
    this.data = null;
  }

  /** Загрузить сценарий с сервера */
  async load(url = '/data/scenario.json') {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Не удалось загрузить сценарий: ${response.status}`);
    }
    this.data = await response.json();
    return this.data;
  }

  /** Получить настройки */
  get settings() {
    return this.data?.settings ?? {};
  }

  /** Получить данные комнаты по id */
  getRoom(roomId) {
    return this.data?.rooms?.[roomId] ?? null;
  }

  /** Получить данные персонажа по id */
  getCharacter(characterId) {
    return this.data?.characters?.[characterId] ?? null;
  }

  /** Получить данные предмета по id */
  getItem(itemId) {
    return this.data?.items?.[itemId] ?? null;
  }

  /** Получить путь к музыкальному треку */
  getMusicPath(musicId) {
    return this.data?.audio?.music?.[musicId] ?? null;
  }

  /** Получить путь к звуковому эффекту */
  getSoundPath(soundId) {
    return this.data?.audio?.sounds?.[soundId] ?? null;
  }

  /** Получить id стартовой комнаты */
  get startRoom() {
    return this.settings.startRoom ?? null;
  }
}

// Singleton
export const scenario = new ScenarioLoader();
