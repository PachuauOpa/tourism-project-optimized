export const pageMotion = {
  initial: { opacity: 0, x: 6 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -6 },
  transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as any },
};
