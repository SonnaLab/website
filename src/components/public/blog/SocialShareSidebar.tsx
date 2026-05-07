import { useState } from 'react';
import { 
  Share2, 
  Twitter, 
  Linkedin, 
  Facebook, 
  Mail, 
  Link as LinkIcon,
  Check,
  MessageCircle
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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="text-center mb-6">
        <Share2 className="w-6 h-6 mx-auto text-gray-700 mb-3" />
        <h3 className="text-lg font-bold text-gray-900">Partager</h3>
        <p className="text-xs text-gray-600 mt-1">Partagez cet article</p>
      </div>
      
      <div className="space-y-3">
        {/* Twitter */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('twitter')}
          className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          aria-label="Partager sur Twitter"
        >
          <Twitter className="w-5 h-5" />
          <span className="text-sm font-medium">Twitter</span>
        </Button>

        {/* LinkedIn */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('linkedin')}
          className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
          aria-label="Partager sur LinkedIn"
        >
          <Linkedin className="w-5 h-5" />
          <span className="text-sm font-medium">LinkedIn</span>
        </Button>

        {/* Facebook */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('facebook')}
          className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          aria-label="Partager sur Facebook"
        >
          <Facebook className="w-5 h-5" />
          <span className="text-sm font-medium">Facebook</span>
        </Button>

        {/* WhatsApp */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('whatsapp')}
          className="w-full justify-start gap-3 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all"
          aria-label="Partager sur WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">WhatsApp</span>
        </Button>

        {/* Email */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare('email')}
          className="w-full justify-start gap-3 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all"
          aria-label="Partager par Email"
        >
          <Mail className="w-5 h-5" />
          <span className="text-sm font-medium">Email</span>
        </Button>

        <div className="border-t border-gray-200 my-4"></div>

        {/* Copy Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="w-full justify-start gap-3 hover:bg-gray-50 transition-all"
          aria-label="Copier le lien"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Lien copié !</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Copier le lien</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}