/* =====================================================================
   SỔ LỚP — lõi dùng chung: DOM, định dạng, biểu tượng, thông báo,
   hộp thoại, phiên đăng nhập, điều hướng, tính điểm, đọc/xuất bảng
   ===================================================================== */
'use strict';

var U = window.U = window.U || {};
U.appName = (window.APP_CONFIG && window.APP_CONFIG.APP_NAME) || 'Sổ Lớp';

/* ---------------- DOM, định dạng ---------------- */
U.$ = function (s, r) { return (r || document).querySelector(s); };
U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
U.esc = function (s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
U.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

var WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
function pad2(n) { return (n < 10 ? '0' : '') + n; }
/** '2026-10-03' -> '03/10/2026' */
U.fmtDate = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); };
/** '2026-10-03' -> 'Thứ Bảy, 03/10' */
U.fmtDay = function (iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  return WD[d.getDay()] + ', ' + m[3] + '/' + m[2];
};
/** '2026-10-10T21:00' -> '10/10, 21:00' */
U.fmtDue = function (s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(s || ''));
  return m ? m[3] + '/' + m[2] + (m[4] ? ', ' + m[4] + ':' + m[5] : '') : String(s || '');
};
U.todayIso = function () { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
U.isPast = function (s) { var t = Date.parse(String(s || '').length <= 10 ? s + 'T23:59' : s); return !isNaN(t) && t < Date.now(); };
/** 8.25 -> '8,3' ; null -> '—' */
U.fmtScore = function (n) {
  if (n === null || n === undefined || n === '' || isNaN(n)) return '—';
  return (Math.round(Number(n) * 10) / 10).toFixed(1).replace('.', ',');
};
/** Chuỗi người dùng gõ -> số 0..10 ; '' -> null ; sai -> NaN */
U.parseScore = function (s) {
  s = String(s === null || s === undefined ? '' : s).trim().replace(',', '.');
  if (s === '') return null;
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return NaN;
  var n = Number(s);
  return n >= 0 && n <= 10 ? n : NaN;
};
U.initials = function (name) {
  var p = String(name || '?').trim().split(/\s+/);
  return (p[p.length - 1] || '?').charAt(0).toUpperCase();
};
U.fileSize = function (b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };
U.fileExt = function (name) { var m = /\.([a-z0-9]{1,5})$/i.exec(name || ''); return m ? m[1] : 'tệp'; };

/* ---------------- biểu tượng (nét 1.8) ---------------- */
var ICONS = {
  logo: '<rect x="5" y="4" width="14" height="16" rx="3"/><path d="M9 9h6M9 12.5h6M9 16h3.5"/>',
  attend: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M15 9v12"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
  home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M4 17v3h16v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  fileUp: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5"/>',
  clip: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10.2 17.7a1.7 1.7 0 0 1-2.4-2.4L15.5 7.6"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5a1 1 0 0 0 1 .9h9a1 1 0 0 0 1-.9l1-12.5M9 7V4.5h6V7"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/>',
  alert: '<path d="M12 9v4M12 16.5h.01M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  board: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'
};
U.icon = function (name, cls) {
  return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
};
U.brand = function (href) {
  return '<a class="brand" href="' + (href || '#') + '">' + U.icon('logo') + '<span>' + U.esc(U.appName) + '</span></a>';
};

/* ---------------- thông báo nổi ---------------- */
U.toast = function (msg, type) {
  var box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  var el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = '<div class="grow">' + U.esc(msg) + '</div><button class="x" aria-label="Đóng">×</button>';
  box.appendChild(el);
  while (box.children.length > 3) box.removeChild(box.firstElementChild);
  var close = function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 220); };
  el.querySelector('.x').onclick = close;
  setTimeout(close, type === 'error' ? 6000 : 3000);
};
U.toastErr = function (e) { U.toast((e && e.message) || String(e), 'error'); };

/* ---------------- nút đang xử lý: khóa nút, vòng quay, báo lỗi ---------------- */
U.busy = async function (btn, fn, opts) {
  opts = opts || {};
  if (btn && btn.classList.contains('is-loading')) return;
  var sp = null;
  if (btn) { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); sp = document.createElement('span'); sp.className = 'spin'; btn.appendChild(sp); }
  try {
    var r = await fn();
    if (opts.ok) U.toast(opts.ok, 'ok');
    return r;
  } catch (e) {
    if (!opts.silent) U.toastErr(e);
    if (opts.rethrow) throw e;
  } finally {
    if (btn) { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); if (sp) sp.remove(); }
  }
};

/* ---------------- hộp thoại ---------------- */
U.modal = function (o) {
  var root = document.createElement('div');
  root.className = 'modal-root';
  root.innerHTML = '<div class="modal-bg"></div><div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-label="' + U.esc(o.title || '') + '">' +
    '<div class="modal-h"><h2>' + U.esc(o.title || '') + '</h2><button class="btn ghost sm icon m-x" aria-label="Đóng">' + U.icon('x') + '</button></div>' +
    '<div class="modal-b">' + (o.body || '') + '</div>' + (o.actions && o.actions.length ? '<div class="modal-f"></div>' : '') + '</div>';
  document.body.appendChild(root);
  var prev = document.activeElement, closed = false;
  var ctl = {
    el: root,
    $: function (s) { return root.querySelector(s); },
    $$: function (s) { return U.$$(s, root); },
    close: function (val) {
      if (closed) return; closed = true;
      document.removeEventListener('keydown', onKey, true);
      root.classList.add('closing');
      setTimeout(function () { root.remove(); if (prev && prev.focus) try { prev.focus(); } catch (e) {} }, 180);
      if (o.onClose) o.onClose(val);
    }
  };
  (o.actions || []).forEach(function (a) {
    var b = document.createElement('button');
    b.className = 'btn ' + (a.kind || '');
    b.innerHTML = '<span>' + U.esc(a.label) + '</span>';
    b.onclick = function () {
      if (!a.onClick) return ctl.close(a.value);
      var r = a.onClick(ctl, b);
      if (r && r.then) U.busy(b, function () { return r; });
    };
    root.querySelector('.modal-f').appendChild(b);
  });
  root.querySelector('.m-x').onclick = function () { ctl.close(); };
  root.querySelector('.modal-bg').onclick = function () { ctl.close(); };
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); ctl.close(); }
    if (e.key === 'Tab') {
      var f = U.$$('button, [href], input, select, textarea', root).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  document.addEventListener('keydown', onKey, true);
  setTimeout(function () { var x = root.querySelector('[autofocus], .modal-b input, .modal-b select, .modal-b textarea, .modal-f .btn.pri'); if (x) try { x.focus(); } catch (e) {} }, 50);
  return ctl;
};
U.confirm = function (o) {
  return new Promise(function (resolve) {
    U.modal({
      title: o.title || 'Xác nhận', body: '<p>' + U.esc(o.message || '') + '</p>',
      onClose: function (v) { resolve(v === true); },
      actions: [{ label: 'Huỷ', kind: 'ghost', value: false }, { label: o.ok || 'Đồng ý', kind: 'pri', value: true }]
    });
  });
};

/* ---------------- phiên đăng nhập (lưu trên máy) ---------------- */
U.Session = {
  get: function () { try { return JSON.parse(localStorage.getItem('solop_session') || 'null'); } catch (e) { return null; } },
  set: function (s) { try { localStorage.setItem('solop_session', JSON.stringify(s)); } catch (e) {} },
  clear: function () { try { localStorage.removeItem('solop_session'); } catch (e) {} },
  token: function () { var s = U.Session.get(); return s ? s.token : ''; },
  /** Trang chỉ dành cho vai trò role: không đúng thì về trang đăng nhập */
  require: function (role) {
    var s = U.Session.get();
    if (!s || !s.user || s.user.role !== role) { location.replace('index.html'); return null; }
    return s;
  }
};
U.logout = async function () {
  try { await Api.call('auth.logout', {}); } catch (e) {}
  U.Session.clear();
  location.replace('index.html');
};

/* ---------------- điều hướng bằng #/đường-dẫn ---------------- */
U.router = function (routes, fallback, onChange) {
  var guard = null;
  var canLeave = async function () {
    if (!guard) return true;
    var ok = await guard();
    if (ok) guard = null;
    return ok;
  };
  var resolve = async function () {
    var path = decodeURIComponent((location.hash || '#/').slice(1)) || '/';
    if (!await canLeave()) { history.replaceState(null, '', '#' + R.cur); return; }
    R.cur = path;
    var fn = routes[path];
    if (!fn) { location.replace('#' + fallback); return; }
    if (onChange) onChange(path);
    window.scrollTo(0, 0);
    try { await fn(); } catch (e) { U.toastErr(e); }
  };
  var R = {
    cur: '',
    /** Chặn rời trang khi còn thay đổi chưa lưu: fn trả về true để cho đi */
    setGuard: function (fn) { guard = fn; },
    /** Hỏi trước khi bỏ thay đổi chưa lưu (vd đổi lớp). true = được đi tiếp */
    canLeave: canLeave,
    reload: resolve,
    start: function () { window.addEventListener('hashchange', resolve); resolve(); }
  };
  return R;
};
U.leaveGuard = function () {
  return U.confirm({ title: 'Chưa lưu thay đổi', message: 'Bạn có thay đổi chưa lưu. Rời đi sẽ mất các thay đổi này.', ok: 'Rời đi' });
};

/* ---------------- tính điểm trung bình có hệ số ----------------
   tests: [{id, type: 'TX'|'GK'|'CK'}], scores: {testId: số}, weights: {TX, GK, CK}
   Bài chưa có điểm không tính vào trung bình. Không có bài nào -> null. */
U.TYPES = [
  { key: 'TX', name: 'Thường xuyên' },
  { key: 'GK', name: 'Giữa kỳ' },
  { key: 'CK', name: 'Cuối kỳ' }
];
U.typeName = function (k) { var t = U.TYPES.filter(function (x) { return x.key === k; })[0]; return t ? t.name : k; };
U.average = function (tests, scores, weights) {
  var num = 0, den = 0;
  tests.forEach(function (t) {
    var v = scores ? scores[t.id] : null, w = Number(weights[t.type]) || 0;
    if (v === null || v === undefined || v === '' || isNaN(v)) return;
    num += Number(v) * w; den += w;
  });
  return den ? num / den : null;
};
/** Trung bình riêng từng loại (không hệ số): {TX: 8.3, GK: 8, CK: null} */
U.typeAverages = function (tests, scores) {
  var out = {};
  U.TYPES.forEach(function (ty) {
    var vs = tests.filter(function (t) { return t.type === ty.key; }).map(function (t) { return scores ? scores[t.id] : null; })
      .filter(function (v) { return v !== null && v !== undefined && v !== '' && !isNaN(v); });
    out[ty.key] = vs.length ? vs.reduce(function (a, b) { return a + Number(b); }, 0) / vs.length : null;
  });
  return out;
};
/** Sắp bài theo loại (TX, GK, CK) rồi theo ngày, gắn nhãn ngắn TX1, TX2, GK, CK… */
U.labelTests = function (tests) {
  var ord = { TX: 0, GK: 1, CK: 2 }, cnt = {}, idx = {};
  var list = tests.slice().sort(function (a, b) {
    return (ord[a.type] - ord[b.type]) || String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id));
  });
  list.forEach(function (t) { cnt[t.type] = (cnt[t.type] || 0) + 1; });
  return list.map(function (t) {
    idx[t.type] = (idx[t.type] || 0) + 1;
    return Object.assign({}, t, { label: t.type === 'TX' || cnt[t.type] > 1 ? t.type + idx[t.type] : t.type });
  });
};

/* ---------------- thư viện ngoài khi cần (đọc/ghi Excel) ---------------- */
var _libs = {};
U.loadScript = function (src) {
  if (_libs[src]) return _libs[src];
  _libs[src] = new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = src; s.async = true; s.onload = resolve;
    s.onerror = function () { delete _libs[src]; reject(new Error('Không tải được thư viện đọc Excel. Kiểm tra mạng rồi thử lại.')); };
    document.head.appendChild(s);
  });
  return _libs[src];
};
var XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

/** Đọc tệp .csv / .xlsx thành mảng dòng (mỗi dòng là mảng ô) */
U.readTable = async function (file) {
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
    var text = await file.text();
    text = text.replace(/^﻿/, '');
    var sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    return parseCsv(text, sep);
  }
  await U.loadScript(XLSX_SRC);
  var wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
};
function parseCsv(text, sep) {
  var rows = [], row = [], cell = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
}
/** Tải về tệp CSV (mở được bằng Excel, giữ đúng dấu tiếng Việt) */
U.downloadCsv = function (name, rows) {
  var csv = rows.map(function (r) {
    return r.map(function (v) { v = String(v === null || v === undefined ? '' : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',');
  }).join('\r\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
U.readAsDataUrl = function (file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(r.result); };
    r.onerror = function () { reject(new Error('Không đọc được tệp ' + file.name)); };
    r.readAsDataURL(file);
  });
};

/* ---------------- tiện ích giao diện ---------------- */
U.swap = function (el, html) { el.innerHTML = html; el.classList.remove('view-enter'); void el.offsetWidth; el.classList.add('view-enter'); };
U.empty = function (ico, title, text, btn) {
  return '<div class="empty">' + U.icon(ico) + '<h3>' + U.esc(title) + '</h3>' + (text ? '<p>' + U.esc(text) + '</p>' : '') + (btn || '') + '</div>';
};
U.skeleton = function () {
  return '<div class="stack"><div class="sk" style="height:36px;width:240px"></div><div class="sk" style="height:220px"></div><div class="sk" style="height:120px"></div></div>';
};
