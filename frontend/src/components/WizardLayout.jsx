import React from 'react';
import { Check } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { cn } from '../lib/utils';

const steps = [
  { id: 0, label: 'Produkte' },
  { id: 1, label: 'Lieferinfo' },
  { id: 2, label: 'Versicherung' },
  { id: 3, label: 'Übersicht' },
];

export const WizardLayout = ({ children, orderComplete = false }) => {
  const { state } = useOrder();
  const currentStep = state.currentStep;
  const isComplete = orderComplete || state.orderId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl md:text-4xl font-bold text-primary" style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}>
                Marina
              </span>
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-8-4.6-9.8-10.1C1 7.7 3.2 5 6.2 5c1.7 0 3.2.9 3.8 2.2C10.6 5.9 12.1 5 13.8 5c3 0 5.2 2.7 4 5.9C20 16.4 12 21 12 21z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-gray-900">PFLEGEBERATUNG & ALLTAGSHILFE</span>
              <span className="text-xs text-gray-500">Pflegebox-Konfigurator</span>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              // If order is complete, all steps should be green
              const isStepComplete = isComplete || currentStep > step.id;
              const isCurrentStep = currentStep === step.id && !isComplete;
              const isFutureStep = currentStep < step.id && !isComplete;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                        isStepComplete && 'bg-green-500 text-white',
                        isCurrentStep && 'bg-primary text-white',
                        isFutureStep && 'bg-gray-200 text-gray-500'
                      )}
                      data-testid={`step-indicator-${step.id}`}
                    >
                      {isStepComplete ? <Check className="w-4 h-4" /> : step.id + 1}
                    </div>
                    <span
                      className={cn(
                        'hidden sm:block text-sm font-medium transition-colors',
                        isStepComplete && 'text-green-600',
                        isCurrentStep && 'text-primary',
                        isFutureStep && 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2 transition-colors',
                        (isComplete || currentStep > index) ? 'bg-green-500' : 'bg-gray-200'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="font-bold text-lg mb-4">Marina Pflegehilfsmittel</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ihre zuverlässige Quelle für Pflegehilfsmittel zum Verbrauch. Bis zu 42€ monatlich kostenfrei für Pflegebedürftige.
              </p>
              <p className="text-gray-400 text-sm mt-4">
                <span className="font-semibold text-white">IK-Nummer:</span> 330 522 443
              </p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold text-lg mb-4">Kontakt</h3>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +49 2369 2099387
                </p>
                <p className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  info@marina-pflege.de
                </p>
                <p className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Hervesterstr. 16, 46286 Dorsten
                </p>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-bold text-lg mb-4">Rechtliches</h3>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Datenschutz</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Impressum</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">AGB</a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Marina Pflegeberatung & Alltagshilfe • Alle Rechte vorbehalten
          </div>
        </div>
      </footer>
    </div>
  );
};
