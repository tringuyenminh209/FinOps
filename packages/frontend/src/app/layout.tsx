import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'FinOps Platform - クラウドコスト最適化',
    description: '日本のSME向けFinOps/GreenOps Micro-SaaSプラットフォーム。クラウドコスト削減とCO2排出量の可視化を自動化。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    );
}
