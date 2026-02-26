import React, { createContext, useContext, useReducer, useCallback } from 'react';

const BUDGET_LIMIT = 42.00;

const initialState = {
  currentStep: 0,
  products: {},  // { productId: quantity }
  glovesSize: '',
  pflegegrad: '',
  extraWashable: 0,
  customer: {
    anrede: '',
    titel: '',
    vorname: '',
    nachname: '',
    strasse: '',
    hausnr: '',
    adresszusatz: '',
    plz: '',
    stadt: '',
    geburtsdatum: '',
    abweichendeAdresse: '',
    hinweis: '',
  },
  insurance: {
    versicherungsart: 'gesetzlich',
    beihilfe: false,
    beihilfeProzent: '',
    krankenkasse: '',
    versichertennummer: '',
    telefon: '',
    email: '',
    beziehBereits: false,
    bemerkung: '',
    consent1: false,
    consent2: false,
    signatureInsured: '',
    signatureCare: '',
  },
  orderId: null,
  isSubmitting: false,
  error: null,
};

const orderReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_PRODUCT_QUANTITY':
      return {
        ...state,
        products: { ...state.products, [action.payload.productId]: action.payload.quantity },
      };
    case 'SET_GLOVES_SIZE':
      return { ...state, glovesSize: action.payload };
    case 'SET_PFLEGEGRAD':
      return { ...state, pflegegrad: action.payload };
    case 'SET_EXTRA_WASHABLE':
      return { ...state, extraWashable: action.payload };
    case 'SET_CUSTOMER':
      return { ...state, customer: { ...state.customer, ...action.payload } };
    case 'SET_INSURANCE':
      return { ...state, insurance: { ...state.insurance, ...action.payload } };
    case 'SET_ORDER_ID':
      return { ...state, orderId: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

const OrderContext = createContext(null);

export const OrderProvider = ({ children, productsData = [] }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  const calculateTotal = useCallback(() => {
    let total = 0;
    Object.entries(state.products).forEach(([productId, quantity]) => {
      const product = productsData.find(p => p.id === productId);
      if (product && quantity > 0) {
        total += product.price * quantity;
      }
    });
    return Math.round(total * 100) / 100;
  }, [state.products, productsData]);

  const isOverBudget = useCallback(() => {
    return calculateTotal() > BUDGET_LIMIT;
  }, [calculateTotal]);

  const getRemainingBudget = useCallback(() => {
    return Math.round((BUDGET_LIMIT - calculateTotal()) * 100) / 100;
  }, [calculateTotal]);

  const getSelectedProducts = useCallback(() => {
    return Object.entries(state.products)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = productsData.find(p => p.id === productId);
        return {
          product_id: productId,
          quantity,
          size: productId === 'gloves' ? state.glovesSize : null,
          ...product,
        };
      });
  }, [state.products, state.glovesSize, productsData]);

  const value = {
    state,
    dispatch,
    calculateTotal,
    isOverBudget,
    getRemainingBudget,
    getSelectedProducts,
    BUDGET_LIMIT,
    productsData,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
