import { useState, useEffect, FormEvent, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  LayoutDashboard, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  CircleDot,
  Calendar,
  Settings,
  LogOut,
  Table as TableIcon,
  Crown,
  Trash2,
  MessageCircle,
  ShieldCheck,
  Info,
  Gamepad2,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';
import { v4 as uuidv4 } from 'uuid';

// --- Local Identity Utility ---
const GUEST_ID_KEY = 'n8_guest_id_v2';
const DISPLAY_NAME_KEY = 'n8_display_name_v2';

const getGuestId = () => {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest_${uuidv4()}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
};

const getDisplayName = () => {
  return localStorage.getItem(DISPLAY_NAME_KEY) || 'Mestre de Bilhar';
};

// --- Types ---
interface Tournament {
  id: string;
  name: string;
  type: 'single_elimination' | 'double_elimination' | 'round_robin' | 'survival' | 'total_war';
  status: 'draft' | 'active' | 'finished';
  winnerId?: string;
  winnerName?: string;
  createdAt: any;
  finishedAt?: any;
  createdBy: string;
}

interface Player {
  id: string;
  name: string;
  tournamentId: string;
  seed: number;
}

interface Match {
  id: string;
  tournamentId: string;
  player1Id: string;
  player2Id: string;
  score1: number;
  score2: number;
  winnerId: string | null;
  round: number;
  status: 'pending' | 'in_progress' | 'finished';
  updatedAt?: any;
}

// --- Components ---

function Navbar() {
  const { guestId, displayName } = useAuth();
  
  return (
    <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
             <div className="absolute inset-0 bg-brand blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <Trophy className="w-6 h-6 text-brand relative z-10" />
          </div>
          <span className="font-display font-black text-2xl md:text-3xl tracking-tighter italic uppercase text-white">
            NUMBER <span className="text-brand">8</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/tournaments" className="hidden sm:block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 hover:text-brand transition-colors">
            Painel Geral
          </Link>
          
          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl border border-white/10 bg-brand/5 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand" />
            </div>
            <div className="flex flex-col hidden md:flex">
              <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">
                {displayName}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 leading-none mt-1">
                ID Local: {guestId.slice(-8)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

const TOURNAMENT_RULES = {
  single_elimination: {
    title: 'Eliminação Simples',
    rules: 'Mata-mata tradicional. Perdeu uma partida, está fora. O vencedor avança para a próxima fase até a grande final.'
  },
  double_elimination: {
    title: 'Dupla Eliminação',
    rules: 'Sistema com repescagem. Os competidores têm duas chances: quem perde cai para a "Chave dos Perdedores", onde ainda pode brigar pelo título.'
  },
  survival: {
    title: 'Sobrevivência',
    rules: 'Formato de extermínio. Os jogadores com menor pontuação em cada rodada são eliminados sucessivamente até restar apenas um sobrevivente.'
  },
  total_war: {
    title: 'Guerra Total',
    rules: 'Campo de batalha aberto com múltiplos confrontos rápidos e simultâneos. Focado em volume de vitórias e resistência.'
  },
  round_robin: {
    title: 'Pontos Corridos',
    rules: 'Liga completa onde todos jogam contra todos. Vitórias acumulam pontos e a classificação final define o grande campeão.'
  }
};

function Home() {
  return (
    <div className="flex flex-col items-center relative">
      <section className="w-full min-h-[90vh] flex flex-col items-center justify-center px-6 pt-12 pb-24 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
        
        <motion.div 
          className="text-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-10 justify-center"
          >
             <span className="w-12 h-px bg-brand/40"></span>
             <span className="text-[10px] uppercase tracking-[0.6em] font-black text-brand italic">Sovereign Billiards Management</span>
             <span className="w-12 h-px bg-brand/40"></span>
          </motion.div>

          <h1 className="text-7xl md:text-[10rem] font-black mb-10 leading-[0.8] text-white uppercase italic tracking-tighter">
            PRO GRADE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-brand to-brand/40">TOURNAMENTS</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto mb-16 font-medium leading-relaxed tracking-tight uppercase">
            A plataforma definitiva para organizar campeonatos de elite. 
            <span className="text-white"> Precisão cirúrgica</span> na gestão de chaves e estatísticas imersivas.
          </p>

          <div className="flex flex-col sm:flex-row gap-8 items-center justify-center">
            <Link 
              to="/tournaments/new" 
              className="group relative px-12 py-6 bg-brand text-zinc-950 font-black uppercase italic tracking-[0.2em] rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(var(--brand-rgb),0.2)]"
            >
              <div className="relative z-10 flex items-center gap-3 text-sm">
                <Plus className="w-5 h-5 stroke-[3px]" />
                Criar Arena
              </div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>
            
            <Link 
              to="/tournaments" 
              className="px-12 py-6 bg-zinc-900/50 border border-white/5 text-white font-black uppercase italic tracking-[0.2em] rounded-2xl flex items-center gap-3 hover:bg-zinc-800 transition-all text-sm backdrop-blur-xl"
            >
              <LayoutDashboard className="w-5 h-5" />
              Ver Painéis
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats Ribbon */}
      <div className="w-full max-w-7xl px-4 py-8 relative z-10">
        <div className="glass-card grid grid-cols-2 md:grid-cols-4 p-8 gap-8 items-center bg-white/5 border-white/10">
          {[
            { label: 'Partidas Ativas', val: '24' },
            { label: 'Jogadores Pró', val: '128' },
            { label: 'Premiação Total', val: '$12.5k' },
            { label: 'Mesas ao Vivo', val: '08' }
          ].map((stat, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{stat.label}</div>
              <div className="text-2xl font-mono font-bold text-white tracking-tight">{stat.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { guestId } = useAuth();

  const activeTournaments = tournaments.filter(t => t.status !== 'finished');
  const pastTournaments = tournaments.filter(t => t.status === 'finished');

  useEffect(() => {
    const q = query(
      collection(db, 'tournaments'),
      where('createdBy', '==', guestId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro Firestore:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [guestId]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-1 alpha-bg-brand rounded-full overflow-hidden">
                <div className="h-full bg-brand w-1/3 animate-pulse"></div>
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand italic">Central de Comando</span>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">Ecossistema <br /> de <span className="text-brand">Competição</span></h1>
          <p className="text-slate-500 text-sm max-w-md font-medium leading-relaxed tracking-wide uppercase">
            Acompanhe o desempenho dos jogadores e a evolução das chaves em tempo real. Cada tacada conta para a glória eterna.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="glass-card px-8 py-4 border-white/5 bg-white/5 flex flex-col items-center">
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Média de Inscritos</span>
             <span className="text-2xl font-black italic uppercase italic tracking-tighter text-white">8/16</span>
          </div>
          <Link 
            to="/tournaments/new" 
            className="px-10 py-5 bg-brand text-bg-dark font-black uppercase italic tracking-[0.1em] rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-xs shadow-xl shadow-brand/10 shadow-[0_0_40px_rgba(var(--brand-rgb),0.2)]"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
            Nova Temporada
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-zinc-900/50 rounded-3xl border border-white/5" />)}
        </div>
      ) : tournaments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-24 text-center flex flex-col items-center gap-8 border-dashed border-2 border-white/5"
        >
          <div className="relative">
             <div className="absolute inset-0 bg-brand blur-2xl opacity-10 animate-pulse"></div>
             <Trophy className="w-16 h-16 text-zinc-800 relative z-10" />
          </div>
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mb-3">O Campo está Vazio</h3>
            <p className="text-slate-500 mb-8 max-w-sm uppercase text-[10px] font-bold tracking-widest leading-relaxed">Não existem torneios ativos sob sua gestão. Comece agora para reunir os melhores jogadores.</p>
            <Link 
              to="/tournaments/new" 
              className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-brand transition-all text-[10px] italic"
            >
              Iniciar Primeiro Torneio
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-24">
          {activeTournaments.length > 0 && (
            <section>
              <div className="flex items-center gap-6 mb-12">
                <div className="flex flex-col">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-brand">Temporada Ativa</h2>
                  <div className="h-1 bg-brand w-full mt-2 rounded-full shadow-[0_0_10px_rgba(var(--brand-rgb),0.5)]" />
                </div>
                <div className="h-px bg-white/5 flex-grow" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {activeTournaments.map((t) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    key={t.id}
                  >
                    <TournamentCard t={t} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {pastTournaments.length > 0 && (
            <section>
              <div className="flex items-center gap-6 mb-12">
                <div className="flex flex-col">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Hall de Legendas</h2>
                  <div className="h-0.5 bg-slate-800 w-full mt-2 rounded-full" />
                </div>
                <div className="h-px bg-white/5 flex-grow" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-60 hover:opacity-100 transition-opacity">
                {pastTournaments.map((t) => (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    key={t.id}
                  >
                    <TournamentCard t={t} variant="history" />
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t, variant = 'active' }: { t: Tournament, variant?: 'active' | 'history' }) {
  const organizerName = "Organizador Local";
  
  return (
    <Link 
      to={`/tournaments/${t.id}`} 
      className={`glass-card group transition-all flex flex-col justify-between relative overflow-hidden ${
        variant === 'active' 
          ? 'p-10 border-white/5 hover:border-brand/40 min-h-[16rem] bg-slate-900/40 shadow-2xl shadow-black/40' 
          : 'p-6 border-white/5 hover:border-white/20 min-h-[12rem] bg-slate-900/20'
      }`}
    >
      <div className={`absolute top-0 right-0 w-48 h-48 blur-[100px] -translate-y-1/2 translate-x-1/2 transition-opacity duration-700 pointer-events-none ${
        t.status === 'active' ? 'bg-emerald-500/10 opacity-60' : 
        t.status === 'finished' ? 'bg-zinc-500/10' : 
        'bg-brand/10 opacity-40'
      }`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] border ${
            t.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
            t.status === 'finished' ? 'bg-slate-800 border-white/5 text-slate-500' : 
            'bg-amber-400/10 border-amber-400/20 text-amber-400'
          }`}>
            {t.status === 'active' ? 'Ao Vivo' : t.status === 'draft' ? 'Rascunho' : 'Concluído'}
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-slate-600 font-mono font-bold tracking-widest uppercase">
              {t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleDateString('pt-BR') : 'SINCE DRAFT'}
            </span>
            <span className="text-[7px] text-brand/40 font-black uppercase tracking-widest mt-1">Organizado por: {organizerName}</span>
          </div>
        </div>
        
        <h3 className={`${variant === 'active' ? 'text-4xl' : 'text-xl'} font-black italic uppercase tracking-tighter group-hover:text-brand transition-colors mb-2 leading-[0.9]`}>{t.name}</h3>
        
        <div className="flex items-center gap-4 mt-2">
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2">
            <TableIcon className="w-3 text-brand" />
            {
              t.type === 'single_elimination' ? 'Eliminação Simples' :
              t.type === 'double_elimination' ? 'Dupla Eliminação' :
              t.type === 'survival' ? 'Sobrevivência' :
              t.type === 'total_war' ? 'Guerra Total' :
              'Pontos Corridos'
            }
          </p>
        </div>

        {t.winnerId && (
          <div className="mt-10 pt-6 border-t border-white/5 flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-lg shadow-brand/5">
                <Crown className="w-5 h-5 text-brand" />
             </div>
             <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mb-0.5">Hall da Fama</span>
                <span className="text-lg font-black uppercase italic tracking-tight text-white">
                  {t.winnerName}
                </span>
             </div>
          </div>
        )}
      </div>
      
      <div className={`flex items-center justify-between uppercase tracking-[0.3em] font-black pt-8 mt-4 ${variant === 'active' ? 'text-[9px]' : 'text-[8px]'}`}>
         <div className="flex items-center gap-6 text-slate-500">
            <span className="flex items-center gap-2 group-hover:text-white transition-colors">
               <Users className="w-3 h-3" />
               Competidores
            </span>
         </div>
         <div className="flex items-center gap-2 text-brand font-black group-hover:translate-x-2 transition-transform italic">
            Entrar
            <ChevronRight className="w-4 h-4" />
         </div>
      </div>
    </Link>
  );
}

function CreateTournament() {
  const [name, setName] = useState('');
  const [type, setType] = useState<Tournament['type']>('single_elimination');
  const [submitting, setSubmitting] = useState(false);
  const { guestId } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        name,
        type,
        status: 'draft',
        createdAt: serverTimestamp(),
        createdBy: guestId,
        settings: {
          maxPlayers: 16,
          gamesPerMatch: 1
        }
      });
      navigate(`/tournaments/${docRef.id}`);
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'tournaments');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link to="/tournaments" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Voltar para Torneios
      </Link>

      <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-10">Novo Campeonato</h1>

      <form onSubmit={handleSubmit} className="glass-card p-12 space-y-10 bg-slate-900/30">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Identidade do Torneio</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand transition-colors text-xl font-bold placeholder:text-slate-800"
            placeholder="NOME DO TORNEIO // 2024"
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Formato de Batalha</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'single_elimination', label: 'Eliminação Simples', desc: 'Mata-Mata Direto' },
              { id: 'double_elimination', label: 'Dupla Eliminação', desc: 'Com Repescagem' },
              { id: 'survival', label: 'Sobrevivência', desc: 'Mata-Mata Violento' },
              { id: 'total_war', label: 'Guerra Total', desc: 'Campo de Batalha' },
              { id: 'round_robin', label: 'Pontos Corridos', desc: 'Todos vs Todos' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setType(f.id as any)}
                className={`p-6 rounded-2xl border transition-all text-left flex flex-col items-center justify-center gap-1 ${
                  type === f.id ? 'bg-brand/10 border-brand' : 'bg-black/40 border-white/5 hover:border-white/20'
                }`}
              >
                <span className={`text-xs font-black uppercase tracking-widest ${type === f.id ? 'text-brand' : 'text-slate-400'}`}>{f.label}</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold tracking-tighter">{f.desc}</span>
              </button>
            ))}
          </div>
          
          {/* Rule Description Box */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={type}
            className="p-6 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-start"
          >
             <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-brand" />
             </div>
             <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Regras do Formato: {TOURNAMENT_RULES[type].title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">{TOURNAMENT_RULES[type].rules}</p>
             </div>
          </motion.div>
        </div>

        <button 
          disabled={submitting}
          className="w-full py-5 bg-brand text-bg-dark font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-100 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-3 neon-border shadow-lg shadow-brand/20"
        >
          {submitting ? 'PROCESSANDO...' : 'Inicializar Torneio'}
          <ChevronRight className="w-5 h-5 stroke-[4px]" />
        </button>
      </form>
    </div>
  );
}

function TournamentDetails() {
  const { id } = useParams();
  const { guestId } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'settings'>('players');
  const [loading, setLoading] = useState(true);
  
  // Real-time data
  useEffect(() => {
    if (!id) return;

    const tRef = doc(db, 'tournaments', id);
    const unsubscribeT = onSnapshot(tRef, (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
      }
      setLoading(false);
    });

    const pQuery = query(collection(db, 'tournaments', id, 'players'));
    const unsubscribeP = onSnapshot(pQuery, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    });

    const mQuery = query(collection(db, 'tournaments', id, 'matches'), orderBy('round', 'asc'));
    const unsubscribeM = onSnapshot(mQuery, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });

    return () => {
      unsubscribeT();
      unsubscribeP();
      unsubscribeM();
    };
  }, [id]);

  if (loading) return <div className="p-24 text-center text-zinc-500 font-black uppercase tracking-[0.4em] animate-pulse">Estabelecendo Conexão Tática...</div>;
  if (!tournament) return <div className="p-24 text-center text-zinc-500 font-black uppercase tracking-[0.4em]">Campo de Batalha não Encontrado</div>;

  const isOwner = guestId === tournament.createdBy;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 relative">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-brand/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="space-y-6 relative z-10">
           <Link to="/tournaments" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand text-[10px] font-black uppercase tracking-[0.3em] transition-all">
            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-brand group-hover:text-black">
              <ChevronLeft className="w-4 h-4" />
            </div>
            Centro Tático
          </Link>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-3 h-3 rounded-full bg-brand shadow-[0_0_12px_#10b981]" />
              <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${
                tournament.status === 'active' ? 'bg-brand/10 border-brand/40 text-brand' : 'bg-slate-800 border-white/10 text-slate-400'
              }`}>
                Estado: {tournament.status === 'active' ? 'Ativo' : tournament.status === 'draft' ? 'Rascunho' : 'Finalizado'}
              </div>
              
              {/* Contextual Rules Indicator */}
              <div className="group relative px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border bg-zinc-900 border-white/10 text-slate-300 flex items-center gap-2 cursor-help">
                <Info className="w-3 h-3 text-brand" />
                <span>Regras: {TOURNAMENT_RULES[tournament.type].title}</span>
                
                <div className="absolute top-full left-0 mt-4 w-64 p-6 glass-card border-brand/20 bg-black/90 backdrop-blur-xl z-[100] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300">
                  <h5 className="text-brand mb-2 text-[10px] font-black italic tracking-widest uppercase">Protocolo de Combate</h5>
                  <p className="text-slate-300 text-[11px] leading-relaxed normal-case font-medium tracking-normal">
                    {TOURNAMENT_RULES[tournament.type].rules}
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/5 text-[8px] text-slate-500 italic">
                    * Em caso de dúvidas, consulte o juiz da mesa.
                  </div>
                </div>
              </div>
            </div>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white mb-2">{tournament.name}</h1>
            <div className="flex items-center gap-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2 text-emerald-500">
                <TableIcon className="w-3 h-3" />
                Formato // {
                  tournament.type === 'single_elimination' ? 'Eliminação Simples' :
                  tournament.type === 'double_elimination' ? 'Dupla Eliminação' :
                  tournament.type === 'survival' ? 'Sobrevivência' :
                  tournament.type === 'total_war' ? 'Guerra Total' :
                  'Pontos Corridos'
                }
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-3 h-3" />
                {players.length} Inscritos
              </span>
            </div>

            {tournament.winnerId && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-8 relative inline-block"
              >
                <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full" />
                <div className="relative glass-card border-brand/40 px-6 py-4 flex items-center gap-4 bg-brand/5">
                  <div className="w-12 h-12 bg-brand text-bg-dark flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <Trophy className="w-6 h-6 stroke-[3px]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand mb-1">
                      Grande Campeão
                    </div>
                    <div className="text-2xl font-black italic uppercase tracking-tighter text-white">
                      {tournament.winnerName || "Desconhecido"}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {isOwner && tournament.status === 'draft' && (
            <button 
              onClick={async () => {
                await updateDoc(doc(db, 'tournaments', tournament.id), { status: 'active' });
              }}
              className="px-8 py-4 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all text-xs neon-border shadow-xl shadow-brand/20 italic"
            >
              Iniciar Torneio
            </button>
          )}
          {isOwner && (
             <button className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-colors">
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-900 mb-10 gap-8">
        {[
          { id: 'players', icon: Users, label: 'Participantes' },
          { id: 'matches', icon: LayoutDashboard, label: 'Tabela / Partidas' },
          { id: 'settings', icon: Settings, label: 'Configurações' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-brand' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'players' && (
          <PlayerList tournament={tournament} players={players} matches={matches} isOwner={isOwner} />
        )}
        {activeTab === 'matches' && (
          <MatchList tournament={tournament} matches={matches} players={players} isOwner={isOwner} />
        )}
        {activeTab === 'settings' && (
          <div className="glass-card p-10 text-center text-zinc-500">
            Configurações avançadas e exclusão de torneio em breve.
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerList({ tournament, players, matches, isOwner }: { tournament: Tournament, players: Player[], matches: Match[], isOwner: boolean }) {
  const [newName, setNewName] = useState('');
  const tournamentId = tournament.id;

  // --- Stats Calculations ---
  const finishedMatches = matches.filter(m => m.status === 'finished');
  
  const avgGamesPerMatch = finishedMatches.length > 0
    ? (finishedMatches.reduce((acc, m) => acc + m.score1 + m.score2, 0) / finishedMatches.length).toFixed(1)
    : "0";

  const tournamentDuration = tournament.finishedAt && tournament.createdAt
    ? Math.abs(tournament.finishedAt.toDate() - tournament.createdAt.toDate())
    : null;

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  const playerStats = players.map(p => {
    const pMatches = finishedMatches.filter(m => m.player1Id === p.id || m.player2Id === p.id);
    const wins = finishedMatches.filter(m => m.winnerId === p.id).length;
    const losses = pMatches.length - wins;
    const winRate = pMatches.length > 0 ? ((wins / pMatches.length) * 100).toFixed(0) : "0";
    
    return {
      name: p.name,
      wins,
      losses,
      winRate: parseInt(winRate),
      total: pMatches.length
    };
  }).sort((a, b) => b.wins - a.wins);

  const addPlayer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    try {
      await addDoc(collection(db, 'tournaments', tournamentId, 'players'), {
        name: newName,
        tournamentId,
        seed: players.length + 1,
        status: 'active'
      });
      setNewName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${tournamentId}/players`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-12">
        {/* Statistics Dashboard */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Dashboard de Performance</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 border-brand/20 bg-brand/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Média de Games</div>
              <div className="text-3xl font-black italic uppercase tracking-tighter text-white">{avgGamesPerMatch} <span className="text-brand text-sm italic">per Match</span></div>
            </div>
            <div className="glass-card p-6 border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Líder de Vitórias</div>
              <div className="text-3xl font-black italic uppercase tracking-tighter text-white">{playerStats[0]?.wins || 0} <span className="text-brand text-sm italic">Wins</span></div>
            </div>
            <div className="glass-card p-6 border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tempo Total</div>
              <div className="text-3xl font-black italic uppercase tracking-tighter text-white">
                {tournamentDuration ? formatDuration(tournamentDuration) : "Ativo..."}
              </div>
            </div>
          </div>

          <div className="glass-card p-8 h-[300px]">
            <div className="text-[10px] font-black uppercase tracking-widest text-brand mb-6">Comparativo de Vitórias</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={playerStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Bar dataKey="wins" radius={[4, 4, 0, 0]}>
                  {playerStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ffffff10'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Lista de Gladiadores</h3>
          <div className="grid gap-4">
            {players.length === 0 ? (
              <div className="glass-card p-20 text-center text-zinc-600 border-dashed border-2">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                Nenhum jogador inscrito ainda.
              </div>
            ) : (
              players.map((p, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={p.id} 
                  className="glass-card p-4 border-white/5 flex items-center justify-between group hover:border-brand/20 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-white font-black italic text-sm">
                      #{p.seed}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black uppercase italic tracking-tighter text-xl text-white">{p.name}</span>
                      <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest text-slate-500">
                        <span>Win Rate: <span className="text-brand">{playerStats.find(s => s.name === p.name)?.winRate}%</span></span>
                        <span>Partidas: {playerStats.find(s => s.name === p.name)?.total}</span>
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <button 
                      onClick={() => deleteDoc(doc(db, 'tournaments', tournamentId, 'players', p.id))}
                      className="p-3 text-slate-700 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        {isOwner && tournament.status === 'draft' && (
          <div className="glass-card p-8 bg-brand/5 border-brand/20">
            <h4 className="font-black uppercase italic text-brand text-xs mb-6 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Inscrição de Elite
            </h4>
            <form onSubmit={addPlayer} className="space-y-4">
              <input 
                type="text" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="NOME DO GUERREIRO"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-brand transition-colors font-bold uppercase tracking-widest text-xs"
              />
              <button className="w-full py-4 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all text-[10px] shadow-lg shadow-brand/10 italic">
                Confirmar Participação
              </button>
            </form>
          </div>
        )}

        <div className="glass-card p-8 border-white/5 bg-slate-900/40">
           <h4 className="font-black uppercase italic text-slate-500 text-[10px] tracking-[0.3em] mb-8">Status da Tabela</h4>
           <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inscritos</span>
                <span className="text-3xl font-black italic uppercase tracking-tighter text-white">{players.length}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capacidade</span>
                <span className="text-3xl font-black italic uppercase tracking-tighter text-slate-700">16</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Partidas</span>
                <span className="text-3xl font-black italic uppercase tracking-tighter text-white">{matches.length}</span>
              </div>
           </div>
           
           <div className="mt-12 p-4 bg-white/5 rounded-xl border border-white/5">
             <p className="text-[8px] font-bold text-slate-600 uppercase leading-relaxed tracking-[0.1em]">
               * O sistema calcula automaticamente o tempo médio com base na finalização do torneio.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function MatchList({ tournament, matches, players, isOwner }: { tournament: Tournament, matches: Match[], players: Player[], isOwner: boolean }) {
  const tournamentId = tournament.id;
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || "TBD";

  const updateScore = async (matchId: string, score1: number, score2: number, status: Match['status'] = 'in_progress') => {
     try {
       await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
         score1,
         score2,
         status,
         updatedAt: serverTimestamp()
       });
     } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}/matches/${matchId}`);
     }
  };

  const setWinner = async (matchId: string, winnerId: string) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
        winnerId,
        status: 'finished',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}/matches/${matchId}`);
    }
  }

  // Logic to generate matches for different formats
  const generateMatches = async () => {
    if (players.length < 2) return alert("Necessário pelo menos 2 jogadores");
    
    // Shuffle players
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const pairs = [];
    
    if (tournament?.type === 'single_elimination' || tournament?.type === 'double_elimination' || tournament?.type === 'survival') {
      for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i+1]) pairs.push([shuffled[i].id, shuffled[i+1].id]);
        else {
          // Bye logic
          pairs.push([shuffled[i].id, 'BYE']);
        }
      }

      try {
        for (const pair of pairs) {
          await addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: pair[0],
            player2Id: pair[1] === 'BYE' ? '' : pair[1],
            score1: 0,
            score2: 0,
            round: 1,
            bracket: 'winners', // Default for single/initial double
            status: pair[1] === 'BYE' ? 'finished' : 'pending',
            winnerId: pair[1] === 'BYE' ? pair[0] : null
          });
        }
        await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'active' });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'matches');
      }
    } else if (tournament?.type === 'round_robin' || tournament?.type === 'total_war') {
      // All vs All
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          pairs.push([players[i].id, players[j].id]);
        }
      }

      try {
        for (const pair of pairs) {
          await addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: pair[0],
            player2Id: pair[1],
            score1: 0,
            score2: 0,
            round: 1,
            bracket: 'points',
            status: 'pending',
            winnerId: null
          });
        }
        await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'active' });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'matches');
      }
    }
  };

  // Logic to generate the next round matches (Complex for Double Elimination)
  const generateNextRound = async () => {
    const maxRound = Math.max(...matches.map(m => m.round), 0);
    const currentRoundMatches = matches.filter(m => m.round === maxRound);
    
    const allFinished = currentRoundMatches.every(m => m.status === 'finished');
    if (!allFinished) return alert("Todas as partidas da rodada atual devem ser finalizadas primeiro.");

    if (tournament?.type === 'single_elimination' || tournament?.type === 'double_elimination' || tournament?.type === 'survival') {
      const winners = currentRoundMatches.map(m => m.winnerId).filter(Boolean) as string[];
      
      // If double elimination, we also need to handle losers
      if (tournament?.type === 'double_elimination') {
        const losers = currentRoundMatches.map(m => 
          m.player1Id === m.winnerId ? m.player2Id : m.player1Id
        ).filter(id => id && id !== 'BYE') as string[];
        
        // This is a simplified version: losers join a "Repescagem" pool
        // In a real double elimination, the tracking is more complex
        // We will at least move winners forward and alert about the status
        if (winners.length < 2 && maxRound > 0) {
           // Handle final winner logic
        }
      }

      if (winners.length < 2) {
        if (winners.length === 1 && maxRound > 0) {
          const winner = players.find(p => p.id === winners[0]);
          alert(`Campeonato Finalizado! Vencedor: ${winner?.name || 'Desconhecido'}`);
          await updateDoc(doc(db, 'tournaments', tournamentId), { 
            status: 'finished',
            winnerId: winners[0],
            winnerName: winner?.name || 'Desconhecido',
            finishedAt: serverTimestamp()
          });
        }
        return;
      }

      try {
        const nextRound = maxRound + 1;
        for (let i = 0; i < winners.length; i += 2) {
          await addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: winners[i],
            player2Id: winners[i+1] || '',
            score1: 0,
            score2: 0,
            round: nextRound,
            bracket: 'winners',
            status: winners[i+1] ? 'pending' : 'finished',
            winnerId: winners[i+1] ? null : winners[i]
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'matches');
      }
    } else if (tournament?.type === 'round_robin' || tournament?.type === 'total_war') {
      // For Round Robin, check if all matched are finished.
      // If yes, determine overall winner.
      const winCounts: Record<string, number> = {};
      players.forEach(p => winCounts[p.id] = 0);
      matches.forEach(m => {
        if (m.winnerId) winCounts[m.winnerId]++;
      });

      const winnerId = Object.entries(winCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const winner = players.find(p => p.id === winnerId);

      alert(`Guerra Total Concluída! O Grande Campeão é: ${winner?.name || 'Desconhecido'}`);
      await updateDoc(doc(db, 'tournaments', tournamentId), { 
        status: 'finished',
        winnerId: winnerId,
        winnerName: winner?.name || 'Desconhecido',
        finishedAt: serverTimestamp()
      });
    } else if (tournament?.type === 'double_elimination') {
      const winners = currentRoundMatches.map(m => m.winnerId).filter(Boolean) as string[];
      if (winners.length < 2 && maxRound > 0) {
        const winner = players.find(p => p.id === winners[0]);
        alert(`Torneio Finalizado! Campeão: ${winner?.name || 'Desconhecido'}`);
        await updateDoc(doc(db, 'tournaments', tournamentId), { 
          status: 'finished',
          winnerId: winners[0],
          winnerName: winner?.name || 'Desconhecido',
          finishedAt: serverTimestamp()
        });
        return;
      }

      try {
        const nextRound = maxRound + 1;
        for (let i = 0; i < winners.length; i += 2) {
          await addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: winners[i],
            player2Id: winners[i+1] || '',
            score1: 0,
            score2: 0,
            round: nextRound,
            bracket: 'winners',
            status: winners[i+1] ? 'pending' : 'finished',
            winnerId: winners[i+1] ? null : winners[i]
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'matches');
      }
    }
  };

  const getRoundName = (round: number, totalMatches: number) => {
    if (tournament?.type === 'round_robin' || tournament?.type === 'total_war') {
      return "Tabela de Confrontos";
    }
    if (totalMatches === 1) return "Grande Final";
    if (totalMatches === 2) return "Semifinais";
    if (totalMatches === 4) return "Quartas de Final";
    if (totalMatches === 8) return "Oitavas de Final";
    return `Rodada ${round}`;
  };

  const maxRound = Math.max(...matches.map(m => m.round), 0);
  const currentRoundMatches = matches.filter(m => m.round === maxRound);
  const isRoundFinished = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === 'finished');
  const uniqueRounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      {matches.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <Trophy className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Nenhuma partida gerada</h3>
          <p className="text-zinc-500 mb-8 max-w-sm mx-auto">Assim que sua lista de jogadores estiver pronta, gere as partidas da primeira rodada.</p>
          {isOwner && (
            <button 
              onClick={generateMatches}
              className="px-8 py-3 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform italic"
            >
              Gerar Rodada 1
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Action Bar for Progression */}
          {isOwner && isRoundFinished && tournamentId && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 bg-brand/10 border-brand/40 flex items-center justify-between"
            >
              <div>
                <h4 className="font-black uppercase italic text-brand">Fase {maxRound} Concluída!</h4>
                <p className="text-xs text-slate-400">Todos os vencedores foram determinados. Avance para a próxima fase.</p>
              </div>
              <button 
                onClick={generateNextRound}
                className="px-6 py-3 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all text-xs"
              >
                Gerar Próxima Rodada
              </button>
            </motion.div>
          )}

          {/* Group by rounds */}
          {uniqueRounds.map(round => {
            const roundMatches = matches.filter(m => m.round === round);
            if (roundMatches.length === 0) return null;

            return (
              <div key={round} className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand flex items-center gap-4">
                  {getRoundName(round, roundMatches.length)}
                  <div className="h-px bg-brand/20 flex-grow" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roundMatches.map(m => (
                    <MatchCard 
                      key={m.id} 
                      match={m} 
                      p1Name={getPlayerName(m.player1Id)} 
                      p2Name={getPlayerName(m.player2Id)} 
                      isOwner={isOwner}
                      onUpdateScore={updateScore}
                      onSetWinner={setWinner}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchCard({ 
  match, 
  p1Name, 
  p2Name, 
  isOwner,
  onUpdateScore,
  onSetWinner
}: { 
  key?: string,
  match: Match, 
  p1Name: string, 
  p2Name: string, 
  isOwner: boolean,
  onUpdateScore: any,
  onSetWinner: any
}) {
  return (
    <div className="glass-card overflow-hidden bg-zinc-900 border-zinc-800 relative group">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        match.status === 'finished' ? 'bg-slate-700' : 
        match.status === 'in_progress' ? 'bg-brand shadow-[0_0_10px_#10b981]' :
        'bg-slate-800'
      }`} />
      
      <div className="p-6 flex flex-col gap-6">
        {/* Player 1 */}
        <div className={`flex items-center justify-between ${match.winnerId === match.player1Id ? 'text-white' : match.winnerId ? 'opacity-40' : 'text-white'}`}>
          <div className="flex flex-col">
             <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Entry #1</span>
               {match.winnerId === match.player1Id && <span className="px-1.5 py-0.5 bg-brand/20 text-brand text-[8px] font-black uppercase rounded">Winner</span>}
             </div>
             <span className="text-2xl font-black uppercase tracking-tight italic">{p1Name}</span>
          </div>
          <div className="flex items-center gap-4">
            {isOwner && match.status !== 'finished' && (
              <div className="flex flex-col gap-1">
                <button onClick={() => onUpdateScore(match.id, match.score1 + 1, match.score2)} className="w-8 h-8 rounded bg-white/5 hover:bg-brand hover:text-black flex items-center justify-center transition-all text-xs">▲</button>
                <button onClick={() => onUpdateScore(match.id, Math.max(0, match.score1 - 1), match.score2)} className="w-8 h-8 rounded bg-white/5 hover:bg-brand hover:text-black flex items-center justify-center transition-all text-xs">▼</button>
              </div>
            )}
            <div className="score-box text-3xl min-w-[3.5rem] flex items-center justify-center h-16">
              {match.score1}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="h-px bg-white/5 flex-grow" />
           <div className="text-[10px] font-black text-slate-700 italic uppercase">Vs Match</div>
           <div className="h-px bg-white/5 flex-grow" />
        </div>

        {/* Player 2 */}
        <div className={`flex items-center justify-between ${match.winnerId === match.player2Id ? 'text-white' : match.winnerId ? 'opacity-40' : 'text-white'}`}>
           <div className="flex flex-col">
             <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Entry #2</span>
               {match.winnerId === match.player2Id && <span className="px-1.5 py-0.5 bg-brand/20 text-brand text-[8px] font-black uppercase rounded">Winner</span>}
             </div>
             <span className="text-2xl font-black uppercase tracking-tight italic">{p2Name}</span>
          </div>
          <div className="flex items-center gap-4">
            {isOwner && match.status !== 'finished' && (
              <div className="flex flex-col gap-1">
                <button onClick={() => onUpdateScore(match.id, match.score1, match.score2 + 1)} className="w-8 h-8 rounded bg-white/5 hover:bg-brand hover:text-black flex items-center justify-center transition-all text-xs">▲</button>
                <button onClick={() => onUpdateScore(match.id, match.score1, Math.max(0, match.score2 - 1))} className="w-8 h-8 rounded bg-white/5 hover:bg-brand hover:text-black flex items-center justify-center transition-all text-xs">▼</button>
              </div>
            )}
            <div className="score-box text-3xl min-w-[3.5rem] flex items-center justify-center h-16">
              {match.score2}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isOwner && match.status !== 'finished' && (
          <div className="pt-4 grid grid-cols-2 gap-3">
            <button 
              onClick={() => onSetWinner(match.id, match.player1Id)}
              className="py-3 bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-brand hover:text-black transition-all"
            >
              Vitória P1
            </button>
            <button 
              onClick={() => onSetWinner(match.id, match.player2Id)}
              className="py-3 bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-brand hover:text-black transition-all"
            >
              Vitória P2
            </button>
          </div>
        )}
      </div>
      
      {match.status === 'finished' && (
        <div className="bg-zinc-800/50 py-2 px-5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Partida Concluída</span>
        </div>
      )}
    </div>
  );
}

// --- Authentication Components ---
// --- Authentication Components ---
// Removed Login components for simplicity as requested

function useAuth() {
  const [guestId] = useState(() => getGuestId());
  const [displayName] = useState(() => getDisplayName());

  return { guestId, displayName, loading: false };
}

// --- Main App ---
export default function App() {
  const { loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
       <div className="text-brand animate-pulse font-black uppercase tracking-[0.5em]">Inicializando Sistemas...</div>
    </div>
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 selection:bg-brand selection:text-black relative overflow-hidden">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<TournamentManager />} />
            <Route path="/tournaments/new" element={<CreateTournament />} />
            <Route path="/tournaments/:id" element={<TournamentDetails />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/rules" element={<BilliardsRules />} />
          </Routes>
        </main>
        
        <footer className="border-t border-white/5 py-16 mt-24 bg-black/20">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-12">
            <div className="flex flex-col md:flex-row justify-between w-full items-center gap-8">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand" />
                <span className="font-display font-bold text-2xl tracking-tighter uppercase italic">NUMBER <span className="text-brand">8</span></span>
              </div>
              <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest text-center">© 2024 Criado para os mestres do bilhar. Grau Profissional.</p>
              <div className="flex gap-6 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <Link to="/privacy" className="hover:text-brand transition-colors">Privacidade</Link>
                <Link to="/rules" className="hover:text-brand transition-colors">Regras de Bilhar</Link>
              </div>
            </div>
            
            <div className="w-full h-px bg-white/5" />
            
            <div className="text-center space-y-6">
              <div className="text-brand/50 text-[10px] font-black uppercase tracking-[0.4em]">Desenvolvedor de Software</div>
              <div className="text-4xl font-black italic uppercase tracking-tighter text-white">JOTA TEMBE</div>
              <p className="text-zinc-500 text-xs max-w-lg mx-auto font-medium leading-relaxed tracking-wide uppercase">
                QUER UM APLICATIVO EXCLUSIVO COMO ESTE? <br />
                ENTRE EM CONTACTO PARA QUE EU POSSA CRIAR A SUA SOLUÇÃO PERSONALIZADA.
              </p>
              <a 
                href="https://wa.me/258877057075" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all font-black uppercase tracking-[0.2em] text-[10px] italic shadow-[0_0_30px_rgba(16,185,129,0.1)]"
              >
                <MessageCircle className="w-4 h-4 stroke-[3px]" />
                WhatsApp: 877057075
              </a>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24">
      <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-12">Termos de <span className="text-brand">Privacidade</span></h1>
      <div className="glass-card p-12 space-y-8 text-slate-300 leading-relaxed font-medium">
        <section>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-4">1. Coleta de Dados</h2>
          <p>O NUMBER 8 coleta apenas informações essenciais para a gestão de torneios, como nomes de jogadores e resultados de partidas. Não vendemos seus dados a terceiros.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-4">2. Uso de Imagens</h2>
          <p>Imagens geradas ou carregadas para perfis e torneios são de responsabilidade dos organizadores. Reservamo-nos o direito de remover conteúdo impróprio.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-4">3. Segurança</h2>
          <p>Utilizamos infraestrutura Firebase de padrão industrial para garantir que os dados do seu campeonato estejam sempre protegidos e disponíveis.</p>
        </section>
        <div className="pt-8 border-t border-white/5 text-[10px] uppercase tracking-widest text-slate-500">
          Última atualização: Maio de 2024
        </div>
      </div>
    </div>
  );
}

function BilliardsRules() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24">
      <div className="mb-12">
        <span className="text-brand text-[10px] font-black uppercase tracking-[0.4em]">Artigo Técnico</span>
        <h1 className="text-6xl font-black italic uppercase tracking-tighter mt-2">Regras de Bilhar <br /> <span className="text-brand">Mesa Moçambique</span></h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="glass-card p-8">
            <h3 className="text-brand font-black uppercase text-xs mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-brand rounded-full" />
              O Início (Saída)
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed italic">
              Em Moçambique, a saída é decidida na moeda ou no encosto. É obrigatório que pelo menos 4 bolas toquem nas tabelas ou que uma seja encaçapada para a saída ser válida.
            </p>
          </div>
          
          <div className="glass-card p-8">
            <h3 className="text-brand font-black uppercase text-xs mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-brand rounded-full" />
              Bola 8 (A Preta)
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed italic">
              A bola preta deve ser sempre anunciada (marcada) na caçapa pretendida. Se ganhar direto na saída, o jogador tem a opção de repor a bola ou recomeçar o jogo.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 bg-brand/5 border-brand/20">
            <h3 className="text-brand font-black uppercase text-xs mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-brand rounded-full" />
              Regras de Falta
            </h3>
            <ul className="text-slate-400 text-xs space-y-4 font-bold uppercase tracking-wide">
              <li className="flex items-start gap-2">
                <span className="text-brand">•</span> Não tocar na sua própria bola primeiro.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand">•</span> Encaçapar a bola branca resulta em "bola na mão" para o adversário.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand">•</span> Dois toques na bola branca ou tocar as bolas com a mão é falta grave.
              </li>
            </ul>
          </div>
          
          <div className="glass-card p-8">
            <h3 className="text-slate-200 font-black uppercase text-xs mb-4">Etiqueta de Jogo</h3>
            <p className="text-slate-500 text-[10px] leading-tight uppercase tracking-widest italic font-bold">
              O bilhar moçambicano é um jogo de cavalheiros. O silêncio durante a tacada do adversário é obrigatório nos principais salões e torneios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
