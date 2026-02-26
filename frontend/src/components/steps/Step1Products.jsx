import React from 'react';
import { useOrder } from '../../context/OrderContext';
import { BudgetBar } from '../BudgetBar';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import { Plus, Minus, Package, AlertCircle } from 'lucide-react';

const GLOVE_SIZES = ['S', 'M', 'L', 'XL'];

const ProductCard = ({ product }) => {
  const { state, dispatch, calculateTotal, BUDGET_LIMIT, productsData } = useOrder();
  const quantity = state.products[product.id] || 0;

  const canIncrease = () => {
    const currentProduct = productsData.find(p => p.id === product.id);
    if (!currentProduct) return false;
    const potentialTotal = calculateTotal() + currentProduct.price;
    return potentialTotal <= BUDGET_LIMIT;
  };

  const handleIncrease = () => {
    if (canIncrease()) {
      dispatch({ type: 'SET_PRODUCT_QUANTITY', payload: { productId: product.id, quantity: quantity + 1 } });
    }
  };

  const handleDecrease = () => {
    if (quantity > 0) {
      dispatch({ type: 'SET_PRODUCT_QUANTITY', payload: { productId: product.id, quantity: quantity - 1 } });
      if (product.id === 'gloves' && quantity === 1) {
        dispatch({ type: 'SET_GLOVES_SIZE', payload: '' });
      }
    }
  };

  const formatEuro = (value) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div
      className={cn(
        'border rounded-xl p-4 transition-all hover:border-primary/30',
        quantity > 0 && 'border-primary/50 bg-red-50/30'
      )}
      data-testid={`product-card-${product.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
          <p className="text-xs text-gray-500">{product.meta}</p>
          <p className="text-sm font-medium text-primary mt-1">{formatEuro(product.price)}</p>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecrease}
            disabled={quantity === 0}
            className={cn(
              'w-10 h-10 rounded-lg border flex items-center justify-center transition-colors',
              quantity === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'
            )}
            data-testid={`product-minus-${product.id}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-semibold text-lg" data-testid={`product-qty-${product.id}`}>
            {quantity}
          </span>
          <button
            onClick={handleIncrease}
            disabled={!canIncrease()}
            className={cn(
              'w-10 h-10 rounded-lg border flex items-center justify-center transition-colors',
              !canIncrease() ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'
            )}
            data-testid={`product-plus-${product.id}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Gloves Size Selector */}
        {product.id === 'gloves' && quantity > 0 && (
          <div className="flex gap-1">
            {GLOVE_SIZES.map(size => (
              <button
                key={size}
                onClick={() => dispatch({ type: 'SET_GLOVES_SIZE', payload: size })}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                  state.glovesSize === size
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 hover:border-primary/50'
                )}
                data-testid={`gloves-size-${size}`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const Step1Products = () => {
  const { state, dispatch, productsData, isOverBudget } = useOrder();

  const canProceed = () => {
    if (!state.pflegegrad) return false;
    if (isOverBudget()) return false;
    
    // Check if gloves selected but no size chosen
    const glovesQty = state.products['gloves'] || 0;
    if (glovesQty > 0 && !state.glovesSize) return false;
    
    return true;
  };

  const handleNext = () => {
    if (canProceed()) {
      dispatch({ type: 'SET_STEP', payload: 1 });
    }
  };

  const glovesSelected = (state.products['gloves'] || 0) > 0;
  const needsGlovesSize = glovesSelected && !state.glovesSize;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Schritt 1: Produkte auswählen</h2>
      <p className="text-sm text-gray-500 mb-6">
        Wähle deine Pflegehilfsmittel aus. Das Budget wird automatisch geprüft.
      </p>

      {/* Pflegegrad Selection */}
      <div className="mb-6">
        <Label htmlFor="pflegegrad" className="text-sm font-medium mb-2 block">
          Pflegegrad <span className="text-red-500">*</span>
        </Label>
        <Select
          value={state.pflegegrad}
          onValueChange={(value) => dispatch({ type: 'SET_PFLEGEGRAD', payload: value })}
        >
          <SelectTrigger id="pflegegrad" className="h-12" data-testid="pflegegrad-select">
            <SelectValue placeholder="Bitte wählen" />
          </SelectTrigger>
          <SelectContent>
            {['1', '2', '3', '4', '5'].map(grade => (
              <SelectItem key={grade} value={grade}>Pflegegrad {grade}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!state.pflegegrad && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Bitte zuerst einen Pflegegrad wählen
          </p>
        )}
      </div>

      {/* Budget Bar */}
      <BudgetBar />

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {productsData.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Gloves Size Warning */}
      {needsGlovesSize && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-700">
            Bitte wähle eine Handschuhgröße (S–XL)
          </span>
        </div>
      )}

      {/* Extra: Waschbare Bettschutzeinlagen (FREE - not counted in budget) */}
      <div className="mt-6 border-2 border-primary rounded-xl overflow-hidden">
        <div className="bg-primary text-white px-4 py-3">
          <h3 className="font-bold text-lg">Zusätzlich beantragen: Extra Schutz für 0 €</h3>
        </div>
        <div className="p-4 bg-red-50/30">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-12 h-12 text-teal-400" viewBox="0 0 24 24" fill="currentColor">
                <ellipse cx="12" cy="14" rx="8" ry="6" opacity="0.5"/>
                <ellipse cx="12" cy="12" rx="6" ry="4"/>
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">caretex® Eco Design</h4>
              <p className="text-sm text-gray-600 mb-2">Waschbare Bettschutzeinlagen</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Kostenfrei nach Genehmigung
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Bis zu 4 Bettschutzeinlagen pro Jahr
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Bis zu 300× waschbar (weniger Müll)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Hoher Liegekomfort & zuverlässiger Schutz
                </li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                Hinweis: Dieses Extra wird <strong>separat</strong> gespeichert und <strong>nicht</strong> ins 42-€-Budget gerechnet.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => dispatch({ type: 'SET_EXTRA_WASHABLE', payload: Math.max(0, state.extraWashable - 1) })}
                disabled={state.extraWashable === 0}
                className={cn(
                  'w-10 h-10 rounded-lg border flex items-center justify-center transition-colors',
                  state.extraWashable === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'
                )}
                data-testid="extra-washable-minus"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold text-lg" data-testid="extra-washable-qty">
                {state.extraWashable}
              </span>
              <button
                onClick={() => dispatch({ type: 'SET_EXTRA_WASHABLE', payload: Math.min(4, state.extraWashable + 1) })}
                disabled={state.extraWashable >= 4}
                className={cn(
                  'w-10 h-10 rounded-lg border flex items-center justify-center transition-colors',
                  state.extraWashable >= 4 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'
                )}
                data-testid="extra-washable-plus"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="h-12 px-8"
          data-testid="next-step-1"
        >
          Weiter zu Lieferinformationen
        </Button>
      </div>
    </div>
  );
};
