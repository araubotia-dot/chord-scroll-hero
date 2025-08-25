import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';

interface PublicSetlistsListProps {
  setlists: any[];
  isOwnProfile: boolean;
  onDuplicateSetlist: (setlist: any) => Promise<void>;
}

export function PublicSetlistsList({ 
  setlists, 
  isOwnProfile, 
  onDuplicateSetlist 
}: PublicSetlistsListProps) {
  const [loadingDuplicate, setLoadingDuplicate] = useState<string | null>(null);

  const handleDuplicate = async (setlist: any) => {
    setLoadingDuplicate(setlist.id);
    try {
      await onDuplicateSetlist(setlist);
    } finally {
      setLoadingDuplicate(null);
    }
  };

  if (setlists.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum repertório encontrado.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {setlists.map((setlist) => (
        <Card key={setlist.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{setlist.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Criado em {new Date(setlist.created_at).toLocaleDateString('pt-BR')}
            </p>
          </CardHeader>
          
          {!isOwnProfile && (
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDuplicate(setlist)}
                disabled={loadingDuplicate === setlist.id}
                className="w-full"
              >
                {loadingDuplicate === setlist.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Salvar repertório na minha conta
              </Button>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}