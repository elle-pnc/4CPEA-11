import { createContext, useContext } from 'react'
import { getTranslations } from '../translations'

export const TranslationContext = createContext()

export const TranslationProvider = ({ children, language = 'English' }) => {
  const t = getTranslations(language)
  
  return (
    <TranslationContext.Provider value={t}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(TranslationContext)
  
  if (!context) {
    // Fallback if context is not available
    return getTranslations('English')
  }
  
  return context
}

