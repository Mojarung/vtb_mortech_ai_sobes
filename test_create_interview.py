#!/usr/bin/env python3
"""
Скрипт для создания тестового интервью
"""
import requests
import json

def create_interview():
    url = "http://localhost:8000/api/v1/interviews/"
    
    data = {
        "candidate_name": "Тестовый Кандидат",
        "candidate_id": "test_candidate_002",
        "position": "Frontend Developer",
        "recommended_duration": 60,
        "knowledge_base": "React, TypeScript, JavaScript, HTML, CSS",
        "description": "Собеседование на позицию Frontend разработчика"
    }
    
    try:
        print(f"📡 Отправляю POST запрос на: {url}")
        print(f"📝 Данные: {json.dumps(data, indent=2, ensure_ascii=False)}")
        
        # Проверим сначала здоровье сервера
        health_url = "http://localhost:8000/health"
        print(f"🏥 Проверяю здоровье сервера: {health_url}")
        
        try:
            health_response = requests.get(health_url, timeout=5)
            if health_response.status_code == 200:
                print("✅ Сервер отвечает на health check")
                print(f"   Ответ: {health_response.json()}")
            else:
                print(f"⚠️ Health check вернул код: {health_response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Health check не удался: {e}")
            return None
        
        # Теперь попробуем создать интервью
        response = requests.post(url, json=data, timeout=10)
        
        print(f"📊 Статус ответа: {response.status_code}")
        print(f"📋 Заголовки ответа: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Интервью успешно создано!")
            print(f"ID: {result['id']}")
            print(f"Уникальная ссылка: {result['unique_link']}")
            print(f"Полная ссылка для кандидата: {result.get('full_link', 'Не указана')}")
            print(f"Кандидат: {result['candidate_name']}")
            print(f"Позиция: {result['position']}")
            return result
        else:
            print(f"❌ Ошибка: {response.status_code}")
            print(f"📄 Текст ответа: {response.text}")
            try:
                error_data = response.json()
                print(f"📝 JSON ошибка: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                pass
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Не удается подключиться к серверу. Убедитесь, что backend запущен на http://localhost:8000")
        return None
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Создание тестового интервью...")
    create_interview()
