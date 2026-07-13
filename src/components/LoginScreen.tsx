import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { appConfig, environment } from '../config';
import { Brand } from './Brand';

type LoginScreenProps = {
  onLogin: (pin: string) => Promise<void>;
  loading: boolean;
  error: string;
};

export function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [visible, setVisible] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin.trim() || loading) return;
    await onLogin(pin);
    setPin('');
  };

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-intro__content">
          <p className="eyebrow">Temporada {appConfig.season}</p>
          <Brand light />
          <h1>Más información.<br /><strong>Mejores decisiones.</strong></h1>
          <p className="login-intro__copy">Registro rápido del estado diario de la plantilla antes de cada entrenamiento.</p>
          <div className="login-intro__club">{appConfig.teamName}</div>
        </div>
        <div className="login-grid" aria-hidden="true" />
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-card__icon"><LockKeyhole size={26} aria-hidden="true" /></div>
          <p className="eyebrow eyebrow--dark">Acceso del cuerpo técnico</p>
          <h2 id="login-title">Comenzar recogida</h2>
          <p>Introduce el PIN compartido una vez. La sesión permanecerá abierta durante {appConfig.sessionDurationMinutes} minutos.</p>
          <form onSubmit={submit} noValidate>
            <label htmlFor="staff-pin">PIN del cuerpo técnico</label>
            <div className="pin-field">
              <input
                id="staff-pin"
                data-testid="pin-input"
                type={visible ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 12))}
                aria-describedby={error ? 'login-error' : undefined}
                placeholder="••••"
                autoFocus
              />
              <button type="button" className="icon-button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Ocultar PIN' : 'Mostrar PIN'}>
                {visible ? <EyeOff size={21} /> : <Eye size={21} />}
              </button>
            </div>
            {error && <div id="login-error" className="form-error" role="alert">{error}</div>}
            <button className="button button--primary button--wide" type="submit" disabled={!pin || loading}>
              {loading ? 'Comprobando…' : 'Iniciar sesión'}
            </button>
          </form>
          <div className="security-note"><ShieldCheck size={18} /> El PIN no se guarda en este dispositivo.</div>
          {environment.dataProvider === 'local' && <div className="demo-note">Modo demostración · PIN: <strong>2026</strong></div>}
        </div>
      </section>
    </main>
  );
}
