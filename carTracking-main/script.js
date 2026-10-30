
function addCarro() {
    let nomeCarro = document.getElementById("nomeCarro").value;
    let kmCarro = document.getElementById("kmCarro").value;
    let anoCarro = document.getElementById("anoCarro").value;
    let combustivel = document.getElementById("combustivel").value;
    let placa = document.getElementById("placaCarro").value;
    let cambio = document.getElementById("cambio").value;
    let ultRevisao = Number(document.getElementById("ultRevisao").value);
    let intervalo = Number(document.getElementById("intervalo").value);

    let proxRevisao = ultRevisao + intervalo;

    document.getElementById("carro").innerHTML += `
        <div class="carro">
            <h2>${nomeCarro}</h2>
            <p>Ano: ${anoCarro}</p>
            <p>Quilometragem: ${kmCarro} km</p>
            <p>Combustível: ${combustivel}</p>
            <p>Placa: ${placa}</p>
            <p>Câmbio: ${cambio}</p>
            <hr>
            <p>Última revisão: ${ultRevisao} km</p>
            <p>Próxima revisão: ${proxRevisao} km</p>
        </div>
    `;
}

function historico() {
    let tipoRevisao = document.getElementById("tipoRevisao").value;
    let data = document.getElementById("dataRevisao").value;
    let kmRevisao= document.getElementById("kmRevisao").value;
    let valor = document.getElementById("valorManutencao").value;

    document.getElementById("revisao").innerHTML += `
        <div class="revisao">
            <h2>${tipoRevisao}</h2>
            <p>data: ${data}</p>
            <p>Quilometragem: ${kmRevisao} km</p>
            <p class = "valor">Valor: ${valor}</p>
        </div>
    `;
}



function abrirModal() {
    document.getElementById("modalManutencao")
        .style.display = "flex";
}


function fecharModal() {
    document.getElementById("modalManutencao")
        .style.display = "none";
}


function adicionarManutencao(event) {

    event.preventDefault();

    let servico = document.getElementById("servico").value;
    let data = document.getElementById("data").value;
    let km = document.getElementById("kmManutencao").value;
    let oficina = document.getElementById("oficina").value;

    document.getElementById("historico").innerHTML += `
        <div class="manutencao">
            <h3>${servico}</h3>
            <p>Data: ${data}</p>
            <p>Quilometragem: ${km} km</p>
            <p>Oficina: ${oficina}</p>
        </div>
    `;

    fecharModal();

    document.querySelector("form").reset();
}

