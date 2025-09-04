import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface SongViewSettings {
  semitones: number;
  fontSize: number;
}

const DEFAULT_SETTINGS: SongViewSettings = {
  semitones: 0,
  fontSize: 16
};

export function useSongViewSettings(songId: string) {
  const { user } = useAuth();
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(16);

  // Gerar chave única para as configurações desta música
  const getStorageKey = () => {
    if (!user || !songId) return null;
    return `song_view_settings_${user.id}_${songId}`;
  };

  // Carregar configurações salvas
  useEffect(() => {
    const key = getStorageKey();
    if (!key) return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const settings: SongViewSettings = JSON.parse(saved);
        setSemitones(settings.semitones);
        setFontSize(settings.fontSize);
      } else {
        // Usar configurações padrão
        setSemitones(DEFAULT_SETTINGS.semitones);
        setFontSize(DEFAULT_SETTINGS.fontSize);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de visualização:', error);
      setSemitones(DEFAULT_SETTINGS.semitones);
      setFontSize(DEFAULT_SETTINGS.fontSize);
    }
  }, [user, songId]);

  // Salvar configurações quando mudarem
  const saveSettings = (newSemitones: number, newFontSize: number) => {
    const key = getStorageKey();
    if (!key) return;

    try {
      const settings: SongViewSettings = {
        semitones: newSemitones,
        fontSize: newFontSize
      };
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (error) {
      console.error('Erro ao salvar configurações de visualização:', error);
    }
  };

  // Funções para alterar e salvar automaticamente
  const updateSemitones = (newSemitones: number) => {
    setSemitones(newSemitones);
    saveSettings(newSemitones, fontSize);
  };

  const updateFontSize = (newFontSize: number) => {
    setFontSize(newFontSize);
    saveSettings(semitones, newFontSize);
  };

  return {
    semitones,
    fontSize,
    setSemitones: updateSemitones,
    setFontSize: updateFontSize
  };
}