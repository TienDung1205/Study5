import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Repeat2, RotateCcw, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ToastMessage } from '../../../components/feedback/ToastProvider';
import { getJson, postJson, putJson } from '../../../services/api-client';
import type { DailyVocabularyDeck, DueVocabularyReview, LessonContentData } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';

type VocabularyCard = LessonContentData['vocabulary'][number];
type FlashcardRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
type FlashcardStage = 'WORD' | 'CONTEXT';

const ratings: Array<{ value: FlashcardRating; label: string }> = [
  { value: 'EASY', label: 'Dễ' },
  { value: 'GOOD', label: 'Vừa' },
  { value: 'HARD', label: 'Khó' },
  { value: 'AGAIN', label: 'Quá khó' },
];
const paceOptions = [5, 10, 15, 20, 25, 30];

export function FlashcardDeck({ cards: lessonCards, assignmentId }: { cards: VocabularyCard[]; assignmentId?: string }) {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const dailyDeck = useQuery({
    queryKey: ['daily-vocabulary-deck', assignmentId],
    queryFn: () => getJson<DailyVocabularyDeck>(`/vocabulary/decks/${assignmentId}`),
    enabled: !isAdmin && Boolean(assignmentId),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const dueReviews = useQuery({
    queryKey: ['due-vocabulary-reviews'],
    queryFn: () => getJson<DueVocabularyReview[]>('/vocabulary/reviews/due'),
    enabled: !isAdmin && !assignmentId,
    staleTime: 60_000,
  });
  const dueCards = dailyDeck.data?.dueCards.map((review) => review.card)
    ?? dueReviews.data?.map((review) => review.card)
    ?? [];
  const newCards = dailyDeck.data?.newCards ?? lessonCards;
  const cards = useMemo(() => {
    const seen = new Set<string>();
    return [...dueCards, ...newCards].filter((card) => {
      const term = card.term.trim().toLowerCase();
      if (seen.has(term)) return false;
      seen.add(term);
      return true;
    });
  }, [dueCards, newCards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<FlashcardStage>('WORD');
  const [flipped, setFlipped] = useState(false);
  const [reviewedIndexes, setReviewedIndexes] = useState<Set<number>>(() => new Set());
  const [selectedRatings, setSelectedRatings] = useState<Partial<Record<number, FlashcardRating>>>({});
  const [finished, setFinished] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [paceSaved, setPaceSaved] = useState<number>();
  const currentCard = cards[currentIndex];
  const currentStep = currentIndex * 2 + (stage === 'WORD' ? 1 : 2);
  const totalSteps = cards.length * 2;
  const selectedRating = selectedRatings[currentIndex];
  const alreadyReviewed = reviewedIndexes.has(currentIndex);
  const recommendedPace = recommendVocabularyPace(
    dailyDeck.data?.newWordsLimit ?? newCards.length,
    Object.values(selectedRatings),
  );
  const isWordStage = stage === 'WORD';

  const rateCard = useMutation({
    mutationFn: ({ term, rating }: { term: string; rating: FlashcardRating }) => postJson('/vocabulary/reviews', { term, rating }),
    onSuccess: () => {
      setReviewedIndexes((current) => new Set(current).add(currentIndex));
      moveNext();
    },
  });
  const savePace = useMutation({
    mutationFn: (newWordsPerDay: number) => putJson('/users/me/learning-goal', { newWordsPerDay }),
    onSuccess: async (_, newWordsPerDay) => {
      setPaceSaved(newWordsPerDay);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
      ]);
    },
  });
  const nextDisabled = rateCard.isPending || !flipped || (!isWordStage && !alreadyReviewed && !selectedRating);
  const nextLabel = rateCard.isPending
    ? 'Đang lưu...'
    : isWordStage
      ? 'Học câu'
      : currentIndex === cards.length - 1
        ? 'Hoàn tất'
        : 'Từ tiếp theo';

  async function playSpeech(kind: 'word' | 'example') {
    setAudioError('');
    try {
      const staticAudioUrl = kind === 'word' ? currentCard.audioUrl : currentCard.exampleAudioUrl;
      if (staticAudioUrl) {
        const audio = new Audio(staticAudioUrl);
        await audio.play();
        return;
      }
      if (!('speechSynthesis' in window)) throw new Error('speech synthesis unavailable');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(kind === 'word' ? currentCard.audioText : currentCard.exampleAudioText);
      utterance.lang = 'en-US';
      utterance.rate = kind === 'word' ? 0.78 : 0.9;
      const americanVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('en-us'));
      if (americanVoice) utterance.voice = americanVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      setAudioError('Không phát được âm thanh. Hãy kiểm tra quyền phát tiếng hoặc giọng English (United States) của trình duyệt.');
    }
  }

  function restart() {
    setCurrentIndex(0);
    setStage('WORD');
    setReviewedIndexes(new Set());
    setSelectedRatings({});
    setFinished(false);
    setFlipped(false);
  }

  function moveNext() {
    setFlipped(false);
    if (currentIndex >= cards.length - 1) setFinished(true);
    else {
      setCurrentIndex((index) => index + 1);
      setStage('WORD');
    }
  }

  function goToPrevious() {
    setFlipped(false);
    if (stage === 'CONTEXT') {
      setStage('WORD');
      return;
    }
    if (currentIndex === 0) return;
    setCurrentIndex((index) => index - 1);
    setStage('CONTEXT');
  }

  function goToNext() {
    if (stage === 'WORD') {
      setFlipped(false);
      setStage('CONTEXT');
      return;
    }
    if (alreadyReviewed) return moveNext();
    if (!selectedRating) return;
    if (isAdmin) {
      setReviewedIndexes((current) => new Set(current).add(currentIndex));
      moveNext();
      return;
    }
    rateCard.mutate({ term: currentCard.term, rating: selectedRating });
  }

  if ((dailyDeck.isPending && assignmentId && !isAdmin) || (dueReviews.isPending && !assignmentId && !isAdmin)) return <div className="empty-state">Đang chuẩn bị từ mới và các từ đến hạn ôn...</div>;
  if (dailyDeck.isError) return <div className="error-state">{dailyDeck.error.message}</div>;
  if (!cards.length) return <div className="empty-state">Bài này chưa có flashcard.</div>;
  if (finished) return <div className="flashcard-finished"><CheckCircle2 size={34} /><h4>Đã học xong {newCards.length} từ mới{dueCards.length ? ` và ${dueCards.length} từ ôn lại` : ''}</h4><p>{isAdmin ? 'Đây là lượt học thử, không làm thay đổi thống kê của học viên.' : 'Lịch ôn tiếp theo đã được lưu vào tài khoản của bạn.'}</p>
    {!isAdmin && dailyDeck.data && !dailyDeck.data.vocabularyPaceSet && !paceSaved && <div className="vocabulary-pace-picker"><strong>Khối lượng hôm nay có phù hợp không?</strong><p>Dựa trên mức độ ghi nhớ vừa chọn, hệ thống gợi ý <b>{recommendedPace} từ mới/ngày</b>. Bạn vẫn có thể chọn mức khác; từ đến hạn ôn được xếp riêng.</p><div>{paceOptions.map((pace) => <button type="button" className={pace === recommendedPace ? 'recommended' : ''} disabled={savePace.isPending} key={pace} onClick={() => savePace.mutate(pace)}><strong>{pace}</strong><span>từ mới/ngày</span>{pace === recommendedPace && <em>Gợi ý</em>}</button>)}</div>{savePace.error && <ToastMessage variant="error">{savePace.error.message}</ToastMessage>}</div>}
    {paceSaved && <ToastMessage variant="success">Đã chọn {paceSaved} từ mới/ngày. Nhịp mới áp dụng từ ngày học tiếp theo.</ToastMessage>}
    <button type="button" onClick={restart}><RotateCcw size={16} /> Ôn lại bộ thẻ</button></div>;

  return <div className="flashcard-deck">
    <div className="flashcard-due-summary"><Repeat2 size={17} /><strong>{newCards.length} từ mới{dueCards.length ? ` · ${dueCards.length} từ đến hạn ôn` : ''}</strong><span>Từ ôn được xếp trước và không tính vào giới hạn từ mới.</span></div>
    <div className="flashcard-progress"><span>Thẻ {currentStep}/{totalSteps}</span><div><i style={{ width: `${(reviewedIndexes.size / cards.length) * 100}%` }} /></div><strong>{Math.round((reviewedIndexes.size / cards.length) * 100)}%</strong></div>
    <div className={`flashcard${flipped ? ' is-flipped' : ''}`}>
      {isWordStage
        ? !flipped ? <div className="flashcard-face flashcard-front flashcard-word-front">
          <small>THẺ TỪ · ĐOÁN NGHĨA</small>
          <strong lang="en">{currentCard.term}</strong>
          <span className="flashcard-ipa" lang="en">{currentCard.ipa}</span>
          <button type="button" className="pronunciation-button" onClick={() => playSpeech('word')}><Volume2 size={19} /> Nghe từ</button>
          <button type="button" className="flip-card-button" onClick={() => setFlipped(true)}><Repeat2 size={17} /> Xem nghĩa</button>
        </div> : <div className="flashcard-face flashcard-back flashcard-word-back">
          <small>THẺ TỪ · ĐÁP ÁN</small>
          <strong lang="en">{currentCard.term}</strong>
          <span className="flashcard-ipa" lang="en">{currentCard.ipa}</span>
          <div className="flashcard-meaning"><h4>{currentCard.meaning}</h4></div>
          <button type="button" className="pronunciation-button" onClick={() => playSpeech('word')}><Volume2 size={19} /> Nghe từ</button>
          <button type="button" className="flip-card-button secondary" onClick={() => setFlipped(false)}><Repeat2 size={17} /> Xem lại từ</button>
        </div>
        : !flipped ? <div className="flashcard-face flashcard-front flashcard-context-front">
          <small>THẺ CÂU/CỤM · ĐOÁN NGHĨA</small>
          <p className="flashcard-context-sentence" lang="en">{currentCard.example}</p>
          <button type="button" className="pronunciation-button" onClick={() => playSpeech('example')}><Volume2 size={19} /> Nghe câu</button>
          <button type="button" className="flip-card-button" onClick={() => setFlipped(true)}><Repeat2 size={17} /> Xem bản dịch</button>
        </div> : <div className="flashcard-face flashcard-back flashcard-context-back">
          <small>THẺ CÂU/CỤM · ĐÁP ÁN</small>
          <div className="flashcard-example"><p lang="en">{currentCard.example}</p><p className="example-translation">{currentCard.exampleMeaning}</p></div>
          <div className="flashcard-context-word"><strong lang="en">{currentCard.term}</strong><span>{currentCard.meaning}</span></div>
          <button type="button" className="pronunciation-button" onClick={() => playSpeech('example')}><Volume2 size={19} /> Nghe câu</button>
          <button type="button" className="flip-card-button secondary" onClick={() => setFlipped(false)}><Repeat2 size={17} /> Xem lại câu</button>
        </div>}
    </div>
    {audioError && <ToastMessage variant="error">{audioError}</ToastMessage>}
    {rateCard.error && <ToastMessage variant="error">{rateCard.error.message}</ToastMessage>}
    {!isWordStage && flipped && <div className="flashcard-ratings"><p className="flashcard-rating-question">Bạn thấy từ này thế nào?</p><div>{ratings.map((rating) => <button type="button" className={`rating-${rating.value.toLowerCase()}${selectedRating === rating.value ? ' selected' : ''}`} disabled={rateCard.isPending || alreadyReviewed} key={rating.value} onClick={() => setSelectedRatings((current) => ({ ...current, [currentIndex]: rating.value }))}><strong>{rating.label}</strong></button>)}</div></div>}
    <div className="flashcard-navigation"><button type="button" className="flashcard-previous" disabled={(currentIndex === 0 && isWordStage) || rateCard.isPending} onClick={goToPrevious}><ArrowLeft size={17} /> Trước</button><button type="button" className="flashcard-next" disabled={nextDisabled} onClick={goToNext}>{nextLabel} <ArrowRight size={17} /></button></div>
  </div>;
}

function recommendVocabularyPace(currentPace: number, selectedRatings: Array<FlashcardRating | undefined>): number {
  const completedRatings = selectedRatings.filter((rating): rating is FlashcardRating => Boolean(rating));
  if (!completedRatings.length) return Math.min(25, Math.max(5, currentPace));
  const difficultRatio = completedRatings.filter((rating) => rating === 'AGAIN' || rating === 'HARD').length / completedRatings.length;
  const confidentRatio = completedRatings.filter((rating) => rating === 'GOOD' || rating === 'EASY').length / completedRatings.length;
  const currentIndex = Math.max(0, paceOptions.findIndex((pace) => pace >= currentPace));
  if (difficultRatio >= 0.4) return paceOptions[Math.max(0, currentIndex - 1)];
  if (confidentRatio >= 0.85) return paceOptions[Math.min(paceOptions.length - 1, currentIndex + 1)];
  return paceOptions[currentIndex];
}
