# Недостающие иконки для TDS страницы

Добавь эти 12 SVG иконок в `static/img/icons-src/mono/`:

## 📋 Список иконок (mono/)

1. **`shield-check.svg`**
   - Описание: Щит с галочкой
   - Где используется: Status badge "Shield: On"
   - Пример: Lucide `shield-check`, Heroicons `shield-check`

2. **`flask.svg`**
   - Описание: Лабораторная колба
   - Где используется: Кнопка "Test in Simulator"
   - Пример: Lucide `flask-conical`, Heroicons `beaker`

3. **`upload.svg`**
   - Описание: Стрелка вверх (upload)
   - Где используется: Кнопка "Publish"
   - Пример: Lucide `upload`, Heroicons `arrow-up-tray`

4. **`menu.svg`**
   - Описание: Три горизонтальные линии (гамбургер)
   - Где используется: Кнопка "More actions"
   - Пример: Lucide `menu`, Heroicons `bars-3`

5. **`download.svg`**
   - Описание: Стрелка вниз (download)
   - Где используется: "Export rules" в меню
   - Пример: Lucide `download`, Heroicons `arrow-down-tray`

6. **`shield.svg`**
   - Описание: Щит (без галочки)
   - Где используется: SmartShield feature icon
   - Пример: Lucide `shield`, Heroicons `shield-check` (убрать галочку)

7. **`link.svg`**
   - Описание: Звено цепи (ссылка)
   - Где используется: SmartLink feature icon
   - Пример: Lucide `link`, Heroicons `link`

8. **`trending-up.svg`**
   - Описание: График/линия вверх
   - Где используется: MAB feature icon, checklist
   - Пример: Lucide `trending-up`, Heroicons `arrow-trending-up`

9. **`plus-circle.svg`**
   - Описание: Плюс в круге
   - Где используется: Checklist "Create first rule"
   - Пример: Lucide `circle-plus`, Heroicons `plus-circle`

10. **`book-open.svg`**
    - Описание: Открытая книга
    - Где используется: Кнопка "Read Full Guide"
    - Пример: Lucide `book-open`, Heroicons `book-open`

11. **`code.svg`**
    - Описание: Теги кода `</>`
    - Где используется: Footer link "View Example Rules"
    - Пример: Lucide `code`, Heroicons `code-bracket`

12. **`x.svg`**
    - Описание: Крестик X
    - Где используется: Кнопка "Clear Filters"
    - Пример: Lucide `x`, Heroicons `x-mark`

---

## ⚠️ Исправление в коде

**Github иконка:**
В `streams.html` строка 300 нужно изменить:
```html
<!-- Было: -->
<span class="icon" data-icon="mono/github"></span>

<!-- Должно быть: -->
<span class="icon" data-icon="brand/github"></span>
```

Иконка `github.svg` уже есть в `static/img/icons-src/brand/` ✅

---

## 🔧 После добавления иконок:

1. Скопируй все 12 SVG файлов в `static/img/icons-src/mono/`
2. Запусти: `npm run build:icons`
3. Перезагрузи страницу в браузере

---

## 📦 Где взять иконки:

- **Lucide Icons**: https://lucide.dev/ (рекомендуется, MIT license)
- **Heroicons**: https://heroicons.com/ (MIT license)
- **Tabler Icons**: https://tabler.io/icons (MIT license)

Все три библиотеки — open source и бесплатные для коммерческого использования.
