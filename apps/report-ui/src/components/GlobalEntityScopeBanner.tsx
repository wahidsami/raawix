import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

export default function GlobalEntityScopeBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
      <p className="text-muted-foreground">{t('globalLists.entityScopeHint')}</p>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to="/entities"
          className="font-medium text-primary hover:underline"
        >
          {t('globalLists.goToEntities')}
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t('globalLists.dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
