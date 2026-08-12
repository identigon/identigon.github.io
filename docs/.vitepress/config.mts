import { defineConfig } from 'vitepress'

const description = 'Deterministic pseudonymisation and privacy-preserving database cloning.'

export default defineConfig({
  title: 'Identigon',
  description,
  cleanUrls: true,
  lastUpdated: true,
  // @experimental in VitePress 1.x -- generates sitemap.xml from the built page list.
  sitemap: {
    hostname: 'https://identigon.org',
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Identigon' }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: 'https://identigon.org/' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'Identigon' }],
    ['meta', { name: 'twitter:description', content: description }],
  ],
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'About', link: '/about' },
      {
        text: 'Changelog',
        link: 'https://github.com/identigon/identigon/blob/main/CHANGELOG.md',
      },
      { text: 'GitHub', link: 'https://github.com/identigon/identigon' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/identigon/identigon' },
    ],
    editLink: {
      pattern: 'https://github.com/identigon/identigon.github.io/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 David Conneely',
    },
  },
})
