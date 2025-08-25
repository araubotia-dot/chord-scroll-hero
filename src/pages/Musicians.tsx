import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Music, List, User, Instagram, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MusicianProfile {
  id: string;
  name: string;
  avatar_url?: string;
  description?: string;
  current_band?: string;
  instruments?: string[];
  instagram?: string;
  tiktok?: string;
  songs_count: number;
  setlists_count: number;
  total_score: number;
  position: number;
  recent_songs: {
    id: string;
    title: string;
    artist?: string;
  }[];
  recent_setlists: {
    id: string;
    name: string;
  }[];
}

export default function Musicians() {
  const [musicians, setMusicians] = useState<MusicianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMusicians();
  }, []);

  const fetchMusicians = async () => {
    try {
      console.log("🔍 Iniciando busca de músicos...");
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, description, current_band, instruments, instagram, tiktok");

      if (profilesError) {
        console.error("❌ Erro ao buscar perfis:", profilesError);
        throw profilesError;
      }
      
      console.log("✅ Perfis encontrados:", profiles?.length);

      // Get all songs and setlists in parallel
      console.log("🔍 Buscando músicas e repertórios...");
      const [songsResponse, setlistsResponse] = await Promise.all([
        supabase.from("songs").select("id, title, artist, user_id, created_at"),
        supabase.from("setlists").select("id, name, user_id, created_at")
      ]);

      if (songsResponse.error) {
        console.error("❌ Erro ao buscar músicas:", songsResponse.error);
      } else {
        console.log("✅ Músicas encontradas:", songsResponse.data?.length);
        console.log("📊 Detalhes das músicas:", songsResponse.data);
      }
      
      if (setlistsResponse.error) {
        console.error("❌ Erro ao buscar repertórios:", setlistsResponse.error);
      } else {
        console.log("✅ Repertórios encontrados:", setlistsResponse.data?.length);
        console.log("📊 Detalhes dos repertórios:", setlistsResponse.data);
      }

      const allSongs = songsResponse.data || [];
      const allSetlists = setlistsResponse.data || [];

      // Process musicians data
      const musiciansData: MusicianProfile[] = [];

      for (const profile of profiles || []) {
        // Filter songs and setlists for this user
        const userSongs = allSongs.filter(song => song.user_id === profile.id);
        const userSetlists = allSetlists.filter(setlist => setlist.user_id === profile.id);

        console.log(`👤 ${profile.name}: ${userSongs.length} músicas, ${userSetlists.length} repertórios`);

        // Get recent items (latest 3)
        const recentSongs = userSongs
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
          .map(song => ({ id: song.id, title: song.title, artist: song.artist }));

        const recentSetlists = userSetlists
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
          .map(setlist => ({ id: setlist.id, name: setlist.name }));

        const totalScore = userSongs.length + userSetlists.length;
        console.log(`🏆 ${profile.name} - Pontuação total: ${totalScore}`);

        musiciansData.push({
          ...profile,
          songs_count: userSongs.length,
          setlists_count: userSetlists.length,
          total_score: totalScore,
          position: 0, // Will be set after sorting
          recent_songs: recentSongs,
          recent_setlists: recentSetlists
        });
      }

      // Sort by total score (descending) and assign positions
      musiciansData.sort((a, b) => b.total_score - a.total_score);
      musiciansData.forEach((musician, index) => {
        musician.position = index + 1;
        console.log(`🥇 Posição ${musician.position}: ${musician.name} (${musician.total_score} pts)`);
      });

      console.log("✅ Ranking final calculado:", musiciansData);
      setMusicians(musiciansData);
    } catch (error) {
      console.error("❌ Erro geral ao carregar músicos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar músicos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando músicos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Músicos</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="space-y-3">
          {musicians.map((musician, index) => {
            const initials = musician.name
              .split(" ")
              .map(n => n[0])
              .join("")
              .toUpperCase();

            return (
              <div key={musician.id} className="bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Ranking Position */}
                  <div className="flex-shrink-0 text-center min-w-[3rem]">
                    <div className={`text-2xl font-bold ${
                      musician.position === 1 ? 'text-yellow-500' :
                      musician.position === 2 ? 'text-gray-400' :
                      musician.position === 3 ? 'text-amber-600' :
                      'text-muted-foreground'
                    }`}>
                      {musician.position}º
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {musician.total_score} pts
                    </div>
                  </div>

                  {/* Avatar e Info Principal */}
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={musician.avatar_url} alt={musician.name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg truncate">{musician.name}</h3>
                        {musician.current_band && (
                          <span className="text-sm text-muted-foreground">• {musician.current_band}</span>
                        )}
                      </div>
                      
                      {musician.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {musician.description}
                        </p>
                      )}
                      
                      {musician.instruments && musician.instruments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {musician.instruments.slice(0, 4).map((instrument, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {instrument}
                            </Badge>
                          ))}
                          {musician.instruments.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{musician.instruments.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas e Redes Sociais */}
                  <div className="flex items-center gap-6 flex-shrink-0">
                    {/* Estatísticas */}
                    <div className="flex items-center gap-4 text-center">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-semibold">{musician.songs_count}</p>
                          <p className="text-xs text-muted-foreground">Músicas</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <List className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-semibold">{musician.setlists_count}</p>
                          <p className="text-xs text-muted-foreground">Repertórios</p>
                        </div>
                      </div>
                    </div>

                    {/* Redes Sociais */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${!musician.instagram ? 'opacity-30 cursor-not-allowed' : ''}`}
                        asChild={!!musician.instagram}
                        disabled={!musician.instagram}
                      >
                        {musician.instagram ? (
                          <a
                            href={musician.instagram.startsWith('http') ? musician.instagram : `https://instagram.com/${musician.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Instagram"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        ) : (
                          <div title="Instagram não cadastrado">
                            <Instagram className="h-4 w-4" />
                          </div>
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${!musician.tiktok ? 'opacity-30 cursor-not-allowed' : ''}`}
                        asChild={!!musician.tiktok}
                        disabled={!musician.tiktok}
                      >
                        {musician.tiktok ? (
                          <a
                            href={musician.tiktok.startsWith('http') ? musician.tiktok : `https://tiktok.com/@${musician.tiktok.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="TikTok"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 0 2.89 2.89 0 0 1 2.31-2.83 2.9 2.9 0 0 1 .58 0V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                          </a>
                        ) : (
                          <div title="TikTok não cadastrado">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 0 2.89 2.89 0 0 1 2.31-2.83 2.9 2.9 0 0 1 .58 0V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Conteúdo Recente */}
                {(musician.recent_songs.length > 0 || musician.recent_setlists.length > 0) && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {musician.recent_songs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
                            <Music className="h-3 w-3" />
                            Músicas Recentes
                          </h4>
                          <div className="space-y-1">
                            {musician.recent_songs.map((song) => (
                              <div key={song.id} className="text-sm truncate">
                                <span className="font-medium">{song.title}</span>
                                {song.artist && <span className="text-muted-foreground ml-1">- {song.artist}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {musician.recent_setlists.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-muted-foreground">
                            <List className="h-3 w-3" />
                            Repertórios Recentes
                          </h4>
                          <div className="space-y-1">
                            {musician.recent_setlists.map((setlist) => (
                              <div key={setlist.id} className="text-sm font-medium truncate">
                                {setlist.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {musicians.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum músico encontrado</h3>
            <p className="text-muted-foreground">
              Parece que ainda não há músicos cadastrados na plataforma.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}