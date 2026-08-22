# Hướng dẫn chạy Study7

Tất cả lệnh dưới đây chạy tại thư mục gốc của project, ví dụ `D:\Test1908`.

## 1. Yêu cầu

- Node.js 20.19 trở lên và npm.
- Docker Desktop đang chạy.
- Các cổng `5432`, `3000` và `5173` chưa bị ứng dụng khác sử dụng.

Study7 chỉ cần chạy PostgreSQL bằng Docker. Backend và frontend chạy riêng bằng npm; Redis và MinIO chưa bắt buộc trong bản MVP.

## 2. Thiết lập lần đầu

### Bước 1: Cài thư viện

```powershell
npm install
```

### Bước 2: Tạo file môi trường

Nếu các file `.env` chưa tồn tại, chạy:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Không chạy lại các lệnh sao chép này khi đã có `.env`, vì chúng có thể ghi đè cấu hình cá nhân.

Ba file có mục đích khác nhau:

- `.env`: cấu hình container PostgreSQL và tài khoản admin dùng khi seed.
- `backend/.env`: kết nối database, JWT và cấu hình backend.
- `frontend/.env`: tên web và địa chỉ API công khai.

Mật khẩu trong `POSTGRES_PASSWORD` của `.env` phải giống mật khẩu nằm trong `DATABASE_URL` của `backend/.env`. Với cấu hình mẫu:

```env
# .env
POSTGRES_DB=toeic_quest
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change_me
```

```env
# backend/.env
DATABASE_URL=postgresql://postgres:change_me@localhost:5432/toeic_quest
```

Điền tài khoản admin muốn tạo trong `.env`:

```env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=your-secure-password
SEED_ADMIN_DISPLAY_NAME=System Admin
```

Nếu email chưa tồn tại, seed tạo một tài khoản admin. Nếu email đã tồn tại, seed giữ nguyên tài khoản đó và không xóa tài khoản nào khác.

### Bước 3: Chạy PostgreSQL

```powershell
docker compose up -d database
docker compose ps
```

Service `database` cần có trạng thái `running` hoặc `healthy`.

### Bước 4: Tạo bảng và nạp dữ liệu

```powershell
npm run prisma:deploy
npm run prisma:seed
```

Seed nạp khóa học, 6 Phase, 200 bài học, ngân hàng 5.000 từ, tài nguyên và tài khoản admin. Cảnh báo `ExperimentalWarning` của Node trong lúc seed không ảnh hưởng dữ liệu.

## 3. Chạy project hằng ngày

Bật database:

```powershell
docker compose up -d database
```

Mở terminal thứ nhất để chạy backend:

```powershell
npm run dev:backend
```

Mở terminal thứ hai để chạy frontend:

```powershell
npm run dev:frontend
```

Các địa chỉ sử dụng:

- Web: <http://localhost:5173>
- API: <http://localhost:3000/api/v1>
- Swagger: <http://localhost:3000/docs>
- Health check: <http://localhost:3000/api/v1/health>

## 4. Dừng project

- Nhấn `Ctrl + C` tại terminal backend và frontend.
- Dừng PostgreSQL nhưng giữ nguyên dữ liệu:

```powershell
docker compose stop database
```

Lần sau chỉ cần thực hiện các lệnh trong mục **Chạy project hằng ngày**. Không cần migrate hoặc seed lại nếu code không có migration/dữ liệu seed mới.

## 5. Khi pull code mới

```powershell
npm install
docker compose up -d database
npm run prisma:deploy
```

Chỉ chạy thêm `npm run prisma:seed` khi cần cập nhật nội dung khóa học hoặc tạo admin đã cấu hình trong `.env`.

## 6. Lỗi thường gặp

### `Schema engine error` hoặc không kết nối được database

Kiểm tra container và log PostgreSQL:

```powershell
docker compose ps
docker compose logs database
```

Đồng thời kiểm tra `DATABASE_URL` trong `backend/.env` có đúng user, mật khẩu, cổng và tên database hay không.

### `EADDRINUSE: address already in use :::3000`

Đã có một backend khác sử dụng cổng 3000. Giữ terminal backend cũ và không chạy thêm một bản mới, hoặc dừng bản cũ bằng `Ctrl + C`.

### Frontend báo `Failed to fetch`

Backend chưa chạy hoặc `VITE_API_BASE_URL` trong `frontend/.env` không phải:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Sau khi sửa `.env`, dừng và chạy lại frontend.

## 7. Kiểm tra source trước khi commit

```powershell
npm run build
npm test
git diff --check
```
