/* =====================================================================
   SỔ LỚP — khu học sinh: tổng quan, điểm số, bài tập (chỉ xem)
   ===================================================================== */
'use strict';

(function () {
  var $ = U.$, $$ = U.$$, esc = U.esc, icon = U.icon;
  var D = null;                        // dữ liệu từ student.overview
  var hwSel = '';
  var NAV = [
    { path: '/', ico: 'home', label: 'Tổng quan' },
    { path: '/diem', ico: 'grid', label: 'Điểm số' },
    { path: '/bai-tap', ico: 'doc', label: 'Bài tập' }
  ];
  function V() { return document.getElementById('view'); }

  function shell() {
    var navA = function (n) { return '<a href="#' + n.path + '" data-p="' + n.path + '">'; };
    document.getElementById('root').innerHTML =
      '<div class="s-app"><header class="s-top">' + U.brand('#/') +
      '<nav class="s-nav" aria-label="Điều hướng chính">' + NAV.map(function (n) { return navA(n) + n.label + '</a>'; }).join('') + '</nav>' +
      '<div class="s-who"><span class="nm">' + esc(D.student.name) + '</span><button class="btn icon" id="out" aria-label="Đăng xuất" title="Đăng xuất">' + icon('logout') + '</button></div></header>' +
      '<main class="s-main" id="view"></main>' +
      '<nav class="s-tabs" aria-label="Điều hướng">' + NAV.map(function (n) { return navA(n) + icon(n.ico) + n.label + '</a>'; }).join('') + '</nav></div>';
    $('#out').onclick = U.logout;
  }
  function setNav(path) {
    $$('.s-nav a, .s-tabs a').forEach(function (a) { if (a.dataset.p === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var n = NAV.filter(function (x) { return x.path === path; })[0];
    document.title = (n ? n.label + ' · ' : '') + D.student.name + ' | ' + U.appName;
  }

  /* các con số dùng chung */
  function calc() {
    var tests = U.labelTests(D.tests);
    var att = D.attendance, absent = att.filter(function (a) { return a.status === 'A'; });
    var open = D.homework.filter(function (h) { return !U.isPast(h.due); }).sort(function (a, b) { return a.due.localeCompare(b.due); });
    return { tests: tests, avg: U.average(tests, D.scores, D.weights), byType: U.typeAverages(tests, D.scores), att: att, absent: absent, open: open };
  }
  function codeFmt(c) { return String(c).replace(/^(\d{4})(\d{4})$/, '$1 $2'); }

  /* ---------------- tổng quan ---------------- */
  function viewHome() {
    var c = calc();
    var hwRows = c.open.slice(0, 3).map(function (h) {
      return '<a class="link-row" href="#/bai-tap" data-hw="' + esc(h.id) + '"><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-weight:500">' + esc(h.title) + '</span>' +
        '<span class="small" style="color:var(--warn-ink);font-weight:500">Hạn ' + esc(U.fmtDue(h.due)) + '</span></span>' + icon('chevR') + '</a>';
    }).join('');
    U.swap(V(), '<div style="display:flex;flex-direction:column;gap:10px"><span class="muted small">Xin chào,</span><h1>' + esc(D.student.name) + '</h1>' +
      '<div class="chips">' + (D.className ? '<span class="chip">' + esc(D.className) + '</span>' : '') + '<span class="chip num">Mã ' + esc(codeFmt(D.student.code)) + '</span></div></div>' +
      '<div class="s-grid">' +
      '<section class="hero-card" aria-label="Điểm trung bình"><div class="row" style="justify-content:space-between;align-items:flex-end">' +
      '<div style="display:flex;flex-direction:column;gap:6px"><span class="lbl">Điểm trung bình</span><span class="big">' + U.fmtScore(c.avg) + '</span></div>' +
      '<a href="#/diem" style="font-size:13px;font-weight:600;padding:12px 0">Chi tiết →</a></div>' +
      '<div class="hero-split">' + U.TYPES.map(function (t) { return '<div style="display:flex;flex-direction:column;gap:2px"><span class="lbl">' + t.name + '</span><span class="v">' + U.fmtScore(c.byType[t.key]) + '</span></div>'; }).join('') + '</div></section>' +
      '<section class="card card-b stack" aria-labelledby="att"><div class="row" style="justify-content:space-between;align-items:baseline"><h2 class="card-title" id="att" style="font-size:17px">Chuyên cần</h2><span class="small muted">' + c.att.length + ' buổi</span></div>' +
      (c.att.length ?
        '<div class="row" style="gap:28px"><div class="stat"><span class="v ok">' + (c.att.length - c.absent.length) + '</span><span class="small muted">Có mặt</span></div><div class="stat"><span class="v warn">' + c.absent.length + '</span><span class="small muted">Vắng</span></div></div>' +
        '<div class="dots" role="img" aria-label="' + (c.att.length - c.absent.length) + ' buổi có mặt, ' + c.absent.length + ' buổi vắng">' + c.att.map(function (a) { return '<i class="' + (a.status === 'A' ? 'x' : '') + '" title="Buổi ' + a.no + ', ' + esc(U.fmtDate(a.date)) + ': ' + (a.status === 'A' ? 'Vắng' : 'Có mặt') + '"></i>'; }).join('') + '</div>' +
        '<p class="small muted">' + (c.absent.length ? 'Vắng: ' + c.absent.map(function (a) { return 'Buổi ' + a.no + ' · ' + U.fmtDay(a.date); }).join('; ') : 'Chưa vắng buổi nào.') + '</p>'
        : '<p class="muted small">Chưa có buổi học nào được điểm danh.</p>') + '</section>' +
      '<section class="card span" aria-labelledby="hw" style="overflow:hidden;padding-top:8px"><div class="row" style="justify-content:space-between;padding:12px 22px 10px"><h2 class="card-title" id="hw" style="font-size:17px">Bài tập cần làm</h2><a class="small" style="font-weight:600" href="#/bai-tap">Tất cả</a></div>' +
      (hwRows || '<p class="muted small" style="padding:0 22px 18px">Không có bài tập nào đang mở.</p>') + '</section></div>');
    $$('[data-hw]', V()).forEach(function (a) { a.addEventListener('click', function () { hwSel = a.dataset.hw; }); });
  }

  /* ---------------- điểm số ---------------- */
  function viewGrades() {
    var c = calc();
    var cnt = function (k) { return c.tests.filter(function (t) { return t.type === k; }).length; };
    var tw = U.TYPES.map(function (t) { return cnt(t.key) * (D.weights[t.key] || 0); });
    var group = function (key) {
      var list = c.tests.filter(function (t) { return t.type === key; });
      return '<section class="card" aria-labelledby="g' + key + '" style="overflow:hidden"><div class="row" style="justify-content:space-between;padding:18px 22px">' +
        '<h2 id="g' + key + '" style="font-size:16px">' + U.typeName(key) + '</h2><span class="tag">×' + (D.weights[key] || 0) + '</span></div>' +
        (list.length ? list.map(function (t) {
          var v = D.scores[t.id];
          return '<div class="sc-row"><span style="display:flex;flex-direction:column"><span>' + esc(t.name) + '</span><span class="small muted">' + esc(t.label) + ' · ' + esc(U.fmtDate(t.date)) + '</span></span>' +
            (v === undefined ? '<span class="small muted">Chưa có điểm</span>' : '<span class="v' + (v < 5 ? '" style="color:var(--warn-ink)' : '') + '">' + U.fmtScore(v) + '</span>') + '</div>';
        }).join('') : '<div class="sc-row"><span class="small muted">Chưa có bài nào.</span></div>') + '</section>';
    };
    U.swap(V(), '<header><h1>Điểm số</h1></header><div class="s-grid"><div class="s-col">' +
      '<section class="card card-b stack" aria-label="Điểm trung bình" style="gap:14px"><div class="row" style="justify-content:space-between"><span style="font-weight:600">Điểm trung bình</span>' +
      '<span class="num" style="font-size:36px;font-weight:600;color:' + (c.avg !== null && c.avg < 5 ? 'var(--warn-ink)' : 'var(--accent-ink)') + '">' + U.fmtScore(c.avg) + '</span></div>' +
      (tw[0] + tw[1] + tw[2] ? '<div class="wbar" aria-hidden="true" style="height:8px"><i style="flex:' + tw[0] + ';background:var(--w-tx)"></i><i style="flex:' + tw[1] + ';background:var(--w-gk)"></i><i style="flex:' + tw[2] + ';background:var(--w-ck)"></i></div>' : '') +
      '<p class="small muted">Thường xuyên ×' + D.weights.TX + ' mỗi bài · Giữa kỳ ×' + D.weights.GK + ' · Cuối kỳ ×' + D.weights.CK + '. Hệ số do giáo viên đặt; bài chưa có điểm không tính vào trung bình.</p></section>' +
      group('GK') + group('CK') + '</div>' + group('TX') + '</div>');
  }

  /* ---------------- bài tập ---------------- */
  function viewHomework() {
    var list = D.homework;
    if (!list.length) { U.swap(V(), '<header><h1>Bài tập</h1></header><div class="card">' + U.empty('doc', 'Chưa có bài tập nào', 'Khi giáo viên giao bài, đề bài sẽ hiện ở đây.') + '</div>'); return; }
    if (!list.some(function (h) { return h.id === hwSel; })) hwSel = (list.filter(function (h) { return !U.isPast(h.due); }).sort(function (a, b) { return a.due.localeCompare(b.due); })[0] || list[0]).id;
    var draw = function () {
      var cur = list.filter(function (h) { return h.id === hwSel; })[0], past = U.isPast(cur.due);
      U.swap(V(), '<header><h1>Bài tập</h1><p class="muted small" style="margin-top:4px">Đề bài giáo viên đã giao cho bạn.</p></header><div class="hw-grid">' +
        '<article class="card card-b stack detail" aria-labelledby="hwT"><div style="display:flex;flex-direction:column;gap:8px"><span class="badge ' + (past ? '' : 'ok') + '" style="align-self:flex-start">' + (past ? 'Đã hết hạn' : 'Đang mở') + '</span>' +
        '<h2 id="hwT" style="font-size:21px;line-height:1.35">' + esc(cur.title) + '</h2><span class="small muted">Giao ' + esc(U.fmtDate(cur.createdAt)) + ' · Hạn ' + esc(U.fmtDue(cur.due)) + '</span></div>' +
        '<div class="prose">' + esc(cur.body || '(Không có nội dung, xem tệp đính kèm.)') + '</div>' +
        (cur.files || []).map(function (f) {
          return '<a class="file-row" href="' + esc(f.url) + '" download="' + esc(f.name) + '" target="_blank" rel="noopener" style="color:var(--ink);text-decoration:none"><span class="file-ico" aria-hidden="true">' + esc(U.fileExt(f.name)) + '</span>' +
            '<span class="grow" style="display:flex;flex-direction:column"><span class="nm">' + esc(f.name) + '</span><span class="small muted">' + (f.size ? U.fileSize(f.size) + ' · ' : '') + 'Bấm để tải</span></span>' + icon('download') + '</a>';
        }).join('') + '</article>' +
        '<section class="card list" aria-labelledby="hwAll" style="overflow:hidden;padding-top:4px"><h2 class="eyebrow" id="hwAll" style="padding:14px 22px 10px">Tất cả bài tập</h2>' +
        list.map(function (h) {
          var p = U.isPast(h.due);
          return '<button class="link-row" data-id="' + esc(h.id) + '" aria-pressed="' + (h.id === hwSel) + '"><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-weight:' + (h.id === hwSel ? 600 : 400) + '">' + esc(h.title) + '</span>' +
            '<span class="small" style="color:' + (p ? 'var(--muted)' : 'var(--warn-ink)') + '">Hạn ' + esc(U.fmtDue(h.due)) + '</span></span>' + icon('chevR') + '</button>';
        }).join('') + '</section></div>');
      $$('.link-row[data-id]', V()).forEach(function (b) {
        b.onclick = function () {
          hwSel = b.dataset.id; draw();
          if (window.matchMedia('(max-width: 720px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
        };
      });
    };
    draw();
  }

  async function boot() {
    var s = U.Session.require('student');
    if (!s) return;
    document.getElementById('root').innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center"><span class="spin" style="color:var(--accent);width:28px;height:28px"></span></div>';
    try { D = await Api.call('student.overview', {}); }
    catch (e) {
      document.getElementById('root').innerHTML = '<div class="login-panel" style="min-height:100vh">' + U.empty('alert', 'Không tải được dữ liệu', e.message, '<button class="btn pri" id="rt">Thử lại</button>') + '</div>';
      $('#rt').onclick = boot;
      return;
    }
    shell();
    U.router({ '/': viewHome, '/diem': viewGrades, '/bai-tap': viewHomework }, '/', setNav).start();
  }
  boot();
})();
