# Robot Cursor Hero — Abzalov Lab

Интерактивный hero-блок: робот справа плавно поворачивает голову вслед за курсором, при этом корпус и руки остаются неподвижными.

## Что внутри

- Чистые HTML / CSS / JavaScript, без сборщика и зависимостей.
- Голова робота отделена от корпуса и анимируется независимо.
- Инерционное слежение за курсором через `requestAnimationFrame`.
- Touch/pointer поддержка и спокойный idle-режим без мыши.
- Адаптивная версия для планшетов и смартфонов.
- Уважает `prefers-reduced-motion`.

## Локальный запуск

Можно открыть `index.html` напрямую. Для локального сервера:

```bash
python3 -m http.server 8080
```

Затем открыть `http://localhost:8080`.

## Структура

```text
.
├── assets/
│   ├── favicon.svg
│   ├── robot-body.webp
│   └── robot-head.webp
├── index.html
├── script.js
└── styles.css
```

## GitHub Pages

Проект статический и подходит для GitHub Pages без дополнительной сборки.
