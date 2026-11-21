FetchAsset, müşterilerin dosya ve yanıtlarını ortak bir proje sayfasında toplar.


<p align="center">
  <img src="public/favicon.svg" width="112" alt="FetchAsset F ve ataş simgesi" />
</p>

<h1 align="center">FetchAsset</h1>

<p align="center">
  <a href="README.md">English</a> · <strong>Türkçe</strong><br />
  <a href="#workflow"><strong>İş akışını keşfet</strong></a> ·
  <a href="https://fetch-asset.vercel.app">Proje sitesi</a> ·
  <a href="#yerel-olarak-çalıştır">Yerel kurulum</a>
</p>

Ajans bir kontrol listesi oluşturup müşteriye portal bağlantısını gönderir. Müşteri ajans hesabı açmadan materyal gönderebilir; ajans bunları onaylar veya düzeltme ister. Hesap, veri ve depolama için Supabase; inceleme, e-posta ve ödeme için Groq, MailerSend ve Stripe entegrasyonları kullanılır.

<a id="workflow"></a>

## İş akışını dene

1. Aşağıdaki yerel kurulumu tamamla ve rehberli örnek için [localhost:3000/demo](http://localhost:3000/demo) adresini aç.
2. Gerçek bir proje için Supabase'i yapılandır, giriş yap ve müşteri bilgileriyle materyal taleplerini içeren proje oluştur.
3. Üretilen portal bağlantısını ilgili müşteriyle paylaş.
4. Gönderilen dosya veya yanıtları incele, onayla ya da düzeltme iste. Onaylanan dosyaları imzalı bağlantılarla indir.

`/demo` örneği yükleme ve incelemeyi simüle eder. Gerçek depolama, e-posta veya ödeme işlemlerini çalıştırmaz.

## Özellikler

- Dosya, metin, URL ve çoktan seçmeli yanıt talepleri.
- Gönderi durumu, onaylar ve düzeltme geri bildirimi.
- Portal logosu, renkleri ve karşılama metni.
- Proje son tarihleri, tampon süreler, bildirimler ve hatırlatma kontrolleri.
- Gönderilen metinden veya dosya bilgilerinden üretilen yapay zekâ puanları ve önerileri.
- Plan sınırlarına bağlı Stripe Checkout, ödeme portalı ve webhook rotaları.

Dosya incelemesi içeriği okumaz; dosyanın adını, türünü ve boyutunu kullanır. Metin incelemesi modele en fazla 2.000 karakter gönderir.

## Yerel olarak çalıştır

Kilit dosyasında **Next.js 14.2.35** ve **React 18.3.1** bulunur. Uygulama TypeScript ve Tailwind CSS 3 kullanır. `package-lock.json` içindeki bağımlılıkların engine koşullarıyla uyumlu bir Node.js sürümü seç.

```bash
git clone https://github.com/ArdaHFO/fetch-asset.git
cd fetch-asset
npm ci
```

[.env.local.example](.env.local.example) dosyasını `.env.local` olarak kopyala ve yer tutucuları değiştir. Gizli bilgileri sürüm kontrolüne ekleme.

| Yapılandırma | Kullanım |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tarayıcı ve sunucudan Supabase erişimi |
| `SUPABASE_SERVICE_ROLE_KEY` | Sunucuda yönetim işlemleri |
| `GROQ_API_KEY` | Gönderiler için yapay zekâ kontrolü |
| `MAILERSEND_API_KEY`, `MAILERSEND_SENDER_EMAIL`, `MAILERSEND_SENDER_NAME` | İşlemsel bildirimler |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Ödeme ve webhook entegrasyonu |
| `STRIPE_SOLO_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID` | Ücretli planları açarken kullanılacak fiyatlar |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PORTAL_URL` | Uygulama ve portal temel adresleri |

Örnek ortam dosyasında `STRIPE_SOLO_PRICE_ID` bulunmaz, ancak [plan yapılandırması](src/lib/stripe/plans.ts) bu değişkeni okur. Aktif e-posta uygulaması **MailerSend** kullanır. Kimlik doğrulama e-postaları, SMTP ayarları ayrı olan Supabase Auth üzerinden gönderilir.

Yeni bir Supabase projesinde [001–009 migration dosyalarını](supabase/migrations/) inceleyerek sırayla uygula. Dosyalar veritabanı şemasını, satır düzeyi politikaları, depolama alanlarını ve sonraki özellik eklemelerini içerir. Auth site adresini ve `http://localhost:3000/auth/callback` dönüş adresini yapılandır.

Yerel çalışma için iki uygulama adresini de `http://localhost:3000` yap. Kendi projenle çalışırken [next.config.js](next.config.js) içindeki dağıtıma özel Supabase host ayarını incele.

```bash
npm run dev
```

[localhost:3000](http://localhost:3000) adresini aç. Geliştirme komutları:

```bash
npm run lint
npm run build
npm start
```

Stripe ayrıca `/api/stripe/webhook` hedefi ve birbiriyle eşleşen test veya canlı kimlik bilgileri gerektirir. Ücretli erişimi açmadan önce ödeme ve webhook akışının tamamını doğrula.

## Tasarım ve geliştirme

Arayüzde düzensiz köşeler, ofset gölgeler, kâğıt arka planı, **Kalam** başlıkları ve **Patrick Hand** gövde yazısı kullanılır. Yeni ekranlarda mevcut bileşenleri kullan.

| Bileşen | Uygulama |
| --- | --- |
| Düğmeler | [WobblyButton](src/components/ui/wobbly-button.tsx) |
| Kartlar | [WobblyCard](src/components/ui/wobbly-card.tsx) |
| Girdiler ve form alanları | [WobblyInput](src/components/ui/wobbly-input.tsx) |
| Palet, tipografi ve gölgeler | [Tailwind yapılandırması](tailwind.config.ts) |

Temel palet kâğıt `#fdfbf7`, mürekkep `#2d2d2d`, vurgu `#ff4d4d`, mavi `#2d5da1` ve not kâğıdı sarısı `#fff9c4` kullanır. Mevcut [katkı yönergeleri](.github/copilot-instructions.md) tasarım kurallarını açıklar. Buradaki ilk aşama kontrol listesi geçmişe aittir ve güncel dosya ağacını anlatmaz.

## Sınırlar

- Gönderi rotası yapay zekâ incelemesini yanıtını beklemediği HTTP isteğiyle başlatır. Bu iş için kalıcı arka plan kuyruğu yoktur.
- Hatırlatma uç noktası oturum gerektirir. Otomatik hatırlatmalar için ayrıca zamanlama yapılandırılmalıdır.
- Stripe fiyat kimlikleri Solo, Pro ve Agency planlarına bağlanır. Ücretli erişimi açmadan önce tam ödeme/webhook döngüsünde plan atamasını kontrol et.
- Otomatik test komutu veya CI iş akışı yoktur. Derleme ESLint'i atladığından lint'i ayrı çalıştır.
- Kendi dağıtımında depolama politikalarını, portal yetkilendirmesini ve hizmetlerin teslim davranışını kontrol et.

## Proje yapısı

```text
src/app/               Açılış, panel, portal, demo ve API rotaları
src/components/        Özellik bileşenleri ve elle çizilmiş UI öğeleri
src/lib/               Supabase, AI, e-posta, Stripe ve yardımcı modüller
supabase/migrations/   Veritabanı, erişim politikaları ve depolama kurulumu
public/               Mevcut marka ve dekoratif görseller
.env.local.example     Ortam değişkeni şablonu
```

## Belgeler ve katkı

- [Ortam şablonu](.env.local.example) · [Veritabanı migration'ları](supabase/migrations/)
- [Yapay zekâ inceleme uygulaması](src/lib/ai/audit.ts)
- [E-posta hizmeti](src/lib/email/index.ts) · [Ödeme planları](src/lib/stripe/plans.ts)
- [Tasarım kuralları](.github/copilot-instructions.md)
- [Hata bildirimleri ve özellik talepleri](https://github.com/ArdaHFO/fetch-asset/issues)

Hata bildirirken ajans veya müşteri akışını, talep türünü, gözlenen durumu ve tekrar adımlarını belirt. Örnek dosyalar kullan; portal token’larını, erişim bilgilerini ve müşteri verilerini çıkar.

## Lisans

`package.json` içinde **ISC** belirtilir, ancak repoda ayrı bir lisans dosyası yoktur. Marka görselleri, yazı tipleri ve bağımlılıklar kendi haklarını ve bildirimlerini korur.
