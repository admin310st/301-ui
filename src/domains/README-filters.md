# Domain Filters - Usage Guide

## Quick Start

```typescript
import { getDefaultFilters } from './filters-config';
import { filterDomains } from './filters';
import { renderFilterBar, initFilterUI } from './filters-ui';

// 1. Initialize active filters
const activeFilters = getDefaultFilters();

// 2. Render filter bar (insert into table controls)
const filterBarHTML = renderFilterBar(activeFilters);
container.innerHTML = filterBarHTML;

// 3. Initialize interactions
initFilterUI(container, activeFilters, (updatedFilters) => {
  // Re-filter domains
  const filtered = filterDomains(allDomains, updatedFilters, searchQuery);
  // Re-render table
  renderDomainsTable(filtered);
});

// 4. Apply filters + search
const results = filterDomains(domains, activeFilters, searchQuery);
```

## Filter Configuration

Edit `filters-config.ts` to add/modify filters:

```typescript
{
  id: 'status',
  label: 'Status',
  type: 'single-select', // or 'multi-select'
  options: [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    // ...
  ]
}
```

## Search Syntax

**Free text:** Searches domain, project, provider, role, TLD

**Advanced syntax:**
- `status:active` - Filter by status
- `provider:cloudflare` - Filter by provider
- `project:myproject` - Filter by project name
- `role:donor` - Filter by role (donor/acceptor)
- `.io` - Filter by TLD (when query starts with dot)

## Integration Points

1. **HTML Structure** (domains.html):
   ```html
   <div class="controls-row table-controls">
     <!-- Search bar (existing) -->
     <div class="table-search">...</div>

     <!-- Filter chips (new) -->
     [Rendered by renderFilterBar()]
   </div>
   ```

2. **State Management** (domains.ts):
   ```typescript
   let activeFilters = getDefaultFilters();
   let searchQuery = '';

   function applyFiltersAndSearch() {
     const filtered = filterDomains(mockDomains, activeFilters, searchQuery);
     renderTable(filtered);
   }
   ```

3. **Event Flow**:
   - User clicks filter chip → dropdown opens
   - User selects option → `onChange` callback fires
   - Callback updates state → re-runs filtering → re-renders table

## Files

- `filters-config.ts` - Filter definitions and types
- `filters.ts` - Filtering logic (matchesFilters, matchesSearch)
- `filters-ui.ts` - UI rendering and interactions
- `README-filters.md` - This file
