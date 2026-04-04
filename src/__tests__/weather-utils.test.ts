import { describe, it, expect } from 'vitest'
import { weatherLabel, windCompass } from '@/lib/weather-utils'

describe('weatherLabel', () => {
  it('returns Ясно for code 0', () => {
    expect(weatherLabel(0)).toEqual({ emoji: '☀️', label: 'Ясно' })
  })

  it('returns Переменная облачность for codes 1–2', () => {
    expect(weatherLabel(1).label).toBe('Переменная облачность')
    expect(weatherLabel(2).label).toBe('Переменная облачность')
  })

  it('returns Пасмурно for code 3', () => {
    expect(weatherLabel(3).label).toBe('Пасмурно')
  })

  it('returns Дымка for codes 4–39', () => {
    expect(weatherLabel(4).label).toBe('Дымка / видимость снижена')
    expect(weatherLabel(39).label).toBe('Дымка / видимость снижена')
  })

  it('returns Туман for codes 40–49', () => {
    expect(weatherLabel(40).label).toBe('Туман')
    expect(weatherLabel(49).label).toBe('Туман')
  })

  it('returns Морось for codes 50–57', () => {
    expect(weatherLabel(50).label).toBe('Морось')
    expect(weatherLabel(57).label).toBe('Морось')
  })

  it('returns Дождь for codes 58–67', () => {
    expect(weatherLabel(58).label).toBe('Дождь')
    expect(weatherLabel(67).label).toBe('Дождь')
  })

  it('returns Снег for codes 68–77', () => {
    expect(weatherLabel(68).label).toBe('Снег')
    expect(weatherLabel(77).label).toBe('Снег')
  })

  it('returns Ливень for codes 78–82', () => {
    expect(weatherLabel(78).label).toBe('Ливень')
    expect(weatherLabel(82).label).toBe('Ливень')
  })

  it('returns Снегопад for codes 83–86', () => {
    expect(weatherLabel(83).label).toBe('Снегопад')
    expect(weatherLabel(86).label).toBe('Снегопад')
  })

  it('returns Гроза for codes 87–99', () => {
    expect(weatherLabel(87).label).toBe('Гроза')
    expect(weatherLabel(99).label).toBe('Гроза')
  })

  it('returns fallback for unknown codes', () => {
    expect(weatherLabel(200)).toEqual({ emoji: '❓', label: '—' })
  })
})

describe('windCompass', () => {
  it('returns С for 0°', () => {
    expect(windCompass(0)).toBe('С')
  })

  it('returns С for 360°', () => {
    expect(windCompass(360)).toBe('С')
  })

  it('returns СВ for 45°', () => {
    expect(windCompass(45)).toBe('СВ')
  })

  it('returns В for 90°', () => {
    expect(windCompass(90)).toBe('В')
  })

  it('returns Ю for 180°', () => {
    expect(windCompass(180)).toBe('Ю')
  })

  it('returns З for 270°', () => {
    expect(windCompass(270)).toBe('З')
  })

  it('rounds to nearest direction for intermediate values', () => {
    expect(windCompass(22)).toBe('С')   // 22° rounds to 0 = С
    expect(windCompass(23)).toBe('СВ')  // 23° rounds to 45 = СВ
  })
})
