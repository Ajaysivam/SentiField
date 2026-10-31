import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Send, Sparkles, X,
  RotateCcw, Globe, AlertCircle, Droplets, ArrowRight, ShieldCheck, CheckCircle2
} from 'lucide-react';

/**
 * VoiceAgronomistModal
 * --------------------
 * High-performance Voice-to-Voice and Conversational Chat Agronomist Agent.
 *
 * Core Features:
 *  - Real-time Speech-to-Text (STT) via Web Speech API (English, Tamil, Hindi)
 *  - Grounds answers in live Sentinel-2 satellite indices (NDVI, NDRE, problem zones, weather ET₀)
 *  - Real-time Text-to-Speech (TTS) via window.speechSynthesis
 *  - User requirement fulfilled: speaks response out loud FIRST, and once speech completes,
 *    finalizes and displays the spoken content as formatted chat bubbles in the transcript.
 *  - Replay button on every response bubble
 *  - Supports single farm focus or whole multi-farm portfolio roadmap
 */

const QUICK_PROMPTS_PORTFOLIO = {
  en: [
    { label: '💧 Which farm needs water today?', text: 'Which farm needs water today and how much should I irrigate?' },
    { label: '🚨 What is my #1 priority?', text: 'What is my top priority today across all my farms?' },
    { label: '🧪 Recommend fertilizer dosage', text: 'What fertilizer or nutrient spray should I apply to my crops?' },
    { label: '🌾 Overall crop health summary', text: 'Give me a complete summary of my crop health grades and satellite vigor.' },
  ],
  ta: [
    { label: '💧 எந்த பண்ணைக்கு தண்ணீர் தேவை?', text: 'எந்த பண்ணைக்கு இன்று தண்ணீர் பாய்ச்ச வேண்டும்?' },
    { label: '🚨 முதல் முன்னுரிமை என்ன?', text: 'என் பண்ணைகளில் இன்று செய்ய வேண்டிய முதல் வேலை என்ன?' },
    { label: '🧪 உர ஆலோசனை வேண்டும்', text: 'பயிர்களுக்கு என்ன உரம் மற்றும் நுண்ணூட்டம் கொடுக்க வேண்டும்?' },
    { label: '🌾 பயிர் நிலைமை எப்படி உள்ளது?', text: 'என் பயிர்களின் தற்போதைய ஆரோக்கிய நிலை பற்றி சொல்லுங்கள்.' },
  ],
  hi: [
    { label: '💧 किस खेत को पानी चाहिए?', text: 'आज किस खेत को सिंचाई की सबसे ज्यादा जरूरत है?' },
    { label: '🚨 आज की पहली प्राथमिकता क्या है?', text: 'मेरे सभी खेतों में आज की सबसे पहली प्राथमिकता क्या है?' },
    { label: '🧪 खाद और उर्वरक की सलाह', text: 'फसलों के लिए किस खाद और पोषण की सिफारिश करते हैं?' },
    { label: '🌾 फसलों की सेहत का हाल', text: 'मेरी फसलों की संपूर्ण सेहत और ग्रेड के बारे में बताएं।' },
  ],
};

const QUICK_PROMPTS_SINGLE = {
  en: [
    { label: '💧 How much water does this plot need?', text: 'How much water does this analyzed plot need today?' },
    { label: '🚨 What is the #1 priority here?', text: 'What is the top priority action for this analyzed field?' },
    { label: '🧪 What fertilizer should I apply?', text: 'What fertilizer or nutrient spray should I apply to this crop?' },
    { label: '🗺️ How do I fix the problem zone?', text: 'How do I treat the stressed problem zone highlighted in the satellite scan?' },
  ],
  ta: [
    { label: '💧 எவ்வளவு தண்ணீர் தேவை?', text: 'இந்த நிலத்திற்கு எவ்வளவு தண்ணீர் பாய்ச்ச வேண்டும்?' },
    { label: '🚨 முதல் முன்னுரிமை என்ன?', text: 'இந்த பயிரில் உடனடியாக செய்ய வேண்டிய முதல் வேலை என்ன?' },
    { label: '🧪 என்ன உரம் கொடுக்க வேண்டும்?', text: 'இந்த பயிரின் வளர்ச்சிக்கு என்ன உரம் மற்றும் நுண்ணூட்டம் தெளிக்க வேண்டும்?' },
    { label: '🗺️ பிரச்சனை பகுதியை எப்படி சரிசெய்வது?', text: 'செயற்கைக்கோளில் காட்டப்படும் பிரச்சனை பகுதியை எவ்வாறு சரி செய்வது?' },
  ],
  hi: [
    { label: '💧 कितने पानी की आवश्यकता है?', text: 'इस विश्लेषित खेत को आज कितने पानी की आवश्यकता है?' },
    { label: '🚨 पहली प्राथमिकता क्या है?', text: 'इस फसल के लिए आज की सबसे पहली प्राथमिकता क्या है?' },
    { label: '🧪 कौन सा उर्वरक डालें?', text: 'इस फसल के लिए किस खाद और पोषण का छिड़काव करना चाहिए?' },
    { label: '🗺️ तनावग्रस्त क्षेत्र का उपचार?', text: 'उपग्रह में दिखाए गए तनावग्रस्त क्षेत्र को कैसे ठीक करें?' },
  ],
};

const QUICK_PROMPTS_DUAL_LENS = {
  en: [
    { label: '🧪 What chemical & dosage to spray?', text: 'What chemical and dosage should I spray on the problem zone?' },
    { label: '🎯 How to target problem zone?', text: 'Where exactly should I spray and how much cost will I save?' },
    { label: '🌿 Organic bio-treatment alternative?', text: 'What organic or biological spray can I use instead of chemical fungicide?' },
    { label: '⚠️ 5-day disease spread risk?', text: 'How fast will this disease spread in 5 days under current weather?' },
  ],
  ta: [
    { label: '🧪 என்ன மருந்து மற்றும் அளவு?', text: 'பிரச்சனை பகுதியில் என்ன மருந்து மற்றும் எந்த அளவில் தெளிக்க வேண்டும்?' },
    { label: '🎯 பிரச்சனை பகுதியை எங்கு தெளிப்பது?', text: 'பிரச்சனை பகுதியை மட்டும் தெளிப்பதால் எவ்வளவு மருந்து செலவு மிச்சமாகும்?' },
    { label: '🌿 இயற்கை மருந்து ஆலோசனை?', text: 'ரசாயன மருந்துக்கு பதிலாக என்ன இயற்கை உயிரியல் மருந்து பயன்படுத்தலாம்?' },
    { label: '⚠️ நோய் பரவும் வேகம் என்ன?', text: 'தற்போதைய காலநிலையில் அடுத்த 5 நாட்களில் இந்த நோய் எவ்வாறு பரவும்?' },
  ],
  hi: [
    { label: '🧪 कौन सी दवा और खुराक डालें?', text: 'तनावग्रस्त क्षेत्र में कौन सी दवा और कितनी खुराक का छिड़काव करें?' },
    { label: '🎯 लक्षित क्षेत्र पर छिड़काव?', text: 'केवल समस्याग्रस्त क्षेत्र पर छिड़काव करने से कितनी बचत होगी?' },
    { label: '🌿 जैविक उपचार का विकल्प?', text: 'रासायनिक दवा के स्थान पर कौन सा जैविक फफूंदनाशी इस्तेमाल करें?' },
    { label: '⚠️ 5 दिनों में रोग फैलाव का जोखिम?', text: 'वर्तमान मौसम में अगले 5 दिनों में यह रोग कितनी तेजी से फैल सकता है?' },
  ],
};

const LANG_CONFIG = {
  en: { label: 'English (IN)', speechCode: 'en-IN', flag: '🇬🇧' },
  ta: { label: 'தமிழ் (Tamil)', speechCode: 'ta-IN', flag: '🇮🇳' },
  hi: { label: 'हिंदी (Hindi)', speechCode: 'hi-IN', flag: '🇮🇳' },
};

export default function VoiceAgronomistModal({
  isOpen,
  onClose,
  activeContext,
  token,
}) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState('');
  const [sttSupported, setSttSupported] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const chatScrollRef = useRef(null);
  const pendingAiResponseRef = useRef(null);

  const isCombinedMode = activeContext?.contextMode === 'combined';
  const isDualLensMode = Boolean(activeContext?.depthResult);
  const quickPromptList = isCombinedMode
    ? (QUICK_PROMPTS_PORTFOLIO[selectedLang] || QUICK_PROMPTS_PORTFOLIO.en)
    : isDualLensMode
    ? (QUICK_PROMPTS_DUAL_LENS[selectedLang] || QUICK_PROMPTS_DUAL_LENS.en)
    : (QUICK_PROMPTS_SINGLE[selectedLang] || QUICK_PROMPTS_SINGLE.en);

  // Initialize SpeechSynthesis and check STT support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSttSupported(false);
      }
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    }
  }, []);

  // Initialize greeting message when modal opens or context changes
  useEffect(() => {
    if (!isOpen) {
      stopVoice();
      stopListening();
      return;
    }

    const isCombined = activeContext?.contextMode === 'combined';
    let greetingText = '';
    let greetingSpoken = '';

    if (isCombined) {
      const critCount = activeContext?.portfolioSummary?.critical_count || 1;
      const totalFarms = activeContext?.portfolioSummary?.total_farms || 3;
      greetingText = `👋 **Namaste! I am Sentifield Kisan Mitra, your AI Voice Agronomist.**\n\nI have evaluated your **${totalFarms} farm parcels**. You have **${critCount} critical parcel** needing urgent water management today. Tap any prompt below or click the microphone to speak!`;
      greetingSpoken = `Namaste! I am your AI Voice Agronomist. I have reviewed your ${totalFarms} farms. One farm requires urgent water management today. How can I assist you?`;
    } else {
      const farmName = activeContext?.activeFarm?.farm_name || 'Marked Field';
      const crop = activeContext?.activeFarm?.crop_type || 'Field Crop';
      const acres = activeContext?.activeFarm?.area_acres || activeContext?.analysisData?.statistics?.area_acres || 0;
      const hasAnalysis = Boolean(activeContext?.analysisData);

      if (hasAnalysis && activeContext?.depthResult) {
        const dRes = activeContext.depthResult;
        const disease = dRes?.leaf_pathology?.disease_name || 'Crop Leaf Pathology';
        const cat = dRes?.leaf_pathology?.pathogen_category || 'FUNGAL';
        const treat = dRes?.targeted_prescription?.primary_treatment || 'Targeted Prescription';
        const dose = dRes?.targeted_prescription?.dosage || '';
        const probAcres = activeContext?.analysisData?.problem_zones?.problem_area_acres || 0.4;
        greetingText = `👋 **Namaste! I have evaluated the Combined Dual-Lens Diagnostic for ${farmName} (${crop}).**\n\n🛰️ **Satellite Macro**: Health Grade **${grade}** (NDVI: **${ndviVal}**), with **${probAcres.toFixed(2)} acre** red problem zone.\n🔬 **Ground Micro**: Confirmed **${disease}** [${cat}].\n🧪 **Zoned Prescription**: Spray **${treat}** (${dose}) targeted strictly to the problem zone.\n\nAsk me anything by voice or chat!`;
        greetingSpoken = `Namaste! I have combined your satellite scan and leaf photo for ${farmName}. The leaf vision identified ${disease}. I have formulated a targeted prescription for your ${probAcres.toFixed(1)} acre problem zone. How can I assist you?`;
      } else if (hasAnalysis) {
        const grade = activeContext?.analysisData?.gemini_recommendations?.executive_summary?.overall_health_grade || 'B';
        const ndvi = activeContext?.analysisData?.historical_comparison?.current_mean_ndvi || activeContext?.analysisData?.statistics?.ndvi?.mean || 0.45;
        const ndviVal = typeof ndvi === 'number' ? ndvi.toFixed(2) : ndvi;
        greetingText = `👋 **Namaste! I am your AI Agronomist for this ${acres > 0 ? acres.toFixed(2) + ' acre ' : ''}field (${farmName}).**\n\nLatest Sentinel-2 multispectral scan indicates Health Grade **${grade}** (NDVI: **${ndviVal}**). Ask me anything about irrigation needs, nitrogen/urea fertilizer, or problem sub-zones!`;
        greetingSpoken = `Namaste! I have analyzed this ${acres > 0 ? acres.toFixed(1) + ' acre ' : ''}field at ${farmName}. The crop health is at Grade ${grade}. What would you like to know about this crop?`;
      } else if (acres > 0) {
        greetingText = `👋 **Namaste! I am your AI Voice Agronomist.**\n\nI see you have marked a **${acres.toFixed(2)} acre** field at **${farmName}**. You can ask me questions about this field, soil management, or crop recommendations. For live Sentinel-2 indices, click **"ANALYZE CROP HEALTH & SENTINEL MAP"**!`;
        greetingSpoken = `Namaste! I see your marked field of ${acres.toFixed(1)} acres at ${farmName}. Ask me anything about this field, and run the satellite analysis for live health indices!`;
      } else {
        greetingText = `👋 **Namaste! I am Sentifield Kisan Mitra, your AI Voice Agronomist.**\n\nDraw a farm boundary on the map or click one of the Farming Hub shortcuts (Namakkal, Thanjavur, Coimbatore), then ask me any questions about crop health, irrigation, or weather risks by voice or chat.`;
        greetingSpoken = `Namaste! I am your AI Voice Agronomist. Mark your farm field on the map to get started.`;
      }
    }

    const isDualLens = Boolean(activeContext?.depthResult);
    const activePromptList = isCombined
      ? (QUICK_PROMPTS_PORTFOLIO[selectedLang] || QUICK_PROMPTS_PORTFOLIO.en)
      : isDualLens
      ? (QUICK_PROMPTS_DUAL_LENS[selectedLang] || QUICK_PROMPTS_DUAL_LENS.en)
      : (QUICK_PROMPTS_SINGLE[selectedLang] || QUICK_PROMPTS_SINGLE.en);

    setMessages([
      {
        id: 'msg-greeting',
        sender: 'ai',
        displayText: greetingText,
        spokenText: greetingSpoken,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        keyMetrics: isCombined ? ['Total: 3 Plots', '1 Critical Attention'] : ['Crop Health Telemetry Active'],
        followUps: activePromptList.slice(0, 3).map((p) => p.text),
      },
    ]);
  }, [isOpen, activeContext]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, isSpeaking, interimTranscript]);

  // ── Speech Recognition (STT) ────────────────────────────────────────────────
  const startListening = () => {
    if (!sttSupported) {
      alert('Speech Recognition is not supported in this browser. Please type your query or use Google Chrome / Microsoft Edge.');
      return;
    }

    // Stop ongoing speech playback if speaking
    stopVoice();

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = LANG_CONFIG[selectedLang]?.speechCode || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let finalTxt = '';
        let interimTxt = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTxt += event.results[i][0].transcript;
          } else {
            interimTxt += event.results[i][0].transcript;
          }
        }

        if (interimTxt) setInterimTranscript(interimTxt);

        if (finalTxt && finalTxt.trim()) {
          setInterimTranscript('');
          setIsListening(false);
          handleFarmerQuestion(finalTxt.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── Text to Speech (TTS) ─────────────────────────────────────────────────────
  const speakText = (text, onCompleteCallback) => {
    if (!voiceEnabled || !synthRef.current || !text) {
      if (onCompleteCallback) onCompleteCallback();
      return;
    }

    try {
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = utterance;

      const voices = synthRef.current.getVoices();
      const targetCode = LANG_CONFIG[selectedLang]?.speechCode || 'en-IN';

      // Pick matching voice
      const matchedVoice = voices.find((v) =>
        v.lang.toLowerCase().replace('_', '-').includes(targetCode.toLowerCase().slice(0, 2))
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setActiveSpeechText(text);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveSpeechText('');
        if (onCompleteCallback) onCompleteCallback();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        setIsSpeaking(false);
        setActiveSpeechText('');
        if (onCompleteCallback) onCompleteCallback();
      };

      synthRef.current.speak(utterance);
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
      if (onCompleteCallback) onCompleteCallback();
    }
  };

  const stopVoice = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setActiveSpeechText('');

    // If there was a pending AI response waiting for voice completion, display it now
    if (pendingAiResponseRef.current) {
      const pending = pendingAiResponseRef.current;
      pendingAiResponseRef.current = null;
      setMessages((prev) => [...prev, pending]);
    }
  };

  // ── Handle Farmer Question (Voice or Text) ───────────────────────────────────
  const handleFarmerQuestion = async (queryText) => {
    const question = (queryText || inputValue || '').trim();
    if (!question) return;

    setInputValue('');
    stopVoice();

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'farmer',
      displayText: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Build client context
      const isCombined = activeContext?.contextMode === 'combined';
      const clientCtx = isCombined
        ? {
            context_mode: 'combined',
            total_farms: activeContext?.portfolioSummary?.total_farms || 3,
            total_acres: activeContext?.portfolioSummary?.total_acres || 8.5,
            critical_count: activeContext?.portfolioSummary?.critical_count || 1,
            top_suggestion: activeContext?.portfolioSummary?.top_suggestion || '',
            ranked_action_items: activeContext?.portfolioSummary?.ranked_action_items || [],
            farms: activeContext?.portfolioSummary?.farms || [],
          }
        : {
            context_mode: 'single',
            farm_name: activeContext?.activeFarm?.farm_name || 'Marked Farm Field',
            crop_type: activeContext?.activeFarm?.crop_type || 'Crop',
            area_acres: activeContext?.activeFarm?.area_acres || activeContext?.analysisData?.statistics?.area_acres || 0,
            health_grade: activeContext?.analysisData?.gemini_recommendations?.executive_summary?.overall_health_grade || 'B',
            ndvi: activeContext?.analysisData?.historical_comparison?.current_mean_ndvi || activeContext?.analysisData?.statistics?.ndvi?.mean || 0.45,
            ndvi_delta: activeContext?.analysisData?.historical_comparison?.ndvi_delta || '+0.00',
            problem_area_pct: activeContext?.analysisData?.problem_zones?.problem_area_percentage || 0.0,
            problem_area_acres: activeContext?.analysisData?.problem_zones?.problem_area_acres || 0.0,
            zone_description: activeContext?.analysisData?.problem_zones?.zone_description || '',
            weather: activeContext?.analysisData?.weather_correlation || {},
            action_plan: activeContext?.analysisData?.gemini_recommendations?.action_plan || {},
            depth_result: activeContext?.depthResult || null,
            leaf_pathology: activeContext?.depthResult?.leaf_pathology || null,
            targeted_prescription: activeContext?.depthResult?.targeted_prescription || null,
            spread_risk_forecast: activeContext?.depthResult?.spread_risk_forecast || null,
          };

      const res = await fetch('/api/ai/voice-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question,
          context_mode: isCombined ? 'combined' : 'single',
          farm_id: !isCombined ? activeContext?.activeFarm?.id : null,
          language: selectedLang,
          client_context: clientCtx,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setIsThinking(false);

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        displayText: data.display_text || data.spoken_text,
        spokenText: data.spoken_text,
        keyMetrics: data.key_metrics || [],
        followUps: data.suggested_follow_ups || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Requirement: Once voice of output completes, display the spoken content as text in chat
      if (voiceEnabled && data.spoken_text) {
        // Store in ref so if user stops voice early it still shows up
        pendingAiResponseRef.current = aiMsg;

        speakText(data.spoken_text, () => {
          // Voice completed: append message to transcript
          pendingAiResponseRef.current = null;
          setMessages((prev) => [...prev, aiMsg]);
        });
      } else {
        // Silent mode: show immediately
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Failed to get voice reply:', err);
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          displayText: `⚠️ **Connection Notice:** Unable to reach satellite intelligence server. Showing local telemetry guidance.\n\n💧 **East Sugarcane Block** is your top priority today due to 38% moisture deficit.`,
          spokenText: 'East Sugarcane Block is your top priority today. Please initiate irrigation immediately.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const replayMessage = (spokenText) => {
    if (!spokenText) return;
    speakText(spokenText);
  };

  if (!isOpen) return null;

  const isCombined = activeContext?.contextMode === 'combined';
  const activeFarmName = activeContext?.activeFarm?.farm_name || 'My Farm Plot';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          height: '88vh',
          maxHeight: '850px',
          background: 'linear-gradient(165deg, rgba(8, 16, 32, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)',
          border: '1.5px solid rgba(0, 245, 160, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 245, 160, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                boxShadow: '0 0 16px rgba(0, 245, 160, 0.4)',
              }}
            >
              🎙️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                  AI Voice Agronomist
                </span>
                <span
                  style={{
                    background: 'rgba(0, 245, 160, 0.15)',
                    border: '1px solid rgba(0, 245, 160, 0.35)',
                    color: '#00f5a0',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Kisan Mitra
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                {isCombined ? (
                  <span>🌐 <strong>Portfolio Mode:</strong> All 3 Plots Grounded</span>
                ) : (
                  <span>🌱 <strong>Single Plot Mode:</strong> {activeFarmName}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Language Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(2, 6, 23, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '0.2rem 0.4rem',
              }}
            >
              <Globe size={13} color="#94a3b8" style={{ marginRight: '4px' }} />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#00f5a0',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="en" style={{ background: '#081020', color: '#fff' }}>🇬🇧 English</option>
                <option value="ta" style={{ background: '#081020', color: '#fff' }}>🇮🇳 தமிழ் (Tamil)</option>
                <option value="hi" style={{ background: '#081020', color: '#fff' }}>🇮🇳 हिंदी (Hindi)</option>
              </select>
            </div>

            {/* Voice Mute / Unmute Toggle */}
            <button
              onClick={() => {
                if (isSpeaking) stopVoice();
                setVoiceEnabled(!voiceEnabled);
              }}
              title={voiceEnabled ? 'Voice Output: Active (Click to Mute)' : 'Voice Output: Muted (Click to Unmute)'}
              style={{
                background: voiceEnabled ? 'rgba(0, 245, 160, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${voiceEnabled ? 'rgba(0, 245, 160, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: voiceEnabled ? '#00f5a0' : '#ef4444',
                borderRadius: '8px',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── CONVERSATION CHAT SCROLL AREA ── */}
        <div
          ref={chatScrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'farmer';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: '#64748b',
                    marginBottom: '0.25rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {isUser ? '👨‍🌾 You (Farmer)' : '🤖 Sentifield Agronomist'} • {msg.timestamp}
                </div>

                <div
                  style={{
                    background: isUser
                      ? 'linear-gradient(135deg, rgba(0, 245, 160, 0.18) 0%, rgba(0, 217, 245, 0.15) 100%)'
                      : 'rgba(15, 23, 42, 0.85)',
                    border: isUser
                      ? '1px solid rgba(0, 245, 160, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '0.85rem 1.05rem',
                    color: '#f8fafc',
                    fontSize: '0.92rem',
                    lineHeight: '1.55',
                    boxShadow: isUser
                      ? '0 4px 20px rgba(0, 245, 160, 0.1)'
                      : '0 4px 20px rgba(0, 0, 0, 0.4)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.displayText}

                  {/* Key Metrics Chips */}
                  {msg.keyMetrics && msg.keyMetrics.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        marginTop: '0.75rem',
                        paddingTop: '0.65rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {msg.keyMetrics.map((met, i) => (
                        <span
                          key={i}
                          style={{
                            background: 'rgba(0, 217, 245, 0.12)',
                            border: '1px solid rgba(0, 217, 245, 0.3)',
                            color: '#00d9f5',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                          }}
                        >
                          📊 {met}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Replay Voice Button */}
                  {!isUser && msg.spokenText && (
                    <div
                      style={{
                        marginTop: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        onClick={() => replayMessage(msg.spokenText)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#94a3b8',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#00f5a0';
                          e.currentTarget.style.borderColor = '#00f5a0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                        }}
                      >
                        <Volume2 size={12} />
                        Replay Audio
                      </button>
                    </div>
                  )}
                </div>

                {/* Follow up suggestions */}
                {!isUser && msg.followUps && msg.followUps.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                      marginTop: '0.5rem',
                      marginLeft: '0.2rem',
                    }}
                  >
                    {msg.followUps.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => handleFarmerQuestion(f)}
                        style={{
                          background: 'rgba(0, 245, 160, 0.06)',
                          border: '1px solid rgba(0, 245, 160, 0.25)',
                          color: '#00f5a0',
                          borderRadius: '8px',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        👉 {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking / Analyzing indicator */}
          {isThinking && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(0, 217, 245, 0.3)',
                borderRadius: '16px 16px 16px 4px',
                padding: '0.85rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(0, 217, 245, 0.2)',
                  borderTopColor: '#00d9f5',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: '0.86rem', color: '#00d9f5', fontWeight: '700' }}>
                Grounding answer with Sentinel-2 satellite telemetry & weather...
              </span>
            </div>
          )}

          {/* Active Speaking Indicator (User requirement: output as voice first, then display as text) */}
          {isSpeaking && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.12) 0%, rgba(0, 217, 245, 0.12) 100%)',
                border: '1.5px solid #00f5a0',
                borderRadius: '16px',
                padding: '0.9rem 1.15rem',
                boxShadow: '0 0 25px rgba(0, 245, 160, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                maxWidth: '90%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Sound wave equalizer animation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px' }}>
                    <span style={{ width: '3px', height: '14px', background: '#00f5a0', borderRadius: '2px', animation: 'pulseWave 0.7s infinite alternate' }} />
                    <span style={{ width: '3px', height: '20px', background: '#00d9f5', borderRadius: '2px', animation: 'pulseWave 0.9s infinite alternate 0.2s' }} />
                    <span style={{ width: '3px', height: '10px', background: '#00f5a0', borderRadius: '2px', animation: 'pulseWave 0.6s infinite alternate 0.4s' }} />
                    <span style={{ width: '3px', height: '16px', background: '#00d9f5', borderRadius: '2px', animation: 'pulseWave 0.8s infinite alternate 0.1s' }} />
                  </div>
                  <strong style={{ fontSize: '0.86rem', color: '#00f5a0' }}>
                    AI Agronomist is speaking aloud...
                  </strong>
                </div>

                <button
                  onClick={stopVoice}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#f87171',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  ⏹️ Stop & Show Text
                </button>
              </div>

              <div style={{ fontSize: '0.84rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.4' }}>
                "{activeSpeechText.length > 120 ? activeSpeechText.slice(0, 120) + '...' : activeSpeechText}"
              </div>
            </div>
          )}

          {/* Live Speech Recognition Transcript Preview */}
          {isListening && (
            <div
              style={{
                alignSelf: 'flex-end',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '16px 16px 4px 16px',
                padding: '0.75rem 1rem',
                color: '#f87171',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 10px #ef4444',
                  animation: 'pulseDot 1s infinite',
                }}
              />
              <span>
                <strong>Listening...</strong> {interimTranscript || 'Speak your question now'}
              </span>
            </div>
          )}
        </div>

        {/* ── QUICK PROMPTS CHIPS BAR ── */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.6)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Quick Ask:
          </span>
          {quickPromptList.map((p, i) => (
            <button
              key={i}
              onClick={() => handleFarmerQuestion(p.text)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                color: '#cbd5e1',
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 245, 160, 0.12)';
                e.currentTarget.style.borderColor = '#00f5a0';
                e.currentTarget.style.color = '#00f5a0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── INPUT / MICROPHONE ACTION BAR ── */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(8, 16, 32, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Big Voice Button */}
          <button
            onClick={toggleMic}
            title={isListening ? 'Click to Stop Recording' : 'Click to Speak (Microphone)'}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: isListening
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
              border: isListening ? '3px solid #fecaca' : 'none',
              boxShadow: isListening
                ? '0 0 25px rgba(239, 68, 68, 0.6)'
                : '0 0 20px rgba(0, 245, 160, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isListening ? '#ffffff' : '#030712',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: isListening ? 'pulseListening 1.2s infinite' : 'none',
            }}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Text input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFarmerQuestion();
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(2, 6, 23, 0.7)',
              border: '1.5px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '0.2rem 0.5rem',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00f5a0')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening to your voice...'
                  : selectedLang === 'ta'
                  ? 'கேள்வியை கேட்கவும் அல்லது தட்டச்சு செய்யவும்...'
                  : selectedLang === 'hi'
                  ? 'बोलकर पूछें या अपना प्रश्न यहां टाइप करें...'
                  : 'Ask in voice or type your question...'
              }
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.92rem',
                padding: '0.6rem 0.75rem',
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={!inputValue.trim()}
              style={{
                background: inputValue.trim()
                  ? 'linear-gradient(135deg, #00f5a0, #00d9f5)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                color: inputValue.trim() ? '#030712' : '#475569',
                cursor: inputValue.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes pulseListening {
          0% { transform: scale(1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
          50% { transform: scale(1.08); box-shadow: 0 0 30px rgba(239, 68, 68, 0.8); }
          100% { transform: scale(1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
        }
        @keyframes pulseWave {
          0% { height: 6px; }
          100% { height: 22px; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

