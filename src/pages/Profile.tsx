import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Plus, X, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useImageUpload } from "@/hooks/useImageUpload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  name: string;
  email: string;
  description?: string;
  instagram?: string;
  tiktok?: string;
  current_band?: string;
  past_bands?: string[];
  instruments?: string[];
  avatar_url?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadImage, uploading } = useImageUpload();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    description: "",
    instagram: "",
    tiktok: "",
    current_band: "",
    past_bands: [] as string[],
    instruments: [] as string[],
    avatar_url: ""
  });

  const [newPastBand, setNewPastBand] = useState("");
  const [newInstrument, setNewInstrument] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          description: data.description || "",
          instagram: data.instagram || "",
          tiktok: data.tiktok || "",
          current_band: data.current_band || "",
          past_bands: data.past_bands || [],
          instruments: data.instruments || [],
          avatar_url: data.avatar_url || ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          description: formData.description,
          instagram: formData.instagram,
          tiktok: formData.tiktok,
          current_band: formData.current_band,
          past_bands: formData.past_bands,
          instruments: formData.instruments,
          avatar_url: formData.avatar_url
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
      
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addPastBand = () => {
    if (newPastBand.trim()) {
      setFormData({
        ...formData,
        past_bands: [...formData.past_bands, newPastBand.trim()]
      });
      setNewPastBand("");
    }
  };

  const removePastBand = (index: number) => {
    setFormData({
      ...formData,
      past_bands: formData.past_bands.filter((_, i) => i !== index)
    });
  };

  const addInstrument = () => {
    if (newInstrument.trim()) {
      setFormData({
        ...formData,
        instruments: [...formData.instruments, newInstrument.trim()]
      });
      setNewInstrument("");
    }
  };

  const removeInstrument = (index: number) => {
    setFormData({
      ...formData,
      instruments: formData.instruments.filter((_, i) => i !== index)
    });
  };

  const handleImageUpload = async (source: 'camera' | 'gallery') => {
    if (!user) return;
    
    try {
      const imageUrl = await uploadImage(user.id, source);
      setFormData({ ...formData, avatar_url: imageUrl });
      setShowImageDialog(false);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback>
                    {formData.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowImageDialog(true)}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {uploading ? "Enviando..." : "Alterar Foto"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Conte um pouco sobre você..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Redes Sociais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@seuinstagram"
                  />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={formData.tiktok}
                    onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                    placeholder="@seutiktok"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Musicais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_band">Banda Atual</Label>
                <Input
                  id="current_band"
                  value={formData.current_band}
                  onChange={(e) => setFormData({ ...formData, current_band: e.target.value })}
                  placeholder="Nome da banda atual"
                />
              </div>

              <div>
                <Label>Bandas Anteriores</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newPastBand}
                      onChange={(e) => setNewPastBand(e.target.value)}
                      placeholder="Nome da banda"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPastBand())}
                    />
                    <Button type="button" onClick={addPastBand} variant="outline" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.past_bands.map((band, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        {band}
                        <button
                          type="button"
                          onClick={() => removePastBand(index)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Instrumentos</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newInstrument}
                      onChange={(e) => setNewInstrument(e.target.value)}
                      placeholder="Nome do instrumento"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addInstrument())}
                    />
                    <Button type="button" onClick={addInstrument} variant="outline" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.instruments.map((instrument, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        {instrument}
                        <button
                          type="button"
                          onClick={() => removeInstrument(index)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </main>

      <AlertDialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escolher foto do perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Como você gostaria de adicionar sua foto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleImageUpload('camera')}
              disabled={uploading}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Tirar foto
            </Button>
            <Button
              onClick={() => handleImageUpload('gallery')}
              disabled={uploading}
              variant="outline"
              className="w-full"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Escolher da galeria
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}