import { BarChart3, Dumbbell, Plus, Settings, Sun, Zap } from 'lucide-react';
import { texts } from '../../texts';

export type Tab = 'today' | 'history' | 'exercises';

export interface NavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  onLog: () => void;
  onSettings: () => void;
}

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: texts.tabs.today, icon: Sun },
  { id: 'history', label: texts.tabs.history, icon: BarChart3 },
  { id: 'exercises', label: texts.tabs.exercises, icon: Dumbbell },
];

/** Bottom tab bar on phones and sidebar on desktop (CSS decides which shows). */
export function Nav({ active, onChange, onLog, onSettings }: NavProps) {
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">
            <Zap size={22} strokeWidth={2.5} />
          </span>
          <span className="sidebar__name">{texts.app.name}</span>
        </div>
        <nav className="sidebar__nav" aria-label={texts.nav.mainMenu}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="sidebar__item" aria-current={active === id ? 'page' : undefined} onClick={() => onChange(id)}>
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="btn btn--primary btn--block" onClick={onLog}>
          <Plus size={20} aria-hidden="true" />
          {texts.add.log}
        </button>
        <div className="sidebar__spacer" />
        <button type="button" className="sidebar__item" onClick={onSettings}>
          <Settings size={20} aria-hidden="true" />
          {texts.settings.title}
        </button>
      </aside>

      <button type="button" className="fab" onClick={onLog}>
        <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
        {texts.add.log}
      </button>

      <nav className="tabbar" aria-label={texts.nav.mainMenu}>
        <div className="tabbar__inner">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="tabbar__item" aria-current={active === id ? 'page' : undefined} onClick={() => onChange(id)}>
              <span className="tabbar__icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
