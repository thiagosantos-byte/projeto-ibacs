import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Accessibility, Activity, ArrowDownToLine, ArrowRight, AudioLines, Bell, BookOpen,
  BrainCircuit, Check, CheckCircle2, ChevronDown, ClipboardCheck, Cloud, Eye,
  ExternalLink, FileText, Hand, HandHeart, Heart, Home, Languages, LockKeyhole, LogIn, LogOut, Menu,
  MessageCircle, Mic, MicOff, Moon, Palette, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, Sun, User, Volume2, WandSparkles, X,
} from 'lucide-react';
import { isSupabaseReady, supabase } from './lib/supabase';
import type { AccessibilityPrefs, ActivityItem, ChatMessage, ColorVision, PageKey } from './types';
import LibrasAvatar3D from './components/LibrasAvatar3D';

type SpeechResult = { transcript: string };
type SpeechEvent = { results: ArrayLike<ArrayLike<SpeechResult>> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  HT?: new (options: { token: string }) => unknown;
};

declare global {
  interface ImportMetaEnv {
    readonly VITE_HANDTALK_TOKEN?: string;
    readonly VITE_LIBRAS_PROVIDER?: 'rybena' | 'handtalk' | 'none';
  }
}

const DEFAULT_PREFS: AccessibilityPrefs = {
  highContrast: false,
  largeText: false,
  largeTargets: false,
  reduceMotion: false,
  calmMode: false,
  elderlyMode: false,
  captions: true,
  voiceReading: false,
  simpleLanguage: false,
  soundEnabled: true,
  advanceNotices: true,
  colorVision: 'normal',
};

const NAV: Array<{ key: PageKey; label: string; icon: typeof Home; tag?: string }> = [
  { key: 'overview', label: 'Visão geral', icon: Home },
  { key: 'accessibility', label: 'Laboratório de acesso', icon: Accessibility },
  { key: 'communication', label: 'Comunicação', icon: MessageCircle },
  { key: 'ai', label: 'IA assistiva', icon: BrainCircuit, tag: 'IA' },
  { key: 'handtalk', label: 'Intérprete Libras', icon: Hand },
  { key: 'reports', label: 'Relatórios', icon: FileText },
];
const SEARCH_NAV = [...NAV, { key: 'profile' as PageKey, label: 'Perfil e conta', icon: User }];
const RESOURCE_LINKS: Array<{ title: string; description: string; key: PageKey; icon: typeof Accessibility }> = [
  { title: 'Cegueira e baixa visão', description: 'Contraste, ampliação, voz e teclado', key: 'accessibility', icon: Eye },
  { title: 'Pessoas surdas', description: 'Tradução por avatar e interpretação humana', key: 'handtalk', icon: Hand },
  { title: 'Comunicação não oral', description: 'Símbolos, frases e voz sintetizada', key: 'communication', icon: MessageCircle },
  { title: 'Daltonismo', description: 'Filtros de cor e paletas acessíveis', key: 'accessibility', icon: Palette },
  { title: 'Pessoas idosas', description: 'Texto ampliado e alvos maiores', key: 'accessibility', icon: Heart },
  { title: 'TEA e conforto sensorial', description: 'Menos estímulos e rotina previsível', key: 'accessibility', icon: BrainCircuit },
  { title: 'Mobilidade e aprendizagem', description: 'Teclado, alvos e linguagem simples', key: 'accessibility', icon: Accessibility },
];

const PAGE_COPY: Record<PageKey, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'CENTRAL DE INCLUSÃO', title: 'Acessibilidade em primeiro plano.', description: 'Uma experiência integrada para ajustar a plataforma ao seu jeito de acessar, comunicar e participar.' },
  accessibility: { eyebrow: 'PERSONALIZAÇÃO', title: 'Sua experiência, suas escolhas.', description: 'Ative apenas os recursos que fazem sentido para você. As preferências podem ser combinadas e alteradas quando quiser.' },
  communication: { eyebrow: 'COMUNICAÇÃO ALTERNATIVA', title: 'Comunicar também é participar.', description: 'Monte mensagens com palavras e símbolos, transforme texto em voz e use a fala para preencher texto quando o navegador permitir.' },
  ai: { eyebrow: 'ASSISTENTE INCLUSIVO', title: 'Apoio inteligente, sem barreiras.', description: 'Peça ajuda para compreender conteúdos, encontrar recursos e adaptar instruções. A IA generativa requer configuração segura.' },
  handtalk: { eyebrow: 'ACESSIBILIDADE EM LIBRAS', title: 'Um avatar 3D, com responsabilidade linguística.', description: 'Conheça o personagem articulado do AURA e prepare mensagens para tradução. Os movimentos demonstrativos não são apresentados como sinais de Libras.' },
  reports: { eyebrow: 'ATIVIDADE E ACOMPANHAMENTO', title: 'Veja o que foi feito de verdade.', description: 'Consulte ações registradas neste navegador ou sincronizadas com sua conta. Não exibimos métricas institucionais inventadas.' },
  profile: { eyebrow: 'PREFERÊNCIAS E CONTA', title: 'Seu espaço AURA.', description: 'Defina como prefere ser chamado, gerencie sua sessão e escolha se deseja sincronizar suas preferências.' },
};

const QUICK_PHRASES = [
  { symbol: '💧', label: 'Quero água' }, { symbol: '🍽️', label: 'Estou com fome' },
  { symbol: '🧑‍⚕️', label: 'Preciso de ajuda' }, { symbol: '🚻', label: 'Preciso ir ao banheiro' },
  { symbol: '⏸️', label: 'Preciso de uma pausa' }, { symbol: '❤️', label: 'Estou bem' },
  { symbol: '😟', label: 'Não estou confortável' }, { symbol: '✅', label: 'Sim' },
  { symbol: '❌', label: 'Não' }, { symbol: '🕒', label: 'Preciso de mais tempo' },
  { symbol: '🔇', label: 'Quero menos barulho' }, { symbol: '🤝', label: 'Pode me acompanhar?' },
];

type LibrasProvider = 'rybena' | 'handtalk' | 'none';
type LibrasStatus = 'missing' | 'loading' | 'ready' | 'error';

function LibrasInterpreter({
  provider,
  status,
  error,
  reduceMotion = false,
}: {
  provider: LibrasProvider;
  status: LibrasStatus;
  error: string;
  reduceMotion?: boolean;
}) {
  const [demoSignal, setDemoSignal] = useState(0);
  const [phrase, setPhrase] = useState('Olá! Como podemos ajudar você?');
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState('Escreva uma mensagem ou dite em português.');
  const phraseRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const providerName = provider === 'handtalk' ? 'Hand Talk' : provider === 'rybena' ? 'Rybená' : 'Nenhum provedor';
  const providerReady = provider !== 'none' && status === 'ready';
  const providerStatus = provider === 'none'
    ? 'Nenhum intérprete automático conectado'
    : status === 'ready'
      ? `Script ${providerName} carregado — confirme o avatar flutuante na página`
      : status === 'loading'
        ? `Conectando ao ${providerName}…`
        : status === 'error'
          ? `Falha na conexão com ${providerName}`
          : provider === 'handtalk'
            ? 'Token oficial do Hand Talk não configurado'
            : 'Integração Rybená não selecionada';

  const toggleVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      setFeedback('Ditado encerrado. Revise a mensagem antes de usar o tradutor.');
      return;
    }

    const recognition = beginSpeechRecognition((text) => setPhrase(text), () => {
      recognitionRef.current = null;
      setListening(false);
      setFeedback('Ditado encerrado. Revise a mensagem antes de usar o tradutor.');
    });

    if (!recognition) {
      setFeedback('O ditado por voz não está disponível neste navegador. Use o Chrome com permissão de microfone ou digite a mensagem.');
      return;
    }

    recognitionRef.current = recognition;
    setListening(true);
    setFeedback('Ouvindo em português… fale naturalmente.');
  };

  const selectText = () => {
    if (!phrase.trim()) {
      setFeedback('Digite uma mensagem antes de selecionar o texto.');
      return;
    }
    phraseRef.current?.focus();
    phraseRef.current?.select();
    setFeedback(providerReady
      ? 'Texto selecionado. Agora abra o avatar oficial do provedor e escolha traduzir.'
      : 'Texto selecionado. Para traduzir para Libras, conecte Hand Talk ou Rybená primeiro.');
  };

  const copyText = async () => {
    if (!phrase.trim()) {
      setFeedback('Digite uma mensagem antes de copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(phrase.trim());
      setFeedback('Mensagem copiada. Você pode colá-la no atendimento ou no tradutor conectado.');
    } catch {
      phraseRef.current?.focus();
      phraseRef.current?.select();
      setFeedback('Não foi possível copiar automaticamente. O texto ficou selecionado para você copiar com Ctrl+C.');
    }
  };

  const clearText = () => {
    setPhrase('');
    setFeedback('Campo limpo. Escreva uma nova mensagem.');
  };

  return (
    <section className="aura-libras-console glass-panel" aria-labelledby="aura-libras-title">
      <div className="aura-libras-console-head">
        <div className="aura-libras-title-lockup">
          <span className="aura-libras-title-icon"><Languages size={23} /></span>
          <div>
            <span className="eyebrow">AURA · ACESSO EM LIBRAS</span>
            <h3 id="aura-libras-title">Intérprete digital</h3>
            <p>Um personagem 3D original, com braços, mãos e dedos articulados. A demonstração de movimento é separada da tradução linguística em Libras.</p>
          </div>
        </div>
        <span className={`aura-libras-status ${providerReady ? 'is-ready' : status === 'error' ? 'is-error' : 'is-pending'}`}>
          <span />{providerReady ? 'Script oficial carregado' : status === 'loading' ? 'Conectando' : status === 'error' ? 'Verificar integração' : 'Tradução não conectada'}
        </span>
      </div>

      <div className="aura-libras-workspace">
        <div className="aura-libras-compose glass-panel">
          <div className="aura-libras-panel-heading">
            <span className="eyebrow">01 · CONTEÚDO DE ENTRADA</span>
            <span className="aura-libras-counter">{phrase.length}/500</span>
          </div>
          <label htmlFor="aura-libras-text">Mensagem em português</label>
          <textarea
            ref={phraseRef}
            id="aura-libras-text"
            className="field-textarea aura-libras-textarea"
            rows={5}
            maxLength={500}
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            placeholder="Digite aqui o conteúdo que deseja apresentar em Libras…"
          />
          <div className="aura-libras-actions">
            <button type="button" className={`button ${listening ? 'button-danger' : 'button-outline'}`} onClick={toggleVoiceInput}>
              {listening ? <MicOff size={15} /> : <Mic size={15} />}{listening ? 'Parar ditado' : 'Ditar mensagem'}
            </button>
            <button type="button" className="button button-outline" onClick={selectText}>
              <Check size={15} /> Selecionar texto
            </button>
            <button type="button" className="button button-outline" onClick={copyText}>
              <ClipboardCheck size={15} /> Copiar
            </button>
            <button type="button" className="button button-soft" onClick={clearText}>
              <X size={15} /> Limpar
            </button>
          </div>
          <p className="aura-libras-feedback" role="status" aria-live="polite">{feedback}</p>
        </div>

        <div className="aura-libras-stage-card glass-panel">
          <div className="aura-libras-stage-top">
            <span className="eyebrow">02 · ÁREA DO INTÉRPRETE</span>
            <span className="aura-libras-provider-name">{providerName}</span>
          </div>
          <div className={`aura-libras-stage aura-libras-stage-3d ${providerReady ? 'provider-loaded' : ''}`}>
            <div className="aura-libras-stage-orbit orbit-one" />
            <div className="aura-libras-stage-orbit orbit-two" />
            <LibrasAvatar3D demoSignal={demoSignal} reduceMotion={reduceMotion} />
            <div className="aura-avatar3d-info">
              <span className="aura-libras-stage-state">PERSONAGEM 3D ORIGINAL · AURA</span>
              <h4>Avatar articulado em tempo real</h4>
              <p>Modelo 3D próprio com rosto, braços, palmas e dedos. Arraste o personagem para girar e teste a articulação.</p>
              <button type="button" className="button button-primary aura-avatar3d-action" onClick={() => setDemoSignal((value) => value + 1)}>
                <Activity size={15} /> Testar movimento do avatar
              </button>
            </div>
          </div>
          <div className={`aura-libras-provider-status ${providerReady ? 'connected' : ''}`}>
            <span />
            <div><b>{providerStatus}</b>{error && <small>{error}</small>}</div>
          </div>
          {providerReady ? <p className="aura-libras-provider-hint">Procure o botão flutuante do tradutor na página. O script carregado não é, por si só, uma certificação da qualidade linguística.</p> : <button type="button" className="button button-primary aura-libras-configure" onClick={() => document.getElementById('libras-providers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Ver opções de integração <ArrowRight size={14} /></button>}
        </div>
      </div>

      <div className="aura-libras-info-grid">
        <div className="aura-libras-info-card">
          <span className="aura-libras-info-number">01</span>
          <div><b>Prepare a mensagem</b><p>Digite ou dite o conteúdo em português e revise o texto.</p></div>
        </div>
        <div className="aura-libras-info-card">
          <span className="aura-libras-info-number">02</span>
          <div><b>Use o avatar real</b><p>Com Hand Talk ou Rybená conectado, selecione o texto e acione os controles do widget oficial.</p></div>
        </div>
        <div className="aura-libras-info-card">
          <span className="aura-libras-info-number">03</span>
          <div><b>Valide a comunicação</b><p>Para conteúdos sensíveis ou complexos, utilize interpretação humana em Libras.</p></div>
        </div>
      </div>

      <div className="aura-libras-reverse glass-panel">
        <div><span className="aura-libras-reverse-icon"><Hand size={18} /></span><div><b>Você sinaliza e precisa converter para português?</b><small>O IA Libras oferece reconhecimento de sinais pela câmera no navegador. É um fluxo inverso e um serviço externo, não substitui o tradutor português → Libras.</small></div></div>
        <a className="button button-outline" href="https://web.ialibras.com.br/" target="_blank" rel="noreferrer">Abrir reconhecimento <ExternalLink size={14} /></a>
      </div>

      <p className="aura-libras-integrity"><b>Transparência:</b> não foi encontrada uma solução gratuita, aberta e validada para tradução livre de português para Libras com avatar, fora da suíte VLibras — que não será utilizada neste projeto. O AURA mantém a integração pronta para Hand Talk ou Rybená. Até que um provedor autorizado esteja conectado, a plataforma oferece preparação de texto e ditado, mas não declara realizar tradução para Libras.</p>
    </section>
  );
}

const SAMPLE_CHAT: ChatMessage[] = [
  { id: 'hello', role: 'assistant', content: 'Olá! Posso ajudar a localizar recursos de acessibilidade, explicar como usá-los e transformar instruções complexas em passos mais simples. Para respostas geradas por IA, conecte uma conta e configure a função segura no Supabase.', time: 'agora' },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function nowLabel(date: Date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function speak(text: string, requireReadingPreference = false) {
  if (!('speechSynthesis' in window)) return false;
  const preferences = { ...DEFAULT_PREFS, ...readStorage<Partial<AccessibilityPrefs>>('aura:prefs', {}) };
  if (!preferences.soundEnabled || (requireReadingPreference && !preferences.voiceReading)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.94;
  window.speechSynthesis.speak(utterance);
  return true;
}

function beginSpeechRecognition(onText: (text: string) => void, onFinish: () => void) {
  const speechWindow = window as WindowWithSpeech;
  const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const text = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ');
    onText(text);
  };
  recognition.onerror = onFinish;
  recognition.onend = onFinish;
  try {
    recognition.start();
    return recognition;
  } catch {
    onFinish();
    return null;
  }
}

function IconButton({ children, label, onClick, active = false }: { children: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return <button type="button" className={`icon-button ${active ? 'is-active' : ''}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="toggle-row">
      <div className="toggle-copy"><strong>{label}</strong><span>{description}</span></div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<PageKey>('overview');
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => ({ ...DEFAULT_PREFS, ...readStorage<Partial<AccessibilityPrefs>>('aura:prefs', {}) }));
  const [dark, setDark] = useState(() => readStorage('aura:dark', false));
  const [profileName, setProfileName] = useState(() => readStorage('aura:name', 'Espaço institucional'));
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [events, setEvents] = useState<ActivityItem[]>(() => readStorage('aura:events', []));
  const [toast, setToast] = useState<{ title: string; detail?: string } | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState<Partial<AccessibilityPrefs>>({});
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [aacPhrase, setAacPhrase] = useState('');
  const [aacCustom, setAacCustom] = useState('');
  const [routineDraft, setRoutineDraft] = useState('');
  const [routineTasks, setRoutineTasks] = useState<string[]>(() => readStorage('aura:routines', ['Checar informações do dia', 'Organizar uma pausa', 'Revisar tarefas concluídas']));
  const [aacSaved, setAacSaved] = useState<string[]>(() => readStorage('aura:aac-saved', []));
  const [captionDraft, setCaptionDraft] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => readStorage('aura:chat', SAMPLE_CHAT));
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [audit, setAudit] = useState<{ score: number; checks: string[]; issues: string[] } | null>(null);
  const [handTalkStatus, setHandTalkStatus] = useState<'missing' | 'loading' | 'ready' | 'error'>('missing');
  const [handTalkError, setHandTalkError] = useState('');
  const handTalkToken = import.meta.env.VITE_HANDTALK_TOKEN?.trim() ?? '';
  const librasProvider = import.meta.env.VITE_LIBRAS_PROVIDER?.trim() ?? 'none';

  const activePrefs = useMemo(() => Object.entries(prefs).filter(([key, value]) => {
    if (key === 'soundEnabled' || key === 'advanceNotices') return false;
    return key === 'colorVision' ? value !== 'normal' : value === true;
  }).length, [prefs]);
  const activityGroups = useMemo(() => {
    const counts = events.reduce<Record<string, number>>((all, item) => {
      all[item.area] = (all[item.area] ?? 0) + 1;
      return all;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [events]);
  const savedPhraseCount = aacSaved.length;
  const todayLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()), []);
  const pageCopy = PAGE_COPY[page];

  const notify = (title: string, detail?: string) => {
    setToast({ title, detail });
    window.setTimeout(() => setToast((current) => current?.title === title ? null : current), 3600);
  };

  const record = (title: string, area: string) => {
    const item: ActivityItem = { id: makeId(), title, area, time: nowLabel() };
    setEvents((previous) => [item, ...previous].slice(0, 50));
    if (supabase && user) {
      void supabase.from('activity_logs').insert({ user_id: user.id, event_title: title, module: area, metadata: {} });
    }
  };

  const saveChatMessage = (message: ChatMessage) => {
    if (!supabase || !user) return;
    void supabase.from('ai_chat_messages').insert({ user_id: user.id, role: message.role, content: message.content });
  };

  const updatePrefs = (patch: Partial<AccessibilityPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem('aura:prefs', JSON.stringify(next));
    if (supabase && user) {
      void supabase.from('accessibility_preferences').upsert({ user_id: user.id, preferences: next, updated_at: new Date().toISOString() });
    }
    const changed = Object.keys(patch)[0];
    record(`Preferência atualizada: ${changed}`, 'Minha acessibilidade');
  };

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('high-contrast', prefs.highContrast);
    document.documentElement.classList.toggle('large-text', prefs.largeText);
    document.documentElement.classList.toggle('large-targets', prefs.largeTargets || prefs.elderlyMode);
    document.documentElement.classList.toggle('reduced-motion', prefs.reduceMotion || prefs.calmMode);
    document.documentElement.classList.toggle('calm-mode', prefs.calmMode);
    document.documentElement.classList.toggle('elderly-mode', prefs.elderlyMode);
    document.documentElement.classList.toggle('simple-language', prefs.simpleLanguage);
    document.documentElement.dataset.colorVision = prefs.colorVision;
  }, [prefs, dark]);

  useEffect(() => {
    localStorage.setItem('aura:dark', JSON.stringify(dark));
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('aura:events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const loadUserData = async (id: string) => {
      const [prefsResponse, activityResponse, phrasesResponse, chatResponse] = await Promise.all([
        supabase.from('accessibility_preferences').select('preferences').eq('user_id', id).maybeSingle(),
        supabase.from('activity_logs').select('id,event_title,module,created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
        supabase.from('aac_phrases').select('phrase').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
        supabase.from('ai_chat_messages').select('id,role,content,created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
      ]);
      if (!alive) return;
      if (prefsResponse.data?.preferences) {
        const merged = { ...DEFAULT_PREFS, ...(prefsResponse.data.preferences as Partial<AccessibilityPrefs>) };
        setPrefs(merged);
        localStorage.setItem('aura:prefs', JSON.stringify(merged));
      }
      if (activityResponse.data) {
        const cloudEvents: ActivityItem[] = activityResponse.data.map((row) => ({
          id: String(row.id), title: row.event_title, area: row.module,
          time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(row.created_at)),
        }));
        setEvents(cloudEvents);
        localStorage.setItem('aura:events', JSON.stringify(cloudEvents));
      }
      if (alive && phrasesResponse.data) {
        const cloudPhrases = phrasesResponse.data.map((row) => row.phrase);
        setAacSaved(cloudPhrases);
        localStorage.setItem('aura:aac-saved', JSON.stringify(cloudPhrases));
      }
      if (alive && chatResponse.data?.length) {
        const cloudChat: ChatMessage[] = [...chatResponse.data].reverse().map((row) => ({
          id: String(row.id),
          role: row.role === 'assistant' ? 'assistant' : 'user',
          content: row.content,
          time: nowLabel(new Date(row.created_at)),
        }));
        setChatMessages(cloudChat);
      }
    };
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const current = data.session?.user;
      setUser(current ? { id: current.id, email: current.email } : null);
      if (current) void loadUserData(current.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user;
      setUser(current ? { id: current.id, email: current.email } : null);
      if (current) window.setTimeout(() => void loadUserData(current.id), 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setHandTalkError('');
    if (librasProvider === 'rybena') {
      let cancelled = false;
      setHandTalkStatus('loading');
      const initRybena = () => {
        if (!cancelled) setHandTalkStatus('ready');
      };
      const existing = document.querySelector<HTMLScriptElement>('script[data-rybena="true"]');
      if (existing?.dataset.loaded === 'true') initRybena();
      else if (existing) {
        existing.addEventListener('load', initRybena, { once: true });
        existing.addEventListener('error', () => {
          if (!cancelled) { setHandTalkStatus('error'); setHandTalkError('Não foi possível carregar o script Rybená.'); }
        }, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.rybena.com.br/dom/master/latest/rybena.js?positionPlayer=right&size=320&lang=ptBR';
        script.async = true;
        script.dataset.rybena = 'true';
        script.onload = () => { script.dataset.loaded = 'true'; initRybena(); };
        script.onerror = () => {
          if (!cancelled) { setHandTalkStatus('error'); setHandTalkError('Não foi possível carregar a integração Rybená. Verifique a conexão e a liberação do domínio.'); }
        };
        document.head.append(script);
      }
      return () => { cancelled = true; };
    }
    if (librasProvider === 'handtalk') {
      if (!handTalkToken) {
        setHandTalkStatus('missing');
        setHandTalkError('O Hand Talk exige um token válido autorizado para este domínio.');
        return;
      }
      let cancelled = false;
      setHandTalkStatus('loading');
      const init = () => {
        try {
          const HT = (window as WindowWithSpeech).HT;
          if (!HT) throw new Error('O script oficial carregou, mas a classe HT não foi encontrada.');
          new HT({ token: handTalkToken });
          if (!cancelled) setHandTalkStatus('ready');
        } catch (error) {
          if (!cancelled) {
            setHandTalkStatus('error');
            setHandTalkError(error instanceof Error ? error.message : 'Não foi possível inicializar o Hand Talk.');
          }
        }
      };
      const existing = document.querySelector<HTMLScriptElement>('script[data-handtalk="true"]');
      if ((window as WindowWithSpeech).HT) init();
      else if (existing) existing.addEventListener('load', init, { once: true });
      else {
        const script = document.createElement('script');
        script.src = 'https://plugin.handtalk.me/web/latest/handtalk.min.js';
        script.async = true;
        script.dataset.handtalk = 'true';
        script.onload = init;
        script.onerror = () => {
          if (!cancelled) { setHandTalkStatus('error'); setHandTalkError('Não foi possível carregar o script oficial. Verifique sua conexão.'); }
        };
        document.head.append(script);
      }
      return () => { cancelled = true; };
    }
    setHandTalkStatus('missing');
  }, [handTalkToken, librasProvider]);

  useEffect(() => {
    localStorage.setItem('aura:chat', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    if (!authOpen) return;
    const dialog = document.querySelector<HTMLElement>('.auth-modal');
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    const firstFocusable = getFocusable()[0];
    firstFocusable?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAuthOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeys);
    return () => {
      document.removeEventListener('keydown', handleDialogKeys);
      previouslyFocused?.focus();
    };
  }, [authOpen]);

  useEffect(() => {
    if (!onboardingOpen) return;
    const dialog = document.querySelector<HTMLElement>('.onboarding-modal');
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    getFocusable()[0]?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOnboardingOpen(false); return; }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeys);
    return () => {
      document.removeEventListener('keydown', handleKeys);
      previouslyFocused?.focus();
    };
  }, [onboardingOpen]);

  useEffect(() => {
    localStorage.setItem('aura:aac-saved', JSON.stringify(aacSaved));
  }, [aacSaved]);

  const navigate = (next: PageKey) => {
    if (prefs.advanceNotices && next !== page) notify('Mudança de área', `Abrindo ${SEARCH_NAV.find((item) => item.key === next)?.label ?? 'a seção selecionada'}.`);
    setPage(next);
    setMobileNavOpen(false);
    setNotificationsOpen(false);
    record(`Abriu ${PAGE_COPY[next].title}`, PAGE_COPY[next].eyebrow);
    window.scrollTo({ top: 0, behavior: prefs.reduceMotion || prefs.calmMode ? 'auto' : 'smooth' });
  };

  const openOnboarding = () => {
    setOnboardingDraft({ ...prefs });
    setOnboardingOpen(true);
  };

  const saveOnboarding = () => {
    updatePrefs(onboardingDraft);
    setOnboardingOpen(false);
    notify('Preferências aplicadas', 'Você pode ajustar tudo novamente no Laboratório de acesso.');
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage('');
    if (!supabase) { setAuthMessage('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local.'); return; }
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { display_name: profileName } } });
        if (error) throw error;
        setAuthMessage(data.session ? 'Conta criada e sessão iniciada.' : 'Conta criada. Verifique seu e-mail para confirmar o cadastro.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setAuthOpen(false);
        notify('Sessão iniciada', 'Suas preferências poderão ser sincronizadas.');
        record('Sessão iniciada', 'Conta');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    notify('Sessão encerrada', 'Os dados locais deste navegador continuam disponíveis.');
    record('Sessão encerrada', 'Conta');
  };

  const runAudit = () => {
    const root = document.getElementById('main-content');
    if (!root) return;
    const unnamedButtons = Array.from(root.querySelectorAll('button')).filter((button) => !button.getAttribute('aria-label') && !button.textContent?.trim());
    const unlabeledInputs = Array.from(root.querySelectorAll('input,textarea,select')).filter((input) => {
      const element = input as HTMLInputElement;
      return !element.labels?.length && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby');
    });
    const imagesWithoutAlt = Array.from(root.querySelectorAll('img')).filter((image) => !image.hasAttribute('alt'));
    const checks = [
      `Landmarks semânticos encontrados: ${root.querySelectorAll('header,nav,main,section,aside,footer').length}`,
      `Controles de formulário sem rótulo: ${unlabeledInputs.length}`,
      `Botões sem nome acessível: ${unnamedButtons.length}`,
      `Imagens sem atributo alt: ${imagesWithoutAlt.length}`,
      `Modo de movimento reduzido: ${prefs.reduceMotion || prefs.calmMode ? 'ativo' : 'disponível, não ativado'}`,
    ];
    const issues = [
      unlabeledInputs.length ? `${unlabeledInputs.length} campo(s) sem rótulo programático.` : '',
      unnamedButtons.length ? `${unnamedButtons.length} botão(ões) sem nome acessível.` : '',
      imagesWithoutAlt.length ? `${imagesWithoutAlt.length} imagem(ns) sem atributo alt.` : '',
      'A triagem não mede todos os critérios WCAG, não substitui testes com NVDA, VoiceOver, TalkBack e pessoas com deficiência.',
    ].filter(Boolean);
    const passed = [unlabeledInputs.length === 0, unnamedButtons.length === 0, imagesWithoutAlt.length === 0].filter(Boolean).length;
    const score = Math.round((passed / 3) * 100);
    setAudit({ score, checks, issues });
    record('Triagem local de acessibilidade executada', 'Relatórios');
    notify('Triagem concluída', `${passed} de 3 verificações básicas passaram nesta tela.`);
  };

  const addRoutineTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const task = routineDraft.trim();
    if (!task) return;
    const next = [...routineTasks, task].slice(0, 12);
    setRoutineTasks(next);
    localStorage.setItem('aura:routines', JSON.stringify(next));
    setRoutineDraft('');
    record('Etapa adicionada à rotina pessoal', 'Minha acessibilidade');
    notify('Etapa adicionada à rotina');
  };

  const removeRoutineTask = (index: number) => {
    const next = routineTasks.filter((_, itemIndex) => itemIndex !== index);
    setRoutineTasks(next);
    localStorage.setItem('aura:routines', JSON.stringify(next));
    record('Etapa removida da rotina pessoal', 'Minha acessibilidade');
  };

  const startVoiceCommand = () => {
    const recognizer = beginSpeechRecognition((text) => {
      const command = text.toLowerCase();
      const match = NAV.find((item) => command.includes(item.label.toLowerCase().split(' ')[0]) || command.includes(PAGE_COPY[item.key].eyebrow.toLowerCase().split(' ')[0]));
      if (match) { navigate(match.key); notify('Comando reconhecido', `Abrindo ${match.label}.`); }
      else notify('Não reconheci o comando', 'Tente dizer: abrir comunicação, acessibilidade, IA ou relatórios.');
    }, () => { setRecognizing(false); recognitionRef.current = null; });
    if (!recognizer) { notify('Comando por voz indisponível', 'Use um navegador compatível com Web Speech API.'); return; }
    recognitionRef.current = recognizer;
    setRecognizing(true);
    notify('Escutando comando', 'Diga: abrir comunicação, acessibilidade, IA ou relatórios.');
  };

  const saveAacPhrase = (value: string) => {
    const phrase = value.trim();
    if (!phrase) return;
    setAacSaved((previous) => [phrase, ...previous].slice(0, 30));
    if (supabase && user) {
      void supabase.from('aac_phrases').insert({ user_id: user.id, phrase, symbol: '💬' });
    }
    record('Frase salva na comunicação alternativa', 'Comunicação');
    notify('Frase adicionada', 'Ela já está disponível em suas mensagens salvas.');
  };

  const saveCustomPhrase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phrase = aacCustom.trim();
    if (!phrase) return;
    saveAacPhrase(phrase);
    setAacCustom('');
  };

  const chooseAac = (phrase: string) => {
    setAacPhrase((current) => current ? `${current} ${phrase}` : phrase);
    record(`Símbolo adicionado: ${phrase}`, 'Comunicação');
  };

  const speakAac = () => {
    if (!aacPhrase.trim()) { notify('Monte uma mensagem primeiro'); return; }
    if (!speak(aacPhrase)) notify('Leitura por voz indisponível', 'Este navegador não oferece Speech Synthesis.');
    else record('Mensagem reproduzida por voz', 'Comunicação');
  };

  const startCaptions = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setRecognizing(false);
      return;
    }
    const recognizer = beginSpeechRecognition((text) => setCaptionDraft(text), () => { setRecognizing(false); recognitionRef.current = null; });
    if (!recognizer) { notify('Transcrição não disponível', 'Use um navegador com Web Speech API ou digite a legenda manualmente.'); return; }
    recognitionRef.current = recognizer;
    setRecognizing(true);
    record('Transcrição de fala iniciada', 'Comunicação');
  };

  const sendToAI = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || chatBusy) return;
    const userMessage: ChatMessage = { id: makeId(), role: 'user', content, time: nowLabel() };
    setChatMessages((previous) => [...previous, userMessage]);
    saveChatMessage(userMessage);
    setChatInput('');
    if (!supabase || !user) {
      const message = !isSupabaseReady
        ? 'A IA generativa ainda não está conectada. Configure o Supabase no .env.local, faça login e publique a Edge Function inclusive-assistant com OPENAI_API_KEY cadastrada como secret. Até lá, esta tela não finge que respostas locais são uma IA real.'
        : 'Entre na sua conta para usar o assistente de IA. A função é protegida por autenticação e não envia sua chave de IA ao navegador.';
      setChatMessages((previous) => [...previous, { id: makeId(), role: 'assistant', content: message, time: nowLabel() }]);
      return;
    }
    setChatBusy(true);
    try {
      const history = [...chatMessages.filter((message) => message.id !== 'hello'), userMessage].slice(-12).map(({ role, content: text }) => ({ role, content: text }));
      const { data, error } = await supabase.functions.invoke('inclusive-assistant', { body: { messages: history, preferences: prefs } });
      if (error) throw error;
      if (!data?.answer) throw new Error('A função não retornou uma resposta. Verifique os logs da Edge Function.');
      const assistantMessage: ChatMessage = { id: makeId(), role: 'assistant', content: String(data.answer), time: nowLabel() };
      setChatMessages((previous) => [...previous, assistantMessage]);
      saveChatMessage(assistantMessage);
      record('Resposta recebida do assistente generativo', 'IA assistiva');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Falha inesperada';
      setChatMessages((previous) => [...previous, { id: makeId(), role: 'assistant', content: `Não consegui acessar a IA agora. ${detail} Confira se a função inclusive-assistant está publicada e se a secret OPENAI_API_KEY foi configurada.`, time: nowLabel() }]);
    } finally { setChatBusy(false); }
  };

  const exportReport = () => {
    const rows = [['Horário', 'Ação', 'Módulo'], ...events.map((item) => [item.time, item.title, item.area])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'aura-historico-local.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    record('Histórico exportado para CSV', 'Relatórios');
    notify('Arquivo CSV gerado', `${events.length} registro(s) incluídos.`);
  };

  const filteredNav = SEARCH_NAV.filter((item) => `${item.label} ${PAGE_COPY[item.key].description}`.toLowerCase().includes(search.toLowerCase()));
  const goSearchResult = (key: PageKey) => { navigate(key); setSearch(''); setSearchOpen(false); };
  const motionInitial = prefs.reduceMotion || prefs.calmMode ? false : { opacity: 0, y: 12 };
  const motionAnimate = { opacity: 1, y: 0 };

  return (
    <div className={`app-shell ${dark ? 'theme-dark' : ''}`}>
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`} aria-label="Navegação principal">
        <div className="brand-lockup">
          <div className="brand-symbol"><ShieldCheck size={22} strokeWidth={2.1} /></div>
          <div><span className="brand-name">AURA</span><span className="brand-subtitle">ACESSIBILIDADE INTELIGENTE</span></div>
          <button className="mobile-close" type="button" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="nav-label">PLATAFORMA</div>
        <nav className="side-nav">
          {NAV.map(({ key, label, icon: Icon, tag }) => (
            <button key={key} type="button" className={`nav-item ${page === key ? 'active' : ''}`} aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{tag && <small>{tag}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="inclusion-note">
            <div className="note-plus"><Plus size={18} /></div>
            <strong>Inclusão em primeiro lugar</strong>
            <p>Personalize sua experiência sem perder o controle sobre a informação.</p>
          </div>
          <button type="button" className="account-mini" onClick={() => navigate('profile')}>
            <span className="avatar">{user ? profileName.slice(0, 1).toUpperCase() : 'IB'}</span>
            <span><strong>{profileName}</strong><small>{user ? user.email : 'Ambiente de demonstração'}</small></span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <main className="main-column" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <button type="button" className="mobile-menu" aria-label="Abrir menu" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Plataforma</span><b>/</b><strong>{page === 'profile' ? 'Perfil e conta' : NAV.find((item) => item.key === page)?.label}</strong></div>
          <div className="topbar-actions">
            <div className="search-wrap">
              <Search size={16} />
              <input aria-label="Buscar recursos" placeholder="Buscar recursos..." value={search} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} onKeyDown={(event) => { if (event.key === 'Enter' && filteredNav[0]) goSearchResult(filteredNav[0].key); if (event.key === 'Escape') setSearchOpen(false); }} />
              {searchOpen && search.trim() && <div className="search-results" role="listbox" aria-label="Resultados da busca">{filteredNav.length ? filteredNav.map((item) => <button type="button" key={item.key} onClick={() => goSearchResult(item.key)}><span>{item.label}</span><ArrowRight size={14} /></button>) : <p>Nenhum recurso encontrado.</p>}</div>}
            </div>
            <IconButton label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={() => setDark((value) => !value)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
            <div className="notification-wrap">
              <IconButton label="Abrir atividade recente" active={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}><Bell size={18} /></IconButton>
              {notificationsOpen && <div className="notification-popover"><div className="popover-heading"><strong>Atividade recente</strong><span>{events.length}</span></div>{events.slice(0, 4).length ? events.slice(0, 4).map((item) => <div className="notification-item" key={item.id}><span className="notification-dot" /><div><b>{item.title}</b><small>{item.area} · {item.time}</small></div></div>) : <p className="empty-copy">Nenhuma atividade registrada ainda.</p>}<button type="button" className="text-link" onClick={() => { setNotificationsOpen(false); navigate('reports'); }}>Ver histórico completo <ArrowRight size={13} /></button></div>}
            </div>
            <button type="button" className={`environment-pill ${isSupabaseReady ? 'connected' : ''}`} onClick={() => navigate('profile')}><span />{isSupabaseReady ? user ? 'Conta conectada' : 'Banco configurado' : 'Modo demonstração'}</button>
          </div>
        </header>

        <section className="page-heading">
          <div><span className="eyebrow">{pageCopy.eyebrow} · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase()}</span><h1>{pageCopy.title}</h1><p>{pageCopy.description}</p></div>
          <span className="date-chip">{todayLabel}</span>
        </section>

        <AnimatePresence mode="wait">
          <motion.div key={page} initial={motionInitial} animate={motionAnimate} exit={prefs.reduceMotion || prefs.calmMode ? undefined : { opacity: 0, y: -6 }} transition={{ duration: prefs.reduceMotion || prefs.calmMode ? 0 : 0.28, ease: 'easeOut' }}>
            {page === 'overview' && (
              <>
                <section className="hero-panel">
                  <div className="hero-glow" /><div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" />
                  <div className="hero-content">
                    <div className="hero-kicker"><span className="live-dot" /> NÚCLEO INTELIGENTE DEMONSTRATIVO</div>
                    <h2>Tecnologia que percebe diferentes formas de viver o mundo.</h2>
                    <p>AURA reúne recursos de acessibilidade, comunicação e análise inteligente em uma experiência inclusiva e personalizável.</p>
                    <div className="hero-actions"><button type="button" className="button button-primary" onClick={openOnboarding}>Personalizar experiência <ArrowRight size={16} /></button><button type="button" className="button button-glass" onClick={() => navigate('ai')}>Conhecer a IA <Sparkles size={15} /></button></div>
                  </div>
                  <div className="hero-float-card float-top"><span><Sparkles size={17} /></span><div><strong>7 frentes de inclusão</strong><small>preferências combináveis</small></div></div>
                  <div className="hero-float-card float-bottom"><span><WandSparkles size={17} /></span><div><strong>Experiência em adaptação</strong><small>{activePrefs} ajustes ativos</small></div></div>
                  <div className="hero-core"><ShieldCheck size={34} /></div>
                </section>

                <section className="metric-grid" aria-label="Resumo da sua experiência">
                  <motion.article className="metric-card" whileHover={prefs.reduceMotion ? undefined : { y: -4 }}><div className="metric-top"><span className="metric-icon blue"><Accessibility size={18} /></span><span className="metric-tag">PERSONALIZAÇÃO</span></div><strong>{activePrefs}</strong><small>Recursos de acessibilidade ativos</small></motion.article>
                  <motion.article className="metric-card" whileHover={prefs.reduceMotion ? undefined : { y: -4 }}><div className="metric-top"><span className="metric-icon mint"><Activity size={18} /></span><span className="metric-tag">NESTE NAVEGADOR</span></div><strong>{events.length}</strong><small>Ações registradas no histórico</small></motion.article>
                  <motion.article className="metric-card" whileHover={prefs.reduceMotion ? undefined : { y: -4 }}><div className="metric-top"><span className="metric-icon violet"><MessageCircle size={18} /></span><span className="metric-tag">COMUNICAÇÃO</span></div><strong>{savedPhraseCount}</strong><small>Frases personalizadas salvas</small></motion.article>
                  <motion.article className="metric-card" whileHover={prefs.reduceMotion ? undefined : { y: -4 }}><div className="metric-top"><span className="metric-icon amber"><ClipboardCheck size={18} /></span><span className="metric-tag">TRIAGEM LOCAL</span></div><strong>{audit ? `${audit.score}%` : '—'}</strong><small>{audit ? 'Verificação básica da tela atual' : 'Ainda não executada'}</small></motion.article>
                </section>

                <div className="dashboard-grid insight-grid">
                  <section className="glass-panel experience-panel">
                    <div className="panel-heading"><div><span className="eyebrow">ANÁLISE DA EXPERIÊNCIA</span><h3>Índice de experiência inclusiva</h3><p>Prévia calculada por verificações básicas da tela atual.</p></div><span className="simulation-tag">Prévia local</span></div>
                    <div className="experience-content">
                      <div className="experience-ring" style={{ '--score': `${audit?.score ?? 0}%` } as CSSProperties} aria-label={audit ? `Resultado da triagem: ${audit.score}%` : 'Triagem ainda não executada'}>
                        <div><strong>{audit ? `${audit.score}%` : '—'}</strong><span>{audit ? 'triagem básica' : 'sem avaliação'}</span></div>
                      </div>
                      <div className="experience-copy"><strong>{audit ? 'Verificação concluída' : 'Sua experiência ainda não foi verificada'}</strong><p>{audit ? `${audit.checks.length} itens observados na tela atual. Consulte os detalhes no relatório.` : 'Execute uma checagem local para verificar nomes acessíveis, rótulos de formulário e textos alternativos.'}</p><button type="button" className="button button-soft" onClick={() => { runAudit(); navigate('reports'); }}><ClipboardCheck size={15} /> Executar triagem <ArrowRight size={14} /></button><small>Não representa certificação WCAG nem substitui testes com tecnologias assistivas e pessoas com deficiência.</small></div>
                    </div>
                  </section>
                  <section className="glass-panel resources-panel">
                    <div className="panel-heading"><div><span className="eyebrow">ACESSO POR NECESSIDADE</span><h3>Recursos por necessidade</h3><p>Escolha uma frente para abrir as ferramentas relacionadas.</p></div><span className="resource-count">7 frentes</span></div>
                    <div className="resource-list">{RESOURCE_LINKS.map(({ title, description, key, icon: ResourceIcon }) => <button type="button" className="resource-need" key={title} onClick={() => navigate(key)}><span className="resource-need-icon"><ResourceIcon size={16} /></span><span className="resource-need-copy"><b>{title}</b><small>{description}</small></span><span className={`resource-state ${key === 'handtalk' ? librasProvider === 'none' ? 'missing' : handTalkStatus : 'local'}`}>{key === 'handtalk' ? librasProvider === 'none' ? 'Configurar' : handTalkStatus === 'ready' ? 'Conectado' : handTalkStatus === 'loading' ? 'Carregando' : handTalkStatus === 'error' ? 'Verificar' : 'Configurar' : 'Local'}</span><ArrowRight size={14} /></button>)}</div>
                  </section>
                </div>

                <div className="dashboard-grid">
                  <section className="glass-panel panel-large">
                    <div className="panel-heading"><div><span className="eyebrow">CENTRAL DE FERRAMENTAS</span><h3>O que você precisa agora?</h3></div><button type="button" className="subtle-link" onClick={() => navigate('accessibility')}>Ver tudo <ArrowRight size={14} /></button></div>
                    <div className="tool-grid">
                      <button type="button" className="tool-card" onClick={() => navigate('accessibility')}><span className="tool-icon lavender"><Eye size={20} /></span><b>Leitura e visão</b><small>Contraste, fonte e navegação</small><ArrowRight size={15} /></button>
                      <button type="button" className="tool-card" onClick={() => navigate('handtalk')}><span className="tool-icon blue"><Hand size={20} /></span><b>Intérprete de Libras</b><small>Hand Talk, Rybená e interpretação humana</small><ArrowRight size={15} /></button>
                      <button type="button" className="tool-card" onClick={() => navigate('communication')}><span className="tool-icon mint"><MessageCircle size={20} /></span><b>Comunicação</b><small>Prancha de frases e voz</small><ArrowRight size={15} /></button>
                      <button type="button" className="tool-card" onClick={() => navigate('ai')}><span className="tool-icon peach"><BrainCircuit size={20} /></span><b>Assistente inclusivo</b><small>Orientação e linguagem simples</small><ArrowRight size={15} /></button>
                    </div>
                  </section>
                  <section className="glass-panel access-summary">
                    <div className="panel-heading"><div><span className="eyebrow">SEU AMBIENTE</span><h3>Preferências ativas</h3></div><button type="button" className="icon-mini" aria-label="Editar preferências" onClick={() => navigate('accessibility')}><Settings2 size={17} /></button></div>
                    <div className="preference-bars">
                      {[
                        { label: 'Contraste', value: prefs.highContrast }, { label: 'Texto ampliado', value: prefs.largeText },
                        { label: 'Movimento reduzido', value: prefs.reduceMotion || prefs.calmMode }, { label: 'Alvos maiores', value: prefs.largeTargets || prefs.elderlyMode },
                      ].map((item) => <div className="preference-line" key={item.label}><div><span>{item.label}</span><b>{item.value ? 'Ativo' : 'Disponível'}</b></div><div className="preference-track"><span style={{ width: item.value ? '100%' : '10%' }} className={item.value ? 'filled' : ''} /></div></div>)}
                    </div>
                    <div className="panel-footnote"><ShieldCheck size={15} /> Você escolhe o que ativar. Não é necessário informar diagnóstico.</div>
                  </section>
                </div>

                <div className="dashboard-grid lower-grid">
                  <section className="glass-panel">
                    <div className="panel-heading"><div><span className="eyebrow">ATIVIDADE</span><h3>O que aconteceu por aqui</h3></div><button type="button" className="subtle-link" onClick={() => navigate('reports')}>Histórico <ArrowRight size={14} /></button></div>
                    {activityGroups.length > 0 && <div className="activity-chart" aria-label="Distribuição de ações por módulo, calculada a partir do histórico desta sessão">{activityGroups.map(([area, count]) => <div className="activity-chart-row" key={area}><span>{area}</span><div className="activity-chart-track"><span style={{ width: `${Math.max(10, (count / activityGroups[0][1]) * 100)}%` }} /></div><b>{count}</b></div>)}</div>}
                    {events.length ? <div className="activity-list">{events.slice(0, 4).map((item) => <div className="activity-row" key={item.id}><span className="activity-bullet"><Check size={13} /></span><div><b>{item.title}</b><small>{item.area}</small></div><time>{item.time}</time></div>)}</div> : <div className="empty-state"><Activity size={21} /><p>Suas ações aparecerão aqui conforme você usar os recursos.</p></div>}
                  </section>
                  <section className="glass-panel recommendation-card">
                    <div className="recommendation-glow"><Sparkles size={22} /></div><span className="eyebrow">PRÓXIMO PASSO</span><h3>Faça uma checagem rápida de acessibilidade.</h3><p>A triagem local verifica nomes de botões, rótulos de formulários e texto alternativo nesta tela.</p><button type="button" className="button button-soft" onClick={() => { runAudit(); navigate('reports'); }}>Executar triagem <ArrowRight size={15} /></button>
                  </section>
                </div>
              </>
            )}

            {page === 'accessibility' && (
              <>
                <div className="access-intro glass-panel"><div className="access-intro-icon"><Accessibility size={25} /></div><div><h3>Minha Acessibilidade</h3><p>Combine ajustes sem precisar escolher um perfil fechado. Você pode mudar qualquer opção a qualquer momento.</p></div><span className="active-count">{activePrefs} ativos</span></div>
                <div className="settings-grid">
                  <section className="glass-panel settings-card"><div className="settings-heading"><span className="settings-icon blue"><Eye size={20} /></span><div><h3>Visão e leitura</h3><p>Apresentação visual, legibilidade e foco.</p></div></div>
                    <Toggle label="Alto contraste" description="Reforça o contraste dos elementos e textos." checked={prefs.highContrast} onChange={(v) => updatePrefs({ highContrast: v })} />
                    <Toggle label="Texto ampliado" description="Aumenta a escala da tipografia em toda a plataforma." checked={prefs.largeText} onChange={(v) => updatePrefs({ largeText: v })} />
                    <Toggle label="Leitura por voz" description="Ativa o atalho de leitura de conteúdo selecionado." checked={prefs.voiceReading} onChange={(v) => updatePrefs({ voiceReading: v })} />
                    <div className="settings-action-stack"><button className="button button-outline full-button" type="button" onClick={() => { const text = document.getElementById('main-content')?.innerText.slice(0, 1200) ?? ''; if (!speak(text, true)) notify('Ative leitura por voz e saída de áudio nas preferências.'); else record('Leitura da tela solicitada', 'Visão e leitura'); }}> <Volume2 size={15} /> Ler conteúdo desta tela</button><button className="button button-outline full-button" type="button" onClick={startVoiceCommand}><Mic size={15} /> Usar comando por voz</button></div>
                  </section>
                  <section className="glass-panel settings-card"><div className="settings-heading"><span className="settings-icon violet"><Palette size={20} /></span><div><h3>Percepção de cores</h3><p>Simule filtros aproximados para revisar combinações.</p></div></div>
                    <label className="field-label" htmlFor="color-vision">Simulação de visão de cores</label><select id="color-vision" className="field-select" value={prefs.colorVision} onChange={(event) => updatePrefs({ colorVision: event.target.value as ColorVision })}><option value="normal">Sem filtro</option><option value="protanopia">Protanopia · vermelho</option><option value="deuteranopia">Deuteranopia · verde</option><option value="tritanopia">Tritanopia · azul/amarelo</option></select>
                    <p className="field-help">Esta visualização é aproximada e não representa uma avaliação clínica nem substitui testes com pessoas com daltonismo.</p>
                    <div className="color-sample-row"><span className="sample sample-a">Ação</span><span className="sample sample-b">Atenção</span><span className="sample sample-c">Concluído</span></div>
                  </section>
                  <section className="glass-panel settings-card"><div className="settings-heading"><span className="settings-icon mint"><HandHeart size={20} /></span><div><h3>Conforto e mobilidade</h3><p>Alvos de interação, animação e previsibilidade.</p></div></div>
                    <Toggle label="Alvos maiores" description="Amplia botões e áreas clicáveis." checked={prefs.largeTargets} onChange={(v) => updatePrefs({ largeTargets: v })} />
                    <Toggle label="Reduzir animações" description="Diminui transições e movimentos não essenciais." checked={prefs.reduceMotion} onChange={(v) => updatePrefs({ reduceMotion: v })} />
                    <Toggle label="Modo de estímulos reduzidos" description="Suaviza destaques e reduz elementos animados." checked={prefs.calmMode} onChange={(v) => updatePrefs({ calmMode: v })} />
                    <Toggle label="Modo de navegação simplificada" description="Aumenta espaçamento e prioriza ações principais." checked={prefs.elderlyMode} onChange={(v) => updatePrefs({ elderlyMode: v })} />
                  </section>
                  <section className="glass-panel settings-card"><div className="settings-heading"><span className="settings-icon peach"><BookOpen size={20} /></span><div><h3>Compreensão e comunicação</h3><p>Preferências de linguagem, legenda e fala.</p></div></div>
                    <Toggle label="Linguagem simples" description="Prioriza instruções curtas e termos diretos." checked={prefs.simpleLanguage} onChange={(v) => updatePrefs({ simpleLanguage: v })} />
                    <Toggle label="Preferir legendas" description="Mantém o espaço de legendas e transcrições disponível." checked={prefs.captions} onChange={(v) => updatePrefs({ captions: v })} />
                    <Toggle label="Permitir saída de áudio" description="Controla a leitura por voz e a saída falada da prancha CAA." checked={prefs.soundEnabled} onChange={(v) => updatePrefs({ soundEnabled: v })} />
                    <Toggle label="Avisos antes de mudanças" description="Mostra um aviso visual antes de abrir outra área." checked={prefs.advanceNotices} onChange={(v) => updatePrefs({ advanceNotices: v })} />
                    <button className="button button-outline full-button" type="button" onClick={() => navigate('communication')}><MessageCircle size={15} /> Abrir comunicação alternativa</button>
                  </section>
                </div>
                <section className="glass-panel routine-panel"><div className="panel-heading"><div><span className="eyebrow">ROTINA E PREVISIBILIDADE</span><h3>Organize as próximas etapas</h3><p>Uma lista simples e ajustável para dar previsibilidade ao seu dia.</p></div><span className="active-count">{routineTasks.length} etapas</span></div><form className="custom-phrase-form" onSubmit={addRoutineTask}><label htmlFor="routine-task">Adicionar uma etapa</label><div><input id="routine-task" value={routineDraft} onChange={(event) => setRoutineDraft(event.target.value)} placeholder="Ex.: Fazer uma pausa depois da atividade" maxLength={100} /><button type="submit" className="button button-dark" disabled={!routineDraft.trim()}><Plus size={15} /> Adicionar</button></div></form><div className="routine-list">{routineTasks.map((task, index) => <div className="routine-item" key={`${task}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><b>{task}</b><button type="button" aria-label={`Remover etapa ${task}`} onClick={() => removeRoutineTask(index)}><X size={14} /></button></div>)}</div></section>
                <div className="settings-footer"><span><ShieldCheck size={16} /> Preferências salvas automaticamente neste navegador{user ? ' e sincronizadas com sua conta.' : '.'}</span><button type="button" className="button button-soft" onClick={() => { updatePrefs(DEFAULT_PREFS); notify('Preferências restauradas'); }}>Restaurar padrão</button></div>
              </>
            )}

            {page === 'communication' && (
              <div className="communication-layout">
                <section className="glass-panel communication-main"><div className="panel-heading"><div><span className="eyebrow">PRANCHA DE COMUNICAÇÃO</span><h3>Monte sua mensagem</h3><p>Selecione símbolos para construir uma frase. O texto fica sempre visível.</p></div><span className="availability-pill"><span /> Local</span></div>
                  <div className="phrase-builder"><span className="builder-label">SUA MENSAGEM</span><div className="phrase-output" aria-live="polite">{aacPhrase || <span className="placeholder">Toque nos cartões abaixo para começar...</span>}</div><div className="phrase-actions"><button type="button" className="button button-primary" onClick={speakAac}><Volume2 size={16} /> Falar mensagem</button><button type="button" className="button button-outline" onClick={() => setAacPhrase('')}><X size={15} /> Limpar</button><button type="button" className="button button-outline" disabled={!aacPhrase.trim()} onClick={() => saveAacPhrase(aacPhrase)}><Heart size={15} /> Salvar frase</button></div></div>
                  <div className="aac-grid">{QUICK_PHRASES.map((item) => <button type="button" className="aac-tile" key={item.label} onClick={() => chooseAac(item.label)}><span>{item.symbol}</span><b>{item.label}</b></button>)}</div>
                  <form className="custom-phrase-form" onSubmit={saveCustomPhrase}><label htmlFor="new-aac-phrase">Adicionar frase personalizada</label><div><input id="new-aac-phrase" value={aacCustom} onChange={(event) => setAacCustom(event.target.value)} placeholder="Ex.: Preciso de um lugar mais tranquilo" maxLength={140} /><button className="button button-dark" type="submit" disabled={!aacCustom.trim()}><Plus size={15} /> Adicionar</button></div></form>
                </section>
                <aside className="communication-side">
                  <section className="glass-panel side-tool"><div className="side-tool-heading"><span className="settings-icon blue"><AudioLines size={19} /></span><div><h3>Fala para texto</h3><p>Use a voz para preencher um texto.</p></div></div><textarea className="field-textarea" rows={4} value={captionDraft} onChange={(event) => setCaptionDraft(event.target.value)} placeholder="A transcrição aparecerá aqui. Também é possível digitar..." /><button type="button" disabled={!prefs.captions} className={`button ${recognizing ? 'button-danger' : 'button-soft'} full-button`} onClick={startCaptions}>{recognizing ? <MicOff size={15} /> : <Mic size={15} />}{recognizing ? 'Parar transcrição' : prefs.captions ? 'Iniciar transcrição' : 'Ative a preferência de legendas'}</button><p className="field-help">A transcrição usa a API de reconhecimento de voz do navegador. A disponibilidade varia por navegador e permissão.</p></section>
                  <section className="glass-panel side-tool"><div className="side-tool-heading"><span className="settings-icon mint"><Volume2 size={19} /></span><div><h3>Texto para voz</h3><p>Ouça um texto digitado.</p></div></div><textarea className="field-textarea" rows={3} defaultValue="Olá! Esta é uma demonstração de leitura de texto em voz alta." aria-label="Texto para leitura por voz" id="tts-text"/><button type="button" className="button button-soft full-button" onClick={() => { const text = (document.getElementById('tts-text') as HTMLTextAreaElement)?.value ?? ''; if (!speak(text)) notify('Leitura por voz indisponível'); else record('Texto reproduzido por voz', 'Comunicação'); }}><Volume2 size={15} /> Reproduzir áudio</button></section>
                  <section className="glass-panel side-tool"><div className="side-tool-heading"><span className="settings-icon violet"><Heart size={19} /></span><div><h3>Frases salvas</h3><p>{aacSaved.length} mensagem(ns) personalizadas.</p></div></div>{aacSaved.length ? <div className="saved-phrases">{aacSaved.slice(0, 5).map((phrase) => <button type="button" key={phrase} onClick={() => setAacPhrase(phrase)}>{phrase}<ArrowRight size={13} /></button>)}</div> : <p className="empty-copy">Salve mensagens que você usa com frequência para encontrá-las rapidamente.</p>}</section>
                </aside>
              </div>
            )}

            {page === 'ai' && (
              <div className="ai-layout">
                <section className="glass-panel ai-chat-panel"><div className="ai-heading"><div className="ai-avatar"><Sparkles size={21} /></div><div><h3>AURA Assistiva</h3><p>Assistente de orientação e acessibilidade</p></div><span className={`connection-label ${isSupabaseReady && user ? 'ready' : ''}`}><span />{isSupabaseReady && user ? 'Conexão configurada' : 'Aguardando configuração'}</span></div>
                  <div className="chat-messages" aria-live="polite">{chatMessages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><span className="chat-avatar">{message.role === 'assistant' ? <Sparkles size={14} /> : <User size={14} />}</span><div className="chat-bubble"><p>{message.content}</p><small>{message.role === 'assistant' ? 'AURA' : 'Você'} · {message.time}</small>{message.role === 'assistant' && <button className="speak-message" type="button" aria-label="Ouvir resposta" onClick={() => speak(message.content)}><Volume2 size={13} /></button>}</div></div>)}{chatBusy && <div className="typing-state"><span /><span /><span /> AURA está preparando uma resposta...</div>}</div>
                  <form className="chat-composer" onSubmit={sendToAI}><label className="sr-only" htmlFor="ai-chat-input">Digite sua mensagem</label><input id="ai-chat-input" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Conte o que você precisa..." maxLength={2000} /><button type="submit" className="send-button" disabled={!chatInput.trim() || chatBusy} aria-label="Enviar mensagem"><Send size={17} /></button></form>
                  <div className="chat-suggestions"><span>EXPERIMENTE</span>{['Explique em linguagem simples', 'Como ativar alto contraste?', 'Como organizar uma tela para TEA?'].map((prompt) => <button type="button" key={prompt} onClick={() => setChatInput(prompt)}>{prompt}</button>)}</div>
                </section>
                <aside className="ai-side-column"><section className="glass-panel ai-notice"><div className="ai-notice-icon"><LockKeyhole size={20} /></div><span className="eyebrow">CONEXÃO SEGURA</span><h3>IA generativa protegida.</h3><p>A chave da OpenAI fica no servidor, dentro da Edge Function do Supabase. Ela nunca deve ser colocada no código do navegador.</p><div className="config-state"><span className={isSupabaseReady ? 'state-dot good' : 'state-dot'} />{isSupabaseReady ? 'Supabase configurado' : 'Supabase não configurado'}</div><button type="button" className="button button-soft full-button" onClick={() => navigate('profile')}>Ver configuração <ArrowRight size={14} /></button></section><section className="glass-panel ai-guidelines"><h3>Princípios do assistente</h3><div><CheckCircle2 size={15} /><span>Não diagnostica condições ou deficiências.</span></div><div><CheckCircle2 size={15} /><span>Adapta a linguagem às preferências informadas.</span></div><div><CheckCircle2 size={15} /><span>Informa quando um serviço externo está indisponível.</span></div></section></aside>
              </div>
            )}

            {page === 'handtalk' && (
              <div className="libras-page">
                <section className="libras-intro glass-panel">
                  <div className="libras-intro-symbol"><Hand size={28} /></div>
                  <div className="libras-intro-copy">
                    <span className="eyebrow">TRADUÇÃO AUTOMÁTICA + INTERPRETAÇÃO HUMANA</span>
                    <h2>Não existe uma única forma de tornar Libras acessível.</h2>
                    <p>O AURA pode trabalhar com um tradutor de conteúdo para ampliar o acesso ao site e com intérpretes humanos para conversas complexas, atendimento e eventos.</p>
                    <div className={`provider-status ${librasProvider === 'none' ? 'missing' : handTalkStatus}`}><span />{librasProvider === 'rybena' ? handTalkStatus === 'ready' ? 'Script Rybená carregado — confirme o widget na página' : handTalkStatus === 'loading' ? 'Carregando script Rybená...' : handTalkStatus === 'error' ? 'Falha ao carregar Rybená' : 'Rybená não selecionada' : librasProvider === 'handtalk' ? handTalkStatus === 'ready' ? 'Hand Talk inicializado' : handTalkStatus === 'loading' ? 'Carregando Hand Talk...' : handTalkStatus === 'error' ? 'Falha na integração Hand Talk' : 'Token Hand Talk não configurado' : 'Nenhum intérprete automático conectado'}</div>
                    {handTalkError && <p className="error-copy">{handTalkError}</p>}
                  </div>
                </section>
                <LibrasInterpreter provider={librasProvider as LibrasProvider} status={handTalkStatus} error={handTalkError} reduceMotion={prefs.reduceMotion || prefs.calmMode} />
                <div className="provider-grid" id="libras-providers">
                  <section className={`provider-card glass-panel ${librasProvider === 'rybena' ? 'provider-selected' : ''}`}>
                    <div className="provider-card-top"><span className="provider-mark rybena-mark"><Hand size={22} /></span><span className="provider-recommended">ALTERNATIVA RECOMENDADA</span></div>
                    <span className="eyebrow">TRADUTOR AUTOMÁTICO</span>
                    <h3>Rybená</h3>
                    <p>Tradutor com avatar 3D para Libras, leitura em voz e recursos adicionais de acessibilidade. A documentação oficial oferece integração por script CDN para projetos React.</p>
                    <ul><li>Instalação por script, sem SDK React específico.</li><li>Player configurável e avatar 3D.</li><li>Planos comerciais por domínio e teste gratuito sujeito à liberação.</li></ul>
                    <div className="provider-price"><strong>R$ 715/mês</strong><small>Plano Básico anunciado; confirme condições com a empresa.</small></div>
                    <a className="button button-primary link-button" href="https://www.rybena.com.br/planos/" target="_blank" rel="noreferrer">Ver planos Rybená <ArrowRight size={15} /></a>
                    <a className="provider-doc-link" href="https://docs.rybena.com.br/docs/getting-started/installation" target="_blank" rel="noreferrer">Consultar documentação técnica</a>
                  </section>
                  <section className={`provider-card glass-panel ${librasProvider === 'handtalk' ? 'provider-selected' : ''}`}>
                    <div className="provider-card-top"><span className="provider-mark handtalk-mark"><Hand size={22} /></span><span className="provider-type">TRADUTOR AUTOMÁTICO</span></div>
                    <span className="eyebrow">PLUG-IN PARA SITES</span>
                    <h3>Hand Talk</h3>
                    <p>Alternativa conhecida com avatares virtuais e plugin para traduzir conteúdos do site para língua de sinais. A ativação requer licença e token vinculado ao domínio.</p>
                    <ul><li>Avatares Hugo e Maya.</li><li>Recursos assistivos e painel de dados.</li><li>Token oficial necessário para ativar o plugin.</li></ul>
                    <div className="provider-price"><strong>Orçamento sob consulta</strong><small>O site oficial direciona para solicitação comercial.</small></div>
                    <a className="button button-outline link-button" href="https://www.handtalk.me/br/plugin/" target="_blank" rel="noreferrer">Conhecer Hand Talk <ArrowRight size={15} /></a>
                    <a className="provider-doc-link" href="https://docs.handtalk.me/docs/introducao/" target="_blank" rel="noreferrer">Consultar documentação técnica</a>
                  </section>
                  <section className="provider-card provider-human glass-panel">
                    <div className="provider-card-top"><span className="provider-mark human-mark"><HandHeart size={22} /></span><span className="provider-type">INTERPRETAÇÃO HUMANA</span></div>
                    <span className="eyebrow">CONVERSAS E ATENDIMENTO</span>
                    <h3>ICOM</h3>
                    <p>Plataforma de interpretação por videochamada com intérpretes humanos. É mais adequada para atendimentos, reuniões e conversas com contexto, não para traduzir automaticamente cada texto da página.</p>
                    <ul><li>Interpretação em tempo real por videochamada.</li><li>Aplicável a atendimento, reuniões e eventos.</li><li>Contratação institucional e integração a combinar com o fornecedor.</li></ul>
                    <div className="provider-price"><strong>Proposta institucional</strong><small>Solicite demonstração e condições de uso.</small></div>
                    <a className="button button-outline link-button" href="https://www.icom.app/" target="_blank" rel="noreferrer">Conhecer ICOM <ArrowRight size={15} /></a>
                    <a className="provider-doc-link" href="https://www.icom.app/sobre/" target="_blank" rel="noreferrer">Como funciona a interpretação humana</a>
                  </section>
                </div>
                <section className="glass-panel provider-setup">
                  <div><span className="eyebrow">CONFIGURAÇÃO DO AURA</span><h3>Conecte um tradutor automático oficial</h3><p>O AURA só apresenta tradução automática quando o domínio estiver autorizado por um provedor. Use apenas um provedor automático por vez. O ICOM é um canal humano complementar.</p></div>
                  <div className="provider-config"><code>VITE_LIBRAS_PROVIDER=rybena</code><small>Para ativar a Rybená após contratar/liberar o domínio. Use <code>handtalk</code> para Hand Talk com token, ou <code>none</code> para desativar.</small></div>
                </section>
                <p className="provider-disclaimer">Importante: tradutores automáticos por avatar são apoio de acesso ao conteúdo, mas não substituem intérpretes humanos em situações complexas, aulas, eventos ou atendimentos sensíveis. Sempre valide a qualidade da tradução com pessoas surdas usuárias de Libras.</p>
              </div>
            )}

            {page === 'reports' && (
              <div className="reports-layout"><section className="report-overview glass-panel"><div><span className="eyebrow">REGISTROS DISPONÍVEIS</span><h3>Histórico de utilização</h3><p>{user ? 'Registros sincronizados com a conta e mantidos no Supabase.' : 'Registros locais deste navegador. Entre na conta para sincronizar.'}</p></div><button type="button" className="button button-primary" onClick={exportReport}><ArrowDownToLine size={16} /> Exportar CSV</button></section>
                <div className="report-stats"><div className="glass-panel report-stat"><span>Ações registradas</span><strong>{events.length}</strong><small>{user ? 'Conta conectada' : 'Sessão local'}</small></div><div className="glass-panel report-stat"><span>Preferências ativas</span><strong>{activePrefs}</strong><small>Configuração atual</small></div><div className="glass-panel report-stat"><span>Triagem da tela</span><strong>{audit ? `${audit.score}%` : '—'}</strong><small>{audit ? 'Última verificação' : 'Ainda não realizada'}</small></div></div>
                <section className="glass-panel report-table-panel"><div className="panel-heading"><div><span className="eyebrow">TRIAGEM BÁSICA</span><h3>Verificação da interface</h3></div><button type="button" className="button button-soft" onClick={runAudit}><ClipboardCheck size={15} /> Executar agora</button></div>{audit ? <div className="audit-result"><div className="audit-score"><strong>{audit.score}%</strong><span>verificações básicas</span></div><div className="audit-details">{audit.checks.map((item) => <div key={item}><CheckCircle2 size={15} />{item}</div>)}{audit.issues.map((item) => <p key={item} className="audit-warning">{item}</p>)}</div></div> : <div className="empty-state"><ClipboardCheck size={22} /><p>Execute a triagem para verificar alguns rótulos e nomes acessíveis na tela atual.</p></div>}</section>
                <section className="glass-panel report-table-panel"><div className="panel-heading"><div><span className="eyebrow">LINHA DO TEMPO</span><h3>Atividades recentes</h3></div><span className="record-count">{events.length} registros</span></div>{events.length ? <div className="report-list">{events.map((item) => <div className="report-row" key={item.id}><span className="activity-bullet"><Check size={13} /></span><div><b>{item.title}</b><small>{item.area}</small></div><time>{item.time}</time></div>)}</div> : <div className="empty-state"><Activity size={22} /><p>Quando você interagir com a plataforma, os registros aparecerão aqui.</p></div>}</section>
              </div>
            )}

            {page === 'profile' && (
              <div className="profile-layout"><section className="glass-panel profile-card"><div className="profile-avatar">{profileName.slice(0, 1).toUpperCase()}</div><div><span className="eyebrow">PERFIL DE ACESSO</span><h3>{profileName}</h3><p>{user?.email ?? 'Visitante · preferências neste navegador'}</p></div><span className={`connection-label ${user ? 'ready' : ''}`}><span />{user ? 'Conta conectada' : 'Modo local'}</span></section>
                <div className="profile-grid"><section className="glass-panel settings-card"><div className="settings-heading"><span className="settings-icon blue"><User size={19} /></span><div><h3>Como devemos chamar você?</h3><p>Use um nome ou apelido. Não é necessário informar diagnóstico ou condição pessoal.</p></div></div><label className="field-label" htmlFor="profile-name">Nome de exibição</label><div className="inline-form"><input id="profile-name" className="field-input" value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={42} /><button type="button" className="button button-dark" onClick={() => { const cleaned = profileName.trim() || 'Visitante'; setProfileName(cleaned); localStorage.setItem('aura:name', JSON.stringify(cleaned)); record('Nome de exibição atualizado', 'Perfil'); notify('Perfil atualizado'); }}>Salvar</button></div></section>
                  <section className="glass-panel settings-card"><div className="settings-heading"><span className="settings-icon violet"><Cloud size={19} /></span><div><h3>Sincronização e conta</h3><p>Use uma conta para levar suas preferências e registros para outros acessos.</p></div></div><div className="connection-row"><span className={`status-indicator ${isSupabaseReady ? 'ready' : 'missing'}`} /><div><strong>{isSupabaseReady ? 'Supabase configurado' : 'Supabase não configurado'}</strong><small>{user ? 'Sessão autenticada' : 'Nenhuma sessão ativa'}</small></div></div>{user ? <button type="button" className="button button-outline full-button" onClick={signOut}><LogOut size={15} /> Encerrar sessão</button> : <button type="button" className="button button-primary full-button" onClick={() => { setAuthMessage(''); setAuthOpen(true); }}><LogIn size={15} /> Entrar ou criar conta</button>}</section>
                </div>
                <section className="glass-panel privacy-card"><div className="privacy-icon"><ShieldCheck size={20} /></div><div><h3>Privacidade e autonomia</h3><p>As preferências são opcionais e podem ser alteradas a qualquer momento. A plataforma não exige a declaração de diagnósticos. Sem Supabase configurado, as preferências e o histórico permanecem apenas neste navegador.</p></div></section>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="app-footer"><span><Heart size={13} /> Tecnologia com inclusão no centro.</span><span>AURA · demonstração institucional</span></footer>
      </main>

      {mobileNavOpen && <button className="mobile-overlay" type="button" aria-label="Fechar menu de navegação" onClick={() => setMobileNavOpen(false)} />}
      <AnimatePresence>{toast && <motion.div className="toast-card" role="status" initial={prefs.reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span className="toast-check"><Check size={16} /></span><div><b>{toast.title}</b>{toast.detail && <small>{toast.detail}</small>}</div><button type="button" aria-label="Fechar aviso" onClick={() => setToast(null)}><X size={14} /></button></motion.div>}</AnimatePresence>

      <AnimatePresence>{onboardingOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setOnboardingOpen(false); }}><motion.div className="auth-modal onboarding-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" initial={prefs.reduceMotion ? false : { opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}><button type="button" className="modal-close" aria-label="Fechar configuração inicial" onClick={() => setOnboardingOpen(false)}><X size={18} /></button><div className="modal-brand"><Accessibility size={20} /> MINHA EXPERIÊNCIA</div><h2 id="onboarding-title">Como você prefere acessar?</h2><p id="onboarding-description">Selecione os ajustes que tornam a navegação mais confortável. Não é necessário informar diagnóstico, e você pode alterar suas escolhas depois.</p><div className="onboarding-grid"><Toggle label="Texto ampliado" description="Aumenta o tamanho da tipografia." checked={Boolean(onboardingDraft.largeText)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, largeText: v }))} /><Toggle label="Alto contraste" description="Reforça a diferença entre texto e fundo." checked={Boolean(onboardingDraft.highContrast)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, highContrast: v }))} /><Toggle label="Alvos maiores" description="Amplia botões e áreas de toque." checked={Boolean(onboardingDraft.largeTargets)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, largeTargets: v }))} /><Toggle label="Menos movimento" description="Reduz animações e transições." checked={Boolean(onboardingDraft.reduceMotion)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, reduceMotion: v }))} /><Toggle label="Ambiente sensorial tranquilo" description="Suaviza destaques e reduz estímulos visuais." checked={Boolean(onboardingDraft.calmMode)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, calmMode: v }))} /><Toggle label="Linguagem simples" description="Prioriza explicações curtas e diretas." checked={Boolean(onboardingDraft.simpleLanguage)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, simpleLanguage: v }))} /><Toggle label="Leitura por voz" description="Permite ouvir conteúdos selecionados." checked={Boolean(onboardingDraft.voiceReading)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, voiceReading: v }))} /><Toggle label="Preferir legendas" description="Habilita a transcrição de fala no módulo Comunicação." checked={Boolean(onboardingDraft.captions)} onChange={(v) => setOnboardingDraft((old) => ({ ...old, captions: v }))} /></div><label className="field-label" htmlFor="onboarding-color">Simulação de visão de cores (opcional)</label><select id="onboarding-color" className="field-select" value={onboardingDraft.colorVision ?? 'normal'} onChange={(event) => setOnboardingDraft((old) => ({ ...old, colorVision: event.target.value as ColorVision }))}><option value="normal">Sem filtro</option><option value="protanopia">Protanopia · vermelho</option><option value="deuteranopia">Deuteranopia · verde</option><option value="tritanopia">Tritanopia · azul/amarelo</option></select><div className="onboarding-actions"><button type="button" className="button button-outline" onClick={() => setOnboardingOpen(false)}>Agora não</button><button type="button" className="button button-dark" onClick={saveOnboarding}><Check size={15} /> Salvar preferências</button></div></motion.div></motion.div>}</AnimatePresence>

      <AnimatePresence>{authOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><motion.div className="auth-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title" initial={prefs.reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}><button type="button" className="modal-close" aria-label="Fechar" onClick={() => setAuthOpen(false)}><X size={18} /></button><div className="modal-brand"><ShieldCheck size={20} /> AURA</div><h2 id="auth-title">{authMode === 'signin' ? 'Acesse sua conta' : 'Criar uma conta'}</h2><p>Use sua conta para sincronizar preferências e histórico entre dispositivos.</p><form onSubmit={handleAuth}><label htmlFor="auth-email">E-mail</label><input id="auth-email" type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="voce@email.com" /><label htmlFor="auth-password">Senha</label><input id="auth-password" type="password" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /><button className="button button-dark full-button" type="submit" disabled={authBusy}>{authBusy ? 'Aguarde...' : authMode === 'signin' ? 'Entrar' : 'Criar conta'}</button></form>{authMessage && <p className="auth-message" role="status">{authMessage}</p>}<button type="button" className="auth-switch" onClick={() => { setAuthMode((mode) => mode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>{authMode === 'signin' ? 'Ainda não tem conta? Criar cadastro' : 'Já tem conta? Entrar'}</button><small className="auth-note">O cadastro também depende das políticas de confirmação de e-mail configuradas no Supabase.</small></motion.div></motion.div>}</AnimatePresence>
    </div>
  );
}
