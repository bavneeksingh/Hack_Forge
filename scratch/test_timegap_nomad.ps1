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

Write-Host "`n=== 1. Login as Leo Wanderer ===" -ForegroundColor Cyan
$leoAuth = Invoke-Api -uri "$baseUrl/auth/login" -method "Post" -body @{email="leo.wanderer@company.com"; password="password123"}
$leoHeaders = @{ Authorization = "Bearer $($leoAuth.token)" }
Write-Host "Leo Token obtained."

Write-Host "`n=== 2. Test Preview Leave Gap ===" -ForegroundColor Cyan
$previewTokyo = Invoke-Api -uri "$baseUrl/workations/preview?timezone=Asia/Tokyo&startDate=2026-10-01&endDate=2026-10-08" -method "Get" -headers $leoHeaders
Write-Host "Tokyo Preview:" ($previewTokyo | ConvertTo-Json -Depth 3)

Write-Host "`n=== 3. Leo Submits Nomad Leave in Tokyo ===" -ForegroundColor Cyan
$body = @{
    city = "Tokyo"
    country = "Japan"
    timezone = "Asia/Tokyo"
    startDate = "2026-10-01"
    endDate = "2026-10-08"
    statusMessage = "Nomad leave in Tokyo exploring culture"
    statusIcon = "⛩️"
}

$createdTrip = Invoke-Api -uri "$baseUrl/workations" -method "Post" -headers $leoHeaders -body $body
Write-Host "Created Trip:" ($createdTrip | ConvertTo-Json -Depth 3)

if ($createdTrip) {
    Write-Host "`n=== 4. Login as Manager Alice ===" -ForegroundColor Cyan
    $aliceAuth = Invoke-Api -uri "$baseUrl/auth/login" -method "Post" -body @{email="alice.manager@company.com"; password="password123"}
    $aliceHeaders = @{ Authorization = "Bearer $($aliceAuth.token)" }

    $alicePending = Invoke-Api -uri "$baseUrl/workations/pending" -method "Get" -headers $aliceHeaders
    Write-Host "Alice Pending Count: $($alicePending.Count)"

    Write-Host "`n=== 5. Alice Approves (Stage 1 of 2) ===" -ForegroundColor Cyan
    $mgrApproved = Invoke-Api -uri "$baseUrl/workations/$($createdTrip.id)/approve" -method "Post" -headers $aliceHeaders -body @{comment="Manager Approved"}
    Write-Host "Status after Mgr Approval: $($mgrApproved.approvalStatus)"

    Write-Host "`n=== 6. Login as HR Helen ===" -ForegroundColor Cyan
    $hrAuth = Invoke-Api -uri "$baseUrl/auth/login" -method "Post" -body @{email="hr.helen@company.com"; password="password123"}
    $hrHeaders = @{ Authorization = "Bearer $($hrAuth.token)" }

    $hrPending = Invoke-Api -uri "$baseUrl/workations/pending" -method "Get" -headers $hrHeaders
    Write-Host "HR Pending Count: $($hrPending.Count)"

    Write-Host "`n=== 7. HR Helen Approves (Stage 2 of 2) ===" -ForegroundColor Cyan
    $hrApproved = Invoke-Api -uri "$baseUrl/workations/$($createdTrip.id)/approve" -method "Post" -headers $hrHeaders -body @{comment="HR Final Approved"}
    Write-Host "Status after HR Approval: $($hrApproved.approvalStatus)"

    Write-Host "`n=== 8. Check Team Calendar in Base Country (IST) ===" -ForegroundColor Cyan
    $cal = Invoke-Api -uri "$baseUrl/leaves/team-calendar?from=2026-09-28&to=2026-10-31" -method "Get" -headers $aliceHeaders
    Write-Host "Calendar Workations Count: $($cal.workations.Count)"
    foreach ($w in $cal.workations) {
        Write-Host "- $($w.employeeName) in $($w.city): Base Grid [$($w.startDate) to $($w.endDate)] | Dest: $($w.localDatesDisplay) | Base: $($w.teamDatesDisplay) | Gap: $($w.timeGapDescription)"
    }
}
