-- FAR URLs auto-match, part 21/21

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8682/'
WHERE name ILIKE '%№101. Коштантау — по правому к/ф Северно%' AND far_url IS NULL;

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8683/'
WHERE name ILIKE '%№102. Коштантау — по левой части централ%' AND far_url IS NULL;

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8684/'
WHERE name ILIKE '%№92. Коштантау — по Юго-Западному склону%' AND far_url IS NULL;

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8685/'
WHERE name ILIKE '%№93. Коштантау — по Северо-Восточной сте%' AND far_url IS NULL;

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8686/'
WHERE name ILIKE '%№103. Коштантау – Дыхтау — траверс%' AND far_url IS NULL;

-- === Крумкол ===

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8687/'
WHERE name ILIKE '%№104. Крумкол — по Юго-Восточному гребню%' AND far_url IS NULL;

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8688/'
WHERE name ILIKE '%№105. Крумкол — по Восточному гребню%' AND far_url IS NULL;

-- === Вудъяврчорр, Бол. ===

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8689/'
WHERE name ILIKE '%№10. Вудъяврчорр, Бол. — левой части С с%' AND far_url IS NULL;

-- === Петрелиуса (1141 м) ===

UPDATE routes SET far_url = 'https://alpfederation.ru/mountainroute/8690/'
WHERE name ILIKE '%№20. Петрелиуса (1141 м) — по центру С с%' AND far_url IS NULL;
