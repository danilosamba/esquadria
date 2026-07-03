import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Tempo de exibição do splash (2 segundos)
    const displayTimer = setTimeout(() => {
      setIsFading(true);
    }, 2000);

    // Tempo da animação de fade-out (0.5 segundos após o início do fade)
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(displayTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-out ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center p-8">
        <img 
          src="https://luziluminacao.com.br/logo-preta.png" 
          alt="Luz Iluminação" 
          className="w-64 max-w-[80%] object-contain mb-8 animate-pulse"
        />
        <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
