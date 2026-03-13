import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CalculationHistory } from './entity/CalculationHistory';
import path from 'path';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve('./database.sqlite');

let AppDataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (!AppDataSource) {
    AppDataSource = new DataSource({
      type: 'better-sqlite3',
      database: dbPath,
      entities: [CalculationHistory],
      synchronize: true,
      logging: false,
    });
  }

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  return AppDataSource;
}
