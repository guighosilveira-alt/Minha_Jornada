document.addEventListener('DOMContentLoaded', () => {
    // Constantes da Jornada Zaffari (em minutos)
    const JORNADA_TRABALHADA_MIN = (8 * 60) + 24; // 504 min (8h24)
    const INTERVALO_PADRAO_MIN = (1 * 60) + 6;    // 66 min (1h06)
    const EXTRA_SUGERIDA_MIN = (1 * 60) + 30;     // 90 min (1h30)
    const EXTRA_MAXIMA_MIN = (1 * 60) + 36;       // 96 min (1h36 - totaliza 10h trabalhadas)

    // Elementos de Navegação e Telas
    const telaInicial = document.getElementById('tela-inicial');
    const telaSobre = document.getElementById('tela-sobre');
    const telaCalculo = document.getElementById('tela-calculo');

    const btnEsquilo = document.getElementById('btn-esquilo');
    const btnVoltarInicio = document.getElementById('btn-voltar-inicio');
    
    // Menu Hambúrguer
    const btnMenu = document.getElementById('btn-menu');
    const btnFecharMenu = document.getElementById('btn-fechar-menu');
    const menuLateral = document.getElementById('menu-lateral');
    const overlayMenu = document.getElementById('overlay-menu');
    const btnAbrirSobre = document.getElementById('btn-abrir-sobre');
    const btnVoltarSobre = document.getElementById('btn-voltar-sobre');
    const btnSair = document.getElementById('btn-sair');

    // Inputs de Horário
    const inputEntrada = document.getElementById('entrada');
    const inputIdaIntervalo = document.getElementById('ida-intervalo');
    const inputRetornoIntervalo = document.getElementById('retorno-intervalo');
    const inputSaida = document.getElementById('saida');
    const avisoIntervalo = document.getElementById('aviso-intervalo');

    // Rodapé Extras
    const rodapeExtras = document.getElementById('rodape-extras');
    const spanSaidaMaxima = document.getElementById('saida-maxima');
    const spanSaidaSugerida = document.getElementById('saida-sugerida');
    const smallBaseCalculo = document.getElementById('base-calculo-extra');

    // Inserir ano atual no rodapé do menu
    document.getElementById('ano-atual').textContent = new Date().getFullYear();

    // --- FUNÇÕES DE NAVEGAÇÃO ---
    function mostrarTela(tela) {
        document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
        tela.classList.add('ativa');
    }

    function abrirMenu() {
        menuLateral.classList.add('aberto');
        overlayMenu.classList.remove('oculto');
    }

    function fecharMenu() {
        menuLateral.classList.remove('aberto');
        overlayMenu.classList.add('oculto');
    }

    btnMenu.addEventListener('click', abrirMenu);
    btnFecharMenu.addEventListener('click', fecharMenu);
    overlayMenu.addEventListener('click', fecharMenu);

    btnEsquilo.addEventListener('click', () => {
        mostrarTela(telaCalculo);
    });

    btnVoltarInicio.addEventListener('click', () => {
        mostrarTela(telaInicial);
    });

    btnAbrirSobre.addEventListener('click', () => {
        fecharMenu();
        mostrarTela(telaSobre);
    });

    // Botão voltar no rodapé à direita da tela Sobre retorna ao menu
    btnVoltarSobre.addEventListener('click', () => {
        mostrarTela(telaInicial);
        abrirMenu();
    });

    // Botão SAIR
    btnSair.addEventListener('click', () => {
        if (confirm('Deseja encerrar o Minha Jornada app?')) {
            window.close();
            // Fallback caso o navegador móvel bloqueie window.close()
            document.body.innerHTML = `
                <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#005a2b;color:#fff;text-align:center;padding:20px;">
                    <h2>Aplicação Encerrada</h2>
                    <p style="margin:12px 0;">Obrigado por utilizar o Minha Jornada app.</p>
                    <button onclick="location.reload()" style="padding:10px 20px;border:none;border-radius:8px;background:#fff;color:#005a2b;font-weight:bold;cursor:pointer;">Reabrir App</button>
                </div>
            `;
        }
    });

    // --- FUNÇÕES AUXILIARES DE TEMPO ---
    function horaParaMinutos(horaStr) {
        if (!horaStr) return null;
        const [horas, minutos] = horaStr.split(':').map(Number);
        return (horas * 60) + minutos;
    }

    function minutosParaHora(totalMinutos) {
        // Garante ciclo de 24h (caso vire a meia-noite)
        const minNormalizado = ((totalMinutos % 1440) + 1440) % 1440;
        const horas = Math.floor(minNormalizado / 60);
        const minutos = minNormalizado % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    }

    // --- LÓGICA PRINCIPAL DO PONTO ---

    // 1. Quando insere a IDA AO INTERVALO -> calcula Retorno padrão (+1h06) e Saída
    inputIdaIntervalo.addEventListener('change', () => {
        const minIda = horaParaMinutos(inputIdaIntervalo.value);
        if (minIda === null) return;

        const minRetornoPadrao = minIda + INTERVALO_PADRAO_MIN;
        inputRetornoIntervalo.value = minutosParaHora(minRetornoPadrao);
        avisoIntervalo.textContent = '';

        recalcularSaida();
    });

    // 2. Quando edita MANUALMENTE o RETORNO DO INTERVALO -> recalcula a Saída
    inputRetornoIntervalo.addEventListener('change', () => {
        const minIda = horaParaMinutos(inputIdaIntervalo.value);
        const minRetorno = horaParaMinutos(inputRetornoIntervalo.value);

        if (minIda !== null && minRetorno !== null) {
            let duracaoIntervalo = minRetorno - minIda;
            if (duracaoIntervalo < 0) duracaoIntervalo += 1440; // Caso vire o dia

            if (duracaoIntervalo > INTERVALO_PADRAO_MIN) {
                const excedente = duracaoIntervalo - INTERVALO_PADRAO_MIN;
                avisoIntervalo.textContent = `Intervalo excedido em ${excedente} min. Saída ajustada automaticamente.`;
            } else if (duracaoIntervalo < INTERVALO_PADRAO_MIN) {
                avisoIntervalo.textContent = `Atenção: Intervalo inferior ao padrão de 01:06.`;
            } else {
                avisoIntervalo.textContent = '';
            }
        }

        recalcularSaida();
    });

    // 3. Quando altera a ENTRADA -> recalcula se já houver intervalo preenchido
    inputEntrada.addEventListener('change', recalcularSaida);

    function recalcularSaida() {
        const minEntrada = horaParaMinutos(inputEntrada.value);
        const minIda = horaParaMinutos(inputIdaIntervalo.value);
        const minRetorno = horaParaMinutos(inputRetornoIntervalo.value);

        if (minEntrada === null || minIda === null || minRetorno === null) {
            inputSaida.value = '';
            rodapeExtras.classList.add('oculto');
            return;
        }

        // Calcula quanto tempo o colaborador trabalhou antes do intervalo
        let primeiroTurno = minIda - minEntrada;
        if (primeiroTurno < 0) primeiroTurno += 1440;

        // Calcula quanto tempo falta trabalhar após o retorno para fechar 8h24 (504 min)
        const segundoTurnoNecessario = JORNADA_TRABALHADA_MIN - primeiroTurno;

        // Saída normal = Retorno do intervalo + tempo restante da jornada
        const minSaidaNormal = minRetorno + segundoTurnoNecessario;
        inputSaida.value = minutosParaHora(minSaidaNormal);

        // Cálculo do Rodapé de Horas Extras (usando a ida/retorno do intervalo como base da jornada)
        const minSaidaSugerida = minSaidaNormal + EXTRA_SUGERIDA_MIN; // +1h30
        const minSaidaMaxima = minSaidaNormal + EXTRA_MAXIMA_MIN;     // +1h36 (limite 10h)

        spanSaidaSugerida.textContent = minutosParaHora(minSaidaSugerida);
        spanSaidaMaxima.textContent = minutosParaHora(minSaidaMaxima);
        smallBaseCalculo.textContent = `Base: Ida às ${inputIdaIntervalo.value} | Retorno às ${inputRetornoIntervalo.value}`;

        rodapeExtras.classList.remove('oculto');
    }
});
