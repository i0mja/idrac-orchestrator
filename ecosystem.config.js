// PM2 ecosystem configuration for production deployment
module.exports = {
  apps: [
    {
      name: 'idrac-orchestrator',
      script: 'dist/server/index.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart settings
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Advanced options
      watch: false, // Disable for production
      ignore_watch: ['node_modules', 'logs', 'tmp'],
      
      // Environment variables
      env_file: '.env.production',
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Autorestart
      autorestart: true,
      
      // Node.js options
      node_args: '--max-old-space-size=2048'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server-1', 'production-server-2'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/idrac-updater-orchestrator.git',
      path: '/opt/idrac-orchestrator',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'sudo mkdir -p /opt/idrac-orchestrator && sudo chown deploy:deploy /opt/idrac-orchestrator'
    },
    
    staging: {
      user: 'deploy',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/idrac-updater-orchestrator.git',
      path: '/opt/idrac-orchestrator-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};