import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Repeat2, RotateCcw, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getJson, postJson } from '../../../services/api-client';
import type { DueVocabularyReview, LessonContentData } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';

type VocabularyCard = LessonContentData['vocabulary'][number];
type FlashcardRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

const ratings: Array<{ value: FlashcardRating; label: string; interval: string }> = [
  { value: 'AGAIN', label: 'Chưa nhớ', interval: 'Ôn lại ngày mai' },
  { value: 'HARD', label: 'Khó nhớ', interval: 'Ôn lại khoảng 1 ngày' },
  { value: 'GOOD', label: 'Đã nhớ', interval: 'Lần đầu 1 ngày, sau đó giãn dần' },
  { value: 'EASY', label: 'Rất chắc', interval: 'Lần đầu sau 4 ngày' },
];

export function FlashcardDeck({ cards: lessonCards }: { cards: VocabularyCard[] }) {
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const dueReviews = useQuery({
    queryKey: ['due-vocabulary-reviews'],
    queryFn: () => getJson<DueVocabularyReview[]>('/vocabulary/reviews/due'),
    enabled: !isAdmin,
    staleTime: 60_000,
  });
  const dueCards = dueReviews.data?.map((review) => review.card) ?? [];
  const cards = useMemo(() => {
    const seen = new Set<string>();
    return [...dueCards, ...lessonCards].filter((card) => {
      const term = card.term.trim().toLowerCase();
      if (seen.has(term)) return false;
      seen.add(term);
      return true;
    });
  }, [dueCards, lessonCards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewedIndexes, setReviewedIndexes] = useState<Set<number>>(() => new Set());
  const [selectedRatings, setSelectedRatings] = useState<Partial<Record<number, FlashcardRating>>>({});
  const [finished, setFinished] = useState(false);
  const [audioError, setAudioError] = useState('');
  const currentCard = cards[currentIndex];
  const selectedRating = selectedRatings[currentIndex];
  const alreadyReviewed = reviewedIndexes.has(currentIndex);

  const rateCard = useMutation({
    mutationFn: ({ term, rating }: { term: string; rating: FlashcardRating }) => postJson('/vocabulary/reviews', { term, rating }),
    onSuccess: () => {
      setReviewedIndexes((current) => new Set(current).add(currentIndex));
      moveNext();
    },
  });

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
    setReviewedIndexes(new Set());
    setSelectedRatings({});
    setFinished(false);
    setFlipped(false);
  }

  function moveNext() {
    setFlipped(false);
    if (currentIndex >= cards.length - 1) setFinished(true);
    else setCurrentIndex((index) => index + 1);
  }

  function goToPrevious() {
    if (currentIndex === 0) return;
    setFlipped(false);
    setCurrentIndex((index) => index - 1);
  }

  function saveAndNext() {
    if (alreadyReviewed) return moveNext();
    if (!selectedRating) return;
    if (isAdmin) {
      setReviewedIndexes((current) => new Set(current).add(currentIndex));
      moveNext();
      return;
    }
    rateCard.mutate({ term: currentCard.term, rating: selectedRating });
  }

  if (dueReviews.isPending && !isAdmin) return <div className="empty-state">Đang kiểm tra các từ đến hạn ôn...</div>;
  if (!cards.length) return <div className="empty-state">Bài này chưa có flashcard.</div>;
  if (finished) return <div className="flashcard-finished"><CheckCircle2 size={34} /><h4>Đã ôn xong {cards.length} từ</h4><p>{isAdmin ? 'Đây là lượt học thử, không làm thay đổi thống kê của học viên.' : 'Lịch ôn tiếp theo đã được lưu vào tài khoản của bạn.'}</p><button type="button" onClick={restart}><RotateCcw size={16} /> Ôn lại bộ thẻ</button></div>;

  return <div className="flashcard-deck">
    {dueCards.length > 0 && <div className="flashcard-due-summary"><Repeat2 size={17} /><strong>{dueCards.length} từ đến hạn ôn</strong><span>được xếp trước {lessonCards.length} từ của bài hôm nay</span></div>}
    <div className="flashcard-progress"><span>Thẻ {currentIndex + 1}/{cards.length}</span><div><i style={{ width: `${(reviewedIndexes.size / cards.length) * 100}%` }} /></div><strong>{Math.round((reviewedIndexes.size / cards.length) * 100)}%</strong></div>
    <div className={`flashcard${flipped ? ' is-flipped' : ''}`}>
      {!flipped ? <div className="flashcard-face flashcard-front">
        <small>MẶT TRƯỚC · NHỚ NGHĨA TRƯỚC KHI LẬT</small>
        <strong lang="en">{currentCard.term}</strong>
        <span className="flashcard-ipa" lang="en">{currentCard.ipa}</span>
        <div className="flashcard-front-example"><small>CÂU VÍ DỤ</small><p lang="en">{currentCard.example}</p></div>
        <div className="flashcard-audio-actions"><button type="button" className="pronunciation-button" onClick={() => playSpeech('word')}><Volume2 size={19} /> Nghe từ</button><button type="button" className="pronunciation-button" onClick={() => playSpeech('example')}><Volume2 size={19} /> Nghe câu</button></div>
        <button type="button" className="flip-card-button" onClick={() => setFlipped(true)}><Repeat2 size={17} /> Lật xem nghĩa</button>
      </div> : <div className="flashcard-face flashcard-back">
        <small>MẶT SAU</small>
        <strong lang="en">{currentCard.term}</strong>
        <span className="flashcard-ipa" lang="en">{currentCard.ipa}</span>
        <div className="flashcard-meaning"><small>NGHĨA CỦA TỪ</small><h4>{currentCard.meaning}</h4></div>
        <div className="flashcard-example"><small>VÍ DỤ</small><p lang="en">{currentCard.example}</p><p className="example-translation">{currentCard.exampleMeaning}</p></div>
        <div className="flashcard-audio-actions"><button type="button" className="pronunciation-button" onClick={() => playSpeech('word')}><Volume2 size={19} /> Nghe từ</button><button type="button" className="pronunciation-button" onClick={() => playSpeech('example')}><Volume2 size={19} /> Nghe câu</button></div>
        <button type="button" className="flip-card-button secondary" onClick={() => setFlipped(false)}><Repeat2 size={17} /> Lật lại mặt trước</button>
      </div>}
    </div>
    {audioError && <p className="form-error">{audioError}</p>}
    {rateCard.error && <p className="form-error">{rateCard.error.message}</p>}
    {flipped && <div className="flashcard-ratings"><p>{alreadyReviewed ? 'Thẻ này đã được lưu lịch ôn.' : 'Chọn theo mức bạn thực sự nhớ. Hệ thống dùng lựa chọn này để hẹn ngày thẻ xuất hiện lại.'}</p>{!alreadyReviewed && <div className="flashcard-rating-guide"><strong>Vì sao “Rất chắc” lâu hơn?</strong><span>Từ càng nhớ chắc càng được giãn lịch để bạn dành thời gian cho từ yếu. “Chưa nhớ” sẽ quay lại ngay ngày mai.</span></div>}<div>{ratings.map((rating) => <button type="button" className={`rating-${rating.value.toLowerCase()}${selectedRating === rating.value ? ' selected' : ''}`} disabled={rateCard.isPending || alreadyReviewed} key={rating.value} onClick={() => setSelectedRatings((current) => ({ ...current, [currentIndex]: rating.value }))}><strong>{rating.label}</strong><span>{rating.interval}</span></button>)}</div></div>}
    <div className="flashcard-navigation"><button type="button" className="flashcard-previous" disabled={currentIndex === 0 || rateCard.isPending} onClick={goToPrevious}><ArrowLeft size={17} /> Thẻ trước</button><button type="button" className="flashcard-next" disabled={rateCard.isPending || (!alreadyReviewed && !selectedRating)} onClick={saveAndNext}>{rateCard.isPending ? 'Đang lưu...' : currentIndex === cards.length - 1 ? 'Lưu & hoàn tất' : alreadyReviewed ? 'Next' : 'Lưu & Next'} <ArrowRight size={17} /></button></div>
  </div>;
}
