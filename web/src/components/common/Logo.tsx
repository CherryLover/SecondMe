import { Link } from 'react-router-dom'

interface LogoProps {
  className?: string
  linkTo?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl md:text-2xl',
  lg: 'text-2xl md:text-3xl',
}

export function Logo({ className = '', linkTo = '/', size = 'md' }: LogoProps) {
  return (
    <Link
      to={linkTo}
      className={`font-serif ${sizeClasses[size]} font-semibold text-ink dark:text-darkInk hover:text-accent dark:hover:text-darkAccent transition-colors duration-300 ${className}`}
    >
      SecondMe
    </Link>
  )
}
