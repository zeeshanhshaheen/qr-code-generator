"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Download,
  Upload,
  X,
  Palette,
  ImageIcon,
  Settings,
  Eye,
  Smartphone,
  Wifi,
  Mail,
  Phone,
  Globe,
  Zap,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  FileImage,
  AlertTriangle,
  Info,
  Layers,
  Maximize,
} from "lucide-react"
import QRCode from "qrcode"

interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
}

interface QRSettings {
  version: number | "auto"
  errorCorrectionLevel: "L" | "M" | "Q" | "H"
  margin: number
  width: number
  imageIntegrationMode: "overlay" | "mosaic" | "gradient" | "colorMap" | "pattern"
  imageOpacity: number
  roundedCorners: boolean
  dotStyle: "square" | "rounded" | "circle"
  logoSize: number
  logoMargin: number
}

interface ExportFormat {
  format: "png" | "svg" | "jpg"
  quality: number
  size: number
}

// QR Code capacity data (alphanumeric characters)
const QR_CAPACITIES = {
  L: [
    25, 47, 77, 114, 154, 195, 224, 279, 335, 395, 468, 535, 619, 667, 758, 854, 938, 1046, 1153, 1249, 1352, 1460,
    1588, 1704, 1853, 1990, 2132, 2223, 2369, 2520, 2677, 2840, 3009, 3183, 3351, 3537, 3729, 3927, 4087, 4296,
  ],
  M: [
    20, 38, 61, 90, 122, 154, 178, 221, 262, 311, 366, 419, 483, 528, 600, 656, 734, 816, 909, 970, 1035, 1134, 1248,
    1326, 1451, 1542, 1637, 1732, 1839, 1994, 2113, 2238, 2369, 2506, 2632, 2780, 2894, 3054, 3220, 3391,
  ],
  Q: [
    16, 29, 47, 67, 87, 108, 125, 157, 189, 221, 259, 296, 352, 376, 426, 470, 531, 574, 644, 702, 742, 823, 890, 963,
    1041, 1094, 1172, 1263, 1322, 1429, 1499, 1618, 1700, 1787, 1867, 1966, 2071, 2181, 2298, 2420,
  ],
  H: [
    10, 20, 35, 50, 64, 84, 93, 122, 143, 174, 200, 227, 259, 283, 321, 365, 408, 452, 493, 557, 587, 640, 672, 744,
    779, 864, 910, 958, 1016, 1080, 1150, 1226, 1307, 1394, 1431, 1530, 1591, 1658, 1774, 1852,
  ],
}

export default function EnhancedQRGenerator() {
  const [inputData, setInputData] = useState("https://vercel.com")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [generationProgress, setGenerationProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [capacityWarning, setCapacityWarning] = useState("")

  const [colorPalette, setColorPalette] = useState<ColorPalette>({
    primary: "#1a1a1a",
    secondary: "#ffffff",
    accent: "#3b82f6",
    background: "#ffffff",
  })

  const [qrSettings, setQrSettings] = useState<QRSettings>({
    version: "auto",
    errorCorrectionLevel: "M",
    margin: 4,
    width: 400,
    imageIntegrationMode: "overlay",
    imageOpacity: 90,
    roundedCorners: false,
    dotStyle: "square",
    logoSize: 20,
    logoMargin: 8,
  })

  const [exportSettings, setExportSettings] = useState<ExportFormat>({
    format: "png",
    quality: 100,
    size: 400,
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculate data capacity and check if input exceeds it
  const checkDataCapacity = useCallback(() => {
    const dataLength = inputData.length
    if (qrSettings.version === "auto") {
      // Find minimum version that can accommodate the data
      const capacities = QR_CAPACITIES[qrSettings.errorCorrectionLevel]
      const requiredVersion = capacities.findIndex((capacity) => capacity >= dataLength) + 1

      if (requiredVersion === 0) {
        setCapacityWarning("Data too large for any QR code version")
        return false
      } else if (requiredVersion > 10) {
        setCapacityWarning(`Large data requires Version ${requiredVersion} (high density)`)
      } else {
        setCapacityWarning("")
      }
    } else {
      const maxCapacity = QR_CAPACITIES[qrSettings.errorCorrectionLevel][qrSettings.version - 1]
      if (dataLength > maxCapacity) {
        setCapacityWarning(`Data exceeds capacity (${dataLength}/${maxCapacity} characters)`)
        return false
      } else if (dataLength > maxCapacity * 0.8) {
        setCapacityWarning(`Approaching capacity limit (${dataLength}/${maxCapacity} characters)`)
      } else {
        setCapacityWarning("")
      }
    }
    return true
  }, [inputData, qrSettings.version, qrSettings.errorCorrectionLevel])

  // Advanced QR code generation with enhanced features
  const generateAdvancedQRCode = useCallback(async () => {
    if (!inputData.trim() || !checkDataCapacity()) return

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      const canvas = canvasRef.current
      const hiddenCanvas = hiddenCanvasRef.current
      if (!canvas || !hiddenCanvas) return

      const ctx = canvas.getContext("2d")
      const hiddenCtx = hiddenCanvas.getContext("2d")
      if (!ctx || !hiddenCtx) return

      setGenerationProgress(20)

      const size = qrSettings.width
      canvas.width = size
      canvas.height = size
      hiddenCanvas.width = size
      hiddenCanvas.height = size

      setGenerationProgress(40)

      // QR code options
      const qrOptions: any = {
        width: size,
        margin: qrSettings.margin,
        color: {
          dark: colorPalette.primary,
          light: colorPalette.background,
        },
        errorCorrectionLevel: qrSettings.errorCorrectionLevel,
      }

      // Add version if not auto
      if (qrSettings.version !== "auto") {
        qrOptions.version = qrSettings.version
      }

      await QRCode.toCanvas(hiddenCanvas, inputData, qrOptions)

      setGenerationProgress(60)

      const qrImageData = hiddenCtx.getImageData(0, 0, size, size)
      const qrData = qrImageData.data

      ctx.fillStyle = colorPalette.background
      ctx.fillRect(0, 0, size, size)

      setGenerationProgress(80)

      if (uploadedImage && qrSettings.imageIntegrationMode !== "overlay") {
        await integrateImageIntoQR(ctx, qrData, size)
      } else {
        ctx.putImageData(qrImageData, 0, 0)
      }

      if (uploadedImage && qrSettings.imageIntegrationMode === "overlay") {
        await addEnhancedImageOverlay(ctx, size)
      }

      applyPostProcessingEffects(ctx, size)

      setGenerationProgress(100)
      setQrCodeUrl(canvas.toDataURL("image/png", 1.0))
    } catch (error) {
      console.error("Error generating QR code:", error)
    } finally {
      setTimeout(() => {
        setIsGenerating(false)
        setGenerationProgress(0)
      }, 500)
    }
  }, [inputData, colorPalette, qrSettings, uploadedImage, checkDataCapacity])

  // Enhanced image overlay with better positioning and sizing
  const addEnhancedImageOverlay = async (ctx: CanvasRenderingContext2D, size: number) => {
    if (!uploadedImage) return

    const img = new Image()
    img.crossOrigin = "anonymous"

    return new Promise<void>((resolve) => {
      img.onload = () => {
        const logoSize = (size * qrSettings.logoSize) / 100
        const margin = qrSettings.logoMargin
        const x = (size - logoSize) / 2
        const y = (size - logoSize) / 2

        // Create background with margin
        ctx.fillStyle = colorPalette.background
        ctx.fillRect(x - margin, y - margin, logoSize + margin * 2, logoSize + margin * 2)

        // Apply rounded corners to background if enabled
        if (qrSettings.roundedCorners) {
          ctx.beginPath()
          ctx.roundRect(x - margin, y - margin, logoSize + margin * 2, logoSize + margin * 2, 8)
          ctx.fillStyle = colorPalette.background
          ctx.fill()
        }

        // Apply opacity and draw logo
        ctx.globalAlpha = qrSettings.imageOpacity / 100

        if (qrSettings.roundedCorners) {
          ctx.beginPath()
          ctx.roundRect(x, y, logoSize, logoSize, 4)
          ctx.clip()
        }

        ctx.drawImage(img, x, y, logoSize, logoSize)
        ctx.globalAlpha = 1

        resolve()
      }
      img.src = uploadedImage
    })
  }

  // Integrate image pixels into QR code structure
  const integrateImageIntoQR = async (ctx: CanvasRenderingContext2D, qrData: Uint8ClampedArray, size: number) => {
    if (!uploadedImage) return

    const img = new Image()
    img.crossOrigin = "anonymous"

    return new Promise<void>((resolve) => {
      img.onload = () => {
        const tempCanvas = document.createElement("canvas")
        const tempCtx = tempCanvas.getContext("2d")
        if (!tempCtx) return resolve()

        tempCanvas.width = size
        tempCanvas.height = size
        tempCtx.drawImage(img, 0, 0, size, size)

        const imageData = tempCtx.getImageData(0, 0, size, size)
        const imgData = imageData.data

        const newImageData = ctx.createImageData(size, size)
        const newData = newImageData.data

        for (let i = 0; i < qrData.length; i += 4) {
          const qrR = qrData[i]
          const qrG = qrData[i + 1]
          const qrB = qrData[i + 2]
          const qrA = qrData[i + 3]

          const imgR = imgData[i]
          const imgG = imgData[i + 1]
          const imgB = imgData[i + 2]

          const isDarkPixel = qrR < 128

          if (isDarkPixel) {
            switch (qrSettings.imageIntegrationMode) {
              case "mosaic":
                newData[i] = imgR
                newData[i + 1] = imgG
                newData[i + 2] = imgB
                newData[i + 3] = 255
                break

              case "gradient":
                const blendFactor = qrSettings.imageOpacity / 100
                newData[i] = Math.round(qrR * (1 - blendFactor) + imgR * blendFactor)
                newData[i + 1] = Math.round(qrG * (1 - blendFactor) + imgG * blendFactor)
                newData[i + 2] = Math.round(qrB * (1 - blendFactor) + imgB * blendFactor)
                newData[i + 3] = 255
                break

              case "colorMap":
                const brightness = (imgR + imgG + imgB) / 3
                const intensity = brightness / 255
                const rgb = hexToRgb(colorPalette.primary)
                newData[i] = Math.round(rgb.r * intensity)
                newData[i + 1] = Math.round(rgb.g * intensity)
                newData[i + 2] = Math.round(rgb.b * intensity)
                newData[i + 3] = 255
                break

              case "pattern":
                const x = (i / 4) % size
                const y = Math.floor(i / 4 / size)
                const patternValue = (Math.sin(x * 0.1) + Math.sin(y * 0.1)) * 0.5 + 0.5
                newData[i] = Math.round(imgR * patternValue)
                newData[i + 1] = Math.round(imgG * patternValue)
                newData[i + 2] = Math.round(imgB * patternValue)
                newData[i + 3] = 255
                break

              default:
                newData[i] = qrR
                newData[i + 1] = qrG
                newData[i + 2] = qrB
                newData[i + 3] = qrA
            }
          } else {
            const bgColor = hexToRgb(colorPalette.background)
            newData[i] = bgColor.r
            newData[i + 1] = bgColor.g
            newData[i + 2] = bgColor.b
            newData[i + 3] = 255
          }
        }

        ctx.putImageData(newImageData, 0, 0)
        resolve()
      }
      img.src = uploadedImage
    })
  }

  // Apply post-processing effects
  const applyPostProcessingEffects = (ctx: CanvasRenderingContext2D, size: number) => {
    if (qrSettings.roundedCorners) {
      const imageData = ctx.getImageData(0, 0, size, size)
      ctx.putImageData(imageData, 0, 0)
    }
  }

  // Enhanced export functionality with multiple formats
  const exportQRCode = async (format: "png" | "svg" | "jpg") => {
    if (!qrCodeUrl) return

    const canvas = canvasRef.current
    if (!canvas) return

    let dataUrl: string
    let filename: string

    switch (format) {
      case "png":
        dataUrl = canvas.toDataURL("image/png", 1.0)
        filename = `qrcode-${Date.now()}.png`
        break
      case "jpg":
        dataUrl = canvas.toDataURL("image/jpeg", exportSettings.quality / 100)
        filename = `qrcode-${Date.now()}.jpg`
        break
      case "svg":
        // Generate SVG version
        try {
          const svgString = await QRCode.toString(inputData, {
            type: "svg",
            width: exportSettings.size,
            margin: qrSettings.margin,
            color: {
              dark: colorPalette.primary,
              light: colorPalette.background,
            },
            errorCorrectionLevel: qrSettings.errorCorrectionLevel,
          })
          const blob = new Blob([svgString], { type: "image/svg+xml" })
          dataUrl = URL.createObjectURL(blob)
          filename = `qrcode-${Date.now()}.svg`
        } catch (error) {
          console.error("Error generating SVG:", error)
          return
        }
        break
      default:
        return
    }

    const link = document.createElement("a")
    link.download = filename
    link.href = dataUrl
    link.click()

    if (format === "svg") {
      URL.revokeObjectURL(dataUrl)
    }
  }

  // Utility function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace("#", "")
    if (!/^[0-9A-F]{6}$/i.test(cleanHex)) {
      return { r: 0, g: 0, b: 0 }
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string
        setUploadedImage(imageSrc)
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

  const copyToClipboard = async () => {
    if (!qrCodeUrl) return
    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const setQuickData = (data: string) => {
    setInputData(data)
  }

  const regenerateQR = () => {
    generateAdvancedQRCode()
  }

  // Check capacity when input or settings change
  useEffect(() => {
    checkDataCapacity()
  }, [checkDataCapacity])

  // Generate QR code when settings change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateAdvancedQRCode()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [generateAdvancedQRCode])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl mb-6 shadow-2xl animate-pulse">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
            Professional QR Generator
          </h1>
          <p className="text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Create high-quality QR codes with{" "}
            <span className="text-blue-600 font-semibold">advanced version control</span>,{" "}
            <span className="text-purple-600 font-semibold">multiple export formats</span>, and{" "}
            <span className="text-green-600 font-semibold">enhanced customization</span>
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-500">Version Control • Multi-Format Export • Logo Integration</span>
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-8">
          {/* Enhanced Configuration Panel */}
          <div className="xl:col-span-2 space-y-8">
            {/* Quick Templates */}
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  Quick Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Globe, label: "Website", data: "https://vercel.com", color: "from-blue-500 to-cyan-500" },
                    {
                      icon: Mail,
                      label: "Email",
                      data: "mailto:hello@example.com",
                      color: "from-green-500 to-emerald-500",
                    },
                    { icon: Phone, label: "Phone", data: "tel:+1234567890", color: "from-orange-500 to-red-500" },
                    {
                      icon: Wifi,
                      label: "WiFi",
                      data: "WIFI:T:WPA;S:MyNetwork;P:password123;;",
                      color: "from-purple-500 to-pink-500",
                    },
                  ].map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => setQuickData(template.data)}
                      className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 transition-all duration-300 border-2 hover:border-blue-200 group"
                    >
                      <div
                        className={`p-3 bg-gradient-to-r ${template.color} rounded-xl group-hover:scale-110 transition-transform duration-300`}
                      >
                        <template.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-medium">{template.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Main Configuration */}
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Advanced Configuration</CardTitle>
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Generating QR Code...</span>
                      <span>{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} className="h-2" />
                  </div>
                )}
                {capacityWarning && (
                  <Alert
                    className={
                      capacityWarning.includes("exceeds")
                        ? "border-red-200 bg-red-50"
                        : "border-yellow-200 bg-yellow-50"
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{capacityWarning}</AlertDescription>
                  </Alert>
                )}
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-xl">
                    <TabsTrigger
                      value="basic"
                      className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Basic
                    </TabsTrigger>
                    <TabsTrigger
                      value="version"
                      className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Layers className="w-4 h-4" />
                      Version
                    </TabsTrigger>
                    <TabsTrigger
                      value="design"
                      className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Palette className="w-4 h-4" />
                      Design
                    </TabsTrigger>
                    <TabsTrigger
                      value="advanced"
                      className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Advanced
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-8 mt-8">
                    <div className="space-y-4">
                      <Label htmlFor="data-input" className="text-lg font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Data to Encode
                      </Label>
                      <Textarea
                        id="data-input"
                        placeholder="Enter URL, text, or any data to encode..."
                        value={inputData}
                        onChange={(e) => setInputData(e.target.value)}
                        rows={4}
                        className="resize-none text-base border-2 focus:border-blue-500 transition-colors"
                      />
                      <div className="text-sm text-gray-500">
                        Characters: {inputData.length}
                        {qrSettings.version !== "auto" && (
                          <span className="ml-2">
                            / {QR_CAPACITIES[qrSettings.errorCorrectionLevel][qrSettings.version - 1]} max
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Error Correction Level
                      </Label>
                      <Select
                        value={qrSettings.errorCorrectionLevel}
                        onValueChange={(value: "L" | "M" | "Q" | "H") =>
                          setQrSettings((prev) => ({ ...prev, errorCorrectionLevel: value }))
                        }
                      >
                        <SelectTrigger className="border-2 focus:border-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L">🟢 Low (7%) - Faster scanning, less damage recovery</SelectItem>
                          <SelectItem value="M">🟡 Medium (15%) - Balanced performance (Recommended)</SelectItem>
                          <SelectItem value="Q">🟠 Quartile (25%) - Better damage recovery</SelectItem>
                          <SelectItem value="H">🔴 High (30%) - Maximum damage recovery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="version" className="space-y-8 mt-8">
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        QR Code Version
                      </Label>
                      <Select
                        value={qrSettings.version.toString()}
                        onValueChange={(value) =>
                          setQrSettings((prev) => ({
                            ...prev,
                            version: value === "auto" ? "auto" : Number.parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger className="border-2 focus:border-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="auto">
                            🤖 Auto (Recommended) - Automatically choose optimal version
                          </SelectItem>
                          {Array.from({ length: 40 }, (_, i) => i + 1).map((version) => (
                            <SelectItem key={version} value={version.toString()}>
                              Version {version} - Max {QR_CAPACITIES[qrSettings.errorCorrectionLevel][version - 1]}{" "}
                              chars
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4" />
                          <span className="font-medium">Version Information</span>
                        </div>
                        <ul className="space-y-1 text-xs">
                          <li>• Higher versions support more data but create denser QR codes</li>
                          <li>• Version 1-10: Good for URLs and short text</li>
                          <li>• Version 11-20: Suitable for longer text and data</li>
                          <li>• Version 21-40: For large amounts of data</li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="design" className="space-y-8 mt-8">
                    {/* Custom Colors */}
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Foreground Color</Label>
                        <div className="flex items-center gap-4">
                          <input
                            type="color"
                            value={colorPalette.primary}
                            onChange={(e) => setColorPalette((prev) => ({ ...prev, primary: e.target.value }))}
                            className="w-16 h-16 rounded-xl border-4 border-gray-200 cursor-pointer hover:scale-110 transition-transform"
                          />
                          <Input
                            value={colorPalette.primary}
                            onChange={(e) => setColorPalette((prev) => ({ ...prev, primary: e.target.value }))}
                            className="font-mono text-lg border-2 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Background Color</Label>
                        <div className="flex items-center gap-4">
                          <input
                            type="color"
                            value={colorPalette.background}
                            onChange={(e) => setColorPalette((prev) => ({ ...prev, background: e.target.value }))}
                            className="w-16 h-16 rounded-xl border-4 border-gray-200 cursor-pointer hover:scale-110 transition-transform"
                          />
                          <Input
                            value={colorPalette.background}
                            onChange={(e) => setColorPalette((prev) => ({ ...prev, background: e.target.value }))}
                            className="font-mono text-lg border-2 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Logo Integration */}
                    <div className="space-y-6">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Logo Integration
                      </Label>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
                          >
                            <Upload className="w-5 h-5" />
                            Upload Logo/Icon
                          </Button>
                          {uploadedImage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={removeImage}
                              className="hover:bg-red-50 hover:border-red-300"
                            >
                              <X className="w-4 h-4" />
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
                          <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                            <div className="flex items-center gap-4">
                              <img
                                src={uploadedImage || "/placeholder.svg"}
                                alt="Uploaded"
                                className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-lg"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Logo uploaded successfully</span>
                                <div className="text-xs text-gray-500 mt-1">Ready for integration</div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <Label className="font-medium">Integration Mode</Label>
                              <Select
                                value={qrSettings.imageIntegrationMode}
                                onValueChange={(value: any) =>
                                  setQrSettings((prev) => ({ ...prev, imageIntegrationMode: value }))
                                }
                              >
                                <SelectTrigger className="border-2 focus:border-blue-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="overlay">🎯 Center Overlay (Recommended for logos)</SelectItem>
                                  <SelectItem value="mosaic">🎨 Mosaic (Image colors in QR pattern)</SelectItem>
                                  <SelectItem value="gradient">🌈 Gradient Blend</SelectItem>
                                  <SelectItem value="colorMap">🗺️ Color Mapping</SelectItem>
                                  <SelectItem value="pattern">✨ Pattern Effect</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <Label className="font-medium">Logo Size: {qrSettings.logoSize}%</Label>
                                <Slider
                                  value={[qrSettings.logoSize]}
                                  onValueChange={([value]) => setQrSettings((prev) => ({ ...prev, logoSize: value }))}
                                  max={30}
                                  min={10}
                                  step={1}
                                  className="w-full"
                                />
                              </div>

                              <div className="space-y-3">
                                <Label className="font-medium">Logo Margin: {qrSettings.logoMargin}px</Label>
                                <Slider
                                  value={[qrSettings.logoMargin]}
                                  onValueChange={([value]) => setQrSettings((prev) => ({ ...prev, logoMargin: value }))}
                                  max={20}
                                  min={0}
                                  step={1}
                                  className="w-full"
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <Label className="font-medium">Opacity: {qrSettings.imageOpacity}%</Label>
                              <Slider
                                value={[qrSettings.imageOpacity]}
                                onValueChange={([value]) => setQrSettings((prev) => ({ ...prev, imageOpacity: value }))}
                                max={100}
                                min={10}
                                step={5}
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-8 mt-8">
                    <div className="space-y-6">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <Maximize className="w-5 h-5" />
                        Size & Spacing Controls
                      </Label>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="font-medium">QR Code Size: {qrSettings.width}px</Label>
                          <Slider
                            value={[qrSettings.width]}
                            onValueChange={([value]) => setQrSettings((prev) => ({ ...prev, width: value }))}
                            max={1000}
                            min={200}
                            step={50}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="font-medium">Margin: {qrSettings.margin} modules</Label>
                          <Slider
                            value={[qrSettings.margin]}
                            onValueChange={([value]) => setQrSettings((prev) => ({ ...prev, margin: value }))}
                            max={10}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <FileImage className="w-5 h-5" />
                        Export Settings
                      </Label>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label className="font-medium">Export Size</Label>
                          <Select
                            value={exportSettings.size.toString()}
                            onValueChange={(value) =>
                              setExportSettings((prev) => ({ ...prev, size: Number.parseInt(value) }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="200">200x200 (Small)</SelectItem>
                              <SelectItem value="400">400x400 (Medium)</SelectItem>
                              <SelectItem value="800">800x800 (Large)</SelectItem>
                              <SelectItem value="1200">1200x1200 (Extra Large)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="font-medium">JPG Quality: {exportSettings.quality}%</Label>
                          <Slider
                            value={[exportSettings.quality]}
                            onValueChange={([value]) => setExportSettings((prev) => ({ ...prev, quality: value }))}
                            max={100}
                            min={10}
                            step={10}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <Label htmlFor="rounded-corners" className="font-semibold">
                          Rounded Corners
                        </Label>
                        <p className="text-sm text-gray-600">Apply rounded corner effects to logo</p>
                      </div>
                      <Switch
                        id="rounded-corners"
                        checked={qrSettings.roundedCorners}
                        onCheckedChange={(checked) => setQrSettings((prev) => ({ ...prev, roundedCorners: checked }))}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Preview Panel */}
          <div className="space-y-8">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live Preview
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={regenerateQR} disabled={isGenerating}>
                      <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                    </Button>
                    {isGenerating && (
                      <Badge variant="secondary" className="animate-pulse">
                        Generating...
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-3xl shadow-inner border-4 border-gray-100">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl || "/placeholder.svg"}
                          alt="Generated QR Code"
                          className="w-80 h-80 object-contain rounded-2xl shadow-lg"
                        />
                      ) : (
                        <div className="w-80 h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <span className="text-gray-500 text-lg">QR Code Preview</span>
                            <p className="text-sm text-gray-400 mt-2">Configure settings to generate</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/90 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                          <p className="text-sm text-gray-600">Generating QR Code...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {qrCodeUrl && (
                  <div className="space-y-4">
                    {/* Export Options */}
                    <div className="space-y-3">
                      <Label className="font-semibold">Export Formats</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          onClick={() => exportQRCode("png")}
                          variant="outline"
                          className="flex flex-col items-center gap-1 h-auto py-3"
                        >
                          <FileImage className="w-4 h-4" />
                          <span className="text-xs">PNG</span>
                        </Button>
                        <Button
                          onClick={() => exportQRCode("svg")}
                          variant="outline"
                          className="flex flex-col items-center gap-1 h-auto py-3"
                        >
                          <Layers className="w-4 h-4" />
                          <span className="text-xs">SVG</span>
                        </Button>
                        <Button
                          onClick={() => exportQRCode("jpg")}
                          variant="outline"
                          className="flex flex-col items-center gap-1 h-auto py-3"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-xs">JPG</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => exportQRCode("png")}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button onClick={copyToClipboard} variant="outline" className="border-2 hover:bg-gray-50 py-3">
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                      <h4 className="font-semibold mb-3 text-blue-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Quality Tips
                      </h4>
                      <ul className="space-y-2 text-xs">
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                          Use PNG for best quality and transparency
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                          SVG format provides infinite scalability
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                          Higher error correction improves scanning reliability
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                          Test QR codes at actual usage size
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Hidden canvases for processing */}
                <canvas ref={canvasRef} className="hidden" />
                <canvas ref={hiddenCanvasRef} className="hidden" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
