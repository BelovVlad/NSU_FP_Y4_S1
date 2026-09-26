param([string]$GameRoot = 'C:\Users\bjise\Downloads\site\RWLD_copy')
$ErrorActionPreference = 'Stop'
$out = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
Add-Type -Path "$out\tools\ilspy\ICSharpCode.Decompiler.dll"
$settings = New-Object ICSharpCode.Decompiler.DecompilerSettings
$settings.ThrowOnAssemblyResolveErrors = $false
$assemblyPath = "$GameRoot\RainWorld_Data\Managed\Assembly-CSharp.dll"
$decompiler = New-Object ICSharpCode.Decompiler.CSharp.CSharpDecompiler($assemblyPath, $settings)
$groups = [ordered]@{
    'render' = @('OverseerGraphics','OverseerEffect','CoralBrain.Mycelium','CoralBrain.IOwnMycelia','IOwnMycelia')
    'holograms' = @('OverseerHolograms.OverseerHologram','OverseerHolograms.OverseerImage','OverseerHolograms.IOwnAHoloImage','OverseerHolograms.AngryHologram','OverseerHolograms.GateScene','OverseerTutorialBehavior')
    'behavior-reference' = @('Overseer','OverseerAI','OverseerAbstractAI','OverseerCommunicationModule','OverseersWorldAI')
    'support' = @('TriangleMesh','GraphicsModule','ComplexGraphicsModule','FSprite','FAtlas','FAtlasElement','FAtlasManager','FShader','Futile','RWCustom.Custom','CoralBrain.CoralNeuronSystem')
    'optional' = @('OverseerCarcass')
}
$exported = @()
foreach ($group in $groups.Keys) {
    $dir = Join-Path $out "code\$group"
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    foreach ($type in $groups[$group]) {
        try {
            $fullName = New-Object ICSharpCode.Decompiler.TypeSystem.FullTypeName($type)
            $code = $decompiler.DecompileTypeAsString($fullName)
            if ([string]::IsNullOrWhiteSpace($code)) { continue }
            [IO.File]::WriteAllText((Join-Path $dir "$type.cs"), $code, $utf8)
            $exported += $type
        } catch {
            if ($type -notin @('CoralBrain.IOwnMycelia','IOwnMycelia')) { throw }
        }
    }
}
$streaming = "$GameRoot\RainWorld_Data\StreamingAssets"
$manifest = [Collections.Generic.List[object]]::new()
function Copy-Tracked([string]$source, [string]$relative) {
    $dest = Join-Path $out $relative
    New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
    $before = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
    Copy-Item -LiteralPath $source -Destination $dest
    $after = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
    if ($before -ne $after) { throw "Copy mismatch: $source" }
    $manifest.Add([pscustomobject]@{source=$source; output=$relative; sha256=$before})
}
$shaderNames = @('OverseerZip','FlatLight','Hologram','HologramImage','HologramBehindTerrain','Bloom','Basic','LightSource')
$seen = @{}
function Copy-Shader([string]$name) {
    if ($seen.ContainsKey($name)) { return }
    $seen[$name] = $true
    $src = Join-Path "$streaming\shaders" $name
    if (!(Test-Path -LiteralPath $src)) { return }
    Copy-Tracked $src "shaders\$name"
    foreach ($match in [regex]::Matches([IO.File]::ReadAllText($src), '#include\s+"([^"]+)"')) {
        Copy-Shader $match.Groups[1].Value
    }
}
foreach ($name in $shaderNames) { Copy-Shader "$name.shader" }
foreach ($name in @('noise.png','noise2.png')) { Copy-Tracked "$streaming\palettes\$name" "textures\$name" }
foreach ($name in @('ps4controllertiny.png','ps5controllertiny.png')) { Copy-Tracked "$streaming\illustrations\$name" "optional\tutorial\$name" }
Get-ChildItem -LiteralPath "$streaming\projections" -File | ForEach-Object { Copy-Tracked $_.FullName "projections\base\$($_.Name)" }
foreach ($mod in @('moreslugcats','rwremix')) {
    $dir = "$streaming\mods\$mod\projections"
    if (Test-Path -LiteralPath $dir) { Get-ChildItem -LiteralPath $dir -File | ForEach-Object { Copy-Tracked $_.FullName "projections\$mod\$($_.Name)" } }
}
Copy-Tracked $assemblyPath 'reference\Assembly-CSharp.dll'
Copy-Tracked "$streaming\aa\catalog.json" 'reference\addressables-catalog.json'
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$out\copied-files.json" -Encoding UTF8
$exported | ConvertTo-Json | Set-Content -LiteralPath "$out\exported-types.json" -Encoding UTF8
"Exported $($exported.Count) types and $($manifest.Count) original files."
