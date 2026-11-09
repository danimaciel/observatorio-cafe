/* Observatório do Café — site estático. Dados em data/*.js (window.CAFE), gerados por pipeline/R/site.R. */
(function () {
  "use strict";
  const C = window.CAFE, R = C.resumo, D = C.docs, SIM = C.similares;
  const ESP = { A: "Arábica", C: "Canéfora", M: "As duas", N: "Não especificada" };
  const ESP_ORD = ["A", "C", "M", "N"];
  const TIPO = { p: "Publicação", j: "Projeto", s: "Solução tecnológica" };
  const TEMA = Object.fromEntries(R.temas.map(t => [t.id, t.rotulo]));
  const fmt = n => n.toLocaleString("pt-BR");
  const pct = (a, b) => b ? Math.round(100 * a / b) + "%" : "—";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = id => document.getElementById(id);
  const MES = { "01": "janeiro", "02": "fevereiro", "03": "março", "04": "abril", "05": "maio", "06": "junho",
    "07": "julho", "08": "agosto", "09": "setembro", "10": "outubro", "11": "novembro", "12": "dezembro" };
  const [expA, expM] = String(R.exportacao).split("-");
  const EXPORT = (MES[expM] || expM) + " de " + expA;

  // ---------- estado dos filtros ----------
  const anos = D.map(d => d.y).filter(Boolean);
  const ANO_MIN = Math.min(...anos), ANO_MAX = Math.max(...anos);
  const st = { esp: "", inf: true, tipo: "", tema: "", uf: "", ano0: ANO_MIN, ano1: ANO_MAX, q: "", pag: 0 };

  function iniciaFiltros() {
    const temas = R.temas.slice().sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt"));
    $("f-tema").insertAdjacentHTML("beforeend", temas.map(t => `<option value="${t.id}">${esc(t.rotulo)}</option>`).join(""));
    const ufs = [...new Set(D.flatMap(d => d.uf))].sort();
    $("f-uf").insertAdjacentHTML("beforeend", ufs.map(u => `<option>${u}</option>`).join(""));
    $("f-ano0").value = ANO_MIN; $("f-ano1").value = ANO_MAX;
    $("f-ano0").min = $("f-ano1").min = ANO_MIN; $("f-ano0").max = $("f-ano1").max = ANO_MAX;
    const liga = (id, k, conv) => $(id).addEventListener("change", e => { st[k] = conv(e.target); st.pag = 0; desenha(); });
    liga("f-esp", "esp", t => t.value); liga("f-tipo", "tipo", t => t.value);
    liga("f-tema", "tema", t => t.value); liga("f-uf", "uf", t => t.value);
    liga("f-inf", "inf", t => t.checked);
    liga("f-ano0", "ano0", t => +t.value || ANO_MIN); liga("f-ano1", "ano1", t => +t.value || ANO_MAX);
    $("f-limpar").addEventListener("click", () => {
      Object.assign(st, { esp: "", inf: true, tipo: "", tema: "", uf: "", ano0: ANO_MIN, ano1: ANO_MAX, q: "", pag: 0 });
      ["f-esp", "f-tipo", "f-tema", "f-uf"].forEach(id => $(id).value = "");
      $("f-inf").checked = true; $("f-ano0").value = ANO_MIN; $("f-ano1").value = ANO_MAX;
      const b = $("q"); if (b) b.value = "";
      desenha();
    });
  }
  const setFiltro = (k, v, sel) => { st[k] = v; st.pag = 0; if (sel) $(sel).value = v; desenha(); };

  // espécie efetiva: sem inferência, a espécie inferida (níveis 3 e 4) vira "não especificada"
  const espDe = d => (!st.inf && d.n >= 3) ? "N" : d.e;
  const semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const TXT = D.map(d => semAcento(d.t + " " + d.a + " " + d.u));
  function filtrados(semTexto) {
    const q = semTexto ? [] : semAcento(st.q).split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < D.length; i++) {
      const d = D[i];
      if (st.esp && espDe(d) !== st.esp) continue;
      if (st.tipo && d.k !== st.tipo) continue;
      if (st.tema && !d.m.includes(st.tema)) continue;
      if (st.uf && !d.uf.includes(st.uf)) continue;
      if (d.y && (d.y < st.ano0 || d.y > st.ano1)) continue;
      if (q.length && !q.every(w => TXT[i].includes(w))) continue;
      out.push(i);
    }
    return out;
  }

  // ---------- componentes ----------
  function barras(linhas, total, aoClicar) {
    const max = Math.max(1, ...linhas.map(l => l.n));
    return `<div class="barras">${linhas.map(l => `
      ${aoClicar ? `<button class="rot" data-v="${esc(l.id)}" title="${esc(l.rot)}">${esc(l.rot)}</button>` : `<span class="rot" title="${esc(l.rot)}">${esc(l.rot)}</span>`}
      <span class="trilho" role="img" aria-label="${esc(l.rot)}: ${l.n}">${(l.partes || [{ c: "e-A", n: l.n }]).map(p =>
        `<span class="${p.c}" style="width:${100 * p.n / max}%"></span>`).join("")}</span>
      <span class="num">${fmt(l.n)}${total ? ` · ${pct(l.n, total)}` : ""}</span>`).join("")}</div>`;
  }
  const legendaEsp = () => `<div class="legenda">${ESP_ORD.map(e => `<span><i class="e-${e}"></i>${ESP[e]}</span>`).join("")}</div>`;
  const partesEsp = idx => ESP_ORD.map(e => ({ c: "e-" + e, n: idx.filter(i => espDe(D[i]) === e).length }));

  function serieAnual(idx) {
    const a0 = Math.max(st.ano0, 1975), a1 = Math.min(st.ano1, ANO_MAX);
    if (a1 < a0) return "<p class='nota'>Sem documentos no período.</p>";
    const anos = []; for (let a = a0; a <= a1; a++) anos.push(a);
    const cont = Object.fromEntries(anos.map(a => [a, { A: 0, C: 0, M: 0, N: 0 }]));
    idx.forEach(i => { const d = D[i]; if (cont[d.y]) cont[d.y][espDe(d)]++; });
    const tot = anos.map(a => ESP_ORD.reduce((s, e) => s + cont[a][e], 0));
    const W = 900, H = 230, ml = 34, mb = 22, mt = 8, bw = (W - ml - 4) / anos.length;
    const max = Math.max(1, ...tot), y = v => H - mb - (H - mb - mt) * v / max;
    const passo = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
    let svg = `<svg class="serie" viewBox="0 0 ${W} ${H}" role="img" aria-label="Documentos por ano e espécie">`;
    for (let v = 0; v <= max; v += passo) svg += `<line class="eixo" x1="${ml}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${ml - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    anos.forEach((a, j) => {
      let base = 0; const x = ml + j * bw + 1;
      ESP_ORD.forEach(e => { const v = cont[a][e]; if (!v) return;
        svg += `<rect x="${x}" width="${Math.max(1, bw - 2)}" y="${y(base + v)}" height="${y(base) - y(base + v)}" class="e-${e}" style="fill:var(--${{ A: "arabica", C: "canefora", M: "ambas", N: "nesp" }[e]})"><title>${a} · ${ESP[e]}: ${v}</title></rect>`;
        base += v; });
      if (a % 5 === 0) svg += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${a}</text>`;
    });
    return svg + "</svg>";
  }

  // ---------- abas ----------
  function visao() {
    const idx = filtrados(true);
    const n = k => idx.filter(i => D[i].k === k).length;
    const inf = idx.filter(i => D[i].n >= 3).length;
    const contTema = R.temas.map(t => {
      const sub = idx.filter(i => D[i].m.includes(t.id));
      return { id: t.id, rot: t.rotulo, n: sub.length, partes: partesEsp(sub) };
    }).sort((a, b) => b.n - a.n);
    const contUF = {}; idx.forEach(i => D[i].uf.forEach(u => (contUF[u] = contUF[u] || []).push(i)));
    const ufs = Object.entries(contUF).map(([u, s]) => ({ id: u, rot: u, n: s.length, partes: partesEsp(s) })).sort((a, b) => b.n - a.n).slice(0, 15);
    const contU = {}; idx.forEach(i => { const u = D[i].u || "—"; (contU[u] = contU[u] || []).push(i); });
    const unis = Object.entries(contU).map(([u, s]) => ({ rot: u.replace(/^Embrapa /, ""), n: s.length, partes: partesEsp(s) })).sort((a, b) => b.n - a.n).slice(0, 12);
    const semUF = idx.filter(i => !D[i].uf.length).length;
    $("visao").innerHTML = `
      <div class="cards">
        <div class="card"><div class="v">${fmt(n("p"))}</div><div class="r">publicações</div></div>
        <div class="card"><div class="v">${fmt(n("j"))}</div><div class="r">projetos</div></div>
        <div class="card"><div class="v">${fmt(n("s"))}</div><div class="r">soluções tecnológicas</div></div>
        <div class="card"><div class="v">${pct(idx.filter(i => espDe(D[i]) !== "N").length, idx.length)}</div><div class="r">com espécie identificada${st.inf ? ` (${fmt(inf)} inferidas)` : ""}</div></div>
      </div>
      <div class="grade">
        <div class="painel largo"><h2>Documentos por ano e espécie</h2>${legendaEsp()}${serieAnual(idx)}
          <p class="nota">Projetos pelo ano de início; publicações e soluções pelo ano de publicação ou lançamento. A partir de 1975.</p></div>
        <div class="painel"><h2>Espécie</h2>${barras(ESP_ORD.map(e => { const s = idx.filter(i => espDe(D[i]) === e); return { rot: ESP[e], n: s.length, partes: [{ c: "e-" + e, n: s.length }] }; }), idx.length)}
          <p class="nota">Espécie pelo texto (nome, nome científico ou cultivar) ou inferida pelo estado do estudo (≥ 90% da produção de uma espécie na PAM/IBGE 2022–2024) ou pela unidade. Desmarque “incluir espécie inferida” para ver só o que o texto diz.</p></div>
        <div class="painel"><h2>Temas técnicos</h2>${legendaEsp()}<div id="b-temas">${barras(contTema, 0, true)}</div>
          <p class="nota">Um documento pode ter mais de um tema. Temas provisórios, em validação. Clique para filtrar.</p></div>
        <div class="painel"><h2>Estados com mais estudos</h2>${legendaEsp()}<div id="b-ufs">${barras(ufs, 0, true)}</div>
          <p class="nota">Estado citado no texto ou de município citado. ${fmt(semUF)} documentos (${pct(semUF, idx.length)}) não citam estado.</p></div>
        <div class="painel"><h2>Unidades da Embrapa</h2>${legendaEsp()}${barras(unis, 0)}
          <p class="nota">Unidade principal do documento (líder, depositante ou responsável).</p></div>
      </div>`;
    $("b-temas").querySelectorAll("button").forEach(b => b.onclick = () => setFiltro("tema", b.dataset.v, "f-tema"));
    $("b-ufs").querySelectorAll("button").forEach(b => b.onclick = () => setFiltro("uf", b.dataset.v, "f-uf"));
  }

  const POR_PAG = 25;
  function cartao(i) {
    const d = D[i], e = espDe(d), inf = st.inf && d.n >= 3;
    return `<article class="doc">
      <h3>${d.l ? `<a href="${esc(d.l)}" target="_blank" rel="noopener">${esc(d.t)}</a>` : esc(d.t)}</h3>
      <div class="meta"><span>${TIPO[d.k]}</span><span>${d.y || "s/d"}</span><span>${esc(d.u)}</span>${d.uf.length ? `<span>${d.uf.join(", ")}</span>` : ""}</div>
      ${d.a ? `<p>${esc(d.a)}</p>` : ""}
      <div class="chips"><span class="esp e-${e}${inf ? " inf" : ""}" title="${inf ? "espécie inferida pelo " + (d.n === 3 ? "estado" : "unidade") : "espécie pelo texto"}">${ESP[e]}${inf ? " (inferida)" : ""}</span>
        ${d.m.map(t => `<span class="chip">${esc(TEMA[t] || t)}</span>`).join("")}</div>
      <button class="lnk" data-sim="${i}">Ver semelhantes</button><div id="sim-${i}"></div>
    </article>`;
  }
  function acervo() {
    const el = $("acervo");
    if (!$("q")) {
      el.innerHTML = `<div class="busca"><input id="q" type="search" placeholder="Buscar no título, resumo ou unidade (ex.: broca, secagem, Rondônia)" aria-label="Buscar">
        <span class="contagem" id="contagem"></span></div><div id="lista"></div><div class="pag" id="pag"></div>`;
      let t; $("q").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; st.pag = 0; acervo(); }, 200); });
    }
    const idx = filtrados(false), np = Math.max(1, Math.ceil(idx.length / POR_PAG));
    st.pag = Math.min(st.pag, np - 1);
    $("contagem").textContent = `${fmt(idx.length)} documentos`;
    $("lista").innerHTML = idx.slice(st.pag * POR_PAG, (st.pag + 1) * POR_PAG).map(cartao).join("") || "<p>Nenhum documento com esses filtros.</p>";
    $("pag").innerHTML = np > 1 ? `<button class="sec" id="ant" ${st.pag ? "" : "disabled"}>Anterior</button><span>${st.pag + 1} de ${np}</span><button class="sec" id="prox" ${st.pag < np - 1 ? "" : "disabled"}>Próxima</button>` : "";
    if ($("ant")) { $("ant").onclick = () => { st.pag--; acervo(); scrollTo(0, 0); }; $("prox").onclick = () => { st.pag++; acervo(); scrollTo(0, 0); }; }
    $("lista").querySelectorAll("[data-sim]").forEach(b => b.onclick = () => {
      const i = +b.dataset.sim, alvo = $("sim-" + i);
      if (alvo.innerHTML) { alvo.innerHTML = ""; b.textContent = "Ver semelhantes"; return; }
      alvo.innerHTML = `<ol class="similares">${SIM[i].map(j => `<li>${D[j].l ? `<a href="${esc(D[j].l)}" target="_blank" rel="noopener">${esc(D[j].t)}</a>` : esc(D[j].t)} <span class="nota">(${D[j].y || "s/d"}, ${ESP[D[j].e]})</span></li>`).join("")}</ol>`;
      b.textContent = "Ocultar semelhantes";
    });
  }

  function genero() {
    const G = R.genero, pega = (rec, un) => G.filter(g => g.recorte === rec && g.unidade === un);
    const linha = (rows, rot) => {
      const m = rows.find(r => r.genero === "mulher"), h = rows.find(r => r.genero === "homem");
      const nm = m ? m.n : 0, nh = h ? h.n : 0;
      return { rot, n: nm + nh, m: nm, partes: [{ c: "e-A", n: nm }, { c: "e-N", n: nh }] };
    };
    const tabela = (linhas, titulo) => `<table class="tab"><thead><tr><th>${titulo}</th><th class="n">Mulheres</th><th class="n">Homens</th><th class="n">% mulheres</th></tr></thead><tbody>${
      linhas.map(l => `<tr><td>${esc(l.rot)}</td><td class="n">${fmt(l.m)}</td><td class="n">${fmt(l.n - l.m)}</td><td class="n">${pct(l.m, l.n)}</td></tr>`).join("")}</tbody></table>`;
    const grupo = (rec, mapa, ordem) => {
      const rows = pega(rec, "vínculos de autoria");
      const vals = ordem || [...new Set(rows.map(r => r.valor))];
      return vals.map(v => linha(rows.filter(r => r.valor === v), mapa ? (mapa[v] || v) : v)).filter(l => l.n);
    };
    const tot = u => linha(pega("total", u), u);
    const pes = tot("pessoas"), aut = tot("vínculos de autoria"), lid = tot("projetos liderados");
    const ind = u => (pega("total", u).find(r => r.genero === "indefinido") || { n: 0 }).n;
    const esp = grupo("especie", { arabica: "Arábica", canefora: "Canéfora", ambas: "As duas", nao_especificada: "Não especificada" }, ["arabica", "canefora", "ambas", "nao_especificada"]);
    const per = grupo("periodo", null, ["até 1999", "2000–2009", "2010–2019", "2020 em diante"]);
    const tem = grupo("tema", TEMA).sort((a, b) => b.m / b.n - a.m / a.n);
    const pctBar = ls => `<div class="barras">${ls.map(l => `<span class="rot" title="${esc(l.rot)}">${esc(l.rot)}</span>
      <span class="trilho"><span class="e-A" style="width:${100 * l.m / l.n}%"></span><span class="e-N" style="width:${100 - 100 * l.m / l.n}%"></span></span>
      <span class="num">${pct(l.m, l.n)}</span>`).join("")}</div>`;
    $("genero").innerHTML = `
      <div class="aviso">Números agregados, só de pessoas da Embrapa identificadas pelo Observatório (autores externos chegam nos registros como “SOBRENOME, I.”).
        O gênero é <b>inferido do primeiro nome</b> (pacote genderBR, base IBGE Censo 2010), não declarado pela pessoa; nomes ambíguos ficam de fora.
        Estes números valem para o acervo inteiro e <b>não mudam com os filtros</b>; não há dado de gênero por documento ou por pessoa no site.</div>
      <div class="cards">
        <div class="card"><div class="v">${pct(pes.m, pes.n)}</div><div class="r">das pessoas são mulheres (${fmt(pes.m)} de ${fmt(pes.n)}; ${fmt(ind("pessoas"))} sem gênero atribuído)</div></div>
        <div class="card"><div class="v">${pct(aut.m, aut.n)}</div><div class="r">das autorias são de mulheres (${fmt(aut.m)} de ${fmt(aut.n)})</div></div>
        <div class="card"><div class="v">${fmt(lid.m)} de ${fmt(lid.n)}</div><div class="r">projetos liderados por mulheres</div></div>
      </div>
      <div class="legenda"><span><i class="e-A"></i>Mulheres</span><span><i class="e-N"></i>Homens</span></div>
      <div class="grade">
        <div class="painel"><h2>Por espécie</h2>${pctBar(esp)}<p class="nota">A canéfora concentra-se na Embrapa Rondônia; a diferença deve refletir a composição das equipes (hipótese em verificação).</p></div>
        <div class="painel"><h2>Por período</h2>${pctBar(per)}</div>
        <div class="painel largo"><h2>Por tema técnico</h2>${pctBar(tem)}<p class="nota">Vínculos de autoria = pares pessoa × documento.</p></div>
        <div class="painel largo rolagem"><h2>Tabela</h2>${tabela(esp, "Espécie")}<br>${tabela(per, "Período")}</div>
      </div>`;
  }

  function metodo() {
    const F = R.funil, col = k => F.map(f => f[k]);
    const rel = R.relevancia, ta = R.temas_avaliacao;
    $("metodo").innerHTML = `<div class="metodo">
      <div class="aviso">Versão de trabalho. A classificação foi conferida com uma amostra de ${R.n_amostra} documentos pré-rotulados, que ainda passará por especialistas; as medidas de acerto abaixo são provisórias.</div>
      <div class="painel"><h2>Funil de números</h2><div class="rolagem"><table class="tab"><thead><tr><th>Etapa</th><th class="n">Publicações</th><th class="n">Projetos</th><th class="n">Soluções</th></tr></thead><tbody>
        ${F.map(f => `<tr><td>${esc(f.descricao)}</td><td class="n">${f.publicacao == null ? "—" : fmt(f.publicacao)}</td><td class="n">${f.projeto == null ? "—" : fmt(f.projeto)}</td><td class="n">${f.tecnologia == null ? "—" : fmt(f.tecnologia)}</td></tr>`).join("")}
      </tbody></table></div></div><br>
      <div class="grade">
        <div class="painel"><h2>Como o acervo foi montado</h2><ol>
          <li><b>Candidatos:</b> documentos com café na camada de produtos do Observatório de Pesquisa da Embrapa (título, palavras-chave ou resumo, em português, inglês e espanhol) e documentos semanticamente próximos (modelo multilingual-e5-base).</li>
          <li><b>Amostra:</b> ${R.n_amostra} documentos sorteados por estrato e rotulados (trata de café? qual espécie? quais temas?).</li>
          <li><b>Classificador:</b> regressão logística regularizada sobre os vetores semânticos e a marca de produto; fora da amostra de treino, precisão ${Math.round(rel.precisao * 100)}% e recall ${Math.round(rel.recall * 100)}%.</li>
          <li><b>Espécie:</b> nome ou cultivar no texto; sem isso, inferida pelo estado (PAM/IBGE) ou pela unidade, e marcada como inferida.</li>
          <li><b>Temas:</b> termos de uma taxonomia de 20 temas, confirmados pelos documentos rotulados mais próximos.</li></ol></div>
        <div class="painel rolagem"><h2>Acerto dos temas (provisório)</h2><table class="tab"><thead><tr><th>Tema</th><th class="n">Precisão</th><th class="n">Recall</th></tr></thead><tbody>
          ${ta.filter(t => t.rotulados >= 5).map(t => `<tr><td>${esc(TEMA[t.tema] || t.tema)}</td><td class="n">${t.precisao == null ? "—" : Math.round(t.precisao * 100) + "%"}</td><td class="n">${t.recall == null ? "—" : Math.round(t.recall * 100) + "%"}</td></tr>`).join("")}
          </tbody></table><p class="nota">Temas com ao menos 5 documentos rotulados.</p></div>
        <div class="painel largo"><h2>Fontes</h2><ul>
          <li>EMBRAPA. <i>Publicações da Embrapa</i>. Redape, 2026. DOI 10.48432/TRBT0S. Exportação de ${EXPORT}.</li>
          <li>EMBRAPA. <i>Projetos da Embrapa</i>. Redape, 2026. DOI 10.48432/EZDXWF. Exportação de ${EXPORT}.</li>
          <li>EMBRAPA. <i>Soluções tecnológicas da Embrapa</i>. Redape, 2026. DOI 10.48432/ZQE5FV. Exportação de ${EXPORT}.</li>
          <li>IBGE. <i>Produção Agrícola Municipal</i>, tabela 5457 (café arábica e canephora por UF, 2022–2024).</li>
          <li>MEIRELES, F. <i>genderBR</i>, pacote R 1.4.0 (CRAN), base IBGE Censo 2010.</li></ul>
          <p class="nota">Limites: publicações vêm dos repositórios Alice e Infoteca-e, não de toda a produção científica; projetos no Redape trazem só líder e unidade líder e não cobrem toda a carteira.</p></div>
      </div></div>`;
  }

  // ---------- navegação ----------
  let aba = "visao";
  const DESENHO = { visao, acervo, genero, metodo };
  function desenha() { DESENHO[aba](); $("filtros").style.display = (aba === "genero" || aba === "metodo") ? "none" : ""; }
  document.querySelectorAll("#abas button").forEach(b => b.onclick = () => {
    document.querySelectorAll("#abas button, .aba").forEach(x => x.classList.remove("ativa"));
    b.classList.add("ativa"); aba = b.dataset.aba; $(aba).classList.add("ativa");
    try { history.replaceState(null, "", "#" + aba); } catch (e) { /* file:// */ }
    desenha();
  });
  iniciaFiltros();
  const vaiHash = () => { const h = location.hash.slice(1); if (DESENHO[h] && h !== aba) document.querySelector(`#abas [data-aba="${h}"]`).click(); };
  window.addEventListener("hashchange", vaiHash);
  if (DESENHO[location.hash.slice(1)]) vaiHash(); else desenha();
  $("rodape").innerHTML = `Dados: Redape (Embrapa), exportação de ${EXPORT}, processados pelo Observatório de Pesquisa da Embrapa. Atualizado em ${esc(R.gerado)}.`;
})();
