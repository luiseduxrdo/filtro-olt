Add-Type -AssemblyName System.Web

$adaBase = 'http://192.168.111.245/ISP/AdaProvider/'
$port = 8080
$script:adaSession = ''
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:${port}/")

function Read-ResponseBody($response) {
    $stream = $response.GetResponseStream()
    if (-not $stream) { return '' }
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    try {
        return $reader.ReadToEnd()
    }
    finally {
        $reader.Close()
        $stream.Close()
        $response.Close()
    }
}

function Invoke-AdaLogin($username, $pws) {
    $cc      = New-Object System.Net.CookieContainer
    $rootUri = New-Object System.Uri('http://192.168.111.245/')
    $baseUri = New-Object System.Uri($adaBase)

    # GET login page para o servidor criar a sessão PHP
    $r1 = [System.Net.HttpWebRequest]::Create($adaBase)
    $r1.Method = 'GET'; $r1.AllowAutoRedirect = $true; $r1.Proxy = $null
    $r1.CookieContainer = $cc
    try { [void](Read-ResponseBody $r1.GetResponse()) } catch {}

    # POST credenciais
    $loginBody = 'call=doLoginAction&username=' + [System.Uri]::EscapeDataString($username) + '&pws=' + [System.Uri]::EscapeDataString($pws)
    $r2 = [System.Net.HttpWebRequest]::Create($adaBase + 'controller/SecurityController.php')
    $r2.Method = 'POST'
    $r2.ContentType = 'application/x-www-form-urlencoded; charset=UTF-8'
    $r2.AllowAutoRedirect = $false
    $r2.Proxy = $null
    $r2.CookieContainer = $cc
    $r2.Headers.Add('X-Requested-With', 'XMLHttpRequest')
    $r2.Headers.Add('Referer', $adaBase)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($loginBody)
    $r2.ContentLength = $bytes.Length
    $s = $r2.GetRequestStream()
    try { $s.Write($bytes, 0, $bytes.Length) } finally { $s.Close() }

    $responseBody = ''
    try {
        $responseBody = Read-ResponseBody $r2.GetResponse()
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) { $responseBody = Read-ResponseBody $_.Exception.Response }
    }

    # Extrai PHPSESSID — tenta root e adaBase pois o path varia
    $phpSessId = ''
    foreach ($uri in @($rootUri, $baseUri)) {
        foreach ($c in $cc.GetCookies($uri)) {
            if ($c.Name -eq 'PHPSESSID') { $phpSessId = $c.Value; break }
        }
        if ($phpSessId) { break }
    }

    if ($phpSessId -and $responseBody -match 'success') {
        $script:adaSession = "AdaProviderUsername=$username; PHPSESSID=$phpSessId"
        $ts = [datetime]::Now.ToString('HH:mm:ss')
        Write-Host "  [$ts] LOGIN OK  usuario=$username  sessao=$phpSessId" -ForegroundColor Green
        return '{"status":"ok","username":"' + $username + '"}'
    }

    Write-Host "  LOGIN FALHOU  resposta=$responseBody" -ForegroundColor Yellow
    return '{"status":"error","message":"Credenciais invalidas ou erro no ADA"}'
}

function Invoke-AdaRequest($url, $method = 'GET', $body = $null, $contentType = $null, $cookie = $null) {
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.Method = $method
    $req.AllowAutoRedirect = $false
    $req.Proxy = $null
    $req.UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

    if ($contentType) {
        $req.ContentType = $contentType
    }

    if ($cookie) {
        $req.Headers.Add('Cookie', $cookie)
    }

    if ($body -ne $null) {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $req.ContentLength = $bytes.Length
        $reqStream = $req.GetRequestStream()
        try {
            $reqStream.Write($bytes, 0, $bytes.Length)
        }
        finally {
            $reqStream.Close()
        }
    }

    try {
        $resp = $req.GetResponse()
        return Read-ResponseBody $resp
    }
    catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            return Read-ResponseBody $_.Exception.Response
        }
        throw
    }
}

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
Write-Host '    Filtro Clientes ADA - Servidor Local' -ForegroundColor Cyan
Write-Host '  ============================================' -ForegroundColor DarkCyan
Write-Host ''
Write-Host "  Servidor ativo em http://localhost:${port}" -ForegroundColor Green
Write-Host '  Deixe esta janela aberta enquanto usar o Filtro Clientes ADA.' -ForegroundColor DarkGray
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
            $qs = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)
            $sSearch = $qs['sSearch']
            if (-not $sSearch) { $sSearch = '' }
            $iDisplayStart  = $qs['iDisplayStart'];  if (-not $iDisplayStart)  { $iDisplayStart  = '0'   }
            $iDisplayLength = $qs['iDisplayLength']; if (-not $iDisplayLength) { $iDisplayLength = '100' }
            $url = $adaBase + 'gateway/Clientes.dataprovider.php?sSearch=' + [System.Uri]::EscapeDataString($sSearch) + '&iDisplayStart=' + $iDisplayStart + '&iDisplayLength=' + $iDisplayLength + '&sEcho=1&iColumns=6'
            $body = Invoke-AdaRequest $url
        }
        elseif ($path -eq '/cadastro') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $postData = $reader.ReadToEnd()
            $reader.Close()
            $body = Invoke-AdaRequest ($adaBase + 'controller/ClienteController.php') 'POST' $postData 'application/x-www-form-urlencoded'
        }
        elseif ($path -eq '/login') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $postData = $reader.ReadToEnd()
            $reader.Close()
            $qs = [System.Web.HttpUtility]::ParseQueryString($postData)
            $body = Invoke-AdaLogin $qs['username'] $qs['pws']
        }
        elseif ($path -eq '/acao') {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $postData = $reader.ReadToEnd()
            $reader.Close()
            $adaCookie = if ($script:adaSession) { $script:adaSession } else { $req.Headers['X-Ada-Cookie'] }
            $body = Invoke-AdaRequest ($adaBase + 'controller/ClienteController.php') 'POST' $postData 'application/x-www-form-urlencoded' $adaCookie
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
