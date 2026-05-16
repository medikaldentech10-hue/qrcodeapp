import { useEffect, useState, useRef } from 'react';

export default function KontrolPaneli() {
  const [yoklamaListesi, setYoklamaListesi] = useState([]);
  const [sonTarama, setSonTarama] = useState(null);
  const [tarayiciAcik, setTarayiciAcik] = useState(false);
  const [manuelPnr, setManuelPnr] = useState(''); // Manuel giriş state'i
  const scannerRef = useRef(null);

  useEffect(() => {
    const kayıtlıListe = localStorage.getItem('dentech_yoklama');
    if (kayıtlıListe) {
      setYoklamaListesi(JSON.parse(kayıtlıListe));
    }
  }, []);

  const listeyiGuncelle = (yeniListe) => {
    setYoklamaListesi(yeniListe);
    localStorage.setItem('dentech_yoklama', JSON.stringify(yeniListe));
  };

  // ANA SORGULAMA MOTORU (Hem kamera hem manuel giriş bunu kullanır)
  const biletSorgula = async (gelenMetin) => {
    // Okunan kod URL ise sonundaki PNR'ı al, değilse direkt metni al
    let pnr = gelenMetin;
    if (gelenMetin.includes('/')) {
      pnr = gelenMetin.split('/').pop();
    }
    pnr = pnr.trim().toUpperCase();

    if (!pnr) return;

    if (yoklamaListesi.some(item => item.pnr === pnr)) {
      setSonTarama({ durum: "uyari", mesaj: `Bu bilet zaten okutulmuş: ${pnr}` });
      return;
    }

    setSonTarama({ durum: "bekliyor", mesaj: "Bilet Doğrulanıyor..." });

    try {
      const response = await fetch(`/api/verify?pnr=${pnr}`);
      const data = await response.json();

      if (data.durum === "basarili" || data.durum === "kullanilmis") {
        const yeniKatilimci = {
          pnr: pnr,
          isim: data.isim || "Bilinmeyen Katılımcı",
          saat: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          durum: data.durum === "basarili" ? "İlk Giriş" : "Zaten İçerideydi"
        };
        
        listeyiGuncelle([yeniKatilimci, ...yoklamaListesi]);
        setSonTarama({ durum: data.durum, isim: data.isim, mesaj: data.durum === "basarili" ? "Giriş Başarılı" : "Zaten Giriş Yapmış" });
      } else {
        setSonTarama({ durum: "gecersiz", mesaj: "Geçersiz veya Kayıtsız Bilet!" });
      }
    } catch (error) {
      setSonTarama({ durum: "hata", mesaj: "Bağlantı Hatası!" });
    }
  };

  // KAMERA SİHİRBAZI
  useEffect(() => {
    if (tarayiciAcik) {
      const { Html5QrcodeScanner } = require('html5-qrcode');
      
      scannerRef.current = new Html5QrcodeScanner('reader', {
        fps: 10, // Kamerayı yormamak için düşürüldü
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0, // Daha iyi odaklama
        disableFlip: false,
      }, false);

      scannerRef.current.render(
        (decodedText) => {
          // Kod okunduğu an kamerayı anlık durdur (çift okumayı engelle)
          if (scannerRef.current) scannerRef.current.pause();
          
          biletSorgula(decodedText).finally(() => {
            // 2 saniye sonra kamerayı tekrar taramaya aç
            setTimeout(() => {
              if (scannerRef.current) scannerRef.current.resume();
            }, 2000);
          });
        },
        (err) => { /* Sessiz hata yoksayma */ }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Kapatma hatası", err));
      }
    };
  }, [tarayiciAcik, yoklamaListesi]);

  const csvIndir = () => {
    if (yoklamaListesi.length === 0) {
      alert("Henüz yoklama listesinde kimse yok!");
      return;
    }
    let csvContent = "\uFEFF";
    csvContent += "PNR Kodu;İsim Soyisim;Giriş Saati;Sistem Durumu\n";
    yoklamaListesi.forEach((item) => {
      csvContent += `${item.pnr};${item.isim};${item.saat};${item.durum}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DENTech_Seminer_Yoklama_${new Date().toLocaleDateString('tr-TR')}.csv`;
    link.click();
  };

  const listeyiSifirla = () => {
    if (confirm("Tüm yoklama listesini silmek istediğinize emin misiniz?")) {
      listeyiGuncelle([]);
      setSonTarama(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans max-w-md mx-auto">
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-[#00f2fe]">DENTech Panel</h1>
          <p className="text-xs text-gray-500">VIP Yoklama & Kontrol</p>
        </div>
        <button onClick={csvIndir} className="bg-[#00f2fe] text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#00c8fe] transition">
          CSV İndir
        </button>
      </div>

      {/* MANUEL GİRİŞ ALANI (B PLANI) */}
      <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
        <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block font-semibold">Manuel Bilet Girişi</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Örn: DENT-001" 
            value={manuelPnr}
            onChange={(e) => setManuelPnr(e.target.value)}
            className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f2fe] uppercase"
            onKeyDown={(e) => e.key === 'Enter' && biletSorgula(manuelPnr)}
          />
          <button 
            onClick={() => biletSorgula(manuelPnr)}
            className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition"
          >
            Sorgula
          </button>
        </div>
      </div>

      {/* KAMERA KONTROLÜ */}
      <div className="mb-6">
        {!tarayiciAcik ? (
          <button onClick={() => setTarayiciAcik(true)} className="w-full bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center hover:bg-white/10 transition group">
            <div className="w-10 h-10 bg-[#00f2fe]/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <svg className="w-5 h-5 text-[#00f2fe]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 4v1m-6-11H3m11.364-3.364l-.707.707M16.243 16.243l.707.707M7.757 7.757l.707-.707M7.757 16.243l-.707.707M8 14a4 4 0 118 0 4 4 0 01-8 0z"></path></svg>
            </div>
            <span className="text-sm font-medium">Kamerayı Başlat</span>
          </button>
        ) : (
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl relative">
            <div id="reader" className="overflow-hidden rounded-lg bg-black"></div>
            <button onClick={() => setTarayiciAcik(false)} className="w-full mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs py-2 rounded-lg font-medium">
              Kamerayı Kapat
            </button>
          </div>
        )}
      </div>

      {/* ANLIK BİLDİRİM EKRANI */}
      {sonTarama && (
        <div className={`p-4 rounded-xl mb-6 border animate-fade-in ${
          sonTarama.durum === 'basarili' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          sonTarama.durum === 'kullanilmis' || sonTarama.durum === 'uyari' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
          sonTarama.durum === 'bekliyor' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse' :
          'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <p className="text-xs uppercase font-semibold tracking-wider">Son İşlem Durumu</p>
          <p className="text-base font-bold mt-1">{sonTarama.mesaj}</p>
          {sonTarama.isim && <p className="text-sm text-white/80 mt-0.5 font-light">{sonTarama.isim}</p>}
        </div>
      )}

      {/* YOKLAMA LİSTESİ */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold tracking-wider text-gray-400 uppercase">Katılımcı Listesi ({yoklamaListesi.length})</h2>
          {yoklamaListesi.length > 0 && (
            <button onClick={listeyiSifirla} className="text-red-400 text-xs hover:underline">Temizle</button>
          )}
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {yoklamaListesi.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">Kayıt yok. Kamerayı açın veya manuel giriş yapın.</p>
          ) : (
            yoklamaListesi.map((item, index) => (
              <div key={index} className="bg-white/5 border border-white/5 p-3 rounded-lg flex justify-between items-center">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-medium text-white truncate">{item.isim}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.pnr} • {item.durum}</p>
                </div>
                <span className="text-xs font-mono text-[#00f2fe] bg-[#00f2fe]/5 px-2 py-1 rounded border border-[#00f2fe]/10 shrink-0">
                  {item.saat}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}