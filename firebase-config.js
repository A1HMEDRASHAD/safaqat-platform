/**
 * ============================================================================
 * منصة صفقات كتابية - Safaqat Kitabiya Platform
 * الملف الأول: firebase-config.js (القلب السحابي، التخزين المؤقت، والإعدادات المرنة)
 * الإصدار: 2.0 Enterprise Edition (كود كامل غير مختصر)
 * ============================================================================
 */

'use strict';

// ============================================================================
// 1. مفاتيح الاتصال بمشروعك في Google Firebase
// تنبيه هام: استبدل القيم التالية بمفاتيح مشروعك الحقيقية الموجودة لديك حالياً
// ============================================================================
const firebaseConfig = {
    apiKey: " ضع_مفتاح_API_الخاص_بك_هنا ",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ============================================================================
// 2. التهيئة الآمنة لخدمات Firebase (Firestore & Auth)
// ============================================================================
let appInstance = null;
let db = null;
let auth = null;
let googleProvider = null;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            appInstance = firebase.initializeApp(firebaseConfig);
        } else {
            appInstance = firebase.app();
        }

        // تهيئة قاعدة البيانات السحابية Firestore
        db = firebase.firestore();

        // ضبط إعدادات التخزين المؤقت غير المحدود لدعم العمل بدون إنترنت (Offline First & PWA)
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            merge: true
        });

        // تفعيل التخزين المحلي المتزامن عبر التبويبات (IndexedDB Persistence)
        db.enablePersistence({ synchronizeTabs: true })
            .then(() => {
                console.log("✅ [Safaqat DB]: تم تفعيل التخزين المؤقت للعمل بدون إنترنت بنجاح.");
            })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn("⚠️ [Safaqat DB]: التخزين المؤقت يعمل في تبويب آخر مفتوح حالياً.");
                } else if (err.code === 'unimplemented') {
                    console.warn("⚠️ [Safaqat DB]: المتصفح الحالي لا يدعم التخزين المؤقت المتقدم.");
                }
            });

        // تهيئة نظام المصادقة والحسابات
        auth = firebase.auth();
        auth.languageCode = 'ar';

        // بقاء الجلسة محفوظة محلياً حتى بعد إغلاق التطبيق أو المتصفح
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((err) => {
            console.warn("⚠️ [Safaqat Auth]: تعذر ضبط استمرارية الجلسة المحلية:", err);
        });

        // إعداد مزود تسجيل الدخول عبر Google
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.setCustomParameters({
            prompt: 'select_account'
        });

        console.log("🚀 [Safaqat Cloud]: تم الاتصال بقاعدة بيانات صفقات كتابية السحابية بنجاح.");
    } else {
        console.error("❌ [Safaqat Error]: مكتبة Firebase غير محملة في ملف index.html!");
    }
} catch (initError) {
    console.error("❌ [Safaqat Critical]: خطأ أثناء تهيئة الاتصال السحابي:", initError);
}

// ============================================================================
// 3. سجل المجموعات الموحد في قاعدة البيانات (Collections Registry)
// ============================================================================
const SAFAQAT_COLLECTIONS = Object.freeze({
    SETTINGS: 'platform_settings',       // إعدادات المنصة العامة والمرنة
    BOOKS: 'books',                      // الكتب (ورقية، رقمية، مخزون، روابط مباشرة)
    USERS: 'users',                      // حسابات الأعضاء، مكتبتي، تقدم القراءة، والاشتراكات
    PUBLISHERS: 'publishers',            // دور النشر وإعدادات عملاتها المرنة
    POSTS: 'community_posts',            // منشورات المجتمع الأدبي المرتبطة بالكتب
    COMMENTS: 'community_comments',      // التعليقات والردود التفاعلية
    NOTIFICATIONS: 'notifications',      // الإشعارات الذكية مع التوجيه المباشر (Deep Linking)
    ORDERS: 'orders',                    // فواتير وطلبات النسخ الورقية والرقمية
    SUBSCRIPTIONS: 'vip_subscriptions',  // سجلات المشتركين في الباقة الشهرية
    BOOKMARKS: 'reader_bookmarks'        // علامات الحفظ المرجعية وتقدم القارئ الآمن
});

// ============================================================================
// 4. التكوين الافتراضي المرن والشامل للمنصة (Default Flexible Platform Config)
// يضمن عمل المنصة بأمان تام ويتزامن مع لوحة تحكم الإدارة لحظياً
// ============================================================================
const DEFAULT_PLATFORM_CONFIG = {
    // أ) نظام التحكم المرن بشعار وهوية الموقع (3 أوضاع احترافية)
    branding: {
        // الأوضاع المتاحة:
        // 'official_template' : القالب الرسمي (الأيقونة + النص + الشعار الفرعي)
        // 'full_custom_logo'  : إخفاء النص والأيقونة وعرض صورة شعار مفرغ كامل
        // 'custom_icon_only'  : الإبقاء على النص الرسمي مع تغيير صورة الأيقونة فقط
        logoMode: 'official_template',
        siteTitle: 'صفقات كتابية',
        siteSubtitle: 'متجر الكتب والمجتمع الأدبي',
        customFullLogoUrl: '',           // رابط الشعار المفرغ الكامل (PNG/SVG)
        customIconUrl: '',               // رابط الأيقونة المخصصة وحدها
        logoHeightPx: 44,                // ارتفاع الشعار بالبكسل للتحكم المرن بالمقاس
        officialWhatsappNumber: '966500000000' // رقم واتساب الإدارة/المبيعات للنسخ الورقية
    },

    // ب) سياسة التطبيق وحماية الملكية الفكرية للكتب الرقمية (DRM & App Strategy)
    appProtection: {
        googlePlayStoreUrl: 'https://play.google.com/store/apps', // يظهر كأيقونة أنيقة في الهيدر
        showPlayStoreIconInHeader: true,   // إظهار أو إخفاء شعار متجر بلاي الصغير في الهيدر
        restrictDigitalBooksToApp: true,   // منع قراءة أو شراء النسخ الرقمية من الويب وتحويلهم للتطبيق
        requireAccountForLibrary: true,    // حصر القراءة ومكتبتي على الأعضاء المسجلين فقط
        disableFreePdfDownloads: true,     // إلغاء التحميل المجاني المفتوح وحصر القراءة بالقارئ المحمي
        isRunningInsideAndroidApp: false   // يتم كشفه تلقائياً إذا فتح المستخدم من داخل التطبيق
    },

    // ج) النموذج التجاري المزدوج وبوابات الدفع (Google Play Billing & Subscriptions)
    monetization: {
        enableIndividualBookSales: true,   // بيع كل نسخة رقمية بسعر منفصل (أسلوب أمازون وجوجل)
        enableVipSubscription: true,       // تفعيل باقة الاشتراك الشهري الشامل لقراءة الكتب الرقمية
        vipPlanName: 'باقة القارئ الشغوف (VIP)',
        vipMonthlyPriceSAR: 29.99,         // سعر الاشتراك الشهري بالعملة الأساسية
        vipPlanFeatures: [
            'قراءة غير محدودة لجميع الكتب والروايات الرقمية المشمولة',
            'تخزين مؤقت ذكي للقراءة بدون اتصال بالإنترنت عبر التطبيق',
            'حفظ تلقائي لآخر صفحة (Auto-Jump) وعلامات مرجعية غير محدودة',
            'تصفح خالٍ تماماً من الإعلانات داخل المنصة والمجتمع'
        ],
        // إعدادات الربط مع Google Play Billing (تُملأ من لوحة التحكم لاحقاً بدون تعديل الكود)
        googlePlayBilling: {
            enabled: false,
            publicKeyBase64: '',           // مفتاح الترخيص العام من Google Play Console
            vipMonthlyProductId: 'safaqat_vip_monthly_sub', // معرف باقة الاشتراك في جوجل بلاي
            bookSkuPrefix: 'safaqat_ebook_' // البادئة الخاصة بمعرفات الكتب الرقمية
        },
        // إعدادات بوابة الدفع الخارجية للبطاقات (Stripe / PayTabs / Tap) مستقبلاً
        externalPaymentGateway: {
            enabled: false,
            providerName: 'PayTabs',
            publicApiKey: '',
            secretApiKey: '',
            allowCashOnDeliveryForPrint: true // الدفع عند الاستلام للنسخ الورقية
        }
    },

    // د) خوارزمية إعلانات Google AdMob النظيفة ولوحة التحكم المرنة بها
    admobConfig: {
        enabled: false,                    // زر تشغيل/إيقاف الإعلانات بالكامل من لوحة الإدارة
        publisherId: '',                   // معرف الناشر: ca-app-pub-XXXXXXXXXXXXXXXX
        nativeAdUnitId: '',                // معرف وحدة الإعلانات المدمجة الأفقية الشفافة
        bannerAdUnitId: '',                // معرف وحدة البانر الخفيف
        densityMode: 'balanced',           // الكثافة: 'light' (خفيف) | 'balanced' (متوازن) | 'intensive' (مكثف)
        postsInterval: 6,                  // عرض بطاقة إعلانية شفافة بعد كل X منشورات في المجتمع
        booksInterval: 8,                  // عرض بطاقة إعلانية بعد كل X كتب في المتجر
        allowUserDismiss: true,            // السماح للمستخدم بإغلاق الإعلان فوراً عبر زر (×)
        showInCommunity: true,
        showInStore: true,
        hideForVipSubscribers: true        // إخفاء الإعلانات تلقائياً للمشتركين في الباقة الشهرية
    },

    // هـ) نظام العملات المرن للمنصة ودور النشر (Flexible Multi-Currency Engine)
    currencySystem: {
        baseCurrency: 'SAR',               // العملة الأساسية للمنصة
        allowPublishersCustomCurrency: true, // السماح لكل دار نشر بتحديد عملتها وأسعارها المرنة
        supportedCurrencies: {
            SAR: { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي', rateFromSAR: 1.00, enabled: true },
            USD: { code: 'USD', symbol: '$', name: 'دولار أمريكي', rateFromSAR: 0.27, enabled: true },
            EGP: { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري', rateFromSAR: 13.05, enabled: true },
            YER: { code: 'YER', symbol: 'ر.ي', name: 'ريال يمني', rateFromSAR: 140.00, enabled: true },
            AED: { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي', rateFromSAR: 0.98, enabled: true }
        }
    },

    // و) إعدادات المساعد الذكي "راوي" (إما ذكي وفعال ومرتبط بقاعدة البيانات أو يتم إيقافه)
    rawiAssistant: {
        enabled: true,                     // يمكن للإدارة إيقافه نهائياً بضغطة زر إذا لم ترغب به
        assistantName: 'راوي (المستشار الأدبي الذكي)',
        welcomeMessage: 'أهلاً بك في صفقات كتابية! أنا "راوي"، متصل بقاعدة بيانات المتجر والمجتمع لأرشح لك روايات تناسب ذوقك، أو أبحث لك عن أي كتاب أو كاتب فوراً.',
        enableLiveStoreSearch: true,       // يبحث فعلياً داخل الكتب الموجودة في قاعدة البيانات
        enablePersonalizedRecommendations: true
    }
};

// ============================================================================
// 5. مدير الحالة السحابية والعمليات المساعدة (Safaqat Cloud & State Manager)
// ============================================================================
window.SafaqatConfig = {
    collections: SAFAQAT_COLLECTIONS,
    defaults: DEFAULT_PLATFORM_CONFIG,
    liveSettings: JSON.parse(JSON.stringify(DEFAULT_PLATFORM_CONFIG)),
    currentUserCurrency: localStorage.getItem('safaqat_preferred_currency') || 'SAR',
    settingsListeners: [],

    /**
     * التحقق مما إذا كان المستخدم يتصفح من داخل تطبيق الأندرويد المحمي أو من متصفح ويب عادي
     */
    isAndroidAppEnvironment: function () {
        const ua = navigator.userAgent || '';
        const urlParams = new URLSearchParams(window.location.search);
        // يدعم الكشف التلقائي عن WebView أو TWA أو باراميتر التطبيق الرسمي
        return (
            window.SafaqatNativeBridge !== undefined ||
            ua.includes('SafaqatApp') ||
            ua.includes('; wv)') ||
            urlParams.get('source') === 'android_app' ||
            localStorage.getItem('safaqat_app_mode') === 'native_android'
        );
    },

    /**
     * تحميل ومزامنة إعدادات المنصة من Firestore لحظياً مع دمج آمن للقيم الافتراضية
     */
    initLiveSettingsSync: function (onUpdateCallback) {
        if (typeof onUpdateCallback === 'function') {
            this.settingsListeners.push(onUpdateCallback);
        }

        if (!db) {
            this.notifySettingsListeners();
            return;
        }

        db.collection(SAFAQAT_COLLECTIONS.SETTINGS)
            .doc('global_config')
            .onSnapshot((docSnapshot) => {
                if (docSnapshot.exists) {
                    const cloudData = docSnapshot.data();
                    this.liveSettings = this.deepMerge(
                        JSON.parse(JSON.stringify(DEFAULT_PLATFORM_CONFIG)),
                        cloudData
                    );
                } else {
                    // إنشاء وثيقة الإعدادات الافتراضية لأول مرة إذا لم تكن موجودة
                    db.collection(SAFAQAT_COLLECTIONS.SETTINGS)
                        .doc('global_config')
                        .set(DEFAULT_PLATFORM_CONFIG, { merge: true })
                        .catch((e) => console.warn("⚠️ تعذر إنشاء الإعدادات الافتراضية تلقائياً:", e));
                }
                this.notifySettingsListeners();
            }, (error) => {
                console.warn("⚠️ [Settings Sync]: استخدام الإعدادات المخزنة محلياً:", error);
                this.notifySettingsListeners();
            });
    },

    /**
     * إشعار جميع أجزاء الواجهة عند تحديث الإعدادات من لوحة التحكم
     */
    notifySettingsListeners: function () {
        this.settingsListeners.forEach((cb) => {
            try {
                cb(this.liveSettings);
            } catch (err) {
                console.error("Error in settings listener:", err);
            }
        });
    },

    /**
     * حفظ التعديلات الجديدة من لوحة تحكم الإدارة إلى السحابة مباشرة
     */
    savePlatformSettings: async function (newPartialSettings) {
        this.liveSettings = this.deepMerge(this.liveSettings, newPartialSettings);
        if (!db) throw new Error("قاعدة البيانات غير متصلة");
        await db.collection(SAFAQAT_COLLECTIONS.SETTINGS)
            .doc('global_config')
            .set(this.liveSettings, { merge: true });
        return this.liveSettings;
    },

    /**
     * محول العملات الذكي والمرن (يدعم الأسعار المخصصة للكتاب أو التحويل التلقائي)
     */
    formatBookPrice: function (bookObject, priceType = 'paper') {
        const targetCurr = this.currentUserCurrency || this.liveSettings.currencySystem.baseCurrency || 'SAR';
        const currenciesMap = this.liveSettings.currencySystem.supportedCurrencies || {};
        const currInfo = currenciesMap[targetCurr] || { symbol: 'ر.س', rateFromSAR: 1 };

        // تحديد السعر الأساسي المطلوب (ورقي أم رقمي)
        let basePriceSAR = 0;
        if (priceType === 'digital') {
            // إذا كان للكتاب تسعير مخصص لهذه العملة في النسخة الرقمية
            if (bookObject.customDigitalPrices && bookObject.customDigitalPrices[targetCurr]) {
                return `${Number(bookObject.customDigitalPrices[targetCurr]).toFixed(2)} ${currInfo.symbol}`;
            }
            basePriceSAR = parseFloat(bookObject.digitalPrice ?? bookObject.price ?? 0);
        } else {
            // إذا كان للكتاب تسعير مخصص لهذه العملة في النسخة الورقية
            if (bookObject.customPaperPrices && bookObject.customPaperPrices[targetCurr]) {
                return `${Number(bookObject.customPaperPrices[targetCurr]).toFixed(2)} ${currInfo.symbol}`;
            }
            basePriceSAR = parseFloat(bookObject.paperPrice ?? bookObject.price ?? 0);
        }

        if (isNaN(basePriceSAR) || basePriceSAR <= 0) {
            return 'مشمول بالباقة';
        }

        const converted = basePriceSAR * (parseFloat(currInfo.rateFromSAR) || 1);
        // تقريب أنيق للعملات الكبيرة مثل الريال اليمني أو الجنيه
        const formattedNumber = converted >= 100 ? Math.round(converted) : converted.toFixed(2);
        return `${formattedNumber} ${currInfo.symbol}`;
    },

    /**
     * تغيير عملة المستخدم المفضلة (يُستدعى من صفحة الملف الشخصي / الإعدادات)
     */
    setUserPreferredCurrency: async function (currencyCode, currentUserId = null) {
        if (!this.liveSettings.currencySystem.supportedCurrencies[currencyCode]) return false;
        this.currentUserCurrency = currencyCode;
        localStorage.setItem('safaqat_preferred_currency', currencyCode);

        if (currentUserId && db) {
            try {
                await db.collection(SAFAQAT_COLLECTIONS.USERS).doc(currentUserId).set({
                    preferredCurrency: currencyCode,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (e) {
                console.warn("تم حفظ العملة محلياً فقط:", e);
            }
        }
        this.notifySettingsListeners();
        return true;
    },

    /**
     * دالة مساعدة لدمج الكائنات المتداخلة بعمق دون فقدان أي خصائص
     */
    deepMerge: function (target, source) {
        if (typeof target !== 'object' || target === null) return source;
        if (typeof source !== 'object' || source === null) return target;
        const output = Array.isArray(target) ? [...target] : { ...target };
        Object.keys(source).forEach((key) => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = this.deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
        return output;
    }
};

// ============================================================================
// 6. نظام المصادقة الذكي مع Google والبريد (يدعم الويب وتطبيق الأندرويد)
// ============================================================================
window.SafaqatAuthHelper = {
    /**
     * تسجيل الدخول بحساب Google مع معالجة ذكية لنوافذ المتصفح والـ WebView
     */
    signInWithGoogleSmart: async function () {
        if (!auth || !googleProvider) {
            throw new Error("خدمة المصادقة غير مهيأة حالياً.");
        }
        try {
            // المحاولة الأولى عبر النافذة المنبثقة السريعة
            const result = await auth.signInWithPopup(googleProvider);
            return result.user;
        } catch (popupError) {
            // إذا كان المتصفح أو التطبيق يمنع النوافذ المنبثقة، نتحول تلقائياً للتوجيه المباشر
            if (
                popupError.code === 'auth/popup-blocked' ||
                popupError.code === 'auth/operation-not-supported-in-this-environment'
            ) {
                await auth.signInWithRedirect(googleProvider);
                return null;
            }
            throw popupError;
        }
    }
};

// تصدير المتغيرات العامة لتكون متاحة فوراً لملف المحرك app.js
window.db = db;
window.auth = auth;
window.googleProvider = googleProvider;
window.SAFAQAT_COLLECTIONS = SAFAQAT_COLLECTIONS;
