const { execFile } = require('child_process');
const path = require('path');
const Tenant = require('../models/Tenant');

/**
 * Fleet Manager Service
 * Manages updates and health checks across all siloed VMs.
 * 
 * Security: Uses execFile() instead of exec() to prevent shell injection.
 * All arguments are passed as an array, never interpolated into a shell string.
 */
class FleetManager {
    /**
     * Triggers a remote update for all active tenants with a registered VM.
     * @returns {Promise<Array>} Results of each silo update.
     */
    static async updateAllSilos() {
        console.log('🛰️ Fleet Manager: Starting global update dispatch...');

        const tenants = await Tenant.find({
            isActive: true,
            vmIpAddress: { $exists: true, $ne: '' },
        });

        if (tenants.length === 0) {
            console.log('⚠️ Fleet Manager: No active silos found.');
            return [];
        }

        // Deploy sequentially to avoid overwhelming the Hub's SSH connections
        const results = [];
        for (const tenant of tenants) {
            try {
                const result = await FleetManager.updateSilo(tenant);
                results.push(result);
            } catch (error) {
                console.error(`❌ Failed to update silo ${tenant.slug}:`, error.message);
                results.push({ tenant: tenant.slug, status: 'failed', error: error.message });
            }
        }

        return results;
    }

    /**
     * Triggers a remote update for a specific tenant silo.
     * @param {Object} tenant - The Tenant document.
     * @returns {Promise<Object>} Result of the deployment.
     */
    static async updateSilo(tenant) {
        const startTime = Date.now();
        if (!tenant.vmIpAddress || !tenant.sshKeyRef) {
            throw new Error(`Tenant ${tenant.slug} is missing vmIpAddress or sshKeyRef.`);
        }

        tenant.deploymentStatus = 'deploying';
        await tenant.save();

        const scriptPath = path.join(__dirname, '../../scripts/remote-deploy.sh');
        // execFile passes args as array — prevents shell injection
        const args = [tenant.vmIpAddress, `~/.ssh/${tenant.sshKeyRef}`, tenant.slug];

        return new Promise((resolve, reject) => {
            const isWindows = process.platform === 'win32';
            const cmd = isWindows ? 'bash' : scriptPath;
            const cmdArgs = isWindows ? [scriptPath, ...args] : args;

            execFile(cmd, cmdArgs, { timeout: 300000 }, async (error, stdout, stderr) => {
                const duration = Date.now() - startTime;
                if (error) {
                    console.error('Exec Error:', error.message);
                    console.error('Stderr:', stderr);
                    tenant.deploymentStatus = 'failed';
                    await tenant.save();
                    return reject(error);
                }

                tenant.deploymentStatus = 'active';
                tenant.lastDeploymentDuration = duration;
                await tenant.save();
                resolve({ tenant: tenant.slug, status: 'success', output: stdout });
            });
        });
    }
}

module.exports = FleetManager;
