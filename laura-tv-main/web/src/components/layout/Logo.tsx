interface LogoProps {
  className?: string
}

function Logo({
  className = 'w-10 h-10',
}: LogoProps) {
  return (
    <img
      src="/lauratv-logo.png"
      alt="LauraTV"
      className={`block object-cover ${className}`}
      draggable={false}
    />
  )
}

export default Logo