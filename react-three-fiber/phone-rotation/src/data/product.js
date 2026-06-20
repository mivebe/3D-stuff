// fictional luxury brand so the showcase is original (no real trademarks)

export const brand = {
  name: 'AURUM',
  product: 'AURUM One',
  tagline: 'Engineered in titanium. Finished in light.',
}

// each finish drives the phone body material (Material.001) live
export const finishes = [
  {
    id: 'midnight',
    label: 'Midnight',
    swatch: '#1b1f2a',
    color: '#11141c',
    metalness: 0.9,
    roughness: 0.38,
  },
  {
    id: 'champagne',
    label: 'Champagne',
    swatch: '#c9a96a',
    color: '#caa86a',
    metalness: 1.0,
    roughness: 0.28,
  },
  {
    id: 'graphite',
    label: 'Graphite',
    swatch: '#5a5b60',
    color: '#46474c',
    metalness: 0.95,
    roughness: 0.33,
  },
]

export const heroMessage = {
  eyeline: 'The new flagship',
  headline: ['A phone', 'cast in', 'pure light.'],
  body: 'A grade-5 titanium body, a display that disappears into glass, and a finish that catches the room. The AURUM One is the most considered phone we have ever made.',
}

// shown beside the hero message once the phone settles
export const specs = [
  { label: 'Display', value: '6.9" LTPO crystal' },
  { label: 'Frame', value: 'Grade-5 titanium' },
  { label: 'Chip', value: 'A-series Aurum' },
  { label: 'Camera', value: '48MP triple system' },
]

// content the phone screen "loads" into after the skeleton shimmer
export const screen = {
  time: '9:41',
  appName: brand.product,
  greeting: 'Good evening',
  rows: [
    { title: 'Titanium', sub: 'Grade-5, bead-blasted' },
    { title: 'Display', sub: '6.9" LTPO crystal' },
    { title: 'Aurum chip', sub: '3nm, 6-core GPU' },
    { title: 'Camera', sub: '48MP triple system' },
  ],
}

export const closing = {
  headline: 'Yours in titanium.',
  sub: 'Three finishes. One obsession with detail.',
}
