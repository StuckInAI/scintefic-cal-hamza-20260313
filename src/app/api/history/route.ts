import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/datasource';
import { CalculationHistory } from '@/lib/entity/CalculationHistory';

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(CalculationHistory);
    const history = await repo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return NextResponse.json({ history });
  } catch (error) {
    console.error('GET /api/history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expression, result } = body;

    if (!expression || result === undefined || result === null) {
      return NextResponse.json({ error: 'expression and result are required' }, { status: 400 });
    }

    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(CalculationHistory);

    const entry = repo.create({
      expression: String(expression),
      result: String(result),
    });

    await repo.save(entry);

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('POST /api/history error:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}
