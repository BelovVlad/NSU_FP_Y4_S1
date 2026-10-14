# Печатный PDF всех семинаров: белый фон, серые изображения, векторный текст.
$ErrorActionPreference = 'Stop'
$latexDir = $PSScriptRoot
$outDir = Join-Path $latexDir 'build_final/print'
$subjectDir = Split-Path (Split-Path $latexDir -Parent) -Parent
$target = Join-Path $subjectDir 'ФиХАиМ_Семинары_ЧБ.pdf'
$temporaryPdf = Join-Path $outDir 'print-gray.pdf'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Push-Location -LiteralPath $latexDir
try {
    $ErrorActionPreference = 'Continue'
    & latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error "-outdir=$outDir" print.tex
    $compileResult = $LASTEXITCODE
    if ($compileResult -ne 0) { throw "LaTeX build failed: $compileResult" }
    $nativePdf = Join-Path $outDir 'print.pdf'
    & python (Join-Path $latexDir 'convert-print.py') "$nativePdf" "$temporaryPdf"
    $conversionResult = $LASTEXITCODE
    if ($conversionResult -ne 0) { throw "Grayscale conversion failed: $conversionResult" }
    $ErrorActionPreference = 'Stop'
    if (-not (Test-Path -LiteralPath $temporaryPdf -PathType Leaf)) {
        throw 'Grayscale PDF was not created.'
    }
    Copy-Item -LiteralPath $temporaryPdf -Destination $target -Force
    Write-Host "PDF copied to: $target"
}
finally {
    Pop-Location
}
