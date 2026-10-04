/* =====================================================================
   SỔ LỚP — khu giáo viên: điểm danh, bảng điểm & hệ số, bài tập, học sinh, lớp học
   ===================================================================== */
'use strict';

(function () {
  var $ = U.$, $$ = U.$$, esc = U.esc, icon = U.icon;
  var T = { user: null, classes: [], classId: '', students: [] };
  var router;
  var MAX_FILE = 3 * 1024 * 1024;           // giới hạn mỗi tệp đính kèm (bản demo lưu trong trình duyệt)

  var NAV = [
    { path: '/diem-danh', ico: 'attend', label: 'Điểm danh' },
    { path: '/bang-diem', ico: 'grid', label: 'Bảng điểm' },
    { path: '/bai-tap', ico: 'doc', label: 'Bài tập' },
    { path: '/hoc-sinh', ico: 'users', label: 'Học sinh' },
    { path: '/lop', ico: 'board', label: 'Lớp học' }
  ];
  function V() { return document.getElementById('view'); }
  function cls() { return T.classes.filter(function (c) { return c.id === T.classId; })[0] || {}; }
  function stuName(id) { var s = T.students.filter(function (x) { return x.id === id; })[0]; return s ? s.name : ''; }

  /* ---------------- khung trang ---------------- */
  function shell() {
    var u = T.user;
    document.getElementById('root').innerHTML =
      '<div class="t-shell">' +
      '<aside class="t-side">' + U.brand('#/diem-danh') +
      '<label class="cls-pick"><span class="label eyebrow">Lớp</span><select class="input" id="clsSel" aria-label="Chọn lớp"></select></label>' +
      '<button class="btn ghost sm icon t-me-m" id="outM" aria-label="Đăng xuất">' + icon('logout') + '</button>' +
      '<nav class="t-nav" aria-label="Chức năng">' + NAV.map(function (n) { return '<a href="#' + n.path + '" data-p="' + n.path + '">' + icon(n.ico) + '<span>' + n.label + '</span></a>'; }).join('') + '</nav>' +
      '<div class="t-me"><div class="avatar" aria-hidden="true">' + esc(U.initials(u.name)) + '</div><div class="grow"><div style="font-weight:600;font-size:14px">' + esc(u.name) + '</div><div class="small muted">Giáo viên</div></div>' +
      '<button class="btn ghost sm icon" id="out" aria-label="Đăng xuất" title="Đăng xuất">' + icon('logout') + '</button></div>' +
      '</aside><main class="t-main" id="view"></main></div>';
    $('#out').onclick = U.logout;
    $('#outM').onclick = U.logout;
    paintClassSel();
    $('#clsSel').onchange = async function () {
      var sel = this, prev = T.classId;
      if (!await router.canLeave()) { sel.value = prev; return; }
      T.classId = sel.value;
      try { localStorage.setItem('solop_class', T.classId); } catch (e) {}
      try { await loadStudents(); router.reload(); }
      catch (e) { T.classId = prev; sel.value = prev; U.toastErr(e); }
    };
  }
  function paintClassSel() {
    var sel = $('#clsSel');
    sel.innerHTML = T.classes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === T.classId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    sel.disabled = !T.classes.length;
  }
  function setNav(path) {
    $$('.t-nav a').forEach(function (a) { if (a.dataset.p === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var n = NAV.filter(function (x) { return x.path === path; })[0];
    document.title = (n ? n.label + ' · ' : '') + (cls().name || '') + ' | ' + U.appName;
  }
  async function loadStudents() { T.students = T.classId ? await Api.call('students.list', { classId: T.classId }) : []; }
  /** Các trang cần có lớp đang chọn: chưa có lớp nào thì đưa về trang Lớp học để tạo */
  function withClass(fn) { return function () { if (!T.classId) { location.replace('#/lop'); return; } return fn(); }; }
  function guardWhile(isDirty) { router.setGuard(function () { return isDirty() ? U.leaveGuard() : true; }); }

  /* =================================================================
     ĐIỂM DANH
     ================================================================= */
  async function viewAttendance() {
    var v = V(), st = { sessions: [], selId: '', marks: {}, saved: {}, fresh: false };
    U.swap(v, U.skeleton());
    st.sessions = await Api.call('attendance.sessions', { classId: T.classId });
    var dirty = function () { return st.fresh || JSON.stringify(st.marks) !== JSON.stringify(st.saved); };
    guardWhile(dirty);

    var draw = function () {
      var cur = st.sessions.filter(function (s) { return s.id === st.selId; })[0];
      var head = '<header class="page-h"><div><h1>Điểm danh</h1><p class="sub">Tạo buổi học mới, rồi đánh dấu từng học sinh.</p></div>' +
        '<div class="acts"><button class="btn pri" id="newSess">' + icon('plus') + '<span>Tạo buổi điểm danh</span></button></div></header>';
      if (!st.sessions.length) {
        U.swap(v, head + '<div class="card">' + U.empty('attend', 'Chưa có buổi học nào', 'Tạo buổi đầu tiên để bắt đầu điểm danh.') + '</div>');
        $('#newSess').onclick = createSession;
        return;
      }
      var list = st.sessions.map(function (s) {
        return '<button class="sess" data-id="' + esc(s.id) + '" aria-pressed="' + (s.id === st.selId) + '">' +
          '<span style="display:flex;flex-direction:column;gap:2px"><span class="t">Buổi ' + s.no + '</span><span class="d">' + esc(U.fmtDay(s.date)) + '</span></span>' +
          '<span class="r">' + (s.present === null ? '—' : s.present + '/' + s.total) + '</span></button>';
      }).join('');
      var roster = T.students.length ? '<ul class="roster">' + T.students.map(function (s, i) {
        var a = st.marks[s.id] === 'A';
        return '<li data-sid="' + esc(s.id) + '"><div class="row" style="gap:14px;flex-wrap:nowrap;min-width:0"><span class="idx">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<div style="display:flex;flex-direction:column;min-width:0"><span class="nm">' + esc(s.name) + '</span><span class="code">' + esc(s.code) + '</span></div></div>' +
          '<div class="tg-group" role="group" aria-label="Trạng thái ' + esc(s.name) + '"><button class="tg p" data-v="P" aria-pressed="' + !a + '">Có mặt</button><button class="tg a" data-v="A" aria-pressed="' + a + '">Vắng</button></div></li>';
      }).join('') + '</ul>' : U.empty('users', 'Lớp chưa có học sinh', 'Thêm học sinh ở mục Học sinh.', '<a class="btn" href="#/hoc-sinh">Thêm học sinh</a>');
      U.swap(v, head + '<div class="cols wrap-m">' +
        '<section class="card sess-box left-col" aria-label="Các buổi học"><h2 class="eyebrow" style="margin:8px 16px 10px">Các buổi học</h2><div class="sess-list">' + list + '</div></section>' +
        '<section class="card main-col" aria-label="Danh sách điểm danh" style="overflow:hidden">' +
        '<div class="card-h"><div><h2 class="card-title">Buổi ' + cur.no + ' · ' + esc(U.fmtDay(cur.date)) + '</h2>' +
        '<p class="small muted" style="margin-top:4px">' + esc([cur.start && cur.end ? cur.start + ' – ' + cur.end : cur.start, U.fmtDate(cur.date)].filter(Boolean).join(' · ')) + (st.fresh ? ' · <b style="color:var(--warn-ink)">Chưa lưu</b>' : '') + '</p></div>' +
        '<div class="row"><span class="pill ok">Có mặt <span class="num" id="cP"></span></span><span class="pill warn">Vắng <span class="num" id="cA"></span></span>' +
        '<button class="btn sm" id="allP">Tất cả có mặt</button><button class="btn sm ghost icon danger" id="delSess" aria-label="Xoá buổi này" title="Xoá buổi này">' + icon('trash') + '</button></div></div>' +
        roster +
        '<div class="card-f"><button class="btn ghost" id="undo">Huỷ thay đổi</button><button class="btn pri" id="saveAtt">Lưu điểm danh</button></div></section></div>');
      count();
      $('#newSess').onclick = createSession;
      $$('.sess', v).forEach(function (b) { b.onclick = function () { pick(b.dataset.id); }; });
      $$('.roster li', v).forEach(function (li) {
        $$('.tg', li).forEach(function (b) {
          b.onclick = function () {
            st.marks[li.dataset.sid] = b.dataset.v;
            $$('.tg', li).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
            count();
          };
        });
      });
      $('#allP').onclick = function () { T.students.forEach(function (s) { st.marks[s.id] = 'P'; }); $$('.roster .tg', v).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === 'P')); }); count(); };
      $('#undo').onclick = function () { st.marks = Object.assign({}, st.saved); draw(); };
      $('#saveAtt').onclick = function () {
        var btn = this;
        U.busy(btn, async function () {
          var s = await Api.call('attendance.save', { sessionId: st.selId, marks: st.marks });
          st.saved = Object.assign({}, st.marks); st.fresh = false;
          st.sessions = st.sessions.map(function (x) { return x.id === s.id ? Object.assign({}, x, s, { no: x.no }) : x; });
          draw();
        }, { ok: 'Đã lưu điểm danh' });
      };
      $('#delSess').onclick = async function () {
        if (!await U.confirm({ title: 'Xoá buổi ' + cur.no + '?', message: 'Buổi ' + U.fmtDay(cur.date) + ' và toàn bộ điểm danh của buổi này sẽ bị xoá.', ok: 'Xoá buổi' })) return;
        await U.busy(null, async function () {
          await Api.call('attendance.removeSession', { sessionId: cur.id });
          st.saved = st.marks; st.fresh = false;
          st.sessions = await Api.call('attendance.sessions', { classId: T.classId });
          if (st.sessions.length) await open(st.sessions[0].id); else draw();
        }, { ok: 'Đã xoá buổi học' });
      };
    };
    var count = function () {
      var a = T.students.filter(function (s) { return st.marks[s.id] === 'A'; }).length;
      if ($('#cP')) { $('#cP').textContent = T.students.length - a; $('#cA').textContent = a; }
    };
    var open = async function (id) {
      var r = await Api.call('attendance.get', { sessionId: id });
      st.selId = id;
      st.fresh = !Object.keys(r.marks).length;                 // buổi mới: mặc định cả lớp có mặt, chờ lưu
      st.marks = {};
      T.students.forEach(function (s) { st.marks[s.id] = r.marks[s.id] === 'A' ? 'A' : 'P'; });
      st.saved = st.fresh ? {} : Object.assign({}, st.marks);
      draw();
    };
    var pick = async function (id) {
      if (id === st.selId) return;
      if (dirty() && !await U.leaveGuard()) return;
      try { await open(id); } catch (e) { U.toastErr(e); }
    };
    var createSession = function () {
      if (dirty()) { U.toast('Lưu hoặc huỷ thay đổi của buổi đang mở trước đã.', 'error'); return; }
      U.modal({
        title: 'Tạo buổi điểm danh',
        body: '<div class="stack"><div class="field"><label for="sd">Ngày học</label><input class="input" id="sd" type="date" value="' + U.todayIso() + '"></div>' +
          '<div class="two"><div class="field"><label for="ss">Bắt đầu</label><input class="input" id="ss" type="time" value="07:30"></div>' +
          '<div class="field"><label for="se">Kết thúc</label><input class="input" id="se" type="time" value="09:00"></div></div></div>',
        actions: [{ label: 'Huỷ', kind: 'ghost' }, { label: 'Tạo buổi', kind: 'pri', onClick: async function (m) {
          var s = await Api.call('attendance.createSession', { classId: T.classId, date: m.$('#sd').value, start: m.$('#ss').value, end: m.$('#se').value });
          m.close();
          st.sessions = await Api.call('attendance.sessions', { classId: T.classId });
          await open(s.id);
          U.toast('Đã tạo buổi. Đánh dấu học sinh vắng rồi bấm Lưu.', 'ok');
        } }]
      });
    };
    if (st.sessions.length) await open(st.sessions[0].id); else draw();
  }

  /* =================================================================
     BẢNG ĐIỂM: chọn bài kiểm tra -> nhập điểm từng học sinh, hệ số
     ================================================================= */
  async function viewGrades() {
    var v = V(), st = { tests: [], scores: {}, weights: {}, w: {}, selId: '', edits: {}, adding: false };
    U.swap(v, U.skeleton());
    var g = await Api.call('grades.get', { classId: T.classId });
    st.tests = U.labelTests(g.tests); st.scores = g.scores; st.weights = g.weights; st.w = Object.assign({}, g.weights);
    var last = null; try { last = localStorage.getItem('solop_test_' + T.classId); } catch (e) {}
    st.selId = (st.tests.filter(function (t) { return t.id === last; })[0] || st.tests[st.tests.length - 1] || {}).id || '';

    var changed = function () {
      var cur = st.scores[st.selId] || {};
      return Object.keys(st.edits).filter(function (sid) {
        var p = U.parseScore(st.edits[sid]), old = cur[sid] === undefined ? null : cur[sid];
        return !(p === old || (p !== null && old !== null && Math.abs(p - old) < 1e-9));
      });
    };
    var wDirty = function () { return ['TX', 'GK', 'CK'].some(function (k) { return st.w[k] !== st.weights[k]; }); };
    guardWhile(function () { return changed().length > 0 || wDirty(); });

    /** điểm đang hiển thị của 1 học sinh (đã gộp ô đang sửa của bài đang chọn) */
    var scoresOf = function (sid) {
      var o = {};
      st.tests.forEach(function (t) {
        var v0 = (st.scores[t.id] || {})[sid];
        if (t.id === st.selId && st.edits[sid] !== undefined) { var p = U.parseScore(st.edits[sid]); v0 = p === null || isNaN(p) ? undefined : p; }
        if (v0 !== undefined) o[t.id] = v0;
      });
      return o;
    };
    var countTypes = function () { var c = { TX: 0, GK: 0, CK: 0 }; st.tests.forEach(function (t) { c[t.type]++; }); return c; };

    var draw = function (focusKey) {
      var cur = st.tests.filter(function (t) { return t.id === st.selId; })[0];
      var n = T.students.length, c = countTypes();
      var cards = st.tests.map(function (t) {
        var done = T.students.filter(function (s) { return (st.scores[t.id] || {})[s.id] !== undefined; }).length;
        return '<button class="tcard" data-id="' + esc(t.id) + '" aria-pressed="' + (t.id === st.selId) + '">' +
          '<span class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="tag">' + esc(t.label) + '</span><span class="small muted">' + esc(U.typeName(t.type)) + '</span></span>' +
          '<span class="nm">' + esc(t.name) + '</span>' +
          '<span class="row" style="gap:8px;flex-wrap:nowrap"><span class="prog" aria-hidden="true"><i style="width:' + (n ? Math.round(done / n * 100) : 0) + '%"></i></span><span class="num small" style="color:var(--ink-2)">' + done + '/' + n + '</span></span></button>';
      }).join('');
      var addForm = st.adding ? '<form class="card card-b" id="addForm" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">' +
        '<div class="field" style="flex:2 1 240px"><label for="nn">Tên bài kiểm tra</label><input class="input" id="nn" placeholder="VD: Kiểm tra 15 phút số 4" maxlength="80"></div>' +
        '<div class="field" style="flex:1 1 170px"><label for="nt">Loại điểm</label><select class="input" id="nt">' + U.TYPES.map(function (t) { return '<option value="' + t.key + '">' + t.name + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="flex:1 1 160px"><label for="nd">Ngày kiểm tra</label><input class="input" id="nd" type="date" value="' + U.todayIso() + '"></div>' +
        '<div class="row"><button type="button" class="btn ghost" id="addCancel">Huỷ</button><button type="submit" class="btn pri" id="addOk">Tạo</button></div></form>' : '';

      // màn hẹp: đưa cột đang nhập lên ngay sau tên để khỏi phải cuộn ngang
      var cols = cur && window.matchMedia('(max-width: 900px)').matches ? [cur].concat(st.tests.filter(function (t) { return t !== cur; })) : st.tests;
      var table = '';
      if (!st.tests.length) table = U.empty('grid', 'Chưa có bài kiểm tra', 'Bấm "Thêm bài kiểm tra" để tạo cột điểm đầu tiên.');
      else if (!n) table = U.empty('users', 'Lớp chưa có học sinh', 'Thêm học sinh ở mục Học sinh.', '<a class="btn" href="#/hoc-sinh">Thêm học sinh</a>');
      else table = '<div class="tbl-wrap"><table class="gt"><thead><tr><th class="l" scope="col">Học sinh</th>' +
        cols.map(function (t) { return '<th scope="col" class="' + (t.id === st.selId ? 'sel' : '') + '" title="' + esc(t.name) + '">' + esc(t.label) + '</th>'; }).join('') +
        '<th scope="col" style="color:var(--accent-ink)">TB</th></tr></thead><tbody>' +
        T.students.map(function (s) {
          var sc = scoresOf(s.id), avg = U.average(st.tests, sc, st.w);
          return '<tr data-sid="' + esc(s.id) + '"><td class="l"><div style="display:flex;flex-direction:column"><span style="font-weight:500">' + esc(s.name) + '</span><span class="code">' + esc(s.code) + '</span></div></td>' +
            cols.map(function (t) {
              if (t.id === st.selId) {
                var raw = st.edits[s.id] !== undefined ? st.edits[s.id] : ((st.scores[t.id] || {})[s.id] === undefined ? '' : U.fmtScore(st.scores[t.id][s.id]));
                var p = U.parseScore(raw);
                return '<td class="sel"><input class="sin' + (isNaN(p) ? ' bad' : '') + (st.edits[s.id] !== undefined ? ' dirty' : '') + '" inputmode="decimal" autocomplete="off" placeholder="—" value="' + esc(raw) + '" data-sid="' + esc(s.id) + '" aria-label="Điểm ' + esc(t.label) + ' của ' + esc(s.name) + '"></td>';
              }
              var val = sc[t.id];
              return '<td class="n' + (val === undefined ? ' none' : '') + '">' + U.fmtScore(val) + '</td>';
            }).join('') +
            '<td class="avg' + (avg !== null && avg < 5 ? ' low' : '') + '">' + U.fmtScore(avg) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

      var totalW = c.TX * st.w.TX + c.GK * st.w.GK + c.CK * st.w.CK;
      var wRow = function (k) {
        var share = totalW ? Math.round(c[k] * st.w[k] / totalW * 100) + '% tổng điểm' : '—';
        return '<div class="wrow"><div style="display:flex;flex-direction:column"><span style="font-weight:600">' + U.typeName(k) + '</span><span class="small muted">' + c[k] + ' bài · ' + share + '</span></div>' +
          '<div class="row" style="gap:6px;flex-wrap:nowrap"><button class="step" data-k="' + k + '" data-d="-1" data-focus="w' + k + '-1" aria-label="Giảm hệ số ' + U.typeName(k) + '">' + icon('minus', 'sm') + '</button>' +
          '<output class="wval" aria-live="polite">' + st.w[k] + '</output>' +
          '<button class="step" data-k="' + k + '" data-d="1" data-focus="w' + k + '1" aria-label="Tăng hệ số ' + U.typeName(k) + '">' + icon('plus', 'sm') + '</button></div></div>';
      };
      var bar = totalW ? '<div class="wbar" aria-hidden="true"><i style="flex:' + c.TX * st.w.TX + ';background:var(--w-tx)"></i><i style="flex:' + c.GK * st.w.GK + ';background:var(--w-gk)"></i><i style="flex:' + c.CK * st.w.CK + ';background:var(--w-ck)"></i></div>' : '';

      U.swap(v, '<header class="page-h"><div><h1>Bảng điểm</h1><p class="sub">Chọn bài kiểm tra để nhập điểm cho từng học sinh.</p></div>' +
        '<div class="acts"><button class="btn" id="export"' + (st.tests.length && n ? '' : ' disabled') + '>' + icon('download') + '<span>Xuất bảng điểm</span></button></div></header>' +
        '<section aria-labelledby="th" class="stack" style="gap:12px"><h2 class="eyebrow" id="th">Bài kiểm tra</h2><div class="tests">' + cards +
        '<button class="tadd" id="addTest">' + icon('plus') + 'Thêm bài kiểm tra</button></div>' + addForm + '</section>' +
        '<div class="cols wrap-l"><section class="card main-col" aria-label="Bảng điểm lớp" style="overflow:hidden">' +
        (cur ? '<div class="card-h"><div><div class="eyebrow">Đang nhập điểm</div><div style="font-size:16px;font-weight:600;margin-top:2px">' + esc(cur.label) + ' · ' + esc(cur.name) + '</div>' +
          '<div class="small muted">' + esc(U.typeName(cur.type)) + ' · ' + esc(U.fmtDate(cur.date)) + '</div></div>' +
          '<div class="row"><button class="btn sm ghost danger" id="delTest">' + icon('trash', 'sm') + '<span>Xoá bài</span></button><button class="btn pri" id="saveScores">Lưu điểm</button></div></div>' : '') +
        table + '</section>' +
        '<div class="side-col">' +
        '<section class="card card-b stack" aria-labelledby="wt" style="gap:18px"><div><h2 class="card-title" id="wt">Hệ số điểm</h2><p class="small muted" style="margin-top:4px">Áp dụng cho mỗi bài thuộc loại đó. Bài chưa có điểm không được tính.</p></div>' +
        wRow('TX') + wRow('GK') + wRow('CK') + bar +
        '<div class="formula">TB = (ΣTX×' + st.w.TX + ' + ΣGK×' + st.w.GK + ' + ΣCK×' + st.w.CK + ') ÷ tổng hệ số các bài đã có điểm</div>' +
        (wDirty() ? '<div class="row"><button class="btn ghost" id="wUndo">Huỷ</button><button class="btn pri grow" id="wSave">Lưu hệ số</button></div>' : '') + '</section>' +
        '<section class="card card-b stack" aria-labelledby="it" style="gap:14px"><div><h2 class="card-title" id="it">Nhập từ tệp</h2>' +
        '<p class="small muted" style="margin-top:4px">' + (cur ? 'Điểm sẽ vào bài <b style="color:var(--ink)">' + esc(cur.label) + ' · ' + esc(cur.name) + '</b>.' : 'Tạo hoặc chọn một bài kiểm tra trước.') + '</p></div>' +
        '<label class="drop" id="drop"' + (cur ? '' : ' style="opacity:.5;pointer-events:none"') + '>' + icon('fileUp') + '<span style="font-weight:600;font-size:14px">Chọn tệp .xlsx hoặc .csv</span><span class="small muted">hoặc kéo thả vào đây · 2 cột: Mã HS, Điểm</span>' +
        '<input type="file" id="upFile" accept=".xlsx,.xls,.csv"' + (cur ? '' : ' disabled') + '></label>' +
        '<button class="btn sm ghost" id="tpl"' + (n ? '' : ' disabled') + '>' + icon('download', 'sm') + '<span>Tải tệp mẫu có sẵn danh sách lớp</span></button></section>' +
        '</div></div>');

      if (focusKey) { var f = $('[data-focus="' + focusKey + '"]', v) || $(focusKey, v); if (f) f.focus(); }
      bind(cur);
    };

    var bind = function (cur) {
      $$('.tcard', v).forEach(function (b) {
        b.onclick = async function () {
          if (b.dataset.id === st.selId) return;
          if (changed().length && !await U.leaveGuard()) return;
          st.selId = b.dataset.id; st.edits = {};
          try { localStorage.setItem('solop_test_' + T.classId, st.selId); } catch (e) {}
          draw();
        };
      });
      $('#addTest').onclick = function () { st.adding = true; draw('#nn'); };
      if ($('#addForm')) {
        $('#addCancel').onclick = function () { st.adding = false; draw(); };
        $('#addForm').onsubmit = async function (e) {
          e.preventDefault();
          if (changed().length && !await U.leaveGuard()) return;
          U.busy($('#addOk'), async function () {
            var t = await Api.call('tests.create', { classId: T.classId, name: $('#nn').value, type: $('#nt').value, date: $('#nd').value });
            st.scores[t.id] = {};
            st.tests = U.labelTests(st.tests.concat([t]));
            st.selId = t.id; st.edits = {}; st.adding = false;
            draw();
          }, { ok: 'Đã thêm bài kiểm tra' });
        };
      }
      $$('.sin', v).forEach(function (inp, i, all) {
        inp.oninput = function () {
          st.edits[inp.dataset.sid] = inp.value;
          var p = U.parseScore(inp.value);
          inp.classList.toggle('bad', isNaN(p)); inp.classList.add('dirty');
          var tr = inp.closest('tr'), avg = U.average(st.tests, scoresOf(inp.dataset.sid), st.w), td = tr.lastElementChild;
          td.textContent = U.fmtScore(avg); td.classList.toggle('low', avg !== null && avg < 5);
        };
        inp.onkeydown = function (e) {
          if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); if (all[i + 1]) all[i + 1].focus(); else $('#saveScores').focus(); }
          if (e.key === 'ArrowUp' && all[i - 1]) { e.preventDefault(); all[i - 1].focus(); }
        };
        inp.onfocus = function () { inp.select(); };
      });
      if ($('#saveScores')) $('#saveScores').onclick = function () {
        var ids = changed(), bad = ids.filter(function (sid) { return isNaN(U.parseScore(st.edits[sid])); });
        if (bad.length) { U.toast('Điểm của ' + stuName(bad[0]) + ' không hợp lệ. Điểm từ 0 đến 10, vd 7,5.', 'error'); var b0 = $('.sin[data-sid="' + bad[0] + '"]', v); if (b0) b0.focus(); return; }
        if (!ids.length) { st.edits = {}; draw(); U.toast('Không có thay đổi nào.'); return; }
        var payload = {};
        ids.forEach(function (sid) { payload[sid] = U.parseScore(st.edits[sid]); });
        U.busy(this, async function () {
          st.scores[st.selId] = await Api.call('scores.save', { testId: st.selId, scores: payload });
          st.edits = {};
          draw();
        }, { ok: 'Đã lưu điểm ' + ids.length + ' học sinh' });
      };
      if ($('#delTest')) $('#delTest').onclick = async function () {
        if (!await U.confirm({ title: 'Xoá ' + cur.label + '?', message: 'Bài "' + cur.name + '" và toàn bộ điểm của bài này sẽ bị xoá. Không hoàn tác được.', ok: 'Xoá bài' })) return;
        U.busy(null, async function () {
          await Api.call('tests.remove', { testId: cur.id });
          delete st.scores[cur.id];
          st.tests = U.labelTests(st.tests.filter(function (t) { return t.id !== cur.id; }));
          st.selId = (st.tests[st.tests.length - 1] || {}).id || ''; st.edits = {};
          draw();
        }, { ok: 'Đã xoá bài kiểm tra' });
      };
      $$('.step', v).forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.k;
          st.w[k] = Math.max(0, Math.min(10, st.w[k] + Number(b.dataset.d)));
          draw('w' + k + b.dataset.d);
        };
      });
      if ($('#wSave')) $('#wSave').onclick = function () {
        U.busy(this, async function () { st.weights = await Api.call('weights.save', { classId: T.classId, weights: st.w }); st.w = Object.assign({}, st.weights); draw(); }, { ok: 'Đã lưu hệ số' });
      };
      if ($('#wUndo')) $('#wUndo').onclick = function () { st.w = Object.assign({}, st.weights); draw(); };
      $('#export').onclick = function () {
        var rows = [['Mã HS', 'Họ tên'].concat(st.tests.map(function (t) { return t.label + ' - ' + t.name; }), ['Trung bình'])];
        T.students.forEach(function (s) {
          var sc = {}; st.tests.forEach(function (t) { var x = (st.scores[t.id] || {})[s.id]; if (x !== undefined) sc[t.id] = x; });
          var avg = U.average(st.tests, sc, st.weights);
          rows.push([s.code, s.name].concat(st.tests.map(function (t) { return sc[t.id] === undefined ? '' : U.fmtScore(sc[t.id]); }), [avg === null ? '' : U.fmtScore(avg)]));
        });
        U.downloadCsv('bang-diem-' + (cls().name || 'lop').replace(/\s+/g, '-') + '.csv', rows);
      };
      if ($('#tpl')) $('#tpl').onclick = function () {
        U.downloadCsv('mau-nhap-diem.csv', [['Mã HS', 'Họ tên', 'Điểm']].concat(T.students.map(function (s) { return [s.code, s.name, '']; })));
      };
      var drop = $('#drop'), up = $('#upFile');
      if (up) up.onchange = function () { if (up.files[0]) importFile(up.files[0], cur); up.value = ''; };
      if (drop && cur) {
        drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
        drop.ondragleave = function () { drop.classList.remove('over'); };
        drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); var f = e.dataTransfer.files[0]; if (f) importFile(f, cur); };
      }
    };

    /** Đọc tệp, khớp theo Mã HS, cho xem trước rồi đưa vào các ô (giáo viên kiểm tra và bấm Lưu) */
    var importFile = async function (file, cur) {
      var rows;
      try { rows = await U.readTable(file); } catch (e) { U.toast('Không đọc được tệp: ' + e.message, 'error'); return; }
      if (!rows.length) { U.toast('Tệp không có dữ liệu.', 'error'); return; }
      var ci = 0, si = 1, start = 0, h = rows[0].map(function (x) { return String(x).toLowerCase(); });
      if (!/^\d{8}$/.test(String(rows[0][0]).trim())) {
        start = 1;
        h.forEach(function (x, i) { if (/mã|ma hs|code|sbd/.test(x)) ci = i; });
        var found = -1; h.forEach(function (x, i) { if (found < 0 && /điểm|diem|score/.test(x)) found = i; });
        si = found >= 0 ? found : (ci === 0 ? 1 : 0);
      }
      var byCode = {}; T.students.forEach(function (s) { byCode[s.code] = s; });
      var ok = [], unknown = [], invalid = [];
      rows.slice(start).forEach(function (r) {
        var code = String(r[ci] || '').replace(/\D/g, ''), raw = String(r[si] === undefined ? '' : r[si]).trim();
        if (!code) return;
        var s = byCode[code];
        if (!s) { unknown.push(code); return; }
        if (raw === '') return;
        var p = U.parseScore(raw);
        if (p === null || isNaN(p)) invalid.push(s.name + ' (' + raw + ')'); else ok.push({ s: s, v: p });
      });
      var list = function (arr) { return arr.slice(0, 6).map(esc).join(', ') + (arr.length > 6 ? '… (+' + (arr.length - 6) + ')' : ''); };
      U.modal({
        title: 'Nhập điểm vào ' + cur.label, size: 'lg',
        body: '<div class="stack"><p>Tệp <b>' + esc(file.name) + '</b>: khớp được <b>' + ok.length + '</b> học sinh.</p>' +
          (unknown.length ? '<p class="err">' + unknown.length + ' mã không có trong lớp: ' + list(unknown) + '</p>' : '') +
          (invalid.length ? '<p class="err">' + invalid.length + ' điểm không hợp lệ (bỏ qua): ' + list(invalid) + '</p>' : '') +
          (ok.length ? '<div class="tbl-wrap card"><table class="gt"><thead><tr><th class="l">Học sinh</th><th>Điểm hiện tại</th><th>Điểm trong tệp</th></tr></thead><tbody>' +
            ok.slice(0, 50).map(function (x) { var o = (st.scores[cur.id] || {})[x.s.id]; return '<tr><td class="l">' + esc(x.s.name) + '</td><td class="n' + (o === undefined ? ' none' : '') + '">' + U.fmtScore(o) + '</td><td class="n" style="font-weight:600">' + U.fmtScore(x.v) + '</td></tr>'; }).join('') +
            '</tbody></table></div>' : '') +
          '<p class="hint">Điểm sẽ được điền vào bảng để bạn kiểm tra, sau đó bấm <b>Lưu điểm</b>.</p></div>',
        actions: [{ label: 'Huỷ', kind: 'ghost' }].concat(ok.length ? [{ label: 'Điền vào bảng', kind: 'pri', onClick: function (m) {
          ok.forEach(function (x) { st.edits[x.s.id] = U.fmtScore(x.v); });
          m.close(); draw();
          U.toast('Đã điền ' + ok.length + ' điểm. Kiểm tra rồi bấm Lưu điểm.', 'ok');
        } }] : [])
      });
    };

    draw();
  }

  /* =================================================================
     BÀI TẬP VỀ NHÀ
     ================================================================= */
  async function viewHomework() {
    var v = V(), st = { list: [], files: [], some: false };
    U.swap(v, U.skeleton());
    st.list = await Api.call('homework.list', { classId: T.classId });
    var dirty = function () { var t = $('#hwT'), b = $('#hwB'); return !!((t && t.value.trim()) || (b && b.value.trim()) || st.files.length); };
    guardWhile(dirty);

    var listHtml = function () {
      if (!st.list.length) return U.empty('doc', 'Chưa giao bài nào', 'Bài đã giao sẽ hiện ở đây.');
      return st.list.map(function (h) {
        var past = U.isPast(h.due);
        var to = h.assignTo === 'all' ? 'Cả lớp' : h.assignTo.length + ' học sinh';
        return '<article class="hw-item"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><h3>' + esc(h.title) + '</h3>' +
          '<span class="badge ' + (past ? '' : 'ok') + '">' + (past ? 'Đã hết hạn' : 'Đang mở') + '</span></div>' +
          '<div class="hw-meta"><span>Hạn ' + esc(U.fmtDue(h.due)) + '</span><span>' + esc(to) + '</span>' + (h.files && h.files.length ? '<span>' + h.files.length + ' tệp</span>' : '') + '</div>' +
          '<details><summary class="small" style="cursor:pointer;color:var(--accent-ink);font-weight:600">Xem đề bài</summary><div class="prose small" style="margin-top:8px">' + esc(h.body || '(không có nội dung)') + '</div>' +
          (h.files || []).map(function (f) { return '<a class="small" style="display:block;margin-top:6px" href="' + esc(f.url) + '" download="' + esc(f.name) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>'; }).join('') +
          (h.assignTo !== 'all' ? '<p class="small muted" style="margin-top:6px">Giao cho: ' + esc(h.assignTo.map(stuName).filter(Boolean).join(', ')) + '</p>' : '') +
          '<button class="btn sm ghost danger" data-del="' + esc(h.id) + '" style="margin-top:8px">' + icon('trash', 'sm') + '<span>Xoá bài tập</span></button></details></article>';
      }).join('');
    };
    var filesHtml = function () {
      return st.files.map(function (f, i) {
        return '<div class="file-row"><div class="file-ico" aria-hidden="true">' + esc(U.fileExt(f.name)) + '</div><div class="grow"><div class="nm">' + esc(f.name) + '</div><div class="small muted">' + U.fileSize(f.size) + '</div></div>' +
          '<button type="button" class="btn sm ghost icon" data-rm="' + i + '" aria-label="Gỡ tệp ' + esc(f.name) + '">' + icon('x', 'sm') + '</button></div>';
      }).join('');
    };
    var due0 = (function () { var d = new Date(Date.now() + 7 * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T21:00'; })();

    U.swap(v, '<header class="page-h"><div><h1>Bài tập về nhà</h1><p class="sub">Soạn đề, đính kèm tệp và giao cho cả lớp hoặc từng học sinh.</p></div></header>' +
      '<div class="cols wrap-m"><form class="card card-b stack main-col" id="hwForm" novalidate style="gap:22px" aria-labelledby="hwH">' +
      '<h2 class="card-title" id="hwH">Giao bài mới</h2>' +
      '<div class="field"><label for="hwT">Tiêu đề</label><input class="input" id="hwT" maxlength="120" placeholder="VD: Bài tập Chương 2 · Dao động điều hoà"></div>' +
      '<div class="field"><label for="hwB">Đề bài</label><textarea class="input" id="hwB" rows="6" placeholder="Nội dung, yêu cầu, số bài cần làm…"></textarea></div>' +
      '<div class="field"><span class="label">Tệp đính kèm</span><div class="stack" id="hwFiles" style="gap:8px"></div>' +
      '<label style="position:relative;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--accent-ink);cursor:pointer;padding:6px 0;align-self:flex-start">' + icon('clip') + 'Thêm tệp hoặc ảnh<input type="file" id="hwF" multiple class="sr"></label></div>' +
      '<div class="two"><div class="field"><label for="hwD">Hạn nộp</label><input class="input" id="hwD" type="datetime-local" value="' + due0 + '"></div>' +
      '<div class="field"><span class="label" id="toL">Giao cho</span><div class="seg" role="group" aria-labelledby="toL"><button type="button" data-to="all" aria-pressed="true">Cả lớp</button><button type="button" data-to="some" aria-pressed="false">Chọn học sinh</button></div></div></div>' +
      '<div class="picks hidden" id="picks">' + T.students.map(function (s) { return '<label class="pick"><input type="checkbox" value="' + esc(s.id) + '">' + esc(s.name) + '</label>'; }).join('') + '</div>' +
      '<div class="row" style="justify-content:flex-end;border-top:1px solid var(--line-soft);padding-top:16px"><button type="button" class="btn ghost" id="hwClear">Xoá nội dung</button><button type="submit" class="btn pri" id="hwGo">Giao bài</button></div></form>' +
      '<section class="card side-col wide" aria-labelledby="hwL" style="overflow:hidden;gap:0"><h2 class="eyebrow" id="hwL" style="padding:20px 20px 14px;border-bottom:1px solid var(--line)">Đã giao</h2><div id="hwList">' + listHtml() + '</div></section></div>');

    var paintFiles = function () {
      $('#hwFiles').innerHTML = filesHtml();
      $$('[data-rm]', v).forEach(function (b) { b.onclick = function () { st.files.splice(Number(b.dataset.rm), 1); paintFiles(); }; });
    };
    var paintList = function () {
      $('#hwList').innerHTML = listHtml();
      $$('[data-del]', v).forEach(function (b) {
        b.onclick = async function () {
          var h = st.list.filter(function (x) { return x.id === b.dataset.del; })[0];
          if (!h || !await U.confirm({ title: 'Xoá bài tập?', message: '"' + h.title + '" sẽ bị xoá, học sinh không còn thấy bài này.', ok: 'Xoá' })) return;
          U.busy(b, async function () { await Api.call('homework.remove', { homeworkId: h.id }); st.list = st.list.filter(function (x) { return x.id !== h.id; }); paintList(); }, { ok: 'Đã xoá bài tập' });
        };
      });
    };
    paintFiles(); paintList();
    $('#hwF').onchange = async function () {
      var inp = this;
      for (var i = 0; i < inp.files.length; i++) {
        var f = inp.files[i];
        if (f.size > MAX_FILE) { U.toast(f.name + ' lớn hơn ' + U.fileSize(MAX_FILE) + ', hãy nén hoặc chia nhỏ.', 'error'); continue; }
        try { st.files.push({ name: f.name, size: f.size, type: f.type, url: await U.readAsDataUrl(f) }); } catch (e) { U.toastErr(e); }
      }
      inp.value = '';
      paintFiles();
    };
    $$('[data-to]', v).forEach(function (b) {
      b.onclick = function () {
        st.some = b.dataset.to === 'some';
        $$('[data-to]', v).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('#picks').classList.toggle('hidden', !st.some);
      };
    });
    $('#hwClear').onclick = function () { $('#hwT').value = ''; $('#hwB').value = ''; st.files = []; paintFiles(); };
    $('#hwForm').onsubmit = function (e) {
      e.preventDefault();
      var title = $('#hwT').value.trim(), due = $('#hwD').value;
      if (!title) { U.toast('Nhập tiêu đề bài tập.', 'error'); $('#hwT').focus(); return; }
      if (!due) { U.toast('Chọn hạn nộp.', 'error'); $('#hwD').focus(); return; }
      var to = 'all';
      if (st.some) {
        to = $$('#picks input:checked', v).map(function (x) { return x.value; });
        if (!to.length) { U.toast('Chọn ít nhất một học sinh.', 'error'); return; }
      }
      U.busy($('#hwGo'), async function () {
        var h = await Api.call('homework.create', { classId: T.classId, title: title, body: $('#hwB').value, due: due, assignTo: to, files: st.files });
        st.list.unshift(h);
        $('#hwT').value = ''; $('#hwB').value = ''; st.files = [];
        paintFiles(); paintList();
      }, { ok: 'Đã giao bài cho ' + (to === 'all' ? 'cả lớp' : to.length + ' học sinh') });
    };
  }

  /* =================================================================
     HỌC SINH: danh sách, mã đăng nhập 8 số
     ================================================================= */
  async function viewStudents() {
    var v = V(), q = '';
    U.swap(v, U.skeleton());
    await loadStudents();
    var draw = function () {
      var list = T.students.filter(function (s) { return !q || (s.name + ' ' + s.code).toLowerCase().indexOf(q) !== -1; });
      $('#stList').innerHTML = list.length ? list.map(function (s) {
        return '<div class="st-row"><div class="avatar" aria-hidden="true">' + esc(U.initials(s.name)) + '</div><div class="grow" style="font-weight:500">' + esc(s.name) + '</div>' +
          '<span class="code-chip">' + esc(s.code) + '<button class="btn sm ghost icon" data-copy="' + esc(s.code) + '" aria-label="Chép mã của ' + esc(s.name) + '" title="Chép mã">' + icon('copy', 'sm') + '</button></span>' +
          '<button class="btn sm ghost icon" data-edit="' + esc(s.id) + '" aria-label="Sửa tên ' + esc(s.name) + '" title="Sửa tên">' + icon('pen', 'sm') + '</button>' +
          '<button class="btn sm ghost icon danger" data-rm="' + esc(s.id) + '" aria-label="Xoá ' + esc(s.name) + '" title="Xoá khỏi lớp">' + icon('trash', 'sm') + '</button></div>';
      }).join('') : U.empty('users', q ? 'Không tìm thấy' : 'Lớp chưa có học sinh', q ? 'Thử tên hoặc mã khác.' : 'Thêm học sinh bằng ô phía trên.');
      $$('[data-copy]', v).forEach(function (b) {
        b.onclick = function () {
          var c = b.dataset.copy;
          (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(function () { U.toast('Đã chép mã ' + c, 'ok'); }, function () { U.toast('Mã: ' + c); });
        };
      });
      $$('[data-edit]', v).forEach(function (b) {
        b.onclick = function () {
          var s = T.students.filter(function (x) { return x.id === b.dataset.edit; })[0];
          if (!s) return;
          U.modal({
            title: 'Sửa tên học sinh',
            body: '<div class="field"><label for="enN">Họ và tên</label><input class="input" id="enN" maxlength="80" autocomplete="off" value="' + esc(s.name) + '"></div><p class="hint" style="margin-top:10px">Mã đăng nhập ' + esc(s.code) + ' giữ nguyên.</p>',
            actions: [{ label: 'Huỷ', kind: 'ghost' }, { label: 'Lưu', kind: 'pri', onClick: async function (m) {
              await Api.call('students.rename', { studentId: s.id, name: m.$('#enN').value });
              m.close();
              await loadStudents(); draw();
              U.toast('Đã sửa tên học sinh', 'ok');
            } }]
          });
        };
      });
      $$('[data-rm]', v).forEach(function (b) {
        b.onclick = async function () {
          var s = T.students.filter(function (x) { return x.id === b.dataset.rm; })[0];
          if (!s || !await U.confirm({ title: 'Xoá ' + s.name + '?', message: 'Học sinh, mã ' + s.code + ' và toàn bộ điểm của em sẽ bị xoá. Không hoàn tác được.', ok: 'Xoá' })) return;
          U.busy(b, async function () { await Api.call('students.remove', { studentId: s.id }); await loadStudents(); $('#stH').textContent = T.students.length + ' học sinh'; draw(); }, { ok: 'Đã xoá học sinh' });
        };
      });
    };
    U.swap(v, '<header class="page-h"><div><h1>Học sinh</h1><p class="sub">Mỗi học sinh có một mã 8 số để đăng nhập xem điểm, chuyên cần và bài tập.</p></div>' +
      '<div class="acts"><button class="btn" id="stExp">' + icon('download') + '<span>Xuất danh sách mã</span></button></div></header>' +
      '<form class="card card-b" id="stAdd" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end" novalidate>' +
      '<div class="field" style="flex:1 1 260px"><label for="stN">Thêm học sinh vào ' + esc(cls().name || 'lớp') + '</label><input class="input" id="stN" placeholder="Họ và tên" maxlength="80" autocomplete="off"></div>' +
      '<button class="btn pri" type="submit" id="stGo">' + icon('plus') + '<span>Thêm</span></button></form>' +
      '<section class="card" aria-labelledby="stH" style="overflow:hidden"><div class="card-h"><h2 class="card-title" id="stH">' + T.students.length + ' học sinh</h2>' +
      '<label class="row" style="flex:0 1 280px;gap:0;position:relative"><span class="sr">Tìm học sinh</span><input class="input" id="stQ" placeholder="Tìm tên hoặc mã" style="height:40px;padding-left:38px">' +
      '<span style="position:absolute;left:12px;top:10px;color:var(--faint)">' + icon('search', 'sm') + '</span></label></div><div id="stList"></div></section>');
    draw();
    $('#stQ').oninput = function () { q = this.value.trim().toLowerCase(); draw(); };
    $('#stAdd').onsubmit = function (e) {
      e.preventDefault();
      var name = $('#stN').value.trim();
      if (!name) { U.toast('Nhập họ tên học sinh.', 'error'); $('#stN').focus(); return; }
      U.busy($('#stGo'), async function () {
        var s = await Api.call('students.create', { classId: T.classId, name: name });
        await loadStudents();
        $('#stN').value = ''; $('#stH').textContent = T.students.length + ' học sinh';
        draw(); $('#stN').focus();
        U.toast('Đã thêm ' + s.name + ', mã ' + s.code, 'ok');
      });
    };
    $('#stExp').onclick = function () {
      U.downloadCsv('ma-hoc-sinh-' + (cls().name || 'lop').replace(/\s+/g, '-') + '.csv', [['Mã HS', 'Họ tên']].concat(T.students.map(function (s) { return [s.code, s.name]; })));
    };
  }

  /* =================================================================
     LỚP HỌC: thêm, đổi tên, sang năm học mới, xoá lớp; đổi mật khẩu
     ================================================================= */
  async function viewClasses() {
    var v = V();
    U.swap(v, U.skeleton());
    /** Tải lại danh sách lớp, giữ lớp đang chọn nếu còn, rồi vẽ lại */
    var refresh = async function (preferId) {
      T.classes = await Api.call('classes.list', {});
      var keep = T.classes.filter(function (c) { return c.id === (preferId || T.classId); })[0] || T.classes[0];
      T.classId = keep ? keep.id : '';
      try { localStorage.setItem('solop_class', T.classId); } catch (e) {}
      await loadStudents();
      paintClassSel();
      draw();
    };
    var byId = function (id) { return T.classes.filter(function (c) { return c.id === id; })[0]; };
    var draw = function () {
      var u = T.user;
      var list = T.classes.length ? T.classes.map(function (c) {
        return '<div class="st-row" style="flex-wrap:wrap"><div class="grow" style="min-width:160px"><div style="font-weight:600">' + esc(c.name) + (c.id === T.classId ? ' <span class="badge ok" style="margin-left:6px">Đang chọn</span>' : '') + '</div>' +
          '<div class="small muted">' + (c.students || 0) + ' học sinh</div></div>' +
          '<div class="row" style="gap:6px"><button class="btn sm ghost icon" data-ren="' + esc(c.id) + '" aria-label="Đổi tên ' + esc(c.name) + '" title="Đổi tên lớp">' + icon('pen', 'sm') + '</button>' +
          '<button class="btn sm" data-pro="' + esc(c.id) + '">Năm học mới</button>' +
          '<button class="btn sm ghost icon danger" data-del="' + esc(c.id) + '" aria-label="Xoá ' + esc(c.name) + '" title="Xoá lớp">' + icon('trash', 'sm') + '</button></div></div>';
      }).join('') : U.empty('board', 'Chưa có lớp nào', 'Nhập tên lớp ở ô phía trên để tạo lớp đầu tiên.');
      U.swap(v, '<header class="page-h"><div><h1>Lớp học</h1><p class="sub">Thêm lớp, đổi tên, dọn dữ liệu khi sang năm học mới.</p></div></header>' +
        '<form class="card card-b" id="clAdd" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end" novalidate>' +
        '<div class="field" style="flex:1 1 260px"><label for="clN">Thêm lớp mới</label><input class="input" id="clN" placeholder="VD: Lớp 10A1" maxlength="60" autocomplete="off"></div>' +
        '<button class="btn pri" type="submit" id="clGo">' + icon('plus') + '<span>Thêm lớp</span></button></form>' +
        '<section class="card" aria-labelledby="clH" style="overflow:hidden"><div class="card-h"><h2 class="card-title" id="clH">' + T.classes.length + ' lớp</h2></div>' + list + '</section>' +
        '<section class="card card-b" aria-labelledby="acH" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><div class="grow" style="min-width:200px"><h2 class="card-title" id="acH">Tài khoản</h2>' +
        '<p class="small muted" style="margin-top:4px">' + esc(u.name) + (u.email ? ' · ' + esc(u.email) : '') + '</p></div>' +
        '<button class="btn" id="chPw">' + icon('lock') + '<span>Đổi mật khẩu</span></button></section>');

      $('#clAdd').onsubmit = function (e) {
        e.preventDefault();
        var name = $('#clN').value.trim();
        if (!name) { U.toast('Nhập tên lớp.', 'error'); $('#clN').focus(); return; }
        U.busy($('#clGo'), async function () {
          var c = await Api.call('classes.create', { name: name });
          await refresh(T.classId || c.id);
          U.toast('Đã thêm ' + c.name, 'ok');
        });
      };
      $$('[data-ren]', v).forEach(function (b) {
        b.onclick = function () {
          var c = byId(b.dataset.ren);
          U.modal({
            title: 'Đổi tên lớp',
            body: '<div class="field"><label for="rnN">Tên lớp</label><input class="input" id="rnN" maxlength="60" autocomplete="off" value="' + esc(c.name) + '"></div>',
            actions: [{ label: 'Huỷ', kind: 'ghost' }, { label: 'Lưu', kind: 'pri', onClick: async function (m) {
              await Api.call('classes.rename', { classId: c.id, name: m.$('#rnN').value });
              m.close(); await refresh();
              U.toast('Đã đổi tên lớp', 'ok');
            } }]
          });
        };
      });
      $$('[data-pro]', v).forEach(function (b) {
        b.onclick = function () {
          var c = byId(b.dataset.pro);
          U.modal({
            title: 'Chuyển ' + c.name + ' sang năm học mới',
            body: '<div class="stack"><p><b>Giữ lại:</b> ' + (c.students || 0) + ' học sinh và mã đăng nhập của các em.</p>' +
              '<p class="err"><b>Xoá hẳn:</b> toàn bộ buổi điểm danh, bài kiểm tra, điểm và bài tập của lớp này. Không hoàn tác được.</p>' +
              '<div class="field"><label for="prN">Tên lớp trong năm học mới</label><input class="input" id="prN" maxlength="60" autocomplete="off" value="' + esc(c.name) + '"></div></div>',
            actions: [{ label: 'Huỷ', kind: 'ghost' }, { label: 'Xoá dữ liệu năm cũ', kind: 'pri', onClick: async function (m) {
              await Api.call('classes.promote', { classId: c.id, name: m.$('#prN').value });
              m.close(); await refresh();
              U.toast('Đã chuyển lớp sang năm học mới', 'ok');
            } }]
          });
        };
      });
      $$('[data-del]', v).forEach(function (b) {
        b.onclick = async function () {
          var c = byId(b.dataset.del);
          if (!await U.confirm({ title: 'Xoá ' + c.name + '?', message: 'Lớp này cùng ' + (c.students || 0) + ' học sinh, mã đăng nhập, điểm danh, điểm và bài tập sẽ bị xoá hẳn. Không hoàn tác được.', ok: 'Xoá lớp' })) return;
          U.busy(b, async function () { await Api.call('classes.remove', { classId: c.id }); await refresh(); }, { ok: 'Đã xoá lớp' });
        };
      });
      $('#chPw').onclick = function () {
        U.modal({
          title: 'Đổi mật khẩu',
          body: '<div class="stack"><div class="field"><label for="pwO">Mật khẩu hiện tại</label><input class="input" id="pwO" type="password" autocomplete="current-password"></div>' +
            '<div class="field"><label for="pwN">Mật khẩu mới (ít nhất 6 ký tự)</label><input class="input" id="pwN" type="password" autocomplete="new-password"></div>' +
            '<div class="field"><label for="pwR">Nhập lại mật khẩu mới</label><input class="input" id="pwR" type="password" autocomplete="new-password"></div></div>',
          actions: [{ label: 'Huỷ', kind: 'ghost' }, { label: 'Lưu mật khẩu', kind: 'pri', onClick: async function (m) {
            var n = m.$('#pwN').value;
            if (n !== m.$('#pwR').value) throw new Error('Hai lần nhập mật khẩu mới không giống nhau.');
            var r = await Api.call('auth.changePassword', { oldPassword: m.$('#pwO').value, newPassword: n });
            var s = U.Session.get();
            if (s && r && r.token) { s.token = r.token; U.Session.set(s); }
            m.close();
            U.toast('Đã đổi mật khẩu', 'ok');
          } }]
        });
      };
    };
    await refresh();
  }

  /* ---------------- khởi động ---------------- */
  async function boot() {
    var s = U.Session.require('teacher');
    if (!s) return;
    T.user = s.user;
    document.getElementById('root').innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center"><span class="spin" style="color:var(--accent);width:28px;height:28px"></span></div>';
    try {
      T.classes = await Api.call('classes.list', {});
      var saved = ''; try { saved = localStorage.getItem('solop_class') || ''; } catch (e) {}
      T.classId = (T.classes.filter(function (c) { return c.id === saved; })[0] || T.classes[0] || {}).id || '';
      await loadStudents();
    } catch (e) {
      document.getElementById('root').innerHTML = '<div class="login-panel" style="min-height:100vh">' + U.empty('alert', 'Không tải được dữ liệu', e.message, '<button class="btn pri" id="rt">Thử lại</button>') + '</div>';
      $('#rt').onclick = boot;
      return;
    }
    shell();
    router = U.router({ '/diem-danh': withClass(viewAttendance), '/bang-diem': withClass(viewGrades), '/bai-tap': withClass(viewHomework), '/hoc-sinh': withClass(viewStudents), '/lop': viewClasses }, '/diem-danh', setNav);
    router.start();
  }
  boot();
})();
