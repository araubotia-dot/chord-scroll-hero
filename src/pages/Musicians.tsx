import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Instagram } from "lucide-react";
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

      // Simply map profiles to musicians data without ranking
      const musiciansData: MusicianProfile[] = profiles?.map(profile => ({
        ...profile
      })) || [];

      console.log("✅ Lista de músicos carregada:", musiciansData.length);
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
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {musician.description}
                        </p>
                      )}
                      
                      {musician.instruments && musician.instruments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {musician.instruments.slice(0, 6).map((instrument, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {instrument}
                            </Badge>
                          ))}
                          {musician.instruments.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{musician.instruments.length - 6}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Redes Sociais */}  
                  <div className="flex items-center gap-2 flex-shrink-0">
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