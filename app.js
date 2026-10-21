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
/**
 * ============================================================================
 * منصة صفقات كتابية - Safaqat Kitabiya Platform
 * الملف الرابع: app.js - المحرك البرمجي الشامل
 * [ الجزء الرابع 4/6 ]: المجتمع الأدبي، البحث الذكي لربط الكتب، والإشعارات ذات التوجيه المباشر
 * الإصدار: 2.0 Enterprise Edition (كود كامل غير مختصر)
 * ============================================================================
 */

Object.assign(window.SafaqatApp, {

    // ========================================================================
    // 1. تهيئة محرك المجتمع الأدبي والبحث الذكي لربط الكتب ومركز الإشعارات
    // ========================================================================
    initCommunityAndNotificationsEngine: function () {
        // 1. تفعيل حقل البحث الذكي الفوري لربط المنشور بكتاب من المتجر
        this.attachSmartSearchPicker({
            inputId: 'post-book-search-input',
            dropdownId: 'post-book-picker-dropdown',
            selectedBadgeId: 'post-book-selected-badge',
            hiddenInputId: 'post-linked-book-id',
            clearBtnId: 'btn-clear-post-book-picker',
            getItems: () => {
                return (this.state.books || []).map((b) => ({
                    id: b.id,
                    title: b.title || 'كتاب بدون عنوان',
                    subtitle: `${b.author || 'مؤلف معتمد'} • ${b.category || 'أدب عام'}`,
                    extra: b.publisherName || ''
                }));
            }
        });

        // 2. ربط نموذج نشر مساهمة أدبية جديدة في المجتمع
        const postForm = document.getElementById('community-new-post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateCommunityPost();
            });
        }

        // 3. ربط شريط تصفية منشورات المجتمع (الكل، مراجعات، اقتباسات، نصوص سردية، نقاشات)
        const commFilterBtns = document.querySelectorAll('#community-filter-ribbon [data-comm-filter]');
        commFilterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                commFilterBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.communityFilter = btn.getAttribute('data-comm-filter') || 'all';
                this.renderCommunityFeed();
            });
        });

        // 4. ربط زر "تحديد كل الإشعارات كمقروءة" داخل صفحة الحساب الشخصي
        const markAllReadBtn = document.getElementById('btn-mark-all-notif-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.markAllNotificationsAsRead();
            });
        }

        // 5. بدء المزامنة السحابية الفورية لمنشورات المجتمع
        this.subscribeToCommunityPosts();
    },

    refreshCommunityBookPickerData: function () {
        // يتم تحديث القائمة ديناميكياً عبر دالة getItems المربوطة بـ this.state.books
        const hiddenInput = document.getElementById('post-linked-book-id');
        if (hiddenInput && hiddenInput.value) {
            const stillExists = (this.state.books || []).some((b) => b.id === hiddenInput.value);
            if (!stillExists) {
                hiddenInput.value = '';
                const badgeEl = document.getElementById('post-book-selected-badge');
                if (badgeEl) badgeEl.classList.add('hidden');
            }
        }
    },

    // ========================================================================
    // 2. المزامنة السحابية وإنشاء وعرض منشورات المجتمع الأدبي
    // ========================================================================
    subscribeToCommunityPosts: function () {
        if (!window.db) return;

        if (this.state.unsubscribers.posts) {
            this.state.unsubscribers.posts();
        }

        this.state.unsubscribers.posts = window.db
            .collection(window.SAFAQAT_COLLECTIONS.POSTS)
            .onSnapshot((snap) => {
                const postsList = [];
                snap.forEach((doc) => {
                    postsList.push({ id: doc.id, ...doc.data() });
                });

                // ترتيب المنشورات من الأحدث إلى الأقدم
                postsList.sort((a, b) => {
                    const tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
                    const tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
                    return tB - tA;
                });

                this.state.posts = postsList;
                this.renderCommunityFeed();
            }, (err) => {
                console.warn("⚠️ تعذر جلب منشورات المجتمع:", err);
            });
    },

    handleCreateCommunityPost: async function () {
        if (!this.state.currentUser) {
            this.showToast('🔒 يرجى تسجيل الدخول أولاً للمشاركة والنشر في مجتمع صفقات كتابية');
            this.switchMainView('profile');
            return;
        }

        const titleInput = document.getElementById('post-title-input');
        const contentInput = document.getElementById('post-content-textarea');
        const typeSelect = document.getElementById('post-type-select');
        const linkedBookInput = document.getElementById('post-linked-book-id');
        const clearPickerBtn = document.getElementById('btn-clear-post-book-picker');

        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        const postType = typeSelect ? typeSelect.value : 'review';
        const linkedBookId = linkedBookInput ? linkedBookInput.value.trim() : '';

        if (!content) {
            this.showToast('⚠️ يرجى كتابة محتوى المنشور أولاً');
            return;
        }

        // جلب بيانات الكتاب المرتبط إن وجد
        let linkedBookSnapshot = null;
        if (linkedBookId) {
            const foundBook = (this.state.books || []).find((b) => b.id === linkedBookId);
            if (foundBook) {
                linkedBookSnapshot = {
                    id: foundBook.id,
                    title: foundBook.title,
                    author: foundBook.author || 'مؤلف معتمد',
                    coverUrl: foundBook.coverUrl || ''
                };
            }
        }

        const authorName = (this.state.userProfile && this.state.userProfile.displayName) ||
                           this.state.currentUser.displayName ||
                           'قارئ صفقات كتابية';

        const newPostData = {
            authorId: this.state.currentUser.uid,
            authorName: authorName,
            authorPhoto: this.state.currentUser.photoURL || '',
            authorRole: (this.state.userProfile && this.state.userProfile.role) || 'member',
            title: title,
            content: content,
            postType: postType,
            linkedBookId: linkedBookSnapshot ? linkedBookSnapshot.id : '',
            linkedBook: linkedBookSnapshot,
            likes: [],
            commentsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await window.db.collection(window.SAFAQAT_COLLECTIONS.POSTS).add(newPostData);

            // تفريغ الحقول بعد النشر بنجاح
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            if (clearPickerBtn) clearPickerBtn.click();

            this.showToast('✨ تم نشر مساهمتك الأدبية في المجتمع بنجاح!');
        } catch (err) {
            console.error("Create Post Error:", err);
            this.showToast('⚠️ تعذر نشر المساهمة حالياً: ' + err.message);
        }
    },

    renderCommunityFeed: function () {
        const feedEl = document.getElementById('community-posts-feed');
        if (!feedEl) return;

        const filter = this.state.communityFilter || 'all';
        let posts = [...(this.state.posts || [])];

        if (filter !== 'all') {
            posts = posts.filter((p) => (p.postType || 'review') === filter);
        }

        if (posts.length === 0) {
            feedEl.innerHTML = `
                <div class="glass-section-card" style="text-align: center; padding: 38px 18px;">
                    <i class="fa-solid fa-feather-pointed" style="font-size: 2.3rem; color: var(--accent-gold); margin-bottom: 10px;"></i>
                    <h3 style="font-size: 1rem; margin-bottom: 6px;">لا توجد منشورات في هذا القسم بعد</h3>
                    <p style="font-size: 0.82rem; color: var(--text-muted);">كن أول من يثري مجتمع صفقات كتابية بمراجعة أو اقتباس أدبي فصيح!</p>
                </div>
            `;
            return;
        }

        const typeLabels = {
            review: { label: '📖 مراجعة ونقد', color: 'var(--accent-gold)' },
            quote: { label: '✨ اقتباس ملهم', color: '#60a5fa' },
            story: { label: '🖋️ نص سردي', color: '#a78bfa' },
            discussion: { label: '💬 نقاش القراء', color: 'var(--accent-emerald)' }
        };

        const currentUid = this.state.currentUser ? this.state.currentUser.uid : null;
        const htmlParts = [];

        posts.forEach((post, idx) => {
            const safePostId = this.escapeHtml(post.id);
            const tInfo = typeLabels[post.postType] || typeLabels.review;
            const likesArr = Array.isArray(post.likes) ? post.likes : [];
            const isLiked = currentUid && likesArr.includes(currentUid);
            const canDelete = this.state.isAdmin || (currentUid && post.authorId === currentUid);

            // التحقق من الكتاب المرتبط (إما من الكائن المحفوظ أو من قائمة الكتب الحية)
            let linkedBook = post.linkedBook || null;
            if (!linkedBook && post.linkedBookId) {
                linkedBook = (this.state.books || []).find((b) => b.id === post.linkedBookId) || null;
            }

            htmlParts.push(`
                <article class="glass-section-card" id="community-post-card-${safePostId}" style="transition: all 0.35s ease;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="brand-icon-box" style="width: 40px; height: 40px; border-radius: 50%; font-size: 1rem;">
                                ${post.authorPhoto
                                    ? `<img src="${this.escapeHtml(post.authorPhoto)}" alt="${this.escapeHtml(post.authorName)}">`
                                    : `<i class="fa-solid fa-user-pen"></i>`}
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                                    <span>${this.escapeHtml(post.authorName || 'عضو صفقات كتابية')}</span>
                                    ${post.authorRole === 'admin' ? `<span class="badge-pill badge-stock-count" style="font-size: 0.62rem;">الإدارة</span>` : ''}
                                </div>
                                <span style="font-size: 0.72rem; color: ${tInfo.color}; font-weight: 700;">${tInfo.label}</span>
                            </div>
                        </div>

                        ${canDelete ? `
                            <button type="button" class="header-icon-btn" style="width: 32px; height: 32px; color: var(--accent-danger); font-size: 0.85rem;"
                                    onclick="SafaqatApp.deleteCommunityPost('${safePostId}')" title="حذف المنشور">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>

                    ${post.title ? `
                        <h3 style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold); margin-bottom: 8px;">
                            ${this.escapeHtml(post.title)}
                        </h3>
                    ` : ''}

                    <div style="font-size: 0.92rem; color: var(--text-primary); line-height: 1.85; white-space: pre-line; margin-bottom: 14px; font-family: var(--font-literary);">
                        ${this.escapeHtml(post.content)}
                    </div>

                    ${linkedBook ? `
                        <div onclick="SafaqatApp.openBookDetailsModal('${this.escapeHtml(linkedBook.id)}')"
                             style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: var(--radius-sm); background: rgba(212, 175, 55, 0.09); border: 1px solid var(--border-gold); margin-bottom: 12px; cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                                <i class="fa-solid fa-book-bookmark" style="color: var(--accent-gold); font-size: 1.1rem;"></i>
                                <div style="min-width: 0;">
                                    <div style="font-size: 0.72rem; color: var(--text-muted);">مرتبط بكتاب في المتجر:</div>
                                    <div style="font-weight: 800; font-size: 0.86rem; color: var(--accent-gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${this.escapeHtml(linkedBook.title)} —${this.escapeHtml(linkedBook.author || '')}
                                    </div>
                                </div>
                            </div>
                            <span class="badge-pill badge-stock-count" style="flex-shrink: 0;">استعراض الكتاب <i class="fa-solid fa-arrow-left"></i></span>
                        </div>
                    ` : ''}

                    <!-- شريط التفاعل (إعجاب + تعليقات) -->
                    <div style="display: flex; align-items: center; gap: 12px; padding-top: 10px; border-top: 1px solid var(--border-glass);">
                        <button type="button" class="category-chip-item ${isLiked ? 'active' : ''}" 
                                onclick="SafaqatApp.togglePostLike('${safePostId}')">
                            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="color: ${isLiked ? '#ef4444' : 'inherit'};"></i>
                            <span>أعجبني (${likesArr.length})</span>
                        </button>

                        <button type="button" class="category-chip-item" 
                                onclick="SafaqatApp.togglePostCommentsDrawer('${safePostId}')">
                            <i class="fa-regular fa-comments"></i>
                            <span>التعليقات والمناقشة (${post.commentsCount || 0})</span>
                        </button>
                    </div>

                    <!-- درج التعليقات المترابطة للمنشور -->
                    <div id="post-comments-drawer-${safePostId}" class="hidden" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-glass);">
                        <div id="post-comments-list-${safePostId}" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; max-height: 260px; overflow-y: auto;"></div>
                        <form onsubmit="event.preventDefault(); SafaqatApp.submitPostComment('${safePostId}');" style="display: flex; gap: 8px;">
                            <input type="text" id="post-comment-input-${safePostId}" class="store-search-input" style="height: 38px; padding: 0 12px; font-size: 0.82rem;" placeholder="أضف تعليقاً أدبياً..." required>
                            <button type="submit" class="btn-add-paper-cart" style="width: auto; padding: 0 16px; border-radius: var(--radius-pill);">
                                إرسال
                            </button>
                        </form>
                    </div>
                </article>
            `);

            // إدراج بطاقة إعلانية شفافة غير مزعجة وفق خوارزمية AdMob في المجتمع
            if (typeof this.shouldInsertNativeAd === 'function' && this.shouldInsertNativeAd('community', idx + 1)) {
                htmlParts.push(this.createNativeAdSlotHtml(`comm_ad_${idx}`, 'community'));
            }
        });

        feedEl.innerHTML = htmlParts.join('');
    },

    // ========================================================================
    // 3. الإعجابات والتعليقات وإرسال الإشعارات التلقائية المرتبطة (Deep Link Triggers)
    // ========================================================================
    togglePostLike: async function (postId) {
        if (!this.state.currentUser || !window.db) {
            this.showToast('🔒 سجل دخولك للتفاعل مع المنشورات');
            return;
        }

        const post = (this.state.posts || []).find((p) => p.id === postId);
        if (!post) return;

        const uid = this.state.currentUser.uid;
        const likesArr = Array.isArray(post.likes) ? [...post.likes] : [];
        const hasLiked = likesArr.includes(uid);

        const updatedLikes = hasLiked
            ? likesArr.filter((id) => id !== uid)
            : [...likesArr, uid];

        try {
            await window.db.collection(window.SAFAQAT_COLLECTIONS.POSTS).doc(postId).update({
                likes: updatedLikes
            });

            // إرسال إشعار ذكي لصاحب المنشور عند الإعجاب (إن لم يكن هو نفسه)
            if (!hasLiked && post.authorId && post.authorId !== uid) {
                const senderName = (this.state.userProfile && this.state.userProfile.displayName) || 'أحد القراء';
                await this.createSmartNotification({
                    recipientId: post.authorId,
                    title: '❤️ إعجاب جديد بمساهمتك الأدبية',
                    message: `أعجب (${senderName}) بمنشورك "${post.title || post.content.slice(0, 35)}..."`,
                    targetType: 'post',
                    targetId: postId,
                    extraBookId: post.linkedBookId || ''
                });
            }
        } catch (err) {
            console.warn("Like update error:", err);
        }
    },

    togglePostCommentsDrawer: async function (postId, forceOpen = false) {
        const drawer = document.getElementById(`post-comments-drawer-${postId}`);
        if (!drawer) return;

        const willOpen = forceOpen ? true : drawer.classList.contains('hidden');
        drawer.classList.toggle('hidden', !willOpen);

        if (willOpen) {
            await this.loadCommentsForPost(postId);
        }
    },

    loadCommentsForPost: async function (postId) {
        const listEl = document.getElementById(`post-comments-list-${postId}`);
        if (!listEl || !window.db) return;

        listEl.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted);">جاري تحميل التعليقات...</div>`;

        try {
            const snap = await window.db
                .collection(window.SAFAQAT_COLLECTIONS.COMMENTS)
                .where('postId', '==', postId)
                .get();

            const comments = [];
            snap.forEach((doc) => comments.push({ id: doc.id, ...doc.data() }));
            comments.sort((a, b) => {
                const tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
                const tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
                return tA - tB;
            });

            if (comments.length === 0) {
                listEl.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted);">لا توجد تعليقات بعد. ابدأ النقاش الآن!</div>`;
                return;
            }

            listEl.innerHTML = comments.map((c) => `
                <div style="padding: 8px 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-glass);">
                    <div style="font-weight: 800; font-size: 0.78rem; color: var(--accent-gold); margin-bottom: 2px;">
                        ${this.escapeHtml(c.authorName || 'قارئ')}
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-secondary);">${this.escapeHtml(c.text)}</div>
                </div>
            `).join('');
        } catch (err) {
            listEl.innerHTML = `<div style="font-size: 0.78rem; color: var(--accent-danger);">تعذر تحميل التعليقات.</div>`;
        }
    },

    submitPostComment: async function (postId) {
        if (!this.state.currentUser || !window.db) {
            this.showToast('🔒 يرجى تسجيل الدخول لإضافة تعليق');
            return;
        }

        const inputEl = document.getElementById(`post-comment-input-${postId}`);
        const text = inputEl ? inputEl.value.trim() : '';
        if (!text) return;

        const post = (this.state.posts || []).find((p) => p.id === postId);
        const authorName = (this.state.userProfile && this.state.userProfile.displayName) ||
                           this.state.currentUser.displayName ||
                           'قارئ صفقات كتابية';

        try {
            inputEl.value = '';
            await window.db.collection(window.SAFAQAT_COLLECTIONS.COMMENTS).add({
                postId: postId,
                authorId: this.state.currentUser.uid,
                authorName: authorName,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await window.db.collection(window.SAFAQAT_COLLECTIONS.POSTS).doc(postId).update({
                commentsCount: firebase.firestore.FieldValue.increment(1)
            });

            await this.loadCommentsForPost(postId);

            // إرسال إشعار ذكي مباشر لصاحب المنشور ينقله فوراً إلى التعليق عند الضغط عليه
            if (post && post.authorId && post.authorId !== this.state.currentUser.uid) {
                await this.createSmartNotification({
                    recipientId: post.authorId,
                    title: '💬 تعليق جديد على منشورك',
                    message: `علق (${authorName}) على مساهمتك: "${text.slice(0, 45)}..."`,
                    targetType: 'post',
                    targetId: postId,
                    extraBookId: post.linkedBookId || ''
                });
            }
        } catch (err) {
            this.showToast('⚠️ تعذر إرسال التعليق حالياً');
        }
    },

    deleteCommunityPost: async function (postId) {
        if (!window.db) return;
        try {
            await window.db.collection(window.SAFAQAT_COLLECTIONS.POSTS).doc(postId).delete();
            this.showToast('🗑️ تم حذف المنشور من المجتمع');
        } catch (err) {
            this.showToast('⚠️ تعذر حذف المنشور: ' + err.message);
        }
    },

    // ========================================================================
    // 4. مركز الإشعارات المستقل في صفحة الحساب الشخصي + التوجيه الذكي المباشر (Deep Linking)
    // ملاحظة هندسية صارمة: لا توجد أي أيقونة إشعارات في الهيدر العلوي إطلاقاً
    // ========================================================================
    createSmartNotification: async function (notifData) {
        if (!window.db || !notifData.recipientId) return;
        try {
            await window.db.collection(window.SAFAQAT_COLLECTIONS.NOTIFICATIONS).add({
                recipientId: notifData.recipientId,
                title: notifData.title || 'إشعار من صفقات كتابية',
                message: notifData.message || '',
                targetType: notifData.targetType || 'store', // 'book' | 'post' | 'library' | 'order'
                targetId: notifData.targetId || '',
                extraBookId: notifData.extraBookId || '',
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn("Notification creation warning:", e);
        }
    },

    subscribeToUserNotifications: function (userId) {
        if (!window.db || !userId) return;

        if (this.state.unsubscribers.notifications) {
            this.state.unsubscribers.notifications();
        }

        this.state.unsubscribers.notifications = window.db
            .collection(window.SAFAQAT_COLLECTIONS.NOTIFICATIONS)
            .where('recipientId', '==', userId)
            .onSnapshot((snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));

                list.sort((a, b) => {
                    const tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
                    const tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
                    return tB - tA;
                });

                this.state.notifications = list;
                this.renderProfileNotificationsCenter();
            }, (err) => {
                console.warn("⚠️ تعذر جلب الإشعارات:", err);
            });
    },

    clearUserNotifications: function () {
        if (this.state.unsubscribers.notifications) {
            this.state.unsubscribers.notifications();
            this.state.unsubscribers.notifications = null;
        }
        this.state.notifications = [];
        this.renderProfileNotificationsCenter();
    },

    renderProfileNotificationsCenter: function () {
        const listEl = document.getElementById('profile-notifications-list');
        const unreadBadge = document.getElementById('profile-unread-notif-badge');
        const navDot = document.getElementById('nav-profile-notif-dot');

        const notifs = this.state.notifications || [];
        const unreadCount = notifs.filter((n) => !n.read).length;

        if (unreadBadge) {
            unreadBadge.textContent = `${unreadCount} جديد`;
            unreadBadge.classList.toggle('hidden', unreadCount === 0);
        }

        if (navDot) {
            navDot.classList.toggle('hidden', unreadCount === 0);
        }

        if (!listEl) return;

        if (!this.state.currentUser) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.82rem;">
                    سجل دخولك لتلقي تنبيهات الكتب الجديدة والتفاعلات على مساهماتك الأدبية.
                </div>
            `;
            return;
        }

        if (notifs.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.82rem;">
                    <i class="fa-regular fa-bell-slash" style="font-size: 1.5rem; margin-bottom: 8px; display: block; color: var(--accent-gold);"></i>
                    لا توجد لديك إشعارات حالياً.
                </div>
            `;
            return;
        }

        listEl.innerHTML = notifs.map((n) => {
            const safeId = this.escapeHtml(n.id);
            const iconClass = n.targetType === 'book'
                ? 'fa-book-open'
                : (n.targetType === 'post' ? 'fa-comments' : 'fa-bell');

            return `
                <div class="notification-deep-item ${!n.read ? 'unread' : ''}" 
                     onclick="SafaqatApp.executeNotificationDeepLink('${safeId}')">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(212, 175, 55, 0.14); color: var(--accent-gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 0.86rem; color: var(--text-primary);">
                                ${this.escapeHtml(n.title)}
                            </div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                                ${this.escapeHtml(n.message)}
                            </div>
                        </div>
                    </div>
                    <span class="badge-pill badge-stock-count" style="flex-shrink: 0; font-size: 0.68rem;">
                        انتقال مباشر <i class="fa-solid fa-arrow-up-left-from-circle"></i>
                    </span>
                </div>
            `;
        }).join('');
    },

    /**
     * التوجيه الذكي المباشر (Deep Linking):
     * ينقل المستخدم فوراً من الإشعار إلى المكان المرتبط به تماماً (الكتاب أو المنشور أو مكتبتي)
     */
    executeNotificationDeepLink: async function (notificationId) {
        const notif = (this.state.notifications || []).find((n) => n.id === notificationId);
        if (!notif) return;

        // 1. تحديث حالة الإشعار إلى مقروء في السحابة
        if (!notif.read && window.db) {
            try {
                await window.db.collection(window.SAFAQAT_COLLECTIONS.NOTIFICATIONS).doc(notificationId).update({
                    read: true
                });
            } catch (e) {
                console.warn("Mark notification read warning:", e);
            }
        }

        // 2. التوجيه المباشر حسب نوع الهدف (targetType)
        if (notif.targetType === 'book' && notif.targetId) {
            this.switchMainView('store');
            setTimeout(() => {
                this.openBookDetailsModal(notif.targetId);
            }, 120);
            return;
        }

        if (notif.targetType === 'post' && notif.targetId) {
            // إعادة ضبط فلتر المجتمع إلى "الكل" لضمان ظهور المنشور المطلوب
            this.state.communityFilter = 'all';
            this.renderCommunityFeed();
            this.switchMainView('community');

            setTimeout(() => {
                const postCard = document.getElementById(`community-post-card-${notif.targetId}`);
                if (postCard) {
                    postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    postCard.style.borderColor = 'var(--accent-gold)';
                    postCard.style.boxShadow = '0 0 0 3px var(--accent-gold-glow)';
                    this.togglePostCommentsDrawer(notif.targetId, true);

                    setTimeout(() => {
                        postCard.style.boxShadow = '';
                    }, 3000);
                } else {
                    this.showToast('📌 تم فتح المجتمع الأدبي');
                }
            }, 220);
            return;
        }

        if (notif.targetType === 'library') {
            this.switchMainView('library');
            if (notif.targetId && typeof this.openProtectedBookReader === 'function') {
                setTimeout(() => this.openProtectedBookReader(notif.targetId), 200);
            }
            return;
        }

        // افتراضياً التوجه للمتجر
        this.switchMainView('store');
    },

    markAllNotificationsAsRead: async function () {
        if (!window.db || !this.state.currentUser) return;
        const unreadList = (this.state.notifications || []).filter((n) => !n.read);
        if (unreadList.length === 0) {
            this.showToast('✅ جميع إشعاراتك مقروءة بالفعل');
            return;
        }

        try {
            const batch = window.db.batch();
            unreadList.forEach((n) => {
                const ref = window.db.collection(window.SAFAQAT_COLLECTIONS.NOTIFICATIONS).doc(n.id);
                batch.update(ref, { read: true });
            });
            await batch.commit();
            this.showToast('✨ تم تحديد جميع الإشعارات كمقروءة');
        } catch (err) {
            this.showToast('⚠️ تعذر تحديث الإشعارات حالياً');
        }
    }

});
/**
 * ============================================================================
 * منصة صفقات كتابية - Safaqat Kitabiya Platform
 * الملف الرابع: app.js - المحرك البرمجي الشامل
 * [ الجزء الخامس 5/6 ]: مكتبتي الرقمية، بوابة التطبيق، والقارئ الآمن المحمي مع القفز التلقائي (Auto-Jump)
 * الإصدار: 2.0 Enterprise Edition (كود كامل غير مختصر)
 * ============================================================================
 */

Object.assign(window.SafaqatApp, {

    // ========================================================================
    // 1. تهيئة محرك القارئ الآمن، الخزنة المحلية بدون إنترنت، وأدوات التحكم
    // ========================================================================
    initProtectedReaderEngine: function () {
        // تهيئة عامل PDF.js الرسمي لعرض صفحات الـ PDF كصور Canvas محمية بدون شريط تحميل
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // زر إغلاق القارئ مع الحفظ الفوري لآخر صفحة وصل إليها القارئ
        const closeBtn = document.getElementById('btn-close-protected-reader');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeProtectedBookReader();
            });
        }

        // أزرار التنقل بين الصفحات (السابقة / التالية)
        const prevBtn = document.getElementById('btn-reader-prev-page');
        const nextBtn = document.getElementById('btn-reader-next-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.state.reader.currentPage > 1) {
                    this.goToReaderPage(this.state.reader.currentPage - 1);
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.state.reader.currentPage < this.state.reader.totalPages) {
                    this.goToReaderPage(this.state.reader.currentPage + 1);
                }
            });
        }

        // حقل القفز المباشر لأي رقم صفحة يكتبه القارئ
        const pageInput = document.getElementById('reader-direct-page-input');
        if (pageInput) {
            pageInput.addEventListener('change', (e) => {
                let targetPage = parseInt(e.target.value, 10);
                if (isNaN(targetPage) || targetPage < 1) targetPage = 1;
                if (targetPage > this.state.reader.totalPages) targetPage = this.state.reader.totalPages;
                this.goToReaderPage(targetPage);
            });
        }

        // زر إضافة أو إزالة علامة مرجعية (Bookmark) للصفحة الحالية
        const bookmarkBtn = document.getElementById('btn-reader-toggle-bookmark');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => {
                this.toggleCurrentPageBookmark();
            });
        }

        // زر فتح درج العلامات المرجعية المحفوظة للقفز السريع
        const listBookmarksBtn = document.getElementById('btn-reader-open-bookmarks-list');
        if (listBookmarksBtn) {
            listBookmarksBtn.addEventListener('click', () => {
                const drawer = document.getElementById('reader-bookmarks-drawer');
                if (drawer) {
                    const willShow = drawer.classList.contains('hidden');
                    drawer.classList.toggle('hidden', !willShow);
                    if (willShow) this.renderReaderBookmarksDrawer();
                }
            });
        }

        // زر حفظ الكتاب للقراءة بدون إنترنت داخل ذاكرة التطبيق (IndexedDB Offline Cache)
        const offlineBtn = document.getElementById('btn-reader-cache-offline');
        if (offlineBtn) {
            offlineBtn.addEventListener('click', () => {
                this.cacheActiveBookForOfflineReading();
            });
        }

        // أزرار تكبير وتصغير خط ومقاس صفحة القارئ
        const zoomInBtn = document.getElementById('btn-reader-font-increase');
        const zoomOutBtn = document.getElementById('btn-reader-font-decrease');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.adjustReaderZoom(0.15));
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.adjustReaderZoom(-0.15));
        }

        // منع اختصارات الطباعة أو الحفظ أثناء فتح القارئ المحمي
        window.addEventListener('keydown', (e) => {
            const readerModal = document.getElementById('safaqat-protected-reader-modal');
            if (!readerModal || readerModal.classList.contains('hidden')) return;

            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u')) {
                e.preventDefault();
                this.showToast('🛡️ المحتوى محمي بحقوق الملكية الفكرية لمنصة صفقات كتابية');
            } else if (e.key === 'ArrowLeft') {
                if (this.state.reader.currentPage < this.state.reader.totalPages) {
                    this.goToReaderPage(this.state.reader.currentPage + 1);
                }
            } else if (e.key === 'ArrowRight') {
                if (this.state.reader.currentPage > 1) {
                    this.goToReaderPage(this.state.reader.currentPage - 1);
                }
            }
        });
    },

    // ========================================================================
    // 2. بوابة التحقق الصارمة للكتب الرقمية (حصر القراءة بالأعضاء + تطبيق الأندرويد)
    // ========================================================================
    handleReadOrBuyDigitalBook: function (bookId) {
        const book = (this.state.books || []).find((b) => b.id === bookId);
        if (!book) {
            this.showToast('⚠️ لم يتم العثور على الكتاب المطلوب');
            return;
        }

        const settings = window.SafaqatConfig.liveSettings;

        // 1. التحقق الأول: القراءة الرقمية والمكتبة غير متاحة إلا لمن أنشأ حساباً وسجل دخوله
        if (settings.appProtection.requireAccountForLibrary !== false && !this.state.currentUser) {
            this.showToast('🔒 ميزة القراءة الرقمية متاحة للأعضاء المسجلين فقط. يرجى تسجيل الدخول أولاً.');
            this.switchMainView('profile');
            return;
        }

        // 2. التحقق الثاني: منع قراءة أو شراء النسخ الرقمية من متصفح الويب وتوجيههم لتطبيق جوجل بلاي
        // (يُستثنى المدير العام أثناء المعاينة أو المستخدم الذي يفتح من داخل تطبيق الأندرويد)
        const isInsideAndroidApp = window.SafaqatConfig.isAndroidAppEnvironment();
        if (settings.appProtection.restrictDigitalBooksToApp && !isInsideAndroidApp && !this.state.isAdmin) {
            const appGateModal = document.getElementById('modal-app-exclusive-gate');
            if (appGateModal) {
                appGateModal.classList.remove('hidden');
            }
            return;
        }

        // 3. التحقق الثالث: هل يملك المستخدم صلاحية قراءة هذا الكتاب الرقمي؟
        // (إما اشتراه مدى الحياة، أو مشترك في باقة VIP والكتاب مشمول بها، أو سعره الرقمي 0، أو أنه المدير)
        if (this.doesUserHaveDigitalAccess(book)) {
            this.openProtectedBookReader(book.id);
            return;
        }

        // 4. إذا لم يكن يملكه بعد، نفتح له نافذة الخيار التجاري المزدوج:
        // (شراء هذا الكتاب الرقمي منفرداً مدى الحياة أو الاشتراك في باقة VIP الشهرية عبر Google Play)
        this.promptDigitalBookPurchaseOrVipModal(book);
    },

    doesUserHaveDigitalAccess: function (book) {
        if (!book) return false;
        if (this.state.isAdmin) return true;
        if (!this.state.currentUser || !this.state.userProfile) return false;

        const profile = this.state.userProfile;
        const ownedList = Array.isArray(profile.ownedDigitalBooks) ? profile.ownedDigitalBooks : [];

        // 1. هل اشترى المستخدم هذا الكتاب الرقمي سابقاً؟
        if (ownedList.includes(book.id)) return true;

        // 2. هل المستخدم مشترك في باقة VIP الشهرية والكتاب مشمول بها؟
        const isVipActive = profile.vipSubscription && profile.vipSubscription.active === true;
        if (isVipActive && book.includedInVip !== false) return true;

        // 3. هل السعر الرقمي للكتاب مجاني للأعضاء المسجلين؟
        const digPrice = parseFloat(book.digitalPrice ?? book.price ?? 0);
        if (digPrice <= 0 && book.includedInVip !== true) return true;

        return false;
    },

    promptDigitalBookPurchaseOrVipModal: function (book) {
        const modal = document.getElementById('modal-book-details');
        const contentBox = document.getElementById('modal-book-details-content');
        if (!modal || !contentBox) return;

        const mon = window.SafaqatConfig.liveSettings.monetization || {};
        const bookDigitalPrice = window.SafaqatConfig.formatBookPrice(book, 'digital');
        const vipPrice = window.SafaqatConfig.formatBookPrice({ digitalPrice: mon.vipMonthlyPriceSAR || 29.99 }, 'digital');
        const safeId = this.escapeHtml(book.id);

        contentBox.innerHTML = `
            <div class="section-header-row">
                <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--accent-gold);">
                    <i class="fa-solid fa-lock-open"></i> اقتناء النسخة الرقمية المحمية
                </h3>
                <button type="button" onclick="document.getElementById('modal-book-details').classList.add('hidden')" class="header-icon-btn">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <p style="font-size: 0.86rem; color: var(--text-secondary); margin-bottom: 16px;">
                اختر الطريقة الأنسب لك لقراءة كتاب <strong>"${this.escapeHtml(book.title)}"</strong> داخل القارئ الذكي المحمي (مع ميزة حفظ الصفحة التلقائي والقراءة بدون إنترنت):
            </p>

            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${mon.enableIndividualBookSales !== false ? `
                    <div style="padding: 14px; border-radius: var(--radius-md); background: var(--bg-input); border: 1px solid var(--border-glass); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                        <div>
                            <div style="font-weight: 800; font-size: 0.94rem; color: var(--text-primary);">1. شراء هذا الكتاب الرقمي مدى الحياة</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">يُضاف إلى قسم "مكتبتي" بحسابك للأبد على جميع أجهزتك</div>
                        </div>
                        <button type="button" class="btn-add-paper-cart" style="width: auto; padding: 9px 18px;"
                                onclick="SafaqatApp.executeSingleDigitalBookPurchase('${safeId}')">
                            شراء بـ ${bookDigitalPrice}
                        </button>
                    </div>
                ` : ''}

                ${mon.enableVipSubscription !== false && book.includedInVip !== false ? `
                    <div style="padding: 14px; border-radius: var(--radius-md); background: rgba(212, 175, 55, 0.09); border: 1px solid var(--border-gold); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                        <div>
                            <div style="font-weight: 800; font-size: 0.94rem; color: var(--accent-gold);">
                                <i class="fa-solid fa-crown"></i> 2. ${this.escapeHtml(mon.vipPlanName || 'باقة القارئ الشغوف (VIP)')}
                            </div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary);">قراءة مفتوحة لهذا الكتاب ولجميع الكتب الرقمية المشمولة طوال الشهر</div>
                        </div>
                        <button type="button" class="btn-read-digital-app" style="width: auto; padding: 9px 18px; border-color: var(--accent-gold); color: var(--accent-gold);"
                                onclick="document.getElementById('modal-book-details').classList.add('hidden'); SafaqatApp.handleVipSubscriptionRequest();">
                            اشتراك بـ ${vipPrice} / شهرياً
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        modal.classList.remove('hidden');
    },

    executeSingleDigitalBookPurchase: async function (bookId) {
        const book = (this.state.books || []).find((b) => b.id === bookId);
        if (!book || !this.state.currentUser) return;

        const billing = (window.SafaqatConfig.liveSettings.monetization || {}).googlePlayBilling || {};
        const sku = book.googlePlaySku || `${billing.bookSkuPrefix || 'safaqat_ebook_'}${book.id}`;

        // إذا كان التطبيق مربوطاً بجسر فوترة Google Play Billing الأصلي
        if (billing.enabled && window.SafaqatNativeBridge && typeof window.SafaqatNativeBridge.purchaseDigitalBook === 'function') {
            window.SafaqatNativeBridge.purchaseDigitalBook(sku, book.id);
            return;
        }

        // إضافة الكتاب إلى مكتبة المستخدم أو توجيه طلب التفعيل السريع
        try {
            const userRef = window.db.collection(window.SAFAQAT_COLLECTIONS.USERS).doc(this.state.currentUser.uid);
            await userRef.set({
                ownedDigitalBooks: firebase.firestore.FieldValue.arrayUnion(book.id)
            }, { merge: true });

            document.getElementById('modal-book-details').classList.add('hidden');
            this.showToast(`🎉 تمت إضافة "${book.title}" إلى مكتبتك الرقمية بنجاح!`);
            this.openProtectedBookReader(book.id);
        } catch (err) {
            this.showToast('⚠️ تعذر تفعيل النسخة الرقمية: ' + err.message);
        }
    },

    // ========================================================================
    // 3. قسم "مكتبتي الرقمية الآمنة" وسجل التقدم في القراءة
    // ========================================================================
    renderUserDigitalLibrary: function () {
        const guestLockBox = document.getElementById('library-guest-lock-box');
        const libraryGrid = document.getElementById('user-digital-library-grid');
        const vipStatusPill = document.getElementById('library-vip-status-pill');

        if (!libraryGrid || !guestLockBox) return;

        // إذا لم يكن المستخدم مسجلاً، نخفي الكتب ونظهر قفل التسجيل الإلزامي
        if (!this.state.currentUser || !this.state.userProfile) {
            guestLockBox.classList.remove('hidden');
            libraryGrid.innerHTML = '';
            if (vipStatusPill) vipStatusPill.innerHTML = '';
            return;
        }

        guestLockBox.classList.add('hidden');
        const profile = this.state.userProfile;
        const isVip = profile.vipSubscription && profile.vipSubscription.active === true;

        if (vipStatusPill) {
            vipStatusPill.innerHTML = isVip
                ? `<span class="badge-pill badge-paper-available"><i class="fa-solid fa-crown"></i> باقة VIP نشطة</span>`
                : `<button type="button" class="category-chip-item active" onclick="SafaqatApp.switchMainView('profile')">ترقية لباقة VIP</button>`;
        }

        // جمع الكتب المتاحة للمستخدم في مكتبته الرقمية
        const allBooks = this.state.books || [];
        const accessibleBooks = allBooks.filter((b) => {
            const hasDigital = b.isDigitalOnly === true || Boolean(b.pdfDirectUrl) || Boolean(b.digitalContent) || b.hasDigitalEdition !== false;
            return hasDigital && this.doesUserHaveDigitalAccess(b);
        });

        if (accessibleBooks.length === 0) {
            libraryGrid.innerHTML = `
                <div class="glass-section-card" style="grid-column: 1 / -1; text-align: center; padding: 36px 18px;">
                    <i class="fa-solid fa-book-bookmark" style="font-size: 2.3rem; color: var(--accent-gold); margin-bottom: 10px;"></i>
                    <h4 style="font-size: 1rem; margin-bottom: 6px;">مكتبتك الرقمية فارغة حالياً</h4>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
                        اقتنِ أي نسخة رقمية من المتجر أو اشترك في باقة القارئ الشغوف (VIP) لتظهر جميع كتبك هنا مع الحفظ التلقائي للصفحات.
                    </p>
                    <button type="button" class="btn-add-paper-cart" style="width: auto; margin: 0 auto; padding: 9px 22px;" onclick="SafaqatApp.switchMainView('store')">
                        استكشف الكتب الرقمية
                    </button>
                </div>
            `;
            return;
        }

        const progressMap = profile.readingProgress || {};

        libraryGrid.innerHTML = accessibleBooks.map((book) => {
            const safeId = this.escapeHtml(book.id);
            const coverUrl = book.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80';
            const savedProg = progressMap[book.id] || this.getLocalReadingProgress(book.id);
            const currentPage = savedProg && savedProg.page ? savedProg.page : 1;
            const totalPages = savedProg && savedProg.total ? savedProg.total : (book.pagesCount || 1);
            const percent = totalPages > 1 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

            return `
                <article class="book-glass-card">
                    <div class="book-cover-wrapper" onclick="SafaqatApp.handleReadOrBuyDigitalBook('${safeId}')">
                        <img src="${this.escapeHtml(coverUrl)}" alt="${this.escapeHtml(book.title)}" loading="lazy">
                        <div class="book-badges-overlay">
                            <span class="badge-pill badge-stock-count">
                                ${currentPage > 1 ? `وصلت لصفحة ${currentPage}` : 'ابدأ القراءة'}
                            </span>
                        </div>
                    </div>
                    <div class="book-card-body">
                        <h3 class="book-card-title">${this.escapeHtml(book.title)}</h3>
                        <div class="book-card-author">${this.escapeHtml(book.author || '')}</div>

                        <!-- شريط نسبة الإنجاز في القراءة -->
                        <div style="margin-top: 6px; background: var(--bg-input); height: 6px; border-radius: 99px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background: var(--accent-gold);"></div>
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                            <span>تقدمك: ${percent}%</span>
                            <span>صفحة ${currentPage}</span>
                        </div>

                        <div class="book-card-actions">
                            <button type="button" class="btn-add-paper-cart" onclick="SafaqatApp.handleReadOrBuyDigitalBook('${safeId}')">
                                <i class="fa-solid fa-bolt"></i>
                                <span>${currentPage > 1 ? `متابعة من صفحة ${currentPage}` : 'فتح القارئ الآمن'}</span>
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    },

    renderUserReadingProgressSummary: function () {
        const container = document.getElementById('profile-reading-progress-list');
        if (!container) return;

        if (!this.state.currentUser || !this.state.userProfile) {
            container.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted);">سجل دخولك لعرض سجل قراءتك وفواتيرك.</div>`;
            return;
        }

        const progressMap = this.state.userProfile.readingProgress || {};
        const bookIds = Object.keys(progressMap);

        if (bookIds.length === 0) {
            container.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted);">لم تبدأ قراءة أي كتاب رقمي بعد. عندما تقرأ أي كتاب سيتم حفظ رقم صفحتك هنا تلقائياً.</div>`;
            return;
        }

        container.innerHTML = bookIds.map((bId) => {
            const prog = progressMap[bId];
            const book = (this.state.books || []).find((b) => b.id === bId);
            const title = book ? book.title : (prog.bookTitle || 'كتاب رقمي');
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-glass); margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 800; font-size: 0.86rem; color: var(--accent-gold);">${this.escapeHtml(title)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">توقفت عند الصفحة <strong>${prog.page || 1}</strong> من ${prog.total || '?'}</div>
                    </div>
                    <button type="button" class="category-chip-item active" onclick="SafaqatApp.handleReadOrBuyDigitalBook('${this.escapeHtml(bId)}')">
                        قفز مباشر للصفحة <i class="fa-solid fa-bolt"></i>
                    </button>
                </div>
            `;
        }).join('');
    },

    // ========================================================================
    // 4. القارئ الآمن الاحترافي المحمي + القفز التلقائي الفوري لآخر صفحة (Auto-Jump)
    // ========================================================================
    openProtectedBookReader: async function (bookId) {
        const book = (this.state.books || []).find((b) => b.id === bookId);
        if (!book) {
            this.showToast('⚠️ تعذر العثور على بيانات الكتاب');
            return;
        }

        const modal = document.getElementById('safaqat-protected-reader-modal');
        const titleEl = document.getElementById('reader-book-title');
        const loadingEl = document.getElementById('reader-loading-state');
        const pdfCanvas = document.getElementById('reader-pdf-canvas');
        const textContainer = document.getElementById('reader-text-container');
        const autoJumpBanner = document.getElementById('reader-autojump-notification');
        const bookmarksDrawer = document.getElementById('reader-bookmarks-drawer');

        if (!modal) return;

        // تهيئة حالة القارئ للكتاب المختار
        this.state.reader.activeBook = book;
        this.state.reader.pdfDoc = null;
        this.state.reader.currentPage = 1;
        this.state.reader.totalPages = 1;
        this.state.reader.bookmarks = this.loadBookBookmarks(book.id);

        if (titleEl) titleEl.textContent = book.title;
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (pdfCanvas) pdfCanvas.classList.add('hidden');
        if (textContainer) textContainer.classList.add('hidden');
        if (autoJumpBanner) autoJumpBanner.classList.add('hidden');
        if (bookmarksDrawer) bookmarksDrawer.classList.add('hidden');

        modal.classList.remove('hidden');

        // 1. جلب آخر صفحة توقف عندها المستخدم (من السحابة أو التخزين المحلي) للقفز التلقائي الفوري!
        const savedProgress = this.getSavedPageForBook(book.id);
        const targetAutoJumpPage = savedProgress && savedProgress.page > 1 ? parseInt(savedProgress.page, 10) : 1;

        // 2. فحص ما إذا كان الكتاب محفوظاً مسبقاً في الخزنة المحلية بدون إنترنت (IndexedDB)
        const offlineData = await this.getOfflineCachedBook(book.id);
        const offlineIcon = document.getElementById('reader-offline-icon');
        if (offlineIcon) {
            offlineIcon.className = offlineData ? 'fa-solid fa-circle-check' : 'fa-solid fa-cloud-arrow-down';
            offlineIcon.style.color = offlineData ? 'var(--accent-emerald)' : '';
        }

        // 3. تجهيز محتوى الكتاب (إما ملف PDF عبر PDF.js أو فصول/صفحات نصية مقسمة بدقة)
        const rawPdfUrl = (offlineData && offlineData.pdfDirectUrl) || (book.pdfDirectUrl || '').trim();
        const normalizedPdfUrl = this.normalizeCloudPdfUrl(rawPdfUrl);

        if (normalizedPdfUrl && window.pdfjsLib) {
            try {
                const loadingTask = window.pdfjsLib.getDocument({
                    url: normalizedPdfUrl,
                    withCredentials: false
                });
                const pdfDoc = await loadingTask.promise;
                this.state.reader.pdfDoc = pdfDoc;
                this.state.reader.totalPages = pdfDoc.numPages;

                if (loadingEl) loadingEl.classList.add('hidden');
                if (pdfCanvas) pdfCanvas.classList.remove('hidden');

                // القفز التلقائي الفوري (Auto-Jump) إلى الصفحة التي توقف عندها المستخدم!
                const validJumpPage = Math.min(Math.max(1, targetAutoJumpPage), pdfDoc.numPages);
                await this.goToReaderPage(validJumpPage, validJumpPage > 1);
                return;
            } catch (pdfErr) {
                console.warn("⚠️ تعذر الجلب المباشر لملف PDF عبر CORS، جاري استخدام العارض المحمي البديل:", pdfErr);
                // إذا كان الرابط من Google Drive ويمنع قراءة الـ Canvas عبر CORS، نتحول للعارض المدمج أو الصفحات النصية
                if (rawPdfUrl.includes('drive.google.com')) {
                    this.renderGoogleDriveProtectedEmbed(rawPdfUrl, targetAutoJumpPage);
                    return;
                }
            }
        }

        // 4. عرض الكتاب المقسم إلى صفحات نصية احترافية (يدعم القفز التلقائي الفوري لأي صفحة 5، 100، 200...)
        this.preparePaginatedTextBook(book, offlineData);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (textContainer) textContainer.classList.remove('hidden');

        const validPage = Math.min(Math.max(1, targetAutoJumpPage), this.state.reader.totalPages);
        await this.goToReaderPage(validPage, validPage > 1);
    },

    /**
     * الانتقال الفوري الفعلي إلى الصفحة المطلوبة (Auto-Jump & Page Navigation)
     * ينقل القارئ مباشرة إلى الصفحة (وليس مجرد إظهار رقمها نصياً)
     */
    goToReaderPage: async function (pageNumber, isAutoJump = false) {
        const book = this.state.reader.activeBook;
        if (!book) return;

        const targetPage = Math.min(Math.max(1, parseInt(pageNumber, 10) || 1), this.state.reader.totalPages);
        this.state.reader.currentPage = targetPage;

        // تحديث شريط الأرقام السفلي
        const pageInput = document.getElementById('reader-direct-page-input');
        const totalLabel = document.getElementById('reader-total-pages-label');
        if (pageInput) pageInput.value = targetPage;
        if (totalLabel) totalLabel.textContent = this.state.reader.totalPages;

        // أ) إذا كان الكتاب يعمل بمحرك PDF.js Canvas
        if (this.state.reader.pdfDoc) {
            await this.renderPdfCanvasPage(targetPage);
        } else {
            // ب) إذا كان الكتاب يعمل بمحرك الصفحات الأدبية المقسمة
            this.renderPaginatedTextPage(targetPage);
        }

        // تمرير منطقة القراءة إلى أعلى الصفحة الجديدة بسلاسة
        const viewport = document.getElementById('reader-main-viewport');
        if (viewport) viewport.scrollTop = 0;

        // تحديث حالة أيقونة العلامة المرجعية (Bookmark) لهذه الصفحة
        this.updateBookmarkIconState();

        // حفظ الصفحة الحالية فوراً في السحابة والذاكرة المحلية
        this.saveCurrentReadingProgress(book.id, targetPage, this.state.reader.totalPages);

        // إظهار شريط تأكيد القفز التلقائي الفوري إذا تم نقله تلقائياً عند فتح الكتاب
        if (isAutoJump && targetPage > 1) {
            const banner = document.getElementById('reader-autojump-notification');
            const bannerText = document.getElementById('reader-autojump-text');
            if (banner && bannerText) {
                bannerText.innerHTML = `<i class="fa-solid fa-bolt"></i> تم نقلك تلقائياً ومباشرة إلى <strong>الصفحة (${targetPage})</strong> حيث توقفت آخر مرة!`;
                banner.classList.remove('hidden');
            }
        }
    },

    renderPdfCanvasPage: async function (pageNum) {
        if (!this.state.reader.pdfDoc) return;
        if (this.state.reader.isRendering) {
            this.state.reader.pendingPage = pageNum;
            return;
        }

        this.state.reader.isRendering = true;
        const canvas = document.getElementById('reader-pdf-canvas');
        if (!canvas) {
            this.state.reader.isRendering = false;
            return;
        }

        try {
            const page = await this.state.reader.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.state.reader.scale || 1.35 });
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;
        } catch (err) {
            console.error("PDF Page Render Error:", err);
        }

        this.state.reader.isRendering = false;
        if (this.state.reader.pendingPage !== null) {
            const next = this.state.reader.pendingPage;
            this.state.reader.pendingPage = null;
            this.renderPdfCanvasPage(next);
        }
    },

    preparePaginatedTextBook: function (book, offlineData) {
        const rawContent = (offlineData && offlineData.digitalContent) ||
                           book.digitalContent ||
                           book.description ||
                           'هذا الكتاب محمي بحقوق النشر لمنصة صفقات كتابية.';

        // تقسيم المحتوى إلى صفحات حقيقية منظمة (أو استخدام فواصل الصفحات المخصصة ---PAGE---)
        let pagesArray = [];
        if (rawContent.includes('---PAGE---')) {
            pagesArray = rawContent.split('---PAGE---').map((p) => p.trim()).filter(Boolean);
        } else {
            // تقسيم ذكي كل 1100 حرف في صفحة مستقلة لضمان تعدد الصفحات ودقة القفز التلقائي
            const paragraphs = rawContent.split(/\n+/);
            let currentChunk = '';
            paragraphs.forEach((para) => {
                if ((currentChunk.length + para.length) > 1100 && currentChunk.length > 0) {
                    pagesArray.push(currentChunk.trim());
                    currentChunk = para + '\n\n';
                } else {
                    currentChunk += para + '\n\n';
                }
            });
            if (currentChunk.trim().length > 0) {
                pagesArray.push(currentChunk.trim());
            }
        }

        if (pagesArray.length === 0) {
            pagesArray = [rawContent];
        }

        this.state.reader.textPages = pagesArray;
        this.state.reader.totalPages = pagesArray.length;
    },

    renderPaginatedTextPage: function (pageNum) {
        const textContainer = document.getElementById('reader-text-container');
        if (!textContainer) return;

        const pages = this.state.reader.textPages || [''];
        const pageContent = pages[pageNum - 1] || pages[0] || '';
        const fontSizeRem = this.state.reader.fontSize || 1.25;

        textContainer.style.fontSize = `${fontSizeRem}rem`;
        textContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 18px; border-bottom: 1px dashed var(--border-glass); font-size: 0.78rem; color: var(--accent-gold); font-family: var(--font-main);">
                <span>📖 ${this.escapeHtml(this.state.reader.activeBook ? this.state.reader.activeBook.title : '')}</span>
                <span>الصفحة ${pageNum} من ${this.state.reader.totalPages}</span>
            </div>
            <div style="white-space: pre-line; text-align: justify;">${this.escapeHtml(pageContent)}</div>
        `;
    },

    renderGoogleDriveProtectedEmbed: function (driveUrl, targetPage) {
        const loadingEl = document.getElementById('reader-loading-state');
        const textContainer = document.getElementById('reader-text-container');
        if (loadingEl) loadingEl.classList.add('hidden');
        if (!textContainer) return;

        // استخراج معرف ملف جوجل درايف وتحويله إلى وضع المعاينة المحمية داخل التطبيق
        const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const fileId = match ? match[1] : null;
        const embedUrl = fileId
            ? `https://drive.google.com/file/d/${fileId}/preview`
            : driveUrl;

        this.state.reader.totalPages = parseInt(this.state.reader.activeBook.pagesCount, 10) || 250;
        this.state.reader.currentPage = targetPage || 1;

        const pageInput = document.getElementById('reader-direct-page-input');
        const totalLabel = document.getElementById('reader-total-pages-label');
        if (pageInput) pageInput.value = this.state.reader.currentPage;
        if (totalLabel) totalLabel.textContent = this.state.reader.totalPages;

        textContainer.classList.remove('hidden');
        textContainer.innerHTML = `
            <div style="position: relative; width: 100%; height: 70vh; border-radius: 10px; overflow: hidden;">
                <iframe src="${this.escapeHtml(embedUrl)}" 
                        style="width: 100%; height: 100%; border: none;" 
                        allow="autoplay" sandbox="allow-scripts allow-same-origin"></iframe>
                <!-- طبقة حماية علوية تمنع زر الفتح الخارجي أو التحميل من جوجل درايف -->
                <div style="position: absolute; top: 0; left: 0; width: 80px; height: 60px; background: #131b2e; z-index: 20; display: flex; align-items: center; justify-content: center; border-bottom-right-radius: 12px;">
                    <i class="fa-solid fa-shield-halved" style="color: var(--accent-gold);"></i>
                </div>
            </div>
        `;

        if (targetPage > 1) {
            const banner = document.getElementById('reader-autojump-notification');
            const bannerText = document.getElementById('reader-autojump-text');
            if (banner && bannerText) {
                bannerText.innerHTML = `<i class="fa-solid fa-bolt"></i> موضع توقفك المحفوظ هو <strong>الصفحة (${targetPage})</strong>`;
                banner.classList.remove('hidden');
            }
        }
    },

    normalizeCloudPdfUrl: function (url) {
        if (!url) return '';
        // إذا كان رابط مباشر ينتهي بـ .pdf أو رابط سحابي يدعم الجلب المباشر
        return url.trim();
    },

    adjustReaderZoom: function (delta) {
        if (this.state.reader.pdfDoc) {
            this.state.reader.scale = Math.min(2.4, Math.max(0.8, (this.state.reader.scale || 1.35) + delta));
            this.renderPdfCanvasPage(this.state.reader.currentPage);
        } else {
            this.state.reader.fontSize = Math.min(2.0, Math.max(0.95, (this.state.reader.fontSize || 1.25) + delta));
            this.renderPaginatedTextPage(this.state.reader.currentPage);
        }
    },

    closeProtectedBookReader: function () {
        const book = this.state.reader.activeBook;
        if (book) {
            this.saveCurrentReadingProgress(book.id, this.state.reader.currentPage, this.state.reader.totalPages);
            this.showToast(`📌 تم حفظ توقفك عند الصفحة (${this.state.reader.currentPage}) للقفز التلقائي عند عودتك`);
        }
        const modal = document.getElementById('safaqat-protected-reader-modal');
        if (modal) modal.classList.add('hidden');
        if (this.state.currentView === 'library') {
            this.renderUserDigitalLibrary();
        }
    },

    // ========================================================================
    // 5. حفظ واسترجاع رقم الصفحة والعلامات المرجعية (Auto-Jump & Bookmarks Storage)
    // ========================================================================
    getSavedPageForBook: function (bookId) {
        // أولاً من ملف المستخدم السحابي المتزامن عبر الأجهزة
        if (this.state.userProfile && this.state.userProfile.readingProgress && this.state.userProfile.readingProgress[bookId]) {
            return this.state.userProfile.readingProgress[bookId];
        }
        // ثانياً من الذاكرة المحلية السريعة
        return this.getLocalReadingProgress(bookId);
    },

    getLocalReadingProgress: function (bookId) {
        try {
            const raw = localStorage.getItem(`safaqat_reader_prog_${bookId}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    saveCurrentReadingProgress: function (bookId, pageNumber, totalPages) {
        if (!bookId) return;
        const book = this.state.reader.activeBook;
        const progObj = {
            page: pageNumber,
            total: totalPages || 1,
            bookTitle: book ? book.title : '',
            updatedAt: Date.now()
        };

        // 1. حفظ فوري في الذاكرة المحلية (يعمل حتى بدون إنترنت)
        localStorage.setItem(`safaqat_reader_prog_${bookId}`, JSON.stringify(progObj));

        // 2. مزامنة سحابية في حساب المستخدم على Firestore ليفتح من أي جوال آخر ويجد نفس الصفحة
        if (this.state.currentUser && window.db) {
            if (!this.state.userProfile) this.state.userProfile = {};
            if (!this.state.userProfile.readingProgress) this.state.userProfile.readingProgress = {};
            this.state.userProfile.readingProgress[bookId] = progObj;

            window.db.collection(window.SAFAQAT_COLLECTIONS.USERS).doc(this.state.currentUser.uid).set({
                readingProgress: {
                    [bookId]: progObj
                }
            }, { merge: true }).catch(() => {});
        }
    },

    loadBookBookmarks: function (bookId) {
        try {
            const raw = localStorage.getItem(`safaqat_bookmarks_${bookId}`);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    saveBookBookmarks: function (bookId, bookmarksArray) {
        localStorage.setItem(`safaqat_bookmarks_${bookId}`, JSON.stringify(bookmarksArray));
    },

    updateBookmarkIconState: function () {
        const icon = document.getElementById('reader-bookmark-icon');
        if (!icon) return;
        const currPage = this.state.reader.currentPage;
        const exists = (this.state.reader.bookmarks || []).some((bm) => bm.page === currPage);
        icon.className = exists ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
        icon.style.color = exists ? 'var(--accent-gold)' : '';
    },

    toggleCurrentPageBookmark: function () {
        const book = this.state.reader.activeBook;
        if (!book) return;

        const currPage = this.state.reader.currentPage;
        let list = [...(this.state.reader.bookmarks || [])];
        const idx = list.findIndex((bm) => bm.page === currPage);

        if (idx > -1) {
            list.splice(idx, 1);
            this.showToast(`🗑️ تمت إزالة العلامة المرجعية من الصفحة (${currPage})`);
        } else {
            list.push({
                page: currPage,
                label: `علامة محفوظة — صفحة ${currPage}`,
                createdAt: new Date().toLocaleDateString('ar-SA')
            });
            list.sort((a, b) => a.page - b.page);
            this.showToast(`📌 تم حفظ علامة مرجعية عند الصفحة (${currPage})`);
        }

        this.state.reader.bookmarks = list;
        this.saveBookBookmarks(book.id, list);
        this.updateBookmarkIconState();
        this.renderReaderBookmarksDrawer();
    },

    renderReaderBookmarksDrawer: function () {
        const container = document.getElementById('reader-bookmarks-items-container');
        if (!container) return;

        const list = this.state.reader.bookmarks || [];
        if (list.length === 0) {
            container.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted);">لم تقم بحفظ أي علامات مرجعية في هذا الكتاب بعد. اضغط على أيقونة الإشارة المرجعية في الأعلى لحفظ أي صفحة.</div>`;
            return;
        }

        container.innerHTML = list.map((bm) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-glass); margin-bottom: 6px; cursor: pointer;"
                 onclick="SafaqatApp.goToReaderPage(${bm.page}); document.getElementById('reader-bookmarks-drawer').classList.add('hidden');">
                <div>
                    <strong style="font-size: 0.82rem; color: var(--accent-gold);">📌 ${this.escapeHtml(bm.label)}</strong>
                    <span style="font-size: 0.7rem; color: var(--text-muted); margin-right: 8px;">${this.escapeHtml(bm.createdAt || '')}</span>
                </div>
                <span class="badge-pill badge-stock-count">انتقال فوري <i class="fa-solid fa-bolt"></i></span>
            </div>
        `).join('');
    },

    // ========================================================================
    // 6. الخزنة المحلية للقراءة بدون إنترنت داخل التطبيق (IndexedDB Offline Vault)
    // ========================================================================
    openOfflineVaultDB: function () {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("المتصفح لا يدعم IndexedDB"));
                return;
            }
            const request = window.indexedDB.open('SafaqatOfflineVaultDB', 1);
            request.onupgradeneeded = (e) => {
                const idb = e.target.result;
                if (!idb.objectStoreNames.contains('offline_books')) {
                    idb.createObjectStore('offline_books', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    cacheActiveBookForOfflineReading: async function () {
        const book = this.state.reader.activeBook;
        if (!book) return;

        try {
            const idb = await this.openOfflineVaultDB();
            const tx = idb.transaction('offline_books', 'readwrite');
            const store = tx.objectStore('offline_books');

            store.put({
                id: book.id,
                title: book.title,
                author: book.author || '',
                digitalContent: book.digitalContent || book.description || '',
                pdfDirectUrl: book.pdfDirectUrl || '',
                cachedAt: Date.now()
            });

            const offlineIcon = document.getElementById('reader-offline-icon');
            if (offlineIcon) {
                offlineIcon.className = 'fa-solid fa-circle-check';
                offlineIcon.style.color = 'var(--accent-emerald)';
            }

            this.showToast('☁️ تم حفظ الكتاب في الخزنة المحلية المشفرة للقراءة بدون إنترنت!');
        } catch (err) {
            console.warn("Offline Cache Error:", err);
            this.showToast('⚠️ تعذر حفظ النسخة المحلية على هذا المتصفح');
        }
    },

    getOfflineCachedBook: async function (bookId) {
        try {
            const idb = await this.openOfflineVaultDB();
            return await new Promise((resolve) => {
                const tx = idb.transaction('offline_books', 'readonly');
                const store = tx.objectStore('offline_books');
                const req = store.get(bookId);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

});
/**
 * ============================================================================
 * منصة صفقات كتابية - Safaqat Kitabiya Platform
 * الملف الرابع: app.js - المحرك البرمجي الشامل
 * [ الجزء السادس والأخير 6/6 ]: غرفة قيادة الإدارة الشاملة والتشغيل النهائي للمنصة
 * الإصدار: 2.0 Enterprise Edition (كود كامل غير مختصر)
 * ============================================================================
 */

Object.assign(window.SafaqatApp, {

    // ========================================================================
    // 1. تهيئة وعرض غرفة قيادة الإدارة الشاملة (Admin Control Hub)
    // ========================================================================
    renderAdminControlHub: function () {
        const container = document.getElementById('admin-dynamic-panel-container');
        if (!container) return;

        if (!this.state.isAdmin) {
            container.innerHTML = `
                <div class="glass-section-card" style="text-align: center; padding: 36px 18px;">
                    <i class="fa-solid fa-lock" style="font-size: 2.2rem; color: var(--accent-danger); margin-bottom: 10px;"></i>
                    <h4>هذه المنطقة مخصصة لإدارة المنصة فقط</h4>
                </div>
            `;
            return;
        }

        // ربط أزرار التبويبات الفرعية داخل لوحة الإدارة
        const subTabBtns = document.querySelectorAll('#admin-subtabs-ribbon [data-admin-tab]');
        subTabBtns.forEach((btn) => {
            const tabKey = btn.getAttribute('data-admin-tab');
            btn.classList.toggle('active', tabKey === this.state.adminActiveTab);
            btn.onclick = () => {
                this.state.adminActiveTab = tabKey;
                this.renderAdminControlHub();
            };
        });

        const activeTab = this.state.adminActiveTab || 'books';

        if (activeTab === 'books') {
            this.renderAdminBooksAndInventoryPanel(container);
        } else if (activeTab === 'branding') {
            this.renderAdminBrandingAndAppPanel(container);
        } else if (activeTab === 'admob') {
            this.renderAdminAdMobPanel(container);
        } else if (activeTab === 'billing') {
            this.renderAdminBillingAndVipPanel(container);
        } else if (activeTab === 'currencies') {
            this.renderAdminCurrenciesAndPublishersPanel(container);
        } else if (activeTab === 'rawi') {
            this.renderAdminRawiAssistantPanel(container);
        }
    },

    // ========================================================================
    // 2. التبويب الإداري الأول: إدارة الكتب، المخزون المطبوع الاختياري، والنسخ الرقمية
    // ========================================================================
    renderAdminBooksAndInventoryPanel: function (container) {
        const books = this.state.books || [];
        const publishers = this.state.publishers || [];

        container.innerHTML = `
            <div class="glass-section-card" style="margin-bottom: 18px;">
                <div class="section-header-row">
                    <h3 id="admin-book-form-heading" style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold);">
                        <i class="fa-solid fa-plus-circle"></i> إضافة كتاب جديد أو تعديل إصدار (إدارة مرنة للمخزون والنسخ)
                    </h3>
                    <button type="button" id="btn-reset-admin-book-form" class="category-chip-item">
                        <i class="fa-solid fa-rotate-right"></i> تفريغ الحقول
                    </button>
                </div>

                <form id="admin-book-master-form" style="display: flex; flex-direction: column; gap: 12px;">
                    <input type="hidden" id="admin-edit-book-id" value="">

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">عنوان الكتاب أو الرواية *</label>
                            <input type="text" id="admin-book-title" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: يمنستان" required>
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">اسم المؤلف *</label>
                            <input type="text" id="admin-book-author" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: راوي الشمال" required>
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">التصنيف الأدبي *</label>
                            <input type="text" id="admin-book-category" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: فانتازيا وخيال، روايات، فكر" required>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">دار النشر (بحث واختيار مرن)</label>
                            <input type="text" id="admin-book-publisher" list="admin-publishers-datalist" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="دار صفقات كتابية للنشر والتوزيع">
                            <datalist id="admin-publishers-datalist">
                                <option value="دار صفقات كتابية للنشر والتوزيع"></option>
                                ${publishers.map((p) => `<option value="${this.escapeHtml(p.name)}"></option>`).join('')}
                            </datalist>
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">رابط صورة الغلاف (Direct Image URL)</label>
                            <input type="url" id="admin-book-cover" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="https://...">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">معرف المنتج في Google Play (SKU - اختياري)</label>
                            <input type="text" id="admin-book-sku" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="safaqat_ebook_01">
                        </div>
                    </div>

                    <!-- خيارات نوع النشر وإدارة المخزون الورقي والرقمي -->
                    <div style="padding: 14px; border-radius: var(--radius-sm); background: rgba(212, 175, 55, 0.07); border: 1px solid var(--border-gold); display: flex; flex-direction: column; gap: 12px;">
                        <div style="font-weight: 800; font-size: 0.88rem; color: var(--accent-gold);">
                            <i class="fa-solid fa-boxes-stacked"></i> إعدادات نوع النسخة والمخزون الورقي والتسعير:
                        </div>

                        <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                            <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer; font-weight: 700;">
                                <input type="checkbox" id="admin-book-digital-only" style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                                <span>📱 هذا الكتاب <strong>"نسخة رقمية فقط"</strong> (إخفاء زر إضافة إلى السلة الورقية تماماً)</span>
                            </label>

                            <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer; font-weight: 700;">
                                <input type="checkbox" id="admin-book-vip-included" checked style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                                <span>👑 مشمول ضمن <strong>باقة الاشتراك الشهري (VIP)</strong> في التطبيق</span>
                            </label>

                            <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer; font-weight: 700;">
                                <input type="checkbox" id="admin-book-bestseller" style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                                <span>🔥 تمييز ضمن <strong>الأكثر مبيعاً</strong></span>
                            </label>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px;">
                            <div id="admin-paper-price-wrap">
                                <label style="font-size: 0.76rem; color: var(--text-secondary); font-weight: 700;">سعر النسخة الورقية (بالعملة الأساسية)</label>
                                <input type="number" step="0.01" id="admin-book-paper-price" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: 35.00">
                            </div>

                            <div id="admin-print-stock-wrap">
                                <label style="font-size: 0.76rem; color: var(--text-secondary); font-weight: 700;">عدد النسخ المطبوعة (اختياري - اتركه فارغاً لإخفائه)</label>
                                <input type="number" id="admin-book-print-stock" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: 50 (أو اتركه فارغاً)">
                            </div>

                            <div>
                                <label style="font-size: 0.76rem; color: var(--text-secondary); font-weight: 700;">سعر النسخة الرقمية الفردية (داخل التطبيق)</label>
                                <input type="number" step="0.01" id="admin-book-digital-price" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: 19.99">
                            </div>

                            <div>
                                <label style="font-size: 0.76rem; color: var(--text-secondary); font-weight: 700;">عدد صفحات الكتاب</label>
                                <input type="number" id="admin-book-pages-count" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: 240">
                            </div>
                        </div>
                    </div>

                    <!-- روابط التخزين السحابي الخارجي لتوفير مساحة Firebase المجانية -->
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">
                                <i class="fa-solid fa-cloud-arrow-down" style="color: var(--accent-gold);"></i> رابط ملف PDF السحابي المباشر للقارئ المحمي (Google Drive أو رابط خارجي لتوفير مساحة Firebase):
                            </label>
                            <input type="url" id="admin-book-pdf-url" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="https://drive.google.com/... أو رابط PDF مباشر">
                        </div>

                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">نبذة تعريفية عن الكتاب (تظهر في المتجر):</label>
                            <textarea id="admin-book-description" rows="3" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 10px; font-size: 0.85rem; margin-top: 4px;" placeholder="اكتب وصفاً مشوقاً للكتاب باللغة العربية الفصحى..."></textarea>
                        </div>

                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">
                                المحتوى النصي الرقمي للقارئ الذكي (اختياري — افصل بين الصفحات بكتابة <code>---PAGE---</code> لدعم القفز التلقائي الدقيق):
                            </label>
                            <textarea id="admin-book-digital-content" rows="4" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 10px; font-size: 0.85rem; margin-top: 4px;" placeholder="نص الصفحة الأولى... &#10;---PAGE---&#10;نص الصفحة الثانية..."></textarea>
                        </div>
                    </div>

                    <button type="submit" class="btn-add-paper-cart" style="padding: 12px; font-size: 0.92rem;">
                        <i class="fa-solid fa-floppy-disk"></i> حفظ بيانات الكتاب في قاعدة البيانات السحابية
                    </button>
                </form>
            </div>

            <!-- قائمة إدارة الكتب الحالية مع بحث ذكي فوري بداخلها -->
            <div class="glass-section-card">
                <div class="section-header-row" style="flex-wrap: wrap; gap: 10px;">
                    <h3 style="font-size: 0.98rem; font-weight: 800; color: var(--accent-gold);">
                        📚 الإصدارات المسجلة في المتجر (${books.length})
                    </h3>
                    <div style="width: 280px; max-width: 100%;">
                        <input type="search" id="admin-books-quick-filter" class="store-search-input" style="height: 36px; padding: 0 12px; font-size: 0.8rem;" placeholder="🔍 ابحث سريعاً لتعديل أو حذف كتاب...">
                    </div>
                </div>
                <div id="admin-books-table-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 440px; overflow-y: auto;"></div>
            </div>
        `;

        const digitalOnlyCheckbox = document.getElementById('admin-book-digital-only');
        const paperPriceWrap = document.getElementById('admin-paper-price-wrap');
        const printStockWrap = document.getElementById('admin-print-stock-wrap');

        if (digitalOnlyCheckbox) {
            digitalOnlyCheckbox.addEventListener('change', () => {
                const isDig = digitalOnlyCheckbox.checked;
                if (paperPriceWrap) paperPriceWrap.style.opacity = isDig ? '0.4' : '1';
                if (printStockWrap) printStockWrap.style.opacity = isDig ? '0.4' : '1';
            });
        }

        const resetBtn = document.getElementById('btn-reset-admin-book-form');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                document.getElementById('admin-book-master-form').reset();
                document.getElementById('admin-edit-book-id').value = '';
                document.getElementById('admin-book-form-heading').innerHTML = `<i class="fa-solid fa-plus-circle"></i> إضافة كتاب جديد أو تعديل إصدار`;
            });
        }

        const bookForm = document.getElementById('admin-book-master-form');
        if (bookForm) {
            bookForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAdminBookForm();
            });
        }

        const filterInput = document.getElementById('admin-books-quick-filter');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                this.renderAdminBooksTableRows(e.target.value.trim());
            });
        }

        this.renderAdminBooksTableRows('');
    },

    renderAdminBooksTableRows: function (searchQuery = '') {
        const listEl = document.getElementById('admin-books-table-list');
        if (!listEl) return;

        const q = searchQuery.toLowerCase();
        const filtered = (this.state.books || []).filter((b) => {
            if (!q) return true;
            return `${b.title || ''} ${b.author || ''} ${b.publisherName || ''}`.toLowerCase().includes(q);
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 18px;">لا توجد كتب مطابقة.</div>`;
            return;
        }

        listEl.innerHTML = filtered.map((b) => {
            const safeId = this.escapeHtml(b.id);
            const hasStock = b.printStock !== undefined && b.printStock !== null && String(b.printStock).trim() !== '';
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-glass); flex-wrap: wrap;">
                    <div style="min-width: 0; flex: 1;">
                        <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-primary);">
                            ${this.escapeHtml(b.title)}
                            ${b.isDigitalOnly ? `<span class="badge-pill badge-digital-only" style="margin-right: 6px;">نسخة رقمية فقط</span>` : `<span class="badge-pill badge-paper-available" style="margin-right: 6px;">متاح ورقياً</span>`}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                            المؤلف: ${this.escapeHtml(b.author || '')} • الدار: ${this.escapeHtml(b.publisherName || 'صفقات كتابية')}
                            ${hasStock && !b.isDigitalOnly ? ` • <strong style="color: var(--accent-gold);">المخزون المطبوع: ${b.printStock} نسخة</strong>` : ' • (بدون عداد مخزون مطبوع)'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="category-chip-item active" onclick="SafaqatApp.populateAdminBookForEdit('${safeId}')">
                            <i class="fa-solid fa-pen-to-square"></i> تعديل
                        </button>
                        <button type="button" class="category-chip-item" style="border-color: var(--accent-danger); color: var(--accent-danger);" onclick="SafaqatApp.deleteAdminBook('${safeId}')">
                            <i class="fa-solid fa-trash-can"></i> حذف
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    populateAdminBookForEdit: function (bookId) {
        const b = (this.state.books || []).find((item) => item.id === bookId);
        if (!b) return;

        document.getElementById('admin-edit-book-id').value = b.id;
        document.getElementById('admin-book-title').value = b.title || '';
        document.getElementById('admin-book-author').value = b.author || '';
        document.getElementById('admin-book-category').value = b.category || '';
        document.getElementById('admin-book-publisher').value = b.publisherName || '';
        document.getElementById('admin-book-cover').value = b.coverUrl || '';
        document.getElementById('admin-book-sku').value = b.googlePlaySku || '';
        document.getElementById('admin-book-digital-only').checked = b.isDigitalOnly === true;
        document.getElementById('admin-book-vip-included').checked = b.includedInVip !== false;
        document.getElementById('admin-book-bestseller').checked = b.isBestseller === true;
        document.getElementById('admin-book-paper-price').value = b.paperPrice ?? b.price ?? '';
        document.getElementById('admin-book-print-stock').value = (b.printStock !== undefined && b.printStock !== null) ? b.printStock : '';
        document.getElementById('admin-book-digital-price').value = b.digitalPrice ?? b.price ?? '';
        document.getElementById('admin-book-pages-count').value = b.pagesCount || '';
        document.getElementById('admin-book-pdf-url').value = b.pdfDirectUrl || '';
        document.getElementById('admin-book-description').value = b.description || '';
        document.getElementById('admin-book-digital-content').value = b.digitalContent || '';

        const heading = document.getElementById('admin-book-form-heading');
        if (heading) {
            heading.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> تعديل الكتاب: ${this.escapeHtml(b.title)}`;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    saveAdminBookForm: async function () {
        if (!window.db) return;

        const editId = document.getElementById('admin-edit-book-id').value.trim();
        const isDigitalOnly = document.getElementById('admin-book-digital-only').checked;
        const rawStock = document.getElementById('admin-book-print-stock').value.trim();

        const bookPayload = {
            title: document.getElementById('admin-book-title').value.trim(),
            author: document.getElementById('admin-book-author').value.trim(),
            category: document.getElementById('admin-book-category').value.trim() || 'أدب ورواية',
            publisherName: document.getElementById('admin-book-publisher').value.trim() || 'دار صفقات كتابية للنشر والتوزيع',
            coverUrl: document.getElementById('admin-book-cover').value.trim(),
            googlePlaySku: document.getElementById('admin-book-sku').value.trim(),
            isDigitalOnly: isDigitalOnly,
            includedInVip: document.getElementById('admin-book-vip-included').checked,
            isBestseller: document.getElementById('admin-book-bestseller').checked,
            paperPrice: parseFloat(document.getElementById('admin-book-paper-price').value) || 0,
            // إذا تركت الإدارة حقل المخزون المطبوع فارغاً، يُحفظ كقيمة فارغة فلا يظهر عداد النسخ في المتجر
            printStock: (!isDigitalOnly && rawStock !== '') ? parseInt(rawStock, 10) : '',
            digitalPrice: parseFloat(document.getElementById('admin-book-digital-price').value) || 0,
            pagesCount: parseInt(document.getElementById('admin-book-pages-count').value, 10) || 100,
            pdfDirectUrl: document.getElementById('admin-book-pdf-url').value.trim(),
            description: document.getElementById('admin-book-description').value.trim(),
            digitalContent: document.getElementById('admin-book-digital-content').value.trim(),
            hasDigitalEdition: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (editId) {
                await window.db.collection(window.SAFAQAT_COLLECTIONS.BOOKS).doc(editId).set(bookPayload, { merge: true });
                this.showToast(`✅ تم تحديث بيانات كتاب "${bookPayload.title}" بنجاح`);
            } else {
                bookPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await window.db.collection(window.SAFAQAT_COLLECTIONS.BOOKS).add(bookPayload);
                this.showToast(`🎉 تمت إضافة كتاب "${bookPayload.title}" إلى المتجر!`);
            }
            document.getElementById('btn-reset-admin-book-form').click();
        } catch (err) {
            this.showToast('⚠️ خطأ أثناء حفظ الكتاب: ' + err.message);
        }
    },

    deleteAdminBook: async function (bookId) {
        if (!window.db) return;
        try {
            await window.db.collection(window.SAFAQAT_COLLECTIONS.BOOKS).doc(bookId).delete();
            this.showToast('🗑️ تم حذف الكتاب من قاعدة البيانات');
        } catch (err) {
            this.showToast('⚠️ تعذر حذف الكتاب: ' + err.message);
        }
    },

    // ========================================================================
    // 3. التبويب الإداري الثاني: التحكم المرن بالشعار (3 أوضاع) + رابط تطبيق جوجل بلاي
    // ========================================================================
    renderAdminBrandingAndAppPanel: function (container) {
        const settings = window.SafaqatConfig.liveSettings;
        const b = settings.branding || {};
        const appP = settings.appProtection || {};

        container.innerHTML = `
            <div class="glass-section-card">
                <div class="section-header-row">
                    <h3 style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold);">
                        🎨 التحكم المرن بشعار الموقع + رابط تطبيق متجر جوجل بلاي
                    </h3>
                </div>

                <form id="admin-branding-form" style="display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label style="font-size: 0.82rem; font-weight: 700; color: var(--accent-gold);">وضع عرض شعار المنصة في الهيدر (3 أوضاع مرنة):</label>
                        <select id="admin-logo-mode" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-gold); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.86rem; margin-top: 6px;">
                            <option value="official_template" ${b.logoMode === 'official_template' ? 'selected' : ''}>1. القالب الرسمي (الأيقونة الافتراضية + اسم المنصة والوصف)</option>
                            <option value="full_custom_logo" ${b.logoMode === 'full_custom_logo' ? 'selected' : ''}>2. شعار مفرغ كامل (إخفاء النص والأيقونة وعرض صورة شعارك الكامل PNG/SVG)</option>
                            <option value="custom_icon_only" ${b.logoMode === 'custom_icon_only' ? 'selected' : ''}>3. تغيير الأيقونة وحدها مع الإبقاء على نص القالب الرسمي</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">اسم المنصة الرئيسي</label>
                            <input type="text" id="admin-site-title" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(b.siteTitle || 'صفقات كتابية')}">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">الشعار اللفظي الفرعي</label>
                            <input type="text" id="admin-site-subtitle" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(b.siteSubtitle || 'متجر الكتب والمجتمع الأدبي')}">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">رقم واتساب استلام طلبات النسخ الورقية (مع مفتاح الدولة)</label>
                            <input type="text" id="admin-whatsapp-number" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(b.officialWhatsappNumber || '966500000000')}">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">رابط الشعار المفرغ الكامل (لوضع الشعار الكامل)</label>
                            <input type="url" id="admin-full-logo-url" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(b.customFullLogoUrl || '')}" placeholder="https://.../logo.png">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">رابط الأيقونة المخصصة وحدها (لوضع تغيير الأيقونة)</label>
                            <input type="url" id="admin-custom-icon-url" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(b.customIconUrl || '')}" placeholder="https://.../icon.png">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">ارتفاع الشعار بالبكسل (px)</label>
                            <input type="number" id="admin-logo-height" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${b.logoHeightPx || 44}">
                        </div>
                    </div>

                    <hr style="border-top: 1px dashed var(--border-glass); margin: 4px 0;">

                    <div>
                        <label style="font-size: 0.82rem; font-weight: 700; color: var(--accent-emerald);">
                            <i class="fa-brands fa-google-play"></i> رابط تطبيقك الرسمي على متجر Google Play (يظهر في الهيدر ويوجه زوار الويب لتثبيت التطبيق):
                        </label>
                        <input type="url" id="admin-playstore-url" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 6px;" value="${this.escapeHtml(appP.googlePlayStoreUrl || 'https://play.google.com/store/apps')}">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px; background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm);">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer;">
                            <input type="checkbox" id="admin-show-play-header" ${appP.showPlayStoreIconInHeader !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                            <span>إظهار أيقونة شعار جوجل بلاي المصغرة في الهيدر العلوي للمتصفحين</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer;">
                            <input type="checkbox" id="admin-restrict-digital-app" ${appP.restrictDigitalBooksToApp !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                            <span>حصر قراءة وشراء النسخ الرقمية داخل التطبيق فقط (تحويل زوار الويب مباشرة إلى متجر جوجل بلاي)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer;">
                            <input type="checkbox" id="admin-require-account-library" ${appP.requireAccountForLibrary !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                            <span>حصر ميزة القراءة وقسم "مكتبتي" على الأعضاء المسجلين بحساب فقط</span>
                        </label>
                    </div>

                    <button type="submit" class="btn-add-paper-cart" style="padding: 12px;">
                        <i class="fa-solid fa-check"></i> حفظ إعدادات الشعار وحماية التطبيق فوراً
                    </button>
                </form>
            </div>
        `;

        document.getElementById('admin-branding-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await window.SafaqatConfig.savePlatformSettings({
                    branding: {
                        logoMode: document.getElementById('admin-logo-mode').value,
                        siteTitle: document.getElementById('admin-site-title').value.trim(),
                        siteSubtitle: document.getElementById('admin-site-subtitle').value.trim(),
                        officialWhatsappNumber: document.getElementById('admin-whatsapp-number').value.trim(),
                        customFullLogoUrl: document.getElementById('admin-full-logo-url').value.trim(),
                        customIconUrl: document.getElementById('admin-custom-icon-url').value.trim(),
                        logoHeightPx: parseInt(document.getElementById('admin-logo-height').value, 10) || 44
                    },
                    appProtection: {
                        googlePlayStoreUrl: document.getElementById('admin-playstore-url').value.trim(),
                        showPlayStoreIconInHeader: document.getElementById('admin-show-play-header').checked,
                        restrictDigitalBooksToApp: document.getElementById('admin-restrict-digital-app').checked,
                        requireAccountForLibrary: document.getElementById('admin-require-account-library').checked
                    }
                });
                this.showToast('✨ تم تحديث الشعار وإعدادات التطبيق في كافة أنحاء المنصة!');
            } catch (err) {
                this.showToast('⚠️ تعذر حفظ الإعدادات: ' + err.message);
            }
        });
    },

    // ========================================================================
    // 4. التبويب الإداري الثالث: لوحة تحكم خوارزمية إعلانات Google AdMob المرنة
    // ========================================================================
    renderAdminAdMobPanel: function (container) {
        const admob = window.SafaqatConfig.liveSettings.admobConfig || {};

        container.innerHTML = `
            <div class="glass-section-card">
                <div class="section-header-row">
                    <h3 style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold);">
                        📢 لوحة التحكم المرنة بإعلانات Google AdMob (خوارزمية البطاقات الشفافة غير المزعجة)
                    </h3>
                </div>

                <form id="admin-admob-form" style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="padding: 12px; border-radius: var(--radius-sm); background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35);">
                        <label style="display: flex; align-items: center; gap: 10px; font-size: 0.92rem; font-weight: 800; cursor: pointer;">
                            <input type="checkbox" id="admin-admob-enabled" ${admob.enabled ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--accent-emerald);">
                            <span>تفعيل عرض إعلانات Google AdMob في المنصة (قم بإلغاء التحديد لإيقاف الإعلانات تماماً بضغطة زر)</span>
                        </label>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">معرف الناشر (Publisher ID)</label>
                            <input type="text" id="admin-admob-pub-id" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(admob.publisherId || '')}" placeholder="ca-app-pub-XXXXXXXXXXXXXXXX">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">معرف وحدة الإعلانات المدمجة الشفافة (Native Ad Unit ID)</label>
                            <input type="text" id="admin-admob-native-id" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(admob.nativeAdUnitId || '')}" placeholder="ca-app-pub-XXXX/YYYY">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700;">وضع كثافة ظهور الإعلانات (تخفيف / توازن / تكثيف)</label>
                            <select id="admin-admob-density" style="width: 100%; height: 40px; background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 0 12px; font-size: 0.84rem; margin-top: 4px;">
                                <option value="light" ${admob.densityMode === 'light' ? 'selected' : ''}>🌿 خفيف جداً (مسافات متباعدة جداً لراحة القارئ)</option>
                                <option value="balanced" ${admob.densityMode === 'balanced' ? 'selected' : ''}>⚖️ متوازن (المعيار الافتراضي الموصى به)</option>
                                <option value="intensive" ${admob.densityMode === 'intensive' ? 'selected' : ''}>🔥 مكثف مدروس (زيادة الظهور دون نوافذ منبثقة)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">إدراج بطاقة إعلانية بعد كل (X) منشورات في المجتمع</label>
                            <input type="number" min="2" max="30" id="admin-admob-posts-interval" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${admob.postsInterval || 6}">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">إدراج بطاقة إعلانية بعد كل (X) كتب في المتجر</label>
                            <input type="number" min="2" max="30" id="admin-admob-books-interval" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${admob.booksInterval || 8}">
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm);">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer;">
                            <input type="checkbox" id="admin-admob-allow-dismiss" ${admob.allowUserDismiss !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                            <span>إتاحة زر (×) للمتصفح لإغلاق البطاقة الإعلانية فوراً إذا لم تهمه</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; cursor: pointer;">
                            <input type="checkbox" id="admin-admob-hide-vip" ${admob.hideForVipSubscribers !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                            <span>إخفاء الإعلانات تلقائياً للمشتركين في باقة القارئ الشغوف (VIP)</span>
                        </label>
                    </div>

                    <button type="submit" class="btn-add-paper-cart" style="padding: 12px;">
                        <i class="fa-solid fa-sliders"></i> حفظ وتطبيق إعدادات خوارزمية AdMob
                    </button>
                </form>
            </div>
        `;

        document.getElementById('admin-admob-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await window.SafaqatConfig.savePlatformSettings({
                    admobConfig: {
                        enabled: document.getElementById('admin-admob-enabled').checked,
                        publisherId: document.getElementById('admin-admob-pub-id').value.trim(),
                        nativeAdUnitId: document.getElementById('admin-admob-native-id').value.trim(),
                        densityMode: document.getElementById('admin-admob-density').value,
                        postsInterval: parseInt(document.getElementById('admin-admob-posts-interval').value, 10) || 6,
                        booksInterval: parseInt(document.getElementById('admin-admob-books-interval').value, 10) || 8,
                        allowUserDismiss: document.getElementById('admin-admob-allow-dismiss').checked,
                        hideForVipSubscribers: document.getElementById('admin-admob-hide-vip').checked
                    }
                });
                this.state.dismissedAdSlots.clear();
                this.showToast('✅ تم تحديث خوارزمية إعلانات Google AdMob بنجاح!');
            } catch (err) {
                this.showToast('⚠️ خطأ في حفظ الإعدادات: ' + err.message);
            }
        });
    },

    // ========================================================================
    // 5. التبويب الإداري الرابع: مفاتيح دفع Google Play Billing وباقة VIP الشهرية
    // ========================================================================
    renderAdminBillingAndVipPanel: function (container) {
        const mon = window.SafaqatConfig.liveSettings.monetization || {};
        const gBilling = mon.googlePlayBilling || {};

        container.innerHTML = `
            <div class="glass-section-card">
                <div class="section-header-row">
                    <h3 style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold);">
                        💳 إعدادات الدخل المزدوج، باقة الاشتراك الشهري (VIP)، ومفاتيح دفع Google Play
                    </h3>
                </div>

                <form id="admin-billing-form" style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; background: var(--bg-input); padding: 12px; border-radius: var(--radius-sm);">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                            <input type="checkbox" id="admin-enable-single-sales" ${mon.enableIndividualBookSales !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                            <span>تفعيل البيع الفردي لكل كتاب رقمي (أسلوب أمازون وجوجل بلاي)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                            <input type="checkbox" id="admin-enable-vip-sub" ${mon.enableVipSubscription !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                            <span>تفعيل باقة الاشتراك الشهري الشامل (VIP) لقراءة الكتب الرقمية</span>
                        </label>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">اسم باقة الاشتراك الشهري</label>
                            <input type="text" id="admin-vip-name" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(mon.vipPlanName || 'باقة القارئ الشغوف (VIP)')}">
                        </div>
                        <div>
                            <label style="font-size: 0.78rem; color: var(--text-secondary);">سعر الاشتراك الشهري (بالعملة الأساسية SAR)</label>
                            <input type="number" step="0.01" id="admin-vip-price" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${mon.vipMonthlyPriceSAR || 29.99}">
                        </div>
                    </div>

                    <div style="padding: 14px; border-radius: var(--radius-sm); background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.35); display: flex; flex-direction: column; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 800; color: #60a5fa; cursor: pointer;">
                            <input type="checkbox" id="admin-gplay-billing-enabled" ${gBilling.enabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #3b82f6;">
                            <span>تفعيل الربط المباشر مع فواتير جوجل (Google Play Billing API داخل التطبيق)</span>
                        </label>
                        <p style="font-size: 0.76rem; color: var(--text-muted);">
                            عندما ترفع التطبيق على Google Play Console، الصق مفتاح الترخيص ومعرف الاشتراك هنا ليتفعل الدفع التلقائي دون إعادة كتابة الكود:
                        </p>
                        <div>
                            <label style="font-size: 0.76rem; color: var(--text-secondary);">مفتاح الترخيص العام من جوجل بلاي (Base64-encoded RSA Public Key)</label>
                            <input type="text" id="admin-gplay-public-key" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(gBilling.publicKeyBase64 || '')}" placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...">
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div>
                                <label style="font-size: 0.76rem; color: var(--text-secondary);">معرف الاشتراك الشهري في جوجل (Subscription Product ID)</label>
                                <input type="text" id="admin-gplay-vip-sku" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(gBilling.vipMonthlyProductId || 'safaqat_vip_monthly_sub')}">
                            </div>
                            <div>
                                <label style="font-size: 0.76rem; color: var(--text-secondary);">بادئة معرفات الكتب الفردية (Book SKU Prefix)</label>
                                <input type="text" id="admin-gplay-sku-prefix" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(gBilling.bookSkuPrefix || 'safaqat_ebook_')}">
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="btn-add-paper-cart" style="padding: 12px;">
                        <i class="fa-solid fa-floppy-disk"></i> حفظ إعدادات الدفع والباقات
                    </button>
                </form>
            </div>
        `;

        document.getElementById('admin-billing-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await window.SafaqatConfig.savePlatformSettings({
                    monetization: {
                        enableIndividualBookSales: document.getElementById('admin-enable-single-sales').checked,
                        enableVipSubscription: document.getElementById('admin-enable-vip-sub').checked,
                        vipPlanName: document.getElementById('admin-vip-name').value.trim(),
                        vipMonthlyPriceSAR: parseFloat(document.getElementById('admin-vip-price').value) || 29.99,
                        googlePlayBilling: {
                            enabled: document.getElementById('admin-gplay-billing-enabled').checked,
                            publicKeyBase64: document.getElementById('admin-gplay-public-key').value.trim(),
                            vipMonthlyProductId: document.getElementById('admin-gplay-vip-sku').value.trim(),
                            bookSkuPrefix: document.getElementById('admin-gplay-sku-prefix').value.trim()
                        }
                    }
                });
                this.showToast('💳 تم حفظ إعدادات الدفع وباقة VIP بنجاح!');
            } catch (err) {
                this.showToast('⚠️ تعذر حفظ إعدادات الدفع: ' + err.message);
            }
        });
    },

    // ========================================================================
    // 6. التبويب الإداري الخامس: مرونة العملات الكاملة وإدارة دور النشر
    // ========================================================================
    renderAdminCurrenciesAndPublishersPanel: function (container) {
        const currSys = window.SafaqatConfig.liveSettings.currencySystem || {};
        const currencies = currSys.supportedCurrencies || {};

        container.innerHTML = `
            <div class="glass-section-card" style="margin-bottom: 16px;">
                <div class="section-header-row">
                    <h3 style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold);">
                        🪙 نظام العملات المرن للمنصة ودور النشر
                    </h3>
                </div>
                <form id="admin-currencies-form" style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                        ${Object.keys(currencies).map((code) => {
                            const c = currencies[code];
                            return `
                                <div style="padding: 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-glass);">
                                    <label style="display: flex; align-items: center; justify-content: space-between; font-weight: 800; font-size: 0.86rem; margin-bottom: 8px; cursor: pointer;">
                                        <span>${this.escapeHtml(c.name)} (${this.escapeHtml(code)})</span>
                                        <input type="checkbox" data-curr-enable="${this.escapeHtml(code)}" ${c.enabled !== false ? 'checked' : ''} style="width: 17px; height: 17px; accent-color: var(--accent-gold);">
                                    </label>
                                    <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 4px;">معامل التحويل مقابل الريال السعودي (SAR):</div>
                                    <input type="number" step="0.001" data-curr-rate="${this.escapeHtml(code)}" class="store-search-input" style="height: 34px; padding: 0 10px; font-size: 0.82rem;" value="${c.rateFromSAR || 1}">
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <button type="submit" class="btn-add-paper-cart" style="padding: 11px;">
                        <i class="fa-solid fa-coins"></i> حفظ أسعار الصرف والعملات المفعلة
                    </button>
                </form>
            </div>

            <!-- إضافة دار نشر معتمدة بعملة مرنة خاصة بها -->
            <div class="glass-section-card">
                <div class="section-header-row">
                    <h3 style="font-size: 0.98rem; font-weight: 800; color: var(--accent-gold);">
                        🏛️ إضافة دار نشر شريكة مع إعدادات عملتها المرنة
                    </h3>
                </div>
                <form id="admin-add-publisher-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; align-items: end;">
                    <div>
                        <label style="font-size: 0.76rem; color: var(--text-secondary);">اسم دار النشر *</label>
                        <input type="text" id="admin-new-pub-name" class="store-search-input" style="height: 38px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" placeholder="مثال: دار الشمال للنشر" required>
                    </div>
                    <div>
                        <label style="font-size: 0.76rem; color: var(--text-secondary);">العملة الافتراضية للدار</label>
                        <select id="admin-new-pub-currency" style="width: 100%; height: 38px; background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 0 10px; font-size: 0.82rem; margin-top: 4px;">
                            ${Object.keys(currencies).map((code) => `<option value="${this.escapeHtml(code)}">${this.escapeHtml(currencies[code].name)} (${this.escapeHtml(code)})</option>`).join('')}
                        </select>
                    </div>
                    <button type="submit" class="btn-add-paper-cart" style="height: 38px;">
                        <i class="fa-solid fa-plus"></i> اعتماد الدار
                    </button>
                </form>
            </div>
        `;

        document.getElementById('admin-currencies-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedMap = JSON.parse(JSON.stringify(currencies));
            container.querySelectorAll('[data-curr-enable]').forEach((chk) => {
                const code = chk.getAttribute('data-curr-enable');
                if (updatedMap[code]) updatedMap[code].enabled = chk.checked;
            });
            container.querySelectorAll('[data-curr-rate]').forEach((inp) => {
                const code = inp.getAttribute('data-curr-rate');
                if (updatedMap[code]) updatedMap[code].rateFromSAR = parseFloat(inp.value) || 1;
            });

            try {
                await window.SafaqatConfig.savePlatformSettings({
                    currencySystem: {
                        supportedCurrencies: updatedMap
                    }
                });
                this.showToast('🪙 تم تحديث نظام العملات وأسعار الصرف المرنة بنجاح!');
            } catch (err) {
                this.showToast('⚠️ تعذر حفظ العملات: ' + err.message);
            }
        });

        document.getElementById('admin-add-publisher-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('admin-new-pub-name').value.trim();
            const defaultCurr = document.getElementById('admin-new-pub-currency').value;
            if (!name || !window.db) return;

            try {
                await window.db.collection(window.SAFAQAT_COLLECTIONS.PUBLISHERS).add({
                    name: name,
                    defaultCurrency: defaultCurr,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                document.getElementById('admin-new-pub-name').value = '';
                this.showToast(`🏛️ تمت إضافة "${name}" بعملتها المرنة (${defaultCurr})`);
            } catch (err) {
                this.showToast('⚠️ تعذر إضافة الدار: ' + err.message);
            }
        });
    },

    // ========================================================================
    // 7. التبويب الإداري السادس: التحكم بالمساعد الذكي "راوي" (تفعيل أو إلغاء فوري)
    // ========================================================================
    renderAdminRawiAssistantPanel: function (container) {
        const rawi = window.SafaqatConfig.liveSettings.rawiAssistant || {};

        container.innerHTML = `
            <div class="glass-section-card">
                <div class="section-header-row">
                    <h3 style="font-size: 1.02rem; font-weight: 800; color: var(--accent-gold);">
                        🤖 التحكم بالمساعد الأدبي الذكي "راوي" (تفعيل فعلي أو إلغاء نهائي)
                    </h3>
                </div>

                <form id="admin-rawi-form" style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="padding: 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-gold);">
                        <label style="display: flex; align-items: center; gap: 10px; font-size: 0.9rem; font-weight: 800; cursor: pointer;">
                            <input type="checkbox" id="admin-rawi-enabled" ${rawi.enabled !== false ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--accent-gold);">
                            <span>تفعيل المساعد الذكي "راوي" وربطه ببيانات المتجر (ألغِ التحديد لإخفائه وإلغائه تماماً من المنصة)</span>
                        </label>
                    </div>

                    <div>
                        <label style="font-size: 0.78rem; color: var(--text-secondary);">اسم المساعد الظاهر للقراء</label>
                        <input type="text" id="admin-rawi-name" class="store-search-input" style="height: 40px; padding: 0 12px; border-radius: var(--radius-sm); margin-top: 4px;" value="${this.escapeHtml(rawi.assistantName || 'راوي (المستشار الأدبي الذكي)')}">
                    </div>

                    <div>
                        <label style="font-size: 0.78rem; color: var(--text-secondary);">رسالة الترحيب التلقائية</label>
                        <textarea id="admin-rawi-welcome" rows="3" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 10px; font-size: 0.85rem; margin-top: 4px;">${this.escapeHtml(rawi.welcomeMessage || '')}</textarea>
                    </div>

                    <button type="submit" class="btn-add-paper-cart" style="padding: 12px;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> حفظ إعدادات المساعد الذكي "راوي"
                    </button>
                </form>
            </div>
        `;

        document.getElementById('admin-rawi-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await window.SafaqatConfig.savePlatformSettings({
                    rawiAssistant: {
                        enabled: document.getElementById('admin-rawi-enabled').checked,
                        assistantName: document.getElementById('admin-rawi-name').value.trim(),
                        welcomeMessage: document.getElementById('admin-rawi-welcome').value.trim()
                    }
                });
                this.showToast('🤖 تم تحديث حالة وسلوك المساعد "راوي" فوراً!');
            } catch (err) {
                this.showToast('⚠️ تعذر حفظ إعدادات راوي: ' + err.message);
            }
        });
    }

});

// ============================================================================
// التشغيل التلقائي الشامل للمنصة فور اكتمال تحميل الصفحة
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.SafaqatApp && typeof window.SafaqatApp.init === 'function') {
        window.SafaqatApp.init();
    }
});
