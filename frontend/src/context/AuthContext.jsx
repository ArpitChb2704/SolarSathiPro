import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(() => sessionStorage.getItem('user_id') || null)

  const login = (id) => {
    sessionStorage.setItem('user_id', id)
    setUserId(id)
  }

  const logout = () => {
    sessionStorage.removeItem('user_id')
    setUserId(null)
  }

  return (
    <AuthContext.Provider value={{ userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

