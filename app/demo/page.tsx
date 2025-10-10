export default async function Demo() {
  const data = await fetch('/api/mock').then(r => r.json());
  return (
    <main className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">🏠 ROI Demo</h1>
      <p>{data.address}</p>
      <p>Price: ${data.price}</p>
      <p>Mortgage: ${data.mortgage}/mo</p>
      <p>Cash Flow: ${data.cashFlow}/mo</p>
      <p>ROI: {data.roi}</p>
      <p className="mt-4 italic text-gray-500">{data.summary}</p>
    </main>
  );
}
