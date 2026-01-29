function Seat({ className = "" }) {
  return (
    <img 
      src="/Seat-icon.svg" 
      alt="Seat" 
      className={`${className} object-contain`}
    />
  )
}

export default Seat