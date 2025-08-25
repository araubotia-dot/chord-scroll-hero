import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PickSetlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mySetlists: any[];
  onConfirm: (selection: { setlistId?: string; createNew?: string }) => void;
}

export function PickSetlistModal({
  open,
  onOpenChange,
  mySetlists,
  onConfirm
}: PickSetlistModalProps) {
  const [selection, setSelection] = useState<'existing' | 'new'>('existing');
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>('');
  const [newSetlistName, setNewSetlistName] = useState<string>('');

  const handleConfirm = () => {
    if (selection === 'existing' && selectedSetlistId) {
      onConfirm({ setlistId: selectedSetlistId });
    } else if (selection === 'new' && newSetlistName.trim()) {
      onConfirm({ createNew: newSetlistName.trim() });
    }
    handleClose();
  };

  const handleClose = () => {
    setSelection('existing');
    setSelectedSetlistId('');
    setNewSetlistName('');
    onOpenChange(false);
  };

  const canConfirm = 
    (selection === 'existing' && selectedSetlistId) ||
    (selection === 'new' && newSetlistName.trim());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar em um repertório</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <RadioGroup
            value={selection}
            onValueChange={(value) => setSelection(value as 'existing' | 'new')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing">Repertório existente</Label>
            </div>
            
            {selection === 'existing' && (
              <div className="ml-6">
                {mySetlists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Você ainda não tem repertórios.
                  </p>
                ) : (
                  <ScrollArea className="h-32 w-full border rounded-md p-2">
                    <RadioGroup
                      value={selectedSetlistId}
                      onValueChange={setSelectedSetlistId}
                    >
                      {mySetlists.map((setlist) => (
                        <div
                          key={setlist.id}
                          className="flex items-center space-x-2 py-1"
                        >
                          <RadioGroupItem value={setlist.id} id={setlist.id} />
                          <Label
                            htmlFor={setlist.id}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {setlist.name}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </ScrollArea>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new">Criar novo repertório</Label>
            </div>
            
            {selection === 'new' && (
              <div className="ml-6">
                <Input
                  placeholder="Nome do novo repertório"
                  value={newSetlistName}
                  onChange={(e) => setNewSetlistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canConfirm) {
                      handleConfirm();
                    }
                  }}
                />
              </div>
            )}
          </RadioGroup>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}