"use client";

import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, X, Upload, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileImageCaptureProps {
  onImageCapture?: (imageData: string, file: File) => void;
  onImageUpload?: (file: File) => void;
  maxImages?: number;
  allowUpload?: boolean;
  className?: string;
}

export function MobileImageCapture({
  onImageCapture,
  onImageUpload,
  maxImages = 1,
  allowUpload = true,
  className,
}: MobileImageCaptureProps) {
  const [images, setImages] = useState<Array<{ data: string; file: File }>>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Kamera nicht verfügbar. Bitte überprüfen Sie die Berechtigungen.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const reader = new FileReader();
            
            reader.onload = () => {
              const imageData = reader.result as string;
              const newImage = { data: imageData, file };
              
              if (images.length < maxImages) {
                setImages(prev => [...prev, newImage]);
                onImageCapture?.(imageData, file);
              }
            };
            
            reader.readAsDataURL(blob);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  }, [images.length, maxImages, onImageCapture]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (images.length < maxImages && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = () => {
          const imageData = reader.result as string;
          const newImage = { data: imageData, file };
          
          setImages(prev => [...prev, newImage]);
          onImageUpload?.(file);
        };
        
        reader.readAsDataURL(file);
      }
    });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className={cn("glassmorphism-card", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Bildaufnahme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View */}
        {isCapturing ? (
          <div className="relative space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera Controls */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={switchCamera}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopCamera}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Capture Button */}
            <div className="flex justify-center">
              <Button
                onClick={captureImage}
                disabled={images.length >= maxImages}
                className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90"
              >
                <Camera className="h-8 w-8" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Start Camera Button */}
            <Button
              onClick={startCamera}
              className="w-full h-16 flex items-center justify-center space-x-2"
            >
              <Camera className="h-6 w-6" />
              <span className="font-medium">Kamera starten</span>
            </Button>

            {/* Upload Button */}
            {allowUpload && (
              <Button
                variant="outline"
                onClick={triggerFileUpload}
                className="w-full h-16 flex items-center justify-center space-x-2"
              >
                <Upload className="h-6 w-6" />
                <span className="font-medium">Bild hochladen</span>
              </Button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Image Preview */}
        {images.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Aufgenommene Bilder ({images.length}/{maxImages})
              </span>
              {isCapturing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                >
                  Kamera schließen
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.data}
                    alt={`Capture ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  
                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {images.length === 0 && !isCapturing && (
          <div className="text-center text-sm text-muted-foreground">
            <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>Tippen Sie auf "Kamera starten" oder laden Sie ein Bild hoch</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}