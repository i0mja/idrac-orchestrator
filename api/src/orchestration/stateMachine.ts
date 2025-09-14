export type HostRunState =
  | 'PRECHECKS'
  | 'ENTER_MAINT'
  | 'APPLY'
  | 'REBOOT'
  | 'POSTCHECKS'
  | 'EXIT_MAINT'
  | 'DONE'
  | 'ERROR';

export async function runStateMachine(hostId: string): Promise<HostRunState> {
  console.log(`Running state machine for ${hostId}`);
  return 'DONE';
}
