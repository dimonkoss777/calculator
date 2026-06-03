/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HistoryItem {
  id: string;
  formula: string;
  result: string;
  timestamp: number;
}

export type CalcMode = 'simple' | 'scientific';

export interface CalculatorState {
  formula: string;
  displayValue: string;
  mode: CalcMode;
  isSoundEnabled: boolean;
  memory: number;
  history: HistoryItem[];
  hasJustEvaluated: boolean;
}
