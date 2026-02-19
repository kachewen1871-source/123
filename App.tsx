import React, { useState } from 'react';
import InputForm from './components/InputForm';
import ResultDisplay from './components/ResultDisplay';
import { BaziResult, UserInput } from './types';
import { analyzeBazi } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BaziResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputSubmit = async (input: UserInput) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeBazi(input);
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("发生了未知错误，请重试。");
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1c1917] selection:bg-[#b91c1c] selection:text-white font-sans flex flex-col justify-center overflow-hidden">
      {/* Decorative Background Elements */}
      {/* Paper texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.4] z-0 mix-blend-multiply" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E")`
      }}></div>

      {/* Subtle traditional pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <main className="container mx-auto px-4 relative z-10 w-full">
        {error && (
          <div className="w-full max-w-md mx-auto mb-4 bg-red-50 border-l-4 border-[#b91c1c] text-[#b91c1c] px-4 py-3 rounded-r-lg text-center text-xs shadow-sm">
            {error}
          </div>
        )}

        {!result ? (
          <div className="w-full transition-all duration-700 ease-out transform translate-y-0 opacity-100">
            <InputForm onSubmit={handleInputSubmit} isLoading={loading} />
          </div>
        ) : (
          <div className="w-full transition-all duration-700 ease-out transform translate-y-0 opacity-100 py-10">
             <div className="text-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold serif text-[#1c1917] mb-2">
                  天机已现
                </h1>
                <div className="w-8 h-1 bg-[#b91c1c] mx-auto rounded-full mb-2"></div>
             </div>
            <ResultDisplay result={result} onReset={reset} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;