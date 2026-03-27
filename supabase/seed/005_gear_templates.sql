-- Gear templates: which items belong to each level
-- light_trek includes: basic clothing, small backpack, poles, headlamp, light bivouac
-- np includes: light_trek + harness, helmet, rope, carabiners, basic hardware
-- sp3 includes: np + crampons, ice axe, ice screws, more hardware, winter bivouac
-- sp2 includes: sp3 + ice tools, full rack of nuts/cams

CREATE TABLE IF NOT EXISTS gear_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL CHECK (template IN ('light_trek', 'np', 'sp3', 'sp2')),
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  UNIQUE(template, gear_id)
);

ALTER TABLE gear_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gear templates are public" ON gear_templates FOR SELECT TO anon, authenticated USING (true);

-- Populate templates by matching gear names
DO $$
DECLARE
  g_id uuid;
BEGIN
  -- LIGHT TREK template
  FOR g_id IN SELECT id FROM gear WHERE name IN (
    'Термобельё верх', 'Термобельё низ', 'Флисовая кофта', 'Софтшелл куртка',
    'Штурмовая куртка (мембрана)', 'Ходовые штаны', 'Перчатки тонкие', 'Бафф',
    'Шапка', 'Кепка/панама', 'Носки треккинговые', 'Треккинговые ботинки',
    'Рюкзак 30-40л', 'Фонарь налобный', 'Треккинговые палки (пара)',
    'Солнцезащитные очки', 'Солнцезащитный крем', 'Бутылка', 'Аптечка',
    'Нож', 'Коврик (каремат)', 'Горелка газовая', 'Газовый баллон (230г)',
    'Котелок', 'Кружка', 'Ложка/вилка', 'Спальник летний',
    'Палатка 2-местная', 'Powerbank 10000mAh'
  ) LOOP
    INSERT INTO gear_templates (template, gear_id) VALUES ('light_trek', g_id);
  END LOOP;

  -- NP template = light_trek + climbing basics
  -- First copy light_trek
  INSERT INTO gear_templates (template, gear_id)
  SELECT 'np', gear_id FROM gear_templates WHERE template = 'light_trek';

  -- Add NP-specific items
  FOR g_id IN SELECT id FROM gear WHERE name IN (
    'Обвязка (беседка)', 'Каска', 'Верёвка динамическая 50м',
    'Карабин муфтованный', 'Карабин немуфтованный', 'Оттяжка',
    'Страховочное устройство (корзинка)', 'Спусковое устройство (восьмёрка)',
    'Петля (стропа 120см)', 'Петля (стропа 60см)', 'Самостраховка (усы)',
    'Репшнур 6мм (10м)', 'Перчатки тёплые', 'Рюкзак 50-60л',
    'Альпинистские ботинки', 'Гамаши', 'Рация'
  ) LOOP
    INSERT INTO gear_templates (template, gear_id) VALUES ('np', g_id)
    ON CONFLICT (template, gear_id) DO NOTHING;
  END LOOP;

  -- SP3 template = np + more gear
  INSERT INTO gear_templates (template, gear_id)
  SELECT 'sp3', gear_id FROM gear_templates WHERE template = 'np';

  FOR g_id IN SELECT id FROM gear WHERE name IN (
    'Кошки', 'Ледоруб классический', 'Ледобур', 'Закладка', 'Френд (средний)',
    'Жумар', 'Ролик (блочок)', 'Спальник зимний', 'Пуховка',
    'Варежки пуховые', 'Балаклава', 'Носки тёплые', 'Штурмовые штаны (мембрана)',
    'Термос', 'Тент', 'Гермомешок', 'Лавинный бипер',
    'Лавинная лопата', 'Лавинный щуп', 'Горнолыжная маска'
  ) LOOP
    INSERT INTO gear_templates (template, gear_id) VALUES ('sp3', g_id)
    ON CONFLICT (template, gear_id) DO NOTHING;
  END LOOP;

  -- SP2 template = sp3 + full rack
  INSERT INTO gear_templates (template, gear_id)
  SELECT 'sp2', gear_id FROM gear_templates WHERE template = 'sp3';

  FOR g_id IN SELECT id FROM gear WHERE name IN (
    'Ледовый инструмент', 'Скальный крюк', 'Лесенка',
    'Верёвка динамическая 60м', 'Верёвка статическая 50м',
    'Репшнур 7мм (10м)', 'Расходная петля (стропа)',
    'Страховочное устройство (гри-гри)', 'Рюкзак 70-80л',
    'Высотные ботинки', 'Коврик надувной', 'Палатка 3-местная',
    'Powerbank 20000mAh', 'GPS-навигатор', 'Спутниковый трекер',
    'Солнечная панель'
  ) LOOP
    INSERT INTO gear_templates (template, gear_id) VALUES ('sp2', g_id)
    ON CONFLICT (template, gear_id) DO NOTHING;
  END LOOP;
END $$;
