export interface Domain {
  id: number;
  domain: string;
  project_name: string;
  project_lang?: string;
  status: 'active' | 'expired' | 'expiring' | 'blocked' | 'pending';
  provider: 'cloudflare' | 'namecheap' | 'namesilo' | 'google' | 'manual';
  registrar?: string;
  cf_zone_id?: string;
  ssl_status: 'valid' | 'expiring' | 'invalid' | 'off';
  ssl_valid_to?: string;
  abuse_status: 'clean' | 'warning' | 'blocked';
  expires_at: string;
  monitoring_enabled: boolean;
  last_check_at?: string;
  has_errors: boolean;
}

const projects = [
  'LuckyLine',
  'TrafficMaster',
  'DomainControl',
  'RedirectPro',
  'WebFlow',
  'StreamHub',
  'LinkManager',
  'CloudRouter',
];

const tlds = ['.com', '.net', '.org', '.io', '.dev', '.app', '.xyz', '.co', '.ru', '.es'];
const langs = ['EN', 'RU', 'ES', 'DE', 'FR'];
const providers: Domain['provider'][] = ['cloudflare', 'namecheap', 'namesilo', 'google', 'manual'];

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
  const domain = `${project.toLowerCase()}${id}${tld}`;
  const provider = randomItem(providers);

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

  return {
    id,
    domain,
    project_name: project,
    project_lang: Math.random() > 0.3 ? randomItem(langs) : undefined,
    status,
    provider,
    registrar: provider !== 'cloudflare' ? provider : undefined,
    cf_zone_id: provider === 'cloudflare' ? `zone_${id}` : undefined,
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
  // Add IDN test domains
  {
    id: 100,
    domain: 'xn--c1ad6a.xn--p1ai', // домен.рф
    project_name: 'RussianProject',
    project_lang: 'RU',
    status: 'active',
    provider: 'namecheap',
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
    domain: 'xn--80aswg.xn--p1ai', // сайт.рф
    project_name: 'RussianProject',
    project_lang: 'RU',
    status: 'expiring',
    provider: 'cloudflare',
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
    domain: 'xn--9krt00a.xn--fiqs8s', // 电子商务.中国 (e-commerce.china)
    project_name: 'ChineseMarket',
    project_lang: 'CN',
    status: 'active',
    provider: 'namecheap',
    registrar: 'namecheap',
    ssl_status: 'valid',
    ssl_valid_to: randomDate(120),
    abuse_status: 'clean',
    expires_at: randomDate(200),
    monitoring_enabled: true,
    last_check_at: randomDate(-3),
    has_errors: false,
  },
];
