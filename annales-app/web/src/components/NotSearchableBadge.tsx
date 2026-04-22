import { useTranslation } from 'react-i18next';
import { FileWarning } from 'lucide-react';

interface NotSearchableBadgeProps {
  className?: string;
}

/**
 * Compact icon-only indicator that a PDF is not searchable (scanned
 * document). Uses a title attribute for hover tooltip; a text legend
 * elsewhere on the page explains the symbol.
 */
export default function NotSearchableBadge({ className }: NotSearchableBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      title={t('search.not_searchable_title')}
      aria-label={t('search.not_searchable_title')}
      className={
        'inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-700 ' +
        (className ?? '')
      }
    >
      <FileWarning className="w-3.5 h-3.5" />
    </span>
  );
}
