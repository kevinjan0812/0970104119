param(
  [string]$TemplatePath = 'date-selection-export-template.docx',
  [string]$DataScriptPath = 'date-selection-template-data.js'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $TemplatePath)) {
  throw "Date-selection Word template not found: $TemplatePath"
}

$templateBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($TemplatePath))
$dataScript = "window.DATE_SELECTION_WORD_TEMPLATE_BASE64 = '$templateBase64';`n"
[IO.File]::WriteAllText($DataScriptPath, $dataScript, [Text.UTF8Encoding]::new($false))

Get-Item -LiteralPath $TemplatePath, $DataScriptPath | Select-Object FullName, Length, LastWriteTime
