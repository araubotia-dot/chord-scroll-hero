import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PDFUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  onRemove?: () => void;
}

export default function PDFUpload({ onUpload, currentUrl, onRemove }: PDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo PDF deve ter no máximo 20MB.",
        variant: "destructive"
      });
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast({
        title: "Erro de autenticação",
        description: "Faça login para fazer upload de arquivos.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      // Generate unique filename
      const fileExtension = 'pdf';
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('sheet-pdfs')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sheet-pdfs')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      
      toast({
        title: "Upload concluído!",
        description: "Arquivo PDF carregado com sucesso."
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload do arquivo.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  if (currentUrl) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Arquivo PDF carregado</p>
                <p className="text-sm text-muted-foreground">
                  PDF pronto para visualização
                </p>
              </div>
            </div>
            {onRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
              >
                <X className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`transition-colors ${
        dragOver ? 'border-blue-500 bg-blue-50/50' : 'border-dashed'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="p-8">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {uploading ? 'Fazendo upload...' : 'Carregar arquivo PDF'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Arraste e solte um arquivo PDF aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Máximo 20MB • Apenas arquivos .pdf
          </p>
          
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="pdf-upload"
          />
          
          <Button
            asChild
            disabled={uploading}
            variant="outline"
          >
            <label htmlFor="pdf-upload" className="cursor-pointer">
              {uploading ? 'Carregando...' : 'Selecionar arquivo'}
            </label>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}