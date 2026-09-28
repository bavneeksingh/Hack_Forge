$baseUrl = "http://localhost:8080/api"

function Invoke-Api([string]$uri, [string]$method, [hashtable]$headers, $body) {
    try {
        $params = @{
            Uri = $uri
            Method = $method
        }
        if ($headers) { $params["Headers"] = $headers }
        if ($body) {
            $json = ($body | ConvertTo-Json -Depth 5)
            $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($json)
            $params["ContentType"] = "application/json; charset=utf-8"
        }
        return Invoke-RestMethod @params
    } catch {
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
            Write-Host "API ERROR ($method $uri): $errBody" -ForegroundColor Red
        } else {
            Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $null
    }
}

Write-Host "`n=== 1. Login as Manager Alice ===" -ForegroundColor Cyan
$aliceAuth = Invoke-Api -uri "$baseUrl/auth/login" -method "Post" -body @{email="alice.manager@company.com"; password="password123"}
$aliceHeaders = @{ Authorization = "Bearer $($aliceAuth.token)" }
Write-Host "Logged in as Alice Manager."

Write-Host "`n=== 2. Check Team Calendar (USA Approved Trips) ===" -ForegroundColor Cyan
$cal = Invoke-Api -uri "$baseUrl/leaves/team-calendar?from=2026-09-20&to=2026-11-20" -method "Get" -headers $aliceHeaders
Write-Host "Workations in Calendar ($($cal.workations.Count)):"
foreach ($w in $cal.workations) {
    Write-Host "- $($w.employeeName) ($($w.statusIcon) $($w.city), $($w.country))"
    Write-Host "  * Base Calendar Grid: $($w.startDate) to $($w.endDate)"
    Write-Host "  * Destination Leave: $($w.localDatesDisplay)"
    Write-Host "  * Base HQ (IST) Window: $($w.teamDatesDisplay)"
    Write-Host "  * Time Gap: $($w.timeGapDescription)"
}

Write-Host "`n=== 3. Check Pending Queue for Alice ===" -ForegroundColor Cyan
$pending = Invoke-Api -uri "$baseUrl/workations/pending" -method "Get" -headers $aliceHeaders
Write-Host "Pending Workations for Alice ($($pending.Count)):"
foreach ($p in $pending) {
    Write-Host "- $($p.userName) ($($p.statusIcon) $($p.city), $($p.country)): Stage [$($p.approvalStatus)] | Dest: $($p.localDatesDisplay) | Base: $($p.teamDatesDisplay) | Gap: $($p.timeGapDescription)"
}
