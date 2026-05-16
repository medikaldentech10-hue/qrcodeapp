// api/verify.js — DENTech Kapı Doğrulama Proxy
export default async function handler(req, res) {
    // CORS Ayarları (Kapıda hosteslerin rahatça bağlanabilmesi için)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  
    const { pnr } = req.query;
  
    if (!pnr) {
      return res.status(400).json({ durum: "hata", mesaj: "PNR kodu eksik." });
    }
  // Vercel önbellek temizleme için zorunlu güncelleme
    // 🔴 GOOGLE APPS SCRIPT'TEN ALDIĞIN UZUN WEB UYGULAMASI LİNKİNİ BURAYA YAPIŞTIR
    const GOOGLE_API_URL = "https://script.google.com/macros/s/AKfycbyKm3mPfpfsqd8G2SDwfxllY6x6oF9IOIEYTgU7HlXsdK0kxqDeUOKyHlQG7-aDJOLX/exec";

    try {
      // Vercel sunucusu arka planda güvenle Google'a soruyor (CORS'a takılmaz)
      const googleRes = await fetch(`${GOOGLE_API_URL}?pnr=${pnr}`);
      const data = await googleRes.json();
      
      return res.status(200).json(data);
    } catch (error) {
      console.error("Doğrulama köprü hatası:", error);
      return res.status(500).json({ durum: "hata", mesaj: "Bilet sunucusuna bağlanılamadı." });
    }
  }