param(
    [Parameter(Mandatory = $true)][string]$DocDir,
    [Parameter(Mandatory = $true)][string]$DocFile
)

$ErrorActionPreference = 'Stop'
$DocDir = (Resolve-Path -LiteralPath $DocDir).Path
$docDirLeaf = Split-Path -Path $DocDir -Leaf

if ($docDirLeaf -eq 'parts') {
    $latexDir = Split-Path -Path $DocDir -Parent
    $outDir = Join-Path -Path $latexDir -ChildPath 'build_parts'
    $pdfTarget = Join-Path -Path $latexDir -ChildPath ($DocFile + '.pdf')
}
else {
    $latexDir = $DocDir
    $outDir = Join-Path -Path $latexDir -ChildPath 'build_final'
    $projectRoot = Split-Path -Path $latexDir -Parent
    $outputName = $DocFile
    if ($DocFile -eq 'final') {
        $subjectDir = Split-Path -Path $projectRoot -Parent
        $subjectName = Split-Path -Path $subjectDir -Leaf
        $materialKind = (Split-Path -Path $projectRoot -Leaf) -replace '^\d+_', ''
        $outputName = $subjectName + '_' + $materialKind
    }
    $pdfTarget = Join-Path -Path $projectRoot -ChildPath ($outputName + '.pdf')
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$texPath = Join-Path -Path $DocDir -ChildPath ($DocFile + '.tex')
if (-not (Test-Path -LiteralPath $texPath -PathType Leaf)) {
    throw "Source file not found: $texPath"
}

Push-Location -LiteralPath $DocDir
try {
    # Windows PowerShell can turn native stderr warnings into terminating errors.
    # The compiler's exit code, checked below, determines build success.
    $ErrorActionPreference = 'Continue'
    & latexmk -pdf -interaction=nonstopmode -halt-on-error -synctex=1 -file-line-error "-outdir=$outDir" "$texPath"
    $latexmkExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = 'Stop'
    Pop-Location
}

# Never replace the published PDF with stale output after a failed build.
if ($latexmkExitCode -ne 0) {
    exit $latexmkExitCode
}
$builtPdf = Join-Path -Path $outDir -ChildPath ($DocFile + '.pdf')
if (-not (Test-Path -LiteralPath $builtPdf -PathType Leaf)) {
    throw "PDF was not created: $builtPdf"
}
Copy-Item -LiteralPath $builtPdf -Destination $pdfTarget -Force
Write-Host ('PDF copied to: ' + $pdfTarget)
exit 0
