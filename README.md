# Observatório do Café — site

Site estático (HTML, CSS e JavaScript, sem servidor nem bibliotecas externas) com o acervo da Embrapa sobre
café: publicações, projetos e soluções tecnológicas, por espécie (arábica e canéfora), tema técnico, estado,
unidade e período, e a participação de mulheres na pesquisa (agregada).

- Abre com duplo clique em `index.html` ou servido em qualquer hospedagem estática (GitHub Pages).
- Dados em `data/*.js`, gerados pelo pipeline do Observatório do Café (`pipeline/R/site.R`, `targets::tar_make()`).
  Depois de gerar: subir o `?v=` em `index.html`.
- Sem nomes de pessoas. Gênero só em números agregados pré-calculados (espécie, período, tema); nenhum dado de
  gênero por documento ou por pessoa, porque os nomes dos autores são públicos nos repositórios.
- Cores da identidade visual da Embrapa Café; sem logotipo.

Fontes: EMBRAPA, Redape (DOIs 10.48432/TRBT0S, 10.48432/EZDXWF, 10.48432/ZQE5FV); IBGE, PAM tabela 5457;
MEIRELES, F., genderBR 1.4.0. Método: `docs/01-desenho-e-metodo.md` e `docs/03-numeros-e-fundamentacao.md`.
