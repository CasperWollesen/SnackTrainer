import { CircleCheck, Download, FlaskConical, Info, Smartphone, Trash, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createBackup, parseBackup, serializeBackup, type BackupError, type BackupSummary } from '../../domain/backup';
import { demoEntryCount } from '../../domain/demo';
import type { AppData } from '../../domain/types';
import { repository } from '../../storage/repository';
import { isStoragePersisted } from '../../storage/storage';
import { APP_NAME, texts } from '../../texts';
import { Button } from '../components/Button';
import { Field, Stepper } from '../components/FormFields';
import { Sheet } from '../components/Sheet';
import { formatDateWithYear, formatTimestamp } from '../format';
import type { InstallState } from '../hooks/useInstallPrompt';
import { useToast } from '../hooks/useToast';

export interface SettingsSheetProps {
  open: boolean;
  data: AppData;
  onClose: () => void;
  install: InstallState;
  /** Adds (true) or removes (false) demo data; the sheet closes so the Undo toast is reachable. */
  onDemo: (on: boolean) => void;
}

type ImportState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; error: BackupError | 'read-failed' }
  | { kind: 'preview'; data: AppData; summary: BackupSummary };

const APP_VERSION: string = __APP_VERSION__;

function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${APP_NAME.toLowerCase()}-backup-${stamp}.json`;
}

export function SettingsSheet({ open, data, onClose, install, onDemo }: SettingsSheetProps) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' });
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) {
      setImportState({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    void isStoragePersisted().then((r) => {
      if (!cancelled) setPersisted(r);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const exportBackup = () => {
    try {
      const now = new Date();
      const json = serializeBackup(createBackup(repository.get(), now));
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName(now);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.show({ message: texts.toast.exported });
    } catch (e) {
      console.error(e);
      toast.show({ message: texts.toast.saveFailed, variant: 'error' });
    }
  };

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setImportState({ kind: 'reading' });
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportState({ kind: 'error', error: 'read-failed' });
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setImportState({ kind: 'error', error: parsed.error });
      return;
    }
    setImportState({ kind: 'preview', data: parsed.data, summary: parsed.summary });
  };

  const confirmImport = () => {
    if (importState.kind !== 'preview') return;
    repository.replaceAll(importState.data);
    setImportState({ kind: 'idle' });
    if (repository.lastSaveFailed) {
      toast.show({ message: texts.toast.saveFailed, variant: 'error' });
      return;
    }
    toast.show({ message: texts.toast.imported });
    onClose();
  };

  const demoCount = demoEntryCount(data);

  const deleteAll = () => {
    if (!window.confirm(texts.settings.danger.confirm)) return;
    repository.clearAll();
    toast.show({ message: texts.toast.allDeleted });
    onClose();
  };

  const installText = install.isStandalone
    ? texts.settings.install.installed
    : install.platform === 'ios'
      ? texts.settings.install.ios
      : install.platform === 'android'
        ? texts.settings.install.android
        : texts.settings.install.desktop;

  return (
    <Sheet open={open} onClose={onClose} title={texts.settings.title}>
      <section className="settings-group">
        <h3 className="settings-group__title">{texts.settings.install.title}</h3>
        <p className="settings-group__text">{texts.settings.install.description}</p>
        <div className="settings-group__status">
          <Smartphone size={18} aria-hidden="true" />
          <span>{installText}</span>
        </div>
        {!install.isStandalone && install.canPrompt ? (
          <div className="settings-group__actions">
            <Button variant="primary" onClick={() => void install.prompt()}>
              {texts.settings.install.button}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">{texts.settings.sessions.title}</h3>
        <p className="settings-group__text">{texts.settings.sessions.description}</p>
        <Field label={texts.settings.sessions.gapLabel}>
          <Stepper
            label={texts.settings.sessions.gapLabel}
            value={data.settings.sessionGapMinutes}
            min={5}
            max={180}
            step={5}
            format={(v) => `${v} ${texts.settings.sessions.gapUnit}`}
            onChange={(sessionGapMinutes) => repository.setSettings({ sessionGapMinutes })}
          />
        </Field>
        <Field label={texts.settings.sessions.timeoutLabel} hint={texts.settings.sessions.timeoutHint}>
          <Stepper
            label={texts.settings.sessions.timeoutLabel}
            value={data.settings.sessionTimeoutMinutes}
            min={1}
            max={30}
            step={1}
            format={(v) => `${v} ${texts.settings.sessions.gapUnit}`}
            onChange={(sessionTimeoutMinutes) => repository.setSettings({ sessionTimeoutMinutes })}
          />
        </Field>
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">{texts.settings.backup.title}</h3>
        <p className="settings-group__text">{texts.settings.backup.description}</p>
        {persisted !== null ? (
          <div className="settings-group__status">
            {persisted ? <CircleCheck size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
            <span>{persisted ? texts.settings.backup.storagePersisted : texts.settings.backup.storageNotPersisted}</span>
          </div>
        ) : null}
        <div className="settings-group__actions">
          <Button onClick={exportBackup} icon={<Download size={18} />}>
            {texts.settings.backup.export}
          </Button>
          <Button onClick={() => fileInput.current?.click()} disabled={importState.kind === 'reading'} icon={<Upload size={18} />}>
            {importState.kind === 'reading' ? texts.settings.backup.importing : texts.settings.backup.import}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            onChange={(e) => {
              void onFileChosen(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {importState.kind === 'error' ? (
          <p className="form-error" role="alert">
            {texts.settings.backup.errors[importState.error]}
          </p>
        ) : null}

        {importState.kind === 'preview' ? (
          <div className="preview" role="group" aria-label={texts.settings.backup.previewTitle}>
            <p className="preview__title">{texts.settings.backup.previewTitle}</p>
            <p className="settings-group__text">{texts.settings.backup.previewBody}</p>
            <ul className="preview__list">
              <li>{texts.settings.backup.previewSessions(importState.summary.sessions)}</li>
              <li>{texts.settings.backup.previewEntries(importState.summary.entries)}</li>
              <li>{texts.settings.backup.previewCustom(importState.summary.customExercises)}</li>
              {importState.summary.firstDate && importState.summary.lastDate ? (
                <li>{texts.settings.backup.previewRange(formatDateWithYear(importState.summary.firstDate), formatDateWithYear(importState.summary.lastDate))}</li>
              ) : null}
              {importState.summary.exportedAt ? <li>{texts.settings.backup.previewExportedAt(formatTimestamp(importState.summary.exportedAt))}</li> : null}
            </ul>
            <div className="settings-group__actions">
              <Button variant="primary" onClick={confirmImport}>
                {texts.settings.backup.confirm}
              </Button>
              <Button variant="ghost" onClick={() => setImportState({ kind: 'idle' })}>
                {texts.settings.backup.cancel}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">{texts.settings.demo.title}</h3>
        <p className="settings-group__text">{texts.settings.demo.description}</p>
        <div className="settings-group__actions">
          <Button icon={<FlaskConical size={18} />} onClick={() => (onClose(), onDemo(true))}>
            {demoCount > 0 ? texts.settings.demo.replace : texts.settings.demo.add}
          </Button>
          {demoCount > 0 ? (
            <Button variant="ghost" icon={<Trash size={18} />} onClick={() => (onClose(), onDemo(false))}>
              {texts.settings.demo.remove(demoCount)}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">{texts.settings.danger.title}</h3>
        <p className="settings-group__text">{texts.settings.danger.description}</p>
        <div className="settings-group__actions">
          <Button variant="danger" onClick={deleteAll} icon={<Trash size={18} />}>
            {texts.settings.danger.button}
          </Button>
        </div>
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">{texts.settings.about.title}</h3>
        <div className="settings-group__status">
          <Info size={18} aria-hidden="true" />
          <span>
            {APP_NAME} · {texts.settings.about.version(APP_VERSION)}
            <br />
            {texts.settings.about.offline}
          </span>
        </div>
      </section>
    </Sheet>
  );
}
