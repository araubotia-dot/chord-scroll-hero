import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Instagram, Music } from 'lucide-react';

interface PublicProfileHeaderProps {
  profile: {
    id: string;
    name: string;
    avatar_url?: string;
    description?: string;
    instagram?: string;
    tiktok?: string;
    current_band?: string;
    instruments?: string[];
  };
}

export function PublicProfileHeader({ profile }: PublicProfileHeaderProps) {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <Avatar className="h-24 w-24 mx-auto md:mx-0">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-2xl">
            {profile.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          
          {profile.current_band && (
            <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg text-muted-foreground">{profile.current_band}</span>
            </div>
          )}
          
          {profile.description && (
            <p className="mt-3 text-muted-foreground">{profile.description}</p>
          )}
          
          {profile.instruments && profile.instruments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              {profile.instruments.map((instrument, index) => (
                <Badge key={index} variant="secondary">
                  {instrument}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="mt-4 flex gap-3 justify-center md:justify-start">
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            )}
            
            {profile.tiktok && (
              <a
                href={`https://tiktok.com/@${profile.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.16 20.5a6.34 6.34 0 0 0 10.86-4.43V7.83a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.26z"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}