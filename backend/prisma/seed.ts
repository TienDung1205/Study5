import { Prisma, PrismaClient, ResourceType, SkillType, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

interface LessonDefinition {
  title: string;
  description: string;
  content: string;
  contentData: Prisma.InputJsonValue;
  contentUrl: string | null;
  skill: SkillType;
  resourceType: ResourceType;
  durationMinutes: number;
  xpReward: number;
}

const STUDY_PLAN_URL = 'https://study4.com/studyplan/';
const EXTERNAL_TEST_URL = 'https://study4.com/tests/toeic/';

interface VocabularyItem {
  term: string;
  meaning: string;
  example: string;
}

interface VocabularyItemWithAudio extends VocabularyItem {
  audioUrl: string;
}

const vocabularyTopics: Array<{ name: string; words: VocabularyItem[] }> = [
  {
    name: 'Văn phòng',
    words: [
      { term: 'appointment', meaning: 'cuộc hẹn', example: 'I have an appointment with the branch manager at ten.' },
      { term: 'document', meaning: 'tài liệu', example: 'Please attach the signed document to your reply.' },
      { term: 'equipment', meaning: 'thiết bị', example: 'The new office equipment will arrive on Friday.' },
      { term: 'available', meaning: 'có sẵn; rảnh', example: 'Ms. Lee is available after lunch.' },
      { term: 'submit', meaning: 'nộp', example: 'All employees must submit the form by Monday.' },
      { term: 'department', meaning: 'phòng ban', example: 'Contact the finance department for approval.' },
    ],
  },
  {
    name: 'Cuộc họp',
    words: [
      { term: 'agenda', meaning: 'chương trình họp', example: 'The first item on the agenda is the sales report.' },
      { term: 'attend', meaning: 'tham dự', example: 'More than thirty clients attended the presentation.' },
      { term: 'postpone', meaning: 'hoãn', example: 'The meeting was postponed until Thursday.' },
      { term: 'proposal', meaning: 'đề xuất', example: 'The board reviewed our proposal this morning.' },
      { term: 'confirm', meaning: 'xác nhận', example: 'Please confirm your attendance by email.' },
      { term: 'participant', meaning: 'người tham gia', example: 'Each participant received a printed schedule.' },
    ],
  },
  {
    name: 'Du lịch công tác',
    words: [
      { term: 'departure', meaning: 'sự khởi hành', example: 'Departure is scheduled for 7:20 A.M.' },
      { term: 'reservation', meaning: 'sự đặt chỗ', example: 'I changed the hotel reservation online.' },
      { term: 'itinerary', meaning: 'lịch trình', example: 'The final itinerary includes two factory visits.' },
      { term: 'accommodation', meaning: 'chỗ ở', example: 'The company will arrange your accommodation.' },
      { term: 'delay', meaning: 'trì hoãn; chậm trễ', example: 'Heavy rain caused a two-hour delay.' },
      { term: 'destination', meaning: 'điểm đến', example: 'Tokyo is the final destination of this flight.' },
    ],
  },
  {
    name: 'Tài chính',
    words: [
      { term: 'invoice', meaning: 'hóa đơn', example: 'The invoice is due at the end of the month.' },
      { term: 'budget', meaning: 'ngân sách', example: 'The project stayed within its original budget.' },
      { term: 'expense', meaning: 'chi phí', example: 'Keep every receipt for your travel expenses.' },
      { term: 'refund', meaning: 'hoàn tiền', example: 'Customers may request a full refund within seven days.' },
      { term: 'revenue', meaning: 'doanh thu', example: 'Online sales increased the company’s revenue.' },
      { term: 'estimate', meaning: 'ước tính; báo giá', example: 'The contractor sent us a cost estimate.' },
    ],
  },
  {
    name: 'Marketing',
    words: [
      { term: 'campaign', meaning: 'chiến dịch', example: 'The summer campaign attracted many new customers.' },
      { term: 'advertise', meaning: 'quảng cáo', example: 'We advertise the service on several websites.' },
      { term: 'survey', meaning: 'khảo sát', example: 'Please complete a short customer survey.' },
      { term: 'launch', meaning: 'ra mắt', example: 'The company will launch its new product in May.' },
      { term: 'discount', meaning: 'giảm giá', example: 'Members receive a fifteen-percent discount.' },
      { term: 'target', meaning: 'mục tiêu; nhắm tới', example: 'This promotion targets first-time buyers.' },
    ],
  },
  {
    name: 'Nhân sự',
    words: [
      { term: 'applicant', meaning: 'ứng viên', example: 'Each applicant must provide two references.' },
      { term: 'qualification', meaning: 'trình độ; năng lực', example: 'Technical experience is a required qualification.' },
      { term: 'vacancy', meaning: 'vị trí trống', example: 'The vacancy was posted on Monday.' },
      { term: 'orientation', meaning: 'buổi định hướng', example: 'New staff will attend orientation next week.' },
      { term: 'promote', meaning: 'thăng chức; quảng bá', example: 'Ms. Park was promoted to regional manager.' },
      { term: 'candidate', meaning: 'ứng viên', example: 'The strongest candidate has five years of experience.' },
    ],
  },
  {
    name: 'Vận chuyển',
    words: [
      { term: 'shipment', meaning: 'lô hàng', example: 'The shipment arrived earlier than expected.' },
      { term: 'warehouse', meaning: 'kho hàng', example: 'Extra boxes are stored in the warehouse.' },
      { term: 'deliver', meaning: 'giao hàng', example: 'We can deliver the order by noon.' },
      { term: 'package', meaning: 'bưu kiện; đóng gói', example: 'The package requires a signature.' },
      { term: 'inventory', meaning: 'hàng tồn kho', example: 'The clerk checks the inventory every Friday.' },
      { term: 'supplier', meaning: 'nhà cung cấp', example: 'Our supplier has opened a new distribution center.' },
    ],
  },
  {
    name: 'Dịch vụ khách hàng',
    words: [
      { term: 'complaint', meaning: 'lời phàn nàn', example: 'The manager responded to the complaint immediately.' },
      { term: 'replace', meaning: 'thay thế', example: 'We will replace the damaged item at no cost.' },
      { term: 'satisfied', meaning: 'hài lòng', example: 'Most guests were satisfied with the service.' },
      { term: 'request', meaning: 'yêu cầu', example: 'Your request has been sent to our support team.' },
      { term: 'warranty', meaning: 'bảo hành', example: 'The printer comes with a two-year warranty.' },
      { term: 'resolve', meaning: 'giải quyết', example: 'A technician resolved the issue remotely.' },
    ],
  },
];

const listeningScripts = JSON.parse(
  readFileSync(resolve(process.cwd(), 'prisma/data/listening-scripts.json'), 'utf8'),
) as string[];

interface PracticeQuestionDefinition {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

const organizationNames = ['Northstar', 'Bluegate', 'Riverside', 'Summit', 'Oakwell', 'Brighton', 'Westfield', 'Greenline', 'Harborview', 'Silverton', 'Cedar Works', 'Parklane'];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const locations = ['Room 204', 'Hall B', 'the visitor parking lot', 'the service desk', 'the west entrance', 'Conference Room 3'];

function createQuestion(prompt: string, correctAnswer: string, distractors: string[], explanation: string, seed: number): PracticeQuestionDefinition {
  const correctOptionIndex = seed % 4;
  const options = [...distractors.slice(0, 3)];
  options.splice(correctOptionIndex, 0, correctAnswer);
  return { prompt, options, correctOptionIndex, explanation };
}

function createReadingPractice(seed: number): { material: string; questions: PracticeQuestionDefinition[] } {
  const organization = organizationNames[seed % organizationNames.length];
  const weekday = weekdays[seed % weekdays.length];
  const nextWeekday = weekdays[(seed + 2) % weekdays.length];
  const location = locations[seed % locations.length];
  const alternateLocation = locations[(seed + 3) % locations.length];
  const dayOfMonth = 3 + (seed % 24);
  const hour = 2 + (seed % 4);

  switch (seed % 6) {
    case 0: {
      const material = `To: All ${organization} employees. The main parking area will be closed on ${weekday}, April ${dayOfMonth}, while new security lights are installed. Employees should use ${location}. The work is expected to finish by ${hour} P.M.`;
      return { material, questions: [
        createQuestion('Why will the main parking area be closed?', 'Security lights will be installed.', ['A customer event will be held.', 'The area will be cleaned.', 'A delivery truck needs the space.'], 'The first sentence gives the reason: new security lights are being installed.', seed),
        createQuestion('Where should employees park during the work?', location, [alternateLocation, 'Beside the loading door', 'On Pine Street'], `The notice directs employees to use ${location}.`, seed + 1),
        createQuestion('When is the work expected to finish?', `${hour} P.M.`, [`${hour} A.M.`, `${hour + 1} P.M.`, `${nextWeekday} morning`], `The final sentence states that the work should finish by ${hour} P.M.`, seed + 2),
      ] };
    }
    case 1: {
      const product = `${organization} coffee maker model C-${100 + seed}`;
      const material = `Thank you for purchasing a ${product}. Register it online by April ${dayOfMonth} to receive an additional year of warranty coverage. You will need the serial number printed under the machine and a copy of your receipt.`;
      return { material, questions: [
        createQuestion('What is the purpose of this notice?', 'To explain how to receive extra warranty coverage', ['To announce a product recall', 'To advertise a new store', 'To request a product review'], 'Registration before the deadline provides one additional year of coverage.', seed),
        createQuestion('What information is needed for registration?', 'The serial number and a receipt', ['A passport and an address', 'A warranty card only', 'A store membership number'], 'The final sentence names both required items.', seed + 1),
        createQuestion('By when should the product be registered?', `April ${dayOfMonth}`, [`April ${dayOfMonth + 1}`, `${weekday}`, `${nextWeekday}`], `The registration deadline is April ${dayOfMonth}.`, seed + 2),
      ] };
    }
    case 2: {
      const material = `${organization} Museum members are invited to a private exhibition preview on April ${dayOfMonth} from ${hour} to ${hour + 2} P.M. Admission is free, but members must reserve a time slot online two days before the event. Guests should enter through ${location}.`;
      return { material, questions: [
        createQuestion('Who is invited to the preview?', 'Museum members', ['All city residents', 'Only museum employees', 'Local artists only'], 'The invitation is specifically addressed to museum members.', seed),
        createQuestion('What must attendees do before the event?', 'Reserve a time slot online', ['Purchase a ticket at the entrance', 'Call the museum director', 'Submit an artwork'], 'Although admission is free, an online reservation is required.', seed + 1),
        createQuestion('Where should guests enter?', location, [alternateLocation, 'The staff entrance', 'The parking garage'], `The final sentence directs guests to ${location}.`, seed + 2),
      ] };
    }
    case 3: {
      const material = `Because demand for ${organization}'s morning workshop was higher than expected, a second session has been added at ${hour} P.M. on ${weekday}. Participants already registered for the morning do not need to register again. The new session will take place in ${location}.`;
      return { material, questions: [
        createQuestion('Why was a second workshop session added?', 'More people wanted to attend than expected.', ['The instructor was unavailable.', 'The original room was being repaired.', 'The morning session was canceled.'], 'The opening sentence says demand was higher than expected.', seed),
        createQuestion('Who does not need to register again?', 'People registered for the morning session', ['New participants', 'Workshop instructors', 'Company managers'], 'Existing morning participants keep their registration.', seed + 1),
        createQuestion('Where will the new session be held?', location, [alternateLocation, 'Online only', 'The main lobby'], `The notice states that the added session is in ${location}.`, seed + 2),
      ] };
    }
    case 4: {
      const orderNumber = 4100 + seed;
      const material = `${organization} Supplies has delayed order #${orderNumber} because one item is temporarily unavailable. The complete order will arrive on ${nextWeekday} instead of ${weekday}. Customers who need the available items sooner should call the service desk before ${hour} P.M. today.`;
      return { material, questions: [
        createQuestion('Why was the order delayed?', 'One item is temporarily unavailable.', ['The delivery address was incorrect.', 'Payment was not received.', 'The customer canceled the order.'], 'The first sentence directly identifies an unavailable item as the cause.', seed),
        createQuestion('When will the complete order arrive?', nextWeekday, [weekday, 'Today', 'Next month'], `The delivery was changed from ${weekday} to ${nextWeekday}.`, seed + 1),
        createQuestion('What should customers do if they need some items sooner?', 'Call the service desk', ['Visit the warehouse', 'Send a new purchase order', 'Wait for an email'], 'The final sentence asks those customers to call the service desk.', seed + 2),
      ] };
    }
    default: {
      const material = `This is ${organization} Clinic calling about your appointment on ${weekday}, April ${dayOfMonth}. The specialist will be attending an emergency meeting, so your visit has been moved to ${nextWeekday} at ${hour} P.M. Please call before noon if the new time is not convenient.`;
      return { material, questions: [
        createQuestion('Why was the appointment moved?', 'The specialist has an emergency meeting.', ['The clinic will be closed permanently.', 'The patient requested a new doctor.', 'The appointment fee was not paid.'], 'The message connects the schedule change to the specialist’s emergency meeting.', seed),
        createQuestion('When is the new appointment?', `${nextWeekday} at ${hour} P.M.`, [`${weekday} at ${hour} P.M.`, `${nextWeekday} at ${hour} A.M.`, 'Today at noon'], `The visit was moved to ${nextWeekday} at ${hour} P.M.`, seed + 1),
        createQuestion('What should the patient do if the new time is inconvenient?', 'Call the clinic before noon', ['Arrive without an appointment', 'Email the specialist next week', 'Visit the service desk'], 'The final sentence asks the patient to call before noon.', seed + 2),
      ] };
    }
  }
}

function createListeningQuestions(seed: number, material: string): PracticeQuestionDefinition[] {
  return [
    createQuestion('Which statement matches the recording?', material, [
      'The speaker announces that every scheduled activity has been canceled.',
      'The message is mainly about a sporting event and ticket prices.',
      'No person, place, time, or requested action is mentioned.',
    ], 'Nghe lại các danh từ, thời gian và hành động chính rồi đối chiếu với từng lựa chọn.', seed),
  ];
}

function getTheory(focus: string, skill: SkillType): string[] {
  const normalized = focus.toLowerCase();
  if (normalized.includes('danh từ') || normalized.includes('từ loại')) return ['Xác định vị trí chỗ trống trước khi chọn đáp án: sau mạo từ thường cần danh từ; trước danh từ thường cần tính từ.', 'Không đoán bằng nghĩa trước. Nhìn hậu tố như -tion, -ment, -ity (danh từ), -ive, -al (tính từ), -ly (trạng từ).', 'Kiểm tra số ít/số nhiều và vai trò chủ ngữ, tân ngữ trong câu.'];
  if (normalized.includes('tính từ') || normalized.includes('trạng từ')) return ['Tính từ bổ nghĩa cho danh từ hoặc đứng sau linking verb; trạng từ bổ nghĩa cho động từ, tính từ hoặc cả mệnh đề.', 'Đuôi -ly thường là trạng từ nhưng friendly, costly, timely có thể là tính từ.', 'Trong Part 5, hãy tìm từ mà đáp án cần bổ nghĩa trước khi dịch toàn câu.'];
  if (normalized.includes('thì động từ') || normalized.includes('hòa hợp')) return ['Tìm chủ ngữ thật và dấu hiệu thời gian trước khi chia động từ.', 'Chủ ngữ số ít dùng động từ số ít; cụm giới từ chen giữa không làm thay đổi chủ ngữ.', 'Dùng hiện tại hoàn thành khi hành động bắt đầu trong quá khứ và còn liên quan tới hiện tại.'];
  if (normalized.includes('bị động')) return ['Cấu trúc bị động cơ bản là be + past participle.', 'Chọn bị động khi chủ ngữ nhận hành động; chọn chủ động khi chủ ngữ thực hiện hành động.', 'Kiểm tra cả thì của be và dạng V3 của động từ chính.'];
  if (normalized.includes('liên từ') || normalized.includes('giới từ')) return ['Liên từ nối hai mệnh đề có chủ ngữ và động từ; giới từ đứng trước danh từ hoặc cụm danh từ.', 'Because + mệnh đề, because of + cụm danh từ; although + mệnh đề, despite + cụm danh từ.', 'Đọc quan hệ ý nghĩa: nguyên nhân, tương phản, điều kiện hay bổ sung.'];
  if (normalized.includes('mệnh đề quan hệ')) return ['Who dùng cho người; which dùng cho vật; that có thể thay thế trong mệnh đề xác định.', 'Nhìn phần còn thiếu sau chỗ trống để quyết định cần đại từ làm chủ ngữ hay tân ngữ.', 'Mệnh đề quan hệ bổ nghĩa trực tiếp cho danh từ đứng trước nó.'];
  if (normalized.includes('điều kiện')) return ['Điều kiện loại 1: If + hiện tại đơn, will + động từ nguyên mẫu.', 'Unless mang nghĩa if not; không dùng thêm not trong cùng mệnh đề.', 'Trong ngữ cảnh công việc, câu điều kiện thường nói về deadline, ưu đãi hoặc kế hoạch.'];
  if (normalized.includes('part 1')) return ['Xác định người/vật chính, hành động và vị trí trước khi nghe.', 'Ưu tiên hiện tại tiếp diễn cho hành động đang xảy ra; bị động mô tả trạng thái đã được sắp đặt.', 'Loại đáp án dùng từ đúng hình ảnh nhưng mô tả sai hành động hoặc vị trí.'];
  if (normalized.includes('part 2')) return ['Nghe từ để hỏi đầu tiên để xác định loại thông tin cần trả lời.', 'Đáp án đúng có thể trả lời gián tiếp; đừng chờ lặp lại đúng từ trong câu hỏi.', 'Loại bẫy đồng âm và đáp án đúng ngữ pháp nhưng không phù hợp ngữ cảnh.'];
  if (normalized.includes('part 3') || normalized.includes('part 4')) return ['Đọc trước câu hỏi để dự đoán người nói, địa điểm, mục đích và hành động tiếp theo.', 'Nghe ý được diễn đạt lại bằng từ đồng nghĩa, không chỉ săn từ trùng khớp.', 'Nếu lỡ một câu, chuyển ngay sang câu kế tiếp để giữ nhịp.'];
  if (normalized.includes('part 6')) return ['Đọc câu trước và sau chỗ trống để kiểm tra liên kết ý.', 'Đại từ phải có danh từ tham chiếu rõ ràng; từ nối phải đúng quan hệ logic.', 'Với câu chèn, kiểm tra cả nội dung lẫn từ liên kết ở hai phía.'];
  if (normalized.includes('part 7')) return ['Đọc câu hỏi trước, gạch từ khóa rồi quét văn bản tìm vùng chứa thông tin.', 'Đáp án đúng thường paraphrase nội dung, hiếm khi lặp nguyên văn.', 'Với bài ghép, xác định nguồn của từng dữ kiện trước khi kết nối chúng.'];
  if (skill === SkillType.REVIEW) return ['Dữ liệu lỗi quyết định bài ngày mai: ưu tiên Part có độ chính xác thấp hoặc tốn thời gian nhất.', 'Mỗi lỗi cần được gắn một nguyên nhân: kiến thức, từ vựng, nghe nhầm, đọc sót hoặc quản lý thời gian.', 'Chỉ tăng độ khó khi độ chính xác ổn định từ 80% trở lên.'];
  return ['Học theo vòng lặp ngắn: tiếp nhận kiến thức, tự làm, kiểm tra, rồi ghi lỗi.', 'Mỗi ngày chỉ cần hoàn thành đúng một trọng tâm; ôn lặp lại quan trọng hơn học dồn.', 'Mục tiêu hôm nay là tạo bằng chứng tiến bộ, không phải cảm giác đã đọc xong.'];
}

function createContentData(contentSequence: number, day: number, focus: string, skill: SkillType, isCheckpoint: boolean, durationMinutes: number, instructions: string[]): Prisma.InputJsonValue {
  const vocabularyTopic = vocabularyTopics[(day - 1) % vocabularyTopics.length];
  const vocabularyPool = vocabularyTopics.flatMap((topic) => topic.words);
  const vocabularyStart = ((day - 1) * 5) % vocabularyPool.length;
  const dailyVocabulary: VocabularyItemWithAudio[] = Array.from({ length: 20 }, (_, index) => {
    const word = vocabularyPool[(vocabularyStart + index) % vocabularyPool.length];
    return { ...word, audioUrl: `/audio/vocabulary/${word.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav` };
  });
  const isListening = skill === SkillType.LISTENING;
  const listeningMaterial = listeningScripts[day - 1];
  const readingPractice = createReadingPractice(contentSequence);
  const material = isListening
    ? listeningMaterial
    : `${readingPractice.material} Reference: TQ-${String(contentSequence).padStart(3, '0')}.`;
  const questions = isListening ? createListeningQuestions(contentSequence, listeningMaterial) : readingPractice.questions;

  const contentData = {
    objective: isCheckpoint ? `Đo độ chính xác tuần ${Math.ceil(day / 6)} và xác định tối đa 3 lỗi ưu tiên.` : `Nắm được ${focus} và áp dụng vào một bài luyện ngắn trong ngày.`,
    theory: getTheory(focus, skill),
    vocabularyTopic: `${vocabularyTopic.name} · ôn xoay vòng`,
    vocabulary: dailyVocabulary,
    activities: instructions.map((instruction, index) => ({
      title: ['Khởi động', 'Học trọng tâm', 'Luyện có giới hạn', 'Sổ lỗi'][index] ?? `Hoạt động ${index + 1}`,
      minutes: Math.max(5, Math.round(durationMinutes / instructions.length)),
      instructions: [instruction],
    })),
    practice: {
      kind: isListening ? 'LISTENING' : 'READING',
      title: isListening ? 'Mini listening tự luyện' : 'Mini reading tự luyện',
      material,
      audioUrl: isListening ? `/audio/listening/listening-day-${String(day).padStart(2, '0')}.wav` : null,
      questions,
    },
    successCriteria: isCheckpoint
      ? ['Đã làm bài ở nguồn ngoài và nhập kết quả.', 'Đã ghi ít nhất 3 lỗi cùng nguyên nhân.', 'Độ chính xác đạt 80% hoặc đã chọn lộ trình phục hồi.']
      : ['Đã ôn 20 từ vựng và tự đặt ít nhất 2 câu.', 'Đã hoàn thành mini practice không nhìn đáp án trước.', 'Đã ghi lại ít nhất 1 lỗi hoặc điểm chưa chắc.'],
    sourceNote: 'Nội dung do TOEIC Quest biên soạn theo dạng bài TOEIC và phương pháp học công khai; không sao chép ngân hàng câu hỏi trả phí của Study4.',
  };
  return JSON.parse(JSON.stringify(contentData)) as Prisma.InputJsonValue;
}

let lessonContentSequence = 0;

function createDailyLessons(
  durationDays: number,
  focuses: string[],
  skill: SkillType,
  instructions: string[],
  durationMinutes = 60,
): LessonDefinition[] {
  return Array.from({ length: durationDays }, (_, index) => {
    const contentSequence = ++lessonContentSequence;
    const day = index + 1;
    const isCheckpoint = day % 6 === 0;
    const learningDay = day - Math.floor(day / 6);
    const focus = isCheckpoint ? `Checkpoint tuần ${Math.ceil(day / 6)}` : focuses[(learningDay - 1) % focuses.length];
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
      contentData: createContentData(contentSequence, day, focus, isCheckpoint ? SkillType.REVIEW : skill, isCheckpoint, isCheckpoint ? Math.max(75, durationMinutes) : durationMinutes, dailyInstructions),
      contentUrl: isCheckpoint ? EXTERNAL_TEST_URL : null,
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
      ['Từ loại và cụm từ', 'Mệnh đề và câu', 'Danh từ', 'Đại từ', 'Tính từ', 'Thì động từ', 'Thể chủ động và bị động', 'Động từ nguyên mẫu', 'Động từ nguyên mẫu có to', 'Danh động từ', 'Phân từ', 'Trạng từ', 'Giới từ', 'Liên từ', 'Mệnh đề quan hệ', 'Câu điều kiện', 'Cấu trúc phân từ', 'Cấu trúc so sánh'],
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
    update: { courseId: course.id, currentPhaseId: firstPhase.id, currentScore: 500, targetScore: 800, estimatedWeeks: 24, startingPhasePosition: 1, onboardingCompletedAt: new Date() },
    create: {
      userId: learner.id,
      courseId: course.id,
      currentPhaseId: firstPhase.id,
      currentScore: 500,
      targetScore: 800,
      dailyMinutes: 60,
      preferredHour: 20,
      estimatedWeeks: 24,
      startingPhasePosition: 1,
      onboardingCompletedAt: new Date(),
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
