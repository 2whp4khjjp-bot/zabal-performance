import { appConfig } from '../config';
import type { AlertLevel, Measurement } from '../types';

export const parseWeight = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  const weight = Number(normalized);
  return weight >= 30 && weight <= 250 ? weight : null;
};

export const getAlertLevel = (measurement?: Measurement): AlertLevel => {
  if (!measurement) return 'pending';
  const max = Math.max(measurement.fatigue, measurement.soreness);
  if (max >= appConfig.thresholds.alertFrom) return 'alert';
  if (max >= appConfig.thresholds.moderateFrom) return 'moderate';
  return 'normal';
};

export const alertLabel: Record<AlertLevel, string> = {
  pending: 'Pendiente',
  normal: 'Sin alerta',
  moderate: 'Atención',
  alert: 'Alerta',
};

export const recentForPlayer = (measurements: Measurement[], playerId: string, limit = 10) =>
  measurements
    .filter((item) => item.playerId === playerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .reverse();

export const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const weightChange = (history: Measurement[]) => {
  if (history.length < 2) return 0;
  return Number((history[history.length - 1].weight - history[history.length - 2].weight).toFixed(1));
};

export const sanitizeComment = (value: string) =>
  value.replace(/[<>]/g, '').replace(/\s{3,}/g, '  ').trim().slice(0, 500);
