import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';

interface Row {
  deviceName: string;
  serviceTag: string;
  networkAddress: string;
  model: string;
}

export function DiscoveryPreviewTable({ sample }: { sample: Row[] }) {
  if (!sample.length) return null;
  return (
    <div className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device Name</TableHead>
            <TableHead>Service Tag</TableHead>
            <TableHead>Network Address</TableHead>
            <TableHead>Model</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sample.map((row, i) => (
            <TableRow key={i}>
              <TableCell>{row.deviceName}</TableCell>
              <TableCell>{row.serviceTag}</TableCell>
              <TableCell>{row.networkAddress}</TableCell>
              <TableCell>{row.model}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption>
          Preview shows a sample of up to 25 devices; actual run may affect more.
        </TableCaption>
      </Table>
    </div>
  );
}
