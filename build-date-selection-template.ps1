param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,
  [string]$OutputPath = 'date-selection-export-template.docx',
  [string]$DataScriptPath = 'date-selection-template-data.js'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

[IO.File]::Copy($SourcePath, $OutputPath, $true)
$fileStream = [IO.File]::Open($OutputPath, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$zip = [IO.Compression.ZipArchive]::new($fileStream, [IO.Compression.ZipArchiveMode]::Update, $false)

try {
  $entry = $zip.GetEntry('word/document.xml')
  $reader = [IO.StreamReader]::new($entry.Open())
  try {
    $documentXml = [Xml.XmlDocument]::new()
    $documentXml.PreserveWhitespace = $true
    $documentXml.LoadXml($reader.ReadToEnd())
  } finally {
    $reader.Dispose()
  }

  $wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  $namespaceManager = [Xml.XmlNamespaceManager]::new($documentXml.NameTable)
  $namespaceManager.AddNamespace('w', $wordNamespace)

  function Set-ParagraphText {
    param([Xml.XmlNode]$Paragraph, [string]$Text)

    $textNodes = @($Paragraph.SelectNodes('.//w:t', $namespaceManager))
    if ($textNodes.Count) {
      $textNode = $textNodes[0]
    } else {
      $run = $Paragraph.SelectSingleNode('./w:r', $namespaceManager)
      if ($null -eq $run) {
        $run = $documentXml.CreateElement('w', 'r', $wordNamespace)
        [void]$Paragraph.AppendChild($run)
      }
      $textNode = $documentXml.CreateElement('w', 't', $wordNamespace)
      [void]$run.AppendChild($textNode)
    }

    $space = $textNode.Attributes['space', 'http://www.w3.org/XML/1998/namespace']
    if ($null -eq $space) {
      $space = $documentXml.CreateAttribute('xml', 'space', 'http://www.w3.org/XML/1998/namespace')
      [void]$textNode.Attributes.Append($space)
    }
    $space.Value = 'preserve'
    $textNode.InnerText = $Text
    foreach ($extraTextNode in $textNodes | Select-Object -Skip 1) {
      $extraTextNode.InnerText = ''
    }
  }

  function Set-CellText {
    param([Xml.XmlNode]$Table, [int]$Row, [int]$Cell, [string]$Text)

    $rowNode = $Table.SelectNodes('./w:tr', $namespaceManager)[$Row - 1]
    $cellNode = $rowNode.SelectNodes('./w:tc', $namespaceManager)[$Cell - 1]
    $paragraph = $cellNode.SelectSingleNode('./w:p', $namespaceManager)
    if ($null -eq $paragraph) {
      $paragraph = $documentXml.CreateElement('w', 'p', $wordNamespace)
      [void]$cellNode.AppendChild($paragraph)
    }
    Set-ParagraphText $paragraph $Text
  }

  $tables = @($documentXml.SelectNodes('/w:document/w:body/w:tbl', $namespaceManager))
  if ($tables.Count -lt 5) {
    throw 'The date-selection Word template does not contain the expected five tables.'
  }

  $ageSuffix = [char]0x6B72
  $lunarLabel = [char]0x8FB2
  $solarLabel = [char]0x570B
  $calendarSuffix = [char]0x66C6

  Set-CellText $tables[0] 1 2 '{{deceased_name}}'
  Set-CellText $tables[0] 1 5 "{{age}} $ageSuffix"
  Set-CellText $tables[0] 1 7 '{{address}}'

  Set-CellText $tables[1] 1 3 '{{birth_lunar}} {{birth_branch}}'
  Set-CellText $tables[1] 2 3 '{{birth_solar}}'
  Set-CellText $tables[2] 1 2 "$lunarLabel$calendarSuffix`: {{death_lunar}} {{death_branch}}"
  Set-CellText $tables[2] 2 3 '{{death_solar}}'

  $familyTable = $tables[3]
  for ($group = 1; $group -le 15; $group += 1) {
    $lunarRow = 2 + (($group - 1) * 2)
    $solarRow = $lunarRow + 1
    $leftSlot = '{0:D2}' -f (($group * 2) - 1)
    $rightSlot = '{0:D2}' -f ($group * 2)

    Set-CellText $familyTable $lunarRow 1 "{{family_${leftSlot}_honorific}}"
    Set-CellText $familyTable $lunarRow 2 "{{family_${leftSlot}_name}}"
    Set-CellText $familyTable $lunarRow 3 "${lunarLabel}: {{family_${leftSlot}_lunar}}"
    Set-CellText $familyTable $lunarRow 4 "{{family_${leftSlot}_fate}}"
    Set-CellText $familyTable $solarRow 3 "${solarLabel}: {{family_${leftSlot}_solar}}"

    Set-CellText $familyTable $lunarRow 5 "{{family_${rightSlot}_honorific}}"
    Set-CellText $familyTable $lunarRow 6 "{{family_${rightSlot}_name}}"
    Set-CellText $familyTable $lunarRow 7 "${lunarLabel}: {{family_${rightSlot}_lunar}}"
    Set-CellText $familyTable $lunarRow 8 "{{family_${rightSlot}_fate}}"
    Set-CellText $familyTable $solarRow 7 "${solarLabel}: {{family_${rightSlot}_solar}}"
  }

  $entry.Delete()
  $newEntry = $zip.CreateEntry('word/document.xml', [IO.Compression.CompressionLevel]::Optimal)
  $writer = [IO.StreamWriter]::new($newEntry.Open(), [Text.UTF8Encoding]::new($false))
  try {
    $documentXml.Save($writer)
  } finally {
    $writer.Dispose()
  }
} finally {
  $zip.Dispose()
  $fileStream.Dispose()
}

& (Join-Path $PSScriptRoot 'enforce-date-selection-template-font.ps1') -TemplatePath $OutputPath
& (Join-Path $PSScriptRoot 'sync-date-selection-template-data.ps1') -TemplatePath $OutputPath -DataScriptPath $DataScriptPath
