import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { 
  Upload, 
  File, 
  CheckCircle, 
  AlertTriangle,
  X,
  HardDrive,
  Cpu,
  Network,
  Monitor
} from "lucide-react";

interface FirmwareUploadProps {
  onClose: () => void;
}

interface FirmwareFile {
  file: File;
  name: string;
  version: string;
  firmware_type: 'idrac' | 'bios' | 'storage' | 'network' | 'other';
  component_name?: string;
  description?: string;
  applicable_models: string[];
}

export function FirmwareUpload({ onClose }: FirmwareUploadProps) {
  const [files, setFiles] = useState<FirmwareFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadPackage } = useFirmwarePackages();

  const firmwareTypes = [
    { value: 'idrac', label: 'iDRAC', icon: Monitor },
    { value: 'bios', label: 'BIOS', icon: Cpu },
    { value: 'storage', label: 'Storage Controller', icon: HardDrive },
    { value: 'network', label: 'Network Adapter', icon: Network },
    { value: 'other', label: 'Other', icon: File }
  ];

  const dellServerModels = [
    'PowerEdge R740', 'PowerEdge R750', 'PowerEdge R640', 'PowerEdge R650',
    'PowerEdge R440', 'PowerEdge R450', 'PowerEdge R340', 'PowerEdge R350',
    'PowerEdge R240', 'PowerEdge R250', 'PowerEdge T640', 'PowerEdge T550',
    'PowerEdge T440', 'PowerEdge T340', 'PowerEdge T150'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles = selectedFiles.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      version: '',
      firmware_type: 'other' as const,
      component_name: '',
      description: '',
      applicable_models: []
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const updateFile = (index: number, updates: Partial<FirmwareFile>) => {
    setFiles(prev => prev.map((file, i) => i === index ? { ...file, ...updates } : file));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateFiles = (): string[] => {
    const errors: string[] = [];
    
    files.forEach((file, index) => {
      if (!file.name.trim()) {
        errors.push(`File ${index + 1}: Name is required`);
      }
      if (!file.version.trim()) {
        errors.push(`File ${index + 1}: Version is required`);
      }
      if (file.applicable_models.length === 0) {
        errors.push(`File ${index + 1}: At least one applicable model is required`);
      }
    });

    return errors;
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    
    // Create storage bucket if it doesn't exist
    try {
      await supabase.storage.createBucket('firmware-packages', { public: false });
    } catch (error) {
      // Bucket might already exist, ignore error
    }

    const { data, error } = await supabase.storage
      .from('firmware-packages')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data.path;
  };

  const calculateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUpload = async () => {
    const errors = validateFiles();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const firmwareFile = files[i];
        
        // Update progress
        setUploadProgress((i / files.length) * 100);

        // Upload file to storage
        const filePath = await uploadToStorage(firmwareFile.file);
        
        // Calculate checksum
        const checksum = await calculateChecksum(firmwareFile.file);

        // Create firmware package record
        const packageData = {
          name: firmwareFile.name,
          version: firmwareFile.version,
          firmware_type: firmwareFile.firmware_type,
          component_name: firmwareFile.component_name || null,
          file_path: filePath,
          file_size: firmwareFile.file.size,
          checksum,
          release_date: new Date().toISOString().split('T')[0],
          applicable_models: firmwareFile.applicable_models,
          description: firmwareFile.description || null
        };

        await uploadPackage(packageData);
      }

      setUploadProgress(100);
      
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${files.length} firmware package(s)`,
      });

      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload firmware packages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <Card className="card-enterprise">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Firmware Packages
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed border-2 h-32 hover:bg-muted/50"
          >
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to select firmware files</p>
              <p className="text-xs text-muted-foreground">
                Supports .exe, .bin, .img, .zip files
              </p>
            </div>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".exe,.bin,.img,.zip,.dell,.DUP"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Firmware Files ({files.length})</h4>
            {files.map((firmwareFile, index) => {
              const TypeIcon = firmwareTypes.find(t => t.value === firmwareFile.firmware_type)?.icon || File;
              
              return (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TypeIcon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{firmwareFile.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(firmwareFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`name-${index}`}>Package Name *</Label>
                      <Input
                        id={`name-${index}`}
                        value={firmwareFile.name}
                        onChange={(e) => updateFile(index, { name: e.target.value })}
                        disabled={uploading}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`version-${index}`}>Version *</Label>
                      <Input
                        id={`version-${index}`}
                        value={firmwareFile.version}
                        onChange={(e) => updateFile(index, { version: e.target.value })}
                        placeholder="1.0.0"
                        disabled={uploading}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`type-${index}`}>Firmware Type *</Label>
                      <Select
                        value={firmwareFile.firmware_type}
                        onValueChange={(value) => updateFile(index, { firmware_type: value as any })}
                        disabled={uploading}
                      >
                        <SelectTrigger id={`type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {firmwareTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="w-4 h-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`component-${index}`}>Component Name</Label>
                      <Input
                        id={`component-${index}`}
                        value={firmwareFile.component_name}
                        onChange={(e) => updateFile(index, { component_name: e.target.value })}
                        placeholder="e.g., PERC H730P"
                        disabled={uploading}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`models-${index}`}>Applicable Models *</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {firmwareFile.applicable_models.map((model, modelIndex) => (
                          <Badge key={modelIndex} variant="outline">
                            {model}
                            <button
                              onClick={() => updateFile(index, { 
                                applicable_models: firmwareFile.applicable_models.filter((_, i) => i !== modelIndex) 
                              })}
                              className="ml-1 hover:text-destructive"
                              disabled={uploading}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Select
                        onValueChange={(value) => {
                          if (!firmwareFile.applicable_models.includes(value)) {
                            updateFile(index, { 
                              applicable_models: [...firmwareFile.applicable_models, value] 
                            });
                          }
                        }}
                        disabled={uploading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Add server model" />
                        </SelectTrigger>
                        <SelectContent>
                          {dellServerModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`description-${index}`}>Description</Label>
                    <Textarea
                      id={`description-${index}`}
                      value={firmwareFile.description}
                      onChange={(e) => updateFile(index, { description: e.target.value })}
                      placeholder="Brief description of this firmware update..."
                      rows={2}
                      disabled={uploading}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploading} 
              className="bg-gradient-primary w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : `Upload ${files.length} Package(s)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}