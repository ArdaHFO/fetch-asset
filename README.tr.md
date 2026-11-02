FetchAsset, ajansların müşterilerinden dosya ve bilgi toplamasını tek bir proje sayfasında kolaylaştırır.

<p align="center">
  <img src="public/favicon.svg" width="112" alt="FetchAsset F ve ataş simgesi" />
</p>

<h1 align="center">FetchAsset</h1>

<p align="center"><strong>Daha az takip. Daha net teslim.</strong></p>
<p align="center">Paylaşılabilir portallar, gönderi incelemesi ve yapay zekâ destekli kontrollerle ajanslar için müşteri materyali toplama alanı.</p>

<p align="center">
  <a href="README.md">English</a> · <strong>Türkçe</strong><br />
  <a href="#workflow"><strong>İş akışını keşfet</strong></a> ·
  <a href="https://fetch-asset.vercel.app">Proje sitesi</a> ·
  <a href="#yerel-olarak-çalıştır">Yerel kurulum</a>
</p>

---

Proje oluştur, müşteriden gerekenleri belirt ve tek bir portal bağlantısı paylaş. Müşteriler ajans hesabı açmadan dosya ve yanıt gönderebilir. Gönderileri incele, düzeltme iste ve projenin gereksinimlerini, tarihlerini ve ilerlemesini birlikte takip et.

**Bu repo harici hizmetlerle çalışan bir web uygulaması ve ayrı bir rehberli demo içerir.** Supabase, Groq, MailerSend ve Stripe entegrasyonlarının kendi yapılandırmaları gerekir. Rehberli demo etkileşimleri simüle eder ve canlı yükleme, e-posta teslimi veya ödeme işlemlerini doğrulamaz.

<a id="workflow"></a>

## İş akışını dene

| Alan | Beklenen davranış |
| --- | --- |
| Rehberli demo | Örnek proje ve simüle yükleme içeren `/demo` |
| Ajans çalışma alanı | Oturum gerektiren panel, projeler, talepler ve inceleme |
| Müşteri portalı | Token tabanlı `/portal/[token]` bağlantıları |
| Veri ve depolama | Supabase veritabanı, Auth ve Storage |
| Yapay zekâ incelemesi | Yapılandırılmış Llama 3.3 modeliyle Groq |

1. Aşağıdaki yerel kurulumu tamamla ve rehberli örnek için [localhost:3000/demo](http://localhost:3000/demo) adresini aç.
2. Gerçek bir proje için Supabase'i yapılandır, giriş yap ve müşteri bilgileriyle materyal taleplerini içeren proje oluştur.
3. Üretilen portal bağlantısını ilgili müşteriyle paylaş.
4. Gönderilen dosya veya yanıtları incele, onayla ya da düzeltme iste. Onaylanan dosyaları imzalı bağlantılarla indir.

## Çalışma alanında neler var?

- **Projeye özel talepler.** Gereksinimler ve açıklamalarla dosya, metin, URL ve çoktan seçmeli yanıt topla.
- **Basit müşteri portalı.** Müşteri proje bağlantısını açar, kontrol listesini görür ve istenen materyali gönderir.
- **İnceleme paneli.** Gönderileri değerlendir, durumu takip et, onay ver veya düzeltme geri bildirimi sun.
- **Yapay zekâ destekli kontroller.** Gönderi metninden veya metadata'sından yapılandırılmış puan, sorunlar ve öneriler üret.
- **Ajans markası.** Logo, renk, karşılama metni ve diğer portal görünüm ayarlarını düzenle.
- **Tarihler ve iletişim.** Son tarihleri ve tampon süreleri kaydet, gönderi/inceleme bildirimleri gönder ve eksik maddeler için hatırlatma kontrolünü çağır.
- **Ödeme entegrasyonu.** Stripe Checkout, ödeme portalı ve webhook rotaları abonelik planlarını kullanım sınırlarına bağlar.

Dosyalarda yapay zekâ incelemesi ad, tür ve boyut gibi metadata'yı değerlendirir. Yüklenen dosyanın içeriğini incelemez. İnsan incelemesi teslim sürecinin bir parçasıdır.

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

Bu komutlar belge güncellemesi sırasında çalıştırılmadı. Stripe ayrıca `/api/stripe/webhook` hedefi ve birbiriyle eşleşen test veya canlı kimlik bilgileri gerektirir. Ücretli erişimi açmadan önce ödeme ve webhook akışının tamamını doğrula.

## Tasarım ve geliştirme

FetchAsset'in mevcut arayüzü elle çizilmiş görünüm kullanır. Genişletirken düzensiz köşeleri, keskin ofset gölgeleri, kâğıt arka planını, **Kalam** başlıklarını ve **Patrick Hand** gövde yazısını koru.

| Bileşen | Uygulama |
| --- | --- |
| Düğmeler | [WobblyButton](src/components/ui/wobbly-button.tsx) |
| Kartlar | [WobblyCard](src/components/ui/wobbly-card.tsx) |
| Girdiler ve form alanları | [WobblyInput](src/components/ui/wobbly-input.tsx) |
| Palet, tipografi ve gölgeler | [Tailwind yapılandırması](tailwind.config.ts) |

Temel palet kâğıt `#fdfbf7`, mürekkep `#2d2d2d`, vurgu `#ff4d4d`, mavi `#2d5da1` ve not kâğıdı sarısı `#fff9c4` kullanır. Mevcut [katkı yönergeleri](.github/copilot-instructions.md) tasarım kurallarını açıklar. Buradaki ilk aşama kontrol listesi geçmişe aittir ve güncel dosya ağacını anlatmaz.

## Doğrulama ve mevcut sınırlar

Bu belgeler rotalar, hizmet bağdaştırıcıları, SQL migration'ları, paket bilgileri ve ortam şablonuyla karşılaştırıldı. Uygulama derlemesi, migration, canlı yükleme, yapay zekâ isteği, e-posta veya ödeme çalıştırılmadı.

- Rehberli demo yükleme ve incelemeyi simüle eder. Gerçek portaldan ayrıdır.
- Dosya incelemeleri metadata'ya dayanır. Metin incelemeleri gönderilen metnin en fazla 2.000 karakterini modele iletir.
- Gönderi rotası yapay zekâ incelemesini yanıtı beklenmeyen HTTP isteğiyle başlatır. Repoda bu işlem için kalıcı bir arka plan kuyruğu kurulmuş değildir.
- Hatırlatma kontrolleri oturum gerektiren uç noktadan sunulur. Dağıtımdaki otomatik zamanlama ayrıca yapılandırılıp doğrulanmalıdır.
- Webhook, yapılandırılan fiyat kimliklerini Solo, Pro ve Agency planlarıyla eşler. Ücretli erişimi açmadan önce tam ödeme ve webhook akışıyla plan atamasını doğrula.
- İncelenen dosya ağacında otomatik test komutu veya CI iş akışı yoktur. Derleme yapılandırması build sırasında ESLint'i atlar. Başarılı derleme, lint başarısı anlamına gelmez.
- Depolama politikaları, portal yetkilendirmesi, sağlayıcı erişimi ve teslim davranışı hedef dağıtımda doğrulanmalıdır.

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

Hata bildiriminde ajans veya müşteri akışını, talep türünü, gözlenen durumu ve yeniden üretme adımlarını belirt. Örnek dosyalar kullan. Portal token'larını, kimlik bilgilerini ve müşteri verilerini çıkar. Pull request'lerde mevcut arayüz stilini koru ve hangi entegrasyonların gerçekten çalıştırıldığını açıkla.

## Lisans ve kaynaklar

`package.json` içinde **ISC** belirtilir, ancak repoda bağımsız lisans dosyası bulunmaz. Bu belgeler lisans koşulu eklemez veya değiştirmez. Mevcut marka görselleri, yazı tipleri ve üçüncü taraf paketler kendi haklarını ve bildirimlerini korur.
