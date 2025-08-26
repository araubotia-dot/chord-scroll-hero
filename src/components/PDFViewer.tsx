import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  file: string;
  className?: string;
}

export default function PDFViewer({ file, className }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Erro ao carregar o PDF');
    setLoading(false);
    toast({
      title: "Erro ao carregar PDF",
      description: "Não foi possível carregar o arquivo PDF.",
      variant: "destructive"
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando PDF...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-destructive mb-2">Erro ao carregar PDF</p>
            <p className="text-sm text-muted-foreground">
              Verifique se o arquivo PDF está acessível.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando PDF...</p>
              </div>
            </CardContent>
          </Card>
        }
        error={
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <p className="text-destructive mb-2">Erro ao carregar PDF</p>
                <p className="text-sm text-muted-foreground">
                  Verifique se o arquivo PDF está acessível.
                </p>
              </div>
            </CardContent>
          </Card>
        }
      >
        <div className="space-y-4">
          {Array.from(new Array(numPages), (el, index) => (
            <Card key={`page_${index + 1}`} className="overflow-hidden">
              <CardContent className="p-0">
                <Page
                  pageNumber={index + 1}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={Math.min(800, window.innerWidth - 80)}
                  className="max-w-full"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </Document>
    </div>
  );
}