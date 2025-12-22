/**
 * DNS utility for querying nameserver records via DNS over HTTPS (Google Public DNS)
 */

interface DNSAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DNSResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{ name: string; type: number }>;
  Answer?: DNSAnswer[];
}

export interface NSRecord {
  nameserver: string;
  isCloudflare: boolean;
}

/**
 * Query NS records for a domain via Google DNS API
 * @param domain - Domain name to query
 * @returns Array of NS records with Cloudflare detection
 */
export async function queryNSRecords(domain: string): Promise<NSRecord[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/dns-json',
      },
    });

    if (!response.ok) {
      throw new Error(`DNS query failed: ${response.status}`);
    }

    const data: DNSResponse = await response.json();

    // Status 0 = NOERROR (success)
    if (data.Status !== 0) {
      throw new Error(`DNS query returned status ${data.Status}`);
    }

    if (!data.Answer || data.Answer.length === 0) {
      return [];
    }

    // Extract NS records and check if they're Cloudflare
    return data.Answer
      .filter((record) => record.type === 2) // NS type = 2
      .map((record) => {
        const nameserver = record.data.replace(/\.$/, ''); // Remove trailing dot
        return {
          nameserver,
          isCloudflare: /cloudflare\.com$/i.test(nameserver), // Check after removing trailing dot
        };
      })
      .sort((a, b) => a.nameserver.localeCompare(b.nameserver));
  } catch (error) {
    console.error('DNS query failed:', error);
    throw error;
  }
}
