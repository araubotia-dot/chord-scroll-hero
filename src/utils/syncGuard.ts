/**
 * SyncGuard - Detecta se o projeto está usando template vazio ou código real
 */

export interface SyncStatus {
  isBlank: boolean;
  issues: string[];
  hasRealProject: boolean;
}

export function checkSyncStatus(): SyncStatus {
  const issues: string[] = [];
  let hasRealProject = true;

  try {
    // Verifica se existem componentes customizados além do boilerplate
    const hasCustomComponents = !!(
      window.location.pathname !== '/' ||
      document.querySelector('[data-component="custom"]') ||
      // Verifica se há conteúdo específico do projeto (não apenas "Welcome")
      document.body.textContent?.includes('CifraSet') ||
      document.body.textContent?.includes('cifra') ||
      document.body.textContent?.includes('repertório')
    );

    // Verifica se package.json tem dependências além do mínimo
    const hasRichDependencies = !!(
      // Supabase indica projeto real
      document.querySelector('script[src*="supabase"]') ||
      // React Router indica estrutura de app
      window.location.hash ||
      // Verifica se há mais de uma rota
      document.querySelectorAll('a[href]').length > 3
    );

    // Verifica se há conteúdo de template vazio
    const hasBlankTemplate = !!(
      document.body.textContent?.includes('Welcome to Your Blank App') ||
      document.body.textContent?.includes('Get started by editing') ||
      document.title === 'Vite + React + TS'
    );

    if (hasBlankTemplate) {
      issues.push('Template vazio detectado');
      hasRealProject = false;
    }

    if (!hasCustomComponents) {
      issues.push('Componentes customizados não encontrados');
      hasRealProject = false;
    }

    if (!hasRichDependencies) {
      issues.push('Estrutura básica de projeto não detectada');
    }

    console.log('[SyncGuard]', {
      hasCustomComponents,
      hasRichDependencies,
      hasBlankTemplate,
      issues,
      hasRealProject
    });

  } catch (error) {
    console.error('[SyncGuard] Erro na verificação:', error);
    issues.push('Erro na verificação de sincronização');
    hasRealProject = false;
  }

  return {
    isBlank: !hasRealProject,
    issues,
    hasRealProject
  };
}

export function getSyncInstructions(): string[] {
  return [
    '1. Acesse Settings → GitHub → Connect to GitHub',
    '2. Clique em "Pull from GitHub"',
    '3. Selecione a branch "main"',
    '4. Confirme "Overwrite current code"',
    '5. Aguarde a sincronização completar'
  ];
}