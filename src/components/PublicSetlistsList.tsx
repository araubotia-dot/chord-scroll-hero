import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    <div className="space-y-3">
      {setlists.map((setlist) => (
        <Card key={setlist.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{setlist.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Criado em {new Date(setlist.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  title="Ver repertório"
                >
                  <Link to={`/show/setlist/${setlist.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                
                {!isOwnProfile && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDuplicate(setlist)}
                    disabled={loadingDuplicate === setlist.id}
                    title="Duplicar"
                  >
                    {loadingDuplicate === setlist.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}