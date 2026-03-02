export default function HomePage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="text-center">
                <h1 className="text-5xl font-bold text-white mb-4">
                    FinOps Platform
                </h1>
                <p className="text-xl text-slate-300 mb-8">
                    クラウドコスト最適化 × GreenOps
                </p>
                <div className="flex gap-4 justify-center">
                    <a href="/dashboard" className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
                        ダッシュボード
                    </a>
                    <a href="/docs" className="px-6 py-3 border border-slate-500 text-slate-300 rounded-lg hover:border-emerald-500 transition">
                        ドキュメント
                    </a>
                </div>
            </div>
        </main>
    );
}
