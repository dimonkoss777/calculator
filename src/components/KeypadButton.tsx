/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { playTickSound } from '../utils/audio';

interface KeypadButtonProps {
  id: string;
  label: string | ReactNode;
  onClick: () => void;
  variant?: 'digit' | 'operator' | 'control' | 'memory' | 'scientific';
  soundType?: 'number' | 'operator' | 'clear' | 'equals';
  isSoundEnabled: boolean;
  isKeyboardPresetActive?: boolean;
  key?: any;
}

export default function KeypadButton({
  id,
  label,
  onClick,
  variant = 'digit',
  soundType = 'number',
  isSoundEnabled,
  isKeyboardPresetActive = false,
}: KeypadButtonProps) {
  
  const handlePress = () => {
    if (isSoundEnabled) {
      playTickSound(soundType);
    }
    onClick();
  };

  // Modern sleek color variations according to Vibrant Palette theme guidance
  const variants = {
    digit: 'bg-slate-800/80 text-white hover:bg-slate-700 active:bg-slate-600 shadow-md border border-slate-700/20',
    operator: 'bg-amber-500 text-white hover:bg-amber-400 active:bg-amber-300 font-bold shadow-md shadow-amber-500/10 border border-amber-400/20',
    control: 'bg-slate-800/50 text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 active:bg-slate-600 font-semibold border border-slate-700/20',
    memory: 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-semibold uppercase tracking-wider border border-slate-800/20',
    scientific: 'bg-slate-800/30 text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700 border border-slate-800/40 text-sm font-medium',
  };

  // Special-case equals key styling override to shine in glowing fuchsia
  const isEqualsButton = id === 'action-equals';
  const customStyleClass = isEqualsButton 
    ? 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 active:bg-fuchsia-400 font-bold shadow-lg shadow-fuchsia-500/25 border border-fuchsia-500/20'
    : variants[variant];

  return (
    <motion.button
      id={id}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.94 }}
      animate={isKeyboardPresetActive ? { scale: 0.94, backgroundColor: 'rgba(217, 70, 239, 0.4)' } : {}}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      onClick={handlePress}
      className={`
        relative flex items-center justify-center rounded-3xl py-4.5 text-lg font-display select-none cursor-pointer duration-150 transition-colors
        ${customStyleClass}
        ${isKeyboardPresetActive ? 'ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-slate-950' : ''}
      `}
    >
      <span className="flex items-center justify-center gap-1">
        {label}
      </span>
      {/* Light glossy effect on top */}
      <span className="absolute inset-x-0 top-0 h-[1px] bg-white/5 rounded-t-2xl pointer-events-none" />
    </motion.button>
  );
}
