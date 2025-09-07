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
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Интервью успешно создано!")
            print(f"ID: {result['id']}")
            print(f"Уникальная ссылка: {result['unique_link']}")
            print(f"Полная ссылка для кандидата: {result['full_link']}")
            print(f"Кандидат: {result['candidate_name']}")
            print(f"Позиция: {result['position']}")
            return result
        else:
            print(f"❌ Ошибка: {response.status_code}")
            print(response.text)
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
