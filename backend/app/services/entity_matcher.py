import re
import json
import sqlite3
import os
import time
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "warroom.db")

SEED_TOPICS = [
    {
        "id": "election_2026",
        "name_en": "2026 Assembly Election",
        "name_ta": "2026 சட்டமன்ற தேர்தல்",
        "category": "Elections & Alliances",
        "keywords_en": ["2026 election", "assembly election", "vote share", "campaign", "alliance", "seat sharing", "constituency"],
        "keywords_ta": ["சட்டமன்ற தேர்தல்", "தேர்தல் களம்", "கூட்டணி", "தொகுதி பங்கீடு", "வாக்கு வங்கி", "தேர்தல் பிரச்சாரம்"],
        "hashtags": ["#TNAssemblyElection2026", "#Election2026", "#TNElection", "#தேர்தல்2026"],
        "negative_keywords": ["panchayat election 2019", "parliament election 2024"],
        "related_party_codes": ["DMK", "AIADMK", "TVK", "BJP", "NTK", "VCK"],
        "related_leader_names": ["M.K. Stalin", "Thalapathy Vijay", "Edappadi K. Palaniswami", "K. Annamalai", "Seeman"]
    },
    {
        "id": "magalir_urimai",
        "name_en": "Kalaignar Magalir Urimai Thogai",
        "name_ta": "கலைஞர் மகளிர் உரிமைத் தொகை",
        "category": "Welfare & Social Justice",
        "keywords_en": ["magalir urimai", "women financial assistance", "1000 rupees scheme", "monthly aid", "welfare scheme"],
        "keywords_ta": ["மகளிர் உரிமைத் தொகை", "ரூ.1000 திட்டம்", "பெண்கள் உரிமை தொகை", "மகளிர் உரிமை", "குடும்பத்தலைவிகள்"],
        "hashtags": ["#MagalirUrimaiThogai", "#மகளிர்உரிமைத்தொகை", "#TNGovtSchemes"],
        "negative_keywords": [],
        "related_party_codes": ["DMK"],
        "related_leader_names": ["M.K. Stalin", "Udhayanidhi Stalin"]
    },
    {
        "id": "tvk_political_entry",
        "name_en": "TVK Vijay Political Movement",
        "name_ta": "தவெக விஜய் அரசியல் களம்",
        "category": "New Political Formations",
        "keywords_en": ["tvk", "thalapathy vijay", "tamizhaga vettri kazhagam", "vijay political conference", "vikravandi conference"],
        "keywords_ta": ["தவெக", "விஜய்", "தளபதி விஜய்", "தமிழக வெற்றிக் கழகம்", "மாநாடு", "விக்கிரவாண்டி மாநாடு"],
        "hashtags": ["#TVKVijay", "#TamizhagaVettriKazhagam", "#தவெக", "#TVK"],
        "negative_keywords": ["leo movie", "goat trailer", "cinema news only"],
        "related_party_codes": ["TVK"],
        "related_leader_names": ["Thalapathy Vijay"]
    },
    {
        "id": "power_tariff",
        "name_en": "Power Tariffs & TANGEDCO",
        "name_ta": "மின் கட்டண உயர்வு & டான்ஜெட்கோ",
        "category": "State Infrastructure & Economy",
        "keywords_en": ["electricity tariff", "power tariff hike", "tangedco", "power cut", "commercial electricity"],
        "keywords_ta": ["மின்கட்டணம்", "மின் கட்டண உயர்வு", "டான்ஜெட்கோ", "மின்சார வாரியம்", "மின்வெட்டு"],
        "hashtags": ["#ElectricityTariff", "#TANGEDCO", "#மின்கட்டணஉயர்வு"],
        "negative_keywords": [],
        "related_party_codes": ["AIADMK", "BJP", "DMK"],
        "related_leader_names": ["Edappadi K. Palaniswami", "K. Annamalai"]
    },
    {
        "id": "cauvery_water",
        "name_en": "Cauvery Riparian Rights & Agriculture",
        "name_ta": "காவிரி நீர் உரிமை & விவசாயிகள் நலன்",
        "category": "Riparian Rights & Agriculture",
        "keywords_en": ["cauvery water", "mekedatu dam", "cwma", "farmers protest", "delta agriculture", "kuruvai crop"],
        "keywords_ta": ["காவிரி நீர்", "மேகதாது", "டெல்டா விவசாயிகள்", "காவிரி மேலாண்மை ஆணையம்", "குறுவை சாகுபடி"],
        "hashtags": ["#CauveryWaterIssue", "#Mekedatu", "#SaveCauveryFarmers", "#காவிரி"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "AIADMK", "PMK", "NTK"],
        "related_leader_names": ["M.K. Stalin", "Seeman", "Dr. Anbumani Ramadoss"]
    },
    {
        "id": "industrial_development",
        "name_en": "Industrial Investment & Sipcot Jobs",
        "name_ta": "தொழில் முதலீடுகள் & சிப்காட் வேலைவாய்ப்பு",
        "category": "Economic Policy & Employment",
        "keywords_en": ["global investors meet", "mou signed", "sipcot", "ev manufacturing", "semiconductor plant", "tamil nadu gdp"],
        "keywords_ta": ["தொழில் முதலீடு", "சிப்காட்", "வேலைவாய்ப்பு", "முதலீட்டாளர் மாநாடு", "தொழிற்சாலைகள்"],
        "hashtags": ["#TNIndustrialGrowth", "#InvestInTN", "#TamilNaduEconomy"],
        "negative_keywords": [],
        "related_party_codes": ["DMK"],
        "related_leader_names": ["M.K. Stalin", "TRB Rajaa"]
    },
    {
        "id": "chennai_infrastructure",
        "name_en": "Chennai Infrastructure & Flood Mitigation",
        "name_ta": "சென்னை உள்கட்டமைப்பு & மழை வெள்ளத் தடுப்பு",
        "category": "Urban Infrastructure & Governance",
        "keywords_en": ["chennai rain", "storm water drain", "metro rail phase 2", "flood mitigation", "gcc chennai", "singara chennai"],
        "keywords_ta": ["சென்னை மழை", "மழைநீர் வடிகால்", "மெட்ரோ ரயில்", "வெள்ளத் தடுப்பு பணி", "சிங்கார சென்னை"],
        "hashtags": ["#ChennaiRain", "#ChennaiMetro", "#SingaraChennai"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "AIADMK"],
        "related_leader_names": ["M.K. Stalin", "Udhayanidhi Stalin"]
    },
    {
        "id": "law_and_order",
        "name_en": "Law & Order, Governance Controversies",
        "name_ta": "சட்டம் ஒழுங்கு & நிர்வாக சர்ச்சை",
        "category": "Governance & Public Safety",
        "keywords_en": ["law and order", "cbi probe", "police action", "hooch tragedy", "custodial issue", "governor dispute"],
        "keywords_ta": ["சட்டம் ஒழுங்கு", "கள்ளக்குறிச்சி", "போலீஸ் விசாரணை", "ஆளுநர் விவகாரம்", "சிபிஐ"],
        "hashtags": ["#TNLawAndOrder", "#TamilNaduPolitics"],
        "negative_keywords": [],
        "related_party_codes": ["AIADMK", "BJP", "DMK"],
        "related_leader_names": ["Edappadi K. Palaniswami", "K. Annamalai", "R.N. Ravi"]
    },
    {
        "id": "neet_and_education",
        "name_en": "NEET Exemption & State Education Policy",
        "name_ta": "நீட் தேர்வு விலக்கு & மாநில கல்வி உரிமை",
        "category": "Education & Social Justice",
        "keywords_en": ["neet exemption", "state education policy", "education bill", "medical entrance", "governor assent"],
        "keywords_ta": ["நீட் தேர்வு", "நீட் விலக்கு", "கல்வி உரிமை", "மாநில கல்வி கொள்கை"],
        "hashtags": ["#BanNEET", "#NEETExemption", "#நீட்விலக்கு"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "AIADMK", "VCK"],
        "related_leader_names": ["M.K. Stalin", "Udhayanidhi Stalin", "Thol. Thirumavalavan"]
    },
    {
        "id": "fiscal_federalism",
        "name_en": "Central Funds & Delimitation Rights",
        "name_ta": "மத்திய நிதிப் பகிர்வு & தொகுதி மறுவரையறை",
        "category": "Federalism & National Politics",
        "keywords_en": ["delimitation", "central tax share", "finance commission", "states rights", "federalism", "south india representation"],
        "keywords_ta": ["மத்திய நிதி", "தொகுதி மறுவரையறை", "வரி பகிர்வு", "மாநில சுயாட்சி", "கூட்டாட்சி தத்துவம்"],
        "hashtags": ["#FiscalFederalism", "#StopDelimitation", "#StateRights"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "VCK", "INC", "BJP"],
        "related_leader_names": ["M.K. Stalin", "Thol. Thirumavalavan"]
    },
    # Non-Partisan & Domain Topics
    {
        "id": "sports_and_youth",
        "name_en": "Sports & Youth Affairs",
        "name_ta": "விளையாட்டு & இளைஞர் நலம்",
        "category": "Sports & Culture",
        "keywords_en": ["cricket", "ipl", "football", "chess", "olympics", "bengaluru stadium", "match", "tournament", "trophy", "batsman", "bowler", "wicket"],
        "keywords_ta": ["கிரிக்கெட்", "விளையாட்டு", "ஐபிஎல்", "செஸ்", "கால்பந்து", "போட்டி", "மைதானம்", "சதம்", "விளையாட்டு அரங்கம்"],
        "hashtags": ["#TNSports", "#Cricket", "#IPL", "#விளையாட்டு"],
        "negative_keywords": [],
        "related_party_codes": [],
        "related_leader_names": []
    },
    {
        "id": "entertainment_cinema",
        "name_en": "Cinema & Arts",
        "name_ta": "திரைத்துறை & கலை",
        "category": "Entertainment",
        "keywords_en": ["box office", "movie review", "film director", "actor", "actress", "cinema", "trailer", "teaser", "song release", "kollywood"],
        "keywords_ta": ["திரைப்படம்", "சினிமா", "திரைத்துறை", "நடிகர்", "நடிகை", "இயக்குனர்", "டிரெய்லர்", "பாடல் வெளியீடு", "பாக்ஸ் ஆபீஸ்"],
        "hashtags": ["#Kollywood", "#Cinema", "#TamilCinema"],
        "negative_keywords": [],
        "related_party_codes": [],
        "related_leader_names": []
    },
    {
        "id": "civic_weather_disaster",
        "name_en": "Civic Affairs & Weather",
        "name_ta": "வானிலை & உள்ளாட்சி விவகாரங்கள்",
        "category": "Civic & Environment",
        "keywords_en": ["weather forecast", "heavy rain", "cyclone", "rainfall", "heatwave", "water supply", "drinking water", "roads", "civic amenities"],
        "keywords_ta": ["வானிலை", "மழை", "கனமழை", "புயல்", "வெப்ப அலை", "குடிநீர் விநியோகம்", "சாலை சீரமைப்பு", "உள்ளாட்சி"],
        "hashtags": ["#TNWeather", "#RainAlert", "#வானிலை"],
        "negative_keywords": [],
        "related_party_codes": [],
        "related_leader_names": []
    },
    {
        "id": "crime_judiciary",
        "name_en": "Judiciary, Crime & Public Safety",
        "name_ta": "நீதிமன்றம் & சட்ட அமலாக்கம்",
        "category": "Law & Judiciary",
        "keywords_en": ["high court", "supreme court", "madras high court", "bail", "arrested", "police custody", "fir registered", "court verdict", "judge"],
        "keywords_ta": ["நீதிமன்றம்", "சென்னை உயர்நீதிமன்றம்", "உச்ச நீதிமன்றம்", "ஜாமீன்", "கைது", "காவல்துறை விசாரணை", "தீர்ப்பு", "வழக்கு", "நீதிபதி"],
        "hashtags": ["#MadrasHighCourt", "#LegalNews", "#நீதிமன்றம்"],
        "negative_keywords": [],
        "related_party_codes": [],
        "related_leader_names": []
    },
    {
        "id": "national_international",
        "name_en": "National & International Affairs",
        "name_ta": "தேசிய & சர்வதேச நிகழ்வுகள்",
        "category": "National & Global",
        "keywords_en": ["parliament", "central government", "donald trump", "us election", "strait of hormuz", "iran", "bengaluru", "new delhi", "supreme court of india"],
        "keywords_ta": ["மத்திய அரசு", "நாடாளுமன்றம்", "புது டெல்லி", "சர்வதேசம்", "கர்நாடகா", "பெங்களூரு", "அமெரிக்கா"],
        "hashtags": ["#NationalNews", "#GlobalAffairs", "#மத்தியஅரசு"],
        "negative_keywords": [],
        "related_party_codes": [],
        "related_leader_names": []
    }
]

PARTIES_CONFIG = [
    {
        "code": "DMK",
        "name": "Dravida Munnetra Kazhagam",
        "tamil_name": "திராவிட முன்னேற்றக் கழகம்",
        "color": "#DC2626",
        "symbol": "Rising Sun (உதயசூரியன்)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["dmk", "திமுக", "திராவிட முன்னேற்றக் கழகம்", "stalin", "ஸ்டாலின்", "udhayanidhi", "உதயநிதி", "kalaignar", "கலைஞர்", "ஸ்டாலினின்", "கனிமொழி"],
        "hashtags": ["#DMK", "#MKStalin", "#DMK4TN", "#திராவிடமாடல்", "#DravidianModel"]
    },
    {
        "code": "AIADMK",
        "name": "All India Anna Dravida Munnetra Kazhagam",
        "tamil_name": "அனைத்திந்திய அண்ணா திராவிட முன்னேற்றக் கழகம்",
        "color": "#16A34A",
        "symbol": "Two Leaves (இரட்டை இலை)",
        "alliance": "AIADMK Alliance",
        "keywords": ["aiadmk", "அதிமுக", "அதிமுக பொதுச்செயலாளர்", "edappadi", "பழனிசாமி", "eps", "இபிஎஸ்", "எடப்பாடியார்", "ஜெயலலிதா", "எம்ஜிஆர்"],
        "hashtags": ["#AIADMK", "#EPS", "#EdappadiPalaniswami", "#அதிமுக"]
    },
    {
        "code": "BJP",
        "name": "Bharatiya Janata Party (Tamil Nadu)",
        "tamil_name": "பாரதிய ஜனதா கட்சி",
        "color": "#EA580C",
        "symbol": "Lotus (தாமரை)",
        "alliance": "National Democratic Alliance (NDA)",
        "keywords": ["bjp", "பாஜக", "பாரதிய ஜனதா", "annamalai", "அண்ணாமலை", "narendra modi", "மோடி", "கமலாலயம்", "நயினார் நாகேந்திரன்", "தமிழிசை"],
        "hashtags": ["#TNBJP", "#Annamalai", "#BJP4TN", "#பாஜக"]
    },
    {
        "code": "TVK",
        "name": "Tamilaga Vettri Kazhagam",
        "tamil_name": "தமிழக வெற்றிக் கழகம்",
        "color": "#EAB308",
        "symbol": "Whistle / Flag (தவெக கொடி)",
        "alliance": "Independent",
        "keywords": ["tvk", "தவெக", "தமிழக வெற்றிக் கழகம்", "thalapathy vijay", "தளபதி விஜய்", "விஜய்", "tvk vijay", "புஸ்ஸி ஆனந்த்"],
        "hashtags": ["#TVKVijay", "#TamizhagaVettriKazhagam", "#தவெக", "#TVK"]
    },
    {
        "code": "NTK",
        "name": "Naam Tamilar Katchi",
        "tamil_name": "நாம் தமிழர் கட்சி",
        "color": "#84CC16",
        "symbol": "Microphone (ஒலிவாங்கி)",
        "alliance": "Independent",
        "keywords": ["ntk", "நாம் தமிழர்", "நாம் தமிழர் கட்சி", "seeman", "சீமான்", "தமிழ்த்தேசியம்", "காளியம்மாள்", "நாதக"],
        "hashtags": ["#NaamTamilarKatchi", "#Seeman", "#நாம்_தமிழர்"]
    },
    {
        "code": "VCK",
        "name": "Viduthalai Chiruthaigal Katchi",
        "tamil_name": "விடுதலைச் சிறுத்தைகள் கட்சி",
        "color": "#2563EB",
        "symbol": "Pot (பானை)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["vck", "விசிக", "விடுதலைச் சிறுத்தைகள்", "thirumavalavan", "திருமாவளவன்", "தொல். திருமாவளவன்", "வன்னியரசு", "ஷாநவாஸ்"],
        "hashtags": ["#VCK", "#Thirumavalavan", "#விசிக"]
    },
    {
        "code": "INC",
        "name": "Indian National Congress (Tamil Nadu)",
        "tamil_name": "இந்திய தேசிய காங்கிரஸ்",
        "color": "#0284C7",
        "symbol": "Hand (கை)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["congress", "காங்கிரஸ்", "tncc", "செல்வப்பெருந்தகை", "ராகுல் காந்தி", "சத்யமூர்த்தி பவன்"],
        "hashtags": ["#TNCC", "#Congress", "#INC"]
    },
    {
        "code": "PMK",
        "name": "Pattali Makkal Katchi",
        "tamil_name": "பாட்டாளி மக்கள் கட்சி",
        "color": "#CA8A04",
        "symbol": "Mango (மாம்பழம்)",
        "alliance": "NDA",
        "keywords": ["pmk", "பாமக", "பாட்டாளி மக்கள் கட்சி", "anbumani", "அன்புமணி", "ராமதாஸ்", "டாக்டர் ராமதாஸ்", "தைலாபுரம்"],
        "hashtags": ["#PMK", "#AnbumaniRamadoss", "#பாமக"]
    },
    {
        "code": "DMDK",
        "name": "Desiya Murpokku Dravida Kazhagam",
        "tamil_name": "தேசிய முற்போக்கு திராவிட கழகம்",
        "color": "#9333EA",
        "symbol": "Murasu (முரசு)",
        "alliance": "AIADMK Alliance",
        "keywords": ["dmdk", "தேமுதிக", "தேசிய முற்போக்கு திராவிட கழகம்", "விஜயகாந்த்", "பிரேமலதா", "விஜய பிரபாகரன்"],
        "hashtags": ["#DMDK", "#Vijayakanth", "#தேமுதிக"]
    },
    {
        "code": "CPI",
        "name": "Communist Party of India (Tamil Nadu)",
        "tamil_name": "இந்திய கம்யூனிஸ்ட் கட்சி",
        "color": "#DC2626",
        "symbol": "Ears of Corn & Sickle (கதிர் அரிவாள்)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["சிபிஐ கட்சி", "இந்திய கம்யூனிஸ்ட்", "முத்தரசன்", "ஆர். முத்தரசன்", "ஜீவா இல்லம்"],
        "hashtags": ["#CPI", "#Mutharasan", "#கம்யூனிஸ்ட்"]
    },
    {
        "code": "CPM",
        "name": "Communist Party of India (Marxist)",
        "tamil_name": "மார்க்சிஸ்ட் கம்யூனிஸ்ட் கட்சி",
        "color": "#B91C1C",
        "symbol": "Hammer, Sickle & Star (சுத்தியல் அரிவாள்)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["cpm", "சிபிஎம்", "மார்க்சிஸ்ட்", "மார்க்சிஸ்ட் கம்யூனிஸ்ட்", "பாலகிருஷ்ணன்", "கே. பாலகிருஷ்ணன்"],
        "hashtags": ["#CPIM", "#CPM", "#மார்க்சிஸ்ட்"]
    },
    {
        "code": "MDMK",
        "name": "Marumalarchi Dravida Munnetra Kazhagam",
        "tamil_name": "மறுமலர்ச்சி திராவிட முன்னேற்றக் கழகம்",
        "color": "#EA580C",
        "symbol": "Top (பம்பரம்)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["mdmk", "மதிமுக", "மறுமலர்ச்சி திராவிட முன்னேற்றக் கழகம்", "வைகோ", "துரை வைகோ", "தாயகம்"],
        "hashtags": ["#MDMK", "#Vaiko", "#மதிமுக"]
    },
    {
        "code": "IUML",
        "name": "Indian Union Muslim League",
        "tamil_name": "இந்திய யூனியன் முஸ்லிம் லீக்",
        "color": "#059669",
        "symbol": "Ladder (ஏணி)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["iuml", "முஸ்லிம் லீக்", "இந்திய யூனியன் முஸ்லிம் லீக்", "காதர் மொகிதீன்"],
        "hashtags": ["#IUML", "#முஸ்லிம்லீக்"]
    },
    {
        "code": "AMMK",
        "name": "Amma Makkal Munnettra Kazagam",
        "tamil_name": "அம்மா மக்கள் முன்னேற்றக் கழகம்",
        "color": "#0284C7",
        "symbol": "Cooker (பிரஷர் குக்கர்)",
        "alliance": "NDA",
        "keywords": ["ammk", "அமமுக", "அம்மா மக்கள் முன்னேற்றக் கழகம்", "டிடிவி தினகரன்", "தினகரன்"],
        "hashtags": ["#AMMK", "#TTVDhinakaran", "#அமமுக"]
    }
]

LEADERS_CONFIG = [
    {
        "name": "M.K. Stalin",
        "tamil_name": "மு.க. ஸ்டாலின்",
        "party_code": "DMK",
        "keywords": ["m.k. stalin", "mk stalin", "stalin", "முதல்வர் ஸ்டாலின்", "ஸ்டாலின்", "மு.க.ஸ்டாலின்", "மு.க. ஸ்டாலின்", "தளபதி ஸ்டாலின்"]
    },
    {
        "name": "Thalapathy Vijay",
        "tamil_name": "தளபதி விஜய்",
        "party_code": "TVK",
        "keywords": ["thalapathy vijay", "vijay", "நடிகர் விஜய்", "தவெக தலைவர் விஜய்", "தளபதி விஜய்", "விஜய்", "விஜய்யின்"]
    },
    {
        "name": "Edappadi K. Palaniswami",
        "tamil_name": "எடப்பாடி கே. பழனிசாமி",
        "party_code": "AIADMK",
        "keywords": ["edappadi k. palaniswami", "edappadi palaniswami", "eps", "எடப்பாடி கே. பழனிசாமி", "எடப்பாடி கே.பழனிசாமி", "எடப்பாடி பழனிசாமி", "இபிஎஸ்", "எடப்பாடியார்", "எடப்பாடி"]
    },
    {
        "name": "K. Annamalai",
        "tamil_name": "கே. அண்ணாமலை",
        "party_code": "BJP",
        "keywords": ["k. annamalai", "annamalai", "அண்ணாமலை", "கே. அண்ணாமலை", "பாஜக அண்ணாமலை"]
    },
    {
        "name": "Udhayanidhi Stalin",
        "tamil_name": "உதயநிதி ஸ்டாலின்",
        "party_code": "DMK",
        "keywords": ["udhayanidhi stalin", "udhayanidhi", "உதயநிதி", "துணை முதல்வர் உதயநிதி", "உதயநிதி ஸ்டாலின்"]
    },
    {
        "name": "Seeman",
        "tamil_name": "சீமான்",
        "party_code": "NTK",
        "keywords": ["seeman", "சீமான்", "செந்தமிழன் சீமான்", "நாம் தமிழர் சீமான்"]
    },
    {
        "name": "Thol. Thirumavalavan",
        "tamil_name": "தொல். திருமாவளவன்",
        "party_code": "VCK",
        "keywords": ["thirumavalavan", "thol thirumavalavan", "திருமாவளவன்", "தொல். திருமாவளவன்", "எழுச்சித் தமிழர்"]
    },
    {
        "name": "Dr. Anbumani Ramadoss",
        "tamil_name": "மருத்துவர் அன்புமணி ராமதாஸ்",
        "party_code": "PMK",
        "keywords": ["anbumani ramadoss", "anbumani", "அன்புமணி ராமதாஸ்", "அன்புமணி", "சின்ன அய்யா"]
    },
    {
        "name": "Dr. S. Ramadoss",
        "tamil_name": "மருத்துவர் ச. ராமதாஸ்",
        "party_code": "PMK",
        "keywords": ["மருத்துவர் ராமதாஸ்", "டாக்டர் ராமதாஸ்", "ராமதாஸ்"]
    },
    {
        "name": "O. Panneerselvam",
        "tamil_name": "ஓ. பன்னீர்செல்வம்",
        "party_code": "AIADMK",
        "keywords": ["o. panneerselvam", "panneerselvam", "ops", "ஓ. பன்னீர்செல்வம்", "பன்னீர்செல்வம்", "ஓபிஎஸ்"]
    },
    {
        "name": "T.T.V. Dhinakaran",
        "tamil_name": "டி.டி.வி. தினகரன்",
        "party_code": "AMMK",
        "keywords": ["t.t.v. dhinakaran", "ttv dhinakaran", "டி.டி.வி. தினகரன்", "டிடிவி தினகரன்", "தினகரன்"]
    },
    {
        "name": "Premallatha Vijayakant",
        "tamil_name": "பிரேமலதா விஜயகாந்த்",
        "party_code": "DMDK",
        "keywords": ["premallatha vijayakant", "premalatha", "பிரேமலதா", "பிரேமலதா விஜயகாந்த்"]
    },
    {
        "name": "K. Selvaperunthagai",
        "tamil_name": "கு. செல்வப்பெருந்தகை",
        "party_code": "INC",
        "keywords": ["selvaperunthagai", "செல்வப்பெருந்தகை", "கு. செல்வப்பெருந்தகை", "காங்கிரஸ் செல்வப்பெருந்தகை"]
    },
    {
        "name": "Vaiko",
        "tamil_name": "வைகோ",
        "party_code": "MDMK",
        "keywords": ["vaiko", "வைகோ", "மதிமுக வைகோ"]
    },
    {
        "name": "R. Mutharasan",
        "tamil_name": "ஆர். முத்தரசன்",
        "party_code": "CPI",
        "keywords": ["mutharasan", "முத்தரசன்", "ஆர். முத்தரசன்"]
    },
    {
        "name": "K. Balakrishnan",
        "tamil_name": "கே. பாலகிருஷ்ணன்",
        "party_code": "CPM",
        "keywords": ["balakrishnan", "பாலகிருஷ்ணன்", "கே. பாலகிருஷ்ணன்"]
    },
    {
        "name": "Kanimozhi Karunanidhi",
        "tamil_name": "கனிமொழி கருணாநிதி",
        "party_code": "DMK",
        "keywords": ["kanimozhi", "கனிமொழி", "கனிமொழி எம்.பி", "கனிமொழி கருணாநிதி"]
    }
]

from backend.app.data.db import get_connection, is_postgres

class EntityMatcher:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._initialized = False
        self._topics_cache: Optional[List[Dict[str, Any]]] = None
        self._topics_cache_time: float = 0.0

    def ensure_initialized(self):
        if self._initialized:
            return
        self._ensure_topic_registry()
        self._ensure_discovered_keywords_table()
        self._initialized = True

    def _ensure_topic_registry(self):
        try:
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM topic_registry")
                count = cursor.fetchone()[0]
                if count == 0:
                    now_str = datetime.now(timezone.utc).isoformat()
                    use_pg = is_postgres()
                    for t in SEED_TOPICS:
                        if use_pg:
                            cursor.execute("""
                                INSERT INTO topic_registry (
                                    id, name, tamil_name, name_en, name_ta, category,
                                    keywords_en, keywords_ta, hashtags,
                                    negative_keywords, related_party_codes, related_leader_names,
                                    last_reviewed_at, is_active
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                                ON CONFLICT (id) DO UPDATE SET
                                    name = EXCLUDED.name,
                                    tamil_name = EXCLUDED.tamil_name,
                                    name_en = EXCLUDED.name_en,
                                    name_ta = EXCLUDED.name_ta,
                                    category = EXCLUDED.category
                            """, (
                                t["id"], t["name_en"], t["name_ta"], t["name_en"], t["name_ta"], t["category"],
                                json.dumps(t["keywords_en"]), json.dumps(t["keywords_ta"]),
                                json.dumps(t["hashtags"]), json.dumps(t["negative_keywords"]),
                                json.dumps(t["related_party_codes"]), json.dumps(t["related_leader_names"]),
                                now_str
                            ))
                        else:
                            cursor.execute("""
                                INSERT OR IGNORE INTO topic_registry (
                                    id, name, tamil_name, name_en, name_ta, category,
                                    keywords_en, keywords_ta, hashtags,
                                    negative_keywords, related_party_codes, related_leader_names,
                                    last_reviewed_at, is_active
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                            """, (
                                t["id"], t["name_en"], t["name_ta"], t["name_en"], t["name_ta"], t["category"],
                                json.dumps(t["keywords_en"]), json.dumps(t["keywords_ta"]),
                                json.dumps(t["hashtags"]), json.dumps(t["negative_keywords"]),
                                json.dumps(t["related_party_codes"]), json.dumps(t["related_leader_names"]),
                                now_str
                            ))
                    conn.commit()
        except Exception:
            # Table might not exist yet if called before migrations
            pass

    def _ensure_discovered_keywords_table(self):
        try:
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS discovered_keywords (
                        id TEXT PRIMARY KEY,
                        name_en TEXT NOT NULL,
                        name_ta TEXT NOT NULL,
                        category TEXT DEFAULT 'Emerging Entity',
                        suggested_party_code TEXT,
                        suggested_leader_name TEXT,
                        frequency INTEGER DEFAULT 1,
                        relevance_score REAL DEFAULT 0.5,
                        sample_article_id TEXT,
                        sample_headline TEXT,
                        status TEXT DEFAULT 'pending',
                        discovered_at TEXT NOT NULL,
                        reviewed_at TEXT
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_discovered_status ON discovered_keywords(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_discovered_freq ON discovered_keywords(frequency)")
                conn.commit()
        except Exception:
            pass

    def _get_active_topics(self) -> List[Dict[str, Any]]:
        """
        Loads active topics from `topic_registry` in the database with short-lived memory caching.
        Falls back to SEED_TOPICS if database is unavailable.
        """
        now = time.time()
        if self._topics_cache is not None and (now - self._topics_cache_time) < 60:
            return self._topics_cache

        try:
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, name_en, name_ta, category,
                           keywords_en, keywords_ta, hashtags, negative_keywords,
                           related_party_codes, related_leader_names
                    FROM topic_registry
                    WHERE is_active = 1
                """)
                rows = cursor.fetchall()
                if rows:
                    active = []
                    for r in rows:
                        d = dict(r)
                        active.append({
                            "id": d["id"],
                            "name_en": d.get("name_en") or d.get("name"),
                            "name_ta": d.get("name_ta") or d.get("tamil_name"),
                            "category": d.get("category", "General"),
                            "keywords_en": json.loads(d["keywords_en"]) if isinstance(d["keywords_en"], str) else (d["keywords_en"] or []),
                            "keywords_ta": json.loads(d["keywords_ta"]) if isinstance(d["keywords_ta"], str) else (d["keywords_ta"] or []),
                            "hashtags": json.loads(d["hashtags"]) if isinstance(d["hashtags"], str) else (d["hashtags"] or []),
                            "negative_keywords": json.loads(d["negative_keywords"]) if isinstance(d["negative_keywords"], str) else (d["negative_keywords"] or []),
                            "related_party_codes": json.loads(d["related_party_codes"]) if isinstance(d["related_party_codes"], str) else (d["related_party_codes"] or []),
                            "related_leader_names": json.loads(d["related_leader_names"]) if isinstance(d["related_leader_names"], str) else (d["related_leader_names"] or []),
                        })
                    self._topics_cache = active
                    self._topics_cache_time = now
                    return active
        except Exception:
            pass

        # Fallback to SEED_TOPICS
        return SEED_TOPICS

    def _contains_keyword(self, text: str, kw: str) -> Tuple[bool, Optional[str]]:
        """
        Tests whether keyword exists in text. Uses word boundaries for ASCII/short tokens
        and negative lookbehinds for Tamil sub-token acronyms (e.g. திமுக inside அதிமுக or மதிமுக).
        Returns (found, matched_evidence).
        """
        kw_clean = kw.strip().lower()
        if not kw_clean:
            return False, None

        # Special Tamil acronym disambiguation
        if kw_clean == "திமுக":
            match = re.search(r"(?<![அம])திமுக", text)
            if match:
                return True, match.group(0)
            return False, None

        # Special Tamil acronym for MDMK
        if kw_clean == "மதிமுக":
            match = re.search(r"மதிமுக", text)
            if match:
                return True, match.group(0)
            return False, None

        # If keyword is pure ASCII and short (<= 6 chars, like dmk, eps, ops, bjp, tvk, cpm, vck), enforce word boundaries
        if kw_clean.isascii() and len(kw_clean) <= 6:
            pattern = rf"\b{re.escape(kw_clean)}\b"
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return True, match.group(0)
            return False, None
        else:
            if kw_clean in text.lower():
                return True, kw
            return False, None

    def detect_opinion_or_allegation(self, text: str, title: Optional[str] = "") -> bool:
        """
        Distinguishes between factual reporting and rhetoric, allegations, or opinion statements.
        """
        combined = f"{title or ''} {text or ''}".lower()

        tamil_allegation_markers = [
            "குற்றச்சாட்டு", "விமர்சனம்", "சாடல்", "ஆரோபணம்", "கருத்து",
            "வாதம்", "அறிக்கை", "கூறியதாவது", "தெரிவித்தார்", "பேட்டி",
            "சாடிய", "தாக்கிய", "கண்டனம்", "புகார்"
        ]
        english_allegation_markers = [
            "allegation", "alleges", "alleged", "claims", "criticism",
            "criticizes", "slams", "attacks", "opinion", "editorial",
            "statement", "remarks", "lambasts", "hits out", "accuses",
            "accused", "retaliates"
        ]

        for marker in tamil_allegation_markers:
            if marker in combined:
                return True

        for marker in english_allegation_markers:
            pattern = rf"\b{re.escape(marker)}\b"
            if re.search(pattern, combined):
                return True

        # Check for direct quote markers in title or text
        if ('"' in combined or "“" in combined or "‘" in combined) and any(w in combined for w in ["says", "stated", "கூறினார்", "பேசினார்"]):
            return True

        return False

    def match_entities(self, text: str, title: Optional[str] = "") -> Dict[str, Any]:
        """
        Extracts parties, leaders, topics, and hashtags from Tamil and English content.
        Preserves Unicode Tamil script and avoids false positives via word boundary & negative checks.
        Computes `primary_subject` (highest-salience subject) and `is_opinion_or_allegation`.
        Returns rich matched_entities records alongside legacy list keys.
        """
        title_lower = (title or "").lower()
        text_lower = (text or "").lower()
        combined = f"{title_lower} {text_lower}"
        matched_entities_list: List[Dict[str, Any]] = []

        # Track salience score: Title matches have 3.0x weight, body mentions 1.0x
        salience_scores: Dict[str, float] = {}

        # 1. Match Parties
        matched_parties = set()
        for party in PARTIES_CONFIG:
            party_matched = False
            for kw in party["keywords"]:
                found_title, ev_title = self._contains_keyword(title_lower, kw)
                found_text, ev_text = self._contains_keyword(text_lower, kw)

                if found_title or found_text:
                    # Guard for short tokens: e.g. "inc" in English
                    if kw.lower() == "inc" and "congress" not in combined and "காங்கிரஸ்" not in combined and "tncc" not in combined:
                        continue

                    # Guard for "cpi" vs consumer price index
                    if kw.lower() == "cpi" and any(e in combined for e in ["inflation", "index", "consumer price"]):
                        if not any(p in combined for p in ["communist", "கம்யூனிஸ்ட்", "முத்தரசன்", "கட்சி"]):
                            continue

                    matched_parties.add(party["code"])
                    evidence = ev_title or ev_text
                    matched_entities_list.append({
                        "entity_name": party["name"],
                        "tamil_name": party["tamil_name"],
                        "entity_type": "party",
                        "party_code": party["code"],
                        "confidence": 0.95 if len(kw) > 4 else 0.85,
                        "evidence": evidence,
                        "matched_keyword": kw
                    })

                    score = (3.5 if found_title else 0.0) + (1.0 if found_text else 0.0)
                    party_label = f"{party['code']} ({party['name']})"
                    salience_scores[party_label] = salience_scores.get(party_label, 0.0) + score
                    party_matched = True
                    break

            if not party_matched:
                for tag in party["hashtags"]:
                    found_tag, ev_tag = self._contains_keyword(combined, tag)
                    if found_tag:
                        matched_parties.add(party["code"])
                        matched_entities_list.append({
                            "entity_name": party["name"],
                            "tamil_name": party["tamil_name"],
                            "entity_type": "party",
                            "party_code": party["code"],
                            "confidence": 0.98,
                            "evidence": ev_tag,
                            "matched_keyword": tag
                        })
                        party_label = f"{party['code']} ({party['name']})"
                        salience_scores[party_label] = salience_scores.get(party_label, 0.0) + 1.5
                        break

        # 2. Match Leaders
        matched_leaders = set()
        for leader in LEADERS_CONFIG:
            for kw in leader["keywords"]:
                found_title, ev_title = self._contains_keyword(title_lower, kw)
                found_text, ev_text = self._contains_keyword(text_lower, kw)

                if not (found_title or found_text):
                    continue

                # Negative context guard for Thalapathy Vijay: ignore entertainment/cinema only mentions
                if leader["name"] == "Thalapathy Vijay":
                    is_cinema = any(c in combined for c in ["box office", "movie review", "trailer release", "audio launch", "leo movie", "goat trailer", "cinema news only"])
                    has_politics = any(p in combined for p in ["தவெக", "அரசியல்", "கட்சி", "மாநாடு", "விக்கிரவாண்டி", "politics", "election", "tvk", "சட்டமன்ற", "ஆட்சி"])
                    if is_cinema and not has_politics:
                        continue

                # Negative context guard for EPS: ignore economics "earnings per share"
                if kw.lower() == "eps":
                    has_eps_politics = any(p in combined for p in ["அதிமுக", "எடப்பாடி", "பழனிசாமி", "edappadi", "palaniswami", "politics", "aiadmk", "முதல்வர்", "அரசியல்"])
                    if not has_eps_politics and "earnings" in combined:
                        continue

                matched_leaders.add(leader["name"])
                matched_parties.add(leader["party_code"])
                evidence = ev_title or ev_text
                matched_entities_list.append({
                    "entity_name": leader["name"],
                    "tamil_name": leader["tamil_name"],
                    "entity_type": "leader",
                    "party_code": leader["party_code"],
                    "confidence": 0.95 if len(kw) > 6 else 0.85,
                    "evidence": evidence,
                    "matched_keyword": kw
                })

                score = (4.0 if found_title else 0.0) + (1.5 if found_text else 0.0)
                leader_label = f"{leader['name']} ({leader['party_code']})"
                salience_scores[leader_label] = salience_scores.get(leader_label, 0.0) + score
                break

        # 3. Match Topics (using dynamically loaded active topics)
        active_topics = self._get_active_topics()
        matched_topics = set()
        for t in active_topics:
            # Check negative keywords first
            has_negative = any(neg.lower() in combined for neg in t.get("negative_keywords", []))
            if has_negative:
                continue

            # Check positive keywords
            hit = False
            hit_kw = ""
            found_in_title = False
            for kw in t.get("keywords_en", []) + t.get("keywords_ta", []):
                found_title, ev_title = self._contains_keyword(title_lower, kw)
                found_text, ev_text = self._contains_keyword(text_lower, kw)
                if found_title or found_text:
                    hit = True
                    found_in_title = bool(found_title)
                    hit_kw = ev_title or ev_text
                    break

            if not hit:
                for tag in t.get("hashtags", []):
                    found, evidence = self._contains_keyword(combined, tag)
                    if found:
                        hit = True
                        hit_kw = tag
                        break

            if hit:
                topic_name = t["name_en"]
                matched_topics.add(topic_name)
                matched_entities_list.append({
                    "entity_name": topic_name,
                    "tamil_name": t.get("name_ta") or t.get("tamil_name", topic_name),
                    "entity_type": "topic",
                    "party_code": None,
                    "confidence": 0.90,
                    "evidence": hit_kw,
                    "matched_keyword": hit_kw
                })

                score = (2.5 if found_in_title else 0.0) + 0.8
                topic_label = f"Topic: {topic_name}"
                salience_scores[topic_label] = salience_scores.get(topic_label, 0.0) + score

        # If no topics matched, determine sensible fallback based on whether parties/politics were detected
        if not matched_topics:
            if matched_parties or matched_leaders:
                fallback_topic = "Tamil Nadu State Politics"
            elif any(w in combined for w in ["cricket", "ipl", "match", "கிரிக்கெட்", "விளையாட்டு"]):
                fallback_topic = "Sports & Youth Affairs"
            elif any(w in combined for w in ["court", "high court", "police", "arrest", "நீதிமன்றம்", "காவல்துறை"]):
                fallback_topic = "Judiciary, Crime & Public Safety"
            elif any(w in combined for w in ["weather", "rain", "வானிலை", "மழை"]):
                fallback_topic = "Civic Affairs & Weather"
            else:
                fallback_topic = "General Governance"
            matched_topics.add(fallback_topic)

        # 4. Determine Primary Subject
        primary_subject = None
        if salience_scores:
            primary_subject = max(salience_scores.items(), key=lambda kv: kv[1])[0]

        # 5. Extract Hashtags
        raw_hashtags = re.findall(r"#[\w\u0B80-\u0BFF]+", combined)
        clean_hashtags = list(dict.fromkeys([h for h in raw_hashtags if len(h) > 2]))

        # 6. Opinion / Allegation Detection
        is_opinion_or_allegation = self.detect_opinion_or_allegation(text, title)

        return {
            "party_codes": sorted(list(matched_parties)),
            "leader_names": sorted(list(matched_leaders)),
            "topics": sorted(list(matched_topics)),
            "hashtags": clean_hashtags,
            "matched_entities": matched_entities_list,
            "primary_subject": primary_subject,
            "is_opinion_or_allegation": is_opinion_or_allegation
        }

    def detect_sentiment(self, text: str) -> Tuple[str, float]:
        """
        Evaluates editorial tone. Neutral by default for wire/factual reports.
        """
        lower = text.lower()
        pos_words = ["வெற்றி", "வளர்ச்சி", "பாராட்டு", "சாதனை", "நன்மை", "வரவேற்பு", "முன்னேற்றம்", "success", "praise", "milestone", "lauds", "win"]
        neg_words = ["கண்டனம்", "தோல்வி", "ஊழல்", "எதிர்ப்பு", "சர்ச்சை", "மோச", "தாக்குதல்", "நெருக்கடி", "போராட்டம்", "controversy", "criticism", "scandal", "protest", "slams", "clash"]

        pos_count = sum(1 for w in pos_words if w in lower)
        neg_count = sum(1 for w in neg_words if w in lower)

        if pos_count > neg_count and pos_count >= 1:
            return "positive", min(0.65, 0.2 + (pos_count * 0.15))
        elif neg_count > pos_count and neg_count >= 1:
            return "negative", max(-0.75, -0.2 - (neg_count * 0.15))
        else:
            return "neutral", 0.05

    def extract_and_queue_candidate_keywords(self, text: str, headline: str, article_id: Optional[str] = None):
        """
        Identifies emerging political entities, new campaign hashtags, or recurring proper nouns
        that are not yet registered in the taxonomy, and records them in `discovered_keywords`.
        """
        try:
            combined = f"{headline or ''} {text or ''}"
            # Extract hashtags
            raw_hashtags = re.findall(r"#[\w\u0B80-\u0BFF]{3,}", combined)
            # Extract quoted phrases in Tamil or English
            quoted = re.findall(r"['\"“]([\u0B80-\u0BFF\s]{4,30})['\"”]", combined)

            candidates = []
            known_hashtags = set()
            for p in PARTIES_CONFIG:
                known_hashtags.update([h.lower() for h in p.get("hashtags", [])])
            for t in SEED_TOPICS:
                known_hashtags.update([h.lower() for h in t.get("hashtags", [])])

            for tag in raw_hashtags:
                if tag.lower() not in known_hashtags and len(tag) > 3:
                    candidates.append((tag, tag, "Emerging Hashtag"))

            for q in quoted:
                q_clean = q.strip()
                if len(q_clean) > 4 and len(q_clean.split()) <= 4:
                    candidates.append((q_clean, q_clean, "Political Slogan / Phrase"))

            if not candidates:
                return

            now_iso = datetime.now(timezone.utc).isoformat()
            use_pg = is_postgres()
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                for name_en, name_ta, cat in candidates[:3]:
                    c_id = f"cand_{abs(hash(name_en.lower())) % 10000000:07d}"
                    if use_pg:
                        cursor.execute("""
                            INSERT INTO discovered_keywords (
                                id, name_en, name_ta, category,
                                frequency, relevance_score, sample_article_id, sample_headline,
                                status, discovered_at
                            ) VALUES (?, ?, ?, ?, 1, 0.6, ?, ?, 'pending', ?)
                            ON CONFLICT (id) DO UPDATE SET
                                frequency = discovered_keywords.frequency + 1,
                                sample_headline = EXCLUDED.sample_headline
                        """, (c_id, name_en, name_ta, cat, article_id, (headline or "")[:200], now_iso))
                    else:
                        cursor.execute("""
                            INSERT INTO discovered_keywords (
                                id, name_en, name_ta, category,
                                frequency, relevance_score, sample_article_id, sample_headline,
                                status, discovered_at
                            ) VALUES (?, ?, ?, ?, 1, 0.6, ?, ?, 'pending', ?)
                            ON CONFLICT (id) DO UPDATE SET
                                frequency = frequency + 1,
                                sample_headline = excluded.sample_headline
                        """, (c_id, name_en, name_ta, cat, article_id, (headline or "")[:200], now_iso))
                conn.commit()
        except Exception:
            pass

entity_matcher = EntityMatcher()
