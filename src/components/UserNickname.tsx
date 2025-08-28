import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserNicknameProps {
  userId: string;
  className?: string;
  showAt?: boolean;
  fallbackName?: string;
}

export function UserNickname({ userId, className = "", showAt = true, fallbackName }: UserNicknameProps) {
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNickname();
  }, [userId]);

  const fetchNickname = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, name')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching nickname:', error);
        setNickname(fallbackName || null);
      } else if (data?.nickname) {
        setNickname(data.nickname);
      } else {
        // Se não tem nickname, usar o nome ou fallback
        setNickname(data?.name || fallbackName || null);
      }
    } catch (error) {
      console.error('Error fetching nickname:', error);
      setNickname(fallbackName || null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <span className={`text-muted-foreground ${className}`}>...</span>;
  }

  if (!nickname) {
    return <span className={`text-muted-foreground ${className}`}>Usuário</span>;
  }

  return (
    <span className={className}>
      {showAt ? '@' : ''}{nickname}
    </span>
  );
}