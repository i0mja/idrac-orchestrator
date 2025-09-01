import { CredentialManagement } from "@/components/credentials/CredentialManagement";

export function CredentialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">Credential Management</h1>
        <p className="text-muted-foreground text-lg">
          Configure authentication credentials for network discovery and server management
        </p>
      </div>
      
      <CredentialManagement />
    </div>
  );
}

export default CredentialsPage;