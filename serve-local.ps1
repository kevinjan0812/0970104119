$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://127.0.0.1:8765/')
$listener.Start()
$mimeTypes = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon' }
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $relativePath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'index.html' }
            $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
            if (-not $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not [System.IO.File]::Exists($filePath)) {
                $context.Response.StatusCode = 404
                $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            } else {
                $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                $context.Response.ContentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { 'application/octet-stream' }
                $body = [System.IO.File]::ReadAllBytes($filePath)
                $context.Response.StatusCode = 200
            }
            $context.Response.ContentLength64 = $body.Length
            $context.Response.OutputStream.Write($body, 0, $body.Length)
        } catch { $context.Response.StatusCode = 500 }
        finally { $context.Response.OutputStream.Close() }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
