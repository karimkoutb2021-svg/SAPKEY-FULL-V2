'use client';

import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface NumpadProps {
  onInput: (value: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onEnter: () => void;
}

const numpadKeys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', '.'],
];

export function Numpad({ onInput, onClear, onBackspace, onEnter }: NumpadProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {numpadKeys.map((row) =>
        row.map((key) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.92 }}
            onClick={() => onInput(key)}
            className="h-11 rounded-lg bg-muted hover:bg-accent text-base font-medium transition-colors active:bg-accent touch-none select-none"
          >
            {key}
          </motion.button>
        ))
      )}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onClear}
        className="h-11 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
      >
        مسح
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onBackspace}
        className="h-11 rounded-lg bg-muted hover:bg-accent flex items-center justify-center"
      >
        <Delete className="h-4 w-4" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onEnter}
        className="h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        إدخال
      </motion.button>
    </div>
  );
}
