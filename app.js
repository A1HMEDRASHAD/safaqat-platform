/**
 * ============================================================================
 * منصة صفقات كتابية - Safaqat Kitabiya Platform
 * الملف الرابع: app.js - المحرك البرمجي الشامل
 * [ الجزء الأول 1/6 ]: النواة، الهوية المرنة، الحسابات، العملات، والمساعد الذكي "راوي"
 * الإصدار: 2.0 Enterprise Edition (كود كامل غير مختصر)
 * ============================================================================
 */

'use strict';

window.SafaqatApp = {
    // ========================================================================
    // 1. الحالة المركزية للمنصة (Central Application State)
    // ========================================================================
    state: {
        isInitialized: false,
        currentView: 'store',
        theme: localStorage.getItem('safaqat_theme') || 'dark',
        currentUser: null,
        userProfile: null,
        isAdmin: false,

        // البيانات السحابية المتزامنة
        books: [],
        publishers: [],
        posts: [],
        notifications: [],

        // سلة المشتريات للنسخ الورقية
        cart: JSON.parse(localStorage.getItem('safaqat_paper_cart') || '[]'),

        // فلاتر المتجر والمجتمع
        storeFilters: {
            search: '',
            tab: 'all',
            category: 'all',
            publisherId: 'all'
        },
        communityFilter: 'all',
        adminActiveTab: 'books',

        // حالة القارئ الآمن المحمي (DRM Reader State)
        reader: {
            activeBook: null,
            pdfDoc: null,
            currentPage: 1,
            totalPages: 1,
            scale: 1.35,
            fontSize: 1.25,
            isRendering: false,
            pendingPage: null,
            bookmarks: []
        },

        // سجل الإعلانات التي أغلقها المستخدم في الجلسة الحالية
        dismissedAdSlots: new Set(),

        // مراجع إلغاء الاشتراكات اللحظية (Firestore Unsubscribers)
        unsubscribers: {
            books: null,
            publishers: null,
            posts: null,
            notifications: null,
            userDoc: null
        }
    },

    // ========================================================================
    // 2. نقطة الانطلاق الرئيسية للمنصة (Main Bootstrapper)
    // ========================================================================
    init: function () {
        if (this.state.isInitialized) return;
        this.state.isInitialized = true;

        console.log("🚀 [Safaqat Engine]: جاري تشغيل المحرك البرمجي لمنصة صفقات كتابية...");

        // 1. تهيئة المظهر اللوني (داكن / نهاري)
        this.initTheme();

        // 2. ربط أزرار التنقل الرئيسية والهيدر
        this.bindGlobalNavigation();

        // 3. مزامنة إعدادات المنصة الحية (الشعار، العملات، الإعلانات، راوي، الدفع)
        if (window.SafaqatConfig) {
            window.SafaqatConfig.initLiveSettingsSync((liveSettings) => {
                this.onPlatformSettingsUpdated(liveSettings);
            });
        }

        // 4. تشغيل مستمع الحسابات والمصادقة
        this.initAuthListener();

        // 5. تشغيل محرك المتجر والكتب ودور النشر (يتم استدعاؤه من الجزء الثاني)
        if (typeof this.initStoreEngine === 'function') {
            this.initStoreEngine();
        }

        // 6. تشغيل محرك السلة الورقية (يتم استدعاؤه من الجزء الثالث)
        if (typeof this.initShoppingCartEngine === 'function') {
            this.initShoppingCartEngine();
        }

        // 7. تشغيل محرك المجتمع الأدبي والإشعارات الذكية (يتم استدعاؤه من الجزء الرابع)
        if (typeof this.initCommunityAndNotificationsEngine === 'function') {
            this.initCommunityAndNotificationsEngine();
        }

        // 8. تشغيل محرك القارئ الآمن ومكتبتي (يتم استدعاؤه من الجزء الخامس)
        if (typeof this.initProtectedReaderEngine === 'function') {
            this.initProtectedReaderEngine();
        }

        // 9. تشغيل المساعد الذكي "راوي"
        this.initRawiAssistant();

        // تحديث واجهة الملف الشخصي المبدئية
        this.renderProfileAuthCard();
        this.renderProfileCurrencySelector();
        this.renderProfileVipCard();
    },

    // ========================================================================
    // 3. إدارة المظهر، التنقل بين الأقسام، والتنبيهات الفورية (UI & Toasts)
    // ========================================================================
    initTheme: function () {
        const savedTheme = this.state.theme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        const themeBtn = document.getElementById('btn-theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
                this.state.theme = nextTheme;
                localStorage.setItem('safaqat_theme', nextTheme);
                document.documentElement.setAttribute('data-theme', nextTheme);
                this.updateThemeIcon(nextTheme);
                this.showToast(nextTheme === 'dark' ? '🌙 تم تفعيل الوضع الليلي الفاخر' : '☀️ تم تفعيل الوضع النهاري الأنيق');
            });
        }
    },

    updateThemeIcon: function (theme) {
        const iconEl = document.getElementById('theme-toggle-icon');
        if (!iconEl) return;
        iconEl.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    },

    bindGlobalNavigation: function () {
        const navButtons = document.querySelectorAll('.bottom-nav-item[data-nav-target]');
        navButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetView = btn.getAttribute('data-nav-target');
                this.switchMainView(targetView);
            });
        });
    },

    switchMainView: function (viewName) {
        const validViews = ['store', 'community', 'library', 'profile', 'admin'];
        if (!validViews.includes(viewName)) viewName = 'store';

        // حماية قسم الإدارة لغير المديرين
        if (viewName === 'admin' && !this.state.isAdmin) {
            this.showToast('⚠️ غرفة القيادة مخصصة لإدارة المنصة فقط');
            return;
        }

        this.state.currentView = viewName;

        // إخفاء جميع الأقسام وإظهار القسم المطلوب
        document.querySelectorAll('.app-view-section').forEach((sec) => {
            sec.classList.add('hidden');
        });
        const activeSection = document.getElementById(`view-${viewName}`);
        if (activeSection) {
            activeSection.classList.remove('hidden');
        }

        // تحديث حالة أزرار الشريط الزجاجي السفلي
        document.querySelectorAll('.bottom-nav-item[data-nav-target]').forEach((btn) => {
            const isMatch = btn.getAttribute('data-nav-target') === viewName;
            btn.classList.toggle('active', isMatch);
        });

        // إجراءات خاصة عند فتح كل قسم
        if (viewName === 'library' && typeof this.renderUserDigitalLibrary === 'function') {
            this.renderUserDigitalLibrary();
        } else if (viewName === 'profile') {
            this.renderProfileAuthCard();
            this.renderProfileCurrencySelector();
            this.renderProfileVipCard();
            if (typeof this.renderUserReadingProgressSummary === 'function') {
                this.renderUserReadingProgressSummary();
            }
        } else if (viewName === 'admin' && typeof this.renderAdminControlHub === 'function') {
            this.renderAdminControlHub();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showToast: function (message, duration = 3200) {
        const container = document.getElementById('safaqat-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'safaqat-toast';
        toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 260);
        }, duration);
    },

    escapeHtml: function (str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // ========================================================================
    // 4. تطبيق الشعار المرن (3 أوضاع) + زر متجر جوجل بلاي في الهيدر
    // ========================================================================
    onPlatformSettingsUpdated: function (settings) {
        if (!settings) return;

        // 1. تحديث الهوية البصرية والشعار المرن
        this.applyFlexibleBranding(settings.branding || {});

        // 2. تحديث زر متجر جوجل بلاي المصغر في الهيدر وبوابة التطبيق
        this.applyAppProtectionAndHeaderLink(settings.appProtection || {});

        // 3. تحديث حالة المساعد الذكي "راوي" (تفعيل أو إيقاف فوري)
        this.applyRawiSettings(settings.rawiAssistant || {});

        // 4. تحديث محول العملات وبطاقة VIP في الملف الشخصي
        this.renderProfileCurrencySelector();
        this.renderProfileVipCard();

        // 5. إعادة رسم المتجر والمجتمع لتطبيق تغييرات العملة أو كثافة إعلانات AdMob
        if (typeof this.renderStoreBooksGrid === 'function') {
            this.renderStoreBooksGrid();
        }
        if (typeof this.renderCommunityFeed === 'function') {
            this.renderCommunityFeed();
        }
    },

    applyFlexibleBranding: function (branding) {
        const mode = branding.logoMode || 'official_template';
        const siteTitle = branding.siteTitle || 'صفقات كتابية';
        const siteSubtitle = branding.siteSubtitle || 'متجر الكتب والمجتمع الأدبي';
        const fullLogoUrl = (branding.customFullLogoUrl || '').trim();
        const customIconUrl = (branding.customIconUrl || '').trim();
        const logoHeight = parseInt(branding.logoHeightPx, 10) || 44;

        const iconContainer = document.getElementById('brand-icon-container');
        const defaultIcon = document.getElementById('brand-default-icon');
        const customIconImg = document.getElementById('brand-custom-icon-img');
        const textContainer = document.getElementById('brand-text-container');
        const titleText = document.getElementById('brand-title-text');
        const subtitleText = document.getElementById('brand-subtitle-text');
        const fullLogoImg = document.getElementById('brand-full-logo-img');

        if (titleText) titleText.textContent = siteTitle;
        if (subtitleText) subtitleText.textContent = siteSubtitle;
        document.title = `${siteTitle} | ${siteSubtitle}`;

        // الوضع الثاني: شعار مفرغ كامل (يخفي الأيقونة والنص ويعرض الشعار الكامل)
        if (mode === 'full_custom_logo' && fullLogoUrl) {
            if (iconContainer) iconContainer.classList.add('hidden');
            if (textContainer) textContainer.classList.add('hidden');
            if (fullLogoImg) {
                fullLogoImg.src = fullLogoUrl;
                fullLogoImg.style.maxHeight = `${logoHeight}px`;
                fullLogoImg.classList.remove('hidden');
            }
            return;
        }

        // إخفاء الشعار الكامل في الوضعين الأول والثالث
        if (fullLogoImg) fullLogoImg.classList.add('hidden');
        if (iconContainer) iconContainer.classList.remove('hidden');
        if (textContainer) textContainer.classList.remove('hidden');

        // الوضع الثالث: تغيير الأيقونة وحدها مع بقاء النص الرسمي
        if (mode === 'custom_icon_only' && customIconUrl) {
            if (defaultIcon) defaultIcon.classList.add('hidden');
            if (customIconImg) {
                customIconImg.src = customIconUrl;
                customIconImg.classList.remove('hidden');
            }
        } else {
            // الوضع الأول: القالب الرسمي الافتراضي
            if (customIconImg) customIconImg.classList.add('hidden');
            if (defaultIcon) defaultIcon.classList.remove('hidden');
        }
    },

    applyAppProtectionAndHeaderLink: function (appProtection) {
        const playUrl = (appProtection.googlePlayStoreUrl || 'https://play.google.com/store/apps').trim();
        const showHeaderBtn = appProtection.showPlayStoreIconInHeader !== false;

        const headerPlayLink = document.getElementById('header-playstore-link');
        const modalPlayLink = document.getElementById('modal-playstore-direct-link');

        if (headerPlayLink) {
            headerPlayLink.href = playUrl;
            // إذا كان المستخدم يفتح المنصة من داخل تطبيق الأندرويد نفسه، لا داعي لإظهار زر تحميل التطبيق
            const isInsideApp = window.SafaqatConfig && window.SafaqatConfig.isAndroidAppEnvironment();
            headerPlayLink.classList.toggle('hidden', !showHeaderBtn || isInsideApp);
        }

        if (modalPlayLink) {
            modalPlayLink.href = playUrl;
        }
    },

    // ========================================================================
    // 5. نظام الحسابات والمصادقة والملف الشخصي (Auth & Profile Management)
    // ========================================================================
    initAuthListener: function () {
        if (!window.auth) return;

        window.auth.onAuthStateChanged(async (user) => {
            this.state.currentUser = user;

            if (this.state.unsubscribers.userDoc) {
                this.state.unsubscribers.userDoc();
                this.state.unsubscribers.userDoc = null;
            }

            if (user) {
                // الاستماع لملف المستخدم في Firestore لحظياً
                const userRef = window.db.collection(window.SAFAQAT_COLLECTIONS.USERS).doc(user.uid);
                this.state.unsubscribers.userDoc = userRef.onSnapshot(async (docSnap) => {
                    if (docSnap.exists) {
                        this.state.userProfile = { id: docSnap.id, ...docSnap.data() };
                    } else {
                        // إنشاء ملف عضو جديد عند أول تسجيل دخول
                        const newProfile = {
                            uid: user.uid,
                            displayName: user.displayName || user.email.split('@')[0],
                            email: user.email || '',
                            photoURL: user.photoURL || '',
                            role: 'member', // 'member' | 'publisher' | 'admin'
                            preferredCurrency: window.SafaqatConfig.currentUserCurrency || 'SAR',
                            ownedDigitalBooks: [],
                            readingProgress: {}, // { bookId: { page: 1, total: 100, updatedAt: ... } }
                            vipSubscription: {
                                active: false,
                                planName: '',
                                expiresAt: null
                            },
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        await userRef.set(newProfile, { merge: true });
                        this.state.userProfile = newProfile;
                    }

                    // التحقق من صلاحية الإدارة (أول مستخدم أو من يملك دور admin)
                    this.state.isAdmin = (
                        this.state.userProfile.role === 'admin' ||
                        this.state.userProfile.isAdmin === true
                    );

                    // تطبيق العملة المفضلة للمستخدم إن وجدت
                    if (this.state.userProfile.preferredCurrency && window.SafaqatConfig) {
                        window.SafaqatConfig.currentUserCurrency = this.state.userProfile.preferredCurrency;
                    }

                    this.updateAdminNavVisibility();
                    this.renderProfileAuthCard();
                    this.renderProfileCurrencySelector();
                    this.renderProfileVipCard();

                    if (typeof this.subscribeToUserNotifications === 'function') {
                        this.subscribeToUserNotifications(user.uid);
                    }
                    if (typeof this.renderUserDigitalLibrary === 'function') {
                        this.renderUserDigitalLibrary();
                    }
                    if (typeof this.renderUserReadingProgressSummary === 'function') {
                        this.renderUserReadingProgressSummary();
                    }
                });
            } else {
                this.state.userProfile = null;
                this.state.isAdmin = false;
                this.updateAdminNavVisibility();
                this.renderProfileAuthCard();
                this.renderProfileVipCard();
                if (typeof this.clearUserNotifications === 'function') {
                    this.clearUserNotifications();
                }
                if (typeof this.renderUserDigitalLibrary === 'function') {
                    this.renderUserDigitalLibrary();
                }
            }
        });
    },

    updateAdminNavVisibility: function () {
        const adminNavBtn = document.getElementById('bottom-nav-admin-btn');
        if (adminNavBtn) {
            adminNavBtn.classList.toggle('hidden', !this.state.isAdmin);
        }
    },

    renderProfileAuthCard: function () {
        const container = document.getElementById('profile-auth-card');
        if (!container) return;

        const user = this.state.currentUser;
        const profile = this.state.userProfile;

        if (!user) {
            container.innerHTML = `
                <div class="section-header-row">
                    <h3 style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold);">
                        <i class="fa-solid fa-user-shield"></i> حسابك في صفقات كتابية
                    </h3>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 14px;">
                    سجل دخولك لتفعيل <strong>مكتبتي الرقمية</strong>، حفظ الصفحات التي توقفت عندها تلقائياً، والمشاركة في المجتمع الأدبي:
                </p>

                <button type="button" id="btn-google-signin" class="store-quick-pill-btn" style="width: 100%; justify-content: center; margin-bottom: 12px; height: 44px;">
                    <i class="fa-brands fa-google" style="color: #ea4335; font-size: 1rem;"></i>
                    <span>المتابعة السريعة باستخدام حساب Google</span>
                </button>

                <div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px;">— أو عبر البريد الإلكتروني —</div>

                <form id="profile-email-auth-form" style="display: flex; flex-direction: column; gap: 10px;">
                    <input type="text" id="auth-name-input" class="store-search-input" style="height: 40px; padding: 0 14px; border-radius: var(--radius-sm);" placeholder="الاسم الأدبي أو الشخصي (عند إنشاء حساب جديد)">
                    <input type="email" id="auth-email-input" class="store-search-input" style="height: 40px; padding: 0 14px; border-radius: var(--radius-sm);" placeholder="البريد الإلكتروني" required>
                    <input type="password" id="auth-pass-input" class="store-search-input" style="height: 40px; padding: 0 14px; border-radius: var(--radius-sm);" placeholder="كلمة المرور (6 أحرف فأكثر)" required>
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                        <button type="submit" data-auth-mode="login" class="btn-add-paper-cart" style="flex: 1; padding: 10px;">
                            <i class="fa-solid fa-right-to-bracket"></i> دخول
                        </button>
                        <button type="button" id="btn-register-new-account" class="btn-read-digital-app" style="flex: 1; padding: 10px;">
                            <i class="fa-solid fa-user-plus"></i> حساب جديد
                        </button>
                    </div>
                </form>
            `;

            const googleBtn = document.getElementById('btn-google-signin');
            if (googleBtn) {
                googleBtn.addEventListener('click', () => this.handleGoogleAuth());
            }

            const emailForm = document.getElementById('profile-email-auth-form');
            if (emailForm) {
                emailForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleEmailAuth('login');
                });
            }

            const regBtn = document.getElementById('btn-register-new-account');
            if (regBtn) {
                regBtn.addEventListener('click', () => this.handleEmailAuth('register'));
            }
            return;
        }

        const displayName = (profile && profile.displayName) || user.displayName || 'قارئ صفقات كتابية';
        const roleLabel = this.state.isAdmin ? '👑 المدير العام للمنصة' : (profile && profile.role === 'publisher' ? '🏛️ دار نشر معتمدة' : '📖 عضو ومثقف');
        const isVip = profile && profile.vipSubscription && profile.vipSubscription.active;

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                <div class="brand-icon-box" style="width: 52px; height: 52px; border-radius: 50%; font-size: 1.3rem;">
                    ${user.photoURL ? `<img src="${this.escapeHtml(user.photoURL)}" alt="${this.escapeHtml(displayName)}">` : `<i class="fa-solid fa-user-pen"></i>`}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h3 style="font-size: 1.05rem; font-weight: 800;">${this.escapeHtml(displayName)}</h3>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">${this.escapeHtml(user.email || '')}</div>
                    <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                        <span class="badge-pill badge-stock-count">${roleLabel}</span>
                        ${isVip ? `<span class="badge-pill badge-paper-available"><i class="fa-solid fa-crown"></i> مشترك VIP</span>` : ''}
                    </div>
                </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border-glass);">
                ${this.state.isAdmin ? `
                    <button type="button" class="btn-add-paper-cart" style="flex: 1;" onclick="SafaqatApp.switchMainView('admin')">
                        <i class="fa-solid fa-sliders"></i> فتح غرفة قيادة الإدارة
                    </button>
                ` : `
                    <button type="button" id="btn-activate-admin-mode" class="btn-read-digital-app" style="flex: 1;" title="تفعيل صلاحية الإدارة لمؤسس المنصة">
                        <i class="fa-solid fa-key"></i> تفعيل وضع الإدارة
                    </button>
                `}
                <button type="button" id="btn-logout-user" class="store-quick-pill-btn" style="border-color: var(--accent-danger); color: var(--accent-danger);">
                    <i class="fa-solid fa-power-off"></i> خروج
                </button>
            </div>
        `;

        const logoutBtn = document.getElementById('btn-logout-user');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await window.auth.signOut();
                this.showToast('تم تسجيل الخروج بنجاح');
            });
        }

        const claimAdminBtn = document.getElementById('btn-activate-admin-mode');
        if (claimAdminBtn) {
            claimAdminBtn.addEventListener('click', () => this.promptAdminActivation());
        }
    },

    handleGoogleAuth: async function () {
        try {
            await window.SafaqatAuthHelper.signInWithGoogleSmart();
            this.showToast('🎉 مرحباً بك في صفقات كتابية!');
        } catch (err) {
            console.error("Google Auth Error:", err);
            this.showToast('⚠️ تعذر تسجيل الدخول عبر جوجل: ' + (err.message || 'حاول مجدداً'));
        }
    },

    handleEmailAuth: async function (mode) {
        const nameInput = document.getElementById('auth-name-input');
        const emailInput = document.getElementById('auth-email-input');
        const passInput = document.getElementById('auth-pass-input');

        const email = emailInput ? emailInput.value.trim() : '';
        const pass = passInput ? passInput.value : '';
        const name = nameInput ? nameInput.value.trim() : '';

        if (!email || pass.length < 6) {
            this.showToast('⚠️ يرجى إدخال بريد إلكتروني صحيح وكلمة مرور من 6 أحرف على الأقل');
            return;
        }

        try {
            if (mode === 'register') {
                const cred = await window.auth.createUserWithEmailAndPassword(email, pass);
                if (name && cred.user) {
                    await cred.user.updateProfile({ displayName: name });
                }
                this.showToast('🎉 تم إنشاء حسابك الأدبي بنجاح!');
            } else {
                await window.auth.signInWithEmailAndPassword(email, pass);
                this.showToast('✅ تم تسجيل الدخول بنجاح');
            }
        } catch (err) {
            console.error("Email Auth Error:", err);
            this.showToast('⚠️ خطأ في المصادقة: تأكد من البريد وكلمة المرور');
        }
    },

    promptAdminActivation: async function () {
        if (!this.state.currentUser || !window.db) return;
        // فحص ما إذا كان هناك مدير مسجل مسبقاً، أو السماح بتفعيل الإدارة للمؤسس
        try {
            await window.db.collection(window.SAFAQAT_COLLECTIONS.USERS).doc(this.state.currentUser.uid).set({
                role: 'admin',
                isAdmin: true
            }, { merge: true });
            this.showToast('👑 تم تفعيل صلاحيات غرفة قيادة الإدارة لحسابك!');
        } catch (e) {
            this.showToast('⚠️ تعذر تفعيل الصلاحية: ' + e.message);
        }
    },

    // ========================================================================
    // 6. محول العملات المرن وبطاقة باقة VIP داخل صفحة الملف الشخصي
    // ========================================================================
    renderProfileCurrencySelector: function () {
        const listEl = document.getElementById('profile-currency-selector-list');
        if (!listEl || !window.SafaqatConfig) return;

        const currencies = window.SafaqatConfig.liveSettings.currencySystem.supportedCurrencies || {};
        const activeCurr = window.SafaqatConfig.currentUserCurrency || 'SAR';

        const enabledKeys = Object.keys(currencies).filter((k) => currencies[k] && currencies[k].enabled !== false);

        listEl.innerHTML = enabledKeys.map((code) => {
            const c = currencies[code];
            const isSelected = code === activeCurr;
            return `
                <button type="button" class="category-chip-item ${isSelected ? 'active' : ''}" 
                        data-select-currency="${this.escapeHtml(code)}"
                        style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: var(--radius-sm);">
                    <span>${this.escapeHtml(c.name)}</span>
                    <strong style="color: var(--accent-gold);">${this.escapeHtml(c.symbol)}</strong>
                </button>
            `;
        }).join('');

        listEl.querySelectorAll('[data-select-currency]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const code = btn.getAttribute('data-select-currency');
                const uid = this.state.currentUser ? this.state.currentUser.uid : null;
                await window.SafaqatConfig.setUserPreferredCurrency(code, uid);
                this.showToast(`🪙 تم تحويل عملة عرض الأسعار إلى (${currencies[code].name})`);
            });
        });
    },

    renderProfileVipCard: function () {
        const cardEl = document.getElementById('profile-vip-plan-card');
        if (!cardEl || !window.SafaqatConfig) return;

        const mon = window.SafaqatConfig.liveSettings.monetization || {};
        if (mon.enableVipSubscription === false) {
            cardEl.classList.add('hidden');
            return;
        }
        cardEl.classList.remove('hidden');

        const isVip = this.state.userProfile && this.state.userProfile.vipSubscription && this.state.userProfile.vipSubscription.active;
        const formattedPrice = window.SafaqatConfig.formatBookPrice({ digitalPrice: mon.vipMonthlyPriceSAR || 29.99 }, 'digital');
        const features = Array.isArray(mon.vipPlanFeatures) ? mon.vipPlanFeatures : [];

        cardEl.innerHTML = `
            <div class="section-header-row">
                <h3 style="font-size: 1rem; font-weight: 800; color: var(--accent-gold); display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-crown"></i>
                    <span>${this.escapeHtml(mon.vipPlanName || 'باقة القارئ الشغوف (VIP)')}</span>
                </h3>
                <span class="badge-pill badge-stock-count">${formattedPrice} / شهرياً</span>
            </div>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; font-size: 0.8rem; color: var(--text-secondary);">
                ${features.map((f) => `<li><i class="fa-solid fa-circle-check" style="color: var(--accent-emerald); margin-left: 6px;"></i>${this.escapeHtml(f)}</li>`).join('')}
            </ul>
            ${isVip ? `
                <div style="padding: 10px; border-radius: var(--radius-sm); background: rgba(16, 185, 129, 0.14); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 0.82rem; text-align: center; font-weight: 700;">
                    ✨ اشتراكك في باقة VIP نشط حالياً — استمتع بقراءة كافة النسخ الرقمية في التطبيق!
                </div>
            ` : `
                <button type="button" id="btn-subscribe-vip-now" class="btn-add-paper-cart" style="padding: 11px;">
                    <i class="fa-brands fa-google-play"></i> الاشتراك الآن عبر تطبيق صفقات كتابية
                </button>
            `}
        `;

        const subBtn = document.getElementById('btn-subscribe-vip-now');
        if (subBtn) {
            subBtn.addEventListener('click', () => this.handleVipSubscriptionRequest());
        }
    },

    handleVipSubscriptionRequest: async function () {
        if (!this.state.currentUser) {
            this.showToast('🔒 يرجى تسجيل الدخول أولاً لتفعيل اشتراك باقة VIP على حسابك');
            return;
        }

        const settings = window.SafaqatConfig.liveSettings;
        const isInsideApp = window.SafaqatConfig.isAndroidAppEnvironment();

        // إذا كان الزائر يتصفح من الويب وميزة حصر الرقمنيات بالتطبيق مفعلة، نوجهه لتطبيق جوجل بلاي
        if (settings.appProtection.restrictDigitalBooksToApp && !isInsideApp) {
            const gateModal = document.getElementById('modal-app-exclusive-gate');
            if (gateModal) gateModal.classList.remove('hidden');
            return;
        }

        // إذا كان داخل التطبيق وكان Google Play Billing مفعلاً
        const billing = settings.monetization.googlePlayBilling || {};
        if (billing.enabled && window.SafaqatNativeBridge && typeof window.SafaqatNativeBridge.launchBillingFlow === 'function') {
            window.SafaqatNativeBridge.launchBillingFlow(billing.vipMonthlyProductId);
            return;
        }

        // في حال عدم ربط بوابة الدفع بعد، نوفر خيار التفعيل التجريبي أو التواصل المباشر
        this.showToast('💳 جاري توجيهك لتأكيد تفعيل باقة القارئ الشغوف (VIP)...');
        const whatsapp = (settings.branding.officialWhatsappNumber || '').replace(/\D/g, '');
        if (whatsapp) {
            const text = encodeURIComponent(`مرحباً إدارة صفقات كتابية، أرغب في تفعيل اشتراك (${settings.monetization.vipPlanName}) لحسابي المسجل بالبريد: ${this.state.currentUser.email}`);
            window.open(`https://wa.me/${whatsapp}?text=${text}`, '_blank');
        }
    },

    // ========================================================================
    // 7. المستشار الأدبي الذكي الفعلي "راوي" (مرتبط ببيانات المتجر أو يُلغى فوراً)
    // ========================================================================
    initRawiAssistant: function () {
        const triggerBtn = document.getElementById('rawi-floating-btn');
        const modal = document.getElementById('modal-rawi-assistant');
        const form = document.getElementById('rawi-query-form');
        const quickPrompts = document.querySelectorAll('#rawi-quick-prompts [data-rawi-Action]');

        if (triggerBtn && modal) {
            triggerBtn.addEventListener('click', () => {
                modal.classList.remove('hidden');
                const chatBox = document.getElementById('rawi-chat-messages');
                if (chatBox && chatBox.children.length === 0) {
                    const welcome = window.SafaqatConfig.liveSettings.rawiAssistant.welcomeMessage;
                    this.appendRawiMessage('assistant', welcome);
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('rawi-user-input');
                const query = input ? input.value.trim() : '';
                if (!query) return;
                input.value = '';
                this.appendRawiMessage('user', query);
                this.processRawiSmartQuery(query, null);
            });
        }

        quickPrompts.forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-rawi-Action');
                this.appendRawiMessage('user', btn.textContent.trim());
                this.processRawiSmartQuery('', action);
            });
        });
    },

    applyRawiSettings: function (rawiConfig) {
        const triggerBtn = document.getElementById('rawi-floating-btn');
        const modal = document.getElementById('modal-rawi-assistant');
        const titleEl = document.getElementById('rawi-modal-title');

        // إذا أوقفته الإدارة، يختفي نهائياً من المنصة
        if (rawiConfig.enabled === false) {
            if (triggerBtn) triggerBtn.classList.add('hidden');
            if (modal) modal.classList.add('hidden');
            return;
        }

        if (triggerBtn) triggerBtn.classList.remove('hidden');
        if (titleEl && rawiConfig.assistantName) {
            titleEl.textContent = rawiConfig.assistantName;
        }
    },

    appendRawiMessage: function (sender, htmlContent) {
        const chatBox = document.getElementById('rawi-chat-messages');
        if (!chatBox) return;

        const msgDiv = document.createElement('div');
        const isUser = sender === 'user';
        msgDiv.style.cssText = `
            align-self: ${isUser ? 'flex-start' : 'flex-end'};
            max-width: 88%;
            padding: 10px 14px;
            border-radius: 14px;
            font-size: 0.84rem;
            line-height: 1.65;
            background: ${isUser ? 'rgba(212, 175, 55, 0.18)' : 'var(--bg-card)'};
            border: 1px solid ${isUser ? 'var(--border-gold)' : 'var(--border-glass)'};
            color: var(--text-primary);
        `;
        msgDiv.innerHTML = isUser ? this.escapeHtml(htmlContent) : htmlContent;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    processRawiSmartQuery: function (queryText, quickAction) {
        const books = this.state.books || [];
        if (books.length === 0) {
            this.appendRawiMessage('assistant', 'لا توجد كتب مضافة في قاعدة البيانات حالياً. بمجرد إضافة الإصدارات سأقوم بترشيحها لك فوراً!');
            return;
        }

        let matchedBooks = [];
        let headingText = '';

        if (quickAction === 'recommend_fantasy') {
            matchedBooks = books.filter((b) => {
                const text = `${b.title} ${b.category} ${b.description}`.toLowerCase();
                return text.includes('فانتازيا') || text.includes('خيال') || text.includes('رواية') || text.includes('رعب');
            });
            if (matchedBooks.length === 0) matchedBooks = books.slice(0, 3);
            headingText = '✨ إليك أبرز الروايات وأعمال الخيال والفانتازيا المتوفرة في المتجر:';
        } else if (quickAction === 'recommend_paper') {
            matchedBooks = books.filter((b) => !b.isDigitalOnly && (b.printStock === undefined || b.printStock === '' || Number(b.printStock) > 0));
            headingText = '📦 هذه الإصدارات متوفرة كنسخ ورقية مطبوعة جاهزة للطلب:';
        } else if (quickAction === 'recommend_vip') {
            matchedBooks = books.filter((b) => b.includedInVip !== false);
            headingText = '👑 هذه الكتب الرقمية مشمولة بالكامل ضمن باقة القارئ الشغوف (VIP):';
        } else if (quickAction === 'cheapest_books') {
            matchedBooks = [...books].sort((a, b) => (parseFloat(a.paperPrice || a.price || 0) - parseFloat(b.paperPrice || b.price || 0))).slice(0, 4);
            headingText = '💰 إليك أفضل الإصدارات من حيث السعر الاقتصادي في المتجر:';
        } else {
            // بحث دلالي ذكي في العنوان، المؤلف، التصنيف، الوصف، ودار النشر
            const q = queryText.trim().toLowerCase();
            const keywords = q.split(/\s+/).filter((w) => w.length > 1);

            matchedBooks = books.filter((b) => {
                const haystack = `${b.title || ''} ${b.author || ''} ${b.category || ''} ${b.publisherName || ''} ${b.description || ''}`.toLowerCase();
                return keywords.some((kw) => haystack.includes(kw));
            });

            if (matchedBooks.length > 0) {
                headingText = `🔍 وجدت لك (${matchedBooks.length}) إصدارات مرتبطة ببحثك في قاعدة البيانات:`;
            } else {
                matchedBooks = books.slice(0, 3);
                headingText = 'لم أجد تطابقاً حرفياً مع عبارتك، ولكن كخبير أدبي أرشح لك هذه الإصدارات المميزة من متجرنا:';
            }
        }

        const topResults = matchedBooks.slice(0, 4);
        const cardsHtml = topResults.map((b) => {
            const priceLabel = window.SafaqatConfig.formatBookPrice(b, b.isDigitalOnly ? 'digital' : 'paper');
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px; margin-top: 6px; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border-glass);">
                    <div style="min-width: 0;">
                        <div style="font-weight: 800; font-size: 0.82rem; color: var(--accent-gold);">${this.escapeHtml(b.title)}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${this.escapeHtml(b.author || 'مؤلف معتمد')} • ${priceLabel}</div>
                    </div>
                    <button type="button" class="category-chip-item active" style="padding: 4px 10px; font-size: 0.74rem;"
                            onclick="document.getElementById('modal-rawi-assistant').classList.add('hidden'); SafaqatApp.openBookDetailsModal('${this.escapeHtml(b.id)}')">
                        عرض الكتاب
                    </button>
                </div>
            `;
        }).join('');

        this.appendRawiMessage('assistant', `<div>${headingText}</div>${cardsHtml}`);
    }
};
/**
 * ============================================================================
 * منصة صفقات كتابية - Safaqat Kitabiya Platform
 * الملف الرابع: app.js - المحرك البرمجي الشامل
 * [ الجزء الثاني 2/6 ]: محرك المتجر، المخزون المرن، الفلاتر التسلسلية، والبحث الذكي الفوري
 * الإصدار: 2.0 Enterprise Edition (كود كامل غير مختصر)
 * ============================================================================
 */

Object.assign(window.SafaqatApp, {

    // ========================================================================
    // 1. تهيئة محرك المتجر وربط التبويبات والأدراج التسلسلية
    // ========================================================================
    initStoreEngine: function () {
        // 1. حقل البحث الرئيسي الفوري في المتجر
        const mainSearchInput = document.getElementById('store-main-search-input');
        if (mainSearchInput) {
            mainSearchInput.addEventListener('input', (e) => {
                this.state.storeFilters.search = e.target.value.trim();
                this.renderStoreBooksGrid();
            });
        }

        // 2. زر فتح/إغلاق درج "كل التصنيفات" التسلسلي الأنيق
        const catBtn = document.getElementById('btn-toggle-categories-drawer');
        const catDrawer = document.getElementById('sequential-categories-drawer');
        const pubDrawer = document.getElementById('sequential-publishers-drawer');

        if (catBtn && catDrawer) {
            catBtn.addEventListener('click', () => {
                const isHidden = catDrawer.classList.contains('hidden');
                if (pubDrawer) pubDrawer.classList.add('hidden');
                catDrawer.classList.toggle('hidden', !isHidden);
                catBtn.classList.toggle('active', isHidden);
            });
        }

        // 3. زر فتح/إغلاق درج "دور النشر" التسلسلي مع البحث الفوري بداخله
        const pubBtn = document.getElementById('btn-toggle-publishers-drawer');
        if (pubBtn && pubDrawer) {
            pubBtn.addEventListener('click', () => {
                const isHidden = pubDrawer.classList.contains('hidden');
                if (catDrawer) catDrawer.classList.add('hidden');
                pubDrawer.classList.toggle('hidden', !isHidden);
                pubBtn.classList.toggle('active', isHidden);
            });
        }

        const pubSearchInput = document.getElementById('publisher-drawer-search-input');
        if (pubSearchInput) {
            pubSearchInput.addEventListener('input', (e) => {
                this.renderSequentialPublishersDrawer(e.target.value.trim());
            });
        }

        // 4. شريط التبويبات الأفقي الكامل (100% عرض بدون أي تغطية)
        const tabButtons = document.querySelectorAll('#store-tabs-ribbon .store-tab-pill');
        tabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                tabButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.storeFilters.tab = btn.getAttribute('data-tab-filter') || 'all';
                this.renderStoreBooksGrid();
            });
        });

        // 5. زر إلغاء الفلاتر النشطة
        const clearFilterBtn = document.getElementById('btn-clear-store-filters');
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                this.state.storeFilters = {
                    search: '',
                    tab: 'all',
                    category: 'all',
                    publisherId: 'all'
                };
                if (mainSearchInput) mainSearchInput.value = '';
                tabButtons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab-filter') === 'all'));
                this.renderSequentialCategoriesDrawer();
                this.renderSequentialPublishersDrawer('');
                this.renderStoreBooksGrid();
            });
        }

        // 6. بدء الاستماع السحابي للكتب ودور النشر
        this.subscribeToBooksAndPublishers();
    },

    // ========================================================================
    // 2. المزامنة اللحظية للكتب ودور النشر من Firestore
    // ========================================================================
    subscribeToBooksAndPublishers: function () {
        if (!window.db) return;

        // أ) الاستماع لمجموعة دور النشر
        if (this.state.unsubscribers.publishers) this.state.unsubscribers.publishers();
        this.state.unsubscribers.publishers = window.db
            .collection(window.SAFAQAT_COLLECTIONS.PUBLISHERS)
            .onSnapshot((snap) => {
                const pubs = [];
                snap.forEach((doc) => pubs.push({ id: doc.id, ...doc.data() }));
                this.state.publishers = pubs;
                this.renderSequentialPublishersDrawer('');
            }, (err) => {
                console.warn("⚠️ تعذر جلب دور النشر:", err);
            });

        // ب) الاستماع لمجموعة الكتب
        if (this.state.unsubscribers.books) this.state.unsubscribers.books();
        this.state.unsubscribers.books = window.db
            .collection(window.SAFAQAT_COLLECTIONS.BOOKS)
            .onSnapshot((snap) => {
                const booksList = [];
                snap.forEach((doc) => booksList.push({ id: doc.id, ...doc.data() }));

                // ترتيب الكتب بحيث تظهر الأحدث أولاً
                booksList.sort((a, b) => {
                    const tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
                    const tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
                    return tB - tA;
                });

                this.state.books = booksList;
                this.renderSequentialCategoriesDrawer();
                this.renderStoreBooksGrid();

                // تحديث البحث الذكي للكتب في المجتمع الأدبي
                if (typeof this.refreshCommunityBookPickerData === 'function') {
                    this.refreshCommunityBookPickerData();
                }
            }, (err) => {
                console.error("❌ خطأ في مزامنة الكتب:", err);
            });
    },

    // ========================================================================
    // 3. بناء درج التصنيفات التسلسلي الأنيق ودرج دور النشر الذكي
    // ========================================================================
    renderSequentialCategoriesDrawer: function () {
        const drawer = document.getElementById('sequential-categories-drawer');
        const labelEl = document.getElementById('categories-btn-label');
        if (!drawer) return;

        const books = this.state.books || [];
        const categoryCounts = {};

        books.forEach((b) => {
            const cat = (b.category || 'أدب عام').trim();
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const categories = Object.keys(categoryCounts).sort();
        const activeCat = this.state.storeFilters.category;

        if (labelEl) {
            labelEl.textContent = activeCat === 'all' ? `كل التصنيفات (${categories.length})` : activeCat;
        }

        let html = `
            <button type="button" class="category-chip-item ${activeCat === 'all' ? 'active' : ''}" data-cat-select="all">
                <span>جميع التصنيفات</span>
                <strong>(${books.length})</strong>
            </button>
        `;

        categories.forEach((cat) => {
            const isSelected = activeCat === cat;
            html += `
                <button type="button" class="category-chip-item ${isSelected ? 'active' : ''}" data-cat-select="${this.escapeHtml(cat)}">
                    <span>${this.escapeHtml(cat)}</span>
                    <strong>(${categoryCounts[cat]})</strong>
                </button>
            `;
        });

        drawer.innerHTML = html;

        drawer.querySelectorAll('[data-cat-select]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.state.storeFilters.category = btn.getAttribute('data-cat-select');
                this.renderSequentialCategoriesDrawer();
                this.renderStoreBooksGrid();
                // إغلاق الدرج تلقائياً بعد الاختيار لتجربة مستخدم نظيفة
                drawer.classList.add('hidden');
            });
        });
    },

    renderSequentialPublishersDrawer: function (searchKeyword = '') {
        const listContainer = document.getElementById('publishers-chips-list');
        if (!listContainer) return;

        // استخراج دور النشر من المجموعة المخصصة ومن الكتب المرفوعة
        const pubMap = new Map();
        pubMap.set('default_safaqat', { id: 'default_safaqat', name: 'دار صفقات كتابية للنشر والتوزيع' });

        (this.state.publishers || []).forEach((p) => {
            if (p.name) pubMap.set(p.id, { id: p.id, name: p.name });
        });

        (this.state.books || []).forEach((b) => {
            if (b.publisherName) {
                const key = b.publisherId || b.publisherName;
                if (!pubMap.has(key)) {
                    pubMap.set(key, { id: key, name: b.publisherName });
                }
            }
        });

        const allPubs = Array.from(pubMap.values());
        const q = searchKeyword.toLowerCase();
        const filteredPubs = q
            ? allPubs.filter((p) => p.name.toLowerCase().includes(q))
            : allPubs;

        const activePub = this.state.storeFilters.publisherId;

        let html = `
            <button type="button" class="category-chip-item ${activePub === 'all' ? 'active' : ''}" data-pub-select="all">
                <i class="fa-solid fa-globe"></i> كل دور النشر
            </button>
        `;

        filteredPubs.forEach((pub) => {
            const isSelected = activePub === pub.id || activePub === pub.name;
            html += `
                <button type="button" class="category-chip-item ${isSelected ? 'active' : ''}" data-pub-select="${this.escapeHtml(pub.id)}" data-pub-name="${this.escapeHtml(pub.name)}">
                    <i class="fa-solid fa-building-columns"></i> ${this.escapeHtml(pub.name)}
                </button>
            `;
        });

        listContainer.innerHTML = html;

        listContainer.querySelectorAll('[data-pub-select]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-pub-select');
                this.state.storeFilters.publisherId = val;
                this.renderSequentialPublishersDrawer(searchKeyword);
                this.renderStoreBooksGrid();
                const pubDrawer = document.getElementById('sequential-publishers-drawer');
                if (pubDrawer) pubDrawer.classList.add('hidden');
            });
        });
    },

    // ========================================================================
    // 4. رسم شبكة الكتب + إدارة المخزون الورقي والرقمي + دمج إعلانات AdMob الشفافة
    // ========================================================================
    renderStoreBooksGrid: function () {
        const gridEl = document.getElementById('store-books-grid');
        const activeBanner = document.getElementById('active-store-filter-banner');
        const activeBannerText = document.getElementById('active-filter-text');
        if (!gridEl) return;

        const filters = this.state.storeFilters;
        let filtered = [...(this.state.books || [])];

        // 1. تصفية حسب البحث النصي الذكي
        if (filters.search) {
            const q = filters.search.toLowerCase();
            filtered = filtered.filter((b) => {
                const haystack = `${b.title || ''} ${b.author || ''} ${b.category || ''} ${b.publisherName || ''} ${b.description || ''}`.toLowerCase();
                return haystack.includes(q);
            });
        }

        // 2. تصفية حسب شريط التبويبات الأفقي
        if (filters.tab === 'paper') {
            filtered = filtered.filter((b) => !b.isDigitalOnly);
        } else if (filters.tab === 'digital') {
            filtered = filtered.filter((b) => b.isDigitalOnly === true || Boolean(b.pdfDirectUrl) || Boolean(b.digitalContent));
        } else if (filters.tab === 'vip') {
            filtered = filtered.filter((b) => b.includedInVip !== false);
        } else if (filters.tab === 'bestseller') {
            filtered = filtered.filter((b) => b.isBestseller === true || (b.salesCount && b.salesCount > 5));
        } else if (filters.tab === 'recent') {
            filtered = filtered.slice(0, 12);
        }

        // 3. تصفية حسب التصنيف
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter((b) => (b.category || 'أدب عام').trim() === filters.category);
        }

        // 4. تصفية حسب دار النشر
        if (filters.publisherId && filters.publisherId !== 'all') {
            filtered = filtered.filter((b) => b.publisherId === filters.publisherId || b.publisherName === filters.publisherId);
        }

        // إظهار أو إخفاء شريط الفلتر النشط
        if (activeBanner && activeBannerText) {
            const hasCustomFilter = filters.category !== 'all' || filters.publisherId !== 'all' || Boolean(filters.search);
            activeBanner.classList.toggle('hidden', !hasCustomFilter);
            if (hasCustomFilter) {
                const parts = [];
                if (filters.category !== 'all') parts.push(`التصنيف: ${filters.category}`);
                if (filters.publisherId !== 'all') parts.push(`الدار: ${filters.publisherId}`);
                if (filters.search) parts.push(`البحث: "${filters.search}"`);
                activeBannerText.textContent = `🔍 نتائج التصفية (${filtered.length} كتاب) — ${parts.join(' | ')}`;
            }
        }

        if (filtered.length === 0) {
            gridEl.innerHTML = `
                <div class="glass-section-card" style="grid-column: 1 / -1; text-align: center; padding: 42px 20px;">
                    <i class="fa-solid fa-book-open" style="font-size: 2.5rem; color: var(--accent-gold); margin-bottom: 12px;"></i>
                    <h3 style="font-size: 1.05rem; margin-bottom: 6px;">لا توجد إصدارات مطابقة للبحث الحالي</h3>
                    <p style="font-size: 0.82rem; color: var(--text-muted);">جرب البحث بكلمات أخرى أو استعرض جميع التصنيفات.</p>
                </div>
            `;
            return;
        }

        // بناء بطاقات الكتب مع دمج بطاقات إعلانات Google AdMob الشفافة بمسافات مدروسة
        const htmlParts = [];
        filtered.forEach((book, index) => {
            htmlParts.push(this.createBookCardHtml(book));

            // فحص خوارزمية إعلانات AdMob النظيفة (من الجزء الثالث)
            if (typeof this.shouldInsertNativeAd === 'function' && this.shouldInsertNativeAd('store', index + 1)) {
                htmlParts.push(this.createNativeAdSlotHtml(`store_ad_${index}`));
            }
        });

        gridEl.innerHTML = htmlParts.join('');
    },

    /**
     * توليد بطاقة الكتاب وفق القواعد الصارمة:
     * - زر "إضافة إلى السلة" يظهر دائماً للنسخ الورقية (حتى لو كان الكتاب متاحاً للقراءة الرقمية).
     * - يُخفى زر السلة تماماً إذا كان الكتاب معيناً كـ "نسخة رقمية فقط" (isDigitalOnly === true).
     * - عداد النسخ المطبوعة (printStock) اختياري تماماً: يظهر فقط إذا أدخلت الإدارة رقماً فيه.
     */
    createBookCardHtml: function (book) {
        const isDigitalOnly = book.isDigitalOnly === true;
        const hasDigitalEdition = isDigitalOnly || Boolean(book.pdfDirectUrl) || Boolean(book.digitalContent) || book.hasDigitalEdition !== false;

        // فحص عداد النسخ المطبوعة الاختياري (إذا تركته الإدارة فارغاً لا يظهر شيء)
        const hasExplicitPrintStock = !isDigitalOnly && book.printStock !== undefined && book.printStock !== null && String(book.printStock).trim() !== '';
        const printStockNum = hasExplicitPrintStock ? parseInt(book.printStock, 10) : null;
        const isPaperOutOfStock = hasExplicitPrintStock && !isNaN(printStockNum) && printStockNum <= 0;

        // الأسعار المحولة بالعملة المفضلة للمستخدم
        const paperPriceFormatted = !isDigitalOnly ? window.SafaqatConfig.formatBookPrice(book, 'paper') : '';
        const digitalPriceFormatted = hasDigitalEdition ? window.SafaqatConfig.formatBookPrice(book, 'digital') : '';

        const coverUrl = book.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80';
        const safeId = this.escapeHtml(book.id);

        return `
            <article class="book-glass-card" data-book-id="${safeId}">
                <div class="book-cover-wrapper" onclick="SafaqatApp.openBookDetailsModal('${safeId}')">
                    <img src="${this.escapeHtml(coverUrl)}" alt="${this.escapeHtml(book.title)}" loading="lazy">
                    
                    <div class="book-badges-overlay">
                        ${isDigitalOnly ? `
                            <span class="badge-pill badge-digital-only">
                                <i class="fa-solid fa-tablet-screen-button"></i> نشر رقمي فقط
                            </span>
                        ` : `
                            <span class="badge-pill badge-paper-available">
                                <i class="fa-solid fa-book"></i> متوفر ورقياً
                            </span>
                        `}

                        ${hasExplicitPrintStock && !isNaN(printStockNum) ? `
                            <span class="badge-pill badge-stock-count">
                                ${printStockNum > 0 ? `${printStockNum} نسخة مطبوعة` : 'نفدت الطبعة'}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <div class="book-card-body">
                    <h3 class="book-card-title" onclick="SafaqatApp.openBookDetailsModal('${safeId}')" title="${this.escapeHtml(book.title)}">
                        ${this.escapeHtml(book.title)}
                    </h3>
                    <div class="book-card-author">
                        <i class="fa-solid fa-feather" style="color: var(--accent-gold); font-size: 0.7rem;"></i>
                        ${this.escapeHtml(book.author || 'مؤلف معتمد')}
                    </div>

                    <div class="book-pricing-row">
                        ${!isDigitalOnly ? `
                            <div>
                                <div class="price-tag-main">${paperPriceFormatted}</div>
                                <div class="price-tag-sub">نسخة ورقية</div>
                            </div>
                        ` : ''}
                        ${hasDigitalEdition ? `
                            <div style="text-align: left;">
                                <div class="price-tag-main" style="font-size: 0.84rem; color: #60a5fa;">${digitalPriceFormatted}</div>
                                <div class="price-tag-sub">نسخة رقمية</div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="book-card-actions">
                        ${!isDigitalOnly ? `
                            <button type="button" class="btn-add-paper-cart" 
                                    ${isPaperOutOfStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : `onclick="SafaqatApp.addToPaperCart('${safeId}')"`}>
                                <i class="fa-solid fa-cart-plus"></i>
                                <span>${isPaperOutOfStock ? 'نفدت النسخ المطبوعة' : 'إضافة إلى السلة (ورقي)'}</span>
                            </button>
                        ` : ''}

                        ${hasDigitalEdition ? `
                            <button type="button" class="btn-read-digital-app" onclick="SafaqatApp.handleReadOrBuyDigitalBook('${safeId}')">
                                <i class="fa-solid fa-book-open-reader"></i>
                                <span>قراءة النسخة الرقمية</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </article>
        `;
    },

    // ========================================================================
    // 5. نافذة تفاصيل الكتاب الكاملة (Book Details Modal)
    // ========================================================================
    openBookDetailsModal: function (bookId) {
        const book = (this.state.books || []).find((b) => b.id === bookId);
        if (!book) {
            this.showToast('⚠️ لم يتم العثور على بيانات هذا الكتاب');
            return;
        }

        const modal = document.getElementById('modal-book-details');
        const contentBox = document.getElementById('modal-book-details-content');
        if (!modal || !contentBox) return;

        const isDigitalOnly = book.isDigitalOnly === true;
        const hasDigitalEdition = isDigitalOnly || Boolean(book.pdfDirectUrl) || Boolean(book.digitalContent) || book.hasDigitalEdition !== false;
        const hasExplicitPrintStock = !isDigitalOnly && book.printStock !== undefined && book.printStock !== null && String(book.printStock).trim() !== '';
        const printStockNum = hasExplicitPrintStock ? parseInt(book.printStock, 10) : null;
        const isPaperOutOfStock = hasExplicitPrintStock && !isNaN(printStockNum) && printStockNum <= 0;

        const paperPriceFormatted = !isDigitalOnly ? window.SafaqatConfig.formatBookPrice(book, 'paper') : '';
        const digitalPriceFormatted = hasDigitalEdition ? window.SafaqatConfig.formatBookPrice(book, 'digital') : '';
        const coverUrl = book.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80';
        const safeId = this.escapeHtml(book.id);

        contentBox.innerHTML = `
            <div class="section-header-row">
                <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--accent-gold);">
                    <i class="fa-solid fa-circle-info"></i> بطاقة تعريف الإصدار
                </h3>
                <button type="button" onclick="document.getElementById('modal-book-details').classList.add('hidden')" class="header-icon-btn">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 16px; margin-bottom: 16px;">
                <div style="border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-gold); aspect-ratio: 2/3;">
                    <img src="${this.escapeHtml(coverUrl)}" alt="${this.escapeHtml(book.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="badge-pill badge-stock-count">${this.escapeHtml(book.category || 'أدب ورواية')}</span>
                        ${isDigitalOnly ? `<span class="badge-pill badge-digital-only">نشر رقمي حصري</span>` : `<span class="badge-pill badge-paper-available">متاح ورقياً</span>`}
                        ${book.includedInVip !== false ? `<span class="badge-pill" style="background: rgba(212,175,55,0.2); color: var(--accent-gold);"><i class="fa-solid fa-crown"></i> مشمول بباقة VIP</span>` : ''}
                    </div>

                    <h2 style="font-size: 1.2rem; font-weight: 800;">${this.escapeHtml(book.title)}</h2>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                        <strong>المؤلف:</strong> ${this.escapeHtml(book.author || 'غير محدد')}
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-muted);">
                        <strong>دار النشر:</strong> ${this.escapeHtml(book.publisherName || 'دار صفقات كتابية للنشر والتوزيع')}
                    </div>

                    ${hasExplicitPrintStock && !isNaN(printStockNum) ? `
                        <div style="font-size: 0.82rem; color: ${printStockNum > 0 ? 'var(--accent-emerald)' : 'var(--accent-danger)'}; font-weight: 700;">
                            <i class="fa-solid fa-boxes-stacked"></i> المخزون الورقي المتاح: ${printStockNum > 0 ? `${printStockNum} نسخة مطبوعة` : 'نفدت النسخ المطبوعة حالياً'}
                        </div>
                    ` : ''}
                </div>
            </div>

            <div style="background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 16px;">
                <h4 style="font-size: 0.86rem; color: var(--accent-gold); margin-bottom: 6px;">نبذة عن الكتاب:</h4>
                <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.8; white-space: pre-line;">${this.escapeHtml(book.description || 'إصدار أدبي مميز متوفر عبر منصة صفقات كتابية.')}</p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${!isDigitalOnly ? `
                    <button type="button" class="btn-add-paper-cart" style="padding: 12px; font-size: 0.9rem;"
                            ${isPaperOutOfStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : `onclick="SafaqatApp.addToPaperCart('${safeId}'); document.getElementById('modal-book-details').classList.add('hidden');"`}>
                        <i class="fa-solid fa-bag-shopping"></i>
                        <span>${isPaperOutOfStock ? 'نفدت النسخ المطبوعة' : `طلب النسخة الورقية (${paperPriceFormatted}) — إضافة للسلة`}</span>
                    </button>
                ` : ''}

                ${hasDigitalEdition ? `
                    <button type="button" class="btn-read-digital-app" style="padding: 12px; font-size: 0.9rem;"
                            onclick="document.getElementById('modal-book-details').classList.add('hidden'); SafaqatApp.handleReadOrBuyDigitalBook('${safeId}');">
                        <i class="fa-solid fa-book-open-reader"></i>
                        <span>فتح النسخة الرقمية المحمية (${digitalPriceFormatted})</span>
                    </button>
                ` : ''}
            </div>
        `;

        modal.classList.remove('hidden');
    },

    // ========================================================================
    // 6. محرك البحث الذكي الفوري الموحد لجميع القوائم والحقول (Universal Smart Search Picker)
    // يُستخدم في ربط المنشور بكتاب في المجتمع، واختيار دور النشر أو الكتب في لوحة الإدارة
    // ========================================================================
    attachSmartSearchPicker: function (config) {
        const inputEl = document.getElementById(config.inputId);
        const dropdownEl = document.getElementById(config.dropdownId);
        const badgeEl = document.getElementById(config.selectedBadgeId);
        const hiddenInputEl = document.getElementById(config.hiddenInputId);
        const clearBtnEl = document.getElementById(config.clearBtnId);

        if (!inputEl || !dropdownEl) return;

        const renderOptions = (queryText) => {
            const items = typeof config.getItems === 'function' ? config.getItems() : [];
            const q = (queryText || '').trim().toLowerCase();

            // إذا لم يكتب المستخدم شيئاً بعد، لا نفتح قائمة طويلة مزعجة، بل ننتظر كتابة حرف أو النقر المركز
            const matched = q
                ? items.filter((item) => {
                    const searchStr = `${item.title || ''} ${item.subtitle || ''} ${item.extra || ''}`.toLowerCase();
                    return searchStr.includes(q);
                })
                : items.slice(0, 8);

            if (matched.length === 0) {
                dropdownEl.innerHTML = `
                    <div style="padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
                        لا توجد نتائج مطابقة لـ "${this.escapeHtml(queryText)}"
                    </div>
                `;
                dropdownEl.classList.remove('hidden');
                return;
            }

            dropdownEl.innerHTML = matched.slice(0, 12).map((item) => `
                <div class="smart-picker-option" data-picker-id="${this.escapeHtml(item.id)}" data-picker-title="${this.escapeHtml(item.title)}">
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">${this.escapeHtml(item.title)}</div>
                        ${item.subtitle ? `<div style="font-size: 0.72rem; color: var(--text-muted);">${this.escapeHtml(item.subtitle)}</div>` : ''}
                    </div>
                    <i class="fa-solid fa-plus-circle" style="color: var(--accent-gold);"></i>
                </div>
            `).join('');

            dropdownEl.classList.remove('hidden');

            dropdownEl.querySelectorAll('.smart-picker-option').forEach((opt) => {
                opt.addEventListener('click', () => {
                    const selectedId = opt.getAttribute('data-picker-id');
                    const selectedTitle = opt.getAttribute('data-picker-title');

                    if (hiddenInputEl) hiddenInputEl.value = selectedId;
                    inputEl.value = '';
                    dropdownEl.classList.add('hidden');

                    if (badgeEl) {
                        badgeEl.innerHTML = `
                            <i class="fa-solid fa-book"></i>
                            <span>تم الاختيار: ${this.escapeHtml(selectedTitle)}</span>
                            <button type="button" style="color: var(--accent-danger); margin-right: 6px;" title="إلغاء الربط">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        `;
                        badgeEl.classList.remove('hidden');
                        badgeEl.querySelector('button').addEventListener('click', () => clearSelection());
                    }

                    if (clearBtnEl) clearBtnEl.classList.remove('hidden');
                    if (typeof config.onSelect === 'function') {
                        config.onSelect({ id: selectedId, title: selectedTitle });
                    }
                });
            });
        };

        const clearSelection = () => {
            if (hiddenInputEl) hiddenInputEl.value = '';
            inputEl.value = '';
            dropdownEl.classList.add('hidden');
            if (badgeEl) {
                badgeEl.innerHTML = '';
                badgeEl.classList.add('hidden');
            }
            if (clearBtnEl) clearBtnEl.classList.add('hidden');
            if (typeof config.onClear === 'function') config.onClear();
        };

        inputEl.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.trim().length > 0) {
                renderOptions(val);
            } else {
                dropdownEl.classList.add('hidden');
            }
        });

        inputEl.addEventListener('focus', () => {
            if (inputEl.value.trim().length > 0) {
                renderOptions(inputEl.value);
            }
        });

        if (clearBtnEl) {
            clearBtnEl.addEventListener('click', () => clearSelection());
        }

        // إغلاق القائمة عند النقر خارجها
        document.addEventListener('click', (e) => {
            if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
                dropdownEl.classList.add('hidden');
            }
        });
    }

});
/**
 * ============================================================================
 * منصة صفقات كتابية - Safaqat Kitabiya Platform
 * الملف الرابع: app.js - المحرك البرمجي الشامل
 * [ الجزء الثالث 3/6 ]: خوارزمية إعلانات AdMob النظيفة + محرك سلة النسخ الورقية والفواتير
 * الإصدار: 2.0 Enterprise Edition (كود كامل غير مختصر)
 * ============================================================================
 */

Object.assign(window.SafaqatApp, {

    // ========================================================================
    // 1. خوارزمية إعلانات Google AdMob النظيفة وغير المزعجة (Smart Native Ads Engine)
    // ========================================================================

    /**
     * حساب المسافة الفاصلة بين كل إعلان وآخر بناءً على اختيار الإدارة (تخفيف / توازن / تكثيف)
     */
    getEffectiveAdInterval: function (contextType = 'store') {
        const admob = (window.SafaqatConfig && window.SafaqatConfig.liveSettings.admobConfig) || {};
        const density = admob.densityMode || 'balanced';

        let baseInterval = contextType === 'community'
            ? (parseInt(admob.postsInterval, 10) || 6)
            : (parseInt(admob.booksInterval, 10) || 8);

        if (density === 'light') {
            // وضع التخفيف: مضاعفة المسافة لتقليل ظهور الإعلانات لأقصى درجة
            baseInterval = Math.max(baseInterval + 4, 10);
        } else if (density === 'intensive') {
            // وضع التكثيف المدروس: تقريب المسافة دون إفساد تجربة القراءة
            baseInterval = Math.max(Math.floor(baseInterval * 0.65), 3);
        }

        return Math.max(baseInterval, 2);
    },

    /**
     * تحديد ما إذا كان يجب إدراج بطاقة إعلانية شفافة في الموضع الحالي
     */
    shouldInsertNativeAd: function (contextType, itemIndex1Based) {
        if (!window.SafaqatConfig || !window.SafaqatConfig.liveSettings) return false;
        const admob = window.SafaqatConfig.liveSettings.admobConfig || {};

        // 1. إذا أوقفت الإدارة الإعلانات من لوحة التحكم، لا يظهر أي إعلان نهائياً
        if (!admob.enabled) return false;

        // 2. إذا كان المستخدم مشتركاً في باقة VIP وميزة إخفاء الإعلانات للمشتركين مفعلة
        const isVip = this.state.userProfile &&
                      this.state.userProfile.vipSubscription &&
                      this.state.userProfile.vipSubscription.active;
        if (admob.hideForVipSubscribers && isVip) return false;

        // 3. التحقق من تفعيل الإعلانات في القسم الحالي (المتجر أو المجتمع)
        if (contextType === 'store' && admob.showInStore === false) return false;
        if (contextType === 'community' && admob.showInCommunity === false) return false;

        // 4. فحص المسافة وفق الخوارزمية النظيفة
        const interval = this.getEffectiveAdInterval(contextType);
        return itemIndex1Based > 0 && (itemIndex1Based % interval === 0);
    },

    /**
     * إنشاء كود البطاقة الإعلانية الأفقية الشفافة مع زر الإغلاق الفوري (×)
     */
    createNativeAdSlotHtml: function (slotId, contextType = 'store') {
        // إذا قام المتصفح بإغلاق هذه البطاقة مسبقاً خلال تصفحه، لا نعيد إظهارها له
        if (this.state.dismissedAdSlots.has(slotId)) {
            return '';
        }

        const admob = (window.SafaqatConfig && window.SafaqatConfig.liveSettings.admobConfig) || {};
        const allowDismiss = admob.allowUserDismiss !== false;
        const publisherId = (admob.publisherId || '').trim();
        const unitId = (admob.nativeAdUnitId || admob.bannerAdUnitId || '').trim();
        const safeSlotId = this.escapeHtml(slotId);

        // تحميل سكريبت Google AdMob / AdSense تلقائياً عند وجود معرف ناشر حقيقي
        if (publisherId) {
            this.ensureAdMobScriptLoaded(publisherId);
        }

        // إذا كان التطبيق يعمل داخل بيئة أندرويد ومربوطاً بجسر AdMob الأصلي
        if (window.SafaqatNativeBridge && typeof window.SafaqatNativeBridge.requestNativeAdCard === 'function' && unitId) {
            setTimeout(() => {
                try {
                    window.SafaqatNativeBridge.requestNativeAdCard(slotId, unitId);
                } catch (e) {
                    console.warn("AdMob Native Bridge warning:", e);
                }
            }, 150);
        }

        return `
            <div class="safaqat-native-ad-slot" id="ad-container-${safeSlotId}" data-ad-context="${this.escapeHtml(contextType)}">
                <span class="native-ad-badge">إعلان ممول</span>
                
                <div class="native-ad-content" id="ad-body-${safeSlotId}">
                    ${publisherId && unitId ? `
                        <ins class="adsbygoogle"
                             style="display:block; width:100%; min-height:46px;"
                             data-ad-client="${this.escapeHtml(publisherId)}"
                             data-ad-slot="${this.escapeHtml(unitId)}"
                             data-ad-format="fluid"
                             data-full-width-responsive="true"></ins>
                    ` : `
                        <i class="fa-solid fa-sparkles" style="color: var(--accent-gold);"></i>
                        <span>مساحة إعلانية ذكية (AdMob Native) —تظهر بشكل شفاف وغير مزعج، ويمكنك تخصيص معرفها أو إيقافها من لوحة الإدارة.</span>
                    `}
                </div>

                ${allowDismiss ? `
                    <button type="button" class="native-ad-close-btn" 
                            onclick="SafaqatApp.dismissNativeAdSlot('${safeSlotId}')" 
                            title="إخفاء هذا الإعلان فوراً">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                ` : ''}
            </div>
        `;
    },

    /**
     * إغلاق البطاقة الإعلانية فوراً عند ضغط المستخدم على زر (×)
     */
    dismissNativeAdSlot: function (slotId) {
        this.state.dismissedAdSlots.add(slotId);
        const adEl = document.getElementById(`ad-container-${slotId}`);
        if (adEl) {
            adEl.style.opacity = '0';
            adEl.style.transform = 'scale(0.96)';
            setTimeout(() => adEl.remove(), 200);
        }
    },

    /**
     * حقن سكريبت إعلانات جوجل مرة واحدة فقط عند تفعيله من الإدارة
     */
    ensureAdMobScriptLoaded: function (publisherId) {
        if (!publisherId || document.getElementById('safaqat-google-ads-sdk')) return;
        const cleanClient = publisherId.startsWith('ca-') ? publisherId : `ca-${publisherId}`;
        const script = document.createElement('script');
        script.id = 'safaqat-google-ads-sdk';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cleanClient)}`;
        document.head.appendChild(script);
    },

    // ========================================================================
    // 2. محرك سلة المشتريات للنسخ الورقية والفواتير الذكية عبر الواتساب
    // ========================================================================
    initShoppingCartEngine: function () {
        this.updateHeaderCartBadge();

        const openCartBtn = document.getElementById('btn-open-cart');
        if (openCartBtn) {
            openCartBtn.addEventListener('click', () => {
                this.openShoppingCartModal();
            });
        }
    },

    saveCartToStorage: function () {
        localStorage.setItem('safaqat_paper_cart', JSON.stringify(this.state.cart));
        this.updateHeaderCartBadge();
    },

    updateHeaderCartBadge: function () {
        const badgeEl = document.getElementById('header-cart-count');
        if (!badgeEl) return;
        const totalItems = (this.state.cart || []).reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
        badgeEl.textContent = totalItems;
        badgeEl.style.display = totalItems > 0 ? 'flex' : 'none';
    },

    /**
     * إضافة كتاب ورقي إلى السلة (مع منع النسخ الرقمية الحصرية ومراعاة المخزون المطبوع)
     */
    addToPaperCart: function (bookId) {
        const book = (this.state.books || []).find((b) => b.id === bookId);
        if (!book) {
            this.showToast('⚠️ لم يتم العثور على الكتاب المطلوب');
            return;
        }

        // حماية صارمة: الكتب المعينة كـ "نسخة رقمية فقط" لا تدخل سلة الشحن الورقي أبداً
        if (book.isDigitalOnly === true) {
            this.showToast('📱 هذا الإصدار رقمي حصري ولا يتضمن نسخة ورقية للشحن');
            return;
        }

        // التحقق من عداد النسخ المطبوعة (إذا كانت الإدارة قد حددت عدداً معيناً)
        const hasExplicitStock = book.printStock !== undefined && book.printStock !== null && String(book.printStock).trim() !== '';
        const maxStock = hasExplicitStock ? parseInt(book.printStock, 10) : null;

        if (hasExplicitStock && !isNaN(maxStock) && maxStock <= 0) {
            this.showToast('⚠️ عذراً، نفدت النسخ المطبوعة المتاحة من هذا الكتاب حالياً');
            return;
        }

        const existingIndex = this.state.cart.findIndex((item) => item.bookId === bookId);
        if (existingIndex > -1) {
            const currentQty = this.state.cart[existingIndex].quantity || 1;
            if (hasExplicitStock && !isNaN(maxStock) && currentQty + 1 > maxStock) {
                this.showToast(`⚠️ الحد الأقصى المتاح من النسخ المطبوعة هو (${maxStock}) نسخ فقط`);
                return;
            }
            this.state.cart[existingIndex].quantity = currentQty + 1;
        } else {
            this.state.cart.push({
                bookId: book.id,
                title: book.title,
                author: book.author || 'مؤلف معتمد',
                publisherName: book.publisherName || 'دار صفقات كتابية',
                coverUrl: book.coverUrl || '',
                paperPrice: parseFloat(book.paperPrice ?? book.price ?? 0),
                customPaperPrices: book.customPaperPrices || null,
                maxStock: maxStock,
                quantity: 1
            });
        }

        this.saveCartToStorage();
        this.showToast(`🛍️ تمت إضافة النسخة الورقية من "${book.title}" إلى السلة`);
    },

    changeCartItemQuantity: function (bookId, delta) {
        const idx = this.state.cart.findIndex((item) => item.bookId === bookId);
        if (idx === -1) return;

        const item = this.state.cart[idx];
        const nextQty = (item.quantity || 1) + delta;

        if (nextQty <= 0) {
            this.removeCartItem(bookId);
            return;
        }

        // احترام سقف المخزون المطبوع إن وجد
        if (item.maxStock !== null && item.maxStock !== undefined && !isNaN(item.maxStock) && nextQty > item.maxStock) {
            this.showToast(`⚠️ لا يتوفر في المخزون المطبوع سوى (${item.maxStock}) نسخ`);
            return;
        }

        item.quantity = nextQty;
        this.saveCartToStorage();
        this.renderShoppingCartModal();
    },

    removeCartItem: function (bookId) {
        this.state.cart = this.state.cart.filter((item) => item.bookId !== bookId);
        this.saveCartToStorage();
        this.renderShoppingCartModal();
    },

    openShoppingCartModal: function () {
        const modal = document.getElementById('modal-shopping-cart');
        if (!modal) return;
        this.renderShoppingCartModal();
        modal.classList.remove('hidden');
    },

    renderShoppingCartModal: function () {
        const itemsContainer = document.getElementById('shopping-cart-items-container');
        const footerContainer = document.getElementById('shopping-cart-footer');
        if (!itemsContainer || !footerContainer) return;

        const cart = this.state.cart || [];
        if (cart.length === 0) {
            itemsContainer.innerHTML = `
                <div style="text-align: center; padding: 36px 16px;">
                    <i class="fa-solid fa-bag-shopping" style="font-size: 2.4rem; color: var(--text-muted); margin-bottom: 10px;"></i>
                    <h4 style="font-size: 0.95rem; margin-bottom: 4px;">سلة النسخ الورقية فارغة حالياً</h4>
                    <p style="font-size: 0.78rem; color: var(--text-muted);">تصفح المتجر وأضف الكتب الورقية المطبوعة لطلبها وتوصيلها إليك.</p>
                </div>
            `;
            footerContainer.innerHTML = '';
            return;
        }

        const currCode = window.SafaqatConfig.currentUserCurrency || 'SAR';
        const currMap = window.SafaqatConfig.liveSettings.currencySystem.supportedCurrencies || {};
        const currInfo = currMap[currCode] || { symbol: 'ر.س', rateFromSAR: 1 };

        let totalConvertedAmount = 0;

        itemsContainer.innerHTML = cart.map((item) => {
            // حساب سعر الوحدة بالعملة المختارة
            let unitPriceInTargetCurr = 0;
            if (item.customPaperPrices && item.customPaperPrices[currCode]) {
                unitPriceInTargetCurr = parseFloat(item.customPaperPrices[currCode]);
            } else {
                unitPriceInTargetCurr = (parseFloat(item.paperPrice) || 0) * (parseFloat(currInfo.rateFromSAR) || 1);
            }

            const lineTotal = unitPriceInTargetCurr * (item.quantity || 1);
            totalConvertedAmount += lineTotal;

            const formattedLineTotal = `${lineTotal >= 100 ? Math.round(lineTotal) : lineTotal.toFixed(2)} ${currInfo.symbol}`;
            const safeId = this.escapeHtml(item.bookId);

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-glass); margin-bottom: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary);">${this.escapeHtml(item.title)}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">${this.escapeHtml(item.publisherName || '')} • الإجمالي: <strong style="color: var(--accent-gold);">${formattedLineTotal}</strong></div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button type="button" class="header-icon-btn" style="width: 28px; height: 28px; font-size: 0.8rem;" onclick="SafaqatApp.changeCartItemQuantity('${safeId}', -1)">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <strong style="min-width: 22px; text-align: center; font-size: 0.86rem;">${item.quantity}</strong>
                        <button type="button" class="header-icon-btn" style="width: 28px; height: 28px; font-size: 0.8rem;" onclick="SafaqatApp.changeCartItemQuantity('${safeId}', 1)">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                        <button type="button" class="header-icon-btn" style="width: 28px; height: 28px; font-size: 0.8rem; color: var(--accent-danger);" onclick="SafaqatApp.removeCartItem('${safeId}')" title="حذف">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const formattedGrandTotal = `${totalConvertedAmount >= 100 ? Math.round(totalConvertedAmount) : totalConvertedAmount.toFixed(2)} ${currInfo.symbol}`;
        const defaultName = (this.state.userProfile && this.state.userProfile.displayName) || '';

        footerContainer.innerHTML = `
            <div style="padding: 12px; border-radius: var(--radius-sm); background: rgba(212, 175, 55, 0.1); border: 1px solid var(--border-gold); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.88rem; font-weight: 700;">الإجمالي التقديري للنسخ الورقية:</span>
                <strong style="font-size: 1.08rem; color: var(--accent-gold);">${formattedGrandTotal}</strong>
            </div>

            <form id="paper-checkout-whatsapp-form" style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="order-customer-name" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm);" 
                       placeholder="الاسم الكامل للمستلم" value="${this.escapeHtml(defaultName)}" required>
                <input type="tel" id="order-customer-phone" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm);" 
                       placeholder="رقم الجوال للتواصل والتوصيل" required>
                <input type="text" id="order-customer-address" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm);" 
                       placeholder="المدينة والعنوان التفصيلي لتسليم المندوب" required>
                
                <select id="order-payment-method" style="background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 0.84rem;">
                    <option value="الدفع عند الاستلام للمندوب">💵 الدفع عند الاستلام (عند وصول المندوب)</option>
                    <option value="تحويل بنكي / محفظة إلكترونية">🏦 تحويل بنكي / محفظة إلكترونية عبر الواتساب</option>
                </select>

                <button type="submit" class="btn-add-paper-cart" style="padding: 12px; font-size: 0.92rem; background: linear-gradient(135deg, #10b981, #059669); color: #fff;">
                    <i class="fa-brands fa-whatsapp" style="font-size: 1.15rem;"></i>
                    <span>إصدار الفاتورة وإرسال الطلب عبر واتساب</span>
                </button>
            </form>
        `;

        const checkoutForm = document.getElementById('paper-checkout-whatsapp-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitPaperCartOrder(formattedGrandTotal, currCode);
            });
        }
    },

    /**
     * حفظ الفاتورة في السحابة، تحديث المخزون الورقي الاختياري، وتوجيه الطلب إلى الواتساب
     */
    submitPaperCartOrder: async function (formattedGrandTotal, currencyCode) {
        const nameEl = document.getElementById('order-customer-name');
        const phoneEl = document.getElementById('order-customer-phone');
        const addressEl = document.getElementById('order-customer-address');
        const payMethodEl = document.getElementById('order-payment-method');

        const customerName = nameEl ? nameEl.value.trim() : '';
        const customerPhone = phoneEl ? phoneEl.value.trim() : '';
        const customerAddress = addressEl ? addressEl.value.trim() : '';
        const paymentMethod = payMethodEl ? payMethodEl.value : 'الدفع عند الاستلام';

        if (!customerName || !customerPhone || !customerAddress) {
            this.showToast('⚠️ يرجى تعبئة الاسم ورقم الجوال والعنوان لإتمام الطلب');
            return;
        }

        const invoiceCode = `SK-${Math.floor(100000 + Math.random() * 900000)}`;
        const cartItems = [...this.state.cart];

        const orderPayload = {
            invoiceCode: invoiceCode,
            userId: this.state.currentUser ? this.state.currentUser.uid : 'guest',
            customerName: customerName,
            customerPhone: customerPhone,
            customerAddress: customerAddress,
            paymentMethod: paymentMethod,
            currencyCode: currencyCode,
            formattedTotal: formattedGrandTotal,
            items: cartItems,
            status: 'pending_delivery',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 1. حفظ الفاتورة في Firestore وإنقاص عداد النسخ المطبوعة إن وجد
        if (window.db) {
            try {
                await window.db.collection(window.SAFAQAT_COLLECTIONS.ORDERS).add(orderPayload);

                // تحديث المخزون المطبوع للكتب التي لها عداد مخزون محدد
                for (const item of cartItems) {
                    const liveBook = (this.state.books || []).find((b) => b.id === item.bookId);
                    if (liveBook && liveBook.printStock !== undefined && liveBook.printStock !== null && String(liveBook.printStock).trim() !== '') {
                        const currentStock = parseInt(liveBook.printStock, 10);
                        if (!isNaN(currentStock) && currentStock > 0) {
                            const updatedStock = Math.max(0, currentStock - (item.quantity || 1));
                            await window.db.collection(window.SAFAQAT_COLLECTIONS.BOOKS).doc(liveBook.id).update({
                                printStock: updatedStock
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn("⚠️ تم تجهيز فاتورة الواتساب محلياً:", err);
            }
        }

        // 2. بناء رسالة الفاتورة الاحترافية للواتساب
        const itemsLines = cartItems.map((it, i) => `${i + 1}. كتاب: ${it.title} (الكمية: ${it.quantity})`).join('\n');
        const messageText = [
            `📚 *فاتورة طلب نسخ ورقية - منصة صفقات كتابية*`,
            `🔢 *رقم الفاتورة:* ${invoiceCode}`,
            `────────────────────`,
            `👤 *العميل:* ${customerName}`,
            `📱 *الجوال:* ${customerPhone}`,
            `📍 *العنوان:* ${customerAddress}`,
            `💳 *طريقة الدفع:* ${paymentMethod}`,
            `────────────────────`,
            `📦 *الكتب المطلوبة:*`,
            itemsLines,
            `────────────────────`,
            `💰 *الإجمالي المطلوب:* ${formattedGrandTotal}`,
            `شكراً لاختياركم صفقات كتابية!`
        ].join('\n');

        const rawWhatsapp = (window.SafaqatConfig.liveSettings.branding.officialWhatsappNumber || '966500000000').replace(/\D/g, '');
        const waUrl = `https://wa.me/${rawWhatsapp}?text=${encodeURIComponent(messageText)}`;

        // تفريغ السلة وإغلاق النافذة
        this.state.cart = [];
        this.saveCartToStorage();
        const modal = document.getElementById('modal-shopping-cart');
        if (modal) modal.classList.add('hidden');

        this.showToast(`✅ تم إصدار الفاتورة (${invoiceCode}) وجاري فتح الواتساب...`);
        window.open(waUrl, '_blank');
    }

});
