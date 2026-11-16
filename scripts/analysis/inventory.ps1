# Complete Project Inventory - Phase A
# Scans entire project and produces detailed file listing

$projectRoot = "d:\Projects\medical-sql-chatbot_0"
$inventory = @()

# Get all files recursively, excluding node_modules and .next and .git
$files = Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.FullName -notmatch "\\node_modules\\" -and 
        $_.FullName -notmatch "\\\.next\\" -and 
        $_.FullName -notmatch "\\\.git\\" -and
        $_.FullName -notmatch "\\mimic-iv-clinical-database-demo" -and
        $_.FullName -notmatch "\\data\\"
    }

# Categorize files
$categories = @{
    "App Pages & Layouts" = @()
    "React Components" = @()
    "API Routes" = @()
    "Backend Services" = @()
    "Database" = @()
    "Config & Build" = @()
    "Scripts & Tests" = @()
    "Documentation" = @()
    "Other" = @()
}

foreach ($file in $files) {
    $relativePath = $file.FullName -replace [regex]::Escape($projectRoot + "\"), ""
    $extension = $file.Extension
    $name = $file.Name
    
    # Categorize
    $category = "Other"
    
    if ($relativePath -match "src[/\\]app[/\\]") {
        if ($relativePath -match "(page|layout)\.(js|jsx|ts|tsx)$") {
            $category = "App Pages & Layouts"
        } elseif ($relativePath -match "api[/\\]") {
            $category = "API Routes"
        }
    } elseif ($relativePath -match "src[/\\]components[/\\]") {
        $category = "React Components"
    } elseif ($relativePath -match "src[/\\]backend[/\\]") {
        $category = "Backend Services"
    } elseif ($relativePath -match "database[/\\]") {
        $category = "Database"
    } elseif ($extension -match "\.(config|json|yml|yaml|env)" -or $name -match "next\.") {
        $category = "Config & Build"
    } elseif ($relativePath -match "\.(py|ps1|sh|test)" -or $name -match "test-" -or $name -match "inventory") {
        $category = "Scripts & Tests"
    } elseif ($extension -match "\.(md)$") {
        $category = "Documentation"
    }
    
    $categories[$category] += @{
        File = $name
        Path = $relativePath
        Size = "{0:N0}" -f $file.Length
        Modified = $file.LastWriteTime
    }
}

# Output inventory
Write-Host "================== CLARA PROJECT INVENTORY ==================" -ForegroundColor Cyan
Write-Host ""

foreach ($cat in $categories.Keys) {
    if ($categories[$cat].Count -gt 0) {
        Write-Host $cat -ForegroundColor Yellow
        Write-Host ("-" * 60)
        foreach ($item in $categories[$cat] | Sort-Object Path) {
            Write-Host "  $($item.Path)" -ForegroundColor White
        }
        Write-Host ""
    }
}

# Summary
$totalFiles = ($files | Measure-Object).Count
Write-Host "SUMMARY" -ForegroundColor Green
Write-Host "Total files: $totalFiles"
Write-Host ""
