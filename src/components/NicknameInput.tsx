import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface NicknameInputProps {
  currentNickname?: string;
  onNicknameChange?: (nickname: string, isValid: boolean) => void;
  disabled?: boolean;
}

export function NicknameInput({ currentNickname, onNicknameChange, disabled }: NicknameInputProps) {
  const [nickname, setNickname] = useState(currentNickname || '');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setNickname(currentNickname || '');
  }, [currentNickname]);

  const checkAvailability = async (nick: string) => {
    if (nick === currentNickname || nick.length < 3) {
      setAvailability(null);
      onNicknameChange?.(nick, nick === currentNickname || nick.length === 0);
      return;
    }

    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.rpc('check_nickname_available', { n: nick });
      
      if (error) {
        setAvailability({
          available: false,
          message: 'Erro ao verificar disponibilidade'
        });
        onNicknameChange?.(nick, false);
        return;
      }

      const isValid = data === true;
      setAvailability({
        available: isValid,
        message: isValid 
          ? 'Nickname disponível!' 
          : 'Nickname indisponível ou formato inválido'
      });
      onNicknameChange?.(nick, isValid);
    } catch (error) {
      setAvailability({
        available: false,
        message: 'Erro ao verificar disponibilidade'
      });
      onNicknameChange?.(nick, false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (nickname && nickname !== currentNickname) {
        checkAvailability(nickname);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [nickname, currentNickname]);

  const handleChange = (value: string) => {
    // Remove caracteres não permitidos e converte para lowercase
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    setNickname(cleanValue);
    
    if (cleanValue.length < 3 && cleanValue.length > 0) {
      setAvailability({
        available: false,
        message: 'Mínimo 3 caracteres'
      });
      onNicknameChange?.(cleanValue, false);
    } else if (cleanValue.length === 0) {
      setAvailability(null);
      onNicknameChange?.(cleanValue, true);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (!availability) return null;
    
    return availability.available 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (!availability) return '';
    return availability.available ? 'border-green-500' : 'border-red-500';
  };

  const isCurrentNickname = nickname === currentNickname;
  const canEdit = !currentNickname || currentNickname.startsWith('user');

  return (
    <div className="space-y-2">
      <Label htmlFor="nickname">
        Nickname público
        {!canEdit && (
          <span className="text-xs text-muted-foreground ml-2">
            (Não pode ser alterado)
          </span>
        )}
      </Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          @
        </div>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled || !canEdit}
          className={`pl-8 pr-10 ${getStatusColor()}`}
          placeholder="seunicknome"
          maxLength={20}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>
      {availability && !isCurrentNickname && (
        <p className={`text-xs ${availability.available ? 'text-green-600' : 'text-red-600'}`}>
          {availability.message}
        </p>
      )}
      {isCurrentNickname && currentNickname && (
        <p className="text-xs text-muted-foreground">
          Seu nickname atual
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Use apenas letras, números, pontos, sublinhados e hífens (3-20 caracteres)
      </p>
    </div>
  );
}