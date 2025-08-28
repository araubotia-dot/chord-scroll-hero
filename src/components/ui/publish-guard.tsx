import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Github, ExternalLink, Rocket, CheckCircle } from 'lucide-react';
import { checkSyncStatus, getSyncInstructions } from '@/utils/syncGuard';

interface PublishGuardProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
}

export function PublishGuard({ isOpen, onClose, onProceed }: PublishGuardProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const status = checkSyncStatus();
      setSyncStatus(status);
      setAcknowledged(false);
    }
  }, [isOpen]);

  const canProceed = !syncStatus?.isBlank || acknowledged;

  const handleProceed = () => {
    if (canProceed) {
      onProceed();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Publicar Aplicação
          </DialogTitle>
          <DialogDescription>
            Verificação final antes da publicação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {syncStatus?.isBlank ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Atenção:</strong> Template vazio detectado. Você está prestes a publicar um template vazio em vez do seu projeto real.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Tudo certo!</strong> Seu projeto parece estar sincronizado e pronto para publicação.
              </AlertDescription>
            </Alert>
          )}

          {syncStatus?.isBlank && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-800 flex items-center gap-2 text-base">
                  <Github className="h-4 w-4" />
                  Recomendação: Sincronize Primeiro
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Para publicar seu projeto real, sincronize com o GitHub antes de continuar.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  {getSyncInstructions().slice(0, 3).map((step, index) => (
                    <p key={index} className="text-sm text-blue-700 flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      {step}
                    </p>
                  ))}
                </div>
                
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href="https://lovable.dev/settings" target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    Abrir Settings do Lovable
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {syncStatus?.isBlank && (
            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                <label htmlFor="acknowledge" className="text-sm text-orange-800 cursor-pointer">
                  Entendo que estou publicando um template vazio. Quero continuar mesmo assim.
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleProceed}
            disabled={!canProceed}
            className="flex-1"
          >
            {syncStatus?.isBlank ? 'Publicar Assim Mesmo' : 'Publicar Aplicação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}