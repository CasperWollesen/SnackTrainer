import { ChevronRight } from 'lucide-react';
import { texts } from '../../texts';
import type { NavLink } from '../components/Nav';
import { Sheet } from '../components/Sheet';

export interface MenuItem extends NavLink {
  hint?: string;
  /** Marks the item for the tab currently shown. */
  current?: boolean;
  /** The item is a tab the desktop sidebar already lists. */
  isTab?: boolean;
}

export interface MenuSheetProps {
  open: boolean;
  items: MenuItem[];
  onClose: () => void;
}

/** The phone "Menu" sheet: everything that does not get its own slot in the tab bar. */
export function MenuSheet({ open, items, onClose }: MenuSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={texts.nav.menu}>
      <nav className="list" aria-label={texts.nav.menu}>
        {items.map(({ id, label, hint, icon: Icon, current, onSelect }) => (
          <button key={id} type="button" className="dayrow menu-item" aria-current={current ? 'page' : undefined} onClick={onSelect}>
            <span className="dayrow__label menu-item__label">
              <Icon size={22} aria-hidden="true" />
              <span className="menu-item__text">
                <span className="dayrow__name">{label}</span>
                {hint ? <span className="dayrow__meta">{hint}</span> : null}
              </span>
            </span>
            <span />
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </nav>
    </Sheet>
  );
}
