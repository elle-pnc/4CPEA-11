import './Button.css'

function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) {
  const variantClass = `button-${variant}`
  const sizeClass = `button-${size}`
  
  return (
    <button
      className={`button ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button