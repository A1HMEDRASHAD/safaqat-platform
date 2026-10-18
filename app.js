/* =========================================================
   المحرك البرمجي الشامل لمنصة ومتجر صفقات كتابية — الإصدار 1.8
   File: app.js (الجزء 1 من 3)
   يشمل: الربط الآمن بقاعدة البيانات، الذكاء الاصطناعي الخفي، التوجيه والفهرسة،
         فقاعات التوثيق الملونة، وشريط الأحداث والمعارض التلقائي (16:9)
   ========================================================= */

// 1. ضمان تحميل الإعدادات والاتصال بقاعدة البيانات (Firebase) بدون أي تعارض
if (!window.SQ_CONFIG_LOADED) {
  window.SQ_CONFIG_LOADED = true;
  window.APP_VERSION = "1.8";
  window.APP_NAME = "صفقات كتابية";
  window.APP_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg68URzujuETQYMt1CLBY8R6t_oYn1obpsfvDOQLmQ_da-30Qn1393-kgrUJ4nBzeLlcyQKHsALCDO5HzKzqAtSxe6jHdIdQxCuYzQ1COqydA-vKaMRgtxa2TzZtbGF-cldsRxCTQ4EtlhT6OzxrTcbWWZ9OeyZHGH5-EppJ-mNkAWRhMpaBOfNynVDqGkx/s3000/58210.jpg";
  window.DAR_WHATSAPP_NUMBER = "+201016327947";
  window.DEFAULT_CURRENCY = "ر.س";
  window.CURRENT_DOMAIN_ORIGIN = window.location.origin;
  window.IMGBB_API_KEY = "Bac3eeb4c41bcfcb38f6ada28c50c825";

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
}

var APP_VERSION = window.APP_VERSION || "1.8";
var APP_NAME = window.APP_NAME || "صفقات كتابية";
var APP_LOGO_URL = window.APP_LOGO_URL || "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg68URzujuETQYMt1CLBY8R6t_oYn1obpsfvDOQLmQ_da-30Qn1393-kgrUJ4nBzeLlcyQKHsALCDO5HzKzqAtSxe6jHdIdQxCuYzQ1COqydA-vKaMRgtxa2TzZtbGF-cldsRxCTQ4EtlhT6OzxrTcbWWZ9OeyZHGH5-EppJ-mNkAWRhMpaBOfNynVDqGkx/s3000/58210.jpg";
var DAR_WHATSAPP_NUMBER = window.DAR_WHATSAPP_NUMBER || "+201016327947";
var DEFAULT_CURRENCY = window.DEFAULT_CURRENCY || "ر.س";
var CURRENT_DOMAIN_ORIGIN = window.location.origin;
var IMGBB_API_KEY = window.IMGBB_API_KEY || "Bac3eeb4c41bcfcb38f6ada28c50c825";

var auth = firebase.auth();
var db = firebase.firestore();
try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {}); } catch (e) {}

var ADMINS = ['safaqatkitabiya@gmail.com', 'rawialshamal@gmail.com'];
var DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
var ANON_PIC = "https://cdn-icons-png.flaticon.com/512/2829/2829835.png";

var POST_CATEGORIES = {
  literature: { label: 'خاطرة / نص أدبي', icon: 'fa-feather-pointed' },
  quote:      { label: 'اقتباس من كتاب', icon: 'fa-quote-right' },
  review:     { label: 'مراجعة كتاب', icon: 'fa-star' },
  article:    { label: 'مقال ثقافي', icon: 'fa-newspaper' },
  discussion: { label: 'تساؤل ونقاش', icon: 'fa-comments' }
};

var DEFAULT_BOOK_CATEGORIES = {
  dar_exclusives: { label: 'إصدارات الدار', icon: 'fa-crown' },
  novels:         { label: 'روايات وسرد', icon: 'fa-book-open' },
  fantasy:        { label: 'فانتازيا وخيال', icon: 'fa-wand-magic-sparkles' },
  stories:        { label: 'قصص قصيرة', icon: 'fa-feather' },
  thought:        { label: 'فكر وفلسفة', icon: 'fa-brain' },
  history:        { label: 'تاريخ وسير', icon: 'fa-landmark' },
  poetry:         { label: 'شعر وخواطر', icon: 'fa-scroll' },
  self_dev:       { label: 'تطوير الذات', icon: 'fa-seedling' }
};

var STAFF_PERMISSIONS_MAP = {
  manage_books:   { label: 'إدارة المكتبة والكتب', desc: 'رفع وتعديل الكتب، ربط الكُتّاب ودور النشر، وإضافة الأقسام', icon: 'fa-book' },
  manage_orders:  { label: 'إدارة المبيعات والفواتير', desc: 'البحث برقم الطلب (SK) وتحديث مراحل الشحن والتسليم', icon: 'fa-file-invoice-dollar' },
  manage_mod:     { label: 'الإشراف والرقابة', desc: 'مراجعة البلاغات، حذف المخالفات، وتقييد الحسابات', icon: 'fa-shield-halved' },
  manage_support: { label: 'خدمة العملاء والدعم', desc: 'استقبال تذاكر الدعم الفني والرد المباشر على الأعضاء', icon: 'fa-headset' },
  manage_ads:     { label: 'إدارة الأحداث والمعارض', desc: 'إضافة وتعديل المعارض والأحداث في الشريط التلقائي العلوي', icon: 'fa-calendar-star' }
};

var ORDER_STATUS_MAP = {
  pending_review: { label: 'تمت المراجعة', color: '#f59e0b', icon: 'fa-file-circle-check', step: 1 },
  contacted:      { label: 'تم التواصل', color: '#0284c7', icon: 'fa-phone-volume', step: 2 },
  processing:     { label: 'تأكيد وتجهيز الطلب', color: '#8b5cf6', icon: 'fa-box-open', step: 3 },
  shipped:        { label: 'تم الشحن', color: '#10b981', icon: 'fa-truck-fast', step: 4 },
  completed:      { label: 'تم التسليم', color: '#059669', icon: 'fa-circle-check', step: 5 },
  cancelled:      { label: 'طلب ملغي', color: '#ef4444', icon: 'fa-ban', step: 0 }
};

var COUNTRIES_MAP = {
  '': { name: 'غير محدد' }, 'YE': { name: 'اليمن' }, 'SA': { name: 'السعودية' },
  'EG': { name: 'مصر' }, 'AE': { name: 'الإمارات' }, 'KW': { name: 'الكويت' },
  'QA': { name: 'قطر' }, 'OM': { name: 'عُمان' }, 'BH': { name: 'البحرين' },
  'IQ': { name: 'العراق' }, 'SY': { name: 'سوريا' }, 'JO': { name: 'الأردن' },
  'PS': { name: 'فلسطين' }, 'LB': { name: 'لبنان' }, 'SD': { name: 'السودان' },
  'LY': { name: 'ليبيا' }, 'TN': { name: 'تونس' }, 'DZ': { name: 'الجزائر' },
  'MA': { name: 'المغرب' }, 'MR': { name: 'موريتانيا' }, 'TR': { name: 'تركيا' },
  'OTHER': { name: 'دولي' }
};

var STORY_GRADIENTS = {
  royal:   'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  emerald: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
  crimson: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
  purple:  'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)',
  gold:    'linear-gradient(135deg, #78350f 0%, #451a03 100%)'
};

window.AppState = window.AppState || {
  currentUser: null, isAdmin: false,
  userData: {
    following: [], blockedUsers: [], bookmarks: [], savedBooks: [],
    readingShelf: {}, currentlyReadingBookId: '', permissions: [],
    linkedPublishers: [], publisherWhatsapp: '',
    aiInterests: { cats: {}, authors: {}, keywords: {}, viewedBooks: [] },
    theme: 'auto', customName: '', bio: '', statusText: '', nationality: '', birthday: '',
    showOnline: true, fontSize: '16.5px',
    isMuted: false, isBanned: false, isAuthor: false, isPublisher: false,
    agreedToTerms: false, joinedAt: 0, lastActive: 0
  },
  allUsers: {}, posts: [], booksList: [], customBookCategories: {},
  eventsList: [], activeEventIdx: 0, eventsTimer: null, viewingEventId: null, editingEventId: null, pendingEventThumb: '',
  storiesList: [], groupedStories: {}, activeStoryUid: null, activeStoryIdx: 0, storyTimer: null,
  notificationsList: [], ticketsList: [], ordersList: [],
  cart: [], lastIssuedOrder: null, deferredPwaPrompt: null,
  activeMainView: 'store', previousView: 'store', savedScrollPosition: 0,
  viewingPostId: null, viewingBookId: null, viewedProfileUid: null, activeProfileTab: 'posts',
  currentFilter: 'for_you', activeCategoryFilter: null, searchQuery: '',
  librarySort: 'smart', activeBookCatFilter: 'all', librarySearchQuery: '',
  renderedPostSignature: '', collapsedThreads: new Set(),
  presenceInterval: null, userDocUnsubscribe: null, feedUnsubscribe: null,
  booksUnsubscribe: null, storiesUnsubscribe: null, eventsUnsubscribe: null,
  notifUnsubscribe: null, ticketsUnsubscribe: null, ordersUnsubscribe: null,
  editingPostId: null, linkedBookForPost: null, postLimit: 30,
  editingBookId: null, selectedAuthorUidForBook: '', selectedPublisherUidForBook: 'DAR_MAIN',
  pendingBookCover: '', showDownloadConfirmForBook: false,
  adminCurrentTab: 'help', settingsSubTab: 'identity', activeLegalPage: 'about',
  sharingPostId: null, shareCardTheme: 'royal',
  pendingPostImages: [], isUploadingImage: false, pendingStoryImg: '',
  promptCallback: null, deepLinkHandled: false
};

// =========================================================
// 🧠 محرك الذكاء الاصطناعي الخفي (Safaqat Silent AI Affinity Engine)
// =========================================================
window.SafaqatAI = window.SafaqatAI || {
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
    try { localStorage.setItem('sq_ai_interest_profile_v18', JSON.stringify(prof)); } catch (e) {}
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
// 🛠️ دوال المساعدة الأساسية، الصلاحيات، وتحويل روابط Google Drive
// =========================================================
window.sqHasPermission = function(permKey) {
  if (!AppState.currentUser) return false;
  if (AppState.isAdmin) return true;
  if ((permKey === 'manage_books' || permKey === 'manage_orders' || permKey === 'manage_ads') && AppState.userData && AppState.userData.isPublisher) return true;
  return (AppState.userData.permissions || []).includes(permKey);
};

window.sqIsStaffMember = function() {
  if (!AppState.currentUser) return false;
  if (AppState.isAdmin) return true;
  if (AppState.userData && AppState.userData.isPublisher) return true;
  return (AppState.userData.permissions || []).length > 0;
};

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
  if (!uid || uid === 'DAR_MAIN') return APP_NAME;
  const u = AppState.allUsers[uid];
  if (u && u.customName && u.customName.trim() !== '') return decodeEntities(u.customName);
  if (u && u.displayName && u.displayName.trim() !== '') return decodeEntities(u.displayName);
  if (embeddedFallback && embeddedFallback.trim() !== '' && embeddedFallback !== 'عضو في المجتمع') return decodeEntities(embeddedFallback);
  return 'عضو في صفقات';
}

function getRealPhoto(uid, embeddedPhotoFallback) {
  if (!uid || uid === 'DAR_MAIN') return APP_LOGO_URL;
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
        let w = img.width; let h = img.height;
        if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
        canvas.width = w; canvas.height = h;
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

// =========================================================
// 🔴🟡🔵 نظام فقاعات التوثيق الملونة (الإصدار 1.8)
// أحمر للإدارة والدار، ذهبي لدور النشر، أزرق للكُتّاب والمؤلفين، لا شيء للعاديين
// =========================================================
window.sqGetVerificationBubble = function(uid, isAnon = false, isAdminOverride = false) {
  if (isAnon || !uid) return '';
  if (uid === 'DAR_MAIN' || isAdminOverride || sqIsAdminUid(uid)) {
    return `<span class="sq-vbadge admin" title="الحساب الرسمي للإدارة والدار"><i class="fa-solid fa-check"></i></span>`;
  }
  const u = AppState.allUsers[uid] || {};
  if (u.isPublisher) {
    return `<span class="sq-vbadge publisher" title="دار نشر معتمدة"><i class="fa-solid fa-check"></i></span>`;
  }
  if (u.isAuthor) {
    return `<span class="sq-vbadge author" title="كاتب ومؤلف معتمد"><i class="fa-solid fa-check"></i></span>`;
  }
  return '';
};

window.getUserBadges = function(uid, isAnon = false, isAdminPost = false, showRoleTag = true) {
  if (isAnon || !uid) return '';
  const bubble = window.sqGetVerificationBubble(uid, isAnon, isAdminPost);
  if (!showRoleTag) return bubble;

  const u = AppState.allUsers[uid] || {};
  let tag = '';
  if (uid === 'DAR_MAIN' || isAdminPost || sqIsAdminUid(uid)) {
    tag = `<span class="sq-role-tag admin">الإدارة</span>`;
  } else if (u.isPublisher) {
    tag = `<span class="sq-role-tag publisher">دار نشر</span>`;
  } else if (u.isAuthor) {
    tag = `<span class="sq-role-tag author">كاتب</span>`;
  }
  return `${bubble} ${tag}`.trim();
};

// =========================================================
// 🌐 محرك التوجيه والصفحات المستقلة (Zero-Popup Router) + فهرسة جوجل
// =========================================================
window.sqUpdateDynamicSEO = function(title, desc, imageUrl, isPrivate = false, schemaObj = null) {
  const fullTitle = title ? `${decodeEntities(title)} | ${APP_NAME}` : `${APP_NAME} — المتجر الرسمي للكتب والمجتمع الأدبي`;
  const cleanDesc = desc ? decodeEntities(desc).replace(/https?:\/\/[^\s]+/g, '').substring(0, 160).trim() : `متجر ومجتمع ${APP_NAME} — تصفح أحدث الإصدارات والكتب ودور النشر.`;
  const img = imageUrl || APP_LOGO_URL;

  document.title = fullTitle;
  const descEl = document.getElementById('sq-dyn-desc'); if (descEl) descEl.setAttribute('content', cleanDesc);
  const ogTitle = document.getElementById('sq-og-title'); if (ogTitle) ogTitle.setAttribute('content', fullTitle);
  const ogDesc = document.getElementById('sq-og-desc'); if (ogDesc) ogDesc.setAttribute('content', cleanDesc);
  const ogImg = document.getElementById('sq-og-image'); if (ogImg) ogImg.setAttribute('content', img);

  const robotsEl = document.getElementById('sq-dyn-robots');
  if (robotsEl) {
    robotsEl.setAttribute('content', isPrivate ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
  }

  const ldEl = document.getElementById('sq-json-ld');
  if (ldEl) {
    const defaultSchema = {
      "@context": "https://schema.org",
      "@type": "BookStore",
      "name": APP_NAME,
      "url": CURRENT_DOMAIN_ORIGIN,
      "description": cleanDesc
    };
    ldEl.textContent = JSON.stringify(schemaObj || defaultSchema);
  }
};

window.sqSwitchMainView = function(viewName, restoreScroll = false, fromPopState = false) {
  // توحيد الاختصارات في حال استدعيت من أزرار مختلفة
  if (viewName === 'publish') { window.sqHandleDockPublish(); return; }
  if (viewName === 'cart') viewName = 'cart_page';
  if (viewName === 'profile') {
    if (!AppState.viewedProfileUid && AppState.currentUser) AppState.viewedProfileUid = AppState.currentUser.uid;
    viewName = 'profile_page';
  }

  const privateViews = ['settings_page', 'publish_chooser', 'publish_post', 'publish_book', 'publish_event', 'cart_page', 'prompt_page'];
  if ((AppState.activeMainView === 'store' || AppState.activeMainView === 'community') && viewName !== AppState.activeMainView) {
    AppState.savedScrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
  }
  if (AppState.activeMainView !== viewName && viewName !== 'prompt_page' && viewName !== 'image_viewer') {
    AppState.previousView = AppState.activeMainView;
  }
  if (AppState.activeMainView === 'story_viewer' && viewName !== 'story_viewer') {
    clearTimeout(AppState.storyTimer);
  }

  AppState.activeMainView = viewName;

  if (!fromPopState && window.history && window.history.pushState) {
    let newUrl = window.location.pathname;
    if (viewName === 'single_post' && AppState.viewingPostId) newUrl += `?post=${AppState.viewingPostId}`;
    else if (viewName === 'book_detail' && AppState.viewingBookId) newUrl += `?book=${AppState.viewingBookId}`;
    else if (viewName === 'event_detail' && AppState.viewingEventId) newUrl += `?event=${AppState.viewingEventId}`;
    else if (viewName === 'profile_page' && AppState.viewedProfileUid) newUrl += `?profile=${AppState.viewedProfileUid}`;
    else if (viewName === 'community') newUrl += `?view=community`;
    else if (viewName === 'legal_page') newUrl += `?page=${AppState.activeLegalPage || 'about'}`;
    window.history.pushState({
      sqView: viewName,
      postId: AppState.viewingPostId,
      bookId: AppState.viewingBookId,
      eventId: AppState.viewingEventId,
      profileUid: AppState.viewedProfileUid
    }, "", newUrl);
  }

  const viewMap = {
    store: 'sq-view-store',
    event_detail: 'sq-view-event-detail',
    publish_event: 'sq-view-publish-event',
    community: 'sq-view-community',
    publish_chooser: 'sq-view-publish-chooser',
    publish_post: 'sq-view-publish-post',
    publish_book: 'sq-view-publish-book',
    book_detail: 'sq-view-book-detail',
    cart_page: 'sq-view-cart-page',
    single_post: 'sq-view-single-post',
    story_publish: 'sq-view-story-publish',
    story_viewer: 'sq-view-story-viewer',
    profile_page: 'sq-view-profile',
    settings_page: 'sq-view-settings-page',
    legal_page: 'sq-view-legal-page',
    share_page: 'sq-view-share-page',
    users_list: 'sq-view-users-list',
    image_viewer: 'sq-view-image-viewer',
    prompt_page: 'sq-view-prompt-page'
  };

  Object.keys(viewMap).forEach(k => {
    const el = document.getElementById(viewMap[k]);
    if (el) {
      if (k === viewName) {
        el.style.display = 'block';
        el.classList.add('active-view');
      } else {
        el.style.display = 'none';
        el.classList.remove('active-view');
      }
    }
  });

  const dock = document.getElementById('sq-bottom-dock');
  if (dock) dock.classList.toggle('dock-hidden', viewName === 'story_viewer');

  document.querySelectorAll('.sq-dock-btn').forEach(b => b.classList.remove('active'));
  if (viewName === 'store' || viewName === 'book_detail' || viewName === 'publish_book' || viewName === 'event_detail' || viewName === 'publish_event') {
    document.getElementById('dock-store')?.classList.add('active');
    if (viewName === 'store') window.sqRenderLibrarySection();
  } else if (viewName === 'community' || viewName === 'single_post' || viewName === 'publish_post') {
    document.getElementById('dock-community')?.classList.add('active');
    if (viewName === 'community') { window.sqRenderStoriesBar(); window.sqRenderFeed(false); }
  } else if (viewName === 'cart_page') {
    document.getElementById('dock-cart')?.classList.add('active');
    window.sqRenderCartPage();
  } else if (viewName === 'profile_page' || viewName === 'settings_page') {
    document.getElementById('dock-profile')?.classList.add('active');
  }

  if (privateViews.includes(viewName)) {
    window.sqUpdateDynamicSEO('إعدادات وطلبات خاصة', '', APP_LOGO_URL, true);
  } else if (viewName === 'store') {
    window.sqUpdateDynamicSEO('المتجر والمكتبة الرسمية', 'تصفح واطلب أحدث الكتب والروايات في متجر ' + APP_NAME, APP_LOGO_URL, false);
  } else if (viewName === 'community') {
    window.sqUpdateDynamicSEO('المجتمع الأدبي والاقتباسات', 'شارك خواطرك، مقالاتك، ومراجعات الكتب في مجتمع ' + APP_NAME, APP_LOGO_URL, false);
  }

  if ((viewName === 'store' || viewName === 'community') && restoreScroll) {
    setTimeout(() => window.scrollTo(0, AppState.savedScrollPosition || 0), 15);
  } else {
    window.scrollTo(0, 0);
  }
};

window.sqGoBackView = function() {
  const target = AppState.previousView || 'store';
  window.sqSwitchMainView(target, target === 'store' || target === 'community');
};

window.addEventListener('popstate', function(e) {
  if (e.state && e.state.sqView) {
    if (e.state.postId) AppState.viewingPostId = e.state.postId;
    if (e.state.bookId) AppState.viewingBookId = e.state.bookId;
    if (e.state.eventId) AppState.viewingEventId = e.state.eventId;
    if (e.state.profileUid) AppState.viewedProfileUid = e.state.profileUid;
    window.sqSwitchMainView(e.state.sqView, true, true);
    if (e.state.sqView === 'single_post') window.sqRenderSinglePostView();
    if (e.state.sqView === 'book_detail') window.sqRenderBookDetailView();
    if (e.state.sqView === 'event_detail') window.sqRenderEventDetailView();
    if (e.state.sqView === 'profile_page') window.sqRenderProfilePage();
    return;
  }
  if (AppState.activeMainView !== 'store') {
    window.sqSwitchMainView('store', true, true);
  }
});

// بوابة النشر الموحدة عند الضغط على زر (+) في الشريط السفلي
window.sqHandleDockPublish = function() {
  if (!AppState.currentUser) {
    sqShowToast("سجل دخولك أولاً للمشاركة والنشر", "warning");
    return window.sqLogin();
  }
  if (AppState.userData.isMuted && !AppState.isAdmin) {
    return sqShowToast("حسابك مقيد من النشر حالياً", "danger");
  }

  const canManageBooks = window.sqHasPermission('manage_books');
  const canManageEvents = window.sqHasPermission('manage_ads') || AppState.isAdmin;
  const body = document.getElementById('sq-chooser-cards-body');
  if (body) {
    let html = '';

    if (canManageBooks) {
      html += `
        <div class="sq-hub-card" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); color:#fff; border:1.5px solid var(--accent); margin-bottom:0;" onclick="window.sqOpenBookStudio(null)">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:50px; height:50px; border-radius:16px; background:rgba(212,175,55,0.2); color:#fbbf24; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;"><i class="fa-solid fa-book-medical"></i></div>
            <div>
              <h3 style="font-size:15.5px; font-weight:900; color:#fbbf24;">رفع كتاب جديد إلى المتجر والمكتبة</h3>
              <p style="font-size:12px; color:#cbd5e1; margin-top:2px;">إضافة كتاب بمرونة كاملة، ربط الكاتب ودار النشر، أو إرفاق ملف Google Drive</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-left" style="color:#fbbf24;"></i>
        </div>
      `;
    }

    if (canManageEvents) {
      html += `
        <div class="sq-hub-card" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; border:1.5px solid var(--accent-border); margin-bottom:0;" onclick="window.sqOpenEventStudio(null)">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:50px; height:50px; border-radius:16px; background:rgba(239,68,68,0.12); color:var(--danger); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;"><i class="fa-solid fa-calendar-plus"></i></div>
            <div>
              <h3 style="font-size:15.5px; font-weight:900;">إضافة حدث أو معرض أو عرض ترويجي</h3>
              <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">يظهر في شريط الأحداث والمعارض التلقائي أعلى المتجر</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-left" style="color:var(--text-muted);"></i>
        </div>
      `;
    }

    html += `
      <div class="sq-hub-card" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; border:1.5px solid var(--accent); margin-bottom:0;" onclick="window.sqOpenPublishModal()">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:50px; height:50px; border-radius:16px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;"><i class="fa-solid fa-feather-pointed"></i></div>
          <div>
            <h3 style="font-size:15.5px; font-weight:900;">نشر مساهمة أدبية أو مقال أو مراجعة كتاب</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">شارك خاطرة، مقالاً ثقافياً، اقتباساً، أو مراجعة كتاب مع القراء</p>
          </div>
        </div>
        <i class="fa-solid fa-chevron-left" style="color:var(--text-muted);"></i>
      </div>

      <div class="sq-hub-card" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:0;" onclick="window.sqOpenStoryModal()">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:50px; height:50px; border-radius:16px; background:rgba(16,185,129,0.12); color:var(--success); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;"><i class="fa-solid fa-bolt"></i></div>
          <div>
            <h3 style="font-size:15.5px; font-weight:900;">نشر قصة يومية (24 ساعة)</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">تظهر لمتابعيك لمدة 24 ساعة بتصميم سينمائي</p>
          </div>
        </div>
        <i class="fa-solid fa-chevron-left" style="color:var(--text-muted);"></i>
      </div>
    `;
    body.innerHTML = html;
  }
  window.sqSwitchMainView('publish_chooser');
};

window.sqHandleDockProfile = function() {
  if (!AppState.currentUser) return window.sqLogin();
  window.sqViewProfile(AppState.currentUser.uid);
};

window.sqOpenLightbox = function(imgUrl) {
  if (!imgUrl) return;
  document.getElementById('sq-fullview-img').src = imgUrl;
  window.sqSwitchMainView('image_viewer');
};

window.sqOpenCustomPrompt = function(title, defaultVal, callback) {
  document.getElementById('sq-prompt-title').innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:var(--accent);"></i> ${escapeHtml(title)}`;
  const inp = document.getElementById('sq-prompt-input');
  inp.value = decodeEntities(defaultVal || '');
  AppState.promptCallback = callback;
  window.sqSwitchMainView('prompt_page');
  setTimeout(() => inp.focus(), 60);
};

window.sqConfirmCustomPrompt = function() {
  const val = document.getElementById('sq-prompt-input').value.trim();
  const cb = AppState.promptCallback;
  AppState.promptCallback = null;
  window.sqGoBackView();
  if (cb) cb(val);
};

// =========================================================
// 🎪 محرك شريط الأحداث والمعارض والعروض التلقائي (16:9 YouTube Thumbnail Style)
// =========================================================
window.sqListenEvents = function() {
  if (AppState.eventsUnsubscribe) AppState.eventsUnsubscribe();
  AppState.eventsUnsubscribe = db.collection("safaqat_ads").onSnapshot(snap => {
    AppState.eventsList = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (data.active !== false) {
        AppState.eventsList.push({ id: doc.id, ...data });
      }
    });
    AppState.eventsList.sort((a, b) => (b.time || 0) - (a.time || 0));
    window.sqRenderEventsCarousel();

    if (!AppState.deepLinkHandled) {
      const urlParams = new URLSearchParams(window.location.search);
      const targetEv = urlParams.get('event');
      if (targetEv && AppState.eventsList.some(e => e.id === targetEv)) {
        AppState.deepLinkHandled = true;
        window.sqOpenEventDetail(targetEv);
      }
    }

    if (AppState.activeMainView === 'settings_page' && AppState.settingsSubTab === 'admin' && AppState.adminCurrentTab === 'ads') {
      window.sqRenderAdminSubContent();
    }
  });
};

window.sqRenderEventsCarousel = function() {
  const sec = document.getElementById('sq-events-section');
  const track = document.getElementById('sq-events-track');
  const dotsBox = document.getElementById('sq-events-dots');
  const addBtn = document.getElementById('sq-add-event-top-btn');
  if (!sec || !track) return;

  const canManageEvents = window.sqHasPermission('manage_ads') || AppState.isAdmin;
  if (addBtn) addBtn.style.display = canManageEvents ? 'inline-flex' : 'none';

  if (!AppState.eventsList.length) {
    if (canManageEvents) {
      sec.style.display = 'block';
      if (dotsBox) dotsBox.innerHTML = '';
      track.innerHTML = `
        <div style="width:100%; background:var(--card); border:1.5px dashed var(--accent-border); border-radius:18px; padding:18px; text-align:center; color:var(--text-muted);">
          <i class="fa-solid fa-calendar-plus" style="font-size:22px; color:var(--accent); margin-bottom:6px;"></i>
          <div style="font-size:13px; font-weight:800; color:var(--text-main);">لا توجد أحداث أو معارض نشطة حالياً</div>
          <button class="sq-btn sq-btn-gold" style="margin-top:8px; padding:6px 14px!important; font-size:12px!important;" onclick="window.sqOpenEventStudio(null)"><i class="fa-solid fa-plus"></i> إضافة أول حدث أو معرض</button>
        </div>
      `;
    } else {
      sec.style.display = 'none';
    }
    return;
  }

  sec.style.display = 'block';
  const typeBadges = {
    exhibition: { label: 'معرض كتاب', icon: 'fa-landmark' },
    signing:    { label: 'حفل توقيع', icon: 'fa-pen-fancy' },
    offer:      { label: 'عرض خاص', icon: 'fa-tags' },
    event:      { label: 'فعالية ثقافية', icon: 'fa-calendar-check' }
  };

  track.innerHTML = AppState.eventsList.map((ev, idx) => {
    const tObj = typeBadges[ev.eventType || 'event'] || typeBadges.event;
    const thumb = ev.imageUrl || APP_LOGO_URL;
    return `
      <div class="sq-event-thumb-card" onclick="window.sqOpenEventDetail('${ev.id}')">
        <img src="${escapeHtml(thumb)}" alt="${escapeHtml(ev.title)}" loading="lazy">
        <span class="sq-event-badge-pill"><i class="fa-solid ${tObj.icon}"></i> ${tObj.label}</span>
        <div class="sq-event-thumb-overlay">
          <h3 style="font-size:16.5px; font-weight:900; color:#fff; margin-bottom:4px; line-height:1.35;">${escapeHtml(ev.title)}</h3>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; font-size:12px; color:#cbd5e1;">
            <span>
              ${ev.eventDate ? `<i class="fa-regular fa-calendar" style="color:#fbbf24;"></i> ${escapeHtml(ev.eventDate)} ` : ''}
              ${ev.eventLocation ? `• <i class="fa-solid fa-location-dot" style="color:#fbbf24;"></i> ${escapeHtml(ev.eventLocation)}` : (ev.description ? escapeHtml(ev.description).substring(0, 60) : '')}
            </span>
            <span style="background:#fbbf24; color:#0f172a; font-weight:900; font-size:11px; padding:3px 10px; border-radius:10px;">${escapeHtml(ev.ctaText || 'التفاصيل')} <i class="fa-solid fa-arrow-left"></i></span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (dotsBox) {
    dotsBox.innerHTML = AppState.eventsList.map((_, i) => `<span class="sq-event-dot ${i === 0 ? 'active' : ''}" id="evdot-${i}"></span>`).join('');
  }

  // التمرير التلقائي السلس للأحداث والمعارض (يميناً ويساراً)
  if (AppState.eventsTimer) clearInterval(AppState.eventsTimer);
  if (AppState.eventsList.length > 1) {
    AppState.activeEventIdx = 0;
    AppState.eventsTimer = setInterval(() => {
      if (AppState.activeMainView !== 'store') return;
      const tr = document.getElementById('sq-events-track');
      if (!tr || !tr.children.length) return;
      AppState.activeEventIdx = (AppState.activeEventIdx + 1) % AppState.eventsList.length;
      const targetCard = tr.children[AppState.activeEventIdx];
      if (targetCard) {
        tr.scrollTo({ left: targetCard.offsetLeft - 12, behavior: 'smooth' });
      }
      document.querySelectorAll('.sq-event-dot').forEach((d, idx) => d.classList.toggle('active', idx === AppState.activeEventIdx));
    }, 4800);
  }
};

window.sqOnEventsScroll = function(trackEl) {
  if (!trackEl || !trackEl.children.length) return;
  const cardW = trackEl.children[0].clientWidth || 300;
  const idx = Math.min(AppState.eventsList.length - 1, Math.max(0, Math.round(Math.abs(trackEl.scrollLeft) / cardW)));
  AppState.activeEventIdx = idx;
  document.querySelectorAll('.sq-event-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
};

window.sqOpenEventDetail = function(eventId) {
  const ev = AppState.eventsList.find(e => e.id === eventId);
  if (!ev) return;
  AppState.viewingEventId = eventId;
  db.collection("safaqat_ads").doc(eventId).update({ clicks: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
  window.sqSwitchMainView('event_detail');
  window.sqRenderEventDetailView();
};

window.sqRenderEventDetailView = function() {
  const container = document.getElementById('sq-view-event-detail');
  if (!container) return;
  const ev = AppState.eventsList.find(e => e.id === AppState.viewingEventId);
  if (!ev) {
    window.sqSwitchMainView('store');
    return;
  }

  const canEdit = window.sqHasPermission('manage_ads') || AppState.isAdmin;
  const linkedBook = ev.bookId ? AppState.booksList.find(b => b.id === ev.bookId) : null;

  window.sqUpdateDynamicSEO(ev.title, ev.description || 'حدث وفعالية في ' + APP_NAME, ev.imageUrl || APP_LOGO_URL, false);

  container.innerHTML = `
    <div class="sq-inpage-topbar">
      <div class="sq-inpage-title"><i class="fa-solid fa-calendar-star" style="color:var(--accent);"></i> تفاصيل الحدث والعرض</div>
      <div style="display:flex; gap:6px;">
        ${canEdit ? `<button class="sq-btn" style="padding:6px 12px!important; font-size:11.5px!important;" onclick="window.sqOpenEventStudio('${ev.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>` : ''}
        ${canEdit ? `<button class="sq-btn sq-btn-outline" style="padding:6px 11px!important; font-size:11.5px!important; color:var(--danger)!important;" onclick="window.sqDeleteEvent('${ev.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
        <button class="sq-back-pill" onclick="window.sqSwitchMainView('store', true)"><i class="fa-solid fa-arrow-left"></i> المتجر</button>
      </div>
    </div>

    <div class="sq-hub-card" style="padding:0; overflow:hidden;">
      <div style="width:100%; aspect-ratio:16/9; background:#0f172a; position:relative;">
        <img src="${escapeHtml(ev.imageUrl || APP_LOGO_URL)}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.sqOpenLightbox('${escapeHtml(ev.imageUrl || APP_LOGO_URL)}')">
      </div>
      <div style="padding:20px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
          ${ev.eventDate ? `<span class="sq-status-pill"><i class="fa-regular fa-calendar" style="color:var(--accent);"></i> التاريخ: <strong>${escapeHtml(ev.eventDate)}</strong></span>` : ''}
          ${ev.eventLocation ? `<span class="sq-status-pill"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> المكان: <strong>${escapeHtml(ev.eventLocation)}</strong></span>` : ''}
          <span class="sq-status-pill"><i class="fa-regular fa-eye" style="color:var(--accent);"></i> المشاهدات: <strong>${ev.clicks || 1}</strong></span>
        </div>
        <h1 style="font-size:21px; font-weight:900; margin-bottom:10px; color:var(--text-main);">${escapeHtml(ev.title)}</h1>
        <p style="font-size:15px; line-height:1.9; color:var(--text-main); white-space:pre-wrap; margin-bottom:16px;">${escapeHtml(ev.description || 'لا توجد تفاصيل إضافية.')}</p>

        ${linkedBook ? `
          <div class="sq-attached-book-pill" onclick="window.sqOpenBookDetail('${linkedBook.id}')" style="margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${escapeHtml(linkedBook.cover || APP_LOGO_URL)}" style="width:44px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--accent);">
              <div>
                <div style="font-size:14px; font-weight:900; color:var(--text-main);">${escapeHtml(linkedBook.title)}</div>
                <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(linkedBook.authorName || '')} — <strong style="color:var(--accent);">${linkedBook.price ? linkedBook.price + ' ' + (linkedBook.currency || DEFAULT_CURRENCY) : 'متاح للتحميل'}</strong></div>
              </div>
            </div>
            <span class="sq-btn sq-btn-gold" style="padding:6px 12px!important; font-size:11.5px!important;">تصفح الكتاب</span>
          </div>
        ` : ''}

        ${ev.targetUrl ? `
          <a href="${escapeHtml(ev.targetUrl)}" target="_blank" class="sq-btn sq-btn-gold" style="width:100%; padding:12px!important; font-size:14px!important;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> ${escapeHtml(ev.ctaText || 'الانتقال إلى رابط الحدث أو العرض')}
          </a>
        ` : (linkedBook ? `
          <button class="sq-btn sq-btn-gold" style="width:100%; padding:12px!important; font-size:14px!important;" onclick="window.sqOpenBookDetail('${linkedBook.id}')">
            <i class="fa-solid fa-book-open"></i> ${escapeHtml(ev.ctaText || 'فتح صفحة الكتاب الآن')}
          </button>
        ` : '')}
      </div>
    </div>
  `;
};

window.sqOpenEventStudio = function(eventId = null) {
  if (!window.sqHasPermission('manage_ads') && !AppState.isAdmin) return;
  AppState.editingEventId = eventId;
  const ev = eventId ? AppState.eventsList.find(e => e.id === eventId) : null;
  AppState.pendingEventThumb = ev ? (ev.imageUrl || '') : '';

  document.getElementById('sq-event-studio-title').innerHTML = ev
    ? `<i class="fa-solid fa-pen-to-square" style="color:var(--accent);"></i> تعديل الحدث أو المعرض`
    : `<i class="fa-solid fa-calendar-plus" style="color:var(--accent);"></i> إضافة حدث أو معرض أو عرض جديد`;

  const booksOptions = `<option value="">-- بدون ربط بكتاب محدد --</option>` + AppState.booksList.map(b => `<option value="${b.id}" ${ev && ev.bookId === b.id ? 'selected' : ''}>${escapeHtml(b.title)}</option>`).join('');

  const form = document.getElementById('sq-event-studio-form');
  form.innerHTML = `
    <div class="sq-upload-zone" style="margin-bottom:14px;">
      <label for="ev-thumb-file" style="cursor:pointer; display:block;">
        <img id="ev-thumb-prev" src="${escapeHtml(AppState.pendingEventThumb || APP_LOGO_URL)}" style="width:100%; max-width:280px; aspect-ratio:16/9; object-fit:cover; border-radius:14px; border:2px solid var(--accent); margin:0 auto 8px auto; display:block;">
        <div id="ev-thumb-status" style="font-size:12.5px; font-weight:800; color:var(--text-main);"><i class="fa-solid fa-camera" style="color:var(--accent);"></i> اضغط لرفع الصورة المصغرة للحدث (بأسلوب يوتيوب 16:9)</div>
      </label>
      <input type="file" id="ev-thumb-file" accept="image/*" style="display:none;" onchange="window.sqHandleEventThumbUpload(this)">
    </div>

    <label class="sq-field-label"><i class="fa-solid fa-heading"></i> عنوان الحدث أو المعرض أو العرض (إلزامي):</label>
    <input type="text" id="ev-in-title" class="sq-input" value="${escapeHtml(ev ? ev.title : '')}" placeholder="مثال: جناح صفقات كتابية في معرض الرياض الدولي للكتاب">

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      <div>
        <label class="sq-field-label"><i class="fa-solid fa-tags"></i> نوع الحدث:</label>
        <select id="ev-in-type" class="sq-select">
          <option value="exhibition" ${ev && ev.eventType === 'exhibition' ? 'selected' : ''}>معرض كتاب</option>
          <option value="signing" ${ev && ev.eventType === 'signing' ? 'selected' : ''}>حفل توقيع</option>
          <option value="offer" ${ev && ev.eventType === 'offer' ? 'selected' : ''}>عرض وخصم خاص</option>
          <option value="event" ${ev && ev.eventType === 'event' ? 'selected' : ''}>فعالية ثقافية</option>
        </select>
      </div>
      <div>
        <label class="sq-field-label"><i class="fa-solid fa-hand-pointer"></i> نص زر الانتقال:</label>
        <input type="text" id="ev-in-cta" class="sq-input" value="${escapeHtml(ev && ev.ctaText ? ev.ctaText : 'استكشف التفاصيل')}">
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      <div>
        <label class="sq-field-label"><i class="fa-regular fa-calendar"></i> التاريخ أو المدة (اختياري):</label>
        <input type="text" id="ev-in-date" class="sq-input" value="${escapeHtml(ev && ev.eventDate ? ev.eventDate : '')}" placeholder="مثال: 15 - 25 أكتوبر">
      </div>
      <div>
        <label class="sq-field-label"><i class="fa-solid fa-location-dot"></i> المكان / الجناح (اختياري):</label>
        <input type="text" id="ev-in-loc" class="sq-input" value="${escapeHtml(ev && ev.eventLocation ? ev.eventLocation : '')}" placeholder="مثال: صالة 3 - جناح B12">
      </div>
    </div>

    <label class="sq-field-label"><i class="fa-solid fa-align-right"></i> تفاصيل ووصف الحدث أو العرض (اختياري):</label>
    <textarea id="ev-in-desc" class="sq-input" style="min-height:100px; resize:vertical;" placeholder="اكتب كافة تفاصيل المعرض أو العرض أو مواعيد التواجد...">${escapeHtml(ev ? (ev.description || '') : '')}</textarea>

    <label class="sq-field-label"><i class="fa-solid fa-book"></i> ربط بكتاب في المتجر (اختياري):</label>
    <select id="ev-in-book" class="sq-select">${booksOptions}</select>

    <label class="sq-field-label"><i class="fa-solid fa-link"></i> رابط خارجي إضافي عند الضغط (اختياري):</label>
    <input type="url" id="ev-in-url" class="sq-input" value="${escapeHtml(ev && ev.targetUrl ? ev.targetUrl : '')}" placeholder="https://...">

    <button class="sq-btn sq-btn-gold" style="width:100%; padding:12px!important; font-size:14px!important;" onclick="window.sqSaveEventFromStudio()">
      <i class="fa-solid fa-floppy-disk"></i> ${ev ? 'حفظ التعديلات على الحدث' : 'نشر الحدث في الشريط العلوي الآن'}
    </button>
  `;
  window.sqSwitchMainView('publish_event');
};

window.sqHandleEventThumbUpload = async function(inputEl) {
  if (!inputEl.files || !inputEl.files[0]) return;
  const st = document.getElementById('ev-thumb-status');
  const prev = document.getElementById('ev-thumb-prev');
  if (st) st.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent);"></i> جاري ضغط ورفع صورة الحدث...';
  try {
    AppState.pendingEventThumb = await window.sqCompressAndUploadToImgBB(inputEl.files[0], 1100, 0.82);
    if (prev) prev.src = AppState.pendingEventThumb;
    if (st) st.innerHTML = '<span style="color:var(--success);"><i class="fa-solid fa-check-circle"></i> تم تجهيز صورة الحدث بنجاح!</span>';
  } catch (e) {
    sqShowToast("تعذر رفع الصورة", "danger");
  }
};

window.sqSaveEventFromStudio = function() {
  const title = (document.getElementById('ev-in-title')?.value || '').trim();
  if (!title) return sqShowToast("عنوان الحدث حقل إلزامي", "warning");

  const payload = {
    title: title,
    eventType: document.getElementById('ev-in-type')?.value || 'event',
    ctaText: (document.getElementById('ev-in-cta')?.value || 'التفاصيل').trim(),
    eventDate: (document.getElementById('ev-in-date')?.value || '').trim(),
    eventLocation: (document.getElementById('ev-in-loc')?.value || '').trim(),
    description: (document.getElementById('ev-in-desc')?.value || '').trim(),
    bookId: document.getElementById('ev-in-book')?.value || '',
    targetUrl: (document.getElementById('ev-in-url')?.value || '').trim(),
    imageUrl: AppState.pendingEventThumb || APP_LOGO_URL,
    placement: 'both',
    active: true,
    updatedAt: Date.now()
  };

  if (AppState.editingEventId) {
    db.collection("safaqat_ads").doc(AppState.editingEventId).update(payload).then(() => {
      sqShowToast("تم تحديث الحدث بنجاح!", "success");
      window.sqOpenEventDetail(AppState.editingEventId);
    });
  } else {
    payload.clicks = 0;
    payload.time = Date.now();
    db.collection("safaqat_ads").add(payload).then(docRef => {
      sqShowToast("تم نشر الحدث في الشريط العلوي التلقائي!", "success");
      window.sqSwitchMainView('store');
    });
  }
};

window.sqDeleteEvent = function(eventId) {
  if (!confirm("هل أنت متأكد من حذف هذا الحدث أو العرض؟")) return;
  db.collection("safaqat_ads").doc(eventId).delete().then(() => {
    sqShowToast("تم حذف الحدث", "warning");
    window.sqSwitchMainView('store');
  });
};
/* =========================================================
   المحرك البرمجي الشامل — الإصدار 1.8
   File: app.js (الجزء 2 من 3)
   يشمل: المتجر، شريط دور النشر، الرفوف الأفقية، صفحة الكتاب،
         التحميل في الخلفية عبر Google Drive، استوديو الكتب المرن، ونظام الفواتير
   ========================================================= */

// =========================================================
// 🏛️ محرك المتجر، شريط دور النشر المعتمدة، والرفوف الأفقية المرنة
// =========================================================
window.sqGetMergedBookCategories = function() {
  return { ...DEFAULT_BOOK_CATEGORIES, ...(AppState.customBookCategories || {}) };
};

window.sqListenBooks = function() {
  if (AppState.booksUnsubscribe) AppState.booksUnsubscribe();
  AppState.booksUnsubscribe = db.collection("safaqat_books").orderBy("createdAt", "desc").onSnapshot(snap => {
    AppState.booksList = [];
    snap.forEach(doc => AppState.booksList.push({ id: doc.id, ...doc.data() }));
    try { localStorage.setItem('sq_offline_books_cache', JSON.stringify(AppState.booksList)); } catch (e) {}

    if (!AppState.deepLinkHandled) {
      const urlParams = new URLSearchParams(window.location.search);
      const targetBook = urlParams.get('book');
      if (targetBook && AppState.booksList.some(b => b.id === targetBook)) {
        AppState.deepLinkHandled = true;
        window.sqOpenBookDetail(targetBook);
        return;
      }
    }

    if (AppState.activeMainView === 'store') window.sqRenderLibrarySection();
    if (AppState.activeMainView === 'book_detail' && AppState.viewingBookId) window.sqRenderBookDetailView();
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
  }, err => {
    console.warn("Books Listener Error:", err);
  });
};

window.sqGetBookStats = function(book) {
  const reviews = Array.isArray(book.reviews) ? book.reviews : [];
  const ratingsCount = reviews.length;
  const avgRating = ratingsCount > 0
    ? (reviews.reduce((s, r) => s + (Number(r.stars) || 5), 0) / ratingsCount).toFixed(1)
    : (book.initialRating ? Number(book.initialRating).toFixed(1) : '5.0');
  const linkedPostsCount = AppState.posts.filter(p => p.linkedBookId === book.id || (book.title && (p.book || '').trim() === book.title.trim())).length;
  const downloadsCount = Number(book.downloadsCount) || 0;
  const readersCount = (Number(book.readsCount) || 0) + ratingsCount + linkedPostsCount + downloadsCount;
  const salesCount = (Number(book.salesCount) || 0) + (book.isBestSeller ? 25 : 0);
  return { avgRating, ratingsCount, linkedPostsCount, readersCount, salesCount, downloadsCount };
};

window.sqSetLibrarySort = function(sortType) {
  AppState.librarySort = sortType;
  document.querySelectorAll('#sq-lib-sort-bar .sq-tab-pill').forEach(b => b.classList.remove('active'));
  document.getElementById('libsort-' + sortType)?.classList.add('active');
  window.sqRenderLibrarySection();
};

window.sqSetBookCatFilter = function(catKey) {
  AppState.activeBookCatFilter = (AppState.activeBookCatFilter === catKey) ? 'all' : catKey;
  if (catKey !== 'all') window.SafaqatAI.trackSignal('category', catKey, 2);
  window.sqRenderLibrarySection();
};

window.sqOnLibrarySearch = function(val) {
  AppState.librarySearchQuery = (val || '').trim();
  const clr = document.getElementById('sq-lib-search-clear');
  if (clr) clr.style.display = AppState.librarySearchQuery ? 'flex' : 'none';
  if (AppState.librarySearchQuery.length >= 3) {
    window.SafaqatAI.trackSignal('search', AppState.librarySearchQuery, 1);
  }
  window.sqRenderLibrarySection();
};

window.sqClearLibrarySearch = function() {
  const inp = document.getElementById('sq-lib-search-input');
  if (inp) inp.value = '';
  AppState.librarySearchQuery = '';
  const clr = document.getElementById('sq-lib-search-clear');
  if (clr) clr.style.display = 'none';
  window.sqRenderLibrarySection();
};

// عرض شريط دور النشر المعتمدة أعلى المتجر (الترابط الشبكي)
window.sqRenderPublishersRail = function() {
  const sec = document.getElementById('sq-publishers-section');
  const rail = document.getElementById('sq-publishers-rail');
  if (!sec || !rail) return;

  // جمع دور النشر الموثقة + الدار الرئيسية (صفقات كتابية)
  const publishers = [];

  // 1. الدار الرئيسية الرسمية (صفقات كتابية)
  const mainAdminUid = Object.keys(AppState.allUsers).find(u => ADMINS.includes(AppState.allUsers[u].email)) || 'DAR_MAIN';
  const darBooksCount = AppState.booksList.filter(b => !b.publisherUid || b.publisherUid === 'DAR_MAIN' || b.publisherUid === mainAdminUid).length;
  publishers.push({
    uid: mainAdminUid,
    isMainDar: true,
    name: APP_NAME,
    photo: APP_LOGO_URL,
    booksCount: darBooksCount
  });

  // 2. دور النشر الأخرى المعتمدة في المنصة
  Object.keys(AppState.allUsers).forEach(uid => {
    const u = AppState.allUsers[uid];
    if (u && u.isPublisher && !ADMINS.includes(u.email)) {
      const bCount = AppState.booksList.filter(b => b.publisherUid === uid).length;
      publishers.push({
        uid: uid,
        isMainDar: false,
        name: getRealName(uid, u.displayName),
        photo: getRealPhoto(uid, u.photoURL),
        booksCount: bCount
      });
    }
  });

  if (publishers.length === 0) {
    sec.style.display = 'none';
    return;
  }

  sec.style.display = 'block';
  rail.innerHTML = publishers.map(pub => `
    <div class="sq-pub-card" onclick="${pub.uid !== 'DAR_MAIN' ? `window.sqViewProfile('${pub.uid}', 'books')` : `window.sqSetBookCatFilter('dar_exclusives')`}">
      <img src="${escapeHtml(pub.photo)}" loading="lazy" alt="${escapeHtml(pub.name)}">
      <div class="sq-pub-card-name">
        ${escapeHtml(pub.name)}
        ${pub.isMainDar
          ? `<span class="sq-vbadge admin" title="الدار الرسمية"><i class="fa-solid fa-check"></i></span>`
          : `<span class="sq-vbadge publisher" title="دار نشر معتمدة"><i class="fa-solid fa-check"></i></span>`
        }
      </div>
      <div class="sq-pub-card-meta"><i class="fa-solid fa-book" style="color:var(--accent);"></i> ${pub.booksCount} إصدار</div>
    </div>
  `).join('');
};

window.sqRenderLibrarySection = function() {
  window.sqRenderEventsCarousel();
  window.sqRenderPublishersRail();

  const staffActions = document.getElementById('sq-lib-staff-actions');
  if (staffActions) {
    let btns = '';
    if (window.sqHasPermission('manage_books')) {
      btns += `<button class="sq-btn sq-btn-gold" style="padding:7px 14px!important; font-size:12px!important;" onclick="window.sqOpenBookStudio(null)"><i class="fa-solid fa-plus"></i> رفع كتاب</button>`;
    }
    if (window.sqHasPermission('manage_ads') || AppState.isAdmin) {
      btns += `<button class="sq-btn sq-btn-outline" style="padding:7px 12px!important; font-size:12px!important;" onclick="window.sqOpenEventStudio(null)"><i class="fa-solid fa-calendar-plus" style="color:var(--accent);"></i> إضافة حدث</button>`;
    }
    staffActions.innerHTML = btns;
  }

  const catsBar = document.getElementById('sq-lib-cats-bar');
  const mergedCats = window.sqGetMergedBookCategories();
  if (catsBar) {
    let catsHtml = `<button class="sq-tab-pill ${AppState.activeBookCatFilter === 'all' ? 'active' : ''}" onclick="window.sqSetBookCatFilter('all')"><i class="fa-solid fa-layer-group"></i> كل الأقسام (${AppState.booksList.length})</button>`;
    Object.keys(mergedCats).forEach(k => {
      const c = mergedCats[k];
      const countInCat = AppState.booksList.filter(b => b.category === k).length;
      if (countInCat > 0 || DEFAULT_BOOK_CATEGORIES[k]) {
        const iconHtml = c.icon ? `<i class="fa-solid ${c.icon}"></i>` : `<i class="fa-solid fa-tag" style="color:var(--accent);"></i>`;
        catsHtml += `<button class="sq-tab-pill ${AppState.activeBookCatFilter === k ? 'active' : ''}" onclick="window.sqSetBookCatFilter('${k}')">${iconHtml} ${escapeHtml(c.label)} ${countInCat ? `(${countInCat})` : ''}</button>`;
      }
    });
    catsBar.innerHTML = catsHtml;
  }

  const shelvesContainer = document.getElementById('sq-library-shelves-container');
  const grid = document.getElementById('sq-library-grid');
  if (!grid || !shelvesContainer) return;

  let list = [...AppState.booksList];
  if (AppState.activeBookCatFilter && AppState.activeBookCatFilter !== 'all') {
    list = list.filter(b => b.category === AppState.activeBookCatFilter);
  }
  if (AppState.librarySort === 'free') {
    list = list.filter(b => Boolean(b.downloadUrl && b.downloadUrl.trim() !== '') || Number(b.price) === 0);
  }
  if (AppState.librarySearchQuery) {
    list = list.filter(b => window.SafaqatAI.scoreBookForUser(b, AppState.librarySearchQuery) > -900);
  }

  list.sort((a, b) => {
    const stA = window.sqGetBookStats(a);
    const stB = window.sqGetBookStats(b);
    if (AppState.librarySearchQuery) {
      return window.SafaqatAI.scoreBookForUser(b, AppState.librarySearchQuery) - window.SafaqatAI.scoreBookForUser(a, AppState.librarySearchQuery);
    }
    if (AppState.librarySort === 'bestseller') return stB.salesCount - stA.salesCount;
    if (AppState.librarySort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    if (AppState.librarySort === 'toprated') return parseFloat(stB.avgRating) - parseFloat(stA.avgRating);
    return window.SafaqatAI.scoreBookForUser(b) - window.SafaqatAI.scoreBookForUser(a);
  });

  if (!list.length) {
    shelvesContainer.innerHTML = '';
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:45px 20px; background:var(--card); border-radius:var(--radius-xl); border:1px solid var(--border); color:var(--text-muted);">
        <i class="fa-solid fa-book-open fa-2x" style="color:var(--accent); opacity:0.45; margin-bottom:10px;"></i><br>
        <strong>لا توجد إصدارات مطابقة في هذا القسم حالياً.</strong>
        ${window.sqHasPermission('manage_books') ? `<br><button class="sq-btn sq-btn-gold" style="margin-top:12px;" onclick="window.sqOpenBookStudio(null)"><i class="fa-solid fa-plus"></i> إضافة كتاب للمتجر</button>` : ''}
      </div>
    `;
    return;
  }

  // عرض رفوف التمرير الأفقي المرنة حسب كل تصنيف (للتصفح يميناً ويساراً بسلاسة)
  if ((AppState.librarySort === 'shelves' || (AppState.librarySort === 'smart' && AppState.activeBookCatFilter === 'all' && !AppState.librarySearchQuery)) && AppState.booksList.length >= 2) {
    let shelvesHtml = '';
    // 1. رف مقترحات الذكاء الاصطناعي الخاصة بالقارئ
    const topSmart = [...list].slice(0, 10);
    shelvesHtml += `
      <div class="sq-shelf-block">
        <div class="sq-section-head" style="margin-bottom:6px;">
          <div class="sq-section-title"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent);"></i> مختارات مقترحة لذائقتك الأدبية</div>
          <span style="font-size:11px; color:var(--text-muted); font-weight:700;">مرر لليمين واليسار <i class="fa-solid fa-arrows-left-right"></i></span>
        </div>
        <div class="sq-books-horizontal-rail">
          ${topSmart.map(b => window.sqBuildBookCardHTML(b)).join('')}
        </div>
      </div>
    `;

    // 2. رفوف التصنيفات الأفقية
    Object.keys(mergedCats).forEach(catKey => {
      const catBooks = AppState.booksList.filter(b => b.category === catKey);
      if (catBooks.length > 0) {
        const cObj = mergedCats[catKey];
        const sortedCatBooks = catBooks.sort((a, b) => window.SafaqatAI.scoreBookForUser(b) - window.SafaqatAI.scoreBookForUser(a));
        shelvesHtml += `
          <div class="sq-shelf-block">
            <div class="sq-section-head" style="margin-bottom:6px;">
              <div class="sq-section-title">
                <i class="fa-solid ${cObj.icon || 'fa-book-open'}" style="color:var(--accent);"></i>
                <span>${escapeHtml(cObj.label)} (${catBooks.length})</span>
              </div>
              <button class="sq-mini-action-btn" onclick="window.sqSetBookCatFilter('${catKey}')">عرض الكل <i class="fa-solid fa-chevron-left"></i></button>
            </div>
            <div class="sq-books-horizontal-rail">
              ${sortedCatBooks.map(b => window.sqBuildBookCardHTML(b)).join('')}
            </div>
          </div>
        `;
      }
    });

    shelvesContainer.innerHTML = shelvesHtml;
    if (AppState.librarySort === 'shelves') {
      grid.innerHTML = '';
      return;
    }
  } else {
    shelvesContainer.innerHTML = '';
  }

  grid.innerHTML = list.map(book => window.sqBuildBookCardHTML(book)).join('');
};

window.sqBuildBookCardHTML = function(book) {
  const st = window.sqGetBookStats(book);
  const authorDisplay = book.authorUid ? getRealName(book.authorUid, book.authorName) : (book.authorName || 'مؤلف');
  const authorBubble = book.authorUid ? window.sqGetVerificationBubble(book.authorUid) : '';
  const priceVal = Number(book.price) || 0;
  const oldPriceVal = Number(book.oldPrice) || 0;
  const curr = book.currency || DEFAULT_CURRENCY;
  const hasDirectDownload = Boolean(book.downloadUrl && book.downloadUrl.trim() !== '');

  let badgeTop = '';
  if (book.isOffer || (oldPriceVal > priceVal && priceVal > 0)) {
    const disc = (oldPriceVal > priceVal && priceVal > 0) ? Math.round(((oldPriceVal - priceVal) / oldPriceVal) * 100) : 0;
    badgeTop = `<span class="sq-lib-badge-top" style="background:var(--danger); color:#fff; border:none;"><i class="fa-solid fa-tags"></i> ${disc > 0 ? `خصم ${disc}%` : 'عرض خاص'}</span>`;
  } else if (book.isBestSeller) {
    badgeTop = `<span class="sq-lib-badge-top"><i class="fa-solid fa-fire"></i> الأكثر مبيعاً</span>`;
  } else if (hasDirectDownload && priceVal === 0) {
    badgeTop = `<span class="sq-lib-badge-top" style="background:var(--success); color:#fff; border:none;"><i class="fa-solid fa-cloud-arrow-down"></i> تحميل مباشر</span>`;
  } else if (book.isFeatured) {
    badgeTop = `<span class="sq-lib-badge-top"><i class="fa-solid fa-crown"></i> مميز</span>`;
  }

  return `
    <div class="sq-lib-book-card" onclick="window.sqOpenBookDetail('${book.id}')">
      <div>
        <div class="sq-lib-cover-wrap">
          ${badgeTop}
          <img src="${escapeHtml(book.cover || APP_LOGO_URL)}" loading="lazy" alt="${escapeHtml(book.title)}">
          <span class="sq-lib-rating-pill"><i class="fa-solid fa-star" style="color:#fbbf24;"></i> ${st.avgRating}</span>
        </div>
        <div class="sq-lib-book-title">${escapeHtml(book.title)}</div>
        <div class="sq-lib-book-author">
          <span>${escapeHtml(authorDisplay)}</span> ${authorBubble}
        </div>
      </div>
      <div class="sq-lib-price-row">
        <div>
          ${priceVal > 0
            ? `<span class="sq-lib-price">${priceVal} ${escapeHtml(curr)}</span>${oldPriceVal > priceVal ? `<span class="sq-lib-old-price">${oldPriceVal}</span>` : ''}`
            : `<span class="sq-lib-price" style="color:var(--success); font-size:12px;">${hasDirectDownload ? 'متاح للتحميل' : 'مجاني'}</span>`
          }
        </div>
        ${priceVal > 0 ? `
          <button type="button" class="sq-icon-btn" style="width:32px; height:32px; background:var(--accent-soft); color:#b45309; border-color:var(--accent-border);" onclick="event.stopPropagation(); window.sqAddToCart('${book.id}', 1)" title="أضف إلى السلة">
            <i class="fa-solid fa-cart-plus" style="font-size:13px;"></i>
          </button>
        ` : `
          <button type="button" class="sq-icon-btn" style="width:32px; height:32px; background:rgba(16,185,129,0.14); color:var(--success); border-color:var(--success);" onclick="event.stopPropagation(); window.sqOpenBookDetail('${book.id}')" title="تصفح وتحميل">
            <i class="fa-solid fa-arrow-down" style="font-size:13px;"></i>
          </button>
        `}
      </div>
    </div>
  `;
};

// =========================================================
// 📖 صفحة الكتاب السينمائية + نظام تحميل Google Drive المؤكد في الخلفية + الترابط الشبكي
// =========================================================
window.sqOpenBookDetail = function(bookId) {
  window.sqCloseAllMenus();
  AppState.viewingBookId = bookId;
  AppState.showDownloadConfirmForBook = false;
  const book = AppState.booksList.find(b => b.id === bookId);
  if (book) window.SafaqatAI.trackSignal('book', book, 3);
  window.sqRecordBookView(bookId);
  window.sqSwitchMainView('book_detail');
  window.sqRenderBookDetailView();
};

window.sqRecordBookView = function(bookId) {
  if (!bookId) return;
  const vKey = 'sq_bv_' + bookId;
  if (sessionStorage.getItem(vKey)) return;
  sessionStorage.setItem(vKey, '1');
  const b = AppState.booksList.find(x => x.id === bookId);
  if (b) b.views = (b.views || 1) + 1;
  db.collection("safaqat_books").doc(bookId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
};

// تفعيل رسالة التأكيد قبل تحميل الكتاب
window.sqRequestBookDownload = function(bookId) {
  AppState.showDownloadConfirmForBook = !AppState.showDownloadConfirmForBook;
  window.sqRenderBookDetailView();
};

// تنفيذ التحميل الفوري في الخلفية عبر Google Drive بعد تأكيد القارئ
window.sqExecuteBookDownload = function(bookId) {
  const book = AppState.booksList.find(b => b.id === bookId);
  if (!book || !book.downloadUrl) return;

  const directUrl = window.sqFormatGoogleDriveDownloadUrl(book.downloadUrl);
  AppState.showDownloadConfirmForBook = false;
  window.SafaqatAI.trackSignal('book', book, 5);

  // زيادة عداد التحميلات والقراءات في قاعدة البيانات
  book.downloadsCount = (Number(book.downloadsCount) || 0) + 1;
  db.collection("safaqat_books").doc(bookId).update({
    downloadsCount: firebase.firestore.FieldValue.increment(1),
    readsCount: firebase.firestore.FieldValue.increment(1)
  }).catch(() => {});

  window.sqRenderBookDetailView();
  sqShowToast(`جاري تحميل كتاب "${book.title}" في الخلفية...`, "success");

  // بدء التحميل في الخلفية عبر الإطار الخفي أو رابط التحميل المباشر
  try {
    const dlFrame = document.getElementById('sq-bg-dl-frame');
    if (dlFrame) {
      dlFrame.src = directUrl;
    }
    const a = document.createElement('a');
    a.href = directUrl;
    a.setAttribute('download', (book.title || 'book') + '.pdf');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1500);
  } catch (e) {
    window.open(directUrl, '_blank');
  }
};

window.sqToggleSaveBookToLibrary = function(bookId) {
  if (!AppState.currentUser) { sqShowToast("سجل دخولك أولاً لحفظ الكتب في مكتبتك", "warning"); return window.sqLogin(); }
  const book = AppState.booksList.find(b => b.id === bookId);
  const saved = AppState.userData.savedBooks || [];
  const isSaved = saved.includes(bookId);
  const ref = db.collection("safaqat_users").doc(AppState.currentUser.uid);

  if (isSaved) {
    AppState.userData.savedBooks = saved.filter(id => id !== bookId);
    ref.update({ savedBooks: firebase.firestore.FieldValue.arrayRemove(bookId) });
    sqShowToast("أُزيل الكتاب من مكتبتك المحفوظة", "warning");
  } else {
    AppState.userData.savedBooks = [...saved, bookId];
    if (book) window.SafaqatAI.trackSignal('book', book, 5);
    ref.update({ savedBooks: firebase.firestore.FieldValue.arrayUnion(bookId) });
    sqShowToast("تم حفظ الكتاب في (مكتبتي) داخل حسابك!", "success");
  }
  if (AppState.activeMainView === 'book_detail') window.sqRenderBookDetailView();
};

window.sqRenderBookDetailView = function() {
  const container = document.getElementById('sq-view-book-detail');
  if (!container) return;
  const book = AppState.booksList.find(b => b.id === AppState.viewingBookId);
  if (!book) {
    container.innerHTML = `
      <div class="sq-inpage-topbar">
        <div class="sq-inpage-title">تفاصيل الكتاب</div>
        <button class="sq-back-pill" onclick="window.sqSwitchMainView('store')"><i class="fa-solid fa-arrow-left"></i> المتجر</button>
      </div>
      <div class="sq-hub-card" style="text-align:center; padding:40px 20px;">
        <p style="color:var(--text-muted); margin-bottom:14px;">جاري تحميل بيانات الكتاب...</p>
        <button class="sq-btn" onclick="window.sqSwitchMainView('store')">العودة للمتجر</button>
      </div>
    `;
    return;
  }

  const st = window.sqGetBookStats(book);
  const mergedCats = window.sqGetMergedBookCategories();
  const catLabel = (mergedCats[book.category] && mergedCats[book.category].label) ? mergedCats[book.category].label : 'إصدار أدبي';

  // بيانات الكاتب والترابط الشبكي
  const authorDisplay = book.authorUid ? getRealName(book.authorUid, book.authorName) : (book.authorName || 'مؤلف');
  const hasAuthorAccount = Boolean(book.authorUid && AppState.allUsers[book.authorUid]);
  const authorAvatar = hasAuthorAccount ? getRealPhoto(book.authorUid, '') : DEFAULT_PIC;

  // بيانات دار النشر والترابط الشبكي
  const isMainDarPub = !book.publisherUid || book.publisherUid === 'DAR_MAIN' || sqIsAdminUid(book.publisherUid);
  const pubDisplay = isMainDarPub ? (book.publisherName || APP_NAME) : getRealName(book.publisherUid, book.publisherName || APP_NAME);
  const pubAvatar = isMainDarPub ? APP_LOGO_URL : getRealPhoto(book.publisherUid, APP_LOGO_URL);
  const hasPubProfile = Boolean(!isMainDarPub && book.publisherUid && AppState.allUsers[book.publisherUid]);

  const priceVal = Number(book.price) || 0;
  const oldPriceVal = Number(book.oldPrice) || 0;
  const curr = book.currency || DEFAULT_CURRENCY;
  const hasDownload = Boolean(book.downloadUrl && book.downloadUrl.trim() !== '');

  window.sqUpdateDynamicSEO(
    `كتاب ${book.title} — ${authorDisplay}`,
    book.desc || `تصفح واطلب كتاب ${book.title} للمؤلف ${authorDisplay} عبر متجر ${APP_NAME}`,
    book.cover || APP_LOGO_URL,
    false,
    {
      "@context": "https://schema.org",
      "@type": "Book",
      "name": decodeEntities(book.title),
      "author": { "@type": "Person", "name": decodeEntities(authorDisplay) },
      "publisher": { "@type": "Organization", "name": decodeEntities(pubDisplay) },
      "description": decodeEntities(book.desc || ''),
      "image": book.cover || APP_LOGO_URL,
      "offers": { "@type": "Offer", "price": priceVal, "priceCurrency": "SAR", "availability": "https://schema.org/InStock" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": st.avgRating, "reviewCount": Math.max(1, st.ratingsCount) }
    }
  );

  // فحص صلاحية التعديل (الإدارة أو موظف الكتب أو دار النشر المالكة للكتاب)
  const isMyPublisherBook = AppState.currentUser && book.publisherUid === AppState.currentUser.uid;
  const canEditBook = AppState.isAdmin || (AppState.userData.permissions || []).includes('manage_books') || isMyPublisherBook;
  const canPromoteBook = AppState.isAdmin || window.sqHasPermission('manage_ads') || canEditBook;

  const isSavedInMyLib = AppState.currentUser && (AppState.userData.savedBooks || []).includes(book.id);
  const myShelfState = (AppState.userData.readingShelf && AppState.userData.readingShelf[book.id]) || '';

  const relatedPosts = AppState.posts.filter(p => p.linkedBookId === book.id || (book.title && (p.book || '').trim() === book.title.trim()));
  const reviews = Array.isArray(book.reviews) ? [...book.reviews].sort((a, b) => (b.time || 0) - (a.time || 0)) : [];
  const similarBooks = window.SafaqatAI.getSimilarBooks(book, 6);

  const availMap = {
    available: { text: 'متوفر للطلب والشحن', color: '#10b981', icon: 'fa-circle-check' },
    digital:   { text: 'نسخة إلكترونية', color: '#38bdf8', icon: 'fa-tablet-screen-button' },
    out:       { text: 'نفدت الكمية حالياً', color: '#ef4444', icon: 'fa-circle-xmark' },
    soon:      { text: 'قريباً في المتجر', color: '#f59e0b', icon: 'fa-clock' }
  };
  const availObj = availMap[book.availability || 'available'] || availMap.available;

  let staffControlBar = '';
  if (canEditBook || canPromoteBook) {
    staffControlBar = `
      <div class="sq-hub-card" style="background:linear-gradient(135deg, rgba(212,175,55,0.12) 0%, var(--card) 100%); border:1.5px dashed var(--accent); padding:12px 15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span style="font-size:12.5px; font-weight:900; color:var(--text-main);"><i class="fa-solid fa-sliders" style="color:var(--accent);"></i> لوحة تحكم الكتاب السريعة:</span>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${canPromoteBook ? `<button class="sq-btn sq-btn-gold" style="padding:6px 13px!important; font-size:11.5px!important;" onclick="window.sqPromoteBookOneClick('${book.id}')"><i class="fa-solid fa-calendar-star"></i> إضافة لشريط الأحداث والعروض</button>` : ''}
          ${canEditBook ? `<button class="sq-btn" style="padding:6px 13px!important; font-size:11.5px!important;" onclick="window.sqOpenBookStudio('${book.id}')"><i class="fa-solid fa-pen-to-square"></i> تعديل البيانات / الخصم / الروابط</button>` : ''}
          ${canEditBook ? `<button class="sq-btn sq-btn-outline" style="padding:6px 12px!important; font-size:11.5px!important; color:var(--danger)!important; border-color:var(--danger)!important;" onclick="window.sqDeleteBook('${book.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>
    `;
  }

  // صندوق تأكيد التحميل الذكي عبر Google Drive
  let downloadSectionHtml = '';
  if (hasDownload) {
    downloadSectionHtml = `
      <div style="margin-bottom:10px;">
        <button class="sq-btn" style="width:100%; background:linear-gradient(135deg, #10b981 0%, #059669 100%)!important; color:#fff!important; padding:11px 16px!important; font-size:13.5px!important; box-shadow:0 8px 20px rgba(16,185,129,0.3)!important;" onclick="window.sqRequestBookDownload('${book.id}')">
          <i class="fa-solid fa-cloud-arrow-down"></i> تحميل الكتاب مباشرة (${st.downloadsCount ? st.downloadsCount + ' تحميل' : 'نسخة رقمية'})
        </button>
        ${AppState.showDownloadConfirmForBook ? `
          <div class="sq-dl-confirm-box">
            <div style="font-size:13.5px; font-weight:900; margin-bottom:8px;">
              <i class="fa-solid fa-circle-question" style="color:#fbbf24;"></i> هل أنت متأكد من تحميل كتاب "${escapeHtml(book.title)}"؟
            </div>
            <div style="display:flex; gap:8px; justify-content:center;">
              <button class="sq-btn sq-btn-gold" style="padding:7px 18px!important; font-size:12.5px!important;" onclick="window.sqExecuteBookDownload('${book.id}')">
                <i class="fa-solid fa-check"></i> نعم، أنا متأكد — ابدأ التحميل
              </button>
              <button class="sq-btn sq-btn-outline" style="color:#fff!important; border-color:rgba(255,255,255,0.35)!important; padding:7px 14px!important; font-size:12px!important;" onclick="window.sqRequestBookDownload('${book.id}')">
                إلغاء
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  const reviewsHtml = reviews.length ? reviews.map((rev, rIdx) => {
    const rName = escapeHtml(getRealName(rev.uid, rev.name));
    const rPhoto = getRealPhoto(rev.uid, rev.photo);
    const canDelRev = (AppState.currentUser && rev.uid === AppState.currentUser.uid) || window.sqHasPermission('manage_mod');
    const starsHtml = Array.from({ length: 5 }, (_, i) => `<i class="fa-solid fa-star" style="color:${i < (rev.stars || 5) ? '#fbbf24' : '#cbd5e1'}; font-size:11px;"></i>`).join('');
    return `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:12px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="window.sqViewProfile('${rev.uid}')">
            <img src="${rPhoto}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
            <div>
              <div style="font-size:13px; font-weight:800;">${rName} ${window.getUserBadges(rev.uid, false, false)}</div>
              <div>${starsHtml} <span style="font-size:10px; color:var(--text-muted); margin-right:4px;">${sqFormatRelativeTime(rev.time)}</span></div>
            </div>
          </div>
          ${canDelRev ? `<button style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:12px;" onclick="window.sqDeleteBookReview('${book.id}',${rIdx})"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
        <p style="font-size:13.5px; line-height:1.7; color:var(--text-main); white-space:pre-wrap;">${escapeHtml(rev.text || '')}</p>
      </div>
    `;
  }).join('') : `<p style="text-align:center; padding:18px; color:var(--text-muted); font-size:13px;">كن أول من يضع تقييمه ومراجعته لهذا الكتاب!</p>`;

  const similarBooksHtml = similarBooks.length ? `
    <div class="sq-shelf-block">
      <div class="sq-section-head">
        <div class="sq-section-title"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent);"></i> كتب مشابهة قد تنال إعجابك</div>
        <span style="font-size:11px; color:var(--text-muted); font-weight:700;">مقترحة بالذكاء الاصطناعي</span>
      </div>
      <div class="sq-books-horizontal-rail">
        ${similarBooks.map(b => window.sqBuildBookCardHTML(b)).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="sq-inpage-topbar">
      <div class="sq-inpage-title"><i class="fa-solid fa-book-open" style="color:var(--accent);"></i> صفحة الإصدار</div>
      <div style="display:flex; gap:6px;">
        <button class="sq-back-pill" onclick="window.sqCopyDirectBookLink('${book.id}')"><i class="fa-solid fa-share-nodes" style="color:var(--accent);"></i> مشاركة</button>
        <button class="sq-back-pill" onclick="window.sqSwitchMainView('store', true)"><i class="fa-solid fa-arrow-left"></i> المتجر</button>
      </div>
    </div>

    ${staffControlBar}

    <div class="sq-book-hero">
      <div class="sq-book-hero-inner">
        <img src="${escapeHtml(book.cover || APP_LOGO_URL)}" class="sq-book-hero-cover" onclick="window.sqOpenLightbox('${escapeHtml(book.cover || APP_LOGO_URL)}')">
        <div style="flex:1; width:100%;">
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
            <span style="background:rgba(251,191,36,0.2); color:#fbbf24; border:1px solid rgba(251,191,36,0.4); font-size:11px; font-weight:800; padding:3px 10px; border-radius:12px;"><i class="fa-solid fa-tag"></i> ${escapeHtml(catLabel)}</span>
            <span style="background:rgba(255,255,255,0.1); color:#e2e8f0; font-size:11px; font-weight:700; padding:3px 10px; border-radius:12px;"><i class="fa-regular fa-eye" style="color:#fbbf24;"></i> ${book.views || 1} زيارة</span>
            <span style="background:rgba(255,255,255,0.1); color:${availObj.color}; font-size:11px; font-weight:800; padding:3px 10px; border-radius:12px;"><i class="fa-solid ${availObj.icon}"></i> ${availObj.text}</span>
          </div>

          <h1 style="font-size:22px; font-weight:900; color:#fff; margin-bottom:10px;">${escapeHtml(book.title)}</h1>

          <!-- بطاقتا الترابط الشبكي: المؤلف (توثيق أزرق) + دار النشر (توثيق ذهبي/أحمر) -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.1); padding:6px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.15); cursor:${hasAuthorAccount ? 'pointer' : 'default'};" ${hasAuthorAccount ? `onclick="window.sqViewProfile('${book.authorUid}', 'books')"` : ''}>
              ${hasAuthorAccount ? `<img src="${authorAvatar}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; border:1px solid #38bdf8;">` : `<i class="fa-solid fa-feather-pointed" style="color:#38bdf8;"></i>`}
              <span style="font-size:13px; font-weight:800; color:#fff;">المؤلف: ${escapeHtml(authorDisplay)}</span>
              ${hasAuthorAccount ? `<span class="sq-vbadge author" title="كاتب معتمد"><i class="fa-solid fa-check"></i></span>` : ''}
            </div>

            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.1); padding:6px 12px; border-radius:20px; border:1px solid rgba(251,191,36,0.3); cursor:${hasPubProfile ? 'pointer' : 'default'};" ${hasPubProfile ? `onclick="window.sqViewProfile('${book.publisherUid}', 'books')"` : ''}>
              <img src="${escapeHtml(pubAvatar)}" style="width:26px; height:26px; border-radius:8px; object-fit:cover; border:1px solid #fbbf24;">
              <span style="font-size:13px; font-weight:800; color:#fff;">الناشر: ${escapeHtml(pubDisplay)}</span>
              ${isMainDarPub
                ? `<span class="sq-vbadge admin" title="الدار الرسمية"><i class="fa-solid fa-check"></i></span>`
                : `<span class="sq-vbadge publisher" title="دار نشر معتمدة"><i class="fa-solid fa-check"></i></span>`
              }
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:14px; padding:10px 14px; background:rgba(0,0,0,0.28); border-radius:14px;">
            <div>
              <span style="font-size:20px; font-weight:900; color:#fbbf24;"><i class="fa-solid fa-star"></i> ${st.avgRating}</span>
              <span style="font-size:11px; color:#cbd5e1; display:block;">(${st.ratingsCount} تقييم)</span>
            </div>
            <div style="height:26px; width:1px; background:rgba(255,255,255,0.15);"></div>
            <div>
              <span style="font-size:16px; font-weight:900; color:#fff;">${st.readersCount}</span>
              <span style="font-size:11px; color:#cbd5e1; display:block;">قارئ ومتفاعل</span>
            </div>
            <div style="height:26px; width:1px; background:rgba(255,255,255,0.15);"></div>
            <div>
              <span style="font-size:16px; font-weight:900; color:#10b981;">${priceVal > 0 ? priceVal + ' ' + escapeHtml(curr) : 'مجاني'}</span>
              ${oldPriceVal > priceVal ? `<span style="font-size:11px; color:#fca5a5; text-decoration:line-through; display:block;">${oldPriceVal}${escapeHtml(curr)}</span>` : `<span style="font-size:11px; color:#cbd5e1; display:block;">السعر الرسمي</span>`}
            </div>
          </div>

          <!-- زر التحميل المباشر من Google Drive مع رسالة التأكيد -->
          ${downloadSectionHtml}

          <!-- أزرار الشراء، السلة، وحفظ في مكتبتي -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
            ${book.availability !== 'out' && priceVal > 0 ? `
              <button class="sq-btn sq-btn-gold" style="flex:2; padding:11px 16px!important; font-size:13.5px!important;" onclick="window.sqAddToCart('${book.id}', 1, true)">
                <i class="fa-solid fa-bag-shopping"></i> طلب واقتناء النسخة الآن
              </button>
              <button class="sq-btn" style="flex:1; background:rgba(255,255,255,0.16)!important; color:#fff!important; border:1px solid rgba(255,255,255,0.3)!important;" onclick="window.sqAddToCart('${book.id}', 1, false)">
                <i class="fa-solid fa-cart-plus"></i> للسلة
              </button>
            ` : ''}
            <button class="sq-btn" style="flex:1; background:${isSavedInMyLib ? '#10b981' : 'rgba(255,255,255,0.12)'}!important; color:#fff!important; border:1px solid rgba(255,255,255,0.28)!important;" onclick="window.sqToggleSaveBookToLibrary('${book.id}')">
              <i class="fa-solid ${isSavedInMyLib ? 'fa-check' : 'fa-bookmark'}"></i> ${isSavedInMyLib ? 'محفوظ في مكتبتي' : 'حفظ إلى مكتبتي'}
            </button>
          </div>

          ${book.externalUrl ? `<a href="${escapeHtml(book.externalUrl)}" target="_blank" class="sq-btn" style="width:100%; margin-bottom:10px; background:rgba(2,132,199,0.25)!important; color:#38bdf8!important; border:1px solid #38bdf8!important;"><i class="fa-solid fa-arrow-up-right-from-square"></i> رابط خارجي إضافي للكتاب</a>` : ''}

          <!-- حالة القراءة التفاعلية -->
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="sq-tab-pill" style="${myShelfState === 'reading' ? 'background:#fbbf24; color:#0f172a; border-color:#fbbf24;' : 'background:rgba(255,255,255,0.08); color:#fff; border-color:rgba(255,255,255,0.2);'}" onclick="window.sqSetReadingShelfStatus('${book.id}', 'reading')"><i class="fa-solid fa-book-open-reader"></i> أقرؤه حالياً</button>
            <button class="sq-tab-pill" style="${myShelfState === 'read' ? 'background:#10b981; color:#fff; border-color:#10b981;' : 'background:rgba(255,255,255,0.08); color:#fff; border-color:rgba(255,255,255,0.2);'}" onclick="window.sqSetReadingShelfStatus('${book.id}', 'read')"><i class="fa-solid fa-check-double"></i> قرأته</button>
          </div>
        </div>
      </div>
    </div>

    <!-- بطاقة النبذة والبيانات الفهرسية (تظهر فقط الحقول التي اختار الكاتب/الناشر إضافتها) -->
    <div class="sq-hub-card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
        <h3 style="font-size:16px; font-weight:900;"><i class="fa-solid fa-align-right" style="color:var(--accent);"></i> نبذة عن الكتاب وتفاصيل الإصدار</h3>
        <button class="sq-btn sq-btn-gold" style="padding:6px 14px!important; font-size:12px!important;" onclick="window.sqStartPostForBook('${book.id}')">
          <i class="fa-solid fa-feather-pointed"></i> انشر اقتباساً أو مراجعة للكتاب
        </button>
      </div>
      ${book.desc ? `<p class="sq-book-desc-text" style="font-size:14.5px; line-height:1.85; color:var(--text-main); white-space:pre-wrap; margin-bottom:12px;">${escapeHtml(book.desc)}</p>` : `<p style="font-size:13px; color:var(--text-muted); margin-bottom:10px;">إصدار متوفر في مكتبة ${escapeHtml(pubDisplay)}.</p>`}
      <div style="display:flex; flex-wrap:wrap; gap:8px; padding-top:10px; border-top:1px dashed var(--border);">
        ${book.pages ? `<span class="sq-status-pill"><i class="fa-regular fa-file-lines" style="color:var(--accent);"></i> الصفحات: <strong>${escapeHtml(book.pages)}</strong></span>` : ''}
        ${book.publishYear ? `<span class="sq-status-pill"><i class="fa-regular fa-calendar" style="color:var(--accent);"></i> سنة النشر: <strong>${escapeHtml(book.publishYear)}</strong></span>` : ''}
        <span class="sq-status-pill"><i class="fa-solid fa-building-columns" style="color:var(--accent);"></i> دار النشر: <strong>${escapeHtml(pubDisplay)}</strong></span>
        ${book.isbn ? `<span class="sq-status-pill"><i class="fa-solid fa-barcode" style="color:var(--accent);"></i> ردمك ISBN: <strong>${escapeHtml(book.isbn)}</strong></span>` : ''}
      </div>
    </div>

    <!-- قسم التقييمات والمراجعات بالنجوم -->
    <div class="sq-hub-card">
      <h3 style="font-size:16px; font-weight:900; margin-bottom:10px;"><i class="fa-solid fa-star" style="color:#fbbf24;"></i> تقييمات القراء وآراؤهم (${reviews.length})</h3>
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; padding:12px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
          <span style="font-size:12.5px; font-weight:800;">اختر تقييمك بالنجوم:</span>
          <div class="sq-stars-interactive" id="sq-book-star-picker" data-stars="5">
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(1)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(2)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(3)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(4)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(5)"></i>
          </div>
        </div>
        <textarea id="sq-book-review-in" class="sq-input" style="min-height:70px; resize:none; background:var(--card)!important;" placeholder="اكتب رأيك أو انطباعك النقدي عن الكتاب..."></textarea>
        <button class="sq-btn" style="width:100%;" onclick="window.sqSubmitBookReview('${book.id}')"><i class="fa-solid fa-check"></i> إرسال التقييم والمراجعة</button>
      </div>
      <div>${reviewsHtml}</div>
    </div>

    <!-- قسم المنشورات والاقتباسات المرتبطة بالكتاب في المجتمع -->
    <div class="sq-hub-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:16px; font-weight:900;"><i class="fa-solid fa-quote-right" style="color:var(--accent);"></i> منشورات واقتباسات مرتبطة بالكتاب (${relatedPosts.length})</h3>
        <button class="sq-btn sq-btn-outline" style="padding:5px 12px!important; font-size:11.5px!important;" onclick="window.sqStartPostForBook('${book.id}')"><i class="fa-solid fa-plus"></i> إضافة اقتباس</button>
      </div>
      <div>
        ${relatedPosts.length ? relatedPosts.map(p => window.sqBuildSinglePostHTML(p, false)).join('') : `<p style="text-align:center; padding:22px; color:var(--text-muted); font-size:13px;">لم ينشر القراء اقتباسات مرتبطة بهذا الكتاب بعد. كن أول من يقتبس منه!</p>`}
      </div>
    </div>

    <!-- توصيات الكتب المشابهة عبر الذكاء الاصطناعي الخفي -->
    ${similarBooksHtml}
  `;
};

window.sqCopyDirectBookLink = function(bookId) {
  const link = `${CURRENT_DOMAIN_ORIGIN}${window.location.pathname}?book=${bookId}`;
  if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => sqShowToast("تم نسخ رابط الكتاب المباشر!", "success"));
};

window.sqSelectBookStar = function(num) {
  const picker = document.getElementById('sq-book-star-picker');
  if (!picker) return;
  picker.setAttribute('data-stars', String(num));
  picker.querySelectorAll('i').forEach((st, idx) => st.classList.toggle('active', idx < num));
};

window.sqSubmitBookReview = function(bookId) {
  if (!AppState.currentUser) { sqShowToast("سجل دخولك أولاً لتقييم الكتاب", "warning"); return window.sqLogin(); }
  const book = AppState.booksList.find(b => b.id === bookId); if (!book) return;
  const picker = document.getElementById('sq-book-star-picker');
  const stars = Number(picker?.getAttribute('data-stars') || 5);
  const text = (document.getElementById('sq-book-review-in')?.value || '').trim();
  if (!text) return sqShowToast("اكتب رأيك المختصر مع التقييم", "warning");

  window.SafaqatAI.trackSignal('book', book, 4);
  const reviews = Array.isArray(book.reviews) ? [...book.reviews] : [];
  const existingIdx = reviews.findIndex(r => r.uid === AppState.currentUser.uid);
  const revObj = {
    uid: AppState.currentUser.uid,
    name: getRealName(AppState.currentUser.uid, AppState.currentUser.displayName),
    photo: getRealPhoto(AppState.currentUser.uid, AppState.currentUser.photoURL),
    stars: stars,
    text: text,
    time: Date.now()
  };
  if (existingIdx >= 0) reviews[existingIdx] = revObj;
  else reviews.push(revObj);

  db.collection("safaqat_books").doc(bookId).update({ reviews: reviews }).then(() => {
    sqShowToast("تم حفظ تقييمك للكتاب بنجاح!", "success");
    if (book.authorUid && book.authorUid !== AppState.currentUser.uid) {
      window.sqSendNotif(book.authorUid, null, `أضاف ${revObj.name} تقييماً (${stars} نجوم) على كتابك "${book.title}".`);
    }
  });
};

window.sqDeleteBookReview = function(bookId, rIdx) {
  if (!confirm("حذف هذه المراجعة؟")) return;
  const book = AppState.booksList.find(b => b.id === bookId); if (!book) return;
  const reviews = [...(book.reviews || [])];
  reviews.splice(rIdx, 1);
  db.collection("safaqat_books").doc(bookId).update({ reviews: reviews }).then(() => sqShowToast("تم حذف المراجعة", "success"));
};

window.sqSetReadingShelfStatus = function(bookId, status) {
  if (!AppState.currentUser) { sqShowToast("سجل دخولك أولاً", "warning"); return window.sqLogin(); }
  const book = AppState.booksList.find(b => b.id === bookId); if (!book) return;
  window.SafaqatAI.trackSignal('book', book, 4);
  const shelf = { ...(AppState.userData.readingShelf || {}) };
  let savedList = [...(AppState.userData.savedBooks || [])];

  if (shelf[bookId] === status) {
    delete shelf[bookId];
  } else {
    shelf[bookId] = status;
    if (!savedList.includes(bookId)) savedList.push(bookId);
    db.collection("safaqat_books").doc(bookId).update({ readsCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
  }
  const updates = { readingShelf: shelf, savedBooks: savedList };
  if (status === 'reading') updates.currentlyReadingBookId = (shelf[bookId] === 'reading') ? bookId : '';
  db.collection("safaqat_users").doc(AppState.currentUser.uid).update(updates).then(() => {
    AppState.userData.readingShelf = shelf;
    AppState.userData.savedBooks = savedList;
    if (updates.currentlyReadingBookId !== undefined) AppState.userData.currentlyReadingBookId = updates.currentlyReadingBookId;
    window.sqRenderBookDetailView();
    sqShowToast("تم تحديث قائمة قراءتك ومكتبتك!", "success");
  });
};

window.sqPromoteBookOneClick = function(bookId) {
  if (!window.sqHasPermission('manage_ads') && !window.sqHasPermission('manage_books')) return;
  const book = AppState.booksList.find(b => b.id === bookId); if (!book) return;
  const authorDisplay = book.authorUid ? getRealName(book.authorUid, book.authorName) : (book.authorName || '');

  db.collection("safaqat_ads").add({
    title: `إصدار مميز: ${book.title}${authorDisplay ? ' — ' + authorDisplay : ''}`,
    eventType: book.isOffer ? 'offer' : 'event',
    description: (book.desc || 'تصفح الكتاب واطلب نسختك أو حمله الآن من المتجر').substring(0, 180),
    targetUrl: '',
    bookId: book.id,
    ctaText: 'تصفح الكتاب الآن',
    placement: 'both',
    imageUrl: book.cover || APP_LOGO_URL,
    active: true,
    clicks: 0,
    time: Date.now()
  }).then(() => {
    db.collection("safaqat_books").doc(book.id).update({ isFeatured: true }).catch(() => {});
    sqShowToast("تمت إضافة الكتاب إلى شريط الأحداث والعروض العلوي فوراً!", "success");
  });
};

// =========================================================
// 🛠️ استوديو رفع وتعديل الكتب المرن (العنوان فقط إلزامي + ربط دار النشر والكاتب وGoogle Drive)
// =========================================================
window.sqOpenBookStudio = function(bookId = null) {
  if (!window.sqHasPermission('manage_books')) {
    return sqShowToast("رفع وتعديل الكتب متاح فقط للإدارة ودور النشر والموظفين المفوضين", "danger");
  }
  AppState.editingBookId = bookId;
  const book = bookId ? AppState.booksList.find(b => b.id === bookId) : null;
  AppState.pendingBookCover = book ? (book.cover || '') : '';
  AppState.selectedAuthorUidForBook = book ? (book.authorUid || '') : '';

  // تحديد دار النشر الافتراضية
  if (book && book.publisherUid) {
    AppState.selectedPublisherUidForBook = book.publisherUid;
  } else if (AppState.userData && AppState.userData.isPublisher && !AppState.isAdmin) {
    AppState.selectedPublisherUidForBook = AppState.currentUser.uid;
  } else {
    AppState.selectedPublisherUidForBook = 'DAR_MAIN';
  }

  document.getElementById('sq-book-studio-title').innerHTML = book
    ? `<i class="fa-solid fa-pen-to-square" style="color:var(--accent);"></i> تعديل كتاب: ${escapeHtml(book.title)}`
    : `<i class="fa-solid fa-book-medical" style="color:var(--accent);"></i> رفع كتاب جديد (مرونة كاملة)`;

  const mergedCats = window.sqGetMergedBookCategories();
  const catOptionsHtml = Object.keys(mergedCats).map(k => `<option value="${k}" ${book && book.category === k ? 'selected' : ''}>${escapeHtml(mergedCats[k].label)}</option>`).join('');

  // بناء قائمة دور النشر المعتمدة للاختيار منها
  let pubOptionsHtml = `<option value="DAR_MAIN" ${AppState.selectedPublisherUidForBook === 'DAR_MAIN' ? 'selected' : ''}>${escapeHtml(APP_NAME)} (الدار الرئيسية الرسمية)</option>`;
  Object.keys(AppState.allUsers).forEach(uid => {
    const u = AppState.allUsers[uid];
    if (u && u.isPublisher) {
      const pName = getRealName(uid, u.displayName);
      pubOptionsHtml += `<option value="${uid}" ${AppState.selectedPublisherUidForBook === uid ? 'selected' : ''}>دار نشر: ${escapeHtml(pName)}</option>`;
    }
  });

  const linkedUserObj = AppState.selectedAuthorUidForBook ? AppState.allUsers[AppState.selectedAuthorUidForBook] : null;
  const linkedAuthorLabel = linkedUserObj
    ? `${getRealName(AppState.selectedAuthorUidForBook, linkedUserObj.displayName)} (SK-${AppState.selectedAuthorUidForBook.substring(0, 6).toUpperCase()})`
    : 'غير مربوط بحساب عضو بعد (سيظهر بالاسم النصي فقط)';

  const formBox = document.getElementById('sq-book-studio-form');
  formBox.innerHTML = `
    <div style="background:var(--accent-soft); border:1px solid var(--accent-border); padding:9px 12px; border-radius:12px; font-size:12px; font-weight:800; margin-bottom:14px; color:var(--text-main);">
      <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent);"></i> <strong>نظام الرفع المرن:</strong> الحقل الإلزامي الوحيد هو <strong>(عنوان الكتاب)</strong>، وجميع الحقول والميزات الأخرى اختيارية تماماً يمكنك إضافتها أو تعديلها متى شئت!
    </div>

    <div class="sq-upload-zone" style="margin-bottom:14px;">
      <label for="sq-studio-cover-in" style="cursor:pointer; display:block;">
        <img id="sq-studio-cover-prev" src="${escapeHtml(AppState.pendingBookCover || APP_LOGO_URL)}" style="width:95px; height:138px; object-fit:cover; border-radius:10px; border:2px solid var(--accent); margin:0 auto 8px auto; display:block;">
        <div id="sq-book-cover-status" style="font-size:12.5px; font-weight:800; color:var(--text-main);"><i class="fa-solid fa-camera" style="color:var(--accent);"></i> اضغط لرفع صورة غلاف الكتاب (اختياري)</div>
      </label>
      <input type="file" id="sq-studio-cover-in" accept="image/*" style="display:none;" onchange="window.sqHandleBookCoverUpload(this)">
    </div>

    <label class="sq-field-label"><i class="fa-solid fa-book"></i> عنوان الكتاب أو الرواية (الحقل الوحيد الإلزامي *):</label>
    <input type="text" id="bk-in-title" class="sq-input" value="${escapeHtml(book ? book.title : '')}" placeholder="اكتب عنوان الكتاب هنا...">

    <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:10px;">
      <div style="flex:1;">
        <label class="sq-field-label"><i class="fa-solid fa-layer-group"></i> القسم والتصنيف في المتجر:</label>
        <select id="bk-in-cat" class="sq-select" style="margin:0!important;">${catOptionsHtml}</select>
      </div>
      <button type="button" class="sq-btn sq-btn-outline" style="padding:11px 14px!important; flex-shrink:0;" onclick="window.sqAddNewBookCategoryPrompt()"><i class="fa-solid fa-folder-plus" style="color:var(--accent);"></i> قسم جديد</button>
    </div>

    <!-- الترابط الشبكي: اختيار دار النشر وربط الكاتب -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; padding:13px; margin-bottom:12px;">
      <h4 style="font-size:13.5px; font-weight:900; margin-bottom:10px; color:var(--text-main);"><i class="fa-solid fa-diagram-project" style="color:var(--accent);"></i> الترابط الشبكي (دار النشر والمؤلف)</h4>

      <label class="sq-field-label"><i class="fa-solid fa-building-columns"></i> دار النشر التابع لها هذا الكتاب:</label>
      <select id="bk-in-pub-uid" class="sq-select" onchange="AppState.selectedPublisherUidForBook = this.value">${pubOptionsHtml}</select>

      <label class="sq-field-label"><i class="fa-solid fa-feather-pointed"></i> اسم المؤلف الظاهر على الكتاب (اختياري):</label>
      <input type="text" id="bk-in-author-name" class="sq-input" value="${escapeHtml(book ? (book.authorName || '') : '')}" placeholder="اكتب اسم الكاتب...">

      <label class="sq-field-label"><i class="fa-solid fa-user-check"></i> ربط بحساب الكاتب في المنصة (ليظهر الكتاب في ملفه وضمن كُتّاب الدار):</label>
      <div id="bk-linked-author-pill" style="background:var(--card); border:1px solid var(--accent-border); padding:8px 12px; border-radius:12px; font-size:12px; font-weight:800; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span id="bk-linked-author-text">${escapeHtml(linkedAuthorLabel)}</span>
        <button type="button" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:bold; font-size:11.5px;" onclick="window.sqSelectBookAuthorUid('', '')">إلغاء الربط</button>
      </div>
      <input type="text" id="bk-author-search-in" class="sq-input" style="margin-bottom:6px!important;" placeholder="ابحث عن حساب الكاتب بالاسم أو معرف SKID لربطه..." oninput="window.sqFilterAuthorAccountsForBook(this.value)">
      <div id="bk-author-search-results" style="max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:5px;"></div>
    </div>

    <!-- الأسعار والخصومات والعروض -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; padding:13px; margin-bottom:12px;">
      <h4 style="font-size:13.5px; font-weight:900; margin-bottom:10px; color:var(--text-main);"><i class="fa-solid fa-tags" style="color:var(--accent);"></i> التسعير، الخصم، والتحميل المباشر (اختياري)</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
        <div>
          <label class="sq-field-label"><i class="fa-solid fa-coins"></i> السعر الحالي:</label>
          <input type="number" step="0.01" id="bk-in-price" class="sq-input" value="${book && book.price !== undefined ? book.price : ''}" placeholder="0 = مجاني">
        </div>
        <div>
          <label class="sq-field-label"><i class="fa-solid fa-percent"></i> السعر قبل الخصم:</label>
          <input type="number" step="0.01" id="bk-in-oldprice" class="sq-input" value="${book && book.oldPrice ? book.oldPrice : ''}" placeholder="اختياري">
        </div>
        <div>
          <label class="sq-field-label"><i class="fa-solid fa-money-bill-wave"></i> العملة:</label>
          <input type="text" id="bk-in-curr" class="sq-input" value="${escapeHtml(book && book.currency ? book.currency : DEFAULT_CURRENCY)}">
        </div>
      </div>

      <label class="sq-field-label"><i class="fa-brands fa-google-drive"></i> رابط ملف الكتاب على Google Drive للتحميل المباشر (اختياري):</label>
      <input type="url" id="bk-in-dlurl" class="sq-input" value="${escapeHtml(book && book.downloadUrl ? book.downloadUrl : '')}" placeholder="الصق رابط المشاركة من Google Drive أو أي رابط PDF مباشر...">

      <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:4px;">
        <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; cursor:pointer;">
          <input type="checkbox" id="bk-in-offer" ${book && book.isOffer ? 'checked' : ''} style="width:17px; height:17px;"> تمييز كـ (عرض خاص)
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; cursor:pointer;">
          <input type="checkbox" id="bk-in-bestseller" ${book && book.isBestSeller ? 'checked' : ''} style="width:17px; height:17px;"> تمييز كـ (الأكثر مبيعاً)
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; cursor:pointer;">
          <input type="checkbox" id="bk-in-featured" ${book && book.isFeatured ? 'checked' : ''} style="width:17px; height:17px;"> تمييز في صدارة المقترحات
        </label>
      </div>
    </div>

    <label class="sq-field-label"><i class="fa-solid fa-align-right"></i> نبذة وملخص الكتاب (اختياري):</label>
    <textarea id="bk-in-desc" class="sq-input" style="min-height:105px; resize:vertical;" placeholder="اكتب وصفاً أو ملخصاً للكتاب متى أردت...">${escapeHtml(book ? (book.desc || '') : '')}</textarea>

    <details style="margin-bottom:14px; background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:11px;">
      <summary style="cursor:pointer; font-weight:800; font-size:12.5px; color:var(--text-main);"><i class="fa-solid fa-sliders" style="color:var(--accent);"></i> بيانات فهرسية إضافية (الصفحات، سنة النشر، حالة التوفر، ISBN) — اختياري</summary>
      <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label class="sq-field-label">حالة التوفر:</label>
          <select id="bk-in-avail" class="sq-select">
            <option value="available" ${!book || book.availability === 'available' ? 'selected' : ''}>متوفر للطلب والشحن</option>
            <option value="digital" ${book && book.availability === 'digital' ? 'selected' : ''}>نسخة رقمية</option>
            <option value="soon" ${book && book.availability === 'soon' ? 'selected' : ''}>قريباً</option>
            <option value="out" ${book && book.availability === 'out' ? 'selected' : ''}>نفدت الكمية</option>
          </select>
        </div>
        <div>
          <label class="sq-field-label">التقييم المبدئي (من 5):</label>
          <input type="number" step="0.1" min="1" max="5" id="bk-in-rating" class="sq-input" value="${book && book.initialRating ? book.initialRating : '5.0'}">
        </div>
        <input type="text" id="bk-in-pages" class="sq-input" style="margin:0!important;" value="${escapeHtml(book ? (book.pages || '') : '')}" placeholder="عدد الصفحات (اختياري)">
        <input type="text" id="bk-in-year" class="sq-input" style="margin:0!important;" value="${escapeHtml(book ? (book.publishYear || '') : '')}" placeholder="سنة النشر (اختياري)">
        <input type="text" id="bk-in-pub" class="sq-input" style="margin:0!important;" value="${escapeHtml(book ? (book.publisherName || '') : '')}" placeholder="اسم دار النشر النصي (اختياري)">
        <input type="text" id="bk-in-isbn" class="sq-input" style="margin:0!important;" value="${escapeHtml(book ? (book.isbn || '') : '')}" placeholder="رقم ردمك ISBN (اختياري)">
      </div>
      <input type="url" id="bk-in-exturl" class="sq-input" style="margin-top:8px!important;" value="${escapeHtml(book ? (book.externalUrl || '') : '')}" placeholder="رابط خارجي إضافي (مثل Google Play Books) — اختياري">
    </details>

    <button class="sq-btn sq-btn-gold" id="sq-save-book-btn" style="width:100%; padding:12px!important; font-size:14px!important;" onclick="window.sqSaveBookFromStudio()">
      <i class="fa-solid fa-floppy-disk"></i> ${book ? 'حفظ كافة التعديلات على الكتاب' : 'نشر وإضافة الكتاب في المتجر الآن'}
    </button>
  `;

  window.sqSwitchMainView('publish_book');
};

window.sqFilterAuthorAccountsForBook = function(query) {
  const resBox = document.getElementById('bk-author-search-results');
  if (!resBox) return;
  const q = (query || '').toLowerCase().trim();
  if (!q) { resBox.innerHTML = ''; return; }

  const matches = Object.keys(AppState.allUsers).filter(uid => {
    const u = AppState.allUsers[uid] || {};
    const name = getRealName(uid, u.displayName).toLowerCase();
    const skid = ('sk-' + uid.substring(0, 6)).toLowerCase();
    return name.includes(q) || skid.includes(q) || (u.email || '').toLowerCase().includes(q);
  }).slice(0, 8);

  if (!matches.length) {
    resBox.innerHTML = `<div style="font-size:11.5px; color:var(--text-muted); padding:6px;">لا يوجد عضو مطابق، يمكنك الاكتفاء بكتابة اسم المؤلف نصياً أعلاه.</div>`;
    return;
  }

  resBox.innerHTML = matches.map(uid => {
    const u = AppState.allUsers[uid] || {};
    const name = getRealName(uid, u.displayName);
    const skid = 'SK-' + uid.substring(0, 6).toUpperCase();
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 10px; background:var(--card); border:1px solid var(--border); border-radius:10px; cursor:pointer;" onclick="window.sqSelectBookAuthorUid('${uid}', '${escapeHtml(name)}')">
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${getRealPhoto(uid, u.photoURL)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">
          <span style="font-size:12.5px; font-weight:800;">${escapeHtml(name)} <small style="color:var(--text-muted);">(${skid})</small></span>
        </div>
        <span style="font-size:11px; color:var(--accent); font-weight:900;"><i class="fa-solid fa-link"></i> ربط</span>
      </div>
    `;
  }).join('');
};

window.sqSelectBookAuthorUid = function(uid, authorName) {
  AppState.selectedAuthorUidForBook = uid || '';
  const textEl = document.getElementById('bk-linked-author-text');
  const nameIn = document.getElementById('bk-in-author-name');
  const resBox = document.getElementById('bk-author-search-results');
  if (resBox) resBox.innerHTML = '';

  if (uid) {
    const skid = 'SK-' + uid.substring(0, 6).toUpperCase();
    if (textEl) textEl.innerText = `مربوط بحساب: ${decodeEntities(authorName)} (${skid})`;
    if (nameIn && !nameIn.value.trim()) nameIn.value = decodeEntities(authorName);
    sqShowToast("تم ربط الكتاب بحساب الكاتب!", "success");
  } else {
    if (textEl) textEl.innerText = 'غير مربوط بحساب عضو بعد (سيظهر بالاسم النصي فقط)';
  }
};

window.sqAddNewBookCategoryPrompt = function() {
  window.sqOpenCustomPrompt("اكتب اسم القسم الجديد لإضافته إلى المتجر والمكتبة:", "", (catName) => {
    if (!catName || catName.length < 2) return;
    const catKey = 'cat_' + Date.now();
    const updatedCustom = { ...(AppState.customBookCategories || {}), [catKey]: { label: catName, icon: '' } };
    AppState.customBookCategories = updatedCustom;
    db.collection("safaqat_settings").doc("general").set({ customBookCategories: updatedCustom }, { merge: true }).then(() => {
      const sel = document.getElementById('bk-in-cat');
      if (sel) {
        const opt = document.createElement('option');
        opt.value = catKey; opt.textContent = catName; opt.selected = true;
        sel.appendChild(opt);
      }
      sqShowToast(`تم إنشاء قسم "${catName}" بنجاح!`, "success");
    });
  });
};

window.sqSaveBookFromStudio = function() {
  if (!window.sqHasPermission('manage_books')) return;
  const title = (document.getElementById('bk-in-title')?.value || '').trim();
  if (!title) return sqShowToast("يرجى كتابة عنوان الكتاب فقط على الأقل", "warning");

  const authorUid = AppState.selectedAuthorUidForBook || '';
  const rawAuthorName = (document.getElementById('bk-in-author-name')?.value || '').trim();
  const authorName = rawAuthorName || (authorUid ? getRealName(authorUid, '') : 'مؤلف');

  const pubUid = document.getElementById('bk-in-pub-uid')?.value || AppState.selectedPublisherUidForBook || 'DAR_MAIN';
  const rawPubName = (document.getElementById('bk-in-pub')?.value || '').trim();
  const publisherName = rawPubName || (pubUid === 'DAR_MAIN' ? APP_NAME : getRealName(pubUid, APP_NAME));

  const payload = {
    title: title,
    cover: AppState.pendingBookCover || APP_LOGO_URL,
    category: document.getElementById('bk-in-cat')?.value || 'novels',
    authorName: authorName,
    authorUid: authorUid,
    publisherUid: pubUid,
    publisherName: publisherName,
    price: parseFloat(document.getElementById('bk-in-price')?.value) || 0,
    oldPrice: parseFloat(document.getElementById('bk-in-oldprice')?.value) || 0,
    currency: (document.getElementById('bk-in-curr')?.value || DEFAULT_CURRENCY).trim(),
    downloadUrl: (document.getElementById('bk-in-dlurl')?.value || '').trim(),
    availability: document.getElementById('bk-in-avail')?.value || 'available',
    initialRating: Math.min(5, Math.max(1, parseFloat(document.getElementById('bk-in-rating')?.value) || 5.0)),
    desc: (document.getElementById('bk-in-desc')?.value || '').trim(),
    pages: (document.getElementById('bk-in-pages')?.value || '').trim(),
    publishYear: (document.getElementById('bk-in-year')?.value || '').trim(),
    isbn: (document.getElementById('bk-in-isbn')?.value || '').trim(),
    externalUrl: (document.getElementById('bk-in-exturl')?.value || '').trim(),
    isOffer: Boolean(document.getElementById('bk-in-offer')?.checked),
    isBestSeller: Boolean(document.getElementById('bk-in-bestseller')?.checked),
    isFeatured: Boolean(document.getElementById('bk-in-featured')?.checked),
    updatedAt: Date.now()
  };

  // توثيق الكاتب تلقائياً بالشارة الزرقاء وربطه بدار النشر في الشبكة
  if (authorUid) {
    const authorUpdates = { isAuthor: true };
    if (pubUid) {
      authorUpdates.linkedPublishers = firebase.firestore.FieldValue.arrayUnion(pubUid);
    }
    db.collection("safaqat_users").doc(authorUid).update(authorUpdates).catch(() => {});
  }

  if (AppState.editingBookId) {
    db.collection("safaqat_books").doc(AppState.editingBookId).update(payload).then(() => {
      sqShowToast("تم حفظ التعديلات على الكتاب بنجاح!", "success");
      window.sqOpenBookDetail(AppState.editingBookId);
    });
  } else {
    payload.createdAt = Date.now();
    payload.views = 1;
    payload.readsCount = 1;
    payload.salesCount = 0;
    payload.downloadsCount = 0;
    payload.reviews = [];
    db.collection("safaqat_books").add(payload).then(docRef => {
      sqShowToast("تم نشر الكتاب في المتجر بنجاح!", "success");
      window.sqOpenBookDetail(docRef.id);
    });
  }
};

window.sqDeleteBook = function(bookId) {
  if (!window.sqHasPermission('manage_books')) return;
  if (!confirm("هل أنت متأكد من حذف هذا الكتاب نهائياً من المتجر؟")) return;
  db.collection("safaqat_books").doc(bookId).delete().then(() => {
    sqShowToast("تم حذف الكتاب", "warning");
    window.sqSwitchMainView('store');
  });
};

window.sqStartPostForBook = function(bookId) {
  if (!AppState.currentUser) { sqShowToast("سجل دخولك أولاً للمشاركة", "warning"); return window.sqLogin(); }
  const book = AppState.booksList.find(b => b.id === bookId); if (!book) return;
  window.sqOpenPublishModal(null, book);
};

// =========================================================
// 🛒 محرك السلة، الفواتير (SK-XXXXXX)، وتوجيه الواتساب الذكي لكل دار نشر
// =========================================================
window.sqInitCartFromStorage = function() {
  try {
    const savedCart = localStorage.getItem('sq_cart_items_v18');
    if (savedCart) AppState.cart = JSON.parse(savedCart) || [];
  } catch (e) { AppState.cart = []; }
  window.sqUpdateCartBadge();
};

window.sqSaveCartToStorage = function() {
  try { localStorage.setItem('sq_cart_items_v18', JSON.stringify(AppState.cart)); } catch (e) {}
  window.sqUpdateCartBadge();
};

window.sqUpdateCartBadge = function() {
  const totalQty = (AppState.cart || []).reduce((s, item) => s + (Number(item.qty) || 1), 0);
  const dockDot = document.getElementById('dock-cart-dot');
  if (dockDot) {
    if (totalQty > 0) { dockDot.innerText = totalQty; dockDot.style.display = 'flex'; }
    else { dockDot.style.display = 'none'; }
  }
};

window.sqAddToCart = function(bookId, qty = 1, openCartImmediately = false) {
  const book = AppState.booksList.find(b => b.id === bookId);
  if (!book) return sqShowToast("الكتاب غير متوفر حالياً", "warning");
  if (book.availability === 'out') return sqShowToast("نفدت كمية هذا الكتاب حالياً", "danger");

  window.SafaqatAI.trackSignal('book', book, 5);
  const existing = AppState.cart.find(x => x.bookId === bookId);
  if (existing) {
    existing.qty = Math.min(20, (existing.qty || 1) + qty);
  } else {
    AppState.cart.push({
      bookId: book.id,
      title: book.title,
      authorName: book.authorUid ? getRealName(book.authorUid, book.authorName) : (book.authorName || ''),
      publisherUid: book.publisherUid || 'DAR_MAIN',
      publisherName: book.publisherName || APP_NAME,
      cover: book.cover || APP_LOGO_URL,
      price: Number(book.price) || 0,
      currency: book.currency || DEFAULT_CURRENCY,
      qty: Math.max(1, qty)
    });
  }
  AppState.lastIssuedOrder = null;
  window.sqSaveCartToStorage();
  sqShowToast(`تمت إضافة "${book.title}" إلى السلة!`, "success");
  if (openCartImmediately) {
    window.sqSwitchMainView('cart_page');
  }
};

window.sqUpdateCartQty = function(bookId, delta) {
  const idx = AppState.cart.findIndex(x => x.bookId === bookId);
  if (idx < 0) return;
  AppState.cart[idx].qty = (AppState.cart[idx].qty || 1) + delta;
  if (AppState.cart[idx].qty <= 0) AppState.cart.splice(idx, 1);
  window.sqSaveCartToStorage();
  window.sqRenderCartPage();
};

window.sqClearCart = function() {
  AppState.cart = [];
  window.sqSaveCartToStorage();
  window.sqRenderCartPage();
};

window.sqListenOrders = function() {
  if (!AppState.currentUser) return;
  if (AppState.ordersUnsubscribe) AppState.ordersUnsubscribe();
  const canManageAllOrders = AppState.isAdmin || (AppState.userData.permissions || []).includes('manage_orders');
  const isPublisherAccount = Boolean(AppState.userData && AppState.userData.isPublisher);

  const ref = (canManageAllOrders || isPublisherAccount)
    ? db.collection("safaqat_orders")
    : db.collection("safaqat_orders").where("buyerUid", "==", AppState.currentUser.uid);

  AppState.ordersUnsubscribe = ref.onSnapshot(snap => {
    AppState.ordersList = [];
    snap.forEach(doc => AppState.ordersList.push({ id: doc.id, ...doc.data() }));
    AppState.ordersList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (AppState.activeMainView === 'cart_page') window.sqRenderCartPage();
    if (AppState.activeMainView === 'settings_page' && AppState.settingsSubTab === 'admin') window.sqRenderAdminDashboard();
  }, err => {});
};

window.sqRenderOrderStepper = function(statusKey) {
  if (statusKey === 'cancelled') {
    return `<div style="background:rgba(239,68,68,0.12); color:var(--danger); border:1px solid rgba(239,68,68,0.3); padding:8px 12px; border-radius:12px; font-size:12px; font-weight:800; text-align:center; margin-top:8px;"><i class="fa-solid fa-ban"></i> تم إلغاء هذا الطلب</div>`;
  }
  const curStep = (ORDER_STATUS_MAP[statusKey] && ORDER_STATUS_MAP[statusKey].step) || 1;
  const steps = [
    { s: 1, lbl: 'تمت المراجعة', ic: 'fa-file-circle-check' },
    { s: 2, lbl: 'تم التواصل', ic: 'fa-phone-volume' },
    { s: 3, lbl: 'قيد التجهيز', ic: 'fa-box-open' },
    { s: 4, lbl: 'تم الشحن', ic: 'fa-truck-fast' },
    { s: 5, lbl: 'تم التسليم', ic: 'fa-circle-check' }
  ];
  return `
    <div class="sq-order-stepper">
      ${steps.map(st => {
        const cls = st.s < curStep ? 'done' : (st.s === curStep ? 'current' : '');
        return `<div class="sq-step-node ${cls}"><i class="fa-solid ${st.ic}" style="font-size:13px;"></i><span>${st.lbl}</span></div>`;
      }).join('')}
    </div>
  `;
};

window.sqRenderCartPage = function() {
  const container = document.getElementById('sq-view-cart-page');
  if (!container) return;

  const cartItems = AppState.cart || [];
  const totalAmount = cartItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0).toFixed(2);
  const curr = (cartItems[0] && cartItems[0].currency) ? cartItems[0].currency : DEFAULT_CURRENCY;

  let issuedInvoiceBanner = '';
  if (AppState.lastIssuedOrder) {
    const ord = AppState.lastIssuedOrder;
    issuedInvoiceBanner = `
      <div class="sq-hub-card" style="background:linear-gradient(135deg,#064e3b 0%,#022c22 100%); color:#fff; border:2px solid #fbbf24;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="background:#fbbf24; color:#0f172a; font-size:11.5px; font-weight:900; padding:3px 10px; border-radius:12px;"><i class="fa-solid fa-file-circle-check"></i> تم إصدار الفاتورة بنجاح</span>
          <strong style="font-size:15px; color:#fbbf24; letter-spacing:1px;">#${escapeHtml(ord.orderCode)}</strong>
        </div>
        <p style="font-size:13.5px; line-height:1.75; color:#ecfdf5; margin-bottom:12px;">
          تم حفظ فاتورتك برقم <strong>(${escapeHtml(ord.orderCode)})</strong>. لتأكيد الطلب وبدء الشحن فوراً، اضغط الزر أدناه لإرسال الفاتورة مباشرة إلى واتساب الدار:
        </p>
        <button class="sq-btn" style="width:100%; background:#25D366!important; color:#fff!important; padding:12px!important; font-size:14px!important; box-shadow:0 8px 20px rgba(37,211,102,0.35)!important;" onclick="window.sqSendOrderToWhatsApp('${escapeHtml(ord.orderCode)}')">
          <i class="fa-brands fa-whatsapp" style="font-size:18px;"></i> تأكيد الطلب عبر واتساب الآن
        </button>
      </div>
    `;
  }

  let cartSectionHtml = '';
  if (!cartItems.length) {
    cartSectionHtml = `
      <div class="sq-hub-card" style="text-align:center; padding:35px 18px;">
        <i class="fa-solid fa-bag-shopping fa-2x" style="color:var(--accent); opacity:0.5; margin-bottom:10px;"></i><br>
        <strong style="font-size:15px;">سلة المشتريات فارغة حالياً</strong>
        <p style="font-size:12.5px; color:var(--text-muted); margin:6px 0 14px 0;">تصفح متجر الإصدارات وأضف الكتب التي ترغب باقتنائها إلى سلتك.</p>
        <button class="sq-btn sq-btn-gold" onclick="window.sqSwitchMainView('store')"><i class="fa-solid fa-store"></i> تصفح المتجر والمكتبة</button>
      </div>
    `;
  } else {
    const itemsHtml = cartItems.map(item => `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:14px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:10px; overflow:hidden; cursor:pointer;" onclick="window.sqOpenBookDetail('${item.bookId}')">
          <img src="${escapeHtml(item.cover)}" style="width:46px; height:66px; object-fit:cover; border-radius:8px; border:1px solid var(--accent); flex-shrink:0;">
          <div style="overflow:hidden;">
            <div style="font-weight:900; font-size:13.5px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.title)}</div>
            <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(item.authorName)} • ${escapeHtml(item.publisherName || APP_NAME)}</div>
            <div style="font-size:12.5px; font-weight:900; color:var(--accent); margin-top:2px;">${item.price} ${escapeHtml(item.currency)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <button class="sq-icon-btn" style="width:28px; height:28px; font-size:12px;" onclick="window.sqUpdateCartQty('${item.bookId}', -1)"><i class="fa-solid fa-minus"></i></button>
          <strong style="font-size:13.5px; min-width:20px; text-align:center;">${item.qty}</strong>
          <button class="sq-icon-btn" style="width:28px; height:28px; font-size:12px;" onclick="window.sqUpdateCartQty('${item.bookId}', 1)"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
    `).join('');

    const defName = AppState.currentUser ? getRealName(AppState.currentUser.uid, AppState.currentUser.displayName) : '';
    const defCountry = (AppState.userData && AppState.userData.nationality && COUNTRIES_MAP[AppState.userData.nationality]) ? COUNTRIES_MAP[AppState.userData.nationality].name : '';

    cartSectionHtml = `
      <div class="sq-hub-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:16px; font-weight:900;"><i class="fa-solid fa-cart-shopping" style="color:var(--accent);"></i> الكتب المختارة في سلتك (${cartItems.length})</h3>
          <button style="background:none; border:none; color:var(--danger); font-size:12px; font-weight:bold; cursor:pointer;" onclick="window.sqClearCart()"><i class="fa-solid fa-trash"></i> إفراغ السلة</button>
        </div>
        ${itemsHtml}
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--bg); border-radius:14px; border:1.5px solid var(--accent-border); margin-top:10px;">
          <span style="font-size:14px; font-weight:900;">إجمالي الفاتورة:</span>
          <strong style="font-size:18px; font-weight:900; color:var(--accent);">${totalAmount} ${escapeHtml(curr)}</strong>
        </div>
      </div>

      <div class="sq-hub-card">
        <h3 style="font-size:16px; font-weight:900; margin-bottom:6px;"><i class="fa-solid fa-file-invoice" style="color:var(--accent);"></i> بيانات إصدار الفاتورة والشحن</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">أدخل بياناتك ليتم إصدار رقم فاتورة رسمي (SK) وتوجيه الطلب مباشرة عبر واتساب الدار:</p>

        <label class="sq-field-label"><i class="fa-solid fa-user"></i> الاسم الكامل للمستلم (إلزامي):</label>
        <input type="text" id="ord-in-name" class="sq-input" value="${escapeHtml(defName)}" placeholder="الاسم الثلاثي">

        <label class="sq-field-label"><i class="fa-solid fa-phone"></i> رقم الجوال / الواتساب للتواصل (إلزامي):</label>
        <input type="tel" id="ord-in-phone" class="sq-input" placeholder="مثال: +9665XXXXXXXX أو +201XXXXXXXXX">

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label class="sq-field-label"><i class="fa-solid fa-earth-americas"></i> الدولة (إلزامي):</label>
            <input type="text" id="ord-in-country" class="sq-input" value="${escapeHtml(defCountry)}" placeholder="الدولة">
          </div>
          <div>
            <label class="sq-field-label"><i class="fa-solid fa-city"></i> المدينة / المحافظة (إلزامي):</label>
            <input type="text" id="ord-in-city" class="sq-input" placeholder="اسم المدينة">
          </div>
        </div>

        <label class="sq-field-label"><i class="fa-solid fa-location-dot"></i> العنوان التفصيلي للاستلام:</label>
        <input type="text" id="ord-in-address" class="sq-input" placeholder="الحي، الشارع، أو أقرب معلم">

        <label class="sq-field-label"><i class="fa-solid fa-comment-dots"></i> ملاحظات إضافية (اختياري):</label>
        <textarea id="ord-in-notes" class="sq-input" style="min-height:65px; resize:none;" placeholder="أي ملاحظة تخص الطلب..."></textarea>

        <button class="sq-btn sq-btn-gold" id="sq-issue-invoice-btn" style="width:100%; padding:13px!important; font-size:14.5px!important;" onclick="window.sqIssueInvoiceNow()">
          <i class="fa-solid fa-file-signature"></i> إصدار الفاتورة وتأكيد الطلب الآن
        </button>
      </div>
    `;
  }

  const myOrders = AppState.currentUser
    ? AppState.ordersList.filter(o => o.buyerUid === AppState.currentUser.uid)
    : (AppState.lastIssuedOrder ? [AppState.lastIssuedOrder] : []);

  const myOrdersHtml = myOrders.length ? myOrders.map(ord => {
    const stObj = ORDER_STATUS_MAP[ord.status || 'pending_review'] || ORDER_STATUS_MAP.pending_review;
    const booksSummary = (ord.items || []).map(i => `${i.title} (×${i.qty})`).join(' ، ');
    return `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; padding:14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
          <div>
            <strong style="font-size:14.5px; color:var(--text-main);">طلب رقم: #${escapeHtml(ord.orderCode)}</strong>
            <span style="font-size:11px; color:var(--text-muted); margin-right:6px;">${sqFormatRelativeTime(ord.createdAt)}</span>
          </div>
          <span class="sq-order-status-badge" style="background:${stObj.color}20; color:${stObj.color}; border:1px solid ${stObj.color}50;">
            <i class="fa-solid ${stObj.icon}"></i> ${stObj.label}
          </span>
        </div>
        <div style="font-size:12.5px; color:var(--text-main); font-weight:700; margin-bottom:4px;">الكتب: ${escapeHtml(booksSummary)}</div>
        <div style="font-size:12px; color:var(--text-muted);">الإجمالي: <strong style="color:var(--accent);">${ord.totalAmount} ${escapeHtml(ord.currency || DEFAULT_CURRENCY)}</strong> • العنوان: ${escapeHtml(ord.country)} - ${escapeHtml(ord.city)}</div>
        ${window.sqRenderOrderStepper(ord.status || 'pending_review')}
        ${ord.adminNote ? `<div style="background:var(--card); border-right:3px solid var(--accent); padding:7px 10px; border-radius:8px; font-size:12px; margin-top:6px;"><strong>ملاحظة قسم المبيعات:</strong> ${escapeHtml(ord.adminNote)}</div>` : ''}
        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
          <button class="sq-btn" style="background:#25D366!important; color:#fff!important; padding:6px 12px!important; font-size:11.5px!important;" onclick="window.sqSendOrderToWhatsApp('${escapeHtml(ord.orderCode)}')">
            <i class="fa-brands fa-whatsapp"></i> تأكيد / متابعة عبر واتساب الدار
          </button>
        </div>
      </div>
    `;
  }).join('') : `<p style="text-align:center; padding:18px; color:var(--text-muted); font-size:13px;">لا توجد فواتير سابقة مسجلة في حسابك.</p>`;

  container.innerHTML = `
    <div class="sq-inpage-topbar">
      <div class="sq-inpage-title"><i class="fa-solid fa-bag-shopping" style="color:var(--accent);"></i> السلة والفواتير وتتبع الطلبات</div>
      <button class="sq-back-pill" onclick="window.sqSwitchMainView('store')"><i class="fa-solid fa-arrow-left"></i> المتجر</button>
    </div>
    ${issuedInvoiceBanner}
    ${cartSectionHtml}
    <div class="sq-hub-card">
      <h3 style="font-size:16px; font-weight:900; margin-bottom:10px;"><i class="fa-solid fa-truck-fast" style="color:var(--accent);"></i> سجل طلباتي وتتبع حالة الشحن (${myOrders.length})</h3>
      ${myOrdersHtml}
    </div>
  `;
};

window.sqIssueInvoiceNow = async function() {
  if (!AppState.cart || !AppState.cart.length) return sqShowToast("السلة فارغة", "warning");
  const buyerName = (document.getElementById('ord-in-name')?.value || '').trim();
  const buyerPhone = (document.getElementById('ord-in-phone')?.value || '').trim();
  const country = (document.getElementById('ord-in-country')?.value || '').trim();
  const city = (document.getElementById('ord-in-city')?.value || '').trim();
  const address = (document.getElementById('ord-in-address')?.value || '').trim();
  const notes = (document.getElementById('ord-in-notes')?.value || '').trim();

  if (!buyerName || !buyerPhone || !country || !city) {
    return sqShowToast("يرجى تعبئة الاسم، رقم التواصل، الدولة، والمدينة لإصدار الفاتورة", "warning");
  }

  const btn = document.getElementById('sq-issue-invoice-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إصدار الفاتورة...'; }

  const randomSix = Math.floor(100000 + Math.random() * 900000);
  const orderCode = `SK-${randomSix}`;
  const itemsCopy = [...AppState.cart];
  const totalAmount = itemsCopy.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.qty) || 1)), 0).toFixed(2);
  const curr = (itemsCopy[0] && itemsCopy[0].currency) ? itemsCopy[0].currency : DEFAULT_CURRENCY;
  const publisherUids = Array.from(new Set(itemsCopy.map(i => i.publisherUid || 'DAR_MAIN')));

  const orderPayload = {
    orderCode: orderCode,
    buyerUid: AppState.currentUser ? AppState.currentUser.uid : 'GUEST',
    buyerName: buyerName,
    buyerPhone: buyerPhone,
    country: country,
    city: city,
    address: address,
    notes: notes,
    items: itemsCopy,
    publisherUids: publisherUids,
    totalAmount: Number(totalAmount),
    currency: curr,
    status: 'pending_review',
    adminNote: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await db.collection("safaqat_orders").add(orderPayload);
    itemsCopy.forEach(item => {
      if (item.bookId) {
        db.collection("safaqat_books").doc(item.bookId).update({ salesCount: firebase.firestore.FieldValue.increment(Number(item.qty) || 1) }).catch(() => {});
      }
    });
    AppState.lastIssuedOrder = orderPayload;
    AppState.cart = [];
    window.sqSaveCartToStorage();
    window.sqRenderCartPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    sqShowToast(`تم إصدار الفاتورة رقم ${orderCode} بنجاح!`, "success");
    setTimeout(() => window.sqSendOrderToWhatsApp(orderCode), 450);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-signature"></i> إصدار الفاتورة وتأكيد الطلب الآن'; }
    sqShowToast("تعذر حفظ الفاتورة، يرجى التحقق من اتصال الإنترنت", "danger");
  }
};

// توجيه الفاتورة تلقائياً إلى واتساب دار النشر صاحبة الكتاب أو واتساب الدار الرئيسي
window.sqSendOrderToWhatsApp = function(orderCode) {
  const ord = (AppState.ordersList || []).find(o => o.orderCode === orderCode) || AppState.lastIssuedOrder;
  if (!ord) return;

  let targetWhatsapp = DAR_WHATSAPP_NUMBER || '+201016327947';
  let targetDarName = APP_NAME;

  const firstItemPubUid = (ord.items && ord.items[0] && ord.items[0].publisherUid) ? ord.items[0].publisherUid : 'DAR_MAIN';
  if (firstItemPubUid && firstItemPubUid !== 'DAR_MAIN' && AppState.allUsers[firstItemPubUid]) {
    const pubUser = AppState.allUsers[firstItemPubUid];
    if (pubUser.publisherWhatsapp && pubUser.publisherWhatsapp.trim().length >= 7) {
      targetWhatsapp = pubUser.publisherWhatsapp.trim();
      targetDarName = getRealName(firstItemPubUid, pubUser.displayName);
    }
  }

  const cleanPhone = targetWhatsapp.replace(/[^0-9]/g, '');
  const booksLines = (ord.items || []).map((it, idx) => `${idx + 1}. ${it.title} — العدد: (${it.qty}) — السعر: ${it.price} ${it.currency || DEFAULT_CURRENCY}`).join('\n');

  const msg = `مرحباً إدارة *${targetDarName}*، أود تأكيد فاتورة طلبي:
*رقم الطلب:* #${ord.orderCode}
*الاسم:* ${ord.buyerName}
*رقم التواصل:* ${ord.buyerPhone}
*الدولة والمدينة:* ${ord.country} - ${ord.city}
*العنوان:* ${ord.address || 'غير محدد'}

*الكتب المطلوبة:*
${booksLines}

*الإجمالي:* ${ord.totalAmount} ${ord.currency || DEFAULT_CURRENCY}
${ord.notes ? `*ملاحظات:* ${ord.notes}` : ''}`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
};
