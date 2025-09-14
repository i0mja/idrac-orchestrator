import { exec } from 'node:child_process';

export interface RacadmUpdateInput {
  idracHost: string; user: string; pass: string;
  method: 'fwupdate'|'update';
  source: 'CLIENT'|'FTP'|'TFTP'|'HTTP';
  path: string;
  ftp?: { host:string; user:string; pass:string; file:string };
}

export async function runRacadm(input: RacadmUpdateInput) {
  const base = `ssh ${input.user}@${input.idracHost}`;
  let cmd = '';
  if (input.method === 'fwupdate') {
    if (input.source === 'CLIENT') {
      cmd = `racadm fwupdate -p -u -d ${input.path}`;
    } else if (input.source === 'FTP' && input.ftp) {
      cmd = `racadm fwupdate -f ${input.ftp.host} ${input.ftp.user} ${input.ftp.pass} -d ${input.ftp.file}`;
    } else {
      cmd = `racadm fwupdate -f ${input.path}`;
    }
  } else {
    cmd = `racadm update -f ${input.path}`;
  }
  return new Promise<{stdout:string;stderr:string}>((resolve, reject) => {
    exec(`${base} "${cmd}"`, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}
