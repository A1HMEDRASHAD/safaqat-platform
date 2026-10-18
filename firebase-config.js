/* =========================================================
   ملف إعدادات قاعدة البيانات والذكاء الاصطناعي — الإصدار 1.8
   File: firebase-config.js
   ========================================================= */

window.SQ_CONFIG_LOADED = true;

const APP_VERSION = "1.8";
let APP_NAME = "صفقات كتابية";
let APP_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg68URzujuETQYMt1CLBY8R6t_oYn1obpsfvDOQLmQ_da-30Qn1393-kgrUJ4nBzeLlcyQKHsALCDO5HzKzqAtSxe6jHdIdQxCuYzQ1COqydA-vKaMRgtxa2TzZtbGF-cldsRxCTQ4EtlhT6OzxrTcbWWZ9OeyZHGH5-EppJ-mNkAWRhMpaBOfNynVDqGkx/s3000/58210.jpg";
let DAR_WHATSAPP_NUMBER = "+201016327947";
let DEFAULT_CURRENCY = "ر.س";
const CURRENT_DOMAIN_ORIGIN = window.location.origin;
const IMGBB_API_KEY = "Bac3eeb4c41bcfcb38f6ada28c50c825";

// إعدادات الاتصال بقاعدة بيانات Firebase الرسمية الخاصة بالمنصة
const firebaseConfig = {
  apiKey: "AIzaSyBO07TpLj8v72VX37aSTK0YAYY9OOCq2Yo",
  authDomain: "safaqatkitabiya1.firebaseapp.com",
  databaseURL: "https://safaqatkitabiya1-default-rtdb.firebaseio.com",
  projectId: "safaqatkitabiya1",
  storageBucket: "safaqatkitabiya1.firebasestorage.app",
  messagingSenderId: "701445131768",
  appId: "1:701445131768:web:1cabe6241e0c6ab7195a0d"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// تثبيت جلسة تسجيل الدخول محلياً لمنع الخروج المتكرر على الهواتف
try {
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
} catch (e) {}

// حسابات الإدارة العليا المعتمدة (الفقاعة الحمراء)
const ADMINS = [
  'safaqatkitabiya@gmail.com',
  'rawialshamal@gmail.com'
];

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const ANON_PIC = "https://cdn-icons-png.flaticon.com/512/2829/2829835.png";

// تصنيفات المساهمات الأدبية في المجتمع
const POST_CATEGORIES = {
  literature: { label: 'خاطرة / نص أدبي', icon: 'fa-feather-pointed' },
  quote:      { label: 'اقتباس من كتاب', icon: 'fa-quote-right' },
  review:     { label: 'مراجعة كتاب', icon: 'fa-star' },
  article:    { label: 'مقال ثقافي', icon: 'fa-newspaper' },
  discussion: { label: 'تساؤل ونقاش', icon: 'fa-comments' }
};

// الأقسام الأساسية للكتب في المتجر والمكتبة
const DEFAULT_BOOK_CATEGORIES = {
  dar_exclusives: { label: 'إصدارات الدار', icon: 'fa-crown' },
  novels:         { label: 'روايات وسرد', icon: 'fa-book-open' },
  fantasy:        { label: 'فانتازيا وخيال', icon: 'fa-wand-magic-sparkles' },
  stories:        { label: 'قصص قصيرة', icon: 'fa-feather' },
  thought:        { label: 'فكر وفلسفة', icon: 'fa-brain' },
  history:        { label: 'تاريخ وسير', icon: 'fa-landmark' },
  poetry:         { label: 'شعر وخواطر', icon: 'fa-scroll' },
  self_dev:       { label: 'تطوير الذات', icon: 'fa-seedling' }
};

// خريطة صلاحيات الموظفين المفصلة
const STAFF_PERMISSIONS_MAP = {
  manage_books:   { label: 'إدارة المكتبة والكتب', desc: 'رفع وتعديل الكتب، ربط الكُتّاب ودور النشر، وإضافة الأقسام', icon: 'fa-book' },
  manage_orders:  { label: 'إدارة المبيعات والفواتير', desc: 'البحث برقم الطلب (SK) وتحديث مراحل الشحن والتسليم', icon: 'fa-file-invoice-dollar' },
  manage_mod:     { label: 'الإشراف والرقابة', desc: 'مراجعة البلاغات، حذف المخالفات، وتقييد الحسابات', icon: 'fa-shield-halved' },
  manage_support: { label: 'خدمة العملاء والدعم', desc: 'استقبال تذاكر الدعم الفني والرد المباشر على الأعضاء', icon: 'fa-headset' },
  manage_ads:     { label: 'إدارة الأحداث والمعارض', desc: 'إضافة وتعديل المعارض والأحداث في الشريط التلقائي العلوي', icon: 'fa-calendar-star' }
};

// مراحل تتبع الفواتير والطلبات
const ORDER_STATUS_MAP = {
  pending_review: { label: 'تمت المراجعة', color: '#f59e0b', icon: 'fa-file-circle-check', step: 1 },
  contacted:      { label: 'تم التواصل', color: '#0284c7', icon: 'fa-phone-volume', step: 2 },
  processing:     { label: 'تأكيد وتجهيز الطلب', color: '#8b5cf6', icon: 'fa-box-open', step: 3 },
  shipped:        { label: 'تم الشحن', color: '#10b981', icon: 'fa-truck-fast', step: 4 },
  completed:      { label: 'تم التسليم', color: '#059669', icon: 'fa-circle-check', step: 5 },
  cancelled:      { label: 'طلب ملغي', color: '#ef4444', icon: 'fa-ban', step: 0 }
};

// قائمة الدول المعتمدة
const COUNTRIES_MAP = {
  '':      { name: 'غير محدد' },
  'YE':    { name: 'اليمن' },
  'SA':    { name: 'السعودية' },
  'EG':    { name: 'مصر' },
  'AE':    { name: 'الإمارات' },
  'KW':    { name: 'الكويت' },
  'QA':    { name: 'قطر' },
  'OM':    { name: 'عُمان' },
  'BH':    { name: 'البحرين' },
  'IQ':    { name: 'العراق' },
  'SY':    { name: 'سوريا' },
  'JO':    { name: 'الأردن' },
  'PS':    { name: 'فلسطين' },
  'LB':    { name: 'لبنان' },
  'SD':    { name: 'السودان' },
  'LY':    { name: 'ليبيا' },
  'TN':    { name: 'تونس' },
  'DZ':    { name: 'الجزائر' },
  'MA':    { name: 'المغرب' },
  'MR':    { name: 'موريتانيا' },
  'TR':    { name: 'تركيا' },
  'OTHER': { name: 'دولي' }
};

// خلفيات القصص اليومية (Stories 2.0)
const STORY_GRADIENTS = {
  royal:   'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  emerald: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
  crimson: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
  purple:  'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)',
  gold:    'linear-gradient(135deg, #78350f 0%, #451a03 100%)'
};

// الحالة المركزية للمنصة (AppState v1.8)
window.AppState = {
  currentUser: null,
  isAdmin: false,
  userData: {
    following: [],
    blockedUsers: [],
    bookmarks: [],
    savedBooks: [],
    readingShelf: {},
    currentlyReadingBookId: '',
    permissions: [],
    linkedPublishers: [], // دور النشر المرتبط بها الكاتب
    publisherWhatsapp: '', // رقم واتساب خاص بدار النشر لاستقبال طلباتها
    aiInterests: { cats: {}, authors: {}, keywords: {}, viewedBooks: [] },
    theme: 'auto',
    customName: '',
    bio: '',
    statusText: '',
    nationality: '',
    birthday: '',
    showOnline: true,
    fontSize: '16.5px',
    isMuted: false,
    isBanned: false,
    isAuthor: false,    // شارة التوثيق الزرقاء (للكُتّاب والمؤلفين)
    isPublisher: false, // شارة التوثيق الذهبية (لدور النشر المعتمدة)
    agreedToTerms: false,
    joinedAt: 0,
    lastActive: 0
  },
  allUsers: {},
  posts: [],
  booksList: [],
  customBookCategories: {},
  eventsList: [],
  activeEventIdx: 0,
  eventsTimer: null,
  viewingEventId: null,
  editingEventId: null,
  pendingEventThumb: '',

  storiesList: [],
  groupedStories: {},
  activeStoryUid: null,
  activeStoryIdx: 0,
  storyTimer: null,

  notificationsList: [],
  ticketsList: [],
  ordersList: [],
  cart: [],
  lastIssuedOrder: null,
  deferredPwaPrompt: null,

  activeMainView: 'store',
  previousView: 'store',
  savedScrollPosition: 0,
  viewingPostId: null,
  viewingBookId: null,
  viewedProfileUid: null,
  activeProfileTab: 'posts',

  currentFilter: 'for_you',
  activeCategoryFilter: null,
  searchQuery: '',

  librarySort: 'smart',
  activeBookCatFilter: 'all',
  librarySearchQuery: '',
  renderedPostSignature: '',
  collapsedThreads: new Set(),

  presenceInterval: null,
  userDocUnsubscribe: null,
  feedUnsubscribe: null,
  booksUnsubscribe: null,
  storiesUnsubscribe: null,
  eventsUnsubscribe: null,
  notifUnsubscribe: null,
  ticketsUnsubscribe: null,
  ordersUnsubscribe: null,

  editingPostId: null,
  linkedBookForPost: null,
  postLimit: 30,

  editingBookId: null,
  selectedAuthorUidForBook: '',
  selectedPublisherUidForBook: 'DAR_MAIN',
  pendingBookCover: '',
  showDownloadConfirmForBook: false,

  adminCurrentTab: 'help',
  settingsSubTab: 'identity',
  activeLegalPage: 'about',
  sharingPostId: null,
  shareCardTheme: 'royal',
  pendingPostImages: [],
  isUploadingImage: false,
  pendingStoryImg: '',
  promptCallback: null,
  deepLinkHandled: false
};

// =========================================================
// 🧠 محرك الذكاء الاصطناعي الخفي (Safaqat Silent AI Affinity Engine)
// يحلل اهتمامات القارئ بصمت ويرتب المتجر والبحث والكتب المشابهة
// =========================================================
window.SafaqatAI = {
  getProfile: function() {
    let local = { cats: {}, authors: {}, keywords: {}, viewedBooks: [] };
    try {
      const raw = localStorage.getItem('sq_ai_interest_profile_v18');
      if (raw) local = JSON.parse(raw);
    } catch (e) {}
    if (AppState.userData && AppState.userData.aiInterests) {
      local.cats = { ...(AppState.userData.aiInterests.cats || {}), ...(local.cats || {}) };
      local.authors = { ...(AppState.userData.aiInterests.authors || {}), ...(local.authors || {}) };
      local.keywords = { ...(AppState.userData.aiInterests.keywords || {}), ...(local.keywords || {}) };
    }
    return local;
  },

  saveProfile: function(prof) {
    try {
      localStorage.setItem('sq_ai_interest_profile_v18', JSON.stringify(prof));
    } catch (e) {}
    if (AppState.currentUser) {
      db.collection("safaqat_users").doc(AppState.currentUser.uid).update({
        aiInterests: {
          cats: prof.cats || {},
          authors: prof.authors || {},
          keywords: prof.keywords || {},
          viewedBooks: (prof.viewedBooks || []).slice(0, 25)
        }
      }).catch(() => {});
    }
  },

  trackSignal: function(type, payload, weight = 2) {
    const prof = this.getProfile();
    if (!prof.cats) prof.cats = {};
    if (!prof.authors) prof.authors = {};
    if (!prof.keywords) prof.keywords = {};
    if (!prof.viewedBooks) prof.viewedBooks = [];

    if (type === 'book' && payload) {
      if (payload.category) prof.cats[payload.category] = (prof.cats[payload.category] || 0) + weight;
      const authKey = payload.authorUid || payload.authorName || '';
      if (authKey) prof.authors[authKey] = (prof.authors[authKey] || 0) + weight;
      if (payload.id && !prof.viewedBooks.includes(payload.id)) {
        prof.viewedBooks.unshift(payload.id);
        prof.viewedBooks = prof.viewedBooks.slice(0, 30);
      }
      const words = ((payload.title || '') + ' ' + (payload.desc || '')).split(/\s+/).filter(w => w.length > 3).slice(0, 12);
      words.forEach(w => { prof.keywords[w] = (prof.keywords[w] || 0) + 1; });
    } else if (type === 'category' && payload) {
      prof.cats[payload] = (prof.cats[payload] || 0) + weight;
    } else if (type === 'search' && payload) {
      const words = String(payload).trim().split(/\s+/).filter(w => w.length > 2);
      words.forEach(w => { prof.keywords[w] = (prof.keywords[w] || 0) + weight; });
    }
    this.saveProfile(prof);
  },

  scoreBookForUser: function(book, searchQuery = '') {
    const prof = this.getProfile();
    const st = window.sqGetBookStats ? window.sqGetBookStats(book) : { avgRating: 5, salesCount: 0, readersCount: 0 };
    let score = 0;

    if (book.category && prof.cats[book.category]) score += prof.cats[book.category] * 6;
    const authKey = book.authorUid || book.authorName || '';
    if (authKey && prof.authors[authKey]) score += prof.authors[authKey] * 8;
    if (book.authorUid && (AppState.userData.following || []).includes(book.authorUid)) score += 35;
    if (book.publisherUid && (AppState.userData.following || []).includes(book.publisherUid)) score += 25;

    const bookText = ((book.title || '') + ' ' + (book.desc || '') + ' ' + (book.authorName || '') + ' ' + (book.publisherName || '')).toLowerCase();
    Object.keys(prof.keywords || {}).forEach(kw => {
      if (kw.length > 2 && bookText.includes(kw.toLowerCase())) {
        score += Math.min(20, (prof.keywords[kw] || 1) * 3);
      }
    });

    if (book.isFeatured) score += 28;
    if (book.isBestSeller) score += 22;
    score += (st.salesCount * 2.5) + (st.readersCount * 1.5) + (parseFloat(st.avgRating || 5) * 4);

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const qWords = q.split(/\s+/).filter(Boolean);
      let matchPoints = 0;
      if ((book.title || '').toLowerCase().includes(q)) matchPoints += 120;
      if ((book.authorName || '').toLowerCase().includes(q)) matchPoints += 90;
      if ((book.publisherName || '').toLowerCase().includes(q)) matchPoints += 70;
      qWords.forEach(w => {
        if ((book.title || '').toLowerCase().includes(w)) matchPoints += 45;
        if ((book.authorName || '').toLowerCase().includes(w)) matchPoints += 35;
        if ((book.desc || '').toLowerCase().includes(w)) matchPoints += 15;
      });
      if (matchPoints === 0) return -9999;
      score += matchPoints;
    }
    return score;
  },

  getSimilarBooks: function(currentBook, limit = 6) {
    if (!currentBook || !AppState.booksList.length) return [];
    const curWords = new Set(((currentBook.title || '') + ' ' + (currentBook.desc || '')).split(/\s+/).filter(w => w.length > 3));
    return AppState.booksList
      .filter(b => b.id !== currentBook.id)
      .map(b => {
        let simScore = this.scoreBookForUser(b) * 0.35;
        if (b.category && b.category === currentBook.category) simScore += 55;
        if ((b.authorUid && b.authorUid === currentBook.authorUid) || (b.authorName && b.authorName === currentBook.authorName)) simScore += 70;
        if (b.publisherUid && b.publisherUid === currentBook.publisherUid) simScore += 30;
        const bText = (b.title || '') + ' ' + (b.desc || '');
        curWords.forEach(w => { if (bText.includes(w)) simScore += 8; });
        return { book: b, _sim: simScore };
      })
      .sort((a, b) => b._sim - a._sim)
      .slice(0, limit)
      .map(x => x.book);
  }
};

// =========================================================
// 🛠️ دوال المساعدة الأساسية وتحويل روابط Google Drive للتحميل المباشر
// =========================================================
window.sqHasPermission = function(permKey) {
  if (!AppState.currentUser) return false;
  if (AppState.isAdmin) return true;
  if (permKey === 'manage_books' && AppState.userData && AppState.userData.isPublisher) return true;
  if (permKey === 'manage_orders' && AppState.userData && AppState.userData.isPublisher) return true;
  return (AppState.userData.permissions || []).includes(permKey);
};

window.sqIsStaffMember = function() {
  if (!AppState.currentUser) return false;
  if (AppState.isAdmin) return true;
  if (AppState.userData && AppState.userData.isPublisher) return true;
  return (AppState.userData.permissions || []).length > 0;
};

// تحويل أي رابط مشاركة من Google Drive إلى رابط تحميل مباشر فوري
window.sqFormatGoogleDriveDownloadUrl = function(rawUrl) {
  if (!rawUrl) return '';
  const url = String(rawUrl).trim();
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
  }
  return url;
};

function decodeEntities(str) {
  if (!str) return '';
  const txt = document.createElement('textarea');
  let cleaned = String(str)
    .replace(/&amp;#(\d+);/g, (m, d) => String.fromCharCode(d))
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d))
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\uFE0F/g, '');
  txt.innerHTML = cleaned;
  return txt.value;
}

function escapeHtml(str) {
  const raw = decodeEntities(str);
  return String(raw).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getRealName(uid, embeddedFallback) {
  if (uid === 'DAR_MAIN') return APP_NAME;
  const u = AppState.allUsers[uid];
  if (u && u.customName && u.customName.trim() !== '') return decodeEntities(u.customName);
  if (u && u.displayName && u.displayName.trim() !== '') return decodeEntities(u.displayName);
  if (embeddedFallback && embeddedFallback.trim() !== '' && embeddedFallback !== 'عضو في المجتمع') return decodeEntities(embeddedFallback);
  return 'قارئ في صفقات';
}

function getRealPhoto(uid, embeddedPhotoFallback) {
  if (uid === 'DAR_MAIN') return APP_LOGO_URL;
  const u = AppState.allUsers[uid];
  if (u && u.photoURL && u.photoURL.trim() !== '') return u.photoURL;
  if (embeddedPhotoFallback && embeddedPhotoFallback.trim() !== '') return embeddedPhotoFallback;
  return DEFAULT_PIC;
}

function sqIsAdminUid(uid) {
  if (!uid) return false;
  if (uid === 'DAR_MAIN') return true;
  const u = AppState.allUsers[uid] || {};
  return Boolean(u.isAdminUser || ADMINS.includes(u.email) || ADMINS.includes(uid));
}

function sqFormatRelativeTime(ts) {
  if (!ts) return 'الآن';
  const ms = ts.toDate ? ts.toDate().getTime() : (typeof ts === 'number' ? ts : Date.now());
  const diffSec = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'الآن';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return min === 1 ? 'قبل دقيقة' : min === 2 ? 'قبل دقيقتين' : `قبل ${min} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? 'قبل ساعة' : hr === 2 ? 'قبل ساعتين' : `قبل ${hr} س`;
  const day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? 'أمس' : day === 2 ? 'قبل يومين' : `قبل ${day} يوم`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return mon === 1 ? 'قبل شهر' : `قبل ${mon} شهر`;
  const yr = Math.floor(mon / 12);
  return yr === 1 ? 'قبل سنة' : `قبل ${yr} سنوات`;
}

function sqFormatExactTime(ts) {
  if (!ts) return 'الآن';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) + ' — ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

window.sqShowToast = function(message, type = 'success') {
  const container = document.getElementById('sq-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const icon = type === 'success'
    ? '<i class="fa-solid fa-circle-check" style="color:var(--success);"></i>'
    : type === 'danger'
      ? '<i class="fa-solid fa-circle-exclamation" style="color:var(--danger);"></i>'
      : '<i class="fa-solid fa-bell" style="color:var(--warning);"></i>';
  toast.className = 'sq-toast';
  toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 250); }, 3200);
};

window.sqCompressAndUploadToImgBB = async function(file, maxW = 960, quality = 0.78) {
  const compressedBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
  const formData = new FormData();
  formData.append('image', compressedBase64.split(',')[1]);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
  const result = await response.json();
  if (result && result.success && result.data && result.data.url) return result.data.url;
  throw new Error('Upload Failed');
};
