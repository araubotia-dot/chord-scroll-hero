import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function AutoScrollControls() {
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(50);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load preferences from localStorage
    const savedActive = localStorage.getItem('autoscroll_active');
    const savedSpeed = localStorage.getItem('autoscroll_speed');
    
    if (savedActive === 'true') {
      setIsScrolling(true);
    }
    if (savedSpeed) {
      setSpeed(parseInt(savedSpeed, 10));
    }
  }, []);

  useEffect(() => {
    // Save preferences to localStorage
    localStorage.setItem('autoscroll_active', isScrolling.toString());
    localStorage.setItem('autoscroll_speed', speed.toString());
  }, [isScrolling, speed]);

  useEffect(() => {
    if (isScrolling) {
      const scrollSpeed = 101 - speed; // Invert so higher value = faster
      intervalRef.current = setInterval(() => {
        window.scrollBy({
          top: 1,
          behavior: 'auto'
        });
      }, scrollSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isScrolling, speed]);

  const toggleScroll = () => {
    setIsScrolling(!isScrolling);
  };

  const resetToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[max(12px,env(safe-area-inset-bottom))] w-[92vw] max-w-[720px] z-50">
      <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleScroll}
        >
          {isScrolling ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <div className="flex items-center gap-2 min-w-[100px]">
          <span className="text-xs text-muted-foreground">Vel</span>
          <Slider
            value={[speed]}
            onValueChange={(value) => setSpeed(value[0])}
            min={1}
            max={100}
            step={1}
            className="w-16"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={resetToTop}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        </div>
      </div>
    </div>
  );
}