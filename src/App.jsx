import { useState, useEffect } from "react";

// ============================================================
// UTILITÁRIOS
// ============================================================
const STORAGE_KEY = "fincheck_data";
const AUTH_KEY    = "fincheck_auth";
const COLORS = ["#1D9E75","#E24B4A","#185FA5","#BA7517","#534AB7","#D85A30","#D4537E","#639922","#888780","#0F6E56","#993C1D","#3C3489"];

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData(); }
  catch { return defaultData(); }
}
function defaultData() {
  return { transactions:[], categories:["Alimentação","Transporte","Aluguel","Lazer","Saúde","Educação","Salário","Outros"], limit:null, caixinhas:[], fiis:[], darkMode:false };
}
function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

// Auth helpers — guarda hash simples da senha
function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) { h = ((h << 5) - h) + pin.charCodeAt(i); h |= 0; }
  return String(h);
}
function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || { hash: null }; }
  catch { return { hash: null }; }
}
function saveAuth(hash) { localStorage.setItem(AUTH_KEY, JSON.stringify({ hash })); }
function clearAuth() { localStorage.removeItem(AUTH_KEY); }

function fmt(n)    { return "€ " + Number(n).toLocaleString("pt-PT", { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function fmtBRL(n) { return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function todayStr()        { return new Date().toISOString().slice(0,10); }
function currentMonthKey() { return new Date().toISOString().slice(0,7); }
function monthKey(d)       { return d ? d.slice(0,7) : ""; }
function monthLabel(mk) {
  if (!mk) return "";
  const [y,m] = mk.split("-");
  return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(m)-1] + "/" + y;
}

// ============================================================
// TEMAS
// ============================================================
function getTheme(dark) {
  return dark ? {
    bg:"#111827", bg2:"#1F2937", card:"#1F2937", border:"#374151",
    text:"#F9FAFB", textMuted:"#9CA3AF", input:"#374151", inputText:"#F9FAFB", metric:"#374151",
  } : {
    bg:"#F9FAFB", bg2:"#F3F4F6", card:"#FFFFFF", border:"#E5E7EB",
    text:"#111827", textMuted:"#6B7280", input:"#FFFFFF", inputText:"#111827", metric:"#F8F8F8",
  };
}

// ============================================================
// TELA DE LOGIN / DEFINIR SENHA
// ============================================================
function AuthScreen({ onLogin, dark }) {
  const T = getTheme(dark);
  const auth = loadAuth();
  const isNew = !auth.hash;

  const [pin, setPin]         = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [showReset, setShowReset] = useState(false);

  function handleSubmit() {
    if (pin.length < 4) { setError("A senha deve ter pelo menos 4 caracteres."); return; }
    if (isNew) {
      if (pin !== confirm) { setError("As senhas não coincidem."); return; }
      saveAuth(hashPin(pin));
      onLogin();
    } else {
      if (hashPin(pin) !== auth.hash) { setError("Senha incorreta. Tente novamente."); return; }
      onLogin();
    }
  }

  function handleReset() {
    if (!window.confirm("Isso vai apagar TODOS os dados e remover a senha. Tem certeza?")) return;
    localStorage.removeItem(STORAGE_KEY);
    clearAuth();
    window.location.reload();
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:20 }}>
      <div style={{ width:"100%", maxWidth:360, background:T.card, borderRadius:20, padding:32, border:`0.5px solid ${T.border}` }}>

        {/* LOGO */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>💰</div>
          <div style={{ fontSize:24, fontWeight:700, color:T.text }}>FinCheck</div>
          <div style={{ fontSize:13, color:T.textMuted, marginTop:4 }}>
            {isNew ? "Crie sua senha para começar" : "Digite sua senha para entrar"}
          </div>
        </div>

        {/* CAMPO SENHA */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, color:T.textMuted, fontWeight:500, display:"block", marginBottom:6 }}>
            {isNew ? "Nova senha" : "Senha"}
          </label>
          <input
            type="password"
            inputMode="text"
            placeholder="••••••••"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoFocus
            style={{ ...iStyle(T), fontSize:18, letterSpacing:4, textAlign:"center" }}
          />
        </div>

        {/* CONFIRMAR (só na criação) */}
        {isNew && (
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:T.textMuted, fontWeight:500, display:"block", marginBottom:6 }}>Confirmar senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ ...iStyle(T), fontSize:18, letterSpacing:4, textAlign:"center" }}
            />
          </div>
        )}

        {/* ERRO */}
        {error && (
          <div style={{ background:"#FCEBEB", border:"0.5px solid #E24B4A", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#E24B4A", marginBottom:12 }}>
            {error}
          </div>
        )}

        {/* BOTÃO ENTRAR */}
        <button onClick={handleSubmit} style={{ width:"100%", padding:13, background:"#1D9E75", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer", marginBottom:16 }}>
          {isNew ? "Criar senha e entrar" : "Entrar"}
        </button>

        {/* ESQUECI A SENHA */}
        {!isNew && (
          <div style={{ textAlign:"center" }}>
            <button onClick={() => setShowReset(!showReset)} style={{ background:"none", border:"none", fontSize:12, color:T.textMuted, cursor:"pointer", textDecoration:"underline" }}>
              Esqueci minha senha
            </button>
            {showReset && (
              <div style={{ marginTop:12, background:T.bg2, borderRadius:10, padding:14, fontSize:13, color:T.textMuted }}>
                ⚠️ Resetar a senha apaga todos os dados do app.
                <button onClick={handleReset} style={{ display:"block", width:"100%", marginTop:10, padding:9, background:"#E24B4A", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  Resetar e apagar tudo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function App() {
  const [page, setPage]         = useState("dashboard");
  const [data, setData]         = useState(loadData);
  const [quickOpen, setQuickOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const dark = data.darkMode || false;
  const T    = getTheme(dark);

  useEffect(() => { saveData(data); }, [data]);

  function updateData(fn) {
    setData(prev => fn({
      ...prev,
      transactions: [...prev.transactions],
      categories:   [...prev.categories],
      caixinhas:    [...(prev.caixinhas||[])],
      fiis:         [...(prev.fiis||[])],
    }));
  }

  function toggleDark() { updateData(d => { d.darkMode = !d.darkMode; return d; }); }

  function handleLogout() {
    if (!window.confirm("Deseja sair do FinCheck?")) return;
    setLoggedIn(false);
    setPage("dashboard");
  }

  // Mostra tela de login se não estiver autenticado
  if (!loggedIn) {
    return <AuthScreen onLogin={() => setLoggedIn(true)} dark={dark} />;
  }

  const pages  = ["dashboard","add","history","caixinhas","fiis","categories","settings"];
  const icons  = ["▦","＋","☰","🐷","🏢","◈","⚙"];
  const labels = ["Início","Registrar","Histórico","Caixinhas","FIIs","Categorias","Alertas"];

  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"16px 10px", fontFamily:"system-ui,sans-serif", fontSize:14, color:T.text, background:T.bg, minHeight:"100vh", overflowX:"hidden", boxSizing:"border-box", width:"100%" }}>

      {/* HEADER */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, color:T.text }}>FinCheck</div>
          <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>{monthLabel(currentMonthKey())}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={toggleDark} style={{ background:"none", border:`0.5px solid ${T.border}`, borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:16, color:T.text }}>
            {dark ? "☀️" : "🌙"}
          </button>
          {/* LOGOUT */}
          <button onClick={handleLogout} style={{ background:"none", border:`0.5px solid ${T.border}`, borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:12, color:T.textMuted }}>
            🔒 Sair
          </button>
        </div>
      </div>

      {/* BOTÃO RÁPIDO */}
      <button onClick={() => setQuickOpen(true)} style={{ width:"100%", padding:"12px", background:"#1D9E75", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        ⚡ Registrar gasto rápido
      </button>

      {quickOpen && <QuickAdd data={data} updateData={updateData} T={T} onClose={() => setQuickOpen(false)} />}

      {/* NAV */}
      <nav style={{ display:"flex", gap:3, background:T.bg2, border:`0.5px solid ${T.border}`, borderRadius:12, padding:4, marginBottom:16, overflowX:"auto" }}>
        {pages.map((p,i) => (
          <button key={p} onClick={() => setPage(p)} style={{
            flex:"0 0 auto", padding:"7px 8px", border: page===p ? `0.5px solid ${T.border}` : "none",
            borderRadius:8, background: page===p ? T.card : "transparent",
            cursor:"pointer", fontSize:10, fontWeight:500, color: page===p ? T.text : T.textMuted,
            display:"flex", flexDirection:"column", alignItems:"center", gap:2,
          }}>
            <span style={{ fontSize:14 }}>{icons[i]}</span>
            <span style={{ whiteSpace:"nowrap" }}>{labels[i]}</span>
          </button>
        ))}
      </nav>

      {page==="dashboard"  && <Dashboard  data={data} T={T} />}
      {page==="add"        && <AddTransaction data={data} updateData={updateData} T={T} />}
      {page==="history"    && <History    data={data} updateData={updateData} T={T} />}
      {page==="caixinhas"  && <Caixinhas  data={data} updateData={updateData} T={T} />}
      {page==="fiis"       && <FIIs       data={data} updateData={updateData} T={T} />}
      {page==="categories" && <Categories data={data} updateData={updateData} T={T} />}
      {page==="settings"   && <Settings   data={data} updateData={updateData} T={T} />}
    </div>
  );
}

// ============================================================
// QUICK ADD
// ============================================================
function QuickAdd({ data, updateData, T, onClose }) {
  const [value, setValue]       = useState("");
  const [category, setCategory] = useState(data.categories[0]||"");
  const [description, setDescription] = useState("");
  const [saved, setSaved]       = useState(false);

  function handleSave() {
    const val = parseFloat(value);
    if (!val||val<=0) { alert("Digite um valor."); return; }
    updateData(d => { d.transactions.push({ id:Date.now(), type:"expense", value:val, date:todayStr(), category, description }); return d; });
    setSaved(true);
    setTimeout(() => { setSaved(false); setValue(""); setDescription(""); }, 1500);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:999, display:"flex", alignItems:"flex-end" }}>
      <div style={{ width:"100%", maxWidth:680, margin:"0 auto", background:T.card, borderRadius:"16px 16px 0 0", padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:600, color:T.text }}>⚡ Gasto rápido</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.textMuted }}>✕</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>Valor (€)</label>
            <input autoFocus style={iStyle(T)} type="number" inputMode="decimal" placeholder="0,00" value={value} onChange={e=>setValue(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>Categoria</label>
            <select style={iStyle(T)} value={category} onChange={e=>setCategory(e.target.value)}>
              {data.categories.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>Descrição (opcional)</label>
          <input style={iStyle(T)} type="text" placeholder="Ex: café, uber..." value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        <button onClick={handleSave} style={{ width:"100%", padding:12, background:"#1D9E75", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" }}>
          {saved ? "✓ Salvo!" : "Salvar gasto"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ data, T }) {
  const mk = currentMonthKey();
  const month   = data.transactions.filter(t=>monthKey(t.date)===mk);
  const income  = month.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0);
  const expense = month.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
  const totalIn  = data.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0);
  const totalOut = data.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0);
  const overLimit = data.limit && expense > data.limit;
  const recent = [...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

  const byCategory = {};
  month.filter(t=>t.type==="expense").forEach(t=>{ byCategory[t.category]=(byCategory[t.category]||0)+t.value; });
  const catLabels=Object.keys(byCategory), catValues=Object.values(byCategory);
  const catTotal=catValues.reduce((a,b)=>a+b,0);

  const last6=[];
  for (let i=5;i>=0;i--) {
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const mk2=d.toISOString().slice(0,7);
    const txs=data.transactions.filter(t=>monthKey(t.date)===mk2);
    last6.push({ label:monthLabel(mk2), income:txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.value,0), expense:txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.value,0) });
  }
  const maxBar=Math.max(...last6.map(m=>Math.max(m.income,m.expense)),1);

  const totalCaixinhas=(data.caixinhas||[]).reduce((s,c)=>s+c.valor,0);
  const totalFIIs=(data.fiis||[]).reduce((s,f)=>s+f.cotas*f.precoAtual,0);
  const dividendosMes=(data.fiis||[]).reduce((s,f)=>s+f.cotas*(f.ultimoDividendo||0),0);

  return (
    <div>
      {overLimit&&<div style={{ background:"#FAEEDA", border:"0.5px solid #BA7517", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#BA7517" }}>⚠ Atenção: limite de gastos do mês ultrapassado!</div>}
      <ST T={T}>Gastos — {monthLabel(mk)}</ST>
      <div style={g3}><MC label="Saldo" value={fmt(totalIn-totalOut)} color="#185FA5" T={T}/><MC label="Entradas" value={fmt(income)} color="#1D9E75" T={T}/><MC label="Saídas" value={fmt(expense)} color="#E24B4A" T={T}/></div>
      <ST T={T}>Investimentos</ST>
      <div style={g3}><MC label="Caixinhas" value={fmtBRL(totalCaixinhas)} color="#534AB7" T={T}/><MC label="FIIs" value={fmtBRL(totalFIIs)} color="#BA7517" T={T}/><MC label="Dividendos/mês" value={fmtBRL(dividendosMes)} color="#1D9E75" T={T}/></div>
      <Card T={T}>
        <ST T={T}>Gastos por categoria — mês atual</ST>
        {catLabels.length===0?<Emp T={T}>Nenhuma saída registrada ainda.</Emp>:(
          <><DonutChart values={catValues}/><div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:8, fontSize:12, color:T.textMuted }}>{catLabels.map((l,i)=>(<span key={l} style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:COLORS[i%COLORS.length], display:"inline-block" }}/>{l} {Math.round(catValues[i]/catTotal*100)}%</span>))}</div></>
        )}
      </Card>
      <Card T={T}>
        <ST T={T}>Evolução mensal — últimos 6 meses</ST>
        <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:120, marginBottom:8 }}>
          {last6.map((m,i)=>(
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{ width:"100%", display:"flex", gap:2, alignItems:"flex-end", height:100 }}>
                <div style={{ flex:1, background:"#1D9E75", borderRadius:"4px 4px 0 0", height:`${m.income/maxBar*100}%`, minHeight:m.income>0?4:0 }}/>
                <div style={{ flex:1, background:"#E24B4A", borderRadius:"4px 4px 0 0", height:`${m.expense/maxBar*100}%`, minHeight:m.expense>0?4:0 }}/>
              </div>
              <div style={{ fontSize:9, color:T.textMuted, textAlign:"center" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:16, fontSize:11, color:T.textMuted }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, background:"#1D9E75", borderRadius:2, display:"inline-block" }}/>Entradas</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, background:"#E24B4A", borderRadius:2, display:"inline-block" }}/>Saídas</span>
        </div>
      </Card>
      <Card T={T}>
        <ST T={T}>Últimas transações</ST>
        {recent.length===0?<Emp T={T}>Nenhuma transação ainda.</Emp>:recent.map(t=><TxItem key={t.id} tx={t} T={T}/>)}
      </Card>
    </div>
  );
}

function DonutChart({ values }) {
  const size=200,cx=100,cy=100,r=70,ir=42,total=values.reduce((a,b)=>a+b,0);
  let angle=-Math.PI/2;
  const slices=values.map((v,i)=>{ const a=(v/total)*2*Math.PI,end=angle+a,p=`M${cx+r*Math.cos(angle)} ${cy+r*Math.sin(angle)} A${r} ${r} 0 ${a>Math.PI?1:0} 1 ${cx+r*Math.cos(end)} ${cy+r*Math.sin(end)} L${cx+ir*Math.cos(end)} ${cy+ir*Math.sin(end)} A${ir} ${ir} 0 ${a>Math.PI?1:0} 0 ${cx+ir*Math.cos(angle)} ${cy+ir*Math.sin(angle)}Z`; angle=end; return { p,color:COLORS[i%COLORS.length] }; });
  return <svg viewBox="0 0 200 200" width="100%" style={{ maxHeight:180 }}>{slices.map((s,i)=><path key={i} d={s.p} fill={s.color} stroke="white" strokeWidth="2"/>)}</svg>;
}

// ============================================================
// REGISTRAR
// ============================================================
function AddTransaction({ data, updateData, T }) {
  const [type,setType]=useState("income"),[value,setValue]=useState(""),[date,setDate]=useState(todayStr()),[category,setCategory]=useState(data.categories[0]||""),[description,setDescription]=useState(""),[recurring,setRecurring]=useState(false),[saved,setSaved]=useState(false);
  function handleSave() {
    const val=parseFloat(value);
    if (!val||val<=0||!date||!category){alert("Preencha valor, data e categoria.");return;}
    updateData(d=>{d.transactions.push({id:Date.now(),type,value:val,date,category,description,recurring});return d;});
    setValue("");setDescription("");setRecurring(false);setSaved(true);setTimeout(()=>setSaved(false),2000);
  }
  return (
    <Card T={T}>
      <ST T={T}>Nova transação</ST>
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:12,color:T.textMuted,display:"block",marginBottom:4 }}>Tipo</label>
        <div style={{ display:"flex",gap:6 }}>
          <button onClick={()=>setType("income")}  style={{ ...tBtn,flex:1,...(type==="income" ?{background:"#E1F5EE",color:"#085041",borderColor:"#1D9E75"}:{background:T.input,color:T.textMuted,borderColor:T.border})}}>+ Entrada</button>
          <button onClick={()=>setType("expense")} style={{ ...tBtn,flex:1,...(type==="expense"?{background:"#FCEBEB",color:"#501313",borderColor:"#E24B4A"}:{background:T.input,color:T.textMuted,borderColor:T.border})}}>− Saída</button>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        <FG label="Valor (€)" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={value} onChange={e=>setValue(e.target.value)}/></FG>
        <FG label="Data" T={T}><input style={iStyle(T)} type="date" value={date} onChange={e=>setDate(e.target.value)}/></FG>
        <FG label="Categoria" T={T}><select style={iStyle(T)} value={category} onChange={e=>setCategory(e.target.value)}>{data.categories.map(c=><option key={c} value={c}>{c}</option>)}</select></FG>
        <FG label="Descrição (opcional)" T={T}><input style={iStyle(T)} type="text" placeholder="Ex: supermercado" value={description} onChange={e=>setDescription(e.target.value)}/></FG>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:8,marginBottom:4 }}>
        <input type="checkbox" id="rec" checked={recurring} onChange={e=>setRecurring(e.target.checked)} style={{ width:16,height:16,cursor:"pointer" }}/>
        <label htmlFor="rec" style={{ fontSize:13,color:T.textMuted,cursor:"pointer" }}>🔄 Transação recorrente (repete todo mês)</label>
      </div>
      <button onClick={handleSave} style={{ width:"100%",padding:10,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",marginTop:10 }}>Salvar transação</button>
      {saved&&<div style={{ textAlign:"center",fontSize:12,marginTop:8,color:"#1D9E75" }}>✓ Transação salva!</div>}
    </Card>
  );
}

// ============================================================
// HISTÓRICO
// ============================================================
function History({ data, updateData, T }) {
  const [fType,setFType]=useState(""),[fCat,setFCat]=useState(""),[fMonth,setFMonth]=useState(""),[editTx,setEditTx]=useState(null);
  const months=[...new Set(data.transactions.map(t=>monthKey(t.date)))].sort().reverse();
  let txs=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(fType) txs=txs.filter(t=>t.type===fType);
  if(fCat)  txs=txs.filter(t=>t.category===fCat);
  if(fMonth)txs=txs.filter(t=>monthKey(t.date)===fMonth);
  function deleteTx(id){updateData(d=>{d.transactions=d.transactions.filter(t=>t.id!==id);return d;});}
  function saveEdit(u){updateData(d=>{d.transactions=d.transactions.map(t=>t.id===u.id?u:t);return d;});setEditTx(null);}
  return (
    <div>
      <Card T={T}>
        <ST T={T}>Filtros</ST>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          <select style={{ ...iStyle(T),flex:1 }} value={fType} onChange={e=>setFType(e.target.value)}><option value="">Todos os tipos</option><option value="income">Entradas</option><option value="expense">Saídas</option></select>
          <select style={{ ...iStyle(T),flex:1 }} value={fCat}  onChange={e=>setFCat(e.target.value)}><option value="">Todas categorias</option>{data.categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select style={{ ...iStyle(T),flex:1 }} value={fMonth} onChange={e=>setFMonth(e.target.value)}><option value="">Todos os meses</option>{months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        </div>
      </Card>
      {editTx&&<EditModal tx={editTx} data={data} T={T} onSave={saveEdit} onClose={()=>setEditTx(null)}/>}
      <div>{txs.length===0?<Emp T={T}>Nenhuma transação encontrada.</Emp>:txs.map(t=><TxItem key={t.id} tx={t} T={T} onDelete={()=>deleteTx(t.id)} onEdit={()=>setEditTx({...t})}/>)}</div>
    </div>
  );
}

function EditModal({ tx, data, T, onSave, onClose }) {
  const [type,setType]=useState(tx.type),[value,setValue]=useState(String(tx.value)),[date,setDate]=useState(tx.date),[category,setCategory]=useState(tx.category),[description,setDescription]=useState(tx.description||"");
  function handleSave(){const val=parseFloat(value);if(!val||val<=0||!date||!category){alert("Preencha todos os campos.");return;}onSave({...tx,type,value:val,date,category,description});}
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ width:"100%",maxWidth:400,background:T.card,borderRadius:16,padding:20 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div style={{ fontSize:15,fontWeight:600,color:T.text }}>✏️ Editar transação</div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:T.textMuted }}>✕</button>
        </div>
        <div style={{ display:"flex",gap:6,marginBottom:12 }}>
          <button onClick={()=>setType("income")}  style={{ ...tBtn,flex:1,...(type==="income" ?{background:"#E1F5EE",color:"#085041",borderColor:"#1D9E75"}:{background:T.input,color:T.textMuted,borderColor:T.border})}}>+ Entrada</button>
          <button onClick={()=>setType("expense")} style={{ ...tBtn,flex:1,...(type==="expense"?{background:"#FCEBEB",color:"#501313",borderColor:"#E24B4A"}:{background:T.input,color:T.textMuted,borderColor:T.border})}}>− Saída</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
          <FG label="Valor (€)" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)}/></FG>
          <FG label="Data" T={T}><input style={iStyle(T)} type="date" value={date} onChange={e=>setDate(e.target.value)}/></FG>
          <FG label="Categoria" T={T}><select style={iStyle(T)} value={category} onChange={e=>setCategory(e.target.value)}>{data.categories.map(c=><option key={c} value={c}>{c}</option>)}</select></FG>
          <FG label="Descrição" T={T}><input style={iStyle(T)} type="text" value={description} onChange={e=>setDescription(e.target.value)}/></FG>
        </div>
        <button onClick={handleSave} style={{ width:"100%",padding:10,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer" }}>Salvar alterações</button>
      </div>
    </div>
  );
}

// ============================================================
// CAIXINHAS
// ============================================================
function Caixinhas({ data, updateData, T }) {
  const caixinhas=data.caixinhas||[];
  const [showForm,setShowForm]=useState(false),[nome,setNome]=useState(""),[valor,setValor]=useState(""),[meta,setMeta]=useState(""),[editId,setEditId]=useState(null);
  function handleSave(){const v=parseFloat(valor);if(!nome.trim()||isNaN(v)||v<0){alert("Preencha nome e valor.");return;}updateData(d=>{if(editId)d.caixinhas=d.caixinhas.map(c=>c.id===editId?{...c,nome:nome.trim(),valor:v,meta:parseFloat(meta)||0}:c);else d.caixinhas.push({id:Date.now(),nome:nome.trim(),valor:v,meta:parseFloat(meta)||0});return d;});setNome("");setValor("");setMeta("");setShowForm(false);setEditId(null);}
  function handleEdit(c){setEditId(c.id);setNome(c.nome);setValor(String(c.valor));setMeta(String(c.meta||""));setShowForm(true);}
  function handleDelete(id){if(!window.confirm("Apagar esta caixinha?"))return;updateData(d=>{d.caixinhas=d.caixinhas.filter(c=>c.id!==id);return d;});}
  const total=caixinhas.reduce((s,c)=>s+c.valor,0);
  return (
    <div>
      <Card T={T}><ST T={T}>Total guardado</ST><div style={{ fontSize:28,fontWeight:700,color:"#534AB7",marginBottom:4 }}>{fmtBRL(total)}</div><div style={{ fontSize:12,color:T.textMuted }}>{caixinhas.length} caixinha{caixinhas.length!==1?"s":""}</div></Card>
      {caixinhas.map(c=>{const pct=c.meta>0?Math.min(100,Math.round(c.valor/c.meta*100)):null;return(
        <Card key={c.id} T={T}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
            <div><div style={{ fontSize:15,fontWeight:600,color:T.text }}>🐷 {c.nome}</div><div style={{ fontSize:22,fontWeight:700,color:"#534AB7",marginTop:4 }}>{fmtBRL(c.valor)}</div>{c.meta>0&&<div style={{ fontSize:12,color:T.textMuted,marginTop:2 }}>Meta: {fmtBRL(c.meta)}</div>}</div>
            <div style={{ display:"flex",gap:6 }}><button style={bSm(T)} onClick={()=>handleEdit(c)}>Editar</button><button style={{ ...bSm(T),color:"#E24B4A",borderColor:"#E24B4A" }} onClick={()=>handleDelete(c.id)}>✕</button></div>
          </div>
          {pct!==null&&(<div><div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:T.textMuted,marginBottom:4 }}><span>Progresso</span><span>{pct}%</span></div><div style={{ background:T.bg2,borderRadius:99,height:8,overflow:"hidden" }}><div style={{ width:`${pct}%`,height:"100%",background:pct>=100?"#1D9E75":"#534AB7",borderRadius:99 }}/></div></div>)}
        </Card>
      );})}
      {showForm&&(<Card T={T}><ST T={T}>{editId?"Editar caixinha":"Nova caixinha"}</ST><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}><div style={{ gridColumn:"1/-1" }}><FG label="Nome" T={T}><input style={iStyle(T)} type="text" placeholder="Ex: Viagem..." value={nome} onChange={e=>setNome(e.target.value)}/></FG></div><FG label="Valor atual (R$)" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={valor} onChange={e=>setValor(e.target.value)}/></FG><FG label="Meta (R$) — opcional" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={meta} onChange={e=>setMeta(e.target.value)}/></FG></div><div style={{ display:"flex",gap:8,marginTop:8 }}><button onClick={handleSave} style={{ flex:2,padding:10,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer" }}>Salvar</button><button style={{ ...bSm(T),flex:1 }} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button></div></Card>)}
      {!showForm&&<button onClick={()=>setShowForm(true)} style={{ width:"100%",padding:10,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",marginTop:4 }}>+ Nova caixinha</button>}
    </div>
  );
}

// ============================================================
// FIIs
// ============================================================
function FIIs({ data, updateData, T }) {
  const fiis=data.fiis||[];
  const [showForm,setShowForm]=useState(false),[editId,setEditId]=useState(null),[codigo,setCodigo]=useState(""),[cotas,setCotas]=useState(""),[precoMedio,setPrecoMedio]=useState(""),[precoAtual,setPrecoAtual]=useState(""),[ultimoDividendo,setUltimoDividendo]=useState("");
  function handleSave(){if(!codigo.trim()||!cotas||!precoMedio||!precoAtual){alert("Preencha os campos obrigatórios.");return;}const fii={id:editId||Date.now(),codigo:codigo.trim().toUpperCase(),cotas:parseFloat(cotas),precoMedio:parseFloat(precoMedio),precoAtual:parseFloat(precoAtual),ultimoDividendo:parseFloat(ultimoDividendo)||0};updateData(d=>{if(editId)d.fiis=d.fiis.map(f=>f.id===editId?fii:f);else d.fiis.push(fii);return d;});setCodigo("");setCotas("");setPrecoMedio("");setPrecoAtual("");setUltimoDividendo("");setShowForm(false);setEditId(null);}
  function handleEdit(f){setEditId(f.id);setCodigo(f.codigo);setCotas(String(f.cotas));setPrecoMedio(String(f.precoMedio));setPrecoAtual(String(f.precoAtual));setUltimoDividendo(String(f.ultimoDividendo||""));setShowForm(true);}
  function handleDelete(id){if(!window.confirm("Apagar este FII?"))return;updateData(d=>{d.fiis=d.fiis.filter(f=>f.id!==id);return d;});}
  const totalP=fiis.reduce((s,f)=>s+f.cotas*f.precoAtual,0),totalI=fiis.reduce((s,f)=>s+f.cotas*f.precoMedio,0),totalD=fiis.reduce((s,f)=>s+f.cotas*(f.ultimoDividendo||0),0),lucroT=totalP-totalI;
  return (
    <div>
      <Card T={T}><ST T={T}>Resumo da carteira</ST><div style={g3}><MC label="Patrimônio" value={fmtBRL(totalP)} color="#BA7517" T={T}/><MC label="Investido" value={fmtBRL(totalI)} color="#185FA5" T={T}/><MC label="Lucro/Prej." value={fmtBRL(lucroT)} color={lucroT>=0?"#1D9E75":"#E24B4A"} T={T}/></div><div style={{ marginTop:8,padding:"10px 12px",background:"#FAEEDA",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}><span style={{ fontSize:13,color:"#BA7517",fontWeight:500 }}>💰 Dividendos estimados/mês</span><span style={{ fontSize:15,fontWeight:700,color:"#BA7517" }}>{fmtBRL(totalD)}</span></div></Card>
      {fiis.map(f=>{const p=f.cotas*f.precoAtual,inv=f.cotas*f.precoMedio,lc=p-inv,lcP=inv>0?(lc/inv*100).toFixed(1):0,div=f.cotas*(f.ultimoDividendo||0),ym=f.precoAtual>0&&f.ultimoDividendo>0?((f.ultimoDividendo/f.precoAtual)*100).toFixed(2):null;return(
        <Card key={f.id} T={T}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}><div><div style={{ fontSize:16,fontWeight:700,color:T.text }}>{f.codigo}</div><div style={{ fontSize:12,color:T.textMuted,marginTop:2 }}>{f.cotas} cotas</div></div><div style={{ display:"flex",gap:6 }}><button style={bSm(T)} onClick={()=>handleEdit(f)}>Editar</button><button style={{ ...bSm(T),color:"#E24B4A",borderColor:"#E24B4A" }} onClick={()=>handleDelete(f.id)}>✕</button></div></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {[["Patrimônio",fmtBRL(p),null],["Lucro/Prej.",`${fmtBRL(lc)} (${lcP}%)`,lc>=0?"#1D9E75":"#E24B4A"],["Preço médio",fmtBRL(f.precoMedio),null],["Preço atual",fmtBRL(f.precoAtual),null],["Dividendo/mês",fmtBRL(div),"#BA7517"],ym?["Yield mensal",`${ym}%`,"#BA7517"]:null].filter(Boolean).map(([l,v,c])=>(
              <div key={l} style={{ background:T.metric,borderRadius:8,padding:"8px 10px" }}><div style={{ fontSize:10,color:T.textMuted,marginBottom:2 }}>{l}</div><div style={{ fontSize:13,fontWeight:600,color:c||T.text }}>{v}</div></div>
            ))}
          </div>
        </Card>
      );})}
      {showForm&&(<Card T={T}><ST T={T}>{editId?"Editar FII":"Adicionar FII"}</ST><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}><div style={{ gridColumn:"1/-1" }}><FG label="Código (ex: HGLG11)" T={T}><input style={iStyle(T)} type="text" placeholder="XXXX11" maxLength={7} value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())}/></FG></div><FG label="Qtd. de cotas" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" placeholder="0" min="0" value={cotas} onChange={e=>setCotas(e.target.value)}/></FG><FG label="Preço médio (R$)" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={precoMedio} onChange={e=>setPrecoMedio(e.target.value)}/></FG><FG label="Preço atual (R$)" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={precoAtual} onChange={e=>setPrecoAtual(e.target.value)}/></FG><FG label="Último dividendo/cota (R$)" T={T}><input style={iStyle(T)} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={ultimoDividendo} onChange={e=>setUltimoDividendo(e.target.value)}/></FG></div><div style={{ display:"flex",gap:8,marginTop:8 }}><button onClick={handleSave} style={{ flex:2,padding:10,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer" }}>Salvar</button><button style={{ ...bSm(T),flex:1 }} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button></div></Card>)}
      {!showForm&&<button onClick={()=>setShowForm(true)} style={{ width:"100%",padding:10,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",marginTop:4 }}>+ Adicionar FII</button>}
    </div>
  );
}

// ============================================================
// CATEGORIAS
// ============================================================
function Categories({ data, updateData, T }) {
  const [newCat,setNewCat]=useState("");
  function addCat(){const val=newCat.trim();if(!val||data.categories.includes(val))return;updateData(d=>{d.categories.push(val);return d;});setNewCat("");}
  function deleteCat(cat){updateData(d=>{d.categories=d.categories.filter(c=>c!==cat);return d;});}
  return (
    <Card T={T}>
      <ST T={T}>Categorias ativas</ST>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:12 }}>
        {data.categories.map(c=>(<div key={c} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,padding:"8px 10px",background:T.metric,border:`0.5px solid ${T.border}`,borderRadius:8 }}><span style={{ fontSize:13,color:T.text }}>{c}</span><button onClick={()=>deleteCat(c)} style={{ background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:12 }}>✕</button></div>))}
      </div>
      <div style={{ display:"flex",gap:8 }}>
        <input style={{ ...iStyle(T),flex:1 }} type="text" placeholder="Nova categoria..." maxLength={30} value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()}/>
        <button style={bSm(T)} onClick={addCat}>Adicionar</button>
      </div>
    </Card>
  );
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
function Settings({ data, updateData, T }) {
  const [limitVal,setLimitVal]=useState(data.limit||"");
  const [showChangePwd,setShowChangePwd]=useState(false);
  const [oldPwd,setOldPwd]=useState(""),[newPwd,setNewPwd]=useState(""),[confirmPwd,setConfirmPwd]=useState(""),[pwdMsg,setPwdMsg]=useState("");

  function saveLimit(){const val=parseFloat(limitVal);if(!val||val<=0){alert("Digite um valor válido.");return;}updateData(d=>{d.limit=val;return d;});alert("Limite salvo: "+fmt(val));}
  function clearAll(){if(!window.confirm("Tem certeza? Todos os dados serão apagados."))return;updateData(()=>defaultData());setLimitVal("");}

  function handleChangePwd(){
    const auth=loadAuth();
    if(hashPin(oldPwd)!==auth.hash){setPwdMsg("Senha atual incorreta.");return;}
    if(newPwd.length<4){setPwdMsg("A nova senha deve ter pelo menos 4 caracteres.");return;}
    if(newPwd!==confirmPwd){setPwdMsg("As senhas não coincidem.");return;}
    saveAuth(hashPin(newPwd));
    setPwdMsg("✓ Senha alterada com sucesso!");
    setOldPwd("");setNewPwd("");setConfirmPwd("");
    setTimeout(()=>{setPwdMsg("");setShowChangePwd(false);},2000);
  }

  const row = { display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:`0.5px solid ${T.border}` };
  return (
    <Card T={T}>
      <ST T={T}>Configurações</ST>
      <div style={row}>
        <div><div style={{ fontSize:13,fontWeight:500,color:T.text }}>Limite de gastos mensais</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>Alerta quando saídas ultrapassarem esse valor</div></div>
        <input style={{ ...iStyle(T),width:130 }} type="number" inputMode="decimal" placeholder="Ex: 2000" min="0" value={limitVal} onChange={e=>setLimitVal(e.target.value)}/>
      </div>
      <div style={row}>
        <div><div style={{ fontSize:13,fontWeight:500,color:T.text }}>Limite atual</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>{data.limit?`Definido em ${fmt(data.limit)}/mês`:"Nenhum limite definido"}</div></div>
        <button style={bSm(T)} onClick={saveLimit}>Salvar</button>
      </div>

      {/* ALTERAR SENHA */}
      <div style={row}>
        <div><div style={{ fontSize:13,fontWeight:500,color:T.text }}>🔒 Alterar senha</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>Mudar a senha de acesso ao app</div></div>
        <button style={bSm(T)} onClick={()=>setShowChangePwd(!showChangePwd)}>Alterar</button>
      </div>
      {showChangePwd&&(
        <div style={{ background:T.bg2,borderRadius:10,padding:14,marginBottom:8 }}>
          <FG label="Senha atual" T={T}><input style={iStyle(T)} type="password" placeholder="••••••" value={oldPwd} onChange={e=>setOldPwd(e.target.value)}/></FG>
          <FG label="Nova senha" T={T}><input style={iStyle(T)} type="password" placeholder="••••••" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/></FG>
          <FG label="Confirmar nova senha" T={T}><input style={iStyle(T)} type="password" placeholder="••••••" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)}/></FG>
          {pwdMsg&&<div style={{ fontSize:13,color:pwdMsg.startsWith("✓")?"#1D9E75":"#E24B4A",marginBottom:8 }}>{pwdMsg}</div>}
          <button onClick={handleChangePwd} style={{ width:"100%",padding:9,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer" }}>Confirmar alteração</button>
        </div>
      )}

      <div style={{ ...row,borderBottom:"none" }}>
        <div><div style={{ fontSize:13,fontWeight:500,color:T.text }}>Apagar todos os dados</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>Remove tudo (não pode ser desfeito)</div></div>
        <button style={{ ...bSm(T),color:"#E24B4A",borderColor:"#E24B4A" }} onClick={clearAll}>Apagar</button>
      </div>
    </Card>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
function Card({ T, children }) { return <div style={{ background:T.card,border:`0.5px solid ${T.border}`,borderRadius:12,padding:16,marginBottom:12 }}>{children}</div>; }
function ST({ T, children })   { return <div style={{ fontSize:11,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:".05em",marginBottom:10 }}>{children}</div>; }
function Emp({ T, children })  { return <div style={{ textAlign:"center",color:T.textMuted,fontSize:13,padding:24 }}>{children}</div>; }
function MC({ label, value, color, T }) {
  return <div style={{ background:T.metric,borderRadius:8,padding:"8px 6px",textAlign:"center",minWidth:0 }}><div style={{ fontSize:10,color:T.textMuted,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{label}</div><div style={{ fontSize:12,fontWeight:600,color,wordBreak:"break-all",lineHeight:1.3 }}>{value}</div></div>;
}
function FG({ label, T, children }) { return <div style={{ display:"flex",flexDirection:"column",gap:4,marginBottom:10 }}><label style={{ fontSize:12,color:T.textMuted,fontWeight:500 }}>{label}</label>{children}</div>; }
function TxItem({ tx, T, onDelete, onEdit }) {
  const isIncome=tx.type==="income";
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.card,border:`0.5px solid ${T.border}`,borderRadius:8,marginBottom:6 }}>
      <div style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,background:isIncome?"#1D9E75":"#E24B4A" }}/>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:500,color:T.text }}>{tx.category}{tx.recurring?" 🔄":""}</div>
        {tx.description&&<div style={{ fontSize:11,color:T.textMuted }}>{tx.description}</div>}
      </div>
      <div style={{ textAlign:"right",flexShrink:0 }}>
        <div style={{ fontSize:14,fontWeight:600,color:isIncome?"#1D9E75":"#E24B4A" }}>{isIncome?"+":" −"} {fmt(tx.value)}</div>
        <div style={{ fontSize:11,color:T.textMuted }}>{tx.date.split("-").reverse().join("/")}</div>
      </div>
      {onEdit&&<button onClick={onEdit} style={{ background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:14,padding:4 }}>✏️</button>}
      {onDelete&&<button onClick={onDelete} style={{ background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:14,padding:4 }}>✕</button>}
    </div>
  );
}

const iStyle = T => ({ width:"100%",padding:"8px 10px",border:`0.5px solid ${T.border}`,borderRadius:8,background:T.input,color:T.inputText,fontSize:13,fontFamily:"inherit",outline:"none" });
const bSm    = T => ({ padding:"8px 14px",border:`0.5px solid ${T.border}`,borderRadius:8,background:T.card,color:T.text,cursor:"pointer",fontSize:13,fontWeight:500,whiteSpace:"nowrap" });
const tBtn       = { flex:1,padding:8,border:"0.5px solid",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500 };
const g3         = { display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6,marginBottom:12 };