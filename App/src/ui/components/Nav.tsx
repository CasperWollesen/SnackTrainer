import { BarChart3, Dumbbell, Menu, Plus, Sun, Zap, type LucideIcon } from 'lucide-react';
import { texts } from '../../texts';

export type Tab = 'today' | 'history' | 'exercises';

/** A destination that is not a tab (Settings, Share, …). */
export interface NavLink {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export interface NavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  onLog: () => void;
  /** Shown at the bottom of the desktop sidebar; phones reach them through the menu sheet. */
  links: NavLink[];
  /** Opens the phone menu sheet (Exercises, Settings, …). */
  onMenu: () => void;
}

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: texts.tabs.today, icon: Sun },
  { id: 'history', label: texts.tabs.history, icon: BarChart3 },
  { id: 'exercises', label: texts.tabs.exercises, icon: Dumbbell },
];

/** Tabs that get their own slot in the phone tab bar; the rest live in the menu sheet. */
const PHONE_TABS: Tab[] = ['today', 'history'];

/**
 * Sidebar on desktop with every destination; on phones a bottom bar with the main tabs and a
 * Menu button (CSS decides which shows). The menu's items are defined in App (MenuSheet).
 */
export function Nav({ active, onChange, onLog, links, onMenu }: NavProps) {
  const inMenu = !PHONE_TABS.includes(active);
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
        {links.map(({ id, label, icon: Icon, onSelect }) => (
          <button key={id} type="button" className="sidebar__item" onClick={onSelect}>
            <Icon size={20} aria-hidden="true" />
            {label}
          </button>
        ))}
      </aside>

      <button type="button" className="fab" onClick={onLog}>
        <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
        {texts.add.log}
      </button>

      <nav className="tabbar" aria-label={texts.nav.mainMenu}>
        <div className="tabbar__inner">
          {TABS.filter((t) => PHONE_TABS.includes(t.id)).map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="tabbar__item" aria-current={active === id ? 'page' : undefined} onClick={() => onChange(id)}>
              <span className="tabbar__icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              {label}
            </button>
          ))}
          <button type="button" className="tabbar__item" aria-current={inMenu ? 'page' : undefined} aria-haspopup="dialog" onClick={onMenu}>
            <span className="tabbar__icon">
              <Menu size={22} aria-hidden="true" />
            </span>
            {texts.nav.menu}
          </button>
        </div>
      </nav>
    </>
  );
}
