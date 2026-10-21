import type { ComponentType } from 'react';
import { CheckCircle2Icon, ClipboardListIcon, ClockIcon, EyeIcon, type IconProps } from '@icons';
import type { KanbanColumn } from '@/types/travaux';

/** A task's column, as an icon on the deliverable's timeline (admin and client space). */
export const COLUMN_ICONS: Record<KanbanColumn, ComponentType<IconProps>> = {
  todo: ClipboardListIcon, in_progress: ClockIcon, review: EyeIcon, done: CheckCircle2Icon,
};
