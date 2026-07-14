import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { pageTransition } from "../motion/presets";

type MotionPageProps = {
  children: ReactNode;
  className?: string;
};

export function MotionPage({ children, className = "" }: MotionPageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : pageTransition.initial}
      animate={pageTransition.animate}
      transition={reduceMotion ? { duration: 0 } : pageTransition.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
