const config = {
  theme: {
    default: 0,
    states: ['light', 'dark'],
  },
  controls: {
    growing: {
      elements: ['Mailbox', 'Lamp', 'FloorFirst', 'FloorSecond', 'FloorThird', 'Dirt', 'Flower1', 'Flower2'],
      tween: {
        x: 1,
        y: 1,
        z: 1,
        ease: "back.out(2)",
        duration: 0.3,
      }
    }
  },
}

export default config;