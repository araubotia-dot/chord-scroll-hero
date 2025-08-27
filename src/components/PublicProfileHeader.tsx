import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Music, MapPin, Users, Mic } from 'lucide-react';
import { BRAZILIAN_STATES } from '@/lib/brazilian-locations';

interface PublicProfileHeaderProps {
  profile: {
    id: string;
    name: string;
    avatar_url?: string;
    description?: string;
    instagram?: string;
    tiktok?: string;
    current_band?: string;
    past_bands?: string[];
    instruments?: string[];
    state?: string;
    city?: string;
  };
}

export function PublicProfileHeader({ profile }: PublicProfileHeaderProps) {
  const getStateName = (stateCode: string) => {
    return BRAZILIAN_STATES[stateCode as keyof typeof BRAZILIAN_STATES]?.name || stateCode;
  };

  return (
    <div className="grid gap-6">
      {/* Header com avatar, nome e banda atual */}
      <Card>
        <CardContent className="p-6">
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
              
              {(profile.state || profile.city) && (
                <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {profile.city && profile.state ? `${profile.city}, ${getStateName(profile.state)}` : 
                     profile.city ? profile.city : 
                     profile.state ? getStateName(profile.state) : ''}
                  </span>
                </div>
              )}
              
              <div className="mt-4 flex gap-3 justify-center md:justify-start">
                {profile.instagram && (
                  <a
                    href={profile.instagram.startsWith('http') ? profile.instagram : `https://instagram.com/${profile.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                
                {profile.tiktok && (
                  <a
                    href={profile.tiktok.startsWith('http') ? profile.tiktok : `https://tiktok.com/@${profile.tiktok.replace('@', '')}`}
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
        </CardContent>
      </Card>

      {/* Grid com informações detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Descrição */}
        {profile.description && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Sobre</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{profile.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Instrumentos */}
        {profile.instruments && profile.instruments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Instrumentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.instruments.map((instrument, index) => (
                  <Badge key={index} variant="secondary">
                    {instrument}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bandas Anteriores */}
        {profile.past_bands && profile.past_bands.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bandas Anteriores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {profile.past_bands.map((band, index) => (
                  <div key={index} className="text-muted-foreground">
                    • {band}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}