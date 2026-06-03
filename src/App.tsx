/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Delete,
  CornerDownLeft,
  Divide,
  Percent,
  X,
  Plus,
  Minus,
  Equal,
  Shuffle,
  Binary,
  Maximize2,
  Minimize2,
  FlameKindling,
} from 'lucide-react';

import { HistoryItem, CalcMode } from './types';
import { evaluateExpression } from './utils/mathParser';
import { playTickSound } from './utils/audio';
import KeypadButton from './components/KeypadButton';
import HistoryTape from './components/HistoryTape';

export default function App() {
  // State management
  const [formula, setFormula] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [mode, setMode] = useState<CalcMode>('simple');
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasJustEvaluated, setHasJustEvaluated] = useState<boolean>(false);
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [activeShortcutKey, setActiveShortcutKey] = useState<string | null>(null);

  // Auto scroll output window
  const displayEndRef = useRef<HTMLDivElement>(null);

  // Load history & sound preference on startup
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('calc_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const savedSound = localStorage.getItem('calc_sound');
      if (savedSound !== null) {
        setIsSoundEnabled(JSON.parse(savedSound));
      }
    } catch (e) {
      console.warn('Could not read from local storage:', e);
    }
  }, []);

  // Save history helper
  const updateSavedHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('calc_history', JSON.stringify(newHistory));
    } catch (e) {
      console.warn('Could not save to local storage:', e);
    }
  };

  // Keyboard support mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent standard browser search on "/"
      if (e.key === '/') {
        e.preventDefault();
      }

      let keyId = '';
      if (e.key >= '0' && e.key <= '9') {
        keyId = `digit-${e.key}`;
        handleDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        keyId = 'digit-dot';
        handleDigit('.');
      } else if (e.key === '+') {
        keyId = 'op-add';
        handleOperator('+');
      } else if (e.key === '-') {
        keyId = 'op-sub';
        handleOperator('-');
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        keyId = 'op-mul';
        handleOperator('×');
      } else if (e.key === '/') {
        keyId = 'op-div';
        handleOperator('÷');
      } else if (e.key === '%') {
        keyId = 'op-percent';
        handleOperator('%');
      } else if (e.key === '^') {
        keyId = 'op-pow';
        handleOperator('^');
      } else if (e.key === '!') {
        keyId = 'op-fact';
        handleOperator('!');
      } else if (e.key === '(') {
        keyId = 'paren-open';
        handleParentheses('(');
      } else if (e.key === ')') {
        keyId = 'paren-close';
        handleParentheses(')');
      } else if (e.key === 'Enter' || e.key === '=') {
        keyId = 'action-equals';
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        keyId = 'action-backspace';
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        keyId = 'action-clear';
        handleClear();
      } else {
        return; // ignore other keys
      }

      // Briefly trigger flashing highlights
      if (keyId) {
        if (isSoundEnabled) {
          // Play matching sound for keyboard keys
          if (keyId.includes('op-')) playTickSound('operator');
          else if (keyId === 'action-equals') playTickSound('equals');
          else if (keyId === 'action-clear') playTickSound('clear');
          else playTickSound('number');
        }
        setActiveShortcutKey(keyId);
        setTimeout(() => setActiveShortcutKey(null), 120);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formula, isSoundEnabled, hasJustEvaluated]);

  // Scroll output display screen as text changes to keep cursor visible
  useEffect(() => {
    displayEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [formula]);

  // Input Handlers
  const handleDigit = (digit: string) => {
    if (hasJustEvaluated) {
      if (digit === '.') {
        setFormula('0.');
      } else {
        setFormula(digit);
      }
      setHasJustEvaluated(false);
    } else {
      // Prevent multiple sequential decimals in the current operand
      if (digit === '.') {
        const parts = formula.split(/[+\-*/^()×÷!]/);
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('.')) return; // Already has a decimal dot
      }
      setFormula((prev) => prev + digit);
    }
  };

  const handleOperator = (op: string) => {
    if (hasJustEvaluated) {
      // Use result as prefix for subsequent expressions
      setFormula(displayValue + op);
      setHasJustEvaluated(false);
    } else {
      // Avoid starting with operators except negative sign
      if (formula === '') {
        if (op === '-') {
          setFormula('-');
        }
        return;
      }

      // Avoid repeating active high precedence operators
      const lastChar = formula.trim().slice(-1);
      const operatorsList = ['+', '-', '×', '÷', '^', '%', '!'];
      if (operatorsList.includes(lastChar)) {
        // Swap operator if typed consecutively
        setFormula((prev) => prev.slice(0, -1) + op);
      } else {
        setFormula((prev) => prev + op);
      }
    }
  };

  const handleParentheses = (paren?: '(' | ')') => {
    if (hasJustEvaluated) {
      setFormula(paren || '(');
      setHasJustEvaluated(false);
      return;
    }

    if (paren) {
      setFormula((prev) => prev + paren);
      return;
    }

    // Smart Brackets engine
    const openCount = (formula.match(/\(/g) || []).length;
    const closeCount = (formula.match(/\)/g) || []).length;
    const lastChar = formula.slice(-1);

    if (openCount > closeCount && lastChar !== '(' && !['+', '-', '×', '÷', '^'].includes(lastChar)) {
      setFormula((prev) => prev + ')');
    } else {
      if (lastChar !== '' && !['+', '-', '×', '÷', '^', '('].includes(lastChar)) {
        setFormula((prev) => prev + '×(');
      } else {
        setFormula((prev) => prev + '(');
      }
    }
  };

  const handleScientificFunc = (func: string) => {
    // Inserts function call wrapped in opening parenthesis, e.g., cos(
    if (hasJustEvaluated) {
      setFormula(func + '(');
      setHasJustEvaluated(false);
    } else {
      const lastChar = formula.slice(-1);
      // Auto-insert implicit multiplication if preceding element is a number
      if (lastChar !== '' && /\d|\)|π|e/.test(lastChar)) {
        setFormula((prev) => prev + '×' + func + '(');
      } else {
        setFormula((prev) => prev + func + '(');
      }
    }
  };

  const handleClear = () => {
    setFormula('');
    setDisplayValue('0');
    setHasJustEvaluated(false);
  };

  const handleBackspace = () => {
    if (hasJustEvaluated) {
      handleClear();
      return;
    }

    // Check if ending with trigonometric/log functions to delete them in one chunk
    const functions = ['sin(', 'cos(', 'tan(', 'ln(', 'log('];
    let deletedAmount = 0;
    for (const fn of functions) {
      if (formula.endsWith(fn)) {
        deletedAmount = fn.length;
        break;
      }
    }

    if (deletedAmount > 0) {
      setFormula((prev) => prev.slice(0, -deletedAmount));
    } else {
      setFormula((prev) => prev.slice(0, -1));
    }
  };

  const handleEvaluate = () => {
    if (!formula.trim()) return;

    try {
      const evalResult = evaluateExpression(formula);
      setDisplayValue(evalResult);

      // Create log entry in database
      const newTape: HistoryItem = {
        id: crypto.randomUUID(),
        formula,
        result: evalResult,
        timestamp: Date.now(),
      };

      const updatedHistory = [newTape, ...history].slice(0, 50); // limit 50 logs
      updateSavedHistory(updatedHistory);
      setHasJustEvaluated(true);
    } catch (e: any) {
      // Trigger rich tactile shake feedback and display visual alarm
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 500);
      setDisplayValue('Ошибка');
    }
  };

  // Memory Register Operations
  const handleMemory = (action: 'MC' | 'MR' | 'M+' | 'M-' | 'MS') => {
    const currentValue = parseFloat(displayValue) || 0;

    switch (action) {
      case 'MC':
        setMemory(0);
        break;
      case 'MR':
        setFormula((prev) => prev + (memory.toString()));
        setHasJustEvaluated(false);
        break;
      case 'M+':
        setMemory((prev) => prev + currentValue);
        break;
      case 'M-':
        setMemory((prev) => prev - currentValue);
        break;
      case 'MS':
        setMemory(currentValue);
        break;
    }
  };

  const toggleSound = () => {
    const newVal = !isSoundEnabled;
    setIsSoundEnabled(newVal);
    localStorage.setItem('calc_sound', JSON.stringify(newVal));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-950 font-sans relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950 text-slate-100">
      {/* Decorative premium metallic glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Core */}
      <div className="w-full max-w-5xl z-10">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 select-none">
          {/* Header Title with premium badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <span className="font-display font-bold text-lg text-white">apk</span>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-2">
                Калькулятор <span className="text-xs font-mono py-0.5 px-2 bg-slate-900 border border-slate-800 text-fuchsia-400 rounded-full leading-none">Vibrant</span>
              </h1>
              <p className="text-xs text-slate-400">Интерактивный инженерный вычислитель &bull; Автор: DIMONKOSS.</p>
            </div>
          </div>

          {/* Quick utility controls */}
          <div className="flex items-center gap-2">
            {/* Memory indicator visual pill */}
            {memory !== 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/40 px-3 py-1.5 rounded-full"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                <span className="text-[10px] font-mono text-fuchsia-300 font-semibold uppercase tracking-wider">
                  Патч: M ({memory})
                </span>
              </motion.div>
            )}

            {/* Compact Toggle Mode Button */}
            <motion.button
              id="mode-toggle-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode(mode === 'simple' ? 'scientific' : 'simple')}
              className={`px-3.5 py-2 text-xs font-display font-semibold rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'scientific'
                  ? 'bg-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-350 hover:bg-fuchsia-600/35'
                  : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${mode === 'scientific' ? 'bg-fuchsia-400 animate-pulse' : 'bg-slate-400'}`} />
              <span>{mode === 'scientific' ? 'Инженерный' : 'Обычный'}</span>
            </motion.button>

            {/* Tactile Audio Mute Toggle Button */}
            <motion.button
              id="sound-toggle-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSound}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isSoundEnabled
                  ? 'bg-slate-800/50 border-slate-700/40 text-cyan-400 hover:text-cyan-300'
                  : 'bg-slate-950 border-slate-900 text-slate-600'
              }`}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </motion.button>

            {/* Quick Keyboard manual helper button */}
            <motion.button
              id="help-toggle-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setHelpOpen(!helpOpen)}
              className="p-2.5 bg-slate-800/50 border border-slate-700/40 rounded-2xl text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </motion.button>
          </div>
        </header>

        {/* Centered Calculator Device Core */}
        <div className="max-w-2xl mx-auto">
          
          {/* Main Calculator Device Core */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-[32px] p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            {/* LED Screen Display Panel */}
            <motion.div
              animate={errorShake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`
                bg-slate-950/90 rounded-2xl p-5 border min-h-[140px] flex flex-col justify-between relative mb-6 overflow-hidden transition-all
                ${errorShake ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-slate-800/60 shadow-[inset_0_4px_30px_rgba(0,0,0,0.4)]'}
              `}
            >
              {/* Formula LCD backlight grid decoration */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />

              {/* Top LCD flags (Mode, Sound, Memory indicators) */}
              <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-500 select-none uppercase z-10 mb-2">
                <div className="flex items-center gap-3">
                  <span className={mode === 'scientific' ? 'text-cyan-400 font-bold' : ''}>
                    {mode === 'scientific' ? 'DEG | SCI' : 'STD'}
                  </span>
                  <span>HEX</span>
                </div>
                <div className="flex items-center gap-2">
                  {memory !== 0 && <span className="text-fuchsia-400 animate-pulse font-bold">[M]</span>}
                  {isSoundEnabled && <span className="text-cyan-400">[AUDIO TACTILE]</span>}
                </div>
              </div>

              {/* Active Equation text field */}
              <div className="text-right overflow-x-auto whitespace-nowrap py-2 text-slate-400 font-mono text-2xl font-light scrollbar-none scroll-smooth">
                {formula || <span className="opacity-15 font-mono">0</span>}
                <div ref={displayEndRef} />
              </div>

              {/* Evaluated Live Output Row with glowing cursor indicator */}
              <div className="text-right overflow-x-auto whitespace-nowrap text-4xl md:text-6xl font-sans font-bold tracking-tighter text-white scrollbar-none flex items-center justify-end">
                <span>{displayValue}</span>
                <span className="text-fuchsia-500 animate-pulse ml-0.5 select-none font-light">|</span>
              </div>
            </motion.div>

            {/* Quick Memory Bank row of buttons */}
            <div className="grid grid-cols-5 gap-2.5 mb-5">
              {(['MC', 'MR', 'M+', 'M-', 'MS'] as const).map((meKey) => (
                <KeypadButton
                  id={`mem-${meKey}`}
                  key={meKey}
                  label={meKey}
                  variant="memory"
                  onClick={() => handleMemory(meKey)}
                  isSoundEnabled={isSoundEnabled}
                />
              ))}
            </div>

            {/* Dynamic Interactive Keypad Grid with Framer Motion Layout animations */}
            <motion.div layout className="grid grid-cols-12 gap-3">
              
              {/* Scientific sub-panel sliding module */}
              <AnimatePresence>
                {mode === 'scientific' && (
                  <motion.div
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="col-span-12 md:col-span-4 grid grid-cols-3 md:grid-cols-2 gap-3"
                  >
                    <KeypadButton
                      id="sci-sin"
                      label="sin"
                      variant="scientific"
                      onClick={() => handleScientificFunc('sin')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-cos"
                      label="cos"
                      variant="scientific"
                      onClick={() => handleScientificFunc('cos')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-tan"
                      label="tan"
                      variant="scientific"
                      onClick={() => handleScientificFunc('tan')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-pow"
                      label="x^y"
                      variant="scientific"
                      onClick={() => handleOperator('^')}
                      isSoundEnabled={isSoundEnabled}
                      isKeyboardPresetActive={activeShortcutKey === 'op-pow'}
                    />
                    <KeypadButton
                      id="sci-sqrt"
                      label="√"
                      variant="scientific"
                      onClick={() => handleScientificFunc('√')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-fact"
                      label="x!"
                      variant="scientific"
                      onClick={() => handleOperator('!')}
                      isSoundEnabled={isSoundEnabled}
                      isKeyboardPresetActive={activeShortcutKey === 'op-fact'}
                    />
                    <KeypadButton
                      id="sci-pi"
                      label="π"
                      variant="scientific"
                      onClick={() => handleDigit('π')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-e"
                      label="e"
                      variant="scientific"
                      onClick={() => handleDigit('e')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-ln"
                      label="ln"
                      variant="scientific"
                      onClick={() => handleScientificFunc('ln')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-log"
                      label="log"
                      variant="scientific"
                      onClick={() => handleScientificFunc('log')}
                      isSoundEnabled={isSoundEnabled}
                    />
                    <KeypadButton
                      id="sci-paren-open"
                      label="("
                      variant="scientific"
                      onClick={() => handleParentheses('(')}
                      isSoundEnabled={isSoundEnabled}
                      isKeyboardPresetActive={activeShortcutKey === 'paren-open'}
                    />
                    <KeypadButton
                      id="sci-paren-close"
                      label=")"
                      variant="scientific"
                      onClick={() => handleParentheses(')')}
                      isSoundEnabled={isSoundEnabled}
                      isKeyboardPresetActive={activeShortcutKey === 'paren-close'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Standard core numeric/operators dialler pad */}
              <div className={`col-span-12 ${mode === 'scientific' ? 'md:col-span-8' : ''} grid grid-cols-4 gap-3`}>
                
                {/* Row 1 */}
                <KeypadButton
                  id="action-clear"
                  label="AC"
                  variant="control"
                  soundType="clear"
                  onClick={handleClear}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'action-clear'}
                />
                <KeypadButton
                  id="action-parens"
                  label="()"
                  variant="control"
                  onClick={() => handleParentheses()}
                  isSoundEnabled={isSoundEnabled}
                />
                <KeypadButton
                  id="op-percent"
                  label="%"
                  variant="control"
                  soundType="operator"
                  onClick={() => handleOperator('%')}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'op-percent'}
                />
                <KeypadButton
                  id="op-div"
                  label="÷"
                  variant="operator"
                  soundType="operator"
                  onClick={() => handleOperator('÷')}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'op-div'}
                />

                {/* Row 2 */}
                {[7, 8, 9].map((num) => (
                  <KeypadButton
                    id={`digit-${num}`}
                    key={num}
                    label={num.toString()}
                    variant="digit"
                    onClick={() => handleDigit(num.toString())}
                    isSoundEnabled={isSoundEnabled}
                    isKeyboardPresetActive={activeShortcutKey === `digit-${num}`}
                  />
                ))}
                <KeypadButton
                  id="op-mul"
                  label="×"
                  variant="operator"
                  soundType="operator"
                  onClick={() => handleOperator('×')}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'op-mul'}
                />

                {/* Row 3 */}
                {[4, 5, 6].map((num) => (
                  <KeypadButton
                    id={`digit-${num}`}
                    key={num}
                    label={num.toString()}
                    variant="digit"
                    onClick={() => handleDigit(num.toString())}
                    isSoundEnabled={isSoundEnabled}
                    isKeyboardPresetActive={activeShortcutKey === `digit-${num}`}
                  />
                ))}
                <KeypadButton
                  id="op-sub"
                  label="-"
                  variant="operator"
                  soundType="operator"
                  onClick={() => handleOperator('-')}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'op-sub'}
                />

                {/* Row 4 */}
                {[1, 2, 3].map((num) => (
                  <KeypadButton
                    id={`digit-${num}`}
                    key={num}
                    label={num.toString()}
                    variant="digit"
                    onClick={() => handleDigit(num.toString())}
                    isSoundEnabled={isSoundEnabled}
                    isKeyboardPresetActive={activeShortcutKey === `digit-${num}`}
                  />
                ))}
                <KeypadButton
                  id="op-add"
                  label="+"
                  variant="operator"
                  soundType="operator"
                  onClick={() => handleOperator('+')}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'op-add'}
                />

                {/* Row 5 */}
                <KeypadButton
                  id="digit-0"
                  label="0"
                  variant="digit"
                  onClick={() => handleDigit('0')}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'digit-0'}
                />
                <KeypadButton
                  id="digit-dot"
                  label="."
                  variant="digit"
                  onClick={() => handleDigit('.')}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'digit-dot'}
                />
                <KeypadButton
                  id="action-backspace"
                  label={<Delete className="w-5 h-5" />}
                  variant="control"
                  soundType="clear"
                  onClick={handleBackspace}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'action-backspace'}
                />
                <KeypadButton
                  id="action-equals"
                  label={<Equal className="w-6 h-6 text-zinc-950" />}
                  variant="operator"
                  soundType="equals"
                  onClick={handleEvaluate}
                  isSoundEnabled={isSoundEnabled}
                  isKeyboardPresetActive={activeShortcutKey === 'action-equals'}
                />
              </div>

            </motion.div>
          </div>

        </div>

        {/* Floating Quick keyboard shortcuts overlay modal panel */}
        <AnimatePresence>
          {helpOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="mt-6 p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col gap-3 select-none"
            >
              <div className="flex items-center justify-between text-slate-200">
                <span className="font-display font-semibold text-sm text-fuchsia-400">Клавиатурные Сочетания</span>
                <button
                  id="close-help-button"
                  onClick={() => setHelpOpen(false)}
                  className="text-slate-550 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono text-slate-400">
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Числа / Точка</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">0 - 9 / .</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Вычислить</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">Enter / =</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Стереть символ</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">Backspace</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Сбросить всё</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">Esc / C</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Умножить / Делить</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">* / /</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Возведение в степень</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">^</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Скобки</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">( / )</kbd>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span>Проценты / Факториал</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-805 rounded text-[10px] text-fuchsia-400">% / !</kbd>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-8 text-center text-[10px] text-slate-600 font-mono tracking-widest select-none uppercase">
          CALCULATOR MOBILE SHELL PLATFORM &bull; DESIGN BY VIBRANT PALETTE THEME &bull; AUTHOR: DIMONKOSS.
        </footer>
      </div>
    </div>
  );
}
