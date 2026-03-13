import Link from 'next/link';
import styles from './history.module.css';

interface CalculationRecord {
  id: number;
  expression: string;
  result: string;
  createdAt: string;
}

async function getCalculations(): Promise<CalculationRecord[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const res = await fetch(`${baseUrl}/api/calculations`, {
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.calculations || [];
  } catch (e) {
    console.error('Failed to fetch calculations:', e);
    return [];
  }
}

export default async function HistoryPage() {
  const calculations = await getCalculations();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>Calculation History</h1>
        </div>

        {calculations.length === 0 ? (
          <div className={styles.empty}>
            <p>No calculations yet.</p>
            <p>Go back and start calculating!</p>
          </div>
        ) : (
          <div className={styles.list}>
            {calculations.map((calc) => (
              <div key={calc.id} className={styles.item}>
                <div className={styles.itemLeft}>
                  <span className={styles.expression}>{calc.expression}</span>
                  <span className={styles.equals}>=</span>
                  <span className={styles.result}>{calc.result}</span>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.date}>
                    {new Date(calc.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
