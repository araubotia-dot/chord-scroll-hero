import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Github, ExternalLink, Activity, X } from 'lucide-react';
import { checkSyncStatus, getSyncInstructions } from '@/utils/syncGuard';
import { Link } from 'react-router-dom';

interface SyncAlertProps {
  onDismiss?: () => void;
}

export function SyncAlert({ onDismiss }: SyncAlertProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const status = checkSyncStatus();
    setSyncStatus(status);

    // Auto-dismiss se o projeto não estiver em branco
    if (!status.isBlank) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!syncStatus?.isBlank || isDismissed) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <Github className="h-4 w-4" />
                Sincronização Necessária
              </CardTitle>
              <CardDescription className="text-amber-700">
                Seu projeto parece estar usando o template vazio. Sincronize com o GitHub para obter o código real.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-amber-600 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {syncStatus.issues.length > 0 && (
          <div className="mb-4 p-3 bg-amber-100 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-2">Problemas detectados:</p>
            <ul className="text-sm text-amber-700 space-y-1">
              {syncStatus.issues.map((issue: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-600 rounded-full"></span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
                <Github className="h-4 w-4 mr-2" />
                Como Sincronizar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Sincronizar com GitHub
                </DialogTitle>
                <DialogDescription>
                  Siga estes passos para sincronizar seu código do GitHub para o Lovable:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {getSyncInstructions().map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-4">
                <Button asChild className="flex-1">
                  <a href="https://lovable.dev/settings" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Settings
                  </a>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button asChild variant="outline">
            <Link to="/health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Ver Health Check
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}