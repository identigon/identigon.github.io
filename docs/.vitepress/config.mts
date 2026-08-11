import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Identigon',
  description: 'Deterministic pseudonymisation and privacy-preserving database cloning.',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'About', link: '/about' },
      { text: 'GitHub', link: 'https://github.com/identigon/identigon' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/identigon/identigon' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 David Conneely',
    },
  },
})
