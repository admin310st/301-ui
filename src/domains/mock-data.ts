export interface Domain {
  id: number;
  domain: string;
  project_name: string;
  project_lang?: string;
  registrar: 'cloudflare' | 'namecheap' | 'namesilo' | 'google' | 'manual';
  cf_status: 'active' | 'pending' | 'inactive';
  provider_status: 'active' | 'expiring' | 'expired' | 'grace' | 'redemption';
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
  const domain = `${project.toLowerCase()}${id}${tld}`;
  const registrar = randomItem(registrars);

  // Provider status distribution: 60% active, 20% expiring, 10% expired, 5% grace, 5% redemption
  const rand = Math.random();
  let provider_status: Domain['provider_status'];
  let expiresOffset: number;

  if (rand < 0.6) {
    provider_status = 'active';
    expiresOffset = Math.floor(Math.random() * 300) + 60; // 60-360 days
  } else if (rand < 0.8) {
    provider_status = 'expiring';
    expiresOffset = Math.floor(Math.random() * 30) + 1; // 1-30 days
  } else if (rand < 0.9) {
    provider_status = 'expired';
    expiresOffset = -Math.floor(Math.random() * 15) - 1; // -1 to -15 days
  } else if (rand < 0.95) {
    provider_status = 'grace';
    expiresOffset = -Math.floor(Math.random() * 30) - 16; // -16 to -45 days
  } else {
    provider_status = 'redemption';
    expiresOffset = -Math.floor(Math.random() * 30) - 46; // -46 to -75 days
  }

  // CF Status: most active, some pending, few inactive
  let cf_status: Domain['cf_status'];
  if (provider_status === 'expired' || provider_status === 'redemption') {
    cf_status = Math.random() > 0.3 ? 'inactive' : 'active';
  } else if (provider_status === 'grace') {
    cf_status = Math.random() > 0.5 ? 'inactive' : 'active';
  } else if (rand > 0.9) {
    cf_status = 'pending';
  } else {
    cf_status = 'active';
  }

  // SSL status
  let ssl_status: Domain['ssl_status'];
  let ssl_valid_to: string | undefined;

  if (cf_status === 'inactive' || provider_status === 'expired') {
    ssl_status = Math.random() > 0.5 ? 'invalid' : 'off';
  } else if (provider_status === 'expiring') {
    ssl_status = Math.random() > 0.3 ? 'expiring' : 'valid';
    ssl_valid_to = randomDate(Math.floor(Math.random() * 30) + 1);
  } else {
    ssl_status = Math.random() > 0.9 ? 'expiring' : 'valid';
    ssl_valid_to = randomDate(Math.floor(Math.random() * 60) + 30);
  }

  // Abuse status
  let abuse_status: Domain['abuse_status'];
  if (Math.random() > 0.95) {
    abuse_status = 'blocked';
  } else if (Math.random() > 0.9) {
    abuse_status = 'warning';
  } else {
    abuse_status = 'clean';
  }

  const has_errors = ssl_status === 'invalid' || abuse_status !== 'clean' || provider_status === 'expired';

  return {
    id,
    domain,
    project_name: project,
    project_lang: Math.random() > 0.3 ? randomItem(langs) : undefined,
    registrar,
    cf_status,
    provider_status,
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
export const mockDomains: Domain[] = Array.from({ length: 35 }, (_, i) => generateDomain(i + 1));
