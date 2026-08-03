import { BarChart3, Clock3, LogOut, Users } from 'lucide-react';
import { appConfig } from '../config';
import type { AuthRole } from '../types';
import { formatRemaining } from '../utils/session';
import { Brand } from './Brand';

type HeaderProps = {
  remaining: number;
  view: 'players' | 'technical';
  onViewChange: (view: 'players' | 'technical') => void;
  onLogout: () => void;
  role: AuthRole;
  playerName?: string;
};

export function AppHeader({ remaining, view, onViewChange, onLogout, role, playerName }: HeaderProps) {
  return (
    <header className="app-header">
      <Brand compact light />
      {role === 'staff' ? <nav className="main-nav" aria-label="Navegación principal">
        <button className={view === 'players' ? 'active' : ''} onClick={() => onViewChange('players')}>
          <Users size={18} /> Jugadores
        </button>
        <button className={view === 'technical' ? 'active' : ''} onClick={() => onViewChange('technical')}>
          <BarChart3 size={18} /> Panel técnico
        </button>
      </nav> : <div className="player-session-name">{playerName}</div>}
      <div className="header-meta">
        <div className={`session-timer ${remaining < 300 ? 'session-timer--low' : ''}`} title="Tiempo restante de sesión">
          <Clock3 size={17} /> <span>{formatRemaining(remaining)}</span>
        </div>
        <div className="season-label"><span>{appConfig.teamName}</span><strong>{appConfig.season}</strong></div>
        <button className="logout-button" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={18} /><span>Cerrar sesión</span></button>
      </div>
    </header>
  );
}
