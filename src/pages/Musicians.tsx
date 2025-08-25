import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Music, List, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MusicianProfile {
  id: string;
  name: string;
  avatar_url?: string;
  description?: string;
  current_band?: string;
  instruments?: string[];
  songs_count: number;
  setlists_count: number;
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
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, description, current_band, instruments");

      if (profilesError) throw profilesError;

      // Get songs and setlists counts for each musician
      const musiciansData: MusicianProfile[] = [];

      for (const profile of profiles || []) {
        // Get songs count and recent songs
        const { data: songs, error: songsError } = await supabase
          .from("songs")
          .select("id, title, artist")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (songsError) {
          console.error("Error fetching songs:", songsError);
          continue;
        }

        // Get setlists count and recent setlists
        const { data: setlists, error: setlistsError } = await supabase
          .from("setlists")
          .select("id, name")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (setlistsError) {
          console.error("Error fetching setlists:", setlistsError);
          continue;
        }

        // Get total counts
        const { count: songsCount } = await supabase
          .from("songs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id);

        const { count: setlistsCount } = await supabase
          .from("setlists")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id);

        musiciansData.push({
          ...profile,
          songs_count: songsCount || 0,
          setlists_count: setlistsCount || 0,
          recent_songs: songs || [],
          recent_setlists: setlists || []
        });
      }

      setMusicians(musiciansData);
    } catch (error) {
      console.error("Error fetching musicians:", error);
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

                  {/* Estatísticas */}
                  <div className="flex items-center gap-6 text-center flex-shrink-0">
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