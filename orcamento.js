// Espera o documento HTML estar completamente carregado
// (O 'defer' no HTML já faz isso, mas é uma boa prática manter)
document.addEventListener("DOMContentLoaded", function () {
  // Pega os elementos principais
  const btnAdicionar = document.getElementById("btn-adicionar-produto");
  const listaProdutos = document.getElementById("lista-produtos");
  const templateProduto = document.getElementById("template-produto");

  // 1. Função para ADICIONAR um novo produto
  function adicionarProduto() {
    // Clona o conteúdo do <template>
    const novoItem = templateProduto.content.cloneNode(true);
    // Adiciona o item clonado dentro da #lista-produtos
    listaProdutos.appendChild(novoItem);
  }

  // Adiciona o "escutador" de clique no botão de adicionar
  btnAdicionar.addEventListener("click", adicionarProduto);

  // 2. Função para REMOVER um produto
  // Usamos "event delegation"
  listaProdutos.addEventListener("click", function (event) {
    // Verifica se o elemento clicado TEM a classe '.btn-remover'
    if (event.target.classList.contains("btn-remover")) {
      // Pega o "pai" mais próximo que seja um '.item-produto' e remove-o
      event.target.closest(".item-produto").remove();
    }
  });

  // Opcional: Adiciona um item inicial ao carregar a página
  adicionarProduto();
});
