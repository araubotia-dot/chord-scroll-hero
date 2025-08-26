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
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 rounded-full w-12 h-12 md:w-14 md:h-14
                    flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-white
                    backdrop-blur shadow-lg transition ${canPrev ? '' : 'opacity-40 pointer-events-none'}`}
        onClick={onPrev}
        disabled={!canPrev}
      >
        <ChevronLeft size={28}/>
      </button>

      <button
        aria-label="Próxima música"
        className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 rounded-full w-12 h-12 md:w-14 md:h-14
                    flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-white
                    backdrop-blur shadow-lg transition ${canNext ? '' : 'opacity-40 pointer-events-none'}`}
        onClick={onNext}
        disabled={!canNext}
      >
        <ChevronRight size={28}/>
      </button>
    </>
  );
}