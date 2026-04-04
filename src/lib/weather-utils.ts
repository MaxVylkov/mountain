export function weatherLabel(code: number): { emoji: string; label: string } {
  if (code === 0)  return { emoji: '☀️', label: 'Ясно' }
  if (code <= 2)   return { emoji: '⛅', label: 'Переменная облачность' }
  if (code === 3)  return { emoji: '☁️', label: 'Пасмурно' }
  if (code <= 39)  return { emoji: '🌫', label: 'Дымка / видимость снижена' }
  if (code <= 49)  return { emoji: '🌫', label: 'Туман' }
  if (code <= 57)  return { emoji: '🌧', label: 'Морось' }
  if (code <= 67)  return { emoji: '🌧', label: 'Дождь' }
  if (code <= 77)  return { emoji: '🌨', label: 'Снег' }
  if (code <= 82)  return { emoji: '🌦', label: 'Ливень' }
  if (code <= 86)  return { emoji: '🌨', label: 'Снегопад' }
  if (code <= 99)  return { emoji: '⛈', label: 'Гроза' }
  return { emoji: '❓', label: '—' }
}

export function windCompass(degrees: number): string {
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
  return dirs[Math.round(degrees / 45) % 8]
}
