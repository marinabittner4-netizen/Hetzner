import React from 'react';
import { useOrder } from '../context/OrderContext';
import { cn } from '../lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const BudgetBar = () => {
  const { calculateTotal, isOverBudget, getRemainingBudget, BUDGET_LIMIT } = useOrder();
  
  const total = calculateTotal();
  const remaining = getRemainingBudget();
  const percentage = Math.min((total / BUDGET_LIMIT) * 100, 100);
  const overBudget = isOverBudget();

  const formatEuro = (value) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm"
      data-testid="budget-bar"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Budget</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" data-testid="budget-total">
            {formatEuro(total)} / {formatEuro(BUDGET_LIMIT)}
          </span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            overBudget ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-green-500'
          )}
          style={{ width: `${percentage}%` }}
          data-testid="budget-progress"
        />
      </div>

      {/* Status Message */}
      <div className="mt-2 flex items-center gap-2">
        {overBudget ? (
          <>
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium" data-testid="budget-warning">
              Budget um {formatEuro(Math.abs(remaining))} überschritten
            </span>
          </>
        ) : total > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600" data-testid="budget-ok">
              Noch {formatEuro(remaining)} verfügbar
            </span>
          </>
        ) : (
          <span className="text-sm text-gray-500">
            Wähle Produkte aus (max. {formatEuro(BUDGET_LIMIT)})
          </span>
        )}
      </div>
    </div>
  );
};
