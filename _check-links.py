#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка внутренних ссылок и якорей (аудит A08: «добавить автоматический тест»).
   Запуск: python3 _check-links.py — из корня сайта. Выход 1, если есть битые."""
import re, os, sys, glob

pages = sorted(glob.glob('*.html'))
pages = [p for p in pages if not p.startswith('_')]
ids = {}
for p in pages:
    s = open(p, encoding='utf-8').read()
    ids[p] = set(re.findall(r'\sid="([^"]+)"', s))

bad = []
for p in pages:
    s = open(p, encoding='utf-8').read()
    for href in re.findall(r'href="([^"]+)"', s):
        if href.startswith(('http://', 'https://', 'mailto:', 'tel:', 'data:', '#')):
            if href.startswith('#') and len(href) > 1 and href[1:] not in ids[p]:
                bad.append(f'{p}: якорь {href} — на странице нет такого id')
            continue
        target, _, anchor = href.partition('#')
        target = target or p
        if not os.path.exists(target):
            bad.append(f'{p}: файл {target} не найден (ссылка {href})')
            continue
        if anchor and anchor not in ids.get(target, set()):
            bad.append(f'{p}: якорь #{anchor} отсутствует в {target}')

print(f'страниц проверено: {len(pages)}')
if bad:
    print('БИТЫЕ ССЫЛКИ:')
    for b in bad: print(' -', b)
    sys.exit(1)
print('битых внутренних ссылок и якорей нет')
