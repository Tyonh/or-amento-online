document.addEventListener("DOMContentLoaded", function () {
  // Pega os elementos principais
  const btnAdicionar = document.getElementById("btn-adicionar-produto");
  const listaProdutos = document.getElementById("lista-produtos");
  const templateProduto = document.getElementById("template-produto");

  // 1. Função utilitária "Debounce"
  // (Evita uma chamada à API a cada tecla pressionada)
  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      const context = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  }

  // 2. Variável para guardar o <div> flutuante de sugestões
  let sugestoesDiv = null;

  // 3. Função que BUSCA na API
  async function fetchSugestoes(termo, inputElement) {
    if (termo.length < 2) {
      limparSugestoes();
      return;
    }

    try {
      // Faz a chamada ao nosso backend (que agora usa SQLite)
      const response = await fetch(
        `http://localhost:3000/api/produtos/search?search=${encodeURIComponent(
          termo
        )}`
      );
      if (!response.ok) return;

      const produtos = await response.json();
      exibirSugestoes(produtos, inputElement);
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
    }
  }

  // 4. Versão "Debounced" (atrasada) da função de busca
  const buscarSugestoesDebounced = debounce(fetchSugestoes, 300);

  // --- AUTOCOMPLETE DE CLIENTES (sem preencher valor) ---
  // Função que BUSCA clientes na API
  async function fetchSugestoesClientes(termo, inputElement) {
    if (termo.length < 2) {
      limparSugestoes();
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/clientes/search?search=${encodeURIComponent(
          termo
        )}`
      );
      if (!response.ok) return;

      const clientes = await response.json();
      exibirSugestoesClientes(clientes, inputElement);
    } catch (error) {
      console.error("Erro ao buscar sugestões de clientes:", error);
    }
  }

  // Versão debounced para clientes
  const buscarSugestoesDebouncedClientes = debounce(
    fetchSugestoesClientes,
    300
  );

  // 5. Função que MOSTRA o <div> de sugestões
  function exibirSugestoes(produtos, inputElement) {
    limparSugestoes(); // Limpa sugestões antigas

    // Cria o <div> flutuante, se não existir
    if (!sugestoesDiv) {
      sugestoesDiv = document.createElement("div");
      sugestoesDiv.className = "autocomplete-sugestoes";
      document.body.appendChild(sugestoesDiv);
    }

    // Posiciona o <div> abaixo do input que está sendo digitado
    const rect = inputElement.getBoundingClientRect();
    sugestoesDiv.style.left = `${rect.left + window.scrollX}px`;
    sugestoesDiv.style.top = `${rect.bottom + window.scrollY}px`;
    sugestoesDiv.style.width = `${rect.width}px`;

    if (produtos.length === 0) {
      sugestoesDiv.innerHTML =
        "<div class='autocomplete-item-empty'>Nenhum produto encontrado</div>";
      return;
    }

    // Preenche o <div> com os produtos
    produtos.forEach((produto) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "autocomplete-item";
      itemDiv.textContent = produto.nome;

      // *** A MÁGICA ACONTECE AQUI ***
      // Define o que acontece ao CLICAR numa sugestão
      itemDiv.onclick = () => {
        // 1. Preenche o input de nome com o nome do produto
        inputElement.value = produto.nome;

        // 2. Encontra o input de valor "irmão" desta linha
        // (Usamos .closest() para achar o 'pai' da linha)
        const linhaProduto = inputElement.closest(".item-produto");

        if (linhaProduto) {
          // 3. Achamos o input de valor DENTRO daquela linha
          const inputValor = linhaProduto.querySelector(
            "input[name='valor_unitario[]']"
          );

          if (inputValor) {
            // 4. Preenchemos o valor com o preço do produto
            inputValor.value = parseFloat(produto.valor).toFixed(2);
          }
        }

        limparSugestoes(); // Fecha a caixa de sugestões
      };

      sugestoesDiv.appendChild(itemDiv);
    });
  }

  // 6. Função que LIMPA e esconde a caixa de sugestões
  function limparSugestoes() {
    if (sugestoesDiv) {
      sugestoesDiv.innerHTML = "";
      // Esconde o div
      sugestoesDiv.style.left = "-9999px";
      sugestoesDiv.style.top = "-9999px";
    }
  }

  // Função que mostra sugestões de clientes (mais simples que a de produtos)
  function exibirSugestoesClientes(clientes, inputElement) {
    limparSugestoes(); // Limpa sugestões antigas

    if (!sugestoesDiv) {
      sugestoesDiv = document.createElement("div");
      sugestoesDiv.className = "autocomplete-sugestoes";
      document.body.appendChild(sugestoesDiv);
    }

    const rect = inputElement.getBoundingClientRect();
    sugestoesDiv.style.left = `${rect.left + window.scrollX}px`;
    sugestoesDiv.style.top = `${rect.bottom + window.scrollY}px`;
    sugestoesDiv.style.width = `${rect.width}px`;

    if (clientes.length === 0) {
      sugestoesDiv.innerHTML =
        "<div class='autocomplete-item-empty'>Nenhum cliente encontrado</div>";
      return;
    }

    clientes.forEach((cliente) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "autocomplete-item";
      itemDiv.textContent = cliente.nome;

      itemDiv.onclick = () => {
        inputElement.value = cliente.nome;
        limparSugestoes();
      };

      sugestoesDiv.appendChild(itemDiv);
    });
  }

  // 7. O "Ouvinte" de eventos principal (Event Delegation)
  // Ouve eventos de "input" dentro de #lista-produtos
  listaProdutos.addEventListener("input", (event) => {
    // Verifica se o evento aconteceu em um input de NOME de produto
    if (event.target && event.target.name === "produto_nome[]") {
      const termo = event.target.value;
      // Chama a versão DEBOUNCED, passando o termo e o próprio input
      buscarSugestoesDebounced(termo, event.target);
    }
  });

  // Adiciona listener para o input de cliente (está fora de #lista-produtos)
  const inputCliente = document.getElementById("cliente_nome");
  if (inputCliente) {
    inputCliente.addEventListener("input", (event) => {
      const termo = event.target.value;
      buscarSugestoesDebouncedClientes(termo, event.target);
    });
  }

  // 8. Opcional: fechar a caixa se o usuário clicar fora
  document.addEventListener("click", (event) => {
    if (!sugestoesDiv) return;

    // Se o clique NÃO foi dentro da caixa de sugestões
    // E NÃO foi num input de produto, fechamos a caixa.
    const clicouInput = event.target.closest("input[name='produto_nome[]']");
    const clicouSugestao = event.target.closest(".autocomplete-sugestoes");

    if (!clicouInput && !clicouSugestao) {
      limparSugestoes();
    }
  });

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
