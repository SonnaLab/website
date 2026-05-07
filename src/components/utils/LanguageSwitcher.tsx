import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
    const { i18n, t } = useTranslation('common');

    const languages = [
        { code: 'fr', label: t('language.fr'), flag: '🇫🇷' },
        { code: 'en', label: t('language.en'), flag: '🇬🇧' },
    ];

    const currentLanguage =
        languages.find(lang => lang.code === i18n.language) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-12 px-3 flex items-center gap-2"
                >
                    <Languages className="h-10 w-10" />
                    <span className="text-sm font-medium uppercase">
                        {currentLanguage.label}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {languages.map(lang => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => i18n.changeLanguage(lang.code)}
                        className="cursor-pointer hover:bg-transparent"
                    >
                        <span className="mr-2">{lang.flag}</span>
                        <span>{lang.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}