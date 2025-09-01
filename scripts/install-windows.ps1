# iDRAC Updater Orchestrator - Windows PowerShell Installation Script
# Run as Administrator

param(
    [string]$InstallPath = "C:\Program Files\iDRAC Orchestrator",
    [string]$DataPath = "C:\ProgramData\iDRAC Orchestrator",
    [switch]$QuickStart = $false
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Right-click PowerShell and select 'Run as Administrator'"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iDRAC Updater Orchestrator Installer" -ForegroundColor Cyan  
Write-Host "  Windows Edition" -ForegroundColor Cyan
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

# Install PostgreSQL
function Install-PostgreSQL {
    if (Get-Service postgresql* -ErrorAction SilentlyContinue) {
        Write-Success "PostgreSQL already installed"
        return
    }
    
    Write-Info "Installing PostgreSQL..."
    
    # Generate random password
    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | % {[char]$_})
    
    # Install PostgreSQL
    choco install postgresql --params '/Password:$dbPassword' -y
    
    # Wait for service to start
    Start-Sleep -Seconds 30
    
    # Create database and user
    Write-Info "Setting up database..."
    
    $env:PGPASSWORD = $dbPassword
    & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE idrac_orchestrator;"
    & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE USER idrac_admin WITH ENCRYPTED PASSWORD '$dbPassword';"
    & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE idrac_orchestrator TO idrac_admin;"
    
    # Store password for later use
    $dbPassword | Out-File -FilePath "$DataPath\db_password.txt" -Encoding UTF8
    
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
    Write-Info "Downloading application files..."
    
    # Download latest release
    $downloadUrl = "https://github.com/your-org/idrac-orchestrator/releases/latest/download/idrac-orchestrator-windows.zip"
    $zipFile = "$env:TEMP\idrac-orchestrator.zip"
    
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile
        
        # Extract files
        Expand-Archive -Path $zipFile -DestinationPath $InstallPath -Force
        
        # Install npm dependencies
        Set-Location $InstallPath
        npm install --production
        
        Remove-Item $zipFile -Force
        
        Write-Success "Application files installed"
    }
    catch {
        Write-Warning "Could not download from GitHub. Installing from local files..."
        # Fallback to local installation
    }
}

# Create configuration files
function New-Configuration {
    Write-Info "Creating configuration files..."
    
    # Read database password
    $dbPassword = Get-Content "$DataPath\db_password.txt" -Raw
    $dbPassword = $dbPassword.Trim()
    
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
DATABASE_URL=postgresql://idrac_admin:$dbPassword@localhost:5432/idrac_orchestrator

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
    
    # Install nssm (Non-Sucking Service Manager)
    choco install nssm -y
    
    # Create service
    & nssm install "iDRAC Orchestrator" "$InstallPath\node.exe" "$InstallPath\dist\server\index.js"
    & nssm set "iDRAC Orchestrator" AppDirectory $InstallPath
    & nssm set "iDRAC Orchestrator" AppEnvironmentExtra "NODE_ENV=production"
    & nssm set "iDRAC Orchestrator" DisplayName "iDRAC Updater Orchestrator"
    & nssm set "iDRAC Orchestrator" Description "Enterprise Dell iDRAC firmware management system"
    & nssm set "iDRAC Orchestrator" Start SERVICE_AUTO_START
    & nssm set "iDRAC Orchestrator" AppStdout "$DataPath\logs\service.log"
    & nssm set "iDRAC Orchestrator" AppStderr "$DataPath\logs\error.log"
    
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
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10
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
        Install-PostgreSQL
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