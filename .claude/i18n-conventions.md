# i18n Conventions for 301.st

**Дата создания:** 2025-12-13

Правила интернационализации для проекта 301.st

---

## 🌍 Общая философия

**Два независимых слоя переводов:**

1. **UI Interface** (интерфейс) - кнопки, меню, формы, уведомления
2. **Content Pages** (контент) - About, Privacy, Terms, Security, Docs

**Важно:** Эти слои НЕ пересекаются и живут отдельно!

---

## 📋 Конвенция по ключам i18n

### Структура ключей:

```
layout.nav.home              # Navigation items
layout.footer.about          # Footer links
layout.lang.en               # Language names

auth.login                   # Auth actions
auth.messages.loginSuccess   # Auth messages
auth.errors.invalidEmail     # Auth errors

cf.wizard.title              # Cloudflare wizard
cf.wizard.tokenLabel         # Form labels

notice.close                 # Notifications
```

### Правила именования:

1. **Префикс** = раздел/контекст (`layout`, `auth`, `cf`, `notice`)
2. **Категория** = тип элемента (`nav`, `footer`, `messages`, `errors`)
3. **Ключ** = описание элемента (`home`, `loginSuccess`, `invalidEmail`)

**Примеры:**
```typescript
// ✅ Good
layout.nav.integrations
auth.errors.invalidCredentials
cf.wizard.accountIdPlaceholder

// ❌ Bad
integrations                 // Нет контекста
auth_error_invalid           // Неправильный разделитель
cloudflareWizardTitle        // camelCase вместо dot notation
```

---

## 🎨 Использование в верстке

### 1. Короткие тексты (UI элементы)

**Используй:** `data-i18n`

```html
<!-- Кнопки -->
<button data-i18n="auth.login">Login</button>
<a href="/about" data-i18n="layout.footer.about">About</a>

<!-- Навигация -->
<a href="/" data-i18n="layout.nav.home">Home</a>

<!-- Labels -->
<label data-i18n="auth.form.email">Email</label>
```

**Правило:** Одна строка текста, без HTML внутри.

### 2. Длинные тексты с HTML (подсказки, help-панели)

**Используй:** `data-i18n-html`

```html
<!-- Help panels -->
<div class="panel panel--info" data-i18n-html="cf.wizard.help.manualToken">
  <p>Go to <strong>My Profile → API Tokens</strong>...</p>
</div>

<!-- Tooltips -->
<p class="field-hint" data-i18n-html="cf.wizard.tokenHint">
  Created as <code>301st Bootstrap</code> with...
</p>
```

**Правило:** Многострочный текст, может содержать HTML теги (`<strong>`, `<code>`, `<em>`).

### 3. Атрибуты (aria-label, placeholder, title)

**Используй:** `data-i18n-aria`, `data-i18n-placeholder`, `data-i18n-title`

```html
<!-- aria-label -->
<button aria-label="Close" data-i18n-aria="notice.close">
  <span class="icon" data-icon="mono/close"></span>
</button>

<!-- placeholder -->
<input
  type="email"
  placeholder="your-email@example.com"
  data-i18n-placeholder="auth.form.emailPlaceholder"
/>

<!-- title -->
<a href="/docs" title="Documentation" data-i18n-title="layout.nav.docs">
  <span class="icon" data-icon="mono/help-circle"></span>
</a>
```

**Правило:** Атрибуты для accessibility и UX подсказок.

---

## 📄 Content Pages (About, Privacy, Terms, Security, Docs)

### Текущее состояние:

- ✅ Страницы созданы **только на английском**
- ✅ **НЕ используют** `data-i18n` атрибуты
- ✅ Живут как **статический контент**

### Почему не i18n сейчас?

1. **Объем контента:** Правовые документы = 200-500 строк текста на страницу
2. **Редкие обновления:** Terms/Privacy меняются раз в год, не каждый спринт
3. **SEO:** Статические HTML страницы лучше индексируются
4. **Разделение ответственности:** UI переводы ≠ юридические тексты

### Когда добавлять переводы контента?

**Сейчас НЕ делаем!** Откладываем на отдельный task.

**Будущий подход (когда понадобится):**

#### Вариант 1: Отдельные HTML файлы

```
about.html         (EN default)
about.ru.html      (RU version)
about.de.html      (DE version)
```

**Плюсы:**
- Простота
- SEO-friendly URLs (`/about`, `/ru/about`, `/de/about`)
- Каждый файл можно редактировать независимо

**Минусы:**
- Дублирование структуры
- Нужно синхронизировать изменения

#### Вариант 2: Markdown + build-time рендеринг

```
content/
├── en/
│   ├── about.md
│   ├── privacy.md
│   └── terms.md
├── ru/
│   ├── about.md
│   ├── privacy.md
│   └── terms.md
```

**Плюсы:**
- Markdown проще редактировать
- Единая структура через шаблоны
- Можно добавить CMS (Notion, Contentful)

**Минусы:**
- Нужен build step
- Сложнее для быстрых правок

#### Вариант 3: Hybrid (рекомендуется для будущего)

```html
<!-- about.html -->
<main data-content-lang="en">
  {{> content/about-en}}   <!-- Handlebars partial с контентом -->
</main>

<!-- about.ru.html -->
<main data-content-lang="ru">
  {{> content/about-ru}}   <!-- Русская версия контента -->
</main>
```

**Плюсы:**
- Общая структура (header, footer, layout)
- Контент в отдельных partials
- Легко добавлять языки

**Решение:** Обсудить когда появится реальная потребность (2+ языка контента).

---

## 🛠 Текущая реализация i18n

### Файлы:

```
src/i18n/
├── index.ts           # Экспорт t(), setLanguage()
├── dom.ts             # Применение переводов к DOM
├── helpers.ts         # Вспомогательные функции
└── locales/
    ├── en.ts          # English translations
    └── ru.ts          # Russian translations
```

### Как работает:

```typescript
// 1. Импорт
import { t, setLanguage } from '@i18n';

// 2. Получение перевода
const text = t('auth.login'); // "Login" или "Войти"

// 3. Смена языка
setLanguage('ru');  // Переключает на русский
setLanguage('en');  // Переключает на английский

// 4. Применение к DOM (автоматически)
// При загрузке страницы и при смене языка:
// - data-i18n → textContent
// - data-i18n-html → innerHTML
// - data-i18n-aria → aria-label
// - data-i18n-placeholder → placeholder
```

### Language Switcher (уже есть):

```html
<!-- partials/header-top.hbs -->
<nav class="btn-chip-group lang-switcher">
  <button class="btn-chip is-active" data-lang="en">EN</button>
  <button class="btn-chip" data-lang="ru">RU</button>
</nav>
```

**JavaScript:**
```typescript
// src/main.ts
document.querySelectorAll('[data-lang]').forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.getAttribute('data-lang');
    setLanguage(lang);  // Автоматически обновляет весь UI
  });
});
```

---

## ✅ Чек-лист перед добавлением нового UI

### Для интерфейсных элементов:

- [ ] Добавил ключи в `src/i18n/locales/en.ts`
- [ ] Добавил ключи в `src/i18n/locales/ru.ts`
- [ ] В HTML использовал `data-i18n` для коротких текстов
- [ ] В HTML использовал `data-i18n-html` для текстов с HTML
- [ ] Проверил, что переключение языка работает

### Для контентных страниц (About, Terms, etc):

- [ ] **НЕ использую** `data-i18n` атрибуты
- [ ] Страница написана на английском (default)
- [ ] Если нужен перевод контента - создаю отдельный task
- [ ] **НЕ смешиваю** UI переводы и контентные переводы

---

## 🚨 Частые ошибки

### ❌ Ошибка 1: Хардкод текста в UI

```html
<!-- Плохо -->
<button>Login</button>
<a href="/about">About</a>

<!-- Хорошо -->
<button data-i18n="auth.login">Login</button>
<a href="/about" data-i18n="layout.footer.about">About</a>
```

### ❌ Ошибка 2: data-i18n для длинного HTML

```html
<!-- Плохо -->
<div data-i18n="cf.wizard.help">
  Go to <strong>Profile</strong>...
</div>

<!-- Хорошо -->
<div data-i18n-html="cf.wizard.help">
  Go to <strong>Profile</strong>...
</div>
```

### ❌ Ошибка 3: data-i18n на контентных страницах

```html
<!-- about.html - Плохо -->
<h1 data-i18n="about.title">About 301.st</h1>
<p data-i18n="about.philosophy">
  301.st is a conductor of integrations...
</p>

<!-- about.html - Хорошо -->
<h1>About 301.st</h1>
<p>
  301.st is a conductor of integrations...
</p>
```

**Почему плохо?** Контентные страницы = статический контент, не UI.

### ❌ Ошибка 4: Неконсистентные ключи

```typescript
// Плохо
t('loginButton')
t('auth_error_invalid')
t('CloudflareWizardTitle')

// Хорошо
t('auth.login')
t('auth.errors.invalid')
t('cf.wizard.title')
```

---

## 📝 Примеры правильного использования

### Dashboard header:

```html
<nav class="breadcrumbs">
  <a href="/" data-i18n="layout.nav.home">Home</a>
  <span class="sep">›</span>
  <span data-i18n="layout.nav.dashboard">Dashboard</span>
</nav>
```

### Wizard form:

```html
<label data-i18n="cf.wizard.accountIdLabel">Cloudflare Account ID</label>
<input
  type="text"
  placeholder="e.g. 1234567890abcdef"
  data-i18n-placeholder="cf.wizard.accountIdPlaceholder"
/>
<p class="field-hint" data-i18n-html="cf.wizard.accountIdHint">
  Found in Cloudflare dashboard: <strong>Account Home → Overview</strong>
</p>
```

### Footer navigation:

```html
<a href="/integrations" class="btn-chip">
  <span class="icon" data-icon="mono/integrations"></span>
  <span data-i18n="layout.nav.integrations">Integrations</span>
</a>
```

### Mobile menu (будущее):

```html
<nav class="mobile-menu__nav">
  <a href="/integrations">
    <span class="icon" data-icon="mono/integrations"></span>
    <span data-i18n="layout.nav.integrations">Integrations</span>
  </a>
  <a href="/domains">
    <span class="icon" data-icon="mono/domains"></span>
    <span data-i18n="layout.nav.domains">Domains</span>
  </a>
</nav>
```

---

## 🔮 Будущие задачи (не сейчас!)

### Task: Multilingual Content Pages

**Когда:** После запуска, если будет реальный спрос на RU/DE/etc версии контента

**Что делать:**
1. Выбрать подход (отдельные HTML, Markdown, Hybrid)
2. Создать структуру content/
3. Настроить build или роутинг
4. Перевести контент (найти переводчиков для юридических текстов!)
5. Добавить language selector на контентные страницы

**Не смешивать** с UI переводами - это отдельная система!

---

## 📊 Текущее покрытие i18n

### ✅ Покрыто:

- Header navigation (Home, UI Style Guide)
- Language switcher (EN/RU buttons)
- Footer navigation (Integrations, Domains, etc)
- Auth forms (Login, Register, Password Reset)
- Wizard forms (Cloudflare setup)
- Notifications (success, error messages)

### ⚠️ Частично покрыто:

- Dashboard page (есть ключи, но не все тексты)
- Legal links в footer (есть ключи)

### ❌ Не покрыто (намеренно):

- About page content
- Privacy Policy content
- Terms of Service content
- Security page content
- Docs page content

**Это нормально!** Контент живет отдельно от UI.

---

## 📊 Dashboard Sections Namespace Structure

**Обновлено:** 2025-12-17

Для каждого раздела дашборда (Overview, Integrations, Projects, Domains, Sites, Streams, Redirects, Analytics) создана **единая структура namespace** с базовыми ключами.

### Стандартная структура раздела:

```typescript
{section}: {
  title: string,              // Заголовок страницы раздела
  subtitle: string,           // Описание/подзаголовок
  empty: {                    // Состояние пустого списка
    title: string,
    description: string,
    cta: string               // Call-to-action кнопка
  },
  actions: {                  // Действия (кнопки)
    create/add/connect: string,
    edit: string,
    delete: string,
    // ... специфичные действия
  },
  table: {                    // Заголовки колонок таблиц
    columns: {
      name: string,
      status: string,
      // ... колонки таблицы
    }
  },
  status: {                   // Статусы (если есть)
    active: string,
    inactive: string,
    // ...
  },
  filters: {                  // Фильтры (если есть)
    all: string,
    active: string,
    // ...
  },
  messages: {                 // Сообщения (успех, ошибки)
    created: string,
    updated: string,
    // ...
  }
}
```

### Реализованные namespace:

✅ **overview.*** - Главная страница дашборда
- `title`, `subtitle`, `welcome`

✅ **integrations.*** - Интеграции (Cloudflare, регистраторы)
- `title`, `subtitle`, `empty`, `actions`, `table.columns`, `status`

✅ **projects.*** - Проекты (группировка доменов)
- `title`, `subtitle`, `empty`, `actions`, `table.columns`

✅ **domains.*** - Управление доменами
- `title`, `subtitle`, `empty`, `actions`, `table.columns`, `status`

✅ **sites.*** - Лендинги и whitelist
- `title`, `subtitle`, `empty`, `actions`, `table.columns`

✅ **streams.*** - TDS потоки трафика
- `title`, `subtitle`, `empty`, `actions`, `table.columns`

✅ **redirects.*** - Правила редиректов
- `title`, `subtitle`, `empty`, `actions`, `table.columns`

✅ **analytics.*** - Аналитика и метрики
- `title`, `subtitle`, `empty`, `filters`, `metrics`

### Примеры использования:

```html
<!-- Page title -->
<h1 data-i18n="integrations.title">Integrations</h1>
<p data-i18n="integrations.subtitle">Connect your Cloudflare accounts...</p>

<!-- Empty state -->
<div class="empty-state">
  <h3 data-i18n="integrations.empty.title">No integrations yet</h3>
  <p data-i18n="integrations.empty.description">Connect your first...</p>
  <button data-i18n="integrations.empty.cta">Connect integration</button>
</div>

<!-- Action buttons -->
<button data-i18n="integrations.actions.connect">Connect</button>
<button data-i18n="integrations.actions.disconnect">Disconnect</button>

<!-- Table headers -->
<th data-i18n="integrations.table.columns.provider">Provider</th>
<th data-i18n="integrations.table.columns.status">Status</th>

<!-- Status badges -->
<span class="badge" data-i18n="integrations.status.active">Active</span>
```

### Преимущества этой структуры:

1. **Масштабируемость** - легко добавлять новые ключи для каждого раздела
2. **Изолированность** - изменения в одном разделе не влияют на другие
3. **Консистентность** - единый паттерн для всех разделов
4. **Читаемость** - понятно, где искать нужный ключ
5. **TypeScript safety** - полная типизация через `Translation` type

### Добавление нового раздела:

1. Добавить namespace в `src/i18n/locales/en.ts`
2. Добавить переводы в `src/i18n/locales/ru.ts`
3. Использовать в HTML через `data-i18n="{section}.{category}.{key}"`
4. TypeScript автоматически подхватит новые ключи

---

## 🎯 Action Items

### ✅ Выполнено (2025-12-17):

- [x] Добавить i18n ключи для новых UI элементов (sidebar navigation)
- [x] Использовать `data-i18n` для всех navigation items в sidebar
- [x] Создать namespace структуру для всех разделов дашборда
- [x] Добавить базовые ключи для: overview, integrations, projects, domains, sites, streams, redirects, analytics
- [x] Обновить sidebar.hbs с data-i18n атрибутами
- [x] Проверить TypeScript компиляцию и типизацию
- [x] Обновить документацию с новой структурой

### Потом (когда будут реализовываться страницы):

- [ ] Добавить специфичные ключи для форм в каждом разделе
- [ ] Добавить messages (success/error) для каждого раздела
- [ ] Расширить table.columns при необходимости

### Когда-нибудь (если понадобится):

- [ ] Multilingual content pages (RU/DE/etc)
- [ ] CMS интеграция для контента
- [ ] Автоматические переводы (DeepL API?)

---

**Главное правило:** UI интерфейс всегда переводим, контентные страницы - когда понадобится!
