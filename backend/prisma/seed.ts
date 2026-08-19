import { PrismaClient, ResourceType, SkillType, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

interface LessonDefinition {
  title: string;
  description: string;
  content: string;
  contentUrl: string;
  skill: SkillType;
  resourceType: ResourceType;
  durationMinutes: number;
  xpReward: number;
}

const STUDY_PLAN_URL = 'https://study4.com/studyplan/';
const EXTERNAL_TEST_URL = 'https://study4.com/tests/toeic/';

function createDailyLessons(
  durationDays: number,
  focuses: string[],
  skill: SkillType,
  instructions: string[],
  durationMinutes = 60,
): LessonDefinition[] {
  return Array.from({ length: durationDays }, (_, index) => {
    const day = index + 1;
    const isCheckpoint = day % 6 === 0;
    const focus = isCheckpoint ? `Checkpoint tuần ${Math.ceil(day / 6)}` : focuses[index % focuses.length];
    const dailyInstructions = isCheckpoint
      ? [
          'Làm mini test theo Part đang học trên website luyện thi bên ngoài.',
          'Bấm giờ như thi thật và không xem đáp án trong lần đầu.',
          'Nhập số câu đúng, thời gian và các dạng câu sai vào TOEIC Quest.',
          'Chỉ chuyển trọng tâm khi độ chính xác đạt tối thiểu 70–80%.',
        ]
      : instructions;
    return {
      title: `Ngày ${String(day).padStart(2, '0')} · ${focus}`,
      description: isCheckpoint
        ? 'Đo tiến bộ bằng kết quả làm bài bên ngoài và cập nhật sổ lỗi.'
        : `Tập trung một mục tiêu: ${focus}.`,
      content: [
        `MỤC TIÊU: ${focus}`,
        '',
        'CHECKLIST HÔM NAY',
        ...dailyInstructions.map((instruction, instructionIndex) => `${instructionIndex + 1}. ${instruction}`),
        '',
        'ĐIỀU KIỆN CHIẾN THẮNG',
        isCheckpoint
          ? '- Đã nhập kết quả và ghi lại ít nhất 3 lỗi cần sửa.'
          : '- Hoàn thành đủ checklist và ghi lại phần khó nhất trong nhật ký.',
        '- Không cần học hoàn hảo; cần hoàn thành đúng nhịp.',
      ].join('\n'),
      contentUrl: isCheckpoint ? EXTERNAL_TEST_URL : STUDY_PLAN_URL,
      skill: isCheckpoint ? SkillType.REVIEW : skill,
      resourceType: isCheckpoint ? ResourceType.EXTERNAL_PRACTICE : ResourceType.ARTICLE,
      durationMinutes: isCheckpoint ? Math.max(75, durationMinutes) : durationMinutes,
      xpReward: isCheckpoint ? 60 : 30,
    };
  });
}

const phaseDefinitions: Array<{
  title: string;
  description: string;
  durationDays: number;
  lessons: LessonDefinition[];
}> = [
  {
    title: 'Khởi động chiến thắng',
    description: 'Tạo thói quen 6 ngày/tuần, đo đầu vào và làm quen vòng lặp học–làm–sửa lỗi.',
    durationDays: 12,
    lessons: createDailyLessons(
      12,
      ['Cam kết Road to 800', 'Placement test đầu vào', '20 từ vựng chủ đề Office', 'Từ loại cơ bản', 'Dictation câu ngắn'],
      SkillType.HABIT,
      [
        'Ôn 20 từ TOEIC bằng flashcard hoặc danh sách từ cá nhân.',
        'Làm 10 câu Reading và 10 câu Listening ở nguồn bạn đang sử dụng.',
        'Tự sửa câu sai trước khi xem giải thích hoặc transcript.',
        'Ghi điểm và một lỗi điển hình vào nhật ký.',
      ],
      45,
    ),
  },
  {
    title: 'Xây nền chắc chắn',
    description: 'Củng cố từ vựng và 17 nhóm ngữ pháp cốt lõi thường gặp trong TOEIC.',
    durationDays: 24,
    lessons: createDailyLessons(
      24,
      ['Danh từ và đại từ', 'Tính từ và trạng từ', 'Thì động từ', 'Hòa hợp chủ vị', 'Câu bị động', 'Liên từ và giới từ', 'Mệnh đề quan hệ', 'Câu điều kiện'],
      SkillType.GRAMMAR,
      [
        'Ôn 20–30 từ mới và review các từ đến hạn.',
        'Học một điểm ngữ pháp, tự viết 3 ví dụ trong ngữ cảnh công việc.',
        'Làm 20 câu Part 5 có bấm giờ 1 phút/câu.',
        'Tự chữa câu sai, sau đó mới đọc giải thích.',
      ],
      60,
    ),
  },
  {
    title: 'Giải mã Listening',
    description: 'Luyện lần lượt Part 1 → Part 2 → Part 4 → Part 3 và duy trì dictation mỗi ngày.',
    durationDays: 30,
    lessons: createDailyLessons(
      30,
      ['Part 1 · Mô tả người và vật', 'Part 2 · WH questions', 'Part 2 · Yes/No và câu gián tiếp', 'Part 4 · Tìm thông tin trực tiếp', 'Part 3 · Chủ đề, địa điểm, mục đích'],
      SkillType.LISTENING,
      [
        'Làm riêng Part đang luyện, nghe một lần ở tốc độ 1x.',
        'Tự nghe lại và sửa câu sai mà chưa đọc transcript.',
        'Dictation 15–20 phút ở tốc độ 1.1x hoặc 1.25x.',
        'Đọc transcript, đánh dấu âm nối và từ đã nghe nhầm.',
      ],
      65,
    ),
  },
  {
    title: 'Chinh phục Reading',
    description: 'Luyện lần lượt Part 5 → Part 6 → Part 7, tăng độ chính xác trước khi tăng tốc.',
    durationDays: 30,
    lessons: createDailyLessons(
      30,
      ['Part 5 · Từ loại', 'Part 5 · Ngữ pháp và từ vựng', 'Part 6 · Liên kết câu', 'Part 7 · Bài đọc đơn', 'Part 7 · Đọc ghép và suy luận'],
      SkillType.READING,
      [
        'Làm riêng Part đang luyện và bấm giờ 1 phút/câu.',
        'Khoanh từ khóa trong câu hỏi trước khi đọc đoạn văn.',
        'Tự chữa toàn bộ câu sai trước khi xem lời giải.',
        'Ghi lại từ mới, loại bẫy và lý do chọn sai.',
      ],
      65,
    ),
  },
  {
    title: 'Tăng tốc và vá điểm yếu',
    description: 'Luyện theo dữ liệu lỗi, quản lý thời gian và giữ độ chính xác ổn định.',
    durationDays: 24,
    lessons: createDailyLessons(
      24,
      ['Listening sprint 25 phút', 'Reading sprint 25 phút', 'Sửa nhóm lỗi ưu tiên', 'Mixed Parts có bấm giờ'],
      SkillType.REVIEW,
      [
        'Chọn Part có độ chính xác thấp nhất trong báo cáo tuần.',
        'Làm một set bấm giờ, không dừng giữa chừng.',
        'Phân loại lỗi: thiếu kiến thức, nghe nhầm, đọc sót hoặc thiếu thời gian.',
        'Làm lại câu sai sau tối thiểu 30 phút mà không nhìn đáp án.',
      ],
      75,
    ),
  },
  {
    title: 'Về đích 800',
    description: 'Thi thử định kỳ ở nguồn ngoài, sửa lỗi có trọng tâm và ổn định chiến thuật phòng thi.',
    durationDays: 24,
    lessons: createDailyLessons(
      24,
      ['Full test và nhập kết quả', 'Sửa Listening', 'Sửa Reading', 'Ôn sổ lỗi', 'Mô phỏng áp lực thời gian'],
      SkillType.REVIEW,
      [
        'Làm bài theo lịch: full test hoặc set Part được giao ở nguồn bên ngoài.',
        'Nhập Listening, Reading, tổng điểm, thời gian và Part yếu.',
        'Sửa lỗi trong 24 giờ và tạo danh sách 3 ưu tiên tiếp theo.',
        'Giữ nhịp nhẹ vào ngày sau full test để tránh quá tải.',
      ],
      90,
    ),
  },
];

async function main(): Promise<void> {
  const passwordHash = await hash('Password@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@toeicquest.local' },
    update: { displayName: 'TOEIC Quest Admin', role: UserRole.ADMIN, isActive: true },
    create: {
      email: 'admin@toeicquest.local',
      displayName: 'TOEIC Quest Admin',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  const learner = await prisma.user.upsert({
    where: { email: 'learner@toeicquest.local' },
    update: { displayName: 'Demo Learner', role: UserRole.LEARNER, isActive: true },
    create: {
      email: 'learner@toeicquest.local',
      displayName: 'Demo Learner',
      passwordHash,
      role: UserRole.LEARNER,
    },
  });
  const course = await prisma.course.upsert({
    where: { slug: 'road-to-toeic-800' },
    update: { title: 'Road to TOEIC 800', isPublished: true },
    create: {
      slug: 'road-to-toeic-800',
      title: 'Road to TOEIC 800',
      description: 'Lộ trình 24 tuần, học 6 ngày mỗi tuần.',
      targetScore: 800,
      durationWeeks: 24,
      isPublished: true,
    },
  });

  for (const [phaseIndex, phaseDefinition] of phaseDefinitions.entries()) {
    const phase = await prisma.phase.upsert({
      where: { courseId_position: { courseId: course.id, position: phaseIndex + 1 } },
      update: {
        title: phaseDefinition.title,
        description: phaseDefinition.description,
        durationDays: phaseDefinition.durationDays,
        requiredRate: phaseIndex === 0 ? 1 : 0.8,
      },
      create: {
        courseId: course.id,
        position: phaseIndex + 1,
        title: phaseDefinition.title,
        description: phaseDefinition.description,
        durationDays: phaseDefinition.durationDays,
        requiredRate: phaseIndex === 0 ? 1 : 0.8,
      },
    });
    for (const [lessonIndex, lesson] of phaseDefinition.lessons.entries()) {
      await prisma.lesson.upsert({
        where: { phaseId_position: { phaseId: phase.id, position: lessonIndex + 1 } },
        update: { ...lesson, isPublished: true },
        create: {
          phaseId: phase.id,
          position: lessonIndex + 1,
          ...lesson,
          isPublished: true,
        },
      });
    }
  }

  const firstPhase = await prisma.phase.findFirstOrThrow({
    where: { courseId: course.id },
    orderBy: { position: 'asc' },
  });
  await prisma.learningGoal.upsert({
    where: { userId: learner.id },
    update: { courseId: course.id, currentPhaseId: firstPhase.id },
    create: {
      userId: learner.id,
      courseId: course.id,
      currentPhaseId: firstPhase.id,
      currentScore: 500,
      targetScore: 800,
      dailyMinutes: 60,
      preferredHour: 20,
    },
  });
  await prisma.learnerProgress.upsert({
    where: { userId: learner.id },
    update: {},
    create: { userId: learner.id },
  });

  const externalResources = [
    {
      name: 'Sample test và tài liệu TOEIC chính thức',
      provider: 'ETS',
      url: 'https://www.ets.org/toeic/test-takers/prepare.html',
      resourceType: ResourceType.EXTERNAL_MOCK_TEST,
      skill: SkillType.REVIEW,
      estimatedMinutes: 120,
    },
    {
      name: 'Thư viện đề TOEIC Listening & Reading',
      provider: 'STUDY4',
      url: EXTERNAL_TEST_URL,
      resourceType: ResourceType.EXTERNAL_PRACTICE,
      skill: SkillType.REVIEW,
      estimatedMinutes: 60,
      requiresLogin: false,
    },
    {
      name: 'Lịch học TOEIC theo từng Part',
      provider: 'STUDY4',
      url: STUDY_PLAN_URL,
      resourceType: ResourceType.ARTICLE,
      skill: SkillType.HABIT,
      estimatedMinutes: 15,
      requiresLogin: false,
    },
  ];
  for (const resource of externalResources) {
    const existingResource = await prisma.externalResource.findFirst({ where: { url: resource.url } });
    if (existingResource) {
      await prisma.externalResource.update({ where: { id: existingResource.id }, data: resource });
    } else {
      await prisma.externalResource.create({ data: resource });
    }
  }

  const badges = [
    ['FIRST_WIN', 'Chiến thắng đầu tiên', 'Hoàn thành nhiệm vụ đầu tiên.', 'trophy'],
    ['THREE_DAY_STREAK', 'Giữ nhịp 3 ngày', 'Hoàn thành ba ngày học liên tiếp.', 'flame'],
    ['PHASE_ONE_FINISHER', '12-Day Finisher', 'Hoàn thành Phase 1.', 'medal'],
  ];
  for (const [code, name, description, icon] of badges) {
    await prisma.badge.upsert({
      where: { code },
      update: { name, description, icon },
      create: { code, name, description, icon },
    });
  }

  console.info(`Seeded ${admin.email}, ${learner.email}, and ${course.slug}.`);
  console.info('Demo password: Password@123');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
