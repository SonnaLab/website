export interface UnsplashCredit {
  provider: 'unsplash';
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  lang: string;
  title: string;   
  excerpt: string; 
  content: string; 
  contentFile?: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  coverImage: string;
  coverImageCredit?: UnsplashCredit | null;
  category: string;
  tags: string[];
  readTime: number;
  relatedPostId?: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}