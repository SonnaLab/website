import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cookie, Settings } from 'lucide-react';
import { Button } from './ui/button';

export function CookieWidget() {
  const { t } = useTranslation('cookies');
  const [showSettings, setShowSettings] = useState(false);

  const openSettings = () => {
    const event = new CustomEvent('open-cookie-settings');
    window.dispatchEvent(event);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={openSettings}
        className="bg-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <Cookie className="w-4 h-4 mr-2" />
        {t('widget.manage')}
      </Button>
    </div>
  );
}