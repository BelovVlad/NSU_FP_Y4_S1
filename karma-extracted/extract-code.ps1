param(
    [string]$GameRoot = 'C:\Users\bjise\Downloads\site\RWLD_copy',
    [string]$ToolsRoot = "$PSScriptRoot\..\overseer-extracted\tools"
)
$ErrorActionPreference = 'Stop'
Add-Type -Path "$ToolsRoot\ilspy\ICSharpCode.Decompiler.dll"
$settings = New-Object ICSharpCode.Decompiler.DecompilerSettings
$settings.ThrowOnAssemblyResolveErrors = $false
$source = "$GameRoot\RainWorld_Data\Managed\Assembly-CSharp.dll"
$d = New-Object ICSharpCode.Decompiler.CSharp.CSharpDecompiler($source, $settings)
$groups = [ordered]@{
    '' = @('HUD.KarmaMeter','HUD.HUDCircle','Menu.KarmaLadder','Menu.KarmaLadderScreen','Menu.SleepAndDeathScreen','MoreSlugcats.KarmaVectorX')
    'support' = @('HUD.FadeCircle','HUD.HudPart','Menu.MenuObject','Menu.PositionedMenuObject','Menu.EndgameMeter','CustomFSprite','RWCustom.Custom','RWCustom.IntVector2','SoundLoader','Futile','FAtlas','FAtlasElement','FSprite','FShader')
}
$manifest = @()
foreach ($group in $groups.Keys) {
    $dir = Join-Path $PSScriptRoot "code\$group"
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    foreach ($type in $groups[$group]) {
        $name = New-Object ICSharpCode.Decompiler.TypeSystem.FullTypeName($type)
        [IO.File]::WriteAllText((Join-Path $dir "$type.cs"), $d.DecompileTypeAsString($name))
        $manifest += [pscustomobject]@{type=$type; folder=$group; source=$source; sha256=(Get-FileHash $source -Algorithm SHA256).Hash}
    }
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content "$PSScriptRoot\code-provenance.json" -Encoding UTF8
"Exported $($manifest.Count) types."
