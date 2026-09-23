import { ArrowLeft, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { texts } from '../../texts';
import { IconButton } from './Button';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Shows a back arrow before the title. */
  onBack?: () => void;
  /** Keeps the panel at a fixed tall height so lists do not jump while filtering. */
  tall?: boolean;
}

/**
 * Modal panel built on the native <dialog> element: bottom sheet on phones,
 * centered dialog on wider screens (see components.css). Gives us focus
 * trapping, Escape handling and inert background for free.
 */
export function Sheet({ open, onClose, title, children, footer, onBack, tall = false }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onBackdropClick = (e: SyntheticEvent<HTMLDialogElement, MouseEvent>) => {
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={() => {
        // The native close event also fires when *we* closed the dialog because
        // `open` became false. Only treat it as user-initiated while meant to be open.
        if (openRef.current) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={onBackdropClick}
    >
      {open ? (
        <div className={`sheet__panel${tall ? ' sheet__panel--tall' : ''}`}>
          <div className="sheet__handle" aria-hidden="true" />
          <header className="sheet__header">
            <div className="sheet__header-lead">
              {onBack ? <IconButton label={texts.common.back} icon={<ArrowLeft size={22} />} onClick={onBack} /> : null}
              <h2 className="sheet__title" id={titleId}>
                {title}
              </h2>
            </div>
            <IconButton label={texts.common.close} icon={<X size={22} />} onClick={onClose} />
          </header>
          <div className="sheet__body">{children}</div>
          {footer ? <footer className="sheet__footer">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
