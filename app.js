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
/* =========================================================
   المحرك البرمجي الشامل — الإصدار 1.8
   File: app.js (الجزء 2 من 5)
   يشمل: صفحة الكتاب المتجانسة، القارئ الآمن (Read-Only Canvas)، التحميل الصامت،
         استوديو الكتب المرن (3 عملات + تعدد الفئات + كاشف التشابه)، والسلة والفواتير
   ========================================================= */

// =========================================================
// 📖 صفحة الكتاب الاحترافية المتجانسة + التحميل الصامت + القراءة الآمنة
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

// إظهار / إخفاء شريط التأكيد قبل التحميل
window.sqRequestBookDownload = function(bookId) {
  AppState.showDownloadConfirmForBook = !AppState.showDownloadConfirmForBook;
  window.sqRenderBookDetailView();
};

// تنفيذ التحميل الصامت في الخلفية دون إخراج المستخدم إلى البريد أو نافذة خارجية
window.sqExecuteBookDownload = async function(bookId) {
  const book = AppState.booksList.find(b => b.id === bookId);
  if (!book || !book.downloadUrl) return;

  AppState.showDownloadConfirmForBook = false;
  window.SafaqatAI.trackSignal('book', book, 5);

  book.downloadsCount = (Number(book.downloadsCount) || 0) + 1;
  db.collection("safaqat_books").doc(bookId).update({
    downloadsCount: firebase.firestore.FieldValue.increment(1),
    readsCount: firebase.firestore.FieldValue.increment(1)
  }).catch(() => {});

  window.sqRenderBookDetailView();
  sqShowToast(`بدأ تحميل كتاب "${book.title}" في الخلفية الآن.. قراءة ممتعة!`, "success");

  const directUrl = window.sqFormatGoogleDriveDownloadUrl(book.downloadUrl);

  // محاولة التحميل الصامت عبر Blob أولاً، ثم عبر إطار خفي صامت دون مغادرة الصفحة
  try {
    let dlIframe = document.getElementById('sq-silent-dl-iframe');
    if (!dlIframe) {
      dlIframe = document.createElement('iframe');
      dlIframe.id = 'sq-silent-dl-iframe';
      dlIframe.style.display = 'none';
      document.body.appendChild(dlIframe);
    }
    dlIframe.src = directUrl;
  } catch (e) {}
};

// =========================================================
// 🛡️ نظام القراءة الآمنة داخل الموقع (Read-Only Canvas Reader + حفظ الصفحة)
// =========================================================
window.sqGetSavedReaderPage = function(bookId) {
  if (!bookId) return 1;
  try {
    const localMap = JSON.parse(localStorage.getItem('sq_reading_progress_v18') || '{}');
    if (localMap[bookId]) return Math.max(1, parseInt(localMap[bookId], 10));
  } catch (e) {}
  if (AppState.userData && AppState.userData.readingProgress && AppState.userData.readingProgress[bookId]) {
    return Math.max(1, parseInt(AppState.userData.readingProgress[bookId], 10));
  }
  return 1;
};

window.sqSaveReaderPageProgress = function(bookId, pageNum) {
  if (!bookId || !pageNum) return;
  const p = Math.max(1, parseInt(pageNum, 10));
  try {
    const localMap = JSON.parse(localStorage.getItem('sq_reading_progress_v18') || '{}');
    localMap[bookId] = p;
    localStorage.setItem('sq_reading_progress_v18', JSON.stringify(localMap));
  } catch (e) {}

  if (!AppState.userData.readingProgress) AppState.userData.readingProgress = {};
  AppState.userData.readingProgress[bookId] = p;

  if (AppState.currentUser) {
    db.collection("safaqat_users").doc(AppState.currentUser.uid).update({
      [`readingProgress.${bookId}`]: p,
      currentlyReadingBookId: bookId
    }).catch(() => {});
  }
  const progTxt = document.getElementById('sq-reader-progress-text');
  if (progTxt) progTxt.innerText = `تم حفظ موضع قراءتك تلقائياً عند الصفحة (${p})`;
};

window.sqOpenBookReader = async function(bookId) {
  const book = AppState.booksList.find(b => b.id === bookId);
  if (!book || !book.downloadUrl) {
    return sqShowToast("ملف القراءة غير مرفق لهذا الكتاب حالياً", "warning");
  }

  AppState.readerBookId = bookId;
  AppState.readerPdfDoc = null;
  AppState.readerPageNum = window.sqGetSavedReaderPage(bookId);
  AppState.readerScale = 1.25;

  window.SafaqatAI.trackSignal('book', book, 5);
  db.collection("safaqat_books").doc(bookId).update({ readsCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});

  window.sqSwitchMainView('book_reader');

  const titleEl = document.getElementById('sq-reader-book-title');
  const statusEl = document.getElementById('sq-reader-status-msg');
  const canvas = document.getElementById('sq-pdf-canvas');
  const driveFrame = document.getElementById('sq-drive-preview-frame');
  const pageIn = document.getElementById('sq-reader-page-input');
  const totalEl = document.getElementById('sq-reader-total-pages');

  if (titleEl) titleEl.innerText = book.title;
  if (pageIn) pageIn.value = AppState.readerPageNum;
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--accent); margin-bottom:10px;"></i><br>جاري تجهيز صفحات الكتاب للقراءة الآمنة...<br><span style="font-size:11.5px; color:var(--accent);">سيتم فتح الكتاب على الصفحة (${AppState.readerPageNum}) التي توقفت عندها</span>`;
  }
  if (canvas) canvas.style.display = 'none';
  if (driveFrame) driveFrame.style.display = 'none';

  const rawUrl = String(book.downloadUrl).trim();
  const driveId = window.sqExtractGoogleDriveFileId(rawUrl);

  // إذا كان رابط PDF مباشر يدعم Canvas نرسمه عبر PDF.js، وإذا كان Google Drive نستخدم عارض القراءة المحمي المدمج مع حفظ الصفحة
  if (!driveId && window.pdfjsLib) {
    try {
      const loadingTask = window.pdfjsLib.getDocument(rawUrl);
      const pdfDoc = await loadingTask.promise;
      AppState.readerPdfDoc = pdfDoc;
      AppState.readerTotalPages = pdfDoc.numPages;
      if (AppState.readerPageNum > AppState.readerTotalPages) AppState.readerPageNum = 1;
      if (totalEl) totalEl.innerText = `من ${AppState.readerTotalPages}`;
      if (statusEl) statusEl.style.display = 'none';
      if (canvas) canvas.style.display = 'block';
      window.sqRenderCurrentPdfPage();
      return;
    } catch (err) {
      console.warn("Direct PDF Canvas fallback to embedded reader:", err);
    }
  }

  // وضع القراءة المحمي لملفات Google Drive والروابط الخارجية داخل الصفحة بدون خروج
  if (statusEl) statusEl.style.display = 'none';
  if (driveFrame) {
    driveFrame.style.display = 'block';
    const previewUrl = driveId
      ? `https://drive.google.com/file/d/${driveId}/preview`
      : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawUrl)}`;
    driveFrame.src = previewUrl;
  }
  if (totalEl) totalEl.innerText = `(علامتك المحفوظة: ص ${AppState.readerPageNum})`;
  window.sqSaveReaderPageProgress(bookId, AppState.readerPageNum);
};

window.sqRenderCurrentPdfPage = async function() {
  if (!AppState.readerPdfDoc || AppState.readerRendering) return;
  AppState.readerRendering = true;
  try {
    const page = await AppState.readerPdfDoc.getPage(AppState.readerPageNum);
    const viewport = page.getViewport({ scale: AppState.readerScale });
    const canvas = document.getElementById('sq-pdf-canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    const pageIn = document.getElementById('sq-reader-page-input');
    if (pageIn) pageIn.value = AppState.readerPageNum;
    window.sqSaveReaderPageProgress(AppState.readerBookId, AppState.readerPageNum);
  } catch (e) {}
  AppState.readerRendering = false;
};

window.sqChangeReaderPage = function(delta) {
  const nextP = Math.max(1, AppState.readerPageNum + delta);
  if (AppState.readerPdfDoc && nextP > AppState.readerTotalPages) return;
  AppState.readerPageNum = nextP;
  const pageIn = document.getElementById('sq-reader-page-input');
  if (pageIn) pageIn.value = AppState.readerPageNum;
  if (AppState.readerPdfDoc) {
    window.sqRenderCurrentPdfPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.sqSaveReaderPageProgress(AppState.readerBookId, AppState.readerPageNum);
    sqShowToast(`تم حفظ علامة الوقوف عند الصفحة ${AppState.readerPageNum}`, "success");
  }
};

window.sqJumpToReaderPage = function(val) {
  let p = Math.max(1, parseInt(val, 10) || 1);
  if (AppState.readerPdfDoc && p > AppState.readerTotalPages) p = AppState.readerTotalPages;
  AppState.readerPageNum = p;
  if (AppState.readerPdfDoc) {
    window.sqRenderCurrentPdfPage();
  } else {
    window.sqSaveReaderPageProgress(AppState.readerBookId, AppState.readerPageNum);
    sqShowToast(`تم حفظ علامة الوقوف عند الصفحة ${AppState.readerPageNum}`, "success");
  }
};

window.sqReaderZoom = function(delta) {
  AppState.readerScale = Math.min(2.5, Math.max(0.75, AppState.readerScale + delta));
  if (AppState.readerPdfDoc) window.sqRenderCurrentPdfPage();
};

window.sqCloseBookReader = function() {
  if (AppState.readerBookId) {
    window.sqOpenBookDetail(AppState.readerBookId);
  } else {
    window.sqSwitchMainView('store');
  }
};

window.sqToggleSaveBookToLibrary = function(bookId) {
  if (!AppState.currentUser) { sqShowToast("سجل دخولك الأول عشان تحفظ الكتاب في مكتبتك", "warning"); return window.sqLogin(); }
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

// عرض صفحة الكتاب بالتصميم الجديد المتجانس مع هوية الموقع (الغلاف في الزاوية + المؤلف والناشر متجاوران بحجم أنيق + قوائم منسدلة)
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
  const bookCatsList = (Array.isArray(book.categories) && book.categories.length) ? book.categories : [book.category || 'novels'];
  const catsBadgesHtml = bookCatsList.map(ck => {
    const lbl = (mergedCats[ck] && mergedCats[ck].label) ? mergedCats[ck].label : 'إصدار أدبي';
    return `<span class="sq-status-pill" style="margin:0; cursor:pointer;" onclick="window.sqSwitchMainView('store'); window.sqSetBookCatFilter('${ck}');"><i class="fa-solid fa-tag" style="color:var(--accent);"></i> ${escapeHtml(lbl)}</span>`;
  }).join(' ');

  // بيانات الكاتب والترابط الشبكي
  const authorDisplay = book.authorUid ? getRealName(book.authorUid, book.authorName) : (book.authorName || 'مؤلف');
  const hasAuthorAccount = Boolean(book.authorUid && AppState.allUsers[book.authorUid]);
  const authorUserObj = hasAuthorAccount ? AppState.allUsers[book.authorUid] : null;
  const authorAvatar = hasAuthorAccount ? getRealPhoto(book.authorUid, '') : DEFAULT_PIC;
  const authorBioText = (authorUserObj && authorUserObj.bio) ? authorUserObj.bio : (book.authorBio || '');

  // بيانات دار النشر والترابط الشبكي
  const isMainDarPub = !book.publisherUid || book.publisherUid === 'DAR_MAIN' || sqIsAdminUid(book.publisherUid);
  const pubDisplay = isMainDarPub ? (book.publisherName || APP_NAME) : getRealName(book.publisherUid, book.publisherName || APP_NAME);
  const pubAvatar = isMainDarPub ? APP_LOGO_URL : getRealPhoto(book.publisherUid, APP_LOGO_URL);
  const hasPubProfile = Boolean(!isMainDarPub && book.publisherUid && AppState.allUsers[book.publisherUid]);

  // الأسعار بالعملات الثلاث (SAR / USD / EGP)
  const pInfo = window.sqFormatBookPrice(book, AppState.displayCurrency);
  const pSAR = window.sqFormatBookPrice(book, 'SAR');
  const pUSD = window.sqFormatBookPrice(book, 'USD');
  const pEGP = window.sqFormatBookPrice(book, 'EGP');

  const hasFileUrl = Boolean(book.downloadUrl && book.downloadUrl.trim() !== '');
  const canOrderPaper = (book.allowPaperOrder !== false) && (pInfo.current > 0) && (book.availability !== 'out');
  const canReadOnline = hasFileUrl && (book.allowOnlineRead !== false);
  const canDirectDownload = hasFileUrl && (book.allowDirectDownload !== false);
  const savedPageNum = window.sqGetSavedReaderPage(book.id);

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
      "offers": { "@type": "Offer", "price": pSAR.current, "priceCurrency": "SAR", "availability": "https://schema.org/InStock" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": st.avgRating, "reviewCount": Math.max(1, st.ratingsCount) }
    }
  );

  const isMyPublisherBook = AppState.currentUser && book.publisherUid === AppState.currentUser.uid;
  const canEditBook = AppState.isAdmin || (AppState.userData.permissions || []).includes('manage_books') || isMyPublisherBook;
  const canPromoteBook = AppState.isAdmin || window.sqHasPermission('manage_ads') || canEditBook;

  const isSavedInMyLib = AppState.currentUser && (AppState.userData.savedBooks || []).includes(book.id);
  const myShelfState = (AppState.userData.readingShelf && AppState.userData.readingShelf[book.id]) || '';

  const relatedPosts = AppState.posts.filter(p => p.linkedBookId === book.id || (book.title && (p.book || '').trim() === book.title.trim()));
  const reviews = Array.isArray(book.reviews) ? [...book.reviews].sort((a, b) => (b.time || 0) - (a.time || 0)) : [];
  const similarBooks = window.SafaqatAI.getSimilarBooks(book, 6);

  const availMap = {
    available: { text: 'متوفر ورقياً ورقمياً', color: 'var(--success)', icon: 'fa-circle-check' },
    digital:   { text: 'إصدار رقمي', color: 'var(--author)', icon: 'fa-tablet-screen-button' },
    out:       { text: 'نفدت النسخ الورقية', color: 'var(--danger)', icon: 'fa-circle-xmark' },
    soon:      { text: 'قريباً في المتجر', color: 'var(--warning)', icon: 'fa-clock' }
  };
  const availObj = availMap[book.availability || 'available'] || availMap.available;

  let staffControlBar = '';
  if (canEditBook || canPromoteBook) {
    staffControlBar = `
      <div class="sq-hub-card" style="background:var(--accent-soft); border:1.5px dashed var(--accent); padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span style="font-size:12px; font-weight:900; color:var(--text-main);"><i class="fa-solid fa-sliders" style="color:var(--accent);"></i> تحكم الإدارة والناشر:</span>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${canPromoteBook ? `<button class="sq-btn sq-btn-gold" style="padding:5px 12px!important; font-size:11px!important;" onclick="window.sqPromoteBookOneClick('${book.id}')"><i class="fa-solid fa-calendar-star"></i> ترويج في الأحداث</button>` : ''}
          ${canEditBook ? `<button class="sq-btn" style="padding:5px 12px!important; font-size:11px!important;" onclick="window.sqOpenBookStudio('${book.id}')"><i class="fa-solid fa-pen-to-square"></i> تعديل الكتاب</button>` : ''}
          ${canEditBook ? `<button class="sq-btn sq-btn-outline" style="padding:5px 10px!important; font-size:11px!important; color:var(--danger)!important; border-color:var(--danger)!important;" onclick="window.sqDeleteBook('${book.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>
    `;
  }

  const reviewsHtml = reviews.length ? reviews.map((rev, rIdx) => {
    const rName = escapeHtml(getRealName(rev.uid, rev.name));
    const rPhoto = getRealPhoto(rev.uid, rev.photo);
    const canDelRev = (AppState.currentUser && rev.uid === AppState.currentUser.uid) || window.sqHasPermission('manage_mod');
    const starsHtml = Array.from({ length: 5 }, (_, i) => `<i class="fa-solid fa-star" style="color:${i < (rev.stars || 5) ? '#fbbf24' : '#cbd5e1'}; font-size:11px;"></i>`).join('');
    return `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:11px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
          <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="window.sqViewProfile('${rev.uid}')">
            <img src="${rPhoto}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
            <div>
              <div style="font-size:12.5px; font-weight:800;">${rName} ${window.getUserBadges(rev.uid, false, false)}</div>
              <div>${starsHtml} <span style="font-size:10px; color:var(--text-muted); margin-right:4px;">${sqFormatRelativeTime(rev.time)}</span></div>
            </div>
          </div>
          ${canDelRev ? `<button style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:12px;" onclick="window.sqDeleteBookReview('${book.id}',${rIdx})"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
        <p style="font-size:13px; line-height:1.7; color:var(--text-main); white-space:pre-wrap;">${escapeHtml(rev.text || '')}</p>
      </div>
    `;
  }).join('') : `<p style="text-align:center; padding:14px; color:var(--text-muted); font-size:12.5px;">إيه رأيك في الكتاب؟ كن أول من يشاركنا تقييمه وانطباعه!</p>`;

  const similarBooksHtml = similarBooks.length ? `
    <div class="sq-shelf-block">
      <div class="sq-section-head">
        <div class="sq-section-title"><i class="fa-solid fa-compass" style="color:var(--accent);"></i> إصدارات مشابهة على نفس الذوق</div>
        <span style="font-size:11px; color:var(--text-muted); font-weight:700;">تصفح أفقياً</span>
      </div>
      <div class="sq-books-horizontal-rail">
        ${similarBooks.map(b => window.sqBuildBookCardHTML(b)).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="sq-inpage-topbar">
      <div class="sq-inpage-title"><i class="fa-solid fa-book-open" style="color:var(--accent);"></i> تفاصيل الإصدار</div>
      <div style="display:flex; gap:6px;">
        <button class="sq-back-pill" onclick="window.sqCopyDirectBookLink('${book.id}')"><i class="fa-solid fa-share-nodes" style="color:var(--accent);"></i> مشاركة</button>
        <button class="sq-back-pill" onclick="window.sqSwitchMainView('store', true)"><i class="fa-solid fa-arrow-left"></i> المتجر</button>
      </div>
    </div>

    ${staffControlBar}

    <!-- البطاقة الرئيسية للكتاب بهوية الموقع المتجانسة (الغلاف في الزاوية + البيانات المقابلة) -->
    <div class="sq-book-clean-card">
      <div class="sq-book-top-split">
        <!-- غلاف الكتاب في الزاوية -->
        <img src="${escapeHtml(book.cover || APP_LOGO_URL)}" class="sq-book-corner-cover" onclick="window.sqOpenLightbox('${escapeHtml(book.cover || APP_LOGO_URL)}')" alt="${escapeHtml(book.title)}">

        <!-- البيانات المقابلة للغلاف -->
        <div class="sq-book-side-meta">
          <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
            ${catsBadgesHtml}
            <span class="sq-status-pill" style="margin:0; color:${availObj.color};"><i class="fa-solid ${availObj.icon}"></i> ${availObj.text}</span>
          </div>

          <h1 style="font-size:18.5px; font-weight:900; color:var(--text-main); line-height:1.35;">${escapeHtml(book.title)}</h1>

          <!-- المؤلف ودار النشر بحجم صغير وأنيق في سطر واحد جنباً إلى جنب -->
          <div class="sq-book-compact-entities">
            <div class="sq-entity-mini-chip" ${hasAuthorAccount ? `onclick="window.sqViewProfile('${book.authorUid}', 'books')"` : ''}>
              <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorDisplay)}">
              <span>${escapeHtml(authorDisplay)}</span>
              ${hasAuthorAccount ? `<span class="sq-vbadge author" title="كاتب معتمد"><i class="fa-solid fa-check"></i></span>` : ''}
            </div>

            <div class="sq-entity-mini-chip" ${hasPubProfile ? `onclick="window.sqViewProfile('${book.publisherUid}', 'books')"` : `onclick="window.sqSwitchMainView('publishers_directory')"`}>
              <img src="${escapeHtml(pubAvatar)}" style="border-radius:5px;" alt="${escapeHtml(pubDisplay)}">
              <span>${escapeHtml(pubDisplay)}</span>
              ${isMainDarPub
                ? `<span class="sq-vbadge admin" title="الدار الرسمية"><i class="fa-solid fa-check"></i></span>`
                : `<span class="sq-vbadge publisher" title="دار نشر معتمدة"><i class="fa-solid fa-check"></i></span>`
              }
            </div>
          </div>

          <!-- شريط الإحصائيات المختصر -->
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px; color:var(--text-muted); font-weight:800; padding-top:2px;">
            <span style="color:#d97706;"><i class="fa-solid fa-star" style="color:#fbbf24;"></i> ${st.avgRating} (${st.ratingsCount})</span>
            <span>•</span>
            <span><i class="fa-solid fa-book-open-reader" style="color:var(--accent);"></i> ${st.readersCount} قارئ</span>
            <span>•</span>
            <span><i class="fa-regular fa-eye"></i> ${book.views || 1} زيارة</span>
          </div>

          <!-- صندوق التسعير الذكي بالعملات الثلاث (SAR / USD / EGP) -->
          <div class="sq-book-price-box">
            <div>
              ${pInfo.current > 0 ? `
                <div style="display:flex; align-items:baseline; gap:6px;">
                  <strong style="font-size:18px; font-weight:900; color:var(--text-main);">${pInfo.current} ${escapeHtml(pInfo.symbol)}</strong>${pInfo.old > pInfo.current ? `<span style="font-size:12px; color:var(--danger); text-decoration:line-through; font-weight:700;">${pInfo.old} ${escapeHtml(pInfo.symbol)}</span>` : ''}
                </div>
                <div style="font-size:10.5px; color:var(--text-muted); font-weight:700;">
                  يعادل تقريباً: ${pSAR.current} ر.س \vert{} ${pUSD.current} $\vert{}${pEGP.current} ج.م
                </div>
              ` : `
                <strong style="font-size:15px; font-weight:900; color:var(--success);"><i class="fa-solid fa-gift"></i> متاح مجاناً للقراء</strong>
              `}
            </div>
            <select class="sq-compact-select" style="font-size:11px; padding:4px 8px;" onchange="window.sqSetDisplayCurrency(this.value)">
              <option value="SAR" ${AppState.displayCurrency === 'SAR' ? 'selected' : ''}>ر.س (SAR)</option>
              <option value="USD" ${AppState.displayCurrency === 'USD' ? 'selected' : ''}>$ (USD)</option>
              <option value="EGP" ${AppState.displayCurrency === 'EGP' ? 'selected' : ''}>ج.م (EGP)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- أزرار الإجراءات المتكاملة (طلب ورقي + قراءة آمنة داخل الموقع + تحميل في الخلفية) -->
      <div style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--border); display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${canOrderPaper ? `
            <button class="sq-btn sq-btn-gold" style="flex:2; min-width:170px; padding:11px 14px!important; font-size:13px!important;" onclick="window.sqAddToCart('${book.id}', 1, true)">
              <i class="fa-solid fa-bag-shopping"></i> اطلب النسخة الورقية الآن
            </button>
            <button class="sq-btn sq-btn-outline" style="flex:1; min-width:95px;" onclick="window.sqAddToCart('${book.id}', 1, false)">
              <i class="fa-solid fa-cart-plus" style="color:var(--accent);"></i> للسلة
            </button>
          ` : ''}

          ${canReadOnline ? `
            <button class="sq-btn" style="flex:2; min-width:170px; background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%)!important; color:#fff!important; padding:11px 14px!important; font-size:13px!important;" onclick="window.sqOpenBookReader('${book.id}')">
              <i class="fa-solid fa-book-open-reader"></i> قراءة داخل الموقع ${savedPageNum > 1 ? `(أكمل ص ${savedPageNum})` : '(قراءة آمنة)'}
            </button>
          ` : ''}

          ${canDirectDownload ? `
            <button class="sq-btn" style="flex:1.5; min-width:150px; background:linear-gradient(135deg,#10b981 0%,#059669 100%)!important; color:#fff!important; padding:11px 14px!important; font-size:13px!important;" onclick="window.sqRequestBookDownload('${book.id}')">
              <i class="fa-solid fa-cloud-arrow-down"></i> تحميل الكتاب (${st.downloadsCount || 0})
            </button>
          ` : ''}
        </div>

        ${AppState.showDownloadConfirmForBook ? `
          <div class="sq-dl-confirm-box">
            <div style="font-size:13px; font-weight:900; margin-bottom:8px;">
              <i class="fa-solid fa-circle-question" style="color:var(--accent);"></i> هل أنت متأكد من تحميل كتاب "${escapeHtml(book.title)}"؟
            </div>
            <div style="display:flex; gap:8px; justify-content:center;">
              <button class="sq-btn sq-btn-gold" style="padding:6px 16px!important; font-size:12px!important;" onclick="window.sqExecuteBookDownload('${book.id}')">
                <i class="fa-solid fa-check"></i> أنا متأكد (ابدأ التحميل في الخلفية)
              </button>
              <button class="sq-btn sq-btn-outline" style="padding:6px 12px!important; font-size:12px!important;" onclick="window.sqRequestBookDownload('${book.id}')">
                إلغاء
              </button>
            </div>
          </div>
        ` : ''}

        <!-- شريط رف القراءة وحفظ الكتاب في مكتبتي -->
        <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:space-between; align-items:center; padding-top:4px;">
          <div style="display:flex; gap:5px; flex-wrap:wrap;">
            <button class="sq-tab-pill ${isSavedInMyLib ? 'active' : ''}" onclick="window.sqToggleSaveBookToLibrary('${book.id}')">
              <i class="fa-solid ${isSavedInMyLib ? 'fa-check' : 'fa-bookmark'}" style="color:var(--accent);"></i> ${isSavedInMyLib ? 'محفوظ في مكتبتي' : 'حفظ بمكتبتي'}
            </button>
            <button class="sq-tab-pill ${myShelfState === 'reading' ? 'active' : ''}" onclick="window.sqSetReadingShelfStatus('${book.id}', 'reading')">
              <i class="fa-solid fa-book-open-reader" style="color:var(--author);"></i> أقرؤه حالياً
            </button>
            <button class="sq-tab-pill ${myShelfState === 'read' ? 'active' : ''}" onclick="window.sqSetReadingShelfStatus('${book.id}', 'read')">
              <i class="fa-solid fa-check-double" style="color:var(--success);"></i> قرأته
            </button>
          </div>
          ${book.externalUrl ? `<a href="${escapeHtml(book.externalUrl)}" target="_blank" class="sq-mini-action-btn" style="text-decoration:none;"><i class="fa-solid fa-arrow-up-right-from-square"></i> رابط خارجي</a>` : ''}
        </div>
      </div>
    </div>

    <!-- القوائم المنسدلة الأنيقة (Accordions): نبذة الكتاب + نبذة الكاتب + البطاقة الفهرسية -->
    <details class="sq-accordion-box" open>
      <summary><span><i class="fa-solid fa-align-right" style="color:var(--accent); margin-left:6px;"></i> نبذة عن الكتاب وملخص العمل</span></summary>
      <div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--border);">
        <p class="sq-book-desc-text" style="font-size:14px; line-height:1.85; color:var(--text-main); white-space:pre-wrap;">${escapeHtml(book.desc || `إصدار أدبي متوفر عبر ${pubDisplay}.`)}</p>
      </div>
    </details>

    ${(authorBioText || hasAuthorAccount) ? `
      <details class="sq-accordion-box">
        <summary><span><i class="fa-solid fa-feather-pointed" style="color:var(--author); margin-left:6px;"></i> نبذة عن الكاتب: ${escapeHtml(authorDisplay)}</span></summary>
        <div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--border); display:flex; flex-direction:column; gap:8px;">
          <p style="font-size:13.5px; line-height:1.8; color:var(--text-muted); white-space:pre-wrap;">${escapeHtml(authorBioText || `كاتب ومؤلف في منصة ${APP_NAME}.`)}</p>
          ${hasAuthorAccount ? `<div><button class="sq-btn sq-btn-outline" style="padding:5px 12px!important; font-size:11.5px!important;" onclick="window.sqViewProfile('${book.authorUid}', 'books')"><i class="fa-regular fa-user"></i> زيارة الصفحة الكاملة للكاتب ومؤلفاته</button></div>` : ''}
        </div>
      </details>
    ` : ''}

    <details class="sq-accordion-box">
      <summary><span><i class="fa-solid fa-circle-info" style="color:var(--accent); margin-left:6px;"></i> البطاقة الفهرسية وتفاصيل الطبعة</span></summary>
      <div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--border); display:flex; flex-wrap:wrap; gap:8px;">
        <span class="sq-status-pill"><i class="fa-solid fa-building-columns" style="color:var(--accent);"></i> الناشر: <strong>${escapeHtml(pubDisplay)}</strong></span>
        ${book.pages ? `<span class="sq-status-pill"><i class="fa-regular fa-file-lines" style="color:var(--accent);"></i> عدد الصفحات: <strong>${escapeHtml(book.pages)}</strong></span>` : ''}
        ${book.publishYear ? `<span class="sq-status-pill"><i class="fa-regular fa-calendar" style="color:var(--accent);"></i> سنة النشر: <strong>${escapeHtml(book.publishYear)}</strong></span>` : ''}
        ${book.isbn ? `<span class="sq-status-pill"><i class="fa-solid fa-barcode" style="color:var(--accent);"></i> ردمك ISBN: <strong>${escapeHtml(book.isbn)}</strong></span>` : ''}
      </div>
    </details>

    <!-- قسم التقييمات والمراجعات بالنجوم -->
    <div class="sq-hub-card">
      <h3 style="font-size:15.5px; font-weight:900; margin-bottom:10px;"><i class="fa-solid fa-star" style="color:#fbbf24;"></i> آراء القراء وتقييماتهم (${reviews.length})</h3>
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:15px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:800;">قيّم الكتاب بالنجوم:</span>
          <div class="sq-stars-interactive" id="sq-book-star-picker" data-stars="5">
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(1)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(2)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(3)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(4)"></i>
            <i class="fa-solid fa-star active" onclick="window.sqSelectBookStar(5)"></i>
          </div>
        </div>
        <textarea id="sq-book-review-in" class="sq-input" style="min-height:65px; resize:none; background:var(--card)!important;" placeholder="شاركنا رأيك في الكتاب..."></textarea>
        <button class="sq-btn" style="width:100%;" onclick="window.sqSubmitBookReview('${book.id}')"><i class="fa-solid fa-check"></i> إضافة التقييم والمراجعة</button>
      </div>
      <div>${reviewsHtml}</div>
    </div>

    <!-- قسم المنشورات والاقتباسات المرتبطة بالكتاب في المجتمع -->
    <div class="sq-hub-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:15.5px; font-weight:900;"><i class="fa-solid fa-quote-right" style="color:var(--accent);"></i> اقتباسات ومراجعات القراء في المجتمع (${relatedPosts.length})</h3>
        <button class="sq-btn sq-btn-gold" style="padding:5px 12px!important; font-size:11.5px!important;" onclick="window.sqStartPostForBook('${book.id}')"><i class="fa-solid fa-feather-pointed"></i> انشر اقتباساً</button>
      </div>
      <div>
        ${relatedPosts.length ? relatedPosts.map(p => window.sqBuildSinglePostHTML(p, false)).join('') : `<p style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px;">لم ينشر القراء اقتباسات مرتبطة بهذا الكتاب بعد. كن أول من يقتبس منه!</p>`}
      </div>
    </div>

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
  if (!AppState.currentUser) { sqShowToast("سجل دخولك الأول عشان تقيّم الكتاب", "warning"); return window.sqLogin(); }
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
    sqShowToast("تسلم إيدك! تم حفظ تقييمك للكتاب بنجاح", "success");
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
  if (!AppState.currentUser) { sqShowToast("سجل دخولك الأول يا بطل", "warning"); return window.sqLogin(); }
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
    description: (book.desc || 'تصفح الكتاب واطلب نسختك أو اقرأه الآن عبر المتجر').substring(0, 180),
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
// 🛠️ استوديو رفع وتعديل الكتب الذكي (كاشف التشابه + تعدد الفئات + 3 عملات + خيارات الإتاحة)
// =========================================================
window.sqOpenBookStudio = function(bookId = null) {
  if (!window.sqHasPermission('manage_books')) {
    return sqShowToast("رفع وتعديل الكتب متاح فقط للإدارة ودور النشر والموظفين المفوضين", "danger");
  }
  AppState.editingBookId = bookId;
  const book = bookId ? AppState.booksList.find(b => b.id === bookId) : null;
  AppState.pendingBookCover = book ? (book.cover || '') : '';
  AppState.selectedAuthorUidForBook = book ? (book.authorUid || '') : '';
  AppState.selectedBookCategories = (book && Array.isArray(book.categories) && book.categories.length)
    ? [...book.categories]
    : (book && book.category ? [book.category] : ['novels']);

  if (book && book.publisherUid) {
    AppState.selectedPublisherUidForBook = book.publisherUid;
  } else if (AppState.userData && AppState.userData.isPublisher && !AppState.isAdmin) {
    AppState.selectedPublisherUidForBook = AppState.currentUser.uid;
  } else {
    AppState.selectedPublisherUidForBook = 'DAR_MAIN';
  }

  document.getElementById('sq-book-studio-title').innerHTML = book
    ? `<i class="fa-solid fa-pen-to-square" style="color:var(--accent);"></i> تعديل كتاب: ${escapeHtml(book.title)}`
    : `<i class="fa-solid fa-book-medical" style="color:var(--accent);"></i> رفع كتاب جديد (مرونة شاملة)`;

  const mergedCats = window.sqGetMergedBookCategories();
  const multiCatsChipsHtml = Object.keys(mergedCats).map(k => {
    const isSel = AppState.selectedBookCategories.includes(k);
    return `<button type="button" id="bkcat-chip-${k}" class="sq-tab-pill ${isSel ? 'active' : ''}" onclick="window.sqToggleBookCategorySelection('${k}')"><i class="fa-solid ${mergedCats[k].icon || 'fa-tag'}"></i> ${escapeHtml(mergedCats[k].label)}</button>`;
  }).join('');

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
      <i class="fa-solid fa-circle-check" style="color:var(--accent);"></i> <strong>الرفع المرن:</strong> الحقل الإلزامي الوحيد هو <strong>(عنوان الكتاب)</strong>، ويمكنك اختيار عدة تصنيفات وتسعيره بالعملات الثلاث أو إتاحته للقراءة والتحميل!
    </div>

    <!-- تنبيه التشابه الذكي للكتب والمؤلفين -->
    <div id="bk-similarity-alert" style="display:none; background:rgba(245,158,11,0.14); border:1.5px solid var(--warning); color:var(--text-main); padding:10px 12px; border-radius:13px; font-size:12px; font-weight:800; margin-bottom:12px;"></div>

    <div class="sq-upload-zone" style="margin-bottom:14px;">
      <label for="sq-studio-cover-in" style="cursor:pointer; display:block;">
        <img id="sq-studio-cover-prev" src="${escapeHtml(AppState.pendingBookCover || APP_LOGO_URL)}" style="width:92px; height:134px; object-fit:cover; border-radius:10px; border:2px solid var(--accent); margin:0 auto 8px auto; display:block;">
        <div id="sq-book-cover-status" style="font-size:12px; font-weight:800; color:var(--text-main);"><i class="fa-solid fa-camera" style="color:var(--accent);"></i> اضغط لرفع صورة غلاف الكتاب (اختياري)</div>
      </label>
      <input type="file" id="sq-studio-cover-in" accept="image/*" style="display:none;" onchange="window.sqHandleBookCoverUpload(this)">
    </div>

    <label class="sq-field-label"><i class="fa-solid fa-book"></i> عنوان الكتاب أو الرواية (الحقل الوحيد الإلزامي *):</label>
    <input type="text" id="bk-in-title" class="sq-input" value="${escapeHtml(book ? book.title : '')}" placeholder="اكتب عنوان الكتاب هنا..." oninput="window.sqCheckBookDuplicateAndAuthorMatch()">

    <!-- اختيار عدة تصنيفات وفئات للكتاب نفسه -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:15px; padding:12px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <label class="sq-field-label" style="margin:0;"><i class="fa-solid fa-layer-group"></i> تصنيفات وفئات الكتاب (يمكنك تحديد أكثر من فئة):</label>
        <button type="button" class="sq-mini-action-btn" onclick="window.sqAddNewBookCategoryPrompt()"><i class="fa-solid fa-folder-plus"></i> + فئة جديدة</button>
      </div>
      <div id="bk-multi-cats-box" style="display:flex; flex-wrap:wrap; gap:6px;">${multiCatsChipsHtml}</div>
    </div>

    <!-- الترابط الشبكي: دار النشر والمؤلف -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:15px; padding:12px; margin-bottom:12px;">
      <h4 style="font-size:13px; font-weight:900; margin-bottom:8px; color:var(--text-main);"><i class="fa-solid fa-diagram-project" style="color:var(--accent);"></i> الترابط الشبكي (دار النشر والمؤلف)</h4>

      <label class="sq-field-label"><i class="fa-solid fa-building-columns"></i> دار النشر التابع لها هذا الكتاب:</label>
      <select id="bk-in-pub-uid" class="sq-select" onchange="AppState.selectedPublisherUidForBook = this.value">${pubOptionsHtml}</select>

      <label class="sq-field-label"><i class="fa-solid fa-feather-pointed"></i> اسم المؤلف الظاهر على الكتاب (اختياري):</label>
      <input type="text" id="bk-in-author-name" class="sq-input" value="${escapeHtml(book ? (book.authorName || '') : '')}" placeholder="اكتب اسم الكاتب..." oninput="window.sqCheckBookDuplicateAndAuthorMatch()">

      <label class="sq-field-label"><i class="fa-solid fa-user-check"></i> ربط بحساب الكاتب في المنصة (ليظهر الكتاب في ملفه وضمن كُتّاب الدار):</label>
      <div id="bk-linked-author-pill" style="background:var(--card); border:1px solid var(--accent-border); padding:7px 11px; border-radius:11px; font-size:11.5px; font-weight:800; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span id="bk-linked-author-text">${escapeHtml(linkedAuthorLabel)}</span>
        <button type="button" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:bold; font-size:11px;" onclick="window.sqSelectBookAuthorUid('', '')">إلغاء الربط</button>
      </div>
      <input type="text" id="bk-author-search-in" class="sq-input" style="margin-bottom:6px!important;" placeholder="ابحث عن حساب الكاتب بالاسم أو معرف SKID لربطه..." oninput="window.sqFilterAuthorAccountsForBook(this.value)">
      <div id="bk-author-search-results" style="max-height:140px; overflow-y:auto; display:flex; flex-direction:column; gap:5px;"></div>
    </div>

    <!-- نظام التسعير العالمي بالعملات الثلاث (SAR / USD / EGP) والخصومات -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:15px; padding:12px; margin-bottom:12px;">
      <h4 style="font-size:13px; font-weight:900; margin-bottom:6px; color:var(--text-main);"><i class="fa-solid fa-coins" style="color:var(--accent);"></i> التسعير بالعملات الثلاث والخصومات (اختياري — اتركه فارغاً للمجاني)</h4>
      <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">يمكنك كتابة السعر بالريال السعودي فقط وسيقوم النظام بحساب الدولار والجنيه تلقائياً، أو تخصيص كل عملة بنفسك:</p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label class="sq-field-label">السعر بالريال السعودي (ر.س):</label>
          <input type="number" step="0.01" id="bk-in-price-sar" class="sq-input" value="${book && (book.priceSAR !== undefined ? book.priceSAR : book.price) ? (book.priceSAR !== undefined ? book.priceSAR : book.price) : ''}" placeholder="0 = مجاني">
        </div>
        <div>
          <label class="sq-field-label">قبل الخصم بالريال (اختياري):</label>
          <input type="number" step="0.01" id="bk-in-old-sar" class="sq-input" value="${book && (book.oldPriceSAR || book.oldPrice) ? (book.oldPriceSAR || book.oldPrice) : ''}" placeholder="سعر سابق">
        </div>
        <div>
          <label class="sq-field-label">السعر بالدولار ($) — اختياري:</label>
          <input type="number" step="0.01" id="bk-in-price-usd" class="sq-input" value="${book && book.priceUSD ? book.priceUSD : ''}" placeholder="يُحسب تلقائياً إن تُرك فارغاً">
        </div>
        <div>
          <label class="sq-field-label">السعر بالجنيه المصري (ج.م) — اختياري:</label>
          <input type="number" step="1" id="bk-in-price-egp" class="sq-input" value="${book && book.priceEGP ? book.priceEGP : ''}" placeholder="يُحسب تلقائياً إن تُرك فارغاً">
        </div>
      </div>

      <label class="sq-field-label" style="margin-top:4px;"><i class="fa-brands fa-google-drive"></i> رابط ملف الكتاب على Google Drive أو PDF (للقراءة الآمنة أو التحميل):</label>
      <input type="url" id="bk-in-dlurl" class="sq-input" value="${escapeHtml(book && book.downloadUrl ? book.downloadUrl : '')}" placeholder="الصق رابط المشاركة من Google Drive أو رابط PDF مباشر...">

      <!-- خيارات الإتاحة المرنة (تظهر للإدارة والناشر للجمع بين الورقي والرقمي والقراءة الآمنة) -->
      <div style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:10px; margin-top:6px;">
        <div style="font-size:11.5px; font-weight:900; margin-bottom:6px; color:var(--text-main);"><i class="fa-solid fa-sliders" style="color:var(--accent);"></i> صلاحيات إتاحة الكتاب للقراء (يمكن تفعيلها معاً):</div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <label style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:800; cursor:pointer;">
            <input type="checkbox" id="bk-in-allow-paper" ${!book || book.allowPaperOrder !== false ? 'checked' : ''} style="width:16px; height:16px;"> متاح للطلب الورقي والشحن
          </label>
          <label style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:800; cursor:pointer;">
            <input type="checkbox" id="bk-in-allow-read" ${!book || book.allowOnlineRead !== false ? 'checked' : ''} style="width:16px; height:16px;"> متاح للقراءة الآمنة داخل الموقع
          </label>
          <label style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:800; cursor:pointer;">
            <input type="checkbox" id="bk-in-allow-dl" ${!book || book.allowDirectDownload !== false ? 'checked' : ''} style="width:16px; height:16px;"> مسموح بتحميل الملف في الخلفية
          </label>
        </div>
      </div>

      <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:8px;">
        <label style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:800; cursor:pointer;">
          <input type="checkbox" id="bk-in-offer" ${book && book.isOffer ? 'checked' : ''} style="width:16px; height:16px;"> تمييز كـ (عرض خاص)
        </label>
        <label style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:800; cursor:pointer;">
          <input type="checkbox" id="bk-in-bestseller" ${book && book.isBestSeller ? 'checked' : ''} style="width:16px; height:16px;"> تمييز كـ (الأكثر رواجاً)
        </label>
        <label style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:800; cursor:pointer;">
          <input type="checkbox" id="bk-in-featured" ${book && book.isFeatured ? 'checked' : ''} style="width:16px; height:16px;"> تمييز في صدارة المختارات
        </label>
      </div>
    </div>

    <label class="sq-field-label"><i class="fa-solid fa-align-right"></i> نبذة وملخص الكتاب (اختياري):</label>
    <textarea id="bk-in-desc" class="sq-input" style="min-height:95px; resize:vertical;" placeholder="اكتب وصفاً أو ملخصاً للكتاب...">${escapeHtml(book ? (book.desc || '') : '')}</textarea>

    <details class="sq-accordion-box" style="margin-bottom:14px;">
      <summary><span><i class="fa-solid fa-sliders" style="color:var(--accent); margin-left:6px;"></i> بيانات فهرسية إضافية ونبذة الكاتب (الصفحات، سنة النشر، ISBN) — اختياري</span></summary>
      <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label class="sq-field-label">حالة التوفر:</label>
          <select id="bk-in-avail" class="sq-select">
            <option value="available" ${!book || book.availability === 'available' ? 'selected' : ''}>متوفر للطلب والشحن</option>
            <option value="digital" ${book && book.availability === 'digital' ? 'selected' : ''}>نسخة رقمية</option>
            <option value="soon" ${book && book.availability === 'soon' ? 'selected' : ''}>قريباً</option>
            <option value="out" ${book && book.availability === 'out' ? 'selected' : ''}>نفدت النسخ الورقية</option>
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
      <textarea id="bk-in-author-bio" class="sq-input" style="margin-top:8px!important; min-height:60px;" placeholder="نبذة مختصرة عن الكاتب (اختياري — تظهر في القائمة المنسدلة بصفحة الكتاب)...">${escapeHtml(book ? (book.authorBio || '') : '')}</textarea>
      <input type="url" id="bk-in-exturl" class="sq-input" style="margin-top:4px!important;" value="${escapeHtml(book ? (book.externalUrl || '') : '')}" placeholder="رابط خارجي إضافي (مثل Google Play Books) — اختياري">
    </details>

    <button class="sq-btn sq-btn-gold" id="sq-save-book-btn" style="width:100%; padding:12px!important; font-size:14px!important;" onclick="window.sqSaveBookFromStudio()">
      <i class="fa-solid fa-floppy-disk"></i> ${book ? 'حفظ كافة التعديلات على الكتاب' : 'نشر وإضافة الكتاب في المتجر الآن'}
    </button>
  `;

  window.sqSwitchMainView('publish_book');
};

// التبديل المتعدد لتصنيفات وفئات الكتاب
window.sqToggleBookCategorySelection = function(catKey) {
  const idx = AppState.selectedBookCategories.indexOf(catKey);
  if (idx >= 0) {
    if (AppState.selectedBookCategories.length > 1) {
      AppState.selectedBookCategories.splice(idx, 1);
    } else {
      return sqShowToast("يجب بقاء فئة واحدة على الأقل محددة للكتاب", "warning");
    }
  } else {
    AppState.selectedBookCategories.push(catKey);
  }
  const chip = document.getElementById('bkcat-chip-' + catKey);
  if (chip) chip.classList.toggle('active', AppState.selectedBookCategories.includes(catKey));
};

// كاشف التشابه التلقائي بين عنوان الكتاب واسم الكاتب أو الكتب الموجودة مسبقاً
window.sqCheckBookDuplicateAndAuthorMatch = function() {
  const alertBox = document.getElementById('bk-similarity-alert');
  if (!alertBox) return;
  const titleVal = (document.getElementById('bk-in-title')?.value || '').trim();
  const authorVal = (document.getElementById('bk-in-author-name')?.value || '').trim();

  const warnings = [];

  // 1. فحص إذا كان عنوان الكتاب يطابق اسم الكاتب بالخطأ
  if (titleVal.length >= 3 && authorVal.length >= 3 && titleVal.toLowerCase() === authorVal.toLowerCase()) {
    warnings.push(`⚠️ تنبيه ذكي: عنوان الكتاب "${escapeHtml(titleVal)}" مطابق تماماً لاسم المؤلف! تأكد من عدم كتابة اسم المؤلف في خانة العنوان.`);
  }

  // 2. فحص إذا كان هناك كتاب بنفس العنوان مرفوع مسبقاً في المتجر
  if (titleVal.length >= 3) {
    const similarExisting = AppState.booksList.filter(b => b.id !== AppState.editingBookId && (b.title || '').trim().toLowerCase() === titleVal.toLowerCase());
    if (similarExisting.length > 0) {
      const ex = similarExisting[0];
      warnings.push(`⚠️ تنبيه تشابه: يوجد كتاب مرفوع مسبقاً في المتجر بنفس العنوان "${escapeHtml(ex.title)}" (للمؤلف: ${escapeHtml(ex.authorName || 'غير محدد')}).`);
    }
  }

  if (warnings.length > 0) {
    alertBox.style.display = 'block';
    alertBox.innerHTML = warnings.join('<br>');
  } else {
    alertBox.style.display = 'none';
    alertBox.innerHTML = '';
  }
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
          <img src="${getRealPhoto(uid, u.photoURL)}" style="width:26px; height:26px; border-radius:50%; object-fit:cover;">
          <span style="font-size:12px; font-weight:800;">${escapeHtml(name)} <small style="color:var(--text-muted);">(${skid})</small></span>
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
  window.sqCheckBookDuplicateAndAuthorMatch();
};

window.sqAddNewBookCategoryPrompt = function() {
  window.sqOpenCustomPrompt("اكتب اسم الفئة أو القسم الجديد لإضافته إلى المتجر:", "", (catName) => {
    if (!catName || catName.length < 2) return;
    const catKey = 'cat_' + Date.now();
    const updatedCustom = { ...(AppState.customBookCategories || {}), [catKey]: { label: catName, icon: 'fa-tag' } };
    AppState.customBookCategories = updatedCustom;
    AppState.selectedBookCategories.push(catKey);
    db.collection("safaqat_settings").doc("general").set({ customBookCategories: updatedCustom }, { merge: true }).then(() => {
      const box = document.getElementById('bk-multi-cats-box');
      if (box) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'bkcat-chip-' + catKey;
        btn.className = 'sq-tab-pill active';
        btn.onclick = () => window.sqToggleBookCategorySelection(catKey);
        btn.innerHTML = `<i class="fa-solid fa-tag"></i> ${escapeHtml(catName)}`;
        box.appendChild(btn);
      }
      sqShowToast(`تم إنشاء فئة "${catName}" وتحديدها!`, "success");
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

  const cats = (Array.isArray(AppState.selectedBookCategories) && AppState.selectedBookCategories.length)
    ? AppState.selectedBookCategories
    : ['novels'];

  const priceSAR = parseFloat(document.getElementById('bk-in-price-sar')?.value) || 0;
  const oldPriceSAR = parseFloat(document.getElementById('bk-in-old-sar')?.value) || 0;
  const priceUSD = parseFloat(document.getElementById('bk-in-price-usd')?.value) || 0;
  const priceEGP = parseFloat(document.getElementById('bk-in-price-egp')?.value) || 0;

  const payload = {
    title: title,
    cover: AppState.pendingBookCover || APP_LOGO_URL,
    category: cats[0],
    categories: cats,
    authorName: authorName,
    authorUid: authorUid,
    authorBio: (document.getElementById('bk-in-author-bio')?.value || '').trim(),
    publisherUid: pubUid,
    publisherName: publisherName,
    price: priceSAR,
    oldPrice: oldPriceSAR,
    priceSAR: priceSAR,
    oldPriceSAR: oldPriceSAR,
    priceUSD: priceUSD,
    priceEGP: priceEGP,
    currency: 'ر.س',
    downloadUrl: (document.getElementById('bk-in-dlurl')?.value || '').trim(),
    allowPaperOrder: Boolean(document.getElementById('bk-in-allow-paper')?.checked),
    allowOnlineRead: Boolean(document.getElementById('bk-in-allow-read')?.checked),
    allowDirectDownload: Boolean(document.getElementById('bk-in-allow-dl')?.checked),
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
  if (!AppState.currentUser) { sqShowToast("سجل دخولك الأول للمشاركة", "warning"); return window.sqLogin(); }
  const book = AppState.booksList.find(b => b.id === bookId); if (!book) return;
  window.sqOpenPublishModal(null, book);
};

// =========================================================
// 🛒 محرك السلة، الفواتير (SK-XXXXXX)، الاسم الحقيقي الإلزامي، وإخلاء المسؤولية
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
  if (book.availability === 'out') return sqShowToast("نفدت النسخ الورقية لهذا الكتاب حالياً", "danger");

  window.SafaqatAI.trackSignal('book', book, 5);
  const pSAR = window.sqFormatBookPrice(book, 'SAR');
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
      priceSAR: pSAR.current,
      priceUSD: book.priceUSD || 0,
      priceEGP: book.priceEGP || 0,
      price: pSAR.current,
      currency: 'ر.س',
      qty: Math.max(1, qty)
    });
  }
  AppState.lastIssuedOrder = null;
  window.sqSaveCartToStorage();
  sqShowToast(`تمت إضافة "${book.title}" إلى سلتك!`, "success");
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
  const dispCurr = AppState.displayCurrency || 'SAR';
  const currSymbol = (CURRENCY_CONFIG[dispCurr] && CURRENCY_CONFIG[dispCurr].symbol) || 'ر.س';

  let totalInDisp = 0;
  let totalInSAR = 0;
  cartItems.forEach(item => {
    const bObj = AppState.booksList.find(b => b.id === item.bookId) || item;
    const pDisp = window.sqFormatBookPrice(bObj, dispCurr);
    const pSar = window.sqFormatBookPrice(bObj, 'SAR');
    totalInDisp += (pDisp.current * (Number(item.qty) || 1));
    totalInSAR += (pSar.current * (Number(item.qty) || 1));
  });
  totalInDisp = Number(totalInDisp.toFixed(dispCurr === 'USD' ? 2 : 0));
  totalInSAR = Number(totalInSAR.toFixed(2));

  let issuedInvoiceBanner = '';
  if (AppState.lastIssuedOrder) {
    const ord = AppState.lastIssuedOrder;
    issuedInvoiceBanner = `
      <div class="sq-hub-card" style="background:linear-gradient(135deg,#064e3b 0%,#022c22 100%); color:#fff; border:2px solid #fbbf24;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="background:#fbbf24; color:#0f172a; font-size:11.5px; font-weight:900; padding:3px 10px; border-radius:12px;"><i class="fa-solid fa-file-circle-check"></i> تم إصدار الفاتورة بنجاح</span>
          <strong style="font-size:15px; color:#fbbf24; letter-spacing:1px;">#${escapeHtml(ord.orderCode)}</strong>
        </div>
        <p style="font-size:13px; line-height:1.75; color:#ecfdf5; margin-bottom:12px;">
          تم توثيق فاتورتك برقم <strong>(${escapeHtml(ord.orderCode)})</strong> باسم المستلم <strong>(${escapeHtml(ord.buyerName)})</strong>. اضغط الزر أدناه لإرسال الفاتورة فوراً إلى واتساب الدار:
        </p>
        <button class="sq-btn" style="width:100%; background:#25D366!important; color:#fff!important; padding:12px!important; font-size:14px!important;" onclick="window.sqSendOrderToWhatsApp('${escapeHtml(ord.orderCode)}')">
          <i class="fa-brands fa-whatsapp" style="font-size:18px;"></i> إرسال وتأكيد الفاتورة عبر واتساب الآن
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
    const itemsHtml = cartItems.map(item => {
      const bObj = AppState.booksList.find(b => b.id === item.bookId) || item;
      const pDisp = window.sqFormatBookPrice(bObj, dispCurr);
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:14px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px; overflow:hidden; cursor:pointer;" onclick="window.sqOpenBookDetail('${item.bookId}')">
            <img src="${escapeHtml(item.cover)}" style="width:44px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--accent); flex-shrink:0;">
            <div style="overflow:hidden;">
              <div style="font-weight:900; font-size:13px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.title)}</div>
              <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.authorName)} • ${escapeHtml(item.publisherName || APP_NAME)}</div>
              <div style="font-size:12px; font-weight:900; color:var(--accent); margin-top:2px;">${pDisp.current} ${escapeHtml(pDisp.symbol)}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
            <button class="sq-icon-btn" style="width:28px; height:28px; font-size:12px;" onclick="window.sqUpdateCartQty('${item.bookId}', -1)"><i class="fa-solid fa-minus"></i></button>
            <strong style="font-size:13px; min-width:20px; text-align:center;">${item.qty}</strong>
            <button class="sq-icon-btn" style="width:28px; height:28px; font-size:12px;" onclick="window.sqUpdateCartQty('${item.bookId}', 1)"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
      `;
    }).join('');

    const defCountry = (AppState.userData && AppState.userData.nationality && COUNTRIES_MAP[AppState.userData.nationality]) ? COUNTRIES_MAP[AppState.userData.nationality].name : '';

    // ملاحظة هامة: حقل الاسم الحقيقي فارغ عمداً ولا يسحب الاسم المستعار للحساب لضمان كتابة الاسم الحقيقي للشحن
    cartSectionHtml = `
      <div class="sq-hub-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:15.5px; font-weight:900;"><i class="fa-solid fa-cart-shopping" style="color:var(--accent);"></i> الكتب المختارة في سلتك (${cartItems.length})</h3>
          <button style="background:none; border:none; color:var(--danger); font-size:12px; font-weight:bold; cursor:pointer;" onclick="window.sqClearCart()"><i class="fa-solid fa-trash"></i> إفراغ السلة</button>
        </div>
        ${itemsHtml}
        <div style="display:flex; justify-content:space-between; align-items:center; padding:11px 14px; background:var(--bg); border-radius:14px; border:1.5px solid var(--accent-border); margin-top:10px;">
          <div>
            <span style="font-size:13.5px; font-weight:900;">إجمالي الفاتورة:</span>
            <select class="sq-compact-select" style="margin-right:6px; font-size:11px; padding:3px 7px;" onchange="window.sqSetDisplayCurrency(this.value)">
              <option value="SAR" ${dispCurr === 'SAR' ? 'selected' : ''}>ر.س (SAR)</option>
              <option value="USD" ${dispCurr === 'USD' ? 'selected' : ''}>$ (USD)</option>
              <option value="EGP" ${dispCurr === 'EGP' ? 'selected' : ''}>ج.م (EGP)</option>
            </select>
          </div>
          <strong style="font-size:17.5px; font-weight:900; color:var(--accent);">${totalInDisp} ${escapeHtml(currSymbol)}</strong>
        </div>
      </div>

      <div class="sq-hub-card">
        <h3 style="font-size:15.5px; font-weight:900; margin-bottom:4px;"><i class="fa-solid fa-file-invoice" style="color:var(--accent);"></i> بيانات الشحن وإصدار الفاتورة الرسمية</h3>
        <p style="font-size:11.5px; color:var(--text-muted); margin-bottom:12px;">يرجى إدخال بياناتك الحقيقية بدقة (لا يتم استخدام الاسم المستعار للحساب في فواتير الشحن):</p>

        <label class="sq-field-label"><i class="fa-solid fa-user-check"></i> الاسم الحقيقي الثلاثي أو الرباعي للمستلم (إلزامي *):</label>
        <input type="text" id="ord-in-name" class="sq-input" value="" placeholder="اكتب اسمك الحقيقي الكامل كما في الهوية لاستلام الشحنة...">

        <label class="sq-field-label"><i class="fa-solid fa-phone"></i> رقم الجوال / الواتساب الفعّال للتواصل (إلزامي *):</label>
        <input type="tel" id="ord-in-phone" class="sq-input" placeholder="مثال: +9665XXXXXXXX أو +201XXXXXXXXX">

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label class="sq-field-label"><i class="fa-solid fa-earth-americas"></i> الدولة (إلزامي *):</label>
            <input type="text" id="ord-in-country" class="sq-input" value="${escapeHtml(defCountry)}" placeholder="الدولة">
          </div>
          <div>
            <label class="sq-field-label"><i class="fa-solid fa-city"></i> المدينة / المحافظة (إلزامي *):</label>
            <input type="text" id="ord-in-city" class="sq-input" placeholder="اسم المدينة">
          </div>
        </div>

        <label class="sq-field-label"><i class="fa-solid fa-location-dot"></i> العنوان التفصيلي للاستلام (إلزامي *):</label>
        <input type="text" id="ord-in-address" class="sq-input" placeholder="الحي، الشارع، رقم المبنى أو أقرب معلم">

        <label class="sq-field-label"><i class="fa-solid fa-comment-dots"></i> ملاحظات إضافية (اختياري):</label>
        <textarea id="ord-in-notes" class="sq-input" style="min-height:60px; resize:none;" placeholder="أي ملاحظة تخص التوصيل..."></textarea>

        <!-- تنبيه وإقرار إخلاء المسؤولية عن صحة البيانات -->
        <div style="background:rgba(245,158,11,0.12); border:1.5px solid var(--warning); border-radius:14px; padding:11px 13px; margin-bottom:12px;">
          <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; font-size:12px; font-weight:800; line-height:1.65; color:var(--text-main);">
            <input type="checkbox" id="ord-in-disclaimer" style="width:18px; height:18px; margin-top:3px; flex-shrink:0;">
            <span>أقر بأن جميع البيانات المدخلة أعلاه (الاسم الحقيقي، رقم الهاتف، والعنوان) صحيحة وحقيقية، وأتحمل كامل المسؤولية عن أي خطأ فيها، ولا تتحمل منصة صفقات كتابية أو دار النشر أي مسؤولية ناتجة عن إدخال بيانات غير صحيحة.</span>
          </label>
        </div>

        <button class="sq-btn sq-btn-gold" id="sq-issue-invoice-btn" style="width:100%; padding:12px!important; font-size:14px!important;" onclick="window.sqIssueInvoiceNow()">
          <i class="fa-solid fa-file-signature"></i> تأكيد البيانات وإصدار الفاتورة الآن
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
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; padding:13px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
          <div>
            <strong style="font-size:14px; color:var(--text-main);">فاتورة رقم: #${escapeHtml(ord.orderCode)}</strong>
            <span style="font-size:11px; color:var(--text-muted); margin-right:6px;">${sqFormatRelativeTime(ord.createdAt)}</span>
          </div>
          <span class="sq-order-status-badge" style="background:${stObj.color}20; color:${stObj.color}; border:1px solid ${stObj.color}50;">
            <i class="fa-solid ${stObj.icon}"></i> ${stObj.label}
          </span>
        </div>
        <div style="font-size:12px; color:var(--text-main); font-weight:700; margin-bottom:4px;">الكتب: ${escapeHtml(booksSummary)}</div>
        <div style="font-size:11.5px; color:var(--text-muted);">الإجمالي: <strong style="color:var(--accent);">${ord.totalAmount} ${escapeHtml(ord.currency || 'ر.س')}</strong> • المستلم: ${escapeHtml(ord.buyerName)} (${escapeHtml(ord.country)} - ${escapeHtml(ord.city)})</div>
        ${window.sqRenderOrderStepper(ord.status || 'pending_review')}
        ${ord.adminNote ? `<div style="background:var(--card); border-right:3px solid var(--accent); padding:7px 10px; border-radius:8px; font-size:12px; margin-top:6px;"><strong>ملاحظة المبيعات:</strong> ${escapeHtml(ord.adminNote)}</div>` : ''}
        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
          <button class="sq-btn" style="background:#25D366!important; color:#fff!important; padding:6px 12px!important; font-size:11.5px!important;" onclick="window.sqSendOrderToWhatsApp('${escapeHtml(ord.orderCode)}')">
            <i class="fa-brands fa-whatsapp"></i> إرسال / متابعة عبر واتساب الدار
          </button>
        </div>
      </div>
    `;
  }).join('') : `<p style="text-align:center; padding:18px; color:var(--text-muted); font-size:12.5px;">لا توجد فواتير سابقة مسجلة في حسابك.</p>`;

  container.innerHTML = `
    <div class="sq-inpage-topbar">
      <div class="sq-inpage-title"><i class="fa-solid fa-bag-shopping" style="color:var(--accent);"></i> السلة والفواتير وتتبع الطلبات</div>
      <button class="sq-back-pill" onclick="window.sqSwitchMainView('store')"><i class="fa-solid fa-arrow-left"></i> المتجر</button>
    </div>
    ${issuedInvoiceBanner}
    ${cartSectionHtml}
    <div class="sq-hub-card">
      <h3 style="font-size:15.5px; font-weight:900; margin-bottom:10px;"><i class="fa-solid fa-truck-fast" style="color:var(--accent);"></i> سجل طلباتي وتتبع مراحل الشحن (${myOrders.length})</h3>
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
  const disclaimerChecked = Boolean(document.getElementById('ord-in-disclaimer')?.checked);

  if (buyerName.split(/\s+/).length < 2) {
    return sqShowToast("يرجى كتابة اسمك الحقيقي الكامل (الثلاثي أو الرباعي) وليس اسماً مفرداً أو مستعاراً", "warning");
  }
  if (!buyerPhone || !country || !city || !address) {
    return sqShowToast("يرجى تعبئة رقم الجوال، الدولة، المدينة، والعنوان التفصيلي بالكامل", "warning");
  }
  if (!disclaimerChecked) {
    return sqShowToast("يرجى الموافقة على إقرار صحة البيانات وإخلاء المسؤولية قبل إصدار الفاتورة", "warning");
  }

  const btn = document.getElementById('sq-issue-invoice-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري توثيق وإصدار الفاتورة...'; }

  const randomSix = Math.floor(100000 + Math.random() * 900000);
  const orderCode = `SK-${randomSix}`;
  const dispCurr = AppState.displayCurrency || 'SAR';
  const currSymbol = (CURRENCY_CONFIG[dispCurr] && CURRENCY_CONFIG[dispCurr].symbol) || 'ر.س';

  let totalDisp = 0;
  let totalSAR = 0;
  const enrichedItems = AppState.cart.map(item => {
    const bObj = AppState.booksList.find(b => b.id === item.bookId) || item;
    const pDisp = window.sqFormatBookPrice(bObj, dispCurr);
    const pSar = window.sqFormatBookPrice(bObj, 'SAR');
    const qty = Number(item.qty) || 1;
    totalDisp += (pDisp.current * qty);
    totalSAR += (pSar.current * qty);
    return {
      ...item,
      unitPriceDisplay: pDisp.current,
      unitPriceSAR: pSar.current,
      lineTotalSAR: Number((pSar.current * qty).toFixed(2)),
      currencySymbol: currSymbol
    };
  });

  const publisherUids = Array.from(new Set(enrichedItems.map(i => i.publisherUid || 'DAR_MAIN')));

  const orderPayload = {
    orderCode: orderCode,
    buyerUid: AppState.currentUser ? AppState.currentUser.uid : 'GUEST',
    buyerAccountAlias: AppState.currentUser ? getRealName(AppState.currentUser.uid, AppState.currentUser.displayName) : 'زائر',
    buyerName: buyerName, // الاسم الحقيقي للمستلم
    buyerPhone: buyerPhone,
    country: country,
    city: city,
    address: address,
    notes: notes,
    disclaimerAccepted: true,
    items: enrichedItems,
    publisherUids: publisherUids,
    totalAmount: Number(totalDisp.toFixed(dispCurr === 'USD' ? 2 : 0)),
    totalAmountSAR: Number(totalSAR.toFixed(2)),
    currency: currSymbol,
    currencyCode: dispCurr,
    status: 'pending_review',
    adminNote: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await db.collection("safaqat_orders").add(orderPayload);
    enrichedItems.forEach(item => {
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
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-signature"></i> تأكيد البيانات وإصدار الفاتورة الآن'; }
    sqShowToast("تعذر حفظ الفاتورة، يرجى التحقق من اتصال الإنترنت", "danger");
  }
};

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
  const booksLines = (ord.items || []).map((it, idx) => `${idx + 1}. ${it.title} — العدد: (${it.qty}) — السعر: ${it.unitPriceDisplay || it.price} ${ord.currency || 'ر.س'}`).join('\n');

  const msg = `مرحباً إدارة *${targetDarName}*، أود تأكيد فاتورة طلبي الرسمية عبر منصة *${APP_NAME}*:
*رقم الفاتورة:* #${ord.orderCode}
*الاسم الحقيقي للمستلم:* ${ord.buyerName}
*رقم الجوال للتواصل:* ${ord.buyerPhone}
*الدولة والمدينة:* ${ord.country} - ${ord.city}
*العنوان التفصيلي:* ${ord.address || 'غير محدد'}

*الإصدارات المطلوبة:*
${booksLines}

*إجمالي الفاتورة:* ${ord.totalAmount} ${ord.currency || 'ر.س'}
${ord.notes ? `*ملاحظات:* ${ord.notes}\n` : ''}
*(أقر بصحة بيانات الشحن أعلاه وعلى مسؤوليتي الشخصية)*`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
};
/* =========================================================
   المحرك البرمجي الشامل — الإصدار 1.8
   File: app.js (الجزء 3 من 5)
   يشمل: المشغل العائم للبودكاست، القصص المطورة (Stories 2.0)،
         استوديو النشر الأدبي والمجتمع، التعليقات المترابطة، وبطاقة الاقتباس
   ======================================================== */

// =========================================================
// 🎧 محرك المشغل الصوتي والعائم للبودكاست (Floating PiP Podcast Player)
// =========================================================
window.sqPlayPodcast = function(mediaUrl, title, author, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  if (!mediaUrl) return;

  const cleanUrl = String(mediaUrl).trim();
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);

  AppState.podcastActive = true;
  AppState.podcastTitle = title || 'بودكاست صفقات كتابية';
  AppState.podcastAuthor = author || APP_NAME;
  AppState.podcastPlaying = true;
  AppState.podcastExpanded = false;

  const bar = document.getElementById('sq-floating-podcast-bar');
  const tEl = document.getElementById('sq-pod-title');
  const aEl = document.getElementById('sq-pod-author');
  const playBtn = document.getElementById('sq-pod-play-btn');
  const mount = document.getElementById('sq-pod-iframe-mount');
  const audioEl = document.getElementById('sq-pod-audio-el');

  if (tEl) tEl.innerText = AppState.podcastTitle;
  if (aEl) aEl.innerText = AppState.podcastAuthor;
  if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  if (bar) bar.style.display = 'flex';

  if (ytMatch) {
    AppState.podcastType = 'youtube';
    AppState.podcastMediaId = ytMatch[1];
    if (audioEl) audioEl.style.display = 'none';
    if (mount) {
      mount.style.display = 'block';
      mount.innerHTML = `<iframe src="https://www.youtube.com/embed/${AppState.podcastMediaId}?autoplay=1&playsinline=1" style="width:100%; height:180px; border:none; border-radius:12px;" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
  } else {
    AppState.podcastType = 'audio';
    AppState.podcastMediaId = cleanUrl;
    if (mount) { mount.style.display = 'none'; mount.innerHTML = ''; }
    if (audioEl) {
      audioEl.style.display = 'block';
      audioEl.src = cleanUrl;
      audioEl.play().catch(() => {});
    }
  }
  sqShowToast("بدأ تشغيل الصوت/البودكاست في المشغل العائم بالخلفية!", "success");
};

window.sqTogglePodcastExpand = function() {
  AppState.podcastExpanded = !AppState.podcastExpanded;
  const drawer = document.getElementById('sq-pod-media-drawer');
  if (drawer) drawer.classList.toggle('expanded', AppState.podcastExpanded);
};

window.sqTogglePodcastPlayPause = function() {
  AppState.podcastPlaying = !AppState.podcastPlaying;
  const playBtn = document.getElementById('sq-pod-play-btn');
  if (playBtn) playBtn.innerHTML = AppState.podcastPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';

  if (AppState.podcastType === 'audio') {
    const audioEl = document.getElementById('sq-pod-audio-el');
    if (audioEl) {
      if (AppState.podcastPlaying) audioEl.play().catch(() => {});
      else audioEl.pause();
    }
  } else {
    sqShowToast(AppState.podcastPlaying ? "استئناف التشغيل" : "إيقاف مؤقت", "warning");
  }
};

window.sqClosePodcastPlayer = function() {
  AppState.podcastActive = false;
  AppState.podcastPlaying = false;
  const bar = document.getElementById('sq-floating-podcast-bar');
  if (bar) bar.style.display = 'none';
  const mount = document.getElementById('sq-pod-iframe-mount');
  if (mount) mount.innerHTML = '';
  const audioEl = document.getElementById('sq-pod-audio-el');
  if (audioEl) { audioEl.pause(); audioEl.src = ''; }
};

// =========================================================
// ⚡ محرك القصص المطور (Stories 2.0)
// =========================================================
window.sqUserHasActiveStory = function(uid) {
  return Boolean(uid && AppState.groupedStories[uid] && AppState.groupedStories[uid].length > 0);
};

window.sqListenStories = function() {
  if (AppState.storiesUnsubscribe) AppState.storiesUnsubscribe();
  AppState.storiesUnsubscribe = db.collection("safaqat_stories").orderBy("time", "asc").limit(50).onSnapshot(snap => {
    const now = Date.now();
    AppState.storiesList = [];
    AppState.groupedStories = {};
    snap.forEach(doc => {
      const d = doc.data();
      if (d.expiresAt && now > d.expiresAt) {
        if (AppState.isAdmin || (AppState.currentUser && d.uid === AppState.currentUser.uid)) {
          db.collection("safaqat_stories").doc(doc.id).delete().catch(() => {});
        }
      } else {
        const stObj = { id: doc.id, ...d };
        AppState.storiesList.push(stObj);
        if (!AppState.groupedStories[d.uid]) AppState.groupedStories[d.uid] = [];
        AppState.groupedStories[d.uid].push(stObj);
      }
    });
    window.sqRenderStoriesBar();
  }, err => {});
};

window.sqRenderStoriesBar = function() {
  const bar = document.getElementById('sq-stories-bar');
  if (!bar) return;
  const myUid = AppState.currentUser ? AppState.currentUser.uid : null;
  const myBlocked = (AppState.userData && AppState.userData.blockedUsers) ? AppState.userData.blockedUsers : [];
  const myFollowing = (AppState.userData && AppState.userData.following) ? AppState.userData.following : [];

  const visibleStoryUids = Object.keys(AppState.groupedStories).filter(uid => {
    if (myBlocked.includes(uid)) return false;
    const userStories = AppState.groupedStories[uid] || [];
    const isAdm = sqIsAdminUid(uid) || userStories.some(s => s.isAdminStory);
    if (isAdm) return true;
    if (myUid && uid === myUid) return true;
    if (myUid && myFollowing.includes(uid)) return true;
    return false;
  });

  visibleStoryUids.sort((a, b) => {
    if (a === myUid) return -1;
    if (b === myUid) return 1;
    const aAdm = sqIsAdminUid(a) || (AppState.groupedStories[a] || []).some(s => s.isAdminStory);
    const bAdm = sqIsAdminUid(b) || (AppState.groupedStories[b] || []).some(s => s.isAdminStory);
    if (aAdm && !bAdm) return -1;
    if (!aAdm && bAdm) return 1;
    return 0;
  });

  let html = `
    <div class="sq-story-item" onclick="window.sqOpenStoryModal()">
      <div class="sq-story-ring add-ring">
        <div style="width:100%; height:100%; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--accent); font-size:19px;"><i class="fa-solid fa-plus"></i></div>
      </div>
      <span class="sq-story-name">نزّل قصتك</span>
    </div>
  `;

  visibleStoryUids.forEach(uid => {
    const userStories = AppState.groupedStories[uid];
    const latest = userStories[userStories.length - 1];
    const isAdm = sqIsAdminUid(uid) || userStories.some(s => s.isAdminStory);
    const authorName = escapeHtml(uid === myUid ? 'قصتي' : getRealName(uid, latest.authorName));
    const avatar = getRealPhoto(uid, latest.authorPhoto);
    html += `
      <div class="sq-story-item" onclick="window.sqOpenUserStories('${uid}', 0)">
        <div class="sq-story-ring ${isAdm ? 'admin-ring' : ''}">
          <img src="${avatar}" loading="lazy">
          ${isAdm ? `<span class="sq-story-count-badge" style="background:var(--danger); color:#fff;" title="قصة رسمية"><i class="fa-solid fa-check" style="font-size:9px;"></i></span>` : (userStories.length > 1 ? `<span class="sq-story-count-badge">${userStories.length}</span>` : '')}
        </div>
        <span class="sq-story-name">${authorName}</span>
      </div>
    `;
  });
  bar.innerHTML = html;
};

window.sqOpenStoryModal = function() {
  if (!AppState.currentUser) { sqShowToast("سجل دخولك الأول عشان تنزل قصة", "warning"); return window.sqLogin(); }
  if (AppState.userData.isMuted && !AppState.isAdmin) return sqShowToast("حسابك مقيد من النشر حالياً", "danger");
  AppState.pendingStoryImg = '';
  document.getElementById('sq-story-text-in').value = '';
  document.getElementById('sq-story-upload-status').innerHTML = 'إرفاق صورة للقصة (اختياري)';
  window.sqSwitchMainView('story_publish');
};

window.sqHandleStoryImageUpload = async function(inputEl) {
  if (!inputEl.files || !inputEl.files[0]) return;
  const statusEl = document.getElementById('sq-story-upload-status');
  const btn = document.getElementById('sq-story-pub-btn');
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent);"></i> جاري ضغط ورفع الصورة...';
  try {
    AppState.pendingStoryImg = await window.sqCompressAndUploadToImgBB(inputEl.files[0], 900, 0.78);
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--success);"><i class="fa-solid fa-check-circle"></i> تم تجهيز صورة القصة!</span>';
  } catch (e) {
    sqShowToast("تعذر رفع صورة القصة", "danger");
  }
  if (btn) btn.disabled = false;
};

window.sqPublishStory = function() {
  const text = document.getElementById('sq-story-text-in').value.trim();
  const bgTheme = document.getElementById('sq-story-bg-select').value;
  if (!text && !AppState.pendingStoryImg) return sqShowToast("اكتب حاجة أو ارفع صورة للقصة", "warning");
  db.collection("safaqat_stories").add({
    uid: AppState.currentUser.uid,
    isAdminStory: Boolean(AppState.isAdmin),
    authorName: getRealName(AppState.currentUser.uid, AppState.currentUser.displayName),
    authorPhoto: getRealPhoto(AppState.currentUser.uid, AppState.currentUser.photoURL),
    text: text,
    imageUrl: AppState.pendingStoryImg || '',
    bgTheme: bgTheme,
    views: 1,
    time: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  }).then(() => {
    window.sqSwitchMainView('community', true);
    sqShowToast("يا فنان! نزلت قصتك بنجاح", "success");
  });
};

window.sqOpenUserStories = function(uid, startIdx = 0) {
  const list = AppState.groupedStories[uid];
  if (!list || !list.length) return;
  AppState.activeStoryUid = uid;
  AppState.activeStoryIdx = Math.max(0, Math.min(startIdx, list.length - 1));
  window.sqSwitchMainView('story_viewer');
  window.sqRenderActiveStorySlide();
};

window.sqRenderActiveStorySlide = function() {
  clearTimeout(AppState.storyTimer);
  const list = AppState.groupedStories[AppState.activeStoryUid];
  if (!list || !list[AppState.activeStoryIdx]) {
    window.sqGoBackView();
    return;
  }
  const st = list[AppState.activeStoryIdx];
  const viewedKey = 'sq_st_v_' + st.id;
  if (!sessionStorage.getItem(viewedKey)) {
    sessionStorage.setItem(viewedKey, '1');
    st.views = (st.views || 1) + 1;
    db.collection("safaqat_stories").doc(st.id).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
  }

  const body = document.getElementById('sq-story-viewer-body');
  const bgGrad = STORY_GRADIENTS[st.bgTheme || 'royal'] || STORY_GRADIENTS.royal;
  body.style.background = bgGrad;
  const isOwnerOrAdmin = (AppState.currentUser && st.uid === AppState.currentUser.uid) || AppState.isAdmin;
  const authorName = escapeHtml(getRealName(st.uid, st.authorName));
  const avatar = getRealPhoto(st.uid, st.authorPhoto);
  const vBubble = window.sqGetVerificationBubble(st.uid, false, st.isAdminStory);

  const segsHtml = list.map((item, idx) => {
    const w = idx < AppState.activeStoryIdx ? '100%' : '0%';
    return `<div class="sq-story-seg"><div class="sq-story-seg-fill" id="st-seg-${idx}" style="width:${w};"></div></div>`;
  }).join('');

  let mediaContent = '';
  const ytMatch = (st.text || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    const vidId = ytMatch[1];
    mediaContent = `
      <div style="width:100%; height:340px; border-radius:16px; overflow:hidden; margin:8px 0; position:relative; z-index:12; background:#000; border:1px solid rgba(212,175,55,0.4);" onclick="event.stopPropagation()">
        <iframe src="https://www.youtube.com/embed/${vidId}?autoplay=1&playsinline=1&rel=0" style="width:100%; height:100%; border:none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>
    `;
  } else if (st.imageUrl) {
    mediaContent = `<div style="text-align:center; margin:8px 0;"><img src="${escapeHtml(st.imageUrl)}" style="max-width:100%; max-height:48vh; border-radius:14px; object-fit:contain;"></div>`;
  }

  const cleanText = escapeHtml(decodeEntities(st.text || '').replace(/https?:\/\/[^\s]+/g, '').trim());

  body.innerHTML = `
    <div>
      <div class="sq-story-progress-row">${segsHtml}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; z-index:12; position:relative;">
        <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="event.stopPropagation(); clearTimeout(AppState.storyTimer); window.sqViewProfile('${st.uid}')">
          <img src="${avatar}" style="width:40px; height:40px; border-radius:50%; border:2px solid #fbbf24; object-fit:cover;">
          <div>
            <div style="font-weight:900; font-size:13.5px; color:#fff; display:flex; align-items:center; gap:5px;">${authorName} ${vBubble}</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.75);">${sqFormatRelativeTime(st.time)} • <i class="fa-regular fa-eye"></i> ${st.views || 1}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          ${isOwnerOrAdmin ? `<button class="sq-back-pill" style="background:rgba(239,68,68,0.3); color:#fff; border:none;" onclick="event.stopPropagation(); window.sqDeleteStory('${st.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
          <button class="sq-back-pill" style="background:rgba(255,255,255,0.18); color:#fff; border:none;" onclick="event.stopPropagation(); clearTimeout(AppState.storyTimer); window.sqGoBackView()"><i class="fa-solid fa-xmark"></i> إغلاق</button>
        </div>
      </div>
    </div>
    <div style="position:absolute; top:70px; bottom:55px; right:0; width:35%; z-index:8; cursor:pointer;" onclick="window.sqStepStory(-1)"></div>
    <div style="position:absolute; top:70px; bottom:55px; left:0; width:65%; z-index:8; cursor:pointer;" onclick="window.sqStepStory(1)"></div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:14px 6px; z-index:5;">
      ${mediaContent}
      ${cleanText ? `<div style="font-family:'Amiri','Tajawal',serif; font-size:21px; font-weight:bold; text-align:center; line-height:1.85; color:#fff; white-space:pre-wrap;">${cleanText}</div>` : ''}
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:rgba(255,255,255,0.8); z-index:12;">
      <span>القصة ${AppState.activeStoryIdx + 1} من ${list.length}</span>
      <span style="color:#fbbf24; font-weight:800; cursor:pointer;" onclick="event.stopPropagation(); window.sqStepStory(1)">اللي بعده <i class="fa-solid fa-chevron-left"></i></span>
    </div>
  `;

  const activeSeg = document.getElementById('st-seg-' + AppState.activeStoryIdx);
  if (!ytMatch) {
    if (activeSeg) setTimeout(() => { activeSeg.style.transition = 'width 6s linear'; activeSeg.style.width = '100%'; }, 30);
    AppState.storyTimer = setTimeout(() => window.sqStepStory(1), 6100);
  } else {
    if (activeSeg) activeSeg.style.width = '100%';
  }
};

window.sqStepStory = function(dir) {
  clearTimeout(AppState.storyTimer);
  const list = AppState.groupedStories[AppState.activeStoryUid] || [];
  const nextIdx = AppState.activeStoryIdx + dir;
  if (nextIdx >= 0 && nextIdx < list.length) {
    AppState.activeStoryIdx = nextIdx;
    window.sqRenderActiveStorySlide();
  } else {
    window.sqGoBackView();
  }
};

window.sqDeleteStory = function(storyId) {
  if (!confirm("متأكد تبغى تحذف القصة دي؟")) return;
  clearTimeout(AppState.storyTimer);
  db.collection("safaqat_stories").doc(storyId).delete().then(() => {
    window.sqGoBackView();
    sqShowToast("تم حذف القصة بنجاح", "success");
  });
};

// =========================================================
// 🖼️ دوال القوائم، الوسائط، ورفع الصور
// =========================================================
window.sqCloseAllMenus = function() {
  document.querySelectorAll('.sq-dropdown').forEach(d => d.style.display = 'none');
  document.querySelectorAll('.sq-post.menu-open').forEach(p => p.classList.remove('menu-open'));
};

window.sqTogglePostMenu = function(e, postId) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  const drop = document.getElementById(`drop-${postId}`);
  const postEl = document.getElementById(`post-${postId}`);
  if (!drop) return;
  const isOpen = drop.style.display === 'flex';
  window.sqCloseAllMenus();
  if (!isOpen) { drop.style.display = 'flex'; if (postEl) postEl.classList.add('menu-open'); }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.sq-menu')) window.sqCloseAllMenus();
});

window.sqActivateYoutubeFacade = function(el, videoId, e) {
  if (e) e.stopPropagation();
  el.className = 'sq-yt-facade sq-active-yt-frame';
  el.setAttribute('data-ytid', videoId);
  el.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
};

window.sqDownloadDirectImage = async function(imgUrl, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  if (!imgUrl) return;
  sqShowToast("جاري تجهيز الصورة للتحميل...", "success");
  try {
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `safaqat-img-${Date.now()}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    window.open(imgUrl, '_blank');
  }
};

window.sqScrollCarousel = function(trackId, dir, e) {
  if (e) e.stopPropagation();
  const track = document.getElementById(trackId);
  if (!track) return;
  track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' });
};

window.sqUpdateCarouselCounter = function(trackEl, counterId) {
  const cEl = document.getElementById(counterId);
  if (!cEl || !trackEl) return;
  const total = trackEl.children.length;
  const idx = Math.min(total, Math.max(1, Math.round(Math.abs(trackEl.scrollLeft) / trackEl.clientWidth) + 1));
  cEl.innerText = `${idx} / ${total}`;
};

window.sqRenderPendingPostImages = function() {
  const grid = document.getElementById('sq-multi-preview-grid');
  const statusEl = document.getElementById('sq-upload-status-text');
  if (!grid) return;
  if (!AppState.pendingPostImages.length) {
    grid.innerHTML = '';
    if (statusEl) statusEl.innerHTML = 'إرفاق صور مع المنشور (حتى 10 صور)';
    return;
  }
  if (statusEl) statusEl.innerHTML = `<span style="color:var(--success);"><i class="fa-solid fa-images"></i> تم تجهيز (${AppState.pendingPostImages.length} / 10) صور</span>`;
  grid.innerHTML = AppState.pendingPostImages.map((url, idx) => `
    <div class="sq-multi-thumb">
      <img src="${escapeHtml(url)}">
      <button type="button" onclick="window.sqRemovePendingImage(${idx})"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
};

window.sqRemovePendingImage = function(idx) {
  AppState.pendingPostImages.splice(idx, 1);
  window.sqRenderPendingPostImages();
};

window.sqHandlePostImageSelect = async function(inputEl) {
  if (!inputEl.files || !inputEl.files.length) return;
  const files = Array.from(inputEl.files);
  const remainingSlots = 10 - AppState.pendingPostImages.length;
  if (remainingSlots <= 0) return sqShowToast("الحد الأقصى 10 صور في المنشور", "warning");
  const filesToUpload = files.slice(0, remainingSlots);

  const pubBtn = document.getElementById('sq-publish-btn');
  const statusEl = document.getElementById('sq-upload-status-text');
  AppState.isUploadingImage = true;
  if (pubBtn) { pubBtn.disabled = true; pubBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الرفع...'; }

  let uploadedCount = 0;
  for (const file of filesToUpload) {
    uploadedCount++;
    if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color:var(--accent);"></i> جاري رفع الصورة (${uploadedCount}/${filesToUpload.length})...`;
    try {
      const url = await window.sqCompressAndUploadToImgBB(file, 960, 0.78);
      AppState.pendingPostImages.push(url);
      window.sqRenderPendingPostImages();
    } catch (err) {
      sqShowToast("تعذر رفع إحدى الصور", "danger");
    }
  }
  inputEl.value = '';
  AppState.isUploadingImage = false;
  if (pubBtn) { pubBtn.disabled = false; pubBtn.innerHTML = AppState.editingPostId ? '<i class="fa-solid fa-save"></i> حفظ التعديل' : '<i class="fa-solid fa-paper-plane"></i> انشر الآن'; }
};

window.sqHandleAvatarUpload = async function(inputEl) {
  if (!inputEl.files || !inputEl.files[0] || !AppState.currentUser) return;
  sqShowToast("جاري تحديث صورتك الشخصية...", "warning");
  try {
    const newAvatarUrl = await window.sqCompressAndUploadToImgBB(inputEl.files[0], 420, 0.82);
    await db.collection("safaqat_users").doc(AppState.currentUser.uid).update({ photoURL: newAvatarUrl });
    if (AppState.allUsers[AppState.currentUser.uid]) AppState.allUsers[AppState.currentUser.uid].photoURL = newAvatarUrl;
    sqShowToast("يا فنان! تم تحديث صورتك الشخصية", "success");
    window.sqRenderProfilePage(); window.sqRenderFeed(true);
  } catch (err) { sqShowToast("تعذر رفع الصورة الشخصية", "danger"); }
};

window.sqHandleBookCoverUpload = async function(inputEl) {
  if (!inputEl.files || !inputEl.files[0]) return;
  const statusEl = document.getElementById('sq-book-cover-status');
  const prevImg = document.getElementById('sq-studio-cover-prev');
  if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent);"></i> جاري رفع الغلاف...';
  try {
    AppState.pendingBookCover = await window.sqCompressAndUploadToImgBB(inputEl.files[0], 680, 0.82);
    if (prevImg) prevImg.src = AppState.pendingBookCover;
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--success);"><i class="fa-solid fa-check-circle"></i> تم تجهيز غلاف الكتاب!</span>';
  } catch (err) {
    sqShowToast("تعذر رفع غلاف الكتاب", "danger");
  }
};

function parseContent(text, podcastUrl = '') {
  let html = escapeHtml(text || '');
  let embed = '';

  const ytRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})([^\s]*)/i;
  const ytMatch = html.match(ytRegex);
  if (ytMatch) {
    const vid = ytMatch[1];
    embed += `<div class="sq-yt-facade" onclick="window.sqActivateYoutubeFacade(this, '${vid}', event)" title="تشغيل الفيديو"><img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" loading="lazy"><div class="sq-yt-play-btn"><i class="fa-solid fa-play"></i></div></div>`;
    html = html.replace(ytMatch[0], '');
  }

  if (podcastUrl && podcastUrl.trim() !== '') {
    const pSafe = escapeHtml(podcastUrl.trim());
    embed += `
      <div class="sq-podcast-post-box">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); color:#0f172a; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;"><i class="fa-solid fa-podcast"></i></div>
          <div>
            <div style="font-size:13px; font-weight:900; color:#fff;">حلقة بودكاست / مقطع صوتي مرفق</div>
            <div style="font-size:11px; color:#cbd5e1;">اضغط للاستماع في المشغل العائم بالخلفية</div>
          </div>
        </div>
        <button class="sq-btn sq-btn-gold" style="padding:6px 14px!important; font-size:11.5px!important;" onclick="window.sqPlayPodcast('${pSafe}', 'مساهمة صوتية', 'عضو في صفقات', event)">
          <i class="fa-solid fa-play"></i> استمع الآن
        </button>
      </div>
    `;
  }

  html = html.replace(/(https?:\/\/[^\s]+)/g, `<a href="$1" target="_blank" onclick="event.stopPropagation()" style="color:var(--accent); font-weight:bold; font-size:13px; margin-top:4px; display:inline-block; background:var(--bg); padding:5px 10px; border-radius:8px; border:1px solid var(--border); text-decoration:none;"><i class="fa-solid fa-link"></i> فتح الرابط المرفق</a>`);
  return { textHtml: html.trim(), embedHtml: embed };
}

// =========================================================
// ✍️ استوديو النشر الأدبي، الخلاصة، التعليقات، وبطاقة الاقتباس
// =========================================================
window.sqOnSearchInput = function() {
  const val = document.getElementById('sq-search-input').value;
  AppState.searchQuery = val.toLowerCase().trim();
  document.getElementById('sq-search-clear-btn').style.display = AppState.searchQuery ? 'flex' : 'none';
  if (AppState.searchQuery.length >= 3) window.SafaqatAI.trackSignal('search', AppState.searchQuery, 1);
  AppState.renderedPostSignature = '';
  window.sqRenderFeed(true);
};

window.sqClearSearch = function() {
  document.getElementById('sq-search-input').value = '';
  AppState.searchQuery = ''; AppState.activeCategoryFilter = null;
  document.getElementById('sq-search-clear-btn').style.display = 'none';
  AppState.renderedPostSignature = '';
  window.sqRenderFeed(true);
};

window.sqFilterByCategory = function(catKey) {
  window.sqSwitchMainView('community');
  AppState.activeCategoryFilter = (AppState.activeCategoryFilter === catKey) ? null : catKey;
  AppState.renderedPostSignature = '';
  window.sqRenderFeed(true);
};

window.sqOpenPublishModal = function(postId = null, prelinkedBook = null) {
  window.sqCloseAllMenus();
  if (AppState.userData.isMuted && !AppState.isAdmin) return sqShowToast("حسابك مقيد من النشر حالياً", "danger");
  const title = document.getElementById('sq-publish-title');
  const btn = document.getElementById('sq-publish-btn');
  const anonCheck = document.getElementById('sq-post-anon');
  AppState.pendingPostImages = [];
  AppState.linkedBookForPost = prelinkedBook || null;
  window.sqRenderPendingPostImages();
  document.getElementById('sq-post-book-picker-box').style.display = 'none';

  if (postId && typeof postId === 'string') {
    const post = AppState.posts.find(p => p.id === postId); if (!post) return;
    document.getElementById('sq-post-text').value = decodeEntities(post.text || '');
    document.getElementById('sq-meta-source').value = decodeEntities(post.source || '');
    document.getElementById('sq-meta-book').value = decodeEntities(post.book || '');
    document.getElementById('sq-post-podcast-url').value = post.podcastUrl || '';
    document.getElementById('sq-post-category').value = post.category || 'literature';
    document.getElementById('sq-post-align').value = post.textAlign || 'right';
    document.getElementById('sq-post-comments-lock').value = post.commentsLocked ? 'locked' : 'open';
    if (AppState.isAdmin) document.getElementById('sq-post-type-select').value = post.postType || 'normal';
    if (anonCheck) { anonCheck.checked = post.isAnon; document.getElementById('sq-anon-text').style.color = post.isAnon ? 'var(--danger)' : 'var(--text-muted)'; }
    if (Array.isArray(post.images) && post.images.length) AppState.pendingPostImages = [...post.images];
    else if (post.imageUrl) AppState.pendingPostImages = [post.imageUrl];
    if (post.linkedBookId) {
      AppState.linkedBookForPost = AppState.booksList.find(b => b.id === post.linkedBookId) || null;
    }
    window.sqRenderPendingPostImages();
    title.innerHTML = '<i class="fa-solid fa-pen" style="color:var(--accent);"></i> تعديل المساهمة الأدبية';
    btn.innerHTML = '<i class="fa-solid fa-save"></i> حفظ التعديل';
    AppState.editingPostId = postId;
  } else {
    document.getElementById('sq-post-text').value = localStorage.getItem('sq_draft_text') || '';
    document.getElementById('sq-meta-source').value = prelinkedBook ? (prelinkedBook.authorName || '') : '';
    document.getElementById('sq-meta-book').value = prelinkedBook ? (prelinkedBook.title || '') : '';
    document.getElementById('sq-post-podcast-url').value = '';
    document.getElementById('sq-post-category').value = prelinkedBook ? 'quote' : 'literature';
    document.getElementById('sq-post-align').value = prelinkedBook ? 'center' : 'right';
    document.getElementById('sq-post-comments-lock').value = 'open';
    if (AppState.isAdmin) document.getElementById('sq-post-type-select').value = 'normal';
    if (anonCheck) { anonCheck.checked = false; document.getElementById('sq-anon-text').style.color = 'var(--text-muted)'; }
    title.innerHTML = '<i class="fa-solid fa-feather-pointed" style="color:var(--accent);"></i> استوديو النشر الأدبي والبودكاست';
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> انشر الآن';
    AppState.editingPostId = null;
  }
  window.sqRenderLinkedBookInPostStudio();
  window.sqSwitchMainView('publish_post');
};

window.sqRenderLinkedBookInPostStudio = function() {
  const banner = document.getElementById('sq-post-linked-book-banner');
  if (!banner) return;
  if (!AppState.linkedBookForPost) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }
  const b = AppState.linkedBookForPost;
  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="sq-attached-book-pill" style="cursor:default;">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${escapeHtml(b.cover || APP_LOGO_URL)}" style="width:34px; height:48px; object-fit:cover; border-radius:6px; border:1px solid var(--accent);">
        <div>
          <div style="font-size:12px; font-weight:900; color:var(--text-main);">مرتبط بكتاب: ${escapeHtml(b.title)}</div>
          <div style="font-size:11px; color:var(--text-muted);">سيظهر منشورك أيضاً داخل صفحة هذا الكتاب في المتجر</div>
        </div>
      </div>
      <button type="button" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:12px; font-weight:bold;" onclick="AppState.linkedBookForPost=null; window.sqRenderLinkedBookInPostStudio();">إلغاء الربط</button>
    </div>
  `;
};

window.sqOpenBookSelectorForPost = function() {
  const box = document.getElementById('sq-post-book-picker-box');
  if (!box) return;
  if (box.style.display === 'block') { box.style.display = 'none'; return; }
  box.style.display = 'block';
  if (!AppState.booksList.length) {
    box.innerHTML = `<div style="font-size:12px; color:var(--text-muted); text-align:center;">لا توجد كتب مضافة في المتجر حالياً، يمكنك كتابة اسم الكتاب يدوياً بالأسفل.</div>`;
    return;
  }
  box.innerHTML = `
    <div style="font-size:12px; font-weight:800; margin-bottom:6px; color:var(--text-main);">اختر كتاباً من المتجر لربط منشورك به:</div>
    <div style="max-height:160px; overflow-y:auto; display:flex; flex-direction:column; gap:5px;">
      ${AppState.booksList.map(b => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--card); border:1px solid var(--border); border-radius:10px; cursor:pointer;" onclick="window.sqSelectBookForPost('${b.id}')">
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${escapeHtml(b.cover || APP_LOGO_URL)}" style="width:24px; height:34px; object-fit:cover; border-radius:4px;">
            <span style="font-size:12px; font-weight:800;">${escapeHtml(b.title)} <small style="color:var(--text-muted);">— ${escapeHtml(b.authorName || '')}</small></span>
          </div>
          <span style="font-size:11px; color:var(--accent); font-weight:900;">اختيار</span>
        </div>
      `).join('')}
    </div>
  `;
};

window.sqSelectBookForPost = function(bookId) {
  const b = AppState.booksList.find(x => x.id === bookId);
  if (!b) return;
  AppState.linkedBookForPost = b;
  document.getElementById('sq-meta-book').value = decodeEntities(b.title || '');
  document.getElementById('sq-meta-source').value = decodeEntities(b.authorUid ? getRealName(b.authorUid, b.authorName) : (b.authorName || ''));
  document.getElementById('sq-post-book-picker-box').style.display = 'none';
  window.sqRenderLinkedBookInPostStudio();
};

window.sqPublish = function() {
  if (AppState.isUploadingImage) return sqShowToast("انتظر شوية.. جاري رفع الصور...", "warning");
  if (AppState.userData.isMuted && !AppState.isAdmin) return sqShowToast("حسابك مقيد من النشر", "danger");
  const text = document.getElementById('sq-post-text').value.trim();
  const podcastUrl = (document.getElementById('sq-post-podcast-url')?.value || '').trim();
  if (!text && !AppState.pendingPostImages.length && !podcastUrl) return sqShowToast("اكتب نصاً، أو ارفع صورة، أو أضف رابط بودكاست للنشر", "warning");

  const isAnon = document.getElementById('sq-post-anon').checked;
  const category = document.getElementById('sq-post-category').value;
  const textAlign = document.getElementById('sq-post-align').value;
  const commentsLocked = document.getElementById('sq-post-comments-lock').value === 'locked';
  let type = 'normal';
  if (AppState.isAdmin && !isAnon) type = document.getElementById('sq-post-type-select').value || 'normal';

  if (AppState.linkedBookForPost) window.SafaqatAI.trackSignal('book', AppState.linkedBookForPost, 4);

  const postData = {
    text: text,
    podcastUrl: podcastUrl,
    images: AppState.pendingPostImages,
    imageUrl: AppState.pendingPostImages[0] || '',
    source: document.getElementById('sq-meta-source').value.trim(),
    book: document.getElementById('sq-meta-book').value.trim(),
    linkedBookId: AppState.linkedBookForPost ? AppState.linkedBookForPost.id : '',
    category: category,
    textAlign: textAlign,
    commentsLocked: commentsLocked,
    isAnon: isAnon,
    isAdminPost: AppState.isAdmin,
    postType: type,
    authorName: isAnon ? "كاتب مجهول" : getRealName(AppState.currentUser.uid, AppState.currentUser.displayName),
    authorPhoto: isAnon ? ANON_PIC : getRealPhoto(AppState.currentUser.uid, AppState.currentUser.photoURL)
  };
  AppState.renderedPostSignature = '';
  localStorage.removeItem('sq_draft_text');
  if (AppState.editingPostId) {
    db.collection("safaqat_quotes").doc(AppState.editingPostId).update(postData).then(() => {
      sqShowToast("يا فنان! تم حفظ تعديل مساهمتك", "success");
      window.sqSwitchMainView('community', true);
    });
  } else {
    postData.uid = AppState.currentUser.uid;
    postData.likes = [];
    postData.comments = [];
    postData.views = 1;
    postData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
    db.collection("safaqat_quotes").add(postData).then(() => {
      sqShowToast("منشورك نور المنصة! تم النشر بنجاح", "success");
      window.sqSwitchMainView('community', true);
    });
  }
};

window.sqDeletePost = function(id) {
  window.sqCloseAllMenus();
  if (!confirm("متأكد تبغى تحذف المنشور ده نهائياً؟")) return;
  AppState.renderedPostSignature = '';
  db.collection("safaqat_quotes").doc(id).delete().then(() => {
    sqShowToast("تم حذف المنشور", "success");
    if (AppState.activeMainView === 'single_post' && AppState.viewingPostId === id) window.sqSwitchMainView('community', true);
  });
};

window.sqToggleCommentsLock = function(id, currentLocked) {
  window.sqCloseAllMenus();
  db.collection("safaqat_quotes").doc(id).update({ commentsLocked: !currentLocked }).then(() => sqShowToast(!currentLocked ? "تم إغلاق النقاش والتعليقات" : "تم فتح النقاش والتعليقات", "success"));
};

window.sqReportPost = function(id) {
  window.sqCloseAllMenus();
  if (!AppState.currentUser) return sqShowToast("سجل دخولك الأول للإبلاغ", "warning");
  const post = AppState.posts.find(p => p.id === id); if (!post) return;
  window.sqOpenCustomPrompt("اذكر سبب الإبلاغ للإدارة والمشرفين:", "", (reason) => {
    db.collection("safaqat_reports").add({
      postId: id, postSnippet: decodeEntities(post.text || 'منشور مصور').substring(0, 180), postAuthorUid: post.uid,
      reporterUid: AppState.currentUser.uid, reason: reason || 'مخالفة القوانين', time: Date.now()
    }).then(() => sqShowToast("تم إرسال البلاغ لقسم الرقابة", "success"));
  });
};

window.sqOpenShareModal = function(postId) {
  window.sqCloseAllMenus();
  AppState.sharingPostId = postId; AppState.shareCardTheme = 'royal';
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const postLink = `${CURRENT_DOMAIN_ORIGIN}${window.location.pathname}?post=${postId}`;
  const author = post.isAnon ? "كاتب مجهول" : getRealName(post.uid, post.authorName);
  const shareText = `"${decodeEntities(post.text || '').substring(0, 180)}"\n— بقلم: ${author} | عبر ${APP_NAME}\n${postLink}`;
  const encText = encodeURIComponent(shareText); const encUrl = encodeURIComponent(postLink);
  document.getElementById('sq-social-share-links').innerHTML = `
    <a href="https://api.whatsapp.com/send?text=${encText}" target="_blank" class="sq-social-btn"><i class="fa-brands fa-whatsapp" style="font-size:18px; color:#25D366;"></i> واتساب</a>
    <a href="https://t.me/share/url?url=${encUrl}&text=${encodeURIComponent(decodeEntities(post.text || '').substring(0, 140))}" target="_blank" class="sq-social-btn"><i class="fa-brands fa-telegram" style="font-size:18px; color:#0088cc;"></i> تليجرام</a>
    <a href="https://twitter.com/intent/tweet?text=${encText}" target="_blank" class="sq-social-btn"><i class="fa-brands fa-x-twitter" style="font-size:18px; color:var(--text-main);"></i> منصة X</a>
    <button class="sq-social-btn" onclick="window.sqNativeShare('${postId}')"><i class="fa-solid fa-share-nodes" style="font-size:18px; color:var(--accent);"></i> مشاركة</button>
  `;
  window.sqSwitchMainView('share_page');
  setTimeout(() => window.sqRenderShareCanvas('royal'), 50);
};

window.sqOpenLikesModal = function(postId) {
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const likes = post.likes || [];
  document.getElementById('sq-users-list-title').innerHTML = `<i class="fa-solid fa-heart" style="color:var(--danger);"></i> الحبايب المعجبين بالمساهمة (${likes.length})`;
  window.sqRenderUsersListView(likes);
};

window.sqOpenUsersListView = function(type) {
  const uid = AppState.viewedProfileUid; if (!uid) return;
  const list = type === 'followers' ? window.sqGetFollowersList(uid) : window.sqGetFollowingList(uid);
  document.getElementById('sq-users-list-title').innerHTML = `<i class="fa-solid fa-users" style="color:var(--accent);"></i> ${type === 'followers' ? 'المتابعون' : 'يتابع'} (${list.length})`;
  window.sqRenderUsersListView(list);
};

window.sqRenderUsersListView = function(uidsList) {
  const body = document.getElementById('sq-users-list-body');
  if (!uidsList.length) body.innerHTML = `<p style="text-align:center; padding:25px; color:var(--text-muted);">القائمة فارغة حالياً.</p>`;
  else {
    body.innerHTML = uidsList.map(uid => {
      const u = AppState.allUsers[uid] || {};
      const name = escapeHtml(getRealName(uid, u.displayName)); const photo = getRealPhoto(uid, u.photoURL);
      return `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg); border:1px solid var(--border); border-radius:14px; cursor:pointer;" onclick="window.sqViewProfile('${uid}')"><div style="display:flex; align-items:center; gap:10px;"><img src="${photo}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;"><div><div style="font-weight:800; font-size:13px;">${name} ${window.getUserBadges(uid, false, false)}</div><div style="font-size:11px; color:var(--text-muted);">${escapeHtml(u.statusText || 'عضو في ' + APP_NAME)}</div></div></div><i class="fa-solid fa-chevron-left" style="font-size:11px; color:var(--text-muted);"></i></div>`;
    }).join('');
  }
  window.sqSwitchMainView('users_list');
};

window.sqNativeShare = function(postId) {
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const postLink = `${CURRENT_DOMAIN_ORIGIN}${window.location.pathname}?post=${postId}`;
  if (navigator.share) navigator.share({ title: APP_NAME, text: decodeEntities(post.text || '').substring(0, 140), url: postLink }).catch(() => {});
  else window.sqCopyPostLink();
};

window.sqCopyPostLink = function() {
  if (!AppState.sharingPostId) return;
  const postLink = `${CURRENT_DOMAIN_ORIGIN}${window.location.pathname}?post=${AppState.sharingPostId}`;
  navigator.clipboard.writeText(postLink).then(() => sqShowToast("تم نسخ الرابط المباشر!", "success"));
};

window.sqCopyPost = function(postId) {
  window.sqCloseAllMenus();
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const author = post.isAnon ? "كاتب مجهول" : getRealName(post.uid, post.authorName);
  let copyText = `"${decodeEntities(post.text || '')}"\n\n`;
  if (post.source) copyText += `القائل: ${decodeEntities(post.source)}\n`;
  if (post.book) copyText += `من كتاب: ${decodeEntities(post.book)}\n`;
  copyText += `بقلم: ${author}\nعبر: ${APP_NAME}\n${CURRENT_DOMAIN_ORIGIN}${window.location.pathname}?post=${postId}`;
  if (navigator.clipboard) navigator.clipboard.writeText(copyText).then(() => sqShowToast("تم نسخ النص مع الحقوق!", "success"));
};

window.sqRenderShareCanvas = function(themeName) {
  AppState.shareCardTheme = themeName || 'royal';
  const post = AppState.posts.find(p => p.id === AppState.sharingPostId);
  const canvas = document.getElementById('sq-quote-canvas'); if (!post || !canvas) return;
  const ctx = canvas.getContext('2d');
  const themes = {
    royal:     { bg1: '#0b1120', bg2: '#1e293b', border: '#d4af37', text: '#f8fafc', accent: '#d4af37', muted: '#94a3b8' },
    parchment: { bg1: '#fdfbf7', bg2: '#f3ede0', border: '#b48a1e', text: '#1e293b', accent: '#92400e', muted: '#64748b' },
    emerald:   { bg1: '#064e3b', bg2: '#022c22', border: '#d4af37', text: '#ecfdf5', accent: '#fbbf24', muted: '#a7f3d0' }
  };
  const th = themes[AppState.shareCardTheme] || themes.royal;
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080); grad.addColorStop(0, th.bg1); grad.addColorStop(1, th.bg2);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1080);

  ctx.strokeStyle = th.border; ctx.lineWidth = 6; ctx.strokeRect(48, 48, 984, 984);
  ctx.lineWidth = 2; ctx.strokeRect(66, 66, 948, 948);

  ctx.fillStyle = th.accent; ctx.font = "bold 36px 'Tajawal', sans-serif"; ctx.textAlign = "center"; ctx.direction = "rtl";
  ctx.fillText(APP_NAME, 540, 160);

  const rawClean = decodeEntities((post.text || 'مساهمة أدبية').replace(/https?:\/\/[^\s]+/g, '').trim()).substring(0, 380);
  ctx.fillStyle = th.text; ctx.font = "bold 42px 'Amiri', 'Tajawal', serif";
  const words = rawClean.split(/\s+/); const lines = []; let currentLine = '';
  words.forEach(w => {
    const testLine = currentLine ? currentLine + ' ' + w : w;
    if (ctx.measureText(testLine).width > 820) { lines.push(currentLine); currentLine = w; } else currentLine = testLine;
  });
  if (currentLine) lines.push(currentLine);
  const displayLines = lines.slice(0, 8); if (lines.length > 8) displayLines[7] += '...';
  const lineHeight = 72; let startY = 530 - ((displayLines.length - 1) * lineHeight) / 2;
  displayLines.forEach((line, i) => ctx.fillText(line, 540, startY + i * lineHeight));

  const author = decodeEntities(post.isAnon ? "كاتب مجهول" : getRealName(post.uid, post.authorName));
  ctx.fillStyle = th.accent; ctx.font = "bold 33px 'Tajawal', sans-serif";
  ctx.fillText(`بقلم: ${author}`, 540, 900);

  if (post.book || post.source) {
    ctx.fillStyle = th.muted; ctx.font = "26px 'Tajawal', sans-serif";
    ctx.fillText(decodeEntities(`${post.source || ''}${post.book ? ' — كتاب: ' + post.book : ''}`), 540, 948);
  }
  ctx.fillStyle = th.muted; ctx.font = "22px 'Tajawal', sans-serif"; ctx.fillText(window.location.hostname, 540, 995);
};

window.sqDownloadQuoteImage = function() {
  const canvas = document.getElementById('sq-quote-canvas'); if (!canvas) return;
  const link = document.createElement('a'); link.download = `safaqat-quote-${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  sqShowToast("يا فنان! تم حفظ بطاقة الاقتباس", "success");
};

function sqGetSmartRankedPosts(postsList) {
  const myUid = AppState.currentUser ? AppState.currentUser.uid : null;
  const myFollowing = (AppState.userData && AppState.userData.following) ? AppState.userData.following : [];
  const myBookmarks = (AppState.userData && AppState.userData.bookmarks) ? AppState.userData.bookmarks : [];
  const aiProf = window.SafaqatAI.getProfile();

  return postsList.map(p => {
    let score = 0; let reason = '';
    const uData = AppState.allUsers[p.uid] || {};
    const engagement = (p.likes || []).length * 2 + (p.comments || []).length * 3;
    if (p.postType === 'featured') { score += 55; reason = '<i class="fa-solid fa-award"></i> عمل أدبي مميز'; }
    if (!p.isAnon && myFollowing.includes(p.uid)) {
      score += 65; reason = '<i class="fa-solid fa-user-check"></i> لكاتب تتابعه';
    }
    if (p.linkedBookId && (aiProf.viewedBooks || []).includes(p.linkedBookId)) {
      score += 45; if (!reason) reason = '<i class="fa-solid fa-bookmark"></i> مرتبط بكتاب تهتم به';
    }
    if (!p.isAnon && (uData.isAuthor || uData.isPublisher)) { score += 25; if (!reason) reason = '<i class="fa-solid fa-circle-check"></i> حساب موثق'; }
    if (engagement >= 4) { score += Math.min(engagement * 3, 30); if (!reason) reason = '<i class="fa-solid fa-fire"></i> متداول الآن'; }
    if (myUid && ((p.likes || []).includes(myUid) || myBookmarks.includes(p.id))) score -= 18;
    return { ...p, _recScore: score, _recReason: reason };
  }).sort((a, b) => b._recScore - a._recScore);
}

function sqNormalizePostComments(rawComments) {
  const flat = [];
  (rawComments || []).forEach((c, idx) => {
    const cId = c.id || ('legacy_' + idx);
    flat.push({ id: cId, parentId: c.parentId || null, replyToName: c.replyToName || null, uid: c.uid, name: c.name, photo: c.photo || '', text: c.text, time: c.time || 0 });
    if (Array.isArray(c.replies)) {
      c.replies.forEach((r, rIdx) => {
        flat.push({ id: r.id || (`legacy_${idx}_${rIdx}`), parentId: cId, replyToName: getRealName(c.uid, c.name), uid: r.uid, name: r.name, photo: r.photo || '', text: r.text, time: r.time || 0 });
      });
    }
  });
  return flat;
}

window.sqToggleReplyBox = function(postId, commentId) {
  const box = document.getElementById(`reply-box-${postId}-${commentId}`);
  const inp = document.getElementById(`r-in-${postId}-${commentId}`);
  if (!box) return;
  if (box.style.display === 'flex') box.style.display = 'none';
  else { box.style.display = 'flex'; if (inp) setTimeout(() => inp.focus(), 40); }
};

window.sqToggleThreadCollapse = function(postId, commentId) {
  if (AppState.collapsedThreads.has(commentId)) AppState.collapsedThreads.delete(commentId);
  else AppState.collapsedThreads.add(commentId);
  window.sqPatchPostInteractivity(postId);
};

function sqRenderCommentTreeHTML(postId, flatComments, parentId = null, depth = 0, commentsLocked = false) {
  const children = flatComments.filter(c => (c.parentId || null) === parentId);
  if (!children.length) return '';
  return children.map(c => {
    const isCommentOwner = AppState.currentUser && c.uid === AppState.currentUser.uid;
    const canDelete = isCommentOwner || window.sqHasPermission('manage_mod');
    const cName = escapeHtml(getRealName(c.uid, c.name));
    const cPhoto = getRealPhoto(c.uid, c.photo);
    const cBadge = window.getUserBadges(c.uid, false, false, false);
    const subChildrenCount = flatComments.filter(x => x.parentId === c.id).length;
    const isCollapsed = AppState.collapsedThreads.has(c.id);

    let actionsHtml = `<span style="color:var(--text-muted);">${sqFormatRelativeTime(c.time)}</span>`;
    if (AppState.currentUser && (!commentsLocked || AppState.isAdmin)) actionsHtml += `<span style="cursor:pointer; font-weight:bold; color:var(--text-main);" onclick="window.sqToggleReplyBox('${postId}', '${c.id}')"><i class="fa-solid fa-reply"></i> رد</span>`;
    if (isCommentOwner) actionsHtml += `<span style="color:var(--text-main); cursor:pointer; font-weight:bold;" onclick="window.sqEditTreeComment('${postId}', '${c.id}')">تعديل</span>`;
    if (canDelete) actionsHtml += `<span style="color:var(--danger); cursor:pointer; font-weight:bold;" onclick="window.sqDeleteTreeComment('${postId}', '${c.id}')">حذف</span>`;
    if (subChildrenCount > 0) actionsHtml += `<span style="color:var(--accent); cursor:pointer; font-weight:bold;" onclick="window.sqToggleThreadCollapse('${postId}', '${c.id}')">${isCollapsed ? `إظهار الردود (${subChildrenCount})` : `طي`}</span>`;

    const nestedHtml = (!isCollapsed) ? sqRenderCommentTreeHTML(postId, flatComments, c.id, depth + 1, commentsLocked) : '';
    const childIndentStyle = depth < 3 ? '' : 'margin-right:6px; padding-right:8px;';

    return `
      <div class="sq-comment-node">
        <div style="display:flex; gap:8px;">
          <img src="${cPhoto}" class="sq-avatar" style="width:${depth === 0 ? '32px' : '26px'}; height:${depth === 0 ? '32px' : '26px'}; min-width:${depth === 0 ? '32px' : '26px'};" onclick="window.sqViewProfile('${c.uid}')" loading="lazy">
          <div style="width:100%;">
            <div class="sq-comment-card">
              <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap; margin-bottom:2px;">
                <strong style="color:var(--text-main); cursor:pointer; font-size:12.5px;" onclick="window.sqViewProfile('${c.uid}')">${cName}</strong> ${cBadge}
              </div>
              ${c.replyToName ? `<div class="sq-reply-mention"><i class="fa-solid fa-reply"></i> @${escapeHtml(c.replyToName)}</div><br>` : ''}
              <span style="color:var(--text-main); font-size:13px; line-height:1.6; white-space:pre-wrap;">${escapeHtml(c.text)}</span>
            </div>
            <div style="font-size:11px; margin-top:3px; color:var(--text-muted); display:flex; gap:12px; padding-right:6px; flex-wrap:wrap;">${actionsHtml}</div>
            <div id="reply-box-${postId}-${c.id}" style="display:none; gap:6px; margin-top:6px;">
              <input type="text" id="r-in-${postId}-${c.id}" class="sq-input" style="margin:0!important; padding:7px 11px!important; border-radius:18px!important; font-size:12px;" placeholder="رد على ${cName}..." onkeyup="if(event.key==='Enter') window.sqAddTreeComment('${postId}', '${c.id}')">
              <button class="sq-btn" style="border-radius:18px!important; padding:6px 12px!important; font-size:11.5px!important;" onclick="window.sqAddTreeComment('${postId}', '${c.id}')"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
          </div>
        </div>
        ${nestedHtml ? `<div class="sq-comment-children" style="${childIndentStyle}">${nestedHtml}</div>` : ''}
      </div>
    `;
  }).join('');
}

window.sqAddTreeComment = function(postId, parentId = null) {
  if (!AppState.currentUser) return sqShowToast("سجل دخولك الأول عشان تعلّق", "warning");
  if (AppState.userData.isMuted && !AppState.isAdmin) return sqShowToast("حسابك مقيد من التعليق", "danger");
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  if (post.commentsLocked && !AppState.isAdmin) return sqShowToast("التعليقات مغلقة على هذا المنشور", "warning");

  const inputId = parentId ? `r-in-${postId}-${parentId}` : `c-in-${postId}`;
  const inp = document.getElementById(inputId);
  const text = inp ? inp.value.trim() : ''; if (!text) return;

  const flatList = sqNormalizePostComments(post.comments || []);
  let targetOwnerUid = post.uid; let replyToName = null;
  if (parentId) {
    const parentNode = flatList.find(c => c.id === parentId);
    if (parentNode) { targetOwnerUid = parentNode.uid; replyToName = getRealName(parentNode.uid, parentNode.name); }
  }

  flatList.push({
    id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    parentId: parentId || null, replyToName: replyToName,
    uid: AppState.currentUser.uid,
    name: getRealName(AppState.currentUser.uid, AppState.currentUser.displayName),
    photo: getRealPhoto(AppState.currentUser.uid, AppState.currentUser.photoURL),
    text: text, time: Date.now()
  });
  if (inp) inp.value = '';
  post.comments = flatList;
  window.sqPatchPostInteractivity(postId);

  db.collection("safaqat_quotes").doc(postId).update({ comments: flatList }).then(() => {
    if (targetOwnerUid && targetOwnerUid !== AppState.currentUser.uid) {
      const actor = getRealName(AppState.currentUser.uid, AppState.currentUser.displayName);
      window.sqSendNotif(targetOwnerUid, postId, parentId ? `ردّ ${actor} على تعليقك.` : `علّق ${actor} على منشورك.`);
    }
  });
};

window.sqEditTreeComment = function(postId, commentId) {
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const flatList = sqNormalizePostComments(post.comments || []);
  const target = flatList.find(c => c.id === commentId); if (!target) return;
  window.sqOpenCustomPrompt("تعديل التعليق:", target.text, (newText) => {
    if (newText) {
      target.text = newText; post.comments = flatList;
      window.sqPatchPostInteractivity(postId);
      db.collection("safaqat_quotes").doc(postId).update({ comments: flatList }).then(() => sqShowToast("تم تعديل التعليق", "success"));
    }
  });
};

window.sqDeleteTreeComment = function(postId, commentId) {
  if (!confirm("حذف التعليق ده وكل الردود التابعة ليه؟")) return;
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const flatList = sqNormalizePostComments(post.comments || []);
  const toRemove = new Set([commentId]); let added = true;
  while (added) {
    added = false;
    flatList.forEach(c => { if (c.parentId && toRemove.has(c.parentId) && !toRemove.has(c.id)) { toRemove.add(c.id); added = true; } });
  }
  const updated = flatList.filter(c => !toRemove.has(c.id));
  post.comments = updated; window.sqPatchPostInteractivity(postId);
  db.collection("safaqat_quotes").doc(postId).update({ comments: updated }).then(() => sqShowToast("تم الحذف", "success"));
};

window.sqBuildSinglePostHTML = function(post, isStandalone = false) {
  const isOwner = AppState.currentUser && post.uid === AppState.currentUser.uid;
  const hasLiked = AppState.currentUser && (post.likes || []).includes(AppState.currentUser.uid);
  const isBookmarked = AppState.currentUser && (AppState.userData.bookmarks || []).includes(post.id);
  const uData = AppState.allUsers[post.uid] || {};

  const actualAuthorName = escapeHtml(post.isAnon ? "مجهول" : getRealName(post.uid, post.authorName));
  const actualPhoto = post.isAnon ? ANON_PIC : getRealPhoto(post.uid, post.authorPhoto);
  const roleBadge = window.getUserBadges(post.uid, post.isAnon, post.isAdminPost, true);
  const isOnline = !post.isAnon && window.sqIsUserOnline(post.uid);
  const hasStory = !post.isAnon && window.sqUserHasActiveStory(post.uid);
  const safeOwnerUidForLike = post.isAnon ? '' : post.uid;

  let quickFollowHtml = '';
  if (!post.isAnon && AppState.currentUser && !isOwner) {
    const myFollowing = AppState.userData.following || [];
    if (!myFollowing.includes(post.uid)) {
      quickFollowHtml = `<button type="button" class="sq-follow-chip" onclick="window.sqToggleFollowUser('${post.uid}', this, event)"><i class="fa-solid fa-plus"></i> متابعة</button>`;
    }
  }

  let readingNowSubHtml = '';
  if (!post.isAnon && uData.currentlyReadingBookId) {
    const rBook = AppState.booksList.find(b => b.id === uData.currentlyReadingBookId);
    if (rBook) {
      readingNowSubHtml = `<span style="font-size:10px; color:var(--accent); font-weight:800; cursor:pointer; margin-right:5px;" onclick="event.stopPropagation(); window.sqOpenBookDetail('${rBook.id}')"><i class="fa-solid fa-book-open-reader"></i> يقرأ: ${escapeHtml(rBook.title)}</span>`;
    }
  }

  const catKey = post.category || 'literature';
  const catObj = POST_CATEGORIES[catKey] || POST_CATEGORIES.literature;
  const wordCount = (post.text || '').trim().split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.ceil(wordCount / 130));
  const viewsCount = post.views || 1;

  let statusBadge = '';
  if (post.postType === 'featured') statusBadge = `<span style="background:var(--accent-soft); color:#b45309; padding:2px 8px; border-radius:10px; font-size:10.5px; font-weight:bold; border:1px solid var(--accent);"><i class="fa-solid fa-award"></i> مميز</span>`;

  let recBadgeHtml = (!isStandalone && AppState.currentFilter === 'for_you' && post._recReason) ? `<span class="sq-rec-reason">${post._recReason}</span>` : '';

  let avatarClick = ''; let nameClick = '';
  if (post.isAnon) {
    if (AppState.isAdmin) {
      avatarClick = `onclick="window.sqViewProfile('${post.uid}')" style="cursor:pointer; border:2px solid var(--danger);" title="الاسم الحقيقي للإدارة: ${escapeHtml(getRealName(post.uid, post.authorName))}"`;
      nameClick = `onclick="window.sqViewProfile('${post.uid}')" style="cursor:pointer; color:var(--danger);"`;
    } else {
      avatarClick = `onclick="window.sqShowToast('نُشر كمجهول', 'warning')" style="cursor:default;"`;
      nameClick = `style="cursor:default;"`;
    }
  } else {
    avatarClick = hasStory ? `onclick="window.sqOpenUserStories('${post.uid}', 0)" style="cursor:pointer;" title="مشاهدة القصة"` : `onclick="window.sqViewProfile('${post.uid}')" style="cursor:pointer;"`;
    nameClick = `onclick="window.sqViewProfile('${post.uid}')" style="cursor:pointer;"`;
  }

  let sourceHtml = '';
  const linkedBookObj = post.linkedBookId ? AppState.booksList.find(b => b.id === post.linkedBookId) : (post.book ? AppState.booksList.find(b => b.title.trim() === post.book.trim()) : null);
  if (linkedBookObj) {
    const bst = window.sqGetBookStats(linkedBookObj);
    const bAuth = linkedBookObj.authorUid ? getRealName(linkedBookObj.authorUid, linkedBookObj.authorName) : (linkedBookObj.authorName || '');
    sourceHtml = `
      <div class="sq-attached-book-pill" onclick="event.stopPropagation(); window.sqOpenBookDetail('${linkedBookObj.id}')">
        <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
          <img src="${escapeHtml(linkedBookObj.cover || APP_LOGO_URL)}" style="width:36px; height:50px; object-fit:cover; border-radius:6px; border:1px solid var(--accent); flex-shrink:0;" loading="lazy">
          <div style="overflow:hidden;">
            <div style="font-size:12px; font-weight:900; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-solid fa-book-bookmark" style="color:var(--accent);"></i> ${escapeHtml(linkedBookObj.title)}</div>
            <div style="font-size:10.5px; color:var(--text-muted);">${escapeHtml(bAuth)} • <i class="fa-solid fa-star" style="color:#fbbf24;"></i> ${bst.avgRating}</div>
          </div>
        </div>
        <span style="font-size:11px; font-weight:800; color:var(--accent); flex-shrink:0;">صفحة الكتاب <i class="fa-solid fa-chevron-left"></i></span>
      </div>
    `;
  } else if (post.source || post.book) {
    sourceHtml = `<div class="sq-source-card">${post.source ? `<span class="sq-source-tag"><i class="fa-solid fa-feather" style="color:var(--accent);"></i> القائل: <strong style="color:var(--text-main);">${escapeHtml(post.source)}</strong></span>` : ''}${post.book ? `<span class="sq-source-tag"><i class="fa-solid fa-book-bookmark" style="color:var(--accent);"></i> الكتاب: <strong style="color:var(--text-main);">${escapeHtml(post.book)}</strong></span>` : ''}</div>`;
  }

  const canModerate = window.sqHasPermission('manage_mod');
  let options = '';
  if (!isStandalone) options += `<button onclick="window.sqOpenSinglePost('${post.id}')"><i class="fa-solid fa-expand" style="color:var(--text-main);"></i> فتح المنشور كاملاً</button>`;
  options += `<button onclick="window.sqCopyPost('${post.id}')"><i class="fa-regular fa-copy" style="color:var(--accent);"></i> نسخ النص مع الحقوق</button>`;
  options += `<button onclick="window.sqOpenShareModal('${post.id}')"><i class="fa-solid fa-image" style="color:var(--accent);"></i> بطاقة الاقتباس</button>`;
  if (!post.isAnon) options += `<button onclick="window.sqCloseAllMenus(); window.sqViewProfile('${post.uid}')"><i class="fa-regular fa-user"></i> الملف الشخصي</button>`;
  if (AppState.currentUser) {
    if (isOwner) options += `<button onclick="window.sqOpenPublishModal('${post.id}')"><i class="fa-solid fa-pen"></i> تعديل مساهمتي</button>`;
    if (isOwner || canModerate) {
      options += `<button onclick="window.sqToggleCommentsLock('${post.id}', ${post.commentsLocked || false})"><i class="fa-solid ${post.commentsLocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${post.commentsLocked ? 'فتح النقاش' : 'إغلاق النقاش'}</button>`;
      options += `<button style="color:var(--danger);" onclick="window.sqDeletePost('${post.id}')"><i class="fa-solid fa-trash-can"></i> حذف المنشور</button>`;
    }
    if (canModerate && !isOwner) options += `<button style="color:var(--danger);" onclick="window.sqCloseAllMenus(); window.sqToggleMute('${post.uid}', ${uData.isMuted || false})"><i class="fa-solid fa-microphone-slash"></i> ${uData.isMuted ? 'فك التقييد' : 'تقييد العضو'}</button>`;
    if (!isOwner && !canModerate) options += `<button style="color:var(--warning);" onclick="window.sqReportPost('${post.id}')"><i class="fa-solid fa-flag"></i> إبلاغ عن مخالفة</button>`;
  }

  const menuBtn = `<div class="sq-menu"><button class="sq-icon-btn" style="width:34px; height:34px; font-size:13px;" onclick="window.sqTogglePostMenu(event, '${post.id}')"><i class="fa-solid fa-ellipsis-vertical"></i></button><div class="sq-dropdown" id="drop-${post.id}" onclick="event.stopPropagation()">${options}</div></div>`;

  const isPoetic = post.textAlign === 'center' || post.category === 'quote';
  const textClass = 'sq-post-text' + (isPoetic ? ' poetic-center' : '');
  const rawText = decodeEntities(post.text || '');
  const isLongText = !isStandalone && (rawText.length > 250 || (rawText.match(/\n/g) || []).length >= 4);
  const displayedRaw = isLongText ? rawText.substring(0, 250) + '...' : rawText;
  const { textHtml, embedHtml } = parseContent(displayedRaw, post.podcastUrl || '');

  let bodyContentHtml = '';
  if (textHtml) {
    bodyContentHtml += `<div class="${textClass}" ${!isStandalone ? `onclick="window.sqOpenSinglePost('${post.id}')" style="cursor:pointer;"` : ''} ondblclick="event.stopPropagation(); window.sqDoubleTapLike('${post.id}', '${safeOwnerUidForLike}')">${textHtml}</div>`;
  }
  if (isLongText) {
    bodyContentHtml += `<div class="sq-open-single-hint" onclick="window.sqOpenSinglePost('${post.id}')">إكمال قراءة الخاطرة والمناقشة <i class="fa-solid fa-arrow-left"></i></div>`;
  }

  const postImages = (Array.isArray(post.images) && post.images.length) ? post.images : (post.imageUrl ? [post.imageUrl] : []);
  if (postImages.length > 0) {
    const trackId = `car-track-${post.id}-${isStandalone ? 's' : 'f'}`;
    const counterId = `car-cnt-${post.id}-${isStandalone ? 's' : 'f'}`;
    const slidesHtml = postImages.map(imgUrl => {
      const safeUrl = escapeHtml(imgUrl);
      const imgClick = isStandalone ? `window.sqOpenLightbox('${safeUrl}')` : `window.sqOpenSinglePost('${post.id}')`;
      return `<div class="sq-carousel-slide ${isStandalone ? 'single-full' : ''}"><img src="${safeUrl}" loading="lazy" onclick="${imgClick}" onerror="this.parentElement.style.display='none'"><button type="button" class="sq-img-dl-btn" onclick="window.sqDownloadDirectImage('${safeUrl}', event)" title="تحميل الصورة"><i class="fa-solid fa-download"></i></button></div>`;
    }).join('');

    bodyContentHtml += `
      <div class="sq-carousel-wrap">
        ${postImages.length > 1 ? `<div class="sq-carousel-counter" id="${counterId}">1 / ${postImages.length}</div>` : ''}
        ${postImages.length > 1 ? `<button type="button" class="sq-carousel-nav prev" onclick="window.sqScrollCarousel('${trackId}', 1, event)"><i class="fa-solid fa-chevron-right"></i></button><button type="button" class="sq-carousel-nav next" onclick="window.sqScrollCarousel('${trackId}', -1, event)"><i class="fa-solid fa-chevron-left"></i></button>` : ''}
        <div class="sq-carousel-track" id="${trackId}" onscroll="window.sqUpdateCarouselCounter(this, '${counterId}')">${slidesHtml}</div>
      </div>
    `;
  }

  bodyContentHtml += embedHtml;

  const flatComments = sqNormalizePostComments(post.comments || []);
  const likesCount = (post.likes || []).length;
  const timeDisplay = isStandalone ? `<i class="fa-regular fa-calendar-check" style="color:var(--accent);"></i> ${sqFormatExactTime(post.timestamp)}` : sqFormatRelativeTime(post.timestamp);

  let standaloneCommentsSection = '';
  if (isStandalone) {
    const treeCommentsHTML = sqRenderCommentTreeHTML(post.id, flatComments, null, 0, post.commentsLocked);
    let commentBoxUi = '';
    if (post.commentsLocked && !AppState.isAdmin) {
      commentBoxUi = `<p style="font-size:12px; text-align:center; color:var(--text-muted); font-weight:bold; margin-top:10px;"><i class="fa-solid fa-lock"></i> النقاش مغلق</p>`;
    } else if (AppState.currentUser) {
      if (AppState.userData.isMuted && !AppState.isAdmin) commentBoxUi = `<p style="font-size:12px; text-align:center; color:var(--danger); font-weight:bold; margin-top:10px;">حسابك مقيد من التعليق</p>`;
      else commentBoxUi = `<div style="display:flex; gap:8px; margin-top:12px;"><input type="text" id="c-in-${post.id}" class="sq-input" style="margin:0!important; border-radius:22px!important; background:var(--card)!important;" placeholder="اكتب تعليقاً أو شارك برأيك..." onkeyup="if(event.key==='Enter') window.sqAddTreeComment('${post.id}', null)"><button class="sq-btn sq-btn-gold" style="border-radius:50%!important; padding:0!important; width:40px!important; height:40px!important; flex-shrink:0;" onclick="window.sqAddTreeComment('${post.id}', null)"><i class="fa-solid fa-paper-plane" style="font-size:13px;"></i></button></div>`;
    } else {
      commentBoxUi = `<p style="font-size:12px; text-align:center; color:var(--text-muted); font-weight:bold; margin-top:10px;">سجل دخولك للمشاركة في النقاش</p>`;
    }
    standaloneCommentsSection = `
      <div style="margin-top:14px; background:var(--bg); padding:13px; border-radius:15px; border:1px solid var(--border);">
        <h4 style="font-size:13.5px; margin-bottom:10px; color:var(--text-main); display:flex; align-items:center; gap:6px;"><i class="fa-regular fa-comments" style="color:var(--accent);"></i> النقاشات والتعليقات (${flatComments.length})</h4>
        <div id="comments-tree-${post.id}">${treeCommentsHTML || '<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">كن أول من يفتتح النقاش هنا...</p>'}</div>
        ${commentBoxUi}
      </div>
    `;
  }

  return `
    <article class="sq-post ${post.postType === 'featured' ? 'featured-post' : ''}" id="post-${post.id}">
      <div id="heart-burst-${post.id}"></div>
      <div class="sq-post-top-meta">
        <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
          <span class="sq-cat-badge" onclick="window.sqFilterByCategory('${catKey}')"><i class="fa-solid ${catObj.icon}" style="color:var(--accent);"></i> ${catObj.label}</span>
          ${recBadgeHtml} ${statusBadge}
        </div>
        <span class="sq-read-time"><i class="fa-regular fa-eye" style="color:var(--accent);"></i> <span id="view-cnt-${post.id}">${viewsCount}</span> • <i class="fa-regular fa-clock"></i> ${readMins} د</span>
      </div>
      <div class="sq-post-header">
        <div class="sq-user-meta">
          <div class="sq-avatar-wrap ${hasStory ? 'sq-has-story-ring' : ''}">
            <img src="${actualPhoto}" class="sq-avatar" ${avatarClick} loading="lazy">
            ${isOnline ? '<span class="sq-online-dot"></span>' : ''}
          </div>
          <div>
            <div class="sq-name"><span ${nameClick}>${actualAuthorName}</span> ${roleBadge} ${quickFollowHtml}</div>
            <div class="sq-time"><span onclick="window.sqOpenSinglePost('${post.id}')">${timeDisplay}</span> ${readingNowSubHtml}</div>
          </div>
        </div>
        ${menuBtn}
      </div>
      ${bodyContentHtml}
      ${sourceHtml}
      <div class="sq-actions">
        <div style="display:flex; align-items:center; gap:4px;" id="like-wrap-${post.id}">
          <button class="sq-action-btn" id="like-btn-${post.id}" style="${hasLiked ? 'color:var(--danger);' : ''}" onclick="window.sqLike('${post.id}', '${safeOwnerUidForLike}')">
            <i class="${hasLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> <span>${likesCount || 'إعجاب'}</span>
          </button>
          ${likesCount > 0 ? `<span class="sq-likes-who-btn" onclick="window.sqOpenLikesModal('${post.id}')">مين أعجب؟</span>` : ''}
        </div>
        <button class="sq-action-btn" id="comment-btn-${post.id}" onclick="${isStandalone ? `if(document.getElementById('c-in-${post.id}')) document.getElementById('c-in-${post.id}').focus()` : `window.sqOpenSinglePost('${post.id}')`}">
          <i class="fa-regular fa-comment"></i> <span>${flatComments.length ? flatComments.length + ' تعليق' : 'مناقشة'}</span> ${post.commentsLocked ? '<i class="fa-solid fa-lock" style="font-size:10px;"></i>' : ''}
        </button>
        <button class="sq-action-btn" onclick="window.sqOpenShareModal('${post.id}')"><i class="fa-solid fa-share-nodes" style="color:var(--accent);"></i> مشاركة</button>
        <button class="sq-action-btn" id="bookmark-btn-${post.id}" style="${isBookmarked ? 'color:var(--accent);' : ''}" onclick="window.sqBookmark('${post.id}')"><i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i></button>
      </div>
      ${standaloneCommentsSection}
    </article>
  `;
};

window.sqOpenSinglePost = function(postId) {
  window.sqCloseAllMenus();
  AppState.viewingPostId = postId;
  const post = AppState.posts.find(p => p.id === postId);
  if (post && post.linkedBookId) {
    const b = AppState.booksList.find(x => x.id === post.linkedBookId);
    if (b) window.SafaqatAI.trackSignal('book', b, 2);
  }
  window.sqRecordPostView(postId);
  window.sqSwitchMainView('single_post');
  window.sqRenderSinglePostView();
};

window.sqRecordPostView = function(postId) {
  if (!postId) return;
  const vKey = 'sq_pv_' + postId;
  if (sessionStorage.getItem(vKey)) return;
  sessionStorage.setItem(vKey, '1');
  const p = AppState.posts.find(x => x.id === postId);
  if (p) {
    p.views = (p.views || 1) + 1;
    const vEl = document.getElementById('view-cnt-' + postId);
    if (vEl) vEl.innerText = p.views;
  }
  db.collection("safaqat_quotes").doc(postId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
};

window.sqRenderSinglePostView = function() {
  const container = document.getElementById('sq-view-single-post');
  if (!container) return;
  const post = AppState.posts.find(p => p.id === AppState.viewingPostId);
  if (!post) {
    container.innerHTML = `<div class="sq-hub-card" style="text-align:center; padding:35px 20px;"><p style="color:var(--text-muted); margin-bottom:12px;">هذا المنشور غير موجود أو تم حذفه.</p><button class="sq-btn" onclick="window.sqSwitchMainView('community', true)"><i class="fa-solid fa-arrow-right"></i> العودة للمجتمع</button></div>`;
    return;
  }

  const authorName = post.isAnon ? 'كاتب مجهول' : getRealName(post.uid, post.authorName);
  const snippet = decodeEntities(post.text || '').substring(0, 75);
  window.sqUpdateDynamicSEO(
    `${authorName}: "${snippet}"`,
    post.text || '',
    (Array.isArray(post.images) && post.images[0]) ? post.images[0] : (post.imageUrl || APP_LOGO_URL),
    false,
    {
      "@context": "https://schema.org",
      "@type": "SocialMediaPosting",
      "headline": snippet,
      "author": { "@type": "Person", "name": decodeEntities(authorName) },
      "articleBody": decodeEntities(post.text || '')
    }
  );

  container.innerHTML = `
    <div class="sq-inpage-topbar">
      <div class="sq-inpage-title"><i class="fa-solid fa-feather-pointed" style="color:var(--accent);"></i> عرض المساهمة والحوار</div>
      <button class="sq-back-pill" onclick="window.sqSwitchMainView('community', true)"><i class="fa-solid fa-arrow-left"></i> المجتمع</button>
    </div>
    ${window.sqBuildSinglePostHTML(post, true)}
  `;
};

window.sqPatchPostInteractivity = function(postId) {
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const hasLiked = AppState.currentUser && (post.likes || []).includes(AppState.currentUser.uid);
  const isBookmarked = AppState.currentUser && (AppState.userData.bookmarks || []).includes(post.id);
  const likesCount = (post.likes || []).length;
  const flatComments = sqNormalizePostComments(post.comments || []);
  const safeOwnerUid = post.isAnon ? '' : post.uid;

  const likeWrap = document.getElementById(`like-wrap-${postId}`);
  if (likeWrap) {
    likeWrap.innerHTML = `
      <button class="sq-action-btn" id="like-btn-${post.id}" style="${hasLiked ? 'color:var(--danger);' : ''}" onclick="window.sqLike('${post.id}', '${safeOwnerUid}')">
        <i class="${hasLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> <span>${likesCount || 'إعجاب'}</span>
      </button>
      ${likesCount > 0 ? `<span class="sq-likes-who-btn" onclick="window.sqOpenLikesModal('${post.id}')">مين أعجب؟</span>` : ''}
    `;
  }
  const cBtn = document.getElementById(`comment-btn-${postId}`);
  if (cBtn) cBtn.innerHTML = `<i class="fa-regular fa-comment"></i> <span>${flatComments.length ? flatComments.length + ' تعليق' : 'مناقشة'}</span> ${post.commentsLocked ? '<i class="fa-solid fa-lock" style="font-size:10px;"></i>' : ''}`;
  const bBtn = document.getElementById(`bookmark-btn-${postId}`);
  if (bBtn) { bBtn.style.color = isBookmarked ? 'var(--accent)' : ''; bBtn.innerHTML = `<i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>`; }

  const treeContainer = document.getElementById(`comments-tree-${postId}`);
  if (treeContainer) {
    treeContainer.innerHTML = sqRenderCommentTreeHTML(post.id, flatComments, null, 0, post.commentsLocked) || '<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">كن أول من يفتتح النقاش هنا...</p>';
  }
};

window.sqLoadFeed = function() {
  if (AppState.feedUnsubscribe) AppState.feedUnsubscribe();
  AppState.feedUnsubscribe = db.collection("safaqat_quotes").orderBy("timestamp", "desc").limit(AppState.postLimit).onSnapshot(snap => {
    const newPosts = [];
    snap.forEach(doc => newPosts.push({ id: doc.id, ...doc.data() }));
    const oldIdsSig = AppState.posts.map(p => p.id + '_' + (p.text || '').length + '_' + (p.comments || []).length + '_' + (p.likes || []).length).join('|');
    const newIdsSig = newPosts.map(p => p.id + '_' + (p.text || '').length + '_' + (p.comments || []).length + '_' + (p.likes || []).length).join('|');
    AppState.posts = newPosts;
    try { localStorage.setItem('sq_offline_posts_cache', JSON.stringify(AppState.posts.slice(0, 25))); } catch (e) {}

    if (!AppState.deepLinkHandled) {
      const urlParams = new URLSearchParams(window.location.search);
      const targetPost = urlParams.get('post');
      const targetProf = urlParams.get('profile');
      const targetView = urlParams.get('view');
      const targetPage = urlParams.get('page');
      if (targetPost) {
        AppState.deepLinkHandled = true;
        if (AppState.posts.some(p => p.id === targetPost)) {
          window.sqOpenSinglePost(targetPost);
        } else {
          db.collection("safaqat_quotes").doc(targetPost).get().then(doc => {
            if (doc.exists) {
              AppState.posts.unshift({ id: doc.id, ...doc.data() });
              window.sqOpenSinglePost(targetPost);
            }
          });
        }
        return;
      } else if (targetProf) {
        AppState.deepLinkHandled = true;
        window.sqViewProfile(targetProf);
        return;
      } else if (targetView === 'publishers') {
        AppState.deepLinkHandled = true;
        window.sqSwitchMainView('publishers_directory');
        return;
      } else if (targetView === 'community') {
        AppState.deepLinkHandled = true;
        window.sqSwitchMainView('community');
      } else if (targetPage) {
        AppState.deepLinkHandled = true;
        window.sqOpenLegalPage(targetPage, false);
      }
    }

    if (oldIdsSig !== newIdsSig) {
      if (AppState.activeMainView === 'community') window.sqRenderFeed(false);
      if (AppState.activeMainView === 'single_post' && AppState.viewingPostId) window.sqPatchPostInteractivity(AppState.viewingPostId);
    }
  }, err => {
    console.warn("Feed Listener Error:", err);
  });
};

window.sqRenderFeed = function(forceRebuild = false) {
  const container = document.getElementById('sq-feed-container'); if (!container) return;
  const myBlocked = (AppState.userData && AppState.userData.blockedUsers) ? AppState.userData.blockedUsers : [];
  let filtered = AppState.posts.filter(p => !myBlocked.includes(p.uid));

  if (AppState.currentFilter === 'for_you') filtered = sqGetSmartRankedPosts(filtered);
  else if (AppState.currentFilter === 'following' && AppState.currentUser) {
    const myFollowSet = new Set(AppState.userData.following || []);
    filtered = filtered.filter(p => !p.isAnon && myFollowSet.has(p.uid));
  } else if (AppState.currentFilter === 'bookmarks' && AppState.currentUser) {
    filtered = filtered.filter(p => (AppState.userData.bookmarks || []).includes(p.id));
  }

  if (AppState.activeCategoryFilter) filtered = filtered.filter(p => (p.category || 'literature') === AppState.activeCategoryFilter);

  const feedTitle = document.getElementById('sq-feed-title');
  if (AppState.activeCategoryFilter && POST_CATEGORIES[AppState.activeCategoryFilter]) {
    feedTitle.style.display = 'block';
    feedTitle.innerHTML = `تصنيف: <span style="color:var(--accent);">${POST_CATEGORIES[AppState.activeCategoryFilter].label}</span> <button onclick="window.sqFilterByCategory('${AppState.activeCategoryFilter}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:11.5px; font-weight:bold; margin-right:6px;">(إلغاء)</button>`;
  } else { feedTitle.style.display = 'none'; }

  if (AppState.searchQuery) {
    const q = AppState.searchQuery;
    filtered = filtered.filter(p => {
      const realAuthor = p.isAnon ? '' : getRealName(p.uid, p.authorName).toLowerCase();
      const shortSkid = p.isAnon ? '' : ('sk-' + p.uid.substring(0, 6)).toLowerCase();
      return decodeEntities(p.text || '').toLowerCase().includes(q) || decodeEntities(p.source || '').toLowerCase().includes(q) || decodeEntities(p.book || '').toLowerCase().includes(q) || realAuthor.includes(q) || shortSkid.includes(q);
    });
  }

  const structSig = AppState.currentFilter + '_' + (AppState.activeCategoryFilter || '') + '_' + AppState.searchQuery + '_' + filtered.map(p => p.id + '_' + (p.text || '').length).join(',');
  if (!forceRebuild && AppState.renderedPostSignature === structSig && container.children.length > 0) {
    filtered.forEach(p => window.sqPatchPostInteractivity(p.id));
    return;
  }
  AppState.renderedPostSignature = structSig;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:45px 20px; color:var(--text-muted); background:var(--card); border-radius:var(--radius-xl); border:1px solid var(--border);"><i class="fa-solid fa-feather fa-2x" style="margin-bottom:10px; opacity:0.35; color:var(--accent);"></i><br><strong>ما لقينا مساهمات مطابقة في القسم ده حالياً.</strong></div>`;
    return;
  }

  let htmlParts = [];
  filtered.forEach((post) => {
    htmlParts.push(window.sqBuildSinglePostHTML(post, false));
  });

  if (AppState.posts.length >= AppState.postLimit && !AppState.searchQuery) {
    htmlParts.push(`<div style="text-align:center; margin:16px 0;"><button class="sq-btn sq-btn-outline" onclick="window.sqLoadMore()"><i class="fa-solid fa-angles-down"></i> هات المزيد من المساهمات</button></div>`);
  }
  container.innerHTML = htmlParts.join('');
};

window.sqLoadMore = function() { AppState.postLimit += 25; window.sqLoadFeed(); };

window.sqFilterFeed = function(type) {
  if (!AppState.currentUser && (type === 'following' || type === 'bookmarks')) {
    sqShowToast("سجل دخولك الأول عشان تتصفح القسم ده", "warning");
    return window.sqLogin();
  }
  AppState.currentFilter = type; AppState.activeCategoryFilter = null;
  document.querySelectorAll('#sq-tabs-bar .sq-tab-pill').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${type}`)?.classList.add('active');
  AppState.renderedPostSignature = '';
  window.sqRenderFeed(true);
};

window.sqDoubleTapLike = function(postId, ownerUid) {
  if (!AppState.currentUser) return sqShowToast("سجل دخولك الأول عشان تعجب بالمساهمة", "warning");
  const burstContainer = document.getElementById(`heart-burst-${postId}`);
  if (burstContainer) { burstContainer.innerHTML = `<i class="fa-solid fa-heart sq-heart-burst"></i>`; setTimeout(() => { burstContainer.innerHTML = ''; }, 850); }
  const post = AppState.posts.find(p => p.id === postId);
  if (post && !(post.likes || []).includes(AppState.currentUser.uid)) window.sqLike(postId, ownerUid);
};

window.sqLike = function(postId, ownerUid) {
  if (!AppState.currentUser) return sqShowToast("سجل دخولك الأول عشان تعجب بالمساهمة", "warning");
  const post = AppState.posts.find(p => p.id === postId); if (!post) return;
  const uid = AppState.currentUser.uid;
  const hasLiked = (post.likes || []).includes(uid);
  if (hasLiked) post.likes = (post.likes || []).filter(id => id !== uid);
  else {
    if (!post.likes) post.likes = [];
    post.likes.push(uid);
    if (post.linkedBookId) {
      const b = AppState.booksList.find(x => x.id === post.linkedBookId);
      if (b) window.SafaqatAI.trackSignal('book', b, 3);
    }
  }
  window.sqPatchPostInteractivity(postId);

  const ref = db.collection("safaqat_quotes").doc(postId);
  if (hasLiked) ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(uid) });
  else {
    ref.update({ likes: firebase.firestore.FieldValue.arrayUnion(uid) });
    const realTargetUid = ownerUid || post.uid;
    if (realTargetUid && realTargetUid !== uid) window.sqSendNotif(realTargetUid, postId, `أُعجب ${getRealName(uid, AppState.currentUser.displayName)} بمساهمتك.`);
  }
};

window.sqBookmark = function(postId) {
  if (!AppState.currentUser) return sqShowToast("سجل دخولك لحفظ المساهمات", "warning");
  const isBooked = (AppState.userData.bookmarks || []).includes(postId);
  if (isBooked) AppState.userData.bookmarks = AppState.userData.bookmarks.filter(id => id !== postId);
  else AppState.userData.bookmarks.push(postId);
  window.sqPatchPostInteractivity(postId);

  const ref = db.collection("safaqat_users").doc(AppState.currentUser.uid);
  if (isBooked) { ref.update({ bookmarks: firebase.firestore.FieldValue.arrayRemove(postId) }); sqShowToast("أُزيلت من المحفوظات", "warning"); }
  else { ref.update({ bookmarks: firebase.firestore.FieldValue.arrayUnion(postId) }); sqShowToast("يا فنان! حُفظت في مفضلتك", "success"); }
};
/* =========================================================
   المحرك البرمجي الشامل — الإصدار 1.8
   File: app.js (الجزء 4 من 5)
   يشمل: تثبيت التطبيق المحسّن لمتصفح جالكسي (PWA)، المظهر الذكي،
         الترابط الشبكي، الملف الشخصي بالقائمة المنسدلة الموحدة،
         حماية الصلاحيات السيادية (Super Admins)، والإعدادات والسياسات
   ========================================================= */

// =========================================================
// 📲 محرك تثبيت التطبيق المتوافق مع متصفح جالكسي (Samsung Internet) وكروم
// =========================================================
function sqInitPWAAndOffline() {
  window.sqRefreshPwaManifest();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.deferredPwaPrompt = e;
  });
  const updateNetStatus = () => {
    const bar = document.getElementById('sq-offline-bar');
    if (bar) bar.style.display = navigator.onLine ? 'none' : 'flex';
  };
  window.addEventListener('online', updateNetStatus);
  window.addEventListener('offline', updateNetStatus);
  updateNetStatus();

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if ((AppState.userData && AppState.userData.theme) === 'auto') {
        window.sqApplyThemeMode('auto');
      }
    });
  }
}

window.sqRefreshPwaManifest = function() {
  try {
    const startUrl = CURRENT_DOMAIN_ORIGIN + window.location.pathname;
    const manifestObj = {
      id: startUrl,
      name: APP_NAME,
      short_name: APP_NAME,
      description: APP_NAME + " — المتجر الرسمي للكتب والمجتمع الأدبي",
      lang: "ar",
      dir: "rtl",
      start_url: startUrl,
      scope: startUrl,
      display: "standalone",
      background_color: "#0b1120",
      theme_color: "#0b1120",
      orientation: "portrait",
      icons: [
        { src: APP_LOGO_URL, sizes: "192x192", type: "image/jpeg", purpose: "any maskable" },
        { src: APP_LOGO_URL, sizes: "512x512", type: "image/jpeg", purpose: "any maskable" }
      ]
    };
    // استخدام Data URI بدلاً من Blob لضمان التوافق التام مع متصفح سامسونج جالكسي
    const dataUri = "data:application/manifest+json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifestObj));
    const manifestEl = document.getElementById('sq-pwa-manifest');
    if (manifestEl) manifestEl.setAttribute('href', dataUri);
  } catch (e) {}
};

window.sqTriggerPwaInstall = async function() {
  if (AppState.deferredPwaPrompt) {
    try {
      AppState.deferredPwaPrompt.prompt();
      const { outcome } = await AppState.deferredPwaPrompt.userChoice;
      if (outcome === 'accepted') {
        AppState.deferredPwaPrompt = null;
        sqShowToast("يا هلا! جاري تثبيت تطبيق " + APP_NAME + " على جهازك", "success");
      }
      return;
    } catch (e) {}
  }

  const ua = navigator.userAgent || '';
  const isSamsung = /SamsungBrowser/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;

  if (isSamsung) {
    sqShowToast("في متصفح جالكسي: اضغط قائمة الخطوط (≡) بالأسفل ثم اختر (إضافة صفحة إلى) ثم (الشاشة الرئيسية)", "warning");
  } else if (isIOS) {
    sqShowToast("في آيفون: اضغط أيقونة المشاركة بالأسفل ثم اختر (إضافة إلى الشاشة الرئيسية)", "warning");
  } else {
    sqShowToast("لتثبيت التطبيق: افتح قائمة المتصفح العلوية (⋮) واختر (تثبيت التطبيق / الإضافة إلى الشاشة الرئيسية)", "warning");
  }
};

window.sqApplyThemeMode = function(mode) {
  const cleanMode = mode || localStorage.getItem('sq_theme_pref') || 'light';
  localStorage.setItem('sq_theme_pref', cleanMode);
  if (cleanMode === 'dark') {
    document.body.classList.add('sq-dark-mode');
  } else if (cleanMode === 'light') {
    document.body.classList.remove('sq-dark-mode');
  } else {
    const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('sq-dark-mode', Boolean(sysDark));
  }
};

window.sqSetThemeMode = function(mode) {
  AppState.userData.theme = mode;
  window.sqApplyThemeMode(mode);
  if (AppState.currentUser) {
    db.collection("safaqat_users").doc(AppState.currentUser.uid).update({ theme: mode }).catch(() => {});
  }
  if (AppState.activeMainView === 'settings_page') window.sqRenderSettingsPage();
  sqShowToast("تم تحديث مظهر المنصة", "success");
};

window.sqSetFontSize = function(size) {
  document.documentElement.style.setProperty('--post-font-size', size);
  AppState.userData.fontSize = size;
  if (AppState.currentUser) {
    db.collection("safaqat_users").doc(AppState.currentUser.uid).update({ fontSize: size }).catch(() => {});
  }
  if (AppState.activeMainView === 'settings_page') window.sqRenderSettingsPage();
  sqShowToast("تم ضبط حجم خط القراءة", "success");
};

// =========================================================
// 🏅 حساب المتابعين والمستويات وحالة الاتصال
// =========================================================
window.sqGetFollowersList = function(targetUid) {
  const list = [];
  Object.keys(AppState.allUsers).forEach(uid => {
    if (uid === targetUid) return;
    const u = AppState.allUsers[uid] || {};
    if ((u.following || []).includes(targetUid) || (u.friends || []).includes(targetUid)) {
      list.push(uid);
    }
  });
  return list;
};

window.sqGetFollowingList = function(targetUid) {
  const u = AppState.allUsers[targetUid] || {};
  const set = new Set([...(u.following || []), ...(u.friends || [])]);
  set.delete(targetUid);
  return Array.from(set);
};

window.sqGetUserLevelInfo = function(uid) {
  const userPosts = AppState.posts.filter(p => p.uid === uid && !p.isAnon);
  const postsCount = userPosts.length;
  const likesReceived = userPosts.reduce((s, p) => s + ((p.likes || []).length), 0);
  const viewsReceived = userPosts.reduce((s, p) => s + (p.views || 1), 0);
  const followersCount = window.sqGetFollowersList(uid).length;
  let commentsCount = 0;
  AppState.posts.forEach(p => { (p.comments || []).forEach(c => { if (c.uid === uid) commentsCount++; }); });
  const pts = (postsCount * 12) + (likesReceived * 3) + (commentsCount * 4) + (followersCount * 5);

  const levels = [
    { lvl: 1, title: 'قارئ شغوف', tier: 'برونزي', iconHtml: '<i class="fa-solid fa-seedling" style="color:#b45309;"></i>', min: 0, next: 60 },
    { lvl: 2, title: 'قلم واعد', tier: 'فضي', iconHtml: '<i class="fa-solid fa-feather" style="color:#64748b;"></i>', min: 60, next: 180 },
    { lvl: 3, title: 'أديب متألق', tier: 'ذهبي', iconHtml: '<i class="fa-solid fa-trophy" style="color:#d4af37;"></i>', min: 180, next: 400 },
    { lvl: 4, title: 'حكيم المجتمع', tier: 'ألماسي', iconHtml: '<i class="fa-solid fa-gem" style="color:#0284c7;"></i>', min: 400, next: 800 },
    { lvl: 5, title: 'عميد صفقات', tier: 'ملكي', iconHtml: '<i class="fa-solid fa-crown" style="color:#9333ea;"></i>', min: 800, next: 2000 }
  ];
  let cur = levels[0];
  for (let i = 0; i < levels.length; i++) { if (pts >= levels[i].min) cur = levels[i]; }
  const progress = cur.lvl === 5 ? 100 : Math.min(100, Math.round(((pts - cur.min) / (cur.next - cur.min)) * 100));
  const remaining = Math.max(0, cur.next - pts);
  return { ...cur, pts, progress, remaining, postsCount, likesReceived, viewsReceived, followersCount };
};

window.sqIsUserOnline = function(uid) {
  const u = AppState.allUsers[uid];
  if (!u || u.showOnline === false || !u.lastActive) return false;
  return (Date.now() - u.lastActive) < 270000;
};

window.sqGetOnlineStatusText = function(uid) {
  const u = AppState.allUsers[uid];
  if (!u || u.showOnline === false || !u.lastActive) return 'عضو في ' + APP_NAME;
  if (window.sqIsUserOnline(uid)) return 'متصل الآن';
  return 'آخر ظهور ' + sqFormatRelativeTime(u.lastActive);
};

// =========================================================
// 🔗 محرك الترابط الشبكي بين دور النشر والكُتّاب والكتب
// =========================================================
window.sqGetPublisherAuthorsList = function(pubUid) {
  const authorUidsSet = new Set();
  const isMainDar = (pubUid === 'DAR_MAIN' || sqIsAdminUid(pubUid));

  AppState.booksList.forEach(b => {
    if (!b.authorUid) return;
    if (isMainDar && (!b.publisherUid || b.publisherUid === 'DAR_MAIN' || b.publisherUid === pubUid)) {
      authorUidsSet.add(b.authorUid);
    } else if (b.publisherUid === pubUid) {
      authorUidsSet.add(b.authorUid);
    }
  });

  Object.keys(AppState.allUsers).forEach(uKey => {
    const u = AppState.allUsers[uKey] || {};
    const linked = Array.isArray(u.linkedPublishers) ? u.linkedPublishers : [];
    if (linked.includes(pubUid) || (isMainDar && linked.includes('DAR_MAIN'))) {
      authorUidsSet.add(uKey);
    }
  });

  return Array.from(authorUidsSet);
};

window.sqGetAuthorPublishersList = function(authorUid) {
  const pubUidsSet = new Set();
  const u = AppState.allUsers[authorUid] || {};
  if (Array.isArray(u.linkedPublishers)) {
    u.linkedPublishers.forEach(p => { if (p) pubUidsSet.add(p); });
  }
  AppState.booksList.forEach(b => {
    if (b.authorUid === authorUid) {
      pubUidsSet.add(b.publisherUid || 'DAR_MAIN');
    }
  });
  return Array.from(pubUidsSet);
};

window.sqToggleLinkAuthorToPublisher = function(authorUid, pubUid) {
  if (!window.sqIsCurrentUserSuperAdmin() && (!AppState.currentUser || AppState.currentUser.uid !== pubUid)) {
    return sqShowToast("هذه الصلاحية للإدارة العليا أو دار النشر المعنية فقط", "danger");
  }
  const u = AppState.allUsers[authorUid] || {};
  const currentList = Array.isArray(u.linkedPublishers) ? [...u.linkedPublishers] : [];
  const exists = currentList.includes(pubUid);

  const updatedList = exists ? currentList.filter(id => id !== pubUid) : [...currentList, pubUid];
  db.collection("safaqat_users").doc(authorUid).update({
    isAuthor: true,
    linkedPublishers: updatedList
  }).then(() => {
    if (AppState.allUsers[authorUid]) {
      AppState.allUsers[authorUid].isAuthor = true;
      AppState.allUsers[authorUid].linkedPublishers = updatedList;
    }
    sqShowToast(exists ? "تم إلغاء ربط الكاتب بدار النشر" : "تم ربط الكاتب بدار النشر بنجاح!", "success");
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
    if (AppState.activeMainView === 'settings_page') window.sqRenderAdminSubContent();
  });
};

// =========================================================
// 👤 نظام المتابعة والملف الشخصي (بزر الإعدادات المنسدل الموحد والحماية السيادية)
// =========================================================
window.sqToggleFollowUser = function(targetUid, btnEl, e) {
  if (e) e.stopPropagation();
  if (!AppState.currentUser) {
    sqShowToast("نورتنا! سجل دخولك الأول عشان تتابع الكُتّاب ودور النشر", "warning");
    return window.sqLogin();
  }
  if (!targetUid || targetUid === AppState.currentUser.uid) return;

  const myUid = AppState.currentUser.uid;
  const currentFollowing = AppState.userData.following || [];
  const isFollowing = currentFollowing.includes(targetUid);

  if (isFollowing) {
    AppState.userData.following = currentFollowing.filter(id => id !== targetUid);
    if (AppState.allUsers[myUid]) AppState.allUsers[myUid].following = AppState.userData.following;
    if (btnEl) { btnEl.className = 'sq-follow-chip'; btnEl.innerHTML = '<i class="fa-solid fa-plus"></i> متابعة'; }
    db.collection("safaqat_users").doc(myUid).update({ following: firebase.firestore.FieldValue.arrayRemove(targetUid) });
    sqShowToast("تم إلغاء المتابعة", "warning");
  } else {
    AppState.userData.following = [...currentFollowing, targetUid];
    if (AppState.allUsers[myUid]) AppState.allUsers[myUid].following = AppState.userData.following;
    if (btnEl) { btnEl.className = 'sq-follow-chip following'; btnEl.innerHTML = '<i class="fa-solid fa-check"></i> متابَع'; }
    db.collection("safaqat_users").doc(myUid).update({ following: firebase.firestore.FieldValue.arrayUnion(targetUid) }).then(() => {
      window.sqSendNotif(targetUid, null, `بدأ ${getRealName(myUid, AppState.currentUser.displayName)} بمتابعة حسابك.`);
    });
    sqShowToast("يا هلا! تمت المتابعة وستظهر لك قصصه وإصداراته دائماً", "success");
  }
  window.sqRenderStoriesBar();
  if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
};

window.sqToggleBlockUser = function(targetUid) {
  if (!AppState.currentUser || targetUid === AppState.currentUser.uid) return;
  if (window.sqIsSuperAdminUid(targetUid)) return sqShowToast("لا يمكن حظر حساب الإدارة العليا", "danger");
  const myUid = AppState.currentUser.uid;
  const isBlocked = (AppState.userData.blockedUsers || []).includes(targetUid);
  if (isBlocked) {
    db.collection("safaqat_users").doc(myUid).update({ blockedUsers: firebase.firestore.FieldValue.arrayRemove(targetUid) }).then(() => {
      sqShowToast("تم فك الحظر", "success");
      if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
    });
  } else {
    if (!confirm("حظر هذا الحساب وإخفاء منشوراته؟")) return;
    db.collection("safaqat_users").doc(myUid).update({
      blockedUsers: firebase.firestore.FieldValue.arrayUnion(targetUid),
      following: firebase.firestore.FieldValue.arrayRemove(targetUid)
    }).then(() => {
      sqShowToast("تم حظر الحساب", "danger");
      window.sqSwitchMainView('store');
    });
  }
};

window.sqOnProfileAvatarClick = function() {
  const uid = AppState.viewedProfileUid;
  if (!uid) return;
  if (window.sqUserHasActiveStory(uid)) { window.sqOpenUserStories(uid, 0); }
  else { window.sqOpenLightbox(document.getElementById('sq-prof-avatar').src); }
};

window.sqToggleProfileCornerMenu = function(e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  const drop = document.getElementById('sq-prof-corner-dropdown');
  if (!drop) return;
  const isOpen = drop.style.display === 'flex';
  window.sqCloseAllMenus();
  if (!isOpen) drop.style.display = 'flex';
};

window.sqViewProfile = function(uid, defaultTab = null) {
  window.sqCloseAllMenus();
  if (!uid || uid === 'DAR_MAIN') {
    const mainAdm = Object.keys(AppState.allUsers).find(k => window.sqIsSuperAdminEmail(AppState.allUsers[k].email));
    if (mainAdm) uid = mainAdm;
    else { window.sqSwitchMainView('store'); return; }
  }
  AppState.viewedProfileUid = uid;
  const u = AppState.allUsers[uid] || {};
  if (defaultTab) {
    AppState.activeProfileTab = defaultTab;
  } else {
    AppState.activeProfileTab = (u.isPublisher || sqIsAdminUid(uid)) ? 'books' : 'posts';
  }
  window.sqSwitchMainView('profile_page');
  window.sqRenderProfilePage();
};

window.sqSwitchProfileTab = function(tabName) {
  AppState.activeProfileTab = tabName;
  window.sqRenderProfileTabContent();
};

window.sqCopySkid = function(skid) {
  if (navigator.clipboard) navigator.clipboard.writeText(skid).then(() => sqShowToast(`تم نسخ المعرف: ${skid}`, "success"));
};

window.sqRenderProfilePage = function() {
  const uid = AppState.viewedProfileUid; if (!uid) return;
  const userPosts = AppState.posts.filter(p => p.uid === uid && (!p.isAnon || AppState.isAdmin || (AppState.currentUser && AppState.currentUser.uid === uid)));
  const isMe = AppState.currentUser && AppState.currentUser.uid === uid;

  db.collection("safaqat_users").doc(uid).get().then(doc => {
    const d = doc.exists ? doc.data() : {
      displayName: "عضو في صفقات", photoURL: DEFAULT_PIC, following: [],
      savedBooks: [], readingShelf: {}, permissions: [], linkedPublishers: [], commissionRate: 10, bio: ""
    };
    AppState.allUsers[uid] = d;
    const isTargetSuperAdmin = window.sqIsSuperAdminEmail(d.email);
    const isProfileAdmin = Boolean(d.isAdminUser || isTargetSuperAdmin);
    const isProfilePub = Boolean(d.isPublisher || isProfileAdmin);
    const displayName = escapeHtml(getRealName(uid, d.displayName));
    const avatarUrl = getRealPhoto(uid, d.photoURL);
    const hasStory = window.sqUserHasActiveStory(uid);

    window.sqUpdateDynamicSEO(`${getRealName(uid, d.displayName)} — الملف الرسمي`, d.bio || `صفحة ${getRealName(uid, d.displayName)} في ${APP_NAME}`, avatarUrl, false);

    document.getElementById('sq-prof-avatar').src = avatarUrl;
    const ringWrap = document.getElementById('sq-prof-avatar-ring');
    const storyHint = document.getElementById('sq-prof-story-hint');
    if (ringWrap) ringWrap.className = 'sq-avatar-upload-wrapper' + (hasStory ? ' sq-has-story-ring' : '');
    if (storyHint) storyHint.style.display = hasStory ? 'block' : 'none';

    const camBtn = document.getElementById('sq-prof-cam-btn');
    if (camBtn) camBtn.style.display = isMe ? 'flex' : 'none';
    const onlineDot = document.getElementById('sq-prof-online-dot');
    if (onlineDot) onlineDot.style.display = window.sqIsUserOnline(uid) ? 'block' : 'none';

    // زر الإعدادات الموحد الأنيق في الزاوية اليسرى (يجمع الإعدادات، الإشعارات، الدعم، والقيادة)
    const topLeftBtns = document.getElementById('sq-prof-top-left-btns');
    if (topLeftBtns) {
      const unreadCount = AppState.notificationsList.filter(n => !n.read).length;
      const canSeeDashboard = AppState.isAdmin || window.sqIsStaffMember();
      topLeftBtns.innerHTML = isMe ? `
        <div class="sq-menu">
          <button class="sq-back-pill" style="border-color:var(--accent-border);" onclick="window.sqToggleProfileCornerMenu(event)">
            <i class="fa-solid fa-gear" style="color:var(--accent);"></i>
            <span>الإعدادات</span>
            ${unreadCount > 0 ? `<span style="background:var(--danger); color:#fff; padding:1px 6px; border-radius:10px; font-size:10px;">${unreadCount}</span>` : ''}
            <i class="fa-solid fa-chevron-down" style="font-size:10px; color:var(--text-muted);"></i>
          </button>
          <div class="sq-dropdown" id="sq-prof-corner-dropdown" style="left:0; right:auto; min-width:225px;" onclick="event.stopPropagation()">
            <button onclick="window.sqCloseAllMenus(); window.sqOpenSettingsPage('identity')">
              <i class="fa-solid fa-sliders" style="color:var(--accent);"></i> الإعدادات والمظهر والهوية
            </button>
            <button onclick="window.sqCloseAllMenus(); window.sqOpenSettingsPage('notifs')">
              <i class="fa-regular fa-bell" style="color:var(--accent);"></i> سجل الإشعارات
              ${unreadCount > 0 ? `<span style="background:var(--danger); color:#fff; padding:1px 6px; border-radius:10px; font-size:10px; margin-right:auto;">${unreadCount}</span>` : ''}
            </button>
            <button onclick="window.sqCloseAllMenus(); window.sqOpenSettingsPage('support')">
              <i class="fa-solid fa-headset" style="color:var(--accent);"></i> الدعم الفني والمراسلة
            </button>
            ${canSeeDashboard ? `
              <button style="color:var(--danger); font-weight:900;" onclick="window.sqCloseAllMenus(); window.sqOpenSettingsPage('admin')">
                <i class="fa-solid fa-shield-halved"></i> ${d.isPublisher && !AppState.isAdmin ? 'لوحة الدار والمبيعات' : 'غرفة القيادة والتسويات المالية'}
              </button>
            ` : ''}
            <button onclick="window.sqCloseAllMenus(); window.sqTriggerPwaInstall()">
              <i class="fa-solid fa-mobile-screen-button" style="color:var(--success);"></i> تثبيت التطبيق على الهاتف
            </button>
            <button style="color:var(--danger); border-top:1px dashed var(--border); margin-top:4px; padding-top:10px;" onclick="window.sqCloseAllMenus(); window.sqLogout()">
              <i class="fa-solid fa-arrow-right-from-bracket"></i> تسجيل الخروج
            </button>
          </div>
        </div>
      ` : '';
    }

    document.getElementById('sq-prof-name').innerHTML = `${displayName} ${window.getUserBadges(uid, false, isProfileAdmin, true)}`;
    const skidCode = 'SK-' + uid.substring(0, 6).toUpperCase();
    document.getElementById('sq-prof-skid-bar').innerHTML = `<span class="sq-status-pill" style="cursor:pointer; font-size:11px;" onclick="window.sqCopySkid('${skidCode}')"><i class="fa-solid fa-fingerprint" style="color:var(--accent);"></i> المعرف: <strong>${skidCode}</strong> <i class="fa-regular fa-copy"></i></span>`;

    let pillsHtml = `<span class="sq-status-pill"><i class="fa-solid fa-circle" style="font-size:7px; color:${window.sqIsUserOnline(uid) ? 'var(--success)' : 'var(--text-muted)'};"></i> ${window.sqGetOnlineStatusText(uid)}</span>`;
    if (d.statusText) pillsHtml += `<span class="sq-status-pill"><i class="fa-solid fa-quote-right" style="color:var(--accent);"></i> ${escapeHtml(d.statusText)}</span>`;
    if (d.nationality && COUNTRIES_MAP[d.nationality] && COUNTRIES_MAP[d.nationality].name) {
      pillsHtml += `<span class="sq-status-pill"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> ${COUNTRIES_MAP[d.nationality].name}</span>`;
    }
    if (d.currentlyReadingBookId) {
      const rBook = AppState.booksList.find(b => b.id === d.currentlyReadingBookId);
      if (rBook) pillsHtml += `<span class="sq-status-pill" style="cursor:pointer; border-color:var(--accent);" onclick="window.sqOpenBookDetail('${rBook.id}')"><i class="fa-solid fa-book-open-reader" style="color:var(--accent);"></i> يقرأ: <strong>${escapeHtml(rBook.title)}</strong></span>`;
    }
    document.getElementById('sq-prof-meta-pills').innerHTML = pillsHtml;

    const netBar = document.getElementById('sq-prof-network-bar');
    if (netBar) {
      let netHtml = '';
      if (isProfilePub) {
        const pubAuthors = window.sqGetPublisherAuthorsList(isProfileAdmin ? 'DAR_MAIN' : uid);
        const pubBooks = AppState.booksList.filter(b => isProfileAdmin ? (!b.publisherUid || b.publisherUid === 'DAR_MAIN' || b.publisherUid === uid) : (b.publisherUid === uid));
        netHtml += `
          <div style="display:inline-flex; flex-wrap:wrap; justify-content:center; gap:6px; background:var(--accent-soft); border:1px solid var(--accent-border); padding:7px 13px; border-radius:15px; margin-top:4px;">
            <span style="font-size:11.5px; font-weight:900; color:var(--text-main);"><i class="fa-solid fa-building-columns" style="color:var(--accent);"></i> ${isProfileAdmin ? 'الدار الرئيسية المعتمدة' : 'دار نشر معتمدة'}</span>
            <span style="font-size:11.5px; color:var(--text-muted);">• <strong>${pubBooks.length}</strong> إصدار</span>
            <span style="font-size:11.5px; color:var(--text-muted); cursor:pointer;" onclick="window.sqSwitchProfileTab('pub_authors')">• <strong>${pubAuthors.length}</strong> كاتب بالدار</span>
            ${(window.sqIsCurrentUserSuperAdmin() && !isProfileAdmin) ? `<span style="font-size:11px; color:var(--danger); font-weight:900;">• عمولة المنصة: ${d.commissionRate !== undefined ? d.commissionRate : 10}%</span>` : ''}
          </div>
        `;
      }
      const authorPubs = window.sqGetAuthorPublishersList(uid);
      if (authorPubs.length > 0 && !isProfileAdmin) {
        const pubsChips = authorPubs.map(pUid => {
          const isMain = (pUid === 'DAR_MAIN' || sqIsAdminUid(pUid));
          const pName = isMain ? APP_NAME : getRealName(pUid, 'دار نشر');
          const badge = isMain ? `<span class="sq-vbadge admin"><i class="fa-solid fa-check"></i></span>` : `<span class="sq-vbadge publisher"><i class="fa-solid fa-check"></i></span>`;
          return `<span class="sq-status-pill" style="cursor:pointer; border-color:var(--accent);" onclick="window.sqViewProfile('${pUid}', 'books')"><i class="fa-solid fa-building-columns" style="color:var(--accent);"></i> ينشر لدى: <strong>${escapeHtml(pName)}</strong> ${badge}</span>`;
        }).join('');
        netHtml += `<div style="margin-top:6px; display:flex; flex-wrap:wrap; justify-content:center; gap:5px;">${pubsChips}</div>`;
      }
      netBar.innerHTML = netHtml;
    }

    const lv = window.sqGetUserLevelInfo(uid);
    document.getElementById('sq-prof-level-wrap').innerHTML = `
      <div class="sq-level-box">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:800;">
          <span>${lv.iconHtml} المستوى ${lv.lvl}: <strong>${lv.title}</strong> (${lv.tier})</span>
          <span style="color:var(--accent);">${lv.pts} نقطة</span>
        </div>
        <div class="sq-level-bar-bg"><div class="sq-level-bar-fill" style="width:${lv.progress}%;"></div></div>
        <div style="font-size:10.5px; color:var(--text-muted); margin-top:4px; display:flex; justify-content:space-between;">
          <span>الإعجابات المستلمة: ${lv.likesReceived}</span>
          <span>${lv.lvl < 5 ? `متبقي ${lv.remaining} نقطة للمستوى التالي` : 'أعلى رتبة أدبية في المنصة'}</span>
        </div>
      </div>
    `;

    document.getElementById('sq-prof-bio').innerText = decodeEntities(d.bio || (isProfilePub ? `الصفحة الرسمية لـ ${getRealName(uid, d.displayName)} — تصفح أحدث الإصدارات والمؤلفين.` : `عضو في ${APP_NAME}.`));
    document.getElementById('sq-prof-posts').innerText = userPosts.length;
    document.getElementById('sq-prof-followers').innerText = window.sqGetFollowersList(uid).length;
    document.getElementById('sq-prof-following').innerText = window.sqGetFollowingList(uid).length;
    document.getElementById('sq-prof-views').innerText = lv.viewsReceived;

    const visitorActions = document.getElementById('sq-prof-visitor-actions');
    visitorActions.innerHTML = '';
    if (AppState.currentUser && !isMe) {
      const isFollowing = (AppState.userData.following || []).includes(uid);
      const isBlocked = (AppState.userData.blockedUsers || []).includes(uid);

      visitorActions.innerHTML = `
        <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:8px;">
          <button class="sq-btn ${isFollowing ? 'sq-btn-outline' : 'sq-btn-gold'}" style="min-width:155px;" onclick="window.sqToggleFollowUser('${uid}', null, event)">
            <i class="fa-solid ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i> ${isFollowing ? 'متابَع' : 'متابعة الحساب'}
          </button>
          ${!isTargetSuperAdmin ? `
            <button class="sq-btn sq-btn-outline" style="padding:7px 12px!important; color:var(--danger)!important;" onclick="window.sqToggleBlockUser('${uid}')" title="${isBlocked ? 'فك الحظر' : 'حظر'}">
              <i class="fa-solid fa-ban"></i>
            </button>
          ` : ''}
        </div>
      `;

      // 🛡️ لوحة التحكم السيادية (تظهر حصرياً للبريدين الأساسيين Super Admins، مع حماية البريدين من نزع صلاحيات بعضهما)
      if (window.sqIsCurrentUserSuperAdmin()) {
        if (isTargetSuperAdmin) {
          visitorActions.innerHTML += `
            <div style="margin-top:8px; padding:10px; background:rgba(239,68,68,0.1); border:1px solid var(--danger); border-radius:13px; font-size:12px; font-weight:800; color:var(--danger);">
              <i class="fa-solid fa-crown"></i> هذا أحد الحسابين السياديين الأساسيين للمنصة (محمي من نزع الصلاحيات).
            </div>
          `;
        } else {
          const userPerms = d.permissions || [];
          const userLinkedPubs = Array.isArray(d.linkedPublishers) ? d.linkedPublishers : [];
          const allPubsList = [{ uid: 'DAR_MAIN', name: APP_NAME }];
          Object.keys(AppState.allUsers).forEach(k => {
            if (AppState.allUsers[k] && AppState.allUsers[k].isPublisher && !window.sqIsSuperAdminEmail(AppState.allUsers[k].email)) {
              allPubsList.push({ uid: k, name: getRealName(k, AppState.allUsers[k].displayName) });
            }
          });

          visitorActions.innerHTML += `
            <div style="margin-top:10px; padding:13px; border:1.5px dashed var(--accent); background:var(--bg); border-radius:16px; text-align:right;">
              <div style="font-size:12.5px; color:var(--text-main); font-weight:900; margin-bottom:8px;"><i class="fa-solid fa-shield-halved" style="color:var(--accent);"></i> التحكم السيادي بالصلاحيات والرتب والعمولة:</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
                <button class="sq-btn" style="background:var(--author)!important; color:#fff!important; font-size:11px!important; padding:6px 11px!important;" onclick="window.sqToggleAuthor('${uid}', ${Boolean(d.isAuthor)})">
                  <i class="fa-solid fa-feather-pointed"></i> ${d.isAuthor ? 'انتزاع شارة الكاتب (الزرقاء)' : 'منح شارة الكاتب (الزرقاء)'}
                </button>
                <button class="sq-btn sq-btn-gold" style="font-size:11px!important; padding:6px 11px!important;" onclick="window.sqTogglePublisher('${uid}', ${Boolean(d.isPublisher)})">
                  <i class="fa-solid fa-building-columns"></i> ${d.isPublisher ? 'انتزاع ميزة دار النشر (الذهبية)' : 'منح ميزة دار نشر + تحديد العمولة'}
                </button>
                ${d.isPublisher ? `
                  <button class="sq-btn sq-btn-outline" style="font-size:11px!important; padding:6px 10px!important;" onclick="window.sqSetPublisherCommissionPrompt('${uid}',${d.commissionRate !== undefined ? d.commissionRate : 10})">
                    <i class="fa-solid fa-percent" style="color:var(--accent);"></i> تعديل العمولة (${d.commissionRate !== undefined ? d.commissionRate : 10}%)
                  </button>
                ` : ''}
                ${d.isAdminUser ? `
                  <button class="sq-btn" style="background:var(--danger)!important; color:#fff!important; font-size:11px!important; padding:6px 11px!important;" onclick="window.sqStripLegacyAdminFlag('${uid}')">
                    <i class="fa-solid fa-user-slash"></i> انتزاع شارة الإدارة الحمراء
                  </button>
                ` : ''}
                <button class="sq-btn" style="background:var(--warning)!important; color:#fff!important; font-size:11px!important; padding:6px 11px!important;" onclick="window.sqToggleMute('${uid}', ${Boolean(d.isMuted)})">${d.isMuted ? 'فك التقييد' : 'تقييد النشر'}</button>
                <button class="sq-btn" style="background:var(--danger)!important; color:#fff!important; font-size:11px!important; padding:6px 11px!important;" onclick="window.sqToggleBan('${uid}', ${Boolean(d.isBanned)})">${d.isBanned ? 'فك الحظر' : 'حظر الحساب'}</button>
              </div>

              <div style="font-size:11.5px; color:var(--text-main); font-weight:800; margin-bottom:5px;"><i class="fa-solid fa-diagram-project" style="color:var(--accent);"></i> ربط هذا الكاتب بدور النشر المعتمدة:</div>
              <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:10px;">
                ${allPubsList.map(p => {
                  const isLinked = userLinkedPubs.includes(p.uid);
                  return `<button class="sq-btn ${isLinked ? 'sq-btn-gold' : 'sq-btn-outline'}" style="padding:4px 10px!important; font-size:10.5px!important;" onclick="window.sqToggleLinkAuthorToPublisher('${uid}', '${p.uid}')"><i class="fa-solid ${isLinked ? 'fa-link' : 'fa-plus'}"></i> ${escapeHtml(p.name)}</button>`;
                }).join('')}
              </div>

              <div style="font-size:11.5px; color:var(--text-muted); font-weight:800; margin-bottom:5px;">منح أو انتزاع صلاحيات موظف لهذا الحساب:</div>
              <div style="display:flex; gap:5px; flex-wrap:wrap;">
                ${Object.keys(STAFF_PERMISSIONS_MAP).map(pk => {
                  const hasP = userPerms.includes(pk);
                  return `<button class="sq-btn ${hasP ? 'sq-btn-gold' : 'sq-btn-outline'}" style="padding:4px 9px!important; font-size:10.5px!important;" onclick="window.sqToggleStaffPermission('${uid}', '${pk}',${hasP})"><i class="fa-solid ${hasP ? 'fa-check' : 'fa-plus'}"></i> ${STAFF_PERMISSIONS_MAP[pk].label}</button>`;
                }).join('')}
                ${userPerms.length > 0 ? `<button class="sq-btn" style="background:var(--danger)!important; color:#fff!important; padding:4px 9px!important; font-size:10px!important;" onclick="window.sqRevokeAllUserRoles('${uid}')">سحب كافة الصلاحيات</button>` : ''}
              </div>
            </div>
          `;
        }
      }
    }

    const pubBooks = AppState.booksList.filter(b => isProfileAdmin ? (!b.publisherUid || b.publisherUid === 'DAR_MAIN' || b.publisherUid === uid) : (b.publisherUid === uid));
    const authorBooks = AppState.booksList.filter(b => b.authorUid === uid);
    const displayBooks = isProfilePub ? pubBooks : authorBooks;
    const pubAuthors = isProfilePub ? window.sqGetPublisherAuthorsList(isProfileAdmin ? 'DAR_MAIN' : uid) : [];

    const savedSet = new Set([...(d.savedBooks || []), ...Object.keys(d.readingShelf || {})]);
    const myLibraryCount = AppState.booksList.filter(b => savedSet.has(b.id)).length;

    const tabsBar = document.getElementById('sq-prof-tabs-bar');
    let tabsHtml = '';
    if (isProfilePub) {
      tabsHtml += `<button class="sq-hub-tab ${AppState.activeProfileTab === 'books' ? 'active' : ''}" onclick="window.sqSwitchProfileTab('books')"><i class="fa-solid fa-book"></i> إصدارات الدار (${displayBooks.length})</button>`;
      tabsHtml += `<button class="sq-hub-tab ${AppState.activeProfileTab === 'pub_authors' ? 'active' : ''}" onclick="window.sqSwitchProfileTab('pub_authors')"><i class="fa-solid fa-feather-pointed"></i> كُتّاب الدار (${pubAuthors.length})</button>`;
      tabsHtml += `<button class="sq-hub-tab ${AppState.activeProfileTab === 'posts' ? 'active' : ''}" onclick="window.sqSwitchProfileTab('posts')"><i class="fa-solid fa-newspaper"></i> المنشورات (${userPosts.length})</button>`;
      tabsHtml += `<button class="sq-hub-tab ${AppState.activeProfileTab === 'mylibrary' ? 'active' : ''}" onclick="window.sqSwitchProfileTab('mylibrary')"><i class="fa-solid fa-bookmark"></i> مكتبتي (${myLibraryCount})</button>`;
    } else {
      tabsHtml += `<button class="sq-hub-tab ${AppState.activeProfileTab === 'posts' ? 'active' : ''}" onclick="window.sqSwitchProfileTab('posts')"><i class="fa-solid fa-feather"></i> المساهمات (${userPosts.length})</button>`;
      if (d.isAuthor || displayBooks.length > 0) {
        tabsHtml += `<button class="sq-hub-tab ${AppState.activeProfileTab === 'books' ? 'active' : ''}" onclick="window.sqSwitchProfileTab('books')"><i class="fa-solid fa-book"></i> مؤلفاته (${displayBooks.length})</button>`;
      }
      tabsHtml += `<button class="sq-hub-tab ${AppState.activeProfileTab === 'mylibrary' ? 'active' : ''}" onclick="window.sqSwitchProfileTab('mylibrary')"><i class="fa-solid fa-bookmark"></i> مكتبتي (${myLibraryCount})</button>`;
    }
    tabsBar.innerHTML = tabsHtml;
    window.sqRenderProfileTabContent();
  });
};

window.sqRenderProfileTabContent = function() {
  const uid = AppState.viewedProfileUid;
  const isMe = AppState.currentUser && AppState.currentUser.uid === uid;
  const contentBox = document.getElementById('sq-prof-tab-content'); if (!contentBox) return;
  document.querySelectorAll('#sq-prof-tabs-bar .sq-hub-tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`#sq-prof-tabs-bar .sq-hub-tab[onclick*="${AppState.activeProfileTab}"]`)?.classList.add('active');

  const u = AppState.allUsers[uid] || {};
  const isProfileAdmin = Boolean(u.isAdminUser || window.sqIsSuperAdminEmail(u.email));
  const isProfilePub = Boolean(u.isPublisher || isProfileAdmin);

  if (AppState.activeProfileTab === 'posts') {
    const userPosts = AppState.posts.filter(p => p.uid === uid && (!p.isAnon || AppState.isAdmin || isMe));
    if (!userPosts.length) {
      contentBox.innerHTML = `<div class="sq-hub-card" style="text-align:center; padding:30px; color:var(--text-muted);">لا توجد مساهمات منشورة بعد.</div>`;
      return;
    }
    contentBox.innerHTML = userPosts.map(p => window.sqBuildSinglePostHTML(p, false)).join('');
  }
  else if (AppState.activeProfileTab === 'mylibrary') {
    const shelfMap = u.readingShelf || {};
    const savedSet = new Set([...(u.savedBooks || []), ...Object.keys(shelfMap)]);
    const myLibBooks = AppState.booksList.filter(b => savedSet.has(b.id));
    if (!myLibBooks.length) {
      contentBox.innerHTML = `
        <div class="sq-hub-card" style="text-align:center; padding:35px 20px; color:var(--text-muted);">
          <i class="fa-solid fa-bookmark fa-2x" style="color:var(--accent); opacity:0.45; margin-bottom:10px;"></i><br>
          <strong>المكتبة المحفوظة فارغة حالياً.</strong>
          <p style="font-size:12px; margin-top:4px;">اضغط على زر (حفظ بمكتبتي) أو (أقرؤه حالياً / قرأته) داخل صفحة أي كتاب ليظهر هنا.</p>
        </div>
      `;
      return;
    }
    const statusLabels = { reading: 'يقرؤه حالياً', read: 'أتم قراءته', want: 'محفوظ للقراءة' };
    contentBox.innerHTML = `<div class="sq-books-grid">` + myLibBooks.map(b => {
      const badgeTxt = shelfMap[b.id] ? statusLabels[shelfMap[b.id]] : 'في مكتبتي';
      const st = window.sqGetBookStats(b);
      return `
        <div class="sq-lib-book-card" onclick="window.sqOpenBookDetail('${b.id}')">
          <div>
            <div class="sq-lib-cover-wrap">
              <span class="sq-lib-badge-top"><i class="fa-solid fa-bookmark"></i> ${badgeTxt}</span>
              <img src="${escapeHtml(b.cover || APP_LOGO_URL)}" loading="lazy">
              <span class="sq-lib-rating-pill"><i class="fa-solid fa-star" style="color:#fbbf24;"></i> ${st.avgRating}</span>
            </div>
            <div class="sq-lib-book-title">${escapeHtml(b.title)}</div>
            <div class="sq-lib-book-author"><i class="fa-solid fa-feather" style="color:var(--accent); font-size:10px;"></i> <span>${escapeHtml(b.authorName || '')}</span></div>
          </div>
        </div>
      `;
    }).join('') + `</div>`;
  }
  else if (AppState.activeProfileTab === 'books') {
    const targetBooks = isProfilePub
      ? AppState.booksList.filter(b => isProfileAdmin ? (!b.publisherUid || b.publisherUid === 'DAR_MAIN' || b.publisherUid === uid) : (b.publisherUid === uid))
      : AppState.booksList.filter(b => b.authorUid === uid);

    if (!targetBooks.length) {
      contentBox.innerHTML = `
        <div class="sq-hub-card" style="text-align:center; padding:35px 20px; color:var(--text-muted);">
          <i class="fa-solid fa-book-open fa-2x" style="color:var(--accent); opacity:0.45; margin-bottom:10px;"></i><br>
          <strong>لم يتم رفع إصدارات في هذا القسم بعد.</strong>
          ${(isMe && window.sqHasPermission('manage_books')) || AppState.isAdmin ? `<br><button class="sq-btn sq-btn-gold" style="margin-top:12px;" onclick="window.sqOpenBookStudio(null)"><i class="fa-solid fa-plus"></i> رفع كتاب جديد الآن</button>` : ''}
        </div>
      `;
      return;
    }
    contentBox.innerHTML = `<div class="sq-books-grid">` + targetBooks.map(book => window.sqBuildBookCardHTML(book)).join('') + `</div>`;
  }
  else if (AppState.activeProfileTab === 'pub_authors') {
    const pubKey = isProfileAdmin ? 'DAR_MAIN' : uid;
    const authorUids = window.sqGetPublisherAuthorsList(pubKey);
    if (!authorUids.length) {
      contentBox.innerHTML = `
        <div class="sq-hub-card" style="text-align:center; padding:35px 20px; color:var(--text-muted);">
          <i class="fa-solid fa-users fa-2x" style="color:var(--accent); opacity:0.45; margin-bottom:10px;"></i><br>
          <strong>لم يتم ربط كُتّاب ومؤلفين بهذه الدار بعد.</strong>
          <p style="font-size:12px; margin-top:4px;">عند رفع كتاب وربطه بحساب الكاتب، أو ربط الكاتب بالدار، سيظهر هنا تلقائياً.</p>
        </div>
      `;
      return;
    }
    contentBox.innerHTML = `<div class="sq-hub-card" style="display:flex; flex-direction:column; gap:8px;">` + authorUids.map(aUid => {
      const au = AppState.allUsers[aUid] || {};
      const aName = escapeHtml(getRealName(aUid, au.displayName));
      const aPhoto = getRealPhoto(aUid, au.photoURL);
      const aBooksCount = AppState.booksList.filter(b => b.authorUid === aUid).length;
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:11px 14px; background:var(--bg); border:1px solid var(--border); border-radius:14px; cursor:pointer;" onclick="window.sqViewProfile('${aUid}', 'books')">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${aPhoto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid var(--author);">
            <div>
              <div style="font-weight:900; font-size:13.5px; color:var(--text-main);">${aName} ${window.getUserBadges(aUid, false, false, true)}</div>
              <div style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-book" style="color:var(--accent);"></i> ${aBooksCount} مؤلفات في المتجر</div>
            </div>
          </div>
          <span class="sq-btn sq-btn-outline" style="padding:5px 12px!important; font-size:11px!important;">مؤلفاته <i class="fa-solid fa-chevron-left"></i></span>
        </div>
      `;
    }).join('') + `</div>`;
  }
};

// =========================================================
// 📜 الصفحات الرسمية والخصوصية وشروط الاستخدام
// =========================================================
window.sqOpenLegalPage = function(tabName = 'about', isMandatoryFirstTime = false) {
  AppState.activeLegalPage = tabName;
  window.sqSwitchMainView('legal_page');
  const topbar = document.getElementById('sq-legal-topbar');
  if (topbar) topbar.style.display = isMandatoryFirstTime ? 'none' : 'flex';
  window.sqSwitchLegalTab(tabName, isMandatoryFirstTime);
};

window.sqSwitchLegalTab = function(tabName, isMandatory = false) {
  AppState.activeLegalPage = tabName;
  document.querySelectorAll('#sq-legal-tabs .sq-hub-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('legtab-' + tabName)?.classList.add('active');

  const box = document.getElementById('sq-legal-content-box');
  const actionsBox = document.getElementById('sq-legal-actions-box');
  if (!box || !actionsBox) return;

  if (tabName === 'about') {
    window.sqUpdateDynamicSEO('ماذا تعرف عن صفقات كتابية', `تعرف على رسالة ورؤية ${APP_NAME} للكتاب والأدب العربي`, APP_LOGO_URL, false);
    box.innerHTML = `
      <h3><i class="fa-solid fa-building-columns" style="color:var(--accent);"></i> ماذا تعرف عن ${escapeHtml(APP_NAME)}؟</h3>
      <p><strong>${escapeHtml(APP_NAME)}</strong> هي منصة أدبية وثقافية متكاملة ومتجر رسمي للإصدارات والكتب ودور النشر العربية، تجمع بين متعة اقتناء الكتاب الورقي والقراءة الآمنة وبين فضاء النقاش الأدبي والبودكاست.</p>
      <h3><i class="fa-solid fa-compass" style="color:var(--accent);"></i> رؤيتنا ورسالتنا</h3>
      <ul>
        <li>تمكين الكاتب العربي ودور النشر من إبراز المؤلفات والإصدارات وتوثيق حضورهم الأدبي في شبكة مترابطة واحدة.</li>
        <li>توفير تجربة تسوق وقراءة كتب سلسة ومباشرة بالعملات المتعددة وعبر الفواتير الفورية الموثقة (SK).</li>
        <li>بناء مجتمع قرائي حيوي يثري المحتوى العربي بالاقتباسات الموثقة والمراجعات النقدية والبودكاست الثقافي.</li>
      </ul>
    `;
  } else if (tabName === 'privacy') {
    window.sqUpdateDynamicSEO('سياسة الخصوصية وحماية البيانات', `سياسة الخصوصية وحماية بيانات الأعضاء والمشترين في ${APP_NAME}`, APP_LOGO_URL, false);
    box.innerHTML = `
      <h3><i class="fa-solid fa-user-shield" style="color:var(--accent);"></i> سياسة الخصوصية وحماية البيانات</h3>
      <p>نولي في <strong>${escapeHtml(APP_NAME)}</strong> أقصى درجات العناية لحماية خصوصية القراء والكُتّاب والمشترين وفق المعايير التالية:</p>
      <ul>
        <li><strong>بيانات الحساب:</strong> يتم التسجيل بأمان عبر مصادقة Google الرسمية، ولا تطلع المنصة على كلمات المرور الخاصة بك مطلقاً.</li>
        <li><strong>بيانات الفواتير والشحن:</strong> الأسماء الحقيقية وأرقام الهواتف والعناوين المدخلة في فواتير الشراء تُحفظ بشكل آمن ومحصور بقسم المبيعات ودار النشر المعنية لتوصيل طلبك.</li>
      </ul>
    `;
  } else {
    window.sqUpdateDynamicSEO('شروط الاستخدام وميثاق المجتمع', `شروط الاستخدام وميثاق النشر الأدبي في ${APP_NAME}`, APP_LOGO_URL, false);
    box.innerHTML = `
      <h3><i class="fa-solid fa-file-contract" style="color:var(--accent);"></i> شروط الاستخدام وميثاق ${escapeHtml(APP_NAME)}</h3>
      <p>انضمامك واستخدامك لمنصة ومتجر <strong>${escapeHtml(APP_NAME)}</strong> يعني التزامك الكامل بالمبادئ التالية:</p>
      <ul>
        <li><strong>الاحترام المتبادل:</strong> يُمنع منعاً باتاً التجريح الشخصي أو الإساءة لأي كاتب أو قارئ أو دار نشر؛ النقد الأدبي يكون موضوعياً وبناءً.</li>
        <li><strong>الأمانة الأدبية وحقوق الملكية:</strong> يُرجى نسبة الاقتباسات والنصوص إلى أصحابها ومؤلفيها الأصليين، ويُحظر انتحال المؤلفات.</li>
        <li><strong>جدية الطلبات وصحة البيانات:</strong> يتحمل المشتري كامل المسؤولية عن صحة اسمه الحقيقي ورقم هاتفه وعنوانه المدخل في فاتورة الشراء.</li>
      </ul>
    `;
  }

  const needsMandatoryAgree = isMandatory || (AppState.currentUser && !AppState.userData.agreedToTerms && !AppState.isAdmin);
  if (needsMandatoryAgree) {
    actionsBox.innerHTML = `
      <div style="background:var(--accent-soft); border:1px solid var(--accent-border); padding:10px 14px; border-radius:12px; font-size:12.5px; font-weight:800; color:var(--text-main); text-align:center;">
        <i class="fa-solid fa-circle-info" style="color:var(--accent);"></i> نورتنا في ${escapeHtml(APP_NAME)}! للمتابعة واستخدام المنصة، يُرجى الموافقة على سياسة الخصوصية وشروط الاستخدام:
      </div>
      <button class="sq-btn sq-btn-gold" style="width:100%; padding:12px!important; font-size:14px!important;" onclick="window.sqAgreeToTerms()">
        <i class="fa-solid fa-circle-check"></i> قرأت وأوافق على سياسة الخصوصية وشروط الاستخدام
      </button>
      ${AppState.currentUser ? `<button class="sq-btn sq-btn-outline" style="width:100%;" onclick="window.sqLogout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> تسجيل الخروج</button>` : ''}
    `;
  } else {
    actionsBox.innerHTML = `<button class="sq-btn" style="width:100%;" onclick="window.sqGoBackView()"><i class="fa-solid fa-check"></i> إغلاق والعودة</button>`;
  }
};

window.sqAgreeToTerms = function() {
  localStorage.setItem('sq_guest_agreed_v18', '1');
  if (!AppState.currentUser) {
    window.sqSwitchMainView('store');
    sqShowToast(`نورتنا في ${APP_NAME}!`, "success");
    return;
  }
  db.collection("safaqat_users").doc(AppState.currentUser.uid).update({ agreedToTerms: true }).then(() => {
    AppState.userData.agreedToTerms = true;
    window.sqSwitchMainView('store');
    sqShowToast(`نورتنا في ${APP_NAME}!`, "success");
  });
};

// =========================================================
// ⚙️ مركز الإعدادات، الإشعارات، والدعم الفني
// =========================================================
window.sqListenNotifs = function() {
  if (AppState.notifUnsubscribe) AppState.notifUnsubscribe();
  AppState.notifUnsubscribe = db.collection("safaqat_notifications").where("toUid", "==", AppState.currentUser.uid).onSnapshot(snap => {
    AppState.notificationsList = [];
    snap.forEach(doc => AppState.notificationsList.push({ id: doc.id, ...doc.data() }));
    AppState.notificationsList.sort((a, b) => (b.time || 0) - (a.time || 0));
    AppState.notificationsList = AppState.notificationsList.slice(0, 30);
    window.sqUpdateBadgesUI();
  }, err => {});
};

window.sqListenTickets = function() {
  if (!AppState.currentUser) return;
  if (AppState.ticketsUnsubscribe) AppState.ticketsUnsubscribe();
  const canManageSupport = window.sqHasPermission('manage_support');
  const ref = canManageSupport
    ? db.collection("safaqat_tickets")
    : db.collection("safaqat_tickets").where("uid", "==", AppState.currentUser.uid);

  AppState.ticketsUnsubscribe = ref.onSnapshot(snap => {
    AppState.ticketsList = [];
    snap.forEach(doc => AppState.ticketsList.push({ id: doc.id, ...doc.data() }));
    AppState.ticketsList.sort((a, b) => (b.time || 0) - (a.time || 0));
    if (AppState.activeMainView === 'settings_page' && (AppState.settingsSubTab === 'support' || AppState.settingsSubTab === 'admin')) {
      window.sqRenderSettingsPage();
    }
  }, err => {});
};

window.sqUpdateBadgesUI = function() {
  if (!AppState.currentUser) return;
  const unreadNotifs = AppState.notificationsList.filter(n => !n.read).length;
  const dockProfileDot = document.getElementById('dock-profile-dot');
  if (dockProfileDot) {
    if (unreadNotifs > 0) { dockProfileDot.innerText = unreadNotifs; dockProfileDot.style.display = 'flex'; }
    else { dockProfileDot.style.display = 'none'; }
  }
};

window.sqSendNotif = function(toUid, postId, text) {
  if (!toUid) return;
  db.collection("safaqat_notifications").add({ toUid, postId, text, read: false, time: Date.now() });
};

window.sqOpenSettingsPage = function(defaultSubTab = 'identity') {
  if (!AppState.currentUser) return window.sqLogin();
  AppState.settingsSubTab = defaultSubTab;
  window.sqSwitchMainView('settings_page');
  window.sqRenderSettingsPage();
};

window.sqSwitchSettingsTab = function(tabName) {
  AppState.settingsSubTab = tabName;
  window.sqRenderSettingsPage();
};

window.sqRenderSettingsPage = function() {
  const navTabs = document.getElementById('sq-settings-nav-tabs');
  const bodyBox = document.getElementById('sq-settings-body-content');
  if (!navTabs || !bodyBox || !AppState.currentUser) return;

  const canSeeAdmin = AppState.isAdmin || window.sqIsStaffMember();
  const unreadCount = AppState.notificationsList.filter(n => !n.read).length;

  navTabs.innerHTML = `
    <button class="sq-hub-tab ${AppState.settingsSubTab === 'identity' ? 'active' : ''}" onclick="window.sqSwitchSettingsTab('identity')"><i class="fa-solid fa-sliders"></i> الإعدادات والمظهر</button>
    <button class="sq-hub-tab ${AppState.settingsSubTab === 'notifs' ? 'active' : ''}" onclick="window.sqSwitchSettingsTab('notifs')"><i class="fa-regular fa-bell"></i> الإشعارات ${unreadCount > 0 ? `<span style="background:var(--danger); color:#fff; padding:1px 6px; border-radius:10px; font-size:10px;">${unreadCount}</span>` : ''}</button>
    <button class="sq-hub-tab ${AppState.settingsSubTab === 'support' ? 'active' : ''}" onclick="window.sqSwitchSettingsTab('support')"><i class="fa-solid fa-headset"></i> الدعم</button>
    ${canSeeAdmin ? `<button class="sq-hub-tab ${AppState.settingsSubTab === 'admin' ? 'active' : ''}" style="color:var(--danger);" onclick="window.sqSwitchSettingsTab('admin')"><i class="fa-solid fa-shield-halved"></i> ${AppState.userData.isPublisher && !AppState.isAdmin ? 'إدارة الدار والمبيعات' : 'القيادة والتسويات'}</button>` : ''}
  `;

  const u = AppState.userData;
  if (AppState.settingsSubTab === 'identity') {
    const curFont = u.fontSize || '16.5px';
    const curTheme = u.theme || localStorage.getItem('sq_theme_pref') || 'light';
    const countryOptions = Object.keys(COUNTRIES_MAP).map(code => `<option value="${code}" ${u.nationality === code ? 'selected' : ''}>${COUNTRIES_MAP[code].name}</option>`).join('');

    bodyBox.innerHTML = `
      <div class="sq-hub-card">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); color:#fff; border:1.5px solid var(--accent); border-radius:16px; padding:14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="font-weight:900; font-size:14px; color:#fbbf24;"><i class="fa-solid fa-mobile-screen-button"></i> تطبيق ${escapeHtml(APP_NAME)} للهاتف</div>
            <div style="font-size:11.5px; color:#cbd5e1; margin-top:2px;">ثبّت المنصة كتطبيق ويب مستقل على جهازك بضغطة واحدة</div>
          </div>
          <button class="sq-btn sq-btn-gold" style="padding:7px 14px!important; font-size:12px!important; flex-shrink:0;" onclick="window.sqTriggerPwaInstall()">
            <i class="fa-solid fa-download"></i> تثبيت التطبيق
          </button>
        </div>

        <h3 style="font-size:15px; margin-bottom:10px;"><i class="fa-solid fa-palette" style="color:var(--accent);"></i> المظهر (نهاري / ليلي / تلقائي) وحجم الخط</h3>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px;">
          <button class="sq-btn ${curTheme === 'light' ? 'sq-btn-gold' : 'sq-btn-outline'}" onclick="window.sqSetThemeMode('light')"><i class="fa-solid fa-sun"></i> نهاري</button>
          <button class="sq-btn ${curTheme === 'dark' ? 'sq-btn-gold' : 'sq-btn-outline'}" onclick="window.sqSetThemeMode('dark')"><i class="fa-solid fa-moon"></i> ليلي</button>
          <button class="sq-btn ${curTheme === 'auto' ? 'sq-btn-gold' : 'sq-btn-outline'}" onclick="window.sqSetThemeMode('auto')"><i class="fa-solid fa-circle-half-stroke"></i> تلقائي</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:18px;">
          <button class="sq-btn ${curFont === '15px' ? 'sq-btn-gold' : 'sq-btn-outline'}" onclick="window.sqSetFontSize('15px')"><i class="fa-solid fa-font"></i> خط صغير</button>
          <button class="sq-btn ${curFont === '16.5px' ? 'sq-btn-gold' : 'sq-btn-outline'}" onclick="window.sqSetFontSize('16.5px')"><i class="fa-solid fa-text-height"></i> خط متوسط</button>
          <button class="sq-btn ${curFont === '18.5px' ? 'sq-btn-gold' : 'sq-btn-outline'}" onclick="window.sqSetFontSize('18.5px')"><i class="fa-solid fa-heading"></i> خط كبير</button>
        </div>

        <h3 style="font-size:15px; margin-bottom:10px; border-top:1px solid var(--border); padding-top:14px;"><i class="fa-solid fa-id-card" style="color:var(--accent);"></i> الهوية والبيانات الرسمية</h3>
        <label class="sq-field-label"><i class="fa-solid fa-signature"></i> الاسم الظاهر في المجتمع (اسم الكاتب / القارئ / دار النشر):</label>
        <input type="text" id="sq-edit-name" class="sq-input" value="${escapeHtml(u.customName || u.displayName || '')}">

        ${(u.isPublisher || AppState.isAdmin) ? `
          <div style="background:var(--accent-soft); border:1.5px solid var(--accent); padding:12px; border-radius:14px; margin-bottom:12px;">
            <label class="sq-field-label" style="color:var(--text-main);"><i class="fa-brands fa-whatsapp" style="color:#25D366; font-size:15px;"></i> رقم واتساب دار النشر لاستقبال الفواتير والطلبات (مع رمز الدولة):</label>
            <input type="tel" id="sq-edit-pub-wa" class="sq-input" style="margin-bottom:4px!important; background:var(--card)!important;" value="${escapeHtml(u.publisherWhatsapp || '')}" placeholder="مثال: +9665XXXXXXXX أو +201XXXXXXXXX">
            <div style="font-size:11px; color:var(--text-muted);">عندما يطلب القارئ كتاباً تابعاً لداركم، ستُوجه الفاتورة تلقائياً إلى هذا الرقم.</div>
          </div>
        ` : ''}

        <label class="sq-field-label"><i class="fa-solid fa-quote-right"></i> الحالة القصيرة (تظهر بجانب اسمك):</label>
        <input type="text" id="sq-edit-status" class="sq-input" value="${escapeHtml(u.statusText || '')}" placeholder="مثال: كاتب وروائي في صفقات...">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label class="sq-field-label"><i class="fa-solid fa-earth-americas"></i> الدولة / المقر:</label>
            <select id="sq-edit-nationality" class="sq-select">${countryOptions}</select>
          </div>
          <div>
            <label class="sq-field-label"><i class="fa-regular fa-calendar"></i> تاريخ الميلاد / التأسيس:</label>
            <input type="date" id="sq-edit-birthday" class="sq-input" value="${escapeHtml(u.birthday || '')}">
          </div>
        </div>
        <label class="sq-field-label"><i class="fa-solid fa-align-right"></i> النبذة التعريفية والسيرة الأدبية (Bio):</label>
        <textarea id="sq-edit-bio" class="sq-input" style="min-height:80px; resize:none;">${escapeHtml(u.bio || '')}</textarea>
        <div style="margin-bottom:14px; background:var(--bg); padding:11px 14px; border-radius:14px; border:1px solid var(--border);">
          <label style="display:flex; align-items:center; justify-content:space-between; font-size:13px; font-weight:bold; cursor:pointer;"><span>إظهار حالة الاتصال (متصل الآن)</span><input type="checkbox" id="sq-edit-show-online" ${u.showOnline !== false ? 'checked' : ''} style="width:18px; height:18px;"></label>
        </div>
        <button class="sq-btn sq-btn-gold" style="width:100%; margin-bottom:18px;" onclick="window.sqSaveProfileSettings()"><i class="fa-solid fa-floppy-disk"></i> حفظ بيانات الهوية</button>

        <h3 style="font-size:15px; margin-bottom:10px; border-top:1px solid var(--border); padding-top:14px;"><i class="fa-solid fa-scale-balanced" style="color:var(--accent);"></i> الصفحات الرسمية والسياسات</h3>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px;">
          <button class="sq-btn sq-btn-outline" style="font-size:11.5px!important; padding:8px!important;" onclick="window.sqOpenLegalPage('about', false)"><i class="fa-solid fa-building-columns"></i> عن صفقات</button>
          <button class="sq-btn sq-btn-outline" style="font-size:11.5px!important; padding:8px!important;" onclick="window.sqOpenLegalPage('privacy', false)"><i class="fa-solid fa-user-shield"></i> الخصوصية</button>
          <button class="sq-btn sq-btn-outline" style="font-size:11.5px!important; padding:8px!important;" onclick="window.sqOpenLegalPage('terms', false)"><i class="fa-solid fa-file-contract"></i> الشروط</button>
        </div>
        <button class="sq-btn" style="width:100%; background:var(--danger)!important;" onclick="window.sqLogout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> تسجيل الخروج من الحساب</button>
      </div>
    `;
  } else if (AppState.settingsSubTab === 'notifs') {
    AppState.notificationsList.forEach(n => {
      if (!n.read) {
        n.read = true;
        db.collection("safaqat_notifications").doc(n.id).update({ read: true }).catch(() => {});
      }
    });
    window.sqUpdateBadgesUI();

    const notifsHtml = AppState.notificationsList.length ? AppState.notificationsList.map(n => `
      <div onclick="window.sqHandleNotifClick('${n.postId || ''}')" style="padding:11px 13px; border-radius:12px; background:var(--bg); border:1px solid var(--border); font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
        <div><i class="fa-solid fa-bell" style="color:var(--accent); margin-left:6px;"></i> ${escapeHtml(n.text)}</div>
        <span style="font-size:10px; color:var(--text-muted); flex-shrink:0;">${sqFormatRelativeTime(n.time)}</span>
      </div>
    `).join('') : `<p style="text-align:center; padding:25px; color:var(--text-muted);">ما فيش إشعارات جديدة حالياً.</p>`;

    bodyBox.innerHTML = `
      <div class="sq-hub-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:15.5px; font-weight:900;"><i class="fa-regular fa-bell" style="color:var(--accent);"></i> سجل الإشعارات والتنبيهات</h3>
          ${AppState.notificationsList.length ? `<button class="sq-btn sq-btn-outline" style="font-size:11px!important; padding:4px 10px!important;" onclick="window.sqClearAllNotifs()"><i class="fa-solid fa-trash"></i> مسح الكل</button>` : ''}
        </div>
        <div>${notifsHtml}</div>
      </div>
    `;
  } else if (AppState.settingsSubTab === 'support') {
    const myTickets = AppState.ticketsList.filter(t => t.uid === AppState.currentUser.uid);
    const ticketsHtml = myTickets.map(t => `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:12px; margin-top:10px;">
        <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:bold; margin-bottom:5px;">
          <span style="color:var(--accent);">${escapeHtml(t.subject || 'تذكرة دعم')}</span>
          <span style="color:${t.reply ? 'var(--success)' : 'var(--warning)'};"><i class="fa-solid ${t.reply ? 'fa-circle-check' : 'fa-clock'}"></i> ${t.reply ? 'تم الرد' : 'قيد المراجعة'}</span>
        </div>
        <p style="font-size:13px; margin-bottom:6px;">${escapeHtml(t.message)}</p>
        ${t.reply ? `<div style="background:var(--card); border-right:3px solid var(--success); padding:8px 10px; border-radius:8px; font-size:12.5px;"><strong>رد إدارة المنصة:</strong> ${escapeHtml(t.reply)}</div>` : ''}
      </div>
    `).join('');

    bodyBox.innerHTML = `
      <div class="sq-hub-card">
        <h3 style="font-size:15.5px; margin-bottom:8px;"><i class="fa-solid fa-headset" style="color:var(--accent);"></i> التواصل مع إدارة المنصة والدعم الفني</h3>
        <select id="sq-ticket-subj" class="sq-select">
          <option value="استفسار عن كتاب أو فاتورة شراء">استفسار عن كتاب أو فاتورة شراء</option>
          <option value="طلب اعتماد دار نشر أو توثيق حساب كاتب">طلب اعتماد دار نشر أو توثيق حساب كاتب</option>
          <option value="اقتراح تطويري للمنصة">اقتراح تطويري للمنصة</option>
          <option value="مشكلة تقنية أو بلاغ">مشكلة تقنية أو بلاغ</option>
        </select>
        <textarea id="sq-ticket-msg" class="sq-input" style="min-height:90px; resize:none;" placeholder="اكتب رسالتك أو استفسارك بالتفصيل..."></textarea>
        <button class="sq-btn sq-btn-gold" style="width:100%;" onclick="window.sqSubmitSupportTicket()"><i class="fa-solid fa-paper-plane"></i> إرسال التذكرة للإدارة</button>
        <div style="margin-top:14px;">${ticketsHtml}</div>
      </div>
    `;
  } else if (AppState.settingsSubTab === 'admin' && canSeeAdmin) {
    window.sqRenderAdminDashboard();
  }
};

window.sqSaveProfileSettings = function() {
  if (!AppState.currentUser) return;
  const payload = {
    customName: document.getElementById('sq-edit-name').value.trim(),
    statusText: document.getElementById('sq-edit-status').value.trim(),
    nationality: document.getElementById('sq-edit-nationality').value,
    birthday: document.getElementById('sq-edit-birthday').value,
    bio: document.getElementById('sq-edit-bio').value.trim(),
    showOnline: Boolean(document.getElementById('sq-edit-show-online')?.checked)
  };
  const pubWaEl = document.getElementById('sq-edit-pub-wa');
  if (pubWaEl) payload.publisherWhatsapp = pubWaEl.value.trim();

  db.collection("safaqat_users").doc(AppState.currentUser.uid).update(payload).then(() => {
    Object.assign(AppState.userData, payload);
    if (AppState.allUsers[AppState.currentUser.uid]) Object.assign(AppState.allUsers[AppState.currentUser.uid], payload);
    sqShowToast("تم حفظ بيانات الهوية والإعدادات بنجاح!", "success");
    window.sqViewProfile(AppState.currentUser.uid);
  });
};

window.sqSubmitSupportTicket = function() {
  if (!AppState.currentUser) return;
  const subj = document.getElementById('sq-ticket-subj').value;
  const msg = document.getElementById('sq-ticket-msg').value.trim();
  if (!msg) return sqShowToast("اكتب رسالتك أولاً", "warning");
  db.collection("safaqat_tickets").add({
    uid: AppState.currentUser.uid,
    authorName: getRealName(AppState.currentUser.uid, AppState.currentUser.displayName),
    subject: subj,
    message: msg,
    reply: '',
    time: Date.now()
  }).then(() => {
    document.getElementById('sq-ticket-msg').value = '';
    sqShowToast("تم إرسال تذكرتك لإدارة المنصة بنجاح!", "success");
  });
};

window.sqClearAllNotifs = function() {
  if (!AppState.currentUser || !AppState.notificationsList.length) return;
  AppState.notificationsList.forEach(n => db.collection("safaqat_notifications").doc(n.id).delete());
  AppState.notificationsList = [];
  window.sqRenderSettingsPage();
  sqShowToast("تم مسح الإشعارات", "success");
};

window.sqHandleNotifClick = function(targetId) {
  if (!targetId || targetId === 'null') return;
  window.sqOpenSinglePost(targetId);
};
/* =========================================================
   المحرك البرمجي الشامل — الإصدار 1.8
   File: app.js (الجزء 5 من 5 والأخير)
   يشمل: غرفة القيادة، لوحة التسويات المالية الدقيقة (للطلبات المسلمة فقط)،
         الحماية السيادية للصلاحيات والعمولات، المساعد الذكي "راوي"، وتشغيل المنصة
   ========================================================= */

// =========================================================
// 🛡️ غرفة قيادة الإدارة، التسويات المالية، وإدارة دور النشر والموظفين
// =========================================================
window.sqApplyDynamicDarSettings = function(data) {
  if (!data) return;
  if (data.appName && data.appName.trim().length >= 2) {
    APP_NAME = data.appName.trim();
    document.querySelectorAll('.sq-dyn-app-name').forEach(el => el.textContent = APP_NAME);
  }
  if (data.logoUrl && data.logoUrl.startsWith('http')) {
    APP_LOGO_URL = data.logoUrl.trim();
    const hLogo = document.getElementById('sq-header-logo-img'); if (hLogo) hLogo.src = APP_LOGO_URL;
    const fav = document.getElementById('sq-favicon-link'); if (fav) fav.href = APP_LOGO_URL;
    const appIc = document.getElementById('sq-apple-icon-link'); if (appIc) appIc.href = APP_LOGO_URL;
    window.sqRefreshPwaManifest();
  }
  if (data.whatsappNumber && data.whatsappNumber.trim().length >= 7) {
    DAR_WHATSAPP_NUMBER = data.whatsappNumber.trim();
  }
  if (data.defaultCurrency && data.defaultCurrency.trim().length >= 1) {
    DEFAULT_CURRENCY = data.defaultCurrency.trim();
  }
  if (data.customBookCategories && typeof data.customBookCategories === 'object') {
    AppState.customBookCategories = data.customBookCategories;
    if (AppState.activeMainView === 'store') window.sqRenderLibrarySection();
  }
};

// حساب التسويات المالية الدقيقة (حصرياً للطلبات المكتملة التي تم تسليمها Completed)
window.sqCalculateFinancialSettlements = function(filterPubUid = null) {
  const completedOrders = (AppState.ordersList || []).filter(o => o.status === 'completed');
  const ledgerByPub = {};

  // تهيئة كافة دور النشر المعتمدة في الدفتر المالي
  Object.keys(AppState.allUsers).forEach(uid => {
    const u = AppState.allUsers[uid];
    if (u && u.isPublisher && !window.sqIsSuperAdminEmail(u.email)) {
      if (filterPubUid && filterPubUid !== uid) return;
      ledgerByPub[uid] = {
        pubUid: uid,
        pubName: getRealName(uid, u.displayName),
        pubPhoto: getRealPhoto(uid, u.photoURL),
        pubWhatsapp: u.publisherWhatsapp || '',
        commissionRate: (u.commissionRate !== undefined && !isNaN(Number(u.commissionRate))) ? Number(u.commissionRate) : 10,
        deliveredOrdersCount: 0,
        deliveredBooksQty: 0,
        grossSalesSAR: 0,
        platformCommissionSAR: 0,
        netPublisherSAR: 0,
        invoices: []
      };
    }
  });

  completedOrders.forEach(ord => {
    const items = Array.isArray(ord.items) ? ord.items : [];
    const pubSubtotals = {};

    items.forEach(it => {
      const pUid = it.publisherUid || 'DAR_MAIN';
      if (pUid === 'DAR_MAIN' || window.sqIsSuperAdminUid(pUid)) return;
      if (filterPubUid && filterPubUid !== pUid) return;

      if (!ledgerByPub[pUid]) {
        const u = AppState.allUsers[pUid] || {};
        ledgerByPub[pUid] = {
          pubUid: pUid,
          pubName: getRealName(pUid, it.publisherName || u.displayName || 'دار نشر'),
          pubPhoto: getRealPhoto(pUid, u.photoURL),
          pubWhatsapp: u.publisherWhatsapp || '',
          commissionRate: (u.commissionRate !== undefined && !isNaN(Number(u.commissionRate))) ? Number(u.commissionRate) : 10,
          deliveredOrdersCount: 0,
          deliveredBooksQty: 0,
          grossSalesSAR: 0,
          platformCommissionSAR: 0,
          netPublisherSAR: 0,
          invoices: []
        };
      }

      const qty = Number(it.qty) || 1;
      const unitSAR = (it.unitPriceSAR !== undefined)
        ? Number(it.unitPriceSAR)
        : (Number(it.priceSAR || it.price) || 0);
      const lineSAR = Number((unitSAR * qty).toFixed(2));

      if (!pubSubtotals[pUid]) {
        pubSubtotals[pUid] = { qty: 0, grossSAR: 0, titles: [] };
      }
      pubSubtotals[pUid].qty += qty;
      pubSubtotals[pUid].grossSAR += lineSAR;
      pubSubtotals[pUid].titles.push(`${it.title} (×${qty})`);
    });

    Object.keys(pubSubtotals).forEach(pUid => {
      const sub = pubSubtotals[pUid];
      const pubEntry = ledgerByPub[pUid];
      const rate = pubEntry.commissionRate;
      const commSAR = Number(((sub.grossSAR * rate) / 100).toFixed(2));
      const netSAR = Number((sub.grossSAR - commSAR).toFixed(2));

      pubEntry.deliveredOrdersCount += 1;
      pubEntry.deliveredBooksQty += sub.qty;
      pubEntry.grossSalesSAR = Number((pubEntry.grossSalesSAR + sub.grossSAR).toFixed(2));
      pubEntry.platformCommissionSAR = Number((pubEntry.platformCommissionSAR + commSAR).toFixed(2));
      pubEntry.netPublisherSAR = Number((pubEntry.netPublisherSAR + netSAR).toFixed(2));

      pubEntry.invoices.push({
        orderId: ord.id,
        orderCode: ord.orderCode || 'SK-000000',
        buyerName: ord.buyerName || 'مشتري',
        buyerPhone: ord.buyerPhone || '',
        city: `${ord.country || ''} - ${ord.city || ''}`,
        createdAt: ord.createdAt || 0,
        completedAt: ord.completedAt || ord.updatedAt || ord.createdAt || Date.now(),
        titlesText: sub.titles.join(' + '),
        qty: sub.qty,
        grossSAR: Number(sub.grossSAR.toFixed(2)),
        commissionRate: rate,
        commissionSAR: commSAR,
        netSAR: netSAR
      });
    });
  });

  return Object.values(ledgerByPub);
};

window.sqRenderAdminDashboard = function() {
  const box = document.getElementById('sq-settings-body-content'); if (!box) return;
  const isSuper = window.sqIsCurrentUserSuperAdmin();
  const isPubOnly = Boolean(AppState.userData && AppState.userData.isPublisher && !isSuper);
  const myUid = AppState.currentUser ? AppState.currentUser.uid : '';

  const totalUsers = Object.keys(AppState.allUsers).length;
  const totalBooks = isPubOnly ? AppState.booksList.filter(b => b.publisherUid === myUid).length : AppState.booksList.length;
  const totalOrders = isPubOnly
    ? AppState.ordersList.filter(o => (o.publisherUids || []).includes(myUid) || (o.items || []).some(i => i.publisherUid === myUid)).length
    : AppState.ordersList.length;
  const completedOrdersCount = isPubOnly
    ? AppState.ordersList.filter(o => o.status === 'completed' && ((o.publisherUids || []).includes(myUid) || (o.items || []).some(i => i.publisherUid === myUid))).length
    : AppState.ordersList.filter(o => o.status === 'completed').length;

  const canManageOrders = window.sqHasPermission('manage_orders');
  const canManageBooks = window.sqHasPermission('manage_books');
  const canManageMod = window.sqHasPermission('manage_mod');
  const canManageSupport = window.sqHasPermission('manage_support');
  const canManageAds = window.sqHasPermission('manage_ads');
  const canSeeSettlements = isSuper || isPubOnly;

  box.innerHTML = `
    <div class="sq-hub-card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <h3 style="font-size:16px; color:var(--text-main);">
          <i class="fa-solid fa-shield-halved" style="color:var(--accent);"></i>
          ${isPubOnly ? 'لوحة إدارة دار النشر والمبيعات والتسويات' : 'غرفة القيادة السيادية والتسويات المالية'}
        </h3>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${canManageBooks ? `<button class="sq-btn sq-btn-gold" style="padding:6px 12px!important; font-size:11.5px!important;" onclick="window.sqOpenBookStudio(null)"><i class="fa-solid fa-book-medical"></i> + رفع كتاب</button>` : ''}
          ${canManageAds ? `<button class="sq-btn sq-btn-outline" style="padding:6px 12px!important; font-size:11.5px!important;" onclick="window.sqOpenEventStudio(null)"><i class="fa-solid fa-calendar-plus" style="color:var(--accent);"></i> + حدث/معرض</button>` : ''}
        </div>
      </div>

      <div class="sq-stats-grid">
        <div class="sq-stat-box"><span class="sq-stat-num">${totalOrders}</span><span class="sq-stat-lbl">إجمالي الفواتير</span></div>
        <div class="sq-stat-box"><span class="sq-stat-num" style="color:var(--success);">${completedOrdersCount}</span><span class="sq-stat-lbl">طلبات تم تسليمها</span></div>
        <div class="sq-stat-box"><span class="sq-stat-num">${totalBooks}</span><span class="sq-stat-lbl">الكتب المنشورة</span></div>
        <div class="sq-stat-box"><span class="sq-stat-num">${totalUsers}</span><span class="sq-stat-lbl">أعضاء المنصة</span></div>
      </div>

      <div class="sq-admin-tabs">
        <button class="sq-admin-tab ${AppState.adminCurrentTab === 'help' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('help')"><i class="fa-solid fa-graduation-cap"></i> التعليمات</button>
        ${canManageOrders ? `<button class="sq-admin-tab ${AppState.adminCurrentTab === 'orders' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('orders')"><i class="fa-solid fa-file-invoice-dollar"></i> الفواتير (${totalOrders})</button>` : ''}
        ${canSeeSettlements ? `<button class="sq-admin-tab ${AppState.adminCurrentTab === 'settlements' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('settlements')"><i class="fa-solid fa-scale-balanced" style="color:var(--accent);"></i> التسويات المالية والعمولات</button>` : ''}
        ${canManageAds ? `<button class="sq-admin-tab ${AppState.adminCurrentTab === 'ads' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('ads')"><i class="fa-solid fa-calendar-star"></i> الأحداث (${AppState.eventsList.length})</button>` : ''}
        ${canManageSupport ? `<button class="sq-admin-tab ${AppState.adminCurrentTab === 'tickets' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('tickets')"><i class="fa-solid fa-headset"></i> التذاكر (${AppState.ticketsList.length})</button>` : ''}
        ${canManageMod ? `<button class="sq-admin-tab ${AppState.adminCurrentTab === 'reports' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('reports')"><i class="fa-solid fa-flag"></i> البلاغات</button>` : ''}
        ${isSuper ? `<button class="sq-admin-tab ${AppState.adminCurrentTab === 'staff' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('staff')"><i class="fa-solid fa-user-shield"></i> الصلاحيات ودور النشر</button>` : ''}
        ${isSuper ? `<button class="sq-admin-tab ${AppState.adminCurrentTab === 'dar_cfg' ? 'active' : ''}" onclick="window.sqSwitchAdminSubTab('dar_cfg')"><i class="fa-solid fa-sliders"></i> إعدادات المنصة</button>` : ''}
      </div>
      <div id="sq-admin-sub-body"></div>
    </div>
  `;
  window.sqRenderAdminSubContent();
};

window.sqSwitchAdminSubTab = function(sub) {
  AppState.adminCurrentTab = sub;
  window.sqRenderAdminDashboard();
};

window.sqRenderAdminSubContent = function() {
  const box = document.getElementById('sq-admin-sub-body'); if (!box) return;
  const isSuper = window.sqIsCurrentUserSuperAdmin();
  const isPubOnly = Boolean(AppState.userData && AppState.userData.isPublisher && !isSuper);
  const myUid = AppState.currentUser ? AppState.currentUser.uid : '';

  // 1. قسم المبيعات والفواتير (SK-XXXXXX)
  if (AppState.adminCurrentTab === 'orders' && window.sqHasPermission('manage_orders')) {
    box.innerHTML = `
      <div style="margin-bottom:12px;">
        <div class="sq-search-wrapper">
          <i class="fa-solid fa-magnifying-glass" style="color:var(--accent);"></i>
          <input type="text" id="adm-order-search-in" placeholder="ابحث برقم الفاتورة (مثال: SK-123456) أو اسم المستلم الحقيقي أو هاتفه..." oninput="window.sqFilterAdminOrdersList()">
        </div>
      </div>
      <div id="adm-orders-list-container"></div>
    `;
    window.sqFilterAdminOrdersList();
  }

  // 2. قسم التسويات المالية ودفتر العمولات الموثق (يحتسب فقط الطلبات المسلمة Completed)
  else if (AppState.adminCurrentTab === 'settlements' && (isSuper || isPubOnly)) {
    const ledgers = window.sqCalculateFinancialSettlements(isPubOnly ? myUid : null);
    const totalPlatformProfitSAR = ledgers.reduce((s, l) => s + l.platformCommissionSAR, 0).toFixed(2);
    const totalDeliveredSalesSAR = ledgers.reduce((s, l) => s + l.grossSalesSAR, 0).toFixed(2);
    const usdRate = CURRENCY_CONFIG.USD.rateFromSAR;
    const egpRate = CURRENCY_CONFIG.EGP.rateFromSAR;

    let summaryHeaderHtml = '';
    if (isSuper) {
      summaryHeaderHtml = `
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); color:#fff; border:1.5px solid var(--accent); border-radius:16px; padding:14px; margin-bottom:14px;">
          <div style="font-size:13px; font-weight:900; color:#fbbf24; margin-bottom:6px;">
            <i class="fa-solid fa-scale-balanced"></i> الملخص المالي الموثق لعمولات المنصة (يُحتسب حصرياً على الطلبات المؤكد تسليمها)
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-top:8px;">
            <div style="background:rgba(255,255,255,0.08); padding:10px; border-radius:12px;">
              <span style="font-size:11px; color:#cbd5e1; display:block;">إجمالي مبيعات الدور المسلمة:</span>
              <strong style="font-size:16px; color:#fff;">${totalDeliveredSalesSAR} ر.س</strong>
              <span style="font-size:10.5px; color:#94a3b8; display:block;">(${(totalDeliveredSalesSAR * usdRate).toFixed(2)} $ | ${Math.round(totalDeliveredSalesSAR * egpRate)} ج.م)</span>
            </div>
            <div style="background:rgba(16,185,129,0.18); border:1px solid #10b981; padding:10px; border-radius:12px;">
              <span style="font-size:11px; color:#a7f3d0; display:block;">صافي مستحقات منصة صفقات (العمولة):</span>
              <strong style="font-size:17px; color:#fbbf24;">${totalPlatformProfitSAR} ر.س</strong>
              <span style="font-size:10.5px; color:#ecfdf5; display:block;">(${(totalPlatformProfitSAR * usdRate).toFixed(2)} $ | ${Math.round(totalPlatformProfitSAR * egpRate)} ج.م)</span>
            </div>
          </div>
        </div>
      `;
    }

    if (!ledgers.length) {
      box.innerHTML = summaryHeaderHtml + `<p style="text-align:center; padding:25px; color:var(--text-muted);">لا توجد دور نشر خارجية معتمدة حالياً في الدفتر المالي.</p>`;
      return;
    }

    const ledgersHtml = ledgers.map(l => {
      const commUSD = (l.platformCommissionSAR * usdRate).toFixed(2);
      const commEGP = Math.round(l.platformCommissionSAR * egpRate);
      const grossUSD = (l.grossSalesSAR * usdRate).toFixed(2);
      const grossEGP = Math.round(l.grossSalesSAR * egpRate);

      const invRowsHtml = l.invoices.length ? l.invoices.map((inv, idx) => `
        <div style="background:var(--card); border:1px solid var(--border); border-radius:11px; padding:9px 11px; margin-top:6px; font-size:11.5px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px; margin-bottom:3px;">
            <strong style="color:var(--text-main);">${idx + 1}. فاتورة رقم: #${escapeHtml(inv.orderCode)}</strong>
            <span style="color:var(--success); font-weight:900;"><i class="fa-solid fa-circle-check"></i> تم التسليم: ${sqFormatExactTime(inv.completedAt)}</span>
          </div>
          <div style="color:var(--text-muted);">المستلم الحقيقي: <strong>${escapeHtml(inv.buyerName)}</strong> (${escapeHtml(inv.city)}) • الكتب: ${escapeHtml(inv.titlesText)}</div>
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-top:4px; padding-top:4px; border-top:1px dashed var(--border);">
            <span>قيمة الكتب المسلمة: <strong>${inv.grossSAR} ر.س</strong></span>
            <span style="color:var(--danger); font-weight:900;">عمولة المنصة (${inv.commissionRate}%): ${inv.commissionSAR} ر.س</span>
            <span style="color:var(--success); font-weight:800;">صافي الدار: ${inv.netSAR} ر.س</span>
          </div>
        </div>
      `).join('') : `<div style="font-size:11.5px; color:var(--text-muted); padding:8px; text-align:center;">لا توجد فواتير وصلت لمرحلة (تم التسليم) لهذه الدار حتى الآن.</div>`;

      return `
        <div class="sq-finance-ledger-card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:9px; cursor:pointer;" onclick="window.sqViewProfile('${l.pubUid}', 'books')">
              <img src="${escapeHtml(l.pubPhoto)}" style="width:40px; height:40px; border-radius:10px; object-fit:cover; border:1.5px solid var(--accent);">
              <div>
                <strong style="font-size:14px; color:var(--text-main);">${escapeHtml(l.pubName)}</strong>
                <span class="sq-vbadge publisher"><i class="fa-solid fa-check"></i></span>
                <div style="font-size:11px; color:var(--text-muted);">نسبة عمولة المنصة المتفق عليها: <strong style="color:var(--accent);">${l.commissionRate}%</strong></div>
              </div>
            </div>
            <div style="display:flex; gap:5px; flex-wrap:wrap;">
              ${isSuper ? `<button class="sq-btn sq-btn-outline" style="padding:5px 10px!important; font-size:11px!important;" onclick="window.sqSetPublisherCommissionPrompt('${l.pubUid}',${l.commissionRate})"><i class="fa-solid fa-percent" style="color:var(--accent);"></i> تعديل النسبة</button>` : ''}
              <button class="sq-btn" style="background:#25D366!important; color:#fff!important; padding:5px 11px!important; font-size:11px!important;" onclick="window.sqSendSettlementViaWhatsApp('${l.pubUid}')"><i class="fa-brands fa-whatsapp"></i> إرسال كشف الحساب الموثق</button>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(125px, 1fr)); gap:6px; background:var(--card); padding:9px; border-radius:12px; border:1px solid var(--border); margin-bottom:8px; text-align:center;">
            <div>
              <span style="font-size:10.5px; color:var(--text-muted); display:block;">فواتير مُسلّمة</span>
              <strong style="font-size:14px;">${l.deliveredOrdersCount} فاتورة (${l.deliveredBooksQty} كتاب)</strong>
            </div>
            <div>
              <span style="font-size:10.5px; color:var(--text-muted); display:block;">إجمالي المبيعات المسلمة</span>
              <strong style="font-size:13.5px; color:var(--text-main);">${l.grossSalesSAR} ر.س</strong>
              <span style="font-size:9.5px; color:var(--text-muted); display:block;">${grossUSD} $ | ${grossEGP} ج.م</span>
            </div>
            <div>
              <span style="font-size:10.5px; color:var(--text-muted); display:block;">عمولة المنصة (${l.commissionRate}%)</span>
              <strong style="font-size:14px; color:var(--danger);">${l.platformCommissionSAR} ر.س</strong>
              <span style="font-size:9.5px; color:var(--text-muted); display:block;">${commUSD} $ | ${commEGP} ج.م</span>
            </div>
            <div>
              <span style="font-size:10.5px; color:var(--text-muted); display:block;">صافي الدار بعد العمولة</span>
              <strong style="font-size:13.5px; color:var(--success);">${l.netPublisherSAR} ر.س</strong>
            </div>
          </div>

          <details class="sq-accordion-box" style="margin:0;">
            <summary><span><i class="fa-solid fa-list-check" style="color:var(--accent); margin-left:5px;"></i> عرض السجل التفصيلي للفواتير المسلمة (${l.invoices.length})</span></summary>
            <div style="margin-top:8px;">${invRowsHtml}</div>
          </details>
        </div>
      `;
    }).join('');

    box.innerHTML = summaryHeaderHtml + ledgersHtml;
  }

  // 3. قسم إدارة الأحداث والمعارض
  else if (AppState.adminCurrentTab === 'ads' && window.sqHasPermission('manage_ads')) {
    const eventsHtml = AppState.eventsList.map(ev => `
      <div style="background:var(--bg); border:1px solid var(--border); padding:11px; border-radius:14px; margin-top:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px; overflow:hidden; cursor:pointer;" onclick="window.sqOpenEventDetail('${ev.id}')">
          <img src="${escapeHtml(ev.imageUrl || APP_LOGO_URL)}" style="width:60px; aspect-ratio:16/9; object-fit:cover; border-radius:8px; border:1px solid var(--accent); flex-shrink:0;">
          <div style="overflow:hidden;">
            <strong style="font-size:13px; color:var(--text-main); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(ev.title)}</strong>
            <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(ev.eventDate || '')} • ${ev.clicks || 0} مشاهدة</span>
          </div>
        </div>
        <div style="display:flex; gap:5px; flex-shrink:0;">
          <button class="sq-btn sq-btn-outline" style="padding:5px 10px!important; font-size:11px!important;" onclick="window.sqOpenEventStudio('${ev.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="sq-btn" style="background:var(--danger)!important; padding:5px 10px!important; font-size:11px!important;" onclick="window.sqDeleteEvent('${ev.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');

    box.innerHTML = `
      <div style="background:var(--bg); padding:13px; border-radius:15px; border:1px solid var(--border); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h4 style="font-size:13.5px; font-weight:900;"><i class="fa-solid fa-calendar-star" style="color:var(--accent);"></i> شريط الأحداث والمعارض التلقائي (16:9)</h4>
          <p style="font-size:11.5px; color:var(--text-muted);">يتحرك تلقائياً أعلى المتجر ويعرض المعارض والعروض</p>
        </div>
        <button class="sq-btn sq-btn-gold" onclick="window.sqOpenEventStudio(null)"><i class="fa-solid fa-plus"></i> إضافة حدث</button>
      </div>
      ${eventsHtml || `<p style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد أحداث مضافة حالياً.</p>`}
    `;
  }

  // 4. قسم تذاكر الدعم الفني
  else if (AppState.adminCurrentTab === 'tickets' && window.sqHasPermission('manage_support')) {
    if (!AppState.ticketsList.length) {
      box.innerHTML = `<p style="text-align:center; padding:25px; color:var(--text-muted);">لا توجد تذاكر دعم واردة حالياً.</p>`;
      return;
    }
    box.innerHTML = AppState.ticketsList.map(t => `
      <div style="background:var(--bg); border:1px solid var(--border); padding:12px; border-radius:14px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold;">
          <span style="cursor:pointer; color:var(--text-main);" onclick="window.sqViewProfile('${t.uid}')"><i class="fa-solid fa-user"></i> ${escapeHtml(getRealName(t.uid, t.authorName))}</span>
          <span style="color:var(--accent);">${escapeHtml(t.subject)}</span>
        </div>
        <p style="font-size:13px; margin:6px 0; white-space:pre-wrap;">${escapeHtml(t.message)}</p>
        ${t.reply ? `<div style="font-size:12px; color:var(--success); margin-bottom:6px; background:var(--card); padding:6px 10px; border-radius:8px;"><strong>تم الرد:</strong> ${escapeHtml(t.reply)}</div>` : ''}
        <div style="display:flex; gap:6px;">
          <button class="sq-btn" style="padding:5px 12px!important; font-size:11.5px!important;" onclick="window.sqReplyTicket('${t.id}', '${t.uid}')"><i class="fa-solid fa-reply"></i> إرسال رد</button>
          <button class="sq-btn sq-btn-outline" style="padding:5px 12px!important; font-size:11.5px!important; color:var(--danger)!important;" onclick="db.collection('safaqat_tickets').doc('${t.id}').delete()">حذف</button>
        </div>
      </div>
    `).join('');
  }

  // 5. قسم البلاغات والرقابة
  else if (AppState.adminCurrentTab === 'reports' && window.sqHasPermission('manage_mod')) {
    db.collection("safaqat_reports").orderBy("time", "desc").limit(25).get().then(snap => {
      if (snap.empty) { box.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-muted);">سجل البلاغات نظيف تماماً.</p>`; return; }
      let h = '';
      snap.forEach(doc => {
        const r = doc.data();
        h += `
          <div style="background:var(--bg); border:1px solid var(--border); padding:11px; border-radius:12px; margin-bottom:8px;">
            <div style="font-size:12px; font-weight:bold; color:var(--danger);">سبب البلاغ: ${escapeHtml(r.reason)}</div>
            <p style="font-size:12.5px; margin:5px 0;">"${escapeHtml(r.postSnippet || '')}"</p>
            <div style="display:flex; gap:6px;">
              <button class="sq-btn" style="padding:4px 10px!important; font-size:11px!important;" onclick="window.sqOpenSinglePost('${r.postId}')">معاينة المنشور</button>
              <button class="sq-btn" style="background:var(--danger)!important; padding:4px 10px!important; font-size:11px!important;" onclick="db.collection('safaqat_reports').doc('${doc.id}').delete().then(()=>window.sqRenderAdminSubContent())">إغلاق البلاغ</button>
            </div>
          </div>
        `;
      });
      box.innerHTML = h;
    });
  }

  // 6. قسم الإدارة السيادية للصلاحيات ودور النشر والعمولات (حصرياً للبريدين الأساسيين Super Admins)
  else if (AppState.adminCurrentTab === 'staff' && isSuper) {
    box.innerHTML = `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:12px;">
        <h4 style="font-size:14px; font-weight:900; margin-bottom:4px;"><i class="fa-solid fa-user-shield" style="color:var(--accent);"></i> التحكم السيادي بالصلاحيات، دور النشر، ونسب العمولة</h4>
        <p style="font-size:11.5px; color:var(--text-muted); margin-bottom:10px;">أنت مسجل بأحد الحسابين السياديين الأساسيين؛ يمكنك منح أو انتزاع ميزة دار النشر أو الإدارة أو الموظفين من أي حساب فوراً:</p>
        <input type="text" id="adm-staff-search-in" class="sq-input" placeholder="ابحث عن أي حساب بالاسم أو البريد أو معرف SKID..." oninput="window.sqFilterAdminStaffList(this.value)">
        <div id="adm-staff-list-box" style="display:flex; flex-direction:column; gap:8px; max-height:460px; overflow-y:auto;"></div>
      </div>
    `;
    window.sqFilterAdminStaffList('');
  }

  // 7. الإعدادات المركزية للمنصة
  else if (AppState.adminCurrentTab === 'dar_cfg' && isSuper) {
    box.innerHTML = `
      <div style="background:var(--bg); padding:14px; border-radius:16px; border:1px solid var(--border);">
        <h4 style="font-size:14px; font-weight:900; margin-bottom:10px;"><i class="fa-solid fa-building-columns" style="color:var(--accent);"></i> الإعدادات المركزية لـ ${escapeHtml(APP_NAME)}</h4>
        <label class="sq-field-label">اسم المنصة الرسمي:</label>
        <input type="text" id="cfg-in-appname" class="sq-input" value="${escapeHtml(APP_NAME)}">

        <label class="sq-field-label">رابط صورة شعار الدار الرسمي (Logo URL):</label>
        <input type="url" id="cfg-in-logo" class="sq-input" value="${escapeHtml(APP_LOGO_URL)}">

        <div style="display:grid; grid-template-columns:2fr 1fr; gap:8px;">
          <div>
            <label class="sq-field-label">رقم واتساب الدار الرئيسي لاستقبال الفواتير:</label>
            <input type="text" id="cfg-in-wa" class="sq-input" value="${escapeHtml(DAR_WHATSAPP_NUMBER)}" placeholder="+201016327947">
          </div>
          <div>
            <label class="sq-field-label">العملة الافتراضية:</label>
            <input type="text" id="cfg-in-curr" class="sq-input" value="${escapeHtml(DEFAULT_CURRENCY)}" placeholder="SAR">
          </div>
        </div>
        <button class="sq-btn sq-btn-gold" style="width:100%; margin-top:4px;" onclick="window.sqSaveGeneralDarSettings()"><i class="fa-solid fa-floppy-disk"></i> حفظ وتطبيق إعدادات الدار فوراً</button>
      </div>
    `;
  }

  // 8. دليل التعليمات والتشغيل الذكي
  else if (AppState.adminCurrentTab === 'help') {
    box.innerHTML = `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; padding:14px;">
        <h4 style="font-size:14.5px; font-weight:900; margin-bottom:10px; color:var(--text-main);"><i class="fa-solid fa-graduation-cap" style="color:var(--accent);"></i> دليل التشغيل والنظام المالي (تحديث الإصدار 1.8)</h4>
        <ul style="padding-right:18px; font-size:12.5px; color:var(--text-muted); line-height:1.9;">
          <li><strong>الحماية السيادية للصلاحيات:</strong> البريدان الأساسيان فقط لهما حق منح أو انتزاع صلاحية دار النشر أو الموظفين أو الإدارة، ولا يمكن لأحدهما نزع صلاحيات الآخر.</li>
          <li><strong>نظام العمولة والتسويات المالية العادل:</strong> عند منح أي حساب ميزة (دار نشر)، يطلب منك النظام تحديد نسبة عمولة المنصة (%). لا تُحتسب أي عمولة على الطلبات الملغاة أو قيد المراجعة، بل تُسجل تلقائياً في دفتر التسويات المالية فور تحويل حالة الفاتورة إلى <strong>(تم التسليم)</strong> مع توثيق رقم الفاتورة وتاريخ التسليم بالدقيقة.</li>
          <li><strong>العملات الثلاث والقراءة الآمنة:</strong> يدعم المتجر الريال السعودي والدولار والجنيه المصري، مع إمكانية تفعيل الطلب الورقي والقراءة الآمنة داخل الموقع والتحميل الصامت في الخلفية معاً.</li>
        </ul>
      </div>
    `;
  }
};

// إرسال كشف الحساب المالي الموثق لدار النشر عبر واتساب
window.sqSendSettlementViaWhatsApp = function(pubUid) {
  const ledgers = window.sqCalculateFinancialSettlements(pubUid);
  if (!ledgers.length) return;
  const l = ledgers[0];
  const usdRate = CURRENCY_CONFIG.USD.rateFromSAR;
  const egpRate = CURRENCY_CONFIG.EGP.rateFromSAR;

  const invLines = l.invoices.slice(0, 15).map((inv, i) =>
    `${i + 1}. فاتورة #${inv.orderCode} | المستلم: ${inv.buyerName} | المسلم: ${inv.titlesText} | المبلغ: ${inv.grossSAR} ر.س | عمولة المنصة (${inv.commissionRate}%): ${inv.commissionSAR} ر.س`
  ).join('\n');

  const reportText = `*كشف حساب التسويات المالية الموثق — منصة ${APP_NAME}*
*دار النشر:* ${l.pubName}
*نسبة عمولة المنصة المتفق عليها:* ${l.commissionRate}%
*عدد الفواتير المؤكد تسليمها للعملاء:* ${l.deliveredOrdersCount} فاتورة (${l.deliveredBooksQty} كتاب)

*إجمالي مبيعات الدار المسلمة:* ${l.grossSalesSAR} ر.س (${(l.grossSalesSAR * usdRate).toFixed(2)} $ | ${Math.round(l.grossSalesSAR * egpRate)} ج.م)
*صافي عمولة منصة ${APP_NAME} المستحقة:* ${l.platformCommissionSAR} ر.س (${(l.platformCommissionSAR * usdRate).toFixed(2)} $ | ${Math.round(l.platformCommissionSAR * egpRate)} ج.م)
*صافي أرباح الدار بعد العمولة:* ${l.netPublisherSAR} ر.س

*تفاصيل الفواتير المسلمة:*
${invLines || 'لا توجد فواتير مسلمة بعد'}`;

  const cleanPhone = (l.pubWhatsapp || DAR_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  if (cleanPhone) {
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(reportText)}`, '_blank');
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(reportText).then(() => sqShowToast("تم نسخ كشف الحساب الموثق للحافظة!", "success"));
  }
};

window.sqFilterAdminOrdersList = function() {
  const container = document.getElementById('adm-orders-list-container'); if (!container) return;
  const q = (document.getElementById('adm-order-search-in')?.value || '').toLowerCase().trim();
  const canManageAllOrders = AppState.isAdmin || (AppState.userData.permissions || []).includes('manage_orders');
  const isPublisherAccount = Boolean(AppState.userData && AppState.userData.isPublisher);
  const myUid = AppState.currentUser ? AppState.currentUser.uid : '';

  const filtered = AppState.ordersList.filter(ord => {
    if (isPublisherAccount && !canManageAllOrders) {
      const pubs = ord.publisherUids || [];
      const hasMyBook = (ord.items || []).some(it => it.publisherUid === myUid);
      if (!pubs.includes(myUid) && !hasMyBook) return false;
    }
    if (!q) return true;
    return (ord.orderCode || '').toLowerCase().includes(q) ||
           (ord.buyerName || '').toLowerCase().includes(q) ||
           (ord.buyerPhone || '').toLowerCase().includes(q) ||
           (ord.city || '').toLowerCase().includes(q);
  });

  if (!filtered.length) {
    container.innerHTML = `<p style="text-align:center; padding:25px; color:var(--text-muted);">لا توجد فواتير مطابقة لبحثك.</p>`;
    return;
  }

  container.innerHTML = filtered.map(ord => {
    const stObj = ORDER_STATUS_MAP[ord.status || 'pending_review'] || ORDER_STATUS_MAP.pending_review;
    const booksSummary = (ord.items || []).map(i => `${i.title} (×${i.qty})`).join(' ، ');
    return `
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:16px; padding:13px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
          <div>
            <strong style="font-size:14.5px; color:var(--text-main);">#${escapeHtml(ord.orderCode)}</strong>
            <span style="font-size:11px; color:var(--text-muted); margin-right:6px;">${sqFormatExactTime(ord.createdAt)}</span>
          </div>
          <span class="sq-order-status-badge" style="background:${stObj.color}20; color:${stObj.color}; border:1px solid ${stObj.color}50;">
            <i class="fa-solid ${stObj.icon}"></i> ${stObj.label}
          </span>
        </div>
        <div style="font-size:12.5px; font-weight:800; color:var(--text-main); margin-bottom:3px;"><i class="fa-solid fa-user-check" style="color:var(--accent);"></i> الاسم الحقيقي للمستلم: ${escapeHtml(ord.buyerName)} — جوال: <span dir="ltr">${escapeHtml(ord.buyerPhone)}</span></div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> العنوان: ${escapeHtml(ord.country)} - ${escapeHtml(ord.city)} (${escapeHtml(ord.address || '')})</div>
        <div style="font-size:12px; color:var(--text-main); font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-book" style="color:var(--accent);"></i> الكتب: ${escapeHtml(booksSummary)}</div>
        <div style="font-size:13px; color:var(--accent); font-weight:900; margin-bottom:9px;">الإجمالي: ${ord.totalAmount} ${escapeHtml(ord.currency || 'ر.س')}</div>

        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; background:var(--card); padding:8px; border-radius:12px; border:1px solid var(--border);">
          <span style="font-size:11px; font-weight:800;">تحديث الحالة:</span>
          <select class="sq-select" style="margin:0!important; flex:1; min-width:140px; padding:5px 9px!important; font-size:11.5px!important;" onchange="window.sqUpdateOrderStatus('${ord.id}', '${ord.buyerUid}', '${escapeHtml(ord.orderCode)}', this.value)">
            <option value="pending_review" ${ord.status === 'pending_review' ? 'selected' : ''}>1. تمت المراجعة</option>
            <option value="contacted" ${ord.status === 'contacted' ? 'selected' : ''}>2. تم التواصل</option>
            <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>3. قيد التجهيز</option>
            <option value="shipped" ${ord.status === 'shipped' ? 'selected' : ''}>4. تم الشحن</option>
            <option value="completed" ${ord.status === 'completed' ? 'selected' : ''}>5. تم التسليم (تُحتسب العمولة)</option>
            <option value="cancelled" ${ord.status === 'cancelled' ? 'selected' : ''}>طلب ملغي (لا تُحتسب عمولة)</option>
          </select>
          <button class="sq-btn sq-btn-outline" style="padding:5px 10px!important; font-size:11px!important;" onclick="window.sqAddAdminOrderNote('${ord.id}', '${escapeHtml(ord.adminNote || '')}')"><i class="fa-solid fa-comment-medical"></i> ملاحظة</button>
          <a href="https://wa.me/${(ord.buyerPhone || '').replace(/[^0-9]/g, '')}" target="_blank" class="sq-btn" style="background:#25D366!important; color:#fff!important; padding:5px 11px!important; font-size:11px!important;"><i class="fa-brands fa-whatsapp"></i> واتساب</a>
        </div>
      </div>
    `;
  }).join('');
};

window.sqUpdateOrderStatus = function(orderId, buyerUid, orderCode, newStatus) {
  const stObj = ORDER_STATUS_MAP[newStatus] || ORDER_STATUS_MAP.pending_review;
  const updates = { status: newStatus, updatedAt: Date.now() };
  if (newStatus === 'completed') {
    updates.completedAt = Date.now();
  }
  db.collection("safaqat_orders").doc(orderId).update(updates).then(() => {
    if (buyerUid && buyerUid !== 'GUEST') {
      window.sqSendNotif(buyerUid, null, `تحديث على فاتورتك (#${orderCode}): أصبحت حالة طلبك الآن "${stObj.label}".`);
    }
    sqShowToast(newStatus === 'completed' ? `تم تأكيد تسليم الطلب #${orderCode} وإدراجه في التسويات المالية!` : `تم تحديث حالة الطلب #${orderCode} إلى: ${stObj.label}`, "success");
  });
};

window.sqAddAdminOrderNote = function(orderId, currentNote) {
  window.sqOpenCustomPrompt("اكتب ملاحظة للمشتري حول طلبه (مثل رقم بوليصة الشحن أو موعد التسليم):", currentNote, (newNote) => {
    db.collection("safaqat_orders").doc(orderId).update({ adminNote: newNote, updatedAt: Date.now() }).then(() => {
      sqShowToast("تم حفظ الملاحظة على الفاتورة!", "success");
    });
  });
};

// =========================================================
// 🔒 دوال التحكم السيادي بصلاحيات دور النشر والإدارة والعمولات (Super Admins Only)
// =========================================================
window.sqFilterAdminStaffList = function(query) {
  const box = document.getElementById('adm-staff-list-box'); if (!box) return;
  if (!window.sqIsCurrentUserSuperAdmin()) return;

  const q = (query || '').toLowerCase().trim();
  const list = Object.keys(AppState.allUsers).map(uid => ({ uid, ...AppState.allUsers[uid] })).filter(u => {
    if (!q) return true;
    const name = getRealName(u.uid, u.displayName).toLowerCase();
    const skid = ('sk-' + u.uid.substring(0, 6)).toLowerCase();
    const em = (u.email || '').toLowerCase();
    return name.includes(q) || skid.includes(q) || em.includes(q);
  }).slice(0, 35);

  box.innerHTML = list.map(u => {
    const uName = getRealName(u.uid, u.displayName);
    const isTargetSuper = window.sqIsSuperAdminEmail(u.email);
    const perms = u.permissions || [];
    const isPub = Boolean(u.isPublisher);
    const isAuth = Boolean(u.isAuthor);
    const hasLegacyAdmin = Boolean(u.isAdminUser && !isTargetSuper);
    const commRate = u.commissionRate !== undefined ? u.commissionRate : 10;

    return `
      <div style="background:var(--card); border:1px solid var(--border); border-radius:14px; padding:11px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="window.sqViewProfile('${u.uid}')">
            <img src="${getRealPhoto(u.uid, u.photoURL)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
            <div>
              <strong style="font-size:13px;">${escapeHtml(uName)}</strong> ${window.getUserBadges(u.uid, false, false, true)}
              <div style="font-size:10.5px; color:var(--text-muted);">SK-${u.uid.substring(0, 6).toUpperCase()} ${u.email ? `• ${escapeHtml(u.email)}` : ''}</div>
            </div>
          </div>

          ${isTargetSuper ? `
            <span class="sq-role-tag admin"><i class="fa-solid fa-lock"></i> حساب سيادي أساسي (محمي)</span>
          ` : `
            <div style="display:flex; gap:5px; flex-wrap:wrap;">
              <button class="sq-btn ${isPub ? 'sq-btn-gold' : 'sq-btn-outline'}" style="padding:4px 10px!important; font-size:11px!important;" onclick="window.sqTogglePublisher('${u.uid}',${isPub})">
                <i class="fa-solid fa-building-columns"></i> ${isPub ? `انتزاع دار النشر (${commRate}%)` : 'منح دار نشر + عمولة'}
              </button>
              ${isPub ? `
                <button class="sq-btn sq-btn-outline" style="padding:4px 8px!important; font-size:10.5px!important;" onclick="window.sqSetPublisherCommissionPrompt('${u.uid}', ${commRate})" title="تعديل نسبة العمولة">
                  <i class="fa-solid fa-percent" style="color:var(--accent);"></i> ${commRate}%
                </button>
              ` : ''}
              <button class="sq-btn" style="background:${isAuth ? 'var(--author)' : 'var(--bg)'}!important; color:${isAuth ? '#fff' : 'var(--text-main)'}!important; border:1px solid var(--border)!important; padding:4px 10px!important; font-size:11px!important;" onclick="window.sqToggleAuthor('${u.uid}',${isAuth})">
                <i class="fa-solid fa-feather-pointed"></i> ${isAuth ? 'انتزاع شارة الكاتب' : 'توثيق كاتب'}
              </button>
              ${hasLegacyAdmin ? `
                <button class="sq-btn" style="background:var(--danger)!important; color:#fff!important; padding:4px 10px!important; font-size:11px!important;" onclick="window.sqStripLegacyAdminFlag('${u.uid}')">
                  <i class="fa-solid fa-user-slash"></i> انتزاع الإدارة
                </button>
              ` : ''}
            </div>
          `}
        </div>

        ${!isTargetSuper ? `
          <div style="display:flex; gap:5px; flex-wrap:wrap; padding-top:6px; border-top:1px dashed var(--border);">
            ${Object.keys(STAFF_PERMISSIONS_MAP).map(pk => {
              const hasP = perms.includes(pk);
              return `<button class="sq-btn ${hasP ? 'sq-btn-gold' : 'sq-btn-outline'}" style="padding:3px 8px!important; font-size:10px!important;" onclick="window.sqToggleStaffPermission('${u.uid}', '${pk}', ${hasP})"><i class="fa-solid ${hasP ? 'fa-check' : 'fa-plus'}"></i> ${STAFF_PERMISSIONS_MAP[pk].label}</button>`;
            }).join('')}
            ${(perms.length > 0 || isPub || hasLegacyAdmin) ? `<button class="sq-btn" style="background:var(--danger)!important; color:#fff!important; padding:3px 9px!important; font-size:10px!important;" onclick="window.sqRevokeAllUserRoles('${u.uid}')">انتزاع كل الصلاحيات</button>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
};

// منح أو انتزاع صلاحية دار النشر مع تحديد نسبة العمولة المئوية
window.sqTogglePublisher = function(uid, currentStatus) {
  if (!window.sqIsCurrentUserSuperAdmin()) {
    return sqShowToast("منح أو انتزاع صلاحية دار النشر محصور بالحسابين السياديين الأساسيين فقط", "danger");
  }
  if (window.sqIsSuperAdminUid(uid)) {
    return sqShowToast("لا يمكن تعديل صلاحيات الحساب السيادي الأساسي", "danger");
  }

  if (currentStatus) {
    if (!confirm("هل أنت متأكد من انتزاع ميزة (دار النشر المعتمدة) من هذا الحساب؟")) return;
    db.collection("safaqat_users").doc(uid).update({ isPublisher: false }).then(() => {
      if (AppState.allUsers[uid]) AppState.allUsers[uid].isPublisher = false;
      sqShowToast("تم انتزاع ميزة دار النشر من الحساب فوراً!", "warning");
      if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
      if (AppState.activeMainView === 'settings_page') window.sqRenderAdminDashboard();
    });
  } else {
    const existingRate = (AppState.allUsers[uid] && AppState.allUsers[uid].commissionRate !== undefined) ? AppState.allUsers[uid].commissionRate : 10;
    window.sqOpenCustomPrompt("حدد نسبة عمولة منصة صفقات كتابية (%) المتفق عليها مع دار النشر هذه (تُحتسب تلقائياً على الطلبات المؤكد تسليمها):", String(existingRate), (rateInput) => {
      let rate = parseFloat(String(rateInput || '10').replace(/[^0-9.]/g, ''));
      if (isNaN(rate) || rate < 0 || rate > 100) rate = 10;
      db.collection("safaqat_users").doc(uid).update({
        isPublisher: true,
        commissionRate: rate
      }).then(() => {
        if (AppState.allUsers[uid]) {
          AppState.allUsers[uid].isPublisher = true;
          AppState.allUsers[uid].commissionRate = rate;
        }
        sqShowToast(`تم اعتماد الحساب كدار نشر (الشارة الذهبية) بعمولة منصة (${rate}%)!`, "success");
        if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
        if (AppState.activeMainView === 'settings_page') window.sqRenderAdminDashboard();
      });
    });
  }
};

window.sqSetPublisherCommissionPrompt = function(uid, currentRate = 10) {
  if (!window.sqIsCurrentUserSuperAdmin()) return;
  window.sqOpenCustomPrompt("تعديل نسبة عمولة المنصة (%) المتفق عليها مع دار النشر:", String(currentRate), (val) => {
    let rate = parseFloat(String(val || '10').replace(/[^0-9.]/g, ''));
    if (isNaN(rate) || rate < 0 || rate > 100) return sqShowToast("يرجى إدخال نسبة مئوية صحيحة بين 0 و 100", "warning");
    db.collection("safaqat_users").doc(uid).update({ commissionRate: rate }).then(() => {
      if (AppState.allUsers[uid]) AppState.allUsers[uid].commissionRate = rate;
      sqShowToast(`تم تحديث نسبة العمولة إلى ${rate}% بنجاح!`, "success");
      if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
      if (AppState.activeMainView === 'settings_page') window.sqRenderAdminDashboard();
    });
  });
};

// انتزاع شارة الإدارة الحمراء من أي حساب غير البريدين الأساسيين
window.sqStripLegacyAdminFlag = function(uid) {
  if (!window.sqIsCurrentUserSuperAdmin()) return;
  if (window.sqIsSuperAdminUid(uid)) return sqShowToast("لا يمكن انتزاع صلاحيات الحساب السيادي الأساسي", "danger");
  db.collection("safaqat_users").doc(uid).update({ isAdminUser: false, permissions: [] }).then(() => {
    if (AppState.allUsers[uid]) {
      AppState.allUsers[uid].isAdminUser = false;
      AppState.allUsers[uid].permissions = [];
    }
    sqShowToast("تم انتزاع صلاحية الإدارة من الحساب بنجاح!", "success");
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
    if (AppState.activeMainView === 'settings_page') window.sqRenderAdminDashboard();
  });
};

// انتزاع كافة الصلاحيات دفعة واحدة من أي حساب غير البريدين الأساسيين
window.sqRevokeAllUserRoles = function(uid) {
  if (!window.sqIsCurrentUserSuperAdmin()) return;
  if (window.sqIsSuperAdminUid(uid)) return sqShowToast("لا يمكن المساس بالحساب السيادي الأساسي", "danger");
  if (!confirm("هل أنت متأكد من سحب كافة الصلاحيات (دار النشر / الإدارة / الموظف) من هذا الحساب؟")) return;
  db.collection("safaqat_users").doc(uid).update({
    isPublisher: false,
    isAdminUser: false,
    permissions: []
  }).then(() => {
    if (AppState.allUsers[uid]) {
      AppState.allUsers[uid].isPublisher = false;
      AppState.allUsers[uid].isAdminUser = false;
      AppState.allUsers[uid].permissions = [];
    }
    sqShowToast("تم تجريد الحساب من كافة الصلاحيات الإدارية وصلاحيات النشر!", "warning");
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
    if (AppState.activeMainView === 'settings_page') window.sqRenderAdminDashboard();
  });
};

window.sqToggleAuthor = function(uid, currentStatus) {
  if (!window.sqIsCurrentUserSuperAdmin() && !window.sqHasPermission('manage_books')) return;
  const updates = { isAuthor: !currentStatus };
  if (!currentStatus) {
    updates.linkedPublishers = firebase.firestore.FieldValue.arrayUnion('DAR_MAIN');
  }
  db.collection("safaqat_users").doc(uid).update(updates).then(() => {
    if (AppState.allUsers[uid]) {
      AppState.allUsers[uid].isAuthor = !currentStatus;
    }
    sqShowToast(!currentStatus ? "تم توثيق الكاتب بالشارة الزرقاء!" : "تم انتزاع شارة الكاتب", "success");
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
    if (AppState.activeMainView === 'settings_page') window.sqFilterAdminStaffList(document.getElementById('adm-staff-search-in')?.value || '');
  });
};

window.sqToggleStaffPermission = function(uid, permKey, currentlyHas) {
  if (!window.sqIsCurrentUserSuperAdmin()) {
    return sqShowToast("منح أو نزع صلاحيات الموظفين محصور بالحسابين السياديين الأساسيين فقط", "danger");
  }
  if (window.sqIsSuperAdminUid(uid)) return;
  const userObj = AppState.allUsers[uid] || {};
  let perms = [...(userObj.permissions || [])];
  if (currentlyHas) perms = perms.filter(p => p !== permKey);
  else if (!perms.includes(permKey)) perms.push(permKey);

  db.collection("safaqat_users").doc(uid).update({ permissions: perms }).then(() => {
    if (AppState.allUsers[uid]) AppState.allUsers[uid].permissions = perms;
    sqShowToast("تم تحديث صلاحيات الحساب بنجاح!", "success");
    if (AppState.activeMainView === 'settings_page') window.sqFilterAdminStaffList(document.getElementById('adm-staff-search-in')?.value || '');
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
  });
};

window.sqSaveGeneralDarSettings = function() {
  if (!window.sqIsCurrentUserSuperAdmin()) return;
  const appName = (document.getElementById('cfg-in-appname')?.value || APP_NAME).trim();
  const logoUrl = (document.getElementById('cfg-in-logo')?.value || APP_LOGO_URL).trim();
  const whatsappNumber = (document.getElementById('cfg-in-wa')?.value || DAR_WHATSAPP_NUMBER).trim();
  const defaultCurrency = (document.getElementById('cfg-in-curr')?.value || DEFAULT_CURRENCY).trim();

  const payload = { appName, logoUrl, whatsappNumber, defaultCurrency, updatedAt: Date.now() };
  db.collection("safaqat_settings").doc("general").set(payload, { merge: true }).then(() => {
    window.sqApplyDynamicDarSettings(payload);
    sqShowToast("تم حفظ وتطبيق إعدادات المنصة بنجاح!", "success");
  });
};

window.sqReplyTicket = function(ticketId, targetUid) {
  window.sqOpenCustomPrompt("اكتب رد الإدارة على هذه التذكرة:", "", (replyTxt) => {
    if (!replyTxt) return;
    db.collection("safaqat_tickets").doc(ticketId).update({ reply: replyTxt }).then(() => {
      window.sqSendNotif(targetUid, null, `ردّت إدارة الدار على تذكرتك في قسم الدعم.`);
      sqShowToast("تم إرسال الرد للعضو", "success");
    });
  });
};

window.sqToggleMute = function(uid, currentMute) {
  if (!window.sqHasPermission('manage_mod')) return;
  if (window.sqIsSuperAdminUid(uid)) return sqShowToast("لا يمكن تقييد الحساب السيادي الأساسي", "danger");
  db.collection("safaqat_users").doc(uid).update({ isMuted: !currentMute }).then(() => {
    if (AppState.allUsers[uid]) AppState.allUsers[uid].isMuted = !currentMute;
    sqShowToast(!currentMute ? "تم تقييد الحساب من النشر" : "تم فك التقييد", "warning");
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
  });
};

window.sqToggleBan = function(uid, currentBan) {
  if (!window.sqIsCurrentUserSuperAdmin()) return;
  if (window.sqIsSuperAdminUid(uid)) return sqShowToast("لا يمكن حظر الحساب السيادي الأساسي", "danger");
  if (!confirm(currentBan ? "فك الحظر عن هذا الحساب؟" : "حظر هذا الحساب نهائياً؟")) return;
  db.collection("safaqat_users").doc(uid).update({ isBanned: !currentBan }).then(() => {
    if (AppState.allUsers[uid]) AppState.allUsers[uid].isBanned = !currentBan;
    sqShowToast("تم تحديث حالة الحظر", "danger");
    if (AppState.activeMainView === 'profile_page') window.sqRenderProfilePage();
  });
};

// =========================================================
// 🤖 المساعد الأدبي الذكي المدمج "راوي" (Rawi Smart Companion)
// ملم بكافة الكتب ودور النشر وأقسام المنصة ويعرض بطاقات الكتب القابلة للضغط فوراً
// =========================================================
window.sqToggleRawiChat = function() {
  AppState.rawiOpen = !AppState.rawiOpen;
  const drawer = document.getElementById('sq-rawi-drawer');
  if (!drawer) return;
  drawer.style.display = AppState.rawiOpen ? 'flex' : 'none';

  const msgBox = document.getElementById('sq-rawi-messages');
  if (AppState.rawiOpen && msgBox && !msgBox.children.length) {
    const userName = AppState.currentUser ? getRealName(AppState.currentUser.uid, AppState.currentUser.displayName) : 'يا غالي';
    window.sqAppendRawiBubble('bot', `يا هلا ونورت منصة **${APP_NAME}** ${escapeHtml(userName)}! 🌟\nأنا **راوي**، رفيقك الأدبي هنا وعارف كل صغيرة وكبيرة في المنصة.\n\nتقدر تسألني عن أي كتاب أو رواية أو كاتب، ومجرد ما يطلع لك الكتاب في رسالتي اضغط عليه يوديك لصفحته فوراً! تحب أرشح لك إيه النهاردة؟`, []);
  }
  if (AppState.rawiOpen) {
    setTimeout(() => document.getElementById('sq-rawi-input')?.focus(), 80);
  }
};

window.sqAskRawiQuick = function(qText) {
  const inp = document.getElementById('sq-rawi-input');
  if (inp) inp.value = qText;
  window.sqSendRawiMessage();
};

window.sqAppendRawiBubble = function(sender, textHtml, matchedBooks = []) {
  const msgBox = document.getElementById('sq-rawi-messages');
  if (!msgBox) return;

  const bubble = document.createElement('div');
  bubble.className = `sq-rawi-bubble ${sender}`;

  let formattedText = escapeHtml(textHtml)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  let booksCardsHtml = '';
  if (Array.isArray(matchedBooks) && matchedBooks.length > 0) {
    booksCardsHtml = `<div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">` + matchedBooks.map(b => {
      const pInfo = window.sqFormatBookPrice(b);
      const aName = b.authorUid ? getRealName(b.authorUid, b.authorName) : (b.authorName || 'مؤلف');
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:var(--bg); border:1.5px solid var(--accent); border-radius:12px; padding:7px 9px; cursor:pointer;" onclick="window.sqToggleRawiChat(); window.sqOpenBookDetail('${b.id}')">
          <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
            <img src="${escapeHtml(b.cover || APP_LOGO_URL)}" style="width:34px; height:48px; object-fit:cover; border-radius:6px; flex-shrink:0;">
            <div style="overflow:hidden;">
              <div style="font-size:12px; font-weight:900; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(b.title)}</div>
              <div style="font-size:10.5px; color:var(--text-muted);">${escapeHtml(aName)}</div>
              <div style="font-size:11px; font-weight:900; color:var(--accent);">${pInfo.current > 0 ? pInfo.current + ' ' + pInfo.symbol : 'قراءة / تحميل مجاني'}</div>
            </div>
          </div>
          <span class="sq-btn sq-btn-gold" style="padding:4px 9px!important; font-size:10.5px!important; flex-shrink:0;">افتح الكتاب <i class="fa-solid fa-arrow-left"></i></span>
        </div>
      `;
    }).join('') + `</div>`;
  }

  bubble.innerHTML = `<div>${formattedText}</div>${booksCardsHtml}`;
  msgBox.appendChild(bubble);
  msgBox.scrollTop = msgBox.scrollHeight;
};

// البحث الذكي الفوري لـ "راوي" داخل قاعدة بيانات المنصة + الاتصال بالنموذج الذكي
window.sqFindBooksForRawiQuery = function(query) {
  if (!AppState.booksList.length) return [];
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];

  if (q.includes('مجاني') || q.includes('مجانيه') || q.includes('تحميل') || q.includes('قراءة')) {
    return AppState.booksList.filter(b => Number(b.price) <= 0 || Boolean(b.downloadUrl)).slice(0, 4);
  }
  if (q.includes('رشح') || q.includes('اقترح') || q.includes('افضل') || q.includes('أفضل') || q.includes('رواية') || q.includes('روايه')) {
    return [...AppState.booksList].sort((a, b) => window.SafaqatAI.scoreBookForUser(b) - window.SafaqatAI.scoreBookForUser(a)).slice(0, 3);
  }

  const words = q.replace(/(كتاب|رواية|روايه|ابغى|أبغى|عايز|عندكم|وين|فين|عن|اسم)/g, '').trim().split(/\s+/).filter(w => w.length >= 2);
  if (!words.length) return [];

  return AppState.booksList
    .map(b => {
      let pts = 0;
      const t = (b.title || '').toLowerCase();
      const a = (b.authorName || '').toLowerCase();
      const d = (b.desc || '').toLowerCase();
      const p = (b.publisherName || '').toLowerCase();
      if (t.includes(q)) pts += 100;
      words.forEach(w => {
        if (t.includes(w)) pts += 45;
        if (a.includes(w)) pts += 35;
        if (p.includes(w)) pts += 25;
        if (d.includes(w)) pts += 10;
      });
      return { book: b, pts };
    })
    .filter(x => x.pts > 0)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 4)
    .map(x => x.book);
};

window.sqSendRawiMessage = async function() {
  const inp = document.getElementById('sq-rawi-input');
  if (!inp) return;
  const userText = inp.value.trim();
  if (!userText) return;
  inp.value = '';

  window.sqAppendRawiBubble('user', userText, []);

  const matchedBooks = window.sqFindBooksForRawiQuery(userText);
  const pubsList = window.sqGetApprovedPublishersList();
  const qLow = userText.toLowerCase();

  // بناء رد ذكي ودافئ وموثق من بيانات المنصة الحية أولاً
  let localSmartReply = '';
  if (qLow.includes('دور النشر') || qLow.includes('دار نشر') || qLow.includes('الناشرين')) {
    const pubNames = pubsList.map(p => `• ${p.name} (${p.booksCount} إصدار)`).join('\n');
    localSmartReply = `يا سيدي سؤالك في محله! 🌟 عندنا في **${APP_NAME}** دور نشر معتمدة وموثقة بالشارة الذهبية، ودي قائمتها الحالية:\n${pubNames}\n\nتقدر تضغط على زر **(دور النشر)** أعلى المتجر عشان تستكشف كل دار ومؤلفينها!`;
  } else if (qLow.includes('طلب') || qLow.includes('فاتور') || qLow.includes('شراء') || qLow.includes('اشتر')) {
    localSmartReply = `ولا أسهل من كدة يا غالي! 🛒\n1. ادخل صفحة أي كتاب واضغط **(اطلب النسخة الورقية الآن)**.\n2. من تبويب **(السلة والطلبات)** اكتب اسمك الحقيقي الثلاثي ورقم جوالك وعنوانك.\n3. النظام هيطلع لك فاتورة رسمية برقم يبدأ بـ **SK** ويحولك لواتساب الدار مباشرة لتأكيد الشحن، وتقدر تتابع مراحل شحن طلبك خطوة بخطوة!`;
  } else if (matchedBooks.length > 0) {
    const firstB = matchedBooks[0];
    localSmartReply = `يا جمال ذوقك في الاختيار! 📚✨\nلقيت لك اللي بتدور عليه في مكتبة **${APP_NAME}**.. اضغط مباشرة على بطاقة الكتاب تحت رسالتي دي وهيفتح معاك فوراً لتصفحه أو قراءته أو طلبه:`;
  }

  // محاولة إثراء الرد عبر Gemini API إن لم يكن السؤال مباشرًا عن كتاب محدد
  if (!localSmartReply && typeof RAWI_GEMINI_API_KEY === 'string' && RAWI_GEMINI_API_KEY.startsWith('AIza')) {
    try {
      const catalogContext = AppState.booksList.slice(0, 20).map(b => `${b.title} للمؤلف ${b.authorName || ''} (${b.price || 0} ر.س)`).join(' | ');
      const sysPrompt = `أنت "راوي"، المساعد الأدبي الذكي والودود لمنصة ومتجر "صفقات كتابية" (لصاحبها الكاتب أحمد رشاد - راوي الشمال). تحدث بلباقة ومجاملة لطيفة ومزيج راقٍ من الفصحى السلسة واللمسة المصرية الودودة. الكتب المتوفرة في المتجر حالياً: [${catalogContext}]. أجب باختصار ودقة في 3 أسطر كحد أقصى.`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${RAWI_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${sysPrompt}\n\nسؤال الزائر: ${userText}` }] }]
        })
      });
      const data = await res.json();
      const aiTxt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiTxt) localSmartReply = aiTxt.trim();
    } catch (e) {}
  }

  if (!localSmartReply) {
    const fallbackBooks = AppState.booksList.slice(0, 3);
    localSmartReply = `منورنا والله يا صديقي القارئ! 🌟\nأنا معاك في **${APP_NAME}** لخدمتك.. حالياً عندنا (${AppState.booksList.length}) إصدار في المتجر، ودي مجموعة من أبرز الإصدارات المتاحة قدامك دلوقتي تقدر تضغط على أي كتاب فيها وتستكشفه فوراً:`;
    window.sqAppendRawiBubble('bot', localSmartReply, fallbackBooks);
    return;
  }

  window.sqAppendRawiBubble('bot', localSmartReply, matchedBooks);
};

// =========================================================
// 🔐 تهيئة النظام الشاملة والمصادقة الآمنة (الإصدار 1.8)
// =========================================================
window.sqLogin = function() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  auth.signInWithPopup(provider).then((result) => {
    if (result && result.user) {
      sqShowToast("نورت صفقات كتابية! تم تسجيل الدخول بنجاح", "success");
    }
  }).catch((err) => {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
      auth.signInWithRedirect(provider);
    } else if (err.code !== 'auth/popup-closed-by-user') {
      console.warn("Auth Error:", err);
      sqShowToast("تأكد من الاتصال بالشبكة أو إعدادات المتصفح", "warning");
    }
  });
};

window.sqLogout = function() {
  auth.signOut().then(() => {
    window.sqSwitchMainView('store');
    sqShowToast("تم تسجيل الخروج بنجاح.. ننتظرك قريباً!", "success");
  });
};

function sqInitAuth() {
  window.sqApplyThemeMode(localStorage.getItem('sq_theme_pref') || 'light');

  auth.getRedirectResult().then((result) => {
    if (result && result.user) {
      sqShowToast("نورت صفقات كتابية! تم تسجيل الدخول بنجاح", "success");
    }
  }).catch(() => {});

  try {
    const cachedUsers = localStorage.getItem('sq_offline_users_cache');
    if (cachedUsers) AppState.allUsers = JSON.parse(cachedUsers);
    const cachedBooks = localStorage.getItem('sq_offline_books_cache');
    if (cachedBooks) {
      AppState.booksList = JSON.parse(cachedBooks);
      if (AppState.activeMainView === 'store') window.sqRenderLibrarySection();
    }
    const cachedPosts = localStorage.getItem('sq_offline_posts_cache');
    if (cachedPosts) {
      AppState.posts = JSON.parse(cachedPosts);
    }
  } catch (e) {}

  window.sqInitCartFromStorage();
  db.collection("safaqat_settings").doc("general").get().then(doc => {
    if (doc.exists) window.sqApplyDynamicDarSettings(doc.data());
  }).catch(() => {});

  window.sqListenBooks();
  window.sqLoadFeed();
  window.sqListenStories();
  window.sqListenEvents();

  db.collection("safaqat_users").get().then(snap => {
    snap.forEach(doc => { AppState.allUsers[doc.id] = doc.data(); });
    try { localStorage.setItem('sq_offline_users_cache', JSON.stringify(AppState.allUsers)); } catch (e) {}
    window.sqRenderStoriesBar();
    if (AppState.booksList.length > 0 && AppState.activeMainView === 'store') window.sqRenderLibrarySection();
    if (AppState.posts.length > 0 && AppState.activeMainView === 'community') window.sqRenderFeed(true);
  }).catch(() => {});

  auth.onAuthStateChanged(user => {
    if (AppState.presenceInterval) clearInterval(AppState.presenceInterval);
    if (AppState.userDocUnsubscribe) AppState.userDocUnsubscribe();

    const authArea = document.getElementById('sq-auth-area');
    if (user) {
      AppState.currentUser = user;
      AppState.isSuperAdmin = window.sqIsSuperAdminEmail(user.email);
      AppState.isAdmin = AppState.isSuperAdmin;

      window.sqListenNotifs();
      window.sqListenOrders();
      window.sqListenTickets();

      const updatePresence = () => {
        if (AppState.currentUser && navigator.onLine) {
          db.collection("safaqat_users").doc(AppState.currentUser.uid).update({ lastActive: Date.now() }).catch(() => {});
        }
      };
      updatePresence();
      AppState.presenceInterval = setInterval(updatePresence, 180000);

      AppState.userDocUnsubscribe = db.collection("safaqat_users").doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
          AppState.userData = doc.data();
          AppState.allUsers[user.uid] = AppState.userData;
          if (!AppState.userData.following) AppState.userData.following = [];
          if (!AppState.userData.blockedUsers) AppState.userData.blockedUsers = [];
          if (!AppState.userData.bookmarks) AppState.userData.bookmarks = [];
          if (!AppState.userData.savedBooks) AppState.userData.savedBooks = [];
          if (!AppState.userData.readingShelf) AppState.userData.readingShelf = {};
          if (!AppState.userData.readingProgress) AppState.userData.readingProgress = {};
          if (!AppState.userData.permissions) AppState.userData.permissions = [];
          if (!AppState.userData.linkedPublishers) AppState.userData.linkedPublishers = [];
          if (AppState.userData.showOnline === undefined) AppState.userData.showOnline = true;
          if (!AppState.userData.joinedAt) db.collection("safaqat_users").doc(user.uid).update({ joinedAt: Date.now() });

          // تأكيد حفظ البريد الإلكتروني وتثبيت الإدارة العليا للبريدين الأساسيين فقط
          if (AppState.isSuperAdmin && (!AppState.userData.isAdminUser || AppState.userData.email !== user.email)) {
            db.collection("safaqat_users").doc(user.uid).update({ email: user.email, isAdminUser: true }).catch(() => {});
          } else if (!AppState.isSuperAdmin && !AppState.userData.email && user.email) {
            db.collection("safaqat_users").doc(user.uid).update({ email: user.email }).catch(() => {});
          }

          if (AppState.userData.isBanned && !AppState.isSuperAdmin) {
            auth.signOut();
            alert("عذراً، تم إيقاف هذا الحساب من قبل إدارة المنصة.");
            return;
          }

          if (!AppState.userData.agreedToTerms && !AppState.isSuperAdmin) {
            window.sqOpenLegalPage('terms', true);
          }

          if (AppState.userData.theme) window.sqApplyThemeMode(AppState.userData.theme);
          if (AppState.userData.fontSize) document.documentElement.style.setProperty('--post-font-size', AppState.userData.fontSize);
          window.sqRenderStoriesBar();
          if (AppState.activeMainView === 'store') window.sqRenderLibrarySection();
        } else {
          const initDoc = {
            displayName: user.displayName || 'قارئ في صفقات',
            email: user.email || '',
            isAdminUser: AppState.isSuperAdmin,
            photoURL: user.photoURL || DEFAULT_PIC,
            following: [], blockedUsers: [], bookmarks: [], savedBooks: [],
            readingShelf: {}, readingProgress: {}, currentlyReadingBookId: '',
            permissions: [], linkedPublishers: [], publisherWhatsapp: '', commissionRate: 10,
            aiInterests: { cats: {}, authors: {}, keywords: {}, viewedBooks: [] },
            theme: 'auto', fontSize: '16.5px', showOnline: true,
            isBanned: false, isMuted: false, isAuthor: false, isPublisher: false,
            customName: '', bio: '', statusText: '', nationality: '', birthday: '',
            agreedToTerms: false, joinedAt: Date.now(), lastActive: Date.now()
          };
          AppState.userData = initDoc;
          AppState.allUsers[user.uid] = initDoc;
          db.collection("safaqat_users").doc(user.uid).set(initDoc).then(() => {
            if (!AppState.isSuperAdmin) window.sqOpenLegalPage('terms', true);
          });
        }
        if (authArea) {
          authArea.innerHTML = `
            <button class="sq-icon-btn" style="padding:0; overflow:hidden; border:1.5px solid var(--accent);" onclick="window.sqViewProfile('${user.uid}')" title="حسابي">
              <img src="${getRealPhoto(user.uid, user.photoURL)}" style="width:100%; height:100%; object-fit:cover;">
            </button>
          `;
        }
        window.sqUpdateBadgesUI();
        const adminTools = document.getElementById('sq-admin-tools');
        if (adminTools) adminTools.style.display = AppState.isSuperAdmin ? 'block' : 'none';
      });
    } else {
      AppState.currentUser = null;
      AppState.isAdmin = false;
      AppState.isSuperAdmin = false;
      if (authArea) {
        authArea.innerHTML = `
          <button class="sq-btn sq-btn-gold" style="padding:7px 15px!important; font-size:12px!important;" onclick="window.sqLogin()">
            <i class="fa-brands fa-google"></i> دخول
          </button>
        `;
      }
      if (!localStorage.getItem('sq_guest_agreed_v18') && !AppState.deepLinkHandled) {
        setTimeout(() => {
          if (!AppState.currentUser && !localStorage.getItem('sq_guest_agreed_v18')) {
            window.sqOpenLegalPage('terms', true);
          }
        }, 1200);
      }
    }
  });
}

// =========================================================
// 🚀 تشغيل المنصة المتكاملة (الإصدار 1.8 — النسخة الكاملة على GitHub)
// =========================================================
sqInitPWAAndOffline();
sqInitAuth();
