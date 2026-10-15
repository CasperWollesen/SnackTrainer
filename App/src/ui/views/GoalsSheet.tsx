import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { goalProgress, goalStreak } from '../../domain/goals';
import type { AppData, Goal, ISODate } from '../../domain/types';
import { texts } from '../../texts';
import { Button } from '../components/Button';
import { GoalList } from '../components/GoalList';
import { Sheet } from '../components/Sheet';

export interface GoalsSheetProps {
  open: boolean;
  data: AppData;
  today: ISODate;
  onClose: () => void;
  /** Opens the editor for a goal, or for a new one (null). */
  onEdit: (goal: Goal | null) => void;
}

/** Every goal with today's (or this week's) progress and streak; tap to edit, Add goal in the footer. */
export function GoalsSheet({ open, data, today, onClose, onEdit }: GoalsSheetProps) {
  const progress = useMemo(() => (open ? goalProgress(data, today) : []), [open, data, today]);
  const streaks = useMemo(
    () => new Map(open ? data.settings.goals.map((g) => [g.id, goalStreak(data, g, today)]) : []),
    [open, data, today],
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={texts.goals.title}
      footer={
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => onEdit(null)}>
          {texts.goals.add}
        </Button>
      }
    >
      <p className="settings-group__text">{texts.goals.intro}</p>
      {progress.length === 0 ? (
        <p className="field__hint">{texts.goals.empty}</p>
      ) : (
        <GoalList progress={progress} data={data} streaks={streaks} onSelect={onEdit} />
      )}
      {progress.some((p) => p.pace !== undefined) ? <p className="field__hint">{texts.goals.paceHint}</p> : null}
    </Sheet>
  );
}
