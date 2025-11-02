'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Wand2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeImage, AnalyzeImageOutput } from '@/ai/flows/analyze-image';
import { type AppService } from '@/lib/service';
import { useRouter } from 'next/navigation';
import { WholesalerOrder } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface BillScannerTabProps {
    service: AppService;
    onOrderCreated: (newOrder: WholesalerOrder) => void;
}

const BillScannerTab: React.FC<BillScannerTabProps> = ({ service, onOrderCreated }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const router = useRouter();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile || !previewUrl) {
            toast({
                variant: 'destructive',
                title: 'No file selected',
                description: 'Please select an image of a bill to analyze.',
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await analyzeImage({ photoDataUri: previewUrl });
            
            if (!result || !result.items || result.items.length === 0) {
                 toast({
                    variant: 'destructive',
                    title: 'Analysis Failed',
                    description: 'Could not extract any items from the bill. Please try another image.',
                });
                return;
            }

            const newOrder = await service.addWholesalerOrder({
                wholesalerName: result.wholesalerName || 'Scanned Order',
                items: result.items,
            });

            onOrderCreated(newOrder);

            toast({
                title: 'Analysis Complete!',
                description: `Created new order with ${result.items.length} items from wholesaler "${newOrder.wholesalerName}".`,
            });
            
            // Navigate to the order list tab to show the new order
            router.push('/?open_order_tab=true');

        } catch (error) {
            console.error('Error analyzing image:', error);
            const errorMessage = (error instanceof Error && error.message.includes('API key not valid'))
                ? 'The AI feature is not configured. An API key is required.'
                : 'An unexpected error occurred. This feature requires an internet connection.';

            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
            setSelectedFile(null);
            setPreviewUrl(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Bill Scanner</CardTitle>
                <CardDescription>
                    Upload a photo of a wholesaler bill, and the AI will automatically create an order list for you.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant="destructive">
                  <Wand2 className="h-4 w-4" />
                  <AlertTitle>Feature Unavailable Offline</AlertTitle>
                  <AlertDescription>
                    The AI Bill Scanner requires an internet connection and a valid API key to function. This feature will not work in a fully offline desktop application.
                  </AlertDescription>
                </Alert>

                <div 
                    className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 text-center cursor-pointer hover:bg-muted transition-colors"
                    onClick={triggerFileSelect}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {previewUrl ? (
                        <div className="relative aspect-video max-h-[400px] mx-auto">
                            <img src={previewUrl} alt="Bill preview" className="rounded-md object-contain w-full h-full" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <Upload className="w-12 h-12" />
                            <p className="font-semibold">Click to upload or drag & drop</p>
                            <p className="text-sm">PNG, JPG, or GIF (Max 10MB)</p>
                        </div>
                    )}
                </div>

                {previewUrl && (
                     <div className="flex justify-end gap-2">
                         <Button variant="outline" onClick={() => {
                             setSelectedFile(null);
                             setPreviewUrl(null);
                             if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                             }
                         }}>
                            Clear Image
                         </Button>
                        <Button onClick={handleAnalyze} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Analyze with AI
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default BillScannerTab;
