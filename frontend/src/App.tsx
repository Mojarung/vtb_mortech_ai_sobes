import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import InterviewRoom from './components/InterviewRoom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white">
        <Routes>
          <Route path="/interview/:interviewId" element={<InterviewRoom />} />
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center"><p className="text-xl">Неверная ссылка на собеседование</p></div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
