import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.opendeepresearch.dev',
      lastModified: new Date(),
    },
  ];
}