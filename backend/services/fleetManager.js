const { execFile } = require('child_process');
const path = require('path');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

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
        logger.info('🛰️ Fleet Manager: Starting global update dispatch...');

        try {
            const tenants = await Tenant.find({
                isActive: true,
                vmIpAddress: { $exists: true, $ne: '' },
            });

            if (tenants.length === 0) {
                logger.warn('⚠️ Fleet Manager: No active silos found.');
                return [];
            }

            // Deploy sequentially to avoid overwhelming the Hub's SSH connections
            const results = [];
            for (const tenant of tenants) {
                try {
                    const result = await FleetManager.updateSilo(tenant);
                    results.push(result);
                } catch (error) {
                    logger.error(
                        { err: error, tenant: tenant.slug },
                        `❌ Failed to update silo ${tenant.slug}`,
                    );
                    results.push({ tenant: tenant.slug, status: 'failed', error: error.message });
                }
            }
            return results;
        } catch (err) {
            logger.error({ err }, '❌ Fleet Manager: Error dispatching updates');
            throw err;
        }
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
                    logger.error(
                        { err: error, stdout, stderr, tenantSlug: tenant.slug },
                        '❌ Fleet Manager: Exec Error during silo update',
                    );
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
