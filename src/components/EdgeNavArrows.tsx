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
      if (e.key === 'ArrowLeft' && canPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === 'ArrowRight' && canNext) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canPrev, canNext, onPrev, onNext]);

  const handlePrevClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canPrev) {
      onPrev();
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canNext) {
      onNext();
    }
  };

  return (
    <>
      {canPrev && (
        <button
          aria-label="Música anterior"
          className="fixed left-2 top-1/2 -translate-y-1/2 z-[9999] rounded-full w-12 h-12 
                     flex items-center justify-center bg-black/60 hover:bg-black/80 text-white
                     backdrop-blur shadow-lg transition-all duration-200 cursor-pointer"
          onClick={handlePrevClick}
          type="button"
        >
          <ChevronLeft size={24}/>
        </button>
      )}

      {canNext && (
        <button
          aria-label="Próxima música"
          className="fixed right-2 top-1/2 -translate-y-1/2 z-[9999] rounded-full w-12 h-12
                     flex items-center justify-center bg-black/60 hover:bg-black/80 text-white
                     backdrop-blur shadow-lg transition-all duration-200 cursor-pointer"
          onClick={handleNextClick}
          type="button"
        >
          <ChevronRight size={24}/>
        </button>
      )}
    </>
  );
}