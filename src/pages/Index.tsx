import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import CifrasApp from '@/components/CifrasApp';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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

  return <CifrasApp />;
};

export default Index;
