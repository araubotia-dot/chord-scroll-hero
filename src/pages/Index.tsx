import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import CifrasApp from '@/components/CifrasApp';
import { SyncAlert } from '@/components/ui/sync-alert';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showSyncAlert, setShowSyncAlert] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">CifraSet</div>
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {showSyncAlert && (
        <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto max-w-4xl">
            <SyncAlert onDismiss={() => setShowSyncAlert(false)} />
          </div>
        </div>
      )}
      <CifrasApp />
    </>
  );
};

export default Index;
