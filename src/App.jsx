import { useMemo, useState } from "react";

export default function App() {
  const licitacoesIniciais = [
    {
      id: "LIC-001",
      numero: "Pregão 025/2026",
      objeto: "Aquisição de medicamentos e materiais hospitalares",
      fornecedor: "Total Med",
      status: "Ativa",
    },
    {
      id: "LIC-002",
      numero: "Pregão 018/2026",
      objeto: "Aquisição de materiais de expediente",
      fornecedor: "Farma Vida",
      status: "Ativa",
    },
  ];

  const itensIniciais = [
    {
      id: 1,
      licitacaoId: "LIC-001",
      fornecedor: "Total Med",
      codigo: "MED-001",
      nome: "Dipirona 500mg",
      unidade: "Cx",
      qtdLicitada: 1500,
      valorUnitario: 12.0,
      saldoQtd: 1000,
    },
    {
      id: 2,
      licitacaoId: "LIC-001",
      fornecedor: "Total Med",
      codigo: "MED-002",
      nome: "Soro 500ml",
      unidade: "Und",
      qtdLicitada: 600,
      valorUnitario: 1.5,
      saldoQtd: 300,
    },
    {
      id: 3,
      licitacaoId: "LIC-001",
      fornecedor: "Total Med",
      codigo: "MAT-010",
      nome: "Luva Cirúrgica",
      unidade: "Cx",
      qtdLicitada: 1200,
      valorUnitario: 3.0,
      saldoQtd: 800,
    },
    {
      id: 4,
      licitacaoId: "LIC-002",
      fornecedor: "Farma Vida",
      codigo: "EXP-004",
      nome: "Papel A4",
      unidade: "Resma",
      qtdLicitada: 400,
      valorUnitario: 28.0,
      saldoQtd: 145,
    },
    {
      id: 5,
      licitacaoId: "LIC-002",
      fornecedor: "Farma Vida",
      codigo: "EXP-011",
      nome: "Caneta Azul",
      unidade: "Cx",
      qtdLicitada: 200,
      valorUnitario: 39.0,
      saldoQtd: 35,
    },
  ];

  const movimentosIniciais = [
    {
      id: 1,
      data: "23/03/2026",
      fornecedor: "Total Med",
      licitacao: "Pregão 025/2026",
      item: "Dipirona 500mg",
      quantidade: 100,
      usuario: "Operador",
      observacao: "Baixa inicial",
    },
    {
      id: 2,
      data: "23/03/2026",
      fornecedor: "Farma Vida",
      licitacao: "Pregão 018/2026",
      item: "Papel A4",
      quantidade: 40,
      usuario: "Operador",
      observacao: "NF 000123",
    },
  ];

  const [abaAtiva, setAbaAtiva] = useState("dashboard");
  const [licitacoes] = useState(licitacoesIniciais);
  const [itens, setItens] = useState(itensIniciais);
  const [movimentos, setMovimentos] = useState(movimentosIniciais);

  const [licitacaoSelecionada, setLicitacaoSelecionada] = useState("LIC-001");
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState("Total Med");
  const [notaFiscal, setNotaFiscal] = useState("000145");
  const [busca, setBusca] = useState("");
  const [quantidades, setQuantidades] = useState({});
  const [mensagem, setMensagem] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [filtroFornecedor, setFiltroFornecedor] = useState("Todos");

  const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);

  const fornecedores = useMemo(() => {
    return [...new Set(itens.map((item) => item.fornecedor))];
  }, [itens]);

  const licitacaoAtual = licitacoes.find(
    (licitacao) => licitacao.id === licitacaoSelecionada
  );

  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const bateLicitacao = item.licitacaoId === licitacaoSelecionada;
      const bateFornecedor = item.fornecedor === fornecedorSelecionado;
      const termo = busca.toLowerCase();
      const bateBusca =
        item.nome.toLowerCase().includes(termo) ||
        item.codigo.toLowerCase().includes(termo);

      return bateLicitacao && bateFornecedor && bateBusca;
    });
  }, [itens, licitacaoSelecionada, fornecedorSelecionado, busca]);

  const itensRelatorio = useMemo(() => {
    if (filtroFornecedor === "Todos") return itens;
    return itens.filter((item) => item.fornecedor === filtroFornecedor);
  }, [itens, filtroFornecedor]);

  const totalLicitado = itens.reduce(
    (soma, item) => soma + item.qtdLicitada * item.valorUnitario,
    0
  );

  const totalSaldo = itens.reduce(
    (soma, item) => soma + item.saldoQtd * item.valorUnitario,
    0
  );

  const totalUtilizado = totalLicitado - totalSaldo;

  const itensComAlerta = itens.filter(
    (item) => item.saldoQtd <= Math.max(30, item.qtdLicitada * 0.15)
  );

  function confirmarBaixa() {
    const selecionados = itensFiltrados.filter(
      (item) => Number(quantidades[item.id] || 0) > 0
    );

    if (selecionados.length === 0) {
      setMensagem("Informe ao menos uma quantidade para baixar.");
      return;
    }

    const invalido = selecionados.find(
      (item) => Number(quantidades[item.id]) > item.saldoQtd
    );

    if (invalido) {
      setMensagem(
        `A quantidade informada para "${invalido.nome}" é maior que o saldo disponível.`
      );
      return;
    }

    const dataHoje = new Date().toLocaleDateString("pt-BR");

    setItens((listaAtual) =>
      listaAtual.map((item) => {
        const qtd = Number(quantidades[item.id] || 0);
        if (!qtd) return item;

        return {
          ...item,
          saldoQtd: item.saldoQtd - qtd,
        };
      })
    );

    const novosMovimentos = selecionados.map((item, index) => ({
      id: movimentos.length + index + 1,
      data: dataHoje,
      fornecedor: fornecedorSelecionado,
      licitacao: licitacaoAtual ? licitacaoAtual.numero : "",
      item: item.nome,
      quantidade: Number(quantidades[item.id]),
      usuario: "Operador",
      observacao: `NF ${notaFiscal}`,
    }));

    setMovimentos((listaAtual) => [...novosMovimentos.reverse(), ...listaAtual]);
    setQuantidades({});
    setMensagem("Baixa em lote realizada com sucesso.");
    setAbaAtiva("historico");
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
      marginBottom: "30px",
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
  };

  return (
    <div style={estilos.app}>
      <div style={estilos.layout}>
        <aside style={estilos.sidebar}>
          <div style={estilos.logo}>LicitaFlow</div>
          <div style={estilos.subtitulo}>Mini sistema web para teste</div>

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
            <strong>Objetivo do MVP:</strong>
            <br />
            testar baixa em lote, saldos, histórico e relatórios sem depender
            de Excel manual.
          </div>
        </aside>

        <main style={estilos.principal}>
          <div style={estilos.topo}>
            <div>
              <h1 style={estilos.titulo}>Sistema de controle de licitação</h1>
              <div style={{ color: "#6b7280", marginTop: "6px" }}>
                Protótipo web navegável para validar fluxo e interface.
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
                          <th style={estilos.th}>Fornecedor</th>
                          <th style={estilos.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {licitacoes.map((licitacao) => (
                          <tr key={licitacao.id}>
                            <td style={estilos.td}>{licitacao.numero}</td>
                            <td style={estilos.td}>{licitacao.objeto}</td>
                            <td style={estilos.td}>{licitacao.fornecedor}</td>
                            <td style={estilos.td}>{licitacao.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={estilos.card}>
                  <h3 style={{ marginTop: 0 }}>Alertas de saldo</h3>
                  {itensComAlerta.length === 0 ? (
                    <div>Nenhum alerta no momento.</div>
                  ) : (
                    itensComAlerta.map((item) => (
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
                          {item.fornecedor}
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
                    Selecione a planilha da licitação
                  </div>
                  <div style={{ color: "#6b7280", marginBottom: "15px" }}>
                    Arquivos .xlsx ou .xls
                  </div>
                  <input
                    type="file"
                    onChange={(e) =>
                      setNomeArquivo(
                        e.target.files && e.target.files[0]
                          ? e.target.files[0].name
                          : ""
                      )
                    }
                  />
                  <div style={{ marginTop: "15px", color: "#2563eb" }}>
                    {nomeArquivo ? `Arquivo selecionado: ${nomeArquivo}` : ""}
                  </div>
                </div>

                <div style={estilos.formularioGrid}>
                  <div>
                    <label style={estilos.label}>Número da licitação</label>
                    <input
                      style={estilos.input}
                      placeholder="Ex.: Pregão 025/2026"
                    />
                  </div>

                  <div>
                    <label style={estilos.label}>Fornecedor principal</label>
                    <input style={estilos.input} placeholder="Ex.: Total Med" />
                  </div>

                  <div>
                    <label style={estilos.label}>Coluna do item</label>
                    <input
                      style={estilos.input}
                      placeholder="Descrição do item"
                    />
                  </div>

                  <div>
                    <label style={estilos.label}>Coluna do saldo</label>
                    <input
                      style={estilos.input}
                      placeholder="Saldo disponível"
                    />
                  </div>
                </div>

                <button
                  style={estilos.botaoPrimario}
                  onClick={() =>
                    setMensagem(
                      nomeArquivo
                        ? `Planilha "${nomeArquivo}" pronta para mapeamento.`
                        : "Selecione um arquivo para validar."
                    )
                  }
                >
                  Validar arquivo
                </button>
              </div>

              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Como funcionaria</h3>
                <p>1. Você envia a planilha real do setor.</p>
                <p>2. O sistema identifica e mapeia as colunas.</p>
                <p>3. Os itens entram na base da licitação.</p>
                <p>
                  4. Depois disso, as baixas passam a ser lançadas no sistema,
                  não mais na planilha manual.
                </p>
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
                      onChange={(e) => setLicitacaoSelecionada(e.target.value)}
                    >
                      {licitacoes.map((licitacao) => (
                        <option key={licitacao.id} value={licitacao.id}>
                          {licitacao.numero}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={estilos.label}>Fornecedor</label>
                    <select
                      style={estilos.input}
                      value={fornecedorSelecionado}
                      onChange={(e) => setFornecedorSelecionado(e.target.value)}
                    >
                      {fornecedores.map((fornecedor) => (
                        <option key={fornecedor} value={fornecedor}>
                          {fornecedor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={estilos.label}>Nota fiscal</label>
                    <input
                      style={estilos.input}
                      value={notaFiscal}
                      onChange={(e) => setNotaFiscal(e.target.value)}
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
                          <th style={estilos.th}>Saldo</th>
                          <th style={estilos.th}>Valor unitário</th>
                          <th style={estilos.th}>Qtd. a baixar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensFiltrados.map((item) => (
                          <tr key={item.id}>
                            <td style={estilos.td}>{item.codigo}</td>
                            <td style={estilos.td}>
                              <strong>{item.nome}</strong>
                              <br />
                              <span style={{ color: "#6b7280" }}>
                                {item.unidade}
                              </span>
                            </td>
                            <td style={estilos.td}>{item.saldoQtd}</td>
                            <td style={estilos.td}>
                              {formatarMoeda(item.valorUnitario)}
                            </td>
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
                        ))}
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
                            Number(quantidades[item.id] || 0) *
                              item.valorUnitario
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
                    Ao confirmar, o saldo será recalculado automaticamente e o
                    histórico ficará registrado com NF, data e usuário.
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
              <div style={estilos.tabelaWrap}>
                <table style={estilos.tabela}>
                  <thead>
                    <tr>
                      <th style={estilos.th}>Data</th>
                      <th style={estilos.th}>Fornecedor</th>
                      <th style={estilos.th}>Licitação</th>
                      <th style={estilos.th}>Item</th>
                      <th style={estilos.th}>Quantidade</th>
                      <th style={estilos.th}>Usuário</th>
                      <th style={estilos.th}>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentos.map((mov) => (
                      <tr key={mov.id}>
                        <td style={estilos.td}>{mov.data}</td>
                        <td style={estilos.td}>{mov.fornecedor}</td>
                        <td style={estilos.td}>{mov.licitacao}</td>
                        <td style={estilos.td}>{mov.item}</td>
                        <td style={estilos.td}>{mov.quantidade}</td>
                        <td style={estilos.td}>{mov.usuario}</td>
                        <td style={estilos.td}>{mov.observacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {abaAtiva === "relatorios" && (
            <div style={estilos.grid2}>
              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Filtros de relatório</h3>

                <div style={{ marginBottom: "14px" }}>
                  <label style={estilos.label}>Fornecedor</label>
                  <select
                    style={estilos.input}
                    value={filtroFornecedor}
                    onChange={(e) => setFiltroFornecedor(e.target.value)}
                  >
                    <option value="Todos">Todos</option>
                    {fornecedores.map((fornecedor) => (
                      <option key={fornecedor} value={fornecedor}>
                        {fornecedor}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={estilos.label}>Período</label>
                  <input style={estilos.input} placeholder="Ex.: março/2026" />
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button style={estilos.botaoSecundario}>Gerar</button>
                  <button style={estilos.botaoSecundario}>Excel</button>
                  <button style={estilos.botaoSecundario}>PDF</button>
                </div>
              </div>

              <div style={estilos.card}>
                <h3 style={{ marginTop: 0 }}>Saldo por item</h3>
                <div style={estilos.tabelaWrap}>
                  <table style={estilos.tabela}>
                    <thead>
                      <tr>
                        <th style={estilos.th}>Fornecedor</th>
                        <th style={estilos.th}>Código</th>
                        <th style={estilos.th}>Item</th>
                        <th style={estilos.th}>Qtd. licitada</th>
                        <th style={estilos.th}>Saldo</th>
                        <th style={estilos.th}>Saldo financeiro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensRelatorio.map((item) => (
                        <tr key={item.id}>
                          <td style={estilos.td}>{item.fornecedor}</td>
                          <td style={estilos.td}>{item.codigo}</td>
                          <td style={estilos.td}>{item.nome}</td>
                          <td style={estilos.td}>{item.qtdLicitada}</td>
                          <td style={estilos.td}>{item.saldoQtd}</td>
                          <td style={estilos.td}>
                            {formatarMoeda(item.saldoQtd * item.valorUnitario)}
                          </td>
                        </tr>
                      ))}
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