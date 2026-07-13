import { BarChart3, Clock3, LogOut, Users } from 'lucide-react';
import { appConfig } from '../config';
import { formatRemaining } from '../utils/session';
import { Brand } from './Brand';

type HeaderProps = {
  remaining: number;
  view: 'players' | 'technical';
  onViewChange: (view: 'players' | 'technical') => void;
  onLogout: () => void;
};

export function AppHeader({ remaining, view, onViewChange, onLogout }: HeaderProps) {
  return (
    <header className="app-header">
      <Brand compact light />
      <nav className="main-nav" aria-label="Navegación principal">
        <button className={view === 'players' ? 'active' : ''} onClick={() => onViewChange('players')}>
          <Users size={18} /> Jugadores
        </button>
        <button className={view === 'technical' ? 'active' : ''} onClick={() => onViewChange('technical')}>
          <BarChart3 size={18} /> Panel técnico
        </button>
      </nav>
      <div className="header-meta">
        <div className={`session-timer ${remaining < 300 ? 'session-timer--low' : ''}`} title="Tiempo restante de sesión">
          <Clock3 size={17} /> <span>{formatRemaining(remaining)}</span>
        </div>
        <div className="season-label"><span>{appConfig.teamName}</span><strong>{appConfig.season}</strong></div>
        <button className="logout-button" onClick={onLogout}><LogOut size={18} /><span>Cerrar sesión</span></button>
      </div>
    </header>
  );
}
