import type { AuthSession, Measurement, MeasurementInput, Player, TrainingSession } from '../types';
import type { DataService } from './DataService';
import { DataServiceError } from './DataService';

type ApiResponse<T> = { ok: boolean; data?: T; error?: string; code?: string };

export class GoogleSheetsDataService implements DataService {
  constructor(private readonly endpoint: string) {}

  private async request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.endpoint) throw new DataServiceError('Falta configurar la URL de Google Apps Script.', 'CONFIG');
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch {
      throw new DataServiceError('No hay conexión. El formulario sigue guardado en este dispositivo.', 'OFFLINE');
    }
    if (!response.ok) throw new DataServiceError('No se pudo contactar con el servicio de datos.', 'NETWORK');
    const result = (await response.json()) as ApiResponse<T>;
    if (!result.ok || result.data === undefined) throw new DataServiceError(result.error || 'Error de datos.', result.code);
    return result.data;
  }

  authenticate(pin: string) {
    return this.request<AuthSession>('authenticate', { pin });
  }

  async logout(token: string) {
    await this.request<boolean>('logout', { token });
  }

  getPlayers(token: string) {
    return this.request<Player[]>('getPlayers', { token });
  }

  getMeasurements(token: string) {
    return this.request<Measurement[]>('getMeasurements', { token });
  }

  getCurrentSession(token: string) {
    return this.request<TrainingSession>('getCurrentSession', { token });
  }

  saveMeasurement(token: string, input: MeasurementInput, overwrite: boolean) {
    return this.request<Measurement>('saveMeasurement', { token, measurement: input, overwrite });
  }
}
