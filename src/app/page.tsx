'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type CalcState = {
  display: string;
  expression: string;
  waitingForOperand: boolean;
  operator: string | null;
  previousValue: string | null;
  hasResult: boolean;
  error: string | null;
};

const initialState: CalcState = {
  display: '0',
  expression: '',
  waitingForOperand: false,
  operator: null,
  previousValue: null,
  hasResult: false,
  error: null,
};

function calculate(a: number, b: number, op: string): number | null {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      if (b === 0) return null;
      return a / b;
    default:
      return null;
  }
}

export default function CalculatorPage() {
  const [state, setState] = useState<CalcState>(initialState);

  const saveCalculation = useCallback(async (expression: string, result: string) => {
    try {
      await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression, result }),
      });
    } catch (e) {
      console.error('Failed to save calculation:', e);
    }
  }, []);

  const handleDigit = useCallback((digit: string) => {
    setState((prev) => {
      if (prev.error) return prev;

      if (prev.waitingForOperand || prev.hasResult) {
        return {
          ...prev,
          display: digit,
          waitingForOperand: false,
          hasResult: false,
        };
      }

      const newDisplay = prev.display === '0' ? digit : prev.display + digit;
      return { ...prev, display: newDisplay };
    });
  }, []);

  const handleDecimal = useCallback(() => {
    setState((prev) => {
      if (prev.error) return prev;

      if (prev.waitingForOperand || prev.hasResult) {
        return {
          ...prev,
          display: '0.',
          waitingForOperand: false,
          hasResult: false,
        };
      }

      if (prev.display.includes('.')) return prev;

      return { ...prev, display: prev.display + '.' };
    });
  }, []);

  const handleOperator = useCallback((op: string) => {
    setState((prev) => {
      if (prev.error) return prev;

      const current = parseFloat(prev.display);

      if (prev.operator && !prev.waitingForOperand && prev.previousValue !== null) {
        const previous = parseFloat(prev.previousValue);
        const result = calculate(previous, current, prev.operator);

        if (result === null) {
          return {
            ...initialState,
            display: 'Error: ÷ by 0',
            error: 'Division by zero',
          };
        }

        const resultStr = formatResult(result);
        const expr = `${prev.previousValue} ${prev.operator} ${prev.display} ${op}`;

        return {
          display: resultStr,
          expression: expr,
          waitingForOperand: true,
          operator: op,
          previousValue: resultStr,
          hasResult: false,
          error: null,
        };
      }

      return {
        ...prev,
        expression: `${prev.display} ${op}`,
        operator: op,
        previousValue: prev.display,
        waitingForOperand: true,
        hasResult: false,
      };
    });
  }, []);

  const handleEquals = useCallback(() => {
    setState((prev) => {
      if (prev.error) return prev;
      if (!prev.operator || prev.previousValue === null) return prev;

      const previous = parseFloat(prev.previousValue);
      const current = parseFloat(prev.display);
      const result = calculate(previous, current, prev.operator);

      const expression = `${prev.previousValue} ${prev.operator} ${prev.display}`;

      if (result === null) {
        saveCalculation(expression, 'Error: Division by zero');
        return {
          ...initialState,
          display: 'Error: ÷ by 0',
          error: 'Division by zero',
        };
      }

      const resultStr = formatResult(result);
      saveCalculation(expression, resultStr);

      return {
        display: resultStr,
        expression: `${expression} =`,
        waitingForOperand: false,
        operator: null,
        previousValue: null,
        hasResult: true,
        error: null,
      };
    });
  }, [saveCalculation]);

  const handleClear = useCallback(() => {
    setState(initialState);
  }, []);

  const handleBackspace = useCallback(() => {
    setState((prev) => {
      if (prev.error || prev.hasResult) {
        return initialState;
      }
      if (prev.display.length <= 1 || prev.display === '0') {
        return { ...prev, display: '0' };
      }
      return { ...prev, display: prev.display.slice(0, -1) };
    });
  }, []);

  const handleToggleSign = useCallback(() => {
    setState((prev) => {
      if (prev.error) return prev;
      const value = parseFloat(prev.display);
      if (isNaN(value)) return prev;
      return { ...prev, display: formatResult(-value) };
    });
  }, []);

  const handlePercent = useCallback(() => {
    setState((prev) => {
      if (prev.error) return prev;
      const value = parseFloat(prev.display);
      if (isNaN(value)) return prev;
      return { ...prev, display: formatResult(value / 100) };
    });
  }, []);

  function formatResult(value: number): string {
    if (!isFinite(value)) return 'Error';
    const str = value.toString();
    if (str.includes('e')) {
      return value.toPrecision(10).replace(/\.?0+$/, '');
    }
    const parts = str.split('.');
    if (parts[1] && parts[1].length > 10) {
      return parseFloat(value.toFixed(10)).toString();
    }
    return str;
  }

  const isError = !!state.error;

  return (
    <div className={styles.page}>
      <div className={styles.calculator}>
        <div className={styles.header}>
          <span className={styles.title}>Calculator</span>
          <Link href="/history" className={styles.historyLink}>
            History
          </Link>
        </div>

        <div className={styles.display}>
          <div className={styles.expression}>{state.expression || '\u00A0'}</div>
          <div className={`${styles.current} ${isError ? styles.errorText : ''}`}>
            {state.display}
          </div>
        </div>

        <div className={styles.buttons}>
          {/* Row 1 */}
          <button className={`${styles.btn} ${styles.btnFunction}`} onClick={handleClear}>
            C
          </button>
          <button className={`${styles.btn} ${styles.btnFunction}`} onClick={handleToggleSign}>
            +/−
          </button>
          <button className={`${styles.btn} ${styles.btnFunction}`} onClick={handlePercent}>
            %
          </button>
          <button
            className={`${styles.btn} ${styles.btnOperator}`}
            onClick={() => handleOperator('÷')}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('7')}>
            7
          </button>
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('8')}>
            8
          </button>
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('9')}>
            9
          </button>
          <button
            className={`${styles.btn} ${styles.btnOperator}`}
            onClick={() => handleOperator('×')}
          >
            ×
          </button>

          {/* Row 3 */}
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('4')}>
            4
          </button>
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('5')}>
            5
          </button>
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('6')}>
            6
          </button>
          <button
            className={`${styles.btn} ${styles.btnOperator}`}
            onClick={() => handleOperator('−')}
          >
            −
          </button>

          {/* Row 4 */}
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('1')}>
            1
          </button>
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('2')}>
            2
          </button>
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={() => handleDigit('3')}>
            3
          </button>
          <button
            className={`${styles.btn} ${styles.btnOperator}`}
            onClick={() => handleOperator('+')}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            className={`${styles.btn} ${styles.btnDigit} ${styles.btnWide}`}
            onClick={() => handleDigit('0')}
          >
            0
          </button>
          <button className={`${styles.btn} ${styles.btnDigit}`} onClick={handleDecimal}>
            .
          </button>
          <button
            className={`${styles.btn} ${styles.btnBackspace}`}
            onClick={handleBackspace}
            title="Backspace"
          >
            ⌫
          </button>
          <button className={`${styles.btn} ${styles.btnEquals}`} onClick={handleEquals}>
            =
          </button>
        </div>
      </div>
    </div>
  );
}
