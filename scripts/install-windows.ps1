# iDRAC Updater Orchestrator - Windows PowerShell Installation Script
# Run as Administrator

param(
    [string]$InstallPath = "C:\Program Files\iDRAC Orchestrator",
    [string]$DataPath = "C:\ProgramData\iDRAC Orchestrator",
    [switch]$QuickStart = $false,
    [switch]$UseSQLite = $false
)

# Allow interactive selection of database when not specified
if (-not $PSBoundParameters.ContainsKey('UseSQLite')) {
    $choice = Read-Host "Use SQLite for faster setup? (Y/N)"
    if ($choice -match '^[Yy]') {
        $UseSQLite = $true
    }
}

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Right-click PowerShell and select 'Run as Administrator'"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iDRAC Updater Orchestrator Installer" -ForegroundColor Cyan  
Write-Host "  Windows Edition" -ForegroundColor Cyan
if ($UseSQLite) {
    Write-Host "  Fast Setup Mode (SQLite)" -ForegroundColor Yellow
} else {
    Write-Host "  Full Setup Mode (PostgreSQL)" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan

# Function to write colored output
function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Blue
}

function Write-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# Check system requirements
function Test-SystemRequirements {
    Write-Info "Checking system requirements..."
    
    # Check Windows version
    $version = [System.Environment]::OSVersion.Version
    if ($version.Major -lt 10) {
        Write-Warning "Windows 10/Server 2016 or later is recommended"
    } else {
        Write-Success "Windows version check passed"
    }
    
    # Check available memory
    $memory = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty TotalPhysicalMemory
    $memoryGB = [Math]::Round($memory / 1GB)
    
    if ($memoryGB -lt 4) {
        Write-Warning "System has ${memoryGB}GB RAM. Minimum 4GB recommended."
    } else {
        Write-Success "Memory check passed (${memoryGB}GB available)"
    }
    
    # Check disk space
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object -ExpandProperty FreeSpace
    $diskGB = [Math]::Round($disk / 1GB)
    
    if ($diskGB -lt 20) {
        Write-Warning "Low disk space: ${diskGB}GB available. 20GB recommended."
    } else {
        Write-Success "Disk space check passed (${diskGB}GB available)"
    }
}

# Install Chocolatey if not present
function Install-Chocolatey {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Success "Chocolatey already installed"
        return
    }
    
    Write-Info "Installing Chocolatey package manager..."
    
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment variables
    $env:ChocolateyInstall = Convert-Path "$((Get-Command choco).Path)\..\.."
    Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
    
    Write-Success "Chocolatey installed successfully"
}

# Install Node.js
function Install-NodeJS {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        Write-Success "Node.js already installed: $nodeVersion"
        return
    }
    
    Write-Info "Installing Node.js..."
    choco install nodejs -y
    
    # Refresh PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    
    Write-Success "Node.js installed successfully"
}

# Install Git
function Install-Git {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $gitVersion = git --version
        Write-Success "Git already installed: $gitVersion"
        return
    }

    Write-Info "Installing Git..."
    choco install git -y | Out-Null

    Write-Success "Git installed successfully"
}

# Install Database (PostgreSQL or SQLite)
function Install-Database {
    param([switch]$UseSQLite = $false)
    
    if ($UseSQLite) {
        Write-Info "Using SQLite database (faster setup)..."
        
        # Create SQLite database path
        $sqliteDb = "$DataPath\idrac_orchestrator.db"
        New-Item -ItemType Directory -Force -Path (Split-Path $sqliteDb) | Out-Null
        
        # Store database URL for SQLite
        "sqlite:$sqliteDb" | Out-File -FilePath "$DataPath\db_connection.txt" -Encoding UTF8
        
        Write-Success "SQLite database configured"
        return
    }
    
    # Check if PostgreSQL is already installed
    if (Get-Service postgresql* -ErrorAction SilentlyContinue) {
        Write-Success "PostgreSQL already installed"
        return
    }
    
    Write-Info "Installing PostgreSQL (this may take a few minutes)..."
    Write-Warning "For faster setup, you can restart with -UseSQLite flag"
    
    # Generate random password
    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | % {[char]$_})
    
    # Install PostgreSQL with progress
    Write-Info "Downloading PostgreSQL package..."
    choco install postgresql --params "/Password:$dbPassword" -y --no-progress
    
    # Smart wait for service to be ready
    Write-Info "Waiting for PostgreSQL service to start..."
    $timeout = 120
    $elapsed = 0
    do {
        Start-Sleep -Seconds 5
        $elapsed += 5
        $service = Get-Service postgresql* -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
        if ($service) { break }
        Write-Host "." -NoNewline
    } while ($elapsed -lt $timeout)
    
    if (-not $service) {
        Write-Error "PostgreSQL service failed to start within $timeout seconds"
        return
    }
    
    Write-Host ""
    Write-Info "Setting up database and user..."
    
    # Set environment and combine SQL commands for efficiency
    $env:PGPASSWORD = $dbPassword
    $sqlCommands = @"
CREATE DATABASE idrac_orchestrator;
CREATE USER idrac_admin WITH ENCRYPTED PASSWORD '$dbPassword';
GRANT ALL PRIVILEGES ON DATABASE idrac_orchestrator TO idrac_admin;
"@
    
    # Execute all SQL commands at once
    $sqlCommands | & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -f -
    
    # Store database connection info
    "postgresql://idrac_admin:$dbPassword@localhost:5432/idrac_orchestrator" | Out-File -FilePath "$DataPath\db_connection.txt" -Encoding UTF8
    
    Write-Success "PostgreSQL installed and configured"
}

# Create application directories
function New-AppDirectories {
    Write-Info "Creating application directories..."
    
    New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
    New-Item -ItemType Directory -Force -Path $DataPath | Out-Null
    New-Item -ItemType Directory -Force -Path "$DataPath\logs" | Out-Null
    New-Item -ItemType Directory -Force -Path "$DataPath\firmware" | Out-Null
    New-Item -ItemType Directory -Force -Path "$DataPath\config" | Out-Null
    
    Write-Success "Directories created"
}

# Download and install application
function Install-Application {
    Write-Info "Installing application files..."

    # Determine if we're running from the source repository
    $scriptPath = $PSCommandPath
    if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }
    if ($scriptPath) {
        $scriptDir = Split-Path -Parent $scriptPath
        $candidateRoot = Resolve-Path -LiteralPath (Join-Path $scriptDir "..") -ErrorAction SilentlyContinue
        if ($candidateRoot -and (Test-Path (Join-Path $candidateRoot 'package.json'))) {
            $projectRoot = $candidateRoot
        }
    }

    if (-not $projectRoot) {
        $projectRoot = Join-Path $env:TEMP 'idrac-orchestrator'
        if (Test-Path $projectRoot) { Remove-Item $projectRoot -Recurse -Force }
        Write-Info "Cloning source repository..."
        git clone https://github.com/i0mja/idrac-orchestrator $projectRoot | Out-Null
    }

    $distSource = Join-Path $projectRoot 'dist'
    if (-not (Test-Path $distSource)) {
        Write-Info "Installing Node dependencies..."
        Push-Location $projectRoot
        npm install --omit=dev | Out-Null
        Write-Info "Building application..."
        npm run build | Out-Null
        Pop-Location
        $distSource = Join-Path $projectRoot 'dist'
    }

    if (-not (Test-Path $distSource)) {
        Write-Error "Unable to build application. See output above for details."
        exit 1
    }

    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Copy-Item -Path $distSource -Destination $InstallPath -Recurse -Force
    $servePath = Join-Path (Join-Path $projectRoot 'server') 'serve.js'
    Copy-Item -Path $servePath -Destination (Join-Path $InstallPath 'serve.js') -Force

    Write-Success "Application files installed"
}

# Create configuration files
function New-Configuration {
    Write-Info "Creating configuration files..."
    
    # Read database connection info
    $databaseUrl = Get-Content "$DataPath\db_connection.txt" -Raw -ErrorAction SilentlyContinue
    if (-not $databaseUrl) {
        $databaseUrl = "sqlite:$DataPath\idrac_orchestrator.db"
    }
    $databaseUrl = $databaseUrl.Trim()
    
    # Generate secrets
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
    $encryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
    
    # Create environment configuration
    $config = @"
# iDRAC Orchestrator Configuration
# Generated on $(Get-Date)

NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=$databaseUrl

# Security
JWT_SECRET=$jwtSecret
ENCRYPTION_KEY=$encryptionKey
SESSION_TIMEOUT=3600

# Storage
FIRMWARE_STORAGE_PATH=$DataPath\firmware
MAX_FIRMWARE_SIZE=2GB

# Logging
LOG_LEVEL=info
LOG_FILE=$DataPath\logs\app.log
LOG_RETENTION_DAYS=30
"@

    $config | Out-File -FilePath "$DataPath\config\production.env" -Encoding UTF8
    
    Write-Success "Configuration files created"
}

# Create Windows Service
function New-WindowsService {
    Write-Info "Creating Windows service..."

    choco install nssm -y | Out-Null

    $nodeExe = (Get-Command node).Source
    $nssmExe = (Get-Command nssm).Source

    & $nssmExe install "iDRAC Orchestrator" $nodeExe "serve.js"
    & $nssmExe set "iDRAC Orchestrator" AppDirectory $InstallPath
    & $nssmExe set "iDRAC Orchestrator" AppEnvironmentExtra "PORT=3000"
    & $nssmExe set "iDRAC Orchestrator" DisplayName "iDRAC Updater Orchestrator"
    & $nssmExe set "iDRAC Orchestrator" Description "Enterprise Dell iDRAC firmware management system"
    & $nssmExe set "iDRAC Orchestrator" Start SERVICE_AUTO_START
    & $nssmExe set "iDRAC Orchestrator" AppStdout "$DataPath\logs\service.log"
    & $nssmExe set "iDRAC Orchestrator" AppStderr "$DataPath\logs\error.log"

    Write-Success "Windows service created"
}

# Configure firewall
function Set-FirewallRules {
    Write-Info "Configuring Windows Firewall..."
    
    # Allow inbound connections on port 3000
    New-NetFirewallRule -DisplayName "iDRAC Orchestrator HTTP" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "iDRAC Orchestrator HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue
    
    Write-Success "Firewall rules configured"
}

# Start services
function Start-Services {
    Write-Info "Starting services..."
    
    # Start PostgreSQL if not running
    $pgService = Get-Service postgresql* | Select-Object -First 1
    if ($pgService.Status -ne "Running") {
        Start-Service $pgService.Name
    }
    
    # Start application service
    Start-Service "iDRAC Orchestrator"
    
    # Wait for application to start
    Start-Sleep -Seconds 15
    
    # Test connection
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health.txt" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Application started successfully"
        }
    }
    catch {
        Write-Warning "Application may still be starting. Check service status with: Get-Service 'iDRAC Orchestrator'"
    }
}

# Create desktop shortcut
function New-DesktopShortcut {
    Write-Info "Creating desktop shortcut..."
    
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\iDRAC Orchestrator.lnk")
    $Shortcut.TargetPath = "http://localhost:3000"
    $Shortcut.Description = "iDRAC Updater Orchestrator Web Interface"
    $Shortcut.IconLocation = "$InstallPath\assets\icon.ico"
    $Shortcut.Save()
    
    Write-Success "Desktop shortcut created"
}

# Main installation function
function Start-Installation {
    try {
        Write-Info "Starting installation..."
        
        Test-SystemRequirements
        Install-Chocolatey
        Install-NodeJS
        Install-Git
        Install-Database -UseSQLite:$UseSQLite
        New-AppDirectories
        Install-Application
        New-Configuration
        New-WindowsService
        Set-FirewallRules
        Start-Services
        New-DesktopShortcut
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Success "Installation completed successfully!"
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        if ($UseSQLite) {
            Write-Host "SQLite Mode - Perfect for testing and development!" -ForegroundColor Yellow
            Write-Host "For production, consider re-running without -UseSQLite flag" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
        Write-Host "2. Complete the setup wizard" -ForegroundColor White
        Write-Host "3. Configure your VMware vCenter connections" -ForegroundColor White
        Write-Host "4. Add Dell server credentials" -ForegroundColor White
        Write-Host ""
        Write-Host "Service Management:" -ForegroundColor Yellow
        Write-Host "  Status:   Get-Service 'iDRAC Orchestrator'" -ForegroundColor White
        Write-Host "  Stop:     Stop-Service 'iDRAC Orchestrator'" -ForegroundColor White
        Write-Host "  Start:    Start-Service 'iDRAC Orchestrator'" -ForegroundColor White
        Write-Host "  Restart:  Restart-Service 'iDRAC Orchestrator'" -ForegroundColor White
        Write-Host ""
        Write-Host "Configuration:" -ForegroundColor Yellow
        Write-Host "  App Files:  $InstallPath" -ForegroundColor White
        Write-Host "  Data Dir:   $DataPath" -ForegroundColor White
        Write-Host "  Config:     $DataPath\config\production.env" -ForegroundColor White
        Write-Host "  Logs:       $DataPath\logs\" -ForegroundColor White
        Write-Host ""
        
        # Open web browser
        Start-Process "http://localhost:3000"
    }
    catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
        Write-Host "Check the logs in $DataPath\logs\ for more details" -ForegroundColor Yellow
        exit 1
    }
}

# Run installation
Start-Installation
