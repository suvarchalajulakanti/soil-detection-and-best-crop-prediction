/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Camera, Upload, Loader2, Sprout, Info, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface SoilAnalysis {
  isSoil: boolean;
  soilType?: string;
  properties?: {
    color: string;
    texture: string;
    moistureLevel: string;
    pH_estimate: string;
  };
  bestCrops?: string[];
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SoilAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeSoil = async () => {
    if (!image) return;

    setAnalyzing(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              text: "Analyze this image. First, determine if the image is actually a picture of soil. If it is NOT soil, set 'isSoil' to false and omit other fields. If it IS soil, set 'isSoil' to true, identify the 'soilType', and provide its physical properties (color, texture, moisture, pH estimate). Also recommend the names of the top 3 food grain crops (such as wheat, rice, dal) that grow well in this soil. Provide the response strictly in JSON format.",
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSoil: { type: Type.BOOLEAN },
              soilType: { type: Type.STRING },
              properties: {
                type: Type.OBJECT,
                properties: {
                  color: { type: Type.STRING },
                  texture: { type: Type.STRING },
                  moistureLevel: { type: Type.STRING },
                  pH_estimate: { type: Type.STRING },
                },
                required: ["color", "texture", "moistureLevel", "pH_estimate"],
              },
              bestCrops: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["isSoil"],
          },
        },
      });

      const analysisRaw = response.text;
      if (analysisRaw) {
        const analysis: SoilAnalysis = JSON.parse(analysisRaw);
        if (!analysis.isSoil) {
          setError("The uploaded image does not appear to be soil. Please upload a clear picture of soil.");
          return;
        }
        setResult(analysis);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze soil. Please try again with a clearer image.");
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-md text-center mb-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 mb-2"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--color-soil-warm)] flex items-center justify-center text-white">
            <Sprout size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[var(--color-soil-dark)] text-center leading-tight">
            Soil Detection and <br/> Next Crop Prediction
          </h1>
        </motion.div>
        <p className="text-[var(--color-soil-warm)] text-sm font-medium">
          Strategic agriculture driven by AI
        </p>
      </header>

      <main className="w-full max-w-md flex-1 flex flex-col gap-6">
        {/* Upload Section */}
        {!image && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-soil-warm)]/30 rounded-3xl p-8 bg-white/50"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-[var(--color-soil-warm)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload size={40} className="text-[var(--color-soil-warm)]" />
              </div>
              <h2 className="text-xl font-serif font-semibold mb-2">Upload soil image</h2>
              <p className="text-sm text-gray-500 mb-8 max-w-[240px] mx-auto">
                Select a high-quality photo of your soil for precise crop recommendations.
              </p>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[var(--color-soil-warm)] text-white py-4 px-6 rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-soil-warm)]/20 active:scale-95 transition-transform"
              >
                <Upload size={20} />
                Upload Image
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden"
              />
            </div>
          </motion.div>
        )}

        {/* Preview & Action */}
        {image && !result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden border-4 border-white shadow-xl">
              <img src={image} alt="Soil preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {analyzing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="mb-4"
                  >
                    <Loader2 size={48} />
                  </motion.div>
                  <p className="font-serif text-lg">Analyzing soil properties...</p>
                  <p className="text-xs opacity-70 mt-2">Checking texture, moisture, and pH</p>
                </div>
              )}
            </div>
            
            {!analyzing && (
              <div className="flex gap-3">
                <button 
                  onClick={reset}
                  className="flex-1 bg-white border border-[var(--color-soil-warm)]/30 text-[var(--color-soil-warm)] py-4 rounded-full font-semibold flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Retake
                </button>
                <button 
                  onClick={analyzeSoil}
                  className="flex-[2] bg-[var(--color-soil-warm)] text-white py-4 rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-soil-warm)]/20"
                >
                  Analyze Soil
                </button>
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 italic">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {/* Results Section */}
        <AnimatePresence>
          {result && result.isSoil && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6 pb-12"
            >
              {/* Main Badge / Soil Type */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[var(--color-soil-warm)]/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-soil-warm)] opacity-70">
                      IDENTIFIED SOIL TYPE
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-[var(--color-soil-dark)]">
                      {result.soilType}
                    </h2>
                  </div>
                  <CheckCircle2 className="text-green-600" size={24} />
                </div>

                <div className="h-px bg-gray-100 my-4" />
                
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Info size={18} className="text-[var(--color-soil-warm)]" />
                  <h3 className="font-serif font-bold text-lg">Soil Properties</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {result.properties && [
                    { label: 'Color', value: result.properties.color },
                    { label: 'Texture', value: result.properties.texture },
                    { label: 'Moisture', value: result.properties.moistureLevel },
                    { label: 'pH Est.', value: result.properties.pH_estimate },
                  ].map((prop) => (
                    <div key={prop.label} className="bg-[var(--color-soil-light)]/50 p-3 rounded-2xl border border-white">
                      <span className="text-[9px] uppercase tracking-wider text-[var(--color-soil-warm)] font-bold opacity-60">
                        {prop.label}
                      </span>
                      <p className="text-sm font-medium text-[var(--color-soil-dark)] mt-0.5 text-ellipsis overflow-hidden">
                        {prop.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crop Recommendations */}
              <div className="flex flex-col gap-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Sprout size={18} className="text-green-600" />
                  <h3 className="font-serif font-bold text-lg">Recommended Crops</h3>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {result.bestCrops?.map((cropName, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-[var(--color-soil-warm)] text-white px-5 py-2.5 rounded-full font-bold shadow-sm"
                    >
                      {cropName}
                    </motion.div>
                  ))}
                </div>
              </div>

              <button 
                onClick={reset}
                className="mt-4 border-2 border-[var(--color-soil-warm)]/20 text-[var(--color-soil-warm)] py-4 rounded-full font-semibold active:bg-[var(--color-soil-warm)]/5 transition-colors"
              >
                New Analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding */}
      <footer className="py-8 text-center mt-auto">
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-30 font-bold">
          Powered by Gemini Intelligence
        </p>
      </footer>
    </div>
  );
}

