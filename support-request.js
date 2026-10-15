/* support-request.js
   Adds a "Contact support" button to the action bar of every issue page in the troubleshooting wizards.
   Tapping it opens a dialog that builds an email template for the current issue:
     issue + system, company, affected user(s), contact person, when it happened, location, issue-specific
     details, expected vs actual behaviour, the steps the client completed (tick-boxes pre-filled from the page),
     and any comments (pre-filled from the page's own Notes box).
   "Open email app" opens a mailto: link to SUPPORT_EMAIL; "Copy email text" is the fallback for long messages
   or computers with no email app. Nothing is sent or stored by this script.

   Usage (each wizard, after wizard-data.js):
     <script src="support-request.js"></script>
     ... SupportRequest.init({ pageKey: PAGE_KEY, titles: STEP_TITLES });

   To change the support address, the per-system extra questions or the mobile-app questions, edit the
   constants just below. Hub pages (steps that only show a grid of issue cards), the start screen and the
   "resolved" screen do not show the button. */
(function (global) {
  'use strict';

  var SUPPORT_EMAIL = 'support@smartalock.com';
  var MAX_STEP_CHARS = 130;      /* long step texts are shortened in the email */
  var MAILTO_SOFT_LIMIT = 1900;  /* some email apps cut longer mailto: links off */

  var SYSTEMS = {
    Locker: {
      name: 'Locker System (Smartalock)', short: 'Smartalock',
      extra: ['Locker bank name / location:', 'Controller or locker bank serial number (if known):', 'Locker number(s) affected:']
    },
    Desk: {
      name: 'Desk Booking System (Floorsense)', short: 'Floorsense Desk',
      extra: ['Desk number(s) affected:', 'Handset / puck / sensor details (if known):']
    },
    Handset: {
      name: 'Desk Booking System (Floorsense)', short: 'Floorsense Handset',
      extra: ['Desk number(s) affected:', 'What the handset screen shows:', 'Handset / puck serial number (if known):']
    },
    MeetingRoom: {
      name: 'Meeting Room Booking System (Floorsense)', short: 'Floorsense Meeting Room',
      extra: ['Room name(s) affected:', 'Room panel / display details (if known):']
    }
  };
  /* Steps whose id starts with "mobile-" are about the Floorsense mobile app, not site hardware. */
  var MOBILE_EXTRA = [
    'Phone make and model:',
    'Phone operating system and version (iOS / Android):',
    'Floorsense app version (if known):',
    'Email address used for the Floorsense account:',
    'Connection when it happened (Wi-Fi or mobile data):'
  ];

  var cfg = null, built = false, els = {}, stepList = [], currentStepId = null, lastFocus = null, dirty = false;

  function q(sel, root) { return (root || document).querySelector(sel); }
  function clean(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function shorten(t) {
    t = clean(t);
    if (t.length <= MAX_STEP_CHARS) return t;
    var cut = t.slice(0, MAX_STEP_CHARS);
    var sp = cut.lastIndexOf(' ');
    return (sp > 60 ? cut.slice(0, sp) : cut) + '...';
  }

  /* ---------- reading the page ---------- */
  function activeStepEl() { return q('.wizard-step.active'); }
  function isIssueStep(el) {
    if (!el || !el.id) return false;
    var id = el.id.replace('step-', '');
    if (id === 'select' || id === 'resolved') return false;
    if (el.querySelector('.decision-grid')) return false;   /* hub pages are not issues */
    return true;
  }
  function titleOf(id) {
    var t = cfg.titles && cfg.titles[id];
    return (t && t.title) ? t.title : id.replace(/-/g, ' ');
  }
  function issueTitle(el, id) {
    var parent = null, crumb = q('.crumb-link', el);
    if (crumb) {
      var m = /goToStep\('([^']+)'\)/.exec(crumb.getAttribute('onclick') || '');
      if (m && m[1] !== 'select') parent = m[1];
    }
    return (parent ? titleOf(parent) + ' > ' : '') + titleOf(id);
  }
  function collectSteps(el) {
    var out = [];
    el.querySelectorAll('.check-item, .step-list > li').forEach(function (li) {
      var box = q('input[type="checkbox"]', li), label = q('label', li);
      var text = clean(label ? label.textContent : li.textContent);
      if (!text) return;
      var g = li.closest('[data-sr-group]');
      out.push({ text: text, checked: !!(box && box.checked), group: g ? g.getAttribute('data-sr-group') : '' });
    });
    return out;
  }
  function notesFor(id) {
    try { return (global.STW && global.STW.getComment) ? clean(global.STW.getComment(cfg.pageKey, id)) : ''; } catch (e) { return ''; }
  }

  /* ---------- building the email ---------- */
  function system() {
    if (currentStepId && currentStepId.indexOf('mobile-') === 0) return { name: 'Floorsense Mobile App', short: 'Floorsense Mobile App', extra: MOBILE_EXTRA };
    return SYSTEMS[cfg.pageKey] || { name: document.title, short: document.title, extra: [] };
  }

  /* Steps are listed in page order. If the page marks sections with data-sr-group (e.g. "How to check in"
     then "Troubleshooting"), the steps are grouped under those headings in the same order. */
  function stepsBlock() {
    var lines = [], lastGroup = null, inputs = els.steps.querySelectorAll('input');
    stepList.forEach(function (s, i) {
      if (!(inputs[i] && inputs[i].checked)) return;
      if (s.group && s.group !== lastGroup) lines.push(s.group + ':');
      lastGroup = s.group;
      lines.push('- ' + shorten(s.text));
    });
    if (!lines.length) lines.push('- (none of the guide steps were completed)');
    return lines.join('\n');
  }
  function buildBody() {
    var el = activeStepEl(), id = currentStepId, sys = system();
    var extra = sys.extra;
    var notes = notesFor(id);
    var L = [];
    L.push('Hi Support team,', '', 'I followed the troubleshooting guide but could not resolve this issue.', '');
    L.push('ISSUE', 'System: ' + sys.name, 'Issue: ' + issueTitle(el, id), '');
    L.push('COMPANY AND LOCATION', 'Company name: ', 'Site / building: ', 'Floor / area: ', '');
    L.push('AFFECTED USER(S)', 'Name(s): ', 'Email(s): ', '');
    L.push('CONTACT PERSON', 'Name: ', 'Email: ', 'Phone: ', 'Best time to call: ', '');
    L.push('WHEN IT HAPPENED', 'Date and time (with time zone): ', 'Once, intermittent or ongoing: ', '');
    if (extra.length) { L.push('ISSUE DETAILS'); extra.forEach(function (x) { L.push(x + ' '); }); L.push(''); }
    L.push('EXPECTED BEHAVIOUR', '[What should happen]', '');
    L.push('ACTUAL BEHAVIOUR', '[What actually happens, including any error message]', '');
    var pt = global.PhotoTriage && global.PhotoTriage.last;
    if (pt && pt.cardId === id) {
      L.push('PHOTO ANALYSIS', 'The client scanned a photo or screenshot. ' + (pt.byAI ? 'Automatic analysis: looks like "' + pt.title + '"' + (pt.confidence != null ? ' (' + Math.round(pt.confidence * 100) + '% confidence)' : '') + ', confirmed by the client.' : 'The client chose "' + pt.title + '" from the list.'));
      if (pt.readText) L.push('Text read from the picture: ' + pt.readText);
      L.push('[Please attach the photo or screenshot to this email]', '');
    }
    L.push('STEPS PERFORMED', stepsBlock(), '');
    L.push('ADDITIONAL COMMENTS', notes || '[Anything that helps us recreate the issue. Please attach screenshots or photos if you can.]', '');
    L.push('Thank you');
    return L.join('\n');
  }
  function buildSubject() {
    var el = activeStepEl();
    return 'Support request: ' + issueTitle(el, currentStepId) + ' (' + system().short + ')';
  }

  /* ---------- dialog ---------- */
  function injectStyle() {
    if (q('#srStyle')) return;
    var st = document.createElement('style');
    st.id = 'srStyle';
    st.textContent =
      '.sr-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,24,30,.45);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.sr-overlay[hidden]{display:none}' +
      '.sr-dialog{background:#fff;color:var(--ink,#1D1D1F);width:100%;max-width:720px;max-height:calc(100vh - 32px);overflow:auto;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.28);padding:22px 24px 20px;font-family:var(--font-text,Inter,-apple-system,Helvetica,Arial,sans-serif)}' +
      '.sr-head{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
      '.sr-head h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.01em}' +
      '.sr-x{border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:var(--ink-soft,#6E6E73);padding:2px 8px;border-radius:8px}' +
      '.sr-x:hover{background:var(--paper-soft,#F5F5F7)}' +
      '.sr-lead{margin:6px 0 14px;font-size:13.5px;line-height:1.55;color:var(--ink-soft,#6E6E73)}' +
      '.sr-label{margin:14px 0 6px;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft,#6E6E73)}' +
      '.sr-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '.sr-steps li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.5}' +
      '.sr-steps input{margin-top:3px;width:16px;height:16px;flex:none;accent-color:var(--accent,#0071E3)}' +
      '.sr-steps .sr-group{display:block;margin-top:6px;font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--ink-soft,#6E6E73)}' +
      '.sr-steps .sr-none{color:var(--ink-soft,#6E6E73);font-size:13px}' +
      '.sr-meta{font-size:13.5px;line-height:1.5}' +
      '.sr-meta b{font-weight:600}' +
      '.sr-dialog input.sr-subject,.sr-dialog textarea{width:100%;box-sizing:border-box;border:1px solid var(--line,#D2D2D7);border-radius:10px;padding:9px 11px;font:13px/1.5 var(--font-text,Inter,Helvetica,Arial,sans-serif);color:inherit;background:#fff}' +
      '.sr-dialog textarea{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;min-height:300px;resize:vertical;line-height:1.5}' +
      '.sr-dialog input.sr-subject:focus,.sr-dialog textarea:focus{outline:2px solid var(--accent,#0071E3);outline-offset:-1px}' +
      '.sr-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:14px;position:sticky;bottom:-20px;background:#fff;padding:10px 0 20px;border-top:1px solid var(--line,#D2D2D7)}' +
      '.sr-btn{font-family:inherit;font-weight:600;font-size:13.5px;border-radius:980px;cursor:pointer;padding:10px 20px;text-decoration:none;display:inline-block;border:1px solid var(--line,#D2D2D7);background:#fff;color:var(--accent,#0071E3)}' +
      '.sr-btn:hover{border-color:var(--accent,#0071E3);background:var(--accent-wash,#E8F1FC)}' +
      '.sr-btn.sr-primary{background:var(--accent,#0071E3);border-color:var(--accent,#0071E3);color:#fff}' +
      '.sr-btn.sr-primary:hover{background:var(--accent-deep,#0058B0)}' +
      '.sr-note{min-height:18px;margin-top:10px;font-size:12.5px;line-height:1.5;color:var(--ink-soft,#6E6E73)}' +
      '.sr-note.warn{color:var(--warning-deep,#93650A)}' +
      '#supportBtn{display:inline-flex;align-items:center;gap:7px}' +
      '#supportBtn[hidden]{display:none}' +
      '#supportBtn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
      '@media (max-width:560px){.sr-dialog{padding:18px 16px 16px}.sr-actions .sr-btn{flex:1;text-align:center}}';
    document.head.appendChild(st);
  }

  function build() {
    if (built) return;
    built = true;
    injectStyle();
    var ov = document.createElement('div');
    ov.className = 'sr-overlay'; ov.id = 'srOverlay'; ov.hidden = true;
    ov.innerHTML =
      '<div class="sr-dialog" role="dialog" aria-modal="true" aria-labelledby="srTitle">' +
        '<div class="sr-head"><h2 id="srTitle">Contact support</h2><button type="button" class="sr-x" id="srClose" aria-label="Close">&times;</button></div>' +
        '<p class="sr-lead">Sorry this wasn&rsquo;t fixed. Tick the steps you completed, then open the email, fill in the blanks and send it. You can edit the text first.</p>' +
        '<div class="sr-label">Steps you completed</div><ul class="sr-steps" id="srSteps"></ul>' +
        '<div class="sr-label">Email</div>' +
        '<div class="sr-meta"><b>To:</b> ' + SUPPORT_EMAIL + '</div>' +
        '<div class="sr-label" style="margin-top:10px"><label for="srSubject" style="font:inherit;letter-spacing:inherit;text-transform:inherit">Subject</label></div>' +
        '<input type="text" class="sr-subject" id="srSubject">' +
        '<div class="sr-label"><label for="srBody" style="font:inherit;letter-spacing:inherit;text-transform:inherit">Message</label></div>' +
        '<textarea id="srBody" spellcheck="false"></textarea>' +
        '<div class="sr-note" id="srNote" role="status" aria-live="polite"></div>' +
        '<div class="sr-actions">' +
          '<button type="button" class="sr-btn" id="srCopy">Copy email text</button>' +
          '<a class="sr-btn sr-primary" id="srMail" href="#">Open email app</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    els.ov = ov; els.steps = q('#srSteps', ov); els.subject = q('#srSubject', ov); els.body = q('#srBody', ov);
    els.note = q('#srNote', ov); els.mail = q('#srMail', ov);

    q('#srClose', ov).addEventListener('click', close);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) {
      if (ov.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(ov.querySelectorAll('button,a[href],input,textarea'), function (n) { return !n.disabled && n.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    els.steps.addEventListener('change', onStepsChanged);
    els.body.addEventListener('input', function () { dirty = true; refreshMail(); });
    els.subject.addEventListener('input', refreshMail);
    q('#srCopy', ov).addEventListener('click', copyText);
  }

  function onStepsChanged() {
    if (!dirty) { els.body.value = buildBody(); refreshMail(); return; }
    /* The client has edited the text: only swap the steps section, keep everything they typed. */
    var v = els.body.value, a = v.indexOf('\nSTEPS PERFORMED\n'), b = v.indexOf('\nADDITIONAL COMMENTS');
    if (a >= 0 && b > a) {
      els.body.value = v.slice(0, a) + '\nSTEPS PERFORMED\n' + stepsBlock() + '\n' + v.slice(b);
    }
    refreshMail();
  }

  function mailtoUrl() {
    var body = els.body.value.replace(/\r?\n/g, '\r\n');
    return 'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent(els.subject.value) + '&body=' + encodeURIComponent(body);
  }
  function refreshMail() {
    var url = mailtoUrl();
    els.mail.href = url;
    if (url.length > MAILTO_SOFT_LIMIT) {
      els.note.className = 'sr-note warn';
      els.note.textContent = 'This message is long. If your email app cuts it off, use “Copy email text” and paste it into a new email to ' + SUPPORT_EMAIL + '.';
    } else {
      els.note.className = 'sr-note';
      els.note.textContent = '';
    }
  }
  function copyText() {
    var text = 'To: ' + SUPPORT_EMAIL + '\nSubject: ' + els.subject.value + '\n\n' + els.body.value;
    function ok() { els.note.className = 'sr-note'; els.note.textContent = 'Copied. Paste it into a new email to ' + SUPPORT_EMAIL + '.'; }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { els.note.className = 'sr-note warn'; els.note.textContent = 'Could not copy automatically. Select the message text and copy it manually.'; }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }

  function open() {
    var el = activeStepEl();
    if (!isIssueStep(el)) return;
    build();
    currentStepId = el.id.replace('step-', '');
    stepList = collectSteps(el);
    dirty = false;
    els.steps.innerHTML = '';
    if (!stepList.length) {
      var none = document.createElement('li'); none.className = 'sr-none'; none.textContent = 'This issue has no listed steps.'; els.steps.appendChild(none);
    }
    var shownGroup = null;
    stepList.forEach(function (s, i) {
      if (s.group && s.group !== shownGroup) {
        var gh = document.createElement('li'); gh.className = 'sr-group'; gh.textContent = s.group; els.steps.appendChild(gh);
      }
      shownGroup = s.group;
      var li = document.createElement('li');
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'srStep' + i; cb.checked = s.checked;
      var lb = document.createElement('label'); lb.htmlFor = cb.id; lb.textContent = shorten(s.text);
      li.appendChild(cb); li.appendChild(lb); els.steps.appendChild(li);
    });
    els.subject.value = buildSubject();
    els.body.value = buildBody();
    refreshMail();
    lastFocus = document.activeElement;
    els.ov.hidden = false;
    els.body.scrollTop = 0;
    var firstFocus = q('input', els.steps) || els.body;
    firstFocus.focus();
  }
  function close() {
    if (!els.ov) return;
    els.ov.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- the action-bar button ---------- */
  function updateButton() {
    var btn = q('#supportBtn');
    if (btn) btn.hidden = !isIssueStep(activeStepEl());
  }
  function addButton() {
    var ghost = q('#ghostBtn');
    if (!ghost || q('#supportBtn')) return;
    injectStyle();
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ghost'; b.id = 'supportBtn'; b.hidden = true;
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>Contact support';
    b.addEventListener('click', open);
    ghost.parentNode.insertBefore(b, ghost.nextSibling);
    var mo = new MutationObserver(updateButton);
    document.querySelectorAll('.wizard-step').forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['class'] }); });
    updateButton();
  }

  global.SupportRequest = {
    init: function (config) { cfg = config || {}; if (!cfg.titles) cfg.titles = {}; addButton(); },
    open: open, close: close, email: SUPPORT_EMAIL
  };
})(window);
