import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function BiletDogrulama() {
  const router = useRouter();
  const { id } = router.query; // URL'den gelen PNR (Örn: DENT-501)

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!id) return;

    const verifyTicket = async () => {
      try {
        // Doğrudan kendi Vercel API'mize soruyoruz
        const response = await fetch(`/api/verify?pnr=${id}`);
        const data = await response.json();
        setResult(data);
      } catch (error) {
        console.error("Hata:", error);
        setResult({ durum: "hata", mesaj: "Bağlantı hatası oluştu. Tekrar deneyin." });
      } finally {
        setLoading(false);
      }
    };

    verifyTicket();
  }, [id]);

  // Siyah Ekran ve Neon Yükleniyor Animasyonu
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-16 h-16 border-4 border-[#00f2fe] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-light tracking-widest text-[#00f2fe] animate-pulse">DENTech MEDİKAL</h2>
        <p className="text-gray-500 mt-2 text-sm tracking-wide">Bilet Veritabanı Kontrol Ediliyor...</p>
      </div>
    );
  }

  // SENARYO 1: BAŞARILI GİRİŞ (YEŞİL EKRAN)
  if (result?.durum === "basarili") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-center p-6 font-sans animate-fade-in">
        <div className="w-28 h-28 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(34,197,94,0.25)] animate-bounce">
          <svg className="w-14 h-14 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-wider mb-2">GİRİŞ ONAYLANDI</h1>
        <div className="w-20 h-0.5 bg-green-500 mx-auto mb-8 rounded-full"></div>
        <p className="text-sm text-gray-400 uppercase tracking-widest font-light mb-1">Katılımcı</p>
        <h2 className="text-2xl text-white font-medium px-4 py-2 bg-white/5 rounded-lg border border-white/10 inline-block min-w-[240px]">{result.isim}</h2>
        <p className="text-green-400 font-semibold tracking-widest mt-8 text-xs uppercase bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20">VIP Geçiş Aktif</p>
      </div>
    );
  }

  // SENARYO 2 VEYA 3: DAHA ÖNCE OKUTULMUŞ VEYA GEÇERSİZ (KIRMIZI EKRAN)
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-center p-6 font-sans">
      <div className="w-28 h-28 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(239,68,68,0.25)]">
        <svg className="w-14 h-14 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-wider mb-2">
        {result?.durum === "kullanilmis" ? "GİRİŞ REDDEDİLDİ" : "GEÇERSİZ BİLET"}
      </h1>
      <div className="w-20 h-0.5 bg-red-500 mx-auto mb-8 rounded-full"></div>
      
      {result?.isim && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-light mb-1">Kayıt Sahibi</p>
          <h2 className="text-xl text-gray-300 font-light px-6 py-2 bg-white/5 rounded-lg border border-white/5 inline-block">{result.isim}</h2>
        </div>
      )}
      
      <p className="text-red-400 text-sm font-light max-w-sm mx-auto mt-4 leading-relaxed">
        {result?.durum === "kullanilmis" 
          ? "Bu karekod ile daha önce giriş yapılmış. Çift girişi önlemek adına lütfen katılımcıyı kayıt bankosuna yönlendirin." 
          : "Sistemde bu karekoda ait ödeme onayı veya kayıt bulunamadı."}
      </p>
    </div>
  );
}
