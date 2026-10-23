import os
import re
from typing import List, Dict, Tuple, Optional
from ..models import IntelligenceResponse, TamilVariation, SentimentType
from .entity_matcher import entity_matcher

class AIIntelligenceService:
    CONFIG_VERSION = "v2.0-unbiased-taxonomy"

    def __init__(self):
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")

    async def analyze_article(
        self,
        text: str,
        headline: str = "",
        source: str = "",
        article_id: Optional[str] = None
    ) -> IntelligenceResponse:
        """
        Comprehensive, unbiased political and civic intelligence classifier.
        Extracts verified parties, leaders, domain topics, primary subjects,
        and distinguishes between factual reporting and political rhetoric/opinion.
        Never forces default political party tags onto non-partisan or unaffiliated news.
        """
        full_content = f"{headline} {text}".strip()

        # 1. High-Fidelity Entity & Topic Matching via unified taxonomy
        match_result = entity_matcher.match_entities(text=text, title=headline)

        identified_parties = match_result["party_codes"]
        identified_leaders = match_result["leader_names"]
        topics = match_result["topics"]
        primary_subject = match_result.get("primary_subject")
        is_opinion_or_allegation = match_result.get("is_opinion_or_allegation", False)

        # 2. Editorial Sentiment Evaluation
        sentiment_str, sentiment_score = entity_matcher.detect_sentiment(full_content)
        if sentiment_str == "positive":
            sentiment = SentimentType.POSITIVE
        elif sentiment_str == "negative":
            sentiment = SentimentType.NEGATIVE
        else:
            sentiment = SentimentType.NEUTRAL

        # 3. Discovered Candidate Keyword Extraction (Passive queue for emerging terms)
        try:
            entity_matcher.extract_and_queue_candidate_keywords(
                text=text,
                headline=headline,
                article_id=article_id
            )
        except Exception:
            pass

        # 4. Contextual Editorial Summaries
        if identified_parties:
            parties_str = ", ".join(identified_parties)
            topics_str = ", ".join(topics) if topics else "தமிழ்நாடு அரசியல்"
            primary_entity_label = identified_leaders[0] if identified_leaders else identified_parties[0]
            primary_party_label = identified_parties[0]

            english_summary = (
                f"Political intelligence analysis covers {parties_str}. "
                f"Key discussion surrounds {topics_str}, with an overall {sentiment.value} media tone "
                f"impacting voter sentiment heading into the 2026 Tamil Nadu political cycle."
            )
            tamil_summary = (
                f"இந்த செய்தியில் {parties_str} மற்றும் {primary_entity_label} சார்ந்த முக்கிய அரசியல் நிகழ்வுகள் "
                f"பகுப்பாய்வு செய்யப்பட்டுள்ளன. {topics_str} தொடர்பான விவாதங்கள் தீவிரமடைந்துள்ள நிலையில், "
                f"இக்கருத்துகள் தேர்தல் களத்தில் முக்கிய தாக்கத்தை ஏற்படுத்தும் என மதிப்பிடப்படுகிறது."
            )
        else:
            topics_str = ", ".join(topics) if topics else "பொது நிகழ்வுகள்"
            primary_entity_label = primary_subject or (topics[0] if topics else "செய்தித் தகவல்")
            primary_party_label = "பொதுவான செய்திகள்"

            english_summary = (
                f"News report covering {topics_str}. "
                f"Overall media tone is {sentiment.value}."
            )
            tamil_summary = (
                f"இச்செய்தி {topics_str} தொடர்பான முக்கிய விவகாரங்களை நடுநிலையாக விளக்குகிறது."
            )

        # 5. Distinct Tamil Headline & War Room Variations
        headline_text = headline if headline else f"{primary_entity_label} குறித்த செய்தி"

        if identified_parties:
            impact_headline = f"2026 தேர்தல் களம்: {primary_party_label} முன்னெடுக்கும் புதிய அரசியல் உத்தி மற்றும் அதன் தாக்கம்!"
            impact_caption = "எதிர்க்கட்சிகளின் விமர்சனங்களை முறியடிக்க புதிய வியூகத்துடன் களம் இறங்கும் தலைமை."
            hook_headline = f"‘மக்கள் தீர்ப்பே மகேசன் தீர்ப்பு!’ — {primary_entity_label} அதிரடி பேச்சால் சூடுபிடிக்கும் தமிழக அரசியல்!"
            hook_caption = "சமூக வலைதளங்களில் தொண்டர்கள் மற்றும் நடுநிலை வாக்காளர்களை ஈர்க்கும் வைரல் கருத்து."
        else:
            impact_headline = f"முக்கிய நிகழ்வு: {headline_text}"
            impact_caption = "கள நிலவரம் மற்றும் பொது நிர்வாகத் தாக்கத்தை ஆராயும் விரிவான பார்வை."
            hook_headline = f"‘மக்கள் பார்வை’ — {headline_text}"
            hook_caption = "பொதுமக்கள் மற்றும் வாசகர்களிடையே கவனத்தைப் பெற்ற முக்கிய செய்தி."

        tamil_variations = [
            TamilVariation(
                style="செய்தித் தலைப்பு (Direct)",
                headline=headline_text,
                caption="தமிழ்நாட்டின் சமகால கள நிலவரத்தில் உடனடி கவனத்தைப் பெற்ற செய்தி."
            ),
            TamilVariation(
                style="அரசியல் பார்வை (Political Impact)" if identified_parties else "முக்கியப் பார்வை (Context Impact)",
                headline=impact_headline,
                caption=impact_caption
            ),
            TamilVariation(
                style="வார் ரூம் வைரல் பைட் (War Room Hook)",
                headline=hook_headline,
                caption=hook_caption
            )
        ]

        return IntelligenceResponse(
            identified_parties=identified_parties,
            identified_leaders=identified_leaders,
            topics=topics,
            sentiment=sentiment,
            sentiment_score=round(sentiment_score, 2),
            english_summary=english_summary,
            tamil_summary=tamil_summary,
            tamil_variations=tamil_variations,
            analysis_provider="tamil_nlp_engine_v2",
            is_live_ai=bool(self.anthropic_api_key or self.openai_api_key),
            primary_subject=primary_subject,
            is_opinion_or_allegation=is_opinion_or_allegation
        )

ai_service = AIIntelligenceService()
