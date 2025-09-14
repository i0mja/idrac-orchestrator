import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { Download, Search, RefreshCw, Server } from "lucide-react";

interface DellFirmwareItem {
  id: string;
  name: string;
  version: string;
  releaseDate: string;
  fileSize: number;
  downloadUrl: string;
  category: string;
  description: string;
  supportedModels: string[];
}

interface DellDownloadProps {
  onClose: () => void;
}

export function DellDownload({ onClose }: DellDownloadProps) {
  const [searchModel, setSearchModel] = useState('');
  const [firmwareType, setFirmwareType] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<DellFirmwareItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});
  const { toast } = useToast();
  const { fetchPackages } = useFirmwarePackages();

  // Popular Dell server models for quick selection
  const popularModels = [
    'PowerEdge R740',
    'PowerEdge R750',
    'PowerEdge R640',
    'PowerEdge R650',
    'PowerEdge R730',
    'PowerEdge R720',
    'PowerEdge R620',
    'PowerEdge R540',
    'PowerEdge R440',
    'PowerEdge R340'
  ];

  const handleSearch = async () => {
    if (!searchModel.trim()) {
      toast({
        title: "Error",
        description: "Please enter a server model to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-dell-firmware', {
        body: {
          model: searchModel.trim(),
          firmwareType: firmwareType === 'all' ? undefined : firmwareType
        }
      });

      if (error) throw error;
      
      setSearchResults(data?.results || []);
      
      if (data?.results?.length === 0) {
        toast({
          title: "No Results",
          description: "No firmware found for the specified model",
        });
      } else {
        // Show different messages based on data source
        if (data?.source === 'sample_data') {
          toast({
            title: "Sample Data Returned",
            description: `Found ${data.results.length} sample firmware items. ${data.notice}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Search Complete",
            description: `Found ${data.results.length} firmware items from Dell repository`,
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search Dell firmware repository",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (item: DellFirmwareItem) => {
    setDownloadingItems(prev => new Set(prev).add(item.id));
    
    try {
      const { data, error } = await supabase.functions.invoke('download-dell-firmware', {
        body: {
          firmwareItem: item
        }
      });

      if (error) throw error;

      await fetchPackages();
      
      if (data?.isReferenceOnly) {
        toast({
          title: "Reference Entry Created",
          description: `${item.name} reference added. Download actual firmware from Dell support site.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Download Complete",
          description: data?.message || `${item.name} has been downloaded and added to your firmware packages`,
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download ${item.name}`,
        variant: "destructive",
      });
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getFirmwareTypeBadge = (category: string) => {
    const type = category.toLowerCase();
    if (type.includes('idrac')) return 'idrac';
    if (type.includes('bios')) return 'bios';
    if (type.includes('storage') || type.includes('raid')) return 'storage';
    if (type.includes('network') || type.includes('nic')) return 'network';
    return 'other';
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Download from Dell Repository</DialogTitle>
        <DialogDescription>
          Search and download firmware packages directly from Dell's support repository
        </DialogDescription>
      </DialogHeader>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Search Dell Firmware
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Model</label>
              <Select value={searchModel} onValueChange={setSearchModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type a model..." />
                </SelectTrigger>
                <SelectContent>
                  {popularModels.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or enter custom model..."
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Firmware Type</label>
              <Select value={firmwareType} onValueChange={setFirmwareType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="idrac">iDRAC</SelectItem>
                  <SelectItem value="bios">BIOS</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                className="flex-1"
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Search Results ({searchResults.length})</h3>
                <Badge variant="outline" className="text-xs">
                  Showing Dell firmware for {searchModel}
                </Badge>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((item) => (
                  <div key={item.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          <Badge variant="outline">{getFirmwareTypeBadge(item.category)}</Badge>
                          <Badge variant="secondary">v{item.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatFileSize(item.fileSize)} • Released: {new Date(item.releaseDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.supportedModels.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Supported models: {item.supportedModels.join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleDownload(item)}
                        disabled={downloadingItems.has(item.id)}
                        size="sm"
                      >
                        {downloadingItems.has(item.id) ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        {downloadingItems.has(item.id) ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}