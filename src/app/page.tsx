"use client";

import { useState, useEffect, useCallback } from 'react';

interface HistoryEntry {
  id: number;
  expression: string;
  result: string;
  createdAt: string;
}

type ButtonType = 'number' | 'operator' | 'action' | 'equals' | 'special';

interface CalcButton {
  label: string;
  value: string;
  type: ButtonType;
  span?: number;
}

const BUTTONS: CalcButton[] = [
  { label: 'C', value: 'clear', type: 'action' },
  { label: '+/-', value: 'toggle', type: 'action' },
  { label: '%', value: 'percent', type: 'action' },
  { label: '÷', value: '/', type: 'operator' },

  { label: '7', value: '7', type: 'number' },
  { label: '8', value: '8', type: 'number' },
  { label: '9', value: '9', type: 'number' },
  { label: '×', value: '*', type: 'operator' },

  { label: '4', value: '4', type: 'number' },
  { label: '5', value: '5', type: 'number' },
  { label: '6', value: '6', type: 'number' },
  { label: '-', value: '-', type: 'operator' },

  { label: '1', value: '1', type: 'number' },
  { label: '2', value: '2', type: 'number' },
  { label: '3', value: '3', type: 'number' },
  { label: '+', value: '+', type: 'operator' },

  { label: '⌫', value: 'backspace', type: 'special' },
  { label: '0', value: '0', type: 'number' },
  { label: '.', value: '.', type: 'number' },
  { label: '=', value: '=', type: 'equals' },
];

function evaluate(expression: string): string {
  try {
    // Replace display operators with JS operators
    const sanitized = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '');

    // Safety check: only allow numbers and operators
    if (!/^[\d+\-*/.()%\s]+$/.test(sanitized)) {
      return 'Error';
    }

    // eslint-disable-next-line no-new-func
    const result = new Function('return ' + sanitized)();

    if (!isFinite(result)) return 'Error';
    if (isNaN(result)) return 'Error';

    // Format the result
    const num = parseFloat(result.toFixed(10));
    return String(num);
  } catch {
    return 'Error';
  }
}

function formatDisplay(value: string): string {
  if (value === 'Error') return 'Error';
  // Add thousand separators for display
  const parts = value.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export default function Home() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [prevResult, setPrevResult] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [lastOperator, setLastOperator] = useState<string | null>(null);
  const [fullExpression, setFullExpression] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const saveHistory = useCallback(async (expr: string, result: string) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, result }),
      });
    } catch (err) {
      console.error('Failed to save history', err);
    }
  }, []);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setPrevResult(null);
    setWaitingForOperand(false);
    setLastOperator(null);
    setFullExpression('');
  }, []);

  const handleToggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === '0' || prev === 'Error') return prev;
      if (prev.startsWith('-')) return prev.slice(1);
      return '-' + prev;
    });
  }, []);

  const handlePercent = useCallback(() => {
    setDisplay((prev) => {
      if (prev === 'Error') return prev;
      const num = parseFloat(prev);
      if (isNaN(num)) return 'Error';
      return String(num / 100);
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev === 'Error' || prev === '0') return '0';
      if (prev.length === 1) return '0';
      if (prev.length === 2 && prev.startsWith('-')) return '0';
      return prev.slice(0, -1);
    });
  }, []);

  const handleNumber = useCallback((value: string) => {
    setDisplay((prev) => {
      if (prev === 'Error') return value;
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return value;
      }
      if (value === '.' && prev.includes('.')) return prev;
      if (prev === '0' && value !== '.') return value;
      if (prev === '-0') return '-' + value;
      return prev + value;
    });
  }, [waitingForOperand]);

  const handleOperator = useCallback((op: string) => {
    if (display === 'Error') return;

    const current = parseFloat(display);

    if (prevResult !== null && !waitingForOperand && lastOperator) {
      const expr = `${prevResult}${lastOperator}${display}`;
      const result = evaluate(expr);
      setDisplay(result);
      setPrevResult(result);
      setFullExpression(`${result} ${op}`);
    } else {
      setPrevResult(display);
      setFullExpression(`${display} ${op}`);
    }

    setExpression(`${current} ${op}`);
    setLastOperator(op);
    setWaitingForOperand(true);
  }, [display, prevResult, waitingForOperand, lastOperator]);

  const handleEquals = useCallback(async () => {
    if (display === 'Error') return;
    if (prevResult === null || lastOperator === null) return;

    const expr = `${prevResult}${lastOperator}${display}`;
    const result = evaluate(expr);

    const exprForDisplay = `${prevResult} ${lastOperator} ${display} =`;
    setFullExpression(exprForDisplay);
    setDisplay(result);
    setPrevResult(null);
    setLastOperator(null);
    setWaitingForOperand(false);
    setExpression('');

    if (result !== 'Error') {
      await saveHistory(exprForDisplay, result);
      if (showHistory) {
        fetchHistory();
      }
    }
  }, [display, prevResult, lastOperator, saveHistory, showHistory, fetchHistory]);

  const handleButton = useCallback((value: string) => {
    switch (value) {
      case 'clear':
        handleClear();
        break;
      case 'toggle':
        handleToggleSign();
        break;
      case 'percent':
        handlePercent();
        break;
      case 'backspace':
        handleBackspace();
        break;
      case '=':
        handleEquals();
        break;
      case '+':
      case '-':
      case '*':
      case '/':
        handleOperator(value);
        break;
      default:
        handleNumber(value);
    }
  }, [handleClear, handleToggleSign, handlePercent, handleBackspace, handleEquals, handleOperator, handleNumber]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '0' && key <= '9') handleButton(key);
      else if (key === '.') handleButton('.');
      else if (key === '+') handleButton('+');
      else if (key === '-') handleButton('-');
      else if (key === '*') handleButton('*');
      else if (key === '/') { e.preventDefault(); handleButton('/'); }
      else if (key === 'Enter' || key === '=') handleButton('=');
      else if (key === 'Backspace') handleButton('backspace');
      else if (key === 'Escape') handleButton('clear');
      else if (key === '%') handleButton('percent');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButton]);

  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory((prev) => !prev);
  };

  const getButtonClass = (btn: CalcButton): string => {
    const base =
      'flex items-center justify-center rounded-2xl text-xl font-semibold cursor-pointer select-none transition-all duration-150 active:scale-95 h-16';

    switch (btn.type) {
      case 'action':
        return `${base} bg-gray-400 hover:bg-gray-300 text-gray-900`;
      case 'operator':
        return `${base} bg-orange-500 hover:bg-orange-400 text-white`;
      case 'equals':
        return `${base} bg-orange-500 hover:bg-orange-400 text-white`;
      case 'special':
        return `${base} bg-gray-600 hover:bg-gray-500 text-white`;
      default:
        return `${base} bg-gray-700 hover:bg-gray-600 text-white`;
    }
  };

  const displayFontSize =
    display.length > 12 ? 'text-2xl' : display.length > 8 ? 'text-4xl' : 'text-5xl';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full py-8">
      <div className="flex flex-col md:flex-row gap-6 items-start justify-center w-full max-w-2xl">
        {/* Calculator */}
        <div className="w-full max-w-xs mx-auto">
          <div className="bg-black rounded-3xl p-4 shadow-2xl">
            {/* Display */}
            <div className="mb-4 px-2">
              <div className="text-gray-400 text-sm min-h-6 text-right truncate">
                {fullExpression || expression || '\u00A0'}
              </div>
              <div
                className={`text-white text-right font-light leading-none mt-1 break-all ${displayFontSize}`}
              >
                {formatDisplay(display)}
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-4 gap-3">
              {BUTTONS.map((btn) => (
                <button
                  key={btn.value + btn.label}
                  className={getButtonClass(btn)}
                  onClick={() => handleButton(btn.value)}
                  aria-label={btn.label}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* History toggle */}
            <button
              onClick={toggleHistory}
              className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
              </svg>
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="w-full max-w-xs mx-auto bg-gray-800 rounded-3xl p-4 shadow-2xl">
            <h2 className="text-white text-lg font-semibold mb-3">History</h2>
            {loadingHistory ? (
              <div className="text-gray-400 text-sm text-center py-8">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">No calculations yet.</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-700 rounded-xl p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => {
                      setDisplay(entry.result);
                      setFullExpression(entry.expression);
                      setPrevResult(null);
                      setLastOperator(null);
                      setWaitingForOperand(false);
                    }}
                  >
                    <div className="text-gray-400 text-xs truncate">{entry.expression}</div>
                    <div className="text-white text-base font-medium">{entry.result}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={fetchHistory}
              className="mt-3 w-full py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-gray-500 text-xs text-center">
        Tip: Use keyboard for input. Press Esc to clear.
      </p>
    </div>
  );
}
