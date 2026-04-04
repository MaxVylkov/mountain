-- Seed far_url for routes matching ФАР classifier descriptions
-- URLs verified via alpfederation.ru search

-- Уллутау: СЗ стена (Уллутау-чана Главная) → /mountainroute/933/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/933/'
WHERE id = 'b421a17d-e894-5b18-a7d8-ec49076f31c1'; -- Уллутау Гл. по северной стене (В.Абалаков)

-- Уллутау: СЗ стена Западная → /mountainroute/935/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/935/'
WHERE id = '4e3ce503-f788-563f-96b6-73a6f129e4dd'; -- Уллутау Зап. по Северо-Западной стене (Д.Гудков)

-- Лацга: с юга по кулуару В гребня → /mountainroute/869/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/869/'
WHERE id = 'e8299740-c73b-5899-b32e-cb430c118c43'; -- Лацга по Восточному гребню

-- Тютю: Южная стена (5А) → /mountainroute/911/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/911/'
WHERE id = '8625165f-efc6-59cf-bb82-2fe63fe6980f'; -- Тютю Западная по Южной стене (И.Хацкевич)

-- Тютю: Южная стена Ю ребра (5А) → /mountainroute/914/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/914/'
WHERE id = '556e8532-53f2-5ec8-83fa-fd584a851872'; -- Тютю Вторая Западная по Южной стене Южного контрфорса (Рыжиков)

-- Тютю: траверс Вост-Зап (3А) → /mountainroute/5888/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/5888/'
WHERE name ILIKE '%Тютю%' AND name ILIKE '%траверс%' AND far_url IS NULL;

-- Доломит Северный с перевала С Доломит (2А) → /mountainroute/470/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/470/'
WHERE id = '9bf347b0-bb75-5314-9ed9-95cf60225dd2'; -- Доломит Северный с перевала С Доломит

-- Доломит Центральный по «Книге» (4Б) → /mountainroute/475/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/475/'
WHERE id = 'c1f74b89-c22a-5622-9dbb-2a2c3d6a5196'; -- Доломит Центральный по Западной стене (по «Книге»)

-- Доломиты траверс С-Ю (4А) → /mountainroute/5851/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/5851/'
WHERE name ILIKE '%Доломит%' AND name ILIKE '%траверс%' AND far_url IS NULL;

-- Гвандра траверс Гл-Вост (3А) → /mountainroute/5845/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/5845/'
WHERE name ILIKE '%Гвандра%' AND name ILIKE '%траверс%' AND far_url IS NULL;

-- Далар по СВ стене В плеча (5Б) → /mountainroute/456/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/456/'
WHERE id = 'eea930cc-9911-5710-b3f9-d2ad2ae4f1a9'; -- Далар по Восточному гребню (5А — ближайшее совпадение)

-- Далар по левой части С стены (6А) → /mountainroute/460/
-- Нет точного совпадения в нашей базе

-- Сокол «Жажда» (3А) → /mountainroute/7106/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/7106/'
WHERE name ILIKE '%Жажда%' AND far_url IS NULL;

-- Сокол по контрфорсу левой груди (5А) → /mountainroute/7081/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/7081/'
WHERE id = 'bb8980f1-3f9b-55d0-8719-953f11668f6b';

-- Хибины: Тахтарвумчорр «Откол» (1Б) → /mountainroute/5473/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/5473/'
WHERE name ILIKE '%Тахтарвумчорр%' AND far_url IS NULL;

-- Безенги — Шхара по «крабу» (5А) → /mountainroute/1160/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1160/'
WHERE name ILIKE '%Шхара%' AND name ILIKE '%краб%' AND far_url IS NULL;

-- Безенги — Дыхтау по левому Ю кф. (5Б) → /mountainroute/1013/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1013/'
WHERE name ILIKE '%Дыхтау%' AND name ILIKE '%лев%' AND far_url IS NULL;

-- Безенги — Коштан по СЗ ребру (5Б) → /mountainroute/1033/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1033/'
WHERE name ILIKE '%Коштан%' AND name ILIKE '%СЗ%' AND far_url IS NULL;

-- Коштан вторая ссылка → /mountainroute/1041/
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1041/'
WHERE name ILIKE '%Коштан%' AND name ILIKE '%ребр%' AND far_url IS NULL;
