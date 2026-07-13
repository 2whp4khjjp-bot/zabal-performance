export type Player = {
  id: string;
  name: string;
  number?: number;
  active: boolean;
  order: number;
  joinedAt: string;
};

export type Measurement = {
  id: string;
  date: string;
  time: string;
  createdAt: string;
  playerId: string;
  playerName: string;
  weight: number;
  fatigue: number;
  soreness: number;
  comments: string;
  sessionId: string;
  createdBy: string;
  updatedAt: string;
  pendingSync?: boolean;
};

export type TrainingSession = {
  id: string;
  date: string;
  type: string;
  opponent?: string;
  matchday?: string;
  active: boolean;
  openedAt: string;
  closedAt?: string;
};

export type AlertLevel = 'pending' | 'normal' | 'moderate' | 'alert';

export type AppConfig = {
  teamName: string;
  season: string;
  sessionDurationMinutes: number;
  thresholds: {
    moderateFrom: number;
    alertFrom: number;
    relevantWeightChangeKg: number;
  };
  colors: { navy: string; yellow: string };
  logoSrc: string;
};

export type AuthSession = {
  token: string;
  expiresAt: number;
};

export type DashboardFilter = 'all' | 'pending' | 'registered';

export type MeasurementInput = Pick<Measurement, 'playerId' | 'playerName' | 'weight' | 'fatigue' | 'soreness' | 'comments' | 'sessionId'>;

export type ReportKind = 'daily' | 'weekly' | 'player' | 'alerts';
