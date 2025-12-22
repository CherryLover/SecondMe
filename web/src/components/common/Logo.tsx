import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import type { AppMessages } from '@/i18n/translations'

const ICON_SRC = '/secondme-icon.svg'

interface LogoProps {
  className?: string
  linkTo?: string
  size?: 'sm' | 'md' | 'lg'
}

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-xl md:text-2xl',
  lg: 'text-2xl md:text-3xl',
}

const iconSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

export function Logo({ className = '', linkTo = '/', size = 'md' }: LogoProps) {
  const { tm } = useI18n()
  const branding = tm<AppMessages['branding']>('branding')
  const label = branding?.name ?? 'Evera'
  const logoAlt = branding?.logoAlt ?? label

  return (
    <Link
      to={linkTo}
      className={`inline-flex items-center gap-3 font-serif font-semibold text-ink dark:text-darkInk hover:text-accent dark:hover:text-darkAccent transition-colors duration-300 ${textSizeClasses[size]} ${className}`}
    >
      <img
        src={ICON_SRC}
        alt={logoAlt}
        className={`shrink-0 drop-shadow-sm ${iconSizeClasses[size]}`}
      />
      <span>{label}</span>
    </Link>
  )
}
