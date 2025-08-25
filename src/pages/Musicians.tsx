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

      <main className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {musicians.map((musician) => {
            const initials = musician.name
              .split(" ")
              .map(n => n[0])
              .join("")
              .toUpperCase();

            return (
              <Card key={musician.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={musician.avatar_url} alt={musician.name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{musician.name}</CardTitle>
                      {musician.current_band && (
                        <p className="text-sm text-muted-foreground truncate">
                          {musician.current_band}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {musician.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {musician.description}
                    </p>
                  )}

                  {musician.instruments && musician.instruments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {musician.instruments.slice(0, 3).map((instrument, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {instrument}
                        </Badge>
                      ))}
                      {musician.instruments.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{musician.instruments.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex justify-around text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Music className="h-4 w-4" />
                        <span>Músicas</span>
                      </div>
                      <p className="text-lg font-semibold">{musician.songs_count}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <List className="h-4 w-4" />
                        <span>Repertórios</span>
                      </div>
                      <p className="text-lg font-semibold">{musician.setlists_count}</p>
                    </div>
                  </div>

                  {(musician.recent_songs.length > 0 || musician.recent_setlists.length > 0) && (
                    <>
                      <Separator />
                      
                      {musician.recent_songs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Music className="h-3 w-3" />
                            Músicas Recentes
                          </h4>
                          <div className="space-y-1">
                            {musician.recent_songs.map((song) => (
                              <div key={song.id} className="text-xs text-muted-foreground truncate">
                                {song.title} {song.artist && `- ${song.artist}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {musician.recent_setlists.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <List className="h-3 w-3" />
                            Repertórios Recentes
                          </h4>
                          <div className="space-y-1">
                            {musician.recent_setlists.map((setlist) => (
                              <div key={setlist.id} className="text-xs text-muted-foreground truncate">
                                {setlist.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
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