document.addEventListener("DOMContentLoaded", () => {
    const planosContainer = document.getElementById("planos");
    const pagamentoSection = document.getElementById("pagamento");
    const cartaoVirtualSection = document.getElementById("cartao-virtual");
    const qrcodeContainer = document.getElementById("qrcode-container");
    const chavePixInput = document.getElementById("chave-pix");
    const copiarChaveButton = document.getElementById("copiar-chave");
    const cartaoNumeroDiv = document.getElementById("cartao-numero");
    const cartaoValidadeDiv = document.getElementById("cartao-validade");
    const cartaoCvvDiv = document.getElementById("cartao-cvv");

    // --- Configuração da API PushinPay ---
    // URL da API PushinPay para gerar cobranças PIX.
    const PUSHINPAY_API_URL = "https://api.pushinpay.com.br/api";
    // ATENÇÃO: A chave API está exposta no lado do cliente (navegador).
    // Isso é uma PRÁTICA INSEGURA para aplicações reais.
    // Em produção, a comunicação com a API de pagamento deve ser feita pelo backend (servidor)
    // para proteger sua chave API.
    const PUSHINPAY_API_KEY = "tepkVguT2sDS9aqotuPhfgEQbhxhL6ovlsUZztQn88bcb4a0"; // Chave extraída do código original.
    let currentTransactionId = null; // Armazena o ID da transação PIX atual para verificação de status.
    let statusCheckInterval = null; // Armazena o intervalo de verificação de status do pagamento.
    // -------------------------------------

    // Definição dos planos oferecidos.
    // Definição dos planos oferecidos com benefícios detalhados.
    const planos = [
        { 
            nome: "SIMPLES", 
            preco: "20,99", 
            limite: "400 a 560", 
            id: "simples",
            beneficios: [
                "Cartão virtual internacional",
                "Sem anuidade",
                "Cashback de 0,5% em compras",
                "Suporte por e-mail"
            ]
        },
        { 
            nome: "BASICO", 
            preco: "25,99", 
            limite: "700 a 900", 
            id: "basico",
            beneficios: [
                "Cartão virtual internacional",
                "Sem anuidade",
                "Cashback de 1% em compras",
                "Suporte 24h por chat",
                "Seguro compra online"
            ]
        },
        { 
            nome: "DIAMOND", 
            preco: "49,99", 
            limite: "1200 a 1500", 
            id: "diamond",
            beneficios: [
                "Cartão virtual premium",
                "Sem anuidade",
                "Cashback de 2% em compras",
                "Suporte prioritário 24/7",
                "Seguro compra online avançado",
                "Acesso a salas VIP em aeroportos (2x por ano)",
                "Descontos em parceiros"
            ]
        },
        { 
            nome: "SUPREME", 
            preco: "50,99", 
            limite: "1500 a 5000", 
            id: "supreme",
            beneficios: [
                "Cartão virtual premium",
                "Sem anuidade",
                "Cashback de 3% em compras",
                "Suporte prioritário 24/7 com gerente dedicado",
                "Seguro compra online completo",
                "Acesso a salas VIP em aeroportos (4x por ano)",
                "Descontos exclusivos em parceiros premium",
                "Programa de recompensas exclusivo"
            ]
        },
        { 
            nome: "BLACK CARD", 
            preco: "149,99", 
            limite: "50.000 a 100.500", 
            id: "black",
            beneficios: [
                "Cartão virtual ultra premium",
                "Sem anuidade vitalícia",
                "Cashback de 5% em todas as compras",
                "Suporte concierge 24/7",
                "Seguro compra internacional premium",
                "Acesso ilimitado a salas VIP em aeroportos",
                "Descontos exclusivos em marcas de luxo",
                "Programa de recompensas elite",
                "Seguro viagem internacional completo",
                "Prioridade em reservas em restaurantes exclusivos",
                "Serviço de assistente pessoal"
            ]
        },
    ];

    // 1. Adicionar Planos Dinamicamente à Página
    // Cria os elementos HTML para cada plano e os adiciona ao container de planos.
    planos.forEach((plano) => {
        const divPlano = document.createElement("div");
        divPlano.classList.add("plano");
        
        // Criando a lista de benefícios
        const beneficiosHTML = plano.beneficios.map(beneficio => `<li>${beneficio}</li>`).join('');
        
        divPlano.innerHTML = `
            <h3>${plano.nome}</h3>
            <p>Limite: R$ ${plano.limite}</p>
            <div class="preco">R$ ${plano.preco}</div>
            <div class="beneficios-container">
                <h4>Benefícios:</h4>
                <ul class="beneficios-lista">
                    ${beneficiosHTML}
                </ul>
            </div>
            <button class="ripple-btn" data-plano-id="${plano.id}" data-plano-preco="${plano.preco.replace(",", ".")}">Escolher Plano</button>
        `;
        planosContainer.appendChild(divPlano);
    });

    // 2. Lógica de Seleção de Plano e Exibição da Seção de Pagamento
    // Adiciona um listener de evento ao container de planos para detectar cliques nos botões "Escolher Plano".
    planosContainer.addEventListener("click", (event) => {
        // Verifica se o elemento clicado é um botão dentro de um plano.
        if (event.target.tagName === "BUTTON" && event.target.closest(".plano")) {
            const planoId = event.target.dataset.planoId;
            const planoPreco = event.target.dataset.planoPreco;
            console.log(`Plano escolhido: ${planoId}, Preço: ${planoPreco}`);

            // Limpa qualquer verificação de status de pagamento anterior que possa estar ativa.
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
                console.log("Verificação de status anterior interrompida.");
            }

            // Esconde a seção de planos e a seção do cartão virtual (caso esteja visível).
            planosContainer.style.display = "none";
            cartaoVirtualSection.style.display = "none";
            cartaoVirtualSection.classList.remove('visible'); // Garante que a animação de entrada não ocorra prematuramente

            // Limpa o conteúdo anterior da seção de pagamento (QR Code, chave).
            qrcodeContainer.innerHTML = "";
            chavePixInput.value = "";
            copiarChaveButton.disabled = true;

            // Mostra a seção de pagamento e rola a página até ela.
            pagamentoSection.style.display = "block";
            pagamentoSection.classList.add('visible'); // Adiciona classe para animação de entrada CSS
            pagamentoSection.scrollIntoView({ behavior: "smooth", block: "center" });

            // Chama a função para gerar a cobrança PIX.
            gerarPagamento(planoId, planoPreco);
        }
    });

    // 3. Função para Gerar Pagamento PIX via API PushinPay
    // Responsável por fazer a requisição à API para criar uma nova cobrança PIX.
    async function gerarPagamento(planoId, preco) {
        console.log(`Iniciando geração de pagamento para ${planoId} no valor de ${preco}`);
        // Exibe mensagens de carregamento para o usuário.
        qrcodeContainer.innerHTML = "<p>Gerando QR Code...</p>";
        chavePixInput.value = "Gerando chave...";
        copiarChaveButton.disabled = true;

        // Converte o preço de string (ex: "20.99") para centavos (ex: 2099).
        const valorEmCentavos = Math.round(parseFloat(preco) * 100);

        try {
            // Faz a requisição POST para a API PushinPay.
            const response = await fetch(`${PUSHINPAY_API_URL}/pix/cashIn`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${PUSHINPAY_API_KEY}`, // Chave API (Inseguro no frontend!)
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    value: valorEmCentavos,
                    // webhook_url: "URL_PARA_SEU_WEBHOOK" // Opcional: Adicione se tiver um backend para receber notificações de pagamento.
                }),
            });

            // Verifica se a resposta da API foi bem-sucedida.
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Status ${response.status}` }));
                // Lança um erro com a mensagem da API ou o status HTTP.
                throw new Error(`Falha ao criar QR Code: ${errorData.message || response.statusText}`);
            }

            // Extrai os dados JSON da resposta.
            const data = await response.json();

            // Verifica se a resposta contém os dados esperados (ID, QR Code, Base64).
            if (data.id && data.qr_code && data.qr_code_base64) {
                currentTransactionId = data.id; // Armazena o ID da transação.
                // Exibe o QR Code (imagem base64) e a chave Pix (copia e cola).
                qrcodeContainer.innerHTML = `<img src="${data.qr_code_base64}" alt="QR Code Pix">`;
                chavePixInput.value = data.qr_code;
                copiarChaveButton.disabled = false; // Habilita o botão de copiar.
                console.log(`Pagamento gerado com sucesso. ID da Transação: ${currentTransactionId}`);
                // Inicia a verificação periódica do status do pagamento.
                verificarStatusPagamento(currentTransactionId);
            } else {
                // Lança um erro se a resposta da API for inválida.
                throw new Error("Resposta da API PushinPay inválida ou incompleta.");
            }

        } catch (error) {
            // Captura e trata erros durante a geração do pagamento.
            console.error("Erro ao gerar pagamento PIX:", error);
            qrcodeContainer.innerHTML = `<p style="color: red;">Erro ao gerar QR Code: ${error.message}. Por favor, tente escolher o plano novamente.</p>`;
            chavePixInput.value = "Erro ao gerar";
            copiarChaveButton.disabled = true;
            currentTransactionId = null; // Reseta o ID da transação em caso de erro.
        }
    }

    // 4. Função para Verificar Periodicamente o Status do Pagamento via API PushinPay
    // Consulta a API em intervalos regulares para saber se o PIX foi pago.
    function verificarStatusPagamento(idTransacao) {
        console.log(`Iniciando verificação de status para transação: ${idTransacao}`);

        // Limpa qualquer verificação anterior (segurança extra).
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
        }

        // Define um intervalo para executar a verificação.
        statusCheckInterval = setInterval(async () => {
            // Para a verificação se o ID da transação mudou (ex: usuário escolheu outro plano) ou se tornou nulo.
            if (!currentTransactionId || currentTransactionId !== idTransacao) {
                console.log("ID da transação inválido ou alterado. Parando verificação.");
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
                return;
            }

            console.log(`Verificando status da transação ${idTransacao}...`);
            try {
                // Faz a requisição GET para consultar o status da transação.
                const response = await fetch(`${PUSHINPAY_API_URL}/transactions/${idTransacao}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${PUSHINPAY_API_KEY}`, // Chave API (Inseguro no frontend!)
                        "Accept": "application/json",
                    },
                });

                // Se a resposta não for OK (ex: 404 - não encontrado, 500 - erro servidor), loga o erro.
                // Considerar parar a verificação para erros definitivos como 404.
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: `Status ${response.status}` }));
                    console.error(`Erro ${response.status} ao verificar status: ${errorData.message || "Falha na consulta"}`);
                    // Exemplo: Parar se for 404 (Não encontrado)
                    if (response.status === 404) {
                        console.warn(`Transação ${idTransacao} não encontrada. Parando verificação.`);
                        clearInterval(statusCheckInterval);
                        statusCheckInterval = null;
                        currentTransactionId = null;
                        // Informar o usuário?
                        qrcodeContainer.innerHTML += `<p style="color: orange;">Erro ao verificar pagamento (Transação não encontrada). Tente novamente.</p>`;
                    }
                    return; // Continua tentando para outros erros temporários.
                }

                // Extrai os dados da resposta.
                const data = await response.json();

                // Verifica se o status é "paid" (pago).
                if (data.status === "paid") {
                    clearInterval(statusCheckInterval); // Para a verificação.
                    statusCheckInterval = null;
                    const completedTransactionId = currentTransactionId; // Guarda o ID antes de limpar
                    currentTransactionId = null; // Limpa o ID da transação atual.
                    console.log(`Pagamento CONFIRMADO para transação: ${completedTransactionId}`);

                    // Esconde a seção de pagamento com uma animação suave.
                    pagamentoSection.classList.remove('visible');
                    pagamentoSection.style.opacity = "0"; // Garante que comece a transição de fade-out
                    await new Promise(resolve => setTimeout(resolve, 500)); // Espera a animação CSS (0.5s)

                    pagamentoSection.style.display = "none"; // Esconde após a animação
                    pagamentoSection.style.opacity = "1"; // Reseta opacidade para próxima vez

                    // Mostra a seção do cartão virtual.
                    cartaoVirtualSection.style.display = "block";
                    cartaoVirtualSection.classList.add('visible'); // Adiciona classe para animação de entrada CSS
                    cartaoVirtualSection.scrollIntoView({ behavior: "smooth", block: "center" });
                    // Chama a função para gerar os dados (simulados) do cartão.
                    gerarDadosCartao();
                } else {
                    // Se não estiver pago, apenas loga o status atual e continua verificando.
                    console.log(`Status atual da transação ${idTransacao}: ${data.status}`);
                }

            } catch (error) {
                // Captura erros de rede ou outros problemas durante a verificação.
                console.error("Erro durante a verificação de status:", error);
                // Considerar implementar lógica de retry com backoff exponencial aqui.
            }
        }, 7000); // Intervalo de verificação: 7 segundos (ajuste conforme necessário e políticas da API).
    }

    // 5. Função para Gerar Dados Simulados do Cartão Virtual
    // Gera número, data de validade e CVV aleatórios para exibição.
    function gerarDadosCartao() {
        console.log("Gerando dados simulados do cartão virtual...");

        // Gera 4 blocos de 4 dígitos aleatórios.
        const numeroCartao = Array.from({ length: 4 }, () => String(Math.floor(1000 + Math.random() * 9000))).join(" ");
        // Gera mês aleatório (01-12).
        const mesValidade = String(Math.floor(1 + Math.random() * 12)).padStart(2, "0");
        // Gera ano aleatório (3 a 5 anos no futuro).
        const anoValidade = String(new Date().getFullYear() + 3 + Math.floor(Math.random() * 3)).slice(-2);
        // Gera CVV aleatório (100-999).
        const cvv = String(Math.floor(100 + Math.random() * 900)).padStart(3, "0");

        // Atualiza os elementos HTML com os dados gerados.
        cartaoNumeroDiv.textContent = numeroCartao;
        cartaoValidadeDiv.textContent = `${mesValidade}/${anoValidade}`;
        cartaoCvvDiv.textContent = cvv;

        console.log("Dados simulados do cartão gerados:", numeroCartao, `${mesValidade}/${anoValidade}`, cvv);
    }

    // 6. Funcionalidade do Botão "Copiar Chave"
    // Adiciona um listener de evento ao botão para copiar a chave PIX para a área de transferência.
    copiarChaveButton.addEventListener("click", () => {
        // Não faz nada se o campo estiver vazio ou mostrando mensagens de erro/carregamento.
        if (!chavePixInput.value || chavePixInput.value.includes("Gerando") || chavePixInput.value.includes("Erro")) return;

        // Seleciona o texto no input.
        chavePixInput.select();
        chavePixInput.setSelectionRange(0, 99999); // Necessário para compatibilidade com dispositivos móveis.

        try {
            // Tenta copiar o texto selecionado para a área de transferência.
            navigator.clipboard.writeText(chavePixInput.value);
            console.log("Chave Pix copiada:", chavePixInput.value);
            // Feedback visual para o usuário.
            const originalText = copiarChaveButton.textContent;
            copiarChaveButton.textContent = "Copiado!";
            copiarChaveButton.disabled = true;
            // Restaura o texto original do botão após um tempo.
            setTimeout(() => {
                copiarChaveButton.textContent = originalText;
                copiarChaveButton.disabled = false;
            }, 1500);
        } catch (err) {
            // Trata erros caso a cópia falhe (ex: permissões, navegador incompatível).
            console.error("Erro ao copiar chave Pix:", err);
            alert("Não foi possível copiar a chave automaticamente. Por favor, copie manualmente.");
        }
    });

    // Adiciona efeito de ondulação (ripple) aos botões com a classe .ripple-btn
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        // Remove ripples antigos para evitar acúmulo
        const existingRipple = button.querySelector(".ripple");
        if (existingRipple) {
            existingRipple.remove();
        }

        circle.style.width = circle.style.height = `${diameter}px`;
        // Calcula a posição do clique relativa ao botão
        const rect = button.getBoundingClientRect();
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add("ripple");

        button.appendChild(circle);

        // Remove o span após a animação
        circle.addEventListener('animationend', () => {
            circle.remove();
        });
    }

    const buttons = document.querySelectorAll(".ripple-btn");
    buttons.forEach(button => {
        button.addEventListener("click", createRipple);
    });

    // Inicialização de outras lógicas ou animações (ex: fade-in ao rolar)
    const animatedElements = document.querySelectorAll('.animate-element');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Opcional: parar de observar após animar
            }
        });
    }, { threshold: 0.1 }); // Anima quando 10% do elemento está visível

    animatedElements.forEach(el => observer.observe(el));


    console.log("SHADOW PRIME CREDIT inicializado e pronto.");
});