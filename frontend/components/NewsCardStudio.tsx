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
} from "../types/political";
import {
  fetchEditorialVersions,
  saveEditorialFinal,
} from "../lib/api";

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
      if (article.party_codes && article.party_codes.length > 0) {
        setSelectedPartyCode(article.party_codes[0]);
      }
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
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const fallbackTemplate: CardTemplate = {
    id: "warroom_dark",
    name: "War Room Dark",
    style_category: "editorial",
    theme_bg: "#0B0F19",
    theme_text: "#FFFFFF",
    accent_color: "#E11D48",
    border_style: "solid",
    badge_style: "dark",
  };
  const activeTemplate = (templates && templates.length > 0)
    ? (templates.find((t) => t.id === selectedTemplateId) || templates[0])
    : fallbackTemplate;

  const fallbackParty: PoliticalParty = {
    code: "DMK",
    name: "Dravida Munnetra Kazhagam",
    color: "#DC2626",
    tamil_name: "திராவிட முன்னேற்றக் கழகம்",
    symbol: "Rising Sun",
    alliance: "INDIA",
  };
  const activeParty = (parties && parties.length > 0)
    ? (parties.find((p) => p.code === selectedPartyCode) || parties[0])
    : fallbackParty;

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
        ctx.font = `bold ${titleFontSize * 1.6}px 'Noto Sans Tamil', 'Latha', 'Mukta Malar', sans-serif`;
        ctx.textAlign = textAlign;
        const headlineX = textAlign === "center" ? 540 : 64;
        const headlineY = wrapText(ctx, headline, headlineX, 360, 952, titleFontSize * 2.0);

        // 6. Subheadline
        ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
        ctx.font = "34px 'Noto Sans Tamil', 'Latha', 'Mukta Malar', sans-serif";
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
        ctx.font = "bold 26px 'Noto Sans Tamil', 'Latha', 'Mukta Malar', sans-serif";
        ctx.fillText(sourceAttribution, 64, 1030);

        // Right Branding Stamp
        ctx.textAlign = "right";
        ctx.fillStyle = "#F59E0B";
        ctx.font = "bold 22px monospace";
        ctx.fillText("TN POLITICAL WAR ROOM", 1016, 995);

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "18px 'Noto Sans Tamil', 'Latha', 'Mukta Malar', sans-serif";
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
        <div className="bg-white border border-[#E8E8E2] rounded-lg p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F0EB] pb-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono uppercase text-zinc-500 font-bold text-[10px]">Active Story Context:</span>
              <span className="font-bold font-mono text-zinc-900">{article.source}</span>
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
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                {article.platform || "web"}
              </span>
              <span className="text-zinc-400 font-mono text-[10px]">
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
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
              >
                <span>Original Dispatch</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <h1 className="font-tamil font-bold text-base sm:text-lg text-zinc-900 leading-snug">
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F4F0] p-1.5 rounded-lg border border-[#E8E8E2]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStudioTab("editorial")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold transition-all cursor-pointer ${
              activeStudioTab === "editorial"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. 3-Version Editorial Engine & Finalization</span>
            {editorialData?.final_version_type && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-white font-mono uppercase">
                FINAL: {editorialData.final_version_type}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveStudioTab("graphic")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-bold transition-all cursor-pointer ${
              activeStudioTab === "graphic"
                ? "bg-zinc-900 text-white shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
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
                className="text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {editorialLoading ? (
            <div className="p-16 text-center bg-white border border-[#E8E8E2] rounded-lg text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
              <p className="text-xs font-medium">Synthesizing 3 guarded editorial versions with verified context...</p>
            </div>
          ) : !editorialData ? (
            <div className="p-12 text-center bg-white border border-[#E8E8E2] rounded-lg space-y-2">
              <p className="text-xs text-zinc-600">Select an article from the news wire to generate editorial variations.</p>
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
                          ? "bg-white border-zinc-900 shadow-sm ring-1 ring-zinc-900"
                          : "bg-[#FAFAFA] border-[#E8E8E2] hover:border-zinc-400 hover:bg-white"
                      }`}
                    >
                      {isFinal && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                          <Check className="w-2.5 h-2.5" />
                          <span>FINAL</span>
                        </div>
                      )}

                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        Version {ver.num}: {ver.titleEn}
                      </div>
                      <div className="font-bold text-zinc-900 text-sm mb-0.5 font-tamil">
                        {ver.item.title}
                      </div>
                      <div className="text-xs text-zinc-600 mb-2 font-tamil">
                        {ver.tamilLabel}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {ver.item.version_type}
                        </span>
                        {ver.item.status_label && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {ver.item.status_label}
                          </span>
                        )}
                        <span className="text-zinc-400 ml-auto">{ver.item.word_count || 120} words</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Version Detailed In-Place Editor */}
              {activeItem && (
                <div className="bg-white border border-[#E8E8E2] rounded-lg p-5 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F0EB] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-zinc-700" />
                        <h3 className="text-sm font-bold text-zinc-900">
                          {activeItem.version_label || activeItem.title}
                        </h3>
                        {editorialData.final_version_type === activeVersionType && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            ✓ Currently Finalized for Distribution
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-tamil mt-0.5">
                        {activeVersionType === "summary"
                          ? "சுருக்கமான செய்தி அறிக்கை — Factual & Concise summary"
                          : activeVersionType === "detailed"
                          ? "விரிவான அரசியல் பின்னணி — Detailed political background and context"
                          : "சமூக ஊடக விவாத வடிவம் — High engagement social format with hook and hashtags"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyVersionText(activeItem)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-[#F4F4F0] hover:bg-zinc-200 text-zinc-800 border border-[#E2E2DC] transition-colors cursor-pointer"
                        title="Copy text to clipboard"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-600" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handlePushToGraphicCard(activeItem)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-[#F4F4F0] hover:bg-zinc-200 text-zinc-800 border border-[#E2E2DC] transition-colors cursor-pointer"
                        title="Load into 1080×1080 Graphic Studio"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Send to 1080p Card</span>
                      </button>

                      <button
                        onClick={() => handleSelectAsFinal(activeVersionType)}
                        disabled={savingFinal}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                          editorialData.final_version_type === activeVersionType
                            ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
                            : "bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs"
                        }`}
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1 font-mono">
                      Headline / Lead Hook (தலைப்பு)
                    </label>
                    <textarea
                      rows={2}
                      value={activeEdit.title ?? activeItem.title}
                      onChange={(e) => handleTitleChange(activeVersionType, e.target.value)}
                      className="w-full bg-[#FAFBFD] border border-[#E2E2DC] rounded-lg px-3 py-2 text-sm font-tamil text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white font-bold leading-relaxed"
                    />
                  </div>

                  {/* Editable Body Content */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1 font-mono">
                      Body Content & Editorial Discourse (முழு செய்தி / விவாதம்)
                    </label>
                    <textarea
                      rows={8}
                      value={activeEdit.content ?? activeItem.content}
                      onChange={(e) => handleContentChange(activeVersionType, e.target.value)}
                      className="w-full bg-[#FAFBFD] border border-[#E2E2DC] rounded-lg px-3 py-2.5 text-xs font-tamil text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white leading-loose"
                    />
                  </div>

                  {/* Version 3 Specific: Lead Hook & Guarded Hashtags */}
                  {activeVersionType === "social" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#F0F0EB]">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5 font-mono">
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
                          className="w-full bg-[#FAFBFD] border border-[#E2E2DC] rounded px-2.5 py-1.5 text-xs font-tamil text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5 font-mono">
                          Guarded Hashtags (அங்கீகரிக்கப்பட்ட ஹேஷ்டேக்குகள்)
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(activeEdit.tags ?? activeItem.tags ?? []).map((ht: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200"
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
                          className="w-full bg-[#FAFBFD] border border-[#E2E2DC] rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500 focus:bg-white"
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

          {/* Scaled Responsive Preview Wrapper */}
          <div
            ref={containerRef}
            className="w-full max-w-[540px] aspect-square relative overflow-hidden rounded-lg shadow-md border border-zinc-400 bg-black mx-auto"
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
      )}
    </div>
  );
}
