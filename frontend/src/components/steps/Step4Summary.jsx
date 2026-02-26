import React, { useState } from 'react';
import { useOrder } from '../../context/OrderContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { ArrowLeft, Download, RotateCcw, CheckCircle, Loader2, Package, User, Shield, FileText, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Step4Summary = () => {
  const { state, dispatch, calculateTotal, getSelectedProducts, BUDGET_LIMIT } = useOrder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [isDownloading, setIsDownloading] = useState({});

  const customer = state.customer;
  const insurance = state.insurance;
  const selectedProducts = getSelectedProducts();
  const total = calculateTotal();

  const formatEuro = (value) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderData = {
        products: selectedProducts.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity,
          size: p.size || null,
        })),
        customer: {
          pflegegrad: state.pflegegrad,
          anrede: customer.anrede,
          titel: customer.titel || '',
          vorname: customer.vorname,
          nachname: customer.nachname,
          strasse: customer.strasse,
          hausnr: customer.hausnr,
          adresszusatz: customer.adresszusatz || '',
          plz: customer.plz,
          stadt: customer.stadt,
          geburtsdatum: customer.geburtsdatum,
          abweichende_adresse: customer.abweichendeAdresse || '',
          hinweis: customer.hinweis || '',
        },
        insurance: {
          versicherungsart: insurance.versicherungsart,
          beihilfe: insurance.beihilfe,
          beihilfe_prozent: insurance.beihilfeProzent || '',
          krankenkasse: insurance.krankenkasse,
          versichertennummer: insurance.versichertennummer,
          telefon: insurance.telefon || '',
          email: insurance.email || '',
          bezieht_bereits: insurance.beziehBereits,
          bemerkung: insurance.bemerkung || '',
          consent1: insurance.consent1,
          consent2: insurance.consent2,
          signature_insured: insurance.signatureInsured,
          signature_care: insurance.signatureCare || '',
        },
        extra_washable: state.extraWashable,
      };

      const response = await axios.post(`${API}/orders`, orderData);
      setOrderId(response.data.id);
      dispatch({ type: 'SET_ORDER_ID', payload: response.data.id });
      toast.success('Bestellung erfolgreich erstellt!');
    } catch (error) {
      console.error('Order submission failed:', error);
      toast.error(error.response?.data?.detail || 'Fehler beim Erstellen der Bestellung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async (pdfType = 'all') => {
    if (!orderId) {
      toast.error('Keine Bestellung gefunden');
      return;
    }
    
    setIsDownloading(prev => ({ ...prev, [pdfType]: true }));
    const downloadUrl = `${API}/orders/${orderId}/pdf?pdf_type=${pdfType}`;
    
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'blob',
        timeout: 30000,
      });
      
      if (response.data && response.data.size > 0) {
        const blob = new Blob([response.data], { 
          type: pdfType === 'all' ? 'application/zip' : 'application/pdf' 
        });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        
        const ext = pdfType === 'all' ? 'zip' : 'pdf';
        const prefix = pdfType === 'all' ? 'Marina_Pflegebox' : 
                       pdfType === 'main' ? 'Anlage2_Antrag' :
                       pdfType === 'bestellung' ? 'Bestellformular' : 'Wechselerklaerung';
        
        const filename = `${prefix}_${customer.nachname}_${orderId.slice(0, 8)}.${ext}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
        
        toast.success(`Download: ${filename}`);
      } else {
        throw new Error('Leere Antwort');
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: Direct link in new tab
      window.open(downloadUrl, '_blank');
      toast.info('Download im neuen Tab...');
    } finally {
      setIsDownloading(prev => ({ ...prev, [pdfType]: false }));
    }
  };

  const handleReset = () => {
    if (window.confirm('Möchten Sie wirklich alle Eingaben zurücksetzen?')) {
      dispatch({ type: 'RESET' });
      setOrderId(null);
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 2 });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Schritt 4: Übersicht & Abschluss</h2>
      <p className="text-sm text-gray-500 mb-6">
        Überprüfe deine Angaben und schließe die Bestellung ab.
      </p>

      {/* Order Success Message */}
      {orderId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="font-bold text-green-800 text-lg">Bestellung erfolgreich!</h3>
              <p className="text-sm text-green-600">Bestellnummer: {orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          
          {/* Download Options */}
          <div className="space-y-3">
            <Button
              onClick={() => handleDownloadPDF('all')}
              disabled={isDownloading.all}
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              data-testid="download-all-btn"
            >
              {isDownloading.all ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <FileArchive className="w-5 h-5 mr-2" />
              )}
              Alle PDFs als ZIP herunterladen
            </Button>
            
            {/* Direct download link as fallback */}
            <p className="text-xs text-center text-gray-500">
              Download funktioniert nicht?{' '}
              <a 
                href={`${API}/orders/${orderId}/pdf?pdf_type=all`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Hier klicken für direkten Download
              </a>
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => handleDownloadPDF('main')}
                disabled={isDownloading.main}
                className="h-12"
                data-testid="download-main-btn"
              >
                {isDownloading.main ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Anlage 2
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleDownloadPDF('bestellung')}
                disabled={isDownloading.bestellung}
                className="h-12"
                data-testid="download-order-btn"
              >
                {isDownloading.bestellung ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Bestellformular
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleDownloadPDF('wechsel')}
                disabled={isDownloading.wechsel}
                className="h-12"
                data-testid="download-wechsel-btn"
              >
                {isDownloading.wechsel ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Wechselerklärung
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Products Summary */}
        <div className="border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Ausgewählte Produkte</h3>
          </div>
          <div className="space-y-3">
            {selectedProducts.map((product) => (
              <div key={product.product_id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {product.meta}
                    {product.size && ` • Größe ${product.size}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{product.quantity}×</p>
                  <p className="text-sm text-gray-500">{formatEuro(product.price * product.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <span className="font-bold text-gray-900">Gesamtsumme</span>
            <span className="font-bold text-lg text-primary" data-testid="summary-total">{formatEuro(total)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Budget: {formatEuro(BUDGET_LIMIT)}</p>
          
          {/* Extra: Waschbare Bettschutzeinlagen */}
          {state.extraWashable > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">caretex® Eco Design</p>
                  <p className="text-xs text-gray-500">Waschbare Bettschutzeinlagen (separat beantragt)</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{state.extraWashable}×</p>
                  <p className="text-sm text-green-600 font-medium">0,00 €</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Customer Summary */}
        <div className="border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Lieferinformationen</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium">{customer.anrede} {customer.titel} {customer.vorname} {customer.nachname}</p>
            </div>
            <div>
              <p className="text-gray-500">Pflegegrad</p>
              <p className="font-medium">{state.pflegegrad}</p>
            </div>
            <div>
              <p className="text-gray-500">Adresse</p>
              <p className="font-medium">
                {customer.strasse} {customer.hausnr}
                {customer.adresszusatz && `, ${customer.adresszusatz}`}
                <br />
                {customer.plz} {customer.stadt}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Geburtsdatum</p>
              <p className="font-medium">{customer.geburtsdatum}</p>
            </div>
          </div>
        </div>

        {/* Insurance Summary */}
        <div className="border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Versicherungsdaten</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Versicherungsart</p>
              <p className="font-medium capitalize">
                {insurance.versicherungsart}
                {insurance.beihilfe && ` + Beihilfe (${insurance.beihilfeProzent}%)`}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Krankenkasse</p>
              <p className="font-medium">{insurance.krankenkasse}</p>
            </div>
            <div>
              <p className="text-gray-500">Versichertennummer</p>
              <p className="font-medium">{insurance.versichertennummer}</p>
            </div>
            {insurance.telefon && (
              <div>
                <p className="text-gray-500">Telefon</p>
                <p className="font-medium">{insurance.telefon}</p>
              </div>
            )}
          </div>
          {/* Signature Preview */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-gray-500 text-sm mb-2">Unterschrift</p>
            {insurance.signatureInsured && (
              <img 
                src={insurance.signatureInsured} 
                alt="Unterschrift" 
                className="h-16 object-contain border rounded bg-gray-50 p-2"
              />
            )}
          </div>
        </div>

        {/* Legal Notes */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500 font-medium">Bestätigte Einverständniserklärungen</p>
          </div>
          <p className="text-xs text-gray-500">
            ✓ Kostenübernahme nach §40 SGB XI<br />
            ✓ Leistungserbringer: Marina Pflegebox
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap justify-between gap-4 pt-6 border-t mt-6">
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="h-12" disabled={!!orderId} data-testid="back-step-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <Button variant="outline" onClick={handleReset} className="h-12 text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="reset-btn">
            <RotateCcw className="w-4 h-4 mr-2" />
            Zurücksetzen
          </Button>
        </div>
        
        {!orderId && (
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="h-12 px-8 bg-green-600 hover:bg-green-700"
            data-testid="submit-order-btn"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            Bestellung abschließen
          </Button>
        )}
      </div>
    </div>
  );
};
