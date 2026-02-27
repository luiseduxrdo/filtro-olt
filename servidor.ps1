Add-Type -AssemblyName System.Web

$adaBase = 'http://192.168.111.245/ISP/AdaProvider/'
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:${port}/")

try {
    $listener.Start()
} catch {
    Write-Host ''
    Write-Host '  ERRO: Porta 8080 ja esta em uso.' -ForegroundColor Red
    Write-Host '  Feche a outra instancia e tente novamente.' -ForegroundColor Yellow
    Write-Host ''
    Read-Host '  Pressione Enter para sair'
    exit
}

Write-Host ''
Write-Host '  ============================================' -ForegroundColor DarkCyan
Write-Host '    Filtro OLT - Servidor Local' -ForegroundColor Cyan
Write-Host '  ============================================' -ForegroundColor DarkCyan
Write-Host ''
Write-Host "  Servidor ativo em http://localhost:${port}" -ForegroundColor Green
Write-Host '  Deixe esta janela aberta enquanto usar o Filtro OLT.' -ForegroundColor DarkGray
Write-Host '  Pressione Ctrl+C para encerrar.' -ForegroundColor DarkGray
Write-Host ''

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $res.Headers.Add('Access-Control-Allow-Origin', '*')
    $res.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    $res.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')

    if ($req.HttpMethod -eq 'OPTIONS') {
        $res.StatusCode = 200
        $res.Close()
        continue
    }

    $path = $req.Url.AbsolutePath
    $res.ContentType = 'application/json; charset=utf-8'
    $body = ''

    try {
        if ($path -eq '/health') {
            $body = '{"status":"ok"}'
        }
        elseif ($path -eq '/clientes') {
            $wc = New-Object System.Net.WebClient
            $wc.Encoding = [System.Text.Encoding]::UTF8
            $qs = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)
            $sSearch = $qs['sSearch']
            if (-not $sSearch) { $sSearch = '' }
            $url = $adaBase + 'gateway/Clientes.dataprovider.php?sSearch=' + [System.Uri]::EscapeDataString($sSearch) + '&iDisplayStart=0&iDisplayLength=100&sEcho=1&iColumns=6'
            $body = $wc.DownloadString($url)
        }
        elseif ($path -eq '/cadastro') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $postData = $reader.ReadToEnd()
            $reader.Close()
            $wc = New-Object System.Net.WebClient
            $wc.Encoding = [System.Text.Encoding]::UTF8
            $wc.Headers.Add('Content-Type', 'application/x-www-form-urlencoded')
            $body = $wc.UploadString($adaBase + 'controller/ClienteController.php', $postData)
        }
        else {
            $res.StatusCode = 404
            $body = '{"error":"not found"}'
        }
    }
    catch {
        $res.StatusCode = 502
        $errMsg = $_.Exception.Message -replace '"', ''
        $body = '{"error":"' + $errMsg + '"}'
    }

    $buf = [System.Text.Encoding]::UTF8.GetBytes($body)
    $res.ContentLength64 = $buf.Length
    $res.OutputStream.Write($buf, 0, $buf.Length)
    $res.Close()

    $ts = [datetime]::Now.ToString('HH:mm:ss')
    Write-Host "  [$ts] $($req.HttpMethod) $path" -ForegroundColor DarkGray
}
