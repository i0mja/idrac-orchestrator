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

# Function to refresh environment variables
function Refresh-Environment {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Function to cleanup previous installation
function Remove-PreviousInstallation {
    Write-Info "Checking for previous installation..."
    
    # Stop and remove service if it exists
    $service = Get-Service -Name "iDRAC Orchestrator" -ErrorAction SilentlyContinue
    if ($service) {
        Write-Info "Stopping and removing existing service..."
        Stop-Service -Name "iDRAC Orchestrator" -Force -ErrorAction SilentlyContinue

        if (Get-Command nssm -ErrorAction SilentlyContinue) {
            & nssm remove "iDRAC Orchestrator" confirm 2>$null
        } else {
            sc.exe delete "iDRAC Orchestrator" | Out-Null
        }

        Start-Sleep -Seconds 2
    }
    
    # Remove installation directory
    if (Test-Path $InstallPath) {
        Write-Info "Removing previous installation files..."
        try {
            Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Could not remove installation directory: $($_.Exception.Message)"
            Write-Info "Some files may be in use. Continuing with installation..."
        }
    }

    # Remove data directory
    if (Test-Path $DataPath) {
        Write-Info "Removing previous data files..."
        try {
            Remove-Item -Path $DataPath -Recurse -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Could not remove data directory: $($_.Exception.Message)"
            Write-Info "Some files may be in use. Continuing with installation..."
        }
    }
    
    # Remove desktop shortcut
    $shortcutPath = "$env:USERPROFILE\Desktop\iDRAC Orchestrator.lnk"
    if (Test-Path $shortcutPath) {
        Remove-Item -Path $shortcutPath -Force -ErrorAction SilentlyContinue
    }
    
    Write-Success "Previous installation cleaned up"
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
    Refresh-Environment
    
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
    
    # Refresh environment to make Git available
    Refresh-Environment

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
GRANT ALL PRIVileGES ON DATABASE idrac_orchestrator TO idrac_admin;
"@
    
    # Execute all SQL commands at once
    try {
        $sqlCommands | & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -f -
    }
    catch {
        Write-Warning "Database might already exist, continuing..."
    }
    
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

    # Create a unique temp directory to avoid conflicts
    $tempId = Get-Random -Minimum 1000 -Maximum 9999
    $projectRoot = Join-Path $env:TEMP "idrac-orchestrator-$tempId"
    
    if (Test-Path $projectRoot) { 
        Write-Info "Cleaning up previous clone..."
        try {
            Remove-Item $projectRoot -Recurse -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Could not remove directory: $($_.Exception.Message)"
            # Try a different directory
            $tempId = Get-Random -Minimum 1000 -Maximum 9999
            $projectRoot = Join-Path $env:TEMP "idrac-orchestrator-$tempId"
        }
    }
    
    Write-Info "Cloning source repository..."
    
    # Verify Git is available after installation
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error "Git is not available even after installation. Please restart PowerShell and run the script again."
        exit 1
    }
    
    git clone https://github.com/i0mja/idrac-orchestrator $projectRoot 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to clone repository"
        exit 1
    }

    $distSource = Join-Path $projectRoot 'dist'
    if (-not (Test-Path $distSource)) {
        Write-Info "Installing Node dependencies..."
        Push-Location $projectRoot
        try {
            # Install all dependencies including dev dependencies for build
            npm install 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Error "npm install failed"
                exit 1
            }
            
            Write-Info "Building application..."
            npm run build 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Error "npm run build failed"
                exit 1
            }
        }
        finally {
            Pop-Location
        }
        $distSource = Join-Path $projectRoot 'dist'
    }

    if (-not (Test-Path $distSource)) {
        Write-Error "Unable to build application. See output above for details."
        exit 1
    }

    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Copy-Item -Path "$distSource\*" -Destination $InstallPath -Recurse -Force
    $servePath = Join-Path (Join-Path $projectRoot 'server') 'serve.js'
    Copy-Item -Path $servePath -Destination (Join-Path $InstallPath 'serve.js') -Force

    # Ensure Node treats serve.js as an ES module
    $packageJsonPath = Join-Path $InstallPath 'package.json'
    '{"type": "module"}' | Out-File -FilePath $packageJsonPath -Encoding utf8

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

    # Install NSSM if not already installed
    if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
        choco install nssm -y | Out-Null
        Refresh-Environment
    }

    $nodeExe = (Get-Command node).Source
    $nssmExe = (Get-Command nssm).Source

    # Check if service already exists and remove it
    $service = Get-Service -Name "iDRAC Orchestrator" -ErrorAction SilentlyContinue
    if ($service) {
        Write-Info "Removing existing service..."
        & $nssmExe remove "iDRAC Orchestrator" confirm 2>$null
        Start-Sleep -Seconds 2
    }

    # Create the service
    Write-Info "Creating new service..."
    & $nssmExe install "iDRAC Orchestrator" $nodeExe "$InstallPath\serve.js"
    & $nssmExe set "iDRAC Orchestrator" AppDirectory $InstallPath
    & $nssmExe set "iDRAC Orchestrator" AppEnvironmentExtra "NODE_ENV=production"
    & $nssmExe set "iDRAC Orchestrator" AppStdout "$DataPath\logs\service.log"
    & $nssmExe set "iDRAC Orchestrator" AppStderr "$DataPath\logs\error.log"
    & $nssmExe set "iDRAC Orchestrator" DisplayName "iDRAC Updater Orchestrator"
    & $nssmExe set "iDRAC Orchestrator" Description "Enterprise Dell iDRAC firmware management system"
    & $nssmExe set "iDRAC Orchestrator" Start SERVICE_AUTO_START

    Write-Success "Windows service created"
}

# Configure firewall
function Set-FirewallRules {
    Write-Info "Configuring Windows Firewall..."
    
    # Remove existing rules to avoid duplicates
    Remove-NetFirewallRule -DisplayName "iDRAC Orchestrator HTTP" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "iDRAC Orchestrator HTTPS" -ErrorAction SilentlyContinue
    
    # Allow inbound connections on port 3000
    New-NetFirewallRule -DisplayName "iDRAC Orchestrator HTTP" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
    New-NetFirewallRule -DisplayName "iDRAC Orchestrator HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow | Out-Null
    
    Write-Success "Firewall rules configured"
}

# Start services
function Start-Services {
    Write-Info "Starting services..."
    
    # Start application service
    try {
        Start-Service "iDRAC Orchestrator" -ErrorAction Stop
        Write-Success "Service started successfully"
    }
    catch {
        Write-Warning "Service failed to start: $($_.Exception.Message)"
        Write-Info "Attempting to start manually..."
        
        # Try to start the service using NSSM
        & nssm start "iDRAC Orchestrator" 2>$null
        
        # Wait a bit and check status
        Start-Sleep -Seconds 5
        $service = Get-Service "iDRAC Orchestrator" -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq "Running") {
            Write-Success "Service started successfully using NSSM"
        } else {
            Write-Warning "Service may need to be started manually"
            Write-Info "You can start it later with: nssm start 'iDRAC Orchestrator'"
        }
    }
    
    # Wait for application to start
    Write-Info "Waiting for application to start..."
    $timeout = 60
    $elapsed = 0
    $started = $false
    
    do {
        Start-Sleep -Seconds 3
        $elapsed += 3
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $started = $true
                break
            }
        }
        catch {
            # Check if it's a connection refused error (which means the server is not up yet)
            if ($_.Exception.Message -like "*connection refused*") {
                # Server not up yet, continue waiting
            }
            else {
                # Other error, might be a different issue
                Write-Warning "Connection attempt failed: $($_.Exception.Message)"
            }
        }
        
        Write-Host "." -NoNewline
    } while ($elapsed -lt $timeout)
    
    Write-Host ""
    if ($started) {
        Write-Success "Application started successfully"
    } else {
        Write-Warning "Application startup timed out after $timeout seconds"
        Write-Info "Check service status with: Get-Service 'iDRAC Orchestrator'"
        Write-Info "Check logs at: $DataPath\logs\ for more information"
        Write-Info "You can try starting the service manually with: nssm start 'iDRAC Orchestrator'"
        
        # Show the last few lines of the error log
        if (Test-Path "$DataPath\logs\error.log") {
            Write-Info "Last 10 lines of error log:"
            Get-Content "$DataPath\logs\error.log" -Tail 10
        }
    }
}

# Create desktop shortcut
function New-DesktopShortcut {
    Write-Info "Creating desktop shortcut..."
    
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\iDRAC Orchestrator.lnk")
    $Shortcut.TargetPath = "http://localhost:3000"
    $Shortcut.Description = "iDRAC Updater Orchestrator Web Interface"
    
    # Check if icon exists
    $iconPath = "$InstallPath\assets\icon.ico"
    if (Test-Path $iconPath) {
        $Shortcut.IconLocation = $iconPath
    }
    
    $Shortcut.Save()
    
    Write-Success "Desktop shortcut created"
}

# Test the application manually
function Test-Application {
    Write-Info "Testing application manually..."
    
    # Set environment variables
    $env:NODE_ENV = "production"
    
    # Start the application in the background
    $process = Start-Process -FilePath "node" -ArgumentList "$InstallPath\serve.js" -PassThru -WindowStyle Hidden
    
    # Wait a bit for the application to start
    Start-Sleep -Seconds 5
    
    # Check if the process is still running
    if (-not $process.HasExited) {
        Write-Success "Application started successfully manually"
        
        # Test the connection
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "Application is responding correctly"
            }
        }
        catch {
            Write-Warning "Application is running but not responding correctly: $($_.Exception.Message)"
        }
        
        # Stop the process
        Stop-Process -Id $process.Id -Force
    } else {
        Write-Error "Application failed to start manually"
        Write-Info "Check the error logs for more information"
    }
}

# Main installation function
function Start-Installation {
    try {
        Write-Info "Starting installation..."
        
        Remove-PreviousInstallation
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
        
        # Test the application manually if the service didn't start
        $service = Get-Service "iDRAC Orchestrator" -ErrorAction SilentlyContinue
        if (-not $service -or $service.Status -ne "Running") {
            Test-Application
        }
        
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
