import { EnhancedRedfishClient, EnhancedRedfishCapabilities } from './enhancedRedfishClient.js';
import { ProtocolError } from '../errors.js';
import type { ServerIdentity, Credentials } from './types.js';

export interface HardwareHealthCheck {
  category: 'power' | 'thermal' | 'storage' | 'memory' | 'network' | 'firmware' | 'security';
  component: string;
  status: 'ok' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: Record<string, any>;
  blocking: boolean;
  recommendation?: string;
}

export interface HealthGateResult {
  passed: boolean;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  readinessScore: number; // 0-100
  checks: HardwareHealthCheck[];
  blockingIssues: HardwareHealthCheck[];
  warnings: HardwareHealthCheck[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    critical: number;
  };
  recommendations: string[];
  estimatedUpdateTime?: number; // minutes
  requiresReboot: boolean;
}

export class HardwareHealthGates {
  private client: EnhancedRedfishClient;
  
  constructor(identity: ServerIdentity, credentials: Credentials) {
    this.client = new EnhancedRedfishClient({
      baseUrl: `https://${identity.host}`,
      credentials
    });
  }

  /**
   * Perform comprehensive hardware health validation
   */
  async performHealthGate(): Promise<HealthGateResult> {
    const checks: HardwareHealthCheck[] = [];
    
    try {
      // Get enhanced capabilities first
      const capabilities = await this.client.detectEnhancedCapabilities();
      
      // Perform all health checks in parallel
      const checkResults = await Promise.allSettled([
        this.checkPowerSubsystem(capabilities),
        this.checkThermalStatus(capabilities),
        this.checkStorageHealth(capabilities),
        this.checkMemoryHealth(capabilities),
        this.checkNetworkHealth(capabilities),
        this.checkFirmwareReadiness(capabilities),
        this.checkSecurityStatus(capabilities)
      ]);
      
      // Collect all checks
      checkResults.forEach(result => {
        if (result.status === 'fulfilled') {
          checks.push(...result.value);
        } else {
          checks.push({
            category: 'firmware',
            component: 'health_check',
            status: 'critical',
            message: `Health check failed: ${result.reason}`,
            blocking: true
          });
        }
      });
      
      // Analyze results
      const blockingIssues = checks.filter(check => check.blocking && check.status === 'critical');
      const warnings = checks.filter(check => check.status === 'warning');
      const critical = checks.filter(check => check.status === 'critical');
      const passed = checks.filter(check => check.status === 'ok');
      
      const overallHealth = this.determineOverallHealth(blockingIssues.length, critical.length, warnings.length);
      const readinessScore = this.calculateReadinessScore(checks);
      const recommendations = this.generateRecommendations(checks, capabilities);
      
      return {
        passed: blockingIssues.length === 0,
        overallHealth,
        readinessScore,
        checks,
        blockingIssues,
        warnings,
        summary: {
          total: checks.length,
          passed: passed.length,
          warnings: warnings.length,
          critical: critical.length
        },
        recommendations,
        estimatedUpdateTime: this.estimateUpdateTime(capabilities),
        requiresReboot: this.determineRebootRequirement(capabilities)
      };
      
    } catch (error) {
      throw new ProtocolError(
        `Hardware health gate failed: ${error instanceof Error ? error.message : String(error)}`,
        'REDFISH',
        'permanent'
      );
    } finally {
      await this.client.destroy();
    }
  }

  /**
   * Check power subsystem health
   */
  private async checkPowerSubsystem(capabilities: EnhancedRedfishCapabilities): Promise<HardwareHealthCheck[]> {
    const checks: HardwareHealthCheck[] = [];
    
    try {
      // Check power state
      checks.push({
        category: 'power',
        component: 'system_power',
        status: capabilities.powerState === 'On' ? 'ok' : 'critical',
        message: `System power state: ${capabilities.powerState}`,
        blocking: capabilities.powerState !== 'On',
        recommendation: capabilities.powerState !== 'On' ? 'Power on the system before attempting firmware updates' : undefined
      });
      
      // Check power supplies
      const powerSupplies = await this.client.get('/redfish/v1/Chassis/System.Embedded.1/Power').catch(() => null);
      if (powerSupplies?.PowerSupplies) {
        powerSupplies.PowerSupplies.forEach((psu: any, index: number) => {
          const status = psu.Status?.Health;
          checks.push({
            category: 'power',
            component: `power_supply_${index + 1}`,
            status: status === 'OK' ? 'ok' : status === 'Warning' ? 'warning' : 'critical',
            message: `Power Supply ${index + 1}: ${status || 'Unknown'}`,
            blocking: status === 'Critical',
            details: { model: psu.Model, serialNumber: psu.SerialNumber }
          });
        });
      }
      
    } catch (error) {
      checks.push({
        category: 'power',
        component: 'power_check',
        status: 'unknown',
        message: `Power check failed: ${error instanceof Error ? error.message : String(error)}`,
        blocking: false
      });
    }
    
    return checks;
  }

  /**
   * Check thermal status
   */
  private async checkThermalStatus(capabilities: EnhancedRedfishCapabilities): Promise<HardwareHealthCheck[]> {
    const checks: HardwareHealthCheck[] = [];
    
    try {
      const thermal = await this.client.get('/redfish/v1/Chassis/System.Embedded.1/Thermal').catch(() => null);
      
      if (thermal?.Temperatures) {
        thermal.Temperatures.forEach((temp: any) => {
          if (temp.Name && temp.ReadingCelsius !== null) {
            const status = temp.Status?.Health;
            const reading = temp.ReadingCelsius;
            const upperThreshold = temp.UpperThresholdCritical;
            
            let tempStatus: HardwareHealthCheck['status'] = 'ok';
            let blocking = false;
            
            if (status === 'Critical' || (upperThreshold && reading > upperThreshold)) {
              tempStatus = 'critical';
              blocking = true;
            } else if (status === 'Warning' || (upperThreshold && reading > upperThreshold * 0.9)) {
              tempStatus = 'warning';
            }
            
            checks.push({
              category: 'thermal',
              component: temp.Name.toLowerCase().replace(/\s+/g, '_'),
              status: tempStatus,
              message: `${temp.Name}: ${reading}°C`,
              blocking,
              details: { reading, threshold: upperThreshold, units: 'Celsius' },
              recommendation: blocking ? 'Check thermal conditions and cooling before proceeding' : undefined
            });
          }
        });
      }
      
      // Check fans
      if (thermal?.Fans) {
        thermal.Fans.forEach((fan: any) => {
          if (fan.Name) {
            const status = fan.Status?.Health;
            const rpm = fan.Reading;
            
            checks.push({
              category: 'thermal',
              component: fan.Name.toLowerCase().replace(/\s+/g, '_'),
              status: status === 'OK' ? 'ok' : status === 'Warning' ? 'warning' : 'critical',
              message: `${fan.Name}: ${status || 'Unknown'}${rpm ? ` (${rpm} RPM)` : ''}`,
              blocking: status === 'Critical',
              details: { rpm, units: 'RPM' }
            });
          }
        });
      }
      
    } catch (error) {
      checks.push({
        category: 'thermal',
        component: 'thermal_check',
        status: 'unknown',
        message: `Thermal check failed: ${error instanceof Error ? error.message : String(error)}`,
        blocking: false
      });
    }
    
    return checks;
  }

  /**
   * Check storage health
   */
  private async checkStorageHealth(capabilities: EnhancedRedfishCapabilities): Promise<HardwareHealthCheck[]> {
    const checks: HardwareHealthCheck[] = [];
    
    try {
      const storage = await this.client.get('/redfish/v1/Systems/System.Embedded.1/Storage').catch(() => null);
      
      if (storage?.Members) {
        for (const member of storage.Members) {
          const storageController = await this.client.get(member['@odata.id']).catch(() => null);
          if (storageController) {
            const status = storageController.Status?.Health;
            checks.push({
              category: 'storage',
              component: storageController.Id || 'storage_controller',
              status: status === 'OK' ? 'ok' : status === 'Warning' ? 'warning' : 'critical',
              message: `Storage Controller ${storageController.Id}: ${status || 'Unknown'}`,
              blocking: status === 'Critical',
              details: { model: storageController.Model }
            });
            
            // Check drives
            if (storageController.Drives) {
              for (const driveRef of storageController.Drives) {
                const drive = await this.client.get(driveRef['@odata.id']).catch(() => null);
                if (drive) {
                  const driveStatus = drive.Status?.Health;
                  checks.push({
                    category: 'storage',
                    component: `drive_${drive.Id}`,
                    status: driveStatus === 'OK' ? 'ok' : driveStatus === 'Warning' ? 'warning' : 'critical',
                    message: `Drive ${drive.Id}: ${driveStatus || 'Unknown'}`,
                    blocking: driveStatus === 'Critical',
                    details: { 
                      capacity: drive.CapacityBytes,
                      mediaType: drive.MediaType,
                      model: drive.Model
                    }
                  });
                }
              }
            }
          }
        }
      }
      
    } catch (error) {
      checks.push({
        category: 'storage',
        component: 'storage_check',
        status: 'unknown',
        message: `Storage check failed: ${error instanceof Error ? error.message : String(error)}`,
        blocking: false
      });
    }
    
    return checks;
  }

  /**
   * Check memory health
   */
  private async checkMemoryHealth(capabilities: EnhancedRedfishCapabilities): Promise<HardwareHealthCheck[]> {
    const checks: HardwareHealthCheck[] = [];
    
    try {
      const memory = await this.client.get('/redfish/v1/Systems/System.Embedded.1/Memory').catch(() => null);
      
      if (memory?.Members) {
        for (const member of memory.Members) {
          const dimm = await this.client.get(member['@odata.id']).catch(() => null);
          if (dimm && dimm.Status?.State === 'Enabled') {
            const status = dimm.Status?.Health;
            checks.push({
              category: 'memory',
              component: `dimm_${dimm.Id}`,
              status: status === 'OK' ? 'ok' : status === 'Warning' ? 'warning' : 'critical',
              message: `Memory ${dimm.Id}: ${status || 'Unknown'}`,
              blocking: status === 'Critical',
              details: {
                capacity: dimm.CapacityMiB,
                speed: dimm.OperatingSpeedMhz,
                manufacturer: dimm.Manufacturer
              }
            });
          }
        }
      }
      
    } catch (error) {
      checks.push({
        category: 'memory',
        component: 'memory_check',
        status: 'unknown',
        message: `Memory check failed: ${error instanceof Error ? error.message : String(error)}`,
        blocking: false
      });
    }
    
    return checks;
  }

  /**
   * Check network health
   */
  private async checkNetworkHealth(capabilities: EnhancedRedfishCapabilities): Promise<HardwareHealthCheck[]> {
    const checks: HardwareHealthCheck[] = [];
    
    try {
      const networkInterfaces = await this.client.get('/redfish/v1/Systems/System.Embedded.1/NetworkInterfaces').catch(() => null);
      
      if (networkInterfaces?.Members) {
        for (const member of networkInterfaces.Members) {
          const netInterface = await this.client.get(member['@odata.id']).catch(() => null);
          if (netInterface) {
            const status = netInterface.Status?.Health;
            checks.push({
              category: 'network',
              component: `network_${netInterface.Id}`,
              status: status === 'OK' ? 'ok' : status === 'Warning' ? 'warning' : 'critical',
              message: `Network Interface ${netInterface.Id}: ${status || 'Unknown'}`,
              blocking: false, // Network issues typically don't block firmware updates
              details: { name: netInterface.Name }
            });
          }
        }
      }
      
    } catch (error) {
      checks.push({
        category: 'network',
        component: 'network_check',
        status: 'unknown',
        message: `Network check failed: ${error instanceof Error ? error.message : String(error)}`,
        blocking: false
      });
    }
    
    return checks;
  }

  /**
   * Check firmware readiness
   */
  private async checkFirmwareReadiness(capabilities: EnhancedRedfishCapabilities): Promise<HardwareHealthCheck[]> {
    const checks: HardwareHealthCheck[] = [];
    
    // Check job queue
    checks.push({
      category: 'firmware',
      component: 'job_queue',
      status: capabilities.jobQueueStatus === 'available' ? 'ok' : 'critical',
      message: `Job queue status: ${capabilities.jobQueueStatus}`,
      blocking: capabilities.jobQueueStatus !== 'available',
      recommendation: capabilities.jobQueueStatus !== 'available' ? 'Clear job queue before proceeding' : undefined
    });
    
    // Check network update support
    checks.push({
      category: 'firmware',
      component: 'network_update_support',
      status: capabilities.networkUpdateSupported ? 'ok' : 'critical',
      message: `Network update support: ${capabilities.networkUpdateSupported ? 'Available' : 'Not supported'}`,
      blocking: !capabilities.networkUpdateSupported,
      recommendation: !capabilities.networkUpdateSupported ? 'Use local update methods or upgrade iDRAC license' : undefined
    });
    
    // Check generation compatibility
    const generationStatus = capabilities.generation !== 'UNKNOWN' ? 'ok' : 'warning';
    checks.push({
      category: 'firmware',
      component: 'generation_detection',
      status: generationStatus,
      message: `Detected generation: ${capabilities.generation}`,
      blocking: false,
      details: { generation: capabilities.generation, firmware: capabilities.firmwareVersion }
    });
    
    return checks;
  }

  /**
   * Check security status
   */
  private async checkSecurityStatus(capabilities: EnhancedRedfishCapabilities): Promise<HardwareHealthCheck[]> {
    const checks: HardwareHealthCheck[] = [];
    
    // Check certificate status
    checks.push({
      category: 'security',
      component: 'certificate',
      status: capabilities.certificateStatus === 'valid' ? 'ok' : 'warning',
      message: `Certificate status: ${capabilities.certificateStatus}`,
      blocking: false,
      recommendation: capabilities.certificateStatus !== 'valid' ? 'Consider updating iDRAC certificate' : undefined
    });
    
    // Check license level
    checks.push({
      category: 'security',
      component: 'license',
      status: capabilities.licenseLevel === 'Unknown' ? 'warning' : 'ok',
      message: `License level: ${capabilities.licenseLevel}`,
      blocking: false,
      details: { license: capabilities.licenseLevel }
    });
    
    return checks;
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealth(blocking: number, critical: number, warnings: number): HealthGateResult['overallHealth'] {
    if (blocking > 0 || critical > 2) return 'critical';
    if (critical > 0 || warnings > 3) return 'degraded';
    return 'healthy';
  }

  /**
   * Calculate readiness score
   */
  private calculateReadinessScore(checks: HardwareHealthCheck[]): number {
    if (checks.length === 0) return 0;
    
    let score = 100;
    checks.forEach(check => {
      switch (check.status) {
        case 'critical':
          score -= check.blocking ? 50 : 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'unknown':
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(checks: HardwareHealthCheck[], capabilities: EnhancedRedfishCapabilities): string[] {
    const recommendations: string[] = [];
    
    // Collect specific recommendations from checks
    checks.forEach(check => {
      if (check.recommendation) {
        recommendations.push(check.recommendation);
      }
    });
    
    // Generation-specific recommendations
    if (capabilities.generation === '12G' || capabilities.generation === '13G') {
      recommendations.push('Consider updating iDRAC firmware to latest version for improved reliability');
    }
    
    // License recommendations
    if (capabilities.licenseLevel === 'Basic') {
      recommendations.push('Upgrade to Enterprise license for enhanced firmware management features');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Estimate update time based on system characteristics
   */
  private estimateUpdateTime(capabilities: EnhancedRedfishCapabilities): number {
    let baseTime = 15; // Base 15 minutes for simple updates
    
    // Adjust based on generation
    if (capabilities.generation === '11G' || capabilities.generation === '12G') {
      baseTime += 10; // Older systems take longer
    }
    
    // Add time for complex updates
    if (capabilities.licenseLevel === 'Enterprise' || capabilities.licenseLevel === 'Datacenter') {
      baseTime += 5; // More components to update
    }
    
    return baseTime;
  }

  /**
   * Determine if reboot is required
   */
  private determineRebootRequirement(capabilities: EnhancedRedfishCapabilities): boolean {
    // Most firmware updates require reboot, except for some iDRAC updates
    return true;
  }
}