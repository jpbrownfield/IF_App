import { PLACEHOLDER_COVER } from './constants';

/**
 * Wraps an image URL in a caching proxy (wsrv.nl) to bypass CORS and Hotlink protection.
 * This is essential for loading images from IFDB and the IF Archive which often block direct browser requests.
 */
export const getProxiedImageUrl = (url: string | undefined): string => {
  if (!url) return PLACEHOLDER_COVER;
  
  // Return placeholders or data URIs directly
  if (url.startsWith('data:') || url.includes('placehold.co')) return url;

  // Clean the URL
  const cleanUrl = url.trim();
  if (!cleanUrl) return PLACEHOLDER_COVER;

  // Use wsrv.nl (formerly images.weserv.nl) as an image proxy/cache
  // It supports resizing, optimization, and most importantly, CORS headers.
  // We remove the protocol 'https://' because wsrv prefers just the domain/path, 
  // but it handles full URLs too if encoded correctly.
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=400&h=600&fit=cover&a=top&output=webp`;
};