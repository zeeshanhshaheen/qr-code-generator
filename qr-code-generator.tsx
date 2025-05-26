"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Download, Upload, X } from "lucide-react"
import QRCode from "qrcode"

export default function QRCodeGenerator() {
  const [inputData, setInputData] = useState("https://example.com")
  const [foregroundColor, setForegroundColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateQRCode = async () => {
    if (!inputData.trim()) return

    setIsGenerating(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas size
      canvas.width = 400
      canvas.height = 400

      // Generate QR code
      await QRCode.toCanvas(canvas, inputData, {
        width: 400,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel: "M",
      })

      // If there's an uploaded image, overlay it in the center
      if (uploadedImage) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          const logoSize = 80
          const x = (canvas.width - logoSize) / 2
          const y = (canvas.height - logoSize) / 2

          // Create a white background for the logo
          ctx.fillStyle = backgroundColor
          ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10)

          // Draw the logo
          ctx.drawImage(img, x, y, logoSize, logoSize)

          // Convert canvas to data URL
          setQrCodeUrl(canvas.toDataURL())
        }
        img.src = uploadedImage
      } else {
        // Convert canvas to data URL
        setQrCodeUrl(canvas.toDataURL())
      }
    } catch (error) {
      console.error("Error generating QR code:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeUrl) return

    const link = document.createElement("a")
    link.download = "qrcode.png"
    link.href = qrCodeUrl
    link.click()
  }

  // Generate QR code on component mount and when dependencies change
  useEffect(() => {
    generateQRCode()
  }, [inputData, foregroundColor, backgroundColor, uploadedImage])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">QR Code Generator</h1>
          <p className="text-gray-600">Create customizable QR codes with logo integration</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Input */}
              <div className="space-y-2">
                <Label htmlFor="data-input">Data to Encode</Label>
                <Textarea
                  id="data-input"
                  placeholder="Enter text, URL, or any data to encode..."
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Color Customization */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="foreground-color">Foreground Color</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="foreground-color"
                      type="color"
                      value={foregroundColor}
                      onChange={(e) => setForegroundColor(e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={foregroundColor}
                      onChange={(e) => setForegroundColor(e.target.value)}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background-color">Background Color</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="background-color"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Logo/Image Overlay</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Image</span>
                    </Button>
                    {uploadedImage && (
                      <Button variant="outline" size="sm" onClick={removeImage} className="flex items-center space-x-1">
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </Button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {uploadedImage && (
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <img
                        src={uploadedImage || "/placeholder.svg"}
                        alt="Uploaded logo"
                        className="w-12 h-12 object-cover rounded"
                      />
                      <span className="text-sm text-gray-600">Logo will be centered on QR code</span>
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={generateQRCode} disabled={isGenerating || !inputData.trim()} className="w-full">
                {isGenerating ? "Generating..." : "Generate QR Code"}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl || "/placeholder.svg"}
                      alt="Generated QR Code"
                      className="w-80 h-80 object-contain"
                    />
                  ) : (
                    <div className="w-80 h-80 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-500">QR Code will appear here</span>
                    </div>
                  )}
                </div>
              </div>

              {qrCodeUrl && (
                <div className="space-y-3">
                  <Button onClick={downloadQRCode} className="w-full flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Download QR Code</span>
                  </Button>

                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    <p className="font-medium mb-1">Tips for best results:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Keep logo size reasonable (will be automatically resized)</li>
                      <li>Use high contrast colors for better scanning</li>
                      <li>Test the QR code with multiple scanners</li>
                      <li>Avoid very long text for better readability</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Hidden canvas for QR code generation */}
              <canvas ref={canvasRef} className="hidden" width={400} height={400} />
            </CardContent>
          </Card>
        </div>

        {/* Sample Data Examples */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => setInputData("https://www.example.com")}
                className="text-left justify-start"
              >
                <div>
                  <div className="font-medium">Website URL</div>
                  <div className="text-xs text-gray-500">https://www.example.com</div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => setInputData("mailto:contact@example.com")}
                className="text-left justify-start"
              >
                <div>
                  <div className="font-medium">Email Address</div>
                  <div className="text-xs text-gray-500">mailto:contact@example.com</div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => setInputData("tel:+1234567890")}
                className="text-left justify-start"
              >
                <div>
                  <div className="font-medium">Phone Number</div>
                  <div className="text-xs text-gray-500">tel:+1234567890</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
