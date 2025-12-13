# Changelog

All notable changes to the 301-ui project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Mobile menu & navigation plan** (`.claude/mobile-menu-todo.md`)
  - Comprehensive roadmap for mobile menu implementation
  - Icon requirements and checklist
  - Architectural decisions documentation
  - Step-by-step implementation guide
- HTML partials system to eliminate code duplication across pages
- Custom Vite plugin for partial includes (no external dependencies)
- Reusable components: header-top, header-utility, footer, sidebar
- PR Review Bot agent for automated PR workflow (`/pr` command)
- Custom Claude agents: `pr-review-bot`, `ui-code-reviewer`
- **Auth redirect strategy** with two-level protection:
  - Worker-level: Cookie-based redirect on Cloudflare Workers edge (HTTP 307)
  - Client-side fallback: Early `<head>` script for portability to any hosting platform
  - Body opacity fade-in to prevent "flash" of login page during auth check
  - Welcome message via sessionStorage when redirecting authenticated users
- **GlobalNotice partial component** for consistent notification banners across all pages
  - Extracted from index.html into reusable `partials/global-notice.hbs`
  - Added to dashboard.html, wizard.html, and ui-style-guide.html
  - Notifications now seamlessly transfer between pages via sessionStorage
- **Panel modifiers** for semantic color-coded information boxes
  - `.panel--success` (green tint) for positive confirmations
  - `.panel--info` (blue tint) for informational notices
  - `.panel--warn` (yellow tint) for warnings and cautions
  - `.panel--danger` (red tint) for critical security warnings
- **New icon**: `mono/check-circle` for positive/confirmed items (replaces ✅ emoji)
- **Legal and info pages** with comprehensive content:
  - about.html - Project philosophy ("conductor of integrations")
  - privacy.html - Privacy Policy (GDPR/CCPA compliant)
  - terms.html - Terms of Service (clear responsibility model)
  - security.html - Security practices and responsible disclosure
  - docs.html - Documentation index and quick start guide
  - All pages added to Vite build input for proper deployment
- **Cloudflare wizard dual-path setup**:
  - Manual Token method (recommended, secure) - user creates scoped token themselves
  - Global API Key method (quick, risky) - we create scoped token and discard Global Key
  - Clear security warnings and explanations of risks for Global API Key path
  - Tab-based UI with dynamic help sections for each method
  - Balanced layout: Security Warning + educational content in right sidebar, clean form in left card
  - Improved UX flow: users read warnings while filling out form

### Changed
- **Legal and info pages cleanup**:
  - Moved "Last updated" date from header to bottom footer on Terms and Privacy pages
  - Doesn't clutter page title, consistent layout across all legal pages
  - Replaced emoji icons (✅❌) with design system icons (check-circle, close) on Terms and About pages
  - Icons now consistent with site aesthetic and work in headings (h5) and lists
- Moved `ui-style-guide.html` from `static/` to root for Vite processing
- Refactored all pages to use partials (index, dashboard, wizard, ui-style-guide)
- Header/footer changes now require editing only 1 file instead of 4+
- `worker.ts` now checks session cookies and redirects authenticated users away from login page
- **ui-style-guide.html** updated to use header-utility and footer partials for consistency
- **Footer navigation** restructured with two-level hierarchy:
  - Main navigation: Integrations, Domains, Projects, Sites, Streams, Redirects (hidden on mobile)
  - Legal/info links (secondary): About, Docs, Privacy, Terms, Security (always visible)
  - Clean URLs without .html extensions (handled by worker routing)
  - Horizontal layout with chip buttons: brand left, navigation right
  - Better use of horizontal space, balanced visual weight
- **Page layout alignment fix**: Reduced `--page-gutter-desktop` from 2rem to 1.5rem
  - All content (header, footer, main) now aligns on same vertical axis
  - More compact layout while maintaining readability
- **Utility-bar positioning** changed from relative to absolute
  - Slides out as separate overlay layer without affecting header height
  - Header becomes narrower when utility-bar collapses
  - Added 60px margin compensation for content below header

## [0.2.0] - 2025-12-12

### Added
- **Cards v2 system** with CSS variable-based architecture
  - Card types: `panel`, `soft`, `ghost`
  - Modifiers: `compact`, `accent`, `interactive`
  - Comprehensive documentation in StyleGuide.md
- **Unified control recipe** across buttons, chips, search bars, tabs
  - Consistent height formula: `font-size × line-height + padding × 2`
  - No fixed heights, all controls use CSS variables
- **Pill vs Field** border-radius system
  - Buttons/chips use `--r-pill` (999px)
  - Form inputs use `--r-field` (0.75rem)
- **Table Search Bar** canonical pattern
  - Single markup standard across all tables
  - Unified height with buttons and chips
  - Flexible layout with gap tokens
- **Ruled and Spaced Lists** helpers
  - `.list--ruled` for step-by-step instructions
  - `.list--spaced` with icon support
- **Badge system enhancements**
  - Moved eyebrow pattern to breadcrumb badges
  - Variants: `badge--success`, `badge--brand`, `badge--cf`, `badge--neutral`
- **Icon system improvements**
  - Mono icons inherit `currentColor` automatically
  - Consistent 1em sizing inside controls
  - help-circle icon for Help buttons
- **Cloudflare Setup Wizard** (bootstrap page)
  - Migrated to unified auth shell layout
  - Card anatomy with header/body/footer structure
  - Form validation and API integration ready

### Changed
- **Button styles normalized** between `<a>` and `<button>` elements
  - Added `text-decoration: none` and `line-height: 1` to `.btn-icon`
  - Visual consistency across all icon buttons
- **Help button** converted from large ghost button to compact icon button
  - Uses help-circle icon
  - Consistent sizing with notifications button
- **Badge alignment** in utility-bar breadcrumbs
  - Changed from `inline-flex` to `flex` for proper vertical centering

### Fixed
- Textarea semantic class in wizard.html (`input` → `textarea`)
- Card spacing issues with first/last child margin resets
- OAuth button functionality with correct `data-social` attributes

### Documentation
- Updated StyleGuide.md with Cards v2 system
- Added border-radius guidelines and usage table
- Documented panel vs soft card usage patterns
- Added code examples for all card variants
- Deprecated `.eyebrow` in favor of breadcrumb badges

## [0.1.0] - 2025-12-11

### Added
- Initial authentication pages (login, register, password reset)
- UI Style Guide foundation (`/ui-style-guide`)
- Cloudflare Turnstile integration
- OAuth starts (Google, GitHub)
- State management with auth-state.ts
- i18n system (English, Russian)
- Icon sprite system (mono/ and brand/ categories)
- Theme switcher (dark/light mode)
- Responsive layouts and components
- Form validation and error handling
- API client for `/auth` endpoints

### Infrastructure
- Vite + TypeScript build system
- Cloudflare Workers deployment setup
- Path aliases (@api, @forms, @ui, @state, @utils, @social, @i18n)
- PurgeCSS reports for CSS optimization
- Icon build system from SVG sources

### Documentation
- README.md with architecture overview
- CLAUDE.md with project instructions for AI assistants
- StyleGuide.md with design system tokens
- ui-roadmap.ru.md with long-term roadmap
- API contract documentation

---

## Legend

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
- **Documentation** for documentation-only changes
- **Infrastructure** for build/deploy/tooling changes
