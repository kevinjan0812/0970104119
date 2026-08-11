param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,
  [string]$OutputPath = (Join-Path $PSScriptRoot '協調事項_案件匯出範本.docx'),
  [string]$DataScriptPath = (Join-Path $PSScriptRoot 'word-template-data.js')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

$sourceStream = New-Object IO.FileStream(
  $SourcePath,
  [IO.FileMode]::Open,
  [IO.FileAccess]::Read,
  [IO.FileShare]::ReadWrite
)
try {
  $outputStream = New-Object IO.FileStream(
    $OutputPath,
    [IO.FileMode]::Create,
    [IO.FileAccess]::Write,
    [IO.FileShare]::None
  )
  try {
    $sourceStream.CopyTo($outputStream)
  } finally {
    $outputStream.Dispose()
  }
} finally {
  $sourceStream.Dispose()
}

$fileStream = New-Object IO.FileStream(
  $OutputPath,
  [IO.FileMode]::Open,
  [IO.FileAccess]::ReadWrite,
  [IO.FileShare]::None
)
$zip = New-Object IO.Compression.ZipArchive(
  $fileStream,
  [IO.Compression.ZipArchiveMode]::Update,
  $false
)

try {
  $entry = $zip.GetEntry('word/document.xml')
  $reader = New-Object IO.StreamReader($entry.Open())
  try {
    [xml]$documentXml = $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }

  $wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  $namespaceManager = New-Object Xml.XmlNamespaceManager($documentXml.NameTable)
  $namespaceManager.AddNamespace('w', $wordNamespace)

  function Set-ParagraphText {
    param(
      [System.Xml.XmlNode]$Paragraph,
      [string]$Text
    )

    $textNodes = @($Paragraph.SelectNodes('.//w:t', $namespaceManager))
    if ($textNodes.Count -gt 0) {
      $textNode = $textNodes[0]
    } else {
      $run = $Paragraph.SelectSingleNode('./w:r', $namespaceManager)
      if ($null -eq $run) {
        $run = $documentXml.CreateElement('w', 'r', $wordNamespace)
        $paragraphRunProperties = $Paragraph.SelectSingleNode('./w:pPr/w:rPr', $namespaceManager)
        if ($null -ne $paragraphRunProperties) {
          [void]$run.AppendChild($paragraphRunProperties.CloneNode($true))
        }
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
    param(
      [System.Xml.XmlNode]$Table,
      [int]$Row,
      [int]$Cell,
      [string]$Text
    )

    $rowNode = $Table.SelectNodes('./w:tr', $namespaceManager)[$Row - 1]
    $cellNode = $rowNode.SelectNodes('./w:tc', $namespaceManager)[$Cell - 1]
    $paragraphs = @($cellNode.SelectNodes('./w:p', $namespaceManager))
    if ($paragraphs.Count -eq 0) {
      $paragraph = $documentXml.CreateElement('w', 'p', $wordNamespace)
      [void]$cellNode.AppendChild($paragraph)
    } else {
      $paragraph = $paragraphs[0]
    }
    Set-ParagraphText -Paragraph $paragraph -Text $Text
  }

  $bodyParagraphs = @($documentXml.SelectNodes('/w:document/w:body/w:p', $namespaceManager))
  $serviceHistoryLabel = -join @(
    [char]0x670D,
    [char]0x52D9,
    [char]0x5C65,
    [char]0x6B77
  )
  $processionLabel = -join @(
    [char]0x9663,
    [char]0x982D,
    [char]0xFF1A
  )
  $serviceHistoryParagraph = $bodyParagraphs | Where-Object {
    (($_.SelectNodes('.//w:t', $namespaceManager) | ForEach-Object { $_.InnerText }) -join '').Contains($serviceHistoryLabel)
  } | Select-Object -First 1
  if ($null -eq $serviceHistoryParagraph -and $bodyParagraphs.Count -ge 16) {
    $serviceHistoryParagraph = $bodyParagraphs[$bodyParagraphs.Count - 1]
  }
  if ($bodyParagraphs.Count -ge 24) {
    Set-ParagraphText $bodyParagraphs[0] '{{case_no_summary}}'
    Set-ParagraphText $bodyParagraphs[2] '{{vendor_header}}'
    Set-ParagraphText $bodyParagraphs[16] '{{birth_summary}}'
    Set-ParagraphText $bodyParagraphs[17] '{{death_summary}}'
    Set-ParagraphText $bodyParagraphs[18] '{{home_summary}}'
    Set-ParagraphText $bodyParagraphs[19] '{{hundred_days_summary}}'
    Set-ParagraphText $bodyParagraphs[20] '{{anniversary_summary}}'
    Set-ParagraphText $bodyParagraphs[21] '{{ancestor_tablet_summary}}'
    Set-ParagraphText $bodyParagraphs[22] '{{ancestor_tower_summary}}'
    Set-ParagraphText $bodyParagraphs[23] '{{tower_slot_summary}}'
  } elseif ($bodyParagraphs.Count -ge 14) {
    Set-ParagraphText $bodyParagraphs[0] '{{case_header_summary}}'
    Set-ParagraphText $bodyParagraphs[5] '{{case_name_summary}}'
    Set-ParagraphText $bodyParagraphs[6] '{{birth_summary}}'
    Set-ParagraphText $bodyParagraphs[7] '{{death_summary}}'
    Set-ParagraphText $bodyParagraphs[8] '{{home_summary}}'
    Set-ParagraphText $bodyParagraphs[9] '{{hundred_days_summary}}'
    Set-ParagraphText $bodyParagraphs[10] '{{anniversary_summary}}'
    Set-ParagraphText $bodyParagraphs[11] '{{ancestor_tablet_summary}}'
    Set-ParagraphText $bodyParagraphs[12] '{{ancestor_tower_summary}}'
    Set-ParagraphText $bodyParagraphs[13] '{{tower_slot_summary}}'
  } else {
    throw 'The Word template does not contain enough summary paragraphs.'
  }
  if ($null -ne $serviceHistoryParagraph) {
    Set-ParagraphText $serviceHistoryParagraph '{{service_history_summary}}'
  }

  $tables = @($documentXml.SelectNodes('//w:tbl', $namespaceManager))
  if ($tables.Count -lt 2) {
    throw 'The Word template must contain a main table and a vendor table.'
  }
  $mainTable = $tables[0]
  $mainRows = @($mainTable.SelectNodes('./w:tr', $namespaceManager))
  $postPaperRowOffset = if ($mainRows.Count -ge 36) { 1 } else { 0 }
  $mainCells = @(
    @(1, 2, '{{case_name}}'), @(1, 4, '{{gender}}'), @(1, 6, '{{funeral_date}}'),
    @(2, 2, ''), @(2, 4, '{{birth_date_export}}'), @(2, 6, '{{death_date_export}}'),
    @(3, 2, '{{inspection_unit}}'), @(3, 4, '{{source}}'), @(3, 6, '{{ethnicity}}'),
    @(4, 2, '{{address_phone}}'),
    @(5, 2, '{{contact_1_name}}'), @(5, 4, '{{contact_1_relation}}'), @(5, 6, '{{contact_1_phone}}'),
    @(6, 2, '{{contact_2_name}}'), @(6, 4, '{{contact_2_relation}}'), @(6, 6, '{{contact_2_phone}}'),
    @(7, 2, '{{contact_3_name}}'), @(7, 4, '{{contact_3_relation}}'), @(7, 6, '{{contact_3_phone}}'),
    @(8, 2, '{{religion}}'), @(8, 4, '{{pickup_location}}'), @(8, 6, '{{altar_location}}'),
    @(9, 2, '{{burial_type}}'), @(9, 4, '{{tower_location}}'), @(9, 6, '{{burial_location}}'),
    @(10, 2, '{{tablet_handling}}'), @(10, 4, '{{spirit_location}}'),
    @(11, 2, '{{condolence_money}}'), @(11, 4, '{{towels}}'), @(11, 6, '{{small_towels}}'),
    @(12, 2, '{{nailing_summary}}'), @(12, 4, '{{maternal_summary}}'), @(12, 6, '{{bath_towels}}'), @(12, 8, '{{maternal_gifts}}'),
    @(13, 2, '{{urn_style_export}}'), @(13, 4, '{{coffin_style_export}}'),
    @(14, 2, '{{obituary_style}}'), @(14, 4, '{{extra_printing}}'), @(14, 6, '{{date_selection}}'),
    @(15, 2, '{{farewell_rite_summary}}'), @(15, 4, '{{coffin_rite_summary}}'), @(15, 6, '{{coffin_tap_summary}}'),
    @(16, 2, '{{mourning_traditional}}'), @(16, 4, '{{band_traditional}}'), @(16, 6, '{{hearse_chinese}}'),
    @(17, 2, '{{mourning_black}}'), @(17, 4, '{{band_western}}'), @(17, 6, '{{hearse_western}}'),
    @(18, 2, '{{double_towel}}'), @(18, 4, '{{food_summary}}'),
    @(19, 1, '{{offering_summary}}'),
    @(24, 2, '{{paper_offerings}}'),
    @((25 + $postPaperRowOffset), 2, '{{body_care_summary}}'), @((25 + $postPaperRowOffset), 4, '{{shroud_summary}}'),
    @((26 + $postPaperRowOffset), 1, '{{outside_board_summary}}'),
    @((27 + $postPaperRowOffset), 2, '{{canopy}}'), @((27 + $postPaperRowOffset), 4, '{{ceremony_location}}'), @((27 + $postPaperRowOffset), 6, '{{decoration_style}}'),
    @((28 + $postPaperRowOffset), 2, '{{photo_style}}'), @((28 + $postPaperRowOffset), 4, '{{ceremony_offerings}}'), @((28 + $postPaperRowOffset), 6, '{{maosha}}'),
    @((29 + $postPaperRowOffset), 2, '{{large_lamp}}'), @((29 + $postPaperRowOffset), 4, '{{staff_summary}}'), @((29 + $postPaperRowOffset), 6, '{{small_lamps}}'),
    @((30 + $postPaperRowOffset), 2, '{{tour_bus}}'), @((30 + $postPaperRowOffset), 4, '{{tower_car}}'), @((30 + $postPaperRowOffset), 6, '{{coffin_items}}'),
    @((31 + $postPaperRowOffset), 1, $processionLabel),
    @((32 + $postPaperRowOffset), 1, '{{procession_summary}}'),
    @((34 + $postPaperRowOffset), 2, '{{hundred_days}}'), @((34 + $postPaperRowOffset), 4, '{{anniversary}}'),
    @((35 + $postPaperRowOffset), 2, '{{ancestor_tablet}}'), @((35 + $postPaperRowOffset), 4, '{{ancestor_tower}}')
  )
  if ($postPaperRowOffset -eq 1) {
    $mainCells += @(
      @(20, 1, '{{schedule_01_item}}'), @(20, 2, '{{schedule_01_detail}}'), @(20, 4, '{{schedule_01_remark}}'),
      @(21, 1, '{{schedule_02_item}}'), @(21, 2, '{{schedule_02_detail}}'), @(21, 4, '{{schedule_02_remark}}'),
      @(22, 1, '{{schedule_03_item}}'), @(22, 2, '{{schedule_03_detail}}'), @(22, 4, '{{schedule_03_remark}}'),
      @(23, 1, '{{schedule_04_item}}'), @(23, 2, '{{schedule_04_detail}}'), @(23, 4, '{{schedule_04_remark}}')
    )
  } else {
    $mainCells += @(
      @(20, 1, '{{schedule_01_item}}'), @(20, 2, '{{schedule_01_detail}}'), @(20, 3, '{{schedule_05_item}}'), @(20, 4, '{{schedule_05_detail}}'),
      @(21, 1, '{{schedule_02_item}}'), @(21, 2, '{{schedule_02_detail}}'), @(21, 3, '{{schedule_06_item}}'), @(21, 4, '{{schedule_06_detail}}'),
      @(22, 1, '{{schedule_03_item}}'), @(22, 2, '{{schedule_03_detail}}'), @(22, 3, '{{schedule_07_item}}'), @(22, 4, '{{schedule_07_detail}}'),
      @(23, 1, '{{schedule_04_item}}'), @(23, 2, '{{schedule_04_detail}}'), @(23, 3, '{{schedule_08_item}}'), @(23, 4, '{{schedule_08_detail}}')
    )
  }
  if ($postPaperRowOffset -eq 1) {
    Set-CellText $mainTable 25 2 '{{paper_money}}'
  }
  foreach ($cellSpec in $mainCells) {
    Set-CellText $mainTable $cellSpec[0] $cellSpec[1] $cellSpec[2]
  }

  $vendorTable = $tables[1]
  foreach ($row in 2..13) {
    $slot = '{0:D2}' -f ($row - 1)
    Set-CellText $vendorTable $row 2 "{{vendor_left_${slot}_name}}"
    Set-CellText $vendorTable $row 3 "{{vendor_left_${slot}_note}}"
    Set-CellText $vendorTable $row 5 "{{vendor_right_${slot}_name}}"
    Set-CellText $vendorTable $row 6 "{{vendor_right_${slot}_note}}"
  }
  foreach ($row in 14..18) {
    $slot = '{0:D2}' -f ($row - 13)
    Set-CellText $vendorTable $row 1 "{{vendor_extra_left_${slot}_item}}"
    Set-CellText $vendorTable $row 2 "{{vendor_extra_left_${slot}_name}}"
    Set-CellText $vendorTable $row 3 "{{vendor_extra_left_${slot}_note}}"
    Set-CellText $vendorTable $row 4 "{{vendor_extra_right_${slot}_item}}"
    Set-CellText $vendorTable $row 5 "{{vendor_extra_right_${slot}_name}}"
    Set-CellText $vendorTable $row 6 "{{vendor_extra_right_${slot}_note}}"
  }

  if ($tables.Count -ge 3) {
    $ritualTable = $tables[2]
    foreach ($row in 2..10) {
      $slot = '{0:D2}' -f ($row - 1)
      Set-CellText $ritualTable $row 1 "{{ritual_${slot}_item}}"
      Set-CellText $ritualTable $row 2 "{{ritual_${slot}_vendor}}"
      Set-CellText $ritualTable $row 3 "{{ritual_${slot}_people}}"
      Set-CellText $ritualTable $row 4 "{{ritual_${slot}_note}}"
    }
  }

  $entry.Delete()
  $newEntry = $zip.CreateEntry('word/document.xml', [IO.Compression.CompressionLevel]::Optimal)
  $writer = New-Object IO.StreamWriter($newEntry.Open(), (New-Object Text.UTF8Encoding($false)))
  try {
    $documentXml.Save($writer)
  } finally {
    $writer.Dispose()
  }
} finally {
  $zip.Dispose()
  $fileStream.Dispose()
}

$templateBytes = [IO.File]::ReadAllBytes($OutputPath)
$templateBase64 = [Convert]::ToBase64String($templateBytes)
$dataScript = "window.CASE_WORD_TEMPLATE_BASE64 = '$templateBase64';`n"
[IO.File]::WriteAllText($DataScriptPath, $dataScript, (New-Object Text.UTF8Encoding($false)))

Get-Item -LiteralPath $OutputPath, $DataScriptPath |
  Select-Object FullName, Length, LastWriteTime
