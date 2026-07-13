import { appConfig, environment } from '../config';
import { createDemoMeasurements, createTodaySession, demoPlayers } from '../data/demo';
import type { AuthSession, Measurement, MeasurementInput, Player, TrainingSession } from '../types';
import { todayKey } from '../utils/date';
import { sanitizeComment } from '../utils/measurements';
import type { DataService } from './DataService';
import { DataServiceError } from './DataService';

const MEASUREMENTS_KEY = 'zabal-demo-measurements-v1';
const PLAYERS_KEY = 'zabal-demo-players-v1';

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
    localStorage.setItem(key, JSON.stringify(fallback));
  } catch (error) {
    console.warn('No se pudo leer el almacenamiento local.', error);
  }
  return fallback;
};

const requireToken = (token: string) => {
  if (!token.startsWith('local-')) throw new DataServiceError('La sesión ya no es válida.', 'UNAUTHORIZED');
};

export class LocalDataService implements DataService {
  async authenticate(pin: string): Promise<AuthSession> {
    const inputHash = await sha256(pin);
    if (inputHash !== environment.staffPinHash) {
      throw new DataServiceError('El PIN no es correcto. Inténtalo de nuevo.', 'INVALID_PIN');
    }
    return {
      token: `local-${crypto.randomUUID()}`,
      expiresAt: Date.now() + appConfig.sessionDurationMinutes * 60 * 1000,
    };
  }

  async logout(): Promise<void> {}

  async getPlayers(token: string): Promise<Player[]> {
    requireToken(token);
    return readJson(PLAYERS_KEY, demoPlayers).filter((player) => player.active).sort((a, b) => a.order - b.order);
  }

  async getMeasurements(token: string): Promise<Measurement[]> {
    requireToken(token);
    return readJson(MEASUREMENTS_KEY, createDemoMeasurements());
  }

  async getCurrentSession(token: string): Promise<TrainingSession> {
    requireToken(token);
    return createTodaySession();
  }

  async saveMeasurement(token: string, input: MeasurementInput, overwrite: boolean): Promise<Measurement> {
    requireToken(token);
    const players = await this.getPlayers(token);
    const player = players.find((item) => item.id === input.playerId);
    if (!player || player.name !== input.playerName) throw new DataServiceError('Jugador no válido.', 'INVALID_PLAYER');
    if (input.weight < 30 || input.weight > 250) throw new DataServiceError('El peso no es válido.', 'VALIDATION');
    if (![input.fatigue, input.soreness].every((value) => Number.isInteger(value) && value >= 1 && value <= 10)) {
      throw new DataServiceError('Los valores deben estar entre 1 y 10.', 'VALIDATION');
    }

    const items = await this.getMeasurements(token);
    const date = todayKey();
    const existingIndex = items.findIndex((item) => item.playerId === input.playerId && item.date === date);
    if (existingIndex >= 0 && !overwrite) throw new DataServiceError('Ya existe una medición de hoy.', 'DUPLICATE');

    const now = new Date();
    const previous = existingIndex >= 0 ? items[existingIndex] : undefined;
    const measurement: Measurement = {
      id: previous?.id || crypto.randomUUID(),
      date,
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      createdAt: previous?.createdAt || now.toISOString(),
      playerId: player.id,
      playerName: player.name,
      weight: Number(input.weight.toFixed(2)),
      fatigue: input.fatigue,
      soreness: input.soreness,
      comments: sanitizeComment(input.comments),
      sessionId: input.sessionId,
      createdBy: 'tablet-vestuario',
      updatedAt: now.toISOString(),
    };

    if (existingIndex >= 0) items[existingIndex] = measurement;
    else items.push(measurement);
    localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(items));
    return measurement;
  }
}
