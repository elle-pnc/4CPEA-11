import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdExitToApp, MdLanguage, MdCheck, MdDarkMode, MdLightMode, MdPerson, MdInfo, MdHelpOutline, MdChevronRight, MdQuestionAnswer, MdContactSupport, MdReportProblem, MdEmail, MdPhone, MdLocationOn, MdGavel, MdDescription } from 'react-icons/md'
import FooterNav from '../components/FooterNav'
import { getTranslations } from '../translations'
import { updateUserPreferences } from '../firebase/firestore'
import './SettingsPage.css'

const SettingsPage = ({ currentUser, userData, setUserData, onLogout }) => {
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showHelpSupport, setShowHelpSupport] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [helpSection, setHelpSection] = useState(null) // 'faq', 'contact', 'report'
  
  const currentLanguage = userData?.language || 'English'
  const currentTheme = userData?.theme || 'light'
  const t = getTranslations(currentLanguage)
  
  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'fil', name: 'Filipino', native: 'Filipino' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' }
  ]

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = () => {
    onLogout()
  }

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
  }

  const handleLanguageClick = () => {
    setShowLanguageModal(true)
  }

  const handleLanguageSelect = async (language) => {
    try {
      if (currentUser && currentUser.uid) {
        await updateUserPreferences(currentUser.uid, language.name, undefined)
      }
      setUserData({
        ...userData,
        language: language.name
      })
      setShowLanguageModal(false)
    } catch (error) {
      console.error('Error updating language:', error)
      // Still update local state even if Firestore update fails
      setUserData({
        ...userData,
        language: language.name
      })
      setShowLanguageModal(false)
    }
  }

  const handleLanguageModalClose = () => {
    setShowLanguageModal(false)
  }

  const handleThemeToggle = async () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    try {
      if (currentUser && currentUser.uid) {
        await updateUserPreferences(currentUser.uid, undefined, newTheme)
      }
      setUserData({
        ...userData,
        theme: newTheme
      })
    } catch (error) {
      console.error('Error updating theme:', error)
      // Still update local state even if Firestore update fails
      setUserData({
        ...userData,
        theme: newTheme
      })
    }
  }

  return (
    <div className="mobile-container page-with-footer">
      <div className="settings-page">
        <div className="settings-header">
          <div className="logo-text">
            <span className="logo-blue">CPE11-</span>
            <span className="logo-green">AFCS</span>
          </div>
        </div>

        <div className="settings-content">
          <h1 className="settings-title">{t.settings}</h1>

          <div className="settings-section">
            <h2 className="section-title">{t.account}</h2>
            <div className="settings-card">
              <button className="settings-item" onClick={() => navigate('/profile')}>
                <div className="settings-item-left">
                  <div className="settings-icon-container">
                    <MdPerson className="settings-icon" />
                  </div>
                  <span className="settings-label">{t.profile}</span>
                </div>
                <MdChevronRight className="settings-chevron" />
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">{t.preferences}</h2>
            <div className="settings-card">
              <button className="settings-item" onClick={handleLanguageClick}>
                <div className="settings-item-left">
                  <div className="settings-icon-container">
                    <MdLanguage className="settings-icon" />
                  </div>
                  <span className="settings-label">{t.language}</span>
                </div>
                <div className="settings-item-right">
                  <span className="settings-value">{currentLanguage}</span>
                  <MdChevronRight className="settings-chevron" />
                </div>
              </button>
              <div className="settings-divider"></div>
              <div className="settings-item settings-item-toggle">
                <div className="settings-item-left">
                  <div className="settings-icon-container">
                    {currentTheme === 'dark' ? (
                      <MdDarkMode className="settings-icon" />
                    ) : (
                      <MdLightMode className="settings-icon" />
                    )}
                  </div>
                  <span className="settings-label">{t.theme}</span>
                </div>
                <div className="toggle-switch" onClick={handleThemeToggle}>
                  <div className={`toggle-switch-slider ${currentTheme === 'dark' ? 'active' : ''}`}>
                    <div className="toggle-switch-thumb"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">{t.helpSupport}</h2>
            <div className="settings-card">
              <button className="settings-item" onClick={() => setShowHelpSupport(true)}>
                <div className="settings-item-left">
                  <div className="settings-icon-container">
                    <MdHelpOutline className="settings-icon" />
                  </div>
                  <span className="settings-label">{t.helpCenter}</span>
                </div>
                <MdChevronRight className="settings-chevron" />
              </button>
              <div className="settings-divider"></div>
              <button className="settings-item" onClick={() => setShowTermsModal(true)}>
                <div className="settings-item-left">
                  <div className="settings-icon-container">
                    <MdGavel className="settings-icon" />
                  </div>
                  <span className="settings-label">{t.termsConditions}</span>
                </div>
                <MdChevronRight className="settings-chevron" />
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">{t.about}</h2>
            <div className="settings-card">
              <div className="settings-item settings-item-static">
                <div className="settings-item-left">
                  <div className="settings-icon-container">
                    <MdInfo className="settings-icon" />
                  </div>
                  <span className="settings-label">{t.version}</span>
                </div>
                <span className="settings-value">1.0.0</span>
              </div>
            </div>
          </div>

          <div className="settings-section settings-section-logout">
            <div className="settings-card logout-card">
              <button className="settings-item logout-button" onClick={handleLogoutClick}>
                <div className="settings-item-left">
                  <MdExitToApp className="logout-icon" />
                  <span className="settings-label logout-label">{t.logout}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Language Selection Modal */}
        {showLanguageModal && (
          <div className="language-modal-overlay" onClick={handleLanguageModalClose}>
            <div className="language-modal" onClick={(e) => e.stopPropagation()}>
              <div className="language-modal-header">
                <MdLanguage className="language-modal-icon" />
                <h2 className="language-modal-title">{t.selectLanguage}</h2>
                <button className="language-modal-close" onClick={handleLanguageModalClose}>
                  ×
                </button>
              </div>
              <div className="language-list">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    className={`language-item ${currentLanguage === language.name ? 'selected' : ''}`}
                    onClick={() => handleLanguageSelect(language)}
                  >
                    <div className="language-info">
                      <span className="language-name">{language.native}</span>
                      <span className="language-name-en">{language.name}</span>
                    </div>
                    {currentLanguage === language.name && (
                      <MdCheck className="language-check-icon" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Help & Support Modal */}
        {showHelpSupport && (
          <div className="help-support-modal-overlay" onClick={() => { setShowHelpSupport(false); setHelpSection(null) }}>
            <div className="help-support-modal" onClick={(e) => e.stopPropagation()}>
              <div className="help-support-modal-header">
                <MdHelpOutline className="help-support-modal-icon" />
                <h2 className="help-support-modal-title">{t.helpSupport}</h2>
                <button className="help-support-modal-close" onClick={() => { setShowHelpSupport(false); setHelpSection(null) }}>
                  ×
                </button>
              </div>
              
              {!helpSection && (
                <div className="help-support-content">
                  <button className="help-support-item" onClick={() => setHelpSection('faq')}>
                    <div className="help-support-item-left">
                      <MdQuestionAnswer className="help-support-item-icon" />
                      <span className="help-support-item-label">{t.frequentlyAskedQuestions}</span>
                    </div>
                    <MdChevronRight className="help-support-chevron" />
                  </button>
                  <div className="help-support-divider"></div>
                  <button className="help-support-item" onClick={() => setHelpSection('contact')}>
                    <div className="help-support-item-left">
                      <MdContactSupport className="help-support-item-icon" />
                      <span className="help-support-item-label">{t.contactUs}</span>
                    </div>
                    <MdChevronRight className="help-support-chevron" />
                  </button>
                  <div className="help-support-divider"></div>
                  <button className="help-support-item" onClick={() => setHelpSection('report')}>
                    <div className="help-support-item-left">
                      <MdReportProblem className="help-support-item-icon" />
                      <span className="help-support-item-label">{t.reportProblem}</span>
                    </div>
                    <MdChevronRight className="help-support-chevron" />
                  </button>
                </div>
              )}

              {helpSection === 'faq' && (
                <div className="help-support-content">
                  <button className="help-support-back" onClick={() => setHelpSection(null)}>
                    <MdChevronRight className="help-support-back-icon" />
                    <span>{t.back}</span>
                  </button>
                  <div className="help-support-section-content">
                    <h3 className="help-support-section-title">{t.frequentlyAskedQuestions}</h3>
                    <div className="faq-list">
                      {t.faqItems?.map((faq, index) => (
                        <div key={index} className="faq-item">
                          <div className="faq-question">{faq.question}</div>
                          <div className="faq-answer">{faq.answer}</div>
                        </div>
                      )) || (
                        <>
                          <div className="faq-item">
                            <div className="faq-question">{t.faqHowToTopUp}</div>
                            <div className="faq-answer">{t.faqHowToTopUpAnswer}</div>
                          </div>
                          <div className="faq-item">
                            <div className="faq-question">{t.faqHowToBookRide}</div>
                            <div className="faq-answer">{t.faqHowToBookRideAnswer}</div>
                          </div>
                          <div className="faq-item">
                            <div className="faq-question">{t.faqPaymentMethods}</div>
                            <div className="faq-answer">{t.faqPaymentMethodsAnswer}</div>
                          </div>
                          <div className="faq-item">
                            <div className="faq-question">{t.faqRefundPolicy}</div>
                            <div className="faq-answer">{t.faqRefundPolicyAnswer}</div>
                          </div>
                          <div className="faq-item">
                            <div className="faq-question">{t.faqLostCard}</div>
                            <div className="faq-answer">{t.faqLostCardAnswer}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'contact' && (
                <div className="help-support-content">
                  <button className="help-support-back" onClick={() => setHelpSection(null)}>
                    <MdChevronRight className="help-support-back-icon" />
                    <span>{t.back}</span>
                  </button>
                  <div className="help-support-section-content">
                    <h3 className="help-support-section-title">{t.contactUs}</h3>
                    <div className="contact-info-list">
                      <div className="contact-info-item">
                        <MdEmail className="contact-info-icon" />
                        <div className="contact-info-details">
                          <div className="contact-info-label">{t.email}</div>
                          <div className="contact-info-value">{t.supportEmail}</div>
                        </div>
                      </div>
                      <div className="contact-info-item">
                        <MdPhone className="contact-info-icon" />
                        <div className="contact-info-details">
                          <div className="contact-info-label">{t.phoneNumber}</div>
                          <div className="contact-info-value">{t.supportPhone}</div>
                        </div>
                      </div>
                      <div className="contact-info-item">
                        <MdLocationOn className="contact-info-icon" />
                        <div className="contact-info-details">
                          <div className="contact-info-label">{t.address}</div>
                          <div className="contact-info-value">{t.supportAddress}</div>
                        </div>
                      </div>
                      <div className="contact-info-item">
                        <MdInfo className="contact-info-icon" />
                        <div className="contact-info-details">
                          <div className="contact-info-label">{t.businessHours}</div>
                          <div className="contact-info-value">{t.supportHours}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {helpSection === 'report' && (
                <div className="help-support-content">
                  <button className="help-support-back" onClick={() => setHelpSection(null)}>
                    <MdChevronRight className="help-support-back-icon" />
                    <span>{t.back}</span>
                  </button>
                  <div className="help-support-section-content">
                    <h3 className="help-support-section-title">{t.reportProblem}</h3>
                    <div className="report-info">
                      <p className="report-description">{t.reportProblemDescription}</p>
                      <div className="contact-info-list">
                        <div className="contact-info-item">
                          <MdEmail className="contact-info-icon" />
                          <div className="contact-info-details">
                            <div className="contact-info-label">{t.reportViaEmail}</div>
                            <div className="contact-info-value">{t.reportEmail}</div>
                          </div>
                        </div>
                        <div className="contact-info-item">
                          <MdPhone className="contact-info-icon" />
                          <div className="contact-info-details">
                            <div className="contact-info-label">{t.reportViaPhone}</div>
                            <div className="contact-info-value">{t.reportPhone}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terms and Conditions Modal */}
        {showTermsModal && (
          <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}>
            <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
              <div className="terms-modal-header">
                <MdGavel className="terms-modal-icon" />
                <h2 className="terms-modal-title">{t.termsConditions}</h2>
                <button className="terms-modal-close" onClick={() => setShowTermsModal(false)}>
                  ×
                </button>
              </div>
              <div className="terms-modal-content">
                <div className="terms-content">
                  {t.termsContent?.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="terms-paragraph">{paragraph}</p>
                  )) || (
                    <>
                      <p className="terms-paragraph">{t.termsIntro}</p>
                      <h3 className="terms-section-title">{t.termsAcceptance}</h3>
                      <p className="terms-paragraph">{t.termsAcceptanceContent}</p>
                      <h3 className="terms-section-title">{t.termsAccount}</h3>
                      <p className="terms-paragraph">{t.termsAccountContent}</p>
                      <h3 className="terms-section-title">{t.termsPayment}</h3>
                      <p className="terms-paragraph">{t.termsPaymentContent}</p>
                      <h3 className="terms-section-title">{t.termsService}</h3>
                      <p className="terms-paragraph">{t.termsServiceContent}</p>
                      <h3 className="terms-section-title">{t.termsLiability}</h3>
                      <p className="terms-paragraph">{t.termsLiabilityContent}</p>
                      <h3 className="terms-section-title">{t.termsChanges}</h3>
                      <p className="terms-paragraph">{t.termsChangesContent}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="terms-modal-actions">
                <button className="terms-close-button" onClick={() => setShowTermsModal(false)}>
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="logout-modal-overlay" onClick={handleLogoutCancel}>
            <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
              <div className="logout-modal-icon">⚠️</div>
              <h2 className="logout-modal-title">{t.confirmLogout}</h2>
              <p className="logout-modal-message">
                {t.logoutMessage}
              </p>
              <div className="logout-modal-actions">
                <button className="logout-cancel-button" onClick={handleLogoutCancel}>
                  {t.cancel}
                </button>
                <button className="logout-confirm-button" onClick={handleLogoutConfirm}>
                  {t.logout}
                </button>
              </div>
            </div>
          </div>
        )}

        <FooterNav language={currentLanguage} />
      </div>
    </div>
  )
}

export default SettingsPage

