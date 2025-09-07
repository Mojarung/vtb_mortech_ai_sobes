import { useState, useEffect } from 'react'

interface InterviewTimerProps {
  startTime: Date | null
  isRunning: boolean
}

const InterviewTimer = ({ startTime, isRunning }: InterviewTimerProps) => {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: number | undefined

    if (isRunning && startTime) {
      interval = window.setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isRunning, startTime])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`text-sm font-mono ${
        isRunning ? 'text-green-400' : 'text-text-muted'
      }`}>
        {formatTime(elapsedTime)}
      </div>
      {isRunning && (
        <div className="w-2 h-2 bg-red-500 rounded-full recording-pulse"></div>
      )}
    </div>
  )
}

export default InterviewTimer
