function Logo({ className = "" }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <img
        src="/Logo.png"
        alt="CPE11-AFCS Logo"
        className="w-28 h-28 object-contain"
      />
    </div>
  )
}

export default Logo
