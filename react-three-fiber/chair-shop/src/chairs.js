// product catalogue + the closing section, in scroll order.
// the three chairs are the same mid-century tub armchair in three colourways;
// specs are shared, price/name/copy differ per finish.

const sharedSpecs = [
  ['Frame', 'Solid stained beech legs'],
  ['Upholstery', 'Textured wool blend'],
  ['Dimensions', 'W 76 x D 74 x H 78 cm'],
  ['Seat height', '42 cm'],
  ['Weight', '14 kg'],
  ['Assembly', 'Legs only, ~5 min'],
]

export const CHAIRS = [
  {
    id: 'armchairYellow',
    name: 'Ritchie Ochre',
    colorway: 'Ochre',
    swatch: '#b8971f',
    price: 890,
    bg: '#f15946',
    title: ['Meet the new', 'shopping experience', 'for online chairs'],
    tagline: 'A warm mustard tub chair that anchors a room without shouting.',
    specs: sharedSpecs,
  },
  {
    id: 'armchairGreen',
    name: 'Ritchie Fern',
    colorway: 'Fern',
    swatch: '#3f7d4f',
    price: 890,
    bg: '#571ec1',
    title: ['And we even', 'got different colors'],
    tagline: 'Deep fern green with the same soft, hand-tufted back.',
    specs: sharedSpecs,
  },
  {
    id: 'armchairGray',
    name: 'Ritchie Slate',
    colorway: 'Slate',
    swatch: '#6f7275',
    price: 840,
    bg: '#636567',
    title: ['And yes', 'we even got', 'monochrome'],
    tagline: 'Quiet slate grey that slots into any palette.',
    specs: sharedSpecs,
  },
]

// final scroll page: no model, just a call to action
export const CLOSING = {
  id: 'closing',
  bg: '#111318',
  heading: 'Ready to sit better?',
  sub: 'Free delivery, 30-day returns, and a 10-year frame warranty on every Ritchie.',
}

// background colour stops, one per scroll page (chairs + closing)
export const BG_STOPS = [...CHAIRS.map((c) => c.bg), CLOSING.bg]

export const PAGES = CHAIRS.length + 1

export const money = (n) => `$${n.toLocaleString('en-US')}`
