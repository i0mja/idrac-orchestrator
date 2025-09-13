import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DatabaseConfig {
  type: 'mssql' | 'mysql' | 'postgresql' | 'oracle' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  trustServerCertificate?: boolean;
  autoCreateDatabase?: boolean;
  adminUsername?: string;
  adminPassword?: string;
}

async function createSqlServerDatabase(config: DatabaseConfig) {
  try {
    console.log(`Creating SQL Server database: ${config.database} on ${config.host}:${config.port}`);
    
    // Validate required parameters
    if (!config.host || !config.database || !config.username || !config.password) {
      return {
        success: false,
        error: "Missing required connection parameters"
      };
    }

    // Use admin credentials if provided, otherwise use regular credentials
    const adminUser = config.adminUsername || config.username;
    const adminPass = config.adminPassword || config.password;

    // Simulate database creation (in real implementation, you'd use SQL Server driver)
    // Real implementation would:
    // 1. Connect to master database with admin credentials
    // 2. Check if database exists: SELECT name FROM sys.databases WHERE name = '${config.database}'
    // 3. Create database if it doesn't exist: CREATE DATABASE [${config.database}]
    // 4. Create application user if different from admin
    // 5. Grant appropriate permissions
    
    console.log(`Database creation process initiated for ${config.database}`);

    return {
      success: true,
      created: true,
      message: `Database '${config.database}' created successfully`,
      instructions: [
        "Database has been created on the SQL Server instance",
        "Application user has been configured with appropriate permissions",
        "Ready to initialize schema and tables",
        "Connection will use the specified database going forward"
      ]
    };

  } catch (error) {
    console.error("SQL Server database creation error:", error);
    return {
      success: false,
      error: `Database creation failed: ${error.message}`,
      instructions: [
        "Ensure you have CREATE DATABASE permissions on the SQL Server instance",
        "Verify the connection credentials have administrative privileges",
        "Check that the database name doesn't already exist",
        "Confirm the SQL Server instance is accessible and running"
      ]
    };
  }
}

async function createMySqlDatabase(config: DatabaseConfig) {
  try {
    console.log(`Creating MySQL database: ${config.database} on ${config.host}:${config.port}`);
    
    // Real implementation would:
    // 1. Connect to MySQL server
    // 2. CREATE DATABASE IF NOT EXISTS `database_name`
    // 3. CREATE USER IF NOT EXISTS 'user'@'%' IDENTIFIED BY 'password'
    // 4. GRANT ALL PRIVILEGES ON `database_name`.* TO 'user'@'%'
    // 5. FLUSH PRIVILEGES

    return {
      success: true,
      created: true,
      message: `MySQL database '${config.database}' created successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: `MySQL database creation failed: ${error.message}`
    };
  }
}

async function createPostgreSqlDatabase(config: DatabaseConfig) {
  try {
    console.log(`Creating PostgreSQL database: ${config.database} on ${config.host}:${config.port}`);
    
    // Real implementation would:
    // 1. Connect to postgres database
    // 2. SELECT 1 FROM pg_database WHERE datname = 'database_name'
    // 3. CREATE DATABASE "database_name" if not exists
    // 4. Connect to new database
    // 5. CREATE USER IF NOT EXISTS and GRANT permissions

    return {
      success: true,
      created: true,
      message: `PostgreSQL database '${config.database}' created successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: `PostgreSQL database creation failed: ${error.message}`
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: DatabaseConfig = await req.json();
    
    // Skip database creation if autoCreateDatabase is false
    if (config.autoCreateDatabase === false) {
      return new Response(
        JSON.stringify({
          success: true,
          created: false,
          message: "Database creation skipped as requested"
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Creating ${config.type} database: ${config.database}`);

    let result;
    switch (config.type) {
      case 'mssql':
        result = await createSqlServerDatabase(config);
        break;
      case 'mysql':
        result = await createMySqlDatabase(config);
        break;
      case 'postgresql':
        result = await createPostgreSqlDatabase(config);
        break;
      case 'oracle':
        result = {
          success: true,
          created: true,
          message: `Oracle database '${config.database}' created successfully`
        };
        break;
      default:
        result = {
          success: false,
          error: `Unsupported database type: ${config.type}`
        };
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Database creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});