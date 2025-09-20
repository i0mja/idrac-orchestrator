import { RedfishClient, RedfishClientOptions, RedfishError } from '../redfish/client.js';
import { classifyError, ProtocolError } from '../errors.js';
import type { DellGeneration, ServerIdentity } from './types.js';

export interface EnhancedRedfishCapabilities {
  generation: DellGeneration;
  firmwareVersion: string;
  licenseLevel: 'Basic' | 'Express' | 'Enterprise' | 'Datacenter' | 'Unknown';
  certificateStatus: 'valid' | 'expired' | 'self_signed' | 'untrusted';
  jobQueueStatus: 'available' | 'busy' | 'error';
  networkUpdateSupported: boolean;
  sessionSupported: boolean;
  supportedProtocols: string[];
  powerState: 'On' | 'Off' | 'Unknown';
  healthStatus: 'OK' | 'Warning' | 'Critical' | 'Unknown';
  lastBootTime?: string;
  uptime?: number;
}

export interface JobQueueEntry {
  id: string;
  name: string;
  status: 'Scheduled' | 'Running' | 'Completed' | 'Failed' | 'Pending';
  startTime?: string;
  endTime?: string;
  message?: string;
}

export class EnhancedRedfishClient extends RedfishClient {
  private _capabilities?: EnhancedRedfishCapabilities;
  
  constructor(options: RedfishClientOptions) {
    super(options);
  }

  /**
   * Enhanced capability detection with Dell-specific intelligence
   */
  async detectEnhancedCapabilities(): Promise<EnhancedRedfishCapabilities> {
    if (this._capabilities) {
      return this._capabilities;
    }

    try {
      // Get basic service root and manager info
      const [serviceRoot, managerInfo, jobQueue] = await Promise.allSettled([
        this.serviceRoot(),
        this.getManagerInfo(),
        this.getJobQueue().catch(() => ({ Jobs: [] }))
      ]);

      const root = serviceRoot.status === 'fulfilled' ? serviceRoot.value : {};
      const manager = managerInfo.status === 'fulfilled' ? managerInfo.value : {};
      const jobs = jobQueue.status === 'fulfilled' ? jobQueue.value : { Jobs: [] };

      // Detect iDRAC generation and version
      const firmwareVersion = manager.FirmwareVersion || 'Unknown';
      const generation = this.detectGeneration(firmwareVersion);
      
      // Detect license level from manager capabilities
      const licenseLevel = this.detectLicenseLevel(manager);
      
      // Check certificate status (simplified for now)
      const certificateStatus = await this.checkCertificateStatus();
      
      // Analyze job queue
      const jobQueueStatus = this.analyzeJobQueue(jobs.Jobs || []);
      
      // Check network update support based on license and generation
      const networkUpdateSupported = this.checkNetworkUpdateSupport(generation, licenseLevel);
      
      // Check session support
      const sessionSupported = Boolean(root.SessionService);
      
      // Get supported protocols
      const supportedProtocols = this.getSupportedProtocols(root);
      
      // Get power and health status
      const [powerState, healthStatus] = await Promise.allSettled([
        this.getPowerState(),
        this.getHealthStatus()
      ]);

      this._capabilities = {
        generation,
        firmwareVersion,
        licenseLevel,
        certificateStatus,
        jobQueueStatus,
        networkUpdateSupported,
        sessionSupported,
        supportedProtocols,
        powerState: powerState.status === 'fulfilled' ? powerState.value : 'Unknown',
        healthStatus: healthStatus.status === 'fulfilled' ? healthStatus.value : 'Unknown'
      };

      return this._capabilities;
    } catch (error) {
      throw new ProtocolError(
        `Enhanced capability detection failed: ${error instanceof Error ? error.message : String(error)}`,
        'REDFISH',
        classifyError(error)
      );
    }
  }

  /**
   * Dell-specific generation detection with improved accuracy
   */
  private detectGeneration(firmwareVersion: string): DellGeneration {
    if (!firmwareVersion || firmwareVersion === 'Unknown') return 'UNKNOWN';
    
    const version = firmwareVersion.toLowerCase();
    
    // iDRAC6 (11th Gen) - PowerEdge R610, R710, etc.
    if (version.includes('idrac6') || version.startsWith('1.')) return '11G';
    
    // iDRAC7 (12th Gen) - PowerEdge R620, R720, etc.
    if (version.includes('idrac7') || version.startsWith('2.')) return '12G';
    
    // iDRAC8 (13th Gen) - PowerEdge R630, R730, etc.
    if (version.includes('idrac8') || version.startsWith('3.') || version.startsWith('4.')) return '13G';
    
    // iDRAC9 (14th/15th Gen) - PowerEdge R640, R740, R650, R750, etc.
    if (version.includes('idrac9') || version.startsWith('5.') || version.startsWith('6.')) {
      // Distinguish between 14G and 15G based on minor version
      const majorVersion = parseInt(version.split('.')[0]);
      const minorVersion = parseInt(version.split('.')[1] || '0');
      
      if (majorVersion === 5 || (majorVersion === 6 && minorVersion < 10)) return '14G';
      return '15G';
    }
    
    // iDRAC9 (16th Gen) - PowerEdge R660, R760, etc.
    if (version.startsWith('7.') || version.startsWith('8.')) return '16G';
    
    return 'UNKNOWN';
  }

  /**
   * Detect iDRAC license level
   */
  private detectLicenseLevel(manager: any): EnhancedRedfishCapabilities['licenseLevel'] {
    const oem = manager.Oem?.Dell;
    if (oem?.License) {
      const license = oem.License.toLowerCase();
      if (license.includes('datacenter')) return 'Datacenter';
      if (license.includes('enterprise')) return 'Enterprise';
      if (license.includes('express')) return 'Express';
      if (license.includes('basic')) return 'Basic';
    }
    
    // Fallback: check available features
    const features = oem?.LicensedFeatures || [];
    if (features.length > 10) return 'Enterprise';
    if (features.length > 5) return 'Express';
    if (features.length > 0) return 'Basic';
    
    return 'Unknown';
  }

  /**
   * Check certificate status
   */
  private async checkCertificateStatus(): Promise<EnhancedRedfishCapabilities['certificateStatus']> {
    try {
      // For now, assume self-signed unless proven otherwise
      // In production, this would check the actual certificate
      return 'self_signed';
    } catch {
      return 'untrusted';
    }
  }

  /**
   * Analyze job queue status
   */
  private analyzeJobQueue(jobs: JobQueueEntry[]): EnhancedRedfishCapabilities['jobQueueStatus'] {
    if (!Array.isArray(jobs)) return 'error';
    
    const runningJobs = jobs.filter(job => job.status === 'Running' || job.status === 'Scheduled');
    const failedJobs = jobs.filter(job => job.status === 'Failed');
    
    if (failedJobs.length > 0) return 'error';
    if (runningJobs.length > 0) return 'busy';
    return 'available';
  }

  /**
   * Check network update support based on generation and license
   */
  private checkNetworkUpdateSupport(generation: DellGeneration, license: EnhancedRedfishCapabilities['licenseLevel']): boolean {
    // iDRAC6 has limited network update support
    if (generation === '11G') return false;
    
    // iDRAC7/8 requires Enterprise license for network updates
    if ((generation === '12G' || generation === '13G') && license === 'Basic') return false;
    
    // iDRAC9 has broad network update support
    if (generation === '14G' || generation === '15G' || generation === '16G') return true;
    
    return license === 'Enterprise' || license === 'Datacenter';
  }

  /**
   * Get supported protocols
   */
  private getSupportedProtocols(serviceRoot: any): string[] {
    const protocols = ['REDFISH'];
    
    if (serviceRoot.EventService) protocols.push('EVENTS');
    if (serviceRoot.SessionService) protocols.push('SESSIONS');
    if (serviceRoot.UpdateService) protocols.push('UPDATES');
    if (serviceRoot.Oem?.Dell?.Jobs) protocols.push('JOBS');
    
    return protocols;
  }

  /**
   * Get current power state
   */
  private async getPowerState(): Promise<EnhancedRedfishCapabilities['powerState']> {
    try {
      const systems = await this.get('/redfish/v1/Systems');
      const members = systems?.Members || [];
      
      if (members.length > 0) {
        const system = await this.get(members[0]['@odata.id']);
        return system?.PowerState || 'Unknown';
      }
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get overall health status
   */
  private async getHealthStatus(): Promise<EnhancedRedfishCapabilities['healthStatus']> {
    try {
      const chassis = await this.get('/redfish/v1/Chassis');
      const members = chassis?.Members || [];
      
      if (members.length > 0) {
        const chassisData = await this.get(members[0]['@odata.id']);
        const status = chassisData?.Status?.Health;
        
        if (status === 'OK') return 'OK';
        if (status === 'Warning') return 'Warning';
        if (status === 'Critical') return 'Critical';
      }
      
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get manager information
   */
  private async getManagerInfo(): Promise<any> {
    try {
      const managers = await this.get('/redfish/v1/Managers');
      const members = managers?.Members || [];
      
      if (members.length > 0) {
        return await this.get(members[0]['@odata.id']);
      }
      
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Get job queue information
   */
  async getJobQueue(): Promise<{ Jobs: JobQueueEntry[] }> {
    try {
      const jobs = await this.get('/redfish/v1/Managers/iDRAC.Embedded.1/Oem/Dell/Jobs');
      return {
        Jobs: (jobs?.Members || []).map((job: any) => ({
          id: job.Id || job['@odata.id'],
          name: job.Name || 'Unknown Job',
          status: job.JobStatus || 'Unknown',
          startTime: job.StartTime,
          endTime: job.EndTime,
          message: job.Message
        }))
      };
    } catch {
      return { Jobs: [] };
    }
  }

  /**
   * Clear stuck jobs from the queue
   */
  async clearJobQueue(force: boolean = false): Promise<boolean> {
    try {
      const clearUrl = '/redfish/v1/Managers/iDRAC.Embedded.1/Oem/Dell/Jobs/Actions/Oem.Dell.JobService.DeleteJobQueue';
      const payload = force ? { JobID: 'JID_CLEARALL_FORCE' } : { JobID: 'JID_CLEARALL' };
      
      const response = await this.request(clearUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Failed to clear job queue:', error);
      return false;
    }
  }

  /**
   * Validate server readiness for firmware updates
   */
  async validateUpdateReadiness(): Promise<{
    ready: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      const capabilities = await this.detectEnhancedCapabilities();
      
      // Check power state
      if (capabilities.powerState === 'Off') {
        issues.push('Server is powered off');
      }
      
      // Check health status
      if (capabilities.healthStatus === 'Critical') {
        issues.push('Server health is critical');
      } else if (capabilities.healthStatus === 'Warning') {
        warnings.push('Server health shows warnings');
      }
      
      // Check job queue
      if (capabilities.jobQueueStatus === 'error') {
        issues.push('Job queue has failed jobs - clear before proceeding');
        recommendations.push('Use RACADM jobqueue delete -i JID_CLEARALL_FORCE to clear stuck jobs');
      } else if (capabilities.jobQueueStatus === 'busy') {
        issues.push('Job queue is busy with running jobs');
        recommendations.push('Wait for current jobs to complete or clear them');
      }
      
      // Check network update support
      if (!capabilities.networkUpdateSupported) {
        if (capabilities.generation === '11G') {
          issues.push('iDRAC6 does not support network firmware updates. Use Lifecycle Controller or OS-based updates.');
        } else if (capabilities.licenseLevel === 'Basic') {
          issues.push('Basic license does not support network updates. Upgrade to Enterprise license.');
        }
      }
      
      // Check certificate status
      if (capabilities.certificateStatus === 'expired') {
        warnings.push('iDRAC certificate is expired');
        recommendations.push('Renew iDRAC certificate or configure certificate bypass');
      } else if (capabilities.certificateStatus === 'self_signed') {
        warnings.push('iDRAC uses self-signed certificate');
      }
      
      // Generation-specific recommendations
      if (capabilities.generation === '12G' || capabilities.generation === '13G') {
        recommendations.push('Consider updating iDRAC firmware to latest version for better update reliability');
      }
      
      return {
        ready: issues.length === 0,
        issues,
        warnings,
        recommendations
      };
    } catch (error) {
      return {
        ready: false,
        issues: [`Failed to validate readiness: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
        recommendations: ['Ensure iDRAC is accessible and credentials are correct']
      };
    }
  }
}