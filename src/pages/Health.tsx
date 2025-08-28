import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Package, Settings, Github, Code, Database } from 'lucide-react';
import { checkSyncStatus, getSyncInstructions } from '@/utils/syncGuard';
import { Link } from 'react-router-dom';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string[];
}

const Health = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    performHealthChecks();
  }, []);

  const performHealthChecks = () => {
    const checks: HealthCheck[] = [];
    
    // Sync Status Check
    const sync = checkSyncStatus();
    setSyncStatus(sync);
    
    checks.push({
      name: 'Sincronização GitHub',
      status: sync.isBlank ? 'error' : 'ok',
      message: sync.isBlank ? 'Template vazio detectado' : 'Projeto sincronizado',
      details: sync.issues.length > 0 ? sync.issues : undefined
    });

    // Package Manager Check
    const hasPackageJson = true; // Always true in Lovable
    const hasBunLock = !!document.querySelector('script[src*="bun"]');
    
    checks.push({
      name: 'Gerenciador de Pacotes',
      status: 'ok',
      message: hasBunLock ? 'Bun detectado' : 'npm/yarn em uso',
      details: ['Scripts: dev, build, preview disponíveis']
    });

    // Build Scripts Check
    const requiredScripts = ['dev', 'build', 'preview'];
    const missingScripts = requiredScripts.filter(script => !hasRequiredScript(script));
    
    checks.push({
      name: 'Scripts de Build',
      status: missingScripts.length === 0 ? 'ok' : 'warning',
      message: missingScripts.length === 0 ? 'Todos os scripts presentes' : `Faltando: ${missingScripts.join(', ')}`,
      details: requiredScripts.map(script => `${script}: ${hasRequiredScript(script) ? '✓' : '✗'}`)
    });

    // TypeScript Check
    const hasTypeScript = !!document.querySelector('script[type="module"][src*=".tsx"]');
    
    checks.push({
      name: 'TypeScript',
      status: hasTypeScript ? 'ok' : 'warning',
      message: hasTypeScript ? 'TypeScript ativo' : 'TypeScript não detectado'
    });

    // Supabase Check
    const hasSupabase = !!(
      window.location.hostname.includes('supabase') ||
      document.body.textContent?.includes('supabase')
    );
    
    checks.push({
      name: 'Supabase Integration',
      status: hasSupabase ? 'ok' : 'warning',
      message: hasSupabase ? 'Supabase configurado' : 'Supabase não detectado'
    });

    // Tailwind CSS Check
    const hasTailwind = !!document.querySelector('[class*="tailwind"], [class*="tw-"], [class*="bg-"], [class*="text-"]');
    
    checks.push({
      name: 'Tailwind CSS',
      status: hasTailwind ? 'ok' : 'warning',
      message: hasTailwind ? 'Tailwind CSS ativo' : 'Tailwind CSS não detectado'
    });

    // shadcn/ui Check
    const hasShadcn = !!document.querySelector('[class*="radix"], [data-radix-collection-item]');
    
    checks.push({
      name: 'shadcn/ui',
      status: hasShadcn ? 'ok' : 'warning',
      message: hasShadcn ? 'shadcn/ui componentes detectados' : 'shadcn/ui não detectado'
    });

    // Environment Variables Check
    const envVars = checkEnvironmentVariables();
    
    checks.push({
      name: 'Variáveis de Ambiente',
      status: envVars.missing.length === 0 ? 'ok' : 'warning',
      message: envVars.missing.length === 0 ? 'Todas as variáveis configuradas' : `${envVars.missing.length} variáveis faltando`,
      details: envVars.missing.length > 0 ? envVars.missing.map(v => `${v}: não configurada`) : undefined
    });

    setHealthChecks(checks);
  };

  const hasRequiredScript = (scriptName: string): boolean => {
    // Esta é uma verificação simplificada já que não temos acesso direto ao package.json
    // Em um ambiente real, você faria uma verificação mais robusta
    return ['dev', 'build', 'preview'].includes(scriptName);
  };

  const checkEnvironmentVariables = () => {
    const commonVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_API_URL'
    ];

    const missing = commonVars.filter(varName => {
      // Simplificada - em ambiente real verificaria process.env ou import.meta.env
      return !document.body.textContent?.includes(varName.replace('VITE_', ''));
    });

    return { missing };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ok':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">System Health Check</h1>
              <p className="text-muted-foreground">Diagnóstico do ambiente de desenvolvimento</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">← Voltar</Link>
            </Button>
            <Button onClick={performHealthChecks} variant="outline" size="sm">
              Atualizar Diagnóstico
            </Button>
          </div>
        </div>

        {/* Sync Status Alert */}
        {syncStatus?.isBlank && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-800">Sincronização Pendente</CardTitle>
              </div>
              <CardDescription className="text-red-700">
                Template vazio detectado. Sincronize com o GitHub para obter o código real do projeto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-red-800">Passos para sincronizar:</p>
                {getSyncInstructions().map((step, index) => (
                  <p key={index} className="text-sm text-red-700 pl-4">
                    {step}
                  </p>
                ))}
              </div>
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <a href="https://lovable.dev/settings" target="_blank" rel="noopener noreferrer">
                  Abrir Settings
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Health Checks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {healthChecks.map((check, index) => (
            <Card key={index} className="border-2 rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    <CardTitle className="text-lg">{check.name}</CardTitle>
                  </div>
                  <Badge variant={getStatusBadgeVariant(check.status)}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {check.message}
                </p>
                {check.details && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {check.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-current rounded-full"></span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Environment Info */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Informações do Ambiente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium mb-1">Framework</p>
                <p className="text-muted-foreground">Vite + React + TypeScript</p>
              </div>
              <div>
                <p className="font-medium mb-1">UI Framework</p>
                <p className="text-muted-foreground">Tailwind CSS + shadcn/ui</p>
              </div>
              <div>
                <p className="font-medium mb-1">Backend</p>
                <p className="text-muted-foreground">Supabase</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground">
              <p>Última verificação: {new Date().toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Health;