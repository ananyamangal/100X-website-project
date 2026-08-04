// One-off seed for i18n Phase 1 verification content (Hindi + Indonesian).
// Run with: node scripts/seed-i18n-translations.mjs
//
// Writes into landing_page_translations (shape consumed by
// lib/seo/get-merged-landing-page.ts / OverridesSchema) and translations
// (shape consumed by lib/i18n/translations.ts, for blog posts).
//
// New rows default to reviewed: false — seeding is NOT publishing. Re-seeding
// an EXISTING row (content fix, re-run) leaves its reviewed flag untouched —
// $setOnInsert only applies on first insert, so already-published rows stay
// published across reseeds. Unreviewed rows are invisible to
// getMergedLandingPage()/getAvailableLocales() (they behave as if they don't
// exist). Use scripts/publish-i18n-translation.mjs to explicitly flip a
// specific slug+locale to reviewed: true once its content has actually been
// checked.
//
// Deliberately excludes thermal-and-cold-fogging-machine-100xtfs50,
// double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400, and
// thermal-fogging-machine-with-stainless-steel-tank-100xssma20 — see
// project memory "i18n Phase 1 Product Page Gap" for why.
import { MongoClient } from "mongodb"
import fs from "fs"

const envText = fs.readFileSync(".env.local", "utf8")
const uriLine = envText.split("\n").find((l) => l.startsWith("MONGODB_URI="))
const uri = uriLine.slice("MONGODB_URI=".length).trim()

const LANDING_TRANSLATIONS = [
  {
    slug: "gem-approved-fogging-machine-oem",
    hi: {
      metadata: {
        title: "GeM पोर्टल पर फॉगिंग मशीन | प्रमाणित OEM | 100x Circle",
        description: "GeM पोर्टल पर फॉगिंग मशीन खरीदें — प्रमाणित OEM निर्माता, फैक्ट्री कीमत, ISI-मार्क प्रमाणित। भारत भर की नगर पालिकाओं और स्वास्थ्य विभागों के लिए। आज ही कोटेशन प्राप्त करें।",
      },
      hero: {
        headline: "अनुमोदित OEM सहायता के साथ GeM पोर्टल पर फॉगिंग मशीनें बेचें",
        sub: "100x Circle फॉगिंग मशीनों (Q2 श्रेणी) के लिए GeM-अनुमोदित OEM निर्माता है। OEM रीसेलर कोड, GeM-अनुरूप मशीनें और सीधी फैक्ट्री कीमत प्राप्त करें — सरकारी ऑर्डर जीतना शुरू करने के लिए आपको जो कुछ चाहिए।",
      },
      faqs: [
        { q: "'GeM-अनुमोदित OEM' क्या है और रीसेलर के लिए यह क्यों महत्वपूर्ण है?", a: "GeM-अनुमोदित OEM का मतलब है कि 100x Circle हमारे फॉगिंग मशीन SKU के लिए मूल निर्माता के रूप में गवर्नमेंट ई-मार्केटप्लेस पर पंजीकृत है। रीसेलर एक बार हमारे द्वारा OEM रीसेलर प्राधिकरण कोड जारी करने के बाद अपने स्वयं के GeM सेलर खाते पर इन SKU को लिस्ट कर सकते हैं — उस प्राधिकरण के बिना, आपकी लिस्टिंग गैर-अनुरूप होती है और ऑर्डर स्वीकृति पर अस्वीकार कर दी जाती है।" },
        { q: "100x Circle की फॉगिंग मशीनें किस GeM श्रेणी के तहत सूचीबद्ध हैं?", a: "Q2 — पेस्ट कंट्रोल इक्विपमेंट / फॉगिंग मशीनें। हमारे SKU में थर्मल फॉगर, कोल्ड (ULV) फॉगर, वाहन-माउंटेड यूनिट और स्टेनलेस-स्टील-टैंक वैरिएंट शामिल हैं — सभी सक्रिय GeM तकनीकी शीट्स से मेल खाते हैं।" },
        { q: "क्या मुझे OEM कोड के लिए आवेदन करने से पहले पंजीकृत GeM सेलर होना ज़रूरी है?", a: "जी हाँ। हमारे द्वारा OEM रीसेलर प्राधिकरण जारी करने से पहले आपको एक सक्रिय GeM सेलर ID और वैध GSTIN की आवश्यकता होगी। यदि आप GeM में नए हैं, तो हम आपको पंजीकरण प्रक्रिया के लिए मार्गदर्शन कर सकते हैं, लेकिन सेलर खाता स्वयं आपके नाम पर होना चाहिए।" },
        { q: "क्या अधिकृत GeM रीसेलर बनने के लिए कोई शुल्क है?", a: "नहीं — कोई ज्वाइनिंग शुल्क नहीं है। हम अपनी थोक दर के माध्यम से कमाते हैं; आप हमारी दर और आपकी GeM लिस्टिंग कीमत के बीच के अंतर से कमाते हैं।" },
        { q: "पंजीकरण के बाद मुझे OEM प्राधिकरण कितनी जल्दी मिलेगा?", a: "आमतौर पर आपका पंजीकरण प्राप्त होने के 24–48 घंटों के भीतर। हमारी टीम OEM कोड जारी करने से पहले आपकी GeM सेलर प्रोफ़ाइल, GST स्थिति और बुनियादी KYC सत्यापित करती है।" },
      ],
    },
    id: {
      metadata: {
        title: "Mesin Fogging di Portal GeM | OEM Bersertifikat | 100x Circle",
        description: "Beli mesin fogging di portal GeM — produsen OEM bersertifikat, harga pabrik langsung, bertanda ISI. Untuk pemerintah kota & dinas kesehatan di seluruh India. Dapatkan penawaran hari ini.",
      },
      hero: {
        headline: "Jual Mesin Fogging di Portal GeM dengan Dukungan OEM Bersertifikat",
        sub: "100x Circle adalah produsen OEM bersertifikat GeM untuk Mesin Fogging (kategori Q2). Dapatkan Kode Reseller OEM, mesin yang sesuai GeM, dan harga pabrik langsung — semua yang Anda butuhkan untuk mulai memenangkan pesanan pemerintah.",
      },
      faqs: [
        { q: "Apa itu 'OEM bersertifikat GeM' dan mengapa penting bagi reseller?", a: "OEM bersertifikat GeM berarti 100x Circle terdaftar di Government e-Marketplace sebagai produsen asli untuk SKU mesin fogging kami. Reseller dapat mendaftarkan SKU ini di akun penjual GeM mereka sendiri setelah kami menerbitkan Kode Otorisasi Reseller OEM — tanpa otorisasi tersebut, listing Anda tidak sesuai ketentuan dan akan ditolak saat penerimaan pesanan." },
        { q: "Mesin fogging 100x Circle terdaftar di kategori GeM yang mana?", a: "Q2 — Peralatan Pengendalian Hama / Mesin Fogging. SKU kami mencakup fogger thermal, fogger cold (ULV), unit yang dipasang di kendaraan, dan varian tangki stainless-steel — semuanya sesuai dengan lembar teknis GeM yang berlaku." },
        { q: "Apakah saya perlu menjadi penjual GeM terdaftar sebelum mengajukan kode OEM?", a: "Ya. Anda memerlukan ID Penjual GeM yang aktif dan GSTIN yang valid sebelum kami dapat menerbitkan Otorisasi Reseller OEM. Jika Anda baru mengenal GeM, kami dapat membimbing Anda melalui alur pendaftaran, tetapi akun penjual itu sendiri harus atas nama Anda." },
        { q: "Apakah ada biaya untuk menjadi reseller GeM resmi?", a: "Tidak — tidak ada biaya pendaftaran. Kami mendapatkan keuntungan dari harga grosir yang kami tawarkan; Anda mendapatkan selisih antara harga kami dan harga listing GeM Anda." },
        { q: "Seberapa cepat saya akan menerima otorisasi OEM setelah mendaftar?", a: "Biasanya dalam 24–48 jam setelah pendaftaran Anda kami terima. Tim kami memverifikasi profil penjual GeM, status GST, dan KYC dasar Anda sebelum menerbitkan kode OEM." },
      ],
    },
  },
  {
    slug: "fogging-machine-supplier-in-uttar-pradesh",
    hi: {
      metadata: {
        title: "उत्तर प्रदेश में फॉगिंग मशीन सप्लायर | 100x Circle",
        description: "100x Circle पूरे उत्तर प्रदेश में थर्मल और वाहन-माउंटेड फॉगिंग मशीनें सप्लाई करता है। लखनऊ, कानपुर, वाराणसी, आगरा, नोएडा — सीधे फैक्ट्री से डिस्पैच, GST इनवॉइस, टेंडर सहायता।",
      },
      hero: {
        headline: "उत्तर प्रदेश में फॉगिंग मशीन सप्लायर",
        sub: "100x Circle पूरे उत्तर प्रदेश में थर्मल, कोल्ड और वाहन-माउंटेड फॉगिंग मशीनें डिस्पैच करता है — लखनऊ और कानपुर से लेकर वाराणसी, आगरा और नोएडा तक। नगर निगमों, डीलरों और पेस्ट-कंट्रोल कंपनियों के लिए टेंडर-रेडी कोटेशन, GST इनवॉइस और समर्पित सहायता।",
      },
      faqs: [
        { q: "क्या आप उत्तर प्रदेश के सभी जिलों में फॉगिंग मशीन सप्लाई करते हैं?", a: "जी हाँ — हम अपनी गुरुग्राम फैक्ट्री से यूपी के हर जिले में डिस्पैच करते हैं। गंतव्य और फ्रेट विकल्प के आधार पर ट्रांजिट समय आमतौर पर 24–72 घंटे होता है। बल्क और टेंडर ऑर्डर के लिए कोटेशन में डिलीवरी की पुष्टि की जाती है।" },
        { q: "क्या 100x Circle की मशीनें यूपी के टेंडर और GeM लिस्टिंग के लिए स्वीकार्य हैं?", a: "जी हाँ। हम फॉगिंग मशीनों के लिए GeM-अनुमोदित OEM हैं और हमारे SKU उत्तर प्रदेश की नगर निगमों और राज्य स्वास्थ्य विभागों द्वारा उपयोग किए जाने वाले मानक टेंडर तकनीकी विनिर्देशों से मेल खाते हैं। हम सभी सहायक दस्तावेज़ प्रदान करते हैं — OEM प्राधिकरण पत्र, GST इनवॉइस, डिस्पैच चालान, वारंटी प्रमाणपत्र।" },
        { q: "क्या आप उत्तर प्रदेश में डीलर या डिस्ट्रीब्यूटर अवसर प्रदान करते हैं?", a: "जी हाँ — हम पूरे यूपी में डीलर जोड़ते हैं। ऊपर दिए गए फॉर्म के माध्यम से अपने शहर, वर्तमान व्यवसाय और लक्षित वॉल्यूम के साथ संपर्क करें। मार्जिन, क्षेत्र विशिष्टता और ऑनबोर्डिंग पर पहली कॉल में चर्चा की जाती है।" },
        { q: "यूपी के ग्राहकों को कौन-सी बिक्री-पश्चात सहायता मिलती है?", a: "अंग्रेज़ी और हिंदी में ऑन-कॉल तकनीकी सहायता, गुरुग्राम से स्पेयर-पार्ट्स डिस्पैच, पहली बार फील्ड टीमों के लिए ट्रबलशूटिंग वीडियो, और बड़े संस्थागत खरीदारों के लिए ऑन-साइट सहायता।" },
      ],
    },
    id: {
      metadata: {
        title: "Pemasok Mesin Fogging di Uttar Pradesh | 100x Circle",
        description: "100x Circle memasok mesin fogging thermal & yang dipasang di kendaraan ke seluruh Uttar Pradesh. Lucknow, Kanpur, Varanasi, Agra, Noida — pengiriman langsung dari pabrik, faktur GST, dukungan tender.",
      },
      hero: {
        headline: "Pemasok Mesin Fogging di Uttar Pradesh",
        sub: "100x Circle mengirimkan mesin fogging thermal, cold, dan yang dipasang di kendaraan ke seluruh Uttar Pradesh — dari Lucknow dan Kanpur hingga Varanasi, Agra, dan Noida. Penawaran siap tender, faktur GST, dan dukungan khusus untuk korporasi kota, dealer, dan perusahaan pengendalian hama.",
      },
      faqs: [
        { q: "Apakah Anda memasok mesin fogging ke semua distrik di Uttar Pradesh?", a: "Ya — kami mengirim dari fasilitas kami di Gurugram ke setiap distrik di UP. Waktu transit biasanya 24–72 jam tergantung tujuan dan opsi pengiriman. Pesanan dalam jumlah besar dan tender mendapatkan komitmen pengiriman yang dikonfirmasi dalam penawaran." },
        { q: "Apakah mesin 100x Circle dapat diterima untuk tender UP dan listing GeM?", a: "Ya. Kami adalah OEM bersertifikat GeM untuk mesin fogging dan SKU kami sesuai dengan spesifikasi teknis tender standar yang digunakan oleh korporasi kota dan dinas kesehatan negara bagian di UP. Kami menyediakan semua dokumen pendukung — surat otorisasi OEM, faktur GST, surat jalan pengiriman, sertifikat garansi." },
        { q: "Apakah Anda menawarkan peluang dealer atau distributor di Uttar Pradesh?", a: "Ya — kami merekrut dealer di seluruh UP. Hubungi kami melalui formulir di atas dengan kota, bisnis Anda saat ini, dan target volume. Margin, eksklusivitas wilayah, dan proses onboarding dibahas pada panggilan pertama." },
        { q: "Dukungan purnajual apa yang didapatkan pelanggan UP?", a: "Dukungan teknis via telepon dalam bahasa Inggris dan Hindi, pengiriman suku cadang dari Gurugram, video pemecahan masalah untuk tim lapangan baru, dan bantuan on-site untuk pembeli institusional besar." },
      ],
    },
  },
  {
    slug: "fogging-machine-supplier-in-bihar",
    hi: {
      metadata: {
        title: "बिहार में फॉगिंग मशीन सप्लायर | 100x Circle",
        description: "100x Circle पूरे बिहार में थर्मल और वाहन-माउंटेड फॉगिंग मशीनें सप्लाई करता है — पटना, मुज़फ्फरपुर, गया, भागलपुर, दरभंगा। स्थानीय स्टॉक, टेंडर सहायता, GST-इनवॉइस डिस्पैच।",
      },
      hero: {
        headline: "बिहार में फॉगिंग मशीन सप्लायर",
        sub: "मौसमी बाढ़, घनी आबादी और बार-बार होने वाली मच्छर-जनित बीमारियों के अभियान बिहार को भारत के सबसे अधिक मांग वाले फॉगिंग उपकरण क्षेत्रों में से एक बनाते हैं। 100x Circle एक दशक से अधिक समय से बिहार के सरकारी स्वास्थ्य विभागों और निजी पेस्ट-कंट्रोल ऑपरेटरों को थर्मल, कोल्ड और वाहन-माउंटेड मशीनें सप्लाई कर रहा है — स्थानीय स्टॉक, GST इनवॉइसिंग और ज़मीनी स्तर पर सहायता के साथ।",
      },
      faqs: [
        { q: "क्या आप बिहार में स्थानीय रूप से फॉगिंग मशीनों का स्टॉक रखते हैं?", a: "जी हाँ — हम बिहार में डिस्ट्रीब्यूशन पॉइंट बनाए रखते हैं ताकि ऑर्डर देने वाले ग्राहकों को हमारी गुरुग्राम फैक्ट्री से ट्रांजिट का इंतज़ार न करना पड़े। अधिकतर स्टॉक में मौजूद मॉडल पुष्टि किए गए ऑर्डर के 24–72 घंटों के भीतर डिस्पैच होते हैं। बल्क और टेंडर ऑर्डर के लिए कोटेशन में डिलीवरी की पुष्टि शामिल होती है।" },
        { q: "बिहार में नगर निगमों को सबसे अधिक कौन-सी 100x Circle फॉगर सप्लाई की जाती है?", a: "डबल बैरल व्हीकल-माउंटेड थर्मल फॉगिंग मशीन (100XDB400) शहर-व्यापी और वार्ड-स्तरीय मच्छर नियंत्रण अभियानों के लिए, जिसे अक्सर पोर्टेबल SS-टैंक थर्मल फॉगर (100XSSMA20) के साथ पार्कों, अस्पतालों, स्कूलों और आवासीय क्षेत्रों में इस्तेमाल किया जाता है जहाँ वाहन नहीं पहुँच सकता।" },
        { q: "क्या 100x Circle मशीनें बिहार सरकारी टेंडर और GeM लिस्टिंग के लिए स्वीकार्य हैं?", a: "जी हाँ। हम फॉगिंग मशीनों के लिए GeM-अनुमोदित OEM हैं और हमारे SKU बिहार के नगर निगमों, नगर निगम, पंचायतों और राज्य स्वास्थ्य विभाग द्वारा उपयोग किए जाने वाले मानक टेंडर तकनीकी विनिर्देशों से मेल खाते हैं। हर सप्लाई में खरीद टीमों को आवश्यक OEM प्राधिकरण पत्र, GST इनवॉइस, डिस्पैच चालान और वारंटी प्रमाणपत्र शामिल होता है।" },
        { q: "क्या आप बिहार में डीलर या डिस्ट्रीब्यूटर अवसर प्रदान करते हैं?", a: "जी हाँ — पूरे बिहार में चैनल पार्टनर के अवसर उपलब्ध हैं (पटना, मुज़फ्फरपुर, गया, भागलपुर, दरभंगा और टियर-2 शहर)। ऊपर दिए गए फॉर्म के माध्यम से अपने शहर, वर्तमान व्यवसाय और लक्षित वॉल्यूम के साथ संपर्क करें — मार्जिन, क्षेत्र और ऑनबोर्डिंग पर पहली कॉल में चर्चा की जाती है।" },
        { q: "बिहार के ग्राहकों को कौन-सी बिक्री-पश्चात सहायता मिलती है?", a: "अंग्रेज़ी और हिंदी में ऑन-कॉल तकनीकी सहायता, गुरुग्राम से स्पेयर-पार्ट्स डिस्पैच, पहली बार फील्ड टीमों के लिए ट्रबलशूटिंग वीडियो, और बड़े संस्थागत खरीदारों के लिए ऑन-साइट सहायता। हमारी टीम ने बिहार के स्वास्थ्य विभागों के लिए ऑपरेटर प्रशिक्षण आयोजित किया है और अनुरोध पर आपकी टीम के लिए भी इसकी व्यवस्था कर सकती है।" },
      ],
    },
    id: {
      metadata: {
        title: "Pemasok Mesin Fogging di Bihar | 100x Circle",
        description: "100x Circle memasok mesin fogging thermal & yang dipasang di kendaraan ke seluruh Bihar — Patna, Muzaffarpur, Gaya, Bhagalpur, Darbhanga. Stok lokal, dukungan tender, pengiriman dengan faktur GST.",
      },
      hero: {
        headline: "Pemasok Mesin Fogging di Bihar",
        sub: "Banjir musiman, populasi padat, dan kampanye penyakit yang ditularkan nyamuk yang berulang menjadikan Bihar salah satu zona permintaan tertinggi di India untuk peralatan fogging. 100x Circle telah memasok mesin thermal, cold, dan yang dipasang di kendaraan ke dinas kesehatan pemerintah dan operator pengendalian hama swasta di Bihar selama lebih dari satu dekade — dengan stok lokal, faktur GST, dan dukungan langsung di lapangan.",
      },
      faqs: [
        { q: "Apakah Anda menyimpan stok mesin fogging secara lokal di Bihar?", a: "Ya — kami mempertahankan titik distribusi di Bihar sehingga pelanggan yang melakukan pemesanan tidak perlu menunggu pengiriman dari fasilitas kami di Gurugram. Sebagian besar model yang tersedia dikirim dalam 24–72 jam setelah pesanan dikonfirmasi. Pesanan dalam jumlah besar dan tender mendapatkan komitmen pengiriman yang dikonfirmasi sebagai bagian dari penawaran." },
        { q: "Mesin fogging 100x Circle mana yang paling umum dipasok ke korporasi kota di Bihar?", a: "Mesin Fogging Thermal Double Barrel yang Dipasang di Kendaraan (100XDB400) untuk kampanye pengendalian nyamuk di seluruh kota dan tingkat lingkungan, sering dipasangkan dengan mesin fogging thermal tangki SS portabel (100XSSMA20) untuk taman, rumah sakit, sekolah, dan kawasan pemukiman yang tidak dapat dijangkau kendaraan." },
        { q: "Apakah mesin 100x Circle dapat diterima untuk tender pemerintah Bihar dan listing GeM?", a: "Ya. Kami adalah OEM bersertifikat GeM untuk mesin fogging dan SKU kami sesuai dengan spesifikasi teknis tender standar yang digunakan oleh korporasi kota, Nagar Nigam, panchayat, dan dinas kesehatan negara bagian Bihar. Setiap pengiriman mencakup surat otorisasi OEM, faktur GST, surat jalan pengiriman, dan sertifikat garansi yang dibutuhkan tim pengadaan." },
        { q: "Apakah Anda menawarkan peluang dealer atau distributor di Bihar?", a: "Ya — slot mitra saluran distribusi terbuka di seluruh Bihar (Patna, Muzaffarpur, Gaya, Bhagalpur, Darbhanga, dan kota Tier-2). Hubungi kami melalui formulir di atas dengan kota, bisnis Anda saat ini, dan target volume — margin, wilayah, dan proses onboarding dibahas pada panggilan pertama." },
        { q: "Dukungan purnajual apa yang didapatkan pelanggan Bihar?", a: "Dukungan teknis via telepon dalam bahasa Inggris dan Hindi, pengiriman suku cadang dari Gurugram, video pemecahan masalah untuk tim lapangan baru, dan bantuan on-site untuk pembeli institusional besar. Tim kami telah melakukan pelatihan operator untuk dinas kesehatan Bihar dan dapat mengatur hal yang sama untuk tim Anda atas permintaan." },
      ],
    },
  },
  {
    slug: "dengue-control-fogging-machine",
    hi: {
      metadata: {
        title: "डेंगू नियंत्रण फॉगिंग मशीन | नगरपालिका और सोसाइटी उपयोग | 100x Circle",
        description: "डेंगू Aedes aegypti नियंत्रण के लिए फॉगिंग मशीनें। भारत भर की नगर निगमों और हाउसिंग सोसाइटियों द्वारा उपयोग की जाती हैं। 24 घंटे में मॉडल सिफारिश प्राप्त करें।",
      },
      hero: {
        headline: "सिद्ध फॉगिंग मशीनों से डेंगू को स्रोत पर रोकें",
        sub: "Aedes aegypti — डेंगू का वाहक — घरों के पास प्रजनन करता है और दिन में काटता है। सही फॉगर, सही ड्रॉपलेट साइज़ और सही एप्लिकेशन विंडो संचरण चक्र को तोड़ते हैं। यहाँ बताया गया है कि 100x Circle नगर निगमों, हाउसिंग सोसाइटियों और सार्वजनिक स्वास्थ्य टीमों में डेंगू नियंत्रण के लिए क्या तैनात करता है।",
      },
      faqs: [
        { q: "क्या डेंगू नियंत्रण के लिए थर्मल फॉगिंग सही विकल्प है?", a: "वयस्क Aedes aegypti को दबाने के लिए — हाँ। थर्मल फॉगिंग एक घना दृश्यमान बादल बनाती है जिसमें ड्रॉपलेट साइज़ (आमतौर पर 10–25 माइक्रोन) होता है जो आराम कर रहे और उड़ रहे वयस्क मच्छरों के संपर्क में आता है। बंद कमरों की कीटाणुशोधन या संवेदनशील क्षेत्रों के लिए जहाँ गर्मी और दृश्यमान धुंध अवांछित हो, कोल्ड (ULV) फॉगिंग बेहतर है। अधिकतर नगरपालिका डेंगू कार्यक्रम वातावरण के आधार पर दोनों को मिलाते हैं।" },
        { q: "दिन में डेंगू फॉगिंग अभियान कब चलाना चाहिए?", a: "सुबह (5:30–7:00 बजे) और शाम (5:30–7:30 बजे) सबसे उपयुक्त हैं। Aedes aegypti ठंडे धुंधलके के घंटों में सबसे अधिक सक्रिय होता है, इसलिए ड्रॉपलेट-मच्छर संपर्क सबसे अधिक होता है। दोपहर में फॉगिंग करने से उच्च वाष्पीकरण और कम मच्छर गतिविधि के कारण कीटनाशक बर्बाद होता है।" },
        { q: "डेंगू अभियानों के लिए अधिकतर नगर निगम कौन-सा 100x Circle मॉडल चुनते हैं?", a: "डबल बैरल थर्मल फॉगिंग मशीन (100XDB400) वाहन-माउंटेड वार्ड-स्तरीय कवरेज के लिए, जिसे पार्कों, अस्पतालों, स्कूलों और सोसाइटी परिसरों के लिए पोर्टेबल थर्मल यूनिट्स (TFS50 या SSMA20) के साथ जोड़ा जाता है जहाँ वाहन नहीं पहुँच सकता।" },
        { q: "क्या आप CIB-अनुमोदित कीटनाशक सप्लाई करते हैं या केवल मशीन?", a: "हम उपकरण सप्लाई करते हैं और इसे मानक कीटनाशक तनुकरण दरों के लिए कैलिब्रेट करते हैं। कीटनाशक की खरीद स्वयं स्वास्थ्य विभाग या पेस्ट-कंट्रोल ऑपरेटर द्वारा की जाती है, आमतौर पर पाइरेथ्रॉइड या मैलाथियान फॉर्मूलेशन जैसा CIB-अनुमोदित एडल्टिसाइड।" },
      ],
    },
    id: {
      metadata: {
        title: "Mesin Fogging Pengendali Demam Berdarah | Untuk Kota & Komplek Perumahan | 100x Circle",
        description: "Mesin fogging untuk pengendalian Aedes aegypti penyebab demam berdarah. Digunakan oleh korporasi kota dan komplek perumahan di seluruh India. Dapatkan rekomendasi model dalam 24 jam.",
      },
      hero: {
        headline: "Hentikan Demam Berdarah dari Sumbernya dengan Mesin Fogging Teruji",
        sub: "Aedes aegypti — vektor demam berdarah — berkembang biak dekat rumah dan menggigit di siang hari. Fogger yang tepat, ukuran droplet yang tepat, dan jendela aplikasi yang tepat memutus siklus penularan. Berikut yang digunakan 100x Circle untuk pengendalian demam berdarah di korporasi kota, komplek perumahan, dan tim kesehatan masyarakat.",
      },
      faqs: [
        { q: "Apakah thermal fogging pilihan yang tepat untuk pengendalian demam berdarah?", a: "Untuk menekan populasi Aedes aegypti dewasa — ya. Thermal fogging menghasilkan kabut padat yang terlihat dengan ukuran droplet (biasanya 10–25 μm) yang mengenai nyamuk dewasa yang sedang hinggap maupun terbang. Untuk disinfeksi ruangan tertutup atau area sensitif di mana panas dan kabut yang terlihat tidak diinginkan, cold fogging (ULV) lebih disarankan. Sebagian besar program demam berdarah kota menggabungkan keduanya tergantung lingkungan." },
        { q: "Kapan waktu yang tepat dalam sehari untuk menjalankan fogging demam berdarah?", a: "Fajar (05.30–07.00) dan senja (17.30–19.30) adalah waktu optimal. Aedes aegypti paling aktif pada jam-jam senja yang lebih sejuk, sehingga kontak droplet-nyamuk paling tinggi. Fogging siang hari memboroskan insektisida karena penguapan tinggi dan aktivitas nyamuk rendah." },
        { q: "Model 100x Circle mana yang paling banyak dipilih korporasi kota untuk kampanye demam berdarah?", a: "Mesin Fogging Thermal Double Barrel (100XDB400) untuk cakupan tingkat lingkungan yang dipasang di kendaraan, dipasangkan dengan unit thermal portabel (TFS50 atau SSMA20) untuk taman, rumah sakit, sekolah, dan kompleks perumahan yang tidak dapat dijangkau kendaraan." },
        { q: "Apakah Anda memasok insektisida bersertifikat CIB atau hanya mesinnya?", a: "Kami memasok peralatan dan mengkalibrasinya untuk tingkat pengenceran insektisida standar. Pengadaan insektisida itu sendiri ditangani oleh dinas kesehatan atau operator pengendalian hama, biasanya adultisida bersertifikat CIB seperti formulasi piretroid atau malathion." },
      ],
    },
  },
  {
    slug: "thermal-vs-cold-fogging-machine",
    hi: {
      metadata: {
        title: "थर्मल बनाम कोल्ड फॉगिंग मशीन — कौन-सी खरीदें | 100x Circle",
        description: "थर्मल बनाम कोल्ड (ULV) फॉगिंग: 8-बिंदु तुलना। कवरेज, ड्रॉपलेट साइज़, इनडोर बनाम आउटडोर उपयोग, कीटनाशक अनुकूलता। विशेषज्ञ खरीदार गाइड।",
      },
      hero: {
        headline: "थर्मल बनाम कोल्ड फॉगिंग: आपके उपयोग के लिए कौन-सा सही है?",
        sub: "थर्मल और कोल्ड (ULV) दोनों फॉगिंग मशीनों का अपना स्थान है — लेकिन गलत चुनाव कीटनाशक बर्बाद करता है और फील्ड टीमों को निराश करता है। यहाँ वह साथ-साथ तुलना है जो हम हर खरीदार को दिखाते हैं।",
      },
      faqs: [
        { q: "अगर मैं केवल एक मशीन खरीद सकता हूँ, तो कौन-सा प्रकार अधिक उपयोग मामलों को कवर करता है?", a: "थर्मल और कोल्ड कॉम्बो यूनिट (100XTFS50) — यह एक ही मशीन में थर्मल और कोल्ड (ULV) दोनों मोड सपोर्ट करता है। अधिकतर खरीदारों के लिए जिन्हें आउटडोर मच्छर नियंत्रण और इनडोर कीटाणुशोधन में लचीलापन चाहिए, यह सबसे बहुमुखी सिंगल-मशीन विकल्प है।" },
        { q: "क्या कोल्ड (ULV) फॉगिंग इनडोर उपयोग के लिए थर्मल से अधिक सुरक्षित है?", a: "जी हाँ। कोल्ड फॉगिंग कोई गर्मी और न्यूनतम दृश्यमान बादल उत्पन्न करती है, इसलिए यह व्याप्त या संवेदनशील इनडोर वातावरण के लिए उपयुक्त है — अस्पताल, स्कूल, सर्वर रूम, खाद्य-प्रबंधन क्षेत्र। थर्मल फॉगिंग आमतौर पर गर्मी और दृश्यता के कारण आउटडोर या खाली क्षेत्र के उपयोग तक सीमित होती है।" },
        { q: "क्या थर्मल और कोल्ड फॉगर एक ही कीटनाशक का उपयोग करते हैं?", a: "दोनों CIB-अनुमोदित एडल्टिसाइड का उपयोग कर सकते हैं, लेकिन थर्मल फॉगर को आमतौर पर तेल-आधारित कैरियर (स्वच्छ वाष्पीकरण के लिए) की आवश्यकता होती है, जबकि कोल्ड फॉगर तेल- या पानी-आधारित दोनों कैरियर के साथ काम करते हैं। हम हर मशीन के साथ तनुकरण मार्गदर्शन प्रदान करते हैं।" },
        { q: "कृषि और ग्रीनहाउस कीट नियंत्रण के बारे में क्या?", a: "थर्मल फॉगिंग खुले खेतों और बागों के लिए उपयुक्त है (कैनोपी के माध्यम से बेहतर प्रवेश)। कोल्ड फॉगिंग ग्रीनहाउस और रसायन-संवेदनशील फसलों के लिए उपयुक्त है जहाँ गर्मी या दृश्यमान बहाव अवांछित हो। कई बड़े फार्म अलग-अलग ब्लॉक के लिए दोनों का उपयोग करते हैं।" },
      ],
    },
    id: {
      metadata: {
        title: "Mesin Fogging Thermal vs Cold — Mana yang Harus Dibeli | 100x Circle",
        description: "Thermal vs cold (ULV) fogging: perbandingan 8 poin. Cakupan, ukuran droplet, penggunaan indoor vs outdoor, kompatibilitas insektisida. Panduan pembeli dari ahli.",
      },
      hero: {
        headline: "Thermal vs Cold Fogging: Mana yang Sesuai Kebutuhan Anda?",
        sub: "Baik mesin fogging thermal maupun cold (ULV) memiliki kegunaannya masing-masing — tetapi pilihan yang salah memboroskan insektisida dan menyulitkan tim lapangan. Berikut perbandingan berdampingan yang kami jelaskan kepada setiap pembeli.",
      },
      faqs: [
        { q: "Jika saya hanya bisa membeli satu mesin, jenis mana yang mencakup lebih banyak kasus penggunaan?", a: "Unit kombo thermal & cold (100XTFS50) — mendukung mode thermal dan cold (ULV) dalam satu mesin. Bagi sebagian besar pembeli yang membutuhkan fleksibilitas antara pengendalian nyamuk outdoor dan disinfeksi indoor, ini adalah pilihan satu mesin paling serbaguna." },
        { q: "Apakah cold fogging (ULV) lebih aman untuk penggunaan indoor dibanding thermal?", a: "Ya. Cold fogging tidak menghasilkan panas dan kabut yang terlihat minimal, sehingga cocok untuk lingkungan indoor yang berpenghuni atau sensitif — rumah sakit, sekolah, ruang server, area penanganan makanan. Thermal fogging umumnya dibatasi untuk penggunaan outdoor atau area kosong karena panas dan visibilitasnya." },
        { q: "Apakah fogger thermal dan cold menggunakan insektisida yang sama?", a: "Keduanya dapat menggunakan adultisida bersertifikat CIB, tetapi fogger thermal biasanya memerlukan pembawa berbasis minyak (untuk penguapan yang bersih), sedangkan fogger cold dapat bekerja dengan pembawa berbasis minyak maupun air. Kami memberikan panduan pengenceran untuk setiap mesin." },
        { q: "Bagaimana dengan pengendalian hama pertanian dan rumah kaca?", a: "Thermal fogging cocok untuk lahan terbuka dan kebun buah (penetrasi lebih baik melalui kanopi). Cold fogging cocok untuk rumah kaca dan tanaman yang sensitif terhadap bahan kimia di mana panas atau hanyutan yang terlihat tidak diinginkan. Banyak pertanian besar menjalankan keduanya untuk blok yang berbeda." },
      ],
    },
  },
  {
    slug: "fogging-machine-buying-guide",
    hi: {
      metadata: {
        title: "फॉगिंग मशीन खरीद गाइड (भारत) | 100x Circle",
        description: "भारत में सही फॉगिंग मशीन कैसे चुनें: फॉर्म फैक्टर, ड्रॉपलेट साइज़, कवरेज, प्रमाणन, बिक्री-पश्चात सेवा। 100x Circle की निर्माण टीम की ओर से एक व्यावहारिक खरीदार गाइड।",
      },
      hero: {
        headline: "भारत के लिए फॉगिंग मशीन खरीद गाइड",
        sub: "सही फॉगिंग मशीन चुनने के लिए एक व्यावहारिक, विक्रेता-ईमानदार गाइड — 100x Circle की निर्माण टीम द्वारा नगरपालिका खरीदारों, पेस्ट-कंट्रोल ऑपरेटरों, डीलरों और बड़ी संस्थागत खरीद के लिए लिखी गई।",
      },
      faqs: [
        { q: "फॉगिंग मशीन चुनते समय सबसे आम खरीदार गलती क्या है?", a: "संचालन की कुल लागत पर विचार किए बिना केवल कीमत के आधार पर खरीदना। सबसे सस्ती मशीन अक्सर प्रति हेक्टेयर अधिक कीटनाशक खपत करती है, अधिक बार खराब होती है, और सर्विस करना कठिन होता है — जो 3 वर्षों में खरीद मूल्य से कई गुना अधिक हो जाता है। सही तुलना प्रति-हेक्टेयर-प्रति-वर्ष डिलीवर की गई लागत है, न कि यूनिट कीमत।" },
        { q: "क्या मुझे थर्मल फॉगर खरीदना चाहिए या कोल्ड (ULV) फॉगर?", a: "उपयोग मामला निर्णय लेता है। आउटडोर मच्छर नियंत्रण के लिए थर्मल बेहतर है — इसका घना, गर्म धुंआ वनस्पति और नालों में प्रवेश करता है। इनडोर कीटाणुशोधन, संवेदनशील वातावरण और पानी-आधारित रसायनों के लिए कोल्ड (ULV) बेहतर है। कई खरीदारों को दोनों की आवश्यकता होती है — विवरण के लिए हमारा थर्मल-बनाम-कोल्ड तुलना पेज देखें।" },
        { q: "किसी संस्था के लिए खरीदते समय BIS या GeM प्रमाणन कितना महत्वपूर्ण है?", a: "टेंडर और सरकारी ऑर्डर के लिए महत्वपूर्ण। नगर निगमों, स्वास्थ्य विभागों और किसी भी GeM लिस्टिंग के लिए, आपको एक OEM-प्रमाणित, विनिर्देश-अनुरूप मशीन चाहिए — अन्यथा स्वीकृति के समय ऑर्डर अस्वीकार कर दिया जाएगा। निजी खरीदारों (हाउसिंग सोसाइटी, फार्म, पेस्ट कंट्रोल फर्म) के लिए, प्रमाणन वारंटी + स्पेयर्स उपलब्धता जितना महत्वपूर्ण नहीं है।" },
        { q: "एक गुणवत्तापूर्ण फॉगिंग मशीन कितने समय तक चलनी चाहिए?", a: "नियमित रखरखाव के साथ एक अच्छी तरह से बनी थर्मल फॉगर 7–10 वर्षों तक फील्ड उपयोग के लिए चलती है। पल्स-जेट इंजन और स्टेनलेस-स्टील घटक दीर्घायु वाले पुर्जे हैं; उपभोग्य वस्तुओं (स्पार्क प्लग, फ्यूल फिल्टर, गास्केट) को वार्षिक प्रतिस्थापन की आवश्यकता होती है। किसी भी विक्रेता से दूर रहें जो 12 महीने से कम वारंटी की पेशकश करता है।" },
        { q: "खरीदने से पहले मैं 100x Circle मशीनों को काम करते हुए कहाँ देख सकता हूँ?", a: "हम हर कोटेशन के साथ ऑपरेटर डेमो वीडियो साझा करते हैं। संस्थागत खरीदारों (10+ यूनिट ऑर्डर) के लिए, हम अपनी गुरुग्राम फैक्ट्री में व्यक्तिगत डेमो की व्यवस्था करते हैं या निकटतम डिप्लॉयमेंट साइट पर विज़िट का समन्वय करते हैं।" },
      ],
    },
    id: {
      metadata: {
        title: "Panduan Membeli Mesin Fogging (India) | 100x Circle",
        description: "Cara memilih mesin fogging yang tepat di India: bentuk unit, ukuran droplet, cakupan, sertifikasi, purnajual. Panduan pembeli praktis dari tim manufaktur 100x Circle.",
      },
      hero: {
        headline: "Panduan Membeli Mesin Fogging untuk India",
        sub: "Panduan praktis dan jujur dari vendor untuk memilih mesin fogging yang tepat — ditulis oleh tim manufaktur 100x Circle untuk pembeli kota, operator pengendalian hama, dealer, dan pengadaan institusional besar.",
      },
      faqs: [
        { q: "Apa kesalahan pembeli yang paling umum saat memilih mesin fogging?", a: "Membeli berdasarkan harga tanpa mempertimbangkan total biaya operasional. Mesin termurah seringkali mengonsumsi lebih banyak insektisida per hektar, lebih sering rusak, dan lebih sulit diservis — bertambah menjadi berkali-kali lipat dari harga beli dalam 3 tahun. Perbandingan yang tepat adalah biaya-terkirim-per-hektar-per-tahun, bukan harga per unit." },
        { q: "Haruskah saya membeli fogger thermal atau fogger cold (ULV)?", a: "Kasus penggunaan yang menentukan. Thermal lebih baik untuk pengendalian nyamuk outdoor — kabutnya yang padat dan panas menembus vegetasi dan saluran air. Cold (ULV) lebih baik untuk disinfeksi indoor, lingkungan sensitif, dan bahan kimia berbasis air. Banyak pembeli membutuhkan keduanya — lihat halaman perbandingan thermal-vs-cold kami untuk detailnya." },
        { q: "Seberapa penting sertifikasi BIS atau GeM saat membeli untuk institusi?", a: "Sangat penting untuk tender dan pesanan pemerintah. Untuk korporasi kota, dinas kesehatan, dan listing GeM apa pun, Anda memerlukan mesin bersertifikat OEM yang sesuai spesifikasi — atau pesanan akan ditolak saat penerimaan. Untuk pembeli swasta (komplek perumahan, pertanian, perusahaan pengendalian hama), sertifikasi kurang penting dibandingkan garansi + ketersediaan suku cadang." },
        { q: "Berapa lama mesin fogging berkualitas seharusnya bertahan?", a: "Fogger thermal yang dibuat dengan baik dan dirawat secara rutin bertahan 7–10 tahun penggunaan lapangan. Mesin pulse-jet dan komponen stainless-steel adalah bagian berumur panjang; barang habis pakai (busi, filter bahan bakar, gasket) perlu diganti setiap tahun. Hindari vendor mana pun yang menawarkan garansi di bawah 12 bulan." },
        { q: "Di mana saya bisa melihat mesin 100x Circle beraksi sebelum membeli?", a: "Kami membagikan video demo operator dengan setiap penawaran. Untuk pembeli institusional (pesanan 10+ unit), kami mengatur demo langsung di fasilitas kami di Gurugram atau mengoordinasikan kunjungan ke lokasi penerapan terdekat." },
      ],
    },
  },
]

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  const col = db.collection("landing_page_translations")

  let count = 0
  for (const entry of LANDING_TRANSLATIONS) {
    for (const locale of ["hi", "id"]) {
      const overrides = entry[locale]
      await col.updateOne(
        { slug: entry.slug, locale },
        {
          $set: { slug: entry.slug, locale, overrides, seededAt: new Date().toISOString() },
          $setOnInsert: { reviewed: false },
        },
        { upsert: true },
      )
      count++
      console.log(`  upserted ${entry.slug} [${locale}]`)
    }
  }
  console.log(`Done — ${count} translation docs upserted across ${LANDING_TRANSLATIONS.length} slugs.`)
  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
