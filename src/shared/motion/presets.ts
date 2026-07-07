export const pageTransition = {
  initial: {
    opacity: 0,
    y: 12,
    filter: "blur(6px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
  transition: {
    duration: 0.35,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

export const listContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
} as const;

export const listItem = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  transition: {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

export const cardHover = {
  y: -3,
  scale: 1.01,
  transition: {
    duration: 0.18,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

export const pressTap = {
  scale: 0.98,
} as const;