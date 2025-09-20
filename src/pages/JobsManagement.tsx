import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackgroundJobsPanel from '@/components/jobs/BackgroundJobsPanel';
import StateMachinePanel from '@/components/jobs/StateMachinePanel';
import WorkflowManagementPanel from '@/components/jobs/WorkflowManagementPanel';

const JobsManagement = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jobs Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage background jobs, state machines, and workflows
        </p>
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
          <TabsTrigger value="state-machines">State Machines</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>
        
        <TabsContent value="jobs" className="space-y-6">
          <BackgroundJobsPanel />
        </TabsContent>
        
        <TabsContent value="state-machines" className="space-y-6">
          <StateMachinePanel />
        </TabsContent>
        
        <TabsContent value="workflows" className="space-y-6">
          <WorkflowManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobsManagement;