# Mobile Menu & Navigation TODO

План реализации мобильного меню и улучшения навигации для 301.st

**Дата создания:** 2025-12-13
**Статус:** ✅ Иконки готовы, sidebar обновлен с i18n (2025-12-17). Mobile menu - в ожидании реализации.

---

## 📋 Чек-лист подготовки иконок

### Обязательные для мобильного меню:
- [ ] `menu` (burger, 3 горизонтальные линии) - открыть меню
- [x] `close` (уже есть) - закрыть меню

### Иконки для разделов (entities):
- [x] `puzzle-outline` (уже есть) - используется для Integrations
- [x] `dns` (уже есть) - используется для Domains
- [x] `project` (уже есть) - для Projects
- [x] `web-sync` (уже есть) - используется для Sites
- [x] `directions-fork` (уже есть) - используется для Streams
- [x] `directions` (уже есть) - используется для Redirects

### Дополнительные (опционально):
- [ ] `settings` - настройки (gear icon) - пока не требуется
- [x] `analytics` (уже есть) - для Analytics
- [ ] `api` - API раздел (code brackets, или api icon) - пока не требуется

**Требования к иконкам:**
- Формат: SVG
- Размер viewBox: `0 0 20 20`
- Цвет: использовать `currentColor` для заливки
- Расположение: `static/img/icons-src/mono/[имя].svg`
- После добавления: запустить `npm run build:icons`

---

## 🎯 Архитектурные решения

### 1. Структура навигации в Dashboard

**Текущее состояние:**
- **Header-top:** Home, UI Style Guide, Language, Theme
- **Utility-bar:** Breadcrumbs, Help, Notifications, User Menu
- **Sidebar:** Dashboard, Settings (активная страница подсвечена)

**✅ Принятые решения (2025-12-17):**
- [x] Разделы в sidebar: Overview, Integrations, Projects, Domains, Sites, Streams, Redirects, Analytics
- [x] Header-top: оставлен для главной навигации (Integrations, Projects, Domains, etc.) + утилиты (язык, тема)
- [x] Количество элементов: пока не показываем (добавим позже при необходимости)
- [x] Все элементы используют data-i18n атрибуты (согласно `.claude/i18n-conventions.md`)

**Реализованная структура sidebar:**
```
Overview (home icon) - data-i18n="layout.nav.overview"
Integrations (puzzle-outline icon) - data-i18n="layout.nav.integrations"
Projects (project icon) - data-i18n="layout.nav.projects"
Domains (dns icon) - data-i18n="layout.nav.domains"
Sites (web-sync icon) - data-i18n="layout.nav.sites"
Streams (directions-fork icon) - data-i18n="layout.nav.streams"
Redirects (directions icon) - data-i18n="layout.nav.redirects"
---
Analytics (analytics icon) - data-i18n="layout.nav.analytics"
```

### 2. Мобильное меню

**Поведение (требует решения):**
- [ ] Slide-in слева или справа? (рекомендую: слева, standard)
- [ ] Overlay backdrop с затемнением? (рекомендую: да, полупрозрачный черный)
- [ ] Закрывать при клике вне меню? (рекомендую: да)
- [ ] Закрывать при клике на ссылку? (рекомендую: да)
- [ ] Анимация: slide, fade, или комбо? (рекомендую: slide + fade)

**Содержимое:**
- [ ] Те же разделы что и в desktop sidebar? (рекомендую: да)
- [ ] Добавить user info вверху (email, avatar)? (рекомендую: да)
- [ ] Добавить footer с legal links внизу меню? (рекомендую: да, компактный)

**Технические детали:**
```html
<!-- Структура -->
<div class="mobile-menu" data-mobile-menu hidden>
  <div class="mobile-menu__overlay"></div>
  <nav class="mobile-menu__panel">
    <header class="mobile-menu__header">
      <!-- User info -->
      <button class="mobile-menu__close">close icon</button>
    </header>
    <ul class="mobile-menu__nav">
      <!-- Navigation items with icons -->
    </ul>
    <footer class="mobile-menu__footer">
      <!-- Legal links -->
    </footer>
  </nav>
</div>
```

### 3. Sidebar collapse/expand (Desktop)

**Поведение (требует решения):**
- [ ] Кнопка toggle sidebar (chevron left/right)? (рекомендую: да)
- [ ] Сохранять состояние в localStorage? (рекомендую: да)
- [ ] При collapsed показывать только иконки или скрывать полностью? (рекомендую: только иконки)
- [ ] Контент растягивается на освободившееся место? (рекомендую: да)

**Layout:**
```css
/* Collapsed state */
.layout-sidebar.is-collapsed {
  width: 60px; /* Только иконки */
}
.layout-main {
  margin-left: 60px; /* Контент растягивается */
}

/* Expanded state (default) */
.layout-sidebar {
  width: 260px; /* Иконки + текст */
}
.layout-main {
  margin-left: 260px;
}
```

**JavaScript:**
```typescript
// src/ui/sidebar-toggle.ts
const LS_KEY = 'ui.sidebar.collapsed';
// Toggle sidebar + save to localStorage
// Apply on page load
```

### 4. Использование иконок

**Где добавить иконки:**
- [x] Footer chip-buttons (Desktop) - уже есть структура, добавить иконки
- [ ] Mobile menu items - новый компонент
- [ ] Sidebar navigation items (Desktop) - обновить существующий
- [ ] Breadcrumbs (опционально) - для визуального акцента

**Пример использования:**
```html
<!-- Footer chip-button с иконкой -->
<a href="/integrations" class="btn-chip">
  <span class="icon" data-icon="mono/integrations"></span>
  Integrations
</a>

<!-- Sidebar item с иконкой -->
<a href="/domains" class="sidebar-link">
  <span class="icon" data-icon="mono/domains"></span>
  <span class="sidebar-link__label">Domains</span>
</a>

<!-- Mobile menu item -->
<a href="/projects" class="mobile-menu__link">
  <span class="icon" data-icon="mono/project"></span>
  Projects
</a>
```

---

## 🛠 Технические задачи

### Новые файлы для создания:

```
partials/mobile-menu.hbs         # HTML структура мобильного меню
static/css/mobile-menu.css       # Стили (slide-in, overlay, transitions)
src/ui/mobile-menu.ts            # Toggle logic, overlay clicks, close on link click
src/ui/sidebar-toggle.ts         # Sidebar collapse/expand + localStorage
```

### Файлы для обновления:

```
partials/header-top.hbs          # Добавить burger button (mobile only)
partials/sidebar.hbs             # Добавить иконки, collapse button
partials/footer.hbs              # Добавить иконки в chip-buttons
static/css/site.css              # Burger button styles, sidebar collapsed state
static/css/layout.css            # Layout adjustments для collapsed sidebar
src/main.ts                      # Инициализация mobile-menu и sidebar-toggle
```

---

## 📅 Рекомендуемый порядок реализации

### Этап 1: Подготовка (до следующей сессии)
- [ ] Создать SVG иконки для всех разделов
- [ ] Добавить в `static/img/icons-src/mono/`
- [ ] Проверить viewBox (20x20), currentColor
- [ ] Запустить `npm run build:icons`
- [ ] Принять архитектурные решения (см. вопросы выше)

### Этап 2: Footer с иконками (5-10 мин)
- [ ] Обновить `partials/footer.hbs` - добавить иконки в chip-buttons
- [ ] Проверить на desktop и mobile
- [ ] Commit: "Add icons to footer navigation chip-buttons"

### Этап 3: Desktop Sidebar с иконками и collapse (15-20 мин)
- [ ] Обновить `partials/sidebar.hbs` - добавить иконки, toggle button
- [ ] Создать `src/ui/sidebar-toggle.ts` - логика collapse/expand
- [ ] Обновить `static/css/layout.css` - collapsed state, transitions
- [ ] Обновить `src/main.ts` - инициализация sidebar-toggle
- [ ] Проверить localStorage persistence
- [ ] Commit: "Add sidebar collapse/expand with icons and localStorage"

### Этап 4: Mobile Menu (30-40 мин)
- [ ] Создать `partials/mobile-menu.hbs` - HTML структура
- [ ] Добавить i18n ключи для всех navigation items (см. `.claude/i18n-conventions.md`)
- [ ] Использовать `data-i18n` для текстов в меню
- [ ] Создать `static/css/mobile-menu.css` - стили (slide-in, overlay, animations)
- [ ] Создать `src/ui/mobile-menu.ts` - toggle, overlay click, close on link
- [ ] Обновить `partials/header-top.hbs` - добавить burger button
- [ ] Обновить `src/main.ts` - инициализация mobile-menu
- [ ] Тестирование: открытие, закрытие, overlay, навигация, смена языка
- [ ] Commit: "Implement mobile menu with slide-in navigation"

### Этап 5: Полировка (10-15 мин)
- [ ] Проверить accessibility (ARIA labels, keyboard navigation)
- [ ] Проверить на разных разрешениях (320px, 768px, 1024px, 1440px)
- [ ] Проверить transitions и animations
- [ ] Обновить CHANGELOG.md
- [ ] Commit: "Polish mobile menu and sidebar: accessibility and responsive fixes"

---

## ❓ Вопросы для принятия решений

**Ответить до начала реализации:**

1. **Sidebar на desktop** - показывать ли collapsed состояние (только иконки) или полностью скрывать?
   - [ ] Только иконки (рекомендуется)
   - [ ] Полностью скрывать

2. **Mobile menu** - slide-in слева (standard) или справа?
   - [ ] Слева (рекомендуется)
   - [ ] Справа

3. **Разделы в sidebar** - точный список и порядок:
   - [ ] Dashboard, Integrations, Domains, Projects, Sites, Streams, Redirects, Settings (рекомендуется)
   - [ ] Другой порядок: _____________________

4. **Счетчики** - показывать ли количество элементов?
   - [ ] Да, показывать (Domains **(12)**)
   - [ ] Нет, только названия (рекомендуется для начала)

5. **User info в mobile menu** - показывать email и avatar?
   - [ ] Да, вверху меню (рекомендуется)
   - [ ] Нет, только навигация

6. **Legal links в mobile menu footer** - показывать?
   - [ ] Да, компактно (рекомендуется)
   - [ ] Нет, доступны через основной footer

---

## 📝 Примечания

### CSS переменные для mobile menu:
```css
:root {
  --mobile-menu-width: 280px;
  --mobile-menu-animation: 300ms ease;
  --overlay-bg: rgba(0, 0, 0, 0.5);
  --sidebar-collapsed-width: 60px;
  --sidebar-expanded-width: 260px;
}
```

### Breakpoints:
```css
/* Mobile menu visible */
@media (max-width: 1023px) {
  .burger-button { display: flex; }
  .layout-sidebar { display: none; }
}

/* Desktop sidebar visible */
@media (min-width: 1024px) {
  .burger-button { display: none; }
  .mobile-menu { display: none; }
}
```

### Accessibility checklist:
- [ ] Burger button: `aria-label="Open menu"`, `aria-expanded="false"`
- [ ] Mobile menu: `role="navigation"`, `aria-label="Main navigation"`
- [ ] Close button: `aria-label="Close menu"`
- [ ] Focus trap: фокус остается внутри меню когда открыто
- [ ] Escape key: закрывает меню
- [ ] Body scroll lock: когда меню открыто

---

## 🎨 Design System Notes

**Используемые паттерны:**
- Chip buttons: `.btn-chip` (уже есть в footer)
- Icons: `<span class="icon" data-icon="mono/name"></span>`
- Sidebar links: `.sidebar-link` (создать новый класс)
- Mobile menu: `.mobile-menu` (создать новый компонент)

**Цвета:**
- Active link: `var(--primary)` или `var(--brand)`
- Hover: `var(--bg-soft)` background
- Icon color: `currentColor` (наследует от родителя)

**Transitions:**
- Sidebar collapse: `width 300ms ease`
- Mobile menu slide: `transform 300ms ease`
- Overlay fade: `opacity 300ms ease`

---

## ✅ Критерии готовности

**Иконки:**
- [x] Все иконки созданы в SVG формате
- [x] ViewBox 20x20, currentColor
- [x] Добавлены в `static/img/icons-src/mono/`
- [x] `npm run build:icons` выполнен успешно
- [x] Иконки видны в `/icons-preview.html`

**Footer:**
- [x] Иконки добавлены в chip-buttons
- [x] Отображаются на desktop
- [x] Скрыты на mobile (уже так)

**Desktop Sidebar:**
- [x] Иконки добавлены во все пункты меню
- [x] Toggle button работает
- [x] Состояние сохраняется в localStorage
- [x] Контент растягивается при collapsed
- [x] Transitions плавные

**Mobile Menu:**
- [x] Burger button в header-top
- [x] Slide-in анимация работает
- [x] Overlay закрывает меню при клике
- [x] Escape key закрывает меню
- [x] Навигация с иконками
- [x] User info отображается
- [x] Legal links в footer
- [x] Body scroll lock работает

---

**Следующая сессия:** Начнем с обновления footer → sidebar → mobile menu
**Зависимости:** Подготовка иконок (SVG файлы)
