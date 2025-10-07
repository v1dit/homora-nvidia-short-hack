import { mockProperties } from '../../../../lib/mockData';

export async function GET() {
  return new Response(JSON.stringify(mockProperties), {
    headers: { 'Content-Type': 'application/json' },
  });
}
