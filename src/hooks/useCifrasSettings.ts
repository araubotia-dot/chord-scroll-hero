import { useState, useEffect } from 'react';

export interface CifrasSettings {
  fontSize: number;
  transpose: number;
  preferFlats: boolean;
  showFontSize: number;
  showSemitones: number;
  scrollSpeed: number;
}

const DEFAULT_SETTINGS: CifrasSettings = {
  fontSize: 16,
  transpose: 0,
  preferFlats: false,
  showFontSize: 16,
  showSemitones: 0,
  scrollSpeed: 2
};

export function useCifrasSettings() {
  const [settings, setSettings] = useState<CifrasSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('cifras_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.log('Erro ao carregar configurações das cifras:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Salvar configurações no localStorage sempre que mudarem
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cifras_settings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Funções para atualizar configurações específicas
  const updateFontSize = (fontSize: number) => {
    setSettings(prev => ({ ...prev, fontSize: Math.max(12, Math.min(24, fontSize)) }));
  };

  const updateTranspose = (transpose: number) => {
    setSettings(prev => ({ ...prev, transpose: Math.max(-12, Math.min(12, transpose)) }));
  };

  const updatePreferFlats = (preferFlats: boolean) => {
    setSettings(prev => ({ ...prev, preferFlats }));
  };

  const updateShowFontSize = (showFontSize: number) => {
    setSettings(prev => ({ ...prev, showFontSize: Math.max(12, Math.min(24, showFontSize)) }));
  };

  const updateShowSemitones = (showSemitones: number) => {
    setSettings(prev => ({ ...prev, showSemitones: Math.max(-12, Math.min(12, showSemitones)) }));
  };

  const updateScrollSpeed = (scrollSpeed: number) => {
    setSettings(prev => ({ ...prev, scrollSpeed: Math.max(1, Math.min(5, scrollSpeed)) }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // Funções de conveniência para incrementar/decrementar
  const incrementFontSize = () => updateFontSize(settings.fontSize + 2);
  const decrementFontSize = () => updateFontSize(settings.fontSize - 2);
  
  const incrementTranspose = () => updateTranspose(settings.transpose + 1);
  const decrementTranspose = () => updateTranspose(settings.transpose - 1);
  
  const incrementShowFontSize = () => updateShowFontSize(settings.showFontSize + 2);
  const decrementShowFontSize = () => updateShowFontSize(settings.showFontSize - 2);
  
  const incrementShowSemitones = () => updateShowSemitones(settings.showSemitones + 1);
  const decrementShowSemitones = () => updateShowSemitones(settings.showSemitones - 1);

  return {
    settings,
    isLoaded,
    updateFontSize,
    updateTranspose,
    updatePreferFlats,
    updateShowFontSize,
    updateShowSemitones,
    updateScrollSpeed,
    resetSettings,
    incrementFontSize,
    decrementFontSize,
    incrementTranspose,
    decrementTranspose,
    incrementShowFontSize,
    decrementShowFontSize,
    incrementShowSemitones,
    decrementShowSemitones
  };
}