import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EdgeNavArrowsProps {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function EdgeNavArrows({
  canPrev, canNext, onPrev, onNext,
}: EdgeNavArrowsProps) {

  // atalhos do teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canPrev) onPrev();
      if (e.key === 'ArrowRight' && canNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canPrev, canNext, onPrev, onNext]);

  return (
    <>
      <button
        aria-label="Música anterior"
        className={`fixed left-2 top-1/2 -translate-y-1/2 z-50 rounded-full w-10 h-10 md:w-12 md:h-12
                    flex items-center justify-center bg-zinc-900/70 hover:bg-zinc-800/80 text-white
                    backdrop-blur shadow-md transition-all duration-200 border border-zinc-700/50
                    ${canPrev ? 'opacity-80 hover:opacity-100' : 'opacity-30 pointer-events-none'}`}
        onClick={onPrev}
        disabled={!canPrev}
      >
        <ChevronLeft size={20}/>
      </button>

      <button
        aria-label="Próxima música"
        className={`fixed right-2 top-1/2 -translate-y-1/2 z-50 rounded-full w-10 h-10 md:w-12 md:h-12
                    flex items-center justify-center bg-zinc-900/70 hover:bg-zinc-800/80 text-white
                    backdrop-blur shadow-md transition-all duration-200 border border-zinc-700/50
                    ${canNext ? 'opacity-80 hover:opacity-100' : 'opacity-30 pointer-events-none'}`}
        onClick={onNext}
        disabled={!canNext}
      >
        <ChevronRight size={20}/>
      </button>
    </>
  );
}