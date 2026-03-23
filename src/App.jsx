import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const STORAGE_KEY = "licitaflow_v4_dados";

const licitacoesExemplo = [
  {
    id: "LIC-001",
    numero: "Modelo de Teste",
    objeto: "Protótipo inicial do sistema",
    status: "Ativa",
  },
];

function numero(v) {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || v === "") return 0;
  const textoNumero = String(v).replace(/\./g, "").replace(",", ".").trim();
  const n = Number(textoNumero);
  return Number.isNaN(n) ? 0 : n;
}

function texto(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function recalcularItem(item) {
  const qtdLicitada = Number(item.qtdLicitada || 0);
  const valorUnitario = Number(item.valorUnitario || 0);
  const qtdUtilizada = Number(item.qtdUtilizada || 0);

  const saldoQtd = Math.max(qtdLicitada - qtdUtilizada, 0);
  const totalContratado = qtdLicitada * valorUnitario;
  const valorSaldo = saldoQtd * valorUnitario;
  const percentualSaldo = qtdLicitada > 0 ? (saldoQtd * 100) / qtdLicitada : 0;

  let situacao = "OK";
  if (saldoQtd <= 0) situacao = "ESGOTADO";
  else if (percentualSaldo <= 15) situacao = "ALERTA";

  return {
    ...item,
    qtdLicitada,
    valorUnitario,
    qtdUtilizada,
    saldoQtd,
    totalContratado,
    valorSaldo,
    percentualSaldo,
    situacao,
  };
}

const itensExemplo = [
  recalcularItem({
    id: "1",
    licitacaoId: "LIC-001",
    fornecedor: "CREDENCIAMENTO",
    codigo: 1,
    nome: "ARROZ TIPO 1",
    unidade: "FD",
    marca: "",
    qtdLicitada: 100,
    valorUnitario: 25,
    qtdUtilizada: 10,
  }),
  recalcularItem({
    id: "2",
    licitacaoId: "LIC-001",
    fornecedor: "CREDENCIAMENTO",
    codigo: 2,
    nome: "FEIJÃO CARIOCA",
    unidade: "FD",
    marca: "",
    qtdLicitada: 80,
    valorUnitario: 12,
    qtdUtilizada: 5,
  }),
];

function baixarArquivo(workbook, nome) {
  XLSX.writeFile(workbook, nome);
}

export default function App() {
  const [carregado, setCarregado] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState("dashboard");
  const [licitacoes, setLicitacoes] = useState(licitacoesExemplo);
  const [itens, setItens] = useState(itensExemplo);
  const [movimentos, setMovimentos] = useState([]);

  const [licitacaoSelecionada, setLicitacaoSelecionada] = useState("LIC-001");
  const [fornecedorBaixa, setFornecedorBaixa] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [busca, setBusca] = useState("");
  const [quantidades, setQuantidades] = useState({});
  const [mensagem, setMensagem] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [filtroHistoricoFornecedor, setFiltroHistoricoFornecedor] = useState("Todos");

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      try {
        const dados = JSON.parse(salvo);
        if (dados.licitacoes?.length) setLicitacoes(dados.licitacoes);
        if (dados.itens?.length) setItens(dados.itens.map(recalcularItem));
        if (dados.movimentos) setMovimentos(dados.movimentos);
        if (typeof dados.licitacaoSelecionada === "string") {
          setLicitacaoSelecionada(dados.licitacaoSelecionada);
        }
        if (typeof dados.fornecedorBaixa === "string") {
          setFornecedorBaixa(dados.fornecedorBaixa);
        }
        if (typeof dados.nomeArquivo === "string") {
          setNomeArquivo(dados.nomeArquivo);
        }
      } catch (e) {
        console.error("Erro ao carregar dados locais", e);
      }
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        licitacoes,
        itens,
        movimentos,
        licitacaoSelecionada,
        fornecedorBaixa,
        nomeArquivo,
      })
    );
  }, [
    carregado,
    licitacoes,
    itens,
    movimentos,
    licitacaoSelecionada,
    fornecedorBaixa,
    nomeArquivo,
  ]);

  const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));

  const licitacaoAtual = licitacoes.find((licitacao) => licitacao.id === licitacaoSelecionada);

  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const bateLicitacao = item.licitacaoId === licitacaoSelecionada;
      const termo = busca.toLowerCase();
      const bateBusca =
        item.nome.toLowerCase().includes(termo) ||
        String(item.codigo).toLowerCase().includes(termo);

      return bateLicitacao && bateBusca;
    });
  }, [itens, licitacaoSelecionada, busca]);

  const totalLicitado = itens.reduce(
    (soma, item) => soma + Number(item.totalContratado || 0),
    0
  );

  const totalSaldo = itens.reduce(
    (soma, item) => soma + Number(item.valorSaldo || 0),
    0
  );

  const totalUtilizado = totalLicitado - totalSaldo;

  const itensComAlerta = itens.filter(
    (item) => Number(item.saldoQtd || 0) <= Math.max(30, Number(item.qtdLicitada || 0) * 0.15)
  );

  const fornecedoresHistorico = useMemo(() => {
    return [...new Set(movimentos.map((mov) => mov.fornecedor).filter(Boolean))];
  }, [movimentos]);

  const movimentosFiltrados = useMemo(() => {
    if (filtroHistoricoFornecedor === "Todos") return movimentos;
    return movimentos.filter((mov) => mov.fornecedor === filtroHistoricoFornecedor);
  }, [movimentos, filtroHistoricoFornecedor]);

  async function importarPlanilha(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      setMensagem("Lendo planilha...");
      setNomeArquivo(arquivo.name);
      setMovimentos([]);
      setQuantidades({});
      setNotaFiscal("");
      setBusca("");
      setFornecedorBaixa("");
      setFiltroHistoricoFornecedor("Todos");

      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const nomeAba = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[nomeAba];

      const linhas = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true,
        defval: "",
      });

      const indiceCabecalho = linhas.findIndex((linha) => {
        const a = texto(linha[0]).toUpperCase();
        const b = texto(linha[1]).toUpperCase();
        const c = texto(linha[2]).toUpperCase();
        return a.includes("ÍTEM") && b.includes("FORNECEDOR") && c.includes("DESCRIÇÃO");
      });

      if (indiceCabecalho === -1) {
        setMensagem("Não encontrei a tabela principal da planilha.");
        event.target.value = "";
        return;
      }

      const linhasDados = linhas.slice(indiceCabecalho + 1);
      const idLicitacao = `LIC-${Date.now()}`;
      const descricaoTopo = texto(linhas[2]?.[0]) || `Importado de ${arquivo.name}`;

      const itensImportados = linhasDados
        .map((linha, index) => {
          const codigo = linha[0];
          const nome = texto(linha[2]);
          const unidade = texto(linha[3]);
          const qtdLicitada = numero(linha[4]);
          const valorUnitario = numero(linha[5]);
          const marca = texto(linha[6]);
          const qtdUtilizada = numero(linha[10]);

          if (!codigo && !nome) return null;
          if (!nome) return null;
          if (!qtdLicitada && !valorUnitario) return null;

          return recalcularItem({
            id: `${Date.now()}-${index}`,
            licitacaoId: idLicitacao,
            fornecedor: "CREDENCIAMENTO",
            codigo: codigo || index + 1,
            nome,
            unidade,
            marca,
            qtdLicitada,
            valorUnitario,
            qtdUtilizada,
          });
        })
        .filter(Boolean);

      if (!itensImportados.length) {
        setMensagem("A planilha foi lida, mas nenhum item válido foi encontrado.");
        event.target.value = "";
        return;
      }

      const novaLicitacao = {
        id: idLicitacao,
        numero: arquivo.name.replace(/\.[^.]+$/, ""),
        objeto: descricaoTopo,
        status: "Importada",
      };

      setLicitacoes([novaLicitacao]);
      setItens(itensImportados);
      setMovimentos([]);
      setLicitacaoSelecionada(idLicitacao);
      setFornecedorBaixa("");
      setQuantidades({});
      setBusca("");
      setFiltroHistoricoFornecedor("Todos");
      setMensagem(`Planilha importada com sucesso. ${itensImportados.length} itens carregados.`);
      setAbaAtiva("baixa");
      event.target.value = "";
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao importar a planilha.");
      event.target.value = "";
    }
  }

  function confirmarBaixa() {
    if (!fornecedorBaixa.trim()) {
      setMensagem("Informe o fornecedor da baixa.");
      return;
    }

    const selecionados = itensFiltrados.filter(
      (item) => Number(quantidades[item.id] || 0) > 0
    );

    if (selecionados.length === 0) {
      setMensagem("Informe ao menos uma quantidade para baixar.");
      return;
    }

    const invalido = selecionados.find(
      (item) => Number(quantidades[item.id]) > Number(item.saldoQtd || 0)
    );

    if (invalido) {
      setMensagem(`A quantidade informada para "${invalido.nome}" é maior que o saldo disponível.`);
      return;
    }

    const dataHoje = new Date().toLocaleDateString("pt-BR");

    setItens((listaAtual) =>
      listaAtual.map((item) => {
        const qtd = Number(quantidades[item.id] || 0);
        if (!qtd) return item;

        return recalcularItem({
          ...item,
          qtdUtilizada: Number(item.qtdUtilizada || 0) + qtd,
        });
      })
    );

    const novosMovimentos = selecionados.map((item, index) => ({
      id: `${Date.now()}-${index}`,
      data: dataHoje,
      fornecedor: fornecedorBaixa,
      licitacao: licitacaoAtual ? licitacaoAtual.numero : "",
      codigo: item.codigo,
      item: item.nome,
      quantidade: Number(quantidades[item.id]),
      valorUnitario: Number(item.valorUnitario || 0),
      valorTotal: Number(quantidades[item.id]) * Number(item.valorUnitario || 0),
      usuario: "Operador",
      observacao: notaFiscal ? `NF ${notaFiscal}` : "Baixa manual",
    }));

    setMovimentos((listaAtual) => [...novosMovimentos.reverse(), ...listaAtual]);
    setQuantidades({});
    setMensagem("Baixa em lote realizada com sucesso.");
    setAbaAtiva("historico");
  }

  function exportarSaldoAtualizado() {
    const dados = itens.map((item) => ({
      "ÍTEM": item.codigo,
      "FORNECEDOR": "CREDENCIAMENTO",
      "DESCRIÇÃO DO PRODUTO": item.nome,
      "APRESENT": item.unidade,
      "QT": item.qtdLicitada,
      "P. FINAL": item.valorUnitario,
      "MARCA": item.marca,
      "TOTAL": item.totalContratado,
      "SALDO": item.saldoQtd,
      "VALOR": item.valorSaldo,
      "QTD UT": item.qtdUtilizada,
      "%": Number(item.percentualSaldo.toFixed(2)),
      "SIT": item.situacao,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saldo Atualizado");
    baixarArquivo(wb, "saldo-atualizado.xlsx");
  }

  function exportarHistorico() {
    const dados = movimentos.map((mov) => ({
      Data: mov.data,
      Fornecedor: mov.fornecedor,
      Licitação: mov.licitacao,
      Código: mov.codigo,
      Item: mov.item,
      Quantidade: mov.quantidade,
      "Valor Unitário": mov.valorUnitario,
      "Valor Total": mov.valorTotal,
      Usuário: mov.usuario,
      Observação: mov.observacao,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historico");
    baixarArquivo(wb, "historico-baixas.xlsx");
  }

  function limparBaseAtual() {
    const confirmar = window.confirm(
      "Isso vai apagar a planilha importada, o histórico e os saldos salvos neste navegador. Deseja continuar?"
    );

    if (!confirmar) return;

    setLicitacoes([]);
    setItens([]);
    setMovimentos([]);
    setLicitacaoSelecionada("");
    setFornecedorBaixa("");
    setNotaFiscal("");
    setBusca("");
    setQuantidades({});
    setNomeArquivo("");
    setFiltroHistoricoFornecedor("Todos");
    localStorage.removeItem(STORAGE_KEY);
    setMensagem("Base atual removida com sucesso.");
    setAbaAtiva("importacao");
  }

  function restaurarModelo() {
    setLicitacoes(licitacoesExemplo);
    setItens(itensExemplo);
    setMovimentos([]);
    setLicitacaoSelecionada("LIC-001");
    setFornecedorBaixa("");
    setNotaFiscal("");
    setBusca("");
    setQuantidades({});
    setNomeArquivo("");
    setFiltroHistoricoFornecedor("Todos");
    setMensagem("Modelo de teste restaurado.");
    localStorage.removeItem(STORAGE_KEY);
    setAbaAtiva("dashboard");
  }

  const estilos = {
    app: {
      minHeight: "100vh",
      background: "#f4f7fb",
      color: "#1f2937",
      fontFamily: "Arial, sans-serif",
    },
    layout: {
      display: "flex",
      minHeight: "100vh",
      flexWrap: "wrap",
    },
    sidebar: {
      width: "260px",
      background: "#ffffff",
      borderRight: "1px solid #e5e7eb",
      padding: "20px",
      boxSizing: "border-box",
    },
    logo: {
      fontSize: "26px",
      fontWeight: "bold",
      color: "#1d4ed8",
      marginBottom: "4px",
    },
    subtitulo: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "18px",
    },
    menuBotao: {
      width: "100%",
      padding: "12px 14px",
      marginBottom: "10px",
      borderRadius: "10px",
      border: "none",
      cursor: "pointer",
      textAlign: "left",
      fontSize: "15px",
      fontWeight: "bold",
      background: "#eef2ff",
      color: "#1e3a8a",
    },
    menuBotaoAtivo: {
      background: "#2563eb",
      color: "#ffffff",
    },
    principal: {
      flex: 1,
      padding: "24px",
      minWidth: "320px",
      boxSizing: "border-box",
    },
    topo: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "10px",
      marginBottom: "20px",
    },
    titulo: {
      margin: 0,
      fontSize: "30px",
    },
    badge: {
      background: "#dbeafe",
      color: "#1d4ed8",
      padding: "8px 14px",
      borderRadius: "999px",
      fontWeight: "bold",
      fontSize: "13px",
    },
    alerta: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1e40af",
      padding: "14px",
      borderRadius: "12px",
      marginBottom: "20px",
      fontWeight: "bold",
    },
    gradeCards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },
    card: {
      background: "#ffffff",
      borderRadius: "16px",
      padding: "18px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      border: "1px solid #e5e7eb",
      boxSizing: "border-box",
    },
    cardTitulo: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "10px",
      fontWeight: "bold",
    },
    cardValor: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#111827",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "20px",
    },
    gridBaixa: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "20px",
    },
    formularioGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "14px",
    },
    label: {
      display: "block",
      marginBottom: "6px",
      fontSize: "14px",
      fontWeight: "bold",
    },
    input: {
      width: "100%",
      padding: "10px",
      borderRadius: "10px",
      border: "1px solid #cbd5e1",
      boxSizing: "border-box",
      fontSize: "14px",
    },
    tabelaWrap: {
      overflowX: "auto",
    },
    tabela: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "700px",
    },
    th: {
      textAlign: "left",
      background: "#eff6ff",
      color: "#1e3a8a",
      padding: "12px",
      fontSize: "14px",
      borderBottom: "1px solid #dbeafe",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #e5e7eb",
      fontSize: "14px",
      verticalAlign: "top",
    },
    botaoPrimario: {
      width: "100%",
      background: "#2563eb",
      color: "#ffffff",
      border: "none",
      padding: "12px",
      borderRadius: "12px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "15px",
      marginTop: "10px",
    },
    botaoSecundario: {
      background: "#ffffff",
      color: "#1d4ed8",
      border: "1px solid #93c5fd",
      padding: "10px 12px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "bold",
    },
    caixaAlerta: {
      border: "1px solid #fde68a",
      background: "#fffbeb",
      color: "#92400e",
      padding: "12px",
      borderRadius: "12px",
      marginTop: "20px",
      fontSize: "14px",
      lineHeight: 1.5,
    },
    barraAcoes: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      marginTop: "14px",
    },
  };

  return (
    <div style={estilos.app}>
      <div style={estilos.layout}>
        <aside style={estilos.sidebar}>
          <div style={estilos.logo}>LicitaFlow</div>
          <div style={estilos.subtitulo}>Baixa rápida com credenciamento</div>

          <button
            style={{
              ...estilos.menuBotao,
              ...(abaAtiva === "dashboard" ? estilos.menuBotaoAtivo : {}),
            }}
            onClick={() => setAbaAtiva("dashboard")}
          >
            Dashboard
          </button>

          <button
            style={{
              ...estilos.menuBotao,
              ...(abaAtiva === "importacao" ? estilos.menuBotaoAtivo : {}),
            }}
            onClick={() => setAbaAtiva("importacao")}
          >
            Importar planilha
          </button>

          <button
            style={{
              ...estilos.menuBotao,
              ...(abaAtiva === "baixa" ? estilos.menuBotaoAtivo : {}),
            }}
            onClick={() => setAbaAtiva("baixa")}
          >
            Nova baixa
          </button>

          <button
            style={{
              ...estilos.menuBotao,
              ...(abaAtiva === "historico" ? estilos.menuBotaoAtivo : {}),
            }}
            onClick={() => setAbaAtiva("historico")}
          >
            Histórico
          </button>

          <button
            style={{
              ...estilos.menuBotao,
              ...(abaAtiva === "relatorios" ? estilos.menuBotaoAtivo : {}),
            }}
            onClick={() => setAbaAtiva("relatorios")}
          >
            Relatórios
          </button>

          <div style={estilos.caixaAlerta}>
            <strong>Foco atual:</strong>
            <br />
            importar a planilha real, localizar item rápido, informar o fornecedor da entrega e dar baixa em lote.
          </div>

          <div style={estilos.barraAcoes}>
            <button style={estilos.botaoSecundario} onClick={restaurarModelo}>
              Restaurar modelo
            </button>

            <button style={estilos.botaoSecundario} onClick={limparBaseAtual}>
              Limpar base atual
            </button>
          </div>
        </aside>

        <main style={estilos.principal}>
          <div style={estilos.topo}>
            <div>
              <h1 style={estilos.titulo}>Sistema de controle de licitação</h1>
              <div style={{ color: "#6b7280", marginTop: "6px" }}>
                {nomeArquivo
                  ? `Planilha ativa: ${nomeArquivo}`
                  : "Protótipo funcional com importação real."}
              </div>
            </div>
            <div style={estilos.badge}>Ambiente de teste</div>
          </div>

          {mensagem && <div style={estilos.alerta}>{mensagem}</div>}

          {abaAtiva === "dashboard" && (
            <>
              <div style={estilos.gradeCards}>
                <div style={estilos.card}>
                  <div style={estilos.cardTitulo}>Total licitado</div>
                  <div style={estilos.cardValor}>{formatarMoeda(totalLicitado)}</div>
                </div>

                <div style={estilos.card}>
                  <div style={estilos.cardTitulo}>Total utilizado</div>
                  <div style={estilos.cardValor}>{formatarMoeda(totalUtilizado)}</div>
                </div>

                <div style={estilos.card}>
                  <div style={estilos.cardTitulo}>Saldo atual</div>
                  <div style={estilos.cardValor}>{formatarMoeda(totalSaldo)}</div>
                </div>

                <div style={estilos.card}>
                  <div style={estilos.cardTitulo}>Itens em alerta</div>
                  <div style={estilos.cardValor}>{itensComAlerta.length}</div>
                </div>
              </div>

              <div style={estilos.grid2}>
                <div style={estilos.card}>
                  <h3 style={{ marginTop: 0 }}>Licitações ativas</h3>

                  <div style={estilos.tabelaWrap}>
                    <table style={estilos.tabela}>
                      <thead>
                        <tr>
                          <th style={estilos.th}>Número</th>
                          <th style={estilos.th}>Objeto</th>
                          <th style={estilos.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {licitacoes.length === 0 ? (
                          <tr>
                            <td style={estilos.td} colSpan="3">
                              Nenhuma base carregada.
                            </td>
                          </tr>
                        ) : (
                          licitacoes.map((licitacao) => (
                            <tr key={licitacao.id}>
                              <td style={estilos.td}>{licitacao.numero}</td>
                              <td style={estilos.td}>{licitacao.objeto}</td>
                              <td style={estilos.td}>{licitacao.status}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={estilos.barraAcoes}>
                    <button style={estilos.botaoSecundario} onClick={exportarSaldoAtualizado}>
                      Exportar saldo
                    </button>
                    <button style={estilos.botaoSecundario} onClick={exportarHistorico}>
                      Exportar histórico
                    </button>
                  </div>
                </div>

                <div style={estilos.card}>
                  <h3 style={{ marginTop: 0 }}>Alertas de saldo</h3>
                  {itensComAlerta.length === 0 ? (
                    <div>Nenhum alerta no momento.</div>
                  ) : (
                    itensComAlerta.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "12px",
                          marginBottom: "10px",
                        }}
                      >
                        <strong>{item.nome}</strong>
                        <div style={{ color: "#6b7280", marginTop: "4px" }}>
                          Código: {item.codigo}
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          Saldo: {item.saldoQtd} {item.unidade}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {abaAtiva === "importacao" && (
            <div style={estilos.grid2}>
              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Importar planilha Excel</h3>

                <div
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "16px",
                    padding: "30px",
                    textAlign: "center",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    Selecione a planilha real do setor
                  </div>

                  <div style={{ color: "#6b7280", marginBottom: "15px" }}>
                    O sistema vai ler a tabela principal da aba.
                  </div>

                  <input type="file" accept=".xlsx,.xls" onChange={importarPlanilha} />

                  <div style={{ marginTop: "15px", color: "#2563eb" }}>
                    {nomeArquivo ? `Arquivo selecionado: ${nomeArquivo}` : ""}
                  </div>
                </div>

                <div style={estilos.caixaAlerta}>
                  Essa versão lê a tabela principal com colunas como:
                  <br />
                  ÍTEM, FORNECEDOR, DESCRIÇÃO, APRESENT, QT, P. FINAL, SALDO, VALOR, QTD UT e SIT.
                </div>
              </div>

              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Como está funcionando agora</h3>
                <p>1. O item pertence ao credenciamento, não a um fornecedor específico.</p>
                <p>2. O fornecedor é informado na hora da baixa.</p>
                <p>3. O histórico registra quem forneceu cada movimentação.</p>
                <p>4. O saldo do item continua único e centralizado.</p>
              </div>
            </div>
          )}

          {abaAtiva === "baixa" && (
            <>
              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Nova baixa em lote</h3>

                <div style={estilos.formularioGrid}>
                  <div>
                    <label style={estilos.label}>Licitação</label>
                    <select
                      style={estilos.input}
                      value={licitacaoSelecionada}
                      onChange={(e) => {
                        setLicitacaoSelecionada(e.target.value);
                        setFornecedorBaixa("");
                      }}
                    >
                      {licitacoes.map((licitacao) => (
                        <option key={licitacao.id} value={licitacao.id}>
                          {licitacao.numero}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={estilos.label}>Fornecedor da baixa</label>
                    <input
                      style={estilos.input}
                      value={fornecedorBaixa}
                      onChange={(e) => setFornecedorBaixa(e.target.value)}
                      placeholder="Digite o fornecedor da NF/entrega"
                    />
                  </div>

                  <div>
                    <label style={estilos.label}>Nota fiscal</label>
                    <input
                      style={estilos.input}
                      value={notaFiscal}
                      onChange={(e) => setNotaFiscal(e.target.value)}
                      placeholder="Ex.: 12345"
                    />
                  </div>

                  <div>
                    <label style={estilos.label}>Buscar item</label>
                    <input
                      style={estilos.input}
                      placeholder="Nome ou código"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ ...estilos.gridBaixa, marginTop: "20px" }}>
                <div style={estilos.card}>
                  <h3 style={{ marginTop: 0 }}>Itens disponíveis para baixa</h3>

                  <div style={estilos.tabelaWrap}>
                    <table style={estilos.tabela}>
                      <thead>
                        <tr>
                          <th style={estilos.th}>Código</th>
                          <th style={estilos.th}>Item</th>
                          <th style={estilos.th}>QT</th>
                          <th style={estilos.th}>QTD UT</th>
                          <th style={estilos.th}>Saldo</th>
                          <th style={estilos.th}>Valor unit.</th>
                          <th style={estilos.th}>Qtd. a baixar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensFiltrados.length === 0 ? (
                          <tr>
                            <td style={estilos.td} colSpan="7">
                              Nenhum item encontrado para essa busca/licitação.
                            </td>
                          </tr>
                        ) : (
                          itensFiltrados.map((item) => (
                            <tr key={item.id}>
                              <td style={estilos.td}>{item.codigo}</td>
                              <td style={estilos.td}>
                                <strong>{item.nome}</strong>
                                <br />
                                <span style={{ color: "#6b7280" }}>
                                  {item.unidade} {item.marca ? `| ${item.marca}` : ""}
                                </span>
                              </td>
                              <td style={estilos.td}>{item.qtdLicitada}</td>
                              <td style={estilos.td}>{item.qtdUtilizada}</td>
                              <td style={estilos.td}>{item.saldoQtd}</td>
                              <td style={estilos.td}>{formatarMoeda(item.valorUnitario)}</td>
                              <td style={estilos.td}>
                                <input
                                  style={estilos.input}
                                  type="number"
                                  min="0"
                                  max={item.saldoQtd}
                                  value={quantidades[item.id] || ""}
                                  onChange={(e) =>
                                    setQuantidades((atual) => ({
                                      ...atual,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={estilos.card}>
                  <h3 style={{ marginTop: 0 }}>Resumo da operação</h3>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ color: "#6b7280", marginBottom: "6px" }}>
                      Itens selecionados
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold" }}>
                      {
                        itensFiltrados.filter(
                          (item) => Number(quantidades[item.id] || 0) > 0
                        ).length
                      }
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ color: "#6b7280", marginBottom: "6px" }}>
                      Valor estimado da baixa
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold" }}>
                      {formatarMoeda(
                        itensFiltrados.reduce((soma, item) => {
                          return (
                            soma +
                            Number(quantidades[item.id] || 0) * Number(item.valorUnitario || 0)
                          );
                        }, 0)
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "12px",
                      color: "#4b5563",
                      fontSize: "14px",
                      lineHeight: 1.5,
                    }}
                  >
                    O fornecedor digitado aqui será salvo no histórico da baixa. O saldo continua sendo do item, porque é credenciamento.
                  </div>

                  <button style={estilos.botaoPrimario} onClick={confirmarBaixa}>
                    Confirmar baixa
                  </button>
                </div>
              </div>
            </>
          )}

          {abaAtiva === "historico" && (
            <div style={estilos.card}>
              <h3 style={{ marginTop: 0 }}>Histórico de movimentações</h3>

              <div style={estilos.barraAcoes}>
                <select
                  style={{ ...estilos.input, maxWidth: "260px" }}
                  value={filtroHistoricoFornecedor}
                  onChange={(e) => setFiltroHistoricoFornecedor(e.target.value)}
                >
                  <option value="Todos">Todos os fornecedores</option>
                  {fornecedoresHistorico.map((fornecedor) => (
                    <option key={fornecedor} value={fornecedor}>
                      {fornecedor}
                    </option>
                  ))}
                </select>

                <button style={estilos.botaoSecundario} onClick={exportarHistorico}>
                  Exportar histórico
                </button>
              </div>

              <div style={estilos.tabelaWrap}>
                <table style={estilos.tabela}>
                  <thead>
                    <tr>
                      <th style={estilos.th}>Data</th>
                      <th style={estilos.th}>Fornecedor</th>
                      <th style={estilos.th}>Licitação</th>
                      <th style={estilos.th}>Código</th>
                      <th style={estilos.th}>Item</th>
                      <th style={estilos.th}>Quantidade</th>
                      <th style={estilos.th}>Valor total</th>
                      <th style={estilos.th}>Usuário</th>
                      <th style={estilos.th}>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentosFiltrados.length === 0 ? (
                      <tr>
                        <td style={estilos.td} colSpan="9">
                          Nenhuma baixa registrada ainda.
                        </td>
                      </tr>
                    ) : (
                      movimentosFiltrados.map((mov) => (
                        <tr key={mov.id}>
                          <td style={estilos.td}>{mov.data}</td>
                          <td style={estilos.td}>{mov.fornecedor}</td>
                          <td style={estilos.td}>{mov.licitacao}</td>
                          <td style={estilos.td}>{mov.codigo}</td>
                          <td style={estilos.td}>{mov.item}</td>
                          <td style={estilos.td}>{mov.quantidade}</td>
                          <td style={estilos.td}>{formatarMoeda(mov.valorTotal)}</td>
                          <td style={estilos.td}>{mov.usuario}</td>
                          <td style={estilos.td}>{mov.observacao}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {abaAtiva === "relatorios" && (
            <div style={estilos.grid2}>
              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Exportação</h3>

                <div style={estilos.barraAcoes}>
                  <button style={estilos.botaoSecundario} onClick={exportarSaldoAtualizado}>
                    Exportar saldo atualizado
                  </button>

                  <button style={estilos.botaoSecundario} onClick={exportarHistorico}>
                    Exportar histórico
                  </button>
                </div>

                <div style={estilos.caixaAlerta}>
                  No credenciamento, o saldo é centralizado por item. O fornecedor fica registrado em cada baixa no histórico.
                </div>
              </div>

              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Saldo por item</h3>

                <div style={estilos.tabelaWrap}>
                  <table style={estilos.tabela}>
                    <thead>
                      <tr>
                        <th style={estilos.th}>Código</th>
                        <th style={estilos.th}>Item</th>
                        <th style={estilos.th}>QT</th>
                        <th style={estilos.th}>QTD UT</th>
                        <th style={estilos.th}>Saldo</th>
                        <th style={estilos.th}>Saldo financeiro</th>
                        <th style={estilos.th}>SIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.length === 0 ? (
                        <tr>
                          <td style={estilos.td} colSpan="7">
                            Nenhum item carregado.
                          </td>
                        </tr>
                      ) : (
                        itens.map((item) => (
                          <tr key={item.id}>
                            <td style={estilos.td}>{item.codigo}</td>
                            <td style={estilos.td}>{item.nome}</td>
                            <td style={estilos.td}>{item.qtdLicitada}</td>
                            <td style={estilos.td}>{item.qtdUtilizada}</td>
                            <td style={estilos.td}>{item.saldoQtd}</td>
                            <td style={estilos.td}>{formatarMoeda(item.valorSaldo)}</td>
                            <td style={estilos.td}>{item.situacao}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}