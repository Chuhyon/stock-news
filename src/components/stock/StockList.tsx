import type { StockWithSummary } from '@/types/stock';
import StockCard from './StockCard';

interface StockListProps {
  stocks: StockWithSummary[];
  title: string;
  description?: string;
}

export default function StockList({ stocks, title, description }: StockListProps) {
  if (stocks.length === 0) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stocks.map((stock) => (
          <StockCard key={stock.code} stock={stock} />
        ))}
      </div>
    </section>
  );
}
