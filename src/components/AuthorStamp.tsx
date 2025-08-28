import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'

interface AuthorStampProps {
  readonly?: boolean
  className?: string
}

export function AuthorStamp({ readonly = true, className = "flex items-center gap-2 text-sm" }: AuthorStampProps) {
  const { profile } = useAuth()

  if (!profile?.nickname) {
    return null
  }

  return (
    <div className={className}>
      <span className="text-muted-foreground">Autor da cifra:</span>
      {readonly ? (
        <Link 
          to={`/musico/${profile.nickname}`}
          className="text-foreground hover:underline focus:underline focus:outline-none"
          aria-label={`Visitar perfil de ${profile.nickname}`}
        >
          @{profile.nickname}
        </Link>
      ) : (
        <span className="text-foreground">@{profile.nickname}</span>
      )}
    </div>
  )
}