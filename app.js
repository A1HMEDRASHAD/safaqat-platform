/* =========================================================
   المحرك البرمجي الشامل لمنصة ومتجر صفقات كتابية — الإصدار 1.8
   File: app.js (الجزء 1 من 5)
   يشمل: فقاعات التوثيق، التوجيه والفهرسة (SEO)، شريط الأحداث والمعارض التلقائي،
         المتجر المدمج، القوائم المنسدلة، محول العملات (SAR/USD/EGP)، ودليل دور النشر
   ========================================================= */

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
// 🌐 محرك التوجيه والصفحات المستقلة (Router) + فهرسة جوجل الديناميكية
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
      "url": CURRENT_DOMAIN_ORIGIN + window.location.pathname,
      "description": cleanDesc
    };
    ldEl.textContent = JSON.stringify(schemaObj || defaultSchema);
  }
};

window.sqSwitchMainView = function(viewName, restoreScroll = false, fromPopState = false) {
  if (viewName === 'publish') { window.sqHandleDockPublish(); return; }
  if (viewName === 'cart') viewName = 'cart_page';
  if (viewName === 'profile') {
    if (!AppState.viewedProfileUid && AppState.currentUser) AppState.viewedProfileUid = AppState.currentUser.uid;
    viewName = 'profile_page';
  }

  const privateViews = ['settings_page', 'publish_chooser', 'publish_post', 'publish_book', 'publish_event', 'cart_page', 'prompt_page', 'book_reader'];
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
    else if (viewName === 'publishers_directory') newUrl += `?view=publishers`;
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
    publishers_directory: 'sq-view-publishers-directory',
    book_reader: 'sq-view-book-reader',
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
  if (dock) dock.classList.toggle('dock-hidden', viewName === 'story_viewer' || viewName === 'book_reader');

  document.querySelectorAll('.sq-dock-btn').forEach(b => b.classList.remove('active'));
  if (['store', 'book_detail', 'publish_book', 'event_detail', 'publish_event', 'publishers_directory', 'book_reader'].includes(viewName)) {
    document.getElementById('dock-store')?.classList.add('active');
    if (viewName === 'store') window.sqRenderLibrarySection();
    if (viewName === 'publishers_directory') window.sqRenderPublishersDirectoryPage();
  } else if (['community', 'single_post', 'publish_post'].includes(viewName)) {
    document.getElementById('dock-community')?.classList.add('active');
    if (viewName === 'community') { window.sqRenderStoriesBar(); window.sqRenderFeed(false); }
  } else if (viewName === 'cart_page') {
    document.getElementById('dock-cart')?.classList.add('active');
    window.sqRenderCartPage();
  } else if (['profile_page', 'settings_page'].includes(viewName)) {
    document.getElementById('dock-profile')?.classList.add('active');
  }

  if (privateViews.includes(viewName)) {
    window.sqUpdateDynamicSEO('إعدادات وطلبات خاصة', '', APP_LOGO_URL, true);
  } else if (viewName === 'store') {
    window.sqUpdateDynamicSEO('المتجر والمكتبة الرسمية', 'تصفح واطلب أحدث الكتب والروايات في متجر ' + APP_NAME, APP_LOGO_URL, false);
  } else if (viewName === 'publishers_directory') {
    window.sqUpdateDynamicSEO('دليل دور النشر المعتمدة', 'تصفح دور النشر الموثقة وإصداراتها في ' + APP_NAME, APP_LOGO_URL, false);
  } else if (viewName === 'community') {
    window.sqUpdateDynamicSEO('المجتمع الأدبي والبودكاست والاقتباسات', 'شارك خواطرك، مقالاتك، ومراجعات الكتب في مجتمع ' + APP_NAME, APP_LOGO_URL, false);
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
    sqShowToast("نورتنا يا بطل! سجل دخولك الأول عشان تشارك إبداعك معانا", "warning");
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
            <div style="width:48px; height:48px; border-radius:15px; background:rgba(212,175,55,0.2); color:#fbbf24; display:flex; align-items:center; justify-content:center; font-size:21px; flex-shrink:0;"><i class="fa-solid fa-book-medical"></i></div>
            <div>
              <h3 style="font-size:15px; font-weight:900; color:#fbbf24;">رفع كتاب جديد إلى المتجر والمكتبة</h3>
              <p style="font-size:11.5px; color:#cbd5e1; margin-top:2px;">إضافة كتاب بمرونة تامة، تسعير بـ 3 عملات، قراءة آمنة أو تحميل، وربط بالدار والمؤلف</p>
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
            <div style="width:48px; height:48px; border-radius:15px; background:rgba(239,68,68,0.12); color:var(--danger); display:flex; align-items:center; justify-content:center; font-size:21px; flex-shrink:0;"><i class="fa-solid fa-calendar-plus"></i></div>
            <div>
              <h3 style="font-size:15px; font-weight:900;">إضافة حدث أو معرض أو عرض ترويجي</h3>
              <p style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">يظهر في شريط الأحداث والمعارض التلقائي أعلى المتجر</p>
            </div>
          </div>
          <i class="fa-solid fa-chevron-left" style="color:var(--text-muted);"></i>
        </div>
      `;
    }

    html += `
      <div class="sq-hub-card" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; border:1.5px solid var(--accent); margin-bottom:0;" onclick="window.sqOpenPublishModal()">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:48px; height:48px; border-radius:15px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:21px; flex-shrink:0;"><i class="fa-solid fa-feather-pointed"></i></div>
          <div>
            <h3 style="font-size:15px; font-weight:900;">نشر خاطرة، مقال، مراجعة كتاب، أو بودكاست</h3>
            <p style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">سمّعنا إبداعك وشارك اقتباساتك أو حلقات البودكاست مع القراء</p>
          </div>
        </div>
        <i class="fa-solid fa-chevron-left" style="color:var(--text-muted);"></i>
      </div>

      <div class="sq-hub-card" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:0;" onclick="window.sqOpenStoryModal()">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:48px; height:48px; border-radius:15px; background:rgba(16,185,129,0.12); color:var(--success); display:flex; align-items:center; justify-content:center; font-size:21px; flex-shrink:0;"><i class="fa-solid fa-bolt"></i></div>
          <div>
            <h3 style="font-size:15px; font-weight:900;">نشر قصة يومية (24 ساعة)</h3>
            <p style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">تظهر لحبايبك ومتابعينك لمدة 24 ساعة بتصميم سينمائي</p>
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
    sec.style.display = 'none';
    return;
  }

  sec.style.display = 'block';
  const typeBadges = {
    exhibition: { label: 'معرض كتاب', icon: 'fa-landmark' },
    signing:    { label: 'حفل توقيع', icon: 'fa-pen-fancy' },
    offer:      { label: 'عرض خاص', icon: 'fa-tags' },
    event:      { label: 'فعالية ثقافية', icon: 'fa-calendar-check' }
  };

  track.innerHTML = AppState.eventsList.map((ev) => {
    const tObj = typeBadges[ev.eventType || 'event'] || typeBadges.event;
    const thumb = ev.imageUrl || APP_LOGO_URL;
    return `
      <div class="sq-event-thumb-card" onclick="window.sqOpenEventDetail('${ev.id}')">
        <img src="${escapeHtml(thumb)}" alt="${escapeHtml(ev.title)}" loading="lazy">
        <span class="sq-event-badge-pill"><i class="fa-solid ${tObj.icon}"></i> ${tObj.label}</span>
        <div class="sq-event-thumb-overlay">
          <h3 style="font-size:15.5px; font-weight:900; color:#fff; margin-bottom:3px; line-height:1.35;">${escapeHtml(ev.title)}</h3>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; font-size:11.5px; color:#cbd5e1;">
            <span>
              ${ev.eventDate ? `<i class="fa-regular fa-calendar" style="color:#fbbf24;"></i> ${escapeHtml(ev.eventDate)} ` : ''}
              ${ev.eventLocation ? `• <i class="fa-solid fa-location-dot" style="color:#fbbf24;"></i> ${escapeHtml(ev.eventLocation)}` : (ev.description ? escapeHtml(ev.description).substring(0, 55) : '')}
            </span>
            <span style="background:#fbbf24; color:#0f172a; font-weight:900; font-size:10.5px; padding:2px 9px; border-radius:9px;">${escapeHtml(ev.ctaText || 'التفاصيل')} <i class="fa-solid fa-arrow-left"></i></span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (dotsBox) {
    dotsBox.innerHTML = AppState.eventsList.map((_, i) => `<span class="sq-event-dot ${i === 0 ? 'active' : ''}" id="evdot-${i}"></span>`).join('');
  }

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
        tr.scrollTo({ left: targetCard.offsetLeft - 10, behavior: 'smooth' });
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
      <div style="padding:18px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
          ${ev.eventDate ? `<span class="sq-status-pill"><i class="fa-regular fa-calendar" style="color:var(--accent);"></i> التاريخ: <strong>${escapeHtml(ev.eventDate)}</strong></span>` : ''}
          ${ev.eventLocation ? `<span class="sq-status-pill"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> المكان: <strong>${escapeHtml(ev.eventLocation)}</strong></span>` : ''}
          <span class="sq-status-pill"><i class="fa-regular fa-eye" style="color:var(--accent);"></i> المشاهدات: <strong>${ev.clicks || 1}</strong></span>
        </div>
        <h1 style="font-size:20px; font-weight:900; margin-bottom:10px; color:var(--text-main);">${escapeHtml(ev.title)}</h1>
        <p style="font-size:14.5px; line-height:1.85; color:var(--text-main); white-space:pre-wrap; margin-bottom:16px;">${escapeHtml(ev.description || 'لا توجد تفاصيل إضافية.')}</p>

        ${linkedBook ? `
          <div class="sq-attached-book-pill" onclick="window.sqOpenBookDetail('${linkedBook.id}')" style="margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${escapeHtml(linkedBook.cover || APP_LOGO_URL)}" style="width:44px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--accent);">
              <div>
                <div style="font-size:14px; font-weight:900; color:var(--text-main);">${escapeHtml(linkedBook.title)}</div>
                <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(linkedBook.authorName || '')}</div>
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
        <img id="ev-thumb-prev" src="${escapeHtml(AppState.pendingEventThumb || APP_LOGO_URL)}" style="width:100%; max-width:260px; aspect-ratio:16/9; object-fit:cover; border-radius:14px; border:2px solid var(--accent); margin:0 auto 8px auto; display:block;">
        <div id="ev-thumb-status" style="font-size:12px; font-weight:800; color:var(--text-main);"><i class="fa-solid fa-camera" style="color:var(--accent);"></i> اضغط لرفع الصورة المصغرة للحدث (بأسلوب يوتيوب 16:9)</div>
      </label>
      <input type="file" id="ev-thumb-file" accept="image/*" style="display:none;" onchange="window.sqHandleEventThumbUpload(this)">
    </div>

    <label class="sq-field-label"><i class="fa-solid fa-heading"></i> عنوان الحدث أو المعرض أو العرض (إلزامي):</label>
    <input type="text" id="ev-in-title" class="sq-input" value="${escapeHtml(ev ? ev.title : '')}" placeholder="مثال: جناح صفقات كتابية في معرض الكتاب">

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
    <textarea id="ev-in-desc" class="sq-input" style="min-height:95px; resize:vertical;" placeholder="اكتب كافة تفاصيل المعرض أو العرض...">${escapeHtml(ev ? (ev.description || '') : '')}</textarea>

    <label class="sq-field-label"><i class="fa-solid fa-book"></i> ربط بكتاب في المتجر (اختياري):</label>
    <select id="ev-in-book" class="sq-select">${booksOptions}</select>

    <label class="sq-field-label"><i class="fa-solid fa-link"></i> رابط خارجي إضافي عند الضغط (اختياري):</label>
    <input type="url" id="ev-in-url" class="sq-input" value="${escapeHtml(ev && ev.targetUrl ? ev.targetUrl : '')}" placeholder="https://...">

    <button class="sq-btn sq-btn-gold" style="width:100%; padding:12px!important; font-size:13.5px!important;" onclick="window.sqSaveEventFromStudio()">
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
    db.collection("safaqat_ads").add(payload).then(() => {
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

// =========================================================
// 🏛️ محرك المتجر المدمج، القوائم المنسدلة، محول العملات، ودور النشر
// =========================================================
window.sqGetMergedBookCategories = function() {
  return { ...DEFAULT_BOOK_CATEGORIES, ...(AppState.customBookCategories || {}) };
};

window.sqBookBelongsToCategory = function(book, catKey) {
  if (!book || !catKey || catKey === 'all') return true;
  if (Array.isArray(book.categories) && book.categories.includes(catKey)) return true;
  return book.category === catKey;
};

window.sqSetDisplayCurrency = function(currCode) {
  AppState.displayCurrency = currCode || 'SAR';
  localStorage.setItem('sq_display_currency_v18', AppState.displayCurrency);
  const sel = document.getElementById('sq-lib-curr-select');
  if (sel && sel.value !== AppState.displayCurrency) sel.value = AppState.displayCurrency;
  if (AppState.activeMainView === 'store') window.sqRenderLibrarySection();
  if (AppState.activeMainView === 'book_detail') window.sqRenderBookDetailView();
  if (AppState.activeMainView === 'cart_page') window.sqRenderCartPage();
  sqShowToast(`تم عرض الأسعار بعملة: ${CURRENCY_CONFIG[AppState.displayCurrency]?.name || 'ريال سعودي'}`, "success");
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
  AppState.activeBookCatFilter = catKey || 'all';
  const sel = document.getElementById('sq-lib-cats-select');
  if (sel && sel.value !== AppState.activeBookCatFilter) sel.value = AppState.activeBookCatFilter;
  if (AppState.activeBookCatFilter !== 'all') window.SafaqatAI.trackSignal('category', AppState.activeBookCatFilter, 2);
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

// تجميع قائمة دور النشر المعتمدة
window.sqGetApprovedPublishersList = function() {
  const publishers = [];
  const mainAdminUid = Object.keys(AppState.allUsers).find(u => window.sqIsSuperAdminEmail(AppState.allUsers[u].email)) || 'DAR_MAIN';
  const darBooksCount = AppState.booksList.filter(b => !b.publisherUid || b.publisherUid === 'DAR_MAIN' || b.publisherUid === mainAdminUid).length;

  publishers.push({
    uid: mainAdminUid,
    isMainDar: true,
    name: APP_NAME,
    photo: APP_LOGO_URL,
    booksCount: darBooksCount
  });

  Object.keys(AppState.allUsers).forEach(uid => {
    const u = AppState.allUsers[uid];
    if (u && u.isPublisher && !window.sqIsSuperAdminEmail(u.email)) {
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
  return publishers;
};

// بناء شريط دور النشر ليظهر بشكل أنيق بعد 3 فئات من الكتب داخل المتجر
window.sqBuildInlinePublishersBlockHTML = function() {
  const publishers = window.sqGetApprovedPublishersList();
  if (!publishers.length) return '';
  return `
    <div class="sq-shelf-block" style="background:linear-gradient(135deg, var(--card) 0%, var(--bg) 100%); border:1.5px solid var(--accent-border);">
      <div class="sq-section-head">
        <div class="sq-section-title">
          <i class="fa-solid fa-building-columns" style="color:var(--accent);"></i>
          <span>دور النشر المعتمدة وشركاء النجاح</span>
        </div>
        <button class="sq-mini-action-btn" onclick="window.sqSwitchMainView('publishers_directory')">دليل الدور <i class="fa-solid fa-chevron-left"></i></button>
      </div>
      <div class="sq-publishers-rail">
        ${publishers.map(pub => `
          <div class="sq-pub-card" onclick="${pub.uid !== 'DAR_MAIN' ? `window.sqViewProfile('${pub.uid}', 'books')` : `window.sqSetBookCatFilter('dar_exclusives')`}">
            <img src="${escapeHtml(pub.photo)}" loading="lazy" alt="${escapeHtml(pub.name)}">
            <div class="sq-pub-card-name">
              ${escapeHtml(pub.name)}${pub.isMainDar
                ? `<span class="sq-vbadge admin" title="الدار الرسمية"><i class="fa-solid fa-check"></i></span>`
                : `<span class="sq-vbadge publisher" title="دار نشر معتمدة"><i class="fa-solid fa-check"></i></span>`
              }
            </div>
            <div class="sq-pub-card-meta"><i class="fa-solid fa-book" style="color:var(--accent);"></i> ${pub.booksCount} إصدار</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

// عرض صفحة دليل دور النشر المستقلة
window.sqRenderPublishersDirectoryPage = function() {
  const grid = document.getElementById('sq-publishers-full-grid');
  if (!grid) return;
  const publishers = window.sqGetApprovedPublishersList();
  grid.innerHTML = publishers.map(pub => `
    <div class="sq-pub-card" style="flex:none; width:100%; padding:16px 12px;" onclick="${pub.uid !== 'DAR_MAIN' ? `window.sqViewProfile('${pub.uid}', 'books')` : `window.sqSwitchMainView('store'); window.sqSetBookCatFilter('dar_exclusives');`}">
      <img src="${escapeHtml(pub.photo)}" style="width:64px; height:64px;" loading="lazy">
      <div class="sq-pub-card-name" style="font-size:14px; margin-top:4px;">
        ${escapeHtml(pub.name)}
        ${pub.isMainDar
          ? `<span class="sq-vbadge admin" title="الدار الرسمية"><i class="fa-solid fa-check"></i></span>`
          : `<span class="sq-vbadge publisher" title="دار نشر معتمدة"><i class="fa-solid fa-check"></i></span>`
        }
      </div>
      <div class="sq-pub-card-meta" style="margin-top:5px;"><i class="fa-solid fa-book" style="color:var(--accent);"></i> ${pub.booksCount} إصدار منشور</div>
      <span class="sq-btn sq-btn-outline" style="margin-top:10px; width:100%; padding:5px 10px!important; font-size:11px!important;">تصفح إصدارات الدار</span>
    </div>
  `).join('');
};

window.sqRenderLibrarySection = function() {
  window.sqRenderEventsCarousel();

  const currSelect = document.getElementById('sq-lib-curr-select');
  if (currSelect && currSelect.value !== AppState.displayCurrency) {
    currSelect.value = AppState.displayCurrency;
  }

  const staffActions = document.getElementById('sq-lib-staff-actions');
  if (staffActions) {
    let btns = '';
    if (window.sqHasPermission('manage_books')) {
      btns += `<button class="sq-btn sq-btn-gold" style="padding:7px 12px!important; font-size:11.5px!important;" onclick="window.sqOpenBookStudio(null)" title="رفع كتاب جديد"><i class="fa-solid fa-plus"></i> كتاب</button>`;
    }
    staffActions.innerHTML = btns;
  }

  // تعبئة القائمة المنسدلة للتصنيفات
  const catsSelect = document.getElementById('sq-lib-cats-select');
  const mergedCats = window.sqGetMergedBookCategories();
  if (catsSelect) {
    let opts = `<option value="all" ${AppState.activeBookCatFilter === 'all' ? 'selected' : ''}>كل التصنيفات (${AppState.booksList.length})</option>`;
    Object.keys(mergedCats).forEach(k => {
      const c = mergedCats[k];
      const countInCat = AppState.booksList.filter(b => window.sqBookBelongsToCategory(b, k)).length;
      if (countInCat > 0 || DEFAULT_BOOK_CATEGORIES[k]) {
        opts += `<option value="${k}" ${AppState.activeBookCatFilter === k ? 'selected' : ''}>${escapeHtml(c.label)} (${countInCat})</option>`;
      }
    });
    catsSelect.innerHTML = opts;
  }

  const shelvesContainer = document.getElementById('sq-library-shelves-container');
  const grid = document.getElementById('sq-library-grid');
  if (!grid || !shelvesContainer) return;

  let list = [...AppState.booksList];
  if (AppState.activeBookCatFilter && AppState.activeBookCatFilter !== 'all') {
    list = list.filter(b => window.sqBookBelongsToCategory(b, AppState.activeBookCatFilter));
  }
  if (AppState.librarySort === 'free') {
    list = list.filter(b => Boolean(b.downloadUrl && b.downloadUrl.trim() !== '') || b.allowOnlineRead || Number(b.price) === 0);
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

  // عرض رفوف التمرير الأفقي السلسة مع وضع شريط دور النشر بعد 3 فئات من الكتب
  if ((AppState.librarySort === 'shelves' || (AppState.librarySort === 'smart' && AppState.activeBookCatFilter === 'all' && !AppState.librarySearchQuery)) && AppState.booksList.length >= 2) {
    let shelvesBlocks = [];
    const topSmart = [...list].slice(0, 10);
    shelvesBlocks.push(`
      <div class="sq-shelf-block">
        <div class="sq-section-head" style="margin-bottom:6px;">
          <div class="sq-section-title"><i class="fa-solid fa-star" style="color:var(--accent);"></i> اخترناها لذائقتك الأدبية</div>
          <span style="font-size:11px; color:var(--text-muted); font-weight:700;">اسحب لليمين واليسار <i class="fa-solid fa-arrows-left-right"></i></span>
        </div>
        <div class="sq-books-horizontal-rail">
          ${topSmart.map(b => window.sqBuildBookCardHTML(b)).join('')}
        </div>
      </div>
    `);

    Object.keys(mergedCats).forEach(catKey => {
      const catBooks = AppState.booksList.filter(b => window.sqBookBelongsToCategory(b, catKey));
      if (catBooks.length > 0) {
        const cObj = mergedCats[catKey];
        const sortedCatBooks = catBooks.sort((a, b) => window.SafaqatAI.scoreBookForUser(b) - window.SafaqatAI.scoreBookForUser(a));
        shelvesBlocks.push(`
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
        `);
      }
    });

    // إدراج شريط دور النشر المعتمدة بأناقة بعد أول 3 أقسام من الكتب
    const pubsBlockHtml = window.sqBuildInlinePublishersBlockHTML();
    if (pubsBlockHtml) {
      const insertIdx = Math.min(3, shelvesBlocks.length);
      shelvesBlocks.splice(insertIdx, 0, pubsBlockHtml);
    }

    shelvesContainer.innerHTML = shelvesBlocks.join('');
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
  const pInfo = window.sqFormatBookPrice(book);
  const hasPaper = book.allowPaperOrder !== false && pInfo.current > 0;
  const hasDigital = Boolean(book.downloadUrl && book.downloadUrl.trim() !== '') && (book.allowDirectDownload !== false || book.allowOnlineRead !== false);

  let badgeTop = '';
  if (book.isOffer || (pInfo.old > pInfo.current && pInfo.current > 0)) {
    const disc = (pInfo.old > pInfo.current && pInfo.current > 0) ? Math.round(((pInfo.old - pInfo.current) / pInfo.old) * 100) : 0;
    badgeTop = `<span class="sq-lib-badge-top" style="background:var(--danger); color:#fff; border:none;"><i class="fa-solid fa-tags"></i> ${disc > 0 ? `خصم ${disc}%` : 'عرض خاص'}</span>`;
  } else if (book.isBestSeller) {
    badgeTop = `<span class="sq-lib-badge-top"><i class="fa-solid fa-fire"></i> الأكثر رواجاً</span>`;
  } else if (hasDigital && !hasPaper) {
    badgeTop = `<span class="sq-lib-badge-top" style="background:var(--success); color:#fff; border:none;"><i class="fa-solid fa-book-open-reader"></i> قراءة / تحميل</span>`;
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
          ${hasPaper
            ? `<span class="sq-lib-price">${pInfo.current} ${escapeHtml(pInfo.symbol)}</span>${pInfo.old > pInfo.current ? `<span class="sq-lib-old-price">${pInfo.old}</span>` : ''}`
            : `<span class="sq-lib-price" style="color:var(--success); font-size:11.5px;">${hasDigital ? 'قراءة / تحميل' : 'مجاني'}</span>`
          }
        </div>
        ${hasPaper ? `
          <button type="button" class="sq-icon-btn" style="width:30px; height:30px; background:var(--accent-soft); color:#b45309; border-color:var(--accent-border);" onclick="event.stopPropagation(); window.sqAddToCart('${book.id}', 1)" title="أضف إلى السلة">
            <i class="fa-solid fa-cart-plus" style="font-size:12px;"></i>
          </button>
        ` : `
          <button type="button" class="sq-icon-btn" style="width:30px; height:30px; background:rgba(16,185,129,0.14); color:var(--success); border-color:var(--success);" onclick="event.stopPropagation(); window.sqOpenBookDetail('${book.id}')" title="قراءة أو تحميل">
            <i class="fa-solid fa-book-open" style="font-size:12px;"></i>
          </button>
        `}
      </div>
    </div>
  `;
};
