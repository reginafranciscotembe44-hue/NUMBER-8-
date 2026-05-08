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
  Check,
  X,
  ShieldCheck,
  Info,
  Gamepad2,
  ShieldAlert,
  ArrowLeft,
  Target,
  Bell,
  BellRing,
  User as UserIcon,
  Sword,
  Search,
  MapPin,
  Eye,
  EyeOff
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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
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
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';

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
  startTime?: string;
  endTime?: string;
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
  bracket: 'winners' | 'losers' | 'grand_final' | 'points';
  status: 'pending' | 'in_progress' | 'finished';
  updatedAt?: any;
}

interface FriendlyMatch {
  id: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  score1: number;
  score2: number;
  winnerId: string | null;
  createdBy: string;
  createdAt: any;
  status: 'requested' | 'accepted' | 'finished' | 'declined';
}

type UserRole = 'player' | 'owner';

interface AppUser extends User {
  role?: UserRole;
  age?: number;
  playStyle?: string;
  bio?: string;
}

interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'tournament_start' | 'match_start' | 'enrollment';
  read: boolean;
  createdAt: any;
  link?: string;
}

// --- Components ---

function Navbar({ onShowProfile }: { onShowProfile: (id: string) => void }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error: any) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
          >
             <div className="absolute inset-0 bg-brand blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <Trophy className="w-6 h-6 text-brand relative z-10" />
          </motion.div>
          <span className="font-display font-black text-2xl md:text-3xl tracking-tighter italic uppercase text-white">
            NUMBER <span className="text-brand">8</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/tournaments" className="hidden sm:block">
            <motion.span 
              whileHover={{ scale: 1.05, color: '#10b981' }}
              className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block transition-colors"
            >
              Arenas
            </motion.span>
          </Link>
          <Link to="/friendly" className="hidden sm:block">
            <motion.span 
              whileHover={{ scale: 1.05, color: '#10b981' }}
              className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block transition-colors"
            >
              Amistosos
            </motion.span>
          </Link>
          
          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {user && (
            <div className="flex items-center gap-4">
              {/* Notification Center */}
              <div className="relative mr-2">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group"
                >
                  {unreadCount > 0 ? (
                    <BellRing className="w-5 h-5 text-brand animate-bounce" />
                  ) : (
                    <Bell className="w-5 h-5 text-slate-500 group-hover:text-white" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand text-bg-dark text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-950">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowNotifications(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute top-14 right-0 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Centro de Comando</span>
                          <button 
                            onClick={clearAll}
                            className="text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-brand"
                          >
                            Limpar Tudo
                          </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-700">
                              <Bell className="w-8 h-8 opacity-20 mx-auto mb-3" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">Sem Alertas</p>
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => {
                                  markAsRead(n.id);
                                  if (n.link) setShowNotifications(false);
                                }}
                                className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative ${!n.read ? 'bg-brand/5 border-l-2 border-l-brand' : ''}`}
                              >
                                <p className="text-[11px] font-black uppercase italic tracking-tight text-white mb-0.5">{n.title}</p>
                                <p className="text-[9px] font-medium text-slate-400 leading-relaxed uppercase tracking-wider">{n.message}</p>
                                <span className="text-[7px] font-bold text-slate-600 mt-2 block uppercase tracking-widest">
                                  {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleTimeString() : 'Recentemente'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => onShowProfile(user.uid)}
                className="flex flex-col items-end hidden md:flex cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">
                  {user.displayName || 'Operador N8'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm ${
                    user.role === 'owner' ? 'bg-brand text-bg-dark' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  }`}>
                    {user.role === 'owner' ? 'Dono da Mesa' : 'Jogador'}
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 leading-none">
                    {user.age ? `${user.age} anos` : 'Online'}
                  </span>
                </div>
              </motion.div>
              <div 
                onClick={() => onShowProfile(user.uid)}
                className="relative group cursor-pointer"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-xl border border-white/10 group-hover:border-brand/40 transition-all cursor-pointer shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl border border-white/10 bg-brand/5 flex items-center justify-center">
                    <Users className="w-5 h-5 text-brand" />
                  </div>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-950 border border-white/10 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-500 transition-all shadow-lg"
                  title="Sair"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
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
  const { user } = useAuth();
  const { requestPermission } = useNotifications();
  const [todayTournaments, setTodayTournaments] = useState<Tournament[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    if (user && "Notification" in window && Notification.permission === "default") {
      const timer = setTimeout(() => setShowPermissionPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, 'tournaments'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTodayTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tournaments (active)');
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex flex-col items-center relative w-full">
      {/* Permission Prompt */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="glass-card p-6 border-brand/20 bg-zinc-900/90 backdrop-blur-2xl flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center">
                  <BellRing className="text-brand w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black uppercase tracking-widest text-white italic">Ativar Alertas Push?</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight mt-1">Seja notificado no início das partidas e torneios.</p>
                </div>
                <button onClick={() => setShowPermissionPrompt(false)} className="p-2 text-slate-700 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    requestPermission();
                    setShowPermissionPrompt(false);
                  }}
                  className="flex-1 py-3 bg-brand text-bg-dark font-black uppercase text-[10px] tracking-[0.2em] italic rounded-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Ativar Notificações
                </button>
                <button 
                  onClick={() => setShowPermissionPrompt(false)}
                  className="px-6 py-3 border border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] italic rounded-lg hover:bg-white/5 transition-all"
                >
                  Agora Não
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {user?.role === 'owner' ? (
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
            ) : (
              <Link 
                to="/tournaments" 
                className="group relative px-12 py-6 bg-emerald-500 text-zinc-950 font-black uppercase italic tracking-[0.2em] rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
              >
                <div className="relative z-10 flex items-center gap-3 text-sm">
                  <Trophy className="w-5 h-5 stroke-[3px]" />
                  Entrar no Torneio
                </div>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
            )}
            
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
            { label: 'Jogadores Pró', val: todayTournaments.length > 0 ? todayTournaments.reduce((acc, t) => acc + 12, 0) : '128' },
            { label: 'Premiação Total', val: '$12.5k' },
            { label: 'Mesas ao Vivo', val: String(todayTournaments.length).padStart(2, '0') }
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center md:text-left"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{stat.label}</div>
              <div className="text-2xl font-mono font-bold text-white tracking-tight">{stat.val}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Today's Events */}
      {todayTournaments.length > 0 && (
        <section className="w-full max-w-7xl px-4 py-24 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8 text-center md:text-left">
            <div>
              <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                <span className="w-8 h-px bg-brand"></span>
                <span className="text-[10px] uppercase tracking-[0.4em] font-black text-brand italic">Protocolo de Emergência</span>
              </div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Arenas Ativas <span className="text-brand">Hoje</span></h2>
              <p className="text-slate-500 text-sm uppercase tracking-widest font-bold mt-2 italic">Jogadores em campo aguardando novos desafios</p>
            </div>
            
            <Link to="/tournaments" className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 hover:text-white transition-colors flex items-center gap-2">
              Ver Todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {todayTournaments.map(t => (
              <div key={t.id}>
                <TournamentCard t={t} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const { user } = useAuth();
  const [myParticipations, setMyParticipations] = useState<string[]>([]);

  const filteredTournaments = activeTab === 'all' 
    ? tournaments 
    : tournaments.filter(t => myParticipations.includes(t.id) || t.createdBy === user?.uid);

  const activeTournaments = filteredTournaments.filter(t => t.status !== 'finished');
  const pastTournaments = filteredTournaments.filter(t => t.status === 'finished');

  useEffect(() => {
    if (!user) return;

    // Fetch my participations index
    const fetchMyParticipations = async () => {
      try {
        const partSnap = await getDocs(collection(db, 'users', user.uid, 'participations'));
        setMyParticipations(partSnap.docs.map(doc => doc.id));
      } catch (e) {
        console.error(e);
      }
    };
    fetchMyParticipations();

    let q;
    if (user.role === 'owner') {
      q = query(
        collection(db, 'tournaments'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'tournaments'),
        where('status', 'in', ['active', 'finished']),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tournaments');
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

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
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-brand text-bg-dark italic' : 'bg-white/5 text-slate-500 hover:text-white'}`}
            >
              Todas as Arenas
            </button>
            <button 
              onClick={() => setActiveTab('my')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my' ? 'bg-brand text-bg-dark italic' : 'bg-white/5 text-slate-500 hover:text-white'}`}
            >
              Minhas Inscrições
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="glass-card px-8 py-4 border-white/5 bg-white/5 flex flex-col items-center">
             <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Média de Inscritos</span>
             <span className="text-2xl font-black italic uppercase italic tracking-tighter text-white">8/16</span>
          </div>
          {user?.role === 'owner' && (
            <Link 
              to="/tournaments/new" 
              className="px-10 py-5 bg-brand text-bg-dark font-black uppercase italic tracking-[0.1em] rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-xs shadow-xl shadow-brand/10 shadow-[0_0_40px_rgba(var(--brand-rgb),0.2)]"
            >
              <Plus className="w-5 h-5 stroke-[3px]" />
              Nova Temporada
            </Link>
          )}
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

interface TournamentCardProps {
  t: Tournament;
  variant?: 'active' | 'history';
}

function TournamentCard({ t, variant = 'active' }: TournamentCardProps) {
  const { user } = useAuth();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full"
    >
      <Link 
        to={`/tournaments/${t.id}`} 
        className={`glass-card group transition-all flex flex-col justify-between relative overflow-hidden ${
          variant === 'active' 
            ? 'p-10 border-white/5 hover:border-brand/40 min-h-[20rem] bg-slate-900/40 shadow-2xl shadow-black/40' 
            : 'p-6 border-white/5 hover:border-white/20 min-h-[14rem] bg-slate-900/20'
        }`}
      >
        <div className={`absolute top-0 right-0 w-48 h-48 blur-[100px] -translate-y-1/2 translate-x-1/2 transition-opacity duration-700 pointer-events-none ${
          t.status === 'active' ? 'bg-emerald-500/10 opacity-60' : 
          t.status === 'finished' ? 'bg-zinc-500/10' : 
          'bg-brand/10 opacity-40'
        }`} />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col gap-1">
              <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] border self-start ${
                t.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                t.status === 'finished' ? 'bg-slate-800 border-white/5 text-slate-500' : 
                'bg-amber-400/10 border-amber-400/20 text-amber-400'
              }`}>
                {t.status === 'active' ? 'Ao Vivo' : t.status === 'draft' ? 'Rascunho' : 'Concluído'}
              </div>
              {t.startTime && (
                <span className="text-[10px] font-black tracking-widest text-brand uppercase mt-2 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {t.startTime} - {t.endTime || '??:??'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-600 font-mono font-bold tracking-widest uppercase">
              {t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleDateString('pt-BR') : 'SINCE DRAFT'}
            </span>
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
  
          {user?.role === 'player' && t.status === 'active' && (
            <div className="mt-6 flex items-center gap-2">
               <div className="flex-1 h-px bg-emerald-500/20" />
               <span className="text-[8px] font-black uppercase tracking-[0.4em] text-emerald-500 animate-pulse">Desafio Ativo</span>
               <div className="flex-1 h-px bg-emerald-500/20" />
            </div>
          )}
  
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
    </motion.div>
  );
}

const notifyPlayer = async (userId: string, title: string, message: string, type: 'tournament_start' | 'match_start' | 'enrollment', link?: string) => {
  try {
    await addDoc(collection(db, 'users', userId, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      link
    });
  } catch (e) {
    console.error("Notification Error:", e);
  }
};

function VerifyEmail({ user, onLogout }: { user: User, onLogout: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resendEmail = async () => {
    setLoading(true);
    try {
      await sendEmailVerification(user);
      setMessage("Link de confirmação reenviado com sucesso!");
    } catch (err: any) {
      setMessage("Erro ao enviar e-mail. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    await user.reload();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand/5 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-12 max-w-md w-full relative z-10 border-white/5 bg-zinc-900/60 backdrop-blur-3xl rounded-[3rem] text-center"
      >
        <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldCheck className="text-brand w-12 h-12" />
        </div>
        
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Confirme seu <span className="text-brand">E-mail</span></h2>
        <p className="text-slate-400 text-sm mb-8">
          Enviamos um link de confirmação para <span className="text-white font-bold">{user.email}</span>. 
          Você precisa confirmar sua conta para acessar o N8 Arena.
          <br /><br />
          <span className="text-brand/80 font-medium">⚠️ Importante: Verifique também a sua pasta de Spam ou Lixo Eletrónico.</span>
        </p>

        {message && (
          <div className="p-4 bg-brand/10 border border-brand/20 rounded-2xl text-brand text-xs font-bold uppercase mb-6">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={checkVerification}
            className="w-full h-14 bg-brand text-zinc-950 font-black italic uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            Já verifiquei meu e-mail
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={resendEmail}
            disabled={loading}
            className="w-full h-14 bg-white/5 text-white font-black italic uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Reenviar e-mail'}
          </motion.button>


          <button 
            onClick={onLogout}
            className="w-full h-14 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-all"
          >
            Sair e usar outra conta
          </button>

          <button 
            onClick={() => {
              localStorage.setItem('n8_verify_bypass', 'true');
              window.location.reload();
            }}
            className="w-full text-zinc-700 hover:text-zinc-500 text-[8px] font-black uppercase tracking-[0.3em] pt-4"
          >
            Ignorar Verificação (Apenas Desenvolvedor)
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateTournament() {
  const [name, setName] = useState('');
  const [type, setType] = useState<Tournament['type']>('single_elimination');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('22:00');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== 'owner') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShieldAlert className="w-16 h-16 text-brand mx-auto mb-6" />
        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">Acesso Restrito</h2>
        <p className="text-slate-500 text-sm uppercase tracking-widest font-bold mb-8">Apenas Donos da Mesa podem iniciar novos torneios.</p>
        <Link to="/tournaments" className="px-8 py-4 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-xl text-[10px] italic">
          Voltar para Painel
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !user) return;

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        name,
        type,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        startTime,
        endTime,
        settings: {
          maxPlayers: 16,
          gamesPerMatch: 1
        }
      });
      // Notify Owner
      await notifyPlayer(user.uid, 'Arena Ativada', `Sua arena "${name}" está online!`, 'tournament_start', `/tournaments/${docRef.id}`);
      
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

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-px bg-brand"></span>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand italic">Disponibilidade da Arena</label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Início do Evento</label>
            <input 
              type="time" 
              required
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand transition-colors text-xl font-bold text-white shadow-inner"
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Término Previsto</label>
            <input 
              type="time" 
              required
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand transition-colors text-xl font-bold text-white shadow-inner"
            />
          </div>
        </div>
      </div>

        <button 
          disabled={submitting}
          type="submit"
          className="w-full py-8 bg-brand text-zinc-950 font-black uppercase italic tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand/20 flex items-center justify-center gap-4 text-lg"
        >
          {submitting ? 'Ativando Arena...' : (
            <>
              Ativar Arena Hoje
              <Plus className="w-6 h-6 stroke-[4px]" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function TournamentDetails({ onShowProfile }: { onShowProfile: (id: string) => void }) {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'stats' | 'settings'>('players');
  const [showSettings, setShowSettings] = useState(false);
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
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `tournaments/${id}`);
    });

    const pQuery = query(collection(db, 'tournaments', id, 'players'));
    const unsubscribeP = onSnapshot(pQuery, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `tournaments/${id}/players`);
    });

    const mQuery = query(collection(db, 'tournaments', id, 'matches'), orderBy('round', 'asc'));
    const unsubscribeM = onSnapshot(mQuery, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `tournaments/${id}/matches`);
    });

    return () => {
      unsubscribeT();
      unsubscribeP();
      unsubscribeM();
    };
  }, [id]);

  if (loading) return <div className="p-24 text-center text-zinc-500">Carregando campeonato...</div>;
  if (!tournament) return <div className="p-24 text-center">Torneio não encontrado</div>;

  const isOwner = user?.uid === tournament.createdBy;
  const isPlayer = user?.role === 'player';
  const isEnrolled = players.some(p => p.id === user?.uid || p.name === user?.displayName);

  const joinTournament = async () => {
    if (!user || !id) return;
    try {
      await setDoc(doc(db, 'tournaments', id, 'players', user.uid), {
        name: user.displayName,
        age: user.age || null,
        playStyle: user.playStyle || 'casual',
        tournamentId: id,
        seed: players.length + 1,
        status: 'active',
        isGuest: false
      });

      // Record in user's personal participation history for cross-device access
      await setDoc(doc(db, 'users', user.uid, 'participations', id), {
        tournamentId: id,
        tournamentName: tournament.name,
        joinedAt: serverTimestamp(),
        status: 'active'
      });

      // Send Notification to self (Confirmation)
      await addDoc(collection(db, 'users', user.uid, 'notifications'), {
        userId: user.uid,
        title: 'Inscrição Confirmada',
        message: `Você entrou no torneio ${tournament.name}. Prepare seu taco!`,
        type: 'enrollment',
        read: false,
        createdAt: serverTimestamp(),
        link: `/tournaments/${id}`
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}/players`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      <TournamentSettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        tournament={tournament} 
      />

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
              {tournament.startTime && (
                <span className="flex items-center gap-2 text-brand italic">
                  <Calendar className="w-3 h-3" />
                  {tournament.startTime} - {tournament.endTime || '??:??'}
                </span>
              )}
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
          {isOwner && (
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(true)}
              className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-500" />
            </motion.button>
          )}

          {isPlayer && !isEnrolled && tournament.status === 'active' && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={joinTournament}
              className="px-10 py-5 bg-emerald-500 text-bg-dark font-black uppercase italic tracking-[0.2em] rounded-2xl transition-all text-sm shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center gap-3 animate-pulse"
            >
              <Trophy className="w-5 h-5 stroke-[3px]" />
              Aceitar Desafio // {tournament.startTime}
            </motion.button>
          )}

          {isOwner && tournament.status === 'draft' && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                await updateDoc(doc(db, 'tournaments', tournament.id), { status: 'active' });
              }}
              className="px-8 py-4 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-2xl transition-all text-xs neon-border shadow-xl shadow-brand/20 italic"
            >
              Iniciar Torneio
            </motion.button>
          )}
          {isOwner && (
             <button className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-colors">
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-900 mb-10 gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'players', icon: Users, label: 'Gladiadores' },
          { id: 'matches', icon: Sword, label: 'Grade de Combate' },
          { id: 'settings', icon: Settings, label: 'Ajustes' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative truncate min-w-fit ${
              activeTab === tab.id ? 'text-brand italic' : 'text-zinc-500 hover:text-zinc-300'
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
          <PlayerList tournament={tournament} players={players} matches={matches} isOwner={isOwner} onShowProfile={onShowProfile} />
        )}
        {activeTab === 'matches' && (
          <MatchList tournament={tournament} matches={matches} players={players} isOwner={isOwner} onShowProfile={onShowProfile} />
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

function TournamentSettingsModal({ isOpen, onClose, tournament }: { isOpen: boolean, onClose: () => void, tournament: Tournament }) {
  const [name, setName] = useState(tournament.name);
  const [startTime, setStartTime] = useState(tournament.startTime || '19:00');
  const [endTime, setEndTime] = useState(tournament.endTime || '22:00');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        name,
        startTime,
        endTime
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja apagar este torneio?")) return;
    try {
      await deleteDoc(doc(db, 'tournaments', tournament.id));
      navigate('/tournaments');
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card w-full max-w-md p-8 border-white/10"
      >
        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8">Definições da Arena</h3>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Nome do Torneio</label>
            <input 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-6 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Início</label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-6 text-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Fim Estimado</label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-6 text-white text-sm"
              />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-brand text-bg-dark font-black uppercase italic tracking-widest rounded-xl transition-all text-xs"
            >
              Gravar Alterações
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="w-full h-14 bg-zinc-900 text-slate-400 font-black uppercase italic tracking-widest rounded-xl transition-all text-xs hover:text-white"
            >
              Cancelar
            </motion.button>
            <button 
              type="button"
              onClick={handleDelete}
              className="w-full pt-6 text-[10px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
            >
              Apagar Torneio Definitivamente
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PlayerList({ tournament, players, matches, isOwner, onShowProfile }: { tournament: Tournament, players: Player[], matches: Match[], isOwner: boolean, onShowProfile: (id: string) => void }) {
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newPlayStyle, setNewPlayStyle] = useState('');
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
        age: parseInt(newAge) || null,
        playStyle: newPlayStyle || 'casual',
        tournamentId,
        seed: players.length + 1,
        status: 'active',
        isGuest: true
      });
      setNewName('');
      setNewAge('');
      setNewPlayStyle('');
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
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => !(p as any).isGuest && onShowProfile(p.id)}
                          className={`font-black uppercase italic tracking-tighter text-xl text-white ${!(p as any).isGuest ? 'cursor-pointer hover:text-brand' : ''}`}
                        >
                          {p.name}
                        </span>
                        {(p as any).isGuest && (
                          <span className="text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-500 border border-white/5">
                            Guest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest text-slate-500">
                        <span>Win Rate: <span className="text-brand">{playerStats.find(s => s.name === p.name)?.winRate}%</span></span>
                        <span>Partidas: {playerStats.find(s => s.name === p.name)?.total}</span>
                        {(p as any).age && <span>• {(p as any).age} anos</span>}
                        {(p as any).playStyle && <span>• {(p as any).playStyle}</span>}
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
        {isOwner && (tournament.status === 'draft' || tournament.status === 'active') && (
          <div className="glass-card p-8 bg-brand/5 border-brand/20">
            <div className="mb-6">
              <h4 className="font-black uppercase italic text-brand text-xs flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Inscrição Offline
              </h4>
              <p className="text-[8px] font-bold text-brand/60 uppercase tracking-widest mt-1">Para jogadores sem acesso ao app</p>
            </div>
            <form onSubmit={addPlayer} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-brand/40 ml-2">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="EX: JOÃO DO TACO"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-brand transition-colors font-bold uppercase tracking-widest text-xs"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-widest text-brand/40 ml-2">Idade</label>
                  <input 
                    type="number" 
                    value={newAge}
                    onChange={e => setNewAge(e.target.value)}
                    placeholder="25"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-brand transition-colors font-bold uppercase tracking-widest text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-widest text-brand/40 ml-2">Estilo</label>
                  <select 
                    value={newPlayStyle}
                    onChange={e => setNewPlayStyle(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-brand transition-colors font-bold uppercase tracking-widest text-[9px] appearance-none"
                  >
                    <option value="">ESTILO...</option>
                    <option value="technical">TÉCNICO</option>
                    <option value="aggressive">AGRESSIVO</option>
                    <option value="strategic">ESTRATÉGICO</option>
                    <option value="casual">CASUAL</option>
                  </select>
                </div>
              </div>

              <button className="w-full py-4 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all text-[10px] shadow-lg shadow-brand/10 italic">
                Adicionar Gladiador Offline
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

function MatchList({ tournament, matches, players, isOwner, onShowProfile }: { tournament: Tournament, matches: Match[], players: Player[], isOwner: boolean, onShowProfile: (id: string) => void }) {
  const tournamentId = tournament.id;
  const getPlayerName = (id: string) => {
    if (!id) return "SUBIDA LIVRE"; // Change TBD to something more descriptive for byes
    return players.find(p => p.id === id)?.name || "Gladiador";
  };

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
          pairs.push([shuffled[i].id, '']);
        }
      }

      try {
        // Use individual addDocs but wrap in a way that we know they all start
        // Actually Firestore doesn't have a simple batch for addDoc without known IDs easily here
        // but we can use Promise.all which is what we did. 
        // Let's refine the pairs logic to ensure no duplicates.
        const promises = pairs.map(pair => 
          addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: pair[0],
            player2Id: pair[1],
            score1: 0,
            score2: 0,
            round: 1,
            bracket: 'winners',
            status: !pair[1] ? 'finished' : 'pending',
            winnerId: !pair[1] ? pair[0] : null,
            createdAt: serverTimestamp()
          })
        );
        
        await Promise.all(promises);
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
        const promises = pairs.map(pair => 
          addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: pair[0],
            player2Id: pair[1],
            score1: 0,
            score2: 0,
            round: 1,
            bracket: 'points',
            status: 'pending',
            winnerId: null,
            createdAt: serverTimestamp()
          })
        );
        
        await Promise.all(promises);
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

    if (tournament?.type === 'single_elimination' || tournament?.type === 'survival') {
      const winners = currentRoundMatches.map(m => m.winnerId).filter(Boolean) as string[];
      
      if (winners.length < 2) {
        if (winners.length === 1 && maxRound > 0) {
          const winner = players.find(p => p.id === winners[0]);
          alert(`Arena Finalizada! Grande Campeão: ${winner?.name || 'Desconhecido'}`);
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
        const promises = [];
        for (let i = 0; i < winners.length; i += 2) {
          promises.push(addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: winners[i],
            player2Id: winners[i+1] || '',
            score1: 0,
            score2: 0,
            round: nextRound,
            bracket: 'winners',
            status: winners[i+1] ? 'pending' : 'finished',
            winnerId: winners[i+1] ? null : winners[i],
            createdAt: serverTimestamp()
          }));
        }
        await Promise.all(promises);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'matches');
      }
    } else if (tournament?.type === 'double_elimination') {
      // HANDLE DOUBLE ELIMINATION
      const winnersBracketMatches = currentRoundMatches.filter(m => m.bracket === 'winners');
      const losersBracketMatches = currentRoundMatches.filter(m => m.bracket === 'losers');

      const nextRound = maxRound + 1;
      const batch = [];

      // 1. Winners move forward in Winners bracket
      const winnersMoveForward = winnersBracketMatches.map(m => m.winnerId).filter(Boolean) as string[];
      for (let i = 0; i < winnersMoveForward.length; i += 2) {
        // Only create next winner match if there's more than 1 winner left in this bracket
        if (winnersMoveForward.length > 1) {
          batch.push({
            player1Id: winnersMoveForward[i],
            player2Id: winnersMoveForward[i+1] || '',
            bracket: 'winners',
            round: nextRound
          });
        }
      }

      // 2. Losers of Winners bracket drop to Losers bracket
      const losersToDrop = winnersBracketMatches.map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id).filter(id => id && id !== 'BYE');
      
      // 3. Winners of Losers bracket move forward
      const losersMoveForward = losersBracketMatches.map(m => m.winnerId).filter(Boolean) as string[];

      // Merge losers into new matches
      const allLosersPool = [...losersToDrop, ...losersMoveForward];
      for (let i = 0; i < allLosersPool.length; i += 2) {
        batch.push({
          player1Id: allLosersPool[i],
          player2Id: allLosersPool[i+1] || '',
          bracket: 'losers',
          round: nextRound
        });
      }

      // Final Logic: If only 1 winner from winners bracket and 1 winner from losers bracket remains
      const totalWinnersInWinners = winnersMoveForward.length;
      const totalWinnersInLosers = allLosersPool.length;

      if (totalWinnersInWinners === 1 && totalWinnersInLosers === 1) {
        // GRAND FINAL
        batch.push({
          player1Id: winnersMoveForward[0],
          player2Id: allLosersPool[0],
          bracket: 'grand_final',
          round: nextRound
        });
      } else if (totalWinnersInWinners === 1 && totalWinnersInLosers === 0 && losersBracketMatches.length > 0) {
        // The tournament is finished
        const winner = players.find(p => p.id === winnersMoveForward[0]);
        alert(`Arena Finalizada! O Rei da Mesa é: ${winner?.name || 'Desconhecido'}`);
        await updateDoc(doc(db, 'tournaments', tournamentId), { 
          status: 'finished',
          winnerId: winner?.id,
          winnerName: winner?.name || 'Desconhecido',
          finishedAt: serverTimestamp()
        });
        return;
      }

      try {
        const promises = batch.map(mData => 
          addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            ...mData,
            score1: 0,
            score2: 0,
            status: mData.player2Id ? 'pending' : 'finished',
            winnerId: mData.player2Id ? null : mData.player1Id,
            createdAt: serverTimestamp()
          })
        );
        await Promise.all(promises);
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
    }
  };

  const getRoundName = (round: number, totalMatches: number, bracket?: string) => {
    if (tournament?.type === 'round_robin' || tournament?.type === 'total_war') {
      return "Fase Única: Todos contra Todos";
    }
    
    let prefix = "";
    if (bracket === 'losers') prefix = "Repescagem: ";
    if (bracket === 'grand_final') return "A GRANDE FINAL";

    if (totalMatches === 1) return prefix + "Final de Chave";
    if (totalMatches === 2) return prefix + "Semifinais";
    if (totalMatches === 4) return prefix + "Quartas de Final";
    return `${prefix}Rodada ${round}`;
  };

  const playerStats = players.map(p => {
    const pMatches = matches.filter(m => m.player1Id === p.id || m.player2Id === p.id);
    const finishedPMatches = pMatches.filter(m => m.status === 'finished');
    const wins = finishedPMatches.filter(m => m.winnerId === p.id).length;
    const losses = finishedPMatches.length - wins;
    const points = wins * 3; // Standard pool scoring
    
    return {
      id: p.id,
      name: p.name,
      wins,
      losses,
      points,
      total: pMatches.length,
      finished: finishedPMatches.length
    };
  }).sort((a, b) => b.points - a.points || b.wins - a.wins);

  const maxRound = Math.max(...matches.map(m => m.round), 0);
  const currentRoundMatches = matches.filter(m => m.round === maxRound);
  const isRoundFinished = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === 'finished');
  const uniqueRounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  return (
    <div className="space-y-12">
      {/* Classification Table for Round Robin */}
      {(tournament?.type === 'round_robin' || tournament?.type === 'total_war') && (
        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Classificação Geral // Pontos Corridos</h3>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Gladiador</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">P</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">V</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">D</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Progresso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {playerStats.map((stat, i) => (
                  <tr key={stat.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-brand text-bg-dark' : 'bg-zinc-900 text-slate-500'}`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black uppercase italic text-sm text-white">{stat.name}</td>
                    <td className="px-6 py-4 text-center font-black text-brand">{stat.points}</td>
                    <td className="px-6 py-4 text-center font-bold text-white/80">{stat.wins}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600">{stat.losses}</td>
                    <td className="px-6 py-4">
                       <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden mx-auto">
                        <div 
                          className="h-full bg-brand" 
                          style={{ width: `${(stat.finished / stat.total) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <Trophy className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Nenhuma partida gerada</h3>
          <p className="text-zinc-500 mb-8 max-w-sm mx-auto">Assim que sua lista de jogadores estiver pronta, gere as partidas da primeira rodada.</p>
          {isOwner ? (
            tournament.status === 'active' ? (
              <button 
                onClick={generateMatches}
                className="px-8 py-3 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform italic"
              >
                Gerar Grade de Combate
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">A arena está pronta, mas o torneio ainda não começou.</p>
                <button 
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'active' });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}`);
                    }
                  }}
                  className="px-8 py-3 bg-white text-bg-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform italic"
                >
                  <Crown className="w-4 h-4 inline mr-2" />
                  Iniciar Arena
                </button>
              </div>
            )
          ) : (
             <p className="text-zinc-600 text-xs italic font-bold">O Administrador ainda não gerou as partidas.</p>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Action Bar for Progression */}
          {isOwner && isRoundFinished && tournament.status === 'active' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 bg-brand/10 border-brand/40 flex items-center justify-between"
            >
              <div>
                <h4 className="font-black uppercase italic text-brand">
                  {tournament.type === 'round_robin' ? 'Liga Completa!' : `Fase ${maxRound} Concluída!`}
                </h4>
                <p className="text-xs text-slate-400">
                  {tournament.type === 'round_robin' 
                    ? 'Todos os confrontos da liga foram finalizados.' 
                    : 'Todos os vencedores foram determinados. Avance para a próxima fase.'}
                </p>
              </div>
              <button 
                onClick={generateNextRound}
                className="px-6 py-3 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all text-xs"
              >
                {tournament.type === 'round_robin' ? 'Finalizar Arena' : 'Gerar Próxima Rodada'}
              </button>
            </motion.div>
          )}

          {/* Group by rounds */}
          {uniqueRounds.map(round => {
            const roundMatches = matches.filter(m => m.round === round);
            if (roundMatches.length === 0) return null;

            // Group by bracket if double elimination
            const brackets = tournament.type === 'double_elimination' 
              ? ['winners', 'losers', 'grand_final']
              : ['winners', 'points'];

            return (
              <div key={round} className="space-y-10">
                {brackets.map(bracketType => {
                  const bracketMatches = roundMatches.filter(m => m.bracket === bracketType);
                  if (bracketMatches.length === 0) return null;

                  return (
                    <div key={bracketType} className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand flex items-center gap-4">
                        {bracketType === 'grand_final' ? 'A GRANDE FINAL' : getRoundName(round, bracketMatches.length, bracketType)}
                        <div className="h-px bg-brand/20 flex-grow" />
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bracketMatches.map(m => (
                          <MatchCard 
                            key={m.id} 
                            match={m} 
                            p1Name={getPlayerName(m.player1Id)} 
                            p2Name={getPlayerName(m.player2Id)} 
                            isOwner={isOwner}
                            onUpdateScore={updateScore}
                            onSetWinner={setWinner}
                            onShowProfile={onShowProfile}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
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
  onSetWinner,
  onShowProfile
}: { 
  key?: string,
  match: Match, 
  p1Name: string, 
  p2Name: string, 
  isOwner: boolean,
  onUpdateScore: any,
  onSetWinner: any,
  onShowProfile: (id: string) => void
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
             <span 
               onClick={() => match.player1Id && onShowProfile(match.player1Id)}
               className={`text-2xl font-black uppercase tracking-tight italic ${match.player1Id ? 'cursor-pointer hover:text-brand transition-colors' : ''}`}
             >
               {p1Name}
             </span>
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
             <span 
               onClick={() => match.player2Id && onShowProfile(match.player2Id)}
               className={`text-2xl font-black uppercase tracking-tight italic ${match.player2Id ? 'cursor-pointer hover:text-brand transition-colors' : ''}`}
             >
               {p2Name}
             </span>
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
function Login() {
  const { user, needsRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(localStorage.getItem('n8_last_email') || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (email) {
      localStorage.setItem('n8_last_email', email);
    }
  }, [email]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogout = () => {
    setError(null);
    // Keep email for convenience when logging back in
    setPassword("");
    setName("");
    signOut(auth);
  };

  const passwordRequirements = {
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    minLength: password.length >= 6
  };

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, insira seu e-mail para recuperar a senha.");
      return;
    }
    setLoading(true);
    setResetEmailSent(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError(null);
    } catch (err: any) {
      console.error("Reset Error:", err);
      setError("Erro ao enviar e-mail de recuperação. Verifique o endereço.");
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymously = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error("Anonymous Login Error:", err);
      let message = "Ative o login 'Anónimo' no Console do Firebase (Authentication > Sign-in Method) para usar esta função.";
      if (err.code === 'auth/admin-restricted-operation') {
        message = "O login Anônimo está restrito aos administradores ou não está ativado no Console do Firebase (Authentication > Sign-in Method).";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (isSignUp && (!passwordRequirements.hasLetter || !passwordRequirements.hasNumber || !passwordRequirements.minLength)) {
      setError("A senha não cumpre todos os requisitos necessários.");
      return;
    }

    setLoading(true);
    setError(null);
    console.log("Starting Auth Process for:", email, isSignUp ? "(Sign Up)" : "(Sign In)");
    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Por favor, insira seu nome completo.');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          await updateProfile(userCredential.user, { displayName: name });
          await sendEmailVerification(userCredential.user);
          // Don't setIsSignUp(false) here, let onAuthStateChanged handle the app state.
          // App will show VerifyEmail if not verified, or Login (needsRole) if verified but no profile.
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user && !userCredential.user.emailVerified) {
          setError("Seu e-mail ainda não foi verificado. Verifique sua caixa de entrada.");
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let errorMessage = "";
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este e-mail já está em uso. Se você já tem uma conta, tente fazer login ou recuperar sua senha.';
          setIsSignUp(false); // Auto-switch to login mode if email exists
          break;
        case 'auth/invalid-email':
          errorMessage = 'E-mail inválido. Por favor, verifique o formato.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Senha muito fraca. Ela deve ter pelo menos 6 caracteres.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'O método de login por E-mail/Senha não está ativado no Console do Firebase (Authentication > Sign-in Method).';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'E-mail ou senha incorretos.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas malsucedidas. O acesso a esta conta foi temporariamente desativado. Tente novamente mais tarde.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta conta foi desativada por um administrador.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão de rede. Verifique sua internet ou se há algum bloqueador (AdBlock) impedindo o Firebase. Se o erro persistir, aguarde alguns minutos.';
          break;
        case 'auth/error-code:-26':
          errorMessage = 'Erro de configuração no Firebase (Código -26). Por favor, verifique se o domínio atual está adicionado em "Domínios Autorizados" no Console do Firebase (Authentication > Settings).';
          break;
        default:
          errorMessage = err.message || "Ocorreu um erro inesperado na autenticação.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [age, setAge] = useState('');
  const [playStyle, setPlayStyle] = useState('');
  const [bio, setBio] = useState('');

  const registerUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRole) return;
    setLoading(true);
    setError(null);
    try {
      const finalDisplayName = name || user.displayName || user.email?.split('@')[0] || 'Jogador N8';
      await setDoc(doc(db, 'users', user.uid), {
        displayName: finalDisplayName,
        email: user.email,
        photoURL: user.photoURL,
        role: selectedRole,
        age: parseInt(age) || 0,
        playStyle: playStyle,
        bio: bio,
        createdAt: serverTimestamp()
      });
      // The onSnapshot in useAuth will detect this new document and update the state automatically.
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      setError("Erro ao registrar perfil. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (user && needsRole) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand/5 blur-[120px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-2xl w-full relative z-10 border-white/5 bg-zinc-900/60 backdrop-blur-3xl rounded-[3rem]"
        >
          {!selectedRole ? (
            <div className="text-center">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Bem-vindo, <span className="text-brand">{user.displayName?.split(' ')[0]}</span></h2>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-12">Escolha seu destino na arena</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.button 
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole('owner')}
                  className="group p-10 bg-white/5 border border-white/10 rounded-3xl hover:border-brand transition-all text-left flex flex-col gap-6"
                >
                  <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Crown className="text-brand w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 group-hover:text-brand">Dono da Mesa</h3>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide leading-relaxed">
                      Gerencie campeonatos, controle mesas e lidere a comunidade.
                    </p>
                  </div>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole('player')}
                  className="group p-10 bg-white/5 border border-white/10 rounded-3xl hover:border-emerald-500 transition-all text-left flex flex-col gap-6"
                >
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="text-emerald-500 w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 group-hover:text-emerald-500">Jogador</h3>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide leading-relaxed">
                      Participe de torneios, suba no ranking e prove seu valor.
                    </p>
                  </div>
                </motion.button>
              </div>
            </div>
          ) : (
            <form onSubmit={registerUser} className="space-y-8">
              <div className="text-center">
                <button onClick={() => setSelectedRole(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white mb-6 flex items-center gap-2 mx-auto">
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Finalizar <span className="text-brand">Perfil</span></h2>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Modo: {selectedRole === 'owner' ? 'Dono da Mesa' : 'Jogador'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Idade</label>
                  <input 
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Ex: 25"
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm focus:outline-none focus:border-brand/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Estilo de Jogo</label>
                  <select 
                    required
                    value={playStyle}
                    onChange={(e) => setPlayStyle(e.target.value)}
                    className="w-full h-14 bg-zinc-900 border border-white/10 rounded-2xl px-6 text-white text-sm focus:outline-none focus:border-brand/40 appearance-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="technical">Técnico / Precisão</option>
                    <option value="aggressive">Agressivo / Efeito</option>
                    <option value="strategic">Estratégico / Defesa</option>
                    <option value="casual">Casual / Diversão</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Bio / Descrição</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre sua experiência..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-brand/40 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-brand text-zinc-950 font-black uppercase tracking-[0.2em] italic rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand/20 disabled:opacity-50"
              >
                {loading ? 'Sincronizando...' : 'Concluir Registro'}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-8 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
          )}

          <button 
            onClick={handleLogout}
            className="mt-10 w-full text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 hover:text-white transition-colors"
          >
            Sair da conta
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand/5 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-12 max-w-sm w-full relative z-10 border-white/5 bg-zinc-900/40 backdrop-blur-3xl rounded-[3rem]"
      >
        <div className="flex justify-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand/20 rotate-12"
          >
            <Gamepad2 className="w-10 h-10 text-brand -rotate-12" />
          </motion.div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-1">NUMBER <span className="text-brand">8</span></h1>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] italic">Pro Billiards System</p>
        </div>

        <div className="flex gap-2 mb-8 bg-zinc-950/50 p-1.5 rounded-2xl border border-white/5">
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setShowForgotPassword(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isSignUp && !showForgotPassword ? 'bg-white/10 text-white shadow-2xl border border-white/10' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Entrar
          </button>
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setShowForgotPassword(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isSignUp ? 'bg-white/10 text-white shadow-2xl border border-white/10' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Criar Conta
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        {resetEmailSent && (
          <div className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-widest text-center">
            E-mail de recuperação enviado! Verifique sua caixa de entrada.
          </div>
        )}

        <form onSubmit={showForgotPassword ? handlePasswordReset : handleEmailAuth} className="space-y-4 mb-6">
          {isSignUp && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-1"
            >
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Nome Completo</label>
              <input 
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu Nome"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm focus:outline-none focus:border-brand/40"
              />
            </motion.div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">E-mail</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm focus:outline-none focus:border-brand/40"
            />
          </div>
          
          {!showForgotPassword && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 pr-14 text-white text-sm focus:outline-none focus:border-brand/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Requirements - Only show on Sign Up */}
              {isSignUp && (
                <div className="px-4 py-2 space-y-1.5 bg-zinc-950/30 rounded-2xl mt-2">
                  {[
                    { label: "Pelo menos uma letra", met: passwordRequirements.hasLetter },
                    { label: "Pelo menos 1 número", met: passwordRequirements.hasNumber },
                    { label: "Pelo menos 6 caracteres", met: passwordRequirements.minLength }
                  ].map((req, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[9px] font-bold uppercase transition-colors ${req.met ? 'text-green-500' : 'text-red-500'}`}>
                      {req.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-brand text-zinc-950 font-black uppercase tracking-[0.2em] italic rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-brand/20 disabled:opacity-50"
          >
            {loading ? 'Processando...' : (showForgotPassword ? 'Recuperar Senha' : (isSignUp ? 'Criar Conta' : 'Entrar'))}
          </motion.button>
        </form>

        {!isSignUp && !showForgotPassword && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 italic">Ou acesso rápido</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={loginAnonymously}
              disabled={loading}
              className="w-full h-14 bg-white/5 border border-white/10 text-white font-black uppercase italic tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-[10px]"
            >
              <Users className="w-4 h-4 text-brand" />
              Entrar como Anónimo
            </motion.button>
          </div>
        )}

        <div className="text-center mt-8 mb-6 space-y-4">
          {!isSignUp && (
            <button 
              onClick={() => {
                setShowForgotPassword(!showForgotPassword);
                setError(null);
                setResetEmailSent(false);
              }}
              className="block w-full text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors"
            >
              {showForgotPassword ? 'Voltar para o Login' : 'Esqueci minha senha'}
            </button>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 text-center">
          Acesso via Protocolo Seguro
        </div>
      </motion.div>
    </div>
  );
}

function PlayerProfileModal({ userId, onClose }: { userId: string | null, onClose: () => void }) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileMatches, setProfileMatches] = useState<FriendlyMatch[]>([]);
  const [profileTournaments, setProfileTournaments] = useState<Tournament[]>([]);
  
  // Edit State
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPlayStyle, setEditPlayStyle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocationName, setEditLocationName] = useState('');
  const [editLocationAddress, setEditLocationAddress] = useState('');

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsEditing(false);
      return;
    }

    const fetchProfileData = async () => {
      setLoading(true);
      const path = `users/${userId}`;
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          setEditName(data.displayName || '');
          setEditAge(data.age?.toString() || '');
          setEditPlayStyle(data.playStyle || 'casual');
          setEditBio(data.bio || '');
          setEditLocationName(data.locationName || '');
          setEditLocationAddress(data.locationAddress || '');

          // Fetch matches for this specific profile
          const q = query(
            collection(db, 'friendlyMatches'), 
            where('status', '==', 'finished'),
            orderBy('createdAt', 'desc'),
            limit(15)
          );
          const matchSnap = await getDocs(q);
          const allMatches = matchSnap.docs.map(d => ({ id: d.id, ...d.data() } as FriendlyMatch));
          // Filter participants manually since Firestore OR across two fields is tricky here
          setProfileMatches(allMatches.filter(m => m.player1Id === userId || m.player2Id === userId));

          // Fetch all tournaments where the user participated
          const qParticipations = query(
            collection(db, 'users', userId, 'participations'),
            orderBy('joinedAt', 'desc'),
            limit(20)
          );
          
          try {
            const partSnap = await getDocs(qParticipations);
            const partDocs = partSnap.docs.map(doc => doc.data());
            
            if (partDocs.length > 0) {
              const tIds = partDocs.map(p => p.tournamentId);
              const fullTournaments: Tournament[] = [];
              for (const tId of tIds) {
                const tDoc = await getDoc(doc(db, 'tournaments', tId));
                if (tDoc.exists()) {
                  fullTournaments.push({ id: tDoc.id, ...tDoc.data() } as Tournament);
                }
              }
              setProfileTournaments(fullTournaments);
            } else {
              // Fallback
              const qWon = query(
                collection(db, 'tournaments'),
                where('winnerId', '==', userId)
              );
              const wonSnap = await getDocs(qWon);
              setProfileTournaments(wonSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)));
            }
          } catch (err) {
            console.error("Error fetching participations:", err);
            const qWon = query(
              collection(db, 'tournaments'),
              where('winnerId', '==', userId)
            );
            const wonSnap = await getDocs(qWon);
            setProfileTournaments(wonSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)));
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  const wins = profileMatches.filter(m => m.winnerId === userId).length;
  const total = profileMatches.length;

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !currentUser) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        displayName: editName,
        age: parseInt(editAge) || null,
        playStyle: editPlayStyle,
        bio: editBio,
        locationName: profile.role === 'owner' ? editLocationName : null,
        locationAddress: profile.role === 'owner' ? editLocationAddress : null,
        updatedAt: serverTimestamp()
      });
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      setProfile(userDoc.data());
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  const isOwnProfile = currentUser?.uid === userId;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="glass-card w-full max-w-lg overflow-hidden relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          {loading && !isEditing ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <div>
              <div className="h-32 bg-brand/10 relative">
                <div className="absolute -bottom-12 left-8 p-1 bg-zinc-900 rounded-2xl border border-white/5 shadow-2xl">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} className="w-24 h-24 rounded-xl object-cover" alt="" />
                  ) : (
                   <div className="w-24 h-24 rounded-xl bg-zinc-800 flex items-center justify-center">
                     <UserIcon className="w-10 h-10 text-slate-600" />
                   </div>
                  )}
                </div>
                {isOwnProfile && !isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="absolute bottom-4 right-8 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white border border-white/10 transition-all font-sans"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>

              <div className="pt-16 pb-12 px-8">
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Nome de Exibição</label>
                       <input 
                         required
                         value={editName}
                         onChange={e => setEditName(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand transition-colors text-white"
                       />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Idade</label>
                        <input 
                          type="number"
                          value={editAge}
                          onChange={e => setEditAge(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand transition-colors text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Estilo</label>
                        <select 
                          value={editPlayStyle}
                          onChange={e => setEditPlayStyle(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand transition-colors text-white appearance-none"
                        >
                          <option value="technical">Técnico</option>
                          <option value="aggressive">Agressivo</option>
                          <option value="strategic">Estratégico</option>
                          <option value="casual">Casual</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Bio / Trajetória</label>
                       <textarea 
                         value={editBio}
                         onChange={e => setEditBio(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand transition-colors text-white min-h-[100px] resize-none"
                         placeholder="Conte sua história na mesa..."
                       />
                    </div>

                    {profile.role === 'owner' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-brand" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Localização da Mesa</span>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Nome da Banca / Local</label>
                           <input 
                             value={editLocationName}
                             onChange={e => setEditLocationName(e.target.value)}
                             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand transition-colors text-white"
                             placeholder="Ex: Banca do Sr. João, Ponto de Encontro N8"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Endereço / Ponto de Referência</label>
                           <textarea 
                             value={editLocationAddress}
                             onChange={e => setEditLocationAddress(e.target.value)}
                             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand transition-colors text-white min-h-[80px] resize-none"
                             placeholder="Ex: Av. Principal, próximo à padaria Central..."
                           />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-4 bg-brand text-bg-dark font-black uppercase tracking-widest text-[10px] italic rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand/10"
                      >
                        {loading ? 'Salvando...' : 'Gravar Alterações'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-4 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[10px] italic rounded-xl hover:bg-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-1">{profile.displayName}</h2>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand px-2 py-0.5 bg-brand/10 rounded-sm border border-brand/20">
                          {profile.role === 'owner' ? 'Dono da Mesa' : 'Campeão'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                          ID: #{userId.substring(0, 6).toUpperCase()}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {profile.createdAt?.toDate ? `Entrou em ${profile.createdAt.toDate().toLocaleDateString()}` : 'Acesso Recente'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="glass-card p-4 bg-white/5">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-1">Estilo</span>
                        <span className="text-sm font-bold uppercase italic text-white">{profile.playStyle || 'Não definido'}</span>
                      </div>
                      <div className="glass-card p-4 bg-white/5">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-1">Idade</span>
                        <span className="text-sm font-bold uppercase italic text-white">{profile.age ? `${profile.age} Anos` : 'N/A'}</span>
                      </div>
                    </div>

                    {profile.bio && (
                      <div className="mb-8">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3">Trajectória</span>
                        <p className="text-slate-400 text-sm leading-relaxed italic">{profile.bio}</p>
                      </div>
                    )}

                    {profile.role === 'owner' && (profile.locationName || profile.locationAddress) && (
                      <div className="p-6 bg-brand/5 border border-brand/10 rounded-2xl mb-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-brand" />
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand block">Onde me encontrar</span>
                            <span className="text-xs font-black uppercase italic text-white">{profile.locationName || 'Minha Banca'}</span>
                          </div>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed italic border-l-2 border-brand/30 pl-4">
                          {profile.locationAddress || 'Localização não especificada.'}
                        </p>
                      </div>
                    )}

                    {profileTournaments.length > 0 && (
                      <div className="mb-10">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="w-10 h-px bg-brand/30" />
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand italic">Hall of Fame</span>
                           <div className="w-10 h-px bg-brand/30" />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {profileTournaments.map(t => (
                            <div key={t.id} className="p-4 bg-brand/5 border border-brand/20 rounded-2xl flex items-center gap-4 group">
                              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                                <Trophy className="w-5 h-5 text-bg-dark stroke-[3px]" />
                              </div>
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand mb-0.5">Campeão</div>
                                <div className="text-sm font-black italic uppercase text-white">{t.name}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Histórico de Combates</span>
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="text-[10px] font-black text-brand">{wins}</div>
                            <div className="text-[7px] font-black text-slate-600 uppercase">Vitórias</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-black text-white">{total - wins}</div>
                            <div className="text-[7px] font-black text-slate-600 uppercase">Derrotas</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {profileMatches.map(m => {
                          const isWinner = m.winnerId === userId;
                          const opponent = m.player1Id === userId ? m.player2Name : m.player1Name;
                          const score = m.player1Id === userId ? `${m.score1}-${m.score2}` : `${m.score2}-${m.score1}`;
                          
                          return (
                            <div key={m.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${isWinner ? 'bg-brand shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-lg shadow-red-500/20'}`}></div>
                                <div className="text-[9px] font-black uppercase tracking-wider text-slate-300">
                                  vs <span className="text-white italic">{opponent}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-mono text-xs font-black text-white tracking-widest">{score}</span>
                                <Sword className="w-3 h-3 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          );
                        })}
                        {profileMatches.length === 0 && (
                          <div className="p-8 border border-dashed border-white/10 rounded-xl text-center">
                            <p className="text-[9px] font-black uppercase text-slate-700 tracking-widest leading-relaxed">Nenhuma partida finalizada no histórico deste jogador</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isOwnProfile && currentUser && (
                      <div className="mt-10">
                        <button 
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const matchRef = await addDoc(collection(db, 'friendlyMatches'), {
                                player1Id: currentUser.uid,
                                player1Name: currentUser.displayName || 'Jogador N8',
                                player2Id: userId,
                                player2Name: profile.displayName,
                                score1: 0,
                                score2: 0,
                                winnerId: null,
                                status: 'requested',
                                createdBy: currentUser.uid,
                                createdAt: serverTimestamp()
                              });

                              await addDoc(collection(db, 'users', userId, 'notifications'), {
                                userId: userId,
                                title: 'Novo Desafio!',
                                message: `${currentUser.displayName} te desafiou para um amistoso.`,
                                type: 'match_start',
                                read: false,
                                createdAt: serverTimestamp(),
                                link: `/friendly`
                              });

                              onClose();
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className="w-full py-4 bg-brand text-bg-dark font-black uppercase tracking-widest text-[10px] italic rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand/10 flex items-center justify-center gap-3"
                        >
                          <Sword className="w-4 h-4" />
                          {loading ? 'Enviando...' : 'Desafiar para Duelo'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-slate-500 font-bold uppercase tracking-widest">Perfil não encontrado</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FriendlyMatchManager({ onShowProfile }: { onShowProfile: (id: string) => void }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<FriendlyMatch[]>([]);
  const [globalMatches, setGlobalMatches] = useState<FriendlyMatch[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'feed' | 'history' | 'duels' | 'search' | 'new'>('feed');
  
  const [player2Id, setPlayer2Id] = useState('');
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Global feed of all finished matches
    const qFeed = query(
      collection(db, 'friendlyMatches'), 
      where('status', '==', 'finished'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribeFeed = onSnapshot(qFeed, (snapshot) => {
      setGlobalMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendlyMatch)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendlyMatches (feed)');
    });

    // User's personal history/duels
    const qMy = query(collection(db, 'friendlyMatches'), orderBy('createdAt', 'desc'));
    const unsubscribeMy = onSnapshot(qMy, (snapshot) => {
      setMatches(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as FriendlyMatch))
        .filter(m => m.player1Id === user?.uid || m.player2Id === user?.uid)
      );
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendlyMatches (my)');
    });

    const fetchPlayers = async () => {
      try {
        const qUsers = query(collection(db, 'users'), limit(100));
        const snapshot = await getDocs(qUsers);
        setAvailablePlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.id !== user?.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    };

    fetchPlayers();
    return () => {
      unsubscribeFeed();
      unsubscribeMy();
    };
  }, [user]);

  const filteredPlayers = availablePlayers.filter(p => 
    p.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateMatchStatus = async (matchId: string, status: 'accepted' | 'declined' | 'finished', scores?: { s1: number, s2: number }) => {
    if (!user) return;
    setLoading(true);
    try {
      const updateData: any = { status };
      if (scores) {
        updateData.score1 = scores.s1;
        updateData.score2 = scores.s2;
        updateData.winnerId = scores.s1 > scores.s2 ? matches.find(m => m.id === matchId)?.player1Id : 
                              scores.s2 > scores.s1 ? matches.find(m => m.id === matchId)?.player2Id : null;
      }
      await updateDoc(doc(db, 'friendlyMatches', matchId), updateData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createMatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !player2Id) return;

    setLoading(true);
    try {
      const p2 = availablePlayers.find(p => p.id === player2Id);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      await addDoc(collection(db, 'friendlyMatches'), {
        player1Id: user.uid,
        player1Name: user.displayName,
        player2Id: player2Id,
        player2Name: p2?.displayName || 'Jogador Oculto',
        score1,
        score2,
        winnerId: score1 > score2 ? user.uid : score1 < score2 ? player2Id : null,
        status: 'finished',
        locationName: userData?.locationName || null,
        locationAddress: userData?.locationAddress || null,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setActiveTab('history');
      setPlayer2Id('');
      setScore1(0);
      setScore2(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'friendlyMatches');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-brand text-[10px] font-black uppercase tracking-[0.4em]">Partidas de Rua</span>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter mt-2 text-white">Amistosos</h1>
        </div>
        
        <div className="flex p-1 bg-zinc-900 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'feed' ? 'bg-zinc-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Mundo
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Histórico
          </button>
          <button 
            onClick={() => setActiveTab('duels')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'duels' ? 'bg-zinc-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Duelos
          </button>
          <button 
            onClick={() => setActiveTab('search')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'search' ? 'bg-zinc-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Search className="w-3 h-3" />
            Procurar
          </button>
          <button 
            onClick={() => setActiveTab('new')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'new' ? 'bg-zinc-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Registrar
          </button>
        </div>
      </div>

      {user && (
        <div className="mb-8 p-6 bg-brand/5 border border-brand/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-brand" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seu Perfil de Atleta</p>
              <p className="text-xl font-black text-white italic uppercase tracking-tighter">{user.displayName || 'Jogador'}</p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Seu ID para buscas</p>
            <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-white/5 font-mono font-black text-brand tracking-[0.2em] shadow-inner">
              #{user.uid.substring(0, 10).toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'feed' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {globalMatches.map(m => (
            <div key={m.id} className="glass-card p-6 bg-zinc-900 border-white/5 group">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-brand">Live Result</span>
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-700">
                  {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'Agora'}
                </span>
              </div>

              <div className="flex items-center justify-between mb-8">
                <div className="text-center flex-1">
                  <div className="text-[10px] font-black text-white uppercase italic truncate mb-2">{m.player1Name}</div>
                  <div className={`text-4xl font-black italic ${m.winnerId === m.player1Id ? 'text-brand' : 'text-slate-800'}`}>
                    {m.score1}
                  </div>
                </div>
                <div className="px-4 text-[10px] font-black text-slate-800 italic">VS</div>
                <div className="text-center flex-1">
                  <div className="text-[10px] font-black text-white uppercase italic truncate mb-2">{m.player2Name}</div>
                  <div className={`text-4xl font-black italic ${m.winnerId === m.player2Id ? 'text-brand' : 'text-slate-800'}`}>
                    {m.score2}
                  </div>
                </div>
              </div>

              {m.locationName && (
                <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2">
                  <MapPin className="w-3 h-3 text-brand" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">
                    Logado em: <span className="text-slate-300">{m.locationName}</span>
                  </span>
                </div>
              )}
            </div>
          ))}
          {globalMatches.length === 0 && (
            <div className="col-span-full py-20 text-center glass-card border-dashed">
              <Sword className="w-12 h-12 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nenhuma atividade global detectada ainda</p>
            </div>
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.filter(m => m.status === 'finished').map(m => (
            <div key={m.id} className="glass-card p-6 bg-zinc-900 relative overflow-hidden group border-white/5">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Match Record</span>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-700">
                  {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'Recent'}
                </span>
              </div>

              <div className="space-y-4">
                <div className={`flex items-center justify-between ${m.winnerId === m.player1Id ? 'text-white' : 'text-slate-500'}`}>
                  <span 
                    onClick={() => onShowProfile(m.player1Id)}
                    className="font-black italic uppercase text-lg tracking-tight truncate cursor-pointer hover:text-brand"
                  >
                    {m.player1Name}
                  </span>
                  <span className="text-2xl font-black">{m.score1}</span>
                </div>
                
                <div className="flex items-center gap-4">
                   <div className="h-px bg-white/5 flex-grow" />
                   <div className="text-[8px] font-black text-slate-800 italic uppercase">Vs</div>
                   <div className="h-px bg-white/5 flex-grow" />
                </div>

                <div className={`flex items-center justify-between ${m.winnerId === m.player2Id ? 'text-white' : 'text-slate-500'}`}>
                  <span 
                    onClick={() => onShowProfile(m.player2Id)}
                    className="font-black italic uppercase text-lg tracking-tight truncate cursor-pointer hover:text-brand"
                  >
                    {m.player2Name}
                  </span>
                  <span className="text-2xl font-black">{m.score2}</span>
                </div>
              </div>
            </div>
          ))}
          {matches.filter(m => m.status === 'finished').length === 0 && (
            <div className="col-span-full py-20 text-center glass-card border-dashed">
              <Sword className="w-12 h-12 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nenhum amistoso registrado recentemente</p>
            </div>
          )}
        </div>
      ) : activeTab === 'duels' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.filter(m => ['requested', 'accepted'].includes(m.status)).map(m => {
            const isTarget = user?.uid === m.player2Id;
            const isAsker = user?.uid === m.player1Id;

            return (
              <div key={m.id} className="glass-card p-6 bg-zinc-900 border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${m.status === 'requested' ? 'text-brand' : 'text-green-500'}`}>
                      {m.status === 'requested' ? 'Desafio Pendente' : 'Desafio Aceito'}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-700">
                      {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'Enviado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-6 py-4">
                    <div className="text-center">
                      <div className="font-black italic uppercase text-xs text-white mb-2 truncate max-w-[80px]">{m.player1Name}</div>
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mx-auto"><Sword className="w-4 h-4 text-slate-600" /></div>
                    </div>
                    <div className="text-[10px] font-black text-slate-800 italic">VS</div>
                    <div className="text-center">
                      <div className="font-black italic uppercase text-xs text-white mb-2 truncate max-w-[80px]">{m.player2Name}</div>
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mx-auto"><Sword className="w-4 h-4 text-slate-600" /></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {m.status === 'requested' && isTarget && (
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                         onClick={() => updateMatchStatus(m.id, 'accepted')}
                         disabled={loading}
                         className="h-10 bg-brand text-bg-dark font-black uppercase tracking-widest text-[8px] italic rounded-lg hover:bg-brand/80"
                       >
                         Aceitar
                       </button>
                       <button 
                         onClick={() => updateMatchStatus(m.id, 'declined')}
                         disabled={loading}
                         className="h-10 bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-[8px] italic rounded-lg hover:bg-red-500/20"
                       >
                         Recusar
                       </button>
                    </div>
                  )}

                  {m.status === 'accepted' && (isTarget || isAsker) && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            id={`score1-${m.id}`}
                            defaultValue={0} 
                            className="w-12 h-10 bg-zinc-950 border border-white/10 rounded-lg text-center font-black text-white"
                          />
                          <span className="text-[10px] font-black text-slate-600">-</span>
                          <input 
                            type="number" 
                            id={`score2-${m.id}`}
                            defaultValue={0} 
                            className="w-12 h-10 bg-zinc-950 border border-white/10 rounded-lg text-center font-black text-white"
                          />
                        </div>
                        <button 
                          disabled={loading}
                          onClick={() => {
                            const s1 = parseInt((document.getElementById(`score1-${m.id}`) as HTMLInputElement).value);
                            const s2 = parseInt((document.getElementById(`score2-${m.id}`) as HTMLInputElement).value);
                            updateMatchStatus(m.id, 'finished', { s1, s2 });
                          }}
                          className="h-10 px-4 bg-white/10 text-brand font-black uppercase tracking-widest text-[8px] italic rounded-lg hover:bg-white/20"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  )}

                  {m.status === 'requested' && isAsker && (
                    <div className="h-10 bg-zinc-950 text-slate-600 border border-white/5 font-black uppercase tracking-widest text-[8px] italic rounded-lg flex items-center justify-center">
                      Aguardando Resposta...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {matches.filter(m => ['requested', 'accepted'].includes(m.status)).length === 0 && (
            <div className="col-span-full py-20 text-center glass-card border-dashed">
              <Sword className="w-12 h-12 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nenhum duelo pendente no momento</p>
            </div>
          )}
        </div>
      ) : activeTab === 'search' ? (
        <div className="space-y-8">
          <div className="max-w-md mx-auto">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand group-focus-within:text-white transition-colors" />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="PROCURAR POR NOME OU ID..."
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 text-xs font-black uppercase tracking-widest text-white focus:border-brand focus:bg-white/[0.08] focus:outline-none transition-all placeholder:text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPlayers.map(p => (
              <div 
                key={p.id}
                onClick={() => onShowProfile(p.id)}
                className="glass-card p-4 bg-zinc-900 border-white/5 hover:border-brand/30 cursor-pointer transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-slate-600 group-hover:text-brand transition-colors" />
                </div>
                <div className="min-w-0">
                  <div className="font-black italic uppercase text-xs text-white truncate">{p.displayName || 'Anonimo'}</div>
                  <div className="text-[8px] font-black text-slate-600 tracking-widest font-mono">ID: #{p.id.substring(0, 6).toUpperCase()}</div>
                </div>
              </div>
            ))}
            {filteredPlayers.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Nenhum jogador encontrado com "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto">
          <form onSubmit={createMatch} className="glass-card p-10 space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Desafiante</label>
              <div className="h-16 bg-white/5 border border-white/10 rounded-2xl px-6 flex items-center text-slate-400 font-bold italic text-sm">
                {user?.displayName}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Oponente</label>
              <select 
                required
                value={player2Id}
                onChange={(e) => setPlayer2Id(e.target.value)}
                className="w-full h-16 bg-zinc-900 border border-white/10 rounded-2xl px-6 text-white text-sm focus:outline-none focus:border-brand/40 appearance-none"
              >
                <option value="">Selecione um oponente...</option>
                {availablePlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4 text-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seu Placar</label>
                <div className="flex items-center justify-center gap-6">
                  <button type="button" onClick={() => setScore1(Math.max(0, score1 - 1))} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10">-</button>
                  <span className="text-4xl font-black italic">{score1}</span>
                  <button type="button" onClick={() => setScore1(score1 + 1)} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10">+</button>
                </div>
              </div>
              <div className="space-y-4 text-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Placar Oponente</label>
                <div className="flex items-center justify-center gap-6">
                  <button type="button" onClick={() => setScore2(Math.max(0, score2 - 1))} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10">-</button>
                  <span className="text-4xl font-black italic">{score2}</span>
                  <button type="button" onClick={() => setScore2(score2 + 1)} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10">+</button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !player2Id}
              className="w-full h-16 bg-brand text-zinc-950 font-black uppercase tracking-[0.2em] italic rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Registrar Resultado'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserNotification));
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);

      // System notification for non-read items added in last 5 seconds
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newNotif = change.doc.data() as UserNotification;
          if (Notification.permission === "granted" && !newNotif.read) {
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: 'https://ais-dev-dmmpotrnzc22nc4mm2p3s7-291299211841.europe-west3.run.app/favicon.ico'
            });
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notifications`);
    });

    return unsubscribe;
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    // For simplicity, we just mark all as read or would delete. Let's mark as read.
    for (const n of notifications) {
      if (!n.read) markAsRead(n.id);
    }
  };

  const requestPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  return { notifications, unreadCount, markAsRead, clearAll, requestPermission };
}

function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsRole, setNeedsRole] = useState(false);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (u) {
        // If it's an anonymous user, we can resolve loading faster or default their data
        if (u.isAnonymous) {
          setUser({
            ...u,
            displayName: u.displayName || 'Convidado',
            role: 'player', // Default role for anonymous
            isAnonymous: true
          } as AppUser);
          setLoading(false);
          setNeedsRole(false);
          return;
        }

        setLoading(true);
        unsubscribeDoc = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({ ...u, ...data } as AppUser);
            setNeedsRole(false);
          } else {
            setUser(u as AppUser);
            setNeedsRole(true);
          }
          setLoading(false);
        }, (error) => {
          if (!error.message.includes('offline')) {
            console.error("Firestore error:", error);
          }
          setUser(u as AppUser);
          setLoading(false);
        });
      } else {
        setUser(null);
        setNeedsRole(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const logout = () => signOut(auth);

  return { user, logout, loading, needsRole };
}

// --- Main App ---
export default function App() {
  const { user, logout, loading, needsRole } = useAuth();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand/5 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-brand/10 border border-brand/20 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand/20 mb-8 relative">
           <div className="absolute inset-0 rounded-[2.5rem] border-2 border-brand/40 border-t-transparent animate-spin" />
           <Trophy className="w-12 h-12 text-brand" />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">N8 <span className="text-brand">Arena</span></h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 animate-pulse italic">Iniciando Protocolos...</p>
        </div>
      </motion.div>
    </div>
  );

  if (!user || needsRole) return <Login />;
  
  if (user && !user.isAnonymous && !user.emailVerified && !localStorage.getItem('n8_verify_bypass')) {
    return <VerifyEmail user={user} onLogout={logout} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 selection:bg-brand selection:text-black relative overflow-hidden">
        <Navbar onShowProfile={setSelectedProfileId} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<TournamentManager />} />
            <Route path="/tournaments/new" element={<CreateTournament />} />
            <Route path="/tournaments/:id" element={<TournamentDetails onShowProfile={setSelectedProfileId} />} />
            <Route path="/friendly" element={<FriendlyMatchManager onShowProfile={setSelectedProfileId} />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/rules" element={<BilliardsRules />} />
          </Routes>
        </main>

        <PlayerProfileModal 
          userId={selectedProfileId} 
          onClose={() => setSelectedProfileId(null)} 
        />
        
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
