#!/usr/bin/env python3
"""
Parses adyrsu_routes.md, uzunkol_routes.md, ingushetia_routes.md, sokol_routes.md
and generates SQL INSERT statements for mountains and routes tables.

Description format:
  - First line: "Категория: 3Б. Тип: комбинированный. Первопроход: X. Вершина: Y."
    (compatible with route-list.tsx extractGrade / extractPeak)
  - Then full description text: approach, pitch-by-pitch, equipment, notes
"""

import re
import uuid
import os

# Namespace for deterministic UUIDs — ensures same name → same UUID across runs
_NS = uuid.UUID('b1a2c3d4-e5f6-7890-abcd-ef1234567890')

def stable_uuid(name: str) -> str:
    """Return a deterministic UUID5 based on the given name."""
    return str(uuid.uuid5(_NS, name))

DOCS = os.path.dirname(os.path.abspath(__file__))

GRADE_MAP = {
    '1А': 1, '1Б': 1,
    '2А': 2, '2Б': 2,
    '3А': 3, '3Б': 3,
    '4А': 4, '4Б': 4,
    '5А': 5, '5Б': 5,
    '6А': 5, '6Б': 5,
}

GRADE_ORDER = ['6Б', '6А', '5Б', '5А', '4Б', '4А', '3Б', '3А', '2Б', '2А', '1Б', '1А']


def extract_grade_str(text):
    for grade in GRADE_ORDER:
        if grade in text:
            return grade
    return None


def grade_to_difficulty(grade_str):
    if grade_str is None:
        return None
    return GRADE_MAP.get(grade_str)


def escape_sql(s):
    if s is None:
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"


def clean_md(text):
    """Strip basic markdown formatting to plain text."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)   # **bold** → bold
    text = re.sub(r'\*(.+?)\*', r'\1', text)         # *italic* → italic
    text = re.sub(r'^#+\s*', '', text, flags=re.M)    # # headings
    text = re.sub(r'^[-*]\s+', '', text, flags=re.M)  # list items
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)   # [link](url) → link
    text = re.sub(r' {2,}', ' ', text)                # multiple spaces
    text = re.sub(r'\n{3,}', '\n\n', text)             # excessive blank lines
    return text.strip()


def build_header(category=None, route_type=None, peak=None, first_ascent=None):
    """Build the structured first line: 'Категория: 3Б. Тип: комб. Первопроход: X. Вершина: Y.'"""
    parts = []
    if category:
        parts.append(f'Категория: {category}.')
    if route_type:
        parts.append(f'Тип: {route_type}.')
    if first_ascent:
        parts.append(f'Первопроход: {first_ascent}.')
    if peak:
        parts.append(f'Вершина: {peak}.')
    return ' '.join(parts)


def join_description(header, body):
    """Combine structured header + full body text."""
    if not header and not body:
        return None
    if not body:
        return header
    if not header:
        return body
    return header + '\n\n' + body


# ─── Parsers ──────────────────────────────────────────────────────────────────

def parse_adyrsu(filepath, region='Ущелье Адырсу, Кабардино-Балкария',
                 country='Россия', season='Июль — сентябрь'):
    """Parse adyrsu_routes.md — '### Маршрут N — ...' format with full descriptions."""
    mountains = []
    routes = []

    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    for block in re.split(r'\n## Вершина:', content)[1:]:
        lines = block.strip().split('\n')
        first_line = lines[0].strip()

        m = re.match(r'^([^(]+)\((\d+)\s*м\)', first_line)
        if m:
            mountain_name = m.group(1).strip()
            height = int(m.group(2))
        else:
            m2 = re.match(r'^([^\n(—]+)', first_line)
            if not m2:
                continue
            mountain_name = m2.group(1).strip()
            height = 0

        peak_display = mountain_name
        mountain_id = stable_uuid(mountain_name)
        mountains.append({'id': mountain_id, 'name': mountain_name,
                          'height': height, 'region': region, 'country': country})

        for rb in re.split(r'\n### Маршрут', block)[1:]:
            rb_lines = rb.strip().split('\n')
            route_header = rb_lines[0].strip()

            # Route name: "N — Name" or "— Name"
            nm = re.match(r'^(?:\d+\s*[—–]\s*)?(.*?)(?:\s*,\s*(?:комбинированный|скальный|ледовый|снежно-ледовый|снежный).+)?$', route_header)
            route_name = nm.group(1).strip() if nm else route_header.strip()

            category_str = None
            route_type = None
            first_ascent = None
            height_info = None
            length_info = None
            body_lines = []

            for line in rb_lines[1:]:
                ls = line.strip()
                if '**Категория:**' in ls:
                    cat = re.search(r'\*\*Категория:\*\*\s*(.+)', ls)
                    if cat:
                        category_str = extract_grade_str(cat.group(1))
                elif '**Тип:**' in ls:
                    t = re.search(r'\*\*Тип:\*\*\s*(.+)', ls)
                    if t:
                        route_type = t.group(1).strip()
                elif '**Перепад высот:**' in ls:
                    h = re.search(r'\*\*Перепад высот:\*\*\s*(.+)', ls)
                    if h:
                        height_info = h.group(1).strip()
                elif '**Протяжённость:**' in ls:
                    l = re.search(r'\*\*Протяжённость:\*\*\s*(.+)', ls)
                    if l:
                        length_info = l.group(1).strip()
                elif '**Первопроход' in ls:
                    fa = re.search(r'\*\*Первопроход.*?\*\*\s*:?\s*(.+)', ls)
                    if fa:
                        first_ascent = fa.group(1).strip().rstrip('.')
                elif not ls.startswith('**') and ls:
                    # Include all non-metadata lines as description body
                    body_lines.append(ls.lstrip('- '))

            if category_str is None:
                category_str = extract_grade_str(route_header)

            # Build extra header info
            extra_parts = []
            if height_info:
                extra_parts.append(f'Перепад высот: {height_info}')
            if length_info:
                extra_parts.append(f'Протяжённость: {length_info}')

            header = build_header(category_str, route_type, peak_display, first_ascent)
            if extra_parts:
                header += ' ' + '. '.join(extra_parts) + '.'

            # Full body text
            body = clean_md('\n'.join(body_lines)) if body_lines else None
            # Remove "В путеводителе описание отсутствует" placeholder
            if body and 'отсутствует' in body:
                body = None

            description = join_description(header, body)

            routes.append({
                'id': stable_uuid(mountain_id + '/' + route_name + '/' + (category_str or '')),
                'mountain_id': mountain_id,
                'name': route_name[:200],
                'difficulty': grade_to_difficulty(category_str),
                'season': season,
                'description': description,
            })

    return mountains, routes


def parse_uzunkol(filepath, region='Узункол, Карачаево-Черкесия',
                  country='Россия', season='Июль — сентябрь'):
    """Parse uzunkol_routes.md — '### №N — Name, Grade (Author, year)' format."""
    mountains = []
    routes = []

    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    for block in re.split(r'\n## Вершина:', content)[1:]:
        lines = block.strip().split('\n')
        first_line = lines[0].strip()

        m = re.match(r'^([^(]+)\((\d+)\s*м\)', first_line)
        if m:
            mountain_name = m.group(1).strip()
            height = int(m.group(2))
        else:
            m2 = re.match(r'^([^\n(—]+)', first_line)
            if not m2:
                continue
            mountain_name = m2.group(1).strip()
            height = 0

        peak_display = mountain_name
        mountain_id = stable_uuid(mountain_name)
        mountains.append({'id': mountain_id, 'name': mountain_name,
                          'height': height, 'region': region, 'country': country})

        # Split on "### №N —" or "### Маршрут —"
        for rs in re.split(r'\n### (?:№\d+|Маршрут)\s*[—–]?\s*', block)[1:]:
            rs_lines = rs.strip().split('\n')
            header = rs_lines[0].strip()

            grade_str = extract_grade_str(header)

            # First ascent in trailing parentheses: "(П.Захаров, 1960)"
            fa_match = re.search(r'\(([^)]+(?:,\s*\d{4})?)\)\s*$', header)
            first_ascent = fa_match.group(1).strip() if fa_match else None

            # Route name: strip grade and first_ascent from header
            route_name = header
            if grade_str and grade_str in header:
                route_name = re.sub(r',?\s*' + re.escape(grade_str) + r'.*$', '', header).strip()
            elif fa_match:
                route_name = header[:fa_match.start()].strip().rstrip(',')

            # Extract **Категория:** / **Тип:** metadata and body
            category_str_meta = None
            route_type = None
            body_lines = []

            for line in rs_lines[1:]:
                ls = line.strip()
                if '**Категория:**' in ls:
                    cat = re.search(r'\*\*Категория:\*\*\s*(.+)', ls)
                    if cat:
                        category_str_meta = extract_grade_str(cat.group(1))
                elif '**Тип:**' in ls:
                    t = re.search(r'\*\*Тип:\*\*\s*(.+)', ls)
                    if t:
                        route_type = t.group(1).strip()
                elif ls and not ls.startswith('|') and '---' not in ls:
                    body_lines.append(ls.lstrip('- '))

            final_grade = category_str_meta or grade_str
            header_str = build_header(final_grade, route_type, peak_display, first_ascent)
            body = clean_md('\n'.join(body_lines)) if body_lines else None
            description = join_description(header_str, body)

            if route_name:
                routes.append({
                    'id': stable_uuid(mountain_id + '/' + route_name + '/' + (final_grade or '')),
                    'mountain_id': mountain_id,
                    'name': route_name[:200],
                    'difficulty': grade_to_difficulty(final_grade),
                    'season': season,
                    'description': description,
                })

    return mountains, routes


FRENCH_TO_DIFFICULTY = {
    '5a': 1, '5b': 1, '5c': 2,
    '6a': 2, '6b': 3, '6c': 3,
    '7a': 4, '7b': 4, '7c': 5,
    '8a': 5, '8b': 5, '8c': 5,
}

def normalize_surname(s: str) -> str:
    """Reduce a Russian surname to a stem for matching across grammatical cases.

    Handles:
      masculine genitive: Козорезова → Козорезов  (strip 'а')
      feminine genitive:  Мавринской → мавринск   (strip 'ой')
      feminine nominative: Мавринская → мавринск  (strip 'ая')
      adjective surnames: Донского → Донск        (strip 'ого')
    """
    s = s.lower().strip()
    # Order matters: longer endings first
    for ending in ('ского', 'ской', 'ская', 'ского', 'ский', 'ной', 'ная', 'ой', 'ей', 'ая'):
        if s.endswith(ending) and len(s) - len(ending) >= 4:
            return s[:-len(ending)]
    # Masculine genitive: strip single trailing 'а' (Козорезова→Козорезов)
    if s.endswith('а') and len(s) > 4:
        return s[:-1]
    return s


def french_to_difficulty(text):
    """Map French/UIAA sport climbing grade to 1-5."""
    m = re.search(r'(\d[a-c]\+?)', text.lower())
    if m:
        base = m.group(1)[:2]
        return FRENCH_TO_DIFFICULTY.get(base)
    return None


def parse_ingushetia(filepath, region='Ингушетия', country='Россия',
                     season='Осень — начало зимы'):
    """Parse ingushetia_routes.md — tables + detailed descriptions + Kavdolomit sport routes."""
    mountains = []
    routes = []

    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    # ── Step 1: parse detailed descriptions from Part 4 ──────────────────────
    # Format: "### Mountain, route AuthorSurname, Grade"
    # Indexed by (mountain_lower, grade_str, surname_lower) -> detail text
    detail_map = {}
    part4_match = re.search(r'## Часть 4.*', content)
    if part4_match:
        part4 = content[part4_match.start():]
        for block in re.split(r'\n### ', part4)[1:]:
            block_lines = block.strip().split('\n')
            header = block_lines[0].strip()

            # "Цей-Лоам, маршрут Козорезова, 1Б"
            hm = re.match(r'^([^,]+),\s*маршрут\s+(\S+),\s*(.+)$', header)
            if not hm:
                continue
            mtn_name = hm.group(1).strip().lower()
            surname = normalize_surname(hm.group(2).strip())
            grade_str = extract_grade_str(hm.group(3))

            detail_lines = [l.lstrip('- ').strip() for l in block_lines[1:]
                            if l.strip() and not l.strip().startswith('#')]
            detail_text = clean_md('\n'.join(detail_lines))

            key = (mtn_name, grade_str, surname)
            detail_map[key] = detail_text

    # ── Step 2: parse alpine route tables (Parts 1 & 2) ─────────────────────
    # Stop before Part 3 (Кавдоломит) and Part 4 (detailed descriptions)
    part1_end = re.search(r'\n## Часть 3', content)
    alpine_content = content[:part1_end.start()] if part1_end else content

    for block in re.split(r'\n### Вершина:', alpine_content)[1:]:
        lines = block.strip().split('\n')
        first_line = lines[0].strip()

        height_m = re.search(r'(\d{3,4})\s*м', first_line)
        height = int(height_m.group(1)) if height_m else 0
        mountain_name = re.sub(r'\s*[\(,].*', '', first_line).strip()
        if not mountain_name:
            continue

        peak_display = mountain_name.split(' (')[0].strip()
        mountain_id = stable_uuid(mountain_name)
        mountains.append({'id': mountain_id, 'name': mountain_name,
                          'height': height, 'region': region, 'country': country})

        for line in lines[1:]:
            if not line.strip().startswith('|'):
                continue
            cols = [c.strip() for c in line.strip().strip('|').split('|')]
            if len(cols) < 3 or cols[0] in ('№', '---', '') or '---' in cols[0]:
                continue
            try:
                int(cols[0])
            except ValueError:
                continue

            # Handle two table formats:
            # Format A: | № | Маршрут | Кат. сл. | Первопроходцы, год |
            # Format B: | № | Вершина | Маршрут | Кат. сл. |
            if len(cols) >= 4 and not re.search(r'\d[АБ]', cols[1]) and re.search(r'\d[АБ]', cols[2]):
                # Format A: name in col1, grade in col2, first_ascent in col3
                route_name = cols[1].strip()
                category_text = cols[2].strip()
                first_ascent = cols[3].strip() if len(cols) > 3 else None
            elif len(cols) >= 4 and re.search(r'\d[АБ]', cols[3]):
                # Format B: peak in col1, route name in col2, grade in col3
                route_name = cols[2].strip()
                category_text = cols[3].strip()
                first_ascent = None
            else:
                route_name = cols[1].strip()
                category_text = cols[2].strip() if len(cols) > 2 else ''
                first_ascent = cols[3].strip() if len(cols) > 3 else None

            if first_ascent in ('—', '-', ''):
                first_ascent = None

            grade_str = extract_grade_str(category_text)

            # Try to find detailed description from Part 4
            detail_body = None
            if first_ascent and grade_str:
                # Extract surname from "А.Козорезов, 1984" -> "козорезов"
                surname_m = re.search(r'\b([А-ЯЁ][а-яё]+)', first_ascent)
                if surname_m:
                    surname_norm = normalize_surname(surname_m.group(1))
                    key = (peak_display.lower(), grade_str, surname_norm)
                    detail_body = detail_map.get(key)

            header_str = build_header(grade_str, None, peak_display, first_ascent)
            description = join_description(header_str, detail_body)

            if route_name:
                routes.append({
                    'id': stable_uuid(mountain_id + '/' + route_name + '/' + (grade_str or '')),
                    'mountain_id': mountain_id,
                    'name': route_name[:200],
                    'difficulty': grade_to_difficulty(grade_str),
                    'season': season,
                    'description': description,
                })

    # ── Step 3: parse Kavdolomit sport climbing routes (Part 3) ──────────────
    part3_match = re.search(r'\n## Часть 3.*', content)
    part4_start = re.search(r'\n## Часть 4.*', content)
    if part3_match:
        part3_end = part4_start.start() if part4_start else len(content)
        part3 = content[part3_match.start():part3_end]

        kavdolomit_id = stable_uuid('Кавдоломит')
        mountains.append({
            'id': kavdolomit_id,
            'name': 'Кавдоломит',
            'height': 0,
            'region': region,
            'country': country,
        })

        current_sector = None
        for line in part3.split('\n'):
            ls = line.strip()

            # Track current sector
            sector_m = re.match(r'^###\s+Сектор\s+[«"]?([^»"(]+)', ls)
            if sector_m:
                current_sector = sector_m.group(1).strip()
                continue

            if not ls.startswith('|'):
                continue
            cols = [c.strip() for c in ls.strip('|').split('|')]
            if len(cols) < 5 or '---' in cols[0] or cols[0] in ('№', ''):
                continue
            try:
                int(cols[0])
            except ValueError:
                continue

            # | № | Название | Длина | Участков | Сложность (УИАА/Фр.) | Шлямбуров | Подготовщик |
            route_name = cols[1].strip()
            length = cols[2].strip() if len(cols) > 2 else None
            pitches = cols[3].strip() if len(cols) > 3 else None
            grade_text = cols[4].strip() if len(cols) > 4 else ''
            bolts = cols[5].strip() if len(cols) > 5 else None
            preparer = cols[6].strip() if len(cols) > 6 else None

            diff = french_to_difficulty(grade_text) or grade_to_difficulty(extract_grade_str(grade_text))

            # Build description
            desc_parts = [f'Категория: {grade_text}.']
            if current_sector:
                desc_parts.append(f'Сектор: {current_sector}.')
            if preparer and preparer not in ('—', '-'):
                desc_parts.append(f'Подготовщик: {preparer}.')
            details = []
            if length and length not in ('—', '-'):
                details.append(f'Длина: {length}')
            if pitches and pitches not in ('—', '-'):
                details.append(f'Участков: {pitches}')
            if bolts and bolts not in ('—', '-'):
                details.append(f'Шлямбуров: {bolts}')
            if details:
                desc_parts.append(', '.join(details) + '.')
            description = ' '.join(desc_parts)

            if route_name:
                routes.append({
                    'id': stable_uuid(kavdolomit_id + '/' + route_name),
                    'mountain_id': kavdolomit_id,
                    'name': route_name[:200],
                    'difficulty': diff,
                    'season': season,
                    'description': description,
                })

    return mountains, routes


def parse_sokol(filepath, season='Апрель — май, сентябрь — ноябрь'):
    """Parse sokol_routes.md — full descriptions with pitch-by-pitch text."""
    mountains = []
    routes = []

    mountain_id = stable_uuid('Сокол')
    mountains.append({'id': mountain_id, 'name': 'Сокол', 'height': 474,
                      'region': 'Крым', 'country': 'Россия'})

    current_sector = None

    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    # Track sectors
    sector_map = {}  # will map route number range to sector name
    sector_blocks = re.split(r'\n## Сектор', content)

    for sb in sector_blocks[1:]:
        # Get sector name
        sb_lines = sb.strip().split('\n')
        sector_header = sb_lines[0].strip()
        sector_name_m = re.match(r'^\d+\s*[—–]\s*(.+)$', sector_header)
        sector_name = sector_name_m.group(1).strip() if sector_name_m else sector_header

        # Get intro text (before first route)
        intro_lines = []
        for line in sb_lines[1:]:
            if line.strip().startswith('### Маршрут'):
                break
            if line.strip() and not line.startswith('---'):
                intro_lines.append(line.strip())
        sector_intro = '\n'.join(intro_lines).strip()

        # Parse routes in this sector
        for rs in re.split(r'\n### Маршрут №?\d+\s*[—–]\s*', sb)[1:]:
            rs_lines = rs.strip().split('\n')
            route_title = rs_lines[0].strip()

            category_str = None
            author = None
            year = None
            pitch_lines = []
            gear_lines = []
            impression_lines = []
            current_section = None

            for line in rs_lines[1:]:
                ls = line.strip()
                if '**Категория:**' in ls:
                    cat = re.search(r'\*\*Категория:\*\*\s*(.+)', ls)
                    if cat:
                        category_str = extract_grade_str(cat.group(1))
                elif '**Автор:**' in ls:
                    a = re.search(r'\*\*Автор:\*\*\s*(.+)', ls)
                    if a and a.group(1).strip() not in ('—', '-'):
                        author = a.group(1).strip()
                elif '**Год:**' in ls:
                    y = re.search(r'\*\*Год:\*\*\s*(.+)', ls)
                    if y and y.group(1).strip() not in ('—', '-'):
                        year = y.group(1).strip()
                elif '**Описание по верёвкам:**' in ls or '**Описание:**' in ls:
                    current_section = 'pitch'
                elif '**Снаряжение:**' in ls:
                    gear_m = re.search(r'\*\*Снаряжение:\*\*\s*(.+)', ls)
                    if gear_m and gear_m.group(1).strip():
                        gear_lines.append(gear_m.group(1).strip())
                    current_section = 'gear'
                elif '**Впечатление:**' in ls or '**Подходы:**' in ls or '**Спуск:**' in ls:
                    imp_m = re.search(r'\*\*(?:Впечатление|Подходы|Спуск):\*\*\s*(.+)', ls)
                    section_name = re.search(r'\*\*(\w+):\*\*', ls)
                    label = section_name.group(1) if section_name else ''
                    if imp_m and imp_m.group(1).strip():
                        impression_lines.append(f'{label}: {imp_m.group(1).strip()}')
                    current_section = 'impression'
                elif ls and current_section == 'pitch':
                    pitch_lines.append(ls.lstrip('- '))
                elif ls and current_section == 'gear':
                    gear_lines.append(ls.lstrip('- '))
                elif ls and current_section == 'impression':
                    impression_lines.append(ls.lstrip('- '))

            # Build first_ascent string
            first_ascent = None
            if author and year:
                first_ascent = f'{author}, {year}'
            elif author:
                first_ascent = author
            elif year:
                first_ascent = year

            header_str = build_header(category_str, None, 'Сокол', first_ascent)
            if sector_name:
                header_str += f' Сектор: {sector_name}.'

            # Build body
            body_parts = []
            if sector_intro:
                body_parts.append(f'Подходы: {sector_intro}')
            if pitch_lines:
                body_parts.append('Описание по верёвкам:\n' + '\n'.join(pitch_lines))
            if gear_lines:
                body_parts.append('Снаряжение: ' + ' '.join(gear_lines))
            if impression_lines:
                body_parts.append('\n'.join(impression_lines))

            body = clean_md('\n\n'.join(body_parts)) if body_parts else None
            description = join_description(header_str, body)

            routes.append({
                'id': stable_uuid(mountain_id + '/' + route_title + '/' + (category_str or '')),
                'mountain_id': mountain_id,
                'name': route_title[:200],
                'difficulty': grade_to_difficulty(category_str),
                'season': season,
                'description': description,
            })

    return mountains, routes


# ─── SQL generation ──────────────────────────────────────────────────────────

def generate_sql(mountains, routes):
    lines = []
    lines.append('-- Auto-generated seed data for mountains and routes')
    lines.append('-- Regions: Ущелье Адырсу, Узункол, Ингушетия, Сокол (Крым)')
    lines.append('-- Apply in Supabase SQL Editor\n')
    lines.append("-- Remove old rows (previously had random UUIDs)")
    lines.append("DELETE FROM routes WHERE mountain_id IN (")
    lines.append("  SELECT id FROM mountains")
    lines.append("  WHERE region IN ('Ущелье Адырсу, Кабардино-Балкария', 'Узункол, Карачаево-Черкесия', 'Ингушетия', 'Крым')")
    lines.append(");")
    lines.append("DELETE FROM mountains")
    lines.append("  WHERE region IN ('Ущелье Адырсу, Кабардино-Балкария', 'Узункол, Карачаево-Черкесия', 'Ингушетия', 'Крым');\n")

    lines.append('INSERT INTO mountains (id, name, height, region, country) VALUES')
    m_vals = [
        f"  ({escape_sql(m['id'])}, {escape_sql(m['name'])}, {m['height']}, "
        f"{escape_sql(m['region'])}, {escape_sql(m['country'])})"
        for m in mountains
    ]
    lines.append(',\n'.join(m_vals) + '\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, height = EXCLUDED.height;\n')

    # Deduplicate routes by id, keeping the one with the longest description
    seen_ids: dict = {}
    for r in routes:
        rid = r['id']
        if rid not in seen_ids or len(r.get('description') or '') > len(seen_ids[rid].get('description') or ''):
            seen_ids[rid] = r
    routes = list(seen_ids.values())

    lines.append('INSERT INTO routes (id, mountain_id, name, difficulty, season, description) VALUES')
    r_vals = [
        f"  ({escape_sql(r['id'])}, {escape_sql(r['mountain_id'])}, {escape_sql(r['name'])}, "
        f"{str(r['difficulty']) if r['difficulty'] is not None else 'NULL'}, "
        f"{escape_sql(r['season'])}, {escape_sql(r['description'])})"
        for r in routes
    ]
    lines.append(',\n'.join(r_vals) + '\nON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, difficulty = EXCLUDED.difficulty, season = EXCLUDED.season;\n')

    return '\n'.join(lines)


if __name__ == '__main__':
    all_mountains = []
    all_routes = []

    m, r = parse_adyrsu(f'{DOCS}/adyrsu_routes.md')
    all_mountains += m; all_routes += r

    m, r = parse_uzunkol(f'{DOCS}/uzunkol_routes.md')
    all_mountains += m; all_routes += r

    m, r = parse_ingushetia(f'{DOCS}/ingushetia_routes.md')
    all_mountains += m; all_routes += r

    m, r = parse_sokol(f'{DOCS}/sokol_routes.md')
    all_mountains += m; all_routes += r

    sql = generate_sql(all_mountains, all_routes)
    out = f'{DOCS}/seed_mountains_routes.sql'
    with open(out, 'w', encoding='utf-8') as f:
        f.write(sql)

    print(f'✓ Generated {out}')
    print(f'  Mountains: {len(all_mountains)}')
    print(f'  Routes:    {len(all_routes)}')

    # Sample descriptions to verify quality
    print('\nSample descriptions:')
    samples = [r for r in all_routes if r['description'] and len(r['description']) > 200][:4]
    for r in samples:
        print(f'\n  [{r["name"][:60]}]')
        print(f'  {r["description"][:300]}...')
