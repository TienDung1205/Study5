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

$profile = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/users/me" -Headers $headers
$roadmap = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/content/roadmap" -Headers $headers
$today = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/assignments/today" -Headers $headers
$resources = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/external/resources" -Headers $headers

if ($roadmap.phases.Count -ne 6) { throw "Expected 6 phases, got $($roadmap.phases.Count)." }
$lessonCount = ($roadmap.phases | ForEach-Object { $_.lessons.Count } | Measure-Object -Sum).Sum
if ($lessonCount -ne 144) { throw "Expected 144 lessons, got $lessonCount." }
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

foreach ($lessonItem in ($todayWithExternal.items | Where-Object { $_.lessonId })) {
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
  TodayItems = $todayWithExternal.items.Count
  Part1Accuracy = $report.partMastery[0].accuracy
  SubmissionId = $submissionResponse.submission.id
  AiProvider = $recommendation.provider
  UsedFallback = $recommendation.usedFallback
  NextStudyDate = $nextAssignment.scheduledDate
  Notifications = $notifications.Count
} | ConvertTo-Json
