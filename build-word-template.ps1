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

  function Get-TableRowText {
    param(
      [System.Xml.XmlNode]$Row
    )

    return (($Row.SelectNodes('.//w:t', $namespaceManager) | ForEach-Object { $_.InnerText }) -join '')
  }

  function Find-TableRowNumber {
    param(
      [System.Xml.XmlNode[]]$Rows,
      [string]$Label
    )

    for ($index = 0; $index -lt $Rows.Count; $index += 1) {
      if ((Get-TableRowText -Row $Rows[$index]).Contains($Label)) {
        return $index + 1
      }
    }
    return 0
  }

  function Remove-UnderlinedBlankRuns {
    param(
      [System.Xml.XmlNode]$Paragraph
    )

    foreach ($run in @($Paragraph.SelectNodes('./w:r', $namespaceManager))) {
      $underline = $run.SelectSingleNode('./w:rPr/w:u[not(@w:val="none")]', $namespaceManager)
      if ($null -eq $underline) {
        continue
      }

      $runText = (($run.SelectNodes('.//w:t', $namespaceManager) | ForEach-Object { $_.InnerText }) -join '')
      if ([string]::IsNullOrWhiteSpace($runText)) {
        [void]$Paragraph.RemoveChild($run)
      }
    }
  }

  function Remove-ParagraphUnderline {
    param(
      [System.Xml.XmlNode]$Paragraph
    )

    foreach ($underline in @($Paragraph.SelectNodes('./w:pPr/w:rPr/w:u | ./w:r/w:rPr/w:u', $namespaceManager))) {
      [void]$underline.ParentNode.RemoveChild($underline)
    }
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
  $paperOfferingsRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x7D19, [char]0x7D2E, [char]0x9805, [char]0x76EE))
  $paperMoneyRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x5EAB, [char]0x9322))
  $bodyCareRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x6C90, [char]0x6D74, [char]0x66F4, [char]0x8863))
  $outsideBoardRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x9928, [char]0x5916, [char]0x63A5, [char]0x677F))
  $ceremonyProcessRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x5100, [char]0x5F0F, [char]0x9032, [char]0x884C))
  $canopyRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x68DA, [char]0x67B6, [char]0x642D, [char]0x8A2D))
  $photoRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x76F8, [char]0x7247, [char]0x6A23, [char]0x5F0F))
  $largeLampRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x5927, [char]0x71C8, [char]0x88FD, [char]0x505A))
  $tourBusRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x904A, [char]0x89BD, [char]0x8ECA))
  $processionRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x9663, [char]0x982D))
  $hundredDaysRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x767E, [char]0x65E5))
  $ancestorTabletRow = Find-TableRowNumber -Rows $mainRows -Label $(-join @([char]0x516C, [char]0x5ABD, [char]0x65B9, [char]0x4F4D))
  $requiredRows = @(
    $paperOfferingsRow, $paperMoneyRow, $bodyCareRow, $outsideBoardRow,
    $canopyRow, $photoRow, $largeLampRow, $tourBusRow,
    $processionRow, $hundredDaysRow, $ancestorTabletRow
  )
  if ($requiredRows -contains 0) {
    throw 'The Word template main table does not contain all required labeled rows.'
  }

  $scheduleStartRow = $paperOfferingsRow - 4
  $offeringRow = $scheduleStartRow - 1
  $hasSplitChoiceRows = $offeringRow -ge 19
  $hasScheduleRemarkColumn = (Get-TableRowText -Row $mainRows[$scheduleStartRow - 1]).Contains(
    $(-join @([char]0x5099, [char]0x8A3B))
  )
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
    @($offeringRow, 1, '{{offering_summary}}'),
    @($paperOfferingsRow, 2, '{{paper_offerings}}'),
    @($paperMoneyRow, 2, '{{paper_money}}'),
    @($bodyCareRow, 2, '{{body_care_summary}}'), @($bodyCareRow, 4, '{{shroud_summary}}'),
    @($outsideBoardRow, 1, $(if ($ceremonyProcessRow -gt 0) { '{{outside_board_only_summary}}' } else { '{{outside_board_summary}}' })),
    @($canopyRow, 2, '{{canopy}}'), @($canopyRow, 4, '{{ceremony_location}}'), @($canopyRow, 6, '{{decoration_style}}'),
    @($photoRow, 2, '{{photo_style}}'), @($photoRow, 4, '{{ceremony_offerings}}'), @($photoRow, 6, '{{maosha}}'),
    @($largeLampRow, 2, '{{large_lamp}}'), @($largeLampRow, 4, '{{staff_summary}}'), @($largeLampRow, 6, '{{small_lamps}}'),
    @($tourBusRow, 2, '{{tour_bus}}'), @($tourBusRow, 4, '{{tower_car}}'), @($tourBusRow, 6, '{{coffin_items}}'),
    @($processionRow, 1, $processionLabel),
    @(($processionRow + 1), 1, '{{procession_summary}}'),
    @($hundredDaysRow, 2, '{{hundred_days}}'), @($hundredDaysRow, 4, '{{anniversary}}'),
    @($ancestorTabletRow, 2, '{{ancestor_tablet}}'), @($ancestorTabletRow, 4, '{{ancestor_tower}}')
  )

  if ($hasSplitChoiceRows) {
    $mainCells += @(
      @(16, 2, '{{mourning_traditional}}'), @(16, 4, '{{band_traditional}}'), @(16, 6, '{{hearse_chinese}}'),
      @(17, 2, '{{mourning_black}}'), @(17, 4, '{{band_western}}'), @(17, 6, '{{hearse_western}}'),
      @(18, 2, '{{double_towel}}'), @(18, 4, '{{food_summary}}')
    )
  } else {
    $mainCells += @(
      @(16, 2, '{{mourning_dress_summary}}'), @(16, 4, '{{band_summary}}'), @(16, 6, '{{hearse_summary}}'),
      @(17, 2, '{{double_towel}}'), @(17, 4, '{{food_summary}}')
    )
  }

  if ($ceremonyProcessRow -gt 0) {
    $mainCells += @(, @($ceremonyProcessRow, 1, '{{ceremony_process_summary}}'))
  }

  if ($hasScheduleRemarkColumn) {
    $mainCells += @(
      @($scheduleStartRow, 1, '{{schedule_01_item}}'), @($scheduleStartRow, 2, '{{schedule_01_detail}}'), @($scheduleStartRow, 4, '{{schedule_01_remark}}'),
      @(($scheduleStartRow + 1), 1, '{{schedule_02_item}}'), @(($scheduleStartRow + 1), 2, '{{schedule_02_detail}}'), @(($scheduleStartRow + 1), 4, '{{schedule_02_remark}}'),
      @(($scheduleStartRow + 2), 1, '{{schedule_03_item}}'), @(($scheduleStartRow + 2), 2, '{{schedule_03_detail}}'), @(($scheduleStartRow + 2), 4, '{{schedule_03_remark}}'),
      @(($scheduleStartRow + 3), 1, '{{schedule_04_item}}'), @(($scheduleStartRow + 3), 2, '{{schedule_04_detail}}'), @(($scheduleStartRow + 3), 4, '{{schedule_04_remark}}')
    )
  } else {
    $mainCells += @(
      @($scheduleStartRow, 1, '{{schedule_01_item}}'), @($scheduleStartRow, 2, '{{schedule_01_detail}}'), @($scheduleStartRow, 3, '{{schedule_05_item}}'), @($scheduleStartRow, 4, '{{schedule_05_detail}}'),
      @(($scheduleStartRow + 1), 1, '{{schedule_02_item}}'), @(($scheduleStartRow + 1), 2, '{{schedule_02_detail}}'), @(($scheduleStartRow + 1), 3, '{{schedule_06_item}}'), @(($scheduleStartRow + 1), 4, '{{schedule_06_detail}}'),
      @(($scheduleStartRow + 2), 1, '{{schedule_03_item}}'), @(($scheduleStartRow + 2), 2, '{{schedule_03_detail}}'), @(($scheduleStartRow + 2), 3, '{{schedule_07_item}}'), @(($scheduleStartRow + 2), 4, '{{schedule_07_detail}}'),
      @(($scheduleStartRow + 3), 1, '{{schedule_04_item}}'), @(($scheduleStartRow + 3), 2, '{{schedule_04_detail}}'), @(($scheduleStartRow + 3), 3, '{{schedule_08_item}}'), @(($scheduleStartRow + 3), 4, '{{schedule_08_detail}}')
    )
  }
  foreach ($cellSpec in $mainCells) {
    Set-CellText $mainTable $cellSpec[0] $cellSpec[1] $cellSpec[2]
  }

  foreach ($paragraph in @($mainTable.SelectNodes('.//w:p', $namespaceManager))) {
    $paragraphText = (($paragraph.SelectNodes('.//w:t', $namespaceManager) | ForEach-Object { $_.InnerText }) -join '')
    if ($paragraphText -match '^\{\{schedule_\d{2}_detail\}\}$') {
      Remove-UnderlinedBlankRuns -Paragraph $paragraph
    }
    if ($paragraphText -eq '{{staff_summary}}') {
      Remove-ParagraphUnderline -Paragraph $paragraph
      Remove-UnderlinedBlankRuns -Paragraph $paragraph
    }
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
