$envLocalPath = ".env.local"
if (-not (Test-Path $envLocalPath)) {
    Write-Host "Error: .env.local not found in the current directory."
    exit 1
}

$content = Get-Content $envLocalPath
foreach ($line in $content) {
    if ($line.Trim() -eq "" -or $line.StartsWith("#")) {
        continue
    }

    $parts = $line.Split("=", 2)
    if ($parts.Length -eq 2) {
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        # Remove surrounding quotes if they exist
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        # Fix escaped newlines for FIREBASE_PRIVATE_KEY
        $value = $value.Replace('\n', "`n")

        Write-Host "Uploading secret: $key"
        $value | npx wrangler secret put $key
    }
}

Write-Host "Done uploading secrets!"
