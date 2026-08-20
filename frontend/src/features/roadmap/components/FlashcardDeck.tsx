import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Repeat2, RotateCcw, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { postJson } from '../../../services/api-client';
import type { LessonContentData } from '../../../types/domain';

type VocabularyCard = LessonContentData['vocabulary'][number];
type FlashcardRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

const ratings: Array<{ value: FlashcardRating; label: string; interval: string }> = [
  { value: 'AGAIN', label: 'Học lại', interval: 'ngày mai' },
  { value: 'HARD', label: 'Khó', interval: 'khoảng 1 ngày' },
  { value: 'GOOD', label: 'Tốt', interval: '1–3 ngày' },
  { value: 'EASY', label: 'Dễ', interval: 'từ 4 ngày' },
];

export function FlashcardDeck({ cards }: { cards: VocabularyCard[] }) {
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

  async function playPronunciation() {
    setAudioError('');
    try {
      const audio = new Audio(currentCard.audioUrl);
      await audio.play();
    } catch {
      setAudioError('Không phát được file âm thanh. Hãy kiểm tra frontend/public/audio/vocabulary.');
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
    rateCard.mutate({ term: currentCard.term, rating: selectedRating });
  }

  if (!cards.length) return <div className="empty-state">Bài này chưa có flashcard.</div>;
  if (finished) return <div className="flashcard-finished"><CheckCircle2 size={34} /><h4>Đã ôn xong {cards.length} từ</h4><p>Lịch ôn tiếp theo đã được lưu vào tài khoản của bạn.</p><button type="button" onClick={restart}><RotateCcw size={16} /> Ôn lại bộ thẻ</button></div>;

  return <div className="flashcard-deck">
    <div className="flashcard-progress"><span>Thẻ {currentIndex + 1}/{cards.length}</span><div><i style={{ width: `${(reviewedIndexes.size / cards.length) * 100}%` }} /></div><strong>{Math.round((reviewedIndexes.size / cards.length) * 100)}%</strong></div>
    <div className={`flashcard${flipped ? ' is-flipped' : ''}`}>
      {!flipped ? <div className="flashcard-face flashcard-front">
        <small>MẶT TRƯỚC · NHỚ NGHĨA TRƯỚC KHI LẬT</small>
        <strong lang="en">{currentCard.term}</strong>
        <button type="button" className="pronunciation-button" onClick={playPronunciation}><Volume2 size={19} /> Nghe phát âm</button>
        <button type="button" className="flip-card-button" onClick={() => setFlipped(true)}><Repeat2 size={17} /> Lật xem nghĩa</button>
      </div> : <div className="flashcard-face flashcard-back">
        <small>MẶT SAU</small>
        <strong lang="en">{currentCard.term}</strong>
        <h4>{currentCard.meaning}</h4>
        <p lang="en">{currentCard.example}</p>
        <button type="button" className="pronunciation-button" onClick={playPronunciation}><Volume2 size={19} /> Nghe lại</button>
        <button type="button" className="flip-card-button secondary" onClick={() => setFlipped(false)}><Repeat2 size={17} /> Lật lại mặt trước</button>
      </div>}
    </div>
    {audioError && <p className="form-error">{audioError}</p>}
    {rateCard.error && <p className="form-error">{rateCard.error.message}</p>}
    {flipped && <div className="flashcard-ratings"><p>{alreadyReviewed ? 'Thẻ này đã được lưu lịch ôn.' : 'Bạn nhớ từ này ở mức nào? Chọn một mức rồi bấm Next.'}</p><div>{ratings.map((rating) => <button type="button" className={`rating-${rating.value.toLowerCase()}${selectedRating === rating.value ? ' selected' : ''}`} disabled={rateCard.isPending || alreadyReviewed} key={rating.value} onClick={() => setSelectedRatings((current) => ({ ...current, [currentIndex]: rating.value }))}><strong>{rating.label}</strong><span>{rating.interval}</span></button>)}</div></div>}
    <div className="flashcard-navigation"><button type="button" className="flashcard-previous" disabled={currentIndex === 0 || rateCard.isPending} onClick={goToPrevious}><ArrowLeft size={17} /> Thẻ trước</button><button type="button" className="flashcard-next" disabled={rateCard.isPending || (!alreadyReviewed && !selectedRating)} onClick={saveAndNext}>{rateCard.isPending ? 'Đang lưu...' : currentIndex === cards.length - 1 ? 'Lưu & hoàn tất' : alreadyReviewed ? 'Next' : 'Lưu & Next'} <ArrowRight size={17} /></button></div>
  </div>;
}
