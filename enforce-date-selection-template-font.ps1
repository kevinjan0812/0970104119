param(
  [string]$TemplatePath = 'date-selection-export-template.docx'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

$fontName = [string]([char]0x6A19) + [char]0x6977 + [char]0x9AD4
$wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$themeNamespace = 'http://schemas.openxmlformats.org/drawingml/2006/main'

function Set-WordFonts {
  param([Xml.XmlElement]$Fonts)

  foreach ($attributeName in 'ascii', 'hAnsi', 'eastAsia', 'cs') {
    [void]$Fonts.SetAttribute($attributeName, $wordNamespace, $fontName)
  }
  foreach ($attributeName in 'asciiTheme', 'hAnsiTheme', 'eastAsiaTheme', 'cstheme') {
    $Fonts.RemoveAttribute($attributeName, $wordNamespace)
  }
}

$resolvedTemplatePath = (Resolve-Path -LiteralPath $TemplatePath).Path
$fileStream = [IO.File]::Open($resolvedTemplatePath, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$zip = [IO.Compression.ZipArchive]::new($fileStream, [IO.Compression.ZipArchiveMode]::Update, $false)

try {
  foreach ($entryPath in 'word/document.xml', 'word/styles.xml') {
    $entry = $zip.GetEntry($entryPath)
    if ($null -eq $entry) { continue }

    $reader = [IO.StreamReader]::new($entry.Open())
    try {
      $xml = [Xml.XmlDocument]::new()
      $xml.PreserveWhitespace = $true
      $xml.LoadXml($reader.ReadToEnd())
    } finally {
      $reader.Dispose()
    }

    $namespaceManager = [Xml.XmlNamespaceManager]::new($xml.NameTable)
    $namespaceManager.AddNamespace('w', $wordNamespace)

    if ($entryPath -eq 'word/document.xml') {
      foreach ($run in @($xml.SelectNodes('//w:r', $namespaceManager))) {
        $runProperties = $run.SelectSingleNode('./w:rPr', $namespaceManager)
        if ($null -eq $runProperties) {
          $runProperties = $xml.CreateElement('w', 'rPr', $wordNamespace)
          [void]$run.PrependChild($runProperties)
        }
        $fonts = $runProperties.SelectSingleNode('./w:rFonts', $namespaceManager)
        if ($null -eq $fonts) {
          $fonts = $xml.CreateElement('w', 'rFonts', $wordNamespace)
          [void]$runProperties.PrependChild($fonts)
        }
        Set-WordFonts $fonts
      }
    } else {
      $defaultRunProperties = $xml.SelectSingleNode('//w:docDefaults/w:rPrDefault/w:rPr', $namespaceManager)
      if ($null -ne $defaultRunProperties) {
        $defaultFonts = $defaultRunProperties.SelectSingleNode('./w:rFonts', $namespaceManager)
        if ($null -eq $defaultFonts) {
          $defaultFonts = $xml.CreateElement('w', 'rFonts', $wordNamespace)
          [void]$defaultRunProperties.PrependChild($defaultFonts)
        }
        Set-WordFonts $defaultFonts
      }
    }

    $entry.Delete()
    $newEntry = $zip.CreateEntry($entryPath, [IO.Compression.CompressionLevel]::Optimal)
    $writer = [IO.StreamWriter]::new($newEntry.Open(), [Text.UTF8Encoding]::new($false))
    try {
      $xml.Save($writer)
    } finally {
      $writer.Dispose()
    }
  }

  $themeEntry = $zip.GetEntry('word/theme/theme1.xml')
  if ($null -ne $themeEntry) {
    $reader = [IO.StreamReader]::new($themeEntry.Open())
    try {
      $themeXml = [Xml.XmlDocument]::new()
      $themeXml.PreserveWhitespace = $true
      $themeXml.LoadXml($reader.ReadToEnd())
    } finally {
      $reader.Dispose()
    }

    $themeNamespaces = [Xml.XmlNamespaceManager]::new($themeXml.NameTable)
    $themeNamespaces.AddNamespace('a', $themeNamespace)
    foreach ($eastAsiaFont in @($themeXml.SelectNodes('//a:majorFont/a:ea | //a:minorFont/a:ea', $themeNamespaces))) {
      [void]$eastAsiaFont.SetAttribute('typeface', $fontName)
    }

    $themeEntry.Delete()
    $newThemeEntry = $zip.CreateEntry('word/theme/theme1.xml', [IO.Compression.CompressionLevel]::Optimal)
    $writer = [IO.StreamWriter]::new($newThemeEntry.Open(), [Text.UTF8Encoding]::new($false))
    try {
      $themeXml.Save($writer)
    } finally {
      $writer.Dispose()
    }
  }
} finally {
  $zip.Dispose()
  $fileStream.Dispose()
}

Get-Item -LiteralPath $resolvedTemplatePath | Select-Object FullName, Length, LastWriteTime
