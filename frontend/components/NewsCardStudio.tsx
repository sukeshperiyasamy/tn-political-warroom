"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  Sparkles,
  RefreshCw,
  FileCheck,
  AlignLeft,
  AlignCenter,
} from "lucide-react";
import {
  NewsArticle,
  PoliticalParty,
  CardTemplate,
  TamilVariation,
} from "../types/political";

interface NewsCardStudioProps {
  article: NewsArticle | null;
  parties: PoliticalParty[];
  templates: CardTemplate[];
}

export function NewsCardStudio({
  article,
  parties,
  templates,
}: NewsCardStudioProps) {
  // Card Content State
  const [headline, setHeadline] = useState<string>(
    article?.tamil_title || "தென் மாவட்டங்களில் ரூ.45,000 கோடியில் பசுமை தொழில் வழித்தடம்: முதலமைச்சர் அதிரடி!"
  );
  const [subheadline, setSubheadline] = useState<string>(
    article?.tamil_summary || "தொழில்துறை வளர்ச்சியை தென் மாவட்டங்களுக்கும் விரிவுபடுத்தும் வரலாற்றுத் திட்டத்தை தமிழ்நாடு அரசு முறைப்படி தொடங்கியுள்ளது."
  );
  const [categoryTag, setCategoryTag] = useState<string>("தேர்தல் களம் 2026");
  const [selectedPartyCode, setSelectedPartyCode] = useState<string>(
    article?.party_codes[0] || "DMK"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("warroom_dark");
  const [sourceAttribution, setSourceAttribution] = useState<string>(
    article?.source || "The Hindu (Tamil)"
  );
  const [titleFontSize, setTitleFontSize] = useState<number>(44);
  const [textAlign, setTextAlign] = useState<"left" | "center">("left");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const activeParty = parties.find((p) => p.code === selectedPartyCode) || parties[0];

  // Quick preset headlines
  const quickPresets = [
    {
      label: "முதலமைச்சர் அறிவிப்பு",
      category: "அரசு நலத்திட்டம்",
      title: "மகளிர் உரிமைத் தொகையில் கூடுதலாக 8 லட்சம் தாய்மார்கள் இணைப்பு: தமிழ்நாடு அரசு!",
      sub: "குடும்பத் தலைவிகளின் பொருளாதார தற்சார்பை உறுதிசெய்யும் சமூகநீதி திட்டத்தின் அடுத்த கட்ட விரிவாக்கம்.",
      party: "DMK",
    },
    {
      label: "எடப்பாடி சூறாவளி உரை",
      category: "எதிர்க்கட்சி கண்டனம்",
      title: "மின்கட்டண உயர்வால் மக்கள் அவதி: விடியா அரசுக்கு பாடம் புகட்டுவோம் என ஈபிஎஸ் முழக்கம்!",
      sub: "கொங்கு மண்டலத்தில் பல்லாயிரக்கணக்கான தொண்டர்கள் மத்தியில் அதிமுக பொதுச்செயலாளர் ஆவேச உரை.",
      party: "AIADMK",
    },
    {
      label: "தவெக விஜய் மாநாடு",
      category: "மாற்று அரசியல்",
      title: "‘இரு துருவ அரசியலுக்கு முடிவு கட்டுவோம்!’ — லட்சக்கணக்கான இளைஞர்கள் மத்தியில் விஜய் சூளுரை!",
      sub: "2026 தமிழ்நாடு சட்டமன்ற தேர்தல் களத்தில் புதிய அரசியல் சக்தியாக உருவெடுக்கும் தமிழக வெற்றிக் கழகம்.",
      party: "TVK",
    },
    {
      label: "அண்ணாமலை வெள்ளை அறிக்கை",
      category: "பாஜக அதிரடி",
      title: "மத்திய திட்ட நிதியை தமிழக அரசு முறையாக செலவிடவில்லை: அண்ணாமலை சரமாரி குற்றச்சாட்டு!",
      sub: "ஜல் ஜீவன் மற்றும் வீட்டுவசதி திட்டங்களுக்கான நிதி பயன்பாடு குறித்து பாஜக பகிரங்க அறிக்கை.",
      party: "BJP",
    },
  ];

  const handleApplyPreset = (preset: typeof quickPresets[0]) => {
    setCategoryTag(preset.category);
    setHeadline(preset.title);
    setSubheadline(preset.sub);
    setSelectedPartyCode(preset.party);
  };

  const handleApplyVariation = (variation: TamilVariation) => {
    setHeadline(variation.headline);
    setSubheadline(variation.caption);
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
    return y;
  };

  // 1080x1080 High-Performance PNG Export Action
  const handleExportPNG = async () => {
    setIsExporting(true);
    setDownloadSuccess(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // 1. Background
        ctx.fillStyle = activeTemplate.theme_bg;
        ctx.fillRect(0, 0, 1080, 1080);

        // 2. Ambient radial glow
        const g1 = ctx.createRadialGradient(900, 150, 50, 900, 150, 450);
        g1.addColorStop(0, activeTemplate.accent_color + "40");
        g1.addColorStop(1, "transparent");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, 1080, 1080);

        const g2 = ctx.createRadialGradient(150, 950, 50, 150, 950, 450);
        g2.addColorStop(0, activeParty.color + "30");
        g2.addColorStop(1, "transparent");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, 1080, 1080);

        // 3. Top divider
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(64, 180);
        ctx.lineTo(1016, 180);
        ctx.stroke();

        // Party Badge
        ctx.fillStyle = activeParty.color;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(64, 64, 84, 84, 18);
        } else {
          ctx.rect(64, 64, 84, 84);
        }
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(activeParty.code, 106, 106);

        // Party Name
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = activeTemplate.theme_text;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText(activeParty.name, 168, 98);

        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.font = "20px sans-serif";
        ctx.fillText(activeParty.tamil_name, 168, 134);

        // Category Tag (Right)
        ctx.textAlign = "right";
        ctx.fillStyle = activeTemplate.accent_color;
        ctx.font = "bold 22px monospace";
        ctx.fillText(categoryTag.toUpperCase(), 1016, 98);

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "16px monospace";
        const dateStr = `TN WARROOM • ${new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;
        ctx.fillText(dateStr, 1016, 130);

        // 4. Accent stripe
        ctx.fillStyle = activeTemplate.accent_color;
        const stripeX = textAlign === "center" ? 490 : 64;
        ctx.fillRect(stripeX, 290, 100, 10);

        // 5. Headline Text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${titleFontSize * 1.6}px 'Noto Sans Tamil', sans-serif`;
        ctx.textAlign = textAlign;
        const headlineX = textAlign === "center" ? 540 : 64;
        const headlineY = wrapText(ctx, headline, headlineX, 360, 952, titleFontSize * 2.0);

        // 6. Subheadline
        ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
        ctx.font = "34px 'Noto Sans Tamil', sans-serif";
        ctx.textAlign = textAlign;
        wrapText(ctx, subheadline, headlineX, headlineY + 50, 952, 48);

        // 7. Footer Divider & Attribution
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(64, 950);
        ctx.lineTo(1016, 950);
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "18px monospace";
        ctx.fillText("EDITORIAL SOURCE / ஊடகம்:", 64, 995);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 26px 'Noto Sans Tamil', sans-serif";
        ctx.fillText(sourceAttribution, 64, 1030);

        // Right Branding Stamp
        ctx.textAlign = "right";
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 22px monospace";
        ctx.fillText("TN POLITICAL WAR ROOM", 1016, 995);

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "18px 'Noto Sans Tamil', sans-serif";
        ctx.fillText("அரசியல் ஊடக நுண்ணறிவு & பகுப்பாய்வு மையம்", 1016, 1030);

        // Trigger Download
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        const filename = `TN_NewsCard_${activeParty.code}_${Date.now()}.png`;
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadSuccess(filename);
      }
    } catch (err) {
      console.error("Canvas export failed:", err);
      alert("Failed to render card canvas. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight font-serif">
                Tamil News Card Studio (1080×1080 Social Export)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Generate native 1080×1080 square editorial graphics with verified Tamil typography for social channels
            </p>
          </div>

          <button
            id="export-png-btn"
            onClick={handleExportPNG}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting 1080p...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export 1080×1080 PNG</span>
              </>
            )}
          </button>
        </div>

        {downloadSuccess && (
          <div className="mt-3 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <FileCheck className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>
              Successfully exported <strong className="font-mono">{downloadSuccess}</strong> as 1080×1080 PNG. Download complete!
            </span>
          </div>
        )}
      </div>

      {/* Editor & Preview Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 bg-white border border-[#E8E8E2] rounded-lg p-4 sm:p-5 shadow-2xs">
          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Quick Editorial Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {quickPresets.map((pr) => (
                <button
                  key={pr.label}
                  onClick={() => handleApplyPreset(pr)}
                  className="px-2.5 py-1.5 rounded bg-[#F9F9F7] hover:bg-zinc-100 border border-[#E8E8E2] text-[11px] font-tamil font-semibold text-zinc-700 text-left truncate transition-colors cursor-pointer"
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Article Variations if present */}
          {article?.tamil_variations && article.tamil_variations.length > 0 && (
            <div className="p-3 rounded bg-[#FDFBF7] border border-[#E8E0D5]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block mb-1.5">
                Load Article Variation:
              </span>
              <div className="space-y-1">
                {article.tamil_variations.map((v) => (
                  <button
                    key={v.style}
                    onClick={() => handleApplyVariation(v)}
                    className="w-full text-left p-1.5 rounded bg-white hover:bg-[#F9F9F7] border border-[#E8E8E2] text-xs text-zinc-800 font-tamil truncate transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-600 font-mono text-[10px] font-bold block">{v.style}:</span>
                    {v.headline}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template Theme Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              Design Theme (6 Styles)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-2 rounded border text-left transition-all cursor-pointer ${
                    selectedTemplateId === tpl.id
                      ? "border-zinc-900 bg-[#F4F4F0] text-zinc-900 font-bold"
                      : "border-[#E8E8E2] bg-[#F9F9F7] text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  <div
                    className="w-full h-2 rounded-xs mb-1"
                    style={{ backgroundColor: tpl.accent_color }}
                  />
                  <div className="text-[11px] font-bold text-zinc-800 truncate">{tpl.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Party Branding Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              Party Branding Badge
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {parties.map((p) => (
                <button
                  key={p.code}
                  onClick={() => setSelectedPartyCode(p.code)}
                  className={`flex items-center gap-1.5 p-1.5 rounded border text-xs font-semibold transition-all cursor-pointer ${
                    selectedPartyCode === p.code
                      ? "border-zinc-900 bg-zinc-900 text-white font-bold"
                      : "border-[#E8E8E2] bg-[#F9F9F7] text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Tag Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Top Category Tag (மேல் வரி பேட்ஜ்)
            </label>
            <input
              type="text"
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value)}
              className="w-full bg-[#F9F9F7] border border-[#E2E2DC] rounded px-2.5 py-1.5 text-xs text-zinc-900 font-tamil focus:outline-hidden focus:border-zinc-500 focus:bg-white font-medium"
            />
          </div>

          {/* Tamil Headline Textarea */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Main Tamil Headline (முக்கிய தலைப்பு)
            </label>
            <textarea
              rows={3}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-[#F9F9F7] border border-[#E2E2DC] rounded px-2.5 py-1.5 text-xs text-zinc-900 font-tamil focus:outline-hidden focus:border-zinc-500 focus:bg-white leading-relaxed font-medium"
            />
          </div>

          {/* Tamil Subheadline Textarea */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Subheadline / Impact (துணைத் தலைப்பு)
            </label>
            <textarea
              rows={3}
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full bg-[#F9F9F7] border border-[#E2E2DC] rounded px-2.5 py-1.5 text-xs text-zinc-900 font-tamil focus:outline-hidden focus:border-zinc-500 focus:bg-white leading-relaxed font-medium"
            />
          </div>

          {/* Typography & Alignment Controls */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#F0F0EB]">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Headline Size: {titleFontSize}px
              </label>
              <input
                type="range"
                min="32"
                max="60"
                value={titleFontSize}
                onChange={(e) => setTitleFontSize(Number(e.target.value))}
                className="w-full accent-zinc-900 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Text Alignment
              </label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTextAlign("left")}
                  className={`flex-1 flex items-center justify-center p-1.5 rounded border text-xs font-semibold cursor-pointer ${
                    textAlign === "left"
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-[#F9F9F7] text-zinc-600 border-[#E8E8E2] hover:border-zinc-300"
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5 mr-1" /> Left
                </button>
                <button
                  onClick={() => setTextAlign("center")}
                  className={`flex-1 flex items-center justify-center p-1.5 rounded border text-xs font-semibold cursor-pointer ${
                    textAlign === "center"
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-[#F9F9F7] text-zinc-600 border-[#E8E8E2] hover:border-zinc-300"
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5 mr-1" /> Center
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live 1080x1080 Canvas Easel */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          <div className="w-full max-w-[540px] flex items-center justify-between text-xs text-zinc-500 font-medium mb-2 px-1">
            <span className="font-mono text-[11px]">1080×1080 Native Social Canvas (1:1 Ratio)</span>
            <span className="text-[11px] text-zinc-600 font-mono font-semibold">Scale: 50% Preview · 100% Export</span>
          </div>

          {/* Scaled Preview Wrapper */}
          <div
            style={{
              position: "relative",
              width: "540px",
              height: "540px",
              overflow: "hidden",
            }}
            className="rounded-lg shadow-md border border-zinc-400 bg-black"
          >
            {/* The 1080x1080 Actual Node */}
            <div
              ref={cardRef}
              id="tamil-news-card-canvas"
              style={{
                width: "1080px",
                height: "1080px",
                transform: "scale(0.5)",
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
                backgroundColor: activeTemplate.theme_bg,
                color: activeTemplate.theme_text,
                fontFamily: "var(--font-tamil), sans-serif",
              }}
              className="p-16 flex flex-col justify-between box-border select-none overflow-hidden pointer-events-none"
            >
              {/* Background Geometric Layer */}
              <div
                className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
                style={{ backgroundColor: activeTemplate.accent_color }}
              />
              <div
                className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
                style={{ backgroundColor: activeParty.color }}
              />

              {/* Top Bar: Brand, Category, Date */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-8">
                {/* Brand & Symbol Badge */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-lg"
                    style={{
                      backgroundColor: activeParty.color,
                      color: "#FFFFFF",
                    }}
                  >
                    {activeParty.code}
                  </div>
                  <div>
                    <span className="text-xl font-bold tracking-wider uppercase font-mono block">
                      {activeParty.name}
                    </span>
                    <span className="text-lg opacity-80 font-tamil">
                      {activeParty.tamil_name}
                    </span>
                  </div>
                </div>

                {/* Category Pill & Verification */}
                <div className="text-right">
                  <span
                    className="inline-block px-5 py-2 rounded-full text-base font-bold uppercase tracking-wider font-mono shadow-sm"
                    style={{
                      backgroundColor: `${activeTemplate.accent_color}25`,
                      color: activeTemplate.accent_color,
                      border: `2px solid ${activeTemplate.accent_color}60`,
                    }}
                  >
                    {categoryTag}
                  </span>
                  <div className="text-sm opacity-60 font-mono mt-2">
                    TN WARROOM • {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </div>

              {/* Main Headline & Context (Middle) */}
              <div
                className="relative z-10 my-auto py-8"
                style={{ textAlign: textAlign }}
              >
                {/* Party Visual Stripe */}
                <div
                  className="w-24 h-2.5 rounded-full mb-8"
                  style={{
                    backgroundColor: activeTemplate.accent_color,
                    margin: textAlign === "center" ? "0 auto 2rem auto" : "0 0 2rem 0",
                  }}
                />

                {/* Primary Tamil Headline */}
                <h1
                  style={{
                    fontSize: `${titleFontSize}px`,
                    lineHeight: 1.25,
                    fontWeight: 800,
                  }}
                  className="font-tamil tracking-tight text-white mb-8 drop-shadow-sm"
                >
                  {headline}
                </h1>

                {/* Tamil Subheadline */}
                <p
                  style={{
                    fontSize: "26px",
                    lineHeight: 1.5,
                  }}
                  className="font-tamil text-slate-300 opacity-90 max-w-4xl"
                >
                  {subheadline}
                </p>
              </div>

              {/* Bottom Card Footer: Source, Verification, Brand Stamp */}
              <div className="relative z-10 pt-8 border-t border-white/10 flex items-end justify-between">
                <div>
                  <span className="text-sm uppercase tracking-wider font-mono opacity-60 block mb-1">
                    Verified Editorial Reporting:
                  </span>
                  <span className="text-xl font-bold font-tamil text-white">
                    {sourceAttribution}
                  </span>
                </div>

                {/* War Room Stamp */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-base font-extrabold uppercase tracking-wider font-mono text-amber-400">
                      TN POLITICAL WAR ROOM
                    </span>
                  </div>
                  <span className="text-sm opacity-60 font-tamil block mt-1">
                    அரசியல் ஊடக நுண்ணறிவு & பகுப்பாய்வு மையம்
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Export Guidance */}
          <div className="w-full max-w-[540px] mt-3 p-3 rounded bg-white border border-[#E8E8E2] text-xs text-zinc-600 flex items-center justify-between shadow-2xs">
            <span>Outputs authentic high-res 1080×1080 PNG</span>
            <button
              onClick={handleExportPNG}
              className="text-zinc-900 hover:text-black font-semibold cursor-pointer"
            >
              Export Now →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
