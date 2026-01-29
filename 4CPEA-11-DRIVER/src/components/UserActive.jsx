function UserActive({ className = "" }) {
  return (
    <img
      src="/user-active.svg"
      alt="Active User"
      className={`${className} object-contain`}
    />
  )
}

export default UserActive
