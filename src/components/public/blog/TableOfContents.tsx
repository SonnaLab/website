import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

interface TocItem {
    id: string;
    text: string;
    level: number;
}

interface TableOfContentsProps {
    items: TocItem[];
    title?: string;
}

export function TableOfContents({ items, title = "Table des matières" }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-80px 0px -80% 0px' }
        );

        items.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [items]);

    if (items.length === 0) return null;

    return (
        <nav className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header commun */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b lg:border-b-0 border-gray-200">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                </div>
                <button
                    className="lg:hidden"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle table of contents"
                >
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Liste */}
            <div className={`${isOpen ? 'block' : 'hidden'} lg:block p-4 lg:p-6 lg:pt-4`}>
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li key={item.id} className={`${item.level === 3 ? 'ml-4' : ''}`}>
                            <a
                                href={`#${item.id}`}
                                className={`block text-sm py-1.5 px-3 rounded-lg transition-all duration-200 ${
                                    activeId === item.id
                                        ? 'bg-black text-white font-semibold'
                                        : 'text-gray-600 hover:text-black hover:bg-gray-100'
                                }`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(item.id)?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start',
                                    });
                                    setIsOpen(false);
                                }}
                            >
                                {item.text}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}
