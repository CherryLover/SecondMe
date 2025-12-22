import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { I18nProvider } from '@/contexts/I18nContext'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import ChatPage from '@/pages/ChatPage'
import MemoryPage from '@/pages/MemoryPage'
import FlowmoPage from '@/pages/FlowmoPage'
import SettingsPage from '@/pages/SettingsPage'
import AdminPage from '@/pages/AdminPage'

function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/app" element={<ChatPage />} />
              <Route path="/app/memories" element={<MemoryPage />} />
              <Route path="/app/flowmo" element={<FlowmoPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              <Route path="/app/admin" element={<AdminPage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}

export default App
