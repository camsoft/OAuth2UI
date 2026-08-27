import logo from '../assets/logo.png'
import './Logo.css'

interface LogoProps {
  size?: 'small' | 'large'
}

export function Logo({ size = 'large' }: LogoProps) {
  return (
    <div className={`logo logo--${size}`}>
      <img src={logo} alt="Code Pro Training logo" />
    </div>
  )
}
