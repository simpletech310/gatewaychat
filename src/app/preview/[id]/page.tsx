import Script from "next/script";

export const dynamic = "force-dynamic";

export default function PreviewPage({ params }: { params: { id: string } }) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Chatbot preview</h1>
      <p className="text-slate-600 mt-2 text-sm">
        This page loads the embed widget exactly as it would appear on a client's website. Look for
        the chat bubble in the bottom-right corner.
      </p>
      <div className="mt-8 text-sm text-slate-500">Bot ID: {params.id}</div>
      <Script
        src="/widget.js"
        strategy="afterInteractive"
        data-bot-id={params.id}
        data-api-base={base}
      />
    </main>
  );
}
