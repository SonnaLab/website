import { useState } from 'react';
import { 
  Share2, 
  Twitter, 
  Linkedin, 
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SocialShareSidebarProps {
  url: string;
  title: string;
  excerpt: string;
}

export function SocialShareSidebar({ url, title, excerpt }: SocialShareSidebarProps) {
  const [copied, setCopied] = useState(false);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(excerpt + '\n\n' + url)}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  return (
    <div className="blog-share-card">
      <div className="blog-share-card__header">
        <Share2 aria-hidden="true" />
        <div>
          <h3>Partager</h3>
          <p>Partagez cet article</p>
        </div>
      </div>
      
      <div className="blog-share-card__actions">
        {/* Twitter */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare('twitter')}
          className="blog-share-card__action hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          aria-label="Partager sur Twitter"
          title="Partager sur Twitter"
        >
          <Twitter aria-hidden="true" />
        </Button>

        {/* LinkedIn */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare('linkedin')}
          className="blog-share-card__action hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
          aria-label="Partager sur LinkedIn"
          title="Partager sur LinkedIn"
        >
          <Linkedin aria-hidden="true" />
        </Button>

        {/* Copy Link */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyLink}
          className={`blog-share-card__action ${copied ? 'blog-share-card__action--copied' : ''} hover:bg-gray-50 transition-all`}
          aria-label={copied ? 'Lien copié' : 'Copier le lien'}
          title={copied ? 'Lien copié' : 'Copier le lien'}
        >
          {copied ? (
            <Check aria-hidden="true" />
          ) : (
            <LinkIcon aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}