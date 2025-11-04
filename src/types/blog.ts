export interface BlogPost {
  id: string;
  slug: string;
  lang: 'fr' | 'en';
  title: string;   
  excerpt: string; 
  content: string; 
  contentFile: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  coverImage: string;
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