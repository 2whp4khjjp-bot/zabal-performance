import type { AuthSession, Measurement, MeasurementInput, Player, TrainingSession } from '../types';

export interface DataService {
  authenticate(pin: string): Promise<AuthSession>;
  logout(token: string): Promise<void>;
  getPlayers(token: string): Promise<Player[]>;
  getMeasurements(token: string): Promise<Measurement[]>;
  getCurrentSession(token: string): Promise<TrainingSession>;
  saveMeasurement(token: string, input: MeasurementInput, overwrite: boolean): Promise<Measurement>;
}

export class DataServiceError extends Error {
  constructor(message: string, public code = 'DATA_ERROR') {
    super(message);
  }
}
