import { useState, useEffect, useRef } from "react";

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
    limit: null
  };
}

function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

function fmt(n) {
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

  // Sempre que 'data' mudar, salva no localStorage
  useEffect(() => { saveData(data); }, [data]);

  function updateData(fn) {
    setData(prev => {
      const next = fn({ ...prev, transactions: [...prev.transactions], categories: [...prev.categories] });
      return next;
    });
  }

  const pages = ["dashboard","add","history","categories","settings"];
  const icons = ["▦","＋","☰","◈","⚙"];
  const labels = ["Dashboard","Registrar","Histórico","Categorias","Alertas"];

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <div style={styles.appTitle}>FinCheck</div>
          <div style={styles.appSub}>{monthLabel(currentMonthKey())}</div>
        </div>
        <div style={styles.badge}>MVP v1.0</div>
      </div>

      {/* NAV */}
      <nav style={styles.nav}>
        {pages.map((p, i) => (
          <button key={p} onClick={() => setPage(p)} style={{ ...styles.navBtn, ...(page === p ? styles.navBtnActive : {}) }}>
            <span style={styles.navIcon}>{icons[i]}</span>
            <span style={styles.navLabel}>{labels[i]}</span>
          </button>
        ))}
      </nav>

      {/* PÁGINAS */}
      {page === "dashboard"   && <Dashboard data={data} />}
      {page === "add"         && <AddTransaction data={data} updateData={updateData} />}
      {page === "history"     && <History data={data} updateData={updateData} />}
      {page === "categories"  && <Categories data={data} updateData={updateData} />}
      {page === "settings"    && <Settings data={data} updateData={updateData} />}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ data }) {
  const mk = currentMonthKey();
  const month = data.transactions.filter(t => monthKey(t.date) === mk);
  const income  = month.filter(t => t.type === "income").reduce((s, t) => s + t.value, 0);
  const expense = month.filter(t => t.type === "expense").reduce((s, t) => s + t.value, 0);
  const totalIn  = data.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.value, 0);
  const totalOut = data.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.value, 0);
  const saldo = totalIn - totalOut;
  const overLimit = data.limit && expense > data.limit;
  const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Dados do gráfico
  const expenses = month.filter(t => t.type === "expense");
  const byCategory = {};
  expenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.value; });
  const catLabels = Object.keys(byCategory);
  const catValues = Object.values(byCategory);
  const total = catValues.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* ALERTA */}
      {overLimit && (
        <div style={styles.alertBar}>
          ⚠ Atenção: limite de gastos do mês ultrapassado!
        </div>
      )}

      {/* MÉTRICAS */}
      <div style={styles.metricGrid}>
        <MetricCard label="Saldo atual" value={fmt(saldo)} color="#185FA5" />
        <MetricCard label="Entradas" value={fmt(income)} color="#1D9E75" />
        <MetricCard label="Saídas" value={fmt(expense)} color="#E24B4A" />
      </div>

      {/* GRÁFICO */}
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

      {/* ÚLTIMAS TRANSAÇÕES */}
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
// GRÁFICO DONUT (SVG puro, sem dependências)
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
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
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
    if (!val || val <= 0 || !date || !category) {
      alert("Preencha valor, data e categoria.");
      return;
    }
    updateData(d => {
      d.transactions.push({ id: Date.now(), type, value: val, date, category, description });
      return d;
    });
    setValue("");
    setDescription("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Nova transação</div>

      {/* TIPO */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Tipo</label>
        <div style={styles.typeToggle}>
          <button onClick={() => setType("income")} style={{ ...styles.typeBtn, ...(type === "income" ? styles.typeBtnIncome : {}) }}>+ Entrada</button>
          <button onClick={() => setType("expense")} style={{ ...styles.typeBtn, ...(type === "expense" ? styles.typeBtnExpense : {}) }}>− Saída</button>
        </div>
      </div>

      {/* GRID */}
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Valor (R$)</label>
          <input style={styles.input} type="number" placeholder="0,00" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} />
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
      {saved && <div style={{ textAlign: "center", fontSize: 12, marginTop: 8, color: "#1D9E75" }}>✓ Transação salva!</div>}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {txs.length === 0
          ? <div style={styles.empty}>Nenhuma transação encontrada.</div>
          : txs.map(t => <TxItem key={t.id} tx={t} onDelete={() => deleteTx(t.id)} />)
        }
      </div>
    </div>
  );
}

// ============================================================
// CATEGORIAS
// ============================================================
function Categories({ data, updateData }) {
  const [newCat, setNewCat] = useState("");

  function addCat() {
    const val = newCat.trim();
    if (!val || data.categories.includes(val)) return;
    updateData(d => { d.categories.push(val); return d; });
    setNewCat("");
  }

  function deleteCat(cat) {
    updateData(d => { d.categories = d.categories.filter(c => c !== cat); return d; });
  }

  return (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Categorias ativas</div>
      <div style={styles.catGrid}>
        {data.categories.map(c => (
          <div key={c} style={styles.catChip}>
            <span style={{ fontSize: 13 }}>{c}</span>
            <button onClick={() => deleteCat(c)} style={styles.catDel}>✕</button>
          </div>
        ))}
      </div>
      <div style={styles.catAddRow}>
        <input
          style={{ ...styles.input, flex: 1 }}
          type="text"
          placeholder="Nova categoria..."
          maxLength={30}
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCat()}
        />
        <button style={styles.btnSm} onClick={addCat}>Adicionar</button>
      </div>
    </div>
  );
}

// ============================================================
// CONFIGURAÇÕES / ALERTAS
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
        <input style={{ ...styles.input, width: 130 }} type="number" placeholder="Ex: 2000" min="0" value={limitVal} onChange={e => setLimitVal(e.target.value)} />
      </div>

      <div style={styles.settingsRow}>
        <div>
          <div style={styles.settingsLabel}>Limite atual</div>
          <div style={styles.settingsDesc}>{data.limit ? `Definido em ${fmt(data.limit)}/mês` : "Nenhum limite definido"}</div>
        </div>
        <button style={styles.btnSm} onClick={saveLimit}>Salvar</button>
      </div>

      <div style={{ ...styles.settingsRow, borderBottom: "none" }}>
        <div>
          <div style={styles.settingsLabel}>Apagar todos os dados</div>
          <div style={styles.settingsDesc}>Remove todas as transações (não pode ser desfeito)</div>
        </div>
        <button style={{ ...styles.btnSm, color: "#E24B4A", borderColor: "#E24B4A" }} onClick={clearAll}>Apagar</button>
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
      {onDelete && (
        <button onClick={onDelete} style={styles.txDel}>✕</button>
      )}
    </div>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = {
  app: { maxWidth: 680, margin: "0 auto", padding: "16px 12px", fontFamily: "system-ui, sans-serif", fontSize: 14, color: "#1a1a1a" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  appTitle: { fontSize: 22, fontWeight: 600 },
  appSub: { fontSize: 12, color: "#888", marginTop: 2 },
  badge: { fontSize: 11, background: "#f1f1f1", border: "0.5px solid #ddd", borderRadius: 8, padding: "4px 10px", color: "#888" },
  nav: { display: "flex", gap: 4, background: "#f5f5f5", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: 4, marginBottom: 16 },
  navBtn: { flex: 1, padding: "8px 4px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 500, color: "#888", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all .15s" },
  navBtnActive: { background: "#fff", color: "#1a1a1a", border: "0.5px solid #e0e0e0" },
  navIcon: { fontSize: 15 },
  navLabel: { fontSize: 10 },
  card: { background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 12 },
  metric: { background: "#f8f8f8", borderRadius: 8, padding: 12, textAlign: "center" },
  metricLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: 600 },
  alertBar: { background: "#FAEEDA", border: "0.5px solid #BA7517", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#BA7517", display: "flex", alignItems: "center", gap: 8 },
  legend: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, fontSize: 12, color: "#888" },
  legendItem: { display: "flex", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2, display: "inline-block" },
  empty: { textAlign: "center", color: "#aaa", fontSize: 13, padding: 24 },
  formGroup: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: { fontSize: 12, color: "#888", fontWeight: 500 },
  input: { width: "100%", padding: "8px 10px", border: "0.5px solid #ddd", borderRadius: 8, background: "#fff", color: "#1a1a1a", fontSize: 13, fontFamily: "inherit", outline: "none" },
  typeToggle: { display: "flex", gap: 6 },
  typeBtn: { flex: 1, padding: 8, border: "0.5px solid #ddd", borderRadius: 8, background: "#fff", color: "#888", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all .15s" },
  typeBtnIncome: { background: "#E1F5EE", color: "#085041", borderColor: "#1D9E75" },
  typeBtnExpense: { background: "#FCEBEB", color: "#501313", borderColor: "#E24B4A" },
  btnPrimary: { width: "100%", padding: 10, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 10 },
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
