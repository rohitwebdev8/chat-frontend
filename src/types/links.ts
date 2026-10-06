/**
 * links.ts — Career Quick Links type.
 * Path: users/{uid}/links/{id}
 */

export interface QuickLink {
  id: string;
  name: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

export const SEED_CAREER_LINKS: QuickLink[] = [
  { id: 'link-gmail', name: 'Gmail', url: 'https://mail.google.com' },
  { id: 'link-naukri', name: 'Naukri', url: 'https://www.naukri.com' },
  { id: 'link-linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com' },
  { id: 'link-indeed', name: 'Indeed', url: 'https://www.indeed.com' },
];
