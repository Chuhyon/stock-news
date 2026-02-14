'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-500" />
            <span className="text-xl font-bold text-white">AI 주식 뉴스</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              대시보드
            </Link>
            <a
              href="https://finance.naver.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              네이버 금융
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
