document.addEventListener("DOMContentLoaded", function () {
  // Pega os elementos principais
  const btnAdicionar = document.getElementById("btn-adicionar-produto");
  const listaProdutos = document.getElementById("lista-produtos");
  const templateProduto = document.getElementById("template-produto");
  const form = document.getElementById("form-orcamento");

  const API_URL = "http://localhost:3000";
  // 1. Função utilitária "Debounce"
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

  // ...
  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // Evita o envio padrão

    // --- CORREÇÃO AQUI: Serialização manual para suportar arrays ---
    const formData = new FormData(form);
    const dados = {};

    // Iterar sobre todos os pares chave/valor do FormData
    for (const [key, value] of formData.entries()) {
      // 1. Verificar se a chave termina com '[]' (indicando um array de itens)
      if (key.endsWith("[]")) {
        const cleanKey = key.slice(0, -2); // Remove o '[]'

        // Inicializa o array se ele não existir
        if (!dados[cleanKey]) {
          dados[cleanKey] = [];
        }
        // Adiciona o valor ao array
        dados[cleanKey].push(value);
      } else {
        // 2. Para chaves normais (cliente_nome, vendedor, etc.), atribui o valor
        dados[key] = value;
      }
    }
    // --- FIM DA CORREÇÃO ---

    // console.log(JSON.stringify(dados, null, 2)); // Use para debug no console do navegador

    try {
      const response = await fetch(`${API_URL}/salvar-orcamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados), // Agora 'dados' é um JSON com arrays
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          "Erro ao gerar orçamento: " +
            (errorData.details || "Verifique o console.")
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "orcamento.xlsx"; // nome sugerido
      document.body.appendChild(a);
      a.click();
      a.remove();

      // libera memória
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro: " + err.message);
      console.error(err);
    }
  });
  // ...

  // 2. Variável para guardar o <div> flutuante de sugestões
  let sugestoesDiv = null;

  // 3. Função que BUSCA na API (Produtos)
  async function fetchSugestoes(termo, inputElement) {
    if (termo.length < 2) {
      limparSugestoes();
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/produtos/search?search=${encodeURIComponent(termo)}`
      );

      if (!response.ok) return;

      const produtos = await response.json();
      // (Presume que a API retorna: [ { codigo: "123", nome: "Desc..." } ])
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
        `${API_URL}/api/clientes/search?search=${encodeURIComponent(termo)}`
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

  // 5. Função que MOSTRA o <div> de sugestões (Produtos)
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

      itemDiv.textContent = `${produto.codigo} - ${produto.nome}`;

      itemDiv.onclick = () => {
        // 1. Preenche o input de nome com o texto combinado
        inputElement.value = `${produto.codigo} - ${produto.nome}`;

        // 2. Encontra o input de valor "irmão" desta linha
        const linhaProduto = inputElement.closest(".item-produto");

        if (linhaProduto) {
          // 3. Achamos o input de valor DENTRO daquela linha
          const inputValor = linhaProduto.querySelector(
            "input[name='valor_unitario[]']"
          );

          if (inputValor) {
            // 4. Apenas foca no campo de valor (pois não temos o preço)
            inputValor.focus();
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
    const clicouInputCliente = event.target.closest("#cliente_nome");
    const clicouSugestao = event.target.closest(".autocomplete-sugestoes");

    if (!clicouInput && !clicouSugestao && !clicouInputCliente) {
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
