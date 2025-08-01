import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, Eye, Database, Network } from 'lucide-react';

interface HostStats {
  total: number;
  vcenterManaged: number;
  standalone: number;
}

interface VennDiagramProps {
  stats: HostStats;
  onSegmentClick?: (segment: 'total' | 'vcenter' | 'standalone') => void;
}

export function HostInventoryVenn({ stats, onSegmentClick }: VennDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !stats) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 400;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create main container
    const container = svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', 'transparent');

    // Define circles for Venn diagram
    const radius = 80;
    const separation = 100;

    // Since vCenter and standalone are disjoint sets (as per your spec),
    // we'll create two separate circles that don't overlap
    const vcenterCircle = {
      cx: centerX - separation / 2,
      cy: centerY,
      r: radius,
      id: 'vcenter'
    };

    const standaloneCircle = {
      cx: centerX + separation / 2, 
      cy: centerY,
      r: radius,
      id: 'standalone'
    };

    // Color scheme
    const colors = {
      vcenter: '#3b82f6', // Blue
      standalone: '#10b981', // Green
      total: '#6366f1' // Purple for total boundary
    };

    // Add outer boundary for "All Dell Hosts"
    const totalBoundary = container
      .append('ellipse')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('rx', radius * 2.2)
      .attr('ry', radius * 1.3)
      .attr('fill', 'none')
      .attr('stroke', colors.total)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5')
      .style('cursor', 'pointer')
      .on('click', () => handleSegmentClick('total'))
      .on('mouseover', () => setHoveredSegment('total'))
      .on('mouseout', () => setHoveredSegment(null));

    // Add vCenter managed hosts circle
    const vcenterGroup = container
      .append('circle')
      .attr('cx', vcenterCircle.cx)
      .attr('cy', vcenterCircle.cy)
      .attr('r', vcenterCircle.r)
      .attr('fill', colors.vcenter)
      .attr('fill-opacity', hoveredSegment === 'vcenter' ? 0.8 : 0.6)
      .attr('stroke', colors.vcenter)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', () => handleSegmentClick('vcenter'))
      .on('mouseover', () => setHoveredSegment('vcenter'))
      .on('mouseout', () => setHoveredSegment(null));

    // Add standalone hosts circle
    const standaloneGroup = container
      .append('circle')
      .attr('cx', standaloneCircle.cx)
      .attr('cy', standaloneCircle.cy)
      .attr('r', standaloneCircle.r)
      .attr('fill', colors.standalone)
      .attr('fill-opacity', hoveredSegment === 'standalone' ? 0.8 : 0.6)
      .attr('stroke', colors.standalone)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', () => handleSegmentClick('standalone'))
      .on('mouseover', () => setHoveredSegment('standalone'))
      .on('mouseout', () => setHoveredSegment(null));

    // Add labels
    container
      .append('text')
      .attr('x', vcenterCircle.cx)
      .attr('y', vcenterCircle.cy - 10)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .text('vCenter');

    container
      .append('text')
      .attr('x', vcenterCircle.cx)
      .attr('y', vcenterCircle.cy + 5)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .text('Managed');

    container
      .append('text')
      .attr('x', vcenterCircle.cx)
      .attr('y', vcenterCircle.cy + 20)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .text(stats.vcenterManaged);

    container
      .append('text')
      .attr('x', standaloneCircle.cx)
      .attr('y', standaloneCircle.cy - 10)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .text('Standalone');

    container
      .append('text')
      .attr('x', standaloneCircle.cx)
      .attr('y', standaloneCircle.cy + 5)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .text('Hosts');

    container
      .append('text')
      .attr('x', standaloneCircle.cx)
      .attr('y', standaloneCircle.cy + 20)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .text(stats.standalone);

    // Total label (outside)
    container
      .append('text')
      .attr('x', centerX)
      .attr('y', centerY - radius * 1.6)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', colors.total)
      .text(`All Dell Hosts (${stats.total})`);

  }, [stats, hoveredSegment]);

  const handleSegmentClick = (segment: 'total' | 'vcenter' | 'standalone') => {
    setSelectedSegment(segment);
    onSegmentClick?.(segment);
  };

  return (
    <Card className="card-enterprise">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Global Host Inventory
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-blue-600">
            <Network className="w-3 h-3 mr-1" />
            vCenter: {stats.vcenterManaged}
          </Badge>
          <Badge variant="outline" className="text-green-600">
            <Server className="w-3 h-3 mr-1" />
            Standalone: {stats.standalone}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <svg ref={svgRef} className="mb-4" />
          
          {hoveredSegment && (
            <div className="text-sm text-muted-foreground text-center p-2 bg-muted/30 rounded-lg">
              {hoveredSegment === 'total' && `Total Dell hosts in inventory: ${stats.total}`}
              {hoveredSegment === 'vcenter' && `Hosts managed by vCenter clusters: ${stats.vcenterManaged}`}
              {hoveredSegment === 'standalone' && `Standalone hosts with iDRAC access: ${stats.standalone}`}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 w-full mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSegmentClick('total')}
              className={selectedSegment === 'total' ? 'bg-purple-100' : ''}
            >
              <Eye className="w-4 h-4 mr-1" />
              All ({stats.total})
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSegmentClick('vcenter')}
              className={selectedSegment === 'vcenter' ? 'bg-blue-100' : ''}
            >
              <Network className="w-4 h-4 mr-1" />
              vCenter ({stats.vcenterManaged})
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSegmentClick('standalone')}
              className={selectedSegment === 'standalone' ? 'bg-green-100' : ''}
            >
              <Server className="w-4 h-4 mr-1" />
              Standalone ({stats.standalone})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}