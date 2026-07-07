import type { ReactNode } from "react";
import { motion } from "motion/react";
import { pageTransition } from "../motion/presets";

type MotionPageProps = {
  children: ReactNode;
  className?: string;
};

export function MotionPage({ children, className = "" }: MotionPageProps) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}