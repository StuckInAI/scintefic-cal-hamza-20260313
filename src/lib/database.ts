import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Calculation } from './entities/Calculation';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || './data/calculator.db';
const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

let dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  const { mkdirSync } = await import('fs');
  const dir = path.dirname(resolvedDbPath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (e) {
    // directory may already exist
  }

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: resolvedDbPath,
    synchronize: true,
    logging: false,
    entities: [Calculation],
  });

  await dataSource.initialize();
  return dataSource;
}
