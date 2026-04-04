#!/usr/bin/env python3
"""
Парсер маршрутов с сайта ФАР (alpfederation.ru).

Скачивает HTML-страницы маршрутов, извлекает данные и сопоставляет
с маршрутами из наших seed-файлов. Генерирует SQL-миграцию.

Использование:
  # Скачать маршруты из диапазона ID:
  python far_parser.py fetch --start 900 --end 1200

  # Сопоставить с нашими seed-файлами и сгенерировать SQL:
  python far_parser.py match

  # Всё вместе (скачать + сопоставить):
  python far_parser.py fetch --start 900 --end 9000 && python far_parser.py match
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Установи зависимости: pip install requests beautifulsoup4")
    sys.exit(1)

CACHE_FILE = Path(__file__).parent / "far_routes.json"
SEEDS_DIR = Path(__file__).parent.parent / "supabase" / "seed"
FAR_BASE = "https://alpfederation.ru/mountainroute"
DELAY = 0.7  # секунд между запросами


def fetch_route(far_id: int) -> dict | None:
    """Скачивает и парсит страницу маршрута с ФАР."""
    url = f"{FAR_BASE}/{far_id}/"
    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "MountaineApp/1.0 (route classifier sync)"
        })
        if resp.status_code != 200:
            return None
    except requests.RequestException:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Извлечь название вершины из h1
    h1 = soup.find("h1", class_="route-desc__title")
    peak_name = h1.get_text(strip=True) if h1 else ""

    # Извлечь данные из таблицы паспорта
    table = soup.find("table", class_="route-desc__table")
    if not table:
        return None

    data = {"far_id": far_id, "peak": peak_name, "url": url}
    rows = table.find_all("tr", class_="route-desc__row")
    for row in rows:
        cells = row.find_all("td", class_="route-desc__data")
        if len(cells) != 2:
            continue
        label = cells[0].get_text(strip=True)
        value = cells[1].get_text(strip=True)

        field_map = {
            "Регион": "region",
            "Район": "district",
            "Гора": "mountain",
            "Высота": "height",
            "Название": "route_name",
            "Номер": "number",
            "Категория трудности": "difficulty",
            "Характер": "character",
            "Год прохождения": "year",
            "Руководитель": "leader",
        }
        if label in field_map:
            data[field_map[label]] = value

    # Пропускать пустые записи
    if not data.get("route_name") and not data.get("peak"):
        return None

    return data


def fetch_range(start: int, end: int):
    """Скачивает маршруты из диапазона ID и сохраняет в кэш."""
    # Загрузить существующий кэш
    cache = {}
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
            for r in existing:
                cache[r["far_id"]] = r

    total = end - start + 1
    fetched = 0
    skipped = 0
    errors = 0

    print(f"Скачиваю маршруты {start}–{end} ({total} шт.)...")

    for far_id in range(start, end + 1):
        if far_id in cache:
            skipped += 1
            continue

        route = fetch_route(far_id)
        if route:
            cache[far_id] = route
            fetched += 1
            peak = route.get("peak", "?")
            name = route.get("route_name", "?")
            diff = route.get("difficulty", "?")
            print(f"  [{far_id}] {peak} — {name} ({diff})")
        else:
            errors += 1

        # Прогресс каждые 100
        done = far_id - start + 1
        if done % 100 == 0:
            print(f"  ... {done}/{total} ({fetched} найдено, {errors} пусто)")

        # Сохранять кэш каждые 50 маршрутов
        if done % 50 == 0:
            save_cache(cache)

        time.sleep(DELAY)

    save_cache(cache)
    print(f"\nГотово: {fetched} новых, {skipped} из кэша, {errors} пустых")
    print(f"Всего в кэше: {len(cache)} маршрутов → {CACHE_FILE}")


def save_cache(cache: dict):
    """Сохраняет кэш в JSON."""
    routes = sorted(cache.values(), key=lambda r: r["far_id"])
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(routes, f, ensure_ascii=False, indent=2)


def parse_seeds() -> list[dict]:
    """Парсит наши seed-файлы и извлекает маршруты."""
    routes = []
    seed_files = sorted(SEEDS_DIR.glob("*.sql"))

    for sf in seed_files:
        text = sf.read_text(encoding="utf-8")

        # Ищем строки вида: (mtn_id, '№NN. Название — описание', difficulty, ...)
        # или: ('uuid', 'uuid', 'Название', difficulty, ...)
        pattern = re.compile(
            r"\(\s*(?:mtn_id|'[0-9a-f-]+')\s*,\s*"
            r"(?:'[0-9a-f-]+'\s*,\s*)?"  # optional mountain_id UUID
            r"'((?:№\d+[а-яa-z]*\.\s*)?[^']+)'\s*,\s*"  # route name
            r"(\d)\s*,",  # difficulty
            re.IGNORECASE,
        )

        for m in pattern.finditer(text):
            name = m.group(1).strip()
            difficulty = int(m.group(2))

            # Извлечь номер маршрута
            num_match = re.match(r"№(\d+[а-яa-z]*)\.\s*", name)
            route_number = num_match.group(1) if num_match else None

            # Извлечь название вершины (до " — " или " по ")
            clean_name = re.sub(r"^№\d+[а-яa-z]*\.\s*", "", name)
            peak_match = re.match(r"(.+?)\s*[—–]\s*", clean_name)
            peak = peak_match.group(1).strip() if peak_match else clean_name

            routes.append({
                "name": name,
                "peak": peak,
                "number": route_number,
                "difficulty": difficulty,
                "seed_file": sf.name,
            })

    return routes


def match_routes():
    """Сопоставляет маршруты из кэша ФАР с нашими seed-файлами."""
    if not CACHE_FILE.exists():
        print("Кэш не найден. Сначала запусти: python far_parser.py fetch --start 900 --end 1200")
        sys.exit(1)

    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        far_routes = json.load(f)

    our_routes = parse_seeds()
    print(f"Загружено: {len(far_routes)} маршрутов ФАР, {len(our_routes)} наших")

    # Индексы для быстрого поиска
    our_by_number = {}
    for r in our_routes:
        if r["number"]:
            key = r["number"]
            if key not in our_by_number:
                our_by_number[key] = []
            our_by_number[key].append(r)

    matches = []
    for far in far_routes:
        far_num = far.get("number", "")
        if not far_num:
            continue

        # Убрать буквенные суффиксы для основного поиска
        base_num = re.sub(r"[а-яa-z]+$", "", far_num)

        candidates = our_by_number.get(far_num, []) or our_by_number.get(base_num, [])
        if not candidates:
            continue

        # Если один кандидат — берём его
        if len(candidates) == 1:
            match = candidates[0]
        else:
            # Несколько кандидатов — ищем по похожему названию вершины
            far_peak = far.get("peak", "").lower()
            best = None
            best_score = 0
            for c in candidates:
                our_peak = c["peak"].lower()
                # Простое совпадение по первому слову вершины
                far_words = set(re.findall(r"[а-яё]+", far_peak))
                our_words = set(re.findall(r"[а-яё]+", our_peak))
                score = len(far_words & our_words)
                if score > best_score:
                    best_score = score
                    best = c
            match = best if best_score > 0 else candidates[0]

        matches.append({
            "far_id": far["far_id"],
            "far_url": far["url"],
            "far_peak": far.get("peak", ""),
            "far_route": far.get("route_name", ""),
            "far_difficulty": far.get("difficulty", ""),
            "far_number": far_num,
            "our_name": match["name"],
            "our_peak": match["peak"],
            "our_difficulty": match["difficulty"],
        })

    print(f"\nНайдено совпадений: {len(matches)}")
    print()

    # Генерируем SQL
    sql_lines = [
        "-- Auto-generated by far_parser.py",
        f"-- {len(matches)} routes matched between ФАР and our database",
        "",
    ]

    current_peak = ""
    for m in matches:
        if m["our_peak"] != current_peak:
            current_peak = m["our_peak"]
            sql_lines.append(f"-- === {current_peak} ===")

        # Экранируем одинарные кавычки в имени
        safe_name = m["our_name"].replace("'", "''")
        sql_lines.append(
            f"UPDATE routes SET far_url = '{m['far_url']}'\n"
            f"WHERE name ILIKE '%{safe_name[:40]}%' AND far_url IS NULL;\n"
        )

    sql = "\n".join(sql_lines)
    print(sql)

    # Сохранить в файл
    out_file = Path(__file__).parent.parent / "supabase" / "migrations" / "027_far_urls_auto.sql"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"\nSQL сохранён в {out_file}")


def main():
    parser = argparse.ArgumentParser(description="Парсер маршрутов ФАР")
    sub = parser.add_subparsers(dest="command")

    fetch_cmd = sub.add_parser("fetch", help="Скачать маршруты из диапазона ID")
    fetch_cmd.add_argument("--start", type=int, default=900, help="Начальный ID (default: 900)")
    fetch_cmd.add_argument("--end", type=int, default=1200, help="Конечный ID (default: 1200)")

    sub.add_parser("match", help="Сопоставить с seed-файлами и сгенерировать SQL")

    args = parser.parse_args()

    if args.command == "fetch":
        fetch_range(args.start, args.end)
    elif args.command == "match":
        match_routes()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
