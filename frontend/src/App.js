import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { OrderProvider, useOrder } from "./context/OrderContext";
import { WizardLayout } from "./components/WizardLayout";
import { Step1Products } from "./components/steps/Step1Products";
import { Step2Delivery } from "./components/steps/Step2Delivery";
import { Step3Insurance } from "./components/steps/Step3Insurance";
import { Step4Summary } from "./components/steps/Step4Summary";
import { Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WizardContent = () => {
  const { state } = useOrder();

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <Step1Products />;
      case 1:
        return <Step2Delivery />;
      case 2:
        return <Step3Insurance />;
      case 3:
        return <Step4Summary />;
      default:
        return <Step1Products />;
    }
  };

  return <WizardLayout>{renderStep()}</WizardLayout>;
};

const Konfigurator = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`);
        setProducts(response.data.products);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError("Produkte konnten nicht geladen werden");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Lade Konfigurator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <OrderProvider productsData={products}>
      <WizardContent />
    </OrderProvider>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Konfigurator />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
