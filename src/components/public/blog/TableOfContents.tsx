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
        <nav className="blog-toc-card" aria-label={title}>
            <div className="blog-toc-card__header">
                <div className="blog-toc-card__title">
                    <BookOpen aria-hidden="true" />
                    <h3>{title}</h3>
                </div>
                <button
                    className="blog-toc-card__toggle lg:hidden"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle table of contents"
                    aria-expanded={isOpen}
                >
                    <ChevronDown className={isOpen ? 'rotate-180' : ''} />
                </button>
            </div>

            <div className={`${isOpen ? 'block' : 'hidden'} lg:block blog-toc-card__body`}>
                <ul className="blog-toc-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <a
                                href={`#${item.id}`}
                                aria-current={activeId === item.id ? 'true' : undefined}
                                className={`blog-toc-link ${
                                    activeId === item.id
                                        ? 'blog-toc-link--active'
                                        : ''
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
