"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Shield, Clock, Zap, Phone, Mail, Globe, Weight, Menu, X, FileText } from "lucide-react"
import { useState } from "react"
import { track } from "@vercel/analytics"

export default function CleanSpaceLanding() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const trackDemoRequest = (location: string) => {
    track("demo_request", { location })
  }

  const trackQuoteRequest = (location: string) => {
    track("quote_request", { location })
  }

  const trackContactClick = (type: string) => {
    track("contact_click", { type })
  }

  const trackDataSheets = () => {
    track("data_sheets_click")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-R-TM-Logo-Green-with-Tagline-DMSOFH8BykYfZ70xuZ7yUXKGpEy6U9.png"
              alt="CleanSpace Logo"
              className="h-12"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              Features
            </a>
            <a
              href="#specifications"
              className="text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Specifications
            </a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              Contact
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border shadow-lg">
            <nav className="container mx-auto px-4 py-6 space-y-4">
              <a
                href="#features"
                className="block text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#specifications"
                className="block text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Specifications
              </a>
              <a
                href="#contact"
                className="block text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative py-32 px-4 overflow-hidden bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="container mx-auto text-center relative z-10">
          <Badge className="mb-8 px-4 py-2 text-sm font-medium bg-black/30 text-white border border-white/50 backdrop-blur-sm">
            Lightest PAPR in CleanSpace Range
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-white leading-tight tracking-tight text-shadow">
            Breathe Easy,
            <br />
            <span className="text-white animate-float">Work Safely</span>
          </h1>

          <p className="text-xl md:text-2xl text-white mb-16 max-w-4xl mx-auto leading-relaxed font-medium">
            CleanSpace WORK is our lightest industrial PAPR, making respiratory protection easier to work with in high
            dust environments.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button
              size="lg"
              className="px-16 py-8 text-xl font-bold bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white border-0 shadow-lg shadow-[rgb(27,208,118)]/25 hover:shadow-xl hover:shadow-[rgb(27,208,118)]/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 min-h-[56px]"
              asChild
            >
              <a
                href="https://cleanspacetechnology.com/email-your-request/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackDemoRequest("hero")}
              >
                Request Info
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-16 py-8 text-xl font-bold border-2 border-white text-white hover:bg-white hover:text-[rgb(4,45,35)] bg-transparent/10 backdrop-blur-sm shadow-lg hover:shadow-white/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 min-h-[56px]"
              asChild
            >
              <a
                href="https://cleanspacetechnology.com/email-my-quote/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackQuoteRequest("hero")}
              >
                Get Quote
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-[rgb(27,208,118)] mb-2">{"<400g"}</div>
              <div className="text-white text-sm font-medium">Ultra-Light</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[rgb(27,208,118)] mb-2">8hrs*</div>
              <div className="text-white text-sm font-medium">Full shift protection</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[rgb(27,208,118)] mb-2">99.97%</div>
              <div className="text-white text-sm font-medium">TM3 P3 filtration efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[rgb(27,208,118)] mb-2">2yr</div>
              <div className="text-white text-sm font-medium">Comprehensive warranty</div>
            </div>
          </div>

          <div className="mt-8 text-xs text-white max-w-6xl mx-auto">
            *Operating time is strongly affected by filter type, filter loading, mask seal, work rate, altitude, and
            other factors. Actual operating times may vary
          </div>
        </div>
      </section>

      {/* Product Introduction */}
      <section className="py-32 px-4 bg-background">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div>
                <div className="mb-6 px-6 py-3 bg-primary/10 text-primary border border-primary/20 font-bold rounded-full inline-block">
                  <a href="#features" className="text-primary hover:text-primary/80 transition-colors">
                    Features
                  </a>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8 leading-tight">
                  Revolutionary Respiratory Protection
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-8 font-medium">
                  Independent trials showed significantly higher compliance rates compared to traditional respirators. Workers actually want to wear CleanSpace WORK all day long.
                </p>
                <Separator className="my-8 bg-primary/20" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card className="p-6 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-lg">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-foreground">99.97% Filtration Efficiency</span>
                      <p className="text-muted-foreground text-lg font-medium">Protection against airborne particles</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-lg">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-foreground">
                        Patented AirSensit<sup className="text-xs">®</sup> Technology
                      </span>
                      <p className="text-muted-foreground text-lg font-medium">
                        Intelligent breath-responsive system reduces battery consumption by <span className="font-semibold text-[rgb(27,208,118)]">30%</span> while maintaining optimal airflow
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-lg">
                      <Weight className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-foreground">Ultra-Light Design</span>
                      <p className="text-muted-foreground text-lg font-medium">
                        Less than 400 grams for all-day comfort
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-card to-muted rounded-3xl p-8 shadow-2xl">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-WORK-Welding.jpg-uCrTLnLFWTgLT44u8oGRNKkdRBMwL3.jpeg"
                  alt="CleanSpace WORK PAPR in use"
                  className="w-full h-[500px] object-cover rounded-2xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-4 bg-gradient-to-b from-[rgb(27,208,118)]/5 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <div className="mb-6 px-6 py-3 bg-accent text-accent-foreground border border-accent/20 font-bold rounded-full inline-block">
              Advanced Technology
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Why Choose CleanSpace WORK?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-medium">
              Multiple case studies confirmed significant cost savings through reduced filter replacements. CleanSpace WORK pays for itself faster than legacy respirator options.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <Card className="border-0 shadow-2xl hover:shadow-accent/10 transition-all duration-500 transform hover:-translate-y-4 bg-background/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6 pt-12">
                <div className="w-24 h-24 rounded-3xl mx-auto mb-8 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-xl">
                  <Shield className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground mb-6">Certified Protection</CardTitle>
                <CardDescription className="text-muted-foreground text-lg leading-relaxed font-medium">
                  TM3 P3 filtration with <span className="font-semibold text-[rgb(27,208,118)]">99.97% efficiency</span> against silica, cement dust, and toxic particles. Meets international safety standards.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-2xl hover:shadow-accent/10 transition-all duration-500 transform hover:-translate-y-4 bg-background/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6 pt-12">
                <div className="w-24 h-24 rounded-3xl mx-auto mb-8 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-xl">
                  <Zap className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground mb-6">Complete Mobility</CardTitle>
                <CardDescription className="text-muted-foreground text-lg leading-relaxed font-medium">
                  No belts, hoses, or heavy batteries. <span className="font-semibold text-[rgb(27,208,118)]">75% improvement</span> in worker mobility and comfort compared to traditional systems.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-2xl hover:shadow-accent/10 transition-all duration-500 transform hover:-translate-y-4 bg-background/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6 pt-12">
                <div className="w-24 h-24 rounded-3xl mx-auto mb-8 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-xl">
                  <Clock className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground mb-6">Extended Runtime</CardTitle>
                <CardDescription className="text-muted-foreground text-lg leading-relaxed font-medium">
                  Up to 8 hours continuous operation with <span className="font-semibold text-[rgb(27,208,118)]">under 2-hour</span> fast recharge. Lithium-ion technology for reliable performance.
                </CardDescription>
                <div className="mt-4 text-xs text-muted-foreground italic">
                  *Operating time is strongly affected by filter type, filter loading, mask seal, work rate, altitude,
                  and other factors. Actual operating times may vary
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Gallery */}
      <section className="py-32 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <div className="mb-6 px-6 py-3 bg-primary text-primary-foreground border border-primary/20 font-bold rounded-full inline-block">
              Product Gallery
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Complete Protection System</h2>
            <p className="text-xl text-muted-foreground font-medium">
              Everything included for immediate deployment. Professional-grade components engineered for <span className="font-semibold text-[rgb(27,208,118)]">industrial durability</span>.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <Card className="border-0 shadow-2xl overflow-hidden hover:shadow-accent/10 transition-all duration-500 transform hover:-translate-y-2 group">
                <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted to-card">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-WORK-Kit.jpg-90KaLJ5ELokhbjD5PUZ5ybN3dAjwRq.jpeg"
                    alt="CleanSpace WORK Complete Kit"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
              </Card>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-3xl font-bold text-foreground mb-6">Complete Kit Includes:</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start space-x-4">
                  <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground leading-relaxed text-lg font-medium">
                    Your selected size of half mask and fabric head harness
                  </span>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground leading-relaxed text-lg font-medium">Universal battery charger</span>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground leading-relaxed text-lg font-medium">
                    Neck support x 2 (small and medium)
                  </span>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground leading-relaxed text-lg font-medium">Particulate filter</span>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-foreground leading-relaxed text-lg font-medium">
                    Power Unit and Quick Start Guide
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Specifications Section */}
      <section id="specifications" className="py-32 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Technical Specifications</h2>
            <p className="text-xl text-muted-foreground font-medium">
              <span className="font-semibold text-[rgb(27,208,118)]">IP66 rated</span> for dust and water protection. Engineered for demanding industrial environments.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10 mb-16">
            <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground">Certifications & Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      EN 12942:1998 + A1:2002 + A2:2008 TM3 P R SL (Europe CE / UK UKCA)
                    </span>
                  </li>
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      AS/NZS1716:2012 PAPR-P3 (P2 with Half Mask) (Australia/NZ)
                    </span>
                  </li>
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      ISO 9001 (Quality Management System)
                    </span>
                  </li>
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      IP Rating 66 (Ingress Protection Level for Dust / Water)
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground">Proven Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  Suitable for everyday environments which require respiratory protection against airborne particulate
                  contaminates including:*
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      Stone, cement and concrete handling
                    </span>
                  </li>
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      Woodwork – Cutting, turning or sanding timber
                    </span>
                  </li>
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      Agriculture – mowing, reaping and mulching operations
                    </span>
                  </li>
                  <li className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-foreground leading-relaxed text-lg font-medium">
                      Maintenance and cleaning
                    </span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-6 italic">
                  *Please refer to Data Sheets for more information.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground">Performance Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Positive pressure and breath-responsive</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Visual and audible alarms: 75dB(A)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Peak airflow: 200 L/min</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Weight (Power Unit): 350g</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Operating time: up to 8 hours*</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Auto standby: off after 3 minutes</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Battery: Lithium-ion polymer</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">Recharge time: {"< 2 hours (to 95%)"}</span>
                  </div>
                  <div className="flex items-center space-x-3 md:col-span-2">
                    <div className="w-2 h-2 rounded-full bg-[rgb(27,208,118)]"></div>
                    <span className="text-foreground text-sm font-medium">AC Adaptor Charger: input 100 – 240V</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-6 italic">
                  *Operating time is strongly affected by filter type, filter loading, mask seal, work rate, altitude,
                  and other factors. Actual operating times may vary.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mb-16">
            <Button
              size="lg"
              className="px-12 py-6 text-lg font-bold bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white shadow-lg shadow-[rgb(27,208,118)]/25 hover:shadow-xl hover:shadow-[rgb(27,208,118)]/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 min-h-[56px]"
              asChild
            >
              <a
                href="https://cleanspacetechnology.com/data-sheets/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackDataSheets}
              >
                <FileText className="h-5 w-5 mr-2" />
                Data Sheets
              </a>
            </Button>
          </div>

          <div className="mt-16">
            <Card className="border-0 shadow-2xl bg-primary/5 backdrop-blur-sm">
              <CardContent className="p-12">
                <div className="flex items-center justify-center space-x-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-lg">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-foreground mb-2">2 Year Comprehensive Warranty</h3>
                    <p className="text-muted-foreground text-lg font-medium">Complete product coverage and support</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 text-shadow">Ready to Upgrade Your Safety?</h2>
            <p className="text-xl text-white/90 mb-16 leading-relaxed font-medium">
              Join thousands of professionals who trust CleanSpace for their respiratory protection. Experience the difference of advanced PAPR technology.
            </p>

            <div className="flex flex-col sm:flex-row gap-8 justify-center">
              <Button
                size="lg"
                className="px-16 py-8 text-xl font-bold bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white border-0 shadow-lg shadow-[rgb(27,208,118)]/25 hover:shadow-xl hover:shadow-[rgb(27,208,118)]/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 min-h-[56px]"
                asChild
              >
                <a
                  href="https://cleanspacetechnology.com/email-your-request/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDemoRequest("cta")}
                >
                  Request Info
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-16 py-8 text-xl font-bold border-2 border-[rgb(27,208,118)] text-white hover:bg-white hover:text-[rgb(4,45,35)] bg-transparent/10 backdrop-blur-sm shadow-lg hover:shadow-white/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 min-h-[56px]"
                asChild
              >
                <a
                  href="https://cleanspacetechnology.com/email-my-quote/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackQuoteRequest("cta")}
                >
                  Get Quote
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Get In Touch</h2>
            <p className="text-xl text-muted-foreground font-medium">
              Ready to discuss your respiratory protection needs? <span className="font-semibold text-[rgb(27,208,118)]">Expert consultation</span> available worldwide.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            <Card className="border-0 shadow-2xl text-center bg-background/80 backdrop-blur-sm hover:shadow-primary/10 transition-all duration-500 transform hover:-translate-y-2">
              <CardHeader className="pb-6 pt-12">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-8 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-xl">
                  <Phone className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground mb-4">Call Us</CardTitle>
                <CardDescription className="text-muted-foreground text-lg font-bold">
                  <a
                    href="tel:+61284364000"
                    className="font-bold text-foreground text-xl hover:text-primary transition-colors"
                    onClick={() => trackContactClick("phone")}
                  >
                    +61 2 8436 4000
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-2xl text-center bg-background/80 backdrop-blur-sm hover:shadow-accent/10 transition-all duration-500 transform hover:-translate-y-2">
              <CardHeader className="pb-6 pt-12">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-8 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-xl">
                  <Mail className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground mb-4">Email</CardTitle>
                <CardDescription className="text-muted-foreground text-lg font-bold">
                  <a
                    href="mailto:sales@cleanspacetechnology.com"
                    className="hover:text-accent transition-colors"
                    onClick={() => trackContactClick("email")}
                  >
                    sales@cleanspacetechnology.com
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-2xl text-center bg-background/80 backdrop-blur-sm hover:shadow-secondary/10 transition-all duration-500 transform hover:-translate-y-2">
              <CardHeader className="pb-6 pt-12">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-8 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-xl">
                  <Globe className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground mb-4">Website</CardTitle>
                <CardDescription className="text-muted-foreground text-lg font-bold">
                  <a
                    href="https://www.cleanspacetechnology.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-secondary transition-colors"
                    onClick={() => trackContactClick("website")}
                  >
                    www.cleanspacetechnology.com
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-border bg-background">
        <div className="container mx-auto text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a
              href="https://cleanspacetechnology.com/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://cleanspacetechnology.com/terms-and-conditions/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms & Conditions
            </a>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © 2025 CleanSpace Technology. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
