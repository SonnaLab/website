import { User } from 'lucide-react';

interface AuthorBioProps {
  name: string;
  bio?: string;
  avatar?: string;
}

export function AuthorBio({ name, bio, avatar }: AuthorBioProps) {
  return (
    <div 
      className="bg-gray-50 rounded-2xl p-6 border border-gray-200"
      itemScope
      itemType="https://schema.org/Person"
    >
      <div className="flex items-start gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-16 h-16 rounded-full object-cover"
            itemProp="image"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-8 h-8 text-gray-500" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2" itemProp="name">
            À propos de {name}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed" itemProp="description">
            {bio || `${name} est un expert en technologie et innovation digitale chez SonnaLab.`}
          </p>
          <meta itemProp="jobTitle" content="Expert SonnaLab" />
          <meta itemProp="worksFor" content="SonnaLab" />
        </div>
      </div>
    </div>
  );
}