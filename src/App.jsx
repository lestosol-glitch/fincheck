import { useState, useEffect } from "react";

// ============================================================
// UTILITÁRIOS
// ============================================================
const STORAGE_KEY = "fincheck_data";
const COLORS = [
  "#1D9E75","#E24B4A","#185FA5","#BA7517",
  "#534AB7","#D85A30","#D4537E","#639922",
  "#888780","#0F6E56","#993C1D","#3C3489"
];

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData();
  } catch { return defaultData(); }
}

function defaultData() {
  return {
    transactions: [],
    categories: ["Alimentação","Transporte","Aluguel","Lazer","Saúde","Educação","Salário","Outros"],
    limit: null,
    caixinhas: [],
    fiis: [],
  };
}

function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

function fmt(n) {
  return "€ " + Number(n).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtBRL(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function monthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : "";
}

function monthLabel(mk) {
  if (!mk) return "";
  const [y, m] = mk.split("-");
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return names[parseInt(m) - 1] + "/" + y;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(loadData);

  useEffect(() => { saveData(data); }, [data]);

  function updateData(fn) {
    setData(prev => {
      const next = fn({
        ...prev,
        transactions: [...prev.transactions],
        categories: [...prev.categories],
        caixinhas: [...(prev.caixinhas || [])],
        fiis: [...(prev.fiis || [])],
      });
      return next;
    });
  }

  const pages  = ["dashboard","add","history","caixinhas","fiis","settings"];
  const icons  = ["▦","＋","☰","🐷","🏢","⚙"];
  const labels = ["Dashboard","Registrar","Histórico","Caixinhas","FIIs","Alertas"];

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <div style={styles.appTitle}>FinCheck</div>
          <div style={styles.appSub}>{monthLabel(currentMonthKey())}</div>
        </div>
        <div style={styles.badge}>v1.3</div>
      </div>

      {/* NAV */}
      <nav style={styles.nav}>
        {pages.map((p, i) => (
          <button key={p} onClick={() => setPage(p)}
            style={{ ...styles.navBtn, ...(page === p ? styles.navBtnActive : {}) }}>
            <span style={styles.navIcon}>{icons[i]}</span>
            <span style={styles.navLabel}>{labels[i]}</span>
          </button>
        ))}
      </nav>

      {/* PÁGINAS */}
      {page === "dashboard"  && <Dashboard data={data} />}
      {page === "add"        && <AddTransaction data={data} updateData={updateData} />}
      {page === "history"    && <History data={data} updateData={updateData} />}
      {page === "caixinhas"  && <Caixinhas data={data} updateData={updateData} />}
      {page === "fiis"       && <FIIs data={data} updateData={updateData} />}
      {page === "settings"   && <Settings data={data} updateData={updateData} />}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ data }) {
  const mk = currentMonthKey();
  const month   = data.transactions.filter(t => monthKey(t.date) === mk);
  const income  = month.filter(t => t.type === "income").reduce((s, t) => s + t.value, 0);
  const expense = month.filter(t => t.type === "expense").reduce((s, t) => s + t.value, 0);
  const totalIn  = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.value, 0);
  const totalOut = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.value, 0);
  const saldo = totalIn - totalOut;
  const overLimit = data.limit && expense > data.limit;
  const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const expenses = month.filter(t => t.type === "expense");
  const byCategory = {};
  expenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.value; });
  const catLabels = Object.keys(byCategory);
  const catValues = Object.values(byCategory);
  const total = catValues.reduce((a, b) => a + b, 0);

  const totalCaixinhas = (data.caixinhas || []).reduce((s, c) => s + c.valor, 0);
  const totalFIIs = (data.fiis || []).reduce((s, f) => s + f.cotas * f.precoAtual, 0);
  const dividendosMes = (data.fiis || []).reduce((s, f) => s + f.cotas * (f.ultimoDividendo || 0), 0);

  return (
    <div>
      {overLimit && (
        <div style={styles.alertBar}>⚠ Atenção: limite de gastos do mês ultrapassado!</div>
      )}

      <div style={styles.sectionTitle}>Gastos — {monthLabel(mk)}</div>
      <div style={styles.metricGrid}>
        <MetricCard label="Saldo" value={fmt(saldo)} color="#185FA5" />
        <MetricCard label="Entradas" value={fmt(income)} color="#1D9E75" />
        <MetricCard label="Saídas" value={fmt(expense)} color="#E24B4A" />
      </div>

      <div style={styles.sectionTitle}>Investimentos</div>
      <div style={styles.metricGrid}>
        <MetricCard label="Caixinhas" value={fmtBRL(totalCaixinhas)} color="#534AB7" />
        <MetricCard label="FIIs (R$)" value={fmtBRL(totalFIIs)} color="#BA7517" />
        <MetricCard label="Dividendos/mês" value={fmtBRL(dividendosMes)} color="#1D9E75" />
      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Gastos por categoria — mês atual</div>
        {catLabels.length === 0 ? (
          <div style={styles.empty}>Nenhuma saída registrada ainda.</div>
        ) : (
          <>
            <DonutChart labels={catLabels} values={catValues} colors={COLORS} />
            <div style={styles.legend}>
              {catLabels.map((l, i) => (
                <span key={l} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: COLORS[i % COLORS.length] }} />
                  {l} {Math.round(catValues[i] / total * 100)}%
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Últimas transações</div>
        {recent.length === 0
          ? <div style={styles.empty}>Nenhuma transação ainda.</div>
          : recent.map(t => <TxItem key={t.id} tx={t} />)
        }
      </div>
    </div>
  );
}

// ============================================================
// GRÁFICO DONUT SVG
// ============================================================
function DonutChart({ labels, values, colors }) {
  const size = 200;
  const cx = size / 2, cy = size / 2;
  const r = 70, innerR = 42;
  const total = values.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const angle = (v / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle),   iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle), iy2 = cy + innerR * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
    startAngle = endAngle;
    return { path, color: colors[i % colors.length] };
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxHeight: 200 }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />
      ))}
    </svg>
  );
}

// ============================================================
// REGISTRAR TRANSAÇÃO
// ============================================================
function AddTransaction({ data, updateData }) {
  const [type, setType] = useState("income");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState(data.categories[0] || "");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const val = parseFloat(value);
    if (!val || val <= 0 || !date || !category) { alert("Preencha valor, data e categoria."); return; }
    updateData(d => {
      d.transactions.push({ id: Date.now(), type, value: val, date, category, description });
      return d;
    });
    setValue(""); setDescription("");
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Nova transação</div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Tipo</label>
        <div style={styles.typeToggle}>
          <button onClick={() => setType("income")}  style={{ ...styles.typeBtn, ...(type === "income"  ? styles.typeBtnIncome  : {}) }}>+ Entrada</button>
          <button onClick={() => setType("expense")} style={{ ...styles.typeBtn, ...(type === "expense" ? styles.typeBtnExpense : {}) }}>− Saída</button>
        </div>
      </div>
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Valor (€)</label>
          <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Data</label>
          <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Categoria</label>
          <select style={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
            {data.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Descrição (opcional)</label>
          <input style={styles.input} type="text" placeholder="Ex: supermercado" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
      <button style={styles.btnPrimary} onClick={handleSave}>Salvar transação</button>
      {saved && <div style={{ textAlign:"center", fontSize:12, marginTop:8, color:"#1D9E75" }}>✓ Transação salva!</div>}
    </div>
  );
}

// ============================================================
// HISTÓRICO
// ============================================================
function History({ data, updateData }) {
  const [fType, setFType] = useState("");
  const [fCat, setFCat] = useState("");
  const [fMonth, setFMonth] = useState("");

  const months = [...new Set(data.transactions.map(t => monthKey(t.date)))].sort().reverse();
  let txs = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (fType)  txs = txs.filter(t => t.type === fType);
  if (fCat)   txs = txs.filter(t => t.category === fCat);
  if (fMonth) txs = txs.filter(t => monthKey(t.date) === fMonth);

  function deleteTx(id) {
    updateData(d => { d.transactions = d.transactions.filter(t => t.id !== id); return d; });
  }

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Filtros</div>
        <div style={styles.filterRow}>
          <select style={styles.input} value={fType} onChange={e => setFType(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
          <select style={styles.input} value={fCat} onChange={e => setFCat(e.target.value)}>
            <option value="">Todas categorias</option>
            {data.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.input} value={fMonth} onChange={e => setFMonth(e.target.value)}>
            <option value="">Todos os meses</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
      </div>
      <div>
        {txs.length === 0
          ? <div style={styles.empty}>Nenhuma transação encontrada.</div>
          : txs.map(t => <TxItem key={t.id} tx={t} onDelete={() => deleteTx(t.id)} />)
        }
      </div>
    </div>
  );
}

// ============================================================
// CAIXINHAS DO NUBANK
// ============================================================
function Caixinhas({ data, updateData }) {
  const caixinhas = data.caixinhas || [];
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [meta, setMeta] = useState("");
  const [editId, setEditId] = useState(null);

  function handleSave() {
    const v = parseFloat(valor);
    if (!nome.trim() || isNaN(v) || v < 0) { alert("Preencha nome e valor."); return; }
    updateData(d => {
      if (editId) {
        d.caixinhas = d.caixinhas.map(c => c.id === editId
          ? { ...c, nome: nome.trim(), valor: v, meta: parseFloat(meta) || 0 } : c);
      } else {
        d.caixinhas.push({ id: Date.now(), nome: nome.trim(), valor: v, meta: parseFloat(meta) || 0 });
      }
      return d;
    });
    setNome(""); setValor(""); setMeta(""); setShowForm(false); setEditId(null);
  }

  function handleEdit(c) {
    setEditId(c.id); setNome(c.nome); setValor(String(c.valor)); setMeta(String(c.meta || ""));
    setShowForm(true);
  }

  function handleDelete(id) {
    if (!window.confirm("Apagar esta caixinha?")) return;
    updateData(d => { d.caixinhas = d.caixinhas.filter(c => c.id !== id); return d; });
  }

  const total = caixinhas.reduce((s, c) => s + c.valor, 0);

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Total guardado</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#534AB7", marginBottom: 4 }}>{fmtBRL(total)}</div>
        <div style={{ fontSize: 12, color: "#888" }}>{caixinhas.length} caixinha{caixinhas.length !== 1 ? "s" : ""}</div>
      </div>

      {caixinhas.map(c => {
        const pct = c.meta > 0 ? Math.min(100, Math.round(c.valor / c.meta * 100)) : null;
        return (
          <div key={c.id} style={styles.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600 }}>🐷 {c.nome}</div>
                <div style={{ fontSize:22, fontWeight:700, color:"#534AB7", marginTop:4 }}>{fmtBRL(c.valor)}</div>
                {c.meta > 0 && <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Meta: {fmtBRL(c.meta)}</div>}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button style={styles.btnSm} onClick={() => handleEdit(c)}>Editar</button>
                <button style={{ ...styles.btnSm, color:"#E24B4A", borderColor:"#E24B4A" }} onClick={() => handleDelete(c.id)}>✕</button>
              </div>
            </div>
            {pct !== null && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#888", marginBottom:4 }}>
                  <span>Progresso</span><span>{pct}%</span>
                </div>
                <div style={{ background:"#f0f0f0", borderRadius:99, height:8, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background: pct>=100 ? "#1D9E75" : "#534AB7", borderRadius:99 }} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showForm && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{editId ? "Editar caixinha" : "Nova caixinha"}</div>
          <div style={styles.formGrid}>
            <div style={{ ...styles.formGroup, gridColumn:"1/-1" }}>
              <label style={styles.label}>Nome da caixinha</label>
              <input style={styles.input} type="text" placeholder="Ex: Viagem, Reserva..." value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Valor atual (R$)</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Meta (R$) — opcional</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={meta} onChange={e => setMeta(e.target.value)} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button style={styles.btnPrimary} onClick={handleSave}>Salvar</button>
            <button style={{ ...styles.btnSm, flex:1 }} onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button style={{ ...styles.btnPrimary, marginTop:4 }} onClick={() => setShowForm(true)}>
          + Nova caixinha
        </button>
      )}
    </div>
  );
}

// ============================================================
// FUNDOS IMOBILIÁRIOS
// ============================================================
function FIIs({ data, updateData }) {
  const fiis = data.fiis || [];
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [cotas, setCotas] = useState("");
  const [precoMedio, setPrecoMedio] = useState("");
  const [precoAtual, setPrecoAtual] = useState("");
  const [ultimoDividendo, setUltimoDividendo] = useState("");

  function handleSave() {
    if (!codigo.trim() || !cotas || !precoMedio || !precoAtual) {
      alert("Preencha código, cotas, preço médio e preço atual."); return;
    }
    const fii = {
      id: editId || Date.now(),
      codigo: codigo.trim().toUpperCase(),
      cotas: parseFloat(cotas),
      precoMedio: parseFloat(precoMedio),
      precoAtual: parseFloat(precoAtual),
      ultimoDividendo: parseFloat(ultimoDividendo) || 0,
    };
    updateData(d => {
      if (editId) { d.fiis = d.fiis.map(f => f.id === editId ? fii : f); }
      else { d.fiis.push(fii); }
      return d;
    });
    setCodigo(""); setCotas(""); setPrecoMedio(""); setPrecoAtual(""); setUltimoDividendo("");
    setShowForm(false); setEditId(null);
  }

  function handleEdit(f) {
    setEditId(f.id); setCodigo(f.codigo); setCotas(String(f.cotas));
    setPrecoMedio(String(f.precoMedio)); setPrecoAtual(String(f.precoAtual));
    setUltimoDividendo(String(f.ultimoDividendo || ""));
    setShowForm(true);
  }

  function handleDelete(id) {
    if (!window.confirm("Apagar este FII?")) return;
    updateData(d => { d.fiis = d.fiis.filter(f => f.id !== id); return d; });
  }

  const totalPatrimonio = fiis.reduce((s, f) => s + f.cotas * f.precoAtual, 0);
  const totalInvestido  = fiis.reduce((s, f) => s + f.cotas * f.precoMedio, 0);
  const totalDividendos = fiis.reduce((s, f) => s + f.cotas * (f.ultimoDividendo || 0), 0);
  const lucro = totalPatrimonio - totalInvestido;

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Resumo da carteira</div>
        <div style={styles.metricGrid}>
          <MetricCard label="Patrimônio" value={fmtBRL(totalPatrimonio)} color="#BA7517" />
          <MetricCard label="Investido" value={fmtBRL(totalInvestido)} color="#185FA5" />
          <MetricCard label="Lucro/Prej." value={fmtBRL(lucro)} color={lucro >= 0 ? "#1D9E75" : "#E24B4A"} />
        </div>
        <div style={{ marginTop:8, padding:"10px 12px", background:"#FAEEDA", borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, color:"#BA7517", fontWeight:500 }}>💰 Dividendos estimados/mês</span>
          <span style={{ fontSize:15, fontWeight:700, color:"#BA7517" }}>{fmtBRL(totalDividendos)}</span>
        </div>
      </div>

      {fiis.map(f => {
        const patrimonio = f.cotas * f.precoAtual;
        const investido  = f.cotas * f.precoMedio;
        const lucro      = patrimonio - investido;
        const lucroP     = investido > 0 ? (lucro / investido * 100).toFixed(1) : 0;
        const dividendo  = f.cotas * (f.ultimoDividendo || 0);
        const yieldMes   = f.precoAtual > 0 && f.ultimoDividendo > 0
          ? ((f.ultimoDividendo / f.precoAtual) * 100).toFixed(2) : null;

        return (
          <div key={f.id} style={styles.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>{f.codigo}</div>
                <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{f.cotas} cotas</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button style={styles.btnSm} onClick={() => handleEdit(f)}>Editar</button>
                <button style={{ ...styles.btnSm, color:"#E24B4A", borderColor:"#E24B4A" }} onClick={() => handleDelete(f.id)}>✕</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div style={styles.miniCard}><div style={styles.miniLabel}>Patrimônio</div><div style={styles.miniValue}>{fmtBRL(patrimonio)}</div></div>
              <div style={styles.miniCard}><div style={styles.miniLabel}>Lucro/Prej.</div><div style={{ ...styles.miniValue, color: lucro>=0?"#1D9E75":"#E24B4A" }}>{fmtBRL(lucro)} ({lucroP}%)</div></div>
              <div style={styles.miniCard}><div style={styles.miniLabel}>Preço médio</div><div style={styles.miniValue}>{fmtBRL(f.precoMedio)}</div></div>
              <div style={styles.miniCard}><div style={styles.miniLabel}>Preço atual</div><div style={styles.miniValue}>{fmtBRL(f.precoAtual)}</div></div>
              <div style={styles.miniCard}><div style={styles.miniLabel}>Dividendo/mês</div><div style={{ ...styles.miniValue, color:"#BA7517" }}>{fmtBRL(dividendo)}</div></div>
              {yieldMes && <div style={styles.miniCard}><div style={styles.miniLabel}>Yield mensal</div><div style={{ ...styles.miniValue, color:"#BA7517" }}>{yieldMes}%</div></div>}
            </div>
          </div>
        );
      })}

      {showForm && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{editId ? "Editar FII" : "Adicionar FII"}</div>
          <div style={styles.formGrid}>
            <div style={{ ...styles.formGroup, gridColumn:"1/-1" }}>
              <label style={styles.label}>Código (ex: HGLG11)</label>
              <input style={styles.input} type="text" placeholder="XXXX11" maxLength={7} value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quantidade de cotas</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0" min="0" value={cotas} onChange={e => setCotas(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Preço médio (R$)</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={precoMedio} onChange={e => setPrecoMedio(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Preço atual (R$)</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={precoAtual} onChange={e => setPrecoAtual(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Último dividendo/cota (R$)</label>
              <input style={styles.input} type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={ultimoDividendo} onChange={e => setUltimoDividendo(e.target.value)} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button style={styles.btnPrimary} onClick={handleSave}>Salvar</button>
            <button style={{ ...styles.btnSm, flex:1 }} onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button style={{ ...styles.btnPrimary, marginTop:4 }} onClick={() => setShowForm(true)}>
          + Adicionar FII
        </button>
      )}
    </div>
  );
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
function Settings({ data, updateData }) {
  const [limitVal, setLimitVal] = useState(data.limit || "");

  function saveLimit() {
    const val = parseFloat(limitVal);
    if (!val || val <= 0) { alert("Digite um valor válido."); return; }
    updateData(d => { d.limit = val; return d; });
    alert("Limite salvo: " + fmt(val));
  }

  function clearAll() {
    if (!window.confirm("Tem certeza? Todos os dados serão apagados.")) return;
    updateData(() => defaultData());
    setLimitVal("");
  }

  return (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Configurações de alerta</div>
      <div style={styles.settingsRow}>
        <div>
          <div style={styles.settingsLabel}>Limite de gastos mensais</div>
          <div style={styles.settingsDesc}>Alerta quando saídas ultrapassarem esse valor</div>
        </div>
        <input style={{ ...styles.input, width:130 }} type="number" inputMode="decimal" placeholder="Ex: 2000" min="0" value={limitVal} onChange={e => setLimitVal(e.target.value)} />
      </div>
      <div style={styles.settingsRow}>
        <div>
          <div style={styles.settingsLabel}>Limite atual</div>
          <div style={styles.settingsDesc}>{data.limit ? `Definido em ${fmt(data.limit)}/mês` : "Nenhum limite definido"}</div>
        </div>
        <button style={styles.btnSm} onClick={saveLimit}>Salvar</button>
      </div>
      <div style={{ ...styles.settingsRow, borderBottom:"none" }}>
        <div>
          <div style={styles.settingsLabel}>Apagar todos os dados</div>
          <div style={styles.settingsDesc}>Remove tudo (não pode ser desfeito)</div>
        </div>
        <button style={{ ...styles.btnSm, color:"#E24B4A", borderColor:"#E24B4A" }} onClick={clearAll}>Apagar</button>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTES REUTILIZÁVEIS
// ============================================================
function MetricCard({ label, value, color }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
    </div>
  );
}

function TxItem({ tx, onDelete }) {
  const isIncome = tx.type === "income";
  return (
    <div style={styles.txItem}>
      <div style={{ ...styles.txDot, background: isIncome ? "#1D9E75" : "#E24B4A" }} />
      <div style={styles.txInfo}>
        <div style={styles.txCat}>{tx.category}</div>
        {tx.description && <div style={styles.txDesc}>{tx.description}</div>}
      </div>
      <div style={styles.txRight}>
        <div style={{ ...styles.txVal, color: isIncome ? "#1D9E75" : "#E24B4A" }}>
          {isIncome ? "+" : "−"} {fmt(tx.value)}
        </div>
        <div style={styles.txDate}>{tx.date.split("-").reverse().join("/")}</div>
      </div>
      {onDelete && <button onClick={onDelete} style={styles.txDel}>✕</button>}
    </div>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = {
  app: { maxWidth: 680, margin: "0 auto", padding: "16px 12px", fontFamily: "system-ui, sans-serif", fontSize: 14, color: "#1a1a1a", overflowX: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  appTitle: { fontSize: 22, fontWeight: 600 },
  appSub: { fontSize: 12, color: "#888", marginTop: 2 },
  badge: { fontSize: 11, background: "#f1f1f1", border: "0.5px solid #ddd", borderRadius: 8, padding: "4px 10px", color: "#888" },
  nav: { display: "flex", gap: 4, background: "#f5f5f5", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: 4, marginBottom: 16, overflowX: "auto" },
  navBtn: { flex: "0 0 auto", padding: "8px 10px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 500, color: "#888", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  navBtnActive: { background: "#fff", color: "#1a1a1a", border: "0.5px solid #e0e0e0" },
  navIcon: { fontSize: 15 },
  navLabel: { fontSize: 10, whiteSpace: "nowrap" },
  card: { background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 12 },
  metric: { background: "#f8f8f8", borderRadius: 8, padding: 10, textAlign: "center" },
  metricLabel: { fontSize: 10, color: "#888", marginBottom: 4 },
  metricValue: { fontSize: 13, fontWeight: 600 },
  miniCard: { background: "#f8f8f8", borderRadius: 8, padding: "8px 10px" },
  miniLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  miniValue: { fontSize: 13, fontWeight: 600, color: "#1a1a1a" },
  alertBar: { background: "#FAEEDA", border: "0.5px solid #BA7517", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#BA7517" },
  legend: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, fontSize: 12, color: "#888" },
  legendItem: { display: "flex", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2, display: "inline-block" },
  empty: { textAlign: "center", color: "#aaa", fontSize: 13, padding: 24 },
  formGroup: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: { fontSize: 12, color: "#888", fontWeight: 500 },
  input: { width: "100%", padding: "8px 10px", border: "0.5px solid #ddd", borderRadius: 8, background: "#fff", color: "#1a1a1a", fontSize: 13, fontFamily: "inherit", outline: "none" },
  typeToggle: { display: "flex", gap: 6 },
  typeBtn: { flex: 1, padding: 8, border: "0.5px solid #ddd", borderRadius: 8, background: "#fff", color: "#888", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  typeBtnIncome:  { background: "#E1F5EE", color: "#085041", borderColor: "#1D9E75" },
  typeBtnExpense: { background: "#FCEBEB", color: "#501313", borderColor: "#E24B4A" },
  btnPrimary: { width: "100%", padding: 10, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 4 },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  txItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 8, marginBottom: 6 },
  txDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txCat: { fontSize: 13, fontWeight: 500 },
  txDesc: { fontSize: 11, color: "#aaa" },
  txRight: { textAlign: "right", flexShrink: 0 },
  txVal: { fontSize: 14, fontWeight: 600 },
  txDate: { fontSize: 11, color: "#aaa" },
  txDel: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: 4 },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 8, marginBottom: 12 },
  catChip: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "8px 10px", background: "#f8f8f8", border: "0.5px solid #e0e0e0", borderRadius: 8 },
  catDel: { background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 },
  catAddRow: { display: "flex", gap: 8, marginTop: 4 },
  btnSm: { padding: "8px 14px", border: "0.5px solid #ddd", borderRadius: 8, background: "#fff", color: "#1a1a1a", cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" },
  settingsRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "0.5px solid #eee" },
  settingsLabel: { fontSize: 13, fontWeight: 500 },
  settingsDesc: { fontSize: 11, color: "#aaa", marginTop: 2 },
};
