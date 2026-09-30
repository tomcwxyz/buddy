"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { OcrBox } from "@/lib/ocr/types";

type ReadingBuddyCursorProps = {
  bounds: OcrBox[];
  pageWidth: number;
  pageHeight: number;
  progress: number;
  speaking: boolean;
};

function positionAlongBounds(bounds: OcrBox[], progress: number) {
  const ordered = [...bounds].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  if (!ordered.length) return { x: 0, y: 0 };

  const widths = ordered.map((box) => Math.max(1, box.x1 - box.x0));
  const total = widths.reduce((sum, width) => sum + width, 0);
  let remaining = Math.max(0, Math.min(1, progress)) * total;

  for (let index = 0; index < ordered.length; index += 1) {
    const box = ordered[index];
    const width = widths[index];
    if (remaining <= width || index === ordered.length - 1) {
      const local = Math.max(0, Math.min(1, remaining / width));
      return {
        x: box.x0 + width * local,
        y: box.y0 + (box.y1 - box.y0) * 0.48,
      };
    }
    remaining -= width;
  }

  const last = ordered[ordered.length - 1];
  return { x: last.x1, y: (last.y0 + last.y1) / 2 };
}

export function ReadingBuddyCursor({
  bounds,
  pageWidth,
  pageHeight,
  progress,
  speaking,
}: ReadingBuddyCursorProps) {
  const reduceMotion = useReducedMotion();
  const point = positionAlongBounds(bounds, progress);
  if (!bounds.length || pageWidth <= 0 || pageHeight <= 0) return null;

  return (
    <motion.div
      className="reading-buddy-cursor"
      aria-hidden="true"
      data-speaking={speaking ? "true" : "false"}
      animate={{
        left: `${(point.x / pageWidth) * 100}%`,
        top: `${(point.y / pageHeight) * 100}%`,
      }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28, mass: 0.55 }}
    >
      <motion.span
        className="reading-buddy-body"
        animate={reduceMotion || !speaking
          ? undefined
          : {
              y: [0, -2, 0, -1, 0],
              scaleX: [1, 1.05, 0.98, 1.03, 1],
              scaleY: [1, 0.96, 1.03, 0.98, 1],
            }}
        transition={{ duration: 0.82, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="reading-buddy-eye reading-buddy-eye-left" />
        <span className="reading-buddy-eye reading-buddy-eye-right" />
        <span className="reading-buddy-mouth" />
      </motion.span>
      <span className="reading-buddy-tail" />
    </motion.div>
  );
}
