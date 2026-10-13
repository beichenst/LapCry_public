param(
    [int]$BatchSize = 25,
    [int]$DelayMs = 250
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $Root "src/core/config/OperationConfig.json"
$OutputPath = Join-Path $Root "src/web/descriptions.zh.mjs"
$Endpoint = "https://translate.googleapis.com/translate_a/single"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "OperationConfig.json was not found at $ConfigPath"
}

$Config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$Names = @($Config.PSObject.Properties.Name)
$Descriptions = @{}

function Translate-Text([string]$Text) {
    for ($Attempt = 1; $Attempt -le 4; $Attempt++) {
        try {
            $Response = Invoke-RestMethod -Method Post -Uri $Endpoint -TimeoutSec 60 -Body @{
                client = "gtx"
                sl     = "en"
                tl     = "zh-CN"
                dt     = "t"
                q      = $Text
            }
            return (($Response[0] | ForEach-Object { $_[0] }) -join "")
        } catch {
            if ($Attempt -eq 4) {
                throw
            }
            Start-Sleep -Seconds (2 * $Attempt)
        }
    }
}

for ($Offset = 0; $Offset -lt $Names.Count; $Offset += $BatchSize) {
    $Batch = @($Names[$Offset..([Math]::Min($Offset + $BatchSize - 1, $Names.Count - 1))])
    $Payload = [System.Text.StringBuilder]::new()

    for ($Index = 0; $Index -lt $Batch.Count; $Index++) {
        $Name = $Batch[$Index]
        [void]$Payload.Append("<lc id=""$Index"">")
        [void]$Payload.Append([string]$Config.PSObject.Properties[$Name].Value.description)
        [void]$Payload.Append("</lc>")
    }

    $Translated = $null
    $Translated = Translate-Text $Payload.ToString()

    for ($Index = 0; $Index -lt $Batch.Count; $Index++) {
        $Pattern = "<lc id=""$Index"">([\s\S]*?)</lc>"
        $Match = [regex]::Match($Translated, $Pattern)
        if (-not $Match.Success) {
            $SinglePayload = "<lc id=""0"">" + [string]$Config.PSObject.Properties[$Batch[$Index]].Value.description + "</lc>"
            $SingleTranslation = Translate-Text $SinglePayload
            $Match = [regex]::Match($SingleTranslation, "<lc id=""0"">([\s\S]*?)</lc>")
            if (-not $Match.Success) {
                throw "Missing translation for '$($Batch[$Index])'"
            }
        }
        $Descriptions[$Batch[$Index]] = $Match.Groups[1].Value
    }

    Write-Host ("Translated {0}/{1}" -f ([Math]::Min($Offset + $BatchSize, $Names.Count)), $Names.Count)
    if ($Offset + $BatchSize -lt $Names.Count) {
        Start-Sleep -Milliseconds $DelayMs
    }
}

$Lines = foreach ($Name in $Names) {
    $JsonName = ConvertTo-Json $Name -Compress
    $JsonDescription = ConvertTo-Json ([string]$Descriptions[$Name]) -Compress
    "    $JsonName`: $JsonDescription,"
}

$Header = @"
/**
 * Chinese hover descriptions for LapCry operations.
 *
 * Generated from OperationConfig.json and stored locally so operation
 * descriptions remain available without a network connection.
 *
 * @author Bin9chn
 * @copyright LapCry 2026
 * @license Apache-2.0
 */

const ZH_DESCRIPTIONS = {
"@

$Footer = @"
};

export default ZH_DESCRIPTIONS;

"@

$Output = $Header + "`n" + ($Lines -join "`n") + "`n" + $Footer
$Output = $Header + "`n" + ($Lines -join "`n") + "`n" + $Footer + "`n"
[System.IO.File]::WriteAllText($OutputPath, $Output, [System.Text.UTF8Encoding]::new($false))
Write-Host "Wrote $OutputPath"
