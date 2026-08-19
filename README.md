# TOEIC Quest 800

Nền tảng web quản lý lộ trình học TOEIC theo deadline hằng ngày, giúp người học duy trì thói quen và tiến tới mục tiêu 800 điểm. Hệ thống không tổ chức thi TOEIC trực tiếp; người học làm bài trên các website bên ngoài, sau đó nhập kết quả để hệ thống theo dõi và điều chỉnh kế hoạch.

## 1. Bài toán

Nhiều người học TOEIC đã có tài liệu nhưng vẫn không đạt mục tiêu vì:

- Không biết mỗi ngày nên học nội dung nào.
- Kế hoạch quá dài và khó duy trì.
- Bỏ một vài ngày rồi mất động lực học tiếp.
- Không biết nên điều chỉnh lịch thế nào khi kết quả không tốt.
- Học từ vựng, ngữ pháp, Listening và Reading rời rạc.
- Không nhìn thấy những chiến thắng nhỏ trong quá trình học.

TOEIC Quest 800 giải quyết vấn đề bằng cách chia mục tiêu lớn thành các Phase ngắn, giao nhiệm vụ 6 ngày mỗi tuần và tạo cảm giác chiến thắng sau từng ngày, từng tuần và từng Phase.

## 2. Mục tiêu sản phẩm

- Người học luôn biết hôm nay cần học gì.
- Mỗi nhiệm vụ có thời lượng, deadline và kết quả cần đạt rõ ràng.
- Cho phép chọn khối lượng học Phục hồi, Tiêu chuẩn hoặc Tăng tốc.
- Theo dõi tiến độ bằng XP, streak, huy hiệu và bản đồ Phase.
- Ghi nhận kết quả thi thử thực hiện trên website bên ngoài.
- Sử dụng AI để phân tích kết quả hôm nay và đề xuất lịch ngày mai.
- Hệ thống vẫn hoạt động bình thường khi dịch vụ AI không khả dụng.

## 3. Phạm vi

### Có trong hệ thống

- Quản lý khóa học, Phase, chương và bài học.
- Lập lịch học 6 ngày/tuần.
- Giao nhiệm vụ hằng ngày.
- Quản lý deadline và nhiệm vụ học bù.
- Bài học dạng bài viết, video, audio, transcript, flashcard và tài liệu đính kèm.
- Focus Timer và nhật ký học tập.
- XP, level, streak, huy hiệu và phần thưởng Phase.
- Liên kết đến bài luyện tập hoặc bài thi bên ngoài.
- Nhập điểm, thời gian, kỹ năng yếu và ảnh kết quả bên ngoài.
- Báo cáo tiến độ ngày, tuần và Phase.
- AI Daily Coach phân tích và đề xuất kế hoạch ngày tiếp theo.
- Trang quản trị nội dung và theo dõi người học.

### Không có trong hệ thống

- Ngân hàng đề thi TOEIC đầy đủ.
- Màn hình thi thử TOEIC 200 câu.
- Sao chép câu hỏi, audio, video hoặc lời giải có bản quyền từ website khác.
- Tự động đăng nhập hoặc thu thập kết quả từ website bên thứ ba khi không có API chính thức.
- Cam kết người học chắc chắn đạt 800 điểm.

## 4. Đối tượng sử dụng

### Học viên

- Thiết lập mục tiêu và ngày dự thi.
- Chọn thời gian có thể học mỗi ngày.
- Nhận và hoàn thành nhiệm vụ.
- Theo dõi tiến độ, phần thưởng và lộ trình.
- Nhập kết quả làm bài bên ngoài.
- Chọn một trong các kế hoạch do hệ thống đề xuất.

### Quản trị viên hoặc giáo viên

- Quản lý nội dung khóa học.
- Tạo Phase và điều kiện mở khóa.
- Tạo mẫu nhiệm vụ.
- Quản lý nguồn tài liệu bên ngoài.
- Cấu hình XP, huy hiệu và quy tắc deadline.
- Theo dõi tiến độ và nguy cơ bỏ học.
- Kiểm tra các liên kết đã hết hiệu lực.

## 5. Tỷ lệ Web và AI

### Web app và nghiệp vụ: 70%

- Quản lý người dùng và phân quyền.
- Quản lý khóa học, Phase và bài học.
- Thuật toán lập lịch theo quy tắc.
- Deadline, trạng thái nhiệm vụ và lịch học bù.
- Quản lý tài nguyên học tập.
- Theo dõi tiến độ, streak, XP và huy hiệu.
- Ghi nhận kết quả bài làm bên ngoài.
- Báo cáo và thông báo.
- Trang quản trị.

### AI: 30%

- Phân tích kết quả học trong ngày.
- Tóm tắt điểm mạnh và điểm yếu.
- Đề xuất ba kế hoạch cho ngày tiếp theo.
- Cá nhân hóa ví dụ từ vựng.
- Viết báo cáo động lực cuối tuần.
- Phát hiện dấu hiệu quá tải hoặc mất động lực.

AI chỉ đưa ra đề xuất. Backend kiểm tra toàn bộ kết quả trước khi tạo nhiệm vụ thật.

## 6. Lộ trình tham khảo

Lộ trình mặc định kéo dài 24 tuần, phù hợp với người có điểm đầu vào khoảng 450-550 và học 60-90 phút mỗi ngày, 6 ngày mỗi tuần.

| Phase | Thời gian | Tên chặng | Mục tiêu |
| --- | ---: | --- | --- |
| 1 | 2 tuần | Khởi động chiến thắng | Duy trì 12 ngày học và tạo thói quen |
| 2 | 4 tuần | Xây nền chắc chắn | Từ vựng và ngữ pháp cốt lõi |
| 3 | 5 tuần | Giải mã Listening | Xây phương pháp luyện Part 1-4 |
| 4 | 5 tuần | Chinh phục Reading | Xây phương pháp luyện Part 5-7 |
| 5 | 4 tuần | Tăng tốc | Luyện quản lý thời gian và khắc phục điểm yếu |
| 6 | 4 tuần | Về đích 800 | Ổn định kết quả thi thử bên ngoài |

Thời lượng phải được điều chỉnh theo năng lực thực tế:

| Điểm tham khảo ban đầu | Thời gian dự kiến |
| ---: | ---: |
| Dưới 300 | 9-12 tháng |
| 300-450 | 7-9 tháng |
| 450-550 | 5-6 tháng |
| 550-650 | 3-4 tháng |
| 650-700 | 2-3 tháng |
| 700-750 | 6-10 tuần |

Các mốc trên chỉ dùng để tạo kế hoạch ban đầu, không phải cam kết điểm số.

## 7. Phase 1 - Khởi động chiến thắng

Phase 1 kéo dài 2 tuần, gồm 12 ngày học và 2 ngày nghỉ. Mục tiêu chính là tạo thói quen, không giao nội dung quá khó.

### Tuần 1

#### Ngày 1 - Bắt đầu hành trình

- Chọn ngày dự kiến thi.
- Chọn giờ học cố định.
- Học 10 từ chủ đề Office.
- Nghe tiếng Anh 10 phút.
- Viết lý do muốn đạt 800 điểm.
- Phần thưởng: huy hiệu `Đã bắt đầu`.

#### Ngày 2 - Chiến thắng đầu tiên

- Ôn 10 từ cũ.
- Học 10 từ mới.
- Học danh từ và tính từ trong 15 phút.
- Nghe và đọc nhại 5 câu.
- Ghi lại 3 câu đã nghe rõ.

#### Ngày 3 - Giữ nhịp

- Ôn từ đến hạn.
- Học 10 từ chủ đề Meeting.
- Nghe một đoạn hội thoại trong 10 phút.
- Xem transcript và ghi lại 5 cụm từ hữu ích.

#### Ngày 4 - Đọc không sợ

- Ôn từ vựng.
- Học 10 từ chủ đề Email.
- Đọc một email công việc ngắn.
- Xác định người gửi, mục đích và deadline.
- Viết một câu tóm tắt bằng tiếng Việt.

#### Ngày 5 - Củng cố

- Ôn 40 từ đã học.
- Học 10 từ mới.
- Xem lại ghi chú bốn ngày trước.
- Chọn ba nội dung chưa hiểu.
- Hoàn thành một phiên Focus Timer 25 phút.

#### Ngày 6 - Boss tuần 1

- Ôn toàn bộ 50 từ.
- Nghe liên tục trong 15 phút.
- Đọc một email và một thông báo.
- Viết ba điều bản thân đã làm tốt.
- Tải ảnh ghi chú nếu muốn.
- Phần thưởng: huy hiệu `Không bỏ cuộc` và Victory Card tuần.

#### Ngày 7 - Nghỉ

Hệ thống không giao kiến thức mới, chỉ hiển thị báo cáo tuần và lịch tuần tiếp theo.

### Tuần 2

- Tăng từ vựng lên 10-15 từ mỗi ngày.
- Duy trì 15 phút nghe.
- Duy trì 15 phút ngữ pháp hoặc đọc.
- Hoàn thành ít nhất một Focus Timer 25 phút mỗi ngày.
- Viết một điều đã hiểu sau mỗi buổi học.
- Ngày 6 hoàn thành Boss Phase.
- Phần thưởng: huy hiệu `12-Day Finisher` và mở khóa Phase 2.

## 8. Ba mức nhiệm vụ hằng ngày

### Phục hồi

- Thời lượng khoảng 20-30 phút.
- Dành cho ngày bận hoặc người học đang mệt.
- Giữ thói quen và tránh làm mất streak.

### Tiêu chuẩn

- Thời lượng khoảng 60 phút.
- Là phương án hệ thống khuyên chọn.
- Đảm bảo tiến độ của lộ trình hiện tại.

### Tăng tốc

- Thời lượng khoảng 90 phút.
- Dành cho người muốn học bù hoặc tiến nhanh hơn.
- Có nhiệm vụ bổ sung và XP cao hơn.

Nếu người học không chọn trước giờ quy định, hệ thống sử dụng kế hoạch Tiêu chuẩn.

## 9. Vòng lặp sử dụng hằng ngày

```text
Mở nhiệm vụ hôm nay
        ↓
Chọn Phục hồi, Tiêu chuẩn hoặc Tăng tốc
        ↓
Bật Focus Timer và học nội dung được giao
        ↓
Đánh dấu checklist và viết điều đã học
        ↓
Nhập kết quả bài làm bên ngoài nếu có
        ↓
Nhận XP, streak và thông báo chiến thắng
        ↓
AI phân tích và đề xuất kế hoạch ngày mai
```

## 10. Nhiệm vụ sử dụng website bên ngoài

Web không lưu trữ đề thi TOEIC. Quản trị viên chỉ tạo nguồn học hợp lệ và gắn nguồn đó vào nhiệm vụ.

Ví dụ:

```text
Boss cuối tuần

Nhiệm vụ: Làm bài TOEIC 100 câu trên website bên ngoài
Thời gian đề xuất: 60 phút
Deadline: 23:59 thứ Bảy

Thông tin cần nộp:
- Listening: 320
- Reading: 285
- Tổng điểm: 605
- Thời gian: 62 phút
- Phần yếu nhất: Part 7
- Ảnh kết quả: không bắt buộc
```

Trạng thái của nhiệm vụ bên ngoài:

```text
Đã giao → Đã mở liên kết → Chờ kết quả → Đã nộp → Đã ghi nhận
```

Chỉ mở liên kết không được tính là hoàn thành. Người học phải quay lại nhập kết quả hoặc xác nhận hoạt động đã thực hiện.

## 11. AI Daily Coach

### Input

```json
{
  "currentPhase": 3,
  "targetScore": 800,
  "examDate": "2027-01-15",
  "today": {
    "completionRate": 0.75,
    "studyMinutes": 65,
    "listeningScore": 350,
    "readingScore": 270,
    "weakParts": ["Part 5", "Part 7"],
    "difficulty": "hard",
    "mood": "tired"
  },
  "tomorrowAvailableMinutes": 60,
  "candidateLessons": [
    {
      "id": 21,
      "title": "Nhận biết từ loại",
      "durationMinutes": 20
    },
    {
      "id": 34,
      "title": "Đọc hiểu Email",
      "durationMinutes": 25
    },
    {
      "id": 48,
      "title": "Dictation Part 3",
      "durationMinutes": 15
    }
  ]
}
```

### Output

```json
{
  "analysis": {
    "strength": "Listening",
    "weakness": "Reading",
    "reason": "Điểm Reading thấp và Part 7 mất nhiều thời gian"
  },
  "plans": [
    {
      "type": "recovery",
      "totalMinutes": 30,
      "lessonIds": [21]
    },
    {
      "type": "standard",
      "totalMinutes": 60,
      "lessonIds": [21, 34],
      "recommended": true
    },
    {
      "type": "accelerated",
      "totalMinutes": 90,
      "lessonIds": [21, 34, 48]
    }
  ]
}
```

### Quy tắc an toàn

- Chỉ gửi cho AI dữ liệu cần thiết.
- Không gửi mật khẩu, access token hoặc thông tin thanh toán.
- AI chỉ được chọn `lessonId` do backend cung cấp.
- Backend phải kiểm tra schema của phản hồi.
- Không chấp nhận bài chưa mở khóa hoặc không tồn tại.
- Không để tổng thời gian vượt quá giới hạn cấu hình.
- Không cho AI tự sửa điểm hoặc xác nhận người học hoàn thành.
- Lưu log request ID, thời gian phản hồi và trạng thái; không log dữ liệu nhạy cảm.

### Xử lý khi AI lỗi

Nếu API bên thứ ba lỗi, timeout hoặc trả dữ liệu không hợp lệ, hệ thống tạo kế hoạch bằng quy tắc:

```text
1. Lấy kỹ năng có kết quả thấp nhất.
2. Lấy các từ vựng đang đến hạn ôn.
3. Chọn bài đã mở khóa và chưa hoàn thành.
4. Giới hạn tổng thời gian theo lịch người học.
5. Tạo kế hoạch Tiêu chuẩn cho ngày tiếp theo.
```

Người học vẫn sử dụng được web khi dịch vụ AI không khả dụng.

## 12. Cơ chế tạo động lực

### Tiến độ theo chặng ngắn

```text
Phase 1: 9/12 ngày
Tuần này: 5/6 ngày
Hôm nay: 3/4 nhiệm vụ
```

### Streak có khả năng phục hồi

- Không xóa toàn bộ streak ngay khi người học bỏ một ngày.
- Mỗi Phase có số lượng Vé trở lại giới hạn.
- Nhiệm vụ bị bỏ được rút gọn hoặc xếp lại.
- Không dồn quá hai nhiệm vụ vào cùng một ngày.

### Màn hình chiến thắng

```text
Bạn đã chiến thắng ngày thứ 8!
+80 XP
60 phút tập trung
15 từ đã học
Còn 4 ngày để hoàn thành Phase 1
```

### Victory Card

```text
TUẦN 1 HOÀN THÀNH
6/6 ngày
325 phút học
50 từ vựng
5 phiên tập trung
```

## 13. Quy tắc nghiệp vụ quan trọng

### Hoàn thành ngày học

Một ngày được tính hoàn thành khi:

- Hoàn thành toàn bộ nhiệm vụ bắt buộc của kế hoạch đã chọn.
- Đáp ứng thời lượng học tối thiểu nếu nhiệm vụ yêu cầu.
- Viết ghi chú tổng kết khi được cấu hình bắt buộc.
- Nộp kết quả đối với nhiệm vụ bên ngoài bắt buộc có kết quả.
- Hoàn thành trước deadline hoặc qua quy trình học bù.

### Nhiệm vụ quá hạn

```text
Đã lên lịch
→ Đã mở
→ Đang thực hiện
→ Đã nộp
→ Hoàn thành
```

Nhánh ngoại lệ:

```text
Quá hạn → Học bù → Hoàn thành
Quá hạn → Sắp xếp lại
Được miễn → Không ảnh hưởng streak
```

### Mở khóa Phase

Phase tiếp theo được mở khi:

- Hoàn thành đủ tỷ lệ ngày bắt buộc.
- Hoàn thành Boss Phase.
- Nộp tổng kết Phase.
- Không còn nhiệm vụ bắt buộc chưa xử lý.

Quản trị viên có thể cho phép mở khóa thủ công trong trường hợp đặc biệt.

## 14. Các màn hình chính

### Học viên

1. Đăng ký và đăng nhập.
2. Thiết lập mục tiêu.
3. Trang chủ Hôm nay.
4. Chọn mức nhiệm vụ.
5. Xem bài học.
6. Focus Timer.
7. Bản đồ Phase.
8. Lịch và deadline.
9. Nhập kết quả bên ngoài.
10. Nhật ký học tập.
11. XP, streak và huy hiệu.
12. Báo cáo tuần.
13. AI Daily Coach.
14. Cài đặt thông báo.

### Quản trị viên

1. Dashboard.
2. Quản lý người dùng.
3. Quản lý khóa học.
4. Quản lý Phase.
5. Quản lý bài học và tài nguyên.
6. Quản lý mẫu nhiệm vụ.
7. Quản lý nguồn bên ngoài.
8. Quản lý XP và huy hiệu.
9. Quản lý thông báo.
10. Theo dõi nguy cơ bỏ học.
11. Xem log gọi AI.

## 15. Mô hình dữ liệu đề xuất

### Người dùng và lộ trình

- `users`
- `roles`
- `user_roles`
- `learning_goals`
- `learner_profiles`
- `study_schedules`
- `study_plans`
- `plan_versions`

### Nội dung

- `courses`
- `phases`
- `modules`
- `lessons`
- `lesson_resources`
- `vocabularies`
- `vocabulary_reviews`

### Nhiệm vụ

- `assignment_templates`
- `daily_assignments`
- `assignment_items`
- `assignment_submissions`
- `study_sessions`
- `learning_journals`
- `reschedule_requests`

### Nguồn bên ngoài

- `external_resources`
- `external_assignments`
- `external_submissions`
- `submission_evidences`

### Động lực

- `xp_transactions`
- `learner_levels`
- `streaks`
- `streak_recoveries`
- `badges`
- `learner_badges`
- `phase_rewards`

### AI và thông báo

- `ai_recommendations`
- `ai_plan_options`
- `ai_request_logs`
- `notifications`
- `notification_preferences`
- `weekly_reports`

## 16. API chính đề xuất

### Học viên

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/me
PUT    /api/me/learning-goal

GET    /api/today
POST   /api/today/select-plan
POST   /api/assignments/:id/start
POST   /api/assignments/:id/complete
POST   /api/assignments/:id/reschedule

POST   /api/study-sessions/start
POST   /api/study-sessions/:id/finish
POST   /api/learning-journals

GET    /api/phases
GET    /api/phases/:id
GET    /api/progress/weekly

POST   /api/external-submissions
GET    /api/external-submissions/:id

POST   /api/ai/daily-analysis
GET    /api/ai/tomorrow-plans
POST   /api/ai/tomorrow-plans/:id/select
```

### Quản trị viên

```text
GET    /api/admin/dashboard
CRUD   /api/admin/courses
CRUD   /api/admin/phases
CRUD   /api/admin/lessons
CRUD   /api/admin/assignment-templates
CRUD   /api/admin/external-resources
CRUD   /api/admin/badges
GET    /api/admin/learners/at-risk
GET    /api/admin/ai-logs
```

## 17. Kiến trúc đề xuất

```text
React + Vite Web Application
        ↓ REST API
NestJS Backend
        ├── PostgreSQL
        ├── Redis + BullMQ
        ├── MinIO/S3 Object Storage
        ├── Email/Push Notification Provider
        └── Third-party AI API
```

### Công nghệ

- Frontend: React, Vite, TypeScript, Tailwind CSS.
- Routing: React Router.
- Server state: TanStack Query.
- Form và validation frontend: React Hook Form, Zod.
- Client state: Zustand khi thực sự cần trạng thái dùng chung; không dùng để thay thế TanStack Query.
- Backend: NestJS, TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Queue và cache: Redis, BullMQ.
- Lưu ảnh minh chứng: MinIO ở local, S3-compatible object storage khi triển khai.
- Authentication: JWT access token và refresh token.
- AI: API của nhà cung cấp LLM bên thứ ba.
- Logging: Pino.
- API documentation: Swagger/OpenAPI.

Các khóa API và giá trị cấu hình phải nằm trong biến môi trường, không hardcode trong mã nguồn.

### Vì sao chọn React + Vite thay vì Next.js?

- Sản phẩm chủ yếu là dashboard sau đăng nhập, không phụ thuộc SEO.
- Backend NestJS chịu trách nhiệm toàn bộ API và nghiệp vụ.
- Frontend SPA dễ triển khai, dễ học và tương đồng với cấu trúc dự án tham khảo trong `TTTN/Nobisoft-Intern`.
- Không phải duy trì thêm logic server-side rendering không cần thiết.

## 18. Cấu trúc source code

### Cấu trúc gốc

```text
Test1908/
├── backend/
├── frontend/
├── docs/
├── nginx/
├── storage/
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
└── README.md
```

Project giữ cách tách `backend/` và `frontend/` giống dự án tham khảo, nhưng không tạo `ai-service` riêng ở giai đoạn đầu. NestJS gọi API AI bên thứ ba thông qua provider adapter.

### Các module backend

```text
backend/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   ├── common/
│   ├── database/
│   ├── integrations/
│   │   ├── ai/
│   │   ├── email/
│   │   └── storage/
│   ├── jobs/
│   └── modules/
│       ├── auth/
│       ├── users/
│       ├── courses/
│       ├── phases/
│       ├── lessons/
│       ├── assignments/
│       ├── study-plans/
│       ├── study-sessions/
│       ├── external-resources/
│       ├── external-submissions/
│       ├── gamification/
│       ├── ai-coach/
│       ├── notifications/
│       ├── reports/
│       └── admin/
├── test/
├── .env
├── .env.example
└── package.json
```

Backend chia theo domain. Mỗi domain tự quản lý controller, service, DTO và module của mình thay vì gom toàn bộ controller hoặc service của hệ thống vào một thư mục lớn.

### Các feature frontend

```text
frontend/
├── public/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── providers.tsx
│   │   ├── query-client.ts
│   │   └── router.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── navigation/
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── today/
│   │   ├── roadmap/
│   │   ├── phases/
│   │   ├── lessons/
│   │   ├── assignments/
│   │   ├── focus-timer/
│   │   ├── external-submissions/
│   │   ├── gamification/
│   │   ├── ai-coach/
│   │   ├── reports/
│   │   └── admin/
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── styles/
├── .env
├── .env.example
└── package.json
```

Frontend chia theo feature để code API, component, hook và type của cùng một nghiệp vụ nằm gần nhau.

## 19. MVP đề xuất

### Giai đoạn 1 - Nền tảng

- Authentication và phân quyền.
- Quản lý khóa học, Phase và bài học.
- Trang Hôm nay.
- Tạo và hoàn thành nhiệm vụ.
- Lịch và deadline.

### Giai đoạn 2 - Tạo động lực

- XP và level.
- Streak và Vé trở lại.
- Huy hiệu.
- Victory Card.
- Báo cáo tuần.

### Giai đoạn 3 - Nguồn bên ngoài

- Quản lý liên kết.
- Giao nhiệm vụ ngoài hệ thống.
- Nhập điểm và ảnh kết quả.
- Theo dõi lịch sử kết quả.

### Giai đoạn 4 - AI

- Tích hợp API AI từ backend.
- Phân tích kết quả ngày.
- Sinh ba lựa chọn cho ngày mai.
- Kiểm tra schema và lesson ID.
- Thuật toán fallback khi AI lỗi.

### Giai đoạn 5 - Hoàn thiện

- Thông báo.
- Dashboard quản trị.
- Theo dõi người có nguy cơ bỏ học.
- Kiểm thử, logging và tối ưu giao diện.

## 20. Kiểm thử cơ bản

### Trường hợp 1: Hoàn thành đúng hạn

```text
Given: Người học có bốn nhiệm vụ bắt buộc
When: Hoàn thành đủ bốn nhiệm vụ trước deadline
Then: Ngày học được hoàn thành, streak tăng và XP được cộng đúng một lần
```

### Trường hợp 2: Chỉ mở liên kết bên ngoài

```text
Given: Nhiệm vụ yêu cầu nộp kết quả
When: Người học chỉ mở liên kết nhưng không nhập kết quả
Then: Nhiệm vụ giữ trạng thái Chờ kết quả và chưa được cộng XP
```

### Trường hợp 3: AI trả lesson ID không hợp lệ

```text
Given: Backend gửi danh sách lesson ID 21, 34 và 48
When: AI trả về lesson ID 99
Then: Backend từ chối phản hồi và sử dụng kế hoạch fallback
```

### Trường hợp 4: API AI bị timeout

```text
Given: Người học đã hoàn thành ngày học
When: API AI không phản hồi trong thời gian cấu hình
Then: Hệ thống tạo kế hoạch Tiêu chuẩn bằng rule engine và không bị crash
```

### Trường hợp 5: Cộng XP lặp

```text
Given: Một nhiệm vụ đã hoàn thành và đã nhận XP
When: Client gửi lại request hoàn thành
Then: Backend trả về kết quả cũ và không cộng thêm XP
```

## 21. Tiêu chí thành công của đồ án

- Tạo được lộ trình học 6 ngày mỗi tuần.
- Giao đúng nhiệm vụ theo Phase và deadline.
- Xử lý đầy đủ hoàn thành, quá hạn, học bù và miễn nhiệm vụ.
- Ghi nhận được kết quả từ website bên ngoài.
- AI trả về ba kế hoạch hợp lệ cho ngày tiếp theo.
- Có fallback khi AI lỗi.
- XP và streak không bị cộng trùng.
- Quản trị viên tạo được khóa học mà không cần sửa code.
- Có log đủ để tìm nguyên nhân khi lập lịch hoặc gọi AI thất bại.

## 22. Điểm khác biệt

Các nền tảng học TOEIC phổ biến tập trung vào kho bài giảng và ngân hàng đề. TOEIC Quest 800 tập trung vào vấn đề duy trì hành vi học:

> Người học không cần tự quyết định mỗi ngày nên học gì. Hệ thống đưa ra một nhiệm vụ vừa sức, một deadline rõ ràng và một chiến thắng có thể nhìn thấy.

## 23. Biến môi trường

Mỗi ứng dụng có file `.env` riêng:

```text
Test1908/
├── .env                    # Docker Compose
├── .env.example
├── backend/
│   ├── .env                # Database, JWT, Redis, AI và storage
│   └── .env.example
└── frontend/
    ├── .env                # Chỉ chứa cấu hình công khai có tiền tố VITE_
    └── .env.example
```

Không đặt `AI_API_KEY`, mật khẩu database, JWT secret hoặc storage secret trong frontend. Các biến `VITE_*` được đóng gói vào JavaScript và người dùng có thể đọc được.

File `.env` thật đã được `.gitignore`; chỉ commit `.env.example`.

## 24. Chạy project không cần Docker

### Yêu cầu

- Node.js 20.19 trở lên và npm.
- PostgreSQL 15 trở lên được cài trực tiếp trên máy.
- Không bắt buộc Redis hoặc MinIO ở phiên bản MVP hiện tại.

### 1. Tạo database PostgreSQL local

Có thể dùng pgAdmin hoặc `psql` để chạy:

```sql
CREATE DATABASE toeic_quest;
```

Cập nhật `backend/.env` theo tài khoản PostgreSQL trên máy:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/toeic_quest
```

### 2. Cài dependency, migrate và seed

Chạy tại thư mục gốc `D:\Test1908`:

```bash
npm install
npm run db:setup
```

`db:setup` lần lượt sinh Prisma Client, chạy toàn bộ migration PostgreSQL và nạp khóa học 144 ngày.

### 3. Chạy backend riêng

Terminal thứ nhất:

```bash
npm run dev:backend
```

- API: `http://localhost:3000/api/v1`
- Health check: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs`

### 4. Chạy frontend riêng

Terminal thứ hai:

```bash
npm run dev:frontend
```

Mở `http://localhost:5173`.

### Tài khoản demo sau khi seed

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Học viên | `learner@toeicquest.local` | `Password@123` |
| Quản trị | `admin@toeicquest.local` | `Password@123` |

Chỉ sử dụng mật khẩu này trong môi trường phát triển.

### Docker là tùy chọn

Nếu không muốn cài PostgreSQL trực tiếp, có thể dùng `docker compose up -d database`. Frontend và backend vẫn chạy riêng bằng hai lệnh phía trên.

### Kiểm tra source

```bash
npm run build
npm test
```

## 25. Dữ liệu lộ trình và bản quyền

Seed tạo **144 ngày học = 24 tuần × 6 ngày**, chia thành sáu Phase. Checklist do dự án tự biên soạn dựa trên các nguyên tắc học được công khai:

- Luyện lần lượt từng Part và chỉ chuyển trọng tâm khi độ chính xác đạt khoảng 70–80%.
- Reading làm riêng từng Part, bấm giờ, tự chữa trước khi xem giải thích.
- Listening nghe một lần, tự sửa, dictation rồi mới đọc transcript.
- Duy trì 20–30 từ vựng mỗi ngày và học ngữ pháp theo từng chủ điểm.

Nguồn tham khảo: [Lịch học STUDY4](https://study4.com/studyplan/) và [hướng dẫn Complete TOEIC](https://study4.com/posts/1251/huong-dan-cach-hoc-khoa-complete-toeic-cua-study4-hieu-qua/).

Dự án không sao chép video, flashcard, lời giải hoặc ngân hàng câu hỏi của STUDY4. Người học mở website bên ngoài để làm bài và quay lại nhập kết quả. TOEIC Quest không liên kết thương mại hay đại diện cho STUDY4.

## 26. Trạng thái MVP hiện tại

Đã hoàn thành:

- Đăng ký, đăng nhập, access/refresh token và phân quyền học viên/admin.
- Khóa học 24 tuần, 6 Phase, 144 ngày học và checklist cụ thể.
- Màn hình course player với mục lục Phase/ngày học, khóa chặng và tiến độ.
- Giao deadline hôm nay với ba nhịp Phục hồi, Tiêu chuẩn và Tăng tốc.
- XP, level, streak, huy hiệu, vé học bù và thông báo.
- Nguồn luyện tập ngoài; nhập điểm, Part, số câu đúng và thời gian.
- Đo độ chính xác theo Part; chuẩn mastery mặc định 80%.
- Tự mở Phase kế tiếp khi đạt tỷ lệ hoàn thành và có checkpoint theo quy tắc.
- AI Daily Coach gọi API bên thứ ba khi có key, tự fallback sang rule engine khi không có.
- Báo cáo tuần, trang quản trị nội dung/người học và Swagger API.
- PostgreSQL + Prisma migration/seed; Docker chỉ là phương án chạy database tùy chọn.
