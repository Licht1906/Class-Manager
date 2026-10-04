/* =====================================================================
   SỔ LỚP — máy chủ chạy trên Google Apps Script, dữ liệu nằm trong
   chính file Google Sheet chứa script này.

   Cài đặt: xem mục "Cài đặt máy chủ" trong README.md.
   Giao diện gửi POST text/plain chứa JSON { action, token, ...params },
   máy chủ trả { ok: true, data } hoặc { ok: false, code, error }.
   Danh sách action giống hệt máy chủ giả trong assets/api.js.
   ===================================================================== */

var TZ = 'Asia/Ho_Chi_Minh';
var MAX_FILE = 3 * 1024 * 1024;      // mỗi tệp đính kèm bài tập
var MAX_FILES = 5;
var TEACHER_DAYS = 30, STUDENT_DAYS = 120;   // thời hạn một lần đăng nhập

/* Mỗi tab là một bảng, dòng 1 là tên cột. Mọi ô đều ở dạng văn bản. */
var TABS = {
  GiaoVien: ['id', 'name', 'email', 'salt', 'hash'],
  Lop: ['id', 'teacherId', 'name', 'TX', 'GK', 'CK'],
  HocSinh: ['id', 'classId', 'name', 'code'],
  BuoiHoc: ['id', 'classId', 'date', 'start', 'end', 'marked', 'absent'],     // absent: JSON mảng id học sinh vắng
  BaiKiemTra: ['id', 'classId', 'name', 'type', 'date'],
  Diem: ['testId', 'studentId', 'score'],
  BaiTap: ['id', 'classId', 'title', 'body', 'due', 'createdAt', 'assignTo', 'files']   // assignTo, files: JSON
};

/* action chỉ đọc: không cần khoá. Đăng nhập cũng không ghi gì vào Sheet. */
var NO_LOCK = {
  'auth.studentLogin': 1, 'auth.teacherLogin': 1, 'auth.logout': 1, 'classes.list': 1, 'students.list': 1,
  'attendance.sessions': 1, 'attendance.get': 1, 'grades.get': 1, 'homework.list': 1, 'student.overview': 1
};

/* ---------------- cửa vào ---------------- */
function doPost(e) {
  var out;
  try {
    var p;
    try { p = JSON.parse(e.postData.contents); } catch (x) { throw err_('BAD', 'Yêu cầu không đọc được.'); }
    var fn = H[p.action];
    if (!fn) throw err_('NO_ACTION', 'Máy chủ chưa có chức năng "' + p.action + '".');
    var lock = null;
    if (!NO_LOCK[p.action]) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(25000)) throw err_('BUSY', 'Máy chủ đang bận, thử lại sau vài giây.');
    }
    try { out = { ok: true, data: fn(p) }; }
    finally { if (lock) { SpreadsheetApp.flush(); lock.releaseLock(); } }
  } catch (x) {
    out = { ok: false, code: x.code || 'ERR', error: x.code ? x.message : 'Máy chủ gặp lỗi: ' + x.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return ContentService.createTextOutput('Máy chủ Sổ Lớp đang chạy.');
}

function err_(code, message) { var e = new Error(message); e.code = code; return e; }
function need_(cond, message, code) { if (!cond) throw err_(code || 'BAD', message); }

/* ---------------- đọc, ghi Sheet ---------------- */
var _ss = null, _cache = {};
function ss_() { return _ss || (_ss = SpreadsheetApp.getActiveSpreadsheet()); }
function sheet_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) throw err_('SETUP', 'Máy chủ chưa được cài đặt. Mở file Google Sheet, chọn menu Sổ Lớp > Cài đặt lần đầu.');
  return s;
}
/* Chuỗi bắt đầu bằng = + - @ sẽ bị Sheet hiểu là công thức: thêm dấu nháy đơn ở đầu để giữ nguyên là chữ. */
function toCell_(v) { var s = v === null || v === undefined ? '' : String(v); return /^[=+\-@']/.test(s) ? "'" + s : s; }
function fromCell_(s) { return /^'[=+\-@']/.test(s) ? s.slice(1) : s; }

function rows_(name) {
  if (_cache[name]) return _cache[name];
  var s = sheet_(name), cols = TABS[name], n = s.getLastRow(), out = [];
  if (n > 1) {
    s.getRange(2, 1, n - 1, cols.length).getDisplayValues().forEach(function (r) {
      if (r[0] === '') return;
      var o = {};
      cols.forEach(function (c, i) { o[c] = fromCell_(r[i]); });
      out.push(o);
    });
  }
  return (_cache[name] = out);
}
function ensureRows_(s, last) { var max = s.getMaxRows(); if (max < last) s.insertRowsAfter(max, last - max + 200); }
/** Ghi lại toàn bộ một tab (dùng khi sửa hoặc xoá dòng). Ghi đè trước, dọn phần thừa sau, nên không có lúc nào tab bị trống. */
function save_(name, list) {
  var s = sheet_(name), cols = TABS[name], n = s.getLastRow();
  if (list.length) {
    ensureRows_(s, list.length + 1);
    s.getRange(2, 1, list.length, cols.length).setNumberFormat('@')
      .setValues(list.map(function (o) { return cols.map(function (c) { return toCell_(o[c]); }); }));
  }
  if (n - 1 > list.length) s.getRange(list.length + 2, 1, n - 1 - list.length, cols.length).clearContent();
  _cache[name] = list;
}
function add_(name, obj) {
  var s = sheet_(name), cols = TABS[name], r = s.getLastRow() + 1;
  ensureRows_(s, r);
  s.getRange(r, 1, 1, cols.length).setNumberFormat('@').setValues([cols.map(function (c) { return toCell_(obj[c]); })]);
  if (_cache[name]) _cache[name].push(obj);
}
function find_(name, key, val) { return rows_(name).filter(function (x) { return x[key] === val; })[0] || null; }
function json_(s, fallback) { try { return JSON.parse(s); } catch (e) { return fallback; } }
function uid_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function clean_(v, max) { return String(v === null || v === undefined ? '' : v).trim().slice(0, max); }

/* ---------------- mật khẩu, phiên đăng nhập ---------------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function sha_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function pwHash_(password, salt) { var h = String(password); for (var i = 0; i < 300; i++) h = sha_(salt + h); return h; }
function sign_(body) {
  var key = prop_('SECRET');
  if (!key) throw err_('SETUP', 'Máy chủ chưa được cài đặt. Mở file Google Sheet, chọn menu Sổ Lớp > Cài đặt lần đầu.');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, key));
}
/* Phiên đăng nhập là một chuỗi có chữ ký, không lưu trong Sheet.
   v: với giáo viên là một phần mã băm mật khẩu, nên đổi mật khẩu là mọi phiên cũ hết hiệu lực. */
function token_(role, id, v, days) {
  var body = Utilities.base64EncodeWebSafe(JSON.stringify({ r: role, i: id, v: v, e: Date.now() + days * 864e5 }));
  return body + '.' + sign_(body);
}
function who_(token) {
  var bad = err_('AUTH', 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.');
  var parts = String(token || '').split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) throw bad;
  var o = json_(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString(), null);
  if (!o || !(o.e > Date.now())) throw bad;
  if (o.r === 'teacher') {
    var t = find_('GiaoVien', 'id', o.i);
    if (!t || t.hash.slice(0, 12) !== o.v) throw bad;
    return { role: 'teacher', teacher: t };
  }
  var s = find_('HocSinh', 'id', o.i);
  if (!s || s.code !== o.v) throw bad;
  return { role: 'student', student: s };
}
function teacher_(p) { var w = who_(p.token); need_(w.role === 'teacher', 'Chỉ giáo viên được làm việc này.', 'FORBIDDEN'); return w.teacher; }
function ownClass_(t, classId) {
  var c = rows_('Lop').filter(function (x) { return x.id === classId && x.teacherId === t.id; })[0];
  need_(c, 'Không tìm thấy lớp.', 'NOT_FOUND');
  return c;
}
/* Chặn dò mã, dò mật khẩu: đếm số lần sai trong bộ nhớ đệm của script. */
function failCount_(key) { return Number(CacheService.getScriptCache().get(key)) || 0; }
function failAdd_(key, seconds) { CacheService.getScriptCache().put(key, String(failCount_(key) + 1), seconds); }

/* ---------------- dựng dữ liệu trả về ---------------- */
function classView_(c) {
  return { id: c.id, name: c.name, students: rows_('HocSinh').filter(function (s) { return s.classId === c.id; }).length };
}
function studentView_(s) { return { id: s.id, name: s.name, code: s.code }; }
function studentsOf_(classId) { return rows_('HocSinh').filter(function (s) { return s.classId === classId; }); }
function weights_(c) { return { TX: Number(c.TX) || 0, GK: Number(c.GK) || 0, CK: Number(c.CK) || 0 }; }
function sessionView_(b) {
  var list = studentsOf_(b.classId), absent = json_(b.absent, []) || [];
  var away = list.filter(function (s) { return absent.indexOf(s.id) !== -1; }).length;
  return { id: b.id, classId: b.classId, date: b.date, start: b.start, end: b.end, total: list.length, present: b.marked === '1' ? list.length - away : null };
}
function sessionOf_(t, sessionId) {
  var b = find_('BuoiHoc', 'id', sessionId);
  need_(b, 'Không tìm thấy buổi học.', 'NOT_FOUND');
  ownClass_(t, b.classId);
  return b;
}
function testView_(x) { return { id: x.id, classId: x.classId, name: x.name, type: x.type, date: x.date }; }
function testOf_(t, testId) {
  var x = find_('BaiKiemTra', 'id', testId);
  need_(x, 'Không tìm thấy bài kiểm tra.', 'NOT_FOUND');
  ownClass_(t, x.classId);
  return x;
}
function scoresOfTest_(testId) {
  var o = {};
  rows_('Diem').forEach(function (d) { if (d.testId === testId) o[d.studentId] = Number(d.score); });
  return o;
}
function homeworkView_(h, forStudent) {
  var files = (json_(h.files, []) || []).map(function (f) { return { name: f.name, size: f.size, type: f.type, url: f.url }; });
  var o = { id: h.id, title: h.title, body: h.body, due: h.due, createdAt: h.createdAt, files: files };
  if (!forStudent) { o.classId = h.classId; o.assignTo = json_(h.assignTo, 'all'); }
  return o;
}
function byNewest_(a, b) { return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id); }

/* ---------------- tệp đính kèm trên Google Drive ---------------- */
function folder_() {
  var id = prop_('FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('Sổ Lớp - tệp bài tập');
  PropertiesService.getScriptProperties().setProperty('FOLDER', f.getId());
  return f;
}
function storeFiles_(files) {
  files = Array.isArray(files) ? files : [];
  need_(files.length <= MAX_FILES, 'Mỗi bài tập đính kèm tối đa ' + MAX_FILES + ' tệp.');
  return files.map(function (f) {
    var m = /^data:([^;,]*)(?:;[^;,]*)*;base64,(.*)$/.exec(String(f.url || ''));
    need_(m, 'Tệp ' + clean_(f.name, 80) + ' không đọc được.');
    var bytes = Utilities.base64Decode(m[2]);
    need_(bytes.length <= MAX_FILE, 'Tệp ' + clean_(f.name, 80) + ' lớn hơn 3 MB.');
    var name = clean_(f.name, 120) || 'tep-dinh-kem';
    var file = folder_().createFile(Utilities.newBlob(bytes, m[1] || 'application/octet-stream', name));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { name: name, size: bytes.length, type: m[1] || '', url: 'https://drive.google.com/uc?export=download&id=' + file.getId(), fileId: file.getId() };
  });
}
function trashFiles_(homeworkRows) {
  homeworkRows.forEach(function (h) {
    (json_(h.files, []) || []).forEach(function (f) {
      if (f.fileId) { try { DriveApp.getFileById(f.fileId).setTrashed(true); } catch (e) {} }
    });
  });
}

/* Xoá mọi dữ liệu học tập của một lớp (buổi học, bài kiểm tra, điểm, bài tập). Học sinh do nơi gọi quyết định. */
function wipeClassData_(classId) {
  var testIds = {};
  rows_('BaiKiemTra').forEach(function (x) { if (x.classId === classId) testIds[x.id] = 1; });
  save_('Diem', rows_('Diem').filter(function (d) { return !testIds[d.testId]; }));
  save_('BaiKiemTra', rows_('BaiKiemTra').filter(function (x) { return x.classId !== classId; }));
  save_('BuoiHoc', rows_('BuoiHoc').filter(function (x) { return x.classId !== classId; }));
  trashFiles_(rows_('BaiTap').filter(function (x) { return x.classId === classId; }));
  save_('BaiTap', rows_('BaiTap').filter(function (x) { return x.classId !== classId; }));
}
function newCode_() {
  var used = {}, c;
  rows_('HocSinh').forEach(function (s) { used[s.code] = 1; });
  do { c = String(10000000 + Math.floor(Math.random() * 90000000)); } while (used[c]);
  return c;
}

/* =====================================================================
   CÁC ACTION
   ===================================================================== */
var H = {
  /* ---- đăng nhập ---- */
  'auth.studentLogin': function (p) {
    var code = String(p.code || '');
    need_(/^\d{8}$/.test(code), 'Mã học sinh gồm đúng 8 chữ số.');
    need_(failCount_('sf') < 30, 'Có quá nhiều lần nhập sai mã. Thử lại sau 10 phút.', 'LOCKED');
    var s = find_('HocSinh', 'code', code);
    if (!s) { failAdd_('sf', 600); throw err_('NOT_FOUND', 'Không tìm thấy mã ' + code + '. Kiểm tra lại hoặc hỏi giáo viên.'); }
    return { token: token_('student', s.id, s.code, STUDENT_DAYS), user: { role: 'student', id: s.id, name: s.name, code: s.code } };
  },
  'auth.teacherLogin': function (p) {
    var email = clean_(p.email, 120).toLowerCase(), key = 'tf_' + sha_(email);
    need_(failCount_(key) < 5, 'Nhập sai quá nhiều lần. Thử lại sau 15 phút.', 'LOCKED');
    var t = rows_('GiaoVien').filter(function (x) { return x.email.toLowerCase() === email; })[0];
    if (!t || pwHash_(p.password, t.salt) !== t.hash) { failAdd_(key, 900); throw err_('AUTH_FAIL', 'Email hoặc mật khẩu không đúng.'); }
    return { token: token_('teacher', t.id, t.hash.slice(0, 12), TEACHER_DAYS), user: { role: 'teacher', id: t.id, name: t.name, email: t.email } };
  },
  'auth.logout': function () { return true; },
  'auth.changePassword': function (p) {
    var t = teacher_(p);
    need_(pwHash_(p.oldPassword, t.salt) === t.hash, 'Mật khẩu hiện tại không đúng.', 'AUTH_FAIL');
    need_(String(p.newPassword || '').length >= 6, 'Mật khẩu mới cần ít nhất 6 ký tự.');
    t.salt = Utilities.getUuid();
    t.hash = pwHash_(p.newPassword, t.salt);
    save_('GiaoVien', rows_('GiaoVien'));
    return { token: token_('teacher', t.id, t.hash.slice(0, 12), TEACHER_DAYS) };
  },

  /* ---- lớp ---- */
  'classes.list': function (p) {
    var t = teacher_(p);
    return rows_('Lop').filter(function (c) { return c.teacherId === t.id; }).map(classView_);
  },
  'classes.create': function (p) {
    var t = teacher_(p), name = clean_(p.name, 60);
    need_(name, 'Nhập tên lớp.');
    var c = { id: uid_('c'), teacherId: t.id, name: name, TX: 1, GK: 2, CK: 3 };
    add_('Lop', c);
    return classView_(c);
  },
  'classes.rename': function (p) {
    var c = ownClass_(teacher_(p), p.classId), name = clean_(p.name, 60);
    need_(name, 'Nhập tên lớp.');
    c.name = name;
    save_('Lop', rows_('Lop'));
    return classView_(c);
  },
  /** Xoá lớp cùng toàn bộ học sinh, mã đăng nhập, điểm danh, điểm và bài tập của lớp */
  'classes.remove': function (p) {
    var c = ownClass_(teacher_(p), p.classId);
    wipeClassData_(c.id);
    save_('HocSinh', rows_('HocSinh').filter(function (s) { return s.classId !== c.id; }));
    save_('Lop', rows_('Lop').filter(function (x) { return x.id !== c.id; }));
    return true;
  },
  /** Sang năm học mới: giữ học sinh và mã đăng nhập, xoá điểm danh, bài kiểm tra, điểm, bài tập; có thể đổi tên lớp */
  'classes.promote': function (p) {
    var c = ownClass_(teacher_(p), p.classId), name = clean_(p.name, 60);
    need_(name, 'Nhập tên lớp.');
    wipeClassData_(c.id);
    c.name = name;
    save_('Lop', rows_('Lop'));
    return classView_(c);
  },

  /* ---- học sinh ---- */
  'students.list': function (p) {
    ownClass_(teacher_(p), p.classId);
    return studentsOf_(p.classId).map(studentView_);
  },
  'students.create': function (p) {
    ownClass_(teacher_(p), p.classId);
    var name = clean_(p.name, 80);
    need_(name, 'Nhập họ tên học sinh.');
    var s = { id: uid_('s'), classId: p.classId, name: name, code: newCode_() };
    add_('HocSinh', s);
    return studentView_(s);
  },
  'students.rename': function (p) {
    var t = teacher_(p), s = find_('HocSinh', 'id', p.studentId), name = clean_(p.name, 80);
    need_(s, 'Không tìm thấy học sinh.', 'NOT_FOUND');
    ownClass_(t, s.classId);
    need_(name, 'Nhập họ tên học sinh.');
    s.name = name;
    save_('HocSinh', rows_('HocSinh'));
    return studentView_(s);
  },
  /** Xoá học sinh, mã đăng nhập và toàn bộ điểm của em đó */
  'students.remove': function (p) {
    var t = teacher_(p), s = find_('HocSinh', 'id', p.studentId);
    need_(s, 'Không tìm thấy học sinh.', 'NOT_FOUND');
    ownClass_(t, s.classId);
    save_('Diem', rows_('Diem').filter(function (d) { return d.studentId !== s.id; }));
    save_('HocSinh', rows_('HocSinh').filter(function (x) { return x.id !== s.id; }));
    return true;
  },

  /* ---- điểm danh ---- */
  'attendance.sessions': function (p) {
    ownClass_(teacher_(p), p.classId);
    return rows_('BuoiHoc').filter(function (b) { return b.classId === p.classId; })
      .sort(function (a, b) { return a.date.localeCompare(b.date) || a.start.localeCompare(b.start); })
      .map(function (b, i) { var v = sessionView_(b); v.no = i + 1; return v; }).reverse();
  },
  'attendance.createSession': function (p) {
    ownClass_(teacher_(p), p.classId);
    need_(/^\d{4}-\d{2}-\d{2}$/.test(p.date || ''), 'Chọn ngày học.');
    var hm = function (v) { return /^\d{2}:\d{2}$/.test(v || '') ? v : ''; };
    var b = { id: uid_('b'), classId: p.classId, date: p.date, start: hm(p.start), end: hm(p.end), marked: '', absent: '[]' };
    add_('BuoiHoc', b);
    return sessionView_(b);
  },
  'attendance.get': function (p) {
    var b = sessionOf_(teacher_(p), p.sessionId), marks = {};
    if (b.marked === '1') {
      var absent = json_(b.absent, []) || [];
      studentsOf_(b.classId).forEach(function (s) { marks[s.id] = absent.indexOf(s.id) !== -1 ? 'A' : 'P'; });
    }
    return { session: sessionView_(b), marks: marks };
  },
  'attendance.save': function (p) {
    var b = sessionOf_(teacher_(p), p.sessionId), marks = p.marks || {};
    b.absent = JSON.stringify(studentsOf_(b.classId).filter(function (s) { return marks[s.id] === 'A'; }).map(function (s) { return s.id; }));
    b.marked = '1';
    save_('BuoiHoc', rows_('BuoiHoc'));
    return sessionView_(b);
  },
  'attendance.removeSession': function (p) {
    var b = sessionOf_(teacher_(p), p.sessionId);
    save_('BuoiHoc', rows_('BuoiHoc').filter(function (x) { return x.id !== b.id; }));
    return true;
  },

  /* ---- bài kiểm tra, điểm, hệ số ---- */
  'grades.get': function (p) {
    var c = ownClass_(teacher_(p), p.classId);
    var tests = rows_('BaiKiemTra').filter(function (x) { return x.classId === c.id; }).map(testView_), scores = {};
    tests.forEach(function (x) { scores[x.id] = {}; });
    rows_('Diem').forEach(function (d) { if (scores[d.testId]) scores[d.testId][d.studentId] = Number(d.score); });
    return { tests: tests, scores: scores, weights: weights_(c) };
  },
  'tests.create': function (p) {
    ownClass_(teacher_(p), p.classId);
    var name = clean_(p.name, 80);
    need_(name, 'Nhập tên bài kiểm tra.');
    need_(['TX', 'GK', 'CK'].indexOf(p.type) !== -1, 'Chọn loại điểm.');
    var x = { id: uid_('t'), classId: p.classId, name: name, type: p.type, date: /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date : today_() };
    add_('BaiKiemTra', x);
    return testView_(x);
  },
  'tests.remove': function (p) {
    var x = testOf_(teacher_(p), p.testId);
    save_('Diem', rows_('Diem').filter(function (d) { return d.testId !== x.id; }));
    save_('BaiKiemTra', rows_('BaiKiemTra').filter(function (y) { return y.id !== x.id; }));
    return true;
  },
  /** scores: {studentId: số 0..10 hoặc null để xoá điểm}. Chỉ những học sinh có trong scores mới bị đổi. */
  'scores.save': function (p) {
    var x = testOf_(teacher_(p), p.testId), inClass = {}, cur = scoresOfTest_(x.id);
    studentsOf_(x.classId).forEach(function (s) { inClass[s.id] = 1; });
    Object.keys(p.scores || {}).forEach(function (sid) {
      need_(inClass[sid], 'Có học sinh không thuộc lớp này. Tải lại trang rồi thử lại.');
      var v = p.scores[sid];
      if (v === null || v === '') { delete cur[sid]; return; }
      v = Number(v);
      need_(!isNaN(v) && v >= 0 && v <= 10, 'Điểm phải từ 0 đến 10.');
      cur[sid] = Math.round(v * 100) / 100;
    });
    var rest = rows_('Diem').filter(function (d) { return d.testId !== x.id; });
    save_('Diem', rest.concat(Object.keys(cur).map(function (sid) { return { testId: x.id, studentId: sid, score: cur[sid] }; })));
    return cur;
  },
  'weights.save': function (p) {
    var c = ownClass_(teacher_(p), p.classId), w = {};
    ['TX', 'GK', 'CK'].forEach(function (k) {
      var v = Number(p.weights && p.weights[k]);
      need_(v >= 0 && v <= 10 && Math.round(v) === v, 'Hệ số là số nguyên từ 0 đến 10.');
      w[k] = v;
    });
    need_(w.TX + w.GK + w.CK > 0, 'Cần ít nhất một hệ số lớn hơn 0.');
    c.TX = w.TX; c.GK = w.GK; c.CK = w.CK;
    save_('Lop', rows_('Lop'));
    return w;
  },

  /* ---- bài tập về nhà ---- */
  'homework.list': function (p) {
    ownClass_(teacher_(p), p.classId);
    return rows_('BaiTap').filter(function (h) { return h.classId === p.classId; }).sort(byNewest_).map(function (h) { return homeworkView_(h, false); });
  },
  'homework.create': function (p) {
    ownClass_(teacher_(p), p.classId);
    var title = clean_(p.title, 120), due = clean_(p.due, 16), inClass = {};
    need_(title, 'Nhập tiêu đề bài tập.');
    need_(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(due), 'Chọn hạn nộp.');
    studentsOf_(p.classId).forEach(function (s) { inClass[s.id] = 1; });
    var to = p.assignTo === 'all' ? 'all' : (Array.isArray(p.assignTo) ? p.assignTo.filter(function (id) { return inClass[id]; }) : []);
    need_(to === 'all' || to.length, 'Chọn ít nhất một học sinh.');
    var h = { id: uid_('h'), classId: p.classId, title: title, body: clean_(p.body, 20000), due: due, createdAt: today_(),
      assignTo: JSON.stringify(to), files: JSON.stringify(storeFiles_(p.files)) };
    add_('BaiTap', h);
    return homeworkView_(h, false);
  },
  'homework.remove': function (p) {
    var t = teacher_(p), h = find_('BaiTap', 'id', p.homeworkId);
    need_(h, 'Không tìm thấy bài tập.', 'NOT_FOUND');
    ownClass_(t, h.classId);
    trashFiles_([h]);
    save_('BaiTap', rows_('BaiTap').filter(function (x) { return x.id !== h.id; }));
    return true;
  },

  /* ---- trang học sinh: một lần gọi lấy hết ---- */
  'student.overview': function (p) {
    var w = who_(p.token);
    need_(w.role === 'student', 'Chỉ học sinh dùng trang này.', 'FORBIDDEN');
    var s = w.student, c = find_('Lop', 'id', s.classId) || {};
    var tests = rows_('BaiKiemTra').filter(function (x) { return x.classId === s.classId; }).map(testView_), mine = {}, scores = {};
    tests.forEach(function (x) { mine[x.id] = 1; });
    rows_('Diem').forEach(function (d) { if (d.studentId === s.id && mine[d.testId]) scores[d.testId] = Number(d.score); });
    var attendance = rows_('BuoiHoc').filter(function (b) { return b.classId === s.classId && b.marked === '1'; })
      .sort(function (a, b) { return a.date.localeCompare(b.date) || a.start.localeCompare(b.start); })
      .map(function (b, i) { return { no: i + 1, date: b.date, status: (json_(b.absent, []) || []).indexOf(s.id) !== -1 ? 'A' : 'P' }; });
    var homework = rows_('BaiTap').filter(function (h) {
      if (h.classId !== s.classId) return false;
      var to = json_(h.assignTo, 'all');
      return to === 'all' || (Array.isArray(to) && to.indexOf(s.id) !== -1);
    }).sort(byNewest_).map(function (h) { return homeworkView_(h, true); });
    return { student: studentView_(s), className: c.name || '', weights: weights_(c), tests: tests, scores: scores, attendance: attendance, homework: homework };
  }
};

/* =====================================================================
   CÀI ĐẶT — chạy từ menu "Sổ Lớp" trong file Google Sheet
   ===================================================================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sổ Lớp')
    .addItem('1. Cài đặt lần đầu', 'caiDat')
    .addItem('2. Thêm giáo viên', 'themGiaoVien')
    .addSeparator()
    .addItem('Đặt lại mật khẩu giáo viên', 'datLaiMatKhau')
    .addItem('Xoá giáo viên', 'xoaGiaoVien')
    .addToUi();
}

/** Tạo các tab, khoá bí mật để ký phiên đăng nhập và thư mục Drive chứa tệp bài tập. Chạy lại nhiều lần cũng không mất dữ liệu. */
function caiDat() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) {
    var s = ss.getSheetByName(name) || ss.insertSheet(name), cols = TABS[name];
    s.getRange(1, 1, s.getMaxRows(), cols.length).setNumberFormat('@');
    s.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    s.setFrozenRows(1);
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  folder_();
  SpreadsheetApp.getUi().alert('Đã cài đặt xong. Bước tiếp theo: menu Sổ Lớp > 2. Thêm giáo viên.');
}

function ask_(title, text) {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt(title, text, ui.ButtonSet.OK_CANCEL);
  return r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : null;
}
function themGiaoVien() {
  var ui = SpreadsheetApp.getUi();
  var name = ask_('Thêm giáo viên (1/3)', 'Họ tên giáo viên:');
  if (!name) return;
  var email = ask_('Thêm giáo viên (2/3)', 'Email dùng để đăng nhập:');
  if (!email) return;
  email = email.toLowerCase();
  if (rows_('GiaoVien').some(function (t) { return t.email.toLowerCase() === email; })) { ui.alert('Email này đã có tài khoản.'); return; }
  var pw = ask_('Thêm giáo viên (3/3)', 'Mật khẩu (ít nhất 6 ký tự). Giáo viên có thể tự đổi sau khi đăng nhập:');
  if (pw === null) return;
  if (pw.length < 6) { ui.alert('Mật khẩu cần ít nhất 6 ký tự. Chưa tạo tài khoản.'); return; }
  var salt = Utilities.getUuid();
  add_('GiaoVien', { id: uid_('gv'), name: name, email: email, salt: salt, hash: pwHash_(pw, salt) });
  ui.alert('Đã tạo tài khoản cho ' + name + '.');
}
function datLaiMatKhau() {
  var ui = SpreadsheetApp.getUi();
  var email = ask_('Đặt lại mật khẩu', 'Email của giáo viên:');
  if (!email) return;
  var t = rows_('GiaoVien').filter(function (x) { return x.email.toLowerCase() === email.toLowerCase(); })[0];
  if (!t) { ui.alert('Không có tài khoản nào dùng email này.'); return; }
  var pw = ask_('Đặt lại mật khẩu', 'Mật khẩu mới cho ' + t.name + ' (ít nhất 6 ký tự):');
  if (pw === null) return;
  if (pw.length < 6) { ui.alert('Mật khẩu cần ít nhất 6 ký tự. Chưa đổi.'); return; }
  t.salt = Utilities.getUuid();
  t.hash = pwHash_(pw, t.salt);
  save_('GiaoVien', rows_('GiaoVien'));
  ui.alert('Đã đặt mật khẩu mới. Các máy đang đăng nhập bằng mật khẩu cũ sẽ phải đăng nhập lại.');
}
/** Xoá một tài khoản giáo viên cùng toàn bộ lớp, học sinh, điểm danh, điểm và bài tập của giáo viên đó. */
function xoaGiaoVien() {
  var ui = SpreadsheetApp.getUi();
  var email = ask_('Xoá giáo viên', 'Email của giáo viên cần xoá:');
  if (!email) return;
  var t = rows_('GiaoVien').filter(function (x) { return x.email.toLowerCase() === email.toLowerCase(); })[0];
  if (!t) { ui.alert('Không có tài khoản nào dùng email này.'); return; }
  var classes = rows_('Lop').filter(function (c) { return c.teacherId === t.id; });
  var students = rows_('HocSinh').filter(function (s) { return classes.some(function (c) { return c.id === s.classId; }); }).length;
  var ok = ui.alert('Xoá ' + t.name + '?', 'Tài khoản này cùng ' + classes.length + ' lớp, ' + students + ' học sinh và toàn bộ điểm danh, điểm, bài tập của các lớp đó sẽ bị xoá hẳn. Không hoàn tác được.', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) { ui.alert('Máy chủ đang bận, thử lại sau vài giây.'); return; }
  try {
    classes.forEach(function (c) { wipeClassData_(c.id); });
    save_('HocSinh', rows_('HocSinh').filter(function (s) { return !classes.some(function (c) { return c.id === s.classId; }); }));
    save_('Lop', rows_('Lop').filter(function (c) { return c.teacherId !== t.id; }));
    save_('GiaoVien', rows_('GiaoVien').filter(function (x) { return x.id !== t.id; }));
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  ui.alert('Đã xoá tài khoản ' + t.name + '.');
}
