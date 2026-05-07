import { BlogPost } from '@/types/blog';
import frBlogIndex from '@/locales/fr/blog/_index.json';
import enBlogIndex from '@/locales/en/blog/_index.json';

const frMarkdownFiles = import.meta.glob<string>('../locales/fr/blog/*.md', { 
  query: '?raw',
  import: 'default',
  eager: false
});

const enMarkdownFiles = import.meta.glob<string>('../locales/en/blog/*.md', { 
  query: '?raw',
  import: 'default',
  eager: false
});

const metadataCache: Map<string, Omit<BlogPost, 'content'>> = new Map();
const contentCache: Map<string, BlogPost> = new Map();

function initializeMetadata() {
  if (metadataCache.size > 0) return;

  // FR
  for (const meta of frBlogIndex as any[]) {
    metadataCache.set(`${meta.slug}-fr`, { ...meta, lang: 'fr' });
  }

  // EN
  for (const meta of enBlogIndex as any[]) {
    metadataCache.set(`${meta.slug}-en`, { ...meta, lang: 'en' });
  }
}

export function getBlogPostsByLang(lang: 'fr' | 'en'): Omit<BlogPost, 'content'>[] {
  initializeMetadata();
  return Array.from(metadataCache.values())
    .filter(p => p.lang === lang)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getBlogPost(slug: string, lang: 'fr' | 'en'): Promise<BlogPost | undefined> {
  initializeMetadata();
  
  const cacheKey = `${slug}-${lang}`;  
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }

  const metadata = metadataCache.get(cacheKey);
  if (!metadata) return undefined;

  const contentPath = `../locales/${lang}/blog/${metadata.contentFile}`;
  const markdownFiles = lang === 'fr' ? frMarkdownFiles : enMarkdownFiles;
  const contentLoader = markdownFiles[contentPath];

  if (!contentLoader) {
    console.error(`Markdown file not found: ${contentPath}`);
    return undefined;
  }

  try {
    const content = await contentLoader();
    const fullPost: BlogPost = {
      ...metadata,
      content: typeof content === 'string' ? content : String(content)
    };

    contentCache.set(cacheKey, fullPost);
    return fullPost;
  } catch (error) {
    console.error(`Failed to load ${contentPath}:`, error);
    return undefined;
  }
}

export function getBlogPostsByCategory(category: string, lang: 'fr' | 'en'): Omit<BlogPost, 'content'>[] {
  initializeMetadata();
  return Array.from(metadataCache.values())
    .filter(p => p.lang === lang && p.category === category)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getBlogPosts(): Promise<BlogPost[]> {
  initializeMetadata();
  const loadPromises = Array.from(metadataCache.values()).map(meta => getBlogPost(meta.slug, meta.lang));
  return Promise.all(loadPromises).then(posts => posts.filter((p): p is BlogPost => p !== undefined));
}

export function clearBlogCache() {
  metadataCache.clear();
  contentCache.clear();
}