-- Batch 2: Additional far_url matches from ФАР classifier
-- Matched by cross-referencing route numbers, peak names, difficulty, and first ascent authors

-- ==========================================
-- БЕЗЕНГИ: Дыхтау Главная (5223 м)
-- ==========================================

-- №64 Дыхтау Главная — по ЮЗ гребню (4Б, Муммери 1888)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1009/'
WHERE name ILIKE '%Дыхтау Главная%' AND name ILIKE '%Юго-Западному гребню%' AND far_url IS NULL;

-- №65 Дыхтау Главная — по Западному гребню (4Б, Гарф 1938)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1010/'
WHERE name ILIKE '%Дыхтау Главная%' AND name ILIKE '%Западному гребню%' AND far_url IS NULL;

-- №66 Дыхтау Главная — по СВ к/ф Северного гребня (5А, Иванов 1982)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1011/'
WHERE name ILIKE '%Дыхтау Главная%' AND name ILIKE '%Северо-Восточному к/ф Северного гребня%' AND far_url IS NULL;

-- №67 Дыхтау Главная — по ЮЗ склону (5А)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1012/'
WHERE name ILIKE '%Дыхтау Главная%' AND name ILIKE '%Юго-Западному склону%' AND far_url IS NULL;

-- №68а Дыхтау Главная — по Южному главному кулуару (5А3, Павлов 2001)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1014/'
WHERE name ILIKE '%Дыхтау Главная%' AND name ILIKE '%Южному главному кулуару%' AND far_url IS NULL;

-- №69 Дыхтау Главная — по правому Южному к/ф (5А)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1015/'
WHERE name ILIKE '%Дыхтау Главная%' AND name ILIKE '%правому Южному%' AND far_url IS NULL;

-- №70 Дыхтау Главная — по СВ стене (5Б, Немсицверидзе 1952)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1016/'
WHERE name ILIKE '%Дыхтау Главная%' AND name ILIKE '%Северо-Восточной стене%' AND far_url IS NULL;

-- №71 Дыхтау Главная — по СВ к/ф Сев гребня (5Б, Прокудаев 1938)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1017/'
WHERE name ILIKE '%71.%Дыхтау Главная%' AND far_url IS NULL;

-- ==========================================
-- БЕЗЕНГИ: Дыхтау Восточная (5197 м)
-- ==========================================

-- №63 Дыхтау Восточная — по Северному гребню (4Б, Коккин 1888)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1008/'
WHERE name ILIKE '%Дыхтау Восточная%' AND name ILIKE '%Северному гребню%' AND far_url IS NULL;

-- ==========================================
-- БЕЗЕНГИ: Думала Восточная (4561 м)
-- ==========================================

-- №53 Думала Восточная — по ЮВ ребру (5А, Колчин 1977)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1005/'
WHERE name ILIKE '%Думала Восточная%' AND name ILIKE '%Юго-Восточному ребру%' AND far_url IS NULL;

-- ==========================================
-- БЕЗЕНГИ: Коштантау (5152 м)
-- ==========================================

-- №95 Коштантау — по ЮВ ребру (5Б, Наумов 1962)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1034/'
WHERE name ILIKE '%95.%Коштантау%' AND far_url IS NULL;

-- №96 Коштантау — по ЮВ ребру (5Б, Галустов 1955)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1035/'
WHERE name ILIKE '%96.%Коштантау%' AND far_url IS NULL;

-- №97 Коштантау — по Восточному гребню (5Б, Гарф 1948)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1036/'
WHERE name ILIKE '%Коштантау%' AND name ILIKE '%Восточному гребню%' AND far_url IS NULL;

-- №98 Коштантау — по стене ЮЗ ребра (5Б, Бочков 1971)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1037/'
WHERE name ILIKE '%Коштантау%' AND name ILIKE '%стене Юго-Западного ребра%' AND far_url IS NULL;

-- №99 Коштантау — по правой части центрального к/ф С стены (5Б, Васильев 1966)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1038/'
WHERE name ILIKE '%Коштантау%' AND name ILIKE '%правой части центрального%' AND far_url IS NULL;

-- №100 Коштантау — по левой части Северной стены (5Б, Носов 1969)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1039/'
WHERE name ILIKE '%Коштантау%' AND name ILIKE '%левой части Северной стены%' AND far_url IS NULL;

-- ==========================================
-- БЕЗЕНГИ: Гестола (4859 м)
-- ==========================================

-- №30 Гестола — по Юго-Западной стене (4Б, Гвалия 1938)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/980/'
WHERE name ILIKE '%Гестола%' AND name ILIKE '%Юго-Западной стене%' AND far_url IS NULL;

-- №31 Гестола — по СВ ребру Катынского плато (4Б, Винклер 1912)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/981/'
WHERE name ILIKE '%Гестола%' AND name ILIKE '%Катынского%' AND far_url IS NULL;

-- ==========================================
-- БЕЗЕНГИ: Мижирги Восточная (4992 м)
-- ==========================================

-- №132 Мижирги Восточная — по Северному ребру (5Б, Пелевин 1952)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1068/'
WHERE name ILIKE '%Мижирги Восточная%' AND name ILIKE '%Северному ребру%' AND far_url IS NULL;

-- №133 Мижирги Восточная — по СВ стене (5Б, Тимофеев 1978)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1069/'
WHERE name ILIKE '%Мижирги Восточная%' AND name ILIKE '%Северо-Восточной стене%' AND far_url IS NULL;

-- ==========================================
-- БЕЗЕНГИ: Шхара Главная (5203 м)
-- ==========================================

-- №240 Шхара Главная — по Северному ребру (5Б, Томашек 1930)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1161/'
WHERE name ILIKE '%Шхара Главная%' AND name ILIKE '%Северному ребру%' AND far_url IS NULL;

-- №241 Шхара Главная — по левой «доске» Северной стены (5Б, Бушманов 1985)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/1162/'
WHERE name ILIKE '%Шхара Главная%' AND name ILIKE '%доске%' AND far_url IS NULL;

-- №239 Шхара Главная — по СВ гребню (5А, Коккин 1888) — уже в migration 025

-- ==========================================
-- ХИБИНЫ: Тахтарвумчорр
-- ==========================================

-- Тахтарвумчорр Центральная — по кулуару «зигзаг» (2А)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/5467/'
WHERE name ILIKE '%Тахтарвумчорр%' AND name ILIKE '%зигзаг%' AND far_url IS NULL;

-- Тахтарвумчорр Центральная — по центру стены Цирка Поясов (5А)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/5471/'
WHERE name ILIKE '%Тахтарвумчорр%' AND name ILIKE '%центру стены%' AND far_url IS NULL;

-- ==========================================
-- ХИБИНЫ: Вудъяврчорр
-- ==========================================

-- Вудъяврчорр Малая — по лавинному кулуару (2А)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/4624/'
WHERE name ILIKE '%Вудъяврчорр%' AND name ILIKE '%лавинному кулуару%' AND far_url IS NULL;

-- Вудъяврчорр Малая — по 3-му к/ф «Кораблик» (3А)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/4626/'
WHERE name ILIKE '%Вудъяврчорр%' AND name ILIKE '%Кораблик%' AND far_url IS NULL;

-- ==========================================
-- ХИБИНЫ: Юкспорр
-- ==========================================

-- Юкспорр — по правой части ЮЗ к/ф (1Б)
UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/5449/'
WHERE name ILIKE '%Юкспорр%' AND name ILIKE '%ЮЗ%' AND far_url IS NULL;
