import { useState, useEffect } from 'react'
import { Plus, ExternalLink, Calendar, Clock, User, MapPin, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface InterviewForm {
  candidate_name: string
  candidate_id: string
  position: string
  recommended_duration: number
  knowledge_base: string
  description: string
}

const TestPage = () => {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [createdInterview, setCreatedInterview] = useState<any>(null)
  const [demoInterviews, setDemoInterviews] = useState<any[]>([])
  const [isLoadingDemo, setIsLoadingDemo] = useState(true)
  const [formData, setFormData] = useState<InterviewForm>({
    candidate_name: 'Иван Петров',
    candidate_id: 'candidate_001',
    position: 'Frontend Developer',
    recommended_duration: 45,
    knowledge_base: 'React, TypeScript, JavaScript, HTML/CSS',
    description: 'Собеседование на позицию Frontend разработчика с опытом работы от 3 лет'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'recommended_duration' ? parseInt(value) || 0 : value
    }))
  }

  const createInterview = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/interviews/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const interview = await response.json()
        setCreatedInterview(interview)
      } else {
        alert('Ошибка создания собеседования')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert('Ошибка подключения к серверу')
    } finally {
      setIsCreating(false)
    }
  }

  const openInterview = (interviewLink: string) => {
    navigate(`/interview/${interviewLink}`)
  }

  // Создание демо интервью
  const createDemoInterviews = async () => {
    setIsLoadingDemo(true)
    const demoData = [
      {
        candidate_name: 'Анна Смирнова',
        candidate_id: 'demo_candidate_001',
        position: 'React Developer',
        recommended_duration: 45,
        knowledge_base: 'React, Redux, JavaScript, TypeScript',
        description: 'Демо собеседование для React разработчика'
      },
      {
        candidate_name: 'Михаил Козлов',
        candidate_id: 'demo_candidate_002',
        position: 'Full Stack Developer',
        recommended_duration: 60,
        knowledge_base: 'Node.js, React, PostgreSQL, Docker',
        description: 'Демо собеседование для Full Stack разработчика'
      }
    ]

    try {
      const createdDemos = []
      for (const demo of demoData) {
        const response = await fetch('http://localhost:8000/api/v1/interviews/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(demo)
        })

        if (response.ok) {
          const interview = await response.json()
          createdDemos.push(interview)
        }
      }
      setDemoInterviews(createdDemos)
    } catch (error) {
      console.error('Ошибка создания демо интервью:', error)
      // Показываем заглушки при ошибке
      setDemoInterviews([
        {
          unique_link: 'error',
          candidate_name: 'Ошибка подключения',
          position: 'Проверьте backend сервер',
          status: 'error',
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setIsLoadingDemo(false)
    }
  }

  // Загрузка демо интервью при запуске
  useEffect(() => {
    createDemoInterviews()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Заголовок */}
      <header className="bg-background-secondary border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              AI Interview Platform
            </h1>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Тестовая страница для создания и управления собеседованиями с AI HR
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Создание нового собеседования */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Создать собеседование</h2>
                <p className="text-text-muted">Создайте уникальную ссылку для кандидата</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Имя кандидата
                </label>
                <input
                  type="text"
                  name="candidate_name"
                  value={formData.candidate_name}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder="Введите имя кандидата"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  ID кандидата
                </label>
                <input
                  type="text"
                  name="candidate_id"
                  value={formData.candidate_id}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder="Уникальный ID кандидата"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Позиция
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder="Название вакансии"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Рекомендуемая длительность (минуты)
                </label>
                <input
                  type="number"
                  name="recommended_duration"
                  value={formData.recommended_duration}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  min="15"
                  max="180"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  База знаний
                </label>
                <input
                  type="text"
                  name="knowledge_base"
                  value={formData.knowledge_base}
                  onChange={handleInputChange}
                  className="input-field w-full"
                  placeholder="Технологии и навыки"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input-field w-full h-20 resize-none"
                  placeholder="Дополнительная информация о собеседовании"
                />
              </div>

              <button
                onClick={createInterview}
                disabled={isCreating}
                className="btn-primary w-full"
              >
                {isCreating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Создание...</span>
                  </div>
                ) : (
                  'Создать собеседование'
                )}
              </button>
            </div>

            {/* Результат создания */}
            {createdInterview && (
              <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                <h3 className="text-green-400 font-medium mb-2">✅ Собеседование создано!</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-white">
                    <strong>ID:</strong> {createdInterview.id}
                  </p>
                  <p className="text-white">
                    <strong>Ссылка:</strong> 
                    <code className="bg-black/30 px-2 py-1 rounded ml-2 text-xs">
                      {createdInterview.unique_link}
                    </code>
                  </p>
                  <button
                    onClick={() => openInterview(createdInterview.unique_link)}
                    className="btn-secondary mt-3 flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Открыть собеседование</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Демо собеседования */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Демо собеседования</h2>
                  <p className="text-text-muted">Готовые примеры для тестирования</p>
                </div>
              </div>
              <button
                onClick={createDemoInterviews}
                disabled={isLoadingDemo}
                className="btn-secondary text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Пересоздать</span>
              </button>
            </div>

            <div className="space-y-4">
              {isLoadingDemo ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-text-muted">Создание демо интервью...</p>
                </div>
              ) : (
                demoInterviews.map((interview, index) => (
                  <div 
                    key={interview.unique_link || index}
                    className="bg-background-tertiary border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-white">{interview.candidate_name}</h3>
                        <p className="text-text-muted text-sm">{interview.position}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        interview.status === 'not_started' ? 'bg-gray-600 text-gray-200' :
                        interview.status === 'started' ? 'bg-green-600 text-white' :
                        interview.status === 'error' ? 'bg-red-600 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {interview.status === 'not_started' ? 'Не начато' :
                         interview.status === 'started' ? 'В процессе' : 
                         interview.status === 'error' ? 'Ошибка' :
                         'Завершено'}
                      </div>
                    </div>
                    
                    {interview.unique_link && interview.unique_link !== 'error' && (
                      <div className="mb-2">
                        <p className="text-xs text-text-muted">
                          ID: {interview.id} | Ссылка: {interview.unique_link.substring(0, 8)}...
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-text-muted">
                        Создано: {new Date(interview.created_at).toLocaleString()}
                      </p>
                      <button
                        onClick={() => interview.unique_link !== 'error' && openInterview(interview.unique_link)}
                        disabled={interview.unique_link === 'error'}
                        className={`text-sm py-2 px-4 flex items-center space-x-1 ${
                          interview.unique_link === 'error' 
                            ? 'btn-secondary opacity-50 cursor-not-allowed' 
                            : 'btn-secondary'
                        }`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Открыть</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Инструкции */}
        <div className="mt-8 card">
          <h2 className="text-xl font-bold text-white mb-4">📋 Инструкции по тестированию</h2>
          <div className="space-y-3 text-text-muted">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">1</div>
              <p>Создайте новое собеседование, заполнив форму слева, или используйте демо-версии</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">2</div>
              <p>Откройте собеседование - вы попадете в комнату с видео и чатом</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">3</div>
              <p>Протестируйте камеру, микрофон, чат между участниками и AI HR</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">4</div>
              <p>Проверьте таймер, начало и завершение собеседования с сохранением транскрипции</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <h3 className="text-blue-400 font-medium mb-2">ℹ️ Технические заметки</h3>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• Backend API: http://localhost:8000 (должен быть запущен)</li>
              <li>• Frontend: http://localhost:3001 (текущий адрес)</li>
              <li>• WebSocket подключение для реального времени</li>
              <li>• Whisper интеграция: wss://mojarung-whisper-websocket-6dd5.twc1.net</li>
              <li>• Демо интервью автоматически создаются в БД</li>
              <li>• Темная тема с фиолетовыми акцентами</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestPage
