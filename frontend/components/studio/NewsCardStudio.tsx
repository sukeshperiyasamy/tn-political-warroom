"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Sparkles,
  RefreshCw,
  FileCheck,
  AlignLeft,
  AlignCenter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit3,
  BookmarkCheck,
  ShieldCheck,
  Tv,
  UserCheck,
  Copy,
  Check,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  NewsArticle,
  PoliticalParty,
  CardTemplate,
  TamilVariation,
  EditorialVersionItem,
  ArticleEditorialVersionsResponse,
} from "../../types/political";
import {
  fetchEditorialVersions,
  saveEditorialFinal,
} from "../../lib/api";

interface NewsCardStudioProps {
  article: NewsArticle | null;
  parties?: PoliticalParty[];
  templates: CardTemplate[];
}

export function NewsCardStudio({
  article,
  parties,
  templates,
}: NewsCardStudioProps) {
  // Studio navigation tabs: Editorial Engine vs Graphic Card Studio
  const [activeStudioTab, setActiveStudioTab] = useState<"editorial" | "graphic">("editorial");

  // Editorial Engine State
  const [editorialData, setEditorialData] = useState<ArticleEditorialVersionsResponse | null>(null);
  const [editorialLoading, setEditorialLoading] = useState<boolean>(false);
  const [activeVersionType, setActiveVersionType] = useState<"summary" | "detailed" | "social">("summary");
  const [savingFinal, setSavingFinal] = useState<boolean>(false);
  const [finalSuccessMessage, setFinalSuccessMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // In-place edits buffer
  interface VersionEditState {
    title?: string;
    content?: string;
    hook?: string;
    tags?: string[];
  }

  const [editedVersions, setEditedVersions] = useState<{
    summary?: VersionEditState;
    detailed?: VersionEditState;
    social?: VersionEditState;
  }>({});

  // Card Content State
  const [headline, setHeadline] = useState<string>(
    article?.tamil_title || "தென் மாவட்டங்களில் ரூ.45,000 கோடியில் பசுமை தொழில் வழித்தடம்: முதலமைச்சர் அதிரடி!"
  );
  const [subheadline, setSubheadline] = useState<string>(
    article?.tamil_summary || "தொழில்துறை வளர்ச்சியை தென் மாவட்டங்களுக்கும் விரிவுபடுத்தும் வரலாற்றுத் திட்டத்தை தமிழ்நாடு அரசு முறைப்படி தொடங்கியுள்ளது."
  );
  const [categoryTag, setCategoryTag] = useState<string>("தேர்தல் களம் 2026");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("news_clicks");
  const [sourceAttribution, setSourceAttribution] = useState<string>(
    article?.source || "The Hindu (Tamil)"
  );
  const [titleFontSize, setTitleFontSize] = useState<number>(44);
  const [textAlign, setTextAlign] = useState<"left" | "center">("left");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.5);

  const loadEditorialVersions = async (artId: string) => {
    setEditorialLoading(true);
    setFinalSuccessMessage(null);
    try {
      const data = await fetchEditorialVersions(artId);
      if (data) {
        setEditorialData(data);
        if (data.final_version_type) {
          setActiveVersionType(data.final_version_type as "summary" | "detailed" | "social");
        }
        setEditedVersions({
          summary: {
            title: data.version_1_summary.title,
            content: data.version_1_summary.content,
          },
          detailed: {
            title: data.version_2_detailed.title,
            content: data.version_2_detailed.content,
          },
          social: {
            title: data.version_3_social.title,
            content: data.version_3_social.content,
            hook: data.version_3_social.hook || "",
            tags: [...(data.version_3_social.tags || [])],
          },
        });
      }
    } catch (err) {
      console.error("Failed to load editorial versions:", err);
    } finally {
      setEditorialLoading(false);
    }
  };

  useEffect(() => {
    if (article) {
      setHeadline(article.tamil_title || article.title || "");
      setSubheadline(article.tamil_summary || article.summary || "");
      setSourceAttribution(article.source || "");
      loadEditorialVersions(article.id);
    }
  }, [article?.id]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setPreviewScale(width > 0 ? width / 1080 : 0.5);
      }
    };
    updateScale();
    const timer = setTimeout(updateScale, 50);
    window.addEventListener("resize", updateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateScale);
    };
  }, [activeStudioTab]);

  const fallbackTemplates: CardTemplate[] = [
    {
      id: "news_clicks",
      name: "News Clicks",
      channel_name: "NEWS CLICKS",
      image_url: "/studio-cards/news-clicks.jpeg",
      style_category: "Broadcast Red",
      theme_bg: "#4D0407",
      theme_text: "#FFFFFF",
      accent_color: "#E11D48",
      border_style: "2px solid #FFFFFF",
      badge_style: "bg-rose-600 text-white",
    },
    {
      id: "news_trends_tamil",
      name: "News Trends Tamil",
      channel_name: "NEWS TRENDS தமிழ்",
      image_url: "/studio-cards/news-trends-tamil.jpeg",
      style_category: "Tamil News Red",
      theme_bg: "#660B0B",
      theme_text: "#FFFFFF",
      accent_color: "#F59E0B",
      border_style: "2px solid #FFFFFF",
      badge_style: "bg-amber-500 text-black",
    },
  ];

  const filteredTemplates = (templates && templates.length > 0)
    ? templates.filter((t) => t.id === "news_clicks" || t.id === "news_trends_tamil")
    : [];
  const displayTemplates = filteredTemplates.length === 2 ? filteredTemplates : fallbackTemplates;
  const activeTemplate =
    displayTemplates.find((t) => t.id === selectedTemplateId) || displayTemplates[0];

  // Quick preset headlines
  const quickPresets = [
    {
      label: "முதலமைச்சர் அறிவிப்பு",
      category: "அரசு நலத்திட்டம்",
      title: "மகளிர் உரிமைத் தொகையில் கூடுதலாக 8 லட்சம் தாய்மார்கள் இணைப்பு: தமிழ்நாடு அரசு!",
      sub: "குடும்பத் தலைவிகளின் பொருளாதார தற்சார்பை உறுதிசெய்யும் சமூகநீதி திட்டத்தின் அடுத்த கட்ட விரிவாக்கம்.",
    },
    {
      label: "எதிர்க்கட்சி அறிக்கை",
      category: "எதிர்க்கட்சி கண்டனம்",
      title: "மின்கட்டண உயர்வால் மக்கள் அவதி: உடனடி நடவடிக்கை தேவை என எதிர்க்கட்சி பொதுச்செயலாளர் அறிக்கை!",
      sub: "கொங்கு மண்டலத்தில் பல்லாயிரக்கணக்கான தொண்டர்கள் மத்தியில் முக்கிய அரசியல் தலைவர்கள் ஆவேச உரை.",
    },
    {
      label: "தவெக விஜய் மாநாடு",
      category: "மாற்று அரசியல்",
      title: "‘இரு துருவ அரசியலுக்கு முடிவு கட்டுவோம்!’ — இளைஞர்கள் மத்தியில் தீவிர அரசியல் சூளுரை!",
      sub: "2026 தமிழ்நாடு சட்டமன்ற தேர்தல் களத்தில் புதிய மாற்றத்திற்கான அரசியல் முன்னெடுப்பு.",
    },
    {
      label: "மத்திய நிதி அறிக்கை",
      category: "திட்ட ஆய்வு",
      title: "மத்திய திட்ட நிதியை தமிழக அரசு முறையாக செலவிடவில்லை: விரிவான அறிக்கை வெளியீடு!",
      sub: "ஜல் ஜீவன் மற்றும் வீட்டுவசதி திட்டங்களுக்கான நிதி பயன்பாடு குறித்து பகிரங்க புள்ளிவிவர அறிக்கை.",
    },
  ];

  const handleApplyPreset = (preset: typeof quickPresets[0]) => {
    setCategoryTag(preset.category);
    setHeadline(preset.title);
    setSubheadline(preset.sub);
  };

  const handleApplyVariation = (variation: TamilVariation) => {
    setHeadline(variation.headline);
    setSubheadline(variation.caption);
  };

  const handleTitleChange = (vType: "summary" | "detailed" | "social", val: string) => {
    setEditedVersions((prev) => ({
      ...prev,
      [vType]: {
        ...(prev[vType] || {}),
        title: val,
      },
    }));
  };

  const handleContentChange = (vType: "summary" | "detailed" | "social", val: string) => {
    setEditedVersions((prev) => ({
      ...prev,
      [vType]: {
        ...(prev[vType] || {}),
        content: val,
      },
    }));
  };

  const handleTagsChange = (val: string[]) => {
    setEditedVersions((prev) => ({
      ...prev,
      social: {
        ...(prev.social || {}),
        tags: val,
      },
    }));
  };

  const handleSelectAsFinal = async (vType: "summary" | "detailed" | "social") => {
    if (!article?.id || !editorialData) return;
    setSavingFinal(true);
    setFinalSuccessMessage(null);
    try {
      const curContent =
        vType === "summary"
          ? (editedVersions.summary?.content ?? editorialData.version_1_summary.content)
          : vType === "detailed"
          ? (editedVersions.detailed?.content ?? editorialData.version_2_detailed.content)
          : (editedVersions.social?.content ?? editorialData.version_3_social.content);

      const res = await saveEditorialFinal(article.id, {
        final_version_type: vType,
        final_version_content: curContent,
        version_1_summary_content: editedVersions.summary?.content ?? editorialData.version_1_summary.content,
        version_2_detailed_content: editedVersions.detailed?.content ?? editorialData.version_2_detailed.content,
        version_3_social_content: editedVersions.social?.content ?? editorialData.version_3_social.content,
      });

      setEditorialData(res);
      setFinalSuccessMessage(`Version (${vType.toUpperCase()}) saved and marked as FINAL.`);
    } catch (err: any) {
      alert("Failed to save final version: " + (err.message || "Unknown error"));
    } finally {
      setSavingFinal(false);
    }
  };

  const handlePushToGraphicCard = (versionItem: EditorialVersionItem) => {
    const vType = versionItem.version_type as "summary" | "detailed" | "social";
    const curTitle = editedVersions[vType]?.title ?? versionItem.title;
    const curContent = editedVersions[vType]?.content ?? versionItem.content;
    setHeadline(curTitle);
    setSubheadline(curContent.slice(0, 160) + (curContent.length > 160 ? "..." : ""));
    setActiveStudioTab("graphic");
  };

  const handleCopyVersionText = (versionItem: EditorialVersionItem) => {
    const vType = versionItem.version_type as "summary" | "detailed" | "social";
    const curTitle = editedVersions[vType]?.title ?? versionItem.title;
    const curContent = editedVersions[vType]?.content ?? versionItem.content;
    const tags = (vType === "social" ? editedVersions.social?.tags : versionItem.tags) || [];

    let text = `${curTitle}\n\n${curContent}`;
    if (tags.length > 0) {
      text += `\n\n${tags.join(" ")}`;
    }
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxY?: number
  ): number => {
    const paragraphs = text.split("\n");
    let currentY = y;

    for (let p = 0; p < paragraphs.length; p++) {
      const paragraph = paragraphs[p].trim();
      if (!paragraph) {
        currentY += lineHeight * 0.5;
        continue;
      }
      const words = paragraph.split(" ");
      let line = "";
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          if (maxY && currentY + lineHeight > maxY) {
            ctx.fillText(line.trim() + "...", x, currentY);
            return currentY;
          }
          ctx.fillText(line.trim(), x, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        if (maxY && currentY > maxY) {
          return currentY;
        }
        ctx.fillText(line.trim(), x, currentY);
        currentY += lineHeight;
      }
    }
    return currentY;
  };

  // 1080x1080 High-Performance PNG Export Action using Original Template Background
  const handleExportPNG = async () => {
    setIsExporting(true);
    setDownloadSuccess(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to create canvas 2D context");
      }

      // 1. Draw Original Template Background Image
      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      const imgSrc =
        activeTemplate.image_url ||
        (activeTemplate.id === "news_trends_tamil"
          ? "/studio-cards/news-trends-tamil.jpeg"
          : "/studio-cards/news-clicks.jpeg");

      await new Promise<void>((resolve) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => {
          // If image fails to load via URL, still proceed with template background fill
          resolve();
        };
        bgImg.src = imgSrc;
      });

      if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, 1080, 1080);
      } else {
        ctx.fillStyle = activeTemplate.theme_bg || "#4D0407";
        ctx.fillRect(0, 0, 1080, 1080);
      }

      // Safe content area bounds strictly inside template borders & below top-right logo
      const contentLeft = 105;
      const contentRight = 975;
      const contentWidth = contentRight - contentLeft; // 870px
      const topY = 180;
      const bottomY = 960;

      const channelDisplayName =
        activeTemplate.channel_name ||
        (activeTemplate.id === "news_trends_tamil" ? "NEWS TRENDS தமிழ்" : "NEWS CLICKS");

      // 2. Top Metadata inside Content Area (Category Pill, Channel & Date)
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.5;
      const catText = (categoryTag || "செய்தி அறிக்கை").toUpperCase();
      ctx.font = "bold 18px 'Noto Sans Tamil', 'Latha', sans-serif";
      const catWidth = ctx.measureText(catText).width + 28;

      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(contentLeft, topY, catWidth, 36, 8);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(contentLeft, topY, catWidth, 36);
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "middle";
      ctx.fillText(catText, contentLeft + 14, topY + 18);

      // Channel name indicator beside category pill
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 20px 'Noto Sans Tamil', sans-serif";
      ctx.fillText(channelDisplayName, contentLeft + catWidth + 16, topY + 18);

      // Date on top right
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "16px monospace";
      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      ctx.fillText(dateStr, contentRight, topY + 18);

      // Top divider below header
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(contentLeft, topY + 46);
      ctx.lineTo(contentRight, topY + 46);
      ctx.stroke();
      ctx.restore();

      // 3. Main Headline & Supporting News Text
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      // Decorative Accent Stripe
      const stripeX = textAlign === "center" ? 540 - 45 : contentLeft;
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(stripeX, topY + 70, 90, 6);

      // White Bold Headline
      ctx.fillStyle = "#FFFFFF";
      const headlineFontSize = Math.min(Math.max(titleFontSize, 32), 60);
      ctx.font = `bold ${headlineFontSize}px 'Noto Sans Tamil', 'Latha', 'Mukta Malar', sans-serif`;
      ctx.textAlign = textAlign;
      const textX = textAlign === "center" ? 540 : contentLeft;
      const headlineStartY = topY + 125;
      const headlineEndY = wrapText(
        ctx,
        headline,
        textX,
        headlineStartY,
        contentWidth,
        headlineFontSize * 1.35,
        bottomY - 140
      );

      // Supporting News Content in Clean White/Off-White Readable Font
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "500 26px 'Noto Sans Tamil', 'Latha', 'Mukta Malar', sans-serif";
      wrapText(
        ctx,
        subheadline,
        textX,
        headlineEndY + 45,
        contentWidth,
        42,
        bottomY - 45
      );
      ctx.restore();

      // 4. Footer Divider & Source Attribution inside Content Area
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(contentLeft, bottomY - 32);
      ctx.lineTo(contentRight, bottomY - 32);
      ctx.stroke();

      // Source Attribution (Left)
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "14px monospace";
      ctx.fillText("EDITORIAL SOURCE / செய்தி மூலம்:", contentLeft, bottomY - 10);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px 'Noto Sans Tamil', 'Latha', sans-serif";
      ctx.fillText(sourceAttribution || "Official News Wire", contentLeft, bottomY + 18);

      // Channel Stamp (Right)
      ctx.textAlign = "right";
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 20px 'Noto Sans Tamil', sans-serif";
      ctx.fillText(channelDisplayName, contentRight, bottomY - 10);

      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "15px 'Noto Sans Tamil', sans-serif";
      ctx.fillText("தமிழ்நாடு அரசியல் ஊடக களம்", contentRight, bottomY + 18);
      ctx.restore();

      // 5. Trigger High-Res PNG Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      const filename = `${activeTemplate.id}_news_card_${Date.now()}.png`;
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(filename);
    } catch (err) {
      console.error("Canvas export failed:", err);
      alert("Failed to render card canvas. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const versionList: {
    type: "summary" | "detailed" | "social";
    num: number;
    titleEn: string;
    tamilLabel: string;
    item: EditorialVersionItem;
  }[] = editorialData ? [
    {
      type: "summary",
      num: 1,
      titleEn: "Summarized News",
      tamilLabel: "சுருக்கமான செய்தி அறிக்கை (Factual & Concise)",
      item: editorialData.version_1_summary,
    },
    {
      type: "detailed",
      num: 2,
      titleEn: "Detailed News",
      tamilLabel: "விரிவான அரசியல் பின்னணி (Expanded Context & Verified Facts)",
      item: editorialData.version_2_detailed,
    },
    {
      type: "social",
      num: 3,
      titleEn: "Social Media / Influencer Format",
      tamilLabel: "சமூக ஊடக விவாத வடிவம் (Lead Hook, Talking Points & Hashtags)",
      item: editorialData.version_3_social,
    },
  ] : [];

  const activeItem =
    activeVersionType === "summary"
      ? editorialData?.version_1_summary
      : activeVersionType === "detailed"
      ? editorialData?.version_2_detailed
      : editorialData?.version_3_social;

  const activeEdit = editedVersions[activeVersionType] || {};

  return (
    <div className="space-y-6">
      {/* Selected Article Context Masthead & Legal Guardrail */}
      {article && (
        <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono uppercase text-ink-muted font-bold text-[10px]">Active Story Context:</span>
              <span className="font-bold font-mono text-ink">{article.source}</span>
              <span className="text-zinc-300">•</span>
              {article.source_type === "INFLUENCER" ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  <UserCheck className="w-2.5 h-2.5" />
                  INFLUENCER
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  <Tv className="w-2.5 h-2.5" />
                  NEWS MEDIA
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-subtle text-ink-soft border border-line uppercase">
                {article.platform || "web"}
              </span>
              <span className="text-ink-muted font-mono text-[10px]">
                {new Date(article.published_at).toLocaleString("en-IN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft hover:text-ink hover:underline"
              >
                <span>Original Dispatch</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <h1 className="font-tamil font-bold text-base sm:text-lg text-ink leading-snug">
            {article.tamil_title || article.title}
          </h1>

          {/* Legal Guardrail & Publishing Disclaimer Box */}
          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider font-mono text-[10px] block text-amber-800">
                Editorial Guardrail & Publishing Notice
              </span>
              <span>
                Publishing requires separate explicit action. Content generated is factually guarded and requires manual authorization before external distribution. No automated posting occurs.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Studio Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-subtle p-1.5 rounded-lg border border-line">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveStudioTab("editorial")}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded text-xs font-bold transition-all cursor-pointer min-h-[42px] sm:min-h-[36px] ${
              activeStudioTab === "editorial"
                ? "bg-ink text-white shadow-card"
                : "text-ink-soft hover:text-ink hover:bg-line"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. 3-Version Editorial Engine</span>
            {editorialData?.final_version_type && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-white font-mono uppercase">
                FINAL: {editorialData.final_version_type}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveStudioTab("graphic")}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded text-xs font-bold transition-all cursor-pointer min-h-[42px] sm:min-h-[36px] ${
              activeStudioTab === "graphic"
                ? "bg-ink text-white shadow-card"
                : "text-ink-soft hover:text-ink hover:bg-line"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>2. 1080×1080 Social Graphic Studio</span>
          </button>
        </div>

        {activeStudioTab === "graphic" && (
          <button
            id="export-png-btn"
            onClick={handleExportPNG}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded text-xs font-semibold bg-ink hover:bg-ink-soft text-white shadow-card transition-colors cursor-pointer disabled:opacity-50 min-h-[42px] sm:min-h-[36px] w-full sm:w-auto"
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
        )}
      </div>

      {downloadSuccess && activeStudioTab === "graphic" && (
        <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <FileCheck className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
          <span>
            Successfully exported <strong className="font-mono">{downloadSuccess}</strong> as 1080×1080 PNG. Download complete!
          </span>
        </div>
      )}

      {/* SECTION 1: 3-Version Editorial Engine View */}
      {activeStudioTab === "editorial" && (
        <div className="space-y-6">
          {finalSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{finalSuccessMessage}</span>
              </div>
              <button
                onClick={() => setFinalSuccessMessage(null)}
                className="text-ink-muted hover:text-ink-soft text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {editorialLoading ? (
            <div className="p-16 text-center bg-surface border border-line rounded-xl text-ink-muted">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-ink-muted" />
              <p className="text-xs font-medium">Synthesizing 3 guarded editorial versions with verified context...</p>
            </div>
          ) : !editorialData ? (
            <div className="p-12 text-center bg-surface border border-line rounded-xl space-y-2">
              <p className="text-xs text-ink-soft">Select an article from the news wire to generate editorial variations.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 3-Version Switcher Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {versionList.map((ver) => {
                  const isCurrent = ver.type === activeVersionType;
                  const isFinal = editorialData.final_version_type === ver.type;

                  return (
                    <div
                      key={ver.type}
                      onClick={() => setActiveVersionType(ver.type)}
                      className={`p-4 rounded-lg border text-left transition-all cursor-pointer relative ${
                        isCurrent
                          ? "bg-surface border-zinc-900 shadow-sm ring-1 ring-zinc-900"
                          : "bg-canvas border-line hover:border-line-strong hover:bg-surface"
                      }`}
                    >
                      {isFinal && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-card">
                          <Check className="w-2.5 h-2.5" />
                          <span>FINAL</span>
                        </div>
                      )}

                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted mb-1">
                        Version {ver.num}: {ver.titleEn}
                      </div>
                      <div className="font-bold text-ink text-sm mb-0.5 font-tamil">
                        {ver.item.title}
                      </div>
                      <div className="text-xs text-ink-soft mb-2 font-tamil">
                        {ver.tamilLabel}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="px-1.5 py-0.2 rounded bg-subtle text-ink-soft border border-line">
                          {ver.item.version_type}
                        </span>
                        {ver.item.status_label && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {ver.item.status_label}
                          </span>
                        )}
                        <span className="text-ink-muted ml-auto">{ver.item.word_count || 120} words</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Version Detailed In-Place Editor */}
              {activeItem && (
                <div className="bg-surface border border-line rounded-xl p-5 shadow-card space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-ink-soft" />
                        <h3 className="text-sm font-bold text-ink">
                          {activeItem.version_label || activeItem.title}
                        </h3>
                        {editorialData.final_version_type === activeVersionType && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            ✓ Currently Finalized for Distribution
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted font-tamil mt-0.5">
                        {activeVersionType === "summary"
                          ? "சுருக்கமான செய்தி அறிக்கை — Factual & Concise summary"
                          : activeVersionType === "detailed"
                          ? "விரிவான அரசியல் பின்னணி — Detailed political background and context"
                          : "சமூக ஊடக விவாத வடிவம் — High engagement social format with hook and hashtags"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleCopyVersionText(activeItem)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded text-xs font-semibold bg-subtle hover:bg-line text-ink border border-line transition-colors cursor-pointer min-h-[42px] sm:min-h-[36px]"
                        title="Copy text to clipboard"
                        aria-label="Copy text to clipboard"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-ink-soft" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handlePushToGraphicCard(activeItem)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded text-xs font-semibold bg-subtle hover:bg-line text-ink border border-line transition-colors cursor-pointer min-h-[42px] sm:min-h-[36px]"
                        title="Load into 1080×1080 Graphic Studio"
                        aria-label="Send to 1080p Card"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Send to 1080p Card</span>
                      </button>

                      <button
                        onClick={() => handleSelectAsFinal(activeVersionType)}
                        disabled={savingFinal}
                        className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded text-xs font-bold transition-all cursor-pointer min-h-[42px] sm:min-h-[36px] ${
                          editorialData.final_version_type === activeVersionType
                            ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-card"
                            : "bg-ink hover:bg-ink-soft text-white shadow-card"
                        }`}
                        aria-label="Select as final output"
                      >
                        {savingFinal ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Finalizing...</span>
                          </>
                        ) : (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            <span>
                              {editorialData.final_version_type === activeVersionType
                                ? "Update Final Version"
                                : "Select as Final Output"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Editable Headline */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1 font-mono">
                      Headline / Lead Hook (தலைப்பு)
                    </label>
                    <textarea
                      rows={2}
                      value={activeEdit.title ?? activeItem.title}
                      onChange={(e) => handleTitleChange(activeVersionType, e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-tamil text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface font-bold leading-relaxed"
                    />
                  </div>

                  {/* Editable Body Content */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1 font-mono">
                      Body Content & Editorial Discourse (முழு செய்தி / விவாதம்)
                    </label>
                    <textarea
                      rows={8}
                      value={activeEdit.content ?? activeItem.content}
                      onChange={(e) => handleContentChange(activeVersionType, e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2.5 text-xs font-tamil text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface leading-loose"
                    />
                  </div>

                  {/* Version 3 Specific: Lead Hook & Guarded Hashtags */}
                  {activeVersionType === "social" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-line">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 font-mono">
                          Social Opening Hook (ஈர்ப்பு வாசகம்)
                        </label>
                        <input
                          type="text"
                          value={activeEdit.hook ?? activeItem.hook ?? ""}
                          onChange={(e) =>
                            setEditedVersions((prev) => ({
                              ...prev,
                              social: { ...(prev.social || {}), hook: e.target.value },
                            }))
                          }
                          className="w-full bg-canvas border border-line rounded px-2.5 py-1.5 text-xs font-tamil text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 font-mono">
                          Guarded Hashtags (அங்கீகரிக்கப்பட்ட ஹேஷ்டேக்குகள்)
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(activeEdit.tags ?? activeItem.tags ?? []).map((ht: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-subtle text-ink border border-line"
                            >
                              {ht}
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Space-separated hashtags (#TNPolitics #DMK #AIADMK)"
                          value={(activeEdit.tags ?? activeItem.tags ?? []).join(" ")}
                          onChange={(e) => {
                            const tags = e.target.value.split(" ").filter(Boolean);
                            handleTagsChange(tags);
                          }}
                          className="w-full bg-canvas border border-line rounded px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-hidden focus:border-zinc-500 focus:bg-surface"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: 1080x1080 Graphic Card Studio */}
      {activeStudioTab === "graphic" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card">
          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
              Quick Editorial Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {quickPresets.map((pr) => (
                <button
                  key={pr.label}
                  onClick={() => handleApplyPreset(pr)}
                  className="px-2.5 py-1.5 rounded bg-canvas hover:bg-subtle border border-line text-[11px] font-tamil font-semibold text-ink-soft text-left truncate transition-colors cursor-pointer"
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Article Variations if present */}
          {article?.tamil_variations && article.tamil_variations.length > 0 && (
            <div className="p-3 rounded bg-canvas border border-line">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
                Load Article Variation:
              </span>
              <div className="space-y-1">
                {article.tamil_variations.map((v) => (
                  <button
                    key={v.style}
                    onClick={() => handleApplyVariation(v)}
                    className="w-full text-left p-1.5 rounded bg-surface hover:bg-canvas border border-line text-xs text-ink font-tamil truncate transition-colors cursor-pointer"
                  >
                    <span className="text-ink-soft font-mono text-[10px] font-bold block">{v.style}:</span>
                    {v.headline}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template Selection: Exactly 2 Channels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block font-mono">
                Select News Channel Template
              </label>
              <span className="text-[10px] font-mono text-ink-muted">2 Templates Available</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {displayTemplates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                const channelDisplayName =
                  tpl.channel_name ||
                  (tpl.id === "news_trends_tamil" ? "NEWS TRENDS தமிழ்" : "NEWS CLICKS");
                const previewImg =
                  tpl.image_url ||
                  (tpl.id === "news_trends_tamil"
                    ? "/studio-cards/news-trends-tamil.jpeg"
                    : "/studio-cards/news-clicks.jpeg");

                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`group flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "border-rose-600 bg-rose-50/40 ring-2 ring-rose-600 shadow-sm"
                        : "border-line bg-canvas hover:border-line-strong hover:bg-surface"
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Select ${channelDisplayName} template`}
                  >
                    {/* Active selection badge */}
                    {isSelected ? (
                      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-600 text-white flex items-center gap-1 shadow-card">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>SELECTED</span>
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-black/60 text-white/90 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to select
                      </div>
                    )}

                    {/* Template Preview Image */}
                    <div className="w-full aspect-square rounded-lg overflow-hidden border border-black/10 bg-black mb-2 relative">
                      <img
                        src={previewImg}
                        alt={channelDisplayName}
                        className="w-full h-full object-cover select-none"
                      />
                    </div>

                    {/* Channel Name */}
                    <div className="mt-auto">
                      <div className={`text-xs font-bold leading-tight ${isSelected ? "text-rose-950 font-extrabold" : "text-ink"}`}>
                        {tpl.id === "news_trends_tamil" ? (
                          <span className="font-tamil">
                            NEWS TRENDS <span className="text-rose-700">தமிழ்</span>
                          </span>
                        ) : (
                          <span>{channelDisplayName}</span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-ink-muted mt-0.5">
                        1080×1080 Social Card
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tag Input */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Top Category Tag (மேல் வரி பேட்ஜ்)
            </label>
            <input
              type="text"
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value)}
              className="w-full bg-canvas border border-line rounded px-2.5 py-1.5 text-xs text-ink font-tamil focus:outline-hidden focus:border-zinc-500 focus:bg-surface font-medium"
            />
          </div>

          {/* Tamil Headline Textarea */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Main Tamil Headline (முக்கிய தலைப்பு)
            </label>
            <textarea
              rows={3}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-canvas border border-line rounded px-2.5 py-1.5 text-xs text-ink font-tamil focus:outline-hidden focus:border-zinc-500 focus:bg-surface leading-relaxed font-medium"
            />
          </div>

          {/* Tamil Subheadline Textarea */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Subheadline / Impact (துணைத் தலைப்பு)
            </label>
            <textarea
              rows={3}
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full bg-canvas border border-line rounded px-2.5 py-1.5 text-xs text-ink font-tamil focus:outline-hidden focus:border-zinc-500 focus:bg-surface leading-relaxed font-medium"
            />
          </div>

          {/* Typography & Alignment Controls */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-line">
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">
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
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                Text Alignment
              </label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTextAlign("left")}
                  className={`flex-1 flex items-center justify-center p-1.5 rounded border text-xs font-semibold cursor-pointer ${
                    textAlign === "left"
                      ? "bg-ink text-white border-zinc-900"
                      : "bg-canvas text-ink-soft border-line hover:border-line-strong"
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5 mr-1" /> Left
                </button>
                <button
                  onClick={() => setTextAlign("center")}
                  className={`flex-1 flex items-center justify-center p-1.5 rounded border text-xs font-semibold cursor-pointer ${
                    textAlign === "center"
                      ? "bg-ink text-white border-zinc-900"
                      : "bg-canvas text-ink-soft border-line hover:border-line-strong"
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
          <div className="w-full max-w-[540px] flex items-center justify-between text-xs text-ink-muted font-medium mb-2 px-1">
            <span className="font-mono text-[11px]">1080×1080 Native Social Canvas (1:1 Ratio)</span>
            <span className="text-[11px] text-ink-soft font-mono font-semibold">Scale: 50% Preview · 100% Export</span>
          </div>

          {/* Scaled Responsive Preview Wrapper */}
          <div
            ref={containerRef}
            className="w-full max-w-[540px] aspect-square relative overflow-hidden rounded-xl shadow-lg border border-zinc-500/30 bg-black mx-auto"
          >
            {/* The 1080x1080 Actual Node */}
            <div
              ref={cardRef}
              id="tamil-news-card-canvas"
              style={{
                width: "1080px",
                height: "1080px",
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
                backgroundColor: activeTemplate.theme_bg,
                color: activeTemplate.theme_text,
                fontFamily: "'Noto Sans Tamil', 'Latha', 'Mukta Malar', var(--font-tamil), sans-serif",
              }}
              className="box-border select-none overflow-hidden relative pointer-events-none"
            >
              {/* 1. Original Template Background Image */}
              <img
                src={
                  activeTemplate.image_url ||
                  (activeTemplate.id === "news_trends_tamil"
                    ? "/studio-cards/news-trends-tamil.jpeg"
                    : "/studio-cards/news-clicks.jpeg")
                }
                alt=""
                className="absolute inset-0 w-[1080px] h-[1080px] object-cover pointer-events-none select-none z-0"
              />

              {/* 2. Designated Content Area inside template's border & safe from top-right logo */}
              <div
                className="absolute inset-0 z-10 flex flex-col justify-between"
                style={{
                  padding: "180px 105px 105px 105px",
                }}
              >
                {/* Top bar inside content area: Category & Channel Indicator */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/20">
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-md text-xs font-mono font-bold tracking-wider uppercase bg-white/20 text-white border border-white/30 backdrop-blur-xs shadow-card">
                      {categoryTag || "செய்தி அறிக்கை"}
                    </span>
                    <span className="text-white/90 font-mono text-sm tracking-wide font-bold">
                      {activeTemplate.id === "news_trends_tamil" ? (
                        <span className="font-tamil">NEWS TRENDS தமிழ்</span>
                      ) : (
                        <span>NEWS CLICKS</span>
                      )}
                    </span>
                  </div>

                  <div className="text-right text-white/80 font-mono text-xs">
                    {new Date().toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {/* Center content: Headline & Supporting News Text */}
                <div
                  className="my-auto py-4 space-y-5"
                  style={{ textAlign: textAlign }}
                >
                  {/* Subtle Accent Stripe */}
                  <div
                    className="w-20 h-1.5 rounded-full bg-amber-400 shadow-card"
                    style={{
                      margin: textAlign === "center" ? "0 auto" : "0",
                    }}
                  />

                  {/* Main Headline */}
                  <h1
                    style={{
                      fontSize: `${titleFontSize}px`,
                      lineHeight: 1.3,
                      fontWeight: 800,
                      textShadow: "0 2px 8px rgba(0, 0, 0, 0.85), 0 4px 16px rgba(0, 0, 0, 0.6)",
                    }}
                    className="font-tamil text-white tracking-tight break-words"
                  >
                    {headline}
                  </h1>

                  {/* Supporting News Text */}
                  <p
                    style={{
                      fontSize: "26px",
                      lineHeight: 1.55,
                      fontWeight: 500,
                      textShadow: "0 2px 6px rgba(0, 0, 0, 0.8)",
                    }}
                    className="font-tamil text-white/95 max-w-4xl break-words"
                  >
                    {subheadline}
                  </p>
                </div>

                {/* Bottom card footer inside border: Source Attribution & Channel Tag */}
                <div className="pt-3.5 border-t border-white/20 flex items-end justify-between text-white">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-mono text-white/70 block mb-0.5">
                      EDITORIAL SOURCE / செய்தி மூலம்:
                    </span>
                    <span className="text-lg font-bold font-tamil text-white drop-shadow-card">
                      {sourceAttribution || "Official News Wire"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold block">
                      {activeTemplate.id === "news_trends_tamil" ? (
                        <span className="font-tamil">NEWS TRENDS தமிழ்</span>
                      ) : (
                        <span>NEWS CLICKS</span>
                      )}
                    </span>
                    <span className="text-[11px] text-white/75 font-tamil block mt-0.5">
                      தமிழ்நாடு அரசியல் ஊடக களம்
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Guidance */}
          <div className="w-full max-w-[540px] mt-3 p-3 rounded bg-surface border border-line text-xs text-ink-soft flex items-center justify-between shadow-card">
            <span>Outputs authentic high-res 1080×1080 PNG</span>
            <button
              onClick={handleExportPNG}
              className="text-ink hover:text-black font-semibold cursor-pointer"
            >
              Export Now →
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
