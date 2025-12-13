/**
 * Mock data factory for testing
 * Based on ACI backend domain models
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  created_at?: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  description?: string;
  is_active: boolean;
  trust_score: number;
  last_scraped_at?: string;
  created_at?: string;
}

export interface IOC {
  type: string; // 'ip', 'domain', 'hash', 'url'
  value: string;
  context?: string;
}

export interface ArmorCTA {
  type: string; // 'product', 'service', 'consultation'
  title: string;
  url: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  url: string;
  category: Category;
  source: Source;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  tags: string[];
  cves: string[];
  vendors: string[];
  threat_type?: string;
  attack_vector?: string;
  impact_assessment?: string;
  recommended_actions?: string[];
  iocs?: IOC[];
  armor_relevance: number;
  armor_cta?: ArmorCTA;
  reading_time_minutes: number;
  view_count: number;
  is_published: boolean;
  published_at: string;
  enriched_at?: string;
  created_at: string;
  updated_at: string;
  is_bookmarked?: boolean;
}

// ===== Categories =====

export const mockVulnerabilityCategory: Category = {
  id: 'cat-1',
  name: 'Vulnerabilities',
  slug: 'vulnerabilities',
  description: 'Security vulnerabilities and CVEs',
  color: '#ef4444',
  icon: 'shield-exclamation',
  created_at: '2024-12-01T10:00:00Z',
};

export const mockRansomwareCategory: Category = {
  id: 'cat-2',
  name: 'Ransomware',
  slug: 'ransomware',
  description: 'Ransomware attacks and news',
  color: '#f97316',
  icon: 'lock-closed',
  created_at: '2024-12-01T10:00:00Z',
};

export const mockPhishingCategory: Category = {
  id: 'cat-3',
  name: 'Phishing',
  slug: 'phishing',
  description: 'Phishing campaigns and awareness',
  color: '#eab308',
  icon: 'mail',
  created_at: '2024-12-01T10:00:00Z',
};

export const mockCategories: Category[] = [
  mockVulnerabilityCategory,
  mockRansomwareCategory,
  mockPhishingCategory,
];

// ===== Sources =====

export const mockCISASource: Source = {
  id: 'source-1',
  name: 'CISA',
  url: 'https://cisa.gov',
  description: 'Cybersecurity and Infrastructure Security Agency',
  is_active: true,
  trust_score: 0.95,
  last_scraped_at: '2024-12-11T19:00:00Z',
  created_at: '2024-12-01T10:00:00Z',
};

export const mockSecurityBlogSource: Source = {
  id: 'source-2',
  name: 'Security Blog',
  url: 'https://security-blog.example.com',
  description: 'Independent security research blog',
  is_active: true,
  trust_score: 0.75,
  last_scraped_at: '2024-12-11T18:30:00Z',
  created_at: '2024-12-01T10:00:00Z',
};

export const mockSources: Source[] = [mockCISASource, mockSecurityBlogSource];

// ===== Articles =====

export const mockArticleWithCVE: Article = {
  id: 'article-1',
  title: 'Critical RCE Vulnerability in Apache Struts',
  slug: 'critical-rce-vulnerability-apache-struts',
  summary: 'A critical remote code execution vulnerability has been discovered in Apache Struts 2.x versions. This vulnerability allows unauthenticated remote attackers to execute arbitrary code.',
  content:
    'Full article content discussing the Apache Struts vulnerability, impact analysis, mitigation strategies, and recommended patches. The vulnerability affects versions 2.0 through 2.5.28.',
  url: 'https://cisa.gov/news/2024/12/11/apache-struts-rce',
  category: mockVulnerabilityCategory,
  source: mockCISASource,
  severity: 'critical',
  tags: ['apache', 'rce', 'java'],
  cves: ['CVE-2024-12345', 'CVE-2024-12346'],
  vendors: ['Apache'],
  threat_type: 'Remote Code Execution',
  attack_vector: 'Network',
  impact_assessment: 'Complete system compromise possible',
  recommended_actions: [
    'Upgrade to Apache Struts 2.5.29 or later',
    'Apply WAF rules to block exploit attempts',
    'Monitor for CVE scanning activity',
  ],
  iocs: [
    {
      type: 'url',
      value: 'https://attacker.example.com/exploit',
      context: 'Known exploit delivery endpoint',
    },
  ],
  armor_relevance: 0.95,
  armor_cta: {
    type: 'service',
    title: 'Vulnerability Management',
    url: 'https://armor.com/vulnerability-management',
  },
  reading_time_minutes: 8,
  view_count: 1245,
  is_published: true,
  published_at: '2024-12-11T10:30:00Z',
  enriched_at: '2024-12-11T11:00:00Z',
  created_at: '2024-12-11T10:30:00Z',
  updated_at: '2024-12-11T11:00:00Z',
  is_bookmarked: false,
};

export const mockRansomwareArticle: Article = {
  id: 'article-2',
  title: 'Ransomware Attack Targets Healthcare Sector',
  slug: 'ransomware-attack-healthcare',
  summary: 'A sophisticated ransomware campaign has been launched against multiple healthcare organizations across the United States.',
  content:
    'Details about the ransomware campaign, affected organizations, ransom demands, and recovery efforts. Healthcare providers are urged to implement immediate defensive measures.',
  url: 'https://security-blog.example.com/healthcare-ransomware',
  category: mockRansomwareCategory,
  source: mockSecurityBlogSource,
  severity: 'high',
  tags: ['ransomware', 'healthcare', 'phishing'],
  cves: [],
  vendors: ['LockBit', 'BlackCat'],
  threat_type: 'Ransomware',
  attack_vector: 'Phishing Email',
  impact_assessment: 'Business operations disruption',
  recommended_actions: [
    'Isolate affected systems',
    'Do not pay ransom',
    'Contact law enforcement',
  ],
  iocs: [
    {
      type: 'domain',
      value: 'malware-c2.evil.com',
      context: 'Command and control server',
    },
  ],
  armor_relevance: 0.88,
  reading_time_minutes: 6,
  view_count: 892,
  is_published: true,
  published_at: '2024-12-11T09:15:00Z',
  enriched_at: '2024-12-11T09:45:00Z',
  created_at: '2024-12-11T09:15:00Z',
  updated_at: '2024-12-11T09:45:00Z',
  is_bookmarked: true,
};

export const mockPhishingArticle: Article = {
  id: 'article-3',
  title: 'New Phishing Campaign Targets Financial Institutions',
  slug: 'phishing-financial-institutions',
  summary: 'Attackers are using sophisticated social engineering tactics to target employees at major financial institutions.',
  content:
    'Analysis of the phishing campaign, email templates used, target patterns, and recommended employee training approaches.',
  url: 'https://cisa.gov/alerts/phishing-financial',
  category: mockPhishingCategory,
  source: mockCISASource,
  severity: 'medium',
  tags: ['phishing', 'banking', 'social-engineering'],
  cves: [],
  vendors: ['N/A'],
  threat_type: 'Phishing',
  attack_vector: 'Email',
  impact_assessment: 'Credential compromise, unauthorized access',
  recommended_actions: [
    'Conduct security awareness training',
    'Enable MFA on all accounts',
    'Monitor for suspicious login activity',
  ],
  armor_relevance: 0.72,
  reading_time_minutes: 5,
  view_count: 456,
  is_published: true,
  published_at: '2024-12-11T08:00:00Z',
  enriched_at: '2024-12-11T08:30:00Z',
  created_at: '2024-12-11T08:00:00Z',
  updated_at: '2024-12-11T08:30:00Z',
  is_bookmarked: false,
};

export const mockArticles: Article[] = [
  mockArticleWithCVE,
  mockRansomwareArticle,
  mockPhishingArticle,
];

// ===== Factory Functions =====

export function createMockArticle(overrides?: Partial<Article>): Article {
  return {
    ...mockArticleWithCVE,
    id: `article-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

export function createMockCategory(overrides?: Partial<Category>): Category {
  return {
    ...mockVulnerabilityCategory,
    id: `cat-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

export function createMockSource(overrides?: Partial<Source>): Source {
  return {
    ...mockCISASource,
    id: `source-${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

// ===== API Response Helpers =====

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function createMockPaginatedResponse<T>(
  items: T[],
  page = 1,
  pageSize = 20
): PaginatedResponse<T> {
  return {
    data: items,
    total: items.length,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(items.length / pageSize),
  };
}
