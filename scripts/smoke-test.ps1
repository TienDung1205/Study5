param(
  [string]$ApiBaseUrl = 'http://localhost:3000/api/v1'
)

$ErrorActionPreference = 'Stop'
$email = "smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"
$password = 'SmokeTest@123'

$auth = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/auth/register" -ContentType 'application/json' -Body (@{
  displayName = 'Smoke Test Learner'
  email = $email
  password = $password
} | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($auth.accessToken)" }

$onboarding = Invoke-RestMethod -Method Put -Uri "$ApiBaseUrl/users/me/onboarding" -Headers $headers -ContentType 'application/json' -Body (@{
  currentScore = 500
  targetScore = 800
  dailyMinutes = 60
  studyDays = @(1, 2, 3, 4, 5, 6)
  preferredHour = 20
} | ConvertTo-Json)
$profile = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/users/me" -Headers $headers
$roadmap = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/content/roadmap" -Headers $headers
$today = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/assignments/today" -Headers $headers
$resources = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/external/resources" -Headers $headers

if ($roadmap.phases.Count -ne 6) { throw "Expected 6 phases, got $($roadmap.phases.Count)." }
$lessonCount = ($roadmap.phases | ForEach-Object { $_.lessons.Count } | Measure-Object -Sum).Sum
if ($lessonCount -ne 144) { throw "Expected 144 lessons, got $lessonCount." }
$lessons = @($roadmap.phases | ForEach-Object { $_.lessons })
$structuredLessonCount = @($lessons | Where-Object { $_.contentData.objective -and $_.contentData.vocabulary.Count -eq 20 -and $_.contentData.activities.Count }).Count
$externalLinkLessonCount = @($lessons | Where-Object { $_.contentUrl }).Count
$audioLessons = @($lessons | Where-Object { $_.contentData.practice.audioUrl })
$uniqueListeningAudioUrls = @($audioLessons.contentData.practice.audioUrl | Sort-Object -Unique)
$vocabularyCards = @($lessons.contentData.vocabulary)
$uniqueVocabularyAudioUrls = @($vocabularyCards.audioUrl | Sort-Object -Unique)
if ($structuredLessonCount -ne 144) { throw "Expected structured content for 144 lessons, got $structuredLessonCount." }
if ($externalLinkLessonCount -ne 24) { throw "Expected links only on 24 weekly checkpoints, got $externalLinkLessonCount." }
if (-not $profile.learningGoal.onboardingCompletedAt) { throw 'Onboarding was not persisted.' }
if ($onboarding.plan.startingPhasePosition -ne 2) { throw "Expected score 500 to start at phase 2, got phase $($onboarding.plan.startingPhasePosition)." }
if (-not $audioLessons.Count) { throw 'No lesson contains an audio file URL.' }
if ($uniqueListeningAudioUrls.Count -ne 25) { throw "Expected 25 unique listening audio files, got $($uniqueListeningAudioUrls.Count)." }
if ($uniqueVocabularyAudioUrls.Count -ne 48) { throw "Expected 48 unique vocabulary audio files, got $($uniqueVocabularyAudioUrls.Count)." }
foreach ($audioUrl in @($uniqueListeningAudioUrls + $uniqueVocabularyAudioUrls)) {
  $audioPath = Join-Path (Split-Path -Parent $PSScriptRoot) "frontend\public$($audioUrl.Replace('/', '\'))"
  if (-not (Test-Path $audioPath)) { throw "Audio file does not exist: $audioPath" }
}
$flashcardReview = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/vocabulary/reviews" -Headers $headers -ContentType 'application/json' -Body (@{
  term = $vocabularyCards[0].term
  rating = 'AGAIN'
} | ConvertTo-Json)
if ($flashcardReview.intervalDays -ne 1 -or $flashcardReview.repetitions -ne 0) { throw 'Flashcard review schedule was not persisted correctly.' }
if (-not $today.items.Count) { throw 'Today assignment has no lesson.' }
if (-not $resources.Count) { throw 'No external resource was seeded.' }

$todayWithExternal = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/external/resources/$($resources[0].id)/add-to-today" -Headers $headers
$externalItem = $todayWithExternal.items | Where-Object { $_.externalResourceId } | Select-Object -First 1
if (-not $externalItem) { throw 'External practice was not attached to today.' }

$submissionResponse = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/external/submissions" -Headers $headers -ContentType 'application/json' -Body (@{
  assignmentItemId = $externalItem.id
  resourceId = $externalItem.externalResourceId
  toeicPart = 'PART_1'
  correctAnswers = 16
  totalQuestions = 20
  completionMinutes = 25
  weakParts = @('Part 1 - present action')
  learnerNote = 'Review present continuous verbs.'
} | ConvertTo-Json)

$firstLessonItem = $todayWithExternal.items | Where-Object { $_.lessonId } | Select-Object -First 1
$timeGateRejected = $false
try {
  Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/assignments/items/$($firstLessonItem.id)/complete" -Headers $headers | Out-Null
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 400) { $timeGateRejected = $true } else { throw }
}
if (-not $timeGateRejected) { throw 'Internal lesson was completed without tracked study time.' }

foreach ($lessonItem in ($todayWithExternal.items | Where-Object { $_.lessonId })) {
  $session = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/assignments/study-sessions" -Headers $headers -ContentType 'application/json' -Body (@{ assignmentItemId = $lessonItem.id } | ConvertTo-Json)
  Invoke-RestMethod -Method Patch -Uri "$ApiBaseUrl/assignments/study-sessions/$($session.id)/finish" -Headers $headers -ContentType 'application/json' -Body (@{ durationSeconds = $lessonItem.durationMinutes * 60 } | ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/assignments/items/$($lessonItem.id)/complete" -Headers $headers | Out-Null
}

$recommendation = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/ai-coach/daily-analysis" -Headers $headers -ContentType 'application/json' -Body (@{
  mood = 'normal'
  tomorrowAvailableMinutes = 60
} | ConvertTo-Json)
$nextAssignment = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/ai-coach/recommendations/$($recommendation.id)/select" -Headers $headers -ContentType 'application/json' -Body (@{
  planType = 'STANDARD'
} | ConvertTo-Json)
$report = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/reports/weekly" -Headers $headers
$notifications = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/notifications" -Headers $headers

if ($recommendation.planOptions.Count -ne 3) { throw 'AI Coach did not return three plan options.' }
if ($report.partMastery[0].accuracy -ne 0.8) { throw 'Part mastery accuracy was not calculated correctly.' }
if ([DateTime]$nextAssignment.scheduledDate -le [DateTime]$today.scheduledDate) { throw 'AI plan was not assigned to a future study day.' }
if (-not $notifications.Count) { throw 'Expected at least one notification.' }

[PSCustomObject]@{
  Result = 'PASS'
  User = $profile.email
  Phases = $roadmap.phases.Count
  Lessons = $lessonCount
  StructuredLessons = $structuredLessonCount
  ExternalLinkLessons = $externalLinkLessonCount
  AudioLessons = $audioLessons.Count
  UniqueListeningFiles = $uniqueListeningAudioUrls.Count
  VocabularyAudioFiles = $uniqueVocabularyAudioUrls.Count
  FlashcardIntervalDays = $flashcardReview.intervalDays
  EstimatedWeeks = $onboarding.plan.estimatedWeeks
  StartingPhase = $onboarding.plan.startingPhasePosition
  TimeGateRejected = $timeGateRejected
  TodayItems = $todayWithExternal.items.Count
  Part1Accuracy = $report.partMastery[0].accuracy
  SubmissionId = $submissionResponse.submission.id
  AiProvider = $recommendation.provider
  UsedFallback = $recommendation.usedFallback
  NextStudyDate = $nextAssignment.scheduledDate
  Notifications = $notifications.Count
} | ConvertTo-Json
