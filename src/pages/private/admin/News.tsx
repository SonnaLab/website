import { useTranslation } from 'react-i18next';
import { NewsIcon } from '@icons';

export default function AdminNews() {
  const { t } = useTranslation('admin');

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <NewsIcon size={22} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            {t('news.title')}
          </h1>
        </div>
        <p style={{ color: '#6b7280', margin: 0 }}>{t('news.subtitle')}</p>
      </header>

      <div style={{
        background: '#fff',
        border: '1px solid #e8eaed',
        borderRadius: '8px',
        padding: '48px 32px',
        textAlign: 'center',
        color: '#9ca3af',
      }}>
        <NewsIcon size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
        <p style={{ margin: 0, fontSize: '14px' }}>{t('news.empty')}</p>
      </div>
    </div>
  );
}
