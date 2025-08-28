import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface Profile {
  id: string
  nickname: string | null
  name: string | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  signUp: (email: string, password: string, name: string, nickname: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
  needsNickname: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsNickname, setNeedsNickname] = useState(false)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, name, avatar_url')
        .eq('id', userId)
        .single()
        
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
      setNeedsNickname(profileData?.nickname?.startsWith('user') || !profileData?.nickname)
    }
  }

  useEffect(() => {
    console.log('🔑 AuthProvider - Inicializando...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔑 Auth state change:', { event, hasSession: !!session, hasUser: !!session?.user });
        setSession(session)
        setUser(session?.user ?? null)
        
        // Fetch profile data when user signs in
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(profileData => {
              setProfile(profileData)
              setNeedsNickname(profileData?.nickname?.startsWith('user') || !profileData?.nickname)
              setLoading(false)
            })
          }, 0)
        } else {
          setProfile(null)
          setNeedsNickname(false)
          setLoading(false)
        }
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔑 Get session result:', { hasSession: !!session, hasUser: !!session?.user, error });
      if (error) {
        console.error('❌ Erro ao obter sessão:', error);
      }
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          setProfile(profileData)
          setNeedsNickname(profileData?.nickname?.startsWith('user') || !profileData?.nickname)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string, nickname: string) => {
    const redirectUrl = `${window.location.origin}/`
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name,
          nickname: nickname
        }
      }
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    session,
    profile,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loading,
    needsNickname,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}