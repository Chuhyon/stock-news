import type { StockWithSummary, SelectedStock } from '@/types/stock';
import StockCard from './StockCard';

interface StockListProps {
  stocks: StockWithSummary[];
  title: string;
  description?: string;
  selectedStocks?: SelectedStock[];
}

export default function StockList({ stocks, title, description, selectedStocks }: StockListProps) {
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
        {stocks.map((stock) => {
          const selected = selectedStocks?.find((s) => s.code === stock.code);
          return (
            <StockCard
              key={stock.code}
              stock={stock}
              potentialReason={selected?.reason}
              crowdPsychology={selected?.crowd_psychology}
              historicalPattern={selected?.historical_pattern}
            />
          );
        })}
      </div>
    </section>
  );
}
