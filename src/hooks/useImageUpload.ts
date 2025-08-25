import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (userId: string, imageSource: 'camera' | 'gallery') => {
    try {
      setUploading(true);

      let imageData: string;

      if (Capacitor.isNativePlatform()) {
        // Native platform - use Capacitor Camera
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: true,
          resultType: CameraResultType.Base64,
          source: imageSource === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        });

        if (!image.base64String) {
          throw new Error('Falha ao capturar imagem');
        }

        imageData = image.base64String;
      } else {
        // Web platform - use file input
        return new Promise<string>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          if (imageSource === 'camera') {
            input.capture = 'environment';
          }

          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              reject(new Error('Nenhum arquivo selecionado'));
              return;
            }

            try {
              const reader = new FileReader();
              reader.onload = async () => {
                const base64 = reader.result as string;
                const base64Data = base64.split(',')[1];
                
                const fileName = `${userId}/${Date.now()}.jpg`;
                const { data, error } = await supabase.storage
                  .from('avatars')
                  .upload(fileName, decode(base64Data), {
                    contentType: 'image/jpeg',
                    upsert: true
                  });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(data.path);

                resolve(publicUrl);
              };
              reader.readAsDataURL(file);
            } catch (error) {
              reject(error);
            }
          };

          input.click();
        });
      }

      // Upload to Supabase Storage
      const fileName = `${userId}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(imageData), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      toast({
        title: "Sucesso",
        description: "Foto do avatar atualizada com sucesso!"
      });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem. Tente novamente.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading };
}

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}