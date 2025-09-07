import { Routes, Route } from 'react-router-dom'
import InterviewRoom from './components/InterviewRoom'
import TestPage from './components/TestPage'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/interview/:interviewId" element={<InterviewRoom />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">AI Interview Platform</h1>
              <p className="text-text-muted mb-8">Платформа для видео-собеседований с AI HR</p>
              <a href="/test" className="btn-primary inline-block">
                Перейти к тестовой странице
              </a>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default App
