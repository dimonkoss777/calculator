/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Trash2, History, RotateCcw } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryTapeProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onSelectFormula: (formula: string) => void;
  onSelectResult: (result: string) => void;
}

export default function HistoryTape({
  history,
  onClearHistory,
  onSelectFormula,
  onSelectResult,
}: HistoryTapeProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3 text-slate-100 font-display text-sm tracking-wider uppercase font-semibold">
          <div className="w-8 h-8 rounded-lg bg-fuchsia-500 flex items-center justify-center shadow-md shadow-fuchsia-500/20">
            <History className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-fuchsia-400 font-bold tracking-tight">История</span>
        </div>
        {history.length > 0 && (
          <motion.button
            id="clear-history-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClearHistory}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            title="Очистить историю"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </motion.button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 py-8">
              <History className="w-8 h-8 opacity-20 text-fuchsia-500" />
              <p className="text-sm font-display tracking-wide font-medium">Лента пуста</p>
              <p className="text-xs text-center text-slate-500">История появится после вычислений</p>
            </div>
          ) : (
            history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/40 rounded-2xl p-4 transition-all flex flex-col gap-1"
              >
                {/* Equation formula */}
                <button
                  id={`history-${item.id}-formula`}
                  onClick={() => onSelectFormula(item.formula)}
                  className="text-left font-mono text-sm text-slate-300 hover:text-fuchsia-400 break-all transition-colors cursor-pointer pr-8 leading-relaxed"
                  title="Вернуть выражение в поле"
                >
                  {item.formula}
                </button>

                {/* Split line */}
                <div className="flex items-baseline justify-between select-none mt-1">
                  <span className="text-slate-550 font-mono text-[10px]">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {/* Calculated value */}
                  <button
                    id={`history-${item.id}-result`}
                    onClick={() => onSelectResult(item.result)}
                    className="text-right font-display text-lg font-semibold text-fuchsia-300 hover:text-fuchsia-200 break-all transition-colors cursor-pointer"
                    title="Использовать как операнд"
                  >
                    = {item.result}
                  </button>
                </div>

                {/* Fast reuse indicators on hover */}
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <RotateCcw className="w-3.5 h-3.5 text-fuchsia-400/50 pointer-events-none" />
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
