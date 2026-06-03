/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class MathExpressionParser {
  private pos = 0;
  private tokens: string[] = [];

  constructor(expression: string) {
    this.tokens = this.tokenize(expression);
  }

  private tokenize(expr: string): string[] {
    // Standardize spacing and operators
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'π')
      .replace(/e/g, 'e')
      // Map root symbol √ to a function form
      .replace(/√/g, '√');

    // Regex matching numbers (floating points), standard operators, brackets, functions
    const regex = /\d+(\.\d+)?|[+\-*/^()!]|sin|cos|tan|ln|log|√|π|e/g;
    return sanitized.match(regex) || [];
  }

  public parse(): number {
    this.pos = 0;
    if (this.tokens.length === 0) return 0;
    const val = this.parseExpression();
    if (this.pos < this.tokens.length) {
      // Tolerate leftover tokens or trailing tags for unfinished equations
    }
    return val;
  }

  // parses + and -
  private parseExpression(): number {
    let result = this.parseTerm();
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token === '+' || token === '-') {
        this.pos++;
        const nextVal = this.parseTerm();
        if (token === '+') result += nextVal;
        else result -= nextVal;
      } else {
        break;
      }
    }
    return result;
  }

  // parses * and /
  private parseTerm(): number {
    let result = this.parseFactor();
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token === '*' || token === '/') {
        this.pos++;
        const nextVal = this.parseFactor();
        if (token === '*') {
          result *= nextVal;
        } else {
          if (nextVal === 0) throw new Error("Деление на ноль");
          result /= nextVal;
        }
      } else {
        break;
      }
    }
    return result;
  }

  // parses powers (^)
  private parseFactor(): number {
    let result = this.parseFactorial();
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token === '^') {
        this.pos++;
        const nextVal = this.parseFactor(); // right-associative power binding
        result = Math.pow(result, nextVal);
      } else {
        break;
      }
    }
    return result;
  }

  // parses factorial (!)
  private parseFactorial(): number {
    let result = this.parsePrimary();
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token === '!') {
        this.pos++;
        result = this.factorial(result);
      } else {
        break;
      }
    }
    return result;
  }

  private factorial(n: number): number {
    if (n < 0) throw new Error("Факториал < 0");
    if (!Number.isInteger(n)) throw new Error("Факториал дробного");
    if (n > 170) throw new Error("Бесконечность"); // Maximum JS factorial limit
    let f = 1;
    for (let i = 2; i <= n; i++) {
      f *= i;
    }
    return f;
  }

  // parses bases, functions, parentheses, and constants
  private parsePrimary(): number {
    if (this.pos >= this.tokens.length) {
      return 0; // Return zero as active identity to avoid parsing crash on half-typed formulas
    }
    const token = this.tokens[this.pos];

    if (token === '(') {
      this.pos++;
      const val = this.parseExpression();
      if (this.pos < this.tokens.length && this.tokens[this.pos] === ')') {
        this.pos++;
      }
      return val;
    }

    if (token === '-') {
      this.pos++;
      return -this.parsePrimary();
    }

    if (token === '+') {
      this.pos++;
      return this.parsePrimary();
    }

    // Inbuilt scientific trigonometry and constants
    if (['sin', 'cos', 'tan', 'ln', 'log', '√'].includes(token)) {
      this.pos++;
      const innerVal = this.parsePrimary();
      switch (token) {
        case 'sin':
          // Convert to radians (standard web inputs are degrees or radians, let's assume Radian solver by default but can be evaluated simply)
          return Math.sin(innerVal);
        case 'cos':
          return Math.cos(innerVal);
        case 'tan':
          return Math.tan(innerVal);
        case 'ln':
          if (innerVal <= 0) throw new Error("ln <= 0");
          return Math.log(innerVal);
        case 'log':
          if (innerVal <= 0) throw new Error("log <= 0");
          return Math.log10(innerVal);
        case '√':
          if (innerVal < 0) throw new Error("Корень из < 0");
          return Math.sqrt(innerVal);
      }
    }

    if (token === 'π') {
      this.pos++;
      return Math.PI;
    }

    if (token === 'e') {
      this.pos++;
      return Math.E;
    }

    const num = parseFloat(token);
    if (!isNaN(num)) {
      this.pos++;
      return num;
    }

    // If unexpected token, fail safely
    this.pos++;
    throw new Error(`Неизвестный символ: ${token}`);
  }
}

/**
 * Computes math calculations in real time.
 * Returns human-formatted string of computation or throws descriptive russian error strings block.
 */
export function evaluateExpression(expr: string): string {
  if (!expr || expr.trim() === '') return '';

  // Standardize percentage processing. If a value is written followed by %, divide it by 100
  // Handle expression % conversion. We replace single value expressions or numbers with /100.
  // We can do standard substitution: match any number of digits followed by % and append * 0.01
  let parsed = expr
    .replace(/(\d+(\.\d+)?)\s*%/g, '($1 * 0.01)')
    // Also change scientific formulas if a user forgets opening bracket for function e.g. sin 90 -> sin(90)
    // We can handle: sin deg/rad, cos etc. To be robust, if function is typed but has no bracket, append one
    .replace(/(sin|cos|tan|ln|log|√)\s*(\d+(\.\d+)?|π|e)/g, '$1($2)')
    .replace(/\s/g, ''); // strip spaces

  try {
    const parser = new MathExpressionParser(parsed);
    const result = parser.parse();

    if (isNaN(result)) {
      return 'Ошибка';
    }

    if (!isFinite(result)) {
      return 'Бесконечность';
    }

    // Format output beautifully
    // If it has lot of float digits, round nicely to 10 decimal places to prevent float precision bugs (e.g. 0.1 + 0.2 = 0.30000000004)
    if (Math.abs(result) < 1e-12) return '0';
    
    // Check if integer
    if (Number.isInteger(result)) {
      return result.toString();
    }

    // Floating decimals, limit representation size
    const fixedValue = parseFloat(result.toFixed(10));
    return fixedValue.toString();
  } catch (err: any) {
    throw new Error(err.message || 'Ошибка вычислений');
  }
}
