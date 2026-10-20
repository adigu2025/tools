# 減重衛教單本機輸出伺服器：提供這個資料夾的檔案，並把瀏覽器送來的圖片存進 out/
$root = $PSScriptRoot
$out = $PSScriptRoot
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add('http://localhost:8767/')
$l.Prefixes.Add('http://127.0.0.1:8767/')
$l.Start()
$types = @{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.webp'='image/webp';'.json'='application/json';'.svg'='image/svg+xml';'.pdf'='application/pdf'}
while($l.IsListening){
  $c = $l.GetContext()
  $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath).TrimStart('/')
  if($c.Request.HttpMethod -eq 'POST' -and $p -eq '__save'){
    $name = $c.Request.QueryString['name'] -replace '[^A-Za-z0-9_./-]',''
    $name = $name -replace '\.\.',''
    $dest = Join-Path $out $name
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    $ms = New-Object IO.MemoryStream
    $c.Request.InputStream.CopyTo($ms)
    [IO.File]::WriteAllBytes($dest, $ms.ToArray())
    $c.Response.Close(); continue
  }
  $f = Join-Path $root $p
  if(Test-Path $f -PathType Container){ $f = Join-Path $f 'index.html' }
  if(Test-Path $f -PathType Leaf){
    $b = [IO.File]::ReadAllBytes($f)
    $e = [IO.Path]::GetExtension($f).ToLower()
    if($types[$e]){ $c.Response.ContentType = $types[$e] }
    $c.Response.Headers.Add('Cache-Control','no-store')
    $c.Response.ContentLength64 = $b.Length
    $c.Response.OutputStream.Write($b,0,$b.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
