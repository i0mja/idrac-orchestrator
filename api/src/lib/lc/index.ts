export async function stageDup(_host: string, _image: string) {
  return { jobId: 'stub' };
}

export async function pollJob(_host: string, _jobId: string) {
  return 'Completed';
}
