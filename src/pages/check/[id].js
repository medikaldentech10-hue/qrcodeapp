import { useEffect } from 'react';

export default function BiletYonlendirme() {
  
  useEffect(() => {
    // Sayfa açıldığı an (saniyenin onda biri sürede) kullanıcıyı ana siteye fırlat
    window.location.href = 'https://dentechmedikal.com';
  }, []);

  // Yönlendirme gerçekleşene kadar ekranda saliselik görünecek şık bir yüklenme ikonu
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#00f2fe] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}