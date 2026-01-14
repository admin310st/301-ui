# План реализации Redirects UI

**Дата:** 2026-01-14
**Статус:** Backend API готов, планируем фронтенд
**Документация:** `docs/301-wiki/API_Redirects.md` (969 строк), `docs/301-wiki/Redirects.md` (839 строк)

---

## Что появилось на Backend

### API Endpoints

✅ **Templates & Presets**
- `GET /redirects/templates` - список шаблонов T1-T7
- `GET /redirects/presets` - список пресетов P1-P5

✅ **CRUD Operations**
- `GET /sites/:siteId/redirects` - редиректы для сайта
- `GET /domains/:domainId/redirects` - редиректы для домена
- `GET /redirects/:id` - детали редиректа
- `POST /domains/:domainId/redirects` - создать из шаблона
- `POST /domains/:domainId/redirects/preset` - создать из пресета
- `PATCH /redirects/:id` - обновить (params, enabled, status_code)
- `DELETE /redirects/:id` - удалить

✅ **Sync Operations**
- `GET /zones/:id/redirect-limits` - лимиты зоны
- `POST /zones/:id/apply-redirects` - применить все редиректы зоны в CF

### Ключевые концепции

**1. Templates (T1-T7)**
- T1: Domain → Domain (с сохранением пути)
- T2: Domain → URL (статический)
- T3: non-www → www (SEO canonical)
- T4: www → non-www (SEO canonical)
- T5: Path prefix → Path (по префиксу пути)
- T6: Exact path → URL (точный путь)
- T7: Maintenance (временный редирект 302)

**2. Presets (P1-P5)**
- P1: SEO Canonical (www) - применяет T3
- P2: SEO Canonical (non-www) - применяет T4
- P3: Domain Migration - T1 + T3 (2 правила)
- P4: Maintenance Mode - T7
- P5: Full Migration - T1 + T3 + T5×N (2+N правил)

**3. Zone Limits**
- Free: 10 правил на зону
- Pro: 25 правил
- Business: 50 правил
- Enterprise: 300 правил

**4. Sync Status**
- `pending` - изменения не применены в CF
- `synced` - синхронизировано с CF
- `error` - ошибка синхронизации

**5. Analytics**
- `clicks_total` - всего кликов
- `clicks_today` - сегодня
- `clicks_yesterday` - вчера
- `trend` - тренд (up/down/neutral)

---

## План UI реализации

### Phase 1: Core Redirects Management (Week 1)

#### 1.1. Redirects Page (`/redirects.html`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Header: Redirects badge                                 │
├─────────────────────────────────────────────────────────┤
│ Page Header                                             │
│ - Title: Redirects                                      │
│ - Subtitle: Manage HTTP redirects via Cloudflare       │
│ - Actions: [+ Create redirect]                         │
├─────────────────────────────────────────────────────────┤
│ Filter Bar                                              │
│ [All sites ▼] [All domains ▼] [Status: All ▼] [Search] │
├─────────────────────────────────────────────────────────┤
│ Table: Redirects                                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Domain | Template | Target | Status | Clicks | ⚡│   │
│ │ ────────────────────────────────────────────────│   │
│ │ crypto.pics │ T1 │ crypto.com │ ✓ │ 12.8K │ ⋮ │   │
│ │ promo.pics  │ T3 │ SEO (www)  │ ⏳│   0   │ ⋮ │   │
│ └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Columns:**
1. **Domain** (critical) - домен источника + zone indicator
2. **Template** (high) - badge с T1-T7 + tooltip с описанием
3. **Target** (critical) - целевой URL или описание (для T3/T4)
4. **Status** (high) - sync status badge (synced/pending/error)
5. **Clicks** (medium) - clicks_today + trend icon
6. **Actions** (critical) - Edit, Sync, Delete

**Files to create:**
- `redirects.html` - main page
- `src/ui/redirects.ts` - table rendering, filters
- `src/api/redirects.ts` - API client
- `src/api/types.ts` - TypeScript types

#### 1.2. Create Redirect Drawer

**Two tabs:**

**Tab 1: From Template**
- Template selector (radio cards с T1-T7)
- Domain selector (dropdown)
- Dynamic params form (зависит от выбранного template)
- Status code selector (301/302)
- Preview expression (читаемый CF expression)

**Tab 2: From Preset**
- Preset selector (radio cards с P1-P5)
- Domain selector
- Preset params (для P5 - массив path redirects)
- Zone limit warning (если будет превышен)

**Files to create:**
- `partials/create-redirect-drawer.hbs`
- `src/forms/redirect-create.ts`

#### 1.3. Edit Redirect Drawer

**Fields:**
- Rule name (text input)
- Params (dynamic form based on template)
- Status code (301/302)
- Enabled toggle
- Sync status indicator

**Files to create:**
- `partials/edit-redirect-drawer.hbs`
- `src/forms/redirect-edit.ts`

#### 1.4. API Client

**Functions:**
```typescript
// Templates & Presets
getTemplates(): Promise<Template[]>
getPresets(): Promise<Preset[]>

// CRUD
getRedirectsBySite(siteId: number): Promise<Redirect[]>
getRedirectsByDomain(domainId: number): Promise<Redirect[]>
getRedirect(id: number): Promise<RedirectDetail>
createRedirect(domainId: number, data: CreateRedirectRequest): Promise<CreateRedirectResponse>
createRedirectFromPreset(domainId: number, data: CreatePresetRequest): Promise<CreatePresetResponse>
updateRedirect(id: number, data: UpdateRedirectRequest): Promise<void>
deleteRedirect(id: number): Promise<void>

// Sync
getZoneLimits(zoneId: number): Promise<ZoneLimits>
applyZoneRedirects(zoneId: number): Promise<ApplyRedirectsResponse>
```

**Files:**
- `src/api/redirects.ts` (new file, ~300 lines)
- `src/api/types.ts` (add redirect types)

---

### Phase 2: Sync Management (Week 2)

#### 2.1. Sync Status Indicators

**Visual states:**
- ✅ **Synced** - зелёная галочка, "Applied in CF"
- ⏳ **Pending** - оранжевый clock, "Waiting for sync"
- ❌ **Error** - красный alert, "Sync failed" + error message

**Bulk sync button:**
- "Apply all pending" - применяет все pending редиректы зоны
- Shows warning if changes will affect multiple zones

#### 2.2. Zone Limits Widget

**Location:** Sidebar или header page

**Display:**
```
┌─────────────────────────┐
│ Zone: crypto.pics       │
│ ──────────────────────  │
│ Used: 3 / 10            │
│ [█████░░░░░░] 30%      │
└─────────────────────────┘
```

**Colors:**
- 0-70%: neutral
- 70-90%: warning (orange)
- 90-100%: danger (red)

#### 2.3. Sync Log Drawer (optional)

**Shows:**
- Last sync timestamp
- Applied rules count
- Warnings (if any)
- CF rule IDs mapping

---

### Phase 3: Analytics & UX Polish (Week 3)

#### 3.1. Analytics Cards

**Metrics:**
- Total redirects count
- Active redirects (enabled=true)
- Total clicks (all time)
- Clicks today

**Trend indicators:**
- ↑ up (green)
- ↓ down (red)
- → neutral (gray)

#### 3.2. Redirect Inspector Drawer

**Tabs:**
1. **Overview** - redirect details, status, params
2. **Analytics** - clicks chart (day-by-day for 30 days)
3. **CF Details** - cf_rule_id, cf_ruleset_id, expression preview

#### 3.3. Quick Actions

**From Domains page:**
- "Add redirect" button в domain inspector
- Quick template selection (T1/T3/T4)

**From Sites page:**
- "Manage redirects" button
- Shows redirects count badge

---

### Phase 4: Advanced Features (Week 4)

#### 4.1. Preset Wizard

**Multi-step wizard для P5 (Full Migration):**

Step 1: Choose domain
Step 2: Target URL
Step 3: Add path redirects (table with +/- rows)
Step 4: Preview rules (expandable list)
Step 5: Confirm & apply

#### 4.2. Bulk Operations

**Select multiple redirects:**
- Enable/Disable
- Change status code (301→302 or vice versa)
- Delete
- Apply sync (for selected zones)

#### 4.3. Import/Export

**Import:**
- CSV format: `source_domain,template_id,target_url,status_code`
- Validate before import
- Show preview with warnings

**Export:**
- CSV/JSON format
- Filter by site/domain/status

---

## TypeScript Types

```typescript
// Template
interface RedirectTemplate {
  id: string; // T1-T7
  name: string;
  description: string;
  category: 'domain' | 'canonical' | 'path' | 'temporary';
  preservePath: boolean;
  preserveQuery: boolean;
  defaultStatusCode: 301 | 302;
  params: TemplateParam[];
}

interface TemplateParam {
  name: string;
  type: 'url' | 'path' | 'string';
  required: boolean;
  description: string;
}

// Preset
interface RedirectPreset {
  id: string; // P1-P5
  name: string;
  description: string;
  useCase: string;
  rulesCount: number | string;
  rules: PresetRule[];
}

interface PresetRule {
  template_id: string;
  order: number | string;
  description: string;
}

// Redirect
interface Redirect {
  id: number;
  domain_id: number;
  domain_name: string;
  zone_id: number;
  zone_name: string;
  template_id: string;
  preset_id: string | null;
  preset_order: number | null;
  rule_name: string;
  params: Record<string, string>;
  status_code: 301 | 302;
  enabled: boolean;
  sync_status: 'pending' | 'synced' | 'error';
  cf_rule_id: string | null;
  clicks_total: number;
  clicks_today: number;
  clicks_yesterday: number;
  trend: 'up' | 'down' | 'neutral';
  created_at: string;
  updated_at: string;
}

// Zone Limits
interface ZoneLimits {
  zone_id: number;
  zone_name: string;
  used: number;
  max: number;
  available: number;
}

// Requests
interface CreateRedirectRequest {
  template_id: string;
  rule_name?: string;
  params: Record<string, string>;
  status_code?: 301 | 302;
}

interface CreatePresetRequest {
  preset_id: string;
  params: Record<string, any>;
}

interface UpdateRedirectRequest {
  rule_name?: string;
  params?: Record<string, string>;
  status_code?: 301 | 302;
  enabled?: boolean;
}
```

---

## i18n Keys Structure

```typescript
redirects: {
  title: 'Redirects',
  subtitle: 'Manage HTTP redirects via Cloudflare',
  empty: {
    title: 'No redirects configured',
    description: 'Create redirects to manage traffic flow',
    cta: 'Create redirect',
  },
  table: {
    columns: {
      domain: 'Domain',
      template: 'Template',
      target: 'Target',
      status: 'Status',
      clicks: 'Clicks',
      actions: 'Actions',
    },
  },
  templates: {
    T1: { name: 'Domain → Domain', desc: '...' },
    T2: { name: 'Domain → URL', desc: '...' },
    // ... T3-T7
  },
  presets: {
    P1: { name: 'SEO Canonical (www)', desc: '...' },
    // ... P2-P5
  },
  syncStatus: {
    pending: 'Waiting for sync',
    synced: 'Applied in CF',
    error: 'Sync failed',
  },
  actions: {
    create: 'Create redirect',
    edit: 'Edit redirect',
    delete: 'Delete redirect',
    sync: 'Apply changes',
    syncAll: 'Apply all pending',
  },
  messages: {
    created: 'Redirect created successfully',
    updated: 'Redirect updated successfully',
    deleted: 'Redirect deleted successfully',
    synced: 'Redirects applied to Cloudflare',
  },
  errors: {
    createFailed: 'Failed to create redirect',
    zoneLimitReached: 'Zone limit reached ({{used}}/{{max}})',
    templateAlreadyExists: 'This template already exists for domain',
  },
}
```

---

## UI Components Needed

### New Components

1. **Template Card** - radio card для выбора шаблона
   - Icon badge (T1-T7)
   - Template name
   - Description
   - Use case example

2. **Preset Card** - radio card для выбора пресета
   - Rules count badge
   - Preset name
   - Description
   - Use case

3. **Sync Status Badge** - colored badge
   - synced: badge--success
   - pending: badge--warning
   - error: badge--danger

4. **Zone Limit Progress** - progress bar component
   - Used/Max indicator
   - Color based on percentage
   - Warning state

5. **Redirect Rule Preview** - code block component
   - CF expression preview
   - Syntax highlighting (optional)
   - Copy button

---

## Integration Points

### From Domains Page

**Domain Inspector → Redirects section:**
- Show redirects count badge
- List redirects for this domain
- Quick add button → opens redirect drawer with domain pre-selected

### From Sites Page

**Site detail → Redirects tab:**
- List all redirects for site domains
- Group by domain
- Show zone limits per zone
- Bulk actions per zone

### From Projects Page

**Project detail → Redirects tab (optional):**
- Show all redirects for project domains
- Filter by site/domain
- Apply bulk operations

---

## Testing Strategy

### Unit Tests
- Template param validation
- Preset rules generation
- Zone limit calculations

### Integration Tests
- Create redirect flow (template & preset)
- Update redirect params
- Sync status transitions
- Delete cascade (domain → redirects)

### E2E Tests
- Full redirect creation (domain → template → params → sync)
- Preset application (P3 domain migration)
- Bulk sync operation
- Analytics tracking

---

## Performance Considerations

### Caching Strategy
- Templates & presets: 1 hour TTL (rarely change)
- Redirects list: 30 sec TTL
- Zone limits: 1 min TTL
- Analytics: 5 min TTL

### Optimizations
- Lazy load redirect inspector
- Virtualize redirects table (if >100 rows)
- Debounce search input (300ms)
- Batch sync operations

---

## Rollout Plan

### Week 1: MVP
- Redirects page with table
- Create redirect drawer (template only)
- Edit/Delete operations
- API client

### Week 2: Sync
- Sync status indicators
- Apply redirects button
- Zone limits widget
- Error handling

### Week 3: UX
- Analytics cards
- Redirect inspector
- Quick actions from domains/sites
- Preset support

### Week 4: Polish
- Preset wizard (P5)
- Bulk operations
- Import/Export
- Mobile optimization

---

## Success Metrics

**Feature Adoption:**
- 80% users create at least 1 redirect
- 50% users use presets (P1-P5)
- Average 3-5 redirects per site

**Performance:**
- Page load <1.5s
- Create redirect <2s
- Sync operation <5s (includes CF API call)

**Quality:**
- 0 zone limit violations
- <1% sync errors
- 95% redirects synced within 1 minute

---

## Known Limitations

1. **Free Plan:** Max 10 redirects per zone
2. **No regex:** Free/Pro plans don't support regex in CF
3. **No geo conditions:** Single Redirects don't support `ip.geoip.country`
4. **No user-agent:** Single Redirects don't support device targeting
5. **Sync latency:** CF API может занять до 30 секунд

**Workarounds:**
- For geo/device → recommend Workers (future Layer 5: Streams)
- For regex → upgrade to Business plan
- For complex logic → recommend TDS/Streams

---

## Documentation Updates Needed

1. Add Redirects section to `docs/ui-roadmap.ru.md`
2. Create `docs/redirects-ui-guide.md` with screenshots
3. Update `TODO-index.md` - move Redirects from "Next" to "In Progress"
4. Add redirect types to `src/api/types.ts` JSDoc comments

---

## Questions for Backend Team

1. ✅ Is analytics data (clicks) real-time or delayed?
   - **Assume:** Delayed (updated every 5-15 minutes)

2. ✅ Should we show CF expression preview in UI?
   - **Decision:** Yes, as read-only code block

3. ✅ What happens if domain is deleted?
   - **Assume:** Cascade delete redirects + sync zones

4. ✅ Can we batch sync multiple zones?
   - **Decision:** Call POST /zones/:id/apply-redirects for each zone

5. ✅ Max params length validation?
   - **Assume:** URL max 2048 chars, path max 256 chars

---

**Next Steps:**
1. Create TypeScript types in `src/api/types.ts`
2. Implement API client `src/api/redirects.ts`
3. Create redirects page skeleton `redirects.html`
4. Build table rendering `src/ui/redirects.ts`

**Estimated Timeline:** 3-4 weeks full-time equivalent
**Priority:** High (Layer 4 in roadmap, blocking Streams implementation)
