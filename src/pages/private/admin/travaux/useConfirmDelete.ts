import { useTranslation } from 'react-i18next';

import { useConfirm } from '@/components/common/ConfirmDialog';

/** « Confirmer la suppression ? » in the back-office dialog. */
export function useConfirmDelete() {
  const { t } = useTranslation('admin');
  const confirm = useConfirm();
  return () => confirm({ title: t('travaux.common.confirmDelete'), message: t('travaux.common.confirmDeleteHint') });
}
