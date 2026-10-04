# Sổ Lớp

Hệ thống quản lý lớp học, gồm 2 vai trò:

- **Giáo viên** (`teacher.html`): điểm danh từng buổi (có mặt / vắng), bảng điểm (chọn bài kiểm tra bất kỳ để nhập điểm từng học sinh hoặc nhập từ tệp .xlsx/.csv), hệ số TX/GK/CK tính điểm trung bình, giao bài tập về nhà, quản lý học sinh và mã đăng nhập 8 số, quản lý lớp (thêm, đổi tên, sang năm học mới, xoá), đổi mật khẩu.
- **Học sinh** (`student.html`): xem điểm trung bình, điểm từng bài, số buổi có mặt/vắng, đề bài đã giao. Đăng nhập bằng mã 8 chữ số.

Đây là HTML/CSS/JS thuần, không cần build. Giao diện tự co giãn cho cả điện thoại và máy tính, có cả chế độ sáng và tối theo cài đặt của máy.

## Chạy thử

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

Khi `config.js` để `API_URL: ''`, trang chạy **bản demo**. Dữ liệu mẫu được lưu trong `localStorage` của trình duyệt, nên mọi thao tác thêm, sửa, xoá đều chạy được.

- Học sinh: mã `20260417`
- Giáo viên: `giaovien@demo.vn` / `123456`
- Muốn về lại dữ liệu mẫu ban đầu: gõ `Api.resetDemo()` trong console rồi tải lại trang.

## Cấu trúc

| File | Vai trò |
|---|---|
| `index.html`, `assets/login.js` | Đăng nhập: học sinh nhập mã 8 số, giáo viên nhập email và mật khẩu |
| `teacher.html`, `assets/teacher.js` | Khu giáo viên, điều hướng `#/diem-danh`, `#/bang-diem`, `#/bai-tap`, `#/hoc-sinh` |
| `student.html`, `assets/student.js` | Khu học sinh, điều hướng `#/`, `#/diem`, `#/bai-tap` |
| `assets/common.js` | Tiện ích dùng chung (`U.*`): định dạng, biểu tượng, thông báo, hộp thoại, phiên đăng nhập, router, **công thức tính điểm**, đọc/xuất CSV/Excel |
| `assets/api.js` | **Lớp dữ liệu duy nhất.** Gồm phần gọi máy chủ thật và máy chủ giả (demo) |
| `assets/ui.css` | Toàn bộ giao diện. Màu sắc là biến CSS ở `:root` |
| `config.js` | `API_URL` (địa chỉ máy chủ) và `APP_NAME` (tên hiển thị) |
| `server/Code.gs` | Máy chủ thật, chạy trên Google Apps Script, lưu dữ liệu trong Google Sheet |
| `sw.js` | Chỉ để dọn bộ nhớ đệm của giao diện cũ trên các máy đã từng mở bản cũ |

## Cài đặt máy chủ (Google Apps Script + Google Sheet)

Làm một lần, bằng tài khoản Google sẽ giữ dữ liệu (vd tài khoản của giáo viên). Không tốn phí, không cần máy chủ riêng.

1. Vào [sheets.new](https://sheets.new) để tạo một file Google Sheet mới, đặt tên tuỳ ý (vd "Sổ Lớp - dữ liệu").
2. Trong file đó, chọn **Tiện ích mở rộng > Apps Script**. Xoá hết đoạn mã có sẵn, dán toàn bộ nội dung `server/Code.gs` vào, bấm **Lưu**.
3. Quay lại file Sheet và tải lại trang. Trên thanh menu xuất hiện mục **Sổ Lớp**.
4. Chọn **Sổ Lớp > 1. Cài đặt lần đầu**. Google hỏi cấp quyền: chọn tài khoản, bấm **Nâng cao > Đi tới … (không an toàn) > Cho phép** (cảnh báo này hiện ra vì script do bạn tự viết, chưa qua Google duyệt). Cấp quyền xong, chọn lại **1. Cài đặt lần đầu** một lần nữa để script chạy. File sẽ có thêm 7 tab dữ liệu.
5. Chọn **Sổ Lớp > 2. Thêm giáo viên**, nhập họ tên, email và mật khẩu.
6. Trong cửa sổ Apps Script, chọn **Triển khai > Tuỳ chọn triển khai mới**, loại **Ứng dụng web**. Đặt **Thực thi dưới dạng: Tôi** và **Người có quyền truy cập: Bất kỳ ai**, rồi bấm **Triển khai**. Chép **URL ứng dụng web** (kết thúc bằng `/exec`).
7. Dán URL đó vào `API_URL` trong `config.js`, rồi đẩy lên GitHub.

Sau đó giáo viên đăng nhập bằng email và mật khẩu ở bước 5, vào mục **Lớp học** để tạo lớp, rồi vào **Học sinh** để thêm học sinh.

Những điều cần biết:

- **Khi sửa `Code.gs`:** dán mã mới, lưu, rồi vào **Triển khai > Quản lý các bản triển khai > biểu tượng bút > Phiên bản: Phiên bản mới > Triển khai**. Làm vậy thì URL giữ nguyên. Nếu tạo bản triển khai mới thì URL đổi và phải sửa `config.js`.
- **Quên mật khẩu giáo viên:** mở file Sheet, chọn **Sổ Lớp > Đặt lại mật khẩu giáo viên**.
- **Không sửa tay các tab dữ liệu** khi hệ thống đang dùng. Muốn giữ lại dữ liệu năm cũ, tạo bản sao của file Sheet (**Tệp > Tạo bản sao**) trước khi bấm "Năm học mới" hoặc xoá lớp.
- **Tệp đính kèm bài tập** nằm trong thư mục "Sổ Lớp - tệp bài tập" trên Google Drive của tài khoản đó, ai có đường dẫn đều tải được. Xoá bài tập hoặc xoá lớp thì tệp vào thùng rác của Drive.
- **Tốc độ:** mỗi thao tác mất khoảng 1 đến 3 giây, do Apps Script.

## Nối vào máy chủ thật

Mọi trang chỉ gọi `Api.call(action, params)`, không gọi thẳng máy chủ ở đâu khác. Khi `config.js` có `API_URL` bắt đầu bằng `http`, `api.js` gửi:

```
POST API_URL
Content-Type: text/plain;charset=utf-8
Body: {"action": "<tên action>", "token": "<token đăng nhập>", ...params}
```

Máy chủ cần trả về `{"ok": true, "data": ...}`, hoặc khi lỗi thì `{"ok": false, "code": "...", "error": "Câu báo lỗi tiếng Việt"}`. Nếu `code` là `"AUTH"`, giao diện tự đăng xuất và quay về trang đăng nhập.

`server/Code.gs` là máy chủ làm đúng theo các action bên dưới. Muốn dùng máy chủ khác thì viết máy chủ trả đúng các action này, hoặc sửa riêng hàm `remote()` trong `api.js` để chuyển đổi sang API sẵn có.

**Phần máy chủ giả trong `api.js` (biến `H`) là bản mô tả chuẩn của từng action:** kiểm tra quyền, kiểm tra dữ liệu và dữ liệu trả về. Khi viết máy chủ thật, cứ làm theo đúng phần này.

### Kiểu dữ liệu

```
Student   { id, name, code }                    // code: chuỗi 8 chữ số, duy nhất toàn hệ thống
Class     { id, name, students }                // students: số học sinh của lớp
Session   { id, classId, date: 'YYYY-MM-DD', start: 'HH:MM', end: 'HH:MM', no, total, present }   // present = null nếu chưa điểm danh
Test      { id, classId, name, type: 'TX'|'GK'|'CK', date: 'YYYY-MM-DD' }
Weights   { TX, GK, CK }                         // số nguyên 0..10, mặc định 1/2/3
Homework  { id, classId, title, body, due: 'YYYY-MM-DDTHH:MM', createdAt: 'YYYY-MM-DD',
            assignTo: 'all' | [studentId...], files: [{ name, size, type, url }] }
```

### Danh sách action

| Action | Vào | Ra | Ai được gọi |
|---|---|---|---|
| `auth.studentLogin` | `{ code }` | `{ token, user: { role: 'student', id, name, code } }` | ai cũng gọi được |
| `auth.teacherLogin` | `{ email, password }` | `{ token, user: { role: 'teacher', id, name, email } }` | ai cũng gọi được |
| `auth.logout` | `{}` | `true` | đã đăng nhập |
| `auth.changePassword` | `{ oldPassword, newPassword }` | `{ token }` (token mới; các phiên đăng nhập cũ hết hiệu lực) | giáo viên |
| `classes.list` | `{}` | `Class[]` (các lớp của giáo viên) | giáo viên |
| `classes.create` | `{ name }` | `Class` | giáo viên |
| `classes.rename` | `{ classId, name }` | `Class` | giáo viên |
| `classes.promote` | `{ classId, name }` | `Class`. Sang năm học mới: giữ học sinh và mã, xoá buổi học, bài kiểm tra, điểm, bài tập của lớp | giáo viên |
| `classes.remove` | `{ classId }` | `true` (xoá luôn học sinh, mã và mọi dữ liệu của lớp) | giáo viên |
| `students.list` | `{ classId }` | `Student[]` | giáo viên |
| `students.create` | `{ classId, name }` | `Student` (máy chủ tự cấp `code` 8 số) | giáo viên |
| `students.rename` | `{ studentId, name }` | `Student` (mã giữ nguyên) | giáo viên |
| `students.remove` | `{ studentId }` | `true` (xoá luôn mã và điểm của học sinh) | giáo viên |
| `attendance.sessions` | `{ classId }` | `Session[]`, mới nhất trước, `no` đánh số từ buổi cũ nhất = 1 | giáo viên |
| `attendance.createSession` | `{ classId, date, start, end }` | `Session` | giáo viên |
| `attendance.get` | `{ sessionId }` | `{ session, marks: { studentId: 'P'\|'A' } }`. Nếu `marks` rỗng thì buổi chưa điểm danh | giáo viên |
| `attendance.save` | `{ sessionId, marks: { studentId: 'P'\|'A' } }` | `Session` | giáo viên |
| `attendance.removeSession` | `{ sessionId }` | `true` | giáo viên |
| `grades.get` | `{ classId }` | `{ tests: Test[], scores: { testId: { studentId: số } }, weights }` | giáo viên |
| `tests.create` | `{ classId, name, type, date }` | `Test` | giáo viên |
| `tests.remove` | `{ testId }` | `true` (xoá luôn điểm của bài đó) | giáo viên |
| `scores.save` | `{ testId, scores: { studentId: số 0..10 \| null } }` | `{ studentId: số }` (toàn bộ điểm của bài sau khi lưu). `null` nghĩa là xoá điểm; chỉ những học sinh có trong `scores` mới bị đổi | giáo viên |
| `weights.save` | `{ classId, weights }` | `Weights` | giáo viên |
| `homework.list` | `{ classId }` | `Homework[]`, mới nhất trước | giáo viên |
| `homework.create` | `{ classId, title, body, due, assignTo, files }` | `Homework` | giáo viên |
| `homework.remove` | `{ homeworkId }` | `true` | giáo viên |
| `student.overview` | `{}` | xem bên dưới | học sinh |

`student.overview` trả về mọi thứ trang học sinh cần, trong một lần gọi:

```
{
  student: { id, name, code },
  className: 'Lớp 11A2',
  weights: { TX, GK, CK },
  tests: Test[],                                    // các bài của lớp
  scores: { testId: số },                           // chỉ điểm của học sinh này
  attendance: [{ no, date, status: 'P'|'A' }],      // các buổi đã điểm danh, cũ -> mới
  homework: [{ id, title, body, due, createdAt, files }]   // chỉ bài giao cho cả lớp hoặc cho học sinh này
}
```

### Lưu ý về máy chủ

- **Tệp đính kèm bài tập:** giao diện gửi tệp dưới dạng dataURL, mỗi tệp tối đa 3 MB (`MAX_FILE` trong `teacher.js`). Bản demo giữ nguyên dataURL; `Code.gs` lưu tệp lên Google Drive rồi trả `url` tải về, tối đa 5 tệp mỗi bài.
- **Mã học sinh:** gồm 8 chữ số và duy nhất trong toàn hệ thống. `Code.gs` khoá đăng nhập học sinh 10 phút khi có 30 lần nhập sai mã, và khoá một email giáo viên 15 phút sau 5 lần sai mật khẩu.
- **Phiên đăng nhập:** `Code.gs` dùng token có chữ ký, không lưu trong Sheet. Giáo viên phải đăng nhập lại sau 30 ngày, học sinh sau 120 ngày.
- **Điểm trung bình** được tính ở trình duyệt bằng `U.average()` trong `common.js`, theo công thức `Σ(điểm × hệ số loại) ÷ Σ(hệ số của các bài đã có điểm)`. Bài chưa có điểm không được tính. Máy chủ không cần tính trung bình, trừ khi muốn xuất báo cáo.
- **Quyền:** giáo viên chỉ được thao tác trên lớp của mình (xem `ownClass()` trong máy chủ giả).

## Tuỳ biến nhanh

- **Đổi tên hiển thị:** `APP_NAME` trong `config.js`.
- **Đổi màu:** các biến `--accent`, `--hero`, `--warn`… ở đầu `ui.css`. Chế độ tối nằm ngay bên dưới.
- **Đổi kích thước thanh bên giáo viên:** `--side`. Dưới 900px, thanh bên tự chuyển thành thanh trên cùng.
