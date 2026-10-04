/* =====================================================================
   SỔ LỚP — trang đăng nhập: học sinh (mã 8 số) / giáo viên (email)
   ===================================================================== */
'use strict';

(function () {
  var $ = U.$, esc = U.esc, icon = U.icon;

  function home(role) { return role === 'teacher' ? 'teacher.html' : 'student.html'; }

  function render() {
    document.title = 'Đăng nhập | ' + U.appName;
    var role = 'student';
    try { role = localStorage.getItem('solop_role') === 'teacher' ? 'teacher' : 'student'; } catch (e) {}
    document.getElementById('root').innerHTML =
      '<div class="login">' +
      '<section class="login-hero">' + U.brand('index.html') +
      '<div><h1>Mỗi buổi học,<br>một trang sổ rõ ràng.</h1>' +
      '<p class="lead">Điểm danh, điểm số và bài tập của cả lớp ở cùng một nơi. Học sinh chỉ cần mã 8 số để xem kết quả của mình.</p></div>' +
      '<ul class="feats"><li><span class="num">01</span>Điểm danh từng buổi</li><li><span class="num">02</span>Điểm có hệ số</li><li><span class="num">03</span>Giao bài về nhà</li></ul>' +
      '</section>' +
      '<section class="login-panel"><div class="login-box">' +
      '<div><h2>Đăng nhập</h2><p class="muted" style="margin-top:6px">Chọn vai trò của bạn để tiếp tục.</p></div>' +
      '<div class="seg" role="group" aria-label="Vai trò"><button type="button" data-r="student">Học sinh</button><button type="button" data-r="teacher">Giáo viên</button></div>' +
      '<form id="fStudent" class="stack" novalidate>' +
      '<div class="field"><label for="code">Mã học sinh</label>' +
      '<div class="code-wrap" id="codeWrap"><div class="code-boxes" aria-hidden="true">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return '<div class="code-box"></div>'; }).join('') + '</div>' +
      '<input class="code-input" id="code" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="8" aria-describedby="codeHint"></div>' +
      '<p class="hint" id="codeHint">Mã gồm 8 chữ số do giáo viên cấp.</p></div>' +
      '<p class="err hidden" id="sErr" role="alert"></p>' +
      '<button class="btn pri lg block" type="submit" id="sGo"><span>Xem kết quả học tập</span></button></form>' +
      '<form id="fTeacher" class="stack hidden" novalidate>' +
      '<div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="ten@truong.edu.vn"></div>' +
      '<div class="field"><label for="pw">Mật khẩu</label><input class="input" id="pw" type="password" autocomplete="current-password"></div>' +
      '<p class="err hidden" id="tErr" role="alert"></p>' +
      '<button class="btn pri lg block" type="submit" id="tGo"><span>Đăng nhập</span></button></form>' +
      (Api.isDemo ? '<div class="demo-note">Bản demo, dữ liệu mẫu lưu trên trình duyệt này. Học sinh thử mã <b class="num">20260417</b>. Giáo viên: <b>' + esc(Api.demoTeacher.email) + '</b> / <b class="num">' + esc(Api.demoTeacher.password) + '</b>.</div>' : '') +
      '</div></section></div>';

    var setRole = function (r) {
      role = r;
      try { localStorage.setItem('solop_role', r); } catch (e) {}
      U.$$('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.r === r)); });
      $('#fStudent').classList.toggle('hidden', r !== 'student');
      $('#fTeacher').classList.toggle('hidden', r !== 'teacher');
      setTimeout(function () { (r === 'student' ? $('#code') : $('#email')).focus(); }, 0);
    };
    U.$$('.seg button').forEach(function (b) { b.onclick = function () { setRole(b.dataset.r); }; });
    setRole(role);

    /* ---- 8 ô mã số: một ô nhập thật nằm đè lên, dán được cả chuỗi ---- */
    var code = $('#code'), boxes = U.$$('.code-box'), wrap = $('#codeWrap');
    var paint = function () {
      var v = code.value;
      boxes.forEach(function (b, i) { b.textContent = v[i] || ''; b.classList.toggle('cur', i === Math.min(v.length, 7)); });
      var left = 8 - v.length;
      $('#codeHint').textContent = 'Mã gồm 8 chữ số do giáo viên cấp.' + (v.length ? (left ? ' Còn ' + left + ' số.' : ' Đã đủ 8 số.') : '');
    };
    code.addEventListener('input', function () {
      code.value = code.value.replace(/\D/g, '').slice(0, 8);
      wrap.classList.remove('bad'); $('#sErr').classList.add('hidden');
      paint();
      if (code.value.length === 8) $('#fStudent').requestSubmit ? $('#fStudent').requestSubmit() : $('#sGo').click();
    });
    paint();

    var fail = function (box, el, msg) {
      el.textContent = msg; el.classList.remove('hidden');
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    };
    $('#fStudent').onsubmit = function (e) {
      e.preventDefault();
      if (!/^\d{8}$/.test(code.value)) { wrap.classList.add('bad'); fail(wrap, $('#sErr'), 'Mã học sinh gồm đúng 8 chữ số.'); code.focus(); return; }
      U.busy($('#sGo'), async function () {
        var r = await Api.call('auth.studentLogin', { code: code.value });
        U.Session.set(r);
        location.href = home('student');
      }, { silent: true, rethrow: true }).catch(function (er) { wrap.classList.add('bad'); fail(wrap, $('#sErr'), er.message); });
    };
    $('#fTeacher').onsubmit = function (e) {
      e.preventDefault();
      var email = $('#email').value.trim(), pw = $('#pw').value;
      if (!email || !pw) { fail($('#fTeacher'), $('#tErr'), 'Nhập email và mật khẩu.'); return; }
      U.busy($('#tGo'), async function () {
        var r = await Api.call('auth.teacherLogin', { email: email, password: pw });
        U.Session.set(r);
        location.href = home('teacher');
      }, { silent: true, rethrow: true }).catch(function (er) { fail($('#fTeacher'), $('#tErr'), er.message); });
    };
  }

  var s = U.Session.get();
  if (s && s.user && s.token) location.replace(home(s.user.role));
  else render();
})();
