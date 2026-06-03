import { useEffect, useState, useRef } from 'react';

export default function KontrolPaneli() {
  const [yoklamaListesi, setYoklamaListesi] = useState([]);
  const [sonTarama, setSonTarama] = useState(null);
  const [tarayiciAcik, setTarayiciAcik] = useState(false);
  const [manuelPnr, setManuelPnr] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    const kayitliListe = localStorage.getItem('dentech_yoklama_vip');
    if (kayitliListe) {
      setYoklamaListesi(JSON.parse(kayitliListe));
    }
  }, []);

  const listeyiGuncelle = (yeniListe) => {
    setYoklamaListesi(yeniListe);
    localStorage.setItem('dentech_yoklama_vip', JSON.stringify(yeniListe));
  };

  const biletSorgula = async (gelenMetin) => {
    let pnr = gelenMetin;
    if (gelenMetin.includes('/')) {
      pnr = gelenMetin.split('/').pop();
    }
    pnr = pnr.trim().toUpperCase();

    if (!pnr) return;

    const bugunTarih = new Date().toLocaleDateString('tr-TR');
    const anlikSaat = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // AYNI GÜN İÇİNDE TEKRARLI GİRİŞ KONTROLÜ (Kaçak Radarı)
    const mevcutIndex = yoklamaListesi.findIndex(item => item.pnr === pnr && item.tarih === bugunTarih);

    if (mevcutIndex !== -1) {
      const guncelListe = [...yoklamaListesi];
      guncelListe[mevcutIndex].tekrarSayisi = (guncelListe[mevcutIndex].tekrarSayisi || 1) + 1;
      guncelListe[mevcutIndex].sonDenemeSaati = anlikSaat;

      const guncellenenKayit = guncelListe.splice(mevcutIndex, 1)[0];
      listeyiGuncelle([guncellenenKayit, ...guncelListe]);

      setSonTarama({ 
        durum: "uyari", 
        isim: guncellenenKayit.isim, 
        mesaj: `DİKKAT! Bu bilet bugün ${guncellenenKayit.tekrarSayisi}. kez okutuluyor!` 
      });
      setManuelPnr('');
      return;
    }

    setSonTarama({ durum: "bekliyor", mesaj: "Bilet Doğrulanıyor..." });

    try {
      const response = await fetch(`/api/verify?pnr=${pnr}`);
      const data = await response.json();

      if (data.durum === "basarili" || data.durum === "kullanilmis") {
        const yeniKatilimci = {
          id: Date.now().toString(), // Benzersiz ID (Tekli silme için)
          pnr: pnr,
          isim: data.isim || "Bilinmeyen Katılımcı",
          saat: anlikSaat,
          tarih: bugunTarih,
          durum: data.durum === "basarili" ? "İlk Geçiş" : "Sistemde Var",
          tekrarSayisi: 1
        };
        
        listeyiGuncelle([yeniKatilimci, ...yoklamaListesi]);
        setSonTarama({ 
          durum: data.durum, 
          isim: data.isim, 
          mesaj: data.durum === "basarili" ? "Giriş Başarılı" : "Sistemde Zaten Kayıtlı" 
        });
      } else {
        setSonTarama({ durum: "gecersiz", mesaj: "Geçersiz veya Kayıtsız Bilet!" });
      }
    } catch (error) {
      setSonTarama({ durum: "hata", mesaj: "Bağlantı Hatası!" });
    }
    setManuelPnr('');
  };

  const kayitSil = (id, isim) => {
    if (confirm(`${isim} adlı kişinin kaydını bu listeden silmek istediğinize emin misiniz?`)) {
      const yeniListe = yoklamaListesi.filter(item => item.id !== id);
      listeyiGuncelle(yeniListe);
    }
  };

  // KAMERA SİHİRBAZI
  useEffect(() => {
    if (tarayiciAcik) {
      const { Html5QrcodeScanner } = require('html5-qrcode');
      scannerRef.current = new Html5QrcodeScanner('reader', {
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0, 
        disableFlip: false,
      }, false);

      scannerRef.current.render(
        (decodedText) => {
          if (scannerRef.current) scannerRef.current.pause();
          biletSorgula(decodedText).finally(() => {
            setTimeout(() => {
              if (scannerRef.current) scannerRef.current.resume();
            }, 2000);
          });
        },
        (err) => { /* Hata yoksayma */ }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error(err));
      }
    };
  }, [tarayiciAcik, yoklamaListesi]);

  const csvIndir = () => {
    if (yoklamaListesi.length === 0) return alert("Liste boş!");
    let csvContent = "\uFEFF";
    csvContent += "Tarih;Saat;PNR Kodu;İsim Soyisim;Sistem Durumu;Okutulma Sayısı;Son Deneme Saati\n";
    yoklamaListesi.forEach((item) => {
      const sonDeneme = item.sonDenemeSaati || "-";
      csvContent += `${item.tarih};${item.saat};${item.pnr};${item.isim};${item.durum};${item.tekrarSayisi};${sonDeneme}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DENTech_VIP_Yoklama_${new Date().toLocaleDateString('tr-TR')}.csv`;
    link.click();
  };

  // LİSTEYİ GÜNLERE GÖRE GRUPLAMA
  const grupluListe = yoklamaListesi.reduce((gruplar, item) => {
    if (!gruplar[item.tarih]) gruplar[item.tarih] = [];
    gruplar[item.tarih].push(item);
    return gruplar;
  }, {});

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans max-w-md mx-auto pb-10">
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-[#00f2fe]">DENTech Panel</h1>
          <p className="text-xs text-gray-500">Operasyon & Yönetim Merkezi</p>
        </div>
        <button onClick={csvIndir} className="bg-[#00f2fe] text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#00c8fe] transition">
          Excel'e Aktar
        </button>
      </div>

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
          <button onClick={() => biletSorgula(manuelPnr)} className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition">
            Sorgula
          </button>
        </div>
      </div>

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

      {sonTarama && (
        <div className={`p-4 rounded-xl mb-6 border animate-fade-in ${
          sonTarama.durum === 'basarili' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          sonTarama.durum === 'uyari' ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
          sonTarama.durum === 'kullanilmis' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
          sonTarama.durum === 'bekliyor' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse' :
          'bg-gray-500/10 border-gray-500/30 text-gray-400'
        }`}>
          <p className="text-xs uppercase font-semibold tracking-wider">Son İşlem</p>
          <p className="text-base font-bold mt-1">{sonTarama.mesaj}</p>
          {sonTarama.isim && <p className="text-sm text-white/80 mt-0.5 font-light">{sonTarama.isim}</p>}
        </div>
      )}

      {/* GÜNLERE GÖRE GRUPLANMIŞ LİSTE */}
      {Object.keys(grupluListe).length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-6">Henüz okutulan kayıt yok.</p>
      ) : (
        Object.keys(grupluListe).sort((a,b) => new Date(b.split('.').reverse().join('-')) - new Date(a.split('.').reverse().join('-'))).map((tarih) => (
          <div key={tarih} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <h2 className="text-sm font-bold tracking-wider text-[#00f2fe] uppercase mb-3 border-b border-white/10 pb-2">
              📅 {tarih} Kayıtları ({grupluListe[tarih].length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {grupluListe[tarih].map((item) => (
                <div key={item.id} className={`p-3 rounded-lg flex justify-between items-center border ${item.tekrarSayisi > 1 ? 'bg-red-500/5 border-red-500/30' : 'bg-black/40 border-white/5'}`}>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-medium text-white truncate">{item.isim}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-gray-400 font-mono">{item.pnr} • {item.saat}</p>
                      {item.tekrarSayisi > 1 && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                          {item.tekrarSayisi}. GİRİŞ!
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => kayitSil(item.id, item.isim)} className="text-gray-500 hover:text-red-400 transition p-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}