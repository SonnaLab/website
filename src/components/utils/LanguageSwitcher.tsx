import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/common/Modal';

const LANGUAGES = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'it', label: 'Italiano' },
    { code: 'de', label: 'Deutsch' },
];

export function LanguageSwitcher() {
    const { i18n, t } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const currentLanguage =
        LANGUAGES.find(lang => lang.code === i18n.language.substring(0, 2)) || LANGUAGES[0];

    const filtered = LANGUAGES.filter(lang =>
        lang.label.toLowerCase().includes(search.toLowerCase()) ||
        lang.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (code: string) => {
        i18n.changeLanguage(code);
        setOpen(false);
        setSearch('');
    };

    const handleClose = () => {
        setOpen(false);
        setSearch('');
    };

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="h-12 px-3 flex items-center gap-2"
                onClick={() => setOpen(true)}
                aria-label={t('language.selectLanguage', 'Select language')}
            >
                <Languages className="h-4 w-4" />
                <span className="text-sm font-medium uppercase">
                    {currentLanguage.label}
                </span>
            </Button>

            <Modal
                open={open}
                onClose={handleClose}
                title={t('language.selectLanguage', 'Select language')}
                size="sm"
                badge={
                    <>
                        <Languages size={13} />
                        <span>{t('language.selectLanguage', 'Select language')}</span>
                    </>
                }
            >
                <div className="lang-switcher-modal">
                    <div className="lang-switcher-modal__search">
                        <Search size={15} />
                        <input
                            type="text"
                            className="lang-switcher-modal__input"
                            placeholder={t('language.search', 'Search...')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <ul className="lang-switcher-modal__list">
                        {filtered.map(lang => (
                            <li key={lang.code}>
                                <button
                                    className={`lang-switcher-modal__item${lang.code === currentLanguage.code ? ' lang-switcher-modal__item--active' : ''}`}
                                    onClick={() => handleSelect(lang.code)}
                                >
                                    <span>{lang.label}</span>
                                    {lang.code === currentLanguage.code && (
                                        <Check size={15} />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </Modal>
        </>
    );
}