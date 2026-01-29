function UserInactive({ className = "" }) {
  return (
    <img
      src="/user-inactive.svg"
      alt="Inactive User"
      className={`${className} object-contain`}
    />
  )
}

export default UserInactive
