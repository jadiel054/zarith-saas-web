export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Página não encontrada</h1>
        <p className="text-xl text-gray-600">A página que você procura não existe.</p>
      </div>
    </main>
  );
}
