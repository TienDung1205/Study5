$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$projectRoot = Split-Path -Parent $PSScriptRoot
$audioRoot = Join-Path $projectRoot 'frontend\public\audio'
$listeningDirectory = Join-Path $audioRoot 'listening'
$vocabularyDirectory = Join-Path $audioRoot 'vocabulary'
New-Item -ItemType Directory -Path $listeningDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $vocabularyDirectory -Force | Out-Null

$listeningDataPath = Join-Path $projectRoot 'backend\prisma\data\listening-scripts.json'
$listeningScripts = Get-Content -Raw -Encoding UTF8 $listeningDataPath | ConvertFrom-Json
$seedPath = Join-Path $projectRoot 'backend\prisma\seed.ts'
$seedSource = Get-Content -Raw -Encoding UTF8 $seedPath
$vocabularyTerms = [regex]::Matches($seedSource, "term: '([^']+)'") |
  ForEach-Object { $_.Groups[1].Value } |
  Sort-Object -Unique

$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synthesizer.Rate = -1
$synthesizer.Volume = 100

try {
  for ($index = 0; $index -lt $listeningScripts.Count; $index += 1) {
    $day = $index + 1
    if ($day % 6 -eq 0) { continue }
    $fileName = 'listening-day-{0:D2}.wav' -f $day
    $outputPath = Join-Path $listeningDirectory $fileName
    $synthesizer.SetOutputToWaveFile($outputPath)
    $synthesizer.Speak($listeningScripts[$index])
  }

  foreach ($term in $vocabularyTerms) {
    $slug = $term.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
    $outputPath = Join-Path $vocabularyDirectory "$slug.wav"
    $synthesizer.SetOutputToWaveFile($outputPath)
    $synthesizer.Speak($term)
  }
} finally {
  $synthesizer.Dispose()
}

Write-Output "Generated 25 unique listening files and $($vocabularyTerms.Count) vocabulary pronunciation files."
