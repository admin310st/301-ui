export interface Domain {
  id: number;
  domain_name: string; // было: domain (приведено к API-формату)
  project_id: number; // Foreign key to projects table
  project_name: string; // UI: денормализация project.name
  project_lang?: string; // UI: денормализация site.lang_code
  status: 'active' | 'expired' | 'expiring' | 'blocked' | 'pending'; // расширенный набор статусов для UI
  role: 'acceptor' | 'donor' | 'reserve'; // роль домена в системе (editable via PATCH /domains/:id)
  registrar: 'cloudflare' | 'namecheap' | 'namesilo' | 'google' | 'manual'; // было: provider
  cf_zone_id?: string; // Cloudflare Zone ID (опционально)

  // UI-специфичные поля (не в базовой схеме API):
  ssl_status: 'valid' | 'expiring' | 'invalid' | 'off';
  ssl_valid_to?: string;
  abuse_status: 'clean' | 'warning' | 'blocked';
  expires_at: string; // дата истечения регистрации
  monitoring_enabled: boolean;
  last_check_at?: string;
  has_errors: boolean;
}

// Project names and IDs (aligned with redirects mock data)
const projects = [
  { id: 1, name: 'LuckyLine' },
  { id: 2, name: 'TrafficMaster' },
  { id: 3, name: 'DomainControl' },
  { id: 4, name: 'RedirectPro' },
  { id: 5, name: 'WebFlow' },
  { id: 6, name: 'StreamHub' },
  { id: 7, name: 'LinkManager' },
  { id: 8, name: 'CloudRouter' },
  { id: 17, name: 'CryptoBoss' }, // Aligned with redirects mock data
  { id: 18, name: 'TestProject' }, // Aligned with redirects mock data
];

const tlds = ['.com', '.net', '.org', '.io', '.dev', '.app', '.xyz', '.co', '.ru', '.es'];
const langs = ['EN', 'RU', 'ES', 'DE', 'FR'];
const registrars: Domain['registrar'][] = ['cloudflare', 'namecheap', 'namesilo', 'google', 'manual'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

function generateDomain(id: number): Domain {
  const project = randomItem(projects);
  const tld = randomItem(tlds);
  const domain = `${project.name.toLowerCase()}${id}${tld}`;
  const registrar = randomItem(registrars);

  // Status distribution: 60% active, 15% expiring, 10% expired, 10% pending, 5% blocked
  const rand = Math.random();
  let status: Domain['status'];
  let expiresOffset: number;

  if (rand < 0.6) {
    status = 'active';
    expiresOffset = Math.floor(Math.random() * 300) + 60; // 60-360 days
  } else if (rand < 0.75) {
    status = 'expiring';
    expiresOffset = Math.floor(Math.random() * 30) + 1; // 1-30 days
  } else if (rand < 0.85) {
    status = 'expired';
    expiresOffset = -Math.floor(Math.random() * 30) - 1; // -1 to -30 days
  } else if (rand < 0.95) {
    status = 'pending';
    expiresOffset = Math.floor(Math.random() * 365) + 1;
  } else {
    status = 'blocked';
    expiresOffset = Math.floor(Math.random() * 180) + 1;
  }

  // SSL status
  let ssl_status: Domain['ssl_status'];
  let ssl_valid_to: string | undefined;

  if (status === 'blocked' || status === 'expired') {
    ssl_status = Math.random() > 0.5 ? 'invalid' : 'off';
  } else if (status === 'expiring') {
    ssl_status = Math.random() > 0.3 ? 'expiring' : 'valid';
    ssl_valid_to = randomDate(Math.floor(Math.random() * 30) + 1);
  } else {
    ssl_status = Math.random() > 0.9 ? 'expiring' : 'valid';
    ssl_valid_to = randomDate(Math.floor(Math.random() * 60) + 30);
  }

  // Abuse status
  let abuse_status: Domain['abuse_status'];
  if (status === 'blocked') {
    abuse_status = 'blocked';
  } else if (Math.random() > 0.9) {
    abuse_status = 'warning';
  } else {
    abuse_status = 'clean';
  }

  const has_errors = ssl_status === 'invalid' || abuse_status !== 'clean' || status === 'expired';

  // Role: случайное распределение (acceptor более часто, т.к. это основные домены)
  const roleWeights = [0.7, 0.2, 0.1]; // acceptor, donor, reserve
  const roleRandom = Math.random();
  let role: Domain['role'];
  if (roleRandom < roleWeights[0]) {
    role = 'acceptor';
  } else if (roleRandom < roleWeights[0] + roleWeights[1]) {
    role = 'donor';
  } else {
    role = 'reserve';
  }

  return {
    id,
    domain_name: domain,
    project_id: project.id,
    project_name: project.name,
    project_lang: Math.random() > 0.3 ? randomItem(langs) : undefined,
    status,
    role,
    registrar,
    cf_zone_id: registrar === 'cloudflare' ? `zone_${id}` : undefined,
    ssl_status,
    ssl_valid_to,
    abuse_status,
    expires_at: randomDate(expiresOffset),
    monitoring_enabled: Math.random() > 0.2,
    last_check_at: randomDate(-Math.floor(Math.random() * 7)),
    has_errors,
  };
}

// Generate 35 mock domains
export const mockDomains: Domain[] = [
  ...Array.from({ length: 35 }, (_, i) => generateDomain(i + 1)),
  // Add long domain name test (20 chars before dot)
  {
    id: 99,
    domain_name: 'verylongdomainname20.com', // exactly 20 characters before .com
    project_id: 1,
    project_name: 'LongNameTest',
    project_lang: 'EN',
    status: 'active',
    role: 'donor',
    registrar: 'cloudflare',
    cf_zone_id: 'zone_99',
    ssl_status: 'valid',
    ssl_valid_to: randomDate(180),
    abuse_status: 'clean',
    expires_at: randomDate(365),
    monitoring_enabled: true,
    last_check_at: randomDate(-2),
    has_errors: false,
  },
  // Add IDN test domains
  {
    id: 100,
    domain_name: 'xn--c1ad6a.xn--p1ai', // домен.рф
    project_id: 9,
    project_name: 'RussianProject',
    project_lang: 'RU',
    status: 'active',
    role: 'acceptor',
    registrar: 'namecheap',
    ssl_status: 'valid',
    ssl_valid_to: randomDate(90),
    abuse_status: 'clean',
    expires_at: randomDate(180),
    monitoring_enabled: true,
    last_check_at: randomDate(-2),
    has_errors: false,
  },
  {
    id: 101,
    domain_name: 'xn--80aswg.xn--p1ai', // сайт.рф
    project_id: 9,
    project_name: 'RussianProject',
    project_lang: 'RU',
    status: 'expiring',
    role: 'donor',
    registrar: 'cloudflare',
    cf_zone_id: 'zone_101',
    ssl_status: 'valid',
    ssl_valid_to: randomDate(60),
    abuse_status: 'clean',
    expires_at: randomDate(25),
    monitoring_enabled: true,
    last_check_at: randomDate(-1),
    has_errors: false,
  },
  {
    id: 102,
    domain_name: 'xn--9krt00a.xn--fiqs8s', // 电子商务.中国 (e-commerce.china)
    project_id: 10,
    project_name: 'ChineseMarket',
    project_lang: 'CN',
    status: 'active',
    role: 'acceptor',
    registrar: 'namecheap',
    ssl_status: 'valid',
    ssl_valid_to: randomDate(120),
    abuse_status: 'clean',
    expires_at: randomDate(200),
    monitoring_enabled: true,
    last_check_at: randomDate(-3),
    has_errors: false,
  },
  // Reserve domain for testing
  {
    id: 103,
    domain_name: 'backup-domain.io',
    project_id: 11,
    project_name: 'BackupProject',
    project_lang: 'EN',
    status: 'active',
    role: 'reserve',
    registrar: 'cloudflare',
    cf_zone_id: 'zone_103',
    ssl_status: 'valid',
    ssl_valid_to: randomDate(180),
    abuse_status: 'clean',
    expires_at: randomDate(365),
    monitoring_enabled: false,
    last_check_at: randomDate(-5),
    has_errors: false,
  },
  // Real domain for testing Cloudflare NS detection
  {
    id: 104,
    domain_name: '301.st',
    project_id: 12,
    project_name: 'PlatformCore',
    project_lang: 'EN',
    status: 'active',
    role: 'acceptor',
    registrar: 'cloudflare',
    cf_zone_id: 'zone_301st',
    ssl_status: 'valid',
    ssl_valid_to: randomDate(90),
    abuse_status: 'clean',
    expires_at: randomDate(365),
    monitoring_enabled: true,
    last_check_at: randomDate(-1),
    has_errors: false,
  },
];
