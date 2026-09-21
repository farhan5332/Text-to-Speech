# Smoke-tests the running speech service. Start it first with `npm run dev`.
# Usage: powershell -ExecutionPolicy Bypass -File .\test-api.ps1 [-BaseUrl http://localhost:5000]
#
# Uses curl.exe rather than Invoke-WebRequest: Windows PowerShell 5.1 throws on
# 4xx responses, and the error cases are half of what this script checks.

param([string]$BaseUrl = 'http://localhost:5000')

$work = Join-Path ([IO.Path]::GetTempPath()) 'tts-api-test'
New-Item -ItemType Directory -Force $work | Out-Null

$script:failed = 0

function Invoke-Case {
  param(
    [string]$Name,
    [string]$Method = 'GET',
    [string]$Path,
    [string]$Json,
    [string]$ContentType = 'application/json',
    [int]$Expect
  )

  $bodyOut = Join-Path $work 'response.bin'
  $curlArgs = @('-s', '-o', $bodyOut, '-w', '%{http_code}', '-X', $Method, "$BaseUrl$Path")

  if ($Json) {
    # Passing JSON through a file sidesteps PowerShell 5.1 stripping the quotes.
    $bodyIn = Join-Path $work 'request.json'
    [IO.File]::WriteAllText($bodyIn, $Json)
    $curlArgs += @('-H', "Content-Type: $ContentType", '--data-binary', "@$bodyIn")
  }

  $status = [int](& curl.exe @curlArgs)
  if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL  $Name - could not reach $BaseUrl (is the server running?)" -ForegroundColor Red
    $script:failed++
    return
  }

  $bytes = (Get-Item $bodyOut).Length
  $detail = if ($bytes -lt 500) { [IO.File]::ReadAllText($bodyOut) } else { "$bytes bytes" }

  if ($status -eq $Expect) {
    Write-Host "PASS  $Name -> $status  $detail" -ForegroundColor Green
  } else {
    Write-Host "FAIL  $Name -> expected $Expect, got $status  $detail" -ForegroundColor Red
    $script:failed++
  }
}

Invoke-Case -Name 'health'                  -Path '/api/health'      -Expect 200
Invoke-Case -Name 'voices'                  -Path '/api/voices'      -Expect 200
Invoke-Case -Name 'speak (defaults)'        -Method POST -Path '/api/tts' -Json '{"text":"Hello from the backend."}' -Expect 201
Invoke-Case -Name 'speak (language+voice)'  -Method POST -Path '/api/tts' -Json '{"text":"Bonjour","language":"fr-FR","voice":"Denise"}' -Expect 201
Invoke-Case -Name 'missing text'            -Method POST -Path '/api/tts' -Json '{}' -Expect 400
Invoke-Case -Name 'empty text'              -Method POST -Path '/api/tts' -Json '{"text":""}' -Expect 400
Invoke-Case -Name 'text over the limit'     -Method POST -Path '/api/tts' -Json ("{`"text`":`"$('a' * 5001)`"}") -Expect 400
Invoke-Case -Name 'unsupported language'    -Method POST -Path '/api/tts' -Json '{"text":"hi","language":"xx"}' -Expect 400
Invoke-Case -Name 'voice from wrong language' -Method POST -Path '/api/tts' -Json '{"text":"hi","language":"en-US","voice":"Uzma"}' -Expect 400
Invoke-Case -Name 'malformed JSON'          -Method POST -Path '/api/tts' -Json '{"text":"hi",' -Expect 400
Invoke-Case -Name 'not JSON (415)'          -Method POST -Path '/api/tts' -Json 'text=hi' -ContentType 'text/plain' -Expect 415
Invoke-Case -Name 'unknown route'           -Path '/api/nope'        -Expect 404
Invoke-Case -Name 'missing audio file'      -Path '/audio/nope.mp3'  -Expect 404

# Day 11-14: the generated clip must be fetchable and downloadable.
$bodyIn = Join-Path $work 'gen.json'
[IO.File]::WriteAllText($bodyIn, '{"text":"Round trip check.","language":"en-US","voice":"Ava"}')
$json = & curl.exe -s -X POST "$BaseUrl/api/tts" -H 'Content-Type: application/json' --data-binary "@$bodyIn" | ConvertFrom-Json
if ($json.audioUrl) {
  Invoke-Case -Name 'fetch generated clip' -Path $json.audioUrl -Expect 200
} else {
  Write-Host 'FAIL  fetch generated clip - no audioUrl in response' -ForegroundColor Red
  $script:failed++
}

Write-Host ''
if ($script:failed -eq 0) {
  Write-Host 'All checks passed.' -ForegroundColor Green
} else {
  Write-Host "$($script:failed) check(s) failed." -ForegroundColor Red
  exit 1
}
