import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { NicknameOnboardingModal } from '@/components/NicknameOnboardingModal'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export default function AuthWithNickname() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const { signIn, signUp, signInWithGoogle, user, needsNickname, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const nicknameRegex = /^[a-z0-9._-]{3,20}$/

  // Redirect if already authenticated and doesn't need nickname
  useEffect(() => {
    if (user && !needsNickname) {
      navigate('/')
    }
  }, [user, needsNickname, navigate])

  // Check nickname availability
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    console.log('Tentando fazer login com:', email)
    const { error } = await signIn(email, password)
    console.log('Resultado do login:', { error })
    
    if (error) {
      let errorMessage = error.message
      
      if (error.message === "Invalid login credentials") {
        errorMessage = "Email ou senha incorretos. Você precisa se cadastrar primeiro?"
      } else if (error.message === "Email not confirmed" || error.message.includes("email_not_confirmed")) {
        errorMessage = "Email não confirmado. Verifique sua caixa de entrada e clique no link de confirmação."
      }
      
      toast({
        title: "Erro ao entrar",
        description: errorMessage,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso."
      })
      navigate('/')
    }
    
    setIsLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira seu nome.",
        variant: "destructive"
      })
      return
    }

    if (!isValid || !isAvailable) {
      toast({
        title: "Nickname inválido",
        description: "Por favor, escolha um nickname válido e disponível.",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    const { error } = await signUp(email, password, name, nickname.toLowerCase().trim())
    
    if (error) {
      if (error.message.includes("User already registered")) {
        toast({
          title: "Usuário já existe",
          description: "Este email já está cadastrado. Tente fazer login.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Erro ao cadastrar",
          description: error.message,
          variant: "destructive"
        })
      }
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Sua conta foi criada com sucesso. Você pode fazer login agora."
      })
    }
    
    setIsLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    
    const { error } = await signInWithGoogle()
    
    if (error) {
      toast({
        title: "Erro ao entrar com Google",
        description: error.message,
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  const handleNicknameComplete = (completedNickname: string) => {
    refreshProfile()
    navigate('/')
  }

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">CifraSet</CardTitle>
            <CardDescription>
              Organize e toque suas cifras favoritas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-nickname">Nickname</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <Input
                        id="signup-nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="meu_nickname"
                        className="pl-8"
                        disabled={isLoading}
                        required
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !isValid}>
                    {isLoading ? "Cadastrando..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <NicknameOnboardingModal 
        isOpen={user && needsNickname ? true : false} 
        onComplete={handleNicknameComplete} 
      />
    </>
  )
}