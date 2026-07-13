import { beforeEach, describe, expect, it } from 'vitest';
import { LocalDataService } from './LocalDataService';

describe('servicio local', () => {
  beforeEach(() => localStorage.clear());
  it('valida el PIN sin almacenarlo', async () => {
    const service = new LocalDataService();
    await expect(service.authenticate('9999')).rejects.toThrow('PIN');
    const session = await service.authenticate('2026');
    expect(session.token).toMatch(/^local-/);
    expect(JSON.stringify(localStorage)).not.toContain('2026');
  });
  it('impide duplicados accidentales y permite sobrescritura explícita', async () => {
    const service = new LocalDataService();
    const auth = await service.authenticate('2026');
    const players = await service.getPlayers(auth.token);
    const session = await service.getCurrentSession(auth.token);
    const input = { playerId: players[0].id, playerName: players[0].name, weight: 72.5, fatigue: 3, soreness: 2, comments: '', sessionId: session.id };
    await service.saveMeasurement(auth.token, input, false);
    await expect(service.saveMeasurement(auth.token, input, false)).rejects.toThrow('existe');
    const updated = await service.saveMeasurement(auth.token, { ...input, fatigue: 5 }, true);
    expect(updated.fatigue).toBe(5);
  });
});
