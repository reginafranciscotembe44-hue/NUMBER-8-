import { useState, useEffect, FormEvent } from 'react';
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
  LogIn,
  Table as TableIcon,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
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

// --- Types ---
interface Tournament {
  id: string;
  name: string;
  type: 'single_elimination' | 'double_elimination' | 'round_robin';
  status: 'draft' | 'active' | 'finished';
  winnerId?: string;
  winnerName?: string;
  createdAt: any;
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
}

// --- Components ---

function Navbar({ user }: { user: User | null }) {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
             <div className="absolute inset-0 bg-brand blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <Trophy className="w-6 h-6 text-brand relative z-10" />
          </div>
          <span className="font-display font-black text-3xl tracking-tighter italic uppercase text-white">
            NUMBER <span className="text-brand">8</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-6">
              <Link to="/tournaments" className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-brand transition-colors">
                Painel de Controle
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-[10px] uppercase tracking-widest font-bold text-white hover:bg-slate-700 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Sair
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-6 py-2.5 bg-brand text-bg-dark text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-brand/90 transition-colors"
            >
              Iniciar Sessão
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <div className="flex flex-col items-center relative">
      <div className="absolute inset-0 immersive-bg pointer-events-none" />
      
      {/* Hero Section */}
      <section className="w-full py-32 px-4 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-6 justify-center">
            <span className="neon-dot"></span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-brand">Sistema Online // v2.0</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-8 max-w-5xl leading-[0.9] text-white uppercase italic tracking-tighter">
            CAMPEONATOS <br />
            <span className="text-brand underline decoration-4 underline-offset-8">PROFISSIONAIS</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-medium tracking-tight">
            Gestão de elite para o seu salão de bilhar. Tabelas, resultados ao vivo e estatísticas em um painel imersivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
            <Link 
              to="/tournaments/new" 
              className="px-10 py-5 bg-brand text-bg-dark font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-sm neon-border"
            >
              <Plus className="w-5 h-5 stroke-[3px]" />
              Criar Torneio
            </Link>
            <Link 
              to="/tournaments" 
              className="px-10 py-5 bg-slate-900 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all text-sm"
            >
              <LayoutDashboard className="w-5 h-5" />
              Painel ao Vivo
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
            { label: 'Premiação', val: '$12.5k' },
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
  const { user } = useAuth();

  const activeTournaments = tournaments.filter(t => t.status !== 'finished');
  const pastTournaments = tournaments.filter(t => t.status === 'finished');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tournaments'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tournaments');
    });

    return unsubscribe;
  }, [user]);

  if (!user) return (
    <div className="p-24 text-center">
      <h2 className="text-2xl font-bold mb-4">Por favor, inicie sessão para ver seus torneios</h2>
      <p className="text-zinc-400">Você precisa de uma conta para criar e gerenciar competições de bilhar.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meus Torneios</h1>
          <p className="text-zinc-400">Gerencie suas competições existentes ou crie uma nova.</p>
        </div>
        <Link 
          to="/tournaments/new" 
          className="px-6 py-3 bg-brand text-zinc-950 font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
          Novo Torneio
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-zinc-900 rounded-2xl" />)}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
             <Trophy className="w-8 h-8 text-zinc-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Nenhum torneio ainda</h3>
            <p className="text-zinc-400 mb-6">Crie seu primeiro campeonato de bilhar para começar.</p>
            <Link to="/tournaments/new" className="text-brand font-bold flex items-center gap-2 justify-center">
              Começar agora <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-16">
          {activeTournaments.length > 0 && (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-8 flex items-center gap-4">
                Em Andamento
                <div className="h-px bg-brand/20 flex-grow" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {activeTournaments.map((t) => (
                  <div key={t.id}>
                    <TournamentCard t={t} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {pastTournaments.length > 0 && (
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 flex items-center gap-4">
                Histórico de Campeonatos
                <div className="h-px bg-white/5 flex-grow" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastTournaments.map((t) => (
                  <div key={t.id}>
                    <TournamentCard t={t} variant="history" />
                  </div>
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
  return (
    <Link 
      to={`/tournaments/${t.id}`} 
      className={`glass-card group transition-all flex flex-col justify-between relative overflow-hidden ${
        variant === 'active' 
          ? 'p-8 border-brand/20 hover:border-brand/40 min-h-[14rem] bg-slate-900/40' 
          : 'p-6 border-white/5 hover:border-white/20 min-h-[12rem] bg-slate-900/20'
      }`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -translate-y-1/2 translate-x-1/2 transition-all ${
        variant === 'active' ? 'bg-brand/10 group-hover:bg-brand/20' : 'bg-slate-700/10 group-hover:bg-slate-700/20'
      }`} />
      
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
            t.status === 'active' ? 'bg-brand/20 text-brand' : 
            t.status === 'finished' ? 'bg-slate-800 text-slate-400' : 
            'bg-amber-400/20 text-amber-400'
          }`}>
            {t.status === 'active' ? 'Ativo' : t.status === 'draft' ? 'Rascunho' : 'Finalizado'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono font-bold tracking-tighter">
            {t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleDateString() : 'DRAFT'}
          </span>
        </div>
        <h3 className={`${variant === 'active' ? 'text-3xl' : 'text-xl'} font-black italic uppercase italic tracking-tighter group-hover:text-brand transition-colors mb-2`}>{t.name}</h3>
        <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
          <TableIcon className="w-3 h-3 text-brand" />
          Formato: {t.type.replace('_', ' ')}
        </p>

        {t.winnerId && (
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-brand">
               <Trophy className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest italic">Hall da Fama</span>
            </div>
            {t.winnerName && (
              <span className="text-lg font-black uppercase italic tracking-tighter text-white ml-6">
                {t.winnerName}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className={`flex items-center justify-between uppercase tracking-widest font-bold pt-6 border-t border-white/5 mt-4 ${variant === 'active' ? 'text-[10px]' : 'text-[8px]'}`}>
         <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-2">
               <Users className="w-3 h-3" />
               Jogadores
            </span>
         </div>
         <span className="text-brand opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
           {variant === 'active' ? 'Painel de Controle' : 'Ver Resultados'} <ChevronRight className="w-3 h-3" />
         </span>
      </div>
    </Link>
  );
}

function CreateTournament() {
  const [name, setName] = useState('');
  const [type, setType] = useState<'single_elimination' | 'double_elimination' | 'round_robin'>('single_elimination');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        name,
        type,
        status: 'draft',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
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
              { id: 'single_elimination', label: 'Mata-Mata', desc: 'Eliminação Única' },
              { id: 'double_elimination', label: 'Sobrevivência', desc: 'Eliminação Dupla' },
              { id: 'round_robin', label: 'Guerra Total', desc: 'Todos Contra Todos' }
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
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'settings'>('players');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
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

  if (loading) return <div className="p-24 text-center text-zinc-500">Carregando campeonato...</div>;
  if (!tournament) return <div className="p-24 text-center">Torneio não encontrado</div>;

  const isOwner = user?.uid === tournament.createdBy;

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
            </div>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white mb-2">{tournament.name}</h1>
            <div className="flex items-center gap-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2 text-emerald-500">
                <TableIcon className="w-3 h-3" />
                Formato // {tournament.type.replace('_', ' ')}
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
          <PlayerList tournamentId={tournament.id} players={players} isOwner={isOwner} />
        )}
        {activeTab === 'matches' && (
          <MatchList tournamentId={tournament.id} matches={matches} players={players} isOwner={isOwner} />
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

function PlayerList({ tournamentId, players, isOwner }: { tournamentId: string, players: Player[], isOwner: boolean }) {
  const [newName, setNewName] = useState('');
  
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
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-bold mb-6 italic">Participantes Inscritos</h3>
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
                className="glass-card p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 font-mono text-xs">
                    #{p.seed}
                  </div>
                  <span className="font-bold text-lg">{p.name}</span>
                </div>
                {isOwner && (
                  <button 
                    onClick={() => deleteDoc(doc(db, 'tournaments', tournamentId, 'players', p.id))}
                    className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    Excluir
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        {isOwner && (
          <div className="glass-card p-6 bg-brand/5 border-brand/20">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" />
              Adicionar Participante
            </h4>
            <form onSubmit={addPlayer} className="space-y-4">
              <input 
                type="text" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome completo..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand transition-colors"
              />
              <button className="w-full py-2.5 bg-brand text-zinc-950 font-bold rounded-xl hover:opacity-90 transition-opacity">
                Inscrever Jogador
              </button>
            </form>
          </div>
        )}

        <div className="glass-card p-6 border-zinc-800">
           <h4 className="font-bold mb-4 text-zinc-400 uppercase text-xs tracking-widest">Estatísticas</h4>
           <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total de Jogadores</span>
                <span className="font-mono">{players.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Vagas Preenchidas</span>
                <span className="font-mono italic">{players.length}/16</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function MatchList({ tournamentId, matches, players, isOwner }: { tournamentId: string, matches: Match[], players: Player[], isOwner: boolean }) {
  
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || "TBD";

  const updateScore = async (matchId: string, score1: number, score2: number, status: Match['status'] = 'in_progress') => {
     try {
       await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
         score1,
         score2,
         status
       });
     } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}/matches/${matchId}`);
     }
  };

  const setWinner = async (matchId: string, winnerId: string) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'matches', matchId), {
        winnerId,
        status: 'finished'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${tournamentId}/matches/${matchId}`);
    }
  }

  const generateMatches = async () => {
    if (players.length < 2) return alert("Necessário pelo menos 2 jogadores");
    
    // Shuffle players
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const pairs = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i+1]) pairs.push([shuffled[i].id, shuffled[i+1].id]);
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
          status: 'pending',
          winnerId: null
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'matches');
    }
  };

  // Logic to generate the next round matches
  const generateNextRound = async () => {
    const maxRound = Math.max(...matches.map(m => m.round), 0);
    const currentRoundMatches = matches.filter(m => m.round === maxRound);
    
    const allFinished = currentRoundMatches.every(m => m.status === 'finished');
    if (!allFinished) return alert("Todas as partidas da rodada atual devem ser finalizadas primeiro.");

    const winners = currentRoundMatches.map(m => m.winnerId).filter(Boolean) as string[];
    
    if (winners.length < 2) {
      if (winners.length === 1 && maxRound > 0) {
        const winner = players.find(p => p.id === winners[0]);
        alert(`Campeonato Finalizado! Vencedor: ${winner?.name || 'Desconhecido'}`);
        await updateDoc(doc(db, 'tournaments', tournamentId), { 
          status: 'finished',
          winnerId: winners[0],
          winnerName: winner?.name || 'Desconhecido'
        });
      }
      return;
    }

    try {
      const nextRound = maxRound + 1;
      for (let i = 0; i < winners.length; i += 2) {
        if (winners[i+1]) {
          await addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: winners[i],
            player2Id: winners[i+1],
            score1: 0,
            score2: 0,
            round: nextRound,
            status: 'pending',
            winnerId: null
          });
        } else {
          // Odd number of winners (bye)
          await addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
            tournamentId,
            player1Id: winners[i],
            player2Id: '', // Wait for winner or bye
            score1: 0,
            score2: 0,
            round: nextRound,
            status: 'pending',
            winnerId: null
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'matches');
    }
  };

  const getRoundName = (round: number, totalMatches: number) => {
    if (totalMatches === 1) return "Grande Final";
    if (totalMatches === 2) return "Semifinais";
    if (totalMatches === 4) return "Quartas de Final";
    if (totalMatches === 8) return "Oitavas de Final";
    return `Rodada ${round}`;
  };

  const maxRound = Math.max(...matches.map(m => m.round), 0);
  const currentRoundMatches = matches.filter(m => m.round === maxRound);
  const isRoundFinished = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === 'finished');

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
                <h4 className="font-black uppercase italic text-brand">Rodada {maxRound} Concluída!</h4>
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
          {[1, 2, 3, 4, 5, 6].map(round => {
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

// --- Hooks ---
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

// --- Main App ---
export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 selection:bg-brand selection:text-black relative overflow-hidden">
        {/* Watermark */}
        <div className="fixed bottom-10 left-10 pointer-events-none select-none z-0 opacity-[0.03] rotate-[-15deg] whitespace-nowrap">
          <span className="text-9xl font-black uppercase tracking-[0.2em] text-white">Jota Tembe</span>
        </div>

        <Navbar user={user} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<TournamentManager />} />
            <Route path="/tournaments/new" element={<CreateTournament />} />
            <Route path="/tournaments/:id" element={<TournamentDetails />} />
          </Routes>
        </main>
        
        <footer className="border-t border-zinc-900 py-12 mt-24">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-brand" />
              <span className="font-display font-bold text-2xl tracking-tighter uppercase italic">NUMBER <span className="text-brand">8</span></span>
            </div>
            <p className="text-zinc-600 text-sm">© 2024 Criado para os mestres do bilhar. Grau Profissional.</p>
            <div className="flex gap-6 text-zinc-500 text-sm font-medium">
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">API</a>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
