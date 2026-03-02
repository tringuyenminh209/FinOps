import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
    variable: '--font-noto-sans-jp',
});

export const metadata: Metadata = {
    title: 'FinOps Platform - クラウドコスト最適化',
    description: '日本のSME向けFinOps/GreenOps Micro-SaaSプラットフォーム。クラウドコスト削減とCO2排出量の可視化を自動化。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ja" className={notoSansJP.variable}>
            <body className={notoSansJP.className}>{children}</body>
        </html>
    );
}
