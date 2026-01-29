function UserOnline({ className = "" }) {
  return (
    <img
      src="/user-online.svg"
      alt="Online User"
      className={`${className} object-contain`}
    />
  )
}

export default UserOnline
