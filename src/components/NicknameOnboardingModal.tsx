import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface NicknameOnboardingModalProps {
  isOpen: boolean
  onComplete: (nickname: string) => void
}

export function NicknameOnboardingModal({ isOpen, onComplete }: NicknameOnboardingModalProps) {
  const [nickname, setNickname] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const { toast } = useToast()

  const nicknameRegex = /^[a-z0-9._-]{3,20}$/

  useEffect(() => {
    const checkNickname = async () => {
      if (!nickname) {
        setIsValid(false)
        setIsAvailable(null)
        setValidationMessage('')
        return
      }

      const normalizedNickname = nickname.toLowerCase().trim()
      
      // Check format
      if (!nicknameRegex.test(normalizedNickname)) {
        setIsValid(false)
        setIsAvailable(null)
        setValidationMessage('Use apenas letras minúsculas, números, pontos, sublinhados e hífens (3-20 caracteres)')
        return
      }

      setIsChecking(true)
      
      try {
        const { data, error } = await supabase.rpc('check_nickname_available', { n: normalizedNickname })
        
        if (error) {
          console.error('Error checking nickname:', error)
          setValidationMessage('Erro ao verificar disponibilidade')
          setIsValid(false)
          setIsAvailable(null)
        } else {
          setIsAvailable(data)
          setIsValid(data)
          setValidationMessage(data ? 'Nickname disponível!' : 'Este nickname já está em uso')
        }
      } catch (error) {
        console.error('Error checking nickname:', error)
        setValidationMessage('Erro ao verificar disponibilidade')
        setIsValid(false)
        setIsAvailable(null)
      } finally {
        setIsChecking(false)
      }
    }

    const timeoutId = setTimeout(checkNickname, 300) // 300ms debounce
    return () => clearTimeout(timeoutId)
  }, [nickname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValid || !isAvailable) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase.rpc('set_nickname', { n: nickname.toLowerCase().trim() })
      
      if (error) {
        console.error('Error setting nickname:', error)
        toast({
          title: "Erro",
          description: "Erro ao definir nickname. Tente novamente.",
          variant: "destructive"
        })
        return
      }

          if ((data as any).success) {
        toast({
          title: "Sucesso!",
          description: `Seu nickname @${(data as any).nickname} foi definido com sucesso.`
        })
        onComplete((data as any).nickname)
      } else {
        toast({
          title: "Erro",
          description: (data as any).error || "Erro ao definir nickname",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error setting nickname:', error)
      toast({
        title: "Erro",
        description: "Erro ao definir nickname. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Defina seu @nickname</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha um nickname único para ser identificado no app. Ele não poderá ser alterado depois.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="meu_nickname"
                  className="pl-8"
                  disabled={isSubmitting}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isChecking && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                  {!isChecking && isAvailable === true && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {!isChecking && isAvailable === false && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
              {validationMessage && (
                <p className={`text-xs ${isAvailable ? 'text-green-600' : 'text-destructive'}`}>
                  {validationMessage}
                </p>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Sair
              </Button>
              <Button
                type="submit"
                disabled={!isValid || !isAvailable || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                ) : null}
                Confirmar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}